// Photographs supplied for the guide, one per scene, as examples of the shot
// each entry is describing. Only some scenes have one; the rest fall back to
// the drawing, and a photographer's own picture beats both.
//
// Each caption names what is worth noticing in the frame — the composition
// choice, not the exposure, because the exposure is not ours to claim.

export const PHOTOS = {
  stars: 'A foreground to give the sky some scale, and the horizon kept in the frame.',
  nightcity: 'The blue hour, with the lights already on and the wet road doing half the work.',
  macro: 'One plane sharp — the near wing and the flower head — and everything behind it gone.',
  kids: 'Taken at his height rather than from above, mid-moment rather than posed.',
  food: 'Lit from the window at the side, one thing sharp, the rest falling away.',
};

export const photoFor = (sceneId) => (PHOTOS[sceneId] ? `photos/${sceneId}.jpg` : null);
export const photoNote = (sceneId) => PHOTOS[sceneId] ?? null;
