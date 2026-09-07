// Choosing which variation photograph to show for the current settings.
//
// A variation set is three photographs on an axis that is continuous, so this
// picks the nearest and the app says it is doing that. What it does not do is
// pick by f-number or by focal length directly: f/4 is a lot of background blur
// on an 85 mm at two metres and almost none on a 24 mm at eight, so a threshold
// on the number would show the wrong picture for half the scenes.
//
// Instead each axis is picked on the quantity its three photographs are of:
// aperture by how far the lens is stopped down from its own widest, and focal
// length by how magnified the background is relative to the scene's own focal
// length — the latter computed by the same optics that drive the preview.

import { backgroundMagnification } from './optics.js';
import { stopsBetween } from './exposure.js';

/**
 * Stops down from the lens's widest, at the boundaries between the three
 * aperture photographs.
 *
 * Stops rather than the blur itself, because blur in the frame is dominated by
 * focal length: on this scene an 85 mm at f/8 throws more background out of
 * focus than a 35 mm wide open, so picking on blur would show the stopped-down
 * photograph to someone shooting wide open on a short lens. Stops from widest
 * is also how a photographer says it — wide open, a couple down, stopped right
 * down — and it is what the three photographs are of.
 */
export const STOP_STEPS = [1.5, 3.5];

/** Background magnification at the boundaries between the three lens photographs. */
export const MAG_STEPS = [0.78, 1.3];

/** Which of the three aperture photographs the current settings land on. */
export function apertureStep({ aperture, widest }) {
  if (!aperture || !widest) return 'mid';
  const down = stopsBetween(widest, aperture) * 2; // f-numbers: one stop is x sqrt(2)
  if (down < STOP_STEPS[0]) return 'wide';
  if (down < STOP_STEPS[1]) return 'mid';
  return 'deep';
}

/** Which of the three lens photographs the current focal length lands on. */
export function focalStep({ focal, baseFocal, subject, background }) {
  const mag = backgroundMagnification({ focal, baseFocal, subject, background });
  if (mag < MAG_STEPS[0]) return 'wide';
  if (mag < MAG_STEPS[1]) return 'norm';
  return 'long';
}

/**
 * What each photograph is showing, said in terms of the picture rather than the
 * setting — the number is already on the screen above it.
 */
export const STEP_NOTE = {
  ap: {
    wide: 'Wide open: the background has gone completely.',
    mid: 'Middle: the background is soft, but you can still tell what it is.',
    deep: 'Stopped down: sharp from her face to the far shore.',
  },
  fl: {
    wide: 'A wide lens, from close in: much more behind her, and all of it small.',
    norm: 'A normal lens, from a few metres: the background about as your eye sees it.',
    long: 'A long lens, from far back: a narrow slice of background, magnified behind her.',
  },
};

export const AXIS_NAME = { ap: 'Aperture', fl: 'Focal length' };
