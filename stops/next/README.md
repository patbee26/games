# Off Auto

The rebuild, alongside the first app rather than replacing it, so the two can be
compared. [`../SPEC.md`](../SPEC.md) is the argument; this is what got built.

The name is the instruction: turn the dial off auto. The mark is a camera mode
dial with its indicator moved onto M, drawn in `js/brand.js` as one SVG that the
header, the favicon and the home-screen icons are all rendered from, so they
cannot drift apart. The code still lives under `stops/`, which is the working
name it was built under.

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

## The standard lens is a 24 to 105 mm f/2, which is not a real lens

Deliberate, and the gear page says so. At f/4 no scene could show a background
that had genuinely dissolved: the scene photograph stood in for the wide-open
step, so the one picture in the whole set that shows a background gone entirely
was never reachable. Opening the teaching lens to f/2 puts the scene's own
aperture *between* the dissolved photograph and the soft one, which turns three
pictures per aperture scene into four:

| f/2 | the shot | f/8 | f/16 |
|---|---|---|---|
| background gone | the scene photograph | background soft | sharp front to back |

A real kit zoom is f/4. Add yours on the Gear page and the card will say what
that costs you, in grain and in background, whenever a chip asks for more than
it has.

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
node tools/package.mjs     # deploy/, the directory you put on a host
node tools/bundle.mjs      # dist/stops-next.html, the whole app in one file
npm test                   # from stops/, runs both apps' tests
```

Deploy **the contents of `deploy/`** as the site root. The app lives in `next/`
but reaches across to `app/` for the physics, the fonts and the photographs,
which is right for working on it and impossible to host, since a page at the
site root cannot refer to a sibling directory above it. The packager mirrors the
two under one root, and because a leading `../` is clamped at the root by every
browser, nothing needs rewriting: `/index.html` asking for `../app/fonts.css`
gets `/app/fonts.css`.

The single file is for opening from a link or sending to somebody. Do not deploy
it as a site: it carries no service worker, so it cannot replace one a previous
deploy left behind.

## The page is fetched network-first, and this is not a detail

Both apps used to serve the page itself cache-first. That meant **a deploy was
invisible to anyone who had ever opened the site**: their browser kept handing
them the copy it already had, and publishing again changed nothing. It cost a
real afternoon of "I pushed it and it still shows the old version".

Now a navigation goes to the network first and falls back to the cache, so the
app is as offline-capable as it was and a deploy lands on the next load.
Everything that is not the page stays cache-first, which is what makes it open
instantly in a canyon.

Two supporting pieces, both there because the failure was a thing somebody had
to remember:

- The cache name is **stamped with a hash of the package** by `package.mjs`.
  Six versions of this app shipped under one cache name because bumping it was
  a manual step. It is not one any more.
- A page already running under an older worker **reloads itself once** when the
  new one takes over, so nobody has to be told to clear anything.

`swtest.mjs` in the working notes drives the whole thing: it loads the site, lets
a worker take control, publishes a change, reloads, and asserts the change is
visible and that the app still renders with the server switched off.

The bundler is the single source of truth for what the app needs: it inlines
every picture it can reach and writes the service worker's precache list from
the same walk. The first app kept that list by hand and it fell thirty-six
pictures behind without anything failing loudly.

It also refuses to build if two modules declare the same top-level name, which
is a real hazard here, since the shared modules already own `SCENES` and
`sceneById`.
