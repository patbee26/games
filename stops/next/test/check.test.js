import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readExif, evFrom, clippedFraction } from '../js/exif.js';
import { diagnose, lightFrom } from '../js/diagnose.js';
import { lessonFor } from '../js/lessons.js';
import { jpegWithExif, jpegWithout } from './exiffile.js';

const CAMERA = { shutter: 1 / 60, aperture: 5.6, iso: 3200, focal: 105, lens: 'RF24-105mm F4 L IS USM' };

test('the settings come back out of a file a camera would write', () => {
  // The tags live in a second directory that the first one points at. A reader
  // that only walks the first returns nothing for every real photograph, and
  // does it silently, which is the failure worth a test.
  for (const endian of ['little', 'big']) {
    const got = readExif(jpegWithExif({ ...CAMERA, endian }));
    assert.ok(got, `${endian} endian file read as no settings`);
    assert.ok(Math.abs(got.shutter - 1 / 60) < 1e-6, `shutter came back ${got.shutter}`);
    assert.equal(got.aperture, 5.6);
    assert.equal(got.iso, 3200);
    assert.equal(got.focal, 105);
    assert.equal(got.lens, 'RF24-105mm F4 L IS USM');
  }
});

test('nothing throws on the files that will actually be handed to it', () => {
  // Every one of these is a thing a person will really pick: a photograph that
  // came through a messaging app, a screenshot, a half-finished download, a
  // PNG. None may throw, and none may invent settings.
  const half = jpegWithExif(CAMERA);
  const nothingToRead = {
    'stripped jpeg': jpegWithout(),
    'not a jpeg': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]).buffer,
    'empty': new ArrayBuffer(0),
    'two bytes': new Uint8Array([0xff, 0xd8]).buffer,
    'truncated in the header': half.slice(0, 14),
    'truncated mid directory': half.slice(0, Math.floor(half.byteLength * 0.6)),
    'marker chain corrupted': corrupt(half, 2, 0x00),
  };
  for (const [what, buffer] of Object.entries(nothingToRead)) {
    assert.doesNotThrow(() => readExif(buffer), `${what} threw`);
    assert.equal(readExif(buffer), null, `${what} claimed to have settings`);
  }

  // A segment header that lies about its own length is different: the tags are
  // still all there and still readable, so the honest answer is to read them.
  // The reader clamps to the real end of the file rather than trusting the
  // number, which is what stops it walking off the end.
  const lying = corrupt(half, 4, 0xff);
  assert.doesNotThrow(() => readExif(lying));
  assert.deepEqual(readExif(lying), readExif(half),
    'a corrupt segment length should not change what the tags say');
});

test('a file that records only part of the exposure is treated as recording none', () => {
  // Two of the three numbers cannot be worked back into a light level, so a
  // partial answer would be worse than the manual form.
  assert.equal(readExif(jpegWithExif({ shutter: 1 / 60, focal: 50 })), null);
  assert.equal(readExif(jpegWithExif({ aperture: 4, iso: 100 })), null);
  assert.ok(readExif(jpegWithExif({ shutter: 1 / 60, aperture: 4, iso: 100 })));
});

test('nonsense values are refused rather than passed on', () => {
  // A zero denominator, or an ISO of four million, means the file is lying or
  // the parse went wrong. Either way the manual form is the better answer.
  assert.equal(readExif(jpegWithExif({ shutter: 1 / 60, aperture: 4, iso: 1 })), null);
});

test('the light is worked back out of the exposure', () => {
  // Sunny 16, from the other direction.
  assert.ok(Math.abs(evFrom({ aperture: 16, shutter: 1 / 100, iso: 100 }) - 14.6) < 0.2);
  assert.equal(lightFrom(evFrom({ aperture: 16, shutter: 1 / 100, iso: 100 })).id, 'harsh-sun');
  assert.equal(lightFrom(evFrom(CAMERA)).id, 'room-night');
  assert.equal(evFrom({ aperture: 4, shutter: null, iso: 100 }), null);
});

test('a photograph taken on the card is told so, and nothing else', () => {
  const scene = lessonFor('kids');
  const d = diagnose({ scene, exif: { shutter: scene.shutter, aperture: scene.aperture, iso: 400, focal: scene.focal } });
  assert.equal(d.findings.length, 1);
  assert.equal(d.findings[0].tone, 'good');
});

test('a wrong choice and an impossible one are told apart', () => {
  // The distinction the whole feature rests on. Same scene, same shutter miss,
  // different light: indoors the card was never available and saying "your
  // shutter was wrong" would be blaming someone for the laws of physics.
  const scene = lessonFor('kids');
  const indoors = diagnose({ scene, exif: { shutter: 1 / 60, aperture: 5.6, iso: 3200, focal: 50 } });
  assert.ok(indoors.tooDark, 'ISO 3200 at 1/60 indoors should put the card out of reach');
  assert.equal(indoors.findings[0].key, 'light');
  assert.match(indoors.findings[0].body, /needed ISO/);

  // Outdoors the same mistake really is a mistake: there was ISO to spare.
  const outdoors = diagnose({ scene, exif: { shutter: 1 / 60, aperture: 5.6, iso: 100, focal: 50 } });
  assert.equal(outdoors.tooDark, false);
  assert.equal(outdoors.findings[0].key, 'shutter');
});

test('the finding that matters most is the one at the top', () => {
  const d = diagnose({
    scene: lessonFor('portrait'),
    exif: { shutter: 1 / 250, aperture: 11, iso: 200, focal: 50 },
  });
  assert.equal(d.findings[0].tone, 'miss');
  assert.equal(d.findings[0].key, 'aperture');
  assert.ok(d.findings.some((f) => f.key === 'focal'), 'the lens difference should still be mentioned');
});

test('a scene that needs a filter says so rather than blaming the photographer', () => {
  const d = diagnose({ scene: lessonFor('water'), exif: { shutter: 1 / 500, aperture: 8, iso: 100, focal: 24 } });
  assert.match(d.findings[0].body, /neutral-density/);
});

test('camera shake is named on the scenes that have no shutter lesson', () => {
  // Landscape teaches focal length, so a slow shutter there is not about the
  // subject moving. It is about the photographer.
  const d = diagnose({ scene: lessonFor('landscape'), exif: { shutter: 1 / 4, aperture: 8, iso: 100, focal: 24 } });
  const shutter = d.findings.find((f) => f.key === 'shutter');
  assert.ok(shutter);
  assert.match(shutter.head, /hands/);
});

test('a crop-sensor focal length is compared in the terms the app is written in', () => {
  // Every scene is stated in full-frame millimetres. A camera that records both
  // is telling us which is which, and using the wrong one would report a
  // difference that is not there.
  const scene = lessonFor('portrait');
  const d = diagnose({ scene, exif: { shutter: 1 / 1000, aperture: 4, iso: 400, focal: 70, focal35: 105 } });
  assert.equal(d.focal, 105);
  assert.ok(!d.findings.some((f) => f.key === 'focal'), 'equivalent focal lengths should not be flagged');
});

test('blown highlights are counted, and only when they are really blown', () => {
  const white = new Uint8ClampedArray(400).fill(255);
  assert.equal(clippedFraction(white), 1);
  const grey = new Uint8ClampedArray(400).fill(180);
  assert.equal(clippedFraction(grey), 0);
  assert.equal(clippedFraction(new Uint8ClampedArray(0)), 0);
  assert.equal(clippedFraction(null), 0);
});

function corrupt(buffer, at, byte) {
  const copy = new Uint8Array(buffer.slice(0));
  copy[at] = byte;
  return copy.buffer;
}
