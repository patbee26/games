import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  backgroundBlurMm, motionBlurMm, handheldFloor, starTrailLimit, widestAt, sensorWidth,
  circleOfConfusion, apertureForDepth, hyperfocalAperture,
} from '../js/optics.js';
import { DEFAULT_GEAR } from '../js/gear.js';

test('a portrait blurs its background far more than a distant sports shot', () => {
  const portrait = backgroundBlurMm({ focal: 85, aperture: 1.8, subject: 2, background: 6 });
  const sports = backgroundBlurMm({ focal: 135, aperture: 4, subject: 12, background: 40 });
  assert.ok(portrait > sports * 3, `portrait ${portrait.toFixed(3)} vs sports ${sports.toFixed(3)}`);
});

test('closing the aperture two stops halves the background blur', () => {
  const wide = backgroundBlurMm({ focal: 85, aperture: 2, subject: 2, background: 6 });
  const closed = backgroundBlurMm({ focal: 85, aperture: 4, subject: 2, background: 6 });
  assert.ok(Math.abs(closed / wide - 0.5) < 1e-9);
});

test('a background at or in front of the subject does not blur', () => {
  assert.equal(backgroundBlurMm({ focal: 85, aperture: 2, subject: 5, background: 5 }), 0);
  assert.equal(backgroundBlurMm({ focal: 85, aperture: 2, subject: 5, background: 3 }), 0);
});

test('1/1000 freezes a sprinter and 1/125 does not', () => {
  const args = { focal: 135, speed: 8, subject: 12 };
  const fast = motionBlurMm({ ...args, shutter: 1 / 1000 });
  const slow = motionBlurMm({ ...args, shutter: 1 / 125 });
  const frame = sensorWidth(1.5);
  assert.ok(fast / frame < 0.005, 'a sprint at 1/1000 should smear under half a percent of the frame');
  assert.ok(slow / frame > 0.02, 'at 1/125 it should be plainly visible');
});

test('the hand-held floor follows the reciprocal rule and respects stabilisation', () => {
  const plain = handheldFloor({ focal: 100, crop: 1, stabiliserStops: 0 });
  assert.ok(Math.abs(plain - 1 / 100) < 1e-9);
  const cropped = handheldFloor({ focal: 100, crop: 1.5, stabiliserStops: 0 });
  assert.ok(Math.abs(cropped - 1 / 150) < 1e-9);
  const assisted = handheldFloor({ focal: 100, crop: 1.5, stabiliserStops: 3 });
  assert.ok(Math.abs(assisted - 8 / 150) < 1e-9);
});

test('what the photographer says they trust is a hard cap', () => {
  const floor = handheldFloor({ focal: 100, crop: 1.5, stabiliserStops: 3, userSlowest: 1 / 60 });
  assert.equal(floor, 1 / 60, 'never suggest slower than the stated floor');
});

test('the 500 rule shortens with focal length and crop', () => {
  assert.ok(Math.abs(starTrailLimit({ focal: 20, crop: 1.5 }) - 500 / 30) < 1e-9);
  assert.ok(starTrailLimit({ focal: 35, crop: 1.5 }) < starTrailLimit({ focal: 20, crop: 1.5 }));
});

test('a zoom is slower at the long end, and a prime never varies', () => {
  const zoom = DEFAULT_GEAR.lenses.find((l) => l.id === 'tele');
  const prime = DEFAULT_GEAR.lenses.find((l) => l.id === 'prime');
  assert.ok(Math.abs(widestAt(zoom, 55) - 4) < 1e-9);
  assert.ok(Math.abs(widestAt(zoom, 200) - 5.6) < 1e-9);
  assert.ok(widestAt(zoom, 135) > 4 && widestAt(zoom, 135) < 5.6);
  assert.equal(widestAt(prime, 35), 1.8);
});

/* ------------------------------------------- what the guide tabs are built on */

test('apertureForDepth inverts the blur equation it is derived from', () => {
  // Round trip: the f-number it returns must put the far thing exactly on the
  // circle of confusion, or the guide is quoting a number the preview disagrees
  // with.
  const crop = 1.5;
  for (const focal of [24, 50, 135]) {
    const n = apertureForDepth({ focal, crop, subject: 3, far: 3.5 });
    const blur = backgroundBlurMm({ focal, aperture: n, subject: 3, background: 3.5 });
    assert.ok(Math.abs(blur - circleOfConfusion(crop)) < 1e-9,
      `at ${focal}mm the round trip missed: ${blur} vs ${circleOfConfusion(crop)}`);
  }
});

test('apertureForDepth declines rather than dividing by zero', () => {
  assert.equal(apertureForDepth({ focal: 50, crop: 1.5, subject: 3, far: 3 }), null);
  assert.equal(apertureForDepth({ focal: 50, crop: 1.5, subject: 3, far: 2 }), null);
});

test('at the same framing, depth of field barely depends on focal length', () => {
  // The claim the Aperture tab makes in words, asserted in numbers. The old flat
  // table implied the opposite, which is why it had to go.
  const crop = 1.5;
  const gap = 0.4;
  const needed = [24, 35, 50, 85, 135, 200].map((focal) => {
    const subject = 2.5 * (focal / 50); // stand back to hold the framing
    return apertureForDepth({ focal, crop, subject, far: subject + gap });
  });
  const spread = Math.max(...needed) / Math.min(...needed);
  assert.ok(spread < 1.5, `expected the f-numbers to stay close, spread was ${spread}`);
});

test('but background blur at the same framing grows with focal length', () => {
  // The other half of the same lesson: the long lens does not thin the depth on
  // the face, it magnifies what is behind it.
  const blurs = [24, 50, 135].map((focal) => {
    const subject = 2 * (focal / 50);
    return backgroundBlurMm({ focal, aperture: 2.8, subject, background: subject + 4 });
  });
  assert.ok(blurs[0] < blurs[1] && blurs[1] < blurs[2], 'blur must grow with focal length');
  assert.ok(blurs[2] / blurs[0] > 2, `expected a big difference, got ${blurs[2] / blurs[0]}`);
});

test('hyperfocalAperture puts infinity exactly on the circle of confusion', () => {
  const crop = 1.5;
  const n = hyperfocalAperture({ focal: 24, crop, from: 2.5 });
  const blur = backgroundBlurMm({ focal: 24, aperture: n, subject: 5, background: Infinity });
  assert.ok(Math.abs(blur - circleOfConfusion(crop)) < 1e-9,
    `focused at the hyperfocal distance, infinity should sit on the CoC: ${blur}`);
});

test('the guide numbers agree with the solver about the hand-held floor', () => {
  // The defect this replaced: a flat "1/160 for a portrait" that was a stop too
  // slow at 200mm and more than a stop too fast at 24mm.
  for (const focal of [24, 50, 200]) {
    const floor = handheldFloor({ focal, crop: 1.5, stabiliserStops: 0, userSlowest: null });
    assert.ok(Math.abs(floor - 1 / (focal * 1.5)) < 1e-12, 'the guide must use the solver\'s own rule');
  }
  assert.ok(handheldFloor({ focal: 200, crop: 1.5 }) < 1 / 160, '200mm needs faster than the old flat number');
  assert.ok(handheldFloor({ focal: 24, crop: 1.5 }) > 1 / 160, '24mm needs slower than the old flat number');
});
