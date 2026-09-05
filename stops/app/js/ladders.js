// The values a camera dial actually stops on, in third-stop increments.
// Everything the app suggests is snapped to one of these, so the number on
// screen is a number you can dial in.

function fractions(denominators) {
  return denominators.map((d) => ({ s: 1 / d, label: '1/' + d }));
}

function longs(seconds) {
  return seconds.map((s) => ({ s, label: (Number.isInteger(s) ? s : s.toFixed(1)) + 's' }));
}

export const SHUTTERS = [
  ...fractions([
    8000, 6400, 5000, 4000, 3200, 2500, 2000, 1600, 1250, 1000, 800, 640,
    500, 400, 320, 250, 200, 160, 125, 100, 80, 60, 50, 40, 30, 25, 20, 15,
    13, 10, 8, 6, 5, 4, 3,
  ]),
  ...longs([0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30]),
];

export const APERTURES = [
  1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3,
  7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32,
].map((N) => ({ N, label: 'f/' + N }));

export const ISOS = [
  50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250,
  1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000,
  25600, 32000, 40000, 51200,
].map((v) => ({ v, label: String(v) }));

// Whole stops, for the guide's ladder table.
export const FULL_STOPS = {
  shutter: ['1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15'],
  aperture: ['f/16', 'f/11', 'f/8', 'f/5.6', 'f/4', 'f/2.8', 'f/2', 'f/1.4'],
  iso: ['100', '200', '400', '800', '1600', '3200', '6400', '12800'],
};

/** Nearest rung on a ladder, measured in stops rather than raw difference. */
export function snap(value, ladder, key) {
  let best = ladder[0];
  let bestDist = Infinity;
  for (const rung of ladder) {
    const dist = Math.abs(Math.log2(rung[key] / value));
    if (dist < bestDist) {
      bestDist = dist;
      best = rung;
    }
  }
  return best;
}

export const snapShutter = (s) => snap(s, SHUTTERS, 's');
export const snapAperture = (N) => snap(N, APERTURES, 'N');
export const snapIso = (v) => snap(v, ISOS, 'v');

/** Nearest rung at or slower/wider/higher than the value — never suggests less light. */
export function snapAtLeast(value, ladder, key) {
  const ordered = [...ladder].sort((a, b) => a[key] - b[key]);
  return ordered.find((r) => r[key] >= value - 1e-9) ?? ordered[ordered.length - 1];
}
