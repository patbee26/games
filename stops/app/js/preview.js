// The preview is a diagram that behaves like a photograph: background blur,
// motion smear and grain are driven by the same numbers the app is suggesting.
//
// The first two come from real optics rather than a pleasing curve, which is
// the whole point — a preview that shows lush bokeh from a 24 mm lens at f/8
// would be teaching a lie. Grain is the one cosmetic mapping here, and it is
// only ever illustrative.

import { backgroundBlurMm, motionBlurMm, asFrameFraction } from './optics.js';

// x%, y%, diameter, tone. The background needs texture or there is nothing for
// the aperture to visibly blur; light specks read as highlights, dark ones as
// foliage and crowd.
const BOKEH = [
  [7, 20, 26, 'light'], [20, 10, 17, 'dark'], [33, 27, 32, 'light'], [47, 12, 20, 'dark'],
  [61, 24, 28, 'light'], [74, 9, 22, 'dark'], [88, 28, 30, 'light'], [15, 43, 15, 'dark'],
  [40, 45, 13, 'light'], [56, 41, 18, 'dark'], [81, 46, 14, 'light'], [96, 15, 19, 'dark'],
];

const SUBJECTS = {
  figure: `<circle cx="82" cy="26" r="7"/><path d="M74 40L60 74"/><path d="M70 50L46 46L38 60"/>
    <path d="M70 52L94 60L98 44"/><path d="M60 74L82 88L78 114"/><path d="M60 74L38 88L48 112"/>`,
  bust: `<circle cx="70" cy="40" r="20"/><path d="M34 116c2-22 17-33 36-33s34 11 36 33"/>`,
  land: `<path d="M6 104L44 58L70 86L92 60L134 104Z"/><path d="M6 104h128"/>`,
};

const LAND_SCENES = new Set([
  'landscape', 'architecture', 'nightcity', 'stars', 'water', 'fireworks', 'moon',
]);
const FIGURE_SCENES = new Set(['sports', 'kids', 'wildlife', 'panning']);

function subjectFor(scene) {
  if (LAND_SCENES.has(scene.id)) return 'land';
  if (FIGURE_SCENES.has(scene.id)) return 'figure';
  return 'bust';
}

function silhouette(shape, fill) {
  return `<svg width="104" height="104" viewBox="0 0 140 140" fill="none" stroke="${fill}"
    stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g fill="${shape === 'land' ? 'none' : fill}">${SUBJECTS[shape]}</g></svg>`;
}

const GRAIN = `<svg class="preview__grain" aria-hidden="true">
  <filter id="stops-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/></filter>
  <rect width="100%" height="100%" filter="url(#stops-grain)"/></svg>`;

/** Grain is illustrative: a plausible curve, not a measurement. */
function grainFor(iso) {
  return Math.min(0.42, Math.max(0, Math.log2(iso / 100) * 0.062));
}

/**
 * @returns {string} HTML for the preview panel, plus the numbers it drew from,
 *   so the caller can caption it honestly.
 */
export function previewHtml({ result, scene, gear, width = 340 }) {
  const crop = gear.crop ?? 1;
  const shape = subjectFor(scene);

  const blurMm = backgroundBlurMm({
    focal: result.focal,
    aperture: result.aperture.N,
    subject: scene.subject,
    background: scene.background,
  });
  const blurPx = Math.min(34, (asFrameFraction(blurMm, crop) * width) / 2);

  const smearMm = motionBlurMm({
    focal: result.focal,
    shutter: result.shutter.s,
    speed: scene.speed,
    subject: scene.subject,
  });
  const smearPx = Math.min(70, asFrameFraction(smearMm, crop) * width);

  // Under- and over-exposure are the honest consequence of a shortfall: the
  // frame the photographer would actually get if they shot it anyway.
  const stopsOff = (result.overStops ?? 0) - (result.shortfallStops ?? 0);
  // Compressed, and floored well above black: the panel has to still read as a
  // dark photograph of something rather than as an empty rectangle.
  const bright = Math.min(2.4, Math.max(0.4, Math.pow(2, stopsOff * 0.3)));

  // A smear too small for a ghost of its own still gets one faint copy, so the
  // difference between "frozen" and "very nearly frozen" is visible rather than
  // rounded to nothing.
  const ghostCount = smearPx < 1 ? 0 : Math.min(4, Math.max(1, Math.round(smearPx / 7)));
  const ghosts = [];
  for (let i = 1; i <= ghostCount; i++) {
    const dx = -(smearPx * i) / ghostCount;
    ghosts.push(
      `<div class="preview__ghost" style="transform: translate(calc(-50% + ${dx.toFixed(1)}px), -50%);
        opacity: ${(0.34 / i).toFixed(3)}">${silhouette(shape, '#121315')}</div>`,
    );
  }

  // Distant scenes have no near highlights to throw out of focus, so their
  // texture is faint — otherwise a landscape at f/11 sprouts bokeh balls.
  const texture = LAND_SCENES.has(scene.id) ? 0.34 : 1;
  const bokeh = BOKEH.map(([x, y, size, tone]) => {
    const fill = tone === 'light'
      ? `rgba(255,244,222,${((0.30 + (size % 7) / 34) * texture).toFixed(2)})`
      : `rgba(22,26,20,${((0.34 + (size % 5) / 22) * texture).toFixed(2)})`;
    return `<div class="bokeh" style="left:${x}%; top:${y}%; width:${size}px; height:${size}px;
      background:${fill}"></div>`;
  }).join('');

  const cool = LAND_SCENES.has(scene.id) ? ' preview__bg--cool' : '';

  return `<div class="preview" style="--bg-blur:${blurPx.toFixed(1)}px; --grain:${grainFor(result.iso.v).toFixed(3)}; --bright:${bright.toFixed(3)}">
      <div class="preview__scene">
        <div class="preview__bg${cool}">${bokeh}
          <div style="position:absolute; left:0; right:0; top:74%; height:3px; background:rgba(150,170,130,.22)"></div>
        </div>
        ${ghosts.join('')}
        <div class="preview__subject">${silhouette(shape, '#14150F')}</div>
      </div>
      ${GRAIN}
    </div>`;
}

export function previewCaption(scene, result) {
  const distance = scene.background === Infinity
    ? 'background at infinity'
    : `subject ${formatDistance(scene.subject)}`;
  return { left: 'Diagram, not a photograph', right: `${Math.round(result.focal)} mm · ${distance}` };
}

function formatDistance(m) {
  if (m >= 1000) return `${Math.round(m / 1000)} km`;
  if (m < 1) return `${Math.round(m * 100)} cm`;
  return `${m} m`;
}
