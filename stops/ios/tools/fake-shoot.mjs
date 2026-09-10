#!/usr/bin/env node
// Fakes an afternoon out with a camera, so the debrief can be seen working in
// the simulator.
//
// The simulator's photo library contains sample pictures from Apple and nothing
// else, and the debrief deliberately ignores anything the phone itself took. So
// there is nothing to test against until something that looks like a camera
// file exists. This writes a set of them: real photographs from the app's own
// asset catalogue, with an exposure block spliced into the head of each file
// saying what a camera would have said.
//
//   node ios/tools/fake-shoot.mjs shake
//   xcrun simctl addmedia booted /tmp/offauto-shoot/*.jpg
//
// Every scenario is built to land on exactly one finding, which the script
// names before it writes anything. If the app says something else, that is a
// real disagreement and worth chasing.

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, '..', 'OffAuto', 'Assets.xcassets');

// ---------------------------------------------------------------- the shoots

// Each frame is [aperture, shutter denominator, ISO, focal length]. The numbers
// are chosen against the rules in Debrief.swift: the scenario's own finding has
// to fire, and every finding ahead of it in the order has to not fire, which is
// most of why these are longer than they look like they need to be.
const SHOOTS = {
  shake: {
    kind: 'shake',
    expects: 'Four were slower than your hands hold at 105 mm.',
    about: 'A long lens as the light went. Four frames under the reciprocal rule, the rest fine.',
    scene: 'portrait',
    frames: [
      [4, 250, 400, 105], [4, 200, 400, 105], [4, 160, 800, 105],
      [4, 60, 1600, 105], [4, 40, 1600, 105], [4, 30, 3200, 105],
      [4, 125, 1600, 105], [2.8, 250, 800, 105], [4, 25, 3200, 105],
      [4, 200, 1600, 105],
    ],
  },
  grain: {
    kind: 'grain',
    expects: 'Six were grainier than they needed to be.',
    about: 'Indoors, stopped down, with a lens that had four stops of aperture going spare.',
    scene: 'indoor',
    frames: [
      [5.6, 125, 6400, 50], [5.6, 125, 6400, 50], [4, 125, 12800, 50],
      [5.6, 125, 3200, 50], [2, 250, 1600, 50], [2.8, 125, 2000, 50],
      [4, 160, 6400, 50], [5.6, 125, 8000, 50],
    ],
  },
  oneAperture: {
    kind: 'oneAperture',
    expects: 'Every frame was at f/8.',
    about: 'An afternoon that went from sun to indoors with the aperture never touched.',
    scene: 'street',
    frames: [
      [8, 500, 100, 35], [8, 500, 100, 35], [8, 250, 200, 35],
      [8, 250, 400, 35], [8, 125, 800, 35], [8, 125, 1600, 35],
      [8, 200, 400, 35], [8, 320, 200, 35],
    ],
  },
  spread: {
    kind: 'spread',
    expects: 'You worked 6 stops of aperture across this set.',
    about: 'The aperture used as a decision. This one is a compliment.',
    scene: 'landscape',
    frames: [
      [2, 1000, 100, 85], [2.8, 500, 100, 85], [4, 500, 200, 50],
      [5.6, 250, 400, 50], [8, 250, 800, 35], [11, 125, 1600, 35],
      [16, 125, 1600, 24], [16, 60, 1600, 24],
    ],
  },
  steady: {
    kind: 'steady',
    expects: 'Nothing here was slower than your hands could hold.',
    about: 'Dim, hand held, and never once dropped below the limit. Also a compliment.',
    scene: 'food',
    frames: [
      [2.8, 60, 1600, 50], [2.8, 80, 1600, 50], [4, 100, 2500, 50],
      [4, 100, 2500, 50], [4, 125, 2000, 50], [5.6, 125, 2000, 50],
      [5.6, 160, 2500, 50], [2.8, 60, 1250, 50],
    ],
  },
  quiet: {
    kind: null,
    expects: 'nothing at all',
    about: 'Three frames is a test shot and a picture of a cat, not a shoot. The app should say nothing.',
    scene: 'kids',
    frames: [[4, 250, 400, 50], [4, 250, 400, 50], [4, 250, 400, 50]],
  },
};

// ------------------------------------------------------------- writing exif

const ASCII = 2, SHORT = 3, LONG = 4, RATIONAL = 5, UNDEFINED = 7;

const ascii = (s) => Buffer.from(s + '\0', 'latin1');
const short = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const long = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const rational = (num, den) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(num, 0); b.writeUInt32LE(den, 4);
  return b;
};

/// One image file directory: a count, twelve bytes per entry, a link to the
/// next one, and then anything too big to sit inside an entry. Offsets are
/// measured from the start of the whole tiff block, never from here, which is
/// the single thing worth being careful about in this format.
function buildIFD(entries, ifdOffset) {
  const sorted = entries.slice().sort((a, b) => a.tag - b.tag);
  const ifd = Buffer.alloc(2 + sorted.length * 12 + 4);
  ifd.writeUInt16LE(sorted.length, 0);
  const overflow = [];
  let dataOffset = ifdOffset + ifd.length;
  sorted.forEach((entry, index) => {
    const at = 2 + index * 12;
    ifd.writeUInt16LE(entry.tag, at);
    ifd.writeUInt16LE(entry.type, at + 2);
    ifd.writeUInt32LE(entry.count, at + 4);
    if (entry.data.length <= 4) {
      entry.data.copy(ifd, at + 8);
    } else {
      ifd.writeUInt32LE(dataOffset, at + 8);
      overflow.push(entry.data);
      dataOffset += entry.data.length;
      if (entry.data.length % 2) { overflow.push(Buffer.alloc(1)); dataOffset += 1; }
    }
  });
  return { block: Buffer.concat([ifd, ...overflow]), size: dataOffset - ifdOffset };
}

function buildExif({ make, model, taken, aperture, shutter, iso, focal }) {
  const stamp = [
    taken.getFullYear(),
    ':', String(taken.getMonth() + 1).padStart(2, '0'),
    ':', String(taken.getDate()).padStart(2, '0'),
    ' ', String(taken.getHours()).padStart(2, '0'),
    ':', String(taken.getMinutes()).padStart(2, '0'),
    ':', String(taken.getSeconds()).padStart(2, '0'),
  ].join('');

  const zeroth = [
    { tag: 0x010F, type: ASCII, count: make.length + 1, data: ascii(make) },
    { tag: 0x0110, type: ASCII, count: model.length + 1, data: ascii(model) },
    { tag: 0x0132, type: ASCII, count: 20, data: ascii(stamp) },
    { tag: 0x8769, type: LONG, count: 1, data: long(0) },   // patched below
  ];

  // Sized first, because the pointer to the exif directory cannot be written
  // until it is known where that directory lands, and where it lands depends on
  // how much overflow the first one has.
  const trial = buildIFD(zeroth, 8);
  const exifOffset = 8 + trial.size;
  zeroth[3].data = long(exifOffset);
  const first = buildIFD(zeroth, 8);

  const exif = buildIFD([
    { tag: 0x829A, type: RATIONAL, count: 1, data: rational(1, shutter) },
    { tag: 0x829D, type: RATIONAL, count: 1, data: rational(Math.round(aperture * 100), 100) },
    { tag: 0x8827, type: SHORT, count: 1, data: short(Math.min(iso, 65535)) },
    { tag: 0x9000, type: UNDEFINED, count: 4, data: Buffer.from('0231', 'latin1') },
    { tag: 0x9003, type: ASCII, count: 20, data: ascii(stamp) },
    { tag: 0x9004, type: ASCII, count: 20, data: ascii(stamp) },
    { tag: 0x920A, type: RATIONAL, count: 1, data: rational(focal, 1) },
    { tag: 0xA405, type: SHORT, count: 1, data: short(focal) },
  ], exifOffset);

  const header = Buffer.alloc(8);
  header.write('II', 0, 'latin1');
  header.writeUInt16LE(42, 2);
  header.writeUInt32LE(8, 4);
  return Buffer.concat([header, first.block, exif.block]);
}

/// Splices the block in as the first thing after the start of the file, and
/// drops any application segment that was already there, so nothing the source
/// photograph carried can contradict it.
function withExif(jpeg, tiff) {
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const app1 = Buffer.alloc(4);
  app1.writeUInt16BE(0xFFE1, 0);
  app1.writeUInt16BE(payload.length + 2, 2);

  const keep = [];
  let at = 2;
  while (at < jpeg.length - 1) {
    if (jpeg[at] !== 0xFF) break;
    const marker = jpeg[at + 1];
    if (marker === 0xDA) { keep.push(jpeg.subarray(at)); break; }
    const length = jpeg.readUInt16BE(at + 2);
    if (marker < 0xE0 || marker > 0xEF) keep.push(jpeg.subarray(at, at + 2 + length));
    at += 2 + length;
  }
  return Buffer.concat([jpeg.subarray(0, 2), app1, payload, ...keep]);
}

// -------------------------------------------------------------- reading back

/// A second, separate parser, written from the format rather than from the code
/// above. Its whole job is to disagree if the writer has an offset wrong, which
/// is the only mistake in this format that is easy to make and impossible to
/// see.
function readExif(jpeg) {
  let at = 2;
  let tiff = null;
  while (at < jpeg.length - 1 && jpeg[at] === 0xFF) {
    const marker = jpeg[at + 1];
    if (marker === 0xDA) break;
    const length = jpeg.readUInt16BE(at + 2);
    if (marker === 0xE1 && jpeg.subarray(at + 4, at + 8).toString('latin1') === 'Exif') {
      tiff = jpeg.subarray(at + 10, at + 2 + length);
      break;
    }
    at += 2 + length;
  }
  if (!tiff) throw new Error('no exif segment');
  if (tiff.toString('latin1', 0, 2) !== 'II' || tiff.readUInt16LE(2) !== 42) {
    throw new Error('not a little-endian tiff');
  }

  const found = {};
  const walk = (offset) => {
    if (offset + 2 > tiff.length) throw new Error(`directory at ${offset} is past the end`);
    const count = tiff.readUInt16LE(offset);
    for (let i = 0; i < count; i += 1) {
      const at = offset + 2 + i * 12;
      const tag = tiff.readUInt16LE(at);
      const type = tiff.readUInt16LE(at + 2);
      const size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 }[type] ?? 1;
      const bytes = size * tiff.readUInt32LE(at + 4);
      let value = tiff.subarray(at + 8, at + 12);
      if (bytes > 4) {
        const where = tiff.readUInt32LE(at + 8);
        if (where + bytes > tiff.length) throw new Error(`tag ${tag} points past the end`);
        value = tiff.subarray(where, where + bytes);
      }
      if (type === ASCII) found[tag] = value.toString('latin1').replace(/\0.*$/, '');
      else if (type === SHORT) found[tag] = value.readUInt16LE(0);
      else if (type === LONG) found[tag] = value.readUInt32LE(0);
      else if (type === RATIONAL) found[tag] = value.readUInt32LE(0) / value.readUInt32LE(4);
      else found[tag] = value.toString('latin1');
    }
  };
  walk(tiff.readUInt32LE(4));
  if (found[0x8769]) walk(found[0x8769]);
  return found;
}

// -------------------------------------------------------------------- running

function sourcePhotographs(scene) {
  const sets = readdirSync(ASSETS)
    .filter((name) => name.endsWith('.imageset') && name.startsWith(scene))
    .sort();
  const names = sets.length ? sets : [`${scene}.imageset`];
  return names.map((set) => {
    const dir = join(ASSETS, set);
    const file = readdirSync(dir).find((name) => name.endsWith('.jpg'));
    return readFileSync(join(dir, file));
  });
}

const wanted = process.argv[2];
const out = process.argv[3] ?? join(tmpdir(), 'offauto-shoot');

// The promise each scenario makes about what the app will say is only worth
// making if something checks it. This hands the table to the Swift tests, which
// run the shipped analysis over the same numbers and assert the same sentence.
if (wanted === '--fixture') {
  const path = resolve(HERE, '..', 'OffAutoKit', 'Tests', 'OffAutoKitTests', 'shoots.json');
  const table = Object.entries(SHOOTS).map(([name, shoot]) => ({
    name, kind: shoot.kind, expects: shoot.expects,
    frames: shoot.frames.map(([aperture, shutter, iso, focal], index) => ({
      // Ninety seconds apart, counted from the first frame, which is all the
      // grouping cares about.
      second: index * 90, aperture, shutter: 1 / shutter, iso, focal,
    })),
  }));
  writeFileSync(path, JSON.stringify(table, null, 2) + '\n');
  console.log(`wrote ${path}`);
  process.exit(0);
}

if (!wanted || !SHOOTS[wanted]) {
  console.log('\nWhich shoot?\n');
  for (const [name, shoot] of Object.entries(SHOOTS)) {
    console.log(`  ${name.padEnd(13)} ${shoot.about}`);
    console.log(`  ${''.padEnd(13)} the app should say: ${shoot.expects}\n`);
  }
  console.log('  node ios/tools/fake-shoot.mjs <name> [output directory]\n');
  process.exit(wanted ? 1 : 0);
}

const shoot = SHOOTS[wanted];
const photographs = sourcePhotographs(shoot.scene);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Two hours ago, ninety seconds between frames. Recent enough to be the latest
// session on any library, and spaced tightly enough to be one session rather
// than several.
const ended = new Date(Date.now() - 2 * 3600 * 1000);

shoot.frames.forEach(([aperture, shutter, iso, focal], index) => {
  const taken = new Date(ended.getTime() - (shoot.frames.length - index) * 90 * 1000);
  const tiff = buildExif({
    make: 'FUJIFILM', model: 'X-T5', taken, aperture, shutter, iso, focal,
  });
  const file = withExif(photographs[index % photographs.length], tiff);

  // Proof, before it is written rather than after, that the bytes say what the
  // frame said. A silently wrong offset here would look exactly like a bug in
  // the app, and would be chased there for an hour.
  const back = readExif(file);
  const same = Math.abs(back[0x829D] - aperture) < 0.005
    && Math.abs(back[0x829A] - 1 / shutter) < 1e-9
    && back[0x8827] === iso
    && back[0xA405] === focal
    && back[0x010F] === 'FUJIFILM';
  if (!same) throw new Error(`frame ${index + 1} did not read back: ${JSON.stringify(back)}`);

  const stamp = String(index + 1).padStart(3, '0');
  writeFileSync(join(out, `DSCF${stamp}.jpg`), file);
});

console.log(`\n${shoot.frames.length} frames written to ${out}`);
console.log(`Every one read back correctly.\n`);
console.log(`  xcrun simctl addmedia booted ${out}/*.jpg\n`);
console.log(`Then in the app: gear page, "Look again". It should say:`);
console.log(`  ${shoot.expects}\n`);
