// The photographer's own kit, in local storage. Three numbers do most of the
// work — the widest aperture at the focal length in use, the ISO ceiling, and
// the slowest shutter they trust hand-held — and they are the whole reason the
// app's answers differ from a printed chart.

import { widestAt } from './optics.js';

const KEY = 'stops.gear.v1';

export const DEFAULT_GEAR = {
  crop: 1.5,
  isoMin: 100,
  isoCeiling: 6400,
  stabiliserStops: 3,
  userSlowest: 1 / 60,
  lenses: [
    { id: 'kit', name: '18–55 mm', min: 18, max: 55, wideMin: 3.5, wideMax: 5.6, stabilised: true },
    { id: 'tele', name: '55–200 mm', min: 55, max: 200, wideMin: 4, wideMax: 5.6, stabilised: true },
    { id: 'prime', name: '35 mm', min: 35, max: 35, wideMin: 1.8, wideMax: 1.8, stabilised: false },
  ],
};

export function loadGear() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_GEAR);
    return { ...structuredClone(DEFAULT_GEAR), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_GEAR);
  }
}

export function saveGear(gear) {
  try {
    localStorage.setItem(KEY, JSON.stringify(gear));
  } catch {
    /* private mode, or storage full — the app still works, it just forgets. */
  }
}

/** The lens best suited to a focal length, and the focal length to use with it. */
export function chooseLens(gear, wanted) {
  const covering = gear.lenses.filter((l) => wanted >= l.min && wanted <= l.max);
  if (covering.length) {
    // The fastest one, which is the whole point of owning it. Taking the first
    // in the list instead was quietly leaving nearly three stops in the bag.
    const fastest = covering.reduce((a, b) => (widestAt(a, wanted) <= widestAt(b, wanted) ? a : b));
    return { lens: fastest, focal: wanted };
  }
  let best = gear.lenses[0];
  let bestGap = Infinity;
  for (const lens of gear.lenses) {
    const nearest = Math.min(Math.max(wanted, lens.min), lens.max);
    const gap = Math.abs(Math.log2(nearest / wanted));
    if (gap < bestGap) { bestGap = gap; best = lens; }
  }
  return { lens: best, focal: Math.min(Math.max(wanted, best.min), best.max) };
}
