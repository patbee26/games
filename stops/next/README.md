# Stops, the tutorial

The rebuild, alongside the first app rather than replacing it, so the two can be
compared. [`../SPEC.md`](../SPEC.md) is the argument; this is what got built.

## The shape of it

Three taps and a card:

```
Pick a scene  →  Pick the light  →  One card: the shot  →  Go shoot
                                             ↕
                          tap a chip, see the picture change
```

The card has **no controls**. It states the shot, meaning this focal length, this
aperture and this shutter, because that is how the photograph is taken. The only
interactive thing in the app is the row of chips beneath it, and a chip is a
question rather than a setting: *what happens if I close the aperture?* Tapping
one swaps the photograph for the same scene taken that way, moves one number,
and says what it cost in stops.

The order down the page is deliberate. The chips sit tight under the photograph,
because they are about the photograph. Under them, on a lighter surface than
anything else on the screen, sit **the ideal settings**, which is the answer the
photographer arrived for. Then the honest notices, then what their own lens can
do about it.

## The other three pages

**Guide** is five pages: the theory of the exposure triangle, then the stop
ladder, the shutter, the aperture and a page of rules. The last four compute
against the focal length you pick, so they are a reference rather than an
article.

**Gear** names the standard lens and lets one lens of your own be added, which
is what the "Your lens" line on every card then talks about. It also has the
button that replays the introduction, as does `?intro` on the end of the URL.

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
| `js/gear.js` | The standard lens, the one they may add, and what to say about it |
| `js/app.js` | Three screens, a five page guide, a gear page and an intro |

The physics is not duplicated. `app/js/ladders.js`, `optics.js`, `exposure.js`
and `data.js` are imported across from the first app: same ladders, same light
table, and no second copy to drift.

The photographs come from `app/photos/bases/` and `app/photos/variants/`. The
bases matter: they are the pictures the variations were generated from, so the
card and its chips show the same subject. Pairing the card with the *first*
app's photograph would change the face the instant a chip was tapped.

## Building it

```
node tools/bundle.mjs      # dist/stops-next.html, the whole app in one file
npm test                   # from stops/, runs both apps' tests
```

The bundler is the single source of truth for what the app needs: it inlines
every picture it can reach and writes the service worker's precache list from
the same walk. The first app kept that list by hand and it fell thirty-six
pictures behind without anything failing loudly.

It also refuses to build if two modules declare the same top-level name, which
is a real hazard here, since the shared modules already own `SCENES` and
`sceneById`.
