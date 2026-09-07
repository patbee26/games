// Playwright is a developer dependency of these tools, not of the app, and on
// this machine it lives in a global prefix. ESM ignores NODE_PATH, so resolve it
// by hand rather than assuming a local node_modules.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const CANDIDATES = [
  'playwright',
  '/opt/node22/lib/node_modules/playwright/index.js',
  '/usr/lib/node_modules/playwright/index.js',
  '/usr/local/lib/node_modules/playwright/index.js',
];

export async function chromium() {
  const require = createRequire(import.meta.url);
  for (const candidate of CANDIDATES) {
    const isPath = candidate.startsWith('/');
    if (isPath && !existsSync(candidate)) continue;
    try {
      const mod = isPath ? require(candidate) : await import(candidate);
      const pw = mod.default ?? mod;
      if (pw?.chromium) return pw.chromium;
    } catch { /* try the next one */ }
  }
  throw new Error(
    'Playwright not found. These tools need it to decode and rescale images.\n'
    + 'Install it (npm i -D playwright) or set one of: ' + CANDIDATES.slice(1).join(', '),
  );
}
