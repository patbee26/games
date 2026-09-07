// Flattens the app into one self-contained HTML page: modules concatenated in
// dependency order, stylesheet inlined, fonts embedded as data URIs. Used to
// publish a version that opens from a link on a phone. The app in this
// directory stays the deployable artefact — this is a copy of it, not a build
// step it depends on.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// Dependency order: every module imports only from the ones above it.
const MODULES = ['js/ladders.js', 'js/optics.js', 'js/exposure.js', 'js/data.js',
  'js/gear.js', 'js/icons.js', 'js/preview.js', 'js/sun.js', 'js/craft.js', 'js/scenery.js', 'js/photos.js', 'js/app.js'];

let script = MODULES.map((file) => read(file)
  .replace(/^import[\s\S]*?from '[^']+';$/gm, '')
  .replace(/^export (const|function|class|let) /gm, '$1 ')
  // A single page has no service worker to register against.
  .replace(/^if \('serviceWorker' in navigator\) \{[\s\S]*?^\}$/gm, ''))
  .join('\n');

// The photographs have to travel with the page too, so the path lookup is
// swapped for an inlined table.
const photos = {};
for (const file of readdirSync(new URL('photos/', root))) {
  if (!file.endsWith('.jpg')) continue;
  photos[file.replace('.jpg', '')] =
    'data:image/jpeg;base64,' + readFileSync(new URL('photos/' + file, root)).toString('base64');
}
const photoLine = 'const photoFor = (sceneId) => (PHOTOS[sceneId] ? `photos/${sceneId}.jpg` : null);';
if (!script.includes(photoLine)) console.warn('WARNING: photo lookup not found, photos will not be inlined');
script = script.replace(photoLine,
  `const __PHOTOS = ${JSON.stringify(photos)};\nconst photoFor = (sceneId) => __PHOTOS[sceneId] ?? null;`);

// The fonts have to travel with the page: nothing external loads here.
const fonts = read('fonts.css').replace(/url\(fonts\/([^)]+)\)/g, (_, name) =>
  `url(data:font/woff2;base64,${readFileSync(new URL('fonts/' + name, root)).toString('base64')})`);

// The body is taken from index.html rather than written out again here, so an
// element added to the app can never go missing from the single-page copy.
const body = read('index.html')
  .match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .trim();
for (const id of ['app', 'tabs', 'sheet']) {
  if (!body.includes(`id="${id}"`)) console.warn(`WARNING: #${id} missing from the bundled body`);
}

const page = `<title>Stops</title>
<style>
${fonts}
${read('styles.css')}
/* A single hosted page sizes from the viewport rather than from the document. */
html, body { height: 100dvh; }
</style>

${body}

<script type="module">
${script}
</script>
`;

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/stops.html', import.meta.url), page);
console.log(`dist/stops.html — ${(page.length / 1024).toFixed(0)} KB`);

const leftovers = script.match(/^\s*(import|export) /gm);
if (leftovers) console.warn(`WARNING: ${leftovers.length} import/export statements survived bundling`);
