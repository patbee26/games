// Flattens the app into one self-contained HTML page: modules concatenated in
// dependency order, stylesheet inlined, fonts embedded as data URIs. Used to
// publish a version that opens from a link on a phone. The app in this
// directory stays the deployable artefact — this is a copy of it, not a build
// step it depends on.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// Dependency order: every module imports only from the ones above it.
const MODULES = ['js/ladders.js', 'js/optics.js', 'js/exposure.js', 'js/data.js',
  'js/gear.js', 'js/icons.js', 'js/preview.js', 'js/sun.js', 'js/craft.js', 'js/app.js'];

const script = MODULES.map((file) => read(file)
  .replace(/^import[\s\S]*?from '[^']+';$/gm, '')
  .replace(/^export (const|function|class|let) /gm, '$1 ')
  // A single page has no service worker to register against.
  .replace(/^if \('serviceWorker' in navigator\) \{[\s\S]*?^\}$/gm, ''))
  .join('\n');

// The fonts have to travel with the page: nothing external loads here.
const fonts = read('fonts.css').replace(/url\(fonts\/([^)]+)\)/g, (_, name) =>
  `url(data:font/woff2;base64,${readFileSync(new URL('fonts/' + name, root)).toString('base64')})`);

const page = `<title>Stops</title>
<style>
${fonts}
${read('styles.css')}
/* A single hosted page sizes from the viewport rather than from the document. */
html, body { height: 100dvh; }
</style>

<main id="app" aria-live="polite"></main>
<nav id="tabs" aria-label="Sections"></nav>

<script type="module">
${script}
</script>
`;

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/stops.html', import.meta.url), page);
console.log(`dist/stops.html — ${(page.length / 1024).toFixed(0)} KB`);

const leftovers = script.match(/^\s*(import|export) /gm);
if (leftovers) console.warn(`WARNING: ${leftovers.length} import/export statements survived bundling`);
