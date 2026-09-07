// Stops — the tutorial.
//
// Three screens: pick a scene, pick the light, read the card. The card is the
// whole product and it has no controls on it. Under it sit the chips, which
// are questions rather than settings: tap one and the photograph changes to
// show the answer, one number moves, and the card says what it cost. Tap it
// again and you are back at the shot.
//
// Everything the first app could do and this one cannot is deliberate. There
// is no aperture ladder to walk, no lock, no exposure compensation, no
// alternative solve. A beginner does not need a calculator; they need to be
// told what to set, shown what it looks like, and sent outside.

import { lightById } from '../../app/js/data.js';
import { LESSONS, lessonFor } from './lessons.js';
import { shotFor, costOf } from './shot.js';
import { chipsFor, resultOf } from './chips.js';
import { snapShutter } from '../../app/js/ladders.js';

const app = document.getElementById('app');
const tabsEl = document.getElementById('tabs');
const sheetEl = document.getElementById('sheet');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = {
  tab: 'shoot',
  step: 'scenes',      // scenes → light → card
  sceneId: null,
  lightId: null,
  change: null,        // { axis, step } — the chip that is on, if any
  intro: 0,            // which intro card, or null once it is done
};

/* ── Storage ─────────────────────────────────────────────────────────────── */

const KEY = 'stops-next';
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ seen: true, theme: state.theme })); } catch { /* private mode */ }
}
function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

const ICON = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  home: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V21H3z"/></svg>',
  camera: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="3.6"/><path d="M3 8.5h3.5L8 6h8l1.5 2.5H21V20H3z"/></svg>',
  book: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5h6a2.5 2.5 0 012.5 2.5v13A2 2 0 0010.5 18H4z"/><path d="M20 4.5h-6A2.5 2.5 0 0011.5 7v13A2 2 0 0113.5 18H20z"/></svg>',
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
  warn: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4M12 17.2v.1"/></svg>',
  filter: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/></svg>',
};

/* ── Photograph paths ────────────────────────────────────────────────────── */
// The scene picture is the one in photos/bases/, not the one the first app
// uses. They are different photographs: the variations were generated from the
// bases, so pairing a card with the first app's picture would change the face
// the moment a chip was tapped. The tile uses the same file as the card, which
// also means one picture per scene rather than two in the offline bundle.
//
// Rewritten wholesale by the bundler, which inlines every picture as a data
// URI, so this is the one place a path is built.
const photoSrc = (path) => `../app/${path}`;
const scenePhoto = (id) => photoSrc(`photos/bases/${id}.jpg`);

/* ── Screen 1: the scenes ────────────────────────────────────────────────── */

function scenesScreen() {
  const tiles = LESSONS.map((s) => `
    <button class="tile" data-act="scene" data-id="${s.id}">
      <img src="${scenePhoto(s.id)}" alt="" loading="lazy">
      <span class="tile__label">
        <span class="tile__name">${esc(s.name)}</span>
        <span class="tile__hint">${esc(s.axes.sh ? 'shutter' : s.axes.ap && s.axes.fl ? 'aperture & lens' : s.axes.ap ? 'aperture' : 'lens')}</span>
      </span>
    </button>`).join('');
  return `${header({ title: 'What are you shooting?' })}
    <div class="wrap">
      <p class="lede">Twelve photographs worth learning. Pick one and you will be
        told exactly what to set, shown what it looks like, and sent outside.</p>
      <div class="tiles">${tiles}</div>
    </div>`;
}

/* ── Screen 2: the light ─────────────────────────────────────────────────── */

// A swatch, so the list can be skimmed by eye before it is read. Warm and
// bright at the top, cold and dark at the bottom, which is what the day does.
const SWATCH = {
  'harsh-sun': 'linear-gradient(145deg,#FFF4D6,#FFD98A)',
  'hazy-sun': 'linear-gradient(145deg,#FFF6E6,#F2D9A8)',
  'overcast': 'linear-gradient(145deg,#F4F5F6,#D5D9DD)',
  'heavy-cloud': 'linear-gradient(145deg,#C9CDD2,#9AA1A8)',
  'late-day': 'linear-gradient(145deg,#FFD9A0,#E08A4C)',
  'blue-hour': 'linear-gradient(145deg,#5C7CA8,#2A3E5E)',
  'night-street': 'linear-gradient(145deg,#3A3550,#15121F)',
  'bright-in': 'linear-gradient(145deg,#F6EFE2,#DBC9A8)',
  'room-night': 'linear-gradient(145deg,#C9A972,#6E5638)',
  'dim-in': 'linear-gradient(145deg,#8A6A44,#3A2C1C)',
};

function lightScreen() {
  const scene = lessonFor(state.sceneId);
  const rows = scene.lights.map((id) => {
    const l = lightById(id);
    return `<button class="light" data-act="light" data-id="${id}">
      <span class="light__sw" style="background:${SWATCH[id] ?? 'var(--card-2)'}"></span>
      <span><span class="light__name">${esc(l.name)}</span>
        <span class="light__sub">${esc(l.sub)}</span></span>
    </button>`;
  }).join('');
  return `${header({ title: 'What is the light like?', sub: scene.name, back: 'scenes' })}
    <div class="wrap">
      <p class="lede">Look up, not at a meter. The light does not change what you
        set — it changes what the camera has to do about it.</p>
      <div class="lights">${rows}</div>
    </div>`;
}

/* ── Screen 3: the card ──────────────────────────────────────────────────── */

function cardScreen() {
  const r = shotFor({ sceneId: state.sceneId, lightId: state.lightId, change: state.change });
  if (!r) { state.step = 'scenes'; return scenesScreen(); }
  const { scene, change } = r;

  const moved = change ? { ap: 'aperture', fl: 'focal', sh: 'shutter' }[change.axis] : null;
  const dial = (kind, k, v, note) => `
    <div class="dial ${moved === kind ? 'dial--moved' : ''} ${kind === 'iso' ? 'dial--auto' : ''}">
      <div class="dial__k">${k}</div><div class="dial__v">${v}</div>
      <div class="dial__n">${esc(note)}</div>
    </div>`;

  const caption = change
    ? `Changed: ${esc(resultOf(change))}.`
    : esc(scene.blurb);

  return `${header({ title: scene.name, sub: r.light.name, back: 'light', home: true })}
    <div class="wrap">
      <div class="shot">
        <img class="shot__img" src="${photoSrc(r.photo.src)}" alt="${esc(scene.name)}">
        <div class="shot__cap">
          <p>${caption}</p>
          <span class="shot__tag">${change ? 'What if' : 'The shot'}</span>
        </div>
        <div class="dials">
          ${dial('aperture', 'Aperture', r.aperture.label, apertureNote(r))}
          ${dial('shutter', 'Shutter', r.shutter.label, r.scene.tripod ? 'on a tripod' : 'hand-held')}
          ${dial('iso', 'ISO', 'Auto', `it will pick ${r.iso.label.replace('ISO ', '')}`)}
        </div>
        <div class="why">
          ${whyRow('fl', 'Lens', r)}
          ${whyRow('ap', 'Aperture', r)}
          ${whyRow('sh', 'Shutter', r)}
        </div>
      </div>
      ${notices(r)}
      ${askSection(scene, r)}
    </div>`;
}

function apertureNote(r) {
  return r.aperture.N <= 4 ? 'wide open' : r.aperture.N >= 16 ? 'right down' : 'mid-range';
}

/**
 * One line of reasoning per leg.
 *
 * The scene's own reasoning explains the shot, so on the axis a chip has
 * changed it is no longer describing what is on the card — "as wide as this
 * lens opens" under f/16 is simply wrong. That row is replaced with what the
 * change did and what it was before, and the other two are left alone, because
 * they have not moved.
 */
function whyRow(axis, label, r) {
  const key = { ap: 'aperture', fl: 'focal', sh: 'shutter' }[axis];
  const lead = axis === 'fl' ? `${r.focal} mm. ` : '';
  if (r.change && r.change.axis === axis) {
    const was = r.scene.axes[axis].steps[r.scene.axes[axis].ideal];
    const shown = axis === 'ap' ? `f/${was}` : axis === 'fl' ? `${was} mm` : snapShutter(was).label;
    const moved = axis === 'fl'
      ? 'and you have moved your feet to keep the subject the same size, not just turned the zoom ring'
      : `from ${shown}, which is the shot`;
    return `<div class="why__row"><span class="why__k">${label}</span>
      <span>${esc(lead)}<b style="color:var(--amber)">Changed</b> — ${esc(moved)}.
      ${esc(capital(resultOf(r.change)))}.</span></div>`;
  }
  return `<div class="why__row"><span class="why__k">${label}</span>
    <span>${esc(lead)}${esc(r.scene.why[key])}</span></div>`;
}

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* What the light is doing to this card, said once and plainly. */
function notices(r) {
  const out = [];
  if (r.over > 0.6) {
    const stops = Math.round(r.over);
    out.push(r.scene.nd
      ? note('amber', ICON.filter, `Fit a ${stops}-stop neutral-density filter.`,
          `A whole second of daylight is ${stops} stops more light than the lowest ISO
           can take. The filter is not an accessory here — it is how this photograph
           is made at all.`)
      : note('warn', ICON.warn, `${stops} stop${stops === 1 ? '' : 's'} too much light.`,
          `Even at ISO 100 this is brighter than these settings can hold. Wait for
           softer light, close the aperture, or use a faster shutter.`));
  }
  if (r.under > 0.6) {
    const stops = Math.round(r.under);
    out.push(note('warn', ICON.warn, `${stops} stop${stops === 1 ? '' : 's'} short of light.`,
      `The camera runs out of ISO before it gets there. Open the aperture, slow the
       shutter, or find more light.`));
  }
  if (r.change) {
    const cost = costOf({ sceneId: state.sceneId, lightId: state.lightId, change: r.change });
    if (Math.abs(cost) > 0.4) {
      const stops = Math.abs(cost).toFixed(0);
      out.push(note('amber', ICON.sun,
        cost > 0 ? `That costs ${stops} stop${stops === '1' ? '' : 's'} of light.`
                 : `That gives you back ${stops} stop${stops === '1' ? '' : 's'} of light.`,
        cost > 0
          ? `The camera makes it up on ISO, which is why the ISO climbed. Every
             creative decision is paid for somewhere — this is where.`
          : `The camera drops the ISO to match, which is cleaner. Light you do not
             spend on one setting is light another one gets.`));
    }
  }
  return out.join('');
}

const note = (kind, icon, head, body) =>
  `<div class="note note--${kind}"><span class="note__i">${icon}</span>
    <span><b>${esc(head)}</b>${esc(body.replace(/\s+/g, ' ').trim())}</span></div>`;

/* ── The chips ───────────────────────────────────────────────────────────── */

function askSection(scene, r) {
  const groups = chipsFor(scene);
  if (!groups.length) return '';
  const body = groups.map((g) => `
    <div class="ask__g">
      <div class="ask__q">${esc(g.question)}</div>
      <div class="chips">${g.chips.map((c) => {
        const on = r.change && r.change.axis === c.axis && r.change.step === c.step;
        return `<button class="chip" data-act="chip" data-axis="${c.axis}" data-step="${c.step}"
          aria-pressed="${on}">${esc(c.label)} <span class="chip__v">${esc(c.value)}</span></button>`;
      }).join('')}</div>
    </div>`).join('');
  return `<div class="ask">
      <div class="ask__h">What happens if I change something?</div>
      <div class="ask__s">Tap one to see it. Nothing here is a setting to fiddle with —
        it is the same photograph taken the other way, so you know what you are
        giving up before you give it up.</div>
      ${body}
      ${r.change ? '<button class="back-to" data-act="chip-off">Back to the shot</button>' : ''}
    </div>`;
}

/* ── The guide ───────────────────────────────────────────────────────────── */

function guideScreen() {
  return `${header({ title: 'How it works' })}
    <div class="wrap">
      <h2 class="g-h">Three things let light in</h2>
      <p class="g-p">A photograph is one measured amount of light. There are exactly
        three ways to change how much arrives, and <b>each of them changes the
        picture as well as the brightness</b>. That second half is the whole craft.</p>
      <div class="g-card">
        <div class="g-leg"><span class="g-leg__n">Aperture</span>
          <span class="g-leg__t">How wide the lens opens. <b>Wide open — a small
            f-number — lets in the most light and throws the background out of
            focus.</b> Stopped down keeps everything sharp and costs you light.</span></div>
        <div class="g-leg"><span class="g-leg__n">Shutter</span>
          <span class="g-leg__t">How long the light is let in for. <b>Fast freezes
            movement, slow lets it smear.</b> Slow also lets in far more light.</span></div>
        <div class="g-leg"><span class="g-leg__n">ISO</span>
          <span class="g-leg__t">How hard the camera amplifies what it got.
            <b>It is the only one of the three with no creative effect</b> — just
            grain when it goes high. That is why we let the camera set it.</span></div>
      </div>

      <h2 class="g-h">One stop</h2>
      <p class="g-p">A <b>stop</b> is a doubling or a halving of light. It is the unit
        everything is counted in: one stop slower on the shutter, one stop wider on
        the aperture and one stop up on the ISO all let in exactly the same extra
        light. Swap one for another and the exposure does not move — but the
        picture does.</p>

      <h2 class="g-h">Put the camera in M with Auto ISO</h2>
      <p class="g-p">This is the setting this whole app rests on. <b>You choose the
        aperture and the shutter; the camera chooses the ISO.</b> You are in charge
        of both decisions that change the picture, and the camera handles the one
        that does not.</p>
      <p class="g-p">On most cameras: turn the dial to <b>M</b>, then set ISO to
        <b>AUTO</b> in the menu or on the ISO button. Set an upper limit of about
        6400 while you are learning.</p>

      <h2 class="g-h">Why the numbers look backwards</h2>
      <p class="g-p">f/2 is a <b>wider</b> opening than f/8. The number is a fraction of
        the lens's focal length, so a bigger number means a smaller hole. It is the
        one genuinely confusing piece of notation in photography and everyone trips
        on it. Smaller number, more light, blurrier background.</p>

      <h2 class="g-h">The lens is not a zoom ring</h2>
      <p class="g-p">Changing focal length and standing still just crops. The lesson in
        this app is the other one: <b>change the focal length and move your feet so
        the subject stays the same size.</b> Do that, and the background swells or
        shrinks behind them. That is the real difference between a wide lens and a
        long one, and it has nothing to do with how much fits in the frame.</p>

      <h2 class="g-h">Your kit</h2>
      <p class="g-p">Everything here is written for <b>a 24–105 mm f/4 zoom on a
        full-frame camera</b> — the lens most of these cameras are sold with. Where
        that lens is the limit, the card says so rather than pretending.</p>
    </div>`;
}

/* ── The intro ───────────────────────────────────────────────────────────── */

const INTRO = [
  { k: 'What this is',
    t: 'A tutorial, not a calculator.',
    p: ['You have a camera that can do anything, and a dial marked M that you have not turned yet. This app is here to get you through that in an afternoon.',
        'It will not work out settings for you. It will tell you what to set for twelve photographs worth taking, show you what they look like, and then get out of your way.'] },
  { k: 'How to use it',
    t: 'Pick a scene. Pick the light. Go shoot.',
    p: ['Three taps and you have a card with two numbers on it. Those are the numbers. Put them in the camera.',
        'There is nothing to configure and nothing to tune. If the card is not what you want, the chips under it show you the same photograph taken the other way.'] },
  { k: 'Before you start',
    t: 'Put the camera in M, and set ISO to Auto.',
    p: ['Manual mode with Auto ISO means you make the two decisions that change the picture — how wide the lens opens and how long it stays open — and the camera quietly handles the third.',
        'That is the only camera setup this app asks of you. The Guide tab explains why if you would like to know.'] },
];

function introSheet() {
  const c = INTRO[state.intro];
  const last = state.intro === INTRO.length - 1;
  return `<div class="sheet">
    <div class="sheet__in">
      <div class="sheet__k">${esc(c.k)}</div>
      <h1 class="sheet__t">${esc(c.t)}</h1>
      ${c.p.map((p) => `<p class="sheet__p">${esc(p)}</p>`).join('')}
    </div>
    <div class="sheet__acts">
      <div class="dots">${INTRO.map((_, i) => `<span class="dot" data-on="${i === state.intro ? 1 : 0}"></span>`).join('')}</div>
      <button class="primary" data-act="intro-next">${last ? 'Start' : 'Next'}</button>
      ${last ? '' : '<button class="ghost" data-act="intro-done">Skip</button>'}
    </div>
  </div>`;
}

/* ── Chrome ──────────────────────────────────────────────────────────────── */

function header({ title, sub, back, home }) {
  return `<div class="top">
    ${back ? `<button class="top__back" data-act="back" data-to="${back}" aria-label="Back">${ICON.back}</button>` : '<span style="width:34px;flex:none"></span>'}
    <div class="top__titles">
      <div class="top__title">${esc(title)}</div>
      ${sub ? `<div class="top__sub">${esc(sub)}</div>` : ''}
    </div>
    ${home ? `<button class="top__act" data-act="home" aria-label="All scenes">${ICON.home}</button>` : '<span style="width:34px;flex:none"></span>'}
  </div>`;
}

function tabs() {
  const tab = (id, icon, label) => `<button class="tab" data-act="tab" data-id="${id}"
    ${state.tab === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;
  return tab('shoot', ICON.camera, 'Shoot') + tab('guide', ICON.book, 'Guide');
}

/* ── Render ──────────────────────────────────────────────────────────────── */

function render() {
  sheetEl.innerHTML = state.intro === null ? '' : introSheet();
  app.innerHTML = state.tab === 'guide' ? guideScreen()
    : state.step === 'card' ? cardScreen()
    : state.step === 'light' ? lightScreen()
    : scenesScreen();
  tabsEl.innerHTML = tabs();
}

/* ── Events ──────────────────────────────────────────────────────────────── */

function onClick(event) {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const { act, id, to, axis, step } = el.dataset;
  const keepScroll = act === 'chip' || act === 'chip-off';

  switch (act) {
    case 'intro-next':
      if (state.intro >= INTRO.length - 1) { state.intro = null; save(); }
      else state.intro += 1;
      break;
    case 'intro-done': state.intro = null; save(); break;
    case 'scene': state.sceneId = id; state.change = null; state.step = 'light'; break;
    case 'light': state.lightId = id; state.change = null; state.step = 'card'; break;
    case 'chip':
      // A chip that is already on turns off, so the card is always one tap from
      // the shot it is actually recommending.
      state.change = state.change && state.change.axis === axis && state.change.step === step
        ? null : { axis, step };
      break;
    case 'chip-off': state.change = null; break;
    case 'back': state.step = to === 'scenes' ? 'scenes' : 'light'; state.change = null; break;
    case 'home': state.tab = 'shoot'; state.step = 'scenes'; state.change = null; break;
    case 'tab':
      state.tab = id;
      if (id === 'shoot' && !state.sceneId) state.step = 'scenes';
      break;
    default: return;
  }
  const y = app.scrollTop;
  render();
  app.scrollTop = keepScroll ? y : 0;
}

document.addEventListener('click', onClick);

if (load().seen) state.intro = null;
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
