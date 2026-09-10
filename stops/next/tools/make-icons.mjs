// Renders the mark into the files a phone needs on its home screen.
//
// Drawn from the same SVG the app shows in its header, so the icon and the
// header can never drift apart. Rendered through the browser that is already
// here for the screenshots, rather than by rasterising pixels by hand, which is
// what the first app had to do before that browser existed.
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '../../app/tools/playwright.mjs';
import { MARK } from '../js/brand.js';

const out = new URL('../icons/', import.meta.url);
mkdirSync(out, { recursive: true });

const BG = '#16181A';
const INK = '#ECEAE6';
const AMBER = '#E8A33D';

// Full bleed, with the mark inset, because iOS and Android both round and crop
// the square themselves and anything near the corner is what they take off.
const page = (size) => `<body style="margin:0">
  <div style="width:${size}px;height:${size}px;background:${BG};display:grid;place-items:center">
    <div style="width:${Math.round(size * 0.58)}px;height:${Math.round(size * 0.58)}px;color:${INK};--amber:${AMBER}">
      ${MARK}
    </div>
  </div>
</body>`;

// No width or height, only a viewBox, so it scales to whatever box it is put
// in. With them it rendered at a fixed 64 px and overflowed anything smaller,
// which is every place a favicon is actually used. The mark is drawn a little
// larger here than on the home-screen tiles, because this one spends its life
// at sixteen pixels in a browser tab.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${BG}"/>
  <g transform="translate(32 32) scale(0.68) translate(-32 -32)" fill="none">
    <path d="M48.58 22.82 A20 20 0 1 1 33.40 14.05" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="42" cy="16.68" r="5" fill="${AMBER}"/>
    <path d="M22.5 42.5 V26.8 L32 36.2 L41.5 26.8 V42.5" stroke="${INK}" stroke-width="3.6"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;
writeFileSync(new URL('icon.svg', out), svg);

const browser = await (await chromium()).launch();
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(page(size));
  await p.waitForTimeout(120);
  writeFileSync(new URL(name, out), await p.screenshot({ omitBackground: false }));
  await p.close();
  console.log(`  icons/${name}  ${size}x${size}`);
}
await browser.close();
console.log('icons/icon.svg written too. Run tools/bundle.mjs to precache them.');
