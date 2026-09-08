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
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { SCENES } from '../js/data.js';
import { chromium } from './playwright.mjs';

const AXES = { ap: ['wide', 'mid', 'deep'], fl: ['wide', 'norm', 'long'], sh: ['fast', 'mid', 'slow'] };
const MAX_EDGE = 900;
const QUALITY = 0.74;

// An optional crops.json in the source folder carries the two per-scene
// corrections a generated set may need:
//
//   { "street": { "order": ["base", "ap-wide", "ap-mid", "ap-deep",
//                           "fl-long", "fl-wide"],
//                 "fl-long": { "scale": 1.53, "cy": 0.55 } } }
//
// `order` overrides the expected image order for that folder. It is here
// because the model sometimes answers the two focal-length prompts the wrong
// way round, handing back the telephoto frame for the wide prompt, and a set
// labelled backwards teaches the reverse of the lesson. Naming the real order
// keeps the fix with the pictures instead of in a rename nobody can see.
//
// `scale` crops in by that factor, `cy` is the vertical centre of the crop.
// This exists because a model asked for three focal lengths will hold the
// subject's size only roughly, and the set's whole claim is that the subject
// does not change. Cropping in uniformly rescales subject and background
// together, so it fixes the framing without touching the ratio between them,
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

const bases = []; // [scene, relative path]: the scene's own photograph
let crops = {};
try {
  crops = JSON.parse(readFileSync(join(dir, 'crops.json'), 'utf8'));
  console.log('using crops.json to normalise framing');
} catch { /* optional */ }

const sceneIds = new Set(SCENES.map((s) => s.id));
const found = new Map(); // scene -> axis -> Set(step)
const ignored = [];

/**
 * What a numbered folder means, per scene: the order the images arrive in when
 * a whole set is generated in one conversation. Typing `1`, `2`, `3` into a
 * folder named after the scene is a great deal less error-prone than typing
 * `panning__sh-slow`, and the order is fixed by the prompt that produced them.
 *
 * The first entry is the base photograph, which becomes the scene's own picture
 * as well as the middle step of a focal set.
 */
const ORDER = {
  water: ['base', 'sh-fast', 'sh-mid', 'sh-slow'],
  kids: ['base', 'sh-fast', 'sh-mid', 'sh-slow'],
  sports: ['base', 'sh-fast', 'sh-mid', 'sh-slow'],
  nightcity: ['base', 'sh-fast', 'sh-mid', 'sh-slow'],
  panning: ['base', 'sh-fast', 'sh-mid', 'sh-slow'],
  group: ['base', 'ap-wide', 'ap-mid', 'ap-deep'],
  food: ['base', 'ap-wide', 'ap-mid', 'ap-deep'],
  indoor: ['base', 'ap-wide', 'ap-mid', 'ap-deep'],
  portrait: ['base', 'ap-wide', 'ap-mid', 'ap-deep', 'fl-wide', 'fl-long'],
  street: ['base', 'ap-wide', 'ap-mid', 'ap-deep', 'fl-wide', 'fl-long'],
  landscape: ['base', 'fl-wide', 'fl-long'],
  architecture: ['base', 'fl-wide', 'fl-long'],
};

/**
 * A folder per scene holding numbered files is expanded into the long names
 * before anything else looks at the directory. Sorted numerically, not
 * alphabetically, or 10 would land between 1 and 2.
 */
function expandOrderedFolders() {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const key = entry.name;
    const scene = key.replace(/-fl$/, '');
    const order = crops[scene]?.order ?? ORDER[key];
    if (!order) { ignored.push([key + '/', 'no known image order for this folder']); continue; }
    if (crops[scene]?.order) {
      const known = new Set(['base', ...Object.entries(AXES)
        .flatMap(([axis, steps]) => steps.map((step) => `${axis}-${step}`))]);
      const bad = order.filter((step) => !known.has(step));
      if (bad.length) { ignored.push([key + '/', `crops.json order has unknown step(s): ${bad.join(', ')}`]); continue; }
      console.log(`  ${key}/: using the order from crops.json: ${order.join(', ')}`);
    }
    // Order matters and the filenames may not carry it: a browser saves what the
    // image generator hands it, which is a UUID. So use the numbers when the
    // files are actually numbered, and fall back to when they were written,
    // which is the order they were downloaded in and therefore generated in.
    const names = readdirSync(join(dir, key))
      .filter((f) => ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(f).toLowerCase()));
    const numbered = names.every((f) => /^\d+\./.test(f));
    const files = numbered
      ? names.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      : names.sort((a, b) => statSync(join(dir, key, a)).mtimeMs - statSync(join(dir, key, b)).mtimeMs);
    if (!numbered) console.log(`  ${key}/: filenames are not numbered, using file times: ${files.join(', ')}`);
    if (files.length !== order.length) {
      ignored.push([key + '/', `expected ${order.length} images, found ${files.length}`]);
      continue;
    }
    files.forEach((f, i) => out.push({ path: join(key, f), scene, step: order[i] }));
  }
  return out;
}

const ordered = expandOrderedFolders();
for (const { path, scene, step } of ordered) {
  if (step === 'base') { bases.push([scene, path]); continue; }
  const [axis, name] = step.split('-');
  if (!found.has(scene)) found.set(scene, { ap: new Map(), fl: new Map(), sh: new Map() });
  found.get(scene)[axis].set(name, path);
}
// A focal set's middle step is the scene photographed at its own focal length,
// which is exactly the base picture. Nobody should have to supply it twice.
for (const [scene, path] of bases) {
  const axes = found.get(scene);
  if (axes?.fl.size && !axes.fl.has('norm')) axes.fl.set('norm', path);
}

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
  if (!found.has(scene)) found.set(scene, { ap: new Map(), fl: new Map(), sh: new Map() });
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
    const body = readFileSync(join(dir, name)); // name may include a subfolder
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
// Base photographs are staged, not installed. They belong to a scene whose
// variants may not all have arrived yet, and overwriting a live scene picture
// on the strength of one folder is not a decision this script should take.
const baseDir = new URL('../photos/bases/', import.meta.url);
if (bases.length) mkdirSync(baseDir, { recursive: true });

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

for (const [scene, path] of bases) {
  const data = await page.evaluate(async ({ file, MAX_EDGE, QUALITY, port }) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `http://127.0.0.1:${port}/${file.split('/').map(encodeURIComponent).join('/')}`; });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/jpeg', QUALITY), w: c.width, h: c.height };
  }, { file: path, MAX_EDGE, QUALITY, port });
  const buf = Buffer.from(data.url.split(',')[1], 'base64');
  writeFileSync(new URL(`${scene}.jpg`, baseDir), buf);
  console.log(`  bases/${scene}.jpg`.padEnd(30) + ` ${data.w}x${data.h}  ${(buf.length / 1024).toFixed(0)} KB`);
}

await browser.close();
server.close();

// Ingesting one folder must not delete the variants of scenes that are not in
// it. The manifest is the state of the directory, so read the directory.
let readded = 0;
for (const file of readdirSync(outDir)) {
  const m = file.match(/^([a-z]+)__(ap|fl|sh)-([a-z]+)\.jpg$/);
  if (!m) continue;
  const [, scene, axis, step] = m;
  manifest[scene] ??= {};
  manifest[scene][axis] ??= [];
  if (!manifest[scene][axis].includes(step)) { manifest[scene][axis].push(step); readded++; }
}
for (const axes of Object.values(manifest)) {
  for (const [axis, steps] of Object.entries(axes)) {
    steps.sort((a, b) => AXES[axis].indexOf(a) - AXES[axis].indexOf(b));
    if (!steps.length) delete axes[axis];
  }
}
if (readded) console.log(`  kept ${readded} variant(s) already on disk from earlier runs`);

writeFileSync(new URL('../js/variants.js', import.meta.url),
  `// Generated by tools/ingest-variants.mjs, do not edit by hand.\n`
  + `// Which scenes have variation photographs, and on which axes.\n`
  + `// See ../../VARIANTS.md.\n\n`
  + `export const VARIANTS = ${JSON.stringify(manifest, null, 2)};\n\n`
  + `export const variantFor = (sceneId, axis, step) =>\n`
  + `  (VARIANTS[sceneId]?.[axis] ?? []).includes(step)\n`
  + `    ? \`photos/variants/\${sceneId}__\${axis}-\${step}.jpg\`\n`
  + `    : null;\n`);

// The service worker precaches by an explicit list, and this app's whole claim
// is that it works in a canyon. A variant missing from that list is a blank
// panel offline and nothing at all online, so the list is written from the
// manifest rather than kept in step by hand, which it was not.
{
  const swPath = new URL('../sw.js', import.meta.url);
  const sw = readFileSync(swPath, 'utf8');
  const start = /^[ \t]*\/\/ variants:start.*$/m;
  const end = /^[ \t]*\/\/ variants:end.*$/m;
  const a = sw.match(start);
  const b = sw.match(end);
  if (!a || !b) {
    console.log('\n  sw.js has no variants:start/variants:end markers, so its precache list was NOT updated.');
  } else {
    const lines = Object.entries(manifest).flatMap(([scene, axes]) =>
      Object.entries(axes).flatMap(([axis, steps]) =>
        steps.map((step) => `  'photos/variants/${scene}__${axis}-${step}.jpg',`))).sort();
    const head = sw.slice(0, a.index + a[0].length);
    const tail = sw.slice(b.index);
    const next = `${head}\n${lines.join('\n')}\n${tail}`;
    if (next === sw) console.log(`\nsw.js already precaches all ${lines.length} variant(s).`);
    else {
      writeFileSync(swPath, next);
      console.log(`\nsw.js now precaches ${lines.length} variant(s). Bump CACHE before you ship.`);
    }
  }
}

console.log(`\n${written} variant${written === 1 ? '' : 's'} installed, ${Object.keys(manifest).length} scene(s).`);
if (bases.length) {
  console.log(`\n${bases.length} base photograph(s) staged in photos/bases/ :`);
  for (const [scene] of bases) console.log(`  ${scene}.jpg`);
  console.log('  These are the scene pictures for the new app. Nothing live was overwritten.');
}

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
