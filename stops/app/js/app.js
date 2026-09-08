import { SCENES, LIGHT, sceneById, lightById, COMPENSATIONS, compById, MOVERS, DEPTHS } from './data.js';
import { recommend, describeStops } from './exposure.js';
import { loadGear, saveGear, chooseLens, DEFAULT_GEAR } from './gear.js';
import { widestAt, handheldFloor, motionThreshold, apertureForDepth,
  hyperfocalAperture, backgroundBlurMm, asFrameFraction } from './optics.js';
import { previewHtml, previewCaption } from './preview.js';
import { icon } from './icons.js';
import { snapShutter, snapAperture, snapIso, FULL_STOPS, ISO_CEILINGS } from './ladders.js';
import { estimateLight, SKY } from './sun.js';

import { craftFor } from './craft.js';
import { scenery } from './scenery.js';
import { photoFor, photoNote, thumbFor } from './photos.js';
import { VARIANTS, variantFor } from './variants.js';
import { apertureStep, focalStep, shutterStep,
         STEP_NOTE, AXIS_NAME, AXIS_QUANTITY } from './variantpick.js';

const LAST_KEY = 'stops.last.v2';
const THEME_KEY = 'stops.theme.v1';
const SEEN_KEY = 'stops.seen.v1';
const SHOT_KEY = 'stops.shot.v1.';
const PLACE_KEY = 'stops.place.v1';

const state = {
  tab: 'shoot',
  step: 'scenes',
  sceneId: null,
  lightId: null,
  focal: null,
  lock: {},
  guideTab: 'scenes',
  guideScene: null,
  allLight: false,
  editingLens: null,
  customLight: null,
  theme: 'system',
  shotError: null,
  showIntro: false,
  previewMode: 'diagram',
  variantAxis: 'ap',
  comp: null,
  guideFocal: null,
  sun: { status: 'idle' },
  gear: loadGear(),
};

const app = document.getElementById('app');
const tabs = document.getElementById('tabs');
const sheet = document.getElementById('sheet');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------- theme */

const THEMES = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']];
const prefersLight = () => window.matchMedia('(prefers-color-scheme: light)').matches;

function resolvedTheme(choice) {
  if (choice === 'light') return 'light';
  if (choice === 'dark') return 'dark';
  return prefersLight() ? 'light' : 'dark';
}

function applyTheme() {
  const theme = resolvedTheme(state.theme);
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0C0D' : '#F2F0EC');
}

function setTheme(choice) {
  state.theme = choice;
  try { localStorage.setItem(THEME_KEY, choice); } catch { /* it will just not be remembered */ }
  applyTheme();
}

/* ------------------------------------------------------------------ solving */

function lensFor(scene) {
  const auto = chooseLens(state.gear, scene.focal);
  const mounted = state.gear.activeLensId
    ? state.gear.lenses.find((l) => l.id === state.gear.activeLensId)
    : null;
  const lens = mounted ?? auto.lens;
  const wanted = state.focal ?? (mounted ? scene.focal : auto.focal);
  return { lens, focal: Math.min(Math.max(wanted, lens.min), lens.max) };
}

/** The sun estimate is a light condition like any other, so nothing else cares. */
function currentLight() {
  return state.lightId === 'sun' ? state.customLight : lightById(state.lightId);
}

function savePlace(coords) {
  try {
    localStorage.setItem(PLACE_KEY, JSON.stringify({
      latitude: coords.latitude, longitude: coords.longitude, at: Date.now(),
    }));
  } catch { /* nothing to do: the estimate still works, it just will not be remembered */ }
}

function readPlace() {
  try {
    const place = JSON.parse(localStorage.getItem(PLACE_KEY) ?? 'null');
    return place && Number.isFinite(place.latitude) ? place : null;
  } catch { return null; }
}

function locate() {
  if (!navigator.geolocation) {
    state.sun = { status: 'denied', why: 'This browser will not share a location.' };
    render({ keepScroll: true });
    return;
  }
  state.sun = { status: 'locating' };
  render({ keepScroll: true });
  navigator.geolocation.getCurrentPosition(
    (position) => {
      savePlace(position.coords);
      state.sun = { status: 'ready', place: { latitude: position.coords.latitude, longitude: position.coords.longitude } };
      render({ keepScroll: true });
    },
    (error) => {
      // A stored position from earlier is worth far more than nothing: the sun
      // moves, a photographer usually does not move far.
      const remembered = readPlace();
      state.sun = remembered
        ? { status: 'ready', place: remembered, remembered: true }
        : { status: 'denied', why: error.code === 1
            ? 'Location is off for this site, so the sun cannot be placed.'
            : 'Could not get a position just now.' };
      render({ keepScroll: true });
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
  );
}

/**
 * Which compensation applies: the photographer's own choice when they have made
 * one, otherwise the scene's or the light's suggestion, otherwise none.
 *
 * The two are never summed. A scene that suggests one and a photographer who
 * picks another are disagreeing, not stacking, and the visible chip is always
 * the one the numbers were solved with.
 */
function compFor(scene, light) {
  if (state.comp) return compById(state.comp);
  return compById(scene?.suggestComp ?? light?.suggestComp ?? 'none');
}

function currentSolve() {
  const scene = sceneById(state.sceneId);
  const light = currentLight();
  if (!scene || !light) return null;
  const { lens, focal } = lensFor(scene);
  const compensation = compFor(scene, light);
  return {
    scene, light, compensation,
    ...recommend({ scene, ev: light.ev, gear: state.gear, lens, focal, lock: state.lock, comp: compensation.stops }),
  };
}

function rememberLast() {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({
      sceneId: state.sceneId,
      lightId: state.lightId,
      sky: state.customLight?.cover?.id ?? null,
    }));
  } catch { /* storage unavailable, so the resume card simply will not appear */ }
}

/**
 * A remembered sun estimate is re-run against the clock rather than replayed:
 * the light an hour ago is not the light now, and pretending otherwise would be
 * the one thing this feature exists to avoid.
 */
function readLast() {
  try {
    const last = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null');
    if (!last || !sceneById(last.sceneId)) return null;
    if (last.lightId === 'sun') {
      const place = readPlace();
      if (!place) return null;
      return { ...last, light: estimateLight({ date: new Date(), ...place, sky: last.sky }) };
    }
    const light = lightById(last.lightId);
    return light ? { ...last, light } : null;
  } catch { return null; }
}

/* ------------------------------------------------------------------- screens */

/**
 * Tile art for the scene list and the guide's rows: the photographer's own
 * picture first, then the tile crop, then the full example, then a drawing.
 *
 * The crop is preferred over the example because it is framed for this size:
 * the subject sits clear of the bottom third, where the label goes, whereas the
 * example is composed to be looked at whole.
 */
function tileArt(scene) {
  const src = readShot(scene.id) || thumbFor(scene.id) || photoFor(scene.id);
  return src
    ? `<img class="scenery" src="${src}" alt="" loading="lazy">`
    : scenery(scene.id);
}

function scenesScreen() {
  const last = readLast();
  let resume = '';
  if (last) {
    const scene = sceneById(last.sceneId);
    const light = last.light;
    const { lens, focal } = chooseLens(state.gear, scene.focal);
    const r = recommend({ scene, ev: light.ev, gear: state.gear, lens, focal });
    resume = `<button class="card resume mt-16" data-act="resume" data-scene="${scene.id}" data-light="${light.id}" data-sky="${last.sky ?? ''}">
      <div class="resume__body">
        <span class="lab">Pick up where you left off</span>
        <span class="resume__now">${esc(scene.name)} · ${esc(light.name)}</span>
      </div>
      <span class="resume__set">${r.shutter.label}<br>${r.aperture.label} · ${r.iso.label}</span>
      <span style="color:var(--ink-4)">${icon('chevron', 16)}</span>
    </button>`;
  }

  const tiles = SCENES.map((s) => `<button class="tile" data-act="scene" data-id="${s.id}">
      ${tileArt(s)}
      <span class="tile__label">
        <span class="tile__name">${esc(s.name)}</span><span class="tile__hint">${esc(s.hint)}</span>
      </span>
    </button>`).join('');

  return `<div class="screen">
    <div class="bar">
      <span class="wordmark">${icon('aperture', 17)}<span>STOPS</span></span>
      <span style="flex:1"></span>
      <button class="barbtn" data-act="theme-toggle" aria-label="Switch between light and dark">
        ${icon(resolvedTheme(state.theme) === 'dark' ? 'sun' : 'moon', 19)}</button>
      <button class="barbtn" data-act="help" aria-label="How this works">${icon('info', 19)}</button>
    </div>
    <h1 class="h1 mt-18">What are you shooting?</h1>
    ${resume}
    <span class="lab mt-22">Scenes</span>
    <div class="grid-2 mt-12">${tiles}</div>
  </div>`;
}

/**
 * Position and clock fix the ceiling; only the photographer can see the cloud.
 * So the estimate is offered as four skies with the number each one implies,
 * rather than as a single answer the app cannot actually stand behind.
 */
function sunCard(scene) {
  if (scene.indoors) return '';
  const sun = state.sun;

  if (sun.status === 'locating') {
    return `<div class="card field mt-18">
      <span style="color:var(--amber)">${icon('sun', 21)}</span>
      <span class="field__body"><span class="field__value">Finding you…</span>
      <span class="field__hint">Your phone works this out on its own. No signal needed.</span></span></div>`;
  }

  if (sun.status === 'denied') {
    return `<div class="card field mt-18">
      <span style="color:var(--ink-3)">${icon('sun', 21)}</span>
      <span class="field__body"><span class="field__value" style="color:var(--ink-2)">Cannot place the sun</span>
      <span class="field__hint">${esc(sun.why)} Describe it below instead.</span></span></div>`;
  }

  if (sun.status === 'ready') {
    const now = new Date();
    const options = SKY.map((sky) => ({ sky, light: estimateLight({ date: now, ...sun.place, sky: sky.id }) }));
    const reference = options[0].light;
    const height = reference.altitude >= 0
      ? `Sun ${reference.altitude.toFixed(0)}° above the horizon`
      : `Sun ${Math.abs(reference.altitude).toFixed(0)}° below the horizon`;

    const body = reference.coverMatters
      ? `<div class="grid-2 mt-12">${options.map(({ sky, light }) => `
          <button class="tile" data-act="sun-sky" data-v="${sky.id}" style="min-height:84px">
            <span><span class="tile__name" style="font-size:13.5px;line-height:1.2">${esc(sky.name)}</span>
            <span class="tile__hint">${esc(sky.sub)}</span></span>
            <span class="mono" style="font-size:17px;color:var(--amber-light)">EV ${light.ev}</span>
          </button>`).join('')}</div>`
      : `<button class="primary mt-12" data-act="sun-sky" data-v="clear">
          Use it &middot; <span class="mono">&nbsp;EV ${reference.ev}</span></button>`;

    return `<div class="card card--warm mt-18" style="padding:14px 15px 15px">
      <div style="display:flex;align-items:center;gap:11px">
        <span style="color:var(--amber)">${icon('sun', 20)}</span>
        <span style="flex:1 1 auto">
          <span class="lab" style="color:var(--amber-dim)">${esc(reference.name.split(',')[0])}</span>
          <span class="field__value" style="margin-top:3px">${height}</span></span>
      </div>
      <p class="field__hint mt-12" style="color:var(--amber-dim)">${reference.coverMatters
        ? 'That sets the brightest it can be. Only you can see the cloud.'
        : 'The sun is well down, so cloud cover makes little difference now.'}</p>
      ${body}
      ${sun.remembered ? '<p class="muted mt-12">Using the last position you allowed.</p>' : ''}
    </div>`;
  }

  return `<button class="card field mt-18" data-act="sun-locate">
    <span style="color:var(--amber)">${icon('sun', 21)}</span>
    <span class="field__body"><span class="field__value">Work it out from the sun</span>
    <span class="field__hint">Uses where and when you are. Works with no signal.</span></span>
    <span style="color:var(--ink-4)">${icon('chevron', 16)}</span>
  </button>`;
}

function lightScreen() {
  const scene = sceneById(state.sceneId);
  const shown = state.allLight ? LIGHT : LIGHT.filter((l) => l.common);
  const rows = shown.map((l) => `<button class="row" data-act="light" data-id="${l.id}"
      aria-pressed="${state.lightId === l.id}">
      <span class="row__dot"></span>
      <span class="row__body"><span class="row__name">${esc(l.name)}</span><span class="row__sub">${esc(l.sub)}</span></span>
      <span class="row__ev mono">EV ${l.ev}</span>
    </button>`).join('');

  const more = state.allLight ? '' :
    `<div class="center mt-16"><button data-act="all-light" style="color:var(--amber);font-size:12.5px;font-weight:500">
      Show all ${LIGHT.length} conditions</button></div>`;

  return `<div class="screen">
    <div class="bar">
      <button class="back" data-act="back" aria-label="Back">${icon('back', 20)}</button>
      <span class="bar__title"><span class="bar__name">${esc(scene.name)}</span></span>
      <button class="barbtn" data-act="home" aria-label="Back to the start">${icon('home', 19)}</button>
    </div>
    <h1 class="h1 mt-18">How is the light?</h1>
    ${sunCard(scene)}
    <span class="lab mt-22">${scene.indoors ? 'Describe it' : 'Or describe it'}</span>
    <div class="card rows mt-12">${rows}</div>
    ${more}
  </div>`;
}

/**
 * Four apertures the lens can actually reach, always including the one in use.
 * Centring the window on the current value instead offered f/1 and f/1.2 on a
 * lens that opens to f/1.8, which is two dead chips out of four.
 */
function apertureWindow(current, widest) {
  // Anchored on the aperture in use, stepped in whole stops, and never wider
  // than the lens goes. Anchoring on the lens maximum instead put f/8 and f/9
  // side by side, a third of a stop apart and useless as a choice.
  const floorN = snapAperture(widest).N;
  const rungs = [];
  for (let stop = -6; stop <= 6; stop += 1) {
    const rung = snapAperture(current * Math.pow(2, stop / 2));
    if (rung.N >= floorN - 1e-9 && rung.N <= 22 && !rungs.some((r) => r.label === rung.label)) {
      rungs.push(rung);
    }
  }
  rungs.sort((a, b) => a.N - b.N);
  const at = rungs.findIndex((a) => Math.abs(Math.log2(a.N / current)) < 0.04);
  const start = Math.min(Math.max(at - 1, 0), Math.max(rungs.length - 4, 0));
  return rungs.slice(start, start + 4);
}

function chipRow(kind, values, current, widest) {
  return values.map((v) => {
    const label = kind === 'shutter' ? v.label : v.label;
    const unavailable = kind === 'aperture' && v.N < widest - 0.02;
    const on = kind === 'shutter'
      ? Math.abs(Math.log2(v.s / current)) < 0.08
      : Math.abs(Math.log2(v.N / current)) < 0.04;
    return `<button class="chip${unavailable ? ' chip--out' : ''}" aria-pressed="${on}"
      ${unavailable ? 'disabled' : `data-act="lock-${kind}" data-v="${kind === 'shutter' ? v.s : v.N}"`}>${label}</button>`;
  }).join('');
}

/**
 * The lens is part of the answer rather than a detail of it: changing glass
 * moves the aperture, the hand-held floor and the depth of field at once, so it
 * belongs beside the numbers it decides.
 */
/**
 * A second recipe: the same scene judged differently, with the cost of the
 * difference stated. One answer reads as magic; two read as a choice.
 */
function alternativeFor(r) {
  const alt = r.scene.alt;
  if (!alt) return null;
  const derived = { ...r.scene };
  if (alt.shutter != null) { derived.shutter = alt.shutter; derived.shutterRule = null; }
  if (alt.shutterRule) derived.shutterRule = alt.shutterRule;
  if (alt.aperture != null) derived.aperture = alt.aperture;
  if (alt.tripod !== undefined) derived.tripod = alt.tripod;

  const result = recommend({ scene: derived, ev: r.ev, gear: state.gear, lens: r.lens, focal: r.focal });
  const identical = result.shutter.label === r.shutter.label
    && result.aperture.label === r.aperture.label && result.iso.v === r.iso.v;
  return identical ? null : { alt, result };
}

/** What a faster or slower shutter actually buys, in this scene, at this lens. */
function shutterLesson(r) {
  const threshold = motionThreshold({
    focal: r.focal, crop: state.gear.crop ?? 1, speed: r.scene.speed, subject: r.scene.subject,
  });
  if (threshold) {
    return `Slower than about ${snapShutter(threshold).label} and the movement starts to show. Faster costs ISO.`;
  }
  if (r.scene.tripod) return 'Nothing here is moving and the camera is on a tripod, so the shutter can take as long as it needs.';
  return `Nothing here is moving, so the limit is your own hands. ${snapShutter(r.floor).label} is the slowest you said you trust.`;
}

const APERTURE_LESSON = 'Each step to the right doubles how much stays sharp, and costs one stop of light.';

function lensSection(r) {
  const lenses = state.gear.lenses;
  const wanted = state.focal ?? r.scene.focal;

  const chips = [`<button class="pick" data-act="lens-pick" data-id="auto"
      aria-pressed="${!state.gear.activeLensId}">
      <span class="pick__name">Automatic</span>
      <span class="pick__wide">best for the scene</span>
    </button>`].concat(lenses.map((l) => {
    const focal = Math.min(Math.max(wanted, l.min), l.max);
    const wide = snapAperture(widestAt(l, focal));
    return `<button class="pick" data-act="lens-pick" data-id="${l.id}" aria-pressed="${l.id === r.lens.id}">
      <span class="pick__name">${esc(l.name)}</span>
      <span class="pick__wide">f/${wide.N}${l.min === l.max ? '' : ' at ' + Math.round(focal)}</span>
    </button>`;
  })).join('');

  // Picking a lens that cannot reach the scene's usual focal length is a real
  // choice rather than a mistake, but the photographer should be told what it costs.
  const short = Math.abs(Math.log2(r.focal / r.scene.focal)) > 0.2
    ? `<p class="field__hint mt-8">Not enough reach for the usual ${r.scene.focal} mm here. Frame wider and crop in later.</p>`
    : '';

  const stepper = r.lens.min !== r.lens.max ? `
    <div class="card field mt-10">
      <span class="field__body"><span class="lab">Focal length</span>
      <span class="field__hint">Widest here is f/${snapAperture(r.widest).N}</span></span>
      <span class="stepper">
        <button data-act="focal" data-v="-1" aria-label="Shorter">${icon('minus', 18)}</button>
        <span class="stepper__value">${Math.round(r.focal)} mm</span>
        <button data-act="focal" data-v="1" aria-label="Longer">${icon('plus', 18)}</button>
      </span>
    </div>` : '';

  const picker = lenses.length > 1
    ? `<span class="lab mt-18">Lens</span><div class="grid-auto mt-8">${chips}</div>${short}` : '';
  return picker + stepper;
}

/** "+1 2/3", the way a photographer would say it. */
function signedStops(stops) {
  if (Math.abs(stops) < 0.05) return '0';
  return (stops > 0 ? '+' : '\u2212')
    + describeStops(Math.abs(stops)).replace(/ stops?$/, '').replace(' ', '');
}

/**
 * Exposure compensation, asked as what is in the frame.
 *
 * There is no camera control this corresponds to: in manual with a fixed ISO
 * the compensation dial does nothing, so the correction is already inside the
 * three numbers above. The panel says so, because a beginner who goes looking
 * for the dial will otherwise apply it twice.
 */
function compSection(r) {
  const chosen = r.compensation;
  const chips = COMPENSATIONS.map((c) => `
    <button class="comp" data-act="comp" data-v="${c.id}" aria-pressed="${c.id === chosen.id}">
      <span class="comp__body"><span class="comp__name">${esc(c.name)}</span>
      ${c.sub ? `<span class="comp__sub">${esc(c.sub)}</span>` : ''}</span>
      <span class="comp__stops mono">${signedStops(c.stops)}</span>
    </button>`).join('');

  const suggested = !state.comp && chosen.id !== 'none';
  const note = suggested
    ? `<p class="muted mt-10">Suggested for this ${r.scene.suggestComp ? 'scene' : 'light'}. Change it if the frame says otherwise.</p>`
    : '';

  return `<span class="lab mt-22">What is in the frame</span>
    <p class="sub" style="margin-top:6px">An EV is what the light measures. It cannot know the frame is mostly snow.</p>
    <div class="stack mt-10" style="gap:6px">${chips}</div>
    <p class="muted mt-10">${esc(chosen.why)}</p>
    ${note}
    ${Math.abs(chosen.stops) > 0.05 ? `<p class="muted mt-10">Nothing to set on the camera for this: in manual the
      compensation dial does nothing, so the ${signedStops(chosen.stops)} is already in the three numbers above.</p>` : ''}`;
}

/**
 * Which of an axis's three photographs the current settings land on, and what
 * to print above it. One entry per axis, so a scene carrying an axis nothing
 * here knows about shows no photograph rather than the wrong one.
 */
const PICK_STEP = {
  ap: (scene, r) => apertureStep({ aperture: r.aperture.N, widest: r.widest }),
  fl: (scene, r) => focalStep({
    focal: r.focal, baseFocal: scene.focal, subject: scene.subject, background: scene.background,
  }),
  sh: (scene, r) => shutterStep({
    shutter: r.shutter.s,
    bounds: scene.shutterSteps,
    threshold: motionThreshold({
      focal: r.focal, crop: state.gear.crop ?? 1, speed: scene.speed, subject: scene.subject,
    }),
  }),
};

const STEP_LABEL = {
  ap: (r) => r.aperture.label,
  fl: (r) => `${Math.round(r.focal)} mm`,
  sh: (r) => r.shutter.label,
};

/**
 * The variation photograph for the current settings, when the scene has a set.
 *
 * Only one axis can be shown at a time, since the photographs vary aperture at
 * a fixed focal length or the reverse and never both, so the photographer chooses
 * which question the picture is answering, and the app picks the nearest of the
 * three on that axis.
 */
function variantSet(scene, r) {
  const axes = VARIANTS[scene.id];
  if (!axes) return null;
  const available = Object.keys(axes).filter((a) => (axes[a] ?? []).length);
  if (!available.length) return null;

  const axis = available.includes(state.variantAxis) ? state.variantAxis : available[0];
  const step = PICK_STEP[axis]?.(scene, r);
  const src = step && variantFor(scene.id, axis, step);
  if (!src) return null;

  const axisPicker = available.length > 1
    ? `<div class="seg seg--axis mt-10">${available.map((a) => `
        <button data-act="variant-axis" data-v="${a}" aria-pressed="${a === axis}">${AXIS_NAME[a]}</button>`).join('')}</div>`
    : '';

  return {
    src, axis, axisPicker,
    note: STEP_NOTE[axis]?.[step] ?? '',
    stepLabel: STEP_LABEL[axis](r),
  };
}

/**
 * The diagram and the photograph answer different questions, so the panel holds
 * both rather than choosing. The diagram is the live one, with its blur, smear
 * and grain driven by the numbers on this screen, so it leads, and the
 * photograph is the target to compare it against.
 *
 * The photograph is never blurred or smeared to match the settings: an aperture
 * throws a *background* out of focus, and blurring a whole frame would be
 * teaching the same lie the diagram exists to avoid.
 *
 * Neither is cropped to a common height. The examples run from 3:2 landscape to
 * 5:6 upright, and forcing an upright frame through a letterbox showed a band
 * across the middle of it. The diagram is a 3:2 camera frame, which ten of the
 * eighteen match exactly, so the toggle usually does not move anything; the
 * rest change the panel's height rather than losing the top and bottom of the
 * picture.
 */
function previewPanel(r, scene, caption) {
  const own = readShot(scene.id);
  const photo = own || photoFor(scene.id);

  if (!photo) {
    return `<div class="mt-18">${previewHtml({ result: r, scene, gear: state.gear })}</div>
      <div class="preview__caption"><span>${esc(caption.left)}</span>
      <span class="mono">${esc(caption.right)}</span></div>`;
  }

  const showing = state.previewMode === 'photo' ? 'photo' : 'diagram';
  const toggle = `<div class="seg seg--preview mt-18">
    <button data-act="preview-mode" data-v="diagram" aria-pressed="${showing === 'diagram'}">Your settings</button>
    <button data-act="preview-mode" data-v="photo" aria-pressed="${showing === 'photo'}">The shot</button>
  </div>`;

  if (showing === 'photo') {
    // A photographer's own picture is theirs and is never swapped for a variant.
    const set = own ? null : variantSet(scene, r);
    const src = set?.src ?? photo;
    const note = own
      ? 'Your own photograph'
      : set?.note ?? photoNote(scene.id) ?? 'An example of the shot.';
    const alt = own
      ? `Your own example for ${esc(scene.name)}`
      : `An example of a ${esc(scene.name.toLowerCase())} photograph`;
    return `${toggle}
      ${set ? set.axisPicker : ''}
      <div class="preview preview--photo mt-10"><img src="${src}" alt="${alt}"></div>
      <div class="preview__caption"><span>${esc(note)}</span>
      <span class="mono">${own ? 'Yours' : set ? set.stepLabel : 'Example'}</span></div>
      ${set ? `<p class="muted mt-8">Three photographs on an axis with no steps in it, so this is the
        nearest one rather than your exact ${AXIS_QUANTITY[set.axis]}.</p>` : ''}`;
  }

  return `${toggle}
    <div class="mt-10">${previewHtml({ result: r, scene, gear: state.gear })}</div>
    <div class="preview__caption"><span>${esc(caption.left)}</span>
    <span class="mono">${esc(caption.right)}</span></div>`;
}

function resultScreen() {
  const r = currentSolve();
  if (!r) return scenesScreen();
  const { scene, light } = r;
  const caption = previewCaption(scene, r);
  const locked = state.lock.t != null || state.lock.N != null;

  const shutterChoices = [r.shutter.s / 4, r.shutter.s / 2, r.shutter.s, r.shutter.s * 2].map(snapShutter);
  const apertureChoices = apertureWindow(r.aperture.N, r.widest);

  // Never say "at your cap" unless ISO is genuinely at it: the badge used to
  // fire on any shortfall, so a frame held back by a locked shutter blamed a
  // ceiling the photographer was nowhere near.
  const ceiling = state.gear.isoCeiling ?? 6400;
  const atCap = r.iso.v >= ceiling - 1e-9;
  const isShort = r.shortfallStops > 0.05;

  const isoRowClass = isShort && atCap ? 'vrow vrow--capped'
    : r.solvedBy === 'iso' || atCap ? 'vrow vrow--solved' : 'vrow';
  const isoBadge = isShort && atCap
    ? '<span class="badge badge--warn">AT YOUR CAP</span>'
    : r.solvedBy === 'iso' ? '<span class="badge">SOLVES IT</span>' : '';
  const isoWhy = isShort && atCap ? 'Your ceiling, and still not enough'
    : atCap ? 'Right at the ceiling you set'
    : r.solvedBy === 'iso' ? 'The app moves this one, never you'
    : r.iso.v <= (state.gear.isoMin ?? 100) ? 'Base ISO, the cleanest file your camera makes'
    : 'Settled by the other two';

  let alert = '';
  if (r.shortfallStops > 0.05) {
    alert = `<div class="card card--warn alert mt-16">
      <span class="alert__icon">${icon('warning', 19)}</span>
      <span><span class="alert__title">You are ${describeStops(r.shortfallStops)} short.</span>
      <span class="alert__body">${esc(shortfallReason(r))}</span></span></div>`;
  } else if (r.overStops > 0.05) {
    alert = `<div class="card card--warn alert mt-16">
      <span class="alert__icon">${icon('warning', 19)}</span>
      <span><span class="alert__title">${describeStops(r.overStops)} too much light.</span>
      <span class="alert__body">${esc(overReason(r))}</span></span></div>`;
  }

  const ways = r.ways.length ? `<span class="lab mt-22">Three ways to buy it back</span>
    <div class="stack mt-12" style="gap:9px">${r.ways.map((w, i) => `
      <div class="card way${i === 0 ? ' card--warm' : ''}">
        <span class="way__head"><span class="way__title">${esc(w.title)}</span>
        ${i === 0 ? '<span class="badge">BEST BET</span>' : ''}</span>
        <span class="way__detail">${esc(w.detail)}</span>
        <button class="way__set" data-act="way" data-id="${w.id}">
          ${w.settings.shutter.label} · ${w.settings.aperture.label} · ISO ${w.settings.iso.label} →</button>
      </div>`).join('')}</div>` : '';

  const zoom = lensSection(r);

  const alternative = alternativeFor(r);
  const altCard = alternative ? `
    <span class="lab mt-22">Or, if you would rather</span>
    <button class="card way mt-10" data-act="take-alt">
      <span class="way__head"><span class="way__title">${esc(alternative.alt.name)}</span></span>
      <span class="way__detail">${esc(alternative.alt.why)}</span>
      <span class="way__set">${alternative.result.shutter.label} &middot; ${alternative.result.aperture.label}
        &middot; ISO ${alternative.result.iso.label} &rarr;</span>
    </button>` : '';

  return `<div class="screen">
    <div class="bar">
      <button class="back" data-act="back" aria-label="Back">${icon('back', 20)}</button>
      <span class="bar__title">
        <span class="bar__name">${esc(scene.name)}</span>
        <span class="bar__meta">${esc(light.name)} · <span class="mono" style="color:var(--amber-dim)">EV ${light.ev}${
          Math.abs(r.comp) > 0.05 ? ` &rarr; ${Math.round(r.ev * 10) / 10}` : ''}</span> · ${Math.round(r.focal)} mm</span>
      </span>
      <button class="barbtn" data-act="home" aria-label="Back to the start">${icon('home', 19)}</button>
    </div>

    ${previewPanel(r, scene, caption)}
    ${alert}

    <div class="mt-16" style="margin-left:calc(var(--pad) * -1); margin-right:calc(var(--pad) * -1); border-top:1px solid var(--line-soft)">
      <div class="vrow${r.solvedBy === 'shutter' ? ' vrow--solved' : ''}">
        <span class="vrow__body"><span class="lab">Shutter</span>
        <span class="vrow__why">${esc(shutterWhy(r))}</span></span>
        <span class="vrow__num">${r.shutter.label}</span>
      </div>
      <div class="vrow${r.solvedBy === 'aperture' ? ' vrow--solved' : ''}">
        <span class="vrow__body"><span class="lab">Aperture</span>
        <span class="vrow__why">${esc(apertureWhy(r))}</span></span>
        <span class="vrow__num">${r.aperture.label}</span>
      </div>
      <div class="${isoRowClass}">
        <span class="vrow__body">
          <span style="display:flex;align-items:center;gap:8px">
            <span class="lab" style="color:${isShort && atCap ? 'var(--warn)' : r.solvedBy === 'iso' || atCap ? 'var(--amber)' : 'var(--ink-3)'}">ISO</span>${isoBadge}</span>
          <span class="vrow__why">${esc(isoWhy)}</span></span>
        <span class="vrow__num">${r.iso.label}</span>
      </div>
    </div>

    ${altCard}

    <span class="lab mt-22">Shutter</span>
    <div class="grid-4 mt-8">${chipRow('shutter', shutterChoices, r.shutter.s, r.widest)}</div>
    <p class="lesson">${esc(shutterLesson(r))}</p>
    <span class="lab mt-16">Aperture</span>
    <div class="grid-4 mt-8">${chipRow('aperture', apertureChoices, r.aperture.N, r.widest)}</div>
    <p class="lesson">${esc(APERTURE_LESSON)}</p>
    ${zoom}
    ${compSection(r)}
    ${locked ? `<div class="center mt-16"><button data-act="unlock" style="color:var(--amber);font-size:12.5px;font-weight:500">
      Back to the app's own answer</button></div>` : ''}
    ${ways}

    <button class="note" style="padding-left:0;padding-right:0;width:100%" data-act="scene-guide" data-id="${scene.id}">
      <span class="note__icon">${icon('info', 17)}</span>
      <span class="note__text">${esc(scene.tip)}
        <span style="color:var(--amber);font-weight:600">&nbsp;More on shooting this &rarr;</span></span>
    </button>
  </div>`;
}

function shutterWhy(r) {
  if (state.lock.t != null) return 'Your choice, and the app is working around it';
  if (r.solvedBy === 'shutter') return 'Takes up whatever the other two leave';
  if (r.scene.shutterRule === '500') return r.scene.shutterWhy;
  const floor = r.floor;
  if (!r.scene.tripod && Math.abs(Math.log2(r.shutter.s / floor)) < 0.08) {
    return 'The slowest you said you trust hand-held';
  }
  return r.scene.shutterWhy ?? 'Fast enough for what is moving here';
}

function apertureWhy(r) {
  if (state.lock.N != null) return 'Your choice, and the app is working around it';
  if (Math.abs(Math.log2(r.aperture.N / r.widest)) < 0.04) return 'Wide open, and your lens has no more to give';
  if (r.solvedBy === 'aperture') return 'Opened up to find the light';
  return r.scene.apertureWhy ?? 'Deep enough for this subject';
}

/** Name what is actually holding the frame back, rather than assuming it is ISO. */
function shortfallReason(r) {
  const ceiling = state.gear.isoCeiling ?? 6400;
  const reasons = [];

  if (state.lock.t != null) reasons.push(`you are holding ${r.shutter.label}`);
  if (state.lock.N != null) reasons.push(`you are holding ${r.aperture.label}`);
  if (r.iso.v >= ceiling - 1e-9) reasons.push(`ISO ${r.iso.label} is your ceiling`);

  const wideOpen = Math.abs(Math.log2(r.aperture.N / r.widest)) < 0.04;
  if (state.lock.N == null && wideOpen) {
    reasons.push(r.lens.min !== r.lens.max
      ? `your ${r.lens.name} is only f/${snapAperture(r.widest).N} at ${Math.round(r.focal)} mm`
      : `f/${snapAperture(r.widest).N} is as wide as that lens goes`);
  }
  if (r.scene.tripod && r.shutter.s >= 30) reasons.push('thirty seconds is as long as this goes');

  if (!reasons.length) return 'There is simply not enough light here for this shot.';
  const sentence = reasons.join(', and ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

function overReason(r) {
  if (r.scene.nd) {
    return `Keeping ${r.shutter.label} in this light needs a ${Math.round(r.overStops)}-stop ND filter. A polariser is worth two of them.`;
  }
  return 'Close down, go faster, or wait for the light to drop.';
}

/* --------------------------------------------------------------------- guide */

const NARROWEST_F = 22;

/**
 * The Shutter and Aperture tabs are computed from the same optics the solver
 * uses, against the photographer's own gear, rather than being a table of
 * numbers kept alongside it.
 *
 * They used to be flat lists, as in "a still portrait, 1/160", which was wrong in
 * both directions at once: 1/160 is a stop too slow to hold a 200 mm steady and
 * more than a stop faster than a 24 mm needs. A guide that can contradict the
 * engine is a second source of truth, and the engine is the one that knows the
 * lens.
 */

/** Focal lengths the photographer's kit actually covers. */
function guideFocals() {
  const lenses = state.gear.lenses ?? [];
  const covered = (f) => lenses.some((l) => f >= l.min && f <= l.max);
  const options = [24, 35, 50, 85, 135, 200, 300].filter(covered);
  return options.length ? options : [50];
}

function guideFocal() {
  const options = guideFocals();
  return options.includes(state.guideFocal) ? state.guideFocal : (options.includes(50) ? 50 : options[0]);
}

function focalChips() {
  const focal = guideFocal();
  return `<span class="lab mt-18">At which focal length</span>
    <div class="grid-auto mt-8">${guideFocals().map((f) => `
      <button class="chip" data-act="guide-focal" data-v="${f}" aria-pressed="${f === focal}">${f} mm</button>`).join('')}</div>`;
}

function shutterTab() {
  const focal = guideFocal();
  const crop = state.gear.crop ?? 1;
  const lens = state.gear.lenses?.find((l) => focal >= l.min && focal <= l.max);
  const stabiliserStops = lens?.stabilised ? (state.gear.stabiliserStops ?? 0) : 0;

  const bare = handheldFloor({ focal, crop, stabiliserStops: 0, userSlowest: null });
  const withStab = handheldFloor({ focal, crop, stabiliserStops, userSlowest: null });
  const actual = handheldFloor({ focal, crop, stabiliserStops, userSlowest: state.gear.userSlowest });

  const shakeRows = [['The reciprocal rule', `${snapShutter(bare).label}`, `1 ÷ (${focal} × ${crop} crop)`]];
  if (stabiliserStops > 0) {
    shakeRows.push(['Your stabilised lens', snapShutter(withStab).label,
      `${stabiliserStops} stop${stabiliserStops === 1 ? '' : 's'} of help`]);
  }
  const ownLimitBinds = actual !== withStab;
  if (ownLimitBinds) {
    shakeRows.push(['Your own limit', snapShutter(actual).label, 'You said you would go no slower']);
  }
  // Which of the two is actually binding changes what the floor means, and
  // saying "your hands show" when it is really the photographer's own cap would
  // be blaming the wrong thing.
  shakeRows.push(['So your floor is', snapShutter(actual).label,
    ownLimitBinds ? 'Your own cap, not your hands' : 'Below this, your hands show']);

  // Distance scales with focal length to hold the framing, and the focal length
  // then cancels out of the equation exactly. That is not a bug to hide: framed
  // the same way, a moving subject needs the same shutter on any lens.
  const moveRows = MOVERS.map((m) => {
    const subject = m.at50 * (focal / 50);
    const t = motionThreshold({ focal, crop, speed: m.speed, subject });
    return [m.name, t ? snapShutter(t).label : 'any',
      `${m.speed} m/s, ${subject.toFixed(subject < 10 ? 1 : 0)} m away at ${focal} mm`];
  });

  return `<p class="sub mt-18" style="font-size:14.5px">Two different blurs, and beginners fix the wrong one.
    <strong style="color:var(--ink)">Camera shake</strong> smears the whole frame and comes from your hands.
    <strong style="color:var(--ink)">Subject movement</strong> smears only the thing that moved.
    The shutter has to beat whichever is worse.</p>
    ${focalChips()}
    <span class="lab mt-22">Camera shake, your floor at ${focal} mm</span>
    <div class="card mt-8 deftable">${shakeRows.map(([k, v, note]) =>
      `<div><dt>${esc(k)}<span class="dt__note">${esc(note)}</span></dt><dd>${esc(v)}</dd></div>`).join('')}</div>
    <p class="muted mt-10">This is the number that moves when you zoom, which is why one shutter speed cannot
      be right for a whole lens.</p>
    <span class="lab mt-22">Subject movement, framed the same way</span>
    <div class="card mt-8 deftable">${moveRows.map(([k, v, note]) =>
      `<div><dt>${esc(k)}<span class="dt__note">${esc(note)}</span></dt><dd>${esc(v)}</dd></div>`).join('')}</div>
    <p class="muted mt-10">A close dog needs a faster shutter than a distant bird: what matters is how fast the
      subject crosses the <em>frame</em>, not how fast it is travelling.</p>
    <p class="muted mt-10">Change the focal chips and this table does not move, while the one above it does. Framed
      the same way, a moving subject needs the same shutter on any lens. Zooming in asks more of your hands, not
      of the subject. Stand still and zoom without stepping back, though, and these numbers rise with the
      magnification.</p>
    <p class="muted mt-10">Faster is not better. Every stop of shutter is a stop taken from aperture or ISO, and
      1/60 while panning says "fast" in a way 1/1000 never does.</p>`;
}

function apertureTab() {
  const focal = guideFocal();
  const crop = state.gear.crop ?? 1;

  const depthRows = DEPTHS.map((d) => {
    const subject = d.at50 * (focal / 50);
    const n = apertureForDepth({ focal, crop, subject, far: subject + d.gap });
    return [d.name, n == null ? 'any' : n > NARROWEST_F ? `past f/22` : snapAperture(n).label,
      `${subject.toFixed(subject < 10 ? 1 : 0)} m away`];
  });

  const hyperRows = [2.5, 5].map((from) => {
    const n = hyperfocalAperture({ focal, crop, from });
    return [`Sharp from ${from} m to infinity`, n > NARROWEST_F ? 'past f/22' : snapAperture(n).label,
      `focus at ${(from * 2).toFixed(0)} m`];
  });

  // A fixed comparison rather than a table of the chosen focal length: the whole
  // point is what changes between three lenses, so all three always show.
  const blurRows = [24, 50, 135].map((f) => {
    const subject = 2 * (f / 50);
    const b = backgroundBlurMm({ focal: f, aperture: 2.8, subject, background: subject + 4 });
    return [`${f} mm, from ${subject.toFixed(1)} m`, `${(asFrameFraction(b, crop) * 100).toFixed(1)}%`,
      'of the frame width'];
  });

  return `<p class="sub mt-18" style="font-size:14.5px">f/4 is not a size, it is a ratio: the focal length divided
    by the opening. That is why f/2.8 is a physically much bigger hole on an 85 than on a 24, and yet lets in
    exactly the same amount of light.</p>
    ${focalChips()}
    <span class="lab mt-22">Depth at ${focal} mm</span>
    <div class="card mt-8 deftable">${depthRows.map(([k, v, note]) =>
      `<div><dt>${esc(k)}<span class="dt__note">${esc(note)}</span></dt><dd>${esc(v)}</dd></div>`).join('')}</div>
    <div class="card mt-8 deftable">${hyperRows.map(([k, v, note]) =>
      `<div><dt>${esc(k)}<span class="dt__note">${esc(note)}</span></dt><dd>${esc(v)}</dd></div>`).join('')}</div>
    <p class="muted mt-10">Change the focal chips above and watch how little the first table moves. At the same
      framing, depth of field barely depends on focal length. A long lens makes you stand further back, and the
      two effects very nearly cancel.</p>
    <p class="muted mt-10">"Past f/22" is a real answer, not a missing one: that shot does not fit at this focal
      length, and no aperture on the dial will make it. Step back and use a wider lens, or accept that the far
      end goes soft.</p>
    <span class="lab mt-22">What the long lens actually buys, at f/2.8</span>
    <div class="card mt-8 deftable">${blurRows.map(([k, v, note]) =>
      `<div><dt>${esc(k)}<span class="dt__note">${esc(note)}</span></dt><dd>${esc(v)}</dd></div>`).join('')}</div>
    <p class="muted mt-10">This is the one that moves. The subject is framed identically in all three and a
      background four metres behind it blurs three times as much at 135 mm. Long lenses do not thin the depth on
      the face; they magnify what is behind it.</p>
    <p class="muted mt-10">Neither end is free. Wide open is where lenses are softest and where a focus miss of a
      centimetre shows; past about f/16 diffraction takes back the sharpness stopping down was meant to buy.</p>`;
}

/** The scene's own rules, read back out of the data that drives the solver. */
function anchorRows(scene) {
  const rows = [];
  if (scene.shutterRule) rows.push(['Shutter', `${scene.shutterRule} ÷ (focal × crop)`]);
  else if (scene.shutter != null) rows.push(['Shutter', `${snapShutter(scene.shutter).label} or faster`]);
  else rows.push(['Shutter', 'Your hand-held floor']);
  rows.push(['Aperture', scene.aperture === 'widest' ? 'As wide as the lens goes' : `f/${scene.aperture}`]);
  const names = { aperture: 'aperture', iso: 'ISO', shutter: 'shutter' };
  const gives = (scene.give ?? ['iso']).map((g) => names[g] ?? g).join(', then ');
  rows.push(['Then gives way with', gives.charAt(0).toUpperCase() + gives.slice(1)]);
  if (scene.tripod) rows.push(['Assumes', 'A tripod']);
  return rows;
}

/** Their photograph when they have set one, and an honest drawing when not. */
function exampleBlock(scene) {
  const own = readShot(scene.id);
  const stock = photoFor(scene.id);
  const failed = state.shotError
    ? `<p class="muted" style="color:var(--warn);margin-top:8px">${esc(state.shotError)}</p>` : '';

  if (own) {
    return `<div class="banner mt-18"><img src="${own}" alt="Your own example for ${esc(scene.name)}"></div>
      <div class="shotbar">
        <span class="lab">Your photograph</span><span style="flex:1"></span>
        <button data-act="shot-pick" data-id="${scene.id}">Replace</button>
        <button data-act="shot-clear" data-id="${scene.id}" style="color:var(--warn)">Remove</button>
      </div>${failed}`;
  }

  if (stock) {
    return `<div class="banner mt-18"><img src="${stock}" alt="An example of a ${esc(scene.name.toLowerCase())} photograph"></div>
      <p class="muted" style="margin-top:8px">${esc(photoNote(scene.id))}</p>
      <button class="ghost mt-10" data-act="shot-pick" data-id="${scene.id}">
        ${icon('plus', 15)}<span>Use one of your own instead</span></button>${failed}`;
  }

  return `<div class="banner mt-18">${scenery(scene.id, { rounded: 13 })}</div>
    <p class="muted" style="margin-top:8px">Drawn, not photographed. It shows the shape of the shot, not the picture.</p>
    <button class="ghost mt-10" data-act="shot-pick" data-id="${scene.id}">
      ${icon('plus', 15)}<span>Use one of your own as the example</span></button>${failed}`;
}

function sceneGuide(scene) {
  const c = craftFor(scene.id);
  if (!c) return guideList();
  return `<div class="screen">
    <div class="bar">
      <button class="back" data-act="guide-back" aria-label="Back to the list">${icon('back', 20)}</button>
      <span class="bar__title"><span class="bar__name">Field guide</span></span>
      <button class="barbtn" data-act="home" aria-label="Back to the start">${icon('home', 19)}</button>
    </div>

    ${exampleBlock(scene)}
    <h1 class="h1 mt-16">${esc(scene.name)}</h1>
    <p class="sub">${esc(c.intro)}</p>

    <span class="lab mt-22">In the field</span>
    <div class="steps mt-12">
      ${c.craft.map(([title, detail]) => `<div class="step">
        <span class="step__n" style="padding-top:2px">${icon('check', 15)}</span>
        <span><span class="step__t">${esc(title)}</span><span class="step__d">${esc(detail)}</span></span>
      </div>`).join('')}
    </div>

    <div class="card card--warn alert mt-22">
      <span class="alert__icon">${icon('warning', 19)}</span>
      <span><span class="alert__title" style="font-size:14px">What usually goes wrong</span>
      <span class="alert__body">${esc(c.mistake)}</span></span>
    </div>

    <span class="lab mt-22">What the app holds fixed here</span>
    <div class="card mt-10 deftable">
      ${anchorRows(scene).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </div>

    <button class="primary mt-22" data-act="shoot-scene" data-id="${scene.id}">Shoot this now</button>
  </div>`;
}

function guideList() {
  return SCENES.map((sc) => `<button class="row" data-act="guide-scene" data-id="${sc.id}">
      <span class="thumb">${tileArt(sc)}</span>
      <span class="row__body"><span class="row__name">${esc(sc.name)}</span>
      <span class="row__sub">${esc(craftFor(sc.id)?.intro.split(/[.,]/)[0] ?? sc.hint)}</span></span>
      <span style="color:var(--ink-4);display:flex">${icon('chevron', 15)}</span>
    </button>`).join('');
}

function guideScreen() {
  if (state.guideScene) {
    const scene = sceneById(state.guideScene);
    if (scene) return sceneGuide(scene);
  }
  const tabsHtml = ['scenes', 'stops', 'shutter', 'aperture', 'rules'].map((t) =>
    `<button data-act="guide-tab" data-v="${t}" aria-pressed="${state.guideTab === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('');

  let body = '';
  if (state.guideTab === 'scenes') {
    body = `<p class="sub mt-18">Eighteen scenes, and how to shoot each one, beyond what to set the dials to.</p>
      <div class="card rows mt-12">${guideList()}</div>`;
  } else if (state.guideTab === 'stops') {
    const cells = FULL_STOPS.shutter.map((_, i) =>
      `<span class="ladder__cell">${FULL_STOPS.shutter[i]}</span>
       <span class="ladder__cell">${FULL_STOPS.aperture[i]}</span>
       <span class="ladder__cell">${FULL_STOPS.iso[i]}</span>`).join('');
    body = `<p class="sub mt-18" style="font-size:14.5px">Every step down is <strong style="color:var(--ink)">one stop brighter</strong>.
      Give a stop in one column, take it back in another, and the exposure holds.</p>
      <div style="display:flex;align-items:center;gap:7px;color:var(--amber)" class="mt-12">
        ${icon('down', 14)}<span class="mono" style="font-size:10.5px;letter-spacing:.1em;font-weight:500">MORE LIGHT</span>
      </div>
      <div class="card mt-12" style="overflow:hidden">
        <div class="ladder">
          <span class="lab ladder__head">Shutter</span><span class="lab ladder__head">Aperture</span><span class="lab ladder__head">ISO</span>
          ${cells}
        </div>
      </div>`;
  } else if (state.guideTab === 'rules') {
    body = `<div class="card mt-18 deftable">
      ${[
        ['Sunny 16', 'f/16 at 1/ISO'],
        ['Hand-held floor', '1 ÷ (focal × crop)'],
        ['Stabilised lens', '3 rows slower'],
        ['Stars, before they trail', '500 ÷ (focal × crop)'],
        ['Doubling ISO', '+1 stop'],
        ['Opening one f-stop', '+1 stop'],
        ['A 10-stop ND', '1/500 → 2s'],
      ].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </div>
    <p class="muted mt-16">Every rule here is a starting point. The camera's meter and your own eyes outrank all of them.</p>`;
  } else if (state.guideTab === 'shutter') {
    body = shutterTab();
  } else {
    body = apertureTab();
  }

  return `<div class="screen">
    <h1 class="h1">Field guide</h1>
    <button class="card field mt-16" data-act="help">
      <span style="color:var(--amber)">${icon('info', 21)}</span>
      <span class="field__body"><span class="field__value">How this works</span>
      <span class="field__hint">The four steps, again.</span></span>
      <span style="color:var(--ink-4)">${icon('chevron', 16)}</span>
    </button>
    <div class="seg mt-16">${tabsHtml}</div>
    ${body}
  </div>`;
}

/* ---------------------------------------------------------------------- gear */

const SLOWEST = [1 / 125, 1 / 60, 1 / 30, 1 / 15];

/** The standard ceilings, plus the current one if it is not among them. */
function ceilingChoices(current) {
  const all = ISO_CEILINGS.includes(current) ? [...ISO_CEILINGS] : [...ISO_CEILINGS, current];
  return all.sort((a, b) => a - b);
}
const CROPS = [[1, 'Full frame'], [1.5, 'APS-C'], [1.6, 'APS-C (Canon)'], [2, 'Micro Four Thirds']];
const WIDEST_CHOICES = [1.4, 1.8, 2, 2.8, 3.5, 4, 5.6];

/** What the lens choice does to the shot currently on screen, shown where the
 *  choice is made, since otherwise the effect is two taps away and invisible. */
function mountedEffect() {
  const r = currentSolve();
  if (!r) return '';
  return `<div class="card card--warm mt-12" style="padding:13px 15px 14px">
    <span class="lab" style="color:var(--amber-dim)">With this lens, right now</span>
    <div class="mono" style="font-size:19px;color:var(--amber-light);margin-top:8px;letter-spacing:-0.01em">
      ${r.shutter.label} &middot; ${r.aperture.label} &middot; ${r.iso.label}</div>
    <div style="font-size:12px;color:var(--amber-dim);margin-top:6px;line-height:1.4">
      ${esc(r.scene.name)} &middot; ${esc(r.light.name)} &middot; ${Math.round(r.focal)} mm</div>
  </div>`;
}

function gearScreen() {
  const g = state.gear;
  const cropName = (CROPS.find(([c]) => c === g.crop) ?? [g.crop, 'Custom'])[1];

  const lenses = g.lenses.map((l) => {
    const open = state.editingLens === l.id;
    const zoom = l.min !== l.max;
    const wide = zoom ? `f/${l.wideMin}–${l.wideMax}` : `f/${l.wideMin}`;
    // Only say the range when the lens is not already named after it.
    const range = zoom ? `${l.min}–${l.max} mm` : `${l.min} mm`;
    const sub = [l.name.includes(String(l.min)) ? null : range, l.stabilised ? 'stabilised' : null]
      .filter(Boolean).join(' · ');
    const editor = !open ? '' : `<div style="padding:4px 15px 15px;border-top:1px solid var(--line-soft)">
      <span class="lab">Name</span>
      <input data-act="lens-name" data-id="${l.id}" value="${esc(l.name)}" class="mt-8"
        style="width:100%;min-height:44px;padding:0 12px;background:var(--card-2);border:1px solid var(--line);border-radius:10px;color:var(--ink);font:inherit">
      <div class="grid-2 mt-12">
        <span><span class="lab">Shortest</span>
        <input type="number" inputmode="numeric" data-act="lens-min" data-id="${l.id}" value="${l.min}" class="mt-8"
          style="width:100%;min-height:44px;padding:0 12px;background:var(--card-2);border:1px solid var(--line);border-radius:10px;color:var(--ink);font-family:var(--data)"></span>
        <span><span class="lab">Longest</span>
        <input type="number" inputmode="numeric" data-act="lens-max" data-id="${l.id}" value="${l.max}" class="mt-8"
          style="width:100%;min-height:44px;padding:0 12px;background:var(--card-2);border:1px solid var(--line);border-radius:10px;color:var(--ink);font-family:var(--data)"></span>
      </div>
      <span class="lab mt-12" style="display:block">Widest aperture${zoom ? ' at the short end' : ''}</span>
      <div class="grid-4 mt-8">${WIDEST_CHOICES.map((v) =>
        `<button class="chip" data-act="lens-wide-min" data-id="${l.id}" data-v="${v}" aria-pressed="${l.wideMin === v}">f/${v}</button>`).join('')}</div>
      ${zoom ? `<span class="lab mt-12" style="display:block">Widest at the long end</span>
      <div class="grid-4 mt-8">${WIDEST_CHOICES.map((v) =>
        `<button class="chip" data-act="lens-wide-max" data-id="${l.id}" data-v="${v}" aria-pressed="${l.wideMax === v}">f/${v}</button>`).join('')}</div>` : ''}
      <div class="grid-2 mt-12">
        <button class="chip" data-act="lens-is" data-id="${l.id}" aria-pressed="${!!l.stabilised}">Stabilised</button>
        <button class="chip" data-act="lens-remove" data-id="${l.id}" style="color:var(--warn)">Remove</button>
      </div>
    </div>`;

    const mounted = g.activeLensId === l.id;
    return `<div><div class="lensrow">
      <button class="lens" data-act="lens-pick" data-id="${l.id}" aria-pressed="${mounted}">
        <span class="lens__mark">${icon(mounted ? 'check' : 'lens', mounted ? 17 : 19)}</span>
        <span class="lens__body"><span class="lens__name">${esc(l.name)}</span>
        ${sub ? `<span class="lens__sub">${esc(sub)}</span>` : ''}</span>
        <span class="lens__wide mono">${wide}</span>
      </button>
      <button class="lensedit" data-act="lens-edit" data-id="${l.id}" aria-expanded="${open}"
        aria-label="Edit ${esc(l.name)}">${icon('sliders', 18)}</button>
    </div>${editor}</div>`;
  }).join('');

  return `<div class="screen">
    <h1 class="h1">Your gear</h1>
    <p class="sub">Three numbers do most of the work, and they are the whole reason your answers differ from a printed chart.</p>

    <button class="card field mt-18" data-act="crop">
      <span style="color:var(--ink-3)">${icon('camera', 21)}</span>
      <span class="field__body"><span class="lab">Sensor</span><span class="field__value">${esc(cropName)} · ${g.crop}× crop</span></span>
      <span style="color:var(--ink-4)">${icon('chevron', 16)}</span>
    </button>

    <div class="card mt-12" style="padding:14px 15px 15px">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <span class="lab">Highest ISO I will accept</span>
        <span class="mono" style="font-size:22px;font-weight:500;color:var(--amber)">${g.isoCeiling}</span>
      </div>
      <div class="grid-3 mt-12">${ceilingChoices(g.isoCeiling).map((v) =>
        `<button class="chip" data-act="iso-ceiling" data-v="${v}" aria-pressed="${g.isoCeiling === v}">${v}</button>`).join('')}</div>
    </div>

    <div class="card mt-12" style="overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 15px 11px">
        <span class="lab">Lenses</span><span class="mono" style="font-size:10px;color:var(--ink-4);letter-spacing:.1em">WIDEST</span>
      </div>
      <div class="lensrow">
        <button class="lens" data-act="lens-pick" data-id="auto" aria-pressed="${!g.activeLensId}">
          <span class="lens__mark">${icon(g.activeLensId ? 'lens' : 'check', g.activeLensId ? 19 : 17)}</span>
          <span class="lens__body"><span class="lens__name">Whichever suits the scene</span>
          <span class="lens__sub">The fastest lens that covers it</span></span>
        </button>
      </div>
      ${lenses}
      <div class="lensrow">
        <button class="lens" data-act="lens-add" style="justify-content:center;color:var(--amber)">
          ${icon('plus', 15)}<span style="font-size:13.5px;font-weight:600">Add a lens</span></button>
      </div>
    </div>

    ${mountedEffect()}

    <div class="card mt-12" style="padding:14px 15px 15px">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <span class="lab">Slowest I trust hand-held</span>
        <span class="mono" style="font-size:18px">${snapShutter(g.userSlowest).label}</span>
      </div>
      <p class="field__hint mt-8">The app will not suggest anything slower without saying so.</p>
      <div class="grid-4 mt-12">${SLOWEST.map((s) =>
        `<button class="chip" data-act="slowest" data-v="${s}" aria-pressed="${Math.abs(g.userSlowest - s) < 1e-9}">${snapShutter(s).label}</button>`).join('')}</div>
    </div>

    <div class="card mt-12" style="padding:14px 15px 15px">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <span class="lab">Stops my stabiliser buys</span>
        <span class="mono" style="font-size:18px">${g.stabiliserStops}</span>
      </div>
      <div class="grid-5 mt-12">${[0, 1, 2, 3, 4].map((v) =>
        `<button class="chip" data-act="stab" data-v="${v}" aria-pressed="${g.stabiliserStops === v}">${v}</button>`).join('')}</div>
    </div>

    <div class="card mt-12" style="padding:14px 15px 15px">
      <span class="lab">Appearance</span>
      <p class="field__hint mt-8">Dark for dusk and indoors. Light for direct sun on the screen.</p>
      <div class="grid-3 mt-12">${THEMES.map(([id, label]) =>
        `<button class="chip" data-act="theme" data-v="${id}" aria-pressed="${state.theme === id}">${label}</button>`).join('')}</div>
    </div>

    <div class="center mt-18"><button data-act="reset-gear" class="muted" style="text-decoration:underline">Reset to the example kit</button></div>
  </div>`;
}

/* ------------------------------------------------- your own example photos */

// There is no honest source for photographs of eighteen scenes that this app
// could ship. The photographer, though, has a library full of the only examples
// that really mean anything to them. Stored downscaled, locally, sent nowhere.

const readShot = (id) => { try { return localStorage.getItem(SHOT_KEY + id); } catch { return null; } };

function downscale(file, maxWidth) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    image.src = url;
  });
}

function pickShot(sceneId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      localStorage.setItem(SHOT_KEY + sceneId, await downscale(file, 560));
      state.shotError = null;
    } catch {
      // Nearly always the storage quota: a few dozen photographs will fill it.
      state.shotError = 'That would not save. Remove an example from another scene and try again.';
    }
    render({ keepScroll: true });
  });
  input.click();
}

/* ------------------------------------------------------------------- intro */

const STEPS = [
  ['Tell it what you own', 'Your lenses, and the highest ISO you are willing to accept. Once, and it remembers.'],
  ['Say what you are shooting', 'Eighteen scenes, from a school sports day to the Milky Way. One tap.'],
  ['Say what the light is doing', 'Pick it from a list, or let the app work it out from where and when you are.'],
  ['Set the three numbers', 'And when the shot will not fit your gear, it says so, and prices the ways out.'],
];

function introSheet() {
  if (!state.showIntro) return '';
  return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="intro-title">
    <div class="sheet__inner">
      <span class="wordmark">${icon('aperture', 17)}<span>STOPS</span></span>
      <h1 class="h1 mt-18" id="intro-title">Four taps to three numbers.</h1>
      <p class="sub">A field guide that solves the exposure triangle for your gear and your light, not for an average camera in an average field.</p>
      <div class="steps">
        ${STEPS.map(([title, detail], i) => `<div class="step">
          <span class="step__n mono">${i + 1}</span>
          <span><span class="step__t">${esc(title)}</span><span class="step__d">${esc(detail)}</span></span>
        </div>`).join('')}
      </div>
      <p class="muted mt-22">It all works with no signal, and nothing you enter leaves your phone.</p>
      <div class="sheet__actions">
        <button class="primary" data-act="intro-done">Start</button>
        <button class="ghost mt-10" data-act="intro-gear">Set up my gear first</button>
      </div>
    </div>
  </div>`;
}

function dismissIntro() {
  state.showIntro = false;
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* it will show once more */ }
}

/* -------------------------------------------------------------------- render */

function screenHtml() {
  if (state.tab === 'guide') return guideScreen();
  if (state.tab === 'gear') return gearScreen();
  if (state.step === 'light') return lightScreen();
  if (state.step === 'result') return resultScreen();
  return scenesScreen();
}

const TABS = [['shoot', 'Shoot', 'aperture'], ['guide', 'Guide', 'book'], ['gear', 'Gear', 'sliders']];

function render({ keepScroll = false } = {}) {
  const scroll = app.scrollTop;
  sheet.innerHTML = introSheet();
  app.innerHTML = screenHtml();
  tabs.innerHTML = TABS.map(([id, label, ic]) =>
    `<button data-act="tab" data-id="${id}" ${state.tab === id ? 'aria-current="page"' : ''}>
      ${icon(ic, 21)}<span>${label}</span></button>`).join('');
  app.scrollTop = keepScroll ? scroll : 0;
}

/* -------------------------------------------------------------------- events */

const FOCALS = [14, 16, 18, 20, 24, 28, 35, 40, 50, 60, 70, 85, 100, 105, 135, 150, 180, 200, 250, 300, 400, 500, 600];

function stepFocal(direction) {
  const r = currentSolve();
  const { lens } = lensFor(r.scene);
  const usable = FOCALS.filter((f) => f >= lens.min && f <= lens.max);
  if (!usable.length) return;
  let index = usable.findIndex((f) => f >= r.focal - 0.01);
  if (index < 0) index = usable.length - 1;
  const next = usable[Math.min(Math.max(index + direction, 0), usable.length - 1)];
  state.focal = next;
}

function commitGear() {
  saveGear(state.gear);
}

app.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  const v = el.dataset.v;
  const g = state.gear;
  let keepScroll = false;

  switch (act) {
    case 'scene':
      state.sceneId = id; state.lightId = null; state.focal = null;
      state.lock = {}; state.allLight = false; state.customLight = null; state.step = 'light';
      state.comp = null;
      break;
    case 'sun-locate':
      locate();
      return;
    case 'sun-sky':
      state.customLight = estimateLight({ date: new Date(), ...state.sun.place, sky: v });
      state.lightId = 'sun'; state.step = 'result'; state.comp = null; rememberLast();
      break;
    case 'light':
      state.lightId = id; state.customLight = null; state.step = 'result'; state.comp = null; rememberLast();
      break;
    case 'all-light': state.allLight = true; keepScroll = true; break;
    case 'resume': {
      state.sceneId = el.dataset.scene;
      state.focal = null; state.lock = {}; state.comp = null;
      if (el.dataset.light === 'sun') {
        const place = readPlace();
        // Re-estimated for now, not replayed from earlier. Without a position
        // there is nothing to re-estimate from, so fall back to the picker.
        if (!place) { state.step = 'light'; break; }
        state.customLight = estimateLight({ date: new Date(), ...place, sky: el.dataset.sky || 'clear' });
      }
      state.lightId = el.dataset.light; state.step = 'result';
      break;
    }
    case 'back':
      state.step = state.step === 'result' ? 'light' : 'scenes';
      if (state.step === 'light') state.lock = {};
      break;
    case 'tab':
      state.tab = id;
      if (id === 'shoot' && !state.sceneId) state.step = 'scenes';
      break;
    case 'lock-shutter': state.lock = { ...state.lock, t: Number(v) }; keepScroll = true; break;
    case 'lock-aperture': state.lock = { ...state.lock, N: Number(v) }; keepScroll = true; break;
    case 'unlock': state.lock = {}; keepScroll = true; break;
    case 'home': state.tab = 'shoot'; state.step = 'scenes'; break;
    case 'help': state.showIntro = true; break;
    case 'theme': setTheme(v); keepScroll = true; break;
    case 'theme-toggle': setTheme(resolvedTheme(state.theme) === 'dark' ? 'light' : 'dark'); keepScroll = true; break;
    case 'take-alt': {
      const alternative = alternativeFor(currentSolve());
      if (!alternative) break;
      state.lock = { t: alternative.result.shutter.s, N: alternative.result.aperture.N };
      keepScroll = true;
      break;
    }
    case 'focal': stepFocal(Number(v)); keepScroll = true; break;
    case 'lens-pick':
      // Mounting a lens is a fact about the camera, so it is stored with the
      // gear and outlives the scene you happened to be looking at.
      g.activeLensId = id === 'auto' ? null : id;
      state.focal = null;
      commitGear();
      keepScroll = true;
      break;
    case 'way': {
      const r = currentSolve();
      const way = r.ways.find((w) => w.id === id);
      if (!way) break;
      if (way.id === 'iso') {
        g.isoCeiling = way.ceiling ?? way.settings.iso.v;
        saveGear(g);
      } else if (way.id === 'zoom') {
        state.focal = r.lens.min; g.activeLensId = r.lens.id; saveGear(g);
      } else {
        state.lock = { ...state.lock, t: way.settings.shutter.s };
      }
      keepScroll = true;
      break;
    }
    // Keeping the scroll position means the toggle does not throw the settings
    // rows off screen just because the photographer glanced at the example.
    case 'preview-mode': state.previewMode = v; keepScroll = true; break;
    case 'variant-axis': state.variantAxis = v; keepScroll = true; break;
    // Stored even when it matches the suggestion, so a deliberate agreement is
    // not silently re-derived if the suggestion later changes.
    case 'comp': state.comp = v; keepScroll = true; break;
    case 'guide-focal': state.guideFocal = Number(v); keepScroll = true; break;
    case 'guide-tab': state.guideTab = v; state.guideScene = null; break;
    case 'guide-scene': state.guideScene = id; break;
    case 'guide-back': state.guideScene = null; break;
    case 'shot-pick': pickShot(id); return;
    case 'shot-clear':
      try { localStorage.removeItem(SHOT_KEY + id); } catch { /* nothing to remove */ }
      state.shotError = null; keepScroll = true;
      break;
    case 'scene-guide': state.tab = 'guide'; state.guideTab = 'scenes'; state.guideScene = id; break;
    case 'shoot-scene':
      state.sceneId = id; state.lightId = null; state.customLight = null;
      state.focal = null; state.lock = {}; state.allLight = false; state.comp = null;
      state.guideScene = null; state.tab = 'shoot'; state.step = 'light';
      break;
    case 'iso-ceiling': g.isoCeiling = Number(v); commitGear(); keepScroll = true; break;
    case 'slowest': g.userSlowest = Number(v); commitGear(); keepScroll = true; break;
    case 'stab': g.stabiliserStops = Number(v); commitGear(); keepScroll = true; break;
    case 'crop': {
      const index = CROPS.findIndex(([c]) => c === g.crop);
      g.crop = CROPS[(index + 1) % CROPS.length][0];
      commitGear(); keepScroll = true;
      break;
    }
    case 'lens-edit': state.editingLens = state.editingLens === id ? null : id; keepScroll = true; break;
    case 'lens-add': {
      const lens = { id: 'l' + Date.now().toString(36), name: 'New lens', min: 35, max: 35, wideMin: 2.8, wideMax: 2.8, stabilised: false };
      g.lenses.push(lens); state.editingLens = lens.id; commitGear(); keepScroll = true;
      break;
    }
    case 'lens-remove':
      if (g.lenses.length <= 1) break;
      g.lenses = g.lenses.filter((l) => l.id !== id);
      if (g.activeLensId === id) { g.activeLensId = null; state.focal = null; }
      state.editingLens = null; commitGear(); keepScroll = true;
      break;
    case 'lens-is': {
      const lens = g.lenses.find((l) => l.id === id);
      lens.stabilised = !lens.stabilised; commitGear(); keepScroll = true;
      break;
    }
    case 'lens-wide-min': case 'lens-wide-max': {
      const lens = g.lenses.find((l) => l.id === id);
      const key = act === 'lens-wide-min' ? 'wideMin' : 'wideMax';
      lens[key] = Number(v);
      if (lens.min === lens.max) lens.wideMax = lens.wideMin;
      if (lens.wideMax < lens.wideMin) lens.wideMax = lens.wideMin;
      commitGear(); keepScroll = true;
      break;
    }
    case 'reset-gear':
      state.gear = structuredClone(DEFAULT_GEAR);
      state.focal = null; state.editingLens = null; state.lock = {};
      commitGear();
      break;
    default: return;
  }
  render({ keepScroll });
});

app.addEventListener('change', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const lens = state.gear.lenses.find((l) => l.id === el.dataset.id);
  if (!lens) return;
  if (el.dataset.act === 'lens-name') lens.name = el.value.slice(0, 40) || 'Lens';
  if (el.dataset.act === 'lens-min') lens.min = Math.min(Math.max(Number(el.value) || 1, 1), 2000);
  if (el.dataset.act === 'lens-max') lens.max = Math.min(Math.max(Number(el.value) || lens.min, lens.min), 2000);
  if (lens.min === lens.max) lens.wideMax = lens.wideMin;
  state.focal = null;
  commitGear();
  render({ keepScroll: true });
});

sheet.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  dismissIntro();
  if (el.dataset.act === 'intro-gear') state.tab = 'gear';
  render();
});

tabs.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act="tab"]');
  if (!el) return;
  // Tapping the tab you are already on takes you back to its start, which is
  // the quickest way out of a shot you have finished with.
  const alreadyHere = state.tab === el.dataset.id;
  state.tab = el.dataset.id;
  if (state.tab === 'shoot' && (alreadyHere || !state.sceneId)) state.step = 'scenes';
  render();
});

try {
  state.theme = localStorage.getItem(THEME_KEY) ?? 'system';
  state.showIntro = !localStorage.getItem(SEEN_KEY);
} catch {
  state.showIntro = true;
}
applyTheme();
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (state.theme === 'system') { applyTheme(); render({ keepScroll: true }); }
});

render();

// An installed field app is opened and never thought about again, so a new
// version has to announce itself rather than wait to be noticed.
function announceUpdate() {
  if (document.querySelector('.update')) return;
  const bar = document.createElement('button');
  bar.className = 'update';
  bar.textContent = 'A newer version is ready. Tap to load it';
  bar.addEventListener('click', () => location.reload());
  document.body.appendChild(bar);
}

if ('serviceWorker' in navigator) {
  const wasControlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // A first install is not an update, and there is nothing to reload for.
    if (wasControlled) announceUpdate();
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
