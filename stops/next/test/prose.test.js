import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SKIP = new Set(['node_modules', 'dist', '.git', 'fonts', 'photos', 'thumbs', 'icons', 'design']);
const EXT = ['.js', '.mjs', '.css', '.html', '.md', '.json', '.webmanifest'];

// Built from its code point rather than typed, so this file is not its own
// first offender.
const EM_DASH = String.fromCharCode(0x2014);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (EXT.some((e) => entry.name.endsWith(e)) && statSync(path).size < 2_000_000) out.push(path);
  }
  return out;
}

test('nothing anywhere uses an em dash', () => {
  // Asked for directly: an em dash in running prose reads as machine-written,
  // and this app's whole voice depends on not sounding like that. A colon, a
  // full stop or a pair of commas says the same thing and does not announce
  // itself. Worth a test rather than a habit, because it is one keystroke to
  // reintroduce and invisible in review.
  const offenders = [];
  for (const path of walk(ROOT)) {
    const text = readFileSync(path, 'utf8');
    if (!text.includes(EM_DASH)) continue;
    const line = text.slice(0, text.indexOf(EM_DASH)).split('\n').length;
    offenders.push(`${path.slice(ROOT.length)}:${line}`);
  }
  assert.deepEqual(offenders, [], `em dash in: ${offenders.join(', ')}`);
});
