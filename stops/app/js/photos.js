// Scene imagery, in two sizes that do two different jobs.
//
// PHOTOS are the full examples: one per scene, shown in the guide and behind
// "The shot" on the settings screen. Each caption names what is worth noticing
// in the frame — the composition choice, not the exposure, because the exposure
// is not ours to claim.
//
// THUMBS are the tile crops for the scene list and the guide's rows. They are
// framed for the tile rather than scaled down from the example: the subject is
// kept clear of the bottom third, where the app draws its own label, and the
// caption band that came with the source sheet is cropped away so the tile
// carries no burnt-in text.
//
// Where a scene has neither, the drawing is the fallback, and a photographer's
// own picture beats all three.

export const PHOTOS = {
  sports: 'Caught at the moment of contact, the face still in it, the crowd behind reduced to colour.',
  kids: 'Down at the dog\'s own eye level, and fast enough to stop it mid-stride.',
  wildlife: 'Room left in front of the bird, in the direction it is flying.',
  portrait: 'Low sun behind her, rimming the hair, with the near eye sharp and the face left soft.',
  group: 'Two staggered rows, everyone about the same distance from the camera, all of it sharp.',
  architecture: 'The camera kept parallel to the building, so the verticals stay vertical.',
  street: 'A background found first — wet road, good light — and then waited at until someone walked into it.',
  indoor: 'Warm lamps against a cool window: the mix a white balance has to choose between.',
  concert: 'Metered for the face under the light, with the room left to go dark behind it.',
  food: 'Lit from the window at the side, one thing sharp, the rest falling away.',
  macro: 'One plane sharp — the near wing and the flower head — and everything behind it gone.',
  nightcity: 'The blue hour, with the lights already on and the wet road doing half the work.',
  stars: 'A foreground to give the sky some scale, and the horizon kept in the frame.',
  moon: 'Low, with the treeline in the frame, so the moon has something to be big against.',
  fireworks: 'Framed wide enough to hold several bursts and the skyline they sit above.',
  panning: 'The rider held sharp while the background pulls into streaks \u2014 the follow-through is what does it.',
  water: 'Smoothed but not fogged: the water still has a shape, which a longer exposure would have lost.',
  landscape: 'A foreground to walk the eye in, rather than scenery starting at the horizon.',
};

// Scenes with a tile crop. Kept as a set rather than folded into PHOTOS so a
// scene can have one without the other in either direction.
export const THUMBS = new Set([
  'sports', 'kids', 'wildlife', 'portrait', 'group', 'landscape', 'architecture',
  'street', 'indoor', 'concert', 'food', 'macro', 'nightcity', 'stars', 'water',
  'panning', 'fireworks', 'moon',
]);

export const photoFor = (sceneId) => (PHOTOS[sceneId] ? `photos/${sceneId}.jpg` : null);
export const photoNote = (sceneId) => PHOTOS[sceneId] ?? null;
export const thumbFor = (sceneId) => (THUMBS.has(sceneId) ? `thumbs/${sceneId}.jpg` : null);
