import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { LESSONS, lessonFor } from '../js/lessons.js';
import { shotFor, isoFor, costOf, ISO_MIN, ISO_MAX } from '../js/shot.js';
import { chipsFor, STEP_ORDER, shotValue } from '../js/chips.js';
import { lightById } from '../../app/js/data.js';

const picture = (path) => existsSync(new URL('../../app/' + path, import.meta.url));

test('the ISO sum is the one the camera does', () => {
  // Sunny 16: f/16 at one over the ISO in bright sun. If this drifts, every
  // card in the app is quietly wrong and nothing else would catch it.
  assert.ok(Math.abs(isoFor({ aperture: 16, shutter: 1 / 125, ev: 15 }) - 97.7) < 1);
  // One stop wider is one stop less ISO.
  const base = isoFor({ aperture: 8, shutter: 1 / 250, ev: 12 });
  assert.ok(Math.abs(isoFor({ aperture: 5.6, shutter: 1 / 250, ev: 12 }) - base / 2) < base * 0.02);
  // One stop slower is likewise one stop less ISO.
  assert.ok(Math.abs(isoFor({ aperture: 8, shutter: 1 / 125, ev: 12 }) - base / 2) < base * 0.02);
});

test('every scene names lights that exist, and offers at least two', () => {
  for (const scene of LESSONS) {
    assert.ok(scene.lights.length >= 2, `${scene.id} offers ${scene.lights.length} light(s)`);
    for (const id of scene.lights) assert.ok(lightById(id), `${scene.id} names light "${id}", which does not exist`);
  }
});

test('the recommended card is shootable in every light the scene offers', () => {
  // This is the promise the whole app makes: pick a scene, pick a light, and
  // the card in front of you is a photograph you can actually take. The two
  // exceptions are declared rather than discovered. Water genuinely needs a
  // filter in daylight, and that is the lesson rather than a fault.
  const ALLOWED = { 'nightcity/blue-hour': 1.1 };
  for (const scene of LESSONS) {
    for (const lightId of scene.lights) {
      const r = shotFor({ sceneId: scene.id, lightId });
      assert.ok(r, `${scene.id} in ${lightId} produced no card`);
      const slack = ALLOWED[`${scene.id}/${lightId}`] ?? 0.6;
      if (!scene.nd) {
        assert.ok(r.over <= slack,
          `${scene.id} in ${lightId} is ${r.over.toFixed(1)} stops over at ISO ${ISO_MIN}`);
      }
      assert.ok(r.under <= 0.6,
        `${scene.id} in ${lightId} is ${r.under.toFixed(1)} stops short at ISO ${ISO_MAX}`);
    }
  }
});

test('a scene that needs a filter says so, and only water does', () => {
  const nd = LESSONS.filter((s) => s.nd).map((s) => s.id);
  assert.deepEqual(nd, ['water']);
  const r = shotFor({ sceneId: 'water', lightId: 'overcast' });
  assert.ok(r.over > 4, 'a second of daylight should be several stops past base ISO');
  assert.equal(r.iso.v, ISO_MIN, 'the camera should sit at its floor, not climb');
});

test('every step belongs to its axis, and the shot is somewhere sensible on it', () => {
  for (const scene of LESSONS) {
    for (const [axis, spec] of Object.entries(scene.axes)) {
      assert.ok(STEP_ORDER[axis], `${scene.id} has an axis "${axis}" nothing knows about`);
      for (const step of Object.keys(spec.steps)) {
        assert.ok(STEP_ORDER[axis].includes(step), `${scene.id} ${axis} has an unknown step "${step}"`);
      }
      // The settings have to climb in the same direction as the photographs do,
      // or a chip shows a picture that contradicts the number next to it.
      const values = STEP_ORDER[axis].map((step) => spec.steps[step]).filter((v) => v != null);
      for (let i = 1; i < values.length; i++) {
        assert.ok(values[i] > values[i - 1],
          `${scene.id} ${axis} goes ${values.join(', ')}, which is not in the order of its photographs`);
      }
    }
  }
});

test('the aperture ladder puts the shot between the dissolved and the soft picture', () => {
  // Four pictures, not three: the dissolved variation, the scene's own
  // photograph, the soft variation, the sharp one. That only reads correctly if
  // the aperture on the card really does sit between the first two, which is
  // what makes the dissolved photograph reachable at all.
  for (const scene of LESSONS) {
    const ap = scene.axes.ap;
    if (!ap) continue;
    assert.ok(scene.aperture > ap.steps.wide,
      `${scene.id} is shot at f/${scene.aperture}, which is not narrower than its wide-open photograph`);
    assert.ok(scene.aperture < ap.steps.mid,
      `${scene.id} is shot at f/${scene.aperture}, which is not wider than its soft-background photograph`);
  }
});

test('the chips are every step that is not the shot itself', () => {
  // A chip that shows the picture already on the screen teaches nothing and
  // would leave the card looking broken when tapped.
  for (const scene of LESSONS) {
    for (const group of chipsFor(scene)) {
      const spec = scene.axes[group.axis];
      const shot = shotValue(scene, group.axis);
      const expected = Object.entries(spec.steps)
        .filter(([, v]) => Math.abs(v / shot - 1) >= 0.01).length;
      assert.equal(group.chips.length, expected,
        `${scene.id} ${group.axis} offers ${group.chips.length} chips, expected ${expected}`);
      for (const chip of group.chips) {
        assert.notEqual(spec.steps[chip.step], shot, `${scene.id} offers a chip for its own shot`);
        assert.ok(chip.label && chip.value && chip.result, `${scene.id} ${group.axis}-${chip.step} is missing wording`);
      }
    }
  }
});

test('no two chips on a card read the same', () => {
  // The wording is derived from how far a step is from the shot, so a scene
  // whose settings happen to land two steps in the same size band would print
  // the same label twice and give the reader two identical-looking buttons.
  for (const scene of LESSONS) {
    const labels = chipsFor(scene).flatMap((g) => g.chips.map((c) => c.label));
    assert.equal(new Set(labels).size, labels.length,
      `${scene.id} has repeated chip labels: ${labels.join(' | ')}`);
  }
});

test('the aperture axis really does offer a completely dissolved background', () => {
  // The reason the standard lens opens to f/2. Under the old arrangement the
  // scene photograph stood in for the wide-open step, so the one picture that
  // shows a background gone entirely was never reachable.
  for (const id of ['portrait', 'food', 'indoor', 'group', 'street']) {
    const scene = lessonFor(id);
    const ap = chipsFor(scene).find((g) => g.axis === 'ap');
    assert.ok(ap, `${id} has no aperture chips`);
    const wide = ap.chips.find((c) => c.step === 'wide');
    assert.ok(wide, `${id} cannot reach its wide-open photograph`);
    assert.equal(wide.value, 'f/2');
    assert.match(wide.result, /dissolve/);
  }
});

test('every picture a card can show is on disk', () => {
  // The scene picture is the base the variations were generated from, not the
  // other app's photograph of the same subject, and pairing them would change the
  // face the moment a chip was tapped.
  for (const scene of LESSONS) {
    assert.ok(picture(`photos/bases/${scene.id}.jpg`), `${scene.id} has no base photograph`);
    for (const group of chipsFor(scene)) {
      for (const chip of group.chips) {
        const r = shotFor({ sceneId: scene.id, lightId: scene.lights[0], change: chip });
        assert.ok(r.photo.variant, `${scene.id} ${chip.axis}-${chip.step} did not resolve to a variation`);
        assert.ok(picture(r.photo.src), `missing picture: ${r.photo.src}`);
      }
    }
  }
});

test('a chip moves exactly one setting and nothing else', () => {
  for (const scene of LESSONS) {
    const before = shotFor({ sceneId: scene.id, lightId: scene.lights[0] });
    for (const group of chipsFor(scene)) {
      for (const chip of group.chips) {
        const after = shotFor({ sceneId: scene.id, lightId: scene.lights[0], change: chip });
        const moved = ['focal', 'aperture', 'shutter'].filter((k) => {
          const a = k === 'focal' ? before[k] : before[k].label;
          const b = k === 'focal' ? after[k] : after[k].label;
          return a !== b;
        });
        assert.deepEqual(moved, [{ ap: 'aperture', fl: 'focal', sh: 'shutter' }[chip.axis]],
          `${scene.id} ${chip.axis}-${chip.step} moved ${moved.join(' and ') || 'nothing'}`);
      }
    }
  }
});

test('what a chip costs is stated in stops, and the ISO agrees', () => {
  // The cost line is the whole teaching moment, so it has to match the number
  // printed next to it rather than being an independent guess.
  const scene = lessonFor('portrait');
  const change = { axis: 'ap', step: 'deep' };
  const cost = costOf({ sceneId: 'portrait', lightId: 'overcast', change });
  assert.ok(Math.abs(cost - 4) < 0.1, `f/4 to f/16 is four stops, got ${cost.toFixed(2)}`);
  const open = costOf({ sceneId: 'portrait', lightId: 'overcast', change: { axis: 'ap', step: 'wide' } });
  assert.ok(Math.abs(open + 2) < 0.1, `f/4 to f/2 gives back two stops, got ${open.toFixed(2)}`);
  const a = shotFor({ sceneId: 'portrait', lightId: 'overcast' });
  const b = shotFor({ sceneId: 'portrait', lightId: 'overcast', change });
  assert.ok(Math.abs(Math.log2(b.isoWanted / a.isoWanted) - cost) < 0.01);
  assert.ok(scene.axes.ap.steps.deep === 16);
});

test('nothing is interactive that is not a chip', () => {
  // The point of the rebuild: the card states the shot. If a settings control
  // ever creeps back in it should break a test, not just a principle.
  const scene = lessonFor('street');
  assert.ok(!('lock' in scene) && !('give' in scene) && !('alt' in scene),
    'a lesson has picked up the first app\'s solver fields');
  for (const [, spec] of Object.entries(scene.axes)) {
    assert.equal(Object.keys(spec.steps).length, 3, 'an axis is three photographs, no more');
  }
});
