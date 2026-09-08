// Off Auto, the tutorial.
//
// Three screens: pick a scene, pick the light, read the card. The card is the
// whole product. It states the shot and has no controls on it. Under the
// photograph sit the chips, which are questions rather than settings: tap one
// and the photograph changes to show the answer, one number moves, and the card
// says what it cost.
//
// Everything the first app can do and this one cannot is deliberate. There is
// no aperture ladder to walk, no lock, no exposure compensation, no alternative
// solve. A beginner does not need a calculator. They need to be told what to
// set, shown what it looks like, and sent outside.

import { LIGHT, lightById, MOVERS, DEPTHS } from '../../app/js/data.js';
import { FULL_STOPS, snapShutter, snapAperture } from '../../app/js/ladders.js';
import { handheldFloor, motionThreshold, apertureForDepth } from '../../app/js/optics.js';
import { LOCKUP, lockup } from './brand.js';
import { LESSONS, lessonFor } from './lessons.js';
import { shotFor, costOf } from './shot.js';
import { chipsFor, resultOf, shotValue } from './chips.js';
import { STANDARD, CROP, loadGear, saveGear, normalise, lensesIn, lensAdvice } from './gear.js';

const app = document.getElementById('app');
const tabsEl = document.getElementById('tabs');
const sheetEl = document.getElementById('sheet');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tidy = (s) => String(s).replace(/\s+/g, ' ').trim();
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const state = {
  tab: 'shoot',
  step: 'scenes',        // scenes, light, card
  sceneId: null,
  lightId: null,
  change: null,          // { axis, step } if a chip is on
  intro: 0,              // which intro card, or null once it is done
  guideTab: 'theory',
  guideFocal: 50,
  gear: loadGear(),
  lensForm: false,
  lensError: '',
};

const SEEN = 'stops-next-seen';
const seen = {
  get() { try { return localStorage.getItem(SEEN) === '1'; } catch { return false; } },
  set(v) { try { v ? localStorage.setItem(SEEN, '1') : localStorage.removeItem(SEEN); } catch { /* private mode */ } },
};

/* ── Icons ───────────────────────────────────────────────────────────────── */

const ICON = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  home: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V21H3z"/></svg>',
  camera: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="3.6"/><path d="M3 8.5h3.5L8 6h8l1.5 2.5H21V20H3z"/></svg>',
  book: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5h6a2.5 2.5 0 012.5 2.5v13A2 2 0 0010.5 18H4z"/><path d="M20 4.5h-6A2.5 2.5 0 0011.5 7v13A2 2 0 0113.5 18H20z"/></svg>',
  lens: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="3.4"/></svg>',
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
  warn: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4M12 17.2v.1"/></svg>',
  filter: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/></svg>',
  tick: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  down: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
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

const TEACHES = (s) => (s.axes.sh ? 'shutter speed'
  : s.axes.ap && s.axes.fl ? 'aperture and lens'
  : s.axes.ap ? 'aperture' : 'lens');

function scenesScreen() {
  const tiles = LESSONS.map((s) => `
    <button class="tile" data-act="scene" data-id="${s.id}">
      <img src="${scenePhoto(s.id)}" alt="" loading="lazy">
      <span class="tile__scrim"></span>
      <span class="tile__label">
        <span class="tile__name">${esc(s.name)}</span>
        <span class="tile__hint">${esc(TEACHES(s))}</span>
      </span>
    </button>`).join('');
  return `<div class="top top--brand">${LOCKUP}</div>
    <div class="wrap">
      <h1 class="h1">What are you shooting?</h1>
      <p class="lede">Twelve photographs worth learning. Pick one and you will be told
        exactly what to set, shown what it looks like, and sent outside.</p>
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
  return `${header({ title: 'What is the light like?', sub: scene.name, back: 'scenes', home: true })}
    <div class="wrap">
      <p class="lede">Look up, not at a meter. The light does not change what you set.
        It changes what the camera has to do about it.</p>
      <div class="lights">${rows}</div>
    </div>`;
}

/* ── Screen 3: the card ──────────────────────────────────────────────────── */

function cardScreen() {
  const r = shotFor({ sceneId: state.sceneId, lightId: state.lightId, change: state.change });
  if (!r) { state.step = 'scenes'; return scenesScreen(); }
  const { scene, change } = r;

  const caption = change ? `Changed: ${esc(resultOf(change))}.` : esc(scene.blurb);

  return `${header({ title: scene.name, sub: r.light.name, back: 'light', home: true })}
    <div class="wrap">
      <div class="shot">
        <img class="shot__img" src="${change ? photoSrc(r.photo.src) : scenePhoto(scene.id)}"
             alt="${esc(scene.name)}">
        <div class="shot__cap">
          <p>${caption}</p>
          <span class="shot__tag">${change ? 'What if' : 'The shot'}</span>
        </div>
        ${askSection(scene, r)}
      </div>
      ${idealPanel(r)}
      ${notices(r)}
      ${lensPanel(r)}
    </div>`;
}

/**
 * The settings, on a lighter panel than anything around it.
 *
 * This is the part of the page that answers the question the photographer came
 * with, so it is the part that has to win the eye. The chips sit above it,
 * attached to the photograph they change, and this sits below them raised out
 * of the page.
 */
function idealPanel(r) {
  const moved = r.change ? { ap: 'aperture', fl: 'focal', sh: 'shutter' }[r.change.axis] : null;
  const dial = (kind, k, v, note) => `
    <div class="dial ${moved === kind ? 'dial--moved' : ''} ${kind === 'iso' ? 'dial--auto' : ''}">
      <div class="dial__k">${k}</div><div class="dial__v">${v}</div>
      <div class="dial__n">${esc(note)}</div>
    </div>`;

  return `<section class="ideal ${r.change ? 'ideal--changed' : ''}">
    <div class="ideal__eyebrow">
      <span>${r.change ? 'With your change' : 'The ideal settings'}</span>
      ${r.change ? '<button data-act="chip-off">Back to the ideal</button>' : ''}
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
  </section>`;
}

function apertureNote(r) {
  return r.aperture.N <= 4 ? 'wide open' : r.aperture.N >= 16 ? 'right down' : 'mid-range';
}

/**
 * One line of reasoning per leg.
 *
 * The scene's own reasoning explains the shot, so on the axis a chip has
 * changed it is no longer describing what is on the card. "As wide as this lens
 * opens" under f/16 is simply wrong. That row is replaced with what the change
 * did and what it was before, and the other two are left alone, because they
 * have not moved.
 */
function whyRow(axis, label, r) {
  const key = { ap: 'aperture', fl: 'focal', sh: 'shutter' }[axis];
  const lead = axis === 'fl' ? `${r.focal} mm. ` : '';
  if (r.change && r.change.axis === axis) {
    const was = shotValue(r.scene, axis);
    const shown = axis === 'ap' ? `f/${was}` : axis === 'fl' ? `${was} mm` : snapShutter(was).label;
    const moved = axis === 'fl'
      ? 'and you have moved your feet to keep the subject the same size, not just turned the zoom ring'
      : `from ${shown}, which is the shot`;
    return `<div class="why__row"><span class="why__k">${label}</span>
      <span>${esc(lead)}<b class="amber">Changed</b>, ${esc(moved)}.
      ${esc(capital(resultOf(r.change)))}.</span></div>`;
  }
  return `<div class="why__row"><span class="why__k">${label}</span>
    <span>${esc(lead)}${esc(r.scene.why[key])}</span></div>`;
}

/* What the light is doing to this card, said once and plainly. */
function notices(r) {
  const out = [];
  if (r.over > 0.6) {
    const stops = Math.round(r.over);
    out.push(r.scene.nd
      ? note('amber', ICON.filter, `Fit a ${stops}-stop neutral-density filter.`,
          `A whole second of daylight is ${stops} stops more light than the lowest ISO can
           take. The filter is not an accessory here. It is how this photograph is made
           at all.`)
      : note('warn', ICON.warn, `${stops} stop${stops === 1 ? '' : 's'} too much light.`,
          `Even at ISO 100 this is brighter than these settings can hold. Wait for softer
           light, close the aperture, or use a faster shutter.`));
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
      const plural = stops === '1' ? '' : 's';
      out.push(note('amber', ICON.sun,
        cost > 0 ? `That costs ${stops} stop${plural} of light.` : `That gives you back ${stops} stop${plural} of light.`,
        cost > 0
          ? `The camera makes it up on ISO, which is why the ISO climbed. Every creative
             decision is paid for somewhere, and this is where.`
          : `The camera drops the ISO to match, which is cleaner. Light you do not spend
             on one setting is light another one gets.`));
    }
  }
  return out.join('');
}

const note = (kind, icon, head, body) =>
  `<div class="note note--${kind}"><span class="note__i">${icon}</span>
    <span><b>${esc(head)}</b>${esc(tidy(body))}</span></div>`;

/* ── Your lens ───────────────────────────────────────────────────────────── */

function lensPanel(r) {
  const a = lensAdvice({ gear: state.gear, focal: r.focal, aperture: r.aperture.N });
  return `<section class="lensbox lensbox--${a.tone}">
    <div class="lensbox__h">
      <span class="lensbox__i">${a.tone === 'warn' ? ICON.warn : a.tone === 'good' ? ICON.tick : ICON.lens}</span>
      <span><span class="lensbox__k">Your lens</span>
        <span class="lensbox__v">${esc(a.verdict)}</span></span>
    </div>
    ${a.lines.map((l) => `<p class="lensbox__p">${esc(tidy(l))}</p>`).join('')}
    ${state.gear.own ? '' : '<button class="lensbox__add" data-act="tab" data-id="gear">Add your lens</button>'}
  </section>`;
}

/* ── The chips ───────────────────────────────────────────────────────────── */

function askSection(scene, r) {
  const groups = chipsFor(scene);
  if (!groups.length) return '';
  // With one axis the heading and the question say the same thing twice, so the
  // question becomes the heading and the strip stays two lines shorter.
  const single = groups.length === 1;
  const body = groups.map((g) => `
    <div class="ask__g">
      ${single ? '' : `<div class="ask__q">${esc(g.question)}</div>`}
      <div class="chips">${g.chips.map((c) => {
        const on = r.change && r.change.axis === c.axis && r.change.step === c.step;
        return `<button class="chip" data-act="chip" data-axis="${c.axis}" data-step="${c.step}"
          aria-pressed="${on}">${esc(c.label)} <span class="chip__v">${esc(c.value)}</span></button>`;
      }).join('')}</div>
    </div>`).join('');
  return `<div class="ask">
      <div class="ask__h">${single ? esc(groups[0].question) : 'What happens if I change something?'}</div>
      ${body}
    </div>`;
}

/* ── The gear page ───────────────────────────────────────────────────────── */

function gearScreen() {
  const own = state.gear.own;
  return `${header({ title: 'Your gear', home: true })}
    <div class="wrap">
      <p class="lede">Two things live here, and nothing else needs setting up.</p>

      <div class="lens-card lens-card--std">
        <div class="lens-card__k">The lens this app assumes</div>
        <div class="lens-card__n">${esc(STANDARD.name)}</div>
        <p class="lens-card__p">On a full-frame camera. No zoom like this is actually
          sold: it is a teaching lens, chosen so that every lesson here is reachable
          without owning anything else. The f/2 end is what lets a background dissolve
          completely, which is a thing worth seeing before you go looking for it.</p>
        <p class="lens-card__p">The kit zoom on a real camera is usually f/4. Add yours
          below and every card will say what changes.</p>
      </div>

      ${own ? `
        <div class="lens-card lens-card--own">
          <div class="lens-card__k">Your lens</div>
          <div class="lens-card__n">${esc(own.name)}</div>
          <p class="lens-card__p">Every card will now say whether this one can take the
            photograph, and what changes if you use it instead.</p>
          <div class="lens-card__acts">
            <button class="ghost-sm" data-act="lens-edit">Change it</button>
            <button class="ghost-sm" data-act="lens-remove">Remove it</button>
          </div>
        </div>` : ''}

      ${state.lensForm ? lensForm() : (own ? '' : `
        <button class="add-lens" data-act="lens-edit">
          <span>Add a lens of your own</span>
          <span class="add-lens__s">One is enough. The cards will talk about it.</span>
        </button>`)}

      <h2 class="g-h">Starting over</h2>
      <p class="g-p">The introduction is the three cards you saw the first time you
        opened this. It explains what the app is for and the one camera setting it
        asks of you.</p>
      <button class="ghost-sm" data-act="intro-replay">Show the introduction again</button>
    </div>`;
}

function lensForm() {
  const own = state.gear.own ?? {};
  return `<form class="lens-form" data-act="lens-save-form">
    <div class="lens-form__k">Your lens</div>
    <p class="lens-form__p">Read it off the front of the lens. A zoom has two focal
      lengths; a prime has one, so put the same number in both.</p>
    <div class="lens-form__grid">
      <label>From<input name="min" type="number" inputmode="numeric" min="4" max="2000"
        value="${own.min ?? ''}" placeholder="24"><span>mm</span></label>
      <label>To<input name="max" type="number" inputmode="numeric" min="4" max="2000"
        value="${own.max ?? ''}" placeholder="105"><span>mm</span></label>
      <label>Opens to<input name="widest" type="number" inputmode="decimal" step="0.1" min="0.7" max="45"
        value="${own.widest ?? ''}" placeholder="4"><span>f/</span></label>
    </div>
    <p class="lens-form__p">If yours gets darker as you zoom in, put in the darker
      number. That way nothing the app tells you will be optimistic.</p>
    ${state.lensError ? `<p class="lens-form__err">${esc(state.lensError)}</p>` : ''}
    <div class="lens-card__acts">
      <button class="primary-sm" type="submit" data-act="lens-save">Save</button>
      <button class="ghost-sm" type="button" data-act="lens-cancel">Cancel</button>
    </div>
  </form>`;
}

/* ── The guide ───────────────────────────────────────────────────────────── */

const GUIDE_TABS = [['theory', 'Theory'], ['stops', 'Stops'], ['shutter', 'Shutter'],
                    ['aperture', 'Aperture'], ['rules', 'Rules']];

function guideScreen() {
  const tabs = GUIDE_TABS.map(([id, label]) =>
    `<button data-act="guide-tab" data-v="${id}" aria-pressed="${state.guideTab === id}">${label}</button>`).join('');
  const body = { theory: guideTheory, stops: guideStops, shutter: guideShutter,
                 aperture: guideAperture, rules: guideRules }[state.guideTab]();
  return `${header({ title: 'How it works', home: true })}
    <div class="wrap"><div class="seg">${tabs}</div>${body}</div>`;
}

function guideTheory() {
  return `
    <h2 class="g-h">A photograph is one measured amount of light</h2>
    <p class="g-p">The sensor needs a certain amount of light to make a picture that is
      neither black nor white. Too little and the photograph is dark and muddy. Too
      much and the bright parts go blank and nothing brings them back.</p>
    <p class="g-p">There are exactly three ways to change how much light arrives, and
      <b>every one of them changes the picture as well as the brightness</b>. That
      second half is the whole craft. If they only changed the brightness, a camera
      would need one dial and nobody would need to learn anything.</p>

    <div class="g-card">
      <div class="g-leg"><span class="g-leg__n">Aperture</span>
        <span class="g-leg__t">How wide the lens opens. <b>Wide open, which means a
          small f-number, lets in the most light and throws the background out of
          focus.</b> Stopped down keeps everything sharp and costs you light.</span></div>
      <div class="g-leg"><span class="g-leg__n">Shutter</span>
        <span class="g-leg__t">How long the light is let in for. <b>Fast freezes
          movement, slow lets it smear.</b> Slow also lets in far more light.</span></div>
      <div class="g-leg"><span class="g-leg__n">ISO</span>
        <span class="g-leg__t">How hard the camera amplifies what it got.
          <b>It is the only one of the three with no creative effect</b>, just grain
          when it goes high.</span></div>
    </div>

    <h2 class="g-h">Why it is called a triangle</h2>
    <p class="g-p">Because the three are tied together. Fix the amount of light you
      need, and you cannot move one of them without moving another to compensate.
      Open the aperture a stop and you must halve the shutter time, or drop the ISO,
      or the picture comes out a stop too bright.</p>
    <p class="g-p">So there is never one right answer, only a set of answers that all
      give the same brightness and <b>look completely different from each other</b>.
      Choosing between them is the thing you are actually learning.</p>

    <h2 class="g-h">Two of the three are yours</h2>
    <p class="g-p">The aperture and the shutter change what the photograph looks like.
      The ISO does not. That asymmetry is the single most useful fact in this app,
      because it tells you which decisions are worth your attention.</p>
    <p class="g-p">So: <b>put the camera in M and set the ISO to Auto.</b> You take the
      two decisions that matter and the camera takes the one that does not. On most
      cameras that is the mode dial to M, then ISO set to AUTO in the menu or on the
      ISO button. Cap it at about 6400 while you are learning.</p>

    <div class="g-card">
      <div class="g-leg"><span class="g-leg__n">You set</span>
        <span class="g-leg__t"><b>Aperture</b>, for how much is sharp behind your
          subject. <b>Shutter</b>, for whether movement freezes or smears.</span></div>
      <div class="g-leg"><span class="g-leg__n">Camera sets</span>
        <span class="g-leg__t"><b>ISO</b>, to make the brightness come out right. Watch
          it: it is the bill for the two decisions you just took.</span></div>
    </div>

    <h2 class="g-h">Why the f-numbers look backwards</h2>
    <p class="g-p">f/2 is a <b>wider</b> opening than f/8. The number is a fraction of
      the lens's focal length, so a bigger number means a smaller hole. It is the one
      genuinely confusing piece of notation in photography and everyone trips on it.
      Smaller number, more light, blurrier background.</p>

    <h2 class="g-h">The lens is not a zoom ring</h2>
    <p class="g-p">Changing focal length while standing still just crops. The lesson in
      this app is the other one: <b>change the focal length and move your feet so the
      subject stays the same size in the frame.</b> Do that and the background swells
      or shrinks behind them. That is the real difference between a wide lens and a
      long one, and it has nothing to do with how much fits in the frame.</p>`;
}

function guideStops() {
  const cells = FULL_STOPS.shutter.map((_, i) =>
    `<span class="ladder__c">${FULL_STOPS.shutter[i]}</span>
     <span class="ladder__c">${FULL_STOPS.aperture[i]}</span>
     <span class="ladder__c">${FULL_STOPS.iso[i]}</span>`).join('');
  return `
    <p class="g-p mt-14">A <b>stop</b> is a doubling or a halving of light. It is the
      unit everything is counted in, and once you can count in it the three settings
      become interchangeable currency.</p>
    <p class="g-p">Every step down this table is <b>one stop brighter</b>. Give a stop
      in one column, take it back in another, and the exposure does not move. The
      picture does.</p>
    <div class="ladder-head">${ICON.down}<span>MORE LIGHT</span></div>
    <div class="g-card g-card--flush">
      <div class="ladder">
        <span class="ladder__h">Shutter</span><span class="ladder__h">Aperture</span><span class="ladder__h">ISO</span>
        ${cells}
      </div>
    </div>
    <p class="g-p">Read a row across and you have three settings that let in the same
      light. 1/250 at f/5.6 and ISO 800 is the same exposure as 1/125 at f/8 and
      ISO 800, or 1/250 at f/8 and ISO 1600.</p>
    <p class="g-p">The aperture column looks oddly spaced because it is: f-numbers go
      up by a factor of about 1.4 per stop, not 2, since the amount of light depends
      on the <b>area</b> of the opening rather than its width.</p>`;
}

function focalChips() {
  const opts = focalOptions();
  return `<div class="chips mt-12">${opts.map((f) =>
    `<button class="chip" data-act="guide-focal" data-v="${f}" aria-pressed="${state.guideFocal === f}">${f} mm</button>`).join('')}</div>`;
}

/** The focal lengths worth offering: the standard zoom, plus whatever they added. */
function focalOptions() {
  const out = new Set([24, 35, 50, 85, 105]);
  for (const lens of lensesIn(state.gear)) { out.add(lens.min); out.add(lens.max); }
  return [...out].sort((a, b) => a - b);
}

function guideShutter() {
  const focal = state.guideFocal;
  const bare = handheldFloor({ focal, crop: CROP, stabiliserStops: 0, userSlowest: null });
  const helped = handheldFloor({ focal, crop: CROP, stabiliserStops: 3, userSlowest: null });

  const moveRows = MOVERS.map((m) => {
    // Distance scales with focal length to hold the framing, and the focal length
    // then cancels out of the sum exactly. Framed the same way, a moving subject
    // needs the same shutter on any lens, which surprises people.
    const subject = m.at50 * (focal / 50);
    const t = motionThreshold({ focal, crop: CROP, speed: m.speed, subject });
    return [m.name, t ? snapShutter(t).label : 'any',
      `${m.speed} m/s, ${subject.toFixed(subject < 10 ? 1 : 0)} m away`];
  });

  return `
    <p class="g-p mt-14">There are two different blurs and beginners usually fix the
      wrong one. <b>Camera shake</b> smears the whole frame and comes from your hands.
      <b>Subject movement</b> smears only the thing that moved. The shutter has to
      beat whichever is worse.</p>
    ${focalChips()}

    <h2 class="g-h">Camera shake, at ${focal} mm</h2>
    <div class="g-card g-card--flush">
      ${row3('The reciprocal rule', snapShutter(bare).label, `1 divided by ${focal}`)}
      ${row3('With a stabilised lens', snapShutter(helped).label, 'about three stops of help')}
    </div>
    <p class="g-p">The old rule is that you can hand-hold down to one over the focal
      length. It is a rough thing, not a law: braced against a wall you will do
      better, and cold or tired you will do worse.</p>

    <h2 class="g-h">Subject movement, at ${focal} mm</h2>
    <div class="g-card g-card--flush">
      ${moveRows.map(([a, b, c]) => row3(a, b, c)).join('')}
    </div>
    <p class="g-p">These are the speeds at which the movement <b>starts</b> to show.
      Two stops faster and it is properly frozen.</p>
    <p class="g-p">Here is the part worth knowing: framed the same way, a moving
      subject needs <b>the same shutter speed on any lens</b>. A longer lens
      magnifies the movement, but you also stand further back, and the two cancel
      exactly. Only camera shake gets worse with a long lens.</p>`;
}

function guideAperture() {
  const focal = state.guideFocal;
  const rows = DEPTHS.map((d) => {
    const subject = d.at50 * (focal / 50);
    const N = apertureForDepth({ focal, crop: CROP, subject, far: subject + d.gap });
    return [d.name, N ? snapAperture(N).label : 'any',
      `${subject.toFixed(subject < 10 ? 1 : 0)} m away, ${d.gap} m deep`];
  });
  return `
    <p class="g-p mt-14">The aperture does two jobs at once, and they pull against each
      other. It sets <b>how much light gets in</b> and <b>how much of the scene is
      sharp</b>. You cannot buy one without paying in the other.</p>
    ${focalChips()}

    <h2 class="g-h">Enough depth, at ${focal} mm</h2>
    <div class="g-card g-card--flush">
      ${rows.map(([a, b, c]) => row3(a, b, c)).join('')}
    </div>
    <p class="g-p">Stop down at least this far and everything in that group comes out
      sharp. Notice how quickly it climbs when the subject is close: a face fills the
      frame at a metre and a half and suddenly f/2 will not hold both eyes.</p>

    <h2 class="g-h">The three things that set the blur</h2>
    <div class="g-card">
      <div class="g-leg"><span class="g-leg__n">Aperture</span>
        <span class="g-leg__t">Wider opening, less depth. The obvious one, and the only
          one most people think about.</span></div>
      <div class="g-leg"><span class="g-leg__n">Distance</span>
        <span class="g-leg__t">The closer you are to your subject, the less depth you
          have. This one matters more than the aperture and gets noticed less.</span></div>
      <div class="g-leg"><span class="g-leg__n">Background</span>
        <span class="g-leg__t">The further behind your subject it is, the more it
          blurs. A wall right behind a face will stay readable at any
          aperture.</span></div>
    </div>

    <h2 class="g-h">Do not stop down further than you need</h2>
    <p class="g-p">Past about f/11 on full frame, the picture starts getting softer
      again rather than sharper. Light bends around the edge of a very small opening,
      which is called <b>diffraction</b>. f/16 and f/22 are for when you need the
      depth or want to burn off light, not for sharpness.</p>`;
}

function guideRules() {
  const rules = [
    ['Sunny 16', 'f/16 at one over the ISO, in bright sun'],
    ['One stop', 'twice the light, or half of it'],
    ['Doubling the ISO', 'one stop brighter'],
    ['Opening one f-stop', 'one stop brighter'],
    ['Halving the shutter time', 'one stop darker'],
    ['Hand-held floor', 'one divided by the focal length'],
    ['A stabilised lens', 'about three stops slower'],
    ['Stars, before they trail', '500 divided by the focal length'],
    ['A 10-stop filter', 'turns 1/500 into two seconds'],
  ];
  return `
    <p class="g-p mt-14">Nine things worth remembering, none of which you have to work
      out on the spot.</p>
    <div class="g-card g-card--flush">
      ${rules.map(([k, v]) => `<div class="rule"><span class="rule__k">${esc(k)}</span><span class="rule__v">${esc(v)}</span></div>`).join('')}
    </div>
    <p class="g-p">Every rule here is a starting point. Your camera's meter and your
      own eyes outrank all of them, and the histogram outranks your eyes.</p>`;
}

const row3 = (a, b, c) => `<div class="r3"><span class="r3__a">${esc(a)}</span>
  <span class="r3__b">${esc(b)}</span><span class="r3__c">${esc(c)}</span></div>`;

/* ── The intro ───────────────────────────────────────────────────────────── */

const INTRO = [
  { k: 'What this is',
    t: 'A tutorial, not a calculator.',
    p: ['You have a camera that can do almost anything, and a dial marked M that you have not turned yet. This app exists to get you past that in an afternoon.',
        'It will not work settings out for you. It tells you what to set for twelve photographs worth taking, shows you what they look like, and then gets out of your way.'] },
  { k: 'How to use it',
    t: 'Pick a scene. Pick the light. Go and shoot.',
    p: ['Three taps and you have a card with two numbers on it. Those are the numbers. Put them in the camera.',
        'There is nothing to configure and nothing to tune. Under the photograph, a row of chips shows you the same scene shot the other way, so you can see what you would be giving up.'] },
  { k: 'Before you start',
    t: 'Put the camera in M, and set ISO to Auto.',
    p: ['Manual mode with Auto ISO means you make the two decisions that change the picture, which are how wide the lens opens and how long it stays open, and the camera quietly handles the third.',
        'That is the only camera setup this app asks of you. The Guide explains why, if you would like to know.'] },
];

function introSheet() {
  const c = INTRO[state.intro];
  const first = state.intro === 0;
  const last = state.intro === INTRO.length - 1;
  // The opening card is the only place the app gets to say what it is called,
  // so the mark is there at the size it wears on a home screen. The cards after
  // it carry the small lockup instead: enough to hold the thread, not enough to
  // repeat itself twice more before anybody has seen a photograph.
  return `<div class="sheet">
    <div class="sheet__in">
      ${lockup(first)}
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
  return `<div class="top ${back ? '' : 'top--flush'}">
    ${back ? `<button class="top__back" data-act="back" data-to="${back}" aria-label="Back">${ICON.back}</button>` : ''}
    <div class="top__titles">
      <div class="top__title">${esc(title)}</div>
      ${sub ? `<div class="top__sub">${esc(sub)}</div>` : ''}
    </div>
    ${home ? `<button class="top__act" data-act="home" aria-label="All scenes">${ICON.home}</button>`
           : '<span class="top__gap"></span>'}
  </div>`;
}

function tabs() {
  const tab = (id, icon, label) => `<button class="tab" data-act="tab" data-id="${id}"
    ${state.tab === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;
  return tab('shoot', ICON.camera, 'Shoot') + tab('guide', ICON.book, 'Guide') + tab('gear', ICON.lens, 'Gear');
}

/* ── Render ──────────────────────────────────────────────────────────────── */

function render() {
  sheetEl.innerHTML = state.intro === null ? '' : introSheet();
  app.innerHTML = state.tab === 'guide' ? guideScreen()
    : state.tab === 'gear' ? gearScreen()
    : state.step === 'card' ? cardScreen()
    : state.step === 'light' ? lightScreen()
    : scenesScreen();
  tabsEl.innerHTML = tabs();
}

/* ── Events ──────────────────────────────────────────────────────────────── */

function onClick(event) {
  const el = event.target.closest('[data-act]');
  if (!el) return;
  const { act, id, to, v, axis, step } = el.dataset;
  // A chip changes part of a long page, so throwing the reader back to the top
  // would lose their place at exactly the moment they are comparing two things.
  const keepScroll = act === 'chip' || act === 'chip-off' || act === 'guide-focal' || act === 'guide-tab';

  switch (act) {
    case 'intro-next':
      if (state.intro >= INTRO.length - 1) { state.intro = null; seen.set(true); }
      else state.intro += 1;
      break;
    case 'intro-done': state.intro = null; seen.set(true); break;
    case 'intro-replay': state.intro = 0; seen.set(false); state.tab = 'shoot'; state.step = 'scenes'; break;
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
      if (id !== 'gear') { state.lensForm = false; state.lensError = ''; }
      break;
    case 'guide-tab': state.guideTab = v; break;
    case 'guide-focal': state.guideFocal = Number(v); break;
    case 'lens-edit': state.lensForm = true; state.lensError = ''; break;
    case 'lens-cancel': state.lensForm = false; state.lensError = ''; break;
    case 'lens-remove': state.gear = { own: null }; saveGear(state.gear); state.lensForm = false; break;
    default: return;
  }
  const y = app.scrollTop;
  render();
  app.scrollTop = keepScroll ? y : 0;
}

function onSubmit(event) {
  const form = event.target.closest('form');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const lens = normalise(data);
  if (!lens) {
    state.lensError = 'That does not look like a lens. Check the two focal lengths and the f-number on the front of it.';
  } else {
    state.gear = { own: lens };
    saveGear(state.gear);
    state.lensForm = false;
    state.lensError = '';
  }
  render();
}

document.addEventListener('click', onClick);
document.addEventListener('submit', onSubmit);

// A way to see the first run again without clearing the browser's storage:
// open the page with ?intro on the end. The Gear page has a button for it too.
if (new URLSearchParams(location.search).has('intro')) seen.set(false);
if (seen.get()) state.intro = null;
render();

if ('serviceWorker' in navigator) {
  // A page already running under an older worker reloads itself once, the
  // moment the new one takes over. Without this a deploy is correct on the
  // server and stale on the phone until the reader thinks to reload twice,
  // which nobody does and nobody should have to.
  //
  // The guard matters: this event also fires on a first ever visit, when there
  // was no controller to replace, and reloading then would be a loop.
  let controlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) { controlled = true; return; }
    location.reload();
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
