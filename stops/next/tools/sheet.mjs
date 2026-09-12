// A contact sheet: every scene, the photograph the card shows, and the
// photograph behind each chip, labelled with the words on the chip and the
// setting it moves to.
//
// This exists because three rounds were spent arguing about which picture
// belonged where from filenames and hashes. A filename is not evidence of what
// is in a file. VARIANTS.md said to judge these on a contact sheet and it was
// right; this is that, generated from the app's own chip logic so the labels
// are the ones a reader actually sees.
//
//   node next/tools/sheet.mjs   then open the file it names

import { readFileSync, writeFileSync } from 'node:fs';
import { LESSONS } from '../js/lessons.js';
import { chipsFor } from '../js/chips.js';

const dir = new URL('../../app/photos/', import.meta.url).pathname + '/';
const uri = (p) => 'data:image/jpeg;base64,' + readFileSync(dir + p).toString('base64');
const fmt = (s) => (s >= 1 ? s + ' s' : '1/' + Math.round(1 / s));

let rows = '';
for (const scene of LESSONS) {
  let tiles = `<figure class="tile ideal">
      <img src="${uri('bases/' + scene.id + '.jpg')}" alt="">
      <figcaption><b>THE IDEAL</b><span>${scene.focal} mm &middot; f/${scene.aperture} &middot; ${fmt(scene.shutter)}</span><code>bases/${scene.id}.jpg</code></figcaption>
    </figure>`;
  for (const group of chipsFor(scene)) {
    for (const chip of group.chips) {
      const file = `variants/${scene.id}__${chip.axis}-${chip.step}.jpg`;
      tiles += `<figure class="tile">
      <img src="${uri(file)}" alt="">
      <figcaption><b>${chip.label}</b><span>${chip.value}</span><code>${scene.id}__${chip.axis}-${chip.step}</code></figcaption>
    </figure>`;
    }
  }
  rows += `<section><h2>${scene.name}<small>${scene.blurb}</small></h2><div class="strip">${tiles}</div></section>\n`;
}

const out = new URL('../../contact-sheet.html', import.meta.url).pathname;
writeFileSync(out, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Off Auto contact sheet</title><style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#0B0C0D;color:#ECEAE6;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;padding:20px}
h1{font-size:22px;margin:0 0 6px}
.lede{color:#A3A8AE;max-width:70ch;margin:0 0 26px}
section{margin-bottom:30px}
h2{font-size:16px;margin:0 0 9px;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
h2 small{font-weight:400;color:#71777E;font-size:12.5px}
.strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.tile{margin:0;background:#141618;border:1px solid #23262A;border-radius:11px;overflow:hidden}
.tile.ideal{border-color:#E8A33D}
.tile img{display:block;width:100%;height:auto}
figcaption{padding:9px 11px;display:flex;flex-direction:column;gap:2px}
figcaption b{font-size:12.5px}
.ideal figcaption b{color:#E8A33D}
figcaption span{font-family:ui-monospace,monospace;font-size:12px;color:#A3A8AE}
figcaption code{font-size:10.5px;color:#5C6268}
</style></head><body>
<h1>Off Auto: every picture, against the setting the app gives it</h1>
<p class="lede">The amber tile is what the card shows. The rest are the chips, in the order the app offers them, labelled with the words on the chip and the setting it moves to. If a tile does not match its label, that is the bug. Tell me the scene and the label.</p>
${rows}</body></html>`);
console.log('wrote ' + out);
