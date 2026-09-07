// The chips under the picture: "what happens if I change something".
//
// A chip is not a control. Nothing on the card can be set, and the settings the
// card shows are the settings for the shot. A chip answers a question — what
// would this look like if I opened the aperture — and answering it swaps the
// photograph, moves one number, and says what it cost. Tapping it again puts
// the card back.
//
// The labels are written the way a person would say it out loud, with the
// number they would dial in. "Open the aperture" and not "decrease f-number",
// because the beginner reading this does not yet know that those are the same
// sentence — and the note under the chip is where they find out.

import { snapShutter, snapAperture } from '../../app/js/ladders.js';

const ORDER = { ap: ['wide', 'mid', 'deep'], fl: ['wide', 'norm', 'long'], sh: ['fast', 'mid', 'slow'] };

/** Wording for a move of one step, and of two, in each direction on each axis. */
const MOVE = {
  ap: {
    '-1': 'Open the aperture', '-2': 'Open it right up',
    '+1': 'Close the aperture', '+2': 'Close it right down',
  },
  fl: {
    '-1': 'Zoom out, step closer', '-2': 'Go wide, right up close',
    '+1': 'Zoom in, step back', '+2': 'Go long, from far back',
  },
  sh: {
    '-1': 'Faster shutter', '-2': 'Much faster shutter',
    '+1': 'Slower shutter', '+2': 'Much slower shutter',
  },
};

/** How the setting reads on the chip. */
const VALUE = {
  ap: (v) => snapAperture(v).label,
  fl: (v) => `${v} mm`,
  sh: (v) => snapShutter(v).label,
};

/**
 * What actually changes in the picture. Said of the picture, not the setting —
 * the setting is already on the chip — and said of "the subject" and "the
 * movement" so that one sentence serves twelve scenes.
 */
const RESULT = {
  ap: {
    wide: 'the background dissolves away',
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
 */
export function chipsFor(scene) {
  return Object.entries(scene.axes).map(([axis, spec]) => ({
    axis,
    question: AXIS_QUESTION[axis],
    chips: ORDER[axis]
      .filter((step) => spec.steps[step] != null && step !== spec.ideal)
      .map((step) => {
        const delta = ORDER[axis].indexOf(step) - ORDER[axis].indexOf(spec.ideal);
        return {
          axis, step,
          label: MOVE[axis][(delta > 0 ? '+' : '') + delta] ?? MOVE[axis][delta > 0 ? '+1' : '-1'],
          value: VALUE[axis](spec.steps[step]),
          result: RESULT[axis][step],
        };
      }),
  }));
}

/** The sentence under the picture once a chip is on. */
export function resultOf({ axis, step }) {
  return RESULT[axis]?.[step] ?? '';
}

export { ORDER as STEP_ORDER };
