// Builds JPEG files carrying real EXIF, for the reader to be tested against.
//
// Real cameras put the exposure tags in a second directory that the first one
// points at, and about half of them write big-endian. Testing only against a
// flat little-endian file would pass while the reader returned nothing for a
// Canon, which is the failure this is here to prevent.

const II = 0x4949;
const MM = 0x4d4d;

class Writer {
  constructor(le) { this.le = le; this.bytes = []; }
  u8(v) { this.bytes.push(v & 0xff); return this; }
  u16(v) { return this.le ? this.u8(v).u8(v >> 8) : this.u8(v >> 8).u8(v); }
  u32(v) { return this.le ? this.u8(v).u8(v >> 8).u8(v >> 16).u8(v >> 24)
                          : this.u8(v >> 24).u8(v >> 16).u8(v >> 8).u8(v); }
  at(i) { return this.bytes[i]; }
  set32(i, v) {
    const w = new Writer(this.le); w.u32(v);
    for (let k = 0; k < 4; k++) this.bytes[i + k] = w.bytes[k];
    return this;
  }
  get length() { return this.bytes.length; }
  buffer() { return Uint8Array.from(this.bytes).buffer; }
}

const RATIONAL = 5, SHORT = 3, ASCII = 2;

/**
 * A JPEG whose exposure tags sit in the Exif sub-IFD, the way a camera writes
 * them. `endian` is 'little' or 'big'.
 */
export function jpegWithExif({ shutter, aperture, iso, focal, lens, endian = 'little' }) {
  const le = endian === 'little';

  const sub = [];
  if (shutter) sub.push([0x829a, RATIONAL, ratio(shutter)]);
  if (aperture) sub.push([0x829d, RATIONAL, ratio(aperture)]);
  if (iso) sub.push([0x8827, SHORT, iso]);
  if (focal) sub.push([0x920a, RATIONAL, ratio(focal)]);
  if (lens) sub.push([0xa434, ASCII, lens + '\0']);

  // IFD0 holds one entry, the pointer to the sub-IFD. Both directories and all
  // their overflow values are laid out after the 8 byte TIFF header.
  const w = new Writer(le);
  w.u16(le ? II : MM).u16(42).u32(8);

  const ifd0Size = 2 + 1 * 12 + 4;
  const subAt = 8 + ifd0Size;
  w.u16(1);
  w.u16(0x8769).u16(4).u32(1).u32(subAt);      // ExifIFDPointer
  w.u32(0);                                     // no IFD1

  const subSize = 2 + sub.length * 12 + 4;
  let overflow = subAt + subSize;
  const tails = [];
  w.u16(sub.length);
  for (const [tag, type, value] of sub) {
    w.u16(tag).u16(type).u32(type === ASCII ? value.length : 1);
    if (type === RATIONAL) {
      w.u32(overflow);
      const t = new Writer(le); t.u32(value[0]).u32(value[1]);
      tails.push(t); overflow += 8;
    } else if (type === ASCII && value.length > 4) {
      w.u32(overflow);
      const t = new Writer(le); for (const c of value) t.u8(c.charCodeAt(0));
      tails.push(t); overflow += value.length;
    } else if (type === SHORT) {
      w.u16(value).u16(0);
    } else {
      for (const c of value) w.u8(c.charCodeAt(0));
      for (let i = value.length; i < 4; i++) w.u8(0);
    }
  }
  w.u32(0);
  for (const t of tails) w.bytes.push(...t.bytes);

  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...w.bytes];   // "Exif\0\0" + TIFF
  const size = payload.length + 2;
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe1, (size >> 8) & 0xff, size & 0xff, ...payload,
    0xff, 0xda, 0, 2,          // start of scan, so a reader that walks past APP1 stops
    0xff, 0xd9,
  ]).buffer;
}

/** A JPEG with no EXIF at all, which is what a shared or exported file looks like. */
export const jpegWithout = () =>
  Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0, 4, 0, 0, 0xff, 0xda, 0, 2, 0xff, 0xd9]).buffer;

function ratio(x) {
  if (x >= 1) return [Math.round(x * 100), 100];
  return [1, Math.round(1 / x)];
}
