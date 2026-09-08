// The chips under the picture: "what happens if I change something".
//
// A chip is not a control. Nothing on the card can be set, and the settings the
// card shows are the settings for the shot. A chip answers a question, namely
// what this would look like if I opened the aperture, and answering it swaps the
// photograph, moves one number, and says what it cost. Tapping it again puts
// the card back.
//
// The labels are written the way a person would say it out loud, with the
// number they would dial in. "Open the aperture" and not "decrease f-number",
// because the beginner reading this does not yet know that those are the same
// sentence, and the note under the chip is where they find out.

import { snapShutter, snapAperture } from '../../app/js/ladders.js';

const ORDER = { ap: ['wide', 'mid', 'deep'], fl: ['wide', 'norm', 'long'], sh: ['fast', 'mid', 'slow'] };

/** The setting the card is actually showing, per axis. */
export const shotValue = (scene, axis) =>
  ({ ap: scene.aperture, fl: scene.focal, sh: scene.shutter }[axis]);

/** A step is the shot itself when its setting is the one on the card. */
const isShot = (scene, axis, value) => Math.abs(value / shotValue(scene, axis) - 1) < 0.01;

/**
 * How far a step is from the shot, and which way.
 *
 * Aperture and shutter are counted in stops, which is what the change actually
 * costs. Focal length is counted as a ratio, because a lens twice as long is
 * twice as long whatever you started from. Negative is the open, fast or wide
 * direction; positive is the closed, slow or long one.
 */
function distance(scene, axis, value) {
  const from = shotValue(scene, axis);
  if (axis === 'ap') return 2 * Math.log2(value / from);
  if (axis === 'sh') return Math.log2(value / from);
  return value >= from ? value / from : -(from / value);
}

/**
 * Wording for a move, in three sizes each way.
 *
 * Three sizes rather than two because the aperture axis now spans four stops
 * and a single "close it down" would have to serve both f/8 and f/16 on the
 * same card. Two chips reading the same thing is worse than a clumsy word.
 */
const MOVE = {
  ap: { '-3': 'Open it all the way', '-2': 'Open it right up', '-1': 'Open it a little',
        '1': 'Close it a little', '2': 'Close it right down', '3': 'Close it all the way' },
  fl: { '-3': 'Much wider, up close', '-2': 'Wider, step closer', '-1': 'Slightly wider',
        '1': 'Slightly longer', '2': 'Longer, step back', '3': 'Much longer, far back' },
  sh: { '-3': 'Much faster', '-2': 'Faster', '-1': 'A bit faster',
        '1': 'A bit slower', '2': 'Slower', '3': 'Much slower' },
};

/** Where the boundaries between "a little", "right down" and "all the way" sit. */
const TIERS = { ap: [1.6, 3.2], fl: [1.8, 3], sh: [1.6, 4] };

function sizeOf(axis, distance) {
  const [near, far] = TIERS[axis];
  const size = Math.abs(distance) < near ? 1 : Math.abs(distance) < far ? 2 : 3;
  return (distance < 0 ? -size : size).toString();
}

/** How the setting reads on the chip. */
const VALUE = {
  ap: (v) => snapAperture(v).label,
  fl: (v) => `${v} mm`,
  sh: (v) => snapShutter(v).label,
};

/**
 * What actually changes in the picture. Said of the picture rather than of the
 * setting, since the setting is already on the chip, and said of "the subject"
 * and "the movement" so that one sentence serves twelve scenes. Panning is the
 * reason the shutter lines say "the movement" and never "the background": there
 * it is the background that streaks, and the same sentence has to be true of
 * both.
 */
const RESULT = {
  ap: {
    wide: 'the background dissolves away completely',
    mid: 'the background goes soft, but you can still tell what it is',
    deep: 'everything is sharp, front to back',
  },
  fl: {
    wide: 'far more fits in behind, and all of it looks small and far off',
    norm: 'the background sits about where your eye would put it',
    long: 'a narrow slice of background, magnified up behind the subject',
  },
  sh: {
    fast: 'the movement freezes, caught in one instant',
    mid: 'the movement just starts to show',
    slow: 'the movement draws itself out into streaks',
  },
};

/** The heading above each axis's chips. */
export const AXIS_QUESTION = {
  ap: 'What if I change the aperture?',
  fl: 'What if I change the lens?',
  sh: 'What if I change the shutter?',
};

/**
 * The chips for a scene: every step on every axis except the one the shot is
 * already at, since a chip that changes nothing is a chip that teaches nothing.
 *
 * On the aperture axis none of the three is the shot, so all three appear. That
 * is the point of the four-picture ladder: the photograph with the background
 * completely gone is now something the reader can ask for.
 */
export function chipsFor(scene) {
  return Object.entries(scene.axes).map(([axis, spec]) => ({
    axis,
    question: AXIS_QUESTION[axis],
    chips: ORDER[axis]
      .filter((step) => spec.steps[step] != null && !isShot(scene, axis, spec.steps[step]))
      .map((step) => ({
        axis, step,
        label: MOVE[axis][sizeOf(axis, distance(scene, axis, spec.steps[step]))],
        value: VALUE[axis](spec.steps[step]),
        result: RESULT[axis][step],
      })),
  }));
}

/** The sentence under the picture once a chip is on. */
export function resultOf({ axis, step }) {
  return RESULT[axis]?.[step] ?? '';
}

export { ORDER as STEP_ORDER };
