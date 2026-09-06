# Stops

A photography field guide for the phone. Two taps from "what am I shooting" to
three numbers on the camera dial — and an honest answer when the shot is not
possible with the gear in your hand.

> **Status: built and working.** Working name. The app is in [`app/`](app/); the
> mockups it was built from are in [`design/`](design/).

**Open it on your phone:** <https://claude.ai/code/artifact/940a0144-f133-4cfc-a88a-eda1d1575a9d>
**Mockups it was built from:** <https://claude.ai/code/artifact/c6c120c6-308c-433e-99f2-f6010ba2b3da>

## Running it

```
npm test            # the engine's own tests, no dependencies
npm run serve       # http://localhost:8080
```

There is no build step and no dependencies. `app/` is the deployable artefact
exactly as it sits — point any static host at that directory. On a phone, open it
and use *Add to Home Screen*; after the first load it works with no signal at all.

`node app/tools/bundle.mjs` flattens the whole thing into a single self-contained
page at `app/dist/stops.html` — that is what the link above serves. It is a copy
for sharing, not something the app depends on, and being one page it has no
service worker, so it needs a connection to open. The version in `app/` is the one
that works in a canyon.

---

## Why not just a printed card

A printed pocket guide is a lookup table: *sports, sunny — 1/1000, f/5.6, ISO 400.*
It is right about the average case and silent about yours. It does not know that your
zoom is f/5.6 at 200 mm, that you will not go past ISO 6400, or that the gym is four
stops darker than the table assumed.

A phone can **solve** the exposure triangle instead of looking it up, and — the part
that actually matters in the field — it can tell you when there is no solution and
price the ways out.

## The engine

About 200 lines of arithmetic, no model, no network.

**1. Light becomes a number.** Every condition maps to an EV at ISO 100. Harsh sun 15,
hazy sun 14, bright overcast 13, heavy cloud 12, late day 11, blue hour 9, bright
indoors 7, dim indoors 5. This is the standard EV table; it is decades old and it works.

**2. Subject becomes a constraint and a priority.** A scene is not a preset — it is an
*anchor* plus an ordering of what gives way first:

| Scene | Anchors | Gives way, in order |
|---|---|---|
| Sports | shutter ≥ 1/1000 | aperture → ISO |
| Portrait | aperture f/1.8–2.8 | ISO → shutter (floor 1/160) |
| Landscape | f/8–11, ISO 100 | shutter (tripod assumed) |
| Indoors, no flash | shutter ≥ hand-held floor | aperture → ISO |
| Stars | 500 ÷ focal, wide open | ISO |

**3. Solve the third variable.** `EV = log₂(N² / t)` at ISO 100, shifted by
`log₂(ISO / 100)`. Anchor two, solve the third, round to the nearest third-stop.

**4. Clamp to your gear, then be honest.** The lens has a widest aperture at that focal
length. The photographer has an ISO ceiling and a hand-held floor. When the solution
falls outside that box, do **not** quietly round it in — report the shortfall in stops
and offer the ways to buy it back, each with its cost. Grain, blur, or depth of field:
one of the three always pays.

That fourth step is the product. Everything else is table lookup.

## Three inputs, one profile

The gear profile is three numbers — widest aperture per lens, ISO ceiling, hand-held
floor. Set once, and every answer afterwards is yours rather than generic. It is also
the only reason the app can say "you are one stop short" instead of "try ISO 12800".

## Shape of the app

- **Shoot** — scene, then light, then settings. Two taps.
- **Guide** — what you look up rather than compute: the stops ladder, shutter speeds by
  subject, aperture by how much must be sharp, the reciprocal and 500 rules.
- **Gear** — the profile.

## How it is built

A static progressive web app: no backend, no accounts, no sign-in, no network at
runtime. Gyms, canyons and aeroplanes are exactly where this gets used, so the
service worker caches everything — including the two typefaces — on first load.
The gear profile lives in `localStorage`. Total payload is around 270 KB, most of
it the fonts.

| File | What it is |
|---|---|
| [`app/js/exposure.js`](app/js/exposure.js) | The solver. Anchors, relaxation order, shortfall, ways out. |
| [`app/js/optics.js`](app/js/optics.js) | Depth of field, motion blur, the hand-held floor, zoom aperture curves. |
| [`app/js/ladders.js`](app/js/ladders.js) | Third-stop shutter, aperture and ISO values, and snapping onto them. |
| [`app/js/data.js`](app/js/data.js) | The content: 18 scenes, 15 light conditions. |
| [`app/js/sun.js`](app/js/sun.js) | Solar position (NOAA), and the altitude → EV model. |
| [`app/js/preview.js`](app/js/preview.js) | The live preview, driven by the optics above. |
| [`app/js/app.js`](app/js/app.js) | Screens, routing, the gear editor. |
| [`app/test/`](app/test/) | 42 tests over the engine, optics and astronomy. `node --test`, no dependencies. |

Nothing the app suggests is off the dial: every value is snapped to a real
third-stop position, and the snapping happens *before* the final variable is
re-solved so the three numbers always expose the scene they claim to. There is a
test for exactly that.

## Working the light out from the sun

Outdoors, the light screen offers *Work it out from the sun*: position from the
phone, time from its clock, and the NOAA solar-position algorithm gives the sun's
altitude to a fraction of a degree. A piecewise curve turns that altitude into the
brightest the scene can be — anchored at the top by the sunny 16 rule, at the
bottom by a moonless night, with the conventional twilight values between.

The honest part is what it does **not** claim. Position fixes the ceiling; it says
nothing about cloud, and cloud is worth up to three and a half stops. So the app
does not guess: it shows the four skies with the EV each one implies and lets the
photographer pick the one they are standing under. One tap, and more accurate than
scrolling a list, because the time and place are real.

Two consequences fall out of the model rather than being special-cased. Cloud stops
mattering as the sun sets — it cannot block a sun that is not there — so below the
horizon the four options collapse to one. And past −18°, astronomical twilight is
over and the curve goes flat: a sun 40° down is no darker than one 20° down.

Geolocation needs a secure origin and the user's permission. Denied or unavailable,
it says so and the descriptive list is still there; a previously allowed position is
reused rather than wasted. GPS itself needs no signal, so the estimate works offline.

### Not built, deliberately

- **Example photographs.** See below — the sourcing is a month of evenings and it
  wants your own library, not a stranger's.
- **Metering with the phone camera.** Auto-exposure normalises every frame, so pixels
  alone can never give absolute light; you need the exposure the camera *chose*.
  Chrome on Android exposes `exposureTime` and `iso`; iOS is listed as an unsupported
  platform in the [spec's implementation status](https://github.com/w3c/mediacapture-image/blob/main/implementation-status.md),
  so in an iPhone browser it cannot be done at all. A *relative* spot meter — compare
  two areas of the frame, get the difference in stops — would work everywhere, and is
  the more useful feature anyway.
- **Night mode** — red on black, to keep dark-adapted eyes for astro.

## Example pictures

Two different things, with very different costs.

**A live preview beside the settings** — a diagram that behaves like a photograph.
Aperture drives background blur, shutter drives motion ghosting, ISO drives grain,
exposure error drives brightness; all four are plain CSS and SVG filters, GPU
composited, smooth on a phone if the canvas stays small. Two or three days, most of it
art direction rather than engineering. This is what teaches the tradeoff, which no
photograph can.

The trap: depth of field depends on focal length, subject distance and sensor size, not
just f-number. Show lush bokeh at f/4 to someone holding an 18-55 at 24 mm and the app
has taught them something false. So the blur must be driven from the real depth-of-field
maths using the focal length already in the gear profile, and the panel must be labelled
a diagram rather than a photograph.

**Real photographs in the guide tab** — a reference gallery. Trivial code, and the
sourcing is the entire job: the EXIF has to genuinely match the settings shown, which
rules out Unsplash and Pexels (EXIF stripped, unsearchable by aperture) and leaves
Flickr's Creative Commons corpus, with per-photo attribution. Far better: read the
photographer's own library, pull the EXIF, file each shot under the scene it matches.
No licensing question, and the examples are the user's own past work at those settings.
Half a day of code, plus a build step. The curation is a month of evenings.

Adding either changes two things already decided: photo tiles on the home screen would
pull the visual direction from instrument-panel toward gallery, and a preview on the
settings screen displaces the EV tick scale, the maths ledger, and turns the
"change one thing" chips into the controls themselves.

## Decisions taken while building

0. **The sun estimate asks about cloud rather than guessing it.** A single computed
   number would have looked more impressive and been wrong up to three stops of the
   time.

1. **Two-step picker, not the one-screen model.** The picker is faster cold, and cold is
   the state you are in when you open this. The one-screen alternative is still drawn in
   the mockups and is still the better idea once you know the app; it is a fork worth
   revisiting rather than one that has been closed.
2. **Anchors on whole stops, the solved variable on thirds.** The number the subject
   dictates is memorable (1/1000, f/8); the number the app works out lands wherever the
   light puts it, which on a real camera is a third-stop position.
3. **The lens is part of the answer.** It is picked automatically — the fastest one
   that covers the focal length — and overridden from the settings screen, because
   changing glass moves the aperture, the hand-held floor and the depth of field
   all at once.
4. **Eighteen scenes.** Enough to cover a year without turning the first screen into a
   scrolling problem.

## Still open

- **Do example photographs come before or after this?** They are the difference between
  a calculator and a field guide, and the longest pole in the tent.
- **The default kit is a slow one** — an 18–55 and a 55–200. That is honest, and it means
  the app's first answers are ISO-heavy and its previews are not very blurry. Right for
  most people, underwhelming for anyone arriving with fast glass.
- **Exposure compensation** has no home yet: snow, backlit subjects and silhouettes all
  want the meter deliberately disagreed with, and the app currently has nothing to say
  about that.
