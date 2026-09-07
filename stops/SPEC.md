# Stops — product spec, v2

All six open decisions are now settled. Nothing is built yet; this is what would
be built.

---

## 1. Who it is for

Someone who has just bought their first full-frame mirrorless camera and wants
to get off automatic. They own the lens it came with. They are not choosing
between f/5.6 and f/6.3; they do not yet know what f/5.6 means.

## 2. What it is

**A tutorial that gets you out of the app.** Success is the user putting the
phone away and shooting, having learned why those numbers and not others.

- **The app has an opinion.** Each scene shows *the* settings for it.
- **Fiddling is not a feature.** Where the user can change something, it is to
  see what that change does — teaching, not configuring.

## 3. The camera setup — M with Auto ISO

**The app tells the user to set the camera to Manual with ISO on Auto**, capped
at 6400. They then have two dials to think about, plus their feet and the zoom
ring. This is the single most important decision in the spec and it changes
several others.

Why it is right:

- **ISO is the only one of the three with no creative consequence.** Shutter
  decides whether movement is frozen. Aperture decides how much is sharp. ISO
  only decides how noisy the file is — it is the bill, not a choice. Handing the
  bill to the camera removes a third of the difficulty and loses nothing.
- **It is already how this app thinks.** The exposure engine treats ISO as the
  absorbing variable — the current app literally prints "the app moves this one,
  never you" on the ISO row. Telling the user to put it on Auto makes the camera
  do exactly what the engine was already doing.
- **It is a real mode**, not a compromise. M + Auto ISO is standard on every
  modern mirrorless body and is what a lot of working photographers use for
  events and wildlife.

### 3.1 The consequence: exposure compensation comes back

I previously argued that exposure compensation should be cut, on the grounds
that **in manual with a fixed ISO the compensation dial does nothing**. That is
true, and the current app says so on screen.

**With Auto ISO it stops being true.** The camera is choosing the ISO, so the
compensation dial now moves the exposure — it is the *only* control that does.
It becomes the correct and teachable answer to the one exposure problem a
beginner will actually hit:

> The snow came out grey. Turn the exposure compensation dial to +1⅔ and shoot
> it again.

So compensation returns, but not as a slider to play with. It appears on the two
or three scenes where the meter is reliably wrong — snow, a backlit face — as a
line of instruction with a number in it. The engine already computes this
correctly.

### 3.2 What the scene page therefore shows

**Two numbers, not three.** Shutter and aperture, large. ISO appears as a
prediction rather than an instruction:

> **1/500** · **f/4** — your camera will land near **ISO 400**

And when the prediction runs past the cap, that is the honest-shortfall message
we already have, now saying something a beginner can act on:

> Your camera will run out of ISO here. This is too dark for this lens — wait
> for better light, or open a window.

## 4. The core loop

```
Start  →  Pick a scene  →  Read two numbers, see the shot  →  Go shoot
                                    ↕
                        tap one option, see the picture change
```

**The light step is gone.** Each scene states the conditions it assumes as a
fact on the page. Asking a beginner to classify light is asking them to do the
hard part before being taught it.

## 5. Gear

**Default: a 24–105 mm f/4 zoom on a full-frame body.** No setup, no questions.
This replaces the three-lens profile, the ISO ceiling question, the stabilisation
question and the hand-held floor question.

**The user may add one lens.** Focal range and widest aperture. That is the whole
gear screen.

**Every scene is written for the default lens.** When the user's own lens cannot
do it, the page says so in the same voice as the rest — not as a failure:

> Your 50 mm cannot reach the 85 mm this wants. Stand further back and crop
> later, or accept a wider frame.

There is a nice consequence here worth building towards: the kit zoom's f/4
limits how much background blur a portrait can have, so the app shows a portrait
that is good but not melted. Add a 50 mm f/1.8 as the one extra lens and the same
page shows what changes. **The app becomes the argument for the user's second
lens purchase, honestly.**

## 6. The scenes — twelve

Cut from eighteen. The rule was: could a beginner with a 24–105 f/4 shoot this
in their first few months, and does the kit lens actually reach it.

| Scene | Lens sits at | Kept because |
|---|---|---|
| Kids & pets | 50 mm | The most common reason this camera was bought |
| Portrait | 85 mm | The other most common reason |
| Group photo | 35 mm | Holidays, family, and the sharpest depth-of-field lesson there is |
| Sports & action | 105 mm | A child's football match. Short on reach, and the page says so |
| Street | 35 mm | Travel, the single most-used focal length |
| Landscape | 24 mm | The wide end exists for this |
| Architecture | 24 mm | Same trip, different problem |
| Indoors, no flash | 35 mm | Where most photographs are actually taken |
| Food & tabletop | 50 mm | They will do this on the first evening |
| Night & city | 24 mm | The first "how did they do that" shot |
| Silky water | 24 mm | The other one |
| Panning | 50 mm | Not common, but the best single lesson about shutter speed |

**Cut:** wildlife and the moon (need 300 mm — unreachable, and the page would be
one long apology), macro (a 24–105 does not focus close enough to do it),
stars (needs f/2.8 and a dark sky), fireworks (needs a tripod and a diary),
concert (an f/4 zoom in a dark venue is ISO 12800 and a bad first experience —
"Indoors, no flash" already teaches the same lesson in a room they can control).

## 7. The options — what the user may change

Each scene declares **one** thing to change, except portrait and street which
get two. Tapping it swaps the photograph and rewrites the numbers.

**A third axis is needed.** We built aperture and focal length. The most common
scenes here — kids, sports, water, panning, night — teach *shutter speed*, and
there is no shutter axis. It needs one: frozen / a little movement / fully
smeared. It is the most visually dramatic of the three and the easiest to
generate.

| Scene | Option | What the user sees |
|---|---|---|
| Kids & pets | **Shutter** | Frozen mid-stride, or the legs smeared |
| Sports & action | **Shutter** | The ball sharp, or a streak |
| Panning | **Shutter** | Background streaked with the rider sharp, or everything frozen and dull |
| Silky water | **Shutter** | Droplets frozen, or water turned to silk |
| Night & city | **Shutter** | Headlights as dots, or as long ribbons |
| Portrait | **Aperture** + **Focal length** | Background dissolves; or more room around her vs. magnified behind her |
| Group photo | **Aperture** | The back row soft, or everyone sharp |
| Food & tabletop | **Aperture** | One thing sharp, or the whole table |
| Indoors, no flash | **Aperture** | How much light the lens can gather, and what it costs behind |
| Street | **Aperture** + **Focal length** | Deep enough to shoot without focusing; wide scene vs. compressed |
| Landscape | **Focal length** | A wide vista, or distant layers stacked up |
| Architecture | **Focal length** | The whole building, or one detail |

Twelve scenes, fourteen options. **Nothing else on the page is interactive.**

### 7.1 What this costs to make

Fourteen options × three photographs = 42. The scene's existing photograph
usually serves as the middle step, so roughly **30 new images, about 2 MB** —
against 108 and 6 MB for the naive version. The cuts paid for themselves.

## 8. The screens

### 8.1 First launch — four cards, about forty seconds

This is where the app either earns its keep or gets deleted, so it is specified
properly rather than as a bullet. Four full-screen cards, swipe or tap through,
a photograph on each, skippable at any point and reachable forever afterwards
from the header.

**Card 1 — why manual is worth it.** Two photographs of the same scene side by
side: the one the camera chose on automatic, and the one you get when you choose.
No text about f-numbers. Just: *your camera made a safe guess. You can make a
better one, and it takes about a minute to learn how.*

**Card 2 — the three things, and why you only touch two.** The triangle, told as
jobs rather than as a diagram:

> **Shutter** decides whether movement is frozen or smeared.
> **Aperture** decides how much of the picture is sharp.
> **ISO** only decides how noisy the file is. It is the bill, not a choice — so
> let the camera pay it.

**Card 3 — set your camera up, once.** The only thing the app cannot do for
them, so it gets its own card and is made unmissable:

> Mode dial to **M**.
> ISO to **Auto**, maximum **6400**.
> That is it. You will never change ISO again.

With a photograph of a mode dial with M marked, because a beginner may genuinely
not know which dial it is. Permanently reachable from the Guide afterwards — it
is the thing people forget between sessions.

**Card 4 — how to use it.** *Pick what you are shooting. Set the two numbers.
Go.* Ends on one button into the scene list.

**On later launches none of this appears.** The app opens on the scene list. A
returning user has had the lesson, and the point is to get them out quickly.

**Tone.** No jargon before it is earned, no exclamation marks, and a photograph
on every card — this is an app about pictures and the first thing anyone sees
should be one.

### 8.2 Scene list
Twelve tiles, two columns, photographs. Unchanged from what works now.

### 8.3 Scene page
1. The photograph.
2. **Two numbers**, large, with one line each saying why.
3. ISO prediction, small.
4. The conditions this assumes, stated.
5. **One option** (two on portrait and street).
6. Three lines of craft — the non-exposure half.
7. What usually goes wrong.
8. A note about your lens, only when yours cannot do it.
9. Exposure compensation instruction, only on the scenes that need it.

### 8.4 Guide — the 101, kept as a reference

The scene page teaches by example; the Guide is where someone goes to understand
*why*. It is the difference between a recipe and learning to cook, and it is what
makes this a tutorial rather than a lookup table.

A reference, not a course — reachable any time, read in any order, nothing to
complete. Six short pages:

1. **What a stop is.** The one idea everything else rests on: twice the light, or
   half. Once you have it, the rest of the app is arithmetic you can follow.
2. **The triangle.** How the three trade against each other, with the ladder
   table we already built — give a stop in one column, take it back in another,
   and the exposure holds.
3. **Shutter.** The two different blurs, and why beginners fix the wrong one:
   camera shake smears the whole frame and comes from your hands, subject
   movement smears only the thing that moved. With the hand-held floor for the
   default lens at each focal length, computed rather than tabulated.
4. **Aperture.** What f/ actually is, and the surprising result we proved: at the
   same framing, depth of field barely depends on focal length. What a long lens
   really changes is the background, not the depth on the face.
5. **Why ISO is on Auto**, and the one time you overrule the camera — exposure
   compensation, for snow and for backlit faces.
6. **Your camera setup**, repeated from the first launch, because this is what
   people forget between sessions.

Every number is computed from the default lens by the same optics that drive the
scene pages, so the Guide cannot contradict the app — a defect the current
version had, and one we fixed.

## 9. What comes out

| Removed | Why |
|---|---|
| The light picker | Replaced by stated conditions per scene |
| Sun-position estimator | Complexity a beginner did not ask for |
| Phone-camera metering | Deferred to the native iOS app, as agreed |
| Shutter / aperture / ISO chips | Replaced by one curated option per scene |
| Lens picker, focal stepper | Replaced by the default lens plus one |
| ISO ceiling, stabilisation, slowest-shutter settings | Auto ISO makes them unnecessary |
| The drawn diagram preview | Scenes without variant photographs simply get no option |

## 10. Look and feel

The current app's design carries over wholesale — it is the part that already
works:

- The type, the amber accent, the card and chip shapes, the segmented controls
- **Both themes**, following the phone, with a manual override
- Photographic scene tiles, two columns, the label scrim over the picture
- Large mono numerals for the settings — they are the hero of the page
- Photographs shown whole, never cropped to a strip
- Installable, offline, full-screen from the home screen, no browser chrome

What changes is density, not style: fewer controls, more space, bigger type on
the two numbers, and a photograph in more places — including the first-launch
cards, which currently have none.

One addition. **The scene page should feel like a page from a good printed guide
rather than a settings screen** — generous margins, one idea at a time, and the
photograph large enough to read at arm's length outdoors, in sunlight, with cold
hands.

## 11. How it gets built

**A second app alongside the existing one**, so the two can be held side by side.
The current app keeps working and nothing is thrown away until you have compared
them.

Reused unchanged: the exposure engine, the optics, the honest-shortfall
machinery, the variant photograph pipeline, the scene photographs, the craft
writing, the theme system, the offline shell.

Rewritten: the whole of the screen layer, the gear model, and the scene data
(twelve scenes, each declaring its option and its assumed conditions).

## 12. Deferred to v2 — assess a photograph the user took

Upload a picture, get told what happened. Investigated and deferred, with the
findings recorded so the work does not get re-done.

It is three features, and only the third needs anything this app does not have:

| | Backend | Photo leaves the phone | Works offline |
|---|---|---|---|
| Read the EXIF, compare against what the app would have said | no | **no** | yes |
| Measure the pixels — sharpness, blown highlights, blocked shadows | no | **no** | yes |
| Judge it as a photograph — composition, expression, the moment | **yes** | **yes** | no |

**The first two are the valuable ones, and they run entirely on the device.**
Given a JPEG's EXIF and the scene the user names, the existing engine already
produces a real diagnosis:

```
THEIR SHOT   1/60  f/4  ISO 3200  at 105mm   (kids, indoors by a window)
THE APP SAYS 1/500 f/4  ISO 6400

exposure       2 stops brighter than the meter would give
camera shake   floor at 105mm is 1/105; they shot 1/60 = 2/3 stop too slow
subject motion a child at 3m needs 1/486; they were 3 stops short
headroom       ISO 3200 of a 6400 cap — a stop was left unspent
```

That is arithmetic, not a model, and it is only possible because the app already
knows the right answer for that scene — which a general vision model does not.
The pixel measurements were verified in the browser against the project's own
photographs: a Laplacian-variance focus measure cleanly separates the
sharp-background portrait (1504) from the two blurred ones (505, 588), and the
histogram catches 9% blocked shadows in the stars frame. No key, no network.

**The aesthetic layer waits for the native iOS app**, where an account and a
backend will exist anyway. It needs a server to hold the API key (a static page
cannot), rate limiting because there are no accounts, a per-call cost, and a
privacy story for photographs of the user's children. It also carries the
biggest risk to the app's character: a vision model will confidently produce
generic advice — "consider the rule of thirds" — in exactly the register this
app has been built to avoid, to a beginner who just photographed their kid.

For someone moving off automatic, the technical answer is the one that teaches.
"Your composition is pleasant" changes nothing; "it is blurry because your
shutter was three stops too slow, and here is the number you needed" changes the
next photograph.

**Verify before committing:** EXIF has to survive the trip. It is stripped by
messaging apps, absent from RAW, and iOS's photo picker needs checking on a real
device. Without EXIF the first tier goes quiet and only the pixel measurements
remain — still useful, but unable to say *why*.

Effort: 1–2 days for the EXIF tier, 1–2 more for the pixel tier, no
infrastructure for either.

## 13. Still to decide

1. **The shutter axis photographs.** Thirty new images is the bulk of the work
   and it is yours, in ChatGPT. Worth proving one shutter set first — `water` is
   the most dramatic — exactly as we did with portrait.
2. **Does the first build ship with all fourteen options, or with the option
   only on the scenes whose photographs exist?** I would build the mechanism to
   handle both and let the photographs arrive over time.
