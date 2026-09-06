// Physical optics for the preview and the hand-held floor.
//
// These are the real equations rather than a hand-tuned curve. It matters:
// a preview that shows lush background blur for a 24 mm lens at f/4 teaches
// something false, and the whole point of the app is not to do that.

/** Sensor width in mm, by crop factor relative to 35 mm. */
export function sensorWidth(crop = 1) {
  return 36 / crop;
}

/**
 * Diameter, in mm on the sensor, of the blur disc a background point becomes.
 *
 *   b = (f² / N) · (sb − s) / (s · sb)
 *
 * with focal length f and distances s (subject) and sb (background) in metres,
 * f converted to metres. Returns 0 when the background is at or in front of
 * the subject, and treats an infinite background as the limit sb → ∞.
 */
export function backgroundBlurMm({ focal, aperture, subject, background }) {
  if (!focal || !aperture || !subject) return 0;
  const f = focal / 1000; // mm → m
  if (subject <= f) return 0;
  const ratio = background && isFinite(background)
    ? Math.max(0, (background - subject) / (subject * background))
    : 1 / subject; // background at infinity
  return ((f * f) / aperture) * ratio * 1000; // m → mm
}

/**
 * Length, in mm on the sensor, of the smear a laterally moving subject leaves.
 *
 *   L = (v · t · f) / s
 */
export function motionBlurMm({ focal, shutter, speed, subject }) {
  if (!focal || !shutter || !speed || !subject) return 0;
  const f = focal / 1000;
  return ((speed * shutter * f) / subject) * 1000;
}

/** A length on the sensor, as a fraction of the frame width. */
export function asFrameFraction(mm, crop = 1) {
  return mm / sensorWidth(crop);
}

/**
 * Slowest shutter (in seconds) worth suggesting hand-held.
 *
 * The reciprocal rule gives 1/(focal × crop); stabilisation buys stops on top
 * of it. Whatever the photographer says they personally trust is a hard cap on
 * the result, so the app never quietly suggests something slower than that.
 */
export function handheldFloor({ focal, crop = 1, stabiliserStops = 0, userSlowest = null }) {
  const reciprocal = 1 / (focal * crop);
  const assisted = reciprocal * Math.pow(2, stabiliserStops);
  return userSlowest ? Math.min(assisted, userSlowest) : assisted;
}

/**
 * The shutter speed at which this subject's movement starts to be visible —
 * where its smear crosses a given fraction of the frame width. Useful for
 * telling a beginner what they are actually buying with a faster shutter.
 */
export function motionThreshold({ focal, crop = 1, speed, subject, fraction = 0.006 }) {
  if (!speed || !focal || !subject) return null;
  return (fraction * sensorWidth(crop) * subject) / (speed * focal);
}

/** The 500 rule: longest exposure before stars trail, in seconds. */
export function starTrailLimit({ focal, crop = 1 }) {
  return 500 / (focal * crop);
}

/**
 * Widest aperture a zoom offers at a given focal length. Real zooms step, but
 * interpolating in stops across the range is close enough to be useful and
 * never optimistic by more than a third of a stop on common kit lenses.
 */
export function widestAt(lens, focal) {
  if (!lens) return 2.8;
  const { min, max, wideMin, wideMax } = lens;
  if (wideMax == null || wideMin === wideMax || min === max) return wideMin;
  const clamped = Math.min(Math.max(focal, min), max);
  const position = Math.log2(clamped / min) / Math.log2(max / min);
  const stops = Math.log2(wideMax / wideMin) * position;
  return wideMin * Math.pow(2, stops);
}
