#!/usr/bin/env node
// The base photograph has to be the one the card actually describes.
//
// Every scene has a base photograph and a set of variants, one per step of each
// axis it teaches. Where a step happens to land on the scene's own setting, the
// variant at that step and the base are the same photograph by definition: both
// are the shot at f/4, or at one second, or at 105 mm. So they must be the same
// file.
//
// This is not pedantry. The generator gave all three slow-shutter scenes a short
// exposure for their base and filed the real long exposure under sh-slow, where
// the app never draws it, because the card is already at that setting. The
// waterfall card, whose entire subject is water turned to silk, shipped showing
// water that was not. Nothing caught it: the file existed, the name was right,
// and only the picture was wrong.
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
const eyeball = [];
let pinned = 0;

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

      // Declared in variants-crops.json: the base was wrong once and was pinned
      // to this variant. That pinning is what gets enforced, so a re-ingest
      // cannot quietly put the short exposure back.
      if (declared[scene.id]?.base === `${axis}-${step}`) {
        pinned += 1;
        if (digest(file) !== digest(base)) {
          problems.push(
            `${scene.id}: the base is pinned to ${axis}-${step} and no longer matches it. `
            + `cp app/photos/variants/${name}.jpg app/photos/bases/${scene.id}.jpg`);
        }
        continue;
      }

      // Not pinned: the base and this variant are two renders of the same
      // setting, which is fine, or the base is wrong, which is not, and no
      // amount of hashing can tell the two apart. Only eyes can.
      if (digest(file) !== digest(base)) eyeball.push(`${scene.id}: base and ${axis}-${step} are both at ${scene.id === 'architecture' ? 'this setting but the variant was crop-corrected' : 'the same setting'}`);
    }
  }
}

if (problems.length) {
  console.error('\n' + problems.join('\n') + '\n');
  process.exit(1);
}
console.log(`${LESSONS.length} scenes, every variant present, ${pinned} bases pinned and matching.`);
if (eyeball.length) {
  console.log('\nNot enforced, worth an eye on the contact sheet if the set is ever regenerated:');
  for (const line of eyeball) console.log(`  ${line}`);
}
