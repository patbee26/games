// The twelve scenes, as the tutorial states them.
//
// The difference from the first app is that nothing here is solved. The first
// app took a scene and a light and worked out three numbers; a beginner then
// had to follow the working. This one asserts the shot: this focal length, this
// aperture, this shutter, because that is how this picture is taken. The light
// changes exactly one thing, the ISO the camera will choose for itself, and
// that is the only arithmetic on the page.
//
// Each scene names, per axis, the three settings its three photographs were
// made at, and which of them is the shot. The other two become the chips under
// the picture. Declaring them rather than deriving them is deliberate: a
// threshold that decides which photograph to show is a thing that can be
// subtly wrong, and here there is nothing for it to be wrong about.

/** Every aperture scene walks the same three: wide open, the middle, right down. */
const APERTURE_SET = { wide: 4, mid: 8, deep: 16 };

export const LESSONS = [
  {
    id: 'kids', name: 'Kids & pets', blurb: 'A child running across the garden.',
    focal: 50, aperture: 5.6, shutter: 1 / 1000,
    lights: ['harsh-sun', 'hazy-sun', 'overcast', 'heavy-cloud'],
    why: {
      shutter: 'Fast enough to stop a running child dead.',
      aperture: 'A touch off wide open. At 1/1000 in daylight you still have light\n        to spare, and it buys you a margin on focus you will be glad of.',
      focal: 'Close enough to fill the frame without standing on top of them.',
    },
    axes: { sh: { ideal: 'fast', steps: { fast: 1 / 1000, mid: 1 / 125, slow: 1 / 30 } } },
  },
  {
    id: 'portrait', name: 'Portrait', blurb: 'One person, and a background that gets out of the way.',
    // 105 rather than the classic 85: it is the long end of the kit lens, so all
    // three lens photographs are reachable without buying anything.
    focal: 105, aperture: 4, shutter: 1 / 1000,
    lights: ['hazy-sun', 'overcast', 'heavy-cloud', 'late-day'],
    why: {
      aperture: 'As wide as this lens opens, which is what softens the background.',
      shutter: 'Fast, which at this aperture is also what keeps the daylight\n        from overwhelming the lowest ISO the camera has.',
      focal: 'The long end, so the background is magnified and the face is not stretched.',
    },
    axes: {
      ap: { ideal: 'wide', steps: APERTURE_SET },
      fl: { ideal: 'long', steps: { wide: 24, norm: 50, long: 105 } },
    },
  },
  {
    id: 'group', name: 'Group photo', blurb: 'Two rows of people, and everyone wants to be sharp.',
    focal: 35, aperture: 8, shutter: 1 / 500,
    lights: ['hazy-sun', 'overcast', 'heavy-cloud', 'late-day'],
    why: {
      aperture: 'Stopped down far enough to carry the back row as well as the front.',
      shutter: 'Fast enough for a group that will not quite hold still.',
      focal: 'Wide enough to get everyone in without walking backwards into the sea.',
    },
    axes: { ap: { ideal: 'mid', steps: APERTURE_SET } },
  },
  {
    id: 'sports', name: 'Sports & action', blurb: 'A football match from the touchline.',
    focal: 105, aperture: 5.6, shutter: 1 / 1000,
    lights: ['harsh-sun', 'hazy-sun', 'overcast', 'heavy-cloud'],
    why: {
      shutter: 'A kicked ball moves fast. This is what freezes it.',
      aperture: 'Just off wide open, which in daylight still leaves the shutter\n        all the light it needs.',
      focal: 'The longest this lens goes, and honestly it is short for a pitch.',
    },
    axes: { sh: { ideal: 'fast', steps: { fast: 1 / 1000, mid: 1 / 125, slow: 1 / 30 } } },
  },
  {
    id: 'street', name: 'Street', blurb: 'A city street, and something happening in it.',
    focal: 35, aperture: 8, shutter: 1 / 250,
    lights: ['hazy-sun', 'overcast', 'heavy-cloud', 'late-day', 'blue-hour'],
    why: {
      aperture: 'Deep enough that anything a few metres away is already sharp.',
      shutter: 'Fast enough for someone walking past you.',
      focal: 'The classic street length: about what you see without turning your head.',
    },
    axes: {
      ap: { ideal: 'mid', steps: APERTURE_SET },
      fl: { ideal: 'norm', steps: { wide: 24, norm: 35, long: 105 } },
    },
  },
  {
    id: 'landscape', name: 'Landscape', blurb: 'A view worth stopping the car for.',
    focal: 24, aperture: 8, shutter: 1 / 250,
    lights: ['hazy-sun', 'overcast', 'heavy-cloud', 'late-day', 'blue-hour'],
    why: {
      aperture: 'The sharpest this lens gets, and deep enough to hold the whole view.',
      shutter: 'Nothing is moving, so this is just fast enough for your hands.',
      focal: 'The wide end, which is what the wide end is for.',
    },
    axes: { fl: { ideal: 'wide', steps: { wide: 24, norm: 50, long: 105 } } },
  },
  {
    id: 'architecture', name: 'Architecture', blurb: 'A building you want to show whole.',
    focal: 24, aperture: 8, shutter: 1 / 500,
    lights: ['harsh-sun', 'hazy-sun', 'overcast', 'heavy-cloud'],
    why: {
      aperture: 'Deep, so the near corner and the far one are both sharp.',
      shutter: 'A building is not going anywhere; this is for your hands.',
      focal: 'Wide enough to fit the building in from across the square.',
    },
    axes: { fl: { ideal: 'wide', steps: { wide: 24, norm: 50, long: 105 } } },
  },
  {
    id: 'indoor', name: 'Indoors, no flash', blurb: 'A room, the light that is already in it, and no flash.',
    focal: 35, aperture: 4, shutter: 1 / 125,
    lights: ['bright-in', 'room-night', 'dim-in'],
    why: {
      aperture: 'Wide open. Indoors you need every stop the lens has.',
      shutter: 'About as slow as you can hand-hold and still be sharp.',
      focal: 'Wide enough for a room you cannot back out of.',
    },
    axes: { ap: { ideal: 'wide', steps: APERTURE_SET } },
  },
  {
    id: 'food', name: 'Food & tabletop', blurb: 'What is in front of you, by the window.',
    focal: 50, aperture: 4, shutter: 1 / 125,
    lights: ['bright-in', 'room-night', 'dim-in'],
    why: {
      aperture: 'Wide open, so the plate stands out of the table around it.',
      shutter: 'Enough to be sharp leaning over a table.',
      focal: 'Close to what your eye sees, so the plate keeps its shape.',
    },
    axes: { ap: { ideal: 'wide', steps: APERTURE_SET } },
  },
  {
    id: 'nightcity', name: 'Night & city', blurb: 'A skyline after the sun has gone, from a tripod.',
    focal: 24, aperture: 16, shutter: 1, tripod: true,
    lights: ['night-street', 'blue-hour'],
    why: {
      aperture: 'Right down. On a tripod the depth is free, and it is also what\n        holds the exposure to a whole second without a filter.',
      shutter: 'Long enough for headlights to draw themselves across the frame.',
      focal: 'Wide, for the whole skyline and the road running into it.',
    },
    axes: { sh: { ideal: 'slow', steps: { fast: 1 / 30, mid: 1 / 4, slow: 1 } } },
  },
  {
    id: 'water', name: 'Silky water', blurb: 'A waterfall, turned to smoke. Tripod, and a filter.',
    focal: 24, aperture: 11, shutter: 1, tripod: true, nd: true,
    lights: ['overcast', 'heavy-cloud', 'late-day', 'blue-hour'],
    why: {
      aperture: 'Stopped down: it holds the whole stream sharp and burns off some light.',
      shutter: 'A full second. This is the whole trick.',
      focal: 'Wide, close in, with a rock in the foreground.',
    },
    axes: { sh: { ideal: 'slow', steps: { fast: 1 / 500, mid: 1 / 15, slow: 1 } } },
  },
  {
    id: 'panning', name: 'Panning', blurb: 'Following something past you, so it stays sharp and the world does not.',
    focal: 50, aperture: 16, shutter: 1 / 30, 
    lights: ['overcast', 'heavy-cloud', 'late-day', 'blue-hour'],
    why: {
      shutter: 'Slow, on purpose. You turn with the subject and the background smears.',
      aperture: 'Right down, and not for depth: a thirtieth of a second in daylight\n        is far more light than the lowest ISO can take.',
      focal: 'Enough reach to stand safely off the road.',
    },
    axes: { sh: { ideal: 'slow', steps: { fast: 1 / 500, mid: 1 / 125, slow: 1 / 30 } } },
  },
];

export const lessonFor = (id) => LESSONS.find((s) => s.id === id);
