import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  backgroundBlurMm, motionBlurMm, handheldFloor, starTrailLimit, widestAt, sensorWidth,
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
