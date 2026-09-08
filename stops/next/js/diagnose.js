// Reading a photograph against the card it was supposed to be taken from.
//
// The whole point is the distinction most feedback misses. "Your shutter was
// four stops slow" is true and useless if the light never allowed the card's
// shutter in the first place. Because the file records aperture, shutter and
// ISO together, the light the photographer was standing in can be worked back
// out of it, and the app can then tell those two situations apart:
//
//   you chose wrongly            here is which of the three settings did it
//   the card was not available   here is why, and what to do next time
//
// Those are opposite lessons, and giving the first when the second is true is
// how a beginner learns to distrust the app.

import { LIGHT } from '../../app/js/data.js';
import { snapShutter, snapAperture, snapIso } from '../../app/js/ladders.js';
import { handheldFloor } from '../../app/js/optics.js';
import { evFrom } from './exif.js';
import { CROP } from './gear.js';
import { ISO_MAX, ISO_MIN } from './shot.js';

/** Below this, a difference is not worth a sentence. A third of a stop is noise. */
const QUIET = 0.7;
/** At or beyond this, the lesson was actually missed rather than approached. */
const MISS = 2;

const inStops = (s) => {
  const n = Math.abs(s);
  if (n < 1.4) return 'about a stop';
  return `${Math.round(n)} stops`;
};

/** The light in the photograph, named by the closest one the app offers. */
export function lightFrom(ev) {
  if (ev == null) return null;
  return LIGHT.reduce((best, l) => (Math.abs(l.ev - ev) < Math.abs(best.ev - ev) ? l : best), LIGHT[0]);
}

export function diagnose({ scene, exif, clipped = 0 }) {
  const ev = evFrom(exif);
  const light = lightFrom(ev);

  // What the card would have cost in the light they were actually in.
  const isoNeeded = ev == null ? null
    : 100 * ((scene.aperture * scene.aperture) / scene.shutter) / Math.pow(2, ev);
  const tooDark = isoNeeded != null && isoNeeded > ISO_MAX;
  const tooBright = isoNeeded != null && isoNeeded < ISO_MIN && !scene.nd;

  // The focal length to compare against is the one in full-frame terms, since
  // that is what every scene is written in. A crop-sensor camera records both.
  const focal = exif.focal35 ?? exif.focal ?? null;
  const focalIsEquivalent = exif.focal35 != null && exif.focal != null && exif.focal35 !== exif.focal;

  const rows = [
    ['Aperture', snapAperture(exif.aperture).label, snapAperture(scene.aperture).label],
    ['Shutter', snapShutter(exif.shutter).label, snapShutter(scene.shutter).label],
    ['ISO', String(snapIso(exif.iso).v), 'Auto'],
    ['Lens', focal ? `${Math.round(focal)} mm` : 'not recorded', `${scene.focal} mm`],
  ];

  const findings = [];

  if (tooDark) {
    findings.push({
      tone: 'miss', key: 'light',
      head: 'The card was not available in that light.',
      body: `${snapShutter(scene.shutter).label} at ${snapAperture(scene.aperture).label} would have
             needed ISO ${Math.round(isoNeeded).toLocaleString('en-GB')} where you were standing, and your
             camera stops at ${ISO_MAX.toLocaleString('en-GB')}. Nothing you set on the dial was going to
             fix that. This photograph needed more light, or a lens that opens wider.`,
    });
  }
  if (tooBright) {
    findings.push({
      tone: 'note', key: 'light',
      head: 'There was more light than the card wanted.',
      body: `The card's settings would have been ${inStops(Math.log2(ISO_MIN / isoNeeded))} brighter than
             the lowest ISO your camera has. Opening up or slowing down was the wrong direction here.`,
    });
  }

  const shutterStops = Math.log2(exif.shutter / scene.shutter);
  if (Math.abs(shutterStops) >= QUIET) findings.push(shutterFinding(scene, exif, shutterStops, focal, tooDark));

  const apertureStops = 2 * Math.log2(exif.aperture / scene.aperture);
  if (Math.abs(apertureStops) >= QUIET) findings.push(apertureFinding(scene, apertureStops, tooDark));

  if (focal && Math.abs(Math.log2(focal / scene.focal)) >= 0.2) {
    findings.push(focalFinding(scene, focal, focalIsEquivalent));
  }

  if (exif.iso >= 6400) {
    const avoidable = isoNeeded != null && isoNeeded < exif.iso / 2;
    findings.push({
      tone: 'note', key: 'iso',
      head: `ISO ${snapIso(exif.iso).v} is high enough to see.`,
      body: avoidable
        ? `The card's settings would have got there on about ISO ${Math.round(isoNeeded)}. Something you
           changed cost you the difference, and grain is what you paid with.`
        : `In that light there was not much choice. Grain is the right thing to spend when the
           alternative is blur, and it cleans up far better than blur does.`,
    });
  }

  if (clipped > 0.02) {
    findings.push({
      tone: 'note', key: 'clipped',
      head: `${Math.round(clipped * 100)}% of the frame is pure white.`,
      body: `Those areas hold no detail at all and nothing brings them back, unlike a dark area,
             which usually can be lifted. When the sky matters, expose for the sky.`,
    });
  }

  findings.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);

  if (!findings.length) {
    findings.push({
      tone: 'good', key: 'ok',
      head: 'You took the photograph on the card.',
      body: `All three settings are within a stop of it. Whatever you think of the picture, the
             exposure decisions behind it were the ones this scene calls for.`,
    });
  }

  return { ev, light, isoNeeded, tooDark, tooBright, rows, findings, focal };
}

const TONE_RANK = { miss: 0, note: 1, good: 2 };

function shutterFinding(scene, exif, stops, focal, tooDark) {
  const slower = stops > 0;
  const tone = Math.abs(stops) >= MISS ? 'miss' : 'note';
  const wants = scene.axes.sh;

  // A scene with a shutter lesson has a picture of what going the wrong way
  // looks like, so say that. A scene without one is only at risk from the
  // photographer's own hands.
  if (wants) {
    return {
      tone, key: 'shutter',
      head: `Your shutter was ${inStops(stops)} ${slower ? 'slower' : 'faster'} than the card.`,
      body: slower
        ? `At ${snapShutter(exif.shutter).label} the movement draws itself out instead of stopping.
           If the subject looks smeared, this is the setting that did it.` +
          (tooDark ? ' In that light it may also have been the only way to get an exposure at all.' : '')
        : `At ${snapShutter(exif.shutter).label} the movement is frozen. This scene is asking for the
           opposite: the streak is the photograph, and a fast shutter makes it look like nothing
           is happening.` + (scene.nd
            ? ` In daylight you cannot get to ${snapShutter(scene.shutter).label} without a neutral-density
               filter, so if you were shooting without one, that is the missing piece rather than
               anything you set.`
            : ''),
    };
  }

  const floor = handheldFloor({ focal: focal ?? scene.focal, crop: CROP, stabiliserStops: 0, userSlowest: null });
  if (slower && exif.shutter > floor * 1.4) {
    return {
      tone: 'miss', key: 'shutter',
      head: `${snapShutter(exif.shutter).label} is slower than your hands can hold at ${Math.round(focal ?? scene.focal)} mm.`,
      body: `The rough limit is ${snapShutter(floor).label}, and below it your own movement smears the
             whole frame rather than just the subject. If the entire picture is soft, that is this.`,
    };
  }
  return {
    tone: 'note', key: 'shutter',
    head: `Your shutter was ${inStops(stops)} ${slower ? 'slower' : 'faster'} than the card.`,
    body: slower
      ? `Nothing here is moving fast, so this mostly cost you nothing. It is light you could have
         spent on a lower ISO instead.`
      : `Faster than this scene needs. That light had to come from somewhere, and it came from
         the ISO.`,
  };
}

function apertureFinding(scene, stops, tooDark) {
  const narrower = stops > 0;
  const tone = Math.abs(stops) >= MISS ? 'miss' : 'note';
  const teaches = Boolean(scene.axes.ap);
  return {
    tone: teaches ? tone : 'note', key: 'aperture',
    head: `Your aperture was ${inStops(stops)} ${narrower ? 'narrower' : 'wider'} than the card.`,
    body: narrower
      ? (teaches
        ? `Stopped down that far, the background comes back into focus and stops getting out of the
           way of your subject. This scene is largely about not letting that happen.`
        : `That is more depth than this scene needs, and it costs light. The ISO paid for it.`)
      : (teaches
        ? `Wider than the card, so less is sharp than the photograph shows. Worth checking that
           what you focused on is the thing that stayed sharp.`
        : `Wider than the card, which buys light but leaves less of the scene sharp. Check the
           parts you expected to be crisp.`) + (tooDark ? ' In that light it was also the sensible move.' : ''),
  };
}

function focalFinding(scene, focal, isEquivalent) {
  const longer = focal > scene.focal;
  const note = isEquivalent ? ' (in full-frame terms, which is how this app counts)' : '';
  return {
    tone: 'note', key: 'focal',
    head: `You shot at ${Math.round(focal)} mm${note}, the card says ${scene.focal} mm.`,
    body: longer
      ? `A longer lens from further back magnifies the background and gives you a narrower slice of
         it. Not wrong, but a different photograph from the one on the card.`
      : `A wider lens from closer in fits more behind the subject and makes all of it look smaller
         and further away. Not wrong, but a different photograph from the one on the card.`,
  };
}
