// Scenes and light. This file is the field guide's actual content: everything
// else is arithmetic around it.

// Light conditions, as EV at ISO 100. These are the standard exposure values,
// the same table that has been on the back of film boxes for seventy years.
export const LIGHT = [
  { id: 'snow',        name: 'Snow or sand in sun',  sub: 'Painfully bright, you are squinting', ev: 16, common: false, suggestComp: 'white' },
  { id: 'harsh-sun',   name: 'Harsh sun',            sub: 'Hard-edged shadows',                  ev: 15, common: true },
  { id: 'hazy-sun',    name: 'Hazy sun',             sub: 'Shadows with soft edges',             ev: 14, common: true },
  { id: 'overcast',    name: 'Bright overcast',      sub: 'Bright white sky, no shadows',        ev: 13, common: true },
  { id: 'heavy-cloud', name: 'Heavy cloud, open shade', sub: 'Grey and flat, or under a tree',   ev: 12, common: true },
  { id: 'late-day',    name: 'Late day',             sub: 'An hour before sunset',               ev: 11, common: true },
  { id: 'sunset',      name: 'Sunset',               sub: 'Sun on the horizon',                  ev: 10, common: false },
  { id: 'blue-hour',   name: 'Blue hour',            sub: 'Colour in the sky, sun gone',         ev: 9,  common: true },
  { id: 'night-street',name: 'Lit street at night',  sub: 'Shop windows, neon, headlights',      ev: 8,  common: false },
  { id: 'bright-in',   name: 'Bright indoors',       sub: 'Big windows, or a lit gym',           ev: 7,  common: true },
  { id: 'room-night',  name: 'Ordinary room at night', sub: 'Ceiling light on',                  ev: 6,  common: false },
  { id: 'dim-in',      name: 'Dim indoors',          sub: 'Lamps only, restaurant, bar',         ev: 5,  common: true },
  { id: 'candle',      name: 'Candlelight',          sub: 'One flame, close',                    ev: 4,  common: false },
  { id: 'moonlit',     name: 'Moonlit landscape',    sub: 'Full moon, no other light',           ev: -3, common: false },
  { id: 'dark-sky',    name: 'Dark sky, no moon',    sub: 'The Milky Way is visible',            ev: -6, common: false },
];

// A scene is an anchor plus an ordering of what gives way. `give` is consulted
// when the frame is too dark, `giveBright` when it is too bright.
export const SCENES = [
  {
    id: 'sports', name: 'Sports & action', hint: 'shutter leads', icon: 'action',
    shutter: 1 / 1000, aperture: 'widest', give: ['aperture', 'iso'],
    focal: 135, subject: 12, background: 40, speed: 8,
    shutterWhy: 'Stops a running player dead',
    alt: { name: 'Cleaner file', why: 'Half the ISO. Feet and hands smear a little; faces stay sharp.', shutter: 1 / 500 },
    tip: 'Meter off the grass, not the sky. White cloud will talk your camera down a stop.',
  },
  {
    id: 'kids', name: 'Kids & pets', hint: 'shutter leads', icon: 'kids',
    shutter: 1 / 500, aperture: 'widest', give: ['aperture', 'iso'],
    focal: 50, subject: 3, background: 8, speed: 3,
    shutterWhy: 'Fast enough for a sudden bolt',
    alt: { name: 'Cleaner file', why: 'Half the ISO, and fine until they suddenly bolt.', shutter: 1 / 250 },
    tip: 'Get down to their eye level. It matters more than any of these numbers.',
  },
  {
    id: 'wildlife', name: 'Wildlife & birds', hint: 'shutter leads', icon: 'wildlife',
    shutter: 1 / 2000, aperture: 'widest', give: ['aperture', 'iso'],
    focal: 300, subject: 20, background: 60, speed: 12,
    shutterWhy: 'Wings need this much',
    alt: { name: 'Cleaner file', why: 'Bodies stay sharp, wingtips go soft. One stop less noise.', shutter: 1 / 1000 },
    tip: 'Focus on the eye. A sharp eye forgives a lot elsewhere.',
  },
  {
    id: 'portrait', name: 'Portrait', hint: 'aperture leads', icon: 'portrait',
    shutter: 1 / 160, aperture: 2, give: ['iso', 'shutter'], giveBright: ['shutter', 'aperture'],
    focal: 85, subject: 2, background: 6, speed: 0.3,
    apertureWhy: 'One face sharp, the rest melts',
    alt: { name: 'Safer focus', why: 'Two stops more depth, so the near eye is far easier to hit.', aperture: 4 },
    tip: 'Focus on the near eye. At this aperture the far one may already be soft.',
  },
  {
    id: 'group', name: 'Group photo', hint: 'depth first', icon: 'group',
    shutter: 1 / 160, aperture: 5.6, give: ['iso', 'shutter'],
    focal: 35, subject: 4, background: 10, speed: 0.3,
    apertureWhy: 'Two rows of people stay sharp',
    alt: { name: 'More light', why: 'A stop back from f/5.6. Watch the back row start to soften.', aperture: 4 },
    tip: 'Put the back row a step closer than feels natural. Depth of field is thinner than you think.',
  },
  {
    id: 'landscape', name: 'Landscape', hint: 'aperture leads', icon: 'landscape',
    aperture: 8, tripod: true, give: ['shutter', 'iso'], giveBright: ['shutter', 'aperture'],
    focal: 24, subject: 8, background: Infinity, speed: 0,
    apertureWhy: 'Front to back, without diffraction',
    alt: { name: 'Hand-held', why: 'No tripod, so the shutter is capped and ISO carries it.', tripod: false },
    tip: 'Focus a third of the way into the scene, not on the horizon.',
  },
  {
    id: 'architecture', name: 'Architecture', hint: 'aperture leads', icon: 'architecture',
    aperture: 8, tripod: true, give: ['shutter', 'iso'], giveBright: ['shutter', 'aperture'],
    focal: 24, subject: 15, background: Infinity, speed: 0,
    apertureWhy: 'Sharp corner to corner',
    alt: { name: 'Hand-held', why: 'No tripod, so the shutter is capped and ISO carries it.', tripod: false },
    tip: 'Keep the sensor parallel to the facade or the verticals will lean.',
  },
  {
    id: 'street', name: 'Street', hint: 'f/8 and be there', icon: 'street',
    shutter: 1 / 250, aperture: 8, give: ['iso', 'shutter'],
    focal: 35, subject: 5, background: 20, speed: 1.4,
    apertureWhy: 'Deep enough to shoot without focusing',
    alt: { name: 'Available light', why: 'Open up rather than push ISO. Less depth to hide a focus miss.', aperture: 'widest' },
    tip: 'Pre-focus at three metres. At f/8 almost everything from two to six is sharp.',
  },
  {
    id: 'indoor', indoors: true, name: 'Indoors, no flash', hint: 'ISO leads', icon: 'indoor',
    aperture: 'widest', give: ['aperture', 'iso'],
    focal: 35, subject: 3, background: 6, speed: 0.5,
    alt: { name: 'Steadier', why: 'Two stops faster than your floor, for insurance against shake.', shutter: 1 / 125 },
    tip: 'Turn the subject towards the window. One good light beats three bad ones.',
  },
  {
    id: 'concert', indoors: true, name: 'Concert & stage', hint: 'ISO leads', icon: 'concert',
    suggestComp: 'spotlit',
    shutter: 1 / 250, aperture: 'widest', give: ['aperture', 'iso'],
    focal: 85, subject: 10, background: 20, speed: 1.5,
    shutterWhy: 'A singer moves more than you expect',
    alt: { name: 'Freeze it', why: 'Sharper on a singer who will not stand still. One more stop of ISO.', shutter: 1 / 500 },
    tip: 'Meter for the face under the spotlight and let the background go black.',
  },
  {
    id: 'food', indoors: true, name: 'Food & tabletop', hint: 'aperture leads', icon: 'food',
    shutter: 1 / 125, aperture: 4, give: ['iso', 'shutter'],
    focal: 50, subject: 0.6, background: 1.5, speed: 0,
    apertureWhy: 'The near edge sharp, the back soft',
    alt: { name: 'The whole plate', why: 'Front to back sharp. Two stops of ISO to pay for it.', aperture: 8 },
    tip: 'Shoot towards the window, never with it behind you.',
  },
  {
    id: 'macro', name: 'Close-up & macro', hint: 'depth is scarce', icon: 'macro',
    shutter: 1 / 200, aperture: 11, give: ['iso'],
    focal: 100, subject: 0.3, background: 1, speed: 0,
    apertureWhy: 'At this distance depth of field is millimetres',
    alt: { name: 'Less noise', why: 'Two stops cleaner, and depth of field shrinks to almost nothing.', aperture: 5.6 },
    tip: 'Rock forward and back to focus rather than turning the ring.',
  },
  {
    id: 'nightcity', name: 'Night & city', hint: 'tripod', icon: 'night',
    aperture: 8, tripod: true, give: ['shutter', 'iso'], giveBright: ['shutter', 'aperture'],
    focal: 24, subject: 20, background: Infinity, speed: 0,
    // The skyline is still; the traffic is not. Headlights are separate cars by
    // 1/30 and a continuous ribbon by a second.
    shutterSteps: [1 / 30, 1],
    apertureWhy: 'Turns every streetlight into a star',
    alt: { name: 'Hand-held', why: 'No tripod, so the shutter is capped and ISO carries it.', tripod: false },
    tip: 'Use the self-timer. Pressing the shutter is enough to shake a tripod.',
  },
  {
    id: 'stars', name: 'Stars', hint: '500 rule', icon: 'stars',
    shutterRule: '500', aperture: 'widest', tripod: true, lockShutter: true, give: ['iso'],
    focal: 20, subject: 1000, background: Infinity, speed: 0,
    shutterWhy: 'Longer than this and the stars streak',
    alt: { name: 'Shorter, stack later', why: 'Half the trailing. Shoot several and stack them afterwards.', shutterRule: '250' },
    tip: 'Focus manually on the brightest star using live view at full magnification.',
  },
  {
    id: 'water', name: 'Silky water', hint: 'long exposure', icon: 'water',
    shutter: 1, aperture: 11, tripod: true, lockShutter: true, give: ['iso'], giveBright: [], nd: true,
    focal: 24, subject: 6, background: 30, speed: 0,
    // The rock the shutter is measured against is not moving; the water is. So
    // the boundaries between the three shutter photographs are given directly:
    // droplets are frozen by 1/60, and the fall is fully silk by 1/4.
    shutterSteps: [1 / 60, 1 / 4],
    shutterWhy: 'Long enough to smooth the surface',
    alt: { name: 'Keep some texture', why: 'Movement in the water rather than silk, and far less ND needed.', shutter: 1 / 4 },
    tip: 'A polariser doubles as a two-stop ND and kills the glare at the same time.',
  },
  {
    id: 'panning', name: 'Panning', hint: 'blur the background', icon: 'panning',
    shutter: 1 / 60, aperture: 'widest', lockShutter: true, give: ['aperture', 'iso'], giveBright: ['aperture'],
    focal: 50, subject: 8, background: 25, speed: 12,
    shutterWhy: 'Slow enough for the background to streak',
    alt: { name: 'Safer', why: 'Easier to keep the subject sharp, with less streak behind it.', shutter: 1 / 125 },
    tip: 'Follow through after the shutter fires, the way you would with a golf swing.',
  },
  {
    id: 'fireworks', name: 'Fireworks', hint: 'tripod', icon: 'fireworks',
    shutter: 2, aperture: 11, tripod: true, lockShutter: true, give: ['iso'], giveBright: [], nd: false,
    focal: 35, subject: 200, background: Infinity, speed: 0,
    shutterWhy: 'One full burst, start to finish',
    alt: { name: 'One burst', why: 'A single shell rather than several overlapping.', shutter: 1 },
    tip: 'Frame wider than feels right and focus manually at infinity before it starts.',
  },
  {
    id: 'moon', name: 'The moon', hint: 'brighter than you think', icon: 'moon',
    evOverride: 15, shutter: 1 / 250, aperture: 8, give: ['iso'], giveBright: ['shutter', 'aperture'],
    focal: 300, subject: 384000000, background: Infinity, speed: 0,
    apertureWhy: 'The moon is a sunlit rock, so treat it as daylight',
    alt: { name: 'Insurance', why: 'A stop faster against shake on a long lens, paid for in ISO.', shutter: 1 / 500 },
    tip: 'The night around it is irrelevant. Meter the moon itself or everything blows out.',
  },
];

export const sceneById = (id) => SCENES.find((s) => s.id === id);
export const lightById = (id) => LIGHT.find((l) => l.id === id);

/**
 * Exposure compensation, offered as what is in the frame rather than as a
 * number, because "+1⅔" is the answer and "the snow is the whole picture" is
 * the question a photographer can actually answer while standing in it.
 *
 * Stops are positive for a brighter picture. The values are the conventional
 * ones; they are starting points, and the histogram outranks them.
 */
export const COMPENSATIONS = [
  { id: 'none', name: 'Nothing unusual', stops: 0,
    why: 'The frame averages out to about middle grey, which is what the meter assumes.' },
  { id: 'white', name: 'Mostly white', stops: 5 / 3,
    sub: 'Snow, sand, a white wall',
    why: 'Expose to the average and the white renders grey. This puts it back to white with texture in it.' },
  { id: 'backlit', name: 'Backlit subject', stops: 4 / 3,
    sub: 'The light is behind them',
    why: 'The bright background pulls the average up and leaves the face under. This exposes for the face and lets the background go.' },
  { id: 'dark', name: 'Mostly dark', stops: -4 / 3,
    sub: 'A black dog, a dark room',
    why: 'Expose to the average and the blacks come out grey and noisy. This keeps them black.' },
  { id: 'spotlit', name: 'Spotlit in the dark', stops: -4 / 3,
    sub: 'A stage, a single lamp',
    why: 'The dark around them drags the average down and blows the lit face. This exposes for the light that is actually on them.' },
  { id: 'silhouette', name: 'Silhouette, on purpose', stops: -2,
    sub: 'Shape against a bright sky',
    why: 'The one case where losing the subject is the point: expose for the sky and let them go black.' },
];

export const compById = (id) => COMPENSATIONS.find((c) => c.id === id) ?? COMPENSATIONS[0];

/**
 * Content for the guide's Shutter tab. Speeds are metres per second and
 * distances are metres at a 50 mm framing; the guide scales the distance with
 * focal length so the comparison holds the framing rather than the standpoint.
 */
export const MOVERS = [
  { name: 'Someone posing', speed: 0.3, at50: 2 },
  { name: 'Someone walking', speed: 1.4, at50: 5 },
  { name: 'A child or a dog', speed: 3, at50: 3 },
  { name: 'A runner', speed: 6, at50: 8 },
  { name: 'A cyclist going past', speed: 8, at50: 10 },
  { name: 'A bird in flight', speed: 12, at50: 20 },
];

/**
 * Content for the guide's Aperture tab. `gap` is the physical distance between
 * the near and far thing that both have to be sharp. It does not scale with
 * the lens, because two people standing side by side are the same distance
 * apart whatever you photograph them with.
 */
export const DEPTHS = [
  { name: 'Both eyes on one face', at50: 1.5, gap: 0.08 },
  { name: 'Two people side by side', at50: 2.5, gap: 0.4 },
  { name: 'Two rows of people', at50: 4, gap: 1 },
  { name: 'A table of six', at50: 2.5, gap: 1.6 },
];
