import { test } from 'node:test';
import assert from 'node:assert/strict';

import { settingEV, recommend, describeStops, MAX_COMP } from '../js/exposure.js';
import { snapShutter, snapAperture, snapIso, ISO_CEILINGS, MAX_ISO } from '../js/ladders.js';
import { DEFAULT_GEAR, chooseLens } from '../js/gear.js';
import { widestAt } from '../js/optics.js';
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

test('the app reaches for the fastest lens that covers the focal length', () => {
  // The default kit has a 35 mm f/1.8 sitting alongside an 18–55 that is f/4.6
  // there. Picking the zoom instead threw away nearly three stops.
  const { lens } = chooseLens(gear, 35);
  const covering = gear.lenses.filter((l) => l.min <= 35 && l.max >= 35);
  const best = Math.min(...covering.map((l) => widestAt(l, 35)));
  assert.ok(Math.abs(widestAt(lens, 35) - best) < 0.01,
    `chose ${lens.name} at f/${widestAt(lens, 35).toFixed(1)} when f/${best.toFixed(1)} was available`);
});

test('choosing a different lens changes the answer', () => {
  const scene = sceneById('indoor');
  const prime = gear.lenses.find((l) => l.id === 'prime');
  const kit = gear.lenses.find((l) => l.id === 'kit');
  const fast = recommend({ scene, ev: 5, gear, lens: prime, focal: 35 });
  const slow = recommend({ scene, ev: 5, gear, lens: kit, focal: 35 });
  assert.ok(fast.aperture.N < slow.aperture.N, 'the prime should open wider');
  assert.ok(fast.iso.v < slow.iso.v, 'and so cost less ISO');
});

test('a locked aperture cannot beat the lens it is on', () => {
  // Lock f/1.8 on the prime, then put the same lock on the slow kit zoom.
  const scene = sceneById('indoor');
  const kit = gear.lenses.find((l) => l.id === 'kit');
  const r = recommend({ scene, ev: 5, gear, lens: kit, focal: 35, lock: { N: 1.8 } });
  // The dial has no f/4.63, so the honest answer is the nearest rung to the
  // lens's real maximum — which is what the lens reports at this focal length.
  assert.equal(r.aperture.label, snapAperture(widestAt(kit, 35)).label,
    `suggested ${r.aperture.label} on a lens that only opens to f/${widestAt(kit, 35).toFixed(2)}`);
  assert.ok(r.aperture.N > 3, 'the f/1.8 lock must not have survived the switch');
});

test('a tripod scene reaches for ISO once the shutter has run out', () => {
  const scene = sceneById('landscape');
  const { lens, focal } = chooseLens(gear, scene.focal);

  // Plenty of shutter left: the tripod does the work and the file stays clean.
  const dusk = recommend({ scene, ev: 5, gear, lens, focal });
  assert.equal(dusk.iso.v, 100, 'no reason to raise ISO while the shutter can still open up');
  assert.ok(dusk.shutter.s < 30);

  // Past thirty seconds there is nothing left but ISO.
  const moonlit = recommend({ scene, ev: -3, gear, lens, focal });
  assert.ok(moonlit.shutter.s >= 30, 'the shutter should be wide open first');
  assert.ok(moonlit.iso.v > 100, 'ISO has to take over, got ' + moonlit.iso.v);
  assert.equal(moonlit.shortfallStops, 0, 'and it should close the gap');
});

test('the ISO ceiling reaches tripod scenes too', () => {
  // Reported as "the cap does nothing, it is stuck at ISO 100": these scenes
  // used to hand the shutter the whole job and never consult ISO at all.
  for (const id of ['landscape', 'architecture', 'nightcity']) {
    const scene = sceneById(id);
    const { lens, focal } = chooseLens(gear, scene.focal);
    const low = recommend({ scene, ev: -6, gear: { ...gear, isoCeiling: 6400 }, lens, focal });
    const high = recommend({ scene, ev: -6, gear: { ...gear, isoCeiling: 25600 }, lens, focal });
    assert.ok(low.iso.v > 100, id + ' left ISO at base in the dark');
    assert.ok(high.iso.v > low.iso.v, id + ' ignored a raised ceiling');
    assert.ok(high.shortfallStops < low.shortfallStops, id + ': a higher cap should close the gap');
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

/* ---------------------------------------------------- exposure compensation */

test('compensation moves the exposure by exactly the stops asked for', () => {
  // The whole point: +1 stop must be one stop more light, not "about one".
  const none = forScene('portrait', 'overcast');
  const plus = forScene('portrait', 'overcast', { comp: 1 });
  const evNone = settingEV({ N: none.aperture.N, t: none.shutter.s, iso: none.iso.v });
  const evPlus = settingEV({ N: plus.aperture.N, t: plus.shutter.s, iso: plus.iso.v });
  assert.ok(Math.abs((evNone - evPlus) - 1) < 0.06, `expected 1 stop, got ${evNone - evPlus}`);
});

test('compensation is subtracted, so positive means a brighter picture', () => {
  const brighter = forScene('portrait', 'overcast', { comp: 1 });
  const darker = forScene('portrait', 'overcast', { comp: -1 });
  assert.ok(brighter.ev < darker.ev, 'a positive compensation must lower the target EV');
  const b = settingEV({ N: brighter.aperture.N, t: brighter.shutter.s, iso: brighter.iso.v });
  const d = settingEV({ N: darker.aperture.N, t: darker.shutter.s, iso: darker.iso.v });
  assert.ok(b < d, 'and must actually gather more light');
});

test('compensation is bounded rather than trusted', () => {
  const wild = forScene('portrait', 'overcast', { comp: 99 });
  assert.equal(wild.comp, MAX_COMP);
  assert.equal(wild.baseEv - wild.ev, MAX_COMP);
});

test('a correction absorbed by ISO shows up in the ISO, not in a shortfall', () => {
  // Two stops of correction is four times the ISO, exactly, while there is
  // ceiling left to pay with.
  const plain = forScene('indoor', 'candle');
  const lifted = forScene('indoor', 'candle', { comp: 2 });
  assert.equal(plain.shortfallStops, 0);
  assert.equal(lifted.shortfallStops, 0);
  assert.ok(Math.abs(lifted.iso.v / plain.iso.v - 4) < 0.15,
    `expected four times the ISO, got ${plain.iso.v} -> ${lifted.iso.v}`);
});

test('a brightening compensation deepens the shortfall rather than hiding it', () => {
  // The failure this guards: reporting the shortfall against the raw EV while
  // solving against the corrected one, so the number on screen understates it.
  const plain = forScene('sports', 'dim-in');
  const lifted = forScene('sports', 'dim-in', { comp: 2 });
  assert.ok(plain.shortfallStops > 0.5, 'the plain case has to be short for this to mean anything');
  assert.ok(Math.abs((lifted.shortfallStops - plain.shortfallStops) - 2) < 0.06,
    `a +2 correction should cost exactly two more stops, went from ${plain.shortfallStops} to ${lifted.shortfallStops}`);
});

test('the ways out are priced against the corrected target, not the raw one', () => {
  // A way out buys back some of the missing light, not necessarily all of it,
  // so the test is not that each one arrives. It is that they are all aimed at
  // the corrected target: shift the correction and every way must shift with
  // it, or the price list is quoting the wrong exposure.
  const plain = forScene('sports', 'dim-in');
  const lifted = forScene('sports', 'dim-in', { comp: 2 });
  const evOf = (way) => settingEV({
    N: way.settings.aperture.N, t: way.settings.shutter.s, iso: way.settings.iso.v,
  });
  assert.ok(plain.ways.length > 0 && lifted.ways.length === plain.ways.length);

  const best = (r) => Math.min(...r.ways.map(evOf));
  assert.ok(Math.abs((best(plain) - best(lifted)) - 2) < 0.06,
    `the best way should move by the full correction, moved ${best(plain) - best(lifted)}`);

  for (const way of lifted.ways) {
    assert.ok(evOf(way) >= lifted.ev - 0.06,
      `${way.id} claims to expose past the target, which would be free light`);
  }
});

test('an absolute EV override and a compensation compose once, not twice', () => {
  // The moon ignores the light picker entirely; a correction still has to apply
  // to it, and only once.
  const moon = forScene('moon', 'dark-sky');
  const corrected = forScene('moon', 'dark-sky', { comp: 1 });
  assert.equal(moon.ev, moon.baseEv, 'with no correction the target is the override');
  assert.equal(corrected.baseEv, moon.baseEv, 'the override is unchanged by a correction');
  assert.ok(Math.abs((moon.ev - corrected.ev) - 1) < 1e-9, 'and the correction lands exactly once');
});
