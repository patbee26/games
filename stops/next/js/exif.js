// Reading what the camera actually did, from the file, on the phone.
//
// This exists so the tutorial can close its loop. It tells you what to set and
// shows you what that looks like; without this it never finds out whether you
// got it. Everything here runs on the device and the picture is never uploaded,
// which is not a technical detail but the reason the feature is allowed to
// exist at all: these are photographs of somebody's family.
//
// The layout, for anyone who has not met it: a JPEG is a chain of markers. One
// of them, APP1, holds a TIFF file, which holds a directory of tags. The four
// numbers we want are not in that first directory. They are in a second one it
// points at, which is the single thing most naive EXIF readers get wrong and
// then quietly return nothing.
//
// Nothing in here throws. A stripped file, a screenshot, a truncated download
// and a PNG all have to come back as "no settings recorded" rather than as an
// error, because that path is common and the app has a real answer for it.

const EXIF_IFD = 0x8769;

const TAG = {
  0x829a: ['shutter', 'rational'],     // ExposureTime, in seconds
  0x829d: ['aperture', 'rational'],    // FNumber
  0x8827: ['iso', 'int'],              // ISOSpeedRatings
  0x8833: ['isoLong', 'int'],          // ISOSpeed, used when the value is over 65535
  0x920a: ['focal', 'rational'],       // FocalLength, in mm
  0xa405: ['focal35', 'int'],          // FocalLengthIn35mmFilm
  0x9201: ['shutterApex', 'srational'],
  0x9202: ['apertureApex', 'srational'],
  0xa434: ['lens', 'ascii'],
  0x9003: ['taken', 'ascii'],          // DateTimeOriginal
};

const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

/**
 * The settings a photograph was taken at, or null if the file does not carry
 * them. Takes an ArrayBuffer, which is what a File reads as.
 */
export function readExif(buffer) {
  try {
    return parse(new DataView(buffer));
  } catch {
    // A malformed file is not an error here. It is the fallback path.
    return null;
  }
}

function parse(v) {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;   // not a JPEG

  // Walk the marker chain to APP1. Bounded by the file length, so a truncated
  // or lying segment size ends the walk rather than spinning.
  let p = 2;
  while (p + 4 <= v.byteLength) {
    if (v.getUint8(p) !== 0xff) return null;
    const marker = v.getUint16(p);
    if (marker === 0xffda || marker === 0xffd9) return null;         // image data, or the end
    const size = v.getUint16(p + 2);
    if (size < 2) return null;
    if (marker === 0xffe1 && p + 10 <= v.byteLength && ascii(v, p + 4, 4) === 'Exif') {
      return readTiff(v, p + 10, Math.min(v.byteLength, p + 2 + size));
    }
    p += 2 + size;
  }
  return null;
}

function readTiff(v, tiff, end) {
  const order = v.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return null;
  const le = order === 0x4949;
  if (v.getUint16(tiff + 2, le) !== 42) return null;

  const found = {};
  const ifd0 = tiff + v.getUint32(tiff + 4, le);
  const pointer = readIfd(v, tiff, ifd0, end, le, found);
  if (pointer) readIfd(v, tiff, tiff + pointer, end, le, found);

  return usable(found);
}

/** Reads one directory into `out`, and returns the offset of the Exif one. */
function readIfd(v, tiff, ifd, end, le, out) {
  if (ifd + 2 > end) return 0;
  const count = v.getUint16(ifd, le);
  if (count > 512) return 0;                                          // not a real directory
  let pointer = 0;
  for (let i = 0; i < count; i++) {
    const at = ifd + 2 + i * 12;
    if (at + 12 > end) break;
    const tag = v.getUint16(at, le);
    if (tag === EXIF_IFD) { pointer = v.getUint32(at + 8, le); continue; }
    const known = TAG[tag];
    if (!known) continue;
    const [name, kind] = known;
    const type = v.getUint16(at + 2, le);
    const n = v.getUint32(at + 4, le);
    const bytes = (SIZE[type] ?? 0) * n;
    if (!bytes) continue;
    // Four bytes or fewer live in the entry itself; anything larger is a pointer.
    const at8 = bytes <= 4 ? at + 8 : tiff + v.getUint32(at + 8, le);
    if (at8 < 0 || at8 + Math.min(bytes, 8) > end) continue;
    const value = readValue(v, at8, type, n, le, kind);
    if (value != null) out[name] = value;
  }
  return pointer;
}

function readValue(v, at, type, n, le, kind) {
  if (kind === 'ascii') return ascii(v, at, n).replace(/\0.*$/, '').trim() || null;
  if (type === 3) return v.getUint16(at, le);
  if (type === 4) return v.getUint32(at, le);
  if (type === 5 || type === 10) {
    const num = type === 5 ? v.getUint32(at, le) : v.getInt32(at, le);
    const den = type === 5 ? v.getUint32(at + 4, le) : v.getInt32(at + 4, le);
    if (!den) return null;
    return num / den;
  }
  return null;
}

const ascii = (v, at, n) => {
  let s = '';
  for (let i = 0; i < n && at + i < v.byteLength; i++) s += String.fromCharCode(v.getUint8(at + i));
  return s;
};

/**
 * Fills in from the APEX forms when a camera recorded those instead, and drops
 * anything that came back nonsensical.
 *
 * Returns null when nothing usable survived, so that one check upstream covers
 * both "no EXIF at all" and "EXIF that says nothing about the exposure".
 */
function usable(f) {
  const out = {};
  // APEX shutter is -log2(seconds); APEX aperture is 2*log2(f-number).
  const shutter = f.shutter ?? (f.shutterApex != null ? Math.pow(2, -f.shutterApex) : null);
  const aperture = f.aperture ?? (f.apertureApex != null ? Math.pow(2, f.apertureApex / 2) : null);
  const iso = f.iso === 65535 ? f.isoLong : (f.iso ?? f.isoLong);

  if (shutter > 0 && shutter <= 3600) out.shutter = shutter;
  if (aperture >= 0.7 && aperture <= 90) out.aperture = aperture;
  if (iso >= 6 && iso <= 4_000_000) out.iso = iso;
  if (f.focal > 0 && f.focal <= 5000) out.focal = f.focal;
  if (f.focal35 > 0 && f.focal35 <= 5000) out.focal35 = f.focal35;
  if (f.lens) out.lens = f.lens;
  if (f.taken) out.taken = f.taken;

  return out.shutter && out.aperture && out.iso ? out : null;
}

/**
 * The light the photographer was standing in, worked back out of what they
 * shot. This is the quiet win of reading the file: with the light known, the
 * app can tell the difference between "you chose wrongly" and "the card's
 * settings were not available to you", which are opposite lessons.
 *
 *   EV = log2(N squared / t) - log2(ISO / 100)
 */
export function evFrom({ aperture, shutter, iso }) {
  if (!aperture || !shutter || !iso) return null;
  return Math.log2((aperture * aperture) / shutter) - Math.log2(iso / 100);
}

/**
 * How much of the frame is pure white, as a fraction.
 *
 * The one pixel measure worth trusting. A sharpness score would mark down a
 * portrait for having a soft background, which is the thing the app just spent
 * a screen teaching the reader to want; clipped highlights are unambiguous and
 * unrecoverable. Takes the raw RGBA array from a canvas.
 */
export function clippedFraction(data) {
  if (!data || !data.length) return 0;
  let blown = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250) blown++;
  }
  return blown / pixels;
}
