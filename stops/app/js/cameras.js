// Translating the three numbers into the controls actually on the camera.
//
// A beginner told "f/5.6, 1/500, ISO 400" still has to find three dials. This
// file is the bridge — and it is deliberately brand-level rather than
// model-level, because what follows is true of a marque's usual arrangement and
// a specific body can always differ. Every entry says so on screen rather than
// pretending to a precision it does not have.

export const BRANDS = [
  {
    id: 'canon',
    name: 'Canon',
    manual: 'Turn the mode dial to M.',
    dials: 'The dial just behind the shutter button sets shutter speed. The wheel on the back sets aperture.',
    iso: 'ISO usually has its own button — press it, then turn a dial.',
    aside: 'Canon calls shutter priority Tv and aperture priority Av, for when you want the camera to do half of this.',
  },
  {
    id: 'nikon',
    name: 'Nikon',
    manual: 'Turn the mode dial to M, or hold MODE and turn a dial on bodies without one.',
    dials: 'The rear command dial sets shutter speed. The front sub-command dial sets aperture.',
    iso: 'Hold the ISO button and turn the rear dial.',
    aside: 'Nikon calls the half-automatic modes S and A.',
  },
  {
    id: 'sony',
    name: 'Sony',
    manual: 'Turn the mode dial to M.',
    dials: 'One of the two front-and-rear dials sets shutter speed and the other aperture. Which is which is a setting, so check yours once and it will stay put.',
    iso: 'ISO is usually the right-hand press of the rear control wheel.',
    aside: 'Sony calls the half-automatic modes S and A.',
  },
  {
    id: 'fujifilm',
    name: 'Fujifilm',
    manual: 'There is no M on most Fujifilm bodies. Take the shutter speed dial off A and the aperture ring off A — that is manual.',
    dials: 'Shutter speed is the top dial, aperture is the ring on the lens. For speeds between the marked stops, use the command dial.',
    iso: 'ISO is its own dial on some bodies and a menu item on others.',
    aside: 'Leaving one dial on A and setting the other by hand gives you the half-automatic modes.',
  },
  {
    id: 'lumix',
    name: 'Panasonic Lumix',
    manual: 'Turn the mode dial to M.',
    dials: 'The front dial sets aperture and the rear sets shutter speed, by default.',
    iso: 'Press the ISO button, then turn a dial.',
    aside: 'The half-automatic modes are S and A.',
  },
  {
    id: 'om',
    name: 'OM System / Olympus',
    manual: 'Turn the mode dial to M.',
    dials: 'The front dial sets aperture and the rear sets shutter speed, by default.',
    iso: 'ISO is on the rear dial with the ISO button held, or in the Super Control Panel.',
    aside: 'The half-automatic modes are S and A.',
  },
  {
    id: 'pentax',
    name: 'Pentax',
    manual: 'Turn the mode dial to M.',
    dials: 'The front dial sets shutter speed and the rear sets aperture.',
    iso: 'Press the ISO button, then turn a dial.',
    aside: 'Pentax uses Canon-style Tv and Av names for the half-automatic modes.',
  },
  {
    id: 'other',
    name: 'Something else',
    manual: 'Find manual mode — it is marked M on almost every camera.',
    dials: 'One control sets shutter speed and another sets aperture. Change one and watch which number on screen moves.',
    iso: 'ISO is usually a button or a menu entry of its own.',
    aside: null,
  },
];

export const brandById = (id) => BRANDS.find((b) => b.id === id) ?? null;

/** True of the marque's usual arrangement; a given body can always differ. */
export const HEDGE = 'Usual for the marque — your own body may be laid out differently.';
