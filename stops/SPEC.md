# Stops — product spec, v2

Written from your notes. Nothing here is built yet. The last section is the set
of decisions I still need from you before it could be.

---

## 1. Who it is for

Someone who has just bought their first mirrorless camera and wants to get off
automatic. They own one lens — the one that came with it. They are not choosing
between f/5.6 and f/6.3; they do not yet know what f/5.6 means.

This is narrower than what we built. The current app assumes a photographer who
owns three lenses, knows their ISO ceiling, and wants to negotiate with a solver.
That person is not the target.

## 2. What it is

**A tutorial that gets you out of the app.** Success is the user putting the
phone away and shooting, having learned why those numbers and not others. It is
not a settings calculator you consult repeatedly, and it is not a sandbox.

Two consequences, stated plainly because they overturn things we built:

- **The app has an opinion.** Each scene shows *the* settings for it, not a
  space of settings to explore.
- **Fiddling is not a feature.** The user does not tune the exposure. Where they
  can change something, it is to *see what that change does*, which is teaching,
  not configuring.

## 3. The core loop

```
Start  →  Pick a scene  →  Read the settings, see the shot  →  Go shoot
                                    ↕
                          tap one of two options,
                          see the picture change
```

Three screens deep, no dead ends. The whole thing should be usable one-handed
outdoors in under a minute.

**The light step is gone.** Each scene states the conditions it assumes ("bright
overcast, mid-afternoon") as a fact on the page rather than asking. Asking a
beginner to classify the light is asking them to do the hard part before they
have been taught it, and it doubles the taps before they see anything.

## 4. The screens

### 4.1 Start

First run only, plus reachable from anywhere afterwards. Answers three
questions in about fifteen seconds:

1. **What this is** — the settings a good photograph of this kind actually
   needs, and why.
2. **How to use it** — pick what you are shooting; set the three numbers on your
   camera; go.
3. **Set your camera to M** — the one thing the app cannot do for them. Say what
   M is, that they will set three numbers, and that nothing here works until the
   dial is on M.

Ends on a single button into the scene list. Skippable, and never shown again
unless asked for.

### 4.2 Scene list

The eighteen tiles as they are now. This screen is already right: photographs,
two columns, a name and a hint. No changes proposed.

### 4.3 Scene page — the heart of it

Top to bottom:

1. **The photograph** — what this shot looks like when it works.
2. **The three numbers**, large, in the order they matter for this scene, each
   with one line saying why it is that value.
3. **The conditions this assumes**, stated not asked.
4. **One or two options** (§5) — the only interactive thing on the page.
5. **Two or three lines of craft** — the non-exposure half of the shot: get to
   the dog's eye level, focus on the near eye, wait for someone to walk into the
   frame.
6. **What to watch out for** — the mistake beginners make in this scene.
7. **A note about your lens**, only when yours cannot do it (§6).

## 5. The options — one or two per scene, and no more

This is the mechanism that makes it a tutorial rather than a table.

Each scene declares **at most two** things the user can change, chosen because
changing them *visibly changes the photograph*. Tapping one swaps the picture
and rewrites the numbers.

Portrait, for example:

| Option | What the user sees |
|---|---|
| Aperture | Wide open the background dissolves; stopped down it comes back |
| Focal length | Wide shows the room around her; long magnifies what is behind her |

The options are per scene and hand-picked, not a generic set of controls.
Landscape has no aperture option worth showing — its background is at infinity —
so it might offer focal length and nothing else, or nothing at all.

**A scene only gets an option if a photograph exists for each step of it.** The
option is the picture changing; without pictures there is nothing to teach and
the option should not appear. This ties the feature directly to the variant
photographs, which is what we proved out with portrait.

Three steps per option, as now: wide / middle / stopped down, and wide / normal /
long.

## 6. Gear

**Default: one 28–100 mm zoom.** No setup, no questions, works on first launch.
This replaces the current three-lens profile, the ISO ceiling question, the
stabilisation question and the hand-held floor question — all of which are asking
a beginner about things they have not learned yet.

**The user may add one lens.** One, not a bag. Focal range and widest aperture.
That is the whole gear screen.

**Every scene is written for the default lens.** The settings shown are the ones
that lens can actually produce.

**When the user's own lens cannot do it, say so on the page.** Not a failure
state — a note, in the same voice as the rest:

> Your 50 mm f/1.8 cannot reach the 85 mm this wants. Stand further back and
> crop later, or accept a wider frame.

> This wants f/2.8 and your lens opens to f/5.6, so the background will stay
> more readable than in the photograph above.

The honest-shortfall machinery we already built is exactly right for this; it
just needs to speak to a beginner instead of to a solver.

## 7. What comes out

| Feature | Why |
|---|---|
| The light picker | Replaced by stated conditions per scene (§3) |
| Sun-position estimator | Same reason; also complexity a beginner did not ask for |
| Phone-camera metering | Explicitly deferred to the native iOS app |
| Exposure compensation control | It is settings-fiddling. The *idea* stays as a line of teaching where a scene needs it — snow, backlit — but not as a control |
| Shutter/aperture/ISO chips | Replaced by the one-or-two curated options |
| Lens picker and focal stepper | Replaced by the default lens plus one |
| ISO ceiling, stabilisation, slowest-shutter settings | Asking a beginner things they cannot answer |
| The diagram preview | Superseded by real photographs, where they exist. See open question 4 |

Most of this is deletion, which is the point. The current app is a good tool for
someone who does not need it.

## 8. What stays

- The eighteen scenes and their photographs
- The exposure engine — the numbers still have to be right, and it still has to
  be honest when the shot does not fit the gear
- The scene tutorials (craft and mistakes), now promoted onto the scene page
  itself rather than living behind a Guide tab
- Offline, installable, no account, nothing leaves the phone
- Light and dark themes

## 9. The cost, stated up front

Options need photographs: three per option, two options per scene, six per scene.

| Scope | Photographs | Rough size |
|---|---|---|
| 6 scenes with options | 36 | +2 MB |
| 18 scenes with options | 108 | +6 MB |
| 18 scenes, one option each | 54 | +3 MB |

The app is currently 2.6 MB. This is the main thing that decides how big the
build is, and it is generation work rather than code work.

---

## 10. Open decisions — I need your answers before building

1. **The 28–100 mm.** No common kit lens is marked 28–100. Do you mean the
   *full-frame equivalent* range — i.e. an APS-C 18–70 or a full-frame 24–105?
   And which sensor size is the default body? Everything in the engine works in
   real focal length times crop factor, so this changes every number in the app.

2. **Do all eighteen scenes survive?** With one 28–100 zoom and no light picker,
   the moon (wants 300 mm), stars, and fireworks are barely reachable and their
   conditions are not a beginner's Tuesday. Cutting to ten or twelve strong
   scenes would make the photograph budget in §9 comfortable and the app tighter.
   My instinct is to cut. Yours?

3. **How many options per scene, really?** Two is what you described. One is
   cheaper, faster to build, and arguably clearer. Some scenes only deserve one.
   Shall I decide this per scene and show you the list?

4. **What replaces the diagram for scenes with no variant photographs?** Either
   they get no options at all (simplest, honest), or the drawn preview stays for
   those. I lean towards no options — a scene that cannot show you the difference
   should not pretend to.

5. **Where does the craft writing live?** You said tutorial, and also said get
   out of the app fast. Those pull against each other. My proposal is three
   lines on the scene page and nothing deeper — the Guide tab goes. Or keep a
   "more on this" link for the ones who want it?

6. **Is this a new app or a rewrite in place?** The changes remove more than
   they add, and the current app works. I would build it as a second app
   alongside, so you can hold them side by side before throwing anything away.
