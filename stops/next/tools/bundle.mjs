// Two jobs, from one source of truth about what the app needs.
//
//   1. dist/stops-next.html, the whole app in one file, with pictures and fonts
//      inlined, for opening from a link on a phone or dropping on a host.
//   2. sw.js's precache list, rewritten from that same list.
//
// The first app kept its precache list by hand and it fell thirty-six pictures
// behind without anything failing loudly. Generating both from one walk of the
// modules is the fix.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';

const here = new URL('../', import.meta.url);          // stops/next/
const shared = new URL('../../app/', import.meta.url); // stops/app/
const read = (u, p) => readFileSync(new URL(p, u), 'utf8');

// Dependency order: each module imports only from the ones above it. The first
// five come from the other app. The physics and the ladders are the same
// physics and the same ladders, and a second copy of them would drift.
const SHARED = ['js/ladders.js', 'js/optics.js', 'js/exposure.js', 'js/data.js'];
const OWN = ['js/lessons.js', 'js/gear.js', 'js/exif.js', 'js/shot.js',
             'js/diagnose.js', 'js/chips.js', 'js/app.js'];

const strip = (src) => src
  .replace(/^import[\s\S]*?from '[^']+';$/gm, '')
  .replace(/^export (const|function|class|let) /gm, '$1 ')
  .replace(/^export \{[^}]*\};?$/gm, '')
  // One page, no service worker to register against.
  .replace(/^if \('serviceWorker' in navigator\) \{[\s\S]*?^\}$/gm, '');

// A module missing from that list becomes a ReferenceError in the bundle and a
// blank page, while the unbundled app carries on working, so the mistake ships.
// Read what each module actually imports and check the list covers it.
{
  const missing = new Set();
  for (const file of OWN) {
    for (const m of read(here, file).matchAll(/from '\.\/([\w.-]+)'/g)) {
      if (!OWN.includes('js/' + m[1])) missing.add('js/' + m[1]);
    }
  }
  if (missing.size) {
    console.error(`OWN is missing ${[...missing].join(', ')}, so the bundle would throw at load.`);
    process.exit(1);
  }
}

let script = [...SHARED.map((f) => strip(read(shared, f))),
              ...OWN.map((f) => strip(read(here, f)))].join('\n');

// Concatenating modules into one scope means two of them declaring the same
// name is a SyntaxError at load and a blank page, and this app shares four
// modules with the other one, which has its own SCENES and its own sceneById.
// Cheaper to catch here, by name, than in a browser console.
{
  const seen = new Map();
  const clash = [];
  for (const m of script.matchAll(/^(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (seen.has(m[1])) clash.push(m[1]); else seen.set(m[1], true);
  }
  if (clash.length) {
    console.error(`Two modules declare the same top-level name, so the bundle would not parse: ${[...new Set(clash)].join(', ')}`);
    console.error('Rename one of them. The shared modules under app/js/ own their names.');
    process.exit(1);
  }
}

// Every photograph the app can show: one per scene, plus its variations.
const { LESSONS } = await import(new URL('js/lessons.js', here));
const pictures = {};
const want = [];
for (const scene of LESSONS) {
  want.push(`photos/bases/${scene.id}.jpg`);
  for (const [axis, spec] of Object.entries(scene.axes)) {
    // Not the step the scene is already shot at: the card shows the base
    // photograph for that one, so its variation is never reached and would be a
    // megabyte of dead weight across the twelve scenes.
    const shot = { ap: scene.aperture, fl: scene.focal, sh: scene.shutter }[axis];
    for (const [step, value] of Object.entries(spec.steps)) {
      if (Math.abs(value / shot - 1) >= 0.01) want.push(`photos/variants/${scene.id}__${axis}-${step}.jpg`);
    }
  }
}
const missing = [];
for (const path of want) {
  const url = new URL(path, shared);
  if (!existsSync(url)) { missing.push(path); continue; }
  pictures[path] = 'data:image/jpeg;base64,' + readFileSync(url).toString('base64');
}
if (missing.length) {
  console.error(`${missing.length} picture(s) the app references are not on disk:`);
  missing.forEach((m) => console.error('  ' + m));
  process.exit(1);
}

const before = script;
script = script.replace(/const photoSrc = \(path\) => `\.\.\/app\/\$\{path\}`;/,
  `const __PICTURES = ${JSON.stringify(pictures)};\nconst photoSrc = (path) => __PICTURES[path] ?? '';`);
if (script === before) {
  console.error('The photoSrc definition moved, so pictures were NOT inlined. Fix the bundler.');
  process.exit(1);
}

// Fonts, inlined out of the shared stylesheet.
let fonts = read(shared, 'fonts.css');
fonts = fonts.replace(/url\(['"]?(fonts\/[^'")]+)['"]?\)/g, (_, file) =>
  `url(data:font/woff2;base64,${readFileSync(new URL(file, shared)).toString('base64')})`);

// The body of the page, taken from index.html rather than written again here:
// the first app's bundler kept its own copy and it drifted out of step with the
// real page, which broke the bundle silently for days.
const page = read(here, 'index.html');
const body = page.slice(page.indexOf('<body>') + 6, page.indexOf('</body>'))
  .replace(/<script[\s\S]*?<\/script>/g, '');
for (const id of ['id="app"', 'id="tabs"', 'id="sheet"']) {
  if (!body.includes(id)) { console.error(`index.html has no ${id}, so the bundle would not run.`); process.exit(1); }
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B0C0D">
<title>Stops: learn your camera</title>
<style>${fonts}</style>
<style>${read(here, 'styles.css')}</style>
</head>
<body>${body}
<script type="module">${script}</script>
</body>
</html>
`;
mkdirSync(new URL('dist/', here), { recursive: true });
writeFileSync(new URL('dist/stops-next.html', here), html);
console.log(`dist/stops-next.html, ${Math.round(html.length / 1024)} KB, ${Object.keys(pictures).length} pictures`);

// The same list, into the service worker.
{
  const swUrl = new URL('sw.js', here);
  const sw = readFileSync(swUrl, 'utf8');
  const a = sw.match(/^[ \t]*\/\/ assets:start.*$/m);
  const b = sw.match(/^[ \t]*\/\/ assets:end.*$/m);
  if (!a || !b) { console.error('sw.js has no assets:start/assets:end markers.'); process.exit(1); }
  const lines = ['styles.css', 'manifest.webmanifest', '../app/fonts.css',
    ...SHARED.map((f) => '../app/' + f), ...OWN,
    ...readdirSync(new URL('fonts/', shared)).filter((f) => f.endsWith('.woff2')).map((f) => '../app/fonts/' + f),
    ...want.map((p) => '../app/' + p)].map((p) => `  '${p}',`);
  const next = sw.slice(0, a.index + a[0].length) + '\n' + lines.join('\n') + '\n' + sw.slice(b.index);
  if (next !== sw) { writeFileSync(swUrl, next); console.log(`sw.js precaches ${lines.length} assets.`); }
  else console.log(`sw.js already precaches all ${lines.length} assets.`);
}
