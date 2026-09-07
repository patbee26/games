# Stops — the tutorial

The rebuild, alongside the first app rather than replacing it, so the two can be
compared. [`../SPEC.md`](../SPEC.md) is the argument; this is what got built.

## The shape of it

Three taps and a card:

```
Pick a scene  →  Pick the light  →  One card: the shot  →  Go shoot
                                             ↕
                          tap a chip, see the picture change
```

The card has **no controls**. It states the shot — this focal length, this
aperture, this shutter — because that is how the photograph is taken. The only
interactive thing in the app is the row of chips beneath it, and a chip is a
question rather than a setting: *what happens if I close the aperture?* Tapping
one swaps the photograph for the same scene taken that way, moves one number,
and says what it cost in stops.

## What it does not have

Everything the first app can do and this one cannot is deliberate: no aperture
ladder to walk, no locks, no exposure compensation, no alternative solve, no
gear profile to fill in. The first app is a field instrument for someone who
already knows what they are doing. This one is for the afternoon before that.

## How it is put together

| | |
|---|---|
| `js/lessons.js` | The twelve scenes, with their settings **declared, not solved** |
| `js/shot.js` | The one sum: the ISO the camera will pick, and whether it can |
| `js/chips.js` | The wording of the questions under the card |
| `js/app.js` | Three screens, a guide, and an intro |

The physics is not duplicated. `app/js/ladders.js`, `optics.js`, `exposure.js`
and `data.js` are imported across from the first app — same ladders, same light
table, and no second copy to drift.

The photographs come from `app/photos/bases/` and `app/photos/variants/`. The
bases matter: they are the pictures the variations were generated from, so the
card and its chips show the same subject. Pairing the card with the *first*
app's photograph would change the face the instant a chip was tapped.

## Building it

```
node tools/bundle.mjs      # dist/stops-next.html — the whole app in one file
npm test                   # from stops/, runs both apps' tests
```

The bundler is the single source of truth for what the app needs: it inlines
every picture it can reach and writes the service worker's precache list from
the same walk. The first app kept that list by hand and it fell thirty-six
pictures behind without anything failing loudly.

It also refuses to build if two modules declare the same top-level name — which
is a real hazard here, since the shared modules already own `SCENES` and
`sceneById`.
