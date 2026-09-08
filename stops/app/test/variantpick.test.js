import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apertureStep, focalStep, shutterStep, STEP_NOTE, AXIS_NAME, AXIS_QUANTITY,
         STOP_STEPS, MAG_STEPS, SHUTTER_SPREAD } from '../js/variantpick.js';
import { sceneById } from '../js/data.js';
import { motionThreshold, widestAt } from '../js/optics.js';
import { DEFAULT_GEAR } from '../js/gear.js';
import { VARIANTS } from '../js/variants.js';

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
  for (const axis of ['ap', 'fl', 'sh']) {
    for (const step of Object.keys(STEP_NOTE[axis])) {
      assert.ok(STEP_NOTE[axis][step].length > 20, `${axis}/${step} has no note`);
    }
  }
  assert.deepEqual(Object.keys(STEP_NOTE.ap).sort(), ['deep', 'mid', 'wide']);
  assert.deepEqual(Object.keys(STEP_NOTE.fl).sort(), ['long', 'norm', 'wide']);
  assert.deepEqual(Object.keys(STEP_NOTE.sh).sort(), ['fast', 'mid', 'slow']);
});

test('the notes do not describe one particular scene', () => {
  // They were written for the portrait, and twelve scenes share them now. A
  // note that says "her face" is wrong on a plate of pasta and on a waterfall.
  const wrong = /\b(her|his|she|he|face|shore)\b/i;
  for (const [axis, steps] of Object.entries(STEP_NOTE)) {
    for (const [step, note] of Object.entries(steps)) {
      assert.ok(!wrong.test(note), `${axis}/${step} names a scene: "${note}"`);
    }
  }
});

test('every axis a scene actually has can be picked, named and described', () => {
  // The defect this guards, which shipped silently: the app routed anything
  // that was not the aperture axis through the focal-length picker, so the five
  // shutter scenes asked for a photograph called "sh-norm", got nothing back,
  // and showed no photograph at all. Nothing threw and nothing said why.
  const pickable = { ap: 'wide', fl: 'norm', sh: 'mid' };
  for (const [scene, axes] of Object.entries(VARIANTS)) {
    for (const axis of Object.keys(axes)) {
      assert.ok(STEP_NOTE[axis], `${scene} has axis "${axis}" with no notes`);
      assert.ok(AXIS_NAME[axis], `${scene} has axis "${axis}" with no name`);
      assert.ok(AXIS_QUANTITY[axis], `${scene} has axis "${axis}" with no quantity for the caption`);
      assert.ok(pickable[axis], `${scene} has axis "${axis}" with no picker`);
      for (const step of axes[axis]) {
        assert.ok(STEP_NOTE[axis][step], `${scene} ${axis}-${step} has no note`);
      }
    }
  }
});

test('the shutter step follows the movement, not the subject', () => {
  // kids carries a speed, so the boundary is where that movement starts to show.
  const kids = sceneById('kids');
  const threshold = motionThreshold({
    focal: kids.focal, crop: 1, speed: kids.speed, subject: kids.subject,
  });
  assert.ok(threshold > 0);
  assert.equal(shutterStep({ shutter: threshold / 4, threshold }), 'fast');
  assert.equal(shutterStep({ shutter: threshold * 2, threshold }), 'mid');
  assert.equal(shutterStep({ shutter: threshold * SHUTTER_SPREAD * 2, threshold }), 'slow');
});

test('a scene whose subject stands still still has three shutter photographs', () => {
  // water and nightcity both have speed: 0. The rock and the skyline really
  // are still, so a threshold derived from the subject is null and every
  // shutter would land on the same picture. They declare their own boundaries.
  for (const id of ['water', 'nightcity']) {
    const scene = sceneById(id);
    assert.ok(Array.isArray(scene.shutterSteps), `${id} declares no shutter boundaries`);
    const [fast, slow] = scene.shutterSteps;
    assert.ok(fast < slow, `${id} boundaries are out of order`);
    const seen = [fast / 2, (fast + slow) / 2, slow * 4]
      .map((shutter) => shutterStep({ shutter, bounds: scene.shutterSteps, threshold: null }));
    assert.deepEqual(seen, ['fast', 'mid', 'slow'], `${id} cannot reach all three`);
  }
});

test('with neither a threshold nor boundaries no photograph is preferred', () => {
  assert.equal(shutterStep({ shutter: 1 / 500, threshold: null }), 'mid');
  assert.equal(shutterStep({ shutter: 4, threshold: null }), 'mid');
});

test('the thresholds are ordered, so no step is unreachable by construction', () => {
  assert.ok(STOP_STEPS[0] < STOP_STEPS[1]);
  assert.ok(MAG_STEPS[0] < 1 && MAG_STEPS[1] > 1, 'the scene\'s own focal length must land on "norm"');
});

test('every photograph in every set can actually be reached on the shipped kit', () => {
  // A set of three where one is unreachable is two-thirds of a lesson and a
  // third of a wasted download. What makes this worth asserting is that the
  // light never moves you across a set. Light is absorbed by ISO and the
  // scene pins the creative setting, so reachability rests entirely on the
  // focal lengths and apertures the kit in the bag can be set to.
  const FOCALS = [];
  const PAIRS = [];
  for (const lens of DEFAULT_GEAR.lenses) {
    for (let f = lens.min; f <= lens.max; f += 1) {
      FOCALS.push(f);
      const widest = widestAt(lens, f);
      for (const N of [1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22]) if (N >= widest) PAIRS.push([N, widest]);
    }
  }
  const SHUTTERS = [1 / 4000, 1 / 1000, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 4, 1, 2, 8, 30];

  for (const [id, axes] of Object.entries(VARIANTS)) {
    const scene = sceneById(id);
    assert.ok(scene, `variants exist for "${id}", which is not a scene`);
    for (const [axis, steps] of Object.entries(axes)) {
      const reached = new Set(
        axis === 'ap' ? PAIRS.map(([N, w]) => apertureStep({ aperture: N, widest: w }))
        : axis === 'fl' ? FOCALS.map((focal) => focalStep({
            focal, baseFocal: scene.focal, subject: scene.subject, background: scene.background }))
        : SHUTTERS.map((shutter) => shutterStep({
            shutter, bounds: scene.shutterSteps,
            threshold: motionThreshold({
              focal: scene.focal, crop: DEFAULT_GEAR.crop, speed: scene.speed, subject: scene.subject }) })));
      for (const step of steps) {
        assert.ok(reached.has(step), `${id} ${axis}-${step} cannot be reached with any lens in the bag`);
      }
    }
  }
});
