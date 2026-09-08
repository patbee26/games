// Where the sun is, and what that means for the light.
//
// Two separate jobs, and only the first is exact. Solar position is arithmetic,
// the NOAA algorithm, good to a fraction of a degree for any date this century.
// Turning an altitude into an exposure value is a model of the atmosphere, and
// the atmosphere is not obliged to cooperate: the sun's height sets the ceiling,
// and cloud takes stops off it. The app cannot see the cloud, so it asks.

const RAD = Math.PI / 180;
const mod = (n, m) => ((n % m) + m) % m;

const julianDay = (date) => date.getTime() / 86400000 + 2440587.5;

/**
 * Atmospheric refraction, in degrees, lifting the apparent sun. Negligible
 * overhead, worth half a degree at the horizon, which is exactly where the
 * light is changing fastest, so it earns its place.
 */
function refraction(altitude) {
  if (altitude > 85) return 0;
  const te = Math.tan(altitude * RAD);
  let arcseconds;
  if (altitude > 5) {
    arcseconds = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  } else if (altitude > -0.575) {
    arcseconds = 1735 + altitude * (-518.2 + altitude * (103.4 + altitude * (-12.79 + altitude * 0.711)));
  } else {
    arcseconds = -20.772 / te;
  }
  return arcseconds / 3600;
}

/**
 * Apparent solar altitude in degrees above the horizon, for an instant and a
 * place. Works entirely in UTC, so there is no timezone to get wrong.
 */
export function solarAltitude(date, latitude, longitude) {
  const T = (julianDay(date) - 2451545) / 36525;

  const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  const centre = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * M * RAD) * 0.000289;

  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + centre - 0.00569 - 0.00478 * Math.sin(omega * RAD);

  const meanObliquity = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * RAD);
  const declination = Math.asin(Math.sin(obliquity * RAD) * Math.sin(lambda * RAD)) / RAD;

  // The equation of time: how far a sundial runs from a clock on this date.
  const y = Math.tan((obliquity / 2) * RAD) ** 2;
  const equationOfTime = (4 * (y * Math.sin(2 * L0 * RAD)
    - 2 * e * Math.sin(M * RAD)
    + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD)
    - 1.25 * e * e * Math.sin(2 * M * RAD))) / RAD;

  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarTime = mod(utcMinutes + equationOfTime + 4 * longitude, 1440);
  const hourAngle = trueSolarTime / 4 - 180;

  const cosZenith = Math.sin(latitude * RAD) * Math.sin(declination * RAD)
    + Math.cos(latitude * RAD) * Math.cos(declination * RAD) * Math.cos(hourAngle * RAD);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;

  const geometric = 90 - zenith;
  return geometric + refraction(geometric);
}

// Altitude in degrees → EV at ISO 100 under a clear sky, for a subject in the
// open. Anchored at the top by the sunny 16 rule and at the bottom by a
// moonless night; the twilight numbers between are the conventional ones.
// Below -18° astronomical twilight is over and the sky has stopped changing,
// so the curve goes flat rather than carrying on down: a sun 40° under the
// horizon is no darker than one 20° under it.
const EV_BY_ALTITUDE = [
  [-90, -6], [-24, -6], [-18, -5.5], [-15, -3], [-12, 0.5], [-9, 3], [-6, 5.5],
  [-4, 7], [-3, 8], [-1, 9.5], [0, 10.3], [3, 11.3], [5, 12], [7, 12.5],
  [10, 13], [15, 13.5], [20, 14], [30, 14.6], [40, 15], [60, 15.2], [90, 15.5],
];

export function clearSkyEv(altitude) {
  const table = EV_BY_ALTITUDE;
  if (altitude <= table[0][0]) return table[0][1];
  if (altitude >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (altitude <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((altitude - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

// The one thing position cannot tell you.
export const SKY = [
  { id: 'clear', name: 'Clear', sub: 'Hard-edged shadows', stops: 0 },
  { id: 'hazy', name: 'Hazy or light cloud', sub: 'Shadows with soft edges', stops: 1 },
  { id: 'overcast', name: 'Overcast', sub: 'White sky, no shadows', stops: 2 },
  { id: 'heavy', name: 'Heavy cloud or rain', sub: 'Grey and gloomy', stops: 3.5 },
];

/**
 * Cloud can only block a sun that is above the horizon. Once it has set, the
 * cover the photographer reports stops mattering, and by the end of civil
 * twilight it does not matter at all.
 */
function coverFactor(altitude) {
  if (altitude >= 0) return 1;
  if (altitude <= -6) return 0;
  return (altitude + 6) / 6;
}

function band(altitude) {
  if (altitude > 50) return 'High sun';
  if (altitude > 25) return 'Full daylight';
  if (altitude > 10) return 'Low sun';
  if (altitude > 3) return 'Golden hour';
  if (altitude > -1) return 'Sunset';
  if (altitude > -6) return 'Twilight';
  if (altitude > -12) return 'Late twilight';
  return 'Night';
}

/**
 * @returns a light condition of the same shape as the hand-picked ones, so the
 *   rest of the app cannot tell the difference.
 */
export function estimateLight({ date, latitude, longitude, sky = 'clear' }) {
  const altitude = solarAltitude(date, latitude, longitude);
  const clear = clearSkyEv(altitude);
  const cover = SKY.find((s) => s.id === sky) ?? SKY[0];
  const factor = coverFactor(altitude);
  const ev = clear - cover.stops * factor;
  const name = factor > 0.05 && cover.stops > 0 ? `${band(altitude)}, ${cover.name.toLowerCase()}` : band(altitude);

  return {
    id: 'sun',
    name,
    sub: `Sun ${altitude >= 0 ? altitude.toFixed(0) + '° up' : Math.abs(altitude).toFixed(0) + '° below'} · worked out from where and when you are`,
    ev: Math.round(ev * 10) / 10,
    altitude,
    clearEv: clear,
    cover,
    coverMatters: factor > 0.05,
  };
}
