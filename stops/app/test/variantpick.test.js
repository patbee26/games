import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apertureStep, focalStep, STEP_NOTE, STOP_STEPS, MAG_STEPS } from '../js/variantpick.js';
import { sceneById } from '../js/data.js';

const portrait = sceneById('portrait');
const forFocal = (focal) => focalStep({
  focal, baseFocal: portrait.focal, subject: portrait.subject, background: portrait.background,
});

test('the aperture step is measured from the lens, not from the f-number', () => {
  // The defect this guards: picking on the number alone shows the stopped-down
  // photograph to someone shooting wide open on a slow zoom. f/5.6 is wide open
  // on one of these lenses and well stopped down on the other.
  assert.equal(apertureStep({ aperture: 5.6, widest: 5.6 }), 'wide');
  assert.equal(apertureStep({ aperture: 5.6, widest: 1.8 }), 'mid');
  assert.equal(apertureStep({ aperture: 8, widest: 1.8 }), 'deep');
});

test('every aperture step is reachable on a fast prime and on a slow zoom', () => {
  // A set with an unreachable photograph is a set with a wasted third of it.
  for (const widest of [1.4, 1.8, 2.8, 4, 4.5, 5.6]) {
    const seen = new Set([1, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22]
      .filter((N) => N >= widest)
      .map((N) => apertureStep({ aperture: N, widest })));
    assert.deepEqual([...seen].sort(), ['deep', 'mid', 'wide'],
      `a lens opening to f/${widest} cannot reach every step: ${[...seen]}`);
  }
});

test('the aperture step only ever moves one way as you stop down', () => {
  const order = { wide: 0, mid: 1, deep: 2 };
  let last = -1;
  for (const N of [1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22]) {
    const v = order[apertureStep({ aperture: N, widest: 1.8 })];
    assert.ok(v >= last, `stopping down to f/${N} moved the step backwards`);
    last = v;
  }
});

test('the focal step follows the scene, not a fixed millimetre threshold', () => {
  // 50mm is a wide lens for a portrait and a long one for a landscape, so the
  // boundary has to come from the scene's own focal length.
  assert.equal(forFocal(portrait.focal), 'norm');
  assert.equal(forFocal(24), 'wide');
  assert.equal(forFocal(200), 'long');
  const landscape = sceneById('landscape');
  assert.equal(focalStep({
    focal: 50, baseFocal: landscape.focal, subject: landscape.subject, background: landscape.background,
  }), 'long', '50mm is a long lens for a 24mm landscape');
});

test('the focal step only ever moves one way as you zoom in', () => {
  const order = { wide: 0, norm: 1, long: 2 };
  let last = -1;
  for (const f of [16, 24, 35, 50, 70, 85, 105, 135, 200, 300]) {
    const v = order[forFocal(f)];
    assert.ok(v >= last, `zooming to ${f}mm moved the step backwards`);
    last = v;
  }
});

test('a background at infinity still resolves to a step', () => {
  for (const id of ['landscape', 'stars', 'moon']) {
    const s = sceneById(id);
    for (const focal of [16, 50, 300]) {
      const step = focalStep({ focal, baseFocal: s.focal, subject: s.subject, background: s.background });
      assert.ok(['wide', 'norm', 'long'].includes(step), `${id} at ${focal}mm gave ${step}`);
    }
  }
});

test('every step has something to say about itself', () => {
  for (const axis of ['ap', 'fl']) {
    for (const step of Object.keys(STEP_NOTE[axis])) {
      assert.ok(STEP_NOTE[axis][step].length > 20, `${axis}/${step} has no note`);
    }
  }
  assert.deepEqual(Object.keys(STEP_NOTE.ap).sort(), ['deep', 'mid', 'wide']);
  assert.deepEqual(Object.keys(STEP_NOTE.fl).sort(), ['long', 'norm', 'wide']);
});

test('the thresholds are ordered, so no step is unreachable by construction', () => {
  assert.ok(STOP_STEPS[0] < STOP_STEPS[1]);
  assert.ok(MAG_STEPS[0] < 1 && MAG_STEPS[1] > 1, 'the scene\'s own focal length must land on "norm"');
});
