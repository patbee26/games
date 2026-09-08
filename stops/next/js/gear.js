// The lens, and whether it can take the photograph on the card.
//
// One standard lens, no setup, no questions. Every scene in this app is written
// for it. The photographer may add one lens of their own, and the point of
// letting them is not configuration: it is that the card can then say something
// true about the thing in their bag. Sometimes that is "yours will not reach
// this". Sometimes it is "yours is two stops better than the one these numbers
// assume", which is the most useful sentence a beginner can be handed before
// they spend money.

import { snapAperture } from '../../app/js/ladders.js';

/**
 * The lens every scene is written for. Full frame, so there is no crop factor to
 * explain on day one.
 *
 * f/2 rather than the f/4 a real kit zoom offers, and no such lens is sold. It
 * is a teaching lens: at f/4 no scene could show a background that had genuinely
 * dissolved, so the most striking thing an aperture does was missing from an app
 * whose whole job is to show what apertures do. The honest half of that trade is
 * on the gear page, which says plainly that a real kit zoom is f/4 and invites
 * the photographer to add theirs.
 */
export const STANDARD = {
  id: 'standard',
  name: '24 to 105 mm f/2',
  short: '24 to 105 mm',
  min: 24, max: 105, widest: 2,
  standard: true,
};

export const CROP = 1;

const KEY = 'stops-next-gear';

export function loadGear() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved && saved.own) return { own: normalise(saved.own) };
  } catch { /* private mode, or nothing saved */ }
  return { own: null };
}

export function saveGear(gear) {
  try { localStorage.setItem(KEY, JSON.stringify(gear)); } catch { /* private mode */ }
}

/** A lens the photographer typed in, cleaned up and given a name. */
export function normalise(input) {
  const min = Math.round(Number(input.min));
  const max = Math.round(Number(input.max));
  const widest = Number(input.widest);
  if (!min || !max || !widest || min < 4 || max > 2000 || max < min || widest < 0.7 || widest > 45) return null;
  return { id: 'own', min, max, widest, name: nameOf({ min, max, widest }), short: shortOf({ min, max }) };
}

const nameOf = ({ min, max, widest }) =>
  `${min === max ? `${min} mm` : `${min} to ${max} mm`} f/${widest}`;
const shortOf = ({ min, max }) => (min === max ? `${min} mm` : `${min} to ${max} mm`);

/** Every lens in the bag, the standard one always first. */
export const lensesIn = (gear) => (gear.own ? [STANDARD, gear.own] : [STANDARD]);

const covers = (lens, focal) => focal >= lens.min && focal <= lens.max;

/** Stops between two f-numbers, positive meaning the first is the wider one. */
const stopsWider = (from, to) => Math.log2((to * to) / (from * from));

/**
 * What to say about the photographer's lenses for this shot.
 *
 * Returns the lens to put on and a short verdict, plus anything worth warning
 * about. The standard lens can always do every scene in this app, by
 * construction, so the interesting cases all come from the lens they added.
 */
export function lensAdvice({ gear, focal, aperture }) {
  const own = gear.own;
  const fitsStandard = covers(STANDARD, focal);
  if (!own) {
    return {
      lens: STANDARD, tone: 'ok',
      verdict: `Set the standard zoom to ${focal} mm.`,
      lines: [`Everything in this app is written for a ${STANDARD.name}, which is a
               teaching lens rather than one you can buy. Add your own on the Gear page
               and this will talk about that one instead.`],
    };
  }

  const ownFits = covers(own, focal);
  const lines = [];

  if (ownFits) {
    const gap = stopsWider(own.widest, aperture);
    if (own.widest > aperture) {
      // Their lens cannot open as wide as the shot asks for.
      const short = stopsWider(aperture, own.widest);
      // Two different things are lost here and both are worth saying. The light
      // comes back on the ISO, which costs grain. The depth of field does not
      // come back at all, and since the aperture chips exist precisely to show
      // what a wider opening does to the background, telling the reader the
      // picture would be identical would be telling them the opposite.
      return {
        lens: own, tone: 'warn',
        verdict: `Your ${own.short} reaches ${focal} mm, but only opens to f/${own.widest}.`,
        lines: [`That is ${stopsLabel(short)} short of the f/${aperture} on the card. Shoot it
                 at f/${own.widest} and the camera picks ${stopsLabel(short)} more ISO to make the
                 brightness up, which costs you a little grain.`,
                `The background is the part that does not come back. It will stay closer
                 to what you see at f/${own.widest} than to the photograph above.`],
      };
    }
    if (gap >= 0.9) {
      // The interesting case: their lens is better than the one the card assumes.
      lines.push(`Wide open at f/${own.widest} it is ${stopsLabel(gap)} brighter than the f/${aperture}
                  on the card, so the camera drops the ISO by the same amount.`);
      lines.push(`The background will also go softer than the photograph above, which is
                  what people mean when they say a fast lens looks different.`);
      return {
        lens: own, tone: 'good',
        verdict: `Your ${own.name} does this, and does it better than the standard zoom.`,
        lines,
      };
    }
    return {
      lens: own, tone: 'ok',
      verdict: `Your ${own.short} covers this. Set it to ${focal} mm.`,
      lines: [`It opens to f/${own.widest}, which is enough for the f/${aperture} this shot wants.`],
    };
  }

  // Their lens will not reach. Say what to do about it, and fall back to the
  // standard zoom rather than leaving them with nothing.
  const tooLong = own.min > focal;
  const reach = tooLong ? `${own.min} mm at its widest` : `${own.max} mm at its longest`;
  lines.push(tooLong
    ? `To frame this with it you would have to walk a long way back, and often there
       is nowhere to walk back to.`
    : `You can walk closer instead, but the subject then sits against a background
       that has grown behind it, which is a different photograph.`);
  if (fitsStandard) lines.push(`The standard ${STANDARD.short} zoom does reach ${focal} mm, so put that on.`);
  return {
    lens: fitsStandard ? STANDARD : own,
    tone: 'warn',
    verdict: `Your ${own.short} will not do this: it is ${reach}, and this wants ${focal} mm.`,
    lines,
  };
}

const stopsLabel = (s) => {
  const n = Math.round(s * 3) / 3;
  if (Math.abs(n - Math.round(n)) < 0.05) {
    const w = Math.round(n);
    return `${w} stop${w === 1 ? '' : 's'}`;
  }
  return `${n.toFixed(1)} stops`;
};

export { snapAperture };
