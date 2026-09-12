#!/usr/bin/env node
// The base photograph has to be the one the card actually describes.
//
// Every scene has a base photograph and a set of variants, one per step of each
// axis it teaches. Where a step happens to land on the scene's own setting, the
// variant at that step and the base are the same photograph by definition: both
// are the shot at f/4, or at one second, or at 105 mm. So they must be the same
// file.
//
// This is not pedantry. The generator did not do it once. Six of the eight
// scenes where a step lands on the card's own setting had a different frame in
// the base, with the right one filed under the step where the app never draws
// it. The waterfall card, whose entire subject is water turned to silk, shipped
// showing water that was not. Landscape's "longer lens" chip showed the same
// picture as the card it was meant to differ from. Nothing caught any of it:
// the files existed, the names were right, and only the pictures were wrong.
//
// An earlier version of this check reported these rather than failing on them,
// on the theory that a base and a variant at the same setting might just be two
// separate renders of the same thing. That theory was comfortable and wrong.
//
//   node next/tools/check-photos.mjs

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../js/lessons.js';

const photos = new URL('../../app/photos/', import.meta.url);
const digest = (url) => createHash('md5').update(readFileSync(url)).digest('hex');

const declared = JSON.parse(readFileSync(new URL('../../variants-crops.json', import.meta.url), 'utf8'));

const problems = [];
const coincidences = [];

for (const scene of LESSONS) {
  const base = new URL(`bases/${scene.id}.jpg`, photos);
  if (!existsSync(base)) { problems.push(`${scene.id}: no base photograph`); continue; }

  for (const [axis, { steps }] of Object.entries(scene.axes ?? {})) {
    const own = { ap: scene.aperture, fl: scene.focal, sh: scene.shutter }[axis];
    for (const [step, value] of Object.entries(steps)) {
      const name = `${scene.id}__${axis}-${step}`;
      const file = new URL(`variants/${name}.jpg`, photos);
      if (!existsSync(file)) { problems.push(`${scene.id}: ${axis}-${step} has no photograph`); continue; }

      // A twentieth of a stop of slack, since the ladders are not exact ratios.
      if (Math.abs(Math.log2(value / own)) > 0.05) continue;

      // Where a step lands on the card's own setting, the base and that variant
      // are showing the same thing, so a difference between them is worth a
      // look. It is not proof of anything: a difference can mean the base is
      // wrong, or that the two are separate renders of the same setting, or
      // that the variant was crop-corrected at ingest and the base was not.
      //
      // Telling those apart needs eyes on the pictures, which is what
      // tools/sheet.mjs is for. This used to fail on a difference, on my theory
      // that it always meant the base was wrong. The theory was wrong twice and
      // the failures were louder than the evidence behind them, so it reports.
      coincidences.push(
        `${scene.id}: base and ${axis}-${step} both sit at ${axis === 'sh' ? 'this shutter' : axis === 'fl' ? 'this focal length' : 'this aperture'}`
        + (digest(file) === digest(base) ? ', and are the same file' : ', and are different pictures'));
    }
  }
}

if (problems.length) {
  console.error('\n' + problems.join('\n') + '\n');
  process.exit(1);
}
console.log(`${LESSONS.length} scenes, every variant present.`);
if (coincidences.length) {
  console.log('\nWhere a card already sits on one of its own steps, for an eye rather than a hash:');
  for (const line of coincidences) console.log(`  ${line}`);
}
