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
  'js/gear.js', 'js/icons.js', 'js/preview.js', 'js/sun.js', 'js/craft.js', 'js/scenery.js', 'js/photos.js', 'js/variants.js', 'js/variantpick.js', 'js/app.js'];

let script = MODULES.map((file) => read(file)
  .replace(/^import[\s\S]*?from '[^']+';$/gm, '')
  .replace(/^export (const|function|class|let) /gm, '$1 ')
  // A single page has no service worker to register against.
  .replace(/^if \('serviceWorker' in navigator\) \{[\s\S]*?^\}$/gm, ''))
  .join('\n');

// The pictures have to travel with the page too, so each path lookup is swapped
// for an inlined table. Both directories go through the same helper: a new one
// is a line here rather than another copy of this.
function inline(dir, line, table, fn) {
  const files = {};
  for (const file of readdirSync(new URL(dir + '/', root))) {
    if (!file.endsWith('.jpg')) continue;
    files[file.replace('.jpg', '')] =
      'data:image/jpeg;base64,' + readFileSync(new URL(`${dir}/${file}`, root)).toString('base64');
  }
  if (!script.includes(line)) {
    console.warn(`WARNING: ${dir} lookup not found, ${dir} will not be inlined`);
    return;
  }
  script = script.replace(line,
    `const ${table} = ${JSON.stringify(files)};\nconst ${fn} = (sceneId) => ${table}[sceneId] ?? null;`);
}

inline('photos', 'const photoFor = (sceneId) => (PHOTOS[sceneId] ? `photos/${sceneId}.jpg` : null);',
  '__PHOTOS', 'photoFor');
inline('thumbs', 'const thumbFor = (sceneId) => (THUMBS.has(sceneId) ? `thumbs/${sceneId}.jpg` : null);',
  '__THUMBS', 'thumbFor');

// The variants are keyed scene__axis-step, which is exactly their filename, so
// the same helper covers them with a different lookup shape.
inlineVariants();
function inlineVariants() {
  const files = {};
  let dir;
  try { dir = readdirSync(new URL('photos/variants/', root)); } catch { return; }
  for (const file of dir) {
    if (!file.endsWith('.jpg')) continue;
    files[file.replace('.jpg', '')] =
      'data:image/jpeg;base64,' + readFileSync(new URL('photos/variants/' + file, root)).toString('base64');
  }
  if (!Object.keys(files).length) return; // no variants installed, nothing to do
  const before = script;
  script = script.replace(
    /const variantFor = \(sceneId, axis, step\) =>[\s\S]*?: null;/,
    `const __VARIANTS = ${JSON.stringify(files)};\n`
    + 'const variantFor = (sceneId, axis, step) =>\n'
    + '  (VARIANTS[sceneId]?.[axis] ?? []).includes(step)\n'
    + '    ? __VARIANTS[`${sceneId}__${axis}-${step}`] ?? null\n'
    + '    : null;');
  if (script === before) console.warn('WARNING: variant lookup not rewritten, variants will not load');
}

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
