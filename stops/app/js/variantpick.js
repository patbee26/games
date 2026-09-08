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
// length, the latter computed by the same optics that drive the preview.

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
 * is also how a photographer says it: wide open, a couple down, stopped right
 * down. It is what the three photographs are of.
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
 * How many times past the point where movement first shows before the smeared
 * photograph is the truthful one.
 *
 * `motionThreshold` is where the smear crosses 0.6% of the frame width, which
 * is where a pixel-peeper notices it and nowhere near a streak. Four times that
 * is about 2.5% of the width, an unmistakable smear at arm's length, and the
 * point at which the third photograph stops overstating what the shutter did.
 */
export const SHUTTER_SPREAD = 4;

/**
 * Which of the three shutter photographs the current shutter lands on.
 *
 * `bounds` is the scene's own pair of shutter times, in seconds, and it exists
 * because the thing that moves is not always the thing the scene measures. A
 * waterfall and a street of traffic both have `speed: 0`, since the subject
 * really is standing still, so their motion has to be described directly rather than
 * derived from a subject crossing the frame.
 */
export function shutterStep({ shutter, threshold, bounds }) {
  const [fast, slow] = bounds
    ?? (threshold ? [threshold, threshold * SHUTTER_SPREAD] : []);
  if (!shutter || !fast) return 'mid';
  if (shutter <= fast) return 'fast';
  if (shutter <= slow) return 'mid';
  return 'slow';
}

/**
 * What each photograph is showing, said in terms of the picture rather than the
 * setting, since the number is already on the screen above it.
 *
 * Deliberately said of "the subject" and "the movement" rather than of this or
 * that scene: twelve scenes share these three sentences per axis, and a note
 * that named a face would be wrong on a plate of pasta. Panning is the reason
 * the shutter notes say "the movement" and never "the background": there it is
 * the background that streaks, and the same sentence has to be true of both.
 */
export const STEP_NOTE = {
  ap: {
    wide: 'Wide open: the background has dissolved into unreadable blur.',
    mid: 'A middle aperture: the background is soft, but you can still tell what it is.',
    deep: 'Stopped down: sharp from the nearest subject to the furthest thing in the frame.',
  },
  fl: {
    wide: 'A wide lens, from close in: far more behind the subject, and all of it small.',
    norm: 'A normal lens, from a few metres: the background about as your eye sees it.',
    long: 'A long lens, from far back: a narrow slice of background, magnified behind the subject.',
  },
  sh: {
    fast: 'A fast shutter: the movement is frozen, caught in a single instant.',
    mid: 'A moderate shutter: the movement is just beginning to show.',
    slow: 'A slow shutter: the movement has drawn itself out into streaks.',
  },
};

export const AXIS_NAME = { ap: 'Aperture', fl: 'Focal length', sh: 'Shutter' };

/** The quantity the three photographs sample, for the caption that admits it. */
export const AXIS_QUANTITY = { ap: 'aperture', fl: 'focal length', sh: 'shutter speed' };
