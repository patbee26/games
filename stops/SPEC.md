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

### 8.1 Start
First run, and reachable afterwards. About fifteen seconds:
1. What this is.
2. **Set your camera up:** mode dial to **M**, ISO to **Auto**, max 6400. With a
   photograph of a mode dial, because they may not know where it is.
3. How to use it: pick what you are shooting, set two numbers, go.

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

### 8.4 Guide — kept
**You want this and you are right.** The scene page teaches by example; the Guide
is where someone goes when they want to understand *why*. It is the difference
between a recipe and learning to cook.

Contents: the exposure triangle explained properly — what each of the three
does, why they trade against each other, what a stop is. Then shutter, aperture,
and why ISO is on Auto. The computed tables we built stay, now derived from the
default lens.

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

## 10. How it gets built

**A second app alongside the existing one**, so the two can be held side by side.
The current app keeps working and nothing is thrown away until you have compared
them.

Reused unchanged: the exposure engine, the optics, the honest-shortfall
machinery, the variant photograph pipeline, the scene photographs, the craft
writing, the theme system, the offline shell.

Rewritten: the whole of the screen layer, the gear model, and the scene data
(twelve scenes, each declaring its option and its assumed conditions).

## 11. Still to decide

1. **The shutter axis photographs.** Thirty new images is the bulk of the work
   and it is yours, in ChatGPT. Worth proving one shutter set first — `water` is
   the most dramatic — exactly as we did with portrait.
2. **Does the first build ship with all fourteen options, or with the option
   only on the scenes whose photographs exist?** I would build the mechanism to
   handle both and let the photographs arrive over time.
