# Stops

A photography field guide for the phone. Two taps from "what am I shooting" to
three numbers on the camera dial — and an honest answer when the shot is not
possible with the gear in your hand.

> **Status: mockups only, nothing built.** Working name. This document records the
> approach; `design/` holds the screens.

**Mockups:** <https://claude.ai/code/artifact/c6c120c6-308c-433e-99f2-f6010ba2b3da>
Source artboards are committed under [`design/`](design/).

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

## Build

A static progressive web app. No backend, no accounts, no sign-in, no network at
runtime — gyms, canyons and aeroplanes are exactly where this gets used. Vanilla JS or
a small Svelte build, a service worker, add-to-home-screen, profile in `localStorage`.
Hosts free on Netlify. One HTML file, one JS file, one manifest.

Later, if they earn their place:

- **Guess the light** from clock, date and GPS → sun altitude → predicted EV. Runs
  offline; saves the second tap outdoors.
- **Meter it** with the phone camera, as a sanity check against the description.
- **Night mode** — red on black, to keep dark-adapted eyes for astro.

## Open questions

1. **Two-step picker, or one screen?** The mockups show both. The picker is faster cold;
   the one-screen model ("how fast is it moving / how much must be sharp / how bright")
   describes the situation physically instead of naming a genre, and is faster once
   learned. This decision shapes everything else and should be made first.
2. **How many scenes?** Eight cover most days; twenty-two covers the year. More scenes
   is more scrolling at the moment you least want it.
3. **Thirds or full stops?** Cameras step in thirds. Advice in full stops is easier to
   remember and easier to act on.
