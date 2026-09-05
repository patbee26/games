// Scenes and light. This file is the field guide's actual content: everything
// else is arithmetic around it.

// Light conditions, as EV at ISO 100. These are the standard exposure values —
// the same table that has been on the back of film boxes for seventy years.
export const LIGHT = [
  { id: 'snow',        name: 'Snow or sand in sun',  sub: 'Painfully bright, you are squinting', ev: 16, common: false },
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
    tip: 'Meter off the grass, not the sky. White cloud will talk your camera down a stop.',
  },
  {
    id: 'kids', name: 'Kids & pets', hint: 'shutter leads', icon: 'kids',
    shutter: 1 / 500, aperture: 'widest', give: ['aperture', 'iso'],
    focal: 50, subject: 3, background: 8, speed: 3,
    shutterWhy: 'Fast enough for a sudden bolt',
    tip: 'Get down to their eye level. It matters more than any of these numbers.',
  },
  {
    id: 'wildlife', name: 'Wildlife & birds', hint: 'shutter leads', icon: 'wildlife',
    shutter: 1 / 2000, aperture: 'widest', give: ['aperture', 'iso'],
    focal: 300, subject: 20, background: 60, speed: 12,
    shutterWhy: 'Wings need this much',
    tip: 'Focus on the eye. A sharp eye forgives a lot elsewhere.',
  },
  {
    id: 'portrait', name: 'Portrait', hint: 'aperture leads', icon: 'portrait',
    shutter: 1 / 160, aperture: 2, give: ['iso', 'shutter'], giveBright: ['shutter'],
    focal: 85, subject: 2, background: 6, speed: 0.3,
    apertureWhy: 'One face sharp, the rest melts',
    tip: 'Focus on the near eye. At this aperture the far one may already be soft.',
  },
  {
    id: 'group', name: 'Group photo', hint: 'depth first', icon: 'group',
    shutter: 1 / 160, aperture: 5.6, give: ['iso', 'shutter'],
    focal: 35, subject: 4, background: 10, speed: 0.3,
    apertureWhy: 'Two rows of people stay sharp',
    tip: 'Put the back row a step closer than feels natural. Depth of field is thinner than you think.',
  },
  {
    id: 'landscape', name: 'Landscape', hint: 'aperture leads', icon: 'landscape',
    aperture: 8, tripod: true, give: ['shutter'], giveBright: ['shutter'],
    focal: 24, subject: 8, background: Infinity, speed: 0,
    apertureWhy: 'Front to back, without diffraction',
    tip: 'Focus a third of the way into the scene, not on the horizon.',
  },
  {
    id: 'architecture', name: 'Architecture', hint: 'aperture leads', icon: 'architecture',
    aperture: 8, tripod: true, give: ['shutter'], giveBright: ['shutter'],
    focal: 24, subject: 15, background: Infinity, speed: 0,
    apertureWhy: 'Sharp corner to corner',
    tip: 'Keep the sensor parallel to the facade or the verticals will lean.',
  },
  {
    id: 'street', name: 'Street', hint: 'f/8 and be there', icon: 'street',
    shutter: 1 / 250, aperture: 8, give: ['iso', 'shutter'],
    focal: 35, subject: 5, background: 20, speed: 1.4,
    apertureWhy: 'Deep enough to shoot without focusing',
    tip: 'Pre-focus at three metres. At f/8 almost everything from two to six is sharp.',
  },
  {
    id: 'indoor', indoors: true, name: 'Indoors, no flash', hint: 'ISO leads', icon: 'indoor',
    aperture: 'widest', give: ['aperture', 'iso'],
    focal: 35, subject: 3, background: 6, speed: 0.5,
    tip: 'Turn the subject towards the window. One good light beats three bad ones.',
  },
  {
    id: 'concert', indoors: true, name: 'Concert & stage', hint: 'ISO leads', icon: 'concert',
    shutter: 1 / 250, aperture: 'widest', give: ['aperture', 'iso'],
    focal: 85, subject: 10, background: 20, speed: 1.5,
    shutterWhy: 'A singer moves more than you expect',
    tip: 'Meter for the face under the spotlight and let the background go black.',
  },
  {
    id: 'food', indoors: true, name: 'Food & tabletop', hint: 'aperture leads', icon: 'food',
    shutter: 1 / 125, aperture: 4, give: ['iso', 'shutter'],
    focal: 50, subject: 0.6, background: 1.5, speed: 0,
    apertureWhy: 'The near edge sharp, the back soft',
    tip: 'Shoot towards the window, never with it behind you.',
  },
  {
    id: 'macro', name: 'Close-up & macro', hint: 'depth is scarce', icon: 'macro',
    shutter: 1 / 200, aperture: 11, give: ['iso'],
    focal: 100, subject: 0.3, background: 1, speed: 0,
    apertureWhy: 'At this distance depth of field is millimetres',
    tip: 'Rock forward and back to focus rather than turning the ring.',
  },
  {
    id: 'nightcity', name: 'Night & city', hint: 'tripod', icon: 'night',
    aperture: 8, tripod: true, give: ['shutter'], giveBright: ['shutter'],
    focal: 24, subject: 20, background: Infinity, speed: 0,
    apertureWhy: 'Turns every streetlight into a star',
    tip: 'Use the self-timer. Pressing the shutter is enough to shake a tripod.',
  },
  {
    id: 'stars', name: 'Stars', hint: '500 rule', icon: 'stars',
    shutterRule: '500', aperture: 'widest', tripod: true, lockShutter: true, give: ['iso'],
    focal: 20, subject: 1000, background: Infinity, speed: 0,
    shutterWhy: 'Longer than this and the stars streak',
    tip: 'Focus manually on the brightest star using live view at full magnification.',
  },
  {
    id: 'water', name: 'Silky water', hint: 'long exposure', icon: 'water',
    shutter: 1, aperture: 11, tripod: true, lockShutter: true, give: ['iso'], giveBright: [], nd: true,
    focal: 24, subject: 6, background: 30, speed: 0,
    shutterWhy: 'Long enough to smooth the surface',
    tip: 'A polariser doubles as a two-stop ND and kills the glare at the same time.',
  },
  {
    id: 'panning', name: 'Panning', hint: 'blur the background', icon: 'panning',
    shutter: 1 / 60, aperture: 'widest', lockShutter: true, give: ['aperture', 'iso'], giveBright: ['aperture'],
    focal: 50, subject: 8, background: 25, speed: 12,
    shutterWhy: 'Slow enough for the background to streak',
    tip: 'Follow through after the shutter fires, the way you would with a golf swing.',
  },
  {
    id: 'fireworks', name: 'Fireworks', hint: 'tripod', icon: 'fireworks',
    shutter: 2, aperture: 11, tripod: true, lockShutter: true, give: ['iso'], giveBright: [], nd: false,
    focal: 35, subject: 200, background: Infinity, speed: 0,
    shutterWhy: 'One full burst, start to finish',
    tip: 'Frame wider than feels right and focus manually at infinity before it starts.',
  },
  {
    id: 'moon', name: 'The moon', hint: 'brighter than you think', icon: 'moon',
    evOverride: 15, shutter: 1 / 250, aperture: 8, give: ['iso'], giveBright: ['shutter'],
    focal: 300, subject: 384000000, background: Infinity, speed: 0,
    apertureWhy: 'The moon is a sunlit rock — treat it as daylight',
    tip: 'The night around it is irrelevant. Meter the moon itself or everything blows out.',
  },
];

export const sceneById = (id) => SCENES.find((s) => s.id === id);
export const lightById = (id) => LIGHT.find((l) => l.id === id);
