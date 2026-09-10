// Freezes the behaviour of the web app's model layer as data.
//
// The iOS port cannot be compiled or run in the environment it is written in,
// so instead of trusting the port it is held to this: every scene, every light
// it offers, every chip, and the exact numbers and words the web app produces
// for each. The Swift tests read the same file and assert the same answers, so
// the first thing the user sees in Xcode is whether the port is faithful, and
// it is a keystroke rather than an inspection.
//
//   node ios/tools/fixture.mjs
import { writeFileSync } from 'node:fs';

const next = new URL('../../next/js/', import.meta.url);
const { LESSONS } = await import(new URL('lessons.js', next));
const { shotFor, costOf, isoFor } = await import(new URL('shot.js', next));
const { chipsFor, shotValue } = await import(new URL('chips.js', next));
const { normalise, lensAdvice, STANDARD } = await import(new URL('gear.js', next));
const { snapShutter, snapAperture, snapIso } = await import(new URL('../../app/js/ladders.js', import.meta.url));
const { LIGHT, lightById, MOVERS, DEPTHS } = await import(new URL('../../app/js/data.js', import.meta.url));
const { motionThreshold, apertureForDepth, handheldFloor } = await import(new URL('../../app/js/optics.js', import.meta.url));

const round = (x, n = 6) => (x == null ? null : Number(x.toFixed(n)));

// The web app's copy is written as indented template literals and the browser
// collapses the whitespace when it lays it out. SwiftUI does not collapse
// anything, so the string the reader actually sees is the collapsed one, and
// that is what both the fixture and the generated Swift have to carry.
const tidy = (t) => String(t).replace(/\s+/g, ' ').trim();

// The ladders themselves, so a snapping difference shows up as a snapping
// difference rather than as a wrong ISO three layers downstream.
const ladders = {
  snapShutter: [1 / 3000, 1 / 1000, 1 / 60, 0.9, 1, 7, 29].map((s) => ({ in: round(s, 9), label: snapShutter(s).label })),
  snapAperture: [1.35, 2, 4.1, 5.6, 11.4, 40].map((N) => ({ in: N, label: snapAperture(N).label })),
  snapIso: [47, 100, 190, 3000, 60000].map((v) => ({ in: v, v: snapIso(v).v })),
};

const lights = LIGHT.map((l) => ({ id: l.id, name: l.name, sub: l.sub, ev: l.ev }));

const scenes = LESSONS.map((scene) => {
  const groups = chipsFor(scene);
  const atLight = scene.lights.map((id) => {
    const r = shotFor({ sceneId: scene.id, lightId: id });
    return {
      light: id, iso: r.iso.v, over: round(r.over), under: round(r.under),
      isoWanted: round(r.isoWanted, 4),
    };
  });
  const chips = groups.flatMap((g) => g.chips.map((c) => {
    const r = shotFor({ sceneId: scene.id, lightId: scene.lights[0], change: { axis: c.axis, step: c.step } });
    return {
      axis: c.axis, step: c.step, label: tidy(c.label), value: c.value, result: tidy(c.result),
      question: g.question,
      aperture: r.aperture.label, shutter: r.shutter.label, focal: r.focal, iso: r.iso.v,
      cost: round(costOf({ sceneId: scene.id, lightId: scene.lights[0], change: { axis: c.axis, step: c.step } }), 4),
    };
  }));
  return {
    id: scene.id, name: scene.name, blurb: tidy(scene.blurb),
    focal: scene.focal, aperture: scene.aperture, shutter: round(scene.shutter, 9),
    tripod: Boolean(scene.tripod), nd: Boolean(scene.nd),
    why: Object.fromEntries(Object.entries(scene.why).map(([k, v]) => [k, tidy(v)])),
    lights: scene.lights,
    shotValues: { ap: shotValue(scene, 'ap') ?? null, fl: shotValue(scene, 'fl'), sh: round(shotValue(scene, 'sh'), 9) },
    axes: Object.fromEntries(Object.entries(scene.axes).map(([axis, spec]) => [axis, spec.steps])),
    atLight, chips,
  };
});

// The lens advice, over the cases that matter: nothing added, a fast fifty, a
// real kit zoom, and a telephoto that cannot go wide.
const GEAR = [null, { min: 50, max: 50, widest: 1.8 }, { min: 24, max: 105, widest: 4 }, { min: 70, max: 300, widest: 5.6 }];
const lens = [];
for (const own of GEAR) {
  const gear = { own: own ? normalise(own) : null };
  for (const [focal, aperture] of [[105, 4], [50, 4], [35, 5.6], [24, 8], [105, 2]]) {
    const a = lensAdvice({ gear, focal, aperture });
    lens.push({
      own: gear.own ? { min: gear.own.min, max: gear.own.max, widest: gear.own.widest, name: gear.own.name } : null,
      focal, aperture, tone: a.tone, lensName: a.lens.name, verdict: tidy(a.verdict),
      lines: a.lines.map(tidy),
    });
  }
}

// The guide's two computed tables, at every focal length it offers, so the
// optics are held to the same standard as the settings.
const guide = [];
for (const focal of [24, 35, 50, 85, 105]) {
  guide.push({
    focal,
    floor: snapShutter(handheldFloor({ focal, crop: 1, stabiliserStops: 0, userSlowest: null })).label,
    stabilised: snapShutter(handheldFloor({ focal, crop: 1, stabiliserStops: 3, userSlowest: null })).label,
    movers: MOVERS.map((m) => {
      const subject = m.at50 * (focal / 50);
      return { name: m.name, subject: round(subject, 4),
               label: snapShutter(motionThreshold({ focal, crop: 1, speed: m.speed, subject })).label };
    }),
    depths: DEPTHS.map((d) => {
      const subject = d.at50 * (focal / 50);
      const N = apertureForDepth({ focal, crop: 1, subject, far: subject + d.gap });
      return { name: d.name, subject: round(subject, 4), label: N ? snapAperture(N).label : 'any' };
    }),
  });
}

const out = {
  note: 'Generated by ios/tools/fixture.mjs from the web app. Do not edit by hand.',
  standardLens: { name: STANDARD.name, min: STANDARD.min, max: STANDARD.max, widest: STANDARD.widest },
  isoSample: [{ aperture: 16, shutter: round(1 / 125, 9), ev: 15, iso: round(isoFor({ aperture: 16, shutter: 1 / 125, ev: 15 }), 4) }],
  ladders, lights, scenes, lens, guide,
};
writeFileSync(new URL('../OffAutoKit/Tests/OffAutoKitTests/model-fixture.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`model-fixture.json: ${scenes.length} scenes, ${scenes.reduce((n, s) => n + s.chips.length, 0)} chips, ${lens.length} lens cases`);
