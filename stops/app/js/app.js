import { SCENES, LIGHT, sceneById, lightById } from './data.js';
import { recommend, describeStops } from './exposure.js';
import { loadGear, saveGear, chooseLens, DEFAULT_GEAR } from './gear.js';
import { widestAt } from './optics.js';
import { previewHtml, previewCaption } from './preview.js';
import { icon } from './icons.js';
import { snapShutter, snapAperture, snapIso, FULL_STOPS, ISO_CEILINGS } from './ladders.js';
import { estimateLight, SKY } from './sun.js';
import { BRANDS, brandById, HEDGE } from './cameras.js';
import { motionThreshold } from './optics.js';

const LAST_KEY = 'stops.last.v2';
const PLACE_KEY = 'stops.place.v1';

const state = {
  tab: 'shoot',
  step: 'scenes',
  sceneId: null,
  lightId: null,
  lensId: null,
  focal: null,
  lock: {},
  guideTab: 'stops',
  allLight: false,
  editingLens: null,
  customLight: null,
  sun: { status: 'idle' },
  gear: loadGear(),
};

const app = document.getElementById('app');
const tabs = document.getElementById('tabs');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------ solving */

function lensFor(scene) {
  const auto = chooseLens(state.gear, scene.focal);
  const lens = state.gear.lenses.find((l) => l.id === state.lensId) ?? auto.lens;
  const wanted = state.focal ?? auto.focal;
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

function currentSolve() {
  const scene = sceneById(state.sceneId);
  const light = currentLight();
  if (!scene || !light) return null;
  const { lens, focal } = lensFor(scene);
  return { scene, light, ...recommend({ scene, ev: light.ev, gear: state.gear, lens, focal, lock: state.lock }) };
}

function rememberLast() {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({
      sceneId: state.sceneId,
      lightId: state.lightId,
      sky: state.customLight?.cover?.id ?? null,
    }));
  } catch { /* storage unavailable — the resume card simply will not appear */ }
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
      <span class="tile__icon">${icon(s.icon, 22)}</span>
      <span><span class="tile__name">${esc(s.name)}</span><span class="tile__hint">${esc(s.hint)}</span></span>
    </button>`).join('');

  return `<div class="screen">
    <div class="bar">
      <span class="wordmark">${icon('aperture', 17)}<span>STOPS</span></span>
      <span style="flex:1"></span>
      <button data-act="tab" data-id="gear" style="color:var(--ink-3)" aria-label="Your gear">${icon('sliders', 20)}</button>
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
      <span class="mono" style="font-size:11px;color:var(--ink-4);letter-spacing:.08em">2 / 2</span>
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
 * lens that opens to f/1.8 — two dead chips out of four.
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
  return `Nothing here is moving, so the limit is your own hands — ${snapShutter(r.floor).label} is the slowest you said you trust.`;
}

const APERTURE_LESSON = 'Each step to the right doubles how much stays sharp, and costs one stop of light.';

/** The numbers are useless until you know which dial they go on. */
function cameraCard() {
  const g = state.gear;
  if (g.showHowTo === false) return '';
  const brand = brandById(g.brand);
  if (!brand) {
    return `<button class="card field mt-18" data-act="tab" data-id="gear">
      <span style="color:var(--amber)">${icon('camera', 21)}</span>
      <span class="field__body"><span class="field__value">Which camera do you shoot?</span>
      <span class="field__hint">Tell me, and I will say which dial to turn rather than only what to set it to.</span></span>
      <span style="color:var(--ink-4)">${icon('chevron', 16)}</span></button>`;
  }
  return `<div class="card mt-18" style="padding:14px 15px 15px">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="color:var(--amber)">${icon('camera', 19)}</span><span class="lab">On your ${esc(brand.name)}</span>
    </div>
    <ol class="howto mt-10">
      <li>${esc(brand.manual)}</li><li>${esc(brand.dials)}</li><li>${esc(brand.iso)}</li>
    </ol>
    <p class="muted mt-10">${esc(HEDGE)}</p>
  </div>`;
}

function lensSection(r) {
  const lenses = state.gear.lenses;
  const wanted = state.focal ?? r.scene.focal;

  const chips = lenses.map((l) => {
    const focal = Math.min(Math.max(wanted, l.min), l.max);
    const wide = snapAperture(widestAt(l, focal));
    return `<button class="pick" data-act="lens-pick" data-id="${l.id}" aria-pressed="${l.id === r.lens.id}">
      <span class="pick__name">${esc(l.name)}</span>
      <span class="pick__wide">f/${wide.N}${l.min === l.max ? '' : ' at ' + Math.round(focal)}</span>
    </button>`;
  }).join('');

  // Picking a lens that cannot reach the scene's usual focal length is a real
  // choice, not a mistake — but the photographer should be told what it costs.
  const short = Math.abs(Math.log2(r.focal / r.scene.focal)) > 0.2
    ? `<p class="field__hint mt-8">Not enough reach for the usual ${r.scene.focal} mm here — frame wider and crop in later.</p>`
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
    : r.iso.v <= (state.gear.isoMin ?? 100) ? 'Base ISO — the cleanest file your camera makes'
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
        <span class="bar__meta">${esc(light.name)} · <span class="mono" style="color:var(--amber-dim)">EV ${light.ev}</span> · ${Math.round(r.focal)} mm</span>
      </span>
    </div>

    <div class="mt-18">${previewHtml({ result: r, scene, gear: state.gear })}</div>
    <div class="preview__caption"><span>${esc(caption.left)}</span><span class="mono">${esc(caption.right)}</span></div>
    ${alert}

    <div class="mt-16" style="margin-left:calc(var(--pad) * -1); margin-right:calc(var(--pad) * -1); border-top:1px solid #1D2023">
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
    ${cameraCard()}

    <span class="lab mt-22">Shutter</span>
    <div class="grid-4 mt-8">${chipRow('shutter', shutterChoices, r.shutter.s, r.widest)}</div>
    <p class="lesson">${esc(shutterLesson(r))}</p>
    <span class="lab mt-16">Aperture</span>
    <div class="grid-4 mt-8">${chipRow('aperture', apertureChoices, r.aperture.N, r.widest)}</div>
    <p class="lesson">${esc(APERTURE_LESSON)}</p>
    ${zoom}
    ${locked ? `<div class="center mt-16"><button data-act="unlock" style="color:var(--amber);font-size:12.5px;font-weight:500">
      Back to the app's own answer</button></div>` : ''}
    ${ways}

    <div class="note" style="padding-left:0;padding-right:0">
      <span class="note__icon">${icon('info', 17)}</span>
      <span class="note__text">${esc(scene.tip)}</span>
    </div>
  </div>`;
}

function shutterWhy(r) {
  if (state.lock.t != null) return 'Your choice — the app is working around it';
  if (r.solvedBy === 'shutter') return 'Takes up whatever the other two leave';
  if (r.scene.shutterRule === '500') return r.scene.shutterWhy;
  const floor = r.floor;
  if (!r.scene.tripod && Math.abs(Math.log2(r.shutter.s / floor)) < 0.08) {
    return 'The slowest you said you trust hand-held';
  }
  return r.scene.shutterWhy ?? 'Fast enough for what is moving here';
}

function apertureWhy(r) {
  if (state.lock.N != null) return 'Your choice — the app is working around it';
  if (Math.abs(Math.log2(r.aperture.N / r.widest)) < 0.04) return 'Wide open — your lens has no more to give';
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

const GUIDE = {
  shutter: [
    ['A still portrait', '1/160'], ['Someone walking', '1/250'], ['Children, dogs', '1/500'],
    ['A running player', '1/1000'], ['Birds in flight', '1/2000'], ['Panning a cyclist', '1/60'],
    ['Silky water', '1s or longer'],
  ],
  aperture: [
    ['One eye sharp', 'f/1.8'], ['One whole face', 'f/2.8'], ['Two people side by side', 'f/4'],
    ['A small group', 'f/5.6'], ['Two rows of people', 'f/8'], ['Front to back landscape', 'f/11'],
  ],
};

function guideScreen() {
  const tabsHtml = ['stops', 'shutter', 'aperture', 'rules'].map((t) =>
    `<button data-act="guide-tab" data-v="${t}" aria-pressed="${state.guideTab === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('');

  let body = '';
  if (state.guideTab === 'stops') {
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
  } else {
    const rows = GUIDE[state.guideTab];
    body = `<div class="card mt-18 deftable">
      ${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</div>`;
  }

  return `<div class="screen">
    <h1 class="h1">Field guide</h1>
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
    const editor = !open ? '' : `<div style="padding:4px 15px 15px;border-top:1px solid #1D2023">
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

    return `<div><button class="lens" data-act="lens-edit" data-id="${l.id}" aria-expanded="${open}">
      <span style="color:var(--ink-3)">${icon('lens', 20)}</span>
      <span class="lens__body"><span class="lens__name">${esc(l.name)}</span>
      ${sub ? `<span class="lens__sub">${esc(sub)}</span>` : ''}</span>
      <span class="lens__wide mono">${wide}</span>
    </button>${editor}</div>`;
  }).join('');

  return `<div class="screen">
    <h1 class="h1">Your gear</h1>
    <p class="sub">Three numbers do most of the work, and they are the whole reason your answers differ from a printed chart.</p>

    <span class="lab mt-18">Camera</span>
    <div class="grid-auto mt-8">${BRANDS.map((brand) =>
      `<button class="pick" data-act="brand" data-id="${brand.id}" aria-pressed="${g.brand === brand.id}">
        <span class="pick__name">${esc(brand.name)}</span></button>`).join('')}</div>
    <button class="card field mt-10" data-act="howto">
      <span class="field__body"><span class="field__value">Which dial to turn</span>
      <span class="field__hint">Show how to set these on your camera, alongside the numbers.</span></span>
      <span class="chip" style="min-height:34px;padding:0 12px;${g.showHowTo === false ? '' : 'background:var(--amber);border-color:var(--amber);color:var(--amber-ink)'}">${g.showHowTo === false ? 'Off' : 'On'}</span>
    </button>

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
      ${lenses}
      <button class="lens" data-act="lens-add" style="justify-content:center;color:var(--amber)">
        ${icon('plus', 15)}<span style="font-size:13.5px;font-weight:600">Add a lens</span></button>
    </div>

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

    <div class="center mt-18"><button data-act="reset-gear" class="muted" style="text-decoration:underline">Reset to the example kit</button></div>
  </div>`;
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
  state.lensId = lens.id;
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
      state.sceneId = id; state.lightId = null; state.lensId = null; state.focal = null;
      state.lock = {}; state.allLight = false; state.customLight = null; state.step = 'light';
      break;
    case 'sun-locate':
      locate();
      return;
    case 'sun-sky':
      state.customLight = estimateLight({ date: new Date(), ...state.sun.place, sky: v });
      state.lightId = 'sun'; state.step = 'result'; rememberLast();
      break;
    case 'light':
      state.lightId = id; state.customLight = null; state.step = 'result'; rememberLast();
      break;
    case 'all-light': state.allLight = true; keepScroll = true; break;
    case 'resume': {
      state.sceneId = el.dataset.scene;
      state.lensId = null; state.focal = null; state.lock = {};
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
    case 'take-alt': {
      const alternative = alternativeFor(currentSolve());
      if (!alternative) break;
      state.lock = { t: alternative.result.shutter.s, N: alternative.result.aperture.N };
      keepScroll = true;
      break;
    }
    case 'brand': g.brand = id; commitGear(); keepScroll = true; break;
    case 'howto': g.showHowTo = !g.showHowTo; commitGear(); keepScroll = true; break;
    case 'focal': stepFocal(Number(v)); keepScroll = true; break;
    case 'lens-pick': {
      const lens = g.lenses.find((l) => l.id === id);
      if (!lens) break;
      const wanted = state.focal ?? sceneById(state.sceneId).focal;
      state.lensId = lens.id;
      state.focal = Math.min(Math.max(wanted, lens.min), lens.max);
      keepScroll = true;
      break;
    }
    case 'way': {
      const r = currentSolve();
      const way = r.ways.find((w) => w.id === id);
      if (!way) break;
      if (way.id === 'iso') {
        g.isoCeiling = way.ceiling ?? way.settings.iso.v;
        saveGear(g);
      } else if (way.id === 'zoom') {
        state.focal = r.lens.min; state.lensId = r.lens.id;
      } else {
        state.lock = { ...state.lock, t: way.settings.shutter.s };
      }
      keepScroll = true;
      break;
    }
    case 'guide-tab': state.guideTab = v; break;
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
      if (state.lensId === id) { state.lensId = null; state.focal = null; }
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
      state.lensId = null; state.focal = null; state.editingLens = null; state.lock = {};
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
  state.lensId = null; state.focal = null;
  commitGear();
  render({ keepScroll: true });
});

tabs.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act="tab"]');
  if (!el) return;
  state.tab = el.dataset.id;
  if (state.tab === 'shoot' && !state.sceneId) state.step = 'scenes';
  render();
});

render();

// An installed field app is opened and never thought about again, so a new
// version has to announce itself rather than wait to be noticed.
function announceUpdate() {
  if (document.querySelector('.update')) return;
  const bar = document.createElement('button');
  bar.className = 'update';
  bar.textContent = 'A newer version is ready — tap to load it';
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
