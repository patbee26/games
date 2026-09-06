import { test } from 'node:test';
import assert from 'node:assert/strict';

import { settingEV, recommend, describeStops } from '../js/exposure.js';
import { snapShutter, snapAperture, snapIso, ISO_CEILINGS, MAX_ISO } from '../js/ladders.js';
import { DEFAULT_GEAR, chooseLens } from '../js/gear.js';
import { sceneById, lightById } from '../js/data.js';

const gear = DEFAULT_GEAR;

function forScene(sceneId, lightId, overrides = {}) {
  const scene = sceneById(sceneId);
  const ev = lightById(lightId).ev;
  const { lens, focal } = chooseLens(gear, scene.focal);
  return recommend({ scene, ev, gear, lens, focal, ...overrides });
}

test('settingEV agrees with the sunny 16 rule', () => {
  // f/16 at 1/125, ISO 100 is the canonical EV 15 exposure.
  assert.ok(Math.abs(settingEV({ N: 16, t: 1 / 125, iso: 100 }) - 15) < 0.05);
});

test('settingEV accounts for ISO', () => {
  // One stop of ISO buys one stop of scene darkness.
  const base = settingEV({ N: 4, t: 1 / 1000, iso: 100 });
  assert.ok(Math.abs(settingEV({ N: 4, t: 1 / 1000, iso: 200 }) - (base - 1)) < 1e-9);
  assert.ok(Math.abs(settingEV({ N: 4, t: 1 / 1000, iso: 200 }) - 13) < 0.05);
});

test('sports in bright overcast holds the shutter and pays with ISO', () => {
  const r = forScene('sports', 'overcast');
  assert.equal(r.shutter.label, '1/1000', 'the anchor must not move');
  assert.equal(r.solvedBy, 'iso');
  assert.equal(r.shortfallStops, 0);
  assert.ok(r.iso.v >= 200 && r.iso.v <= 400, 'got ISO ' + r.iso.v);
});

test('landscape in harsh sun keeps f/8 and ISO 100, and solves the shutter', () => {
  const r = forScene('landscape', 'harsh-sun');
  assert.equal(r.aperture.label, 'f/8');
  assert.equal(r.iso.v, 100);
  assert.equal(r.solvedBy, 'shutter');
  assert.ok(Math.abs(Math.log2(r.shutter.s / (1 / 500))) < 0.5, 'got ' + r.shutter.label);
});

test('indoor sport on a slow zoom comes up short and says so', () => {
  const scene = sceneById('sports');
  const lens = gear.lenses.find((l) => l.id === 'tele');
  const r = recommend({ scene, ev: 7, gear, lens, focal: 200 });
  assert.ok(r.shortfallStops > 1.5, 'expected a real shortfall, got ' + r.shortfallStops);
  assert.equal(r.iso.v, gear.isoCeiling, 'ISO should be pinned at the ceiling');
  assert.ok(r.ways.length >= 2, 'a shortfall must come with ways out');
  assert.ok(r.ways.some((w) => w.id === 'slow'));
  assert.ok(r.ways.some((w) => w.id === 'iso'));
});

test('every way out actually buys back light', () => {
  const scene = sceneById('sports');
  const lens = gear.lenses.find((l) => l.id === 'tele');
  const r = recommend({ scene, ev: 7, gear, lens, focal: 200 });
  const current = settingEV({ N: r.aperture.N, t: r.shutter.s, iso: r.iso.v });
  for (const way of r.ways) {
    const after = settingEV({
      N: way.settings.aperture.N,
      t: way.settings.shutter.s,
      iso: way.settings.iso.v,
    });
    assert.ok(after < current - 0.2, way.id + ' does not gather any more light');
  }
});

test('a locked shutter is never moved to find the exposure', () => {
  const scene = sceneById('sports');
  const { lens, focal } = chooseLens(gear, scene.focal);
  const r = recommend({ scene, ev: 7, gear, lens, focal, lock: { t: 1 / 250 } });
  assert.equal(r.shutter.label, '1/250');
});

test('silky water in daylight reports the stops an ND filter has to absorb', () => {
  const r = forScene('water', 'heavy-cloud');
  assert.equal(r.shutter.label, '1s');
  assert.equal(r.aperture.label, 'f/11');
  assert.ok(r.overStops > 4, 'expected a large overexposure, got ' + r.overStops);
});

test('stars use the 500 rule and land on a believable ISO', () => {
  const r = forScene('stars', 'dark-sky');
  assert.ok(r.shutter.s >= 10 && r.shutter.s <= 20, 'got ' + r.shutter.label);
  assert.ok(r.iso.v >= 1600 && r.iso.v <= 6400, 'got ISO ' + r.iso.v);
  assert.equal(r.shortfallStops, 0);
});

test('the moon ignores the surrounding darkness', () => {
  const night = forScene('moon', 'dark-sky');
  const day = forScene('moon', 'harsh-sun');
  assert.deepEqual(
    [night.shutter.label, night.aperture.label, night.iso.v],
    [day.shutter.label, day.aperture.label, day.iso.v],
  );
  assert.ok(night.iso.v <= 400, 'the moon is a sunlit rock, got ISO ' + night.iso.v);
});

test('the three numbers always expose the scene they claim to', () => {
  const failures = [];
  for (const scene of [
    'sports', 'kids', 'portrait', 'group', 'landscape', 'street',
    'indoor', 'concert', 'food', 'macro', 'nightcity', 'wildlife',
  ].map(sceneById)) {
    for (const ev of [15, 13, 11, 9, 7]) {
      const { lens, focal } = chooseLens(gear, scene.focal);
      const r = recommend({ scene, ev, gear, lens, focal });
      if (r.shortfallStops > 0.05 || r.overStops > 0.05) continue; // honestly reported elsewhere
      const actual = settingEV({ N: r.aperture.N, t: r.shutter.s, iso: r.iso.v });
      if (Math.abs(actual - ev) > 0.34) {
        failures.push(`${scene.id} at EV ${ev}: settings expose EV ${actual.toFixed(2)}`);
      }
    }
  }
  assert.deepEqual(failures, [], failures.join('; '));
});

test('suggested values are all real dial positions', () => {
  for (const scene of [sceneById('portrait'), sceneById('street'), sceneById('concert')]) {
    for (const ev of [15, 12, 8, 5]) {
      const { lens, focal } = chooseLens(gear, scene.focal);
      const r = recommend({ scene, ev, gear, lens, focal });
      assert.equal(snapShutter(r.shutter.s).label, r.shutter.label);
      assert.equal(snapAperture(r.aperture.N).label, r.aperture.label);
      assert.equal(snapIso(r.iso.v).label, r.iso.label);
    }
  }
});

test('a suggested ISO ceiling is always one the gear screen can offer', () => {
  const scene = sceneById('sports');
  const lens = gear.lenses.find((l) => l.id === 'tele');
  for (const ev of [8, 7, 5, 3, 0, -4]) {
    const r = recommend({ scene, ev, gear, lens, focal: 200 });
    const way = r.ways.find((w) => w.id === 'iso');
    if (!way) continue;
    assert.ok(ISO_CEILINGS.includes(way.ceiling),
      `EV ${ev} suggested a ceiling of ${way.ceiling}, which is not on the list the user picks from`);
  }
});

test('the ISO offer never claims to buy more light than the dial has', () => {
  const scene = sceneById('sports');
  const lens = gear.lenses.find((l) => l.id === 'tele');
  // Far too dark to fix: the offer has to admit it falls short.
  const r = recommend({ scene, ev: 0, gear, lens, focal: 200 });
  const way = r.ways.find((w) => w.id === 'iso');
  assert.ok(way, 'there should still be an offer');
  assert.ok(way.remaining > 0.05, 'this cannot possibly be closed, and the offer must say so');
  assert.match(way.detail, /short/, 'the wording has to admit it: ' + way.detail);
  assert.ok(way.settings.iso.v <= MAX_ISO);
});

test('the ISO offer keeps quiet once the ceiling is already at the top', () => {
  const scene = sceneById('sports');
  const lens = gear.lenses.find((l) => l.id === 'tele');
  const maxed = { ...gear, isoCeiling: MAX_ISO };
  const r = recommend({ scene, ev: 3, gear: maxed, lens, focal: 200 });
  assert.equal(r.ways.find((w) => w.id === 'iso'), undefined,
    'offering to raise a ceiling that cannot go higher is a lie');
});

test('taking the ISO offer really does reach the ISO it advertises', () => {
  const scene = sceneById('sports');
  const lens = gear.lenses.find((l) => l.id === 'tele');
  const r = recommend({ scene, ev: 7, gear, lens, focal: 200 });
  const way = r.ways.find((w) => w.id === 'iso');
  const after = recommend({ scene, ev: 7, gear: { ...gear, isoCeiling: way.ceiling }, lens, focal: 200 });
  assert.equal(after.iso.v, way.settings.iso.v, 'the offer and the result must agree');
  assert.ok(Math.abs(after.shortfallStops - way.remaining) < 0.05,
    `offer promised ${way.remaining.toFixed(2)} left, result had ${after.shortfallStops.toFixed(2)}`);
});

test('describeStops speaks like a photographer', () => {
  assert.equal(describeStops(1), '1 stop');
  assert.equal(describeStops(2), '2 stops');
  assert.equal(describeStops(0.667), '⅔ stop');
  assert.equal(describeStops(1.667), '1 ⅔ stops');
});
