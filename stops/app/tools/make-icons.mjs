// Draws the app mark — an aperture ring with three blades — straight into PNG
// files. Written by hand because the environment has no image tooling, and a
// PWA needs real PNGs (iOS in particular will not take an SVG).
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BG = [0x14, 0x10, 0x0a];
const FG = [0xe8, 0xa3, 0x3d];

const table = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const distanceToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/** Coverage of the mark at a point, supersampled to keep the edges clean. */
function coverage(x, y, size) {
  const c = size / 2;
  // The mark sits in the middle 62% of the tile so it survives a maskable crop.
  const R = size * 0.29;
  const stroke = size * 0.055;
  // The blades run from the ring to a point offset from centre, leaving the
  // triangular opening a real iris has. Meeting at the centre would draw a
  // peace sign instead.
  const inner = R * 0.36;
  const twist = (68 * Math.PI) / 180;
  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const px = x + (sx + 0.5) / 3;
      const py = y + (sy + 0.5) / 3;
      let inside = Math.abs(Math.hypot(px - c, py - c) - R) <= stroke / 2;
      for (let blade = 0; blade < 3 && !inside; blade++) {
        const angle = (blade * 2 * Math.PI) / 3 - Math.PI / 2;
        const ax = c + Math.cos(angle) * R;
        const ay = c + Math.sin(angle) * R;
        const bx = c + Math.cos(angle + twist) * inner;
        const by = c + Math.sin(angle + twist) * inner;
        if (distanceToSegment(px, py, ax, ay, bx, by) <= stroke / 2) inside = true;
      }
      if (inside) hits++;
    }
  }
  return hits / 9;
}

function draw(size) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = coverage(x, y, size);
      const i = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch++) pixels[i + ch] = Math.round(BG[ch] * (1 - a) + FG[ch] * a);
      pixels[i + 3] = 255;
    }
  }
  return png(size, pixels);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL('../icons/' + name, import.meta.url), draw(size));
  console.log('icons/' + name, size + 'px');
}

const R = 29;
const inner = R * 0.36;
const twist = (68 * Math.PI) / 180;
const blades = [0, 1, 2].map((b) => {
  const a = (b * 2 * Math.PI) / 3 - Math.PI / 2;
  const p = (angle, radius) => `${(50 + Math.cos(angle) * radius).toFixed(1)} ${(50 + Math.sin(angle) * radius).toFixed(1)}`;
  return `M${p(a, R)}L${p(a + twist, inner)}`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#14100A"/>
  <g fill="none" stroke="#E8A33D" stroke-width="5.5" stroke-linecap="round">
    <circle cx="50" cy="50" r="${R}"/>
    <path d="${blades}"/>
  </g>
</svg>
`;
writeFileSync(new URL('../icons/icon.svg', import.meta.url), svg);
console.log('icons/icon.svg');
