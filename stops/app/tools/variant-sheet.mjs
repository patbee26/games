// Contact sheet for the variation photographs, at the width they are actually
// shown at in the app.
//
// This exists to catch the one failure that matters and is invisible in a
// folder of thumbnails: a focal-length set the model produced by cropping
// instead of re-shooting. Read along a row: the subject must be the same
// height in all three. If it grows, the set is the wrong lesson and has to go
// back.
//
//   node tools/variant-sheet.mjs [output.png]
import { existsSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from './playwright.mjs';

const root = new URL('../', import.meta.url);
if (!existsSync(new URL('js/variants.js', root))) {
  console.error('No variants installed yet. Run tools/ingest-variants.mjs first.');
  process.exit(1);
}
const { VARIANTS } = await import('../js/variants.js');

// Arguments: an optional output path (anything ending .png) and any number of
// scene names. With fifteen sets installed a single sheet is 8000px tall and
// has to be downscaled to be looked at, which defeats the point of rendering at
// the real banner width, so name the scenes you want to judge.
const args = process.argv.slice(2);
const out = args.find((a) => a.endsWith('.png')) ?? 'variant-sheet.png';
const wanted = args.filter((a) => !a.endsWith('.png'));
const unknown = wanted.filter((s) => !VARIANTS[s]);
if (unknown.length) { console.error(`No such scene: ${unknown.join(', ')}`); process.exit(1); }
const scenes = wanted.length ? wanted : Object.keys(VARIANTS);
if (!scenes.length) { console.error('The manifest is empty.'); process.exit(1); }

const LABEL = {
  ap: { wide: 'wide open', mid: 'middle', deep: 'stopped down' },
  fl: { wide: 'wide lens', norm: 'normal', long: 'long lens' },
  sh: { fast: 'fast, frozen', mid: 'moderate', slow: 'slow, smeared' },
};
const TITLE = { ap: 'Aperture: only the depth of field may differ',
                fl: 'Focal length: the subject must be the SAME HEIGHT in all three',
                sh: 'Shutter: only the moving things may differ; everything still stays identical' };

const types = { '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.html': 'text/html' };
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.slice(1)) || 'index.html';
  try {
    const body = readFileSync(new URL(name, root));
    res.writeHead(200, { 'content-type': types[extname(name)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// 358px is the banner's real width on a 390px phone.
const W = 358;
const rows = [];
for (const scene of scenes) {
  for (const [axis, steps] of Object.entries(VARIANTS[scene])) {
    if (!steps.length) continue;
    const cells = steps.map((step) => `
      <div>
        <img src="http://127.0.0.1:${port}/photos/variants/${scene}__${axis}-${step}.jpg"
             style="width:${W}px;display:block;border-radius:10px;border:1px solid #ccc">
        <div style="font:11px system-ui;color:#555;padding-top:4px">${LABEL[axis][step]}</div>
      </div>`).join('');
    rows.push(`
      <div style="margin-bottom:18px">
        <div style="font:600 12px system-ui;color:#222;padding-bottom:6px">
          ${scene} &mdash; ${TITLE[axis]}</div>
        <div style="display:flex;gap:10px;align-items:flex-start">${cells}</div>
      </div>`);
  }
}

const browser = await (await chromium()).launch();
const page = await browser.newPage({ viewport: { width: W * 3 + 60, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(`<body style="margin:0;padding:16px;background:#f2f0ec">${rows.join('')}</body>`);
await page.waitForTimeout(700);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
server.close();
console.log(`${out}: ${rows.length} set(s) across ${scenes.length} scene(s).`);
console.log('Read along each focal-length row: the subject must be the same height in all three.');
