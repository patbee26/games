// Builds the asset catalog: every photograph the app can show, plus the icon.
//
// The same JPEGs the web app serves, so there is one set of pictures and one
// place they are judged. Which ones are needed is worked out from the scenes
// themselves rather than listed, exactly as the web bundler does it, so a scene
// gaining an axis cannot leave a hole here.
//
//   node ios/tools/gen-assets.mjs
import { writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { chromium } from '../../app/tools/playwright.mjs';
import { MARK } from '../../next/js/brand.js';

const { LESSONS } = await import(new URL('../../next/js/lessons.js', import.meta.url));
const photos = new URL('../../app/photos/', import.meta.url);
const out = new URL('../OffAuto/Assets.xcassets/', import.meta.url);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(new URL('Contents.json', out), JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2));

/** One image set, single scale, so the file lands unmodified. */
function imageset(name, from) {
  const dir = new URL(`${name}.imageset/`, out);
  mkdirSync(dir, { recursive: true });
  copyFileSync(from, new URL(`${name}.jpg`, dir));
  writeFileSync(new URL('Contents.json', dir), JSON.stringify({
    images: [{ filename: `${name}.jpg`, idiom: 'universal' }],
    info: { author: 'xcode', version: 1 },
  }, null, 2) + '\n');
}

const wanted = [];
for (const scene of LESSONS) {
  wanted.push([scene.id, new URL(`bases/${scene.id}.jpg`, photos)]);
  for (const [axis, spec] of Object.entries(scene.axes)) {
    const shot = { ap: scene.aperture, fl: scene.focal, sh: scene.shutter }[axis];
    for (const [step, value] of Object.entries(spec.steps)) {
      if (Math.abs(value / shot - 1) < 0.01) continue;   // the base stands for this one
      const name = `${scene.id}__${axis}-${step}`;
      wanted.push([name, new URL(`variants/${name}.jpg`, photos)]);
    }
  }
}
const missing = wanted.filter(([, from]) => !existsSync(from));
if (missing.length) {
  console.error(`${missing.length} photograph(s) are not on disk:`);
  missing.forEach(([name]) => console.error('  ' + name));
  process.exit(1);
}
for (const [name, from] of wanted) imageset(name, from);

// The app icon: one 1024 square, which is all a modern Xcode project needs.
const browser = await (await chromium()).launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
await page.setContent(`<body style="margin:0">
  <div style="width:1024px;height:1024px;background:#16181A;display:grid;place-items:center">
    <div style="width:594px;height:594px;color:#ECEAE6;--amber:#E8A33D">${MARK}</div>
  </div></body>`);
await page.waitForTimeout(200);
const iconDir = new URL('AppIcon.appiconset/', out);
mkdirSync(iconDir, { recursive: true });
writeFileSync(new URL('icon-1024.png', iconDir), await page.screenshot());
writeFileSync(new URL('Contents.json', iconDir), JSON.stringify({
  images: [{ filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
  info: { author: 'xcode', version: 1 },
}, null, 2) + '\n');
await browser.close();

console.log(`Assets.xcassets: ${wanted.length} photographs and the app icon.`);
