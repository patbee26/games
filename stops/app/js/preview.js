// The preview is a diagram that behaves like a photograph: background blur,
// motion smear and grain are driven by the same numbers the app is suggesting.
//
// The first two come from real optics rather than a pleasing curve, which is
// the whole point. A preview that shows lush bokeh from a 24 mm lens at f/8
// would be teaching a lie. Grain is the one cosmetic mapping here, and it is
// only ever illustrative.

import { backgroundBlurMm, motionBlurMm, asFrameFraction, backgroundMagnification } from './optics.js';

/**
 * The background is a field of features on a plane behind the subject, held in
 * world units rather than screen ones, so focal length can project it properly.
 *
 * It spans well past the frame because a wide lens shows more of it: at the long
 * end only the middle of this field is on screen, magnified, and at the wide end
 * most of it is, small. That difference is the whole point: it is the one thing
 * a longer lens really changes about a picture, and a fixed set of circles in
 * screen percentages cannot show it.
 *
 * Positions are u,v in half-frame widths at magnification 1; size is a diameter
 * in the same units. Generated deterministically so the field is stable between
 * renders and does not shimmer as the settings change.
 */
const FIELD = (() => {
  let seed = 0x2f6e2b1;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out = [];
  for (let i = 0; i < 90; i++) {
    out.push({
      u: (rnd() * 2 - 1) * 3.2,
      v: (rnd() * 2 - 1) * 2.4,
      size: 0.055 + rnd() * 0.12,
      tone: rnd() > 0.5 ? 'light' : 'dark',
      k: rnd(),
    });
  }
  return out;
})();

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

  // How much bigger the background renders than it does at the scene's own focal
  // length, with the framing on the subject held. Clamped only so an extreme
  // combination cannot empty the frame or turn one feature into a wall.
  const mag = Math.min(3, Math.max(0.3, backgroundMagnification({
    focal: result.focal,
    baseFocal: scene.focal,
    subject: scene.subject,
    background: scene.background,
  })));

  // Distant scenes have no near highlights to throw out of focus, so their
  // texture is faint, since otherwise a landscape at f/11 sprouts bokeh balls.
  const texture = LAND_SCENES.has(scene.id) ? 0.34 : 1;
  const bokeh = FIELD.map((f) => {
    // Project the plane: position and size both scale with magnification.
    const x = 50 + f.u * mag * 50;
    const y = 50 + f.v * mag * 50;
    const size = f.size * mag * width;
    if (x < -25 || x > 125 || y < -35 || y > 135 || size < 1.2) return '';
    const fill = f.tone === 'light'
      ? `rgba(255,244,222,${((0.30 + f.k * 0.2) * texture).toFixed(2)})`
      : `rgba(22,26,20,${((0.34 + f.k * 0.18) * texture).toFixed(2)})`;
    return `<div class="bokeh" style="left:${x.toFixed(1)}%; top:${y.toFixed(1)}%;
      width:${size.toFixed(1)}px; height:${size.toFixed(1)}px; margin-left:${(-size / 2).toFixed(1)}px;
      margin-top:${(-size / 2).toFixed(1)}px; background:${fill}"></div>`;
  }).join('');

  // The horizon sits at a fixed angle from the axis, so a longer lens pushes it
  // further from the centre of the frame for the same reason the features grow.
  const horizon = Math.min(140, Math.max(-40, 50 + 24 * mag));
  const cool = LAND_SCENES.has(scene.id) ? ' preview__bg--cool' : '';

  return `<div class="preview" style="--bg-blur:${blurPx.toFixed(1)}px; --grain:${grainFor(result.iso.v).toFixed(3)}; --bright:${bright.toFixed(3)}">
      <div class="preview__scene">
        <div class="preview__bg${cool}">${bokeh}
          <div style="position:absolute; left:0; right:0; top:${horizon.toFixed(1)}%; height:3px; background:rgba(150,170,130,.22)"></div>
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
