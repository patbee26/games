// Takes a folder of generated variation photographs and installs them.
//
// Validates every filename against the app's own scene list rather than a copy
// of it, so a typo or a renamed scene fails here instead of showing up as a
// missing picture later. Downscales through the same Chromium canvas the other
// photographs went through, so the whole set is encoded identically.
//
//   node tools/ingest-variants.mjs <folder>
//
// See ../VARIANTS.md for the naming and for how to generate the sets.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { SCENES } from '../js/data.js';
import { chromium } from './playwright.mjs';

const AXES = { ap: ['wide', 'mid', 'deep'], fl: ['wide', 'norm', 'long'], sh: ['fast', 'mid', 'slow'] };
const MAX_EDGE = 900;
const QUALITY = 0.74;

// An optional crops.json in the source folder normalises the framing:
//
//   { "portrait": { "fl-norm": { "scale": 1.28, "cy": 0.52 } } }
//
// `scale` crops in by that factor, `cy` is the vertical centre of the crop.
// This exists because a model asked for three focal lengths will hold the
// subject's size only roughly, and the set's whole claim is that the subject
// does not change. Cropping in uniformly rescales subject and background
// together, so it fixes the framing without touching the ratio between them —
// which is the thing being demonstrated. It only ever crops in; nothing is
// invented at the edges.

const source = process.argv[2];
if (!source) {
  console.error('usage: node tools/ingest-variants.mjs <folder of generated variants>');
  process.exit(1);
}
const dir = resolve(source);
if (!existsSync(dir)) {
  console.error(`no such folder: ${dir}`);
  process.exit(1);
}

let crops = {};
try {
  crops = JSON.parse(readFileSync(join(dir, 'crops.json'), 'utf8'));
  console.log('using crops.json to normalise framing');
} catch { /* optional */ }

const sceneIds = new Set(SCENES.map((s) => s.id));
const found = new Map(); // scene -> axis -> Set(step)
const ignored = [];

for (const file of readdirSync(dir).sort()) {
  const ext = extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;
  const m = file.replace(ext, '').match(/^([a-z]+)__(ap|fl|sh)-([a-z]+)$/);
  if (!m) { ignored.push([file, 'name does not match <scene>__<ap|fl|sh>-<step>']); continue; }
  const [, scene, axis, step] = m;
  if (!sceneIds.has(scene)) { ignored.push([file, `"${scene}" is not a scene in this app`]); continue; }
  if (!AXES[axis].includes(step)) {
    ignored.push([file, `"${step}" is not a step on the ${axis} axis (${AXES[axis].join(', ')})`]);
    continue;
  }
  if (!found.has(scene)) found.set(scene, { ap: new Map(), fl: new Map() });
  found.get(scene)[axis].set(step, file);
}

if (!found.size) {
  console.error('nothing usable found.');
  for (const [file, why] of ignored) console.error(`  ${file}: ${why}`);
  process.exit(1);
}

// Serve the source folder: a canvas cannot read a file:// image without
// tainting itself, which is the same reason the original photographs were
// converted over http.
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.slice(1));
  try {
    const body = readFileSync(join(dir, name));
    res.writeHead(200, { 'content-type': 'image/*' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await (await chromium()).launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/`).catch(() => {});

const outDir = new URL('../photos/variants/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const manifest = {};
let written = 0;
for (const [scene, axes] of [...found].sort()) {
  manifest[scene] = {};
  for (const [axis, steps] of Object.entries(axes)) {
    if (!steps.size) continue;
    manifest[scene][axis] = [];
    for (const step of AXES[axis]) {
      const file = steps.get(step);
      if (!file) continue;
      const crop = crops[scene]?.[`${axis}-${step}`] ?? null;
      const data = await page.evaluate(async ({ file, MAX_EDGE, QUALITY, port, crop }) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `http://127.0.0.1:${port}/${encodeURIComponent(file)}`; });
        const z = Math.max(1, crop?.scale ?? 1);
        const cy = crop?.cy ?? 0.5;
        const sw = img.naturalWidth / z, sh = img.naturalHeight / z;
        const sx = (img.naturalWidth - sw) / 2;
        const sy = Math.max(0, Math.min(img.naturalHeight - sh, img.naturalHeight * cy - sh / 2));
        const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
        const c = document.createElement('canvas');
        c.width = Math.round(sw * scale);
        c.height = Math.round(sh * scale);
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        return { url: c.toDataURL('image/jpeg', QUALITY), w: c.width, h: c.height };
      }, { file, MAX_EDGE, QUALITY, port, crop });

      const name = `${scene}__${axis}-${step}.jpg`;
      const buf = Buffer.from(data.url.split(',')[1], 'base64');
      writeFileSync(new URL(name, outDir), buf);
      manifest[scene][axis].push(step);
      written++;
      console.log(`  ${name.padEnd(28)} ${data.w}x${data.h}  ${(buf.length / 1024).toFixed(0)} KB`
        + (crop ? `  cropped x${crop.scale}` : ''));
    }
  }
}

await browser.close();
server.close();

writeFileSync(new URL('../js/variants.js', import.meta.url),
  `// Generated by tools/ingest-variants.mjs — do not edit by hand.\n`
  + `// Which scenes have variation photographs, and on which axes.\n`
  + `// See ../../VARIANTS.md.\n\n`
  + `export const VARIANTS = ${JSON.stringify(manifest, null, 2)};\n\n`
  + `export const variantFor = (sceneId, axis, step) =>\n`
  + `  (VARIANTS[sceneId]?.[axis] ?? []).includes(step)\n`
  + `    ? \`photos/variants/\${sceneId}__\${axis}-\${step}.jpg\`\n`
  + `    : null;\n`);

console.log(`\n${written} variant${written === 1 ? '' : 's'} installed, ${Object.keys(manifest).length} scene(s).`);

// An incomplete set is worse than none: two of three steps invites the app to
// interpolate across a gap it cannot see.
for (const [scene, axes] of Object.entries(manifest)) {
  for (const [axis, steps] of Object.entries(axes)) {
    const missing = AXES[axis].filter((s) => !steps.includes(s));
    if (missing.length) console.log(`  incomplete: ${scene} ${axis} is missing ${missing.join(', ')}`);
  }
}
if (ignored.length) {
  console.log('\nignored:');
  for (const [file, why] of ignored) console.log(`  ${file}: ${why}`);
}
console.log('\nNow check them at the size they will be seen: node tools/variant-sheet.mjs');
