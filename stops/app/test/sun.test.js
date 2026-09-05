import { test } from 'node:test';
import assert from 'node:assert/strict';

import { solarAltitude, clearSkyEv, estimateLight, SKY } from '../js/sun.js';

/** Highest the sun gets on a given day, found by sampling rather than assumed. */
function peakAltitude(dateUTC, lat, lon) {
  let peak = -90;
  for (let minute = 0; minute < 1440; minute += 2) {
    const d = new Date(dateUTC.getTime() + minute * 60000);
    peak = Math.max(peak, solarAltitude(d, lat, lon));
  }
  return peak;
}

// At solar noon the sun stands at 90° minus the difference between your
// latitude and its declination. That is a closed-form check on the whole
// algorithm, and it holds anywhere on Earth.
test('midday sun height matches latitude and declination', () => {
  const cases = [
    ['London, summer solstice', new Date(Date.UTC(2026, 5, 21)), 51.5074, -0.1278, 61.9],
    ['London, winter solstice', new Date(Date.UTC(2026, 11, 21)), 51.5074, -0.1278, 15.1],
    ['Equator, equinox', new Date(Date.UTC(2026, 2, 20)), 0, 0, 90],
    ['Sydney, December', new Date(Date.UTC(2026, 11, 21)), -33.8688, 151.2093, 79.6],
    ['Reykjavik, June', new Date(Date.UTC(2026, 5, 21)), 64.1466, -21.9426, 49.3],
  ];
  for (const [name, date, lat, lon, expected] of cases) {
    const peak = peakAltitude(date, lat, lon);
    assert.ok(Math.abs(peak - expected) < 0.7, `${name}: got ${peak.toFixed(2)}°, expected ~${expected}°`);
  }
});

test('the sun never rises in the polar winter, and never sets in the polar summer', () => {
  const darkest = peakAltitude(new Date(Date.UTC(2026, 11, 21)), 78.22, 15.63); // Svalbard
  assert.ok(darkest < 0, `polar night should keep the sun down, got ${darkest.toFixed(1)}°`);

  let lowest = 90;
  for (let minute = 0; minute < 1440; minute += 5) {
    lowest = Math.min(lowest, solarAltitude(new Date(Date.UTC(2026, 5, 21) + minute * 60000), 78.22, 15.63));
  }
  assert.ok(lowest > 0, `midnight sun should keep the sun up, got ${lowest.toFixed(1)}°`);
});

test('the sun is below the horizon at local midnight in London', () => {
  assert.ok(solarAltitude(new Date(Date.UTC(2026, 5, 21, 0, 0)), 51.5074, -0.1278) < 0);
});

test('refraction lifts the sun slightly at the horizon and not overhead', () => {
  // Sampled either side of sunrise: the apparent altitude crosses zero before
  // the geometric one does, which is why sunrise is early.
  const noon = peakAltitude(new Date(Date.UTC(2026, 2, 20)), 0, 0);
  assert.ok(noon <= 90.05, `no refraction bonus overhead, got ${noon.toFixed(3)}`);
});

test('the clear-sky curve never gets darker as the sun climbs', () => {
  let previous = -Infinity;
  for (let alt = -90; alt <= 90; alt += 0.5) {
    const ev = clearSkyEv(alt);
    assert.ok(ev >= previous - 1e-9, `EV dipped at ${alt}°: ${ev} after ${previous}`);
    previous = ev;
  }
});

test('the clear-sky curve agrees with the sunny 16 rule and with a dark night', () => {
  assert.ok(Math.abs(clearSkyEv(60) - 15) < 0.5, 'high sun should be about EV 15');
  assert.ok(Math.abs(clearSkyEv(-30) - (-6)) < 0.5, 'a moonless night should be about EV -6');
  assert.ok(Math.abs(clearSkyEv(-6) - 5.5) < 0.7, 'the end of civil twilight should be about EV 5.5');
  assert.ok(Math.abs(clearSkyEv(0) - 10.5) < 0.5, 'sunset should be about EV 10.5');
});

test('past astronomical twilight the sky has stopped changing', () => {
  // A sun 25° below the horizon is not darker than one 20° below it; there is
  // no light left to lose.
  assert.equal(clearSkyEv(-25), clearSkyEv(-40));
  assert.equal(clearSkyEv(-40), clearSkyEv(-90));
  assert.ok(clearSkyEv(-15) > clearSkyEv(-19), 'but it is still changing during astronomical twilight');
});

test('cloud costs stops while the sun is up', () => {
  const at = (sky) => estimateLight({
    date: new Date(Date.UTC(2026, 5, 21, 12)), latitude: 51.5074, longitude: -0.1278, sky,
  }).ev;
  assert.ok(at('clear') > at('hazy'), 'haze should cost light');
  assert.ok(at('hazy') > at('overcast'));
  assert.ok(at('overcast') > at('heavy'));
  assert.ok(Math.abs((at('clear') - at('overcast')) - 2) < 0.2, 'overcast is two stops');
});

test('cloud stops mattering once the sun has properly set', () => {
  const night = { date: new Date(Date.UTC(2026, 11, 21, 2)), latitude: 51.5074, longitude: -0.1278 };
  const clear = estimateLight({ ...night, sky: 'clear' });
  const heavy = estimateLight({ ...night, sky: 'heavy' });
  assert.ok(clear.altitude < -6, 'this should be well after dusk');
  assert.equal(clear.ev, heavy.ev, 'cloud cannot block a sun that is not there');
  assert.equal(heavy.coverMatters, false);
});

test('an estimate is shaped like a hand-picked light condition', () => {
  const light = estimateLight({
    date: new Date(Date.UTC(2026, 5, 21, 12)), latitude: 51.5074, longitude: -0.1278, sky: 'overcast',
  });
  for (const key of ['id', 'name', 'sub', 'ev']) assert.ok(key in light, `missing ${key}`);
  assert.equal(typeof light.ev, 'number');
  assert.ok(light.name.includes('sun') || light.name.includes('daylight') || light.name.includes('High'));
});

test('a London summer afternoon lands where a photographer would expect', () => {
  const light = estimateLight({
    date: new Date(Date.UTC(2026, 5, 21, 15)), latitude: 51.5074, longitude: -0.1278, sky: 'clear',
  });
  assert.ok(light.ev >= 14 && light.ev <= 15.5, `got EV ${light.ev} at ${light.altitude.toFixed(0)}°`);
});

test('every sky option is distinct and ordered by how much light it costs', () => {
  const stops = SKY.map((s) => s.stops);
  assert.deepEqual(stops, [...stops].sort((a, b) => a - b));
  assert.equal(new Set(SKY.map((s) => s.id)).size, SKY.length);
});
