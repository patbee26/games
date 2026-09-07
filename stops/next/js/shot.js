// Working out the one card.
//
// The camera is in manual with Auto ISO, so the photographer sets the aperture
// and the shutter and the camera picks the ISO. That is the whole reason this
// app can show a card with two numbers on it: the two numbers are the two
// creative decisions, and the third leg has no creative consequence worth
// teaching on day one. So the only sum here is the one the camera itself does.
//
//   EV = log2(N² / t) − log2(ISO / 100)
//
// rearranged for the ISO the camera will land on:
//
//   ISO = 100 · (N² / t) / 2^EV

import { snapShutter, snapAperture, snapIso } from '../../app/js/ladders.js';
import { lightById } from '../../app/js/data.js';
import { lessonFor } from './lessons.js';

/** The floor and ceiling Auto ISO is allowed to use. */
export const ISO_MIN = 100;
export const ISO_MAX = 12800;

/** The ISO the camera would choose, before it is clamped to what it has. */
export function isoFor({ aperture, shutter, ev }) {
  return 100 * ((aperture * aperture) / shutter) / Math.pow(2, ev);
}

/**
 * The settings for a scene in a light, optionally with one thing changed.
 *
 * `change` is `{ axis, step }` — the chip the photographer tapped. It replaces
 * one setting and leaves the rest alone, which is the point: the picture and
 * the ISO both move, and nothing else does.
 */
export function shotFor({ sceneId, lightId, change = null }) {
  const scene = lessonFor(sceneId);
  const light = lightById(lightId);
  if (!scene || !light) return null;

  const settings = { focal: scene.focal, aperture: scene.aperture, shutter: scene.shutter };
  let step = null;
  if (change && scene.axes[change.axis]) {
    const axis = scene.axes[change.axis];
    const value = axis.steps[change.step];
    if (value != null) {
      step = change.step;
      settings[{ ap: 'aperture', fl: 'focal', sh: 'shutter' }[change.axis]] = value;
    }
  }

  const wanted = isoFor({ aperture: settings.aperture, shutter: settings.shutter, ev: light.ev });
  const iso = Math.min(ISO_MAX, Math.max(ISO_MIN, wanted));
  // A camera cannot go below its base ISO, so light beyond that is light you
  // have to take away — with a filter, or by waiting. Above the ceiling it is
  // light you do not have.
  const over = wanted < ISO_MIN ? Math.log2(ISO_MIN / wanted) : 0;
  const under = wanted > ISO_MAX ? Math.log2(wanted / ISO_MAX) : 0;

  return {
    scene, light, change: change && step ? { axis: change.axis, step } : null,
    focal: settings.focal,
    aperture: snapAperture(settings.aperture),
    shutter: snapShutter(settings.shutter),
    iso: snapIso(iso),
    isoWanted: wanted,
    over, under,
    photo: photoFor(scene, change && step ? { axis: change.axis, step } : null),
  };
}

/**
 * Which photograph goes with these settings.
 *
 * With no chip tapped it is the scene's own picture — the base the variations
 * were generated from, in photos/bases/, and not the first app's photograph of
 * the same subject. Those are two different pictures, and pairing the card with
 * the wrong one would change the face the instant a chip was tapped.
 */
export function photoFor(scene, change) {
  if (!change) return { src: `photos/bases/${scene.id}.jpg`, variant: false };
  return { src: `photos/variants/${scene.id}__${change.axis}-${change.step}.jpg`, variant: true };
}

/** The stops of light a change costs, positive meaning it needs more. */
export function costOf({ sceneId, lightId, change }) {
  const before = shotFor({ sceneId, lightId });
  const after = shotFor({ sceneId, lightId, change });
  if (!before || !after) return 0;
  return Math.log2(after.isoWanted / before.isoWanted);
}
