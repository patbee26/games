// The exposure engine.
//
// Everything rests on one identity. For a scene whose luminance is EV (quoted,
// as always, at ISO 100), a correct exposure satisfies
//
//   log2(N² / t) = EV + log2(ISO / 100)
//
// The app anchors whichever two variables the subject dictates and solves the
// third. When the third lands outside the lens or the photographer's ISO
// ceiling, it says so rather than rounding the problem away.

import { snapShutter, snapAperture, snapIso } from './ladders.js';
import { handheldFloor, starTrailLimit, widestAt } from './optics.js';

const FASTEST_SHUTTER = 1 / 8000;
const LONGEST_SHUTTER = 30;
const NARROWEST = 22;

/** The scene EV that these settings expose correctly. */
export function settingEV({ N, t, iso = 100 }) {
  return Math.log2((N * N) / t) - Math.log2(iso / 100);
}

/** Stops between two values of the same quantity. */
export const stopsBetween = (from, to) => Math.log2(to / from);

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function startingShutter(scene, focal, crop, floor) {
  if (scene.shutterRule === '500') return starTrailLimit({ focal, crop });
  if (scene.shutter != null) return scene.shutter;
  return floor;
}

/**
 * Solve the triangle for a scene, a light level and a specific photographer.
 *
 * `lock` pins variables the photographer has chosen by hand; a pinned variable
 * is never moved to find the exposure.
 */
export function recommend({ scene, ev, gear, lens, focal, lock = {} }) {
  const crop = gear.crop ?? 1;
  const target = scene.evOverride ?? ev;
  const widest = widestAt(lens, focal);
  const stabiliserStops = lens?.stabilised ? (gear.stabiliserStops ?? 0) : 0;
  const floor = scene.tripod
    ? LONGEST_SHUTTER
    : handheldFloor({ focal, crop, stabiliserStops, userSlowest: gear.userSlowest });

  let N = lock.N ?? (scene.aperture === 'widest' ? widest : clamp(scene.aperture, widest, NARROWEST));
  let t = lock.t ?? startingShutter(scene, focal, crop, floor);
  if (lock.t == null && !scene.tripod && !scene.lockShutter) t = Math.min(t, floor);
  let iso = lock.iso ?? gear.isoMin ?? 100;

  const ceiling = gear.isoCeiling ?? 6400;
  let need = settingEV({ N, t, iso }) - target; // positive: too dark
  let solvedBy = null;

  const givers = {
    aperture: {
      dark: () => (lock.N != null ? 0 : 2 * stopsBetween(widest, N)),
      bright: () => (lock.N != null ? 0 : 2 * stopsBetween(N, NARROWEST)),
      apply: (s) => { N = N / Math.pow(2, s / 2); },
    },
    iso: {
      dark: () => (lock.iso != null ? 0 : Math.max(0, stopsBetween(iso, ceiling))),
      bright: () => (lock.iso != null ? 0 : Math.max(0, stopsBetween(gear.isoMin ?? 100, iso))),
      apply: (s) => { iso = iso * Math.pow(2, s); },
    },
    shutter: {
      dark: () => (lock.t != null ? 0 : Math.max(0, stopsBetween(t, Math.min(floor, LONGEST_SHUTTER)))),
      bright: () => (lock.t != null ? 0 : Math.max(0, stopsBetween(FASTEST_SHUTTER, t))),
      apply: (s) => { t = t * Math.pow(2, s); },
    },
  };

  const order = need > 0
    ? (scene.give ?? ['iso'])
    : (scene.giveBright ?? ['shutter', 'aperture']);

  for (const name of order) {
    if (Math.abs(need) < 1e-6) break;
    const giver = givers[name];
    if (!giver) continue;
    const available = need > 0 ? giver.dark() : giver.bright();
    if (available <= 1e-6) continue;
    const used = Math.min(Math.abs(need), available);
    // Every `apply` is written so that a positive argument gathers more light.
    giver.apply(need > 0 ? used : -used);
    need -= Math.sign(need) * used;
    solvedBy = name;
  }

  // Snap the anchors to real dial positions, then re-solve whichever variable
  // absorbed the difference so the three numbers stay consistent with each other.
  //
  // The re-solve is only allowed to absorb rounding, never to escape a limit:
  // clamping here is what keeps a shortfall a shortfall instead of quietly
  // printing an ISO the photographer has already said they will not use.
  const snapped = { N: snapAperture(N), t: snapShutter(t), iso: snapIso(iso) };
  const slowestUsable = scene.tripod ? LONGEST_SHUTTER : Math.min(floor, LONGEST_SHUTTER);
  if (solvedBy === 'iso') {
    const exact = 100 * Math.pow(2, Math.log2((snapped.N.N ** 2) / snapped.t.s) - target);
    snapped.iso = snapIso(clamp(exact, gear.isoMin ?? 100, ceiling));
  } else if (solvedBy === 'shutter') {
    const exact = (snapped.N.N ** 2) / Math.pow(2, target + Math.log2(snapped.iso.v / 100));
    snapped.t = snapShutter(clamp(exact, FASTEST_SHUTTER, slowestUsable));
  } else if (solvedBy === 'aperture') {
    const exact = Math.sqrt(snapped.t.s * Math.pow(2, target + Math.log2(snapped.iso.v / 100)));
    snapped.N = snapAperture(clamp(exact, widest, NARROWEST));
  }

  const shortfallStops = Math.max(0, need);
  const overStops = Math.max(0, -need);

  return {
    scene,
    shutter: snapped.t,
    aperture: snapped.N,
    iso: snapped.iso,
    solvedBy,
    shortfallStops,
    overStops,
    ev: target,
    focal,
    lens,
    widest,
    floor,
    atCeiling: snapped.iso.v >= ceiling - 1e-9 && solvedBy === 'iso',
    ways: shortfallStops > 0.05 ? waysOut({ scene, gear, lens, focal, snapped, shortfallStops, floor, target, widest }) : [],
  };
}

/**
 * When the shot does not fit, the honest answer is not a rounded number — it is
 * the price list. Each way out buys back the missing light and costs something
 * the photographer should get to choose.
 */
function waysOut({ scene, gear, lens, focal, snapped, shortfallStops, floor, target, widest }) {
  const ways = [];
  const missing = shortfallStops;

  if (!scene.tripod && !scene.lockShutter) {
    const slower = snapShutter(snapped.t.s * Math.pow(2, missing));
    if (slower.s > snapped.t.s) {
      ways.push({
        id: 'slow',
        title: 'Slow to ' + slower.label,
        detail: 'Movement smears a little. Faces usually stay sharp, and that is what you keep.',
        settings: { shutter: slower, aperture: snapped.N, iso: snapped.iso },
      });
    }
  }

  if (lens && lens.min !== lens.max) {
    const wideEndAperture = widestAt(lens, lens.min);
    const gain = 2 * stopsBetween(wideEndAperture, widest);
    if (gain > 0.2) {
      const bought = Math.min(gain, missing);
      ways.push({
        id: 'zoom',
        title: 'Zoom back to ' + Math.round(lens.min) + ' mm',
        detail: 'Your lens opens to f/' + snapAperture(wideEndAperture).N + ' there. Buys '
          + describeStops(bought) + ' — crop the rest back later.',
        settings: { shutter: snapped.t, aperture: snapAperture(wideEndAperture), iso: snapped.iso },
        remaining: missing - bought,
      });
    }
  }

  const faster = (gear.lenses ?? []).find(
    (l) => l !== lens && focal >= l.min && focal <= l.max && widestAt(l, focal) < widest - 0.05,
  );
  if (faster) {
    ways.push({
      id: 'lens',
      title: 'Change to the ' + faster.name,
      detail: 'It opens to f/' + snapAperture(widestAt(faster, focal)).N + ' at this focal length.',
      settings: { shutter: snapped.t, aperture: snapAperture(widestAt(faster, focal)), iso: snapped.iso },
    });
  }

  const lifted = snapIso(snapped.iso.v * Math.pow(2, missing));
  ways.push({
    id: 'iso',
    title: 'Lift the ISO cap to ' + lifted.label,
    detail: 'Grain is fixable. Blur is not. Raise your ceiling for the evening and shoot raw.',
    settings: { shutter: snapped.t, aperture: snapped.N, iso: lifted },
  });

  return ways;
}

export function describeStops(s) {
  const rounded = Math.round(s * 3) / 3;
  if (rounded < 0.1) return 'nothing';
  const whole = Math.floor(rounded + 1e-6);
  const frac = rounded - whole;
  const fracName = frac > 0.6 ? '⅔' : frac > 0.2 ? '⅓' : '';
  const number = whole ? String(whole) + (fracName ? ' ' + fracName : '') : fracName;
  const plural = rounded >= 2 || (whole >= 1 && fracName) ? 'stops' : 'stop';
  return number + ' ' + plural;
}
