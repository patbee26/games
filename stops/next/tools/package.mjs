// Builds the directory you actually deploy.
//
// The app lives in next/ but reaches across to app/ for the physics, the fonts
// and the photographs, which is right for working on it and impossible to host:
// a page at the site root cannot refer to a sibling directory above it. So the
// package mirrors the two directories under one root, and because a leading
// "../" is clamped at the root by every browser's URL resolution, every path in
// the source resolves correctly with nothing rewritten:
//
//   /index.html   asks for ../app/fonts.css   and gets  /app/fonts.css
//   /js/app.js    imports ../../app/js/data.js and gets /app/js/data.js
//
// It also stamps the service worker's cache name with a hash of everything in
// the package. Six versions of this app shipped under one cache name because
// bumping it was a thing to remember, and things to remember do not get
// remembered.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

const here = new URL('../', import.meta.url);
const out = new URL('deploy/', here);

const sw = readFileSync(new URL('sw.js', here), 'utf8');
const assets = [...sw.matchAll(/^\s*'([^']+)',\s*$/gm)].map((m) => m[1]).filter((a) => a !== './');
const files = ['index.html', 'sw.js', ...assets];

rmSync(out, { recursive: true, force: true });
let missing = [];
let bytes = 0;
const hash = createHash('sha256');
for (const path of [...new Set(files)].sort()) {
  const from = new URL(path, here);
  if (!existsSync(from)) { missing.push(path); continue; }
  // "../app/x" becomes "app/x", which is where the browser will look for it.
  const to = new URL(path.replace(/^(\.\.\/)+/, ''), out);
  mkdirSync(dirname(to.pathname), { recursive: true });
  const body = readFileSync(from);
  hash.update(path).update(body);
  bytes += body.length;
  writeFileSync(to, body);
}
if (missing.length) {
  console.error(`${missing.length} file(s) the service worker precaches are not on disk:`);
  missing.forEach((m) => console.error('  ' + m));
  process.exit(1);
}

// Stamp the cache name, so every deploy retires the one before it.
const stamp = hash.digest('hex').slice(0, 7);
const swOut = new URL('sw.js', out);
const stamped = readFileSync(swOut, 'utf8')
  .replace(/^const CACHE = '[^']*';\s*\/\/ build:cache$/m, `const CACHE = 'stops-next-${stamp}';   // build:cache`);
if (!stamped.includes(stamp)) {
  console.error('sw.js has no `const CACHE = ...;   // build:cache` line to stamp. Fix the packager.');
  process.exit(1);
}
writeFileSync(swOut, stamped);

console.log(`deploy/ built: ${files.length} files, ${Math.round(bytes / 1024)} KB, cache stops-next-${stamp}`);
console.log('Deploy the contents of next/deploy/ as the site root.');
