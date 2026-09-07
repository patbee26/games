// Photographs supplied for the guide, one per scene, as examples of the shot
// each entry is describing. Only some scenes have one; the rest fall back to
// the drawing, and a photographer's own picture beats both.
//
// Each caption names what is worth noticing in the frame — the composition
// choice, not the exposure, because the exposure is not ours to claim.

export const PHOTOS = {
  kids: 'Taken at his height rather than from above, mid-moment rather than posed.',
  group: 'Two staggered rows, everyone about the same distance from the camera, all of it sharp.',
  architecture: 'The camera kept parallel to the building, so the verticals stay vertical.',
  street: 'A background found first — wet road, good light — and then waited at until someone walked into it.',
  indoor: 'Warm lamps against a cool window: the mix a white balance has to choose between.',
  concert: 'Metered for the face under the light, with the room left to go dark behind it.',
  food: 'Lit from the window at the side, one thing sharp, the rest falling away.',
  macro: 'One plane sharp — the near wing and the flower head — and everything behind it gone.',
  nightcity: 'The blue hour, with the lights already on and the wet road doing half the work.',
  stars: 'A foreground to give the sky some scale, and the horizon kept in the frame.',
};

export const photoFor = (sceneId) => (PHOTOS[sceneId] ? `photos/${sceneId}.jpg` : null);
export const photoNote = (sceneId) => PHOTOS[sceneId] ?? null;
