# Generating variation photographs

The app's preview is drawn rather than photographed because a flat JPEG cannot be
made to answer the settings — see the README for the three reasons and the two
experiments that failed. Real photographs *can* answer them, but only if each set
is genuinely the same scene shot differently, which is the whole difficulty.

This is the spec for producing those sets in an image model, and the pipeline for
getting them into the app.

## The trap, first

Ask a model for "portrait at f/1.8" and then "portrait at f/8" and you get **two
different photographs**. Different face, different light, different background.
Label them as an aperture pair and the learner attributes every one of those
differences to aperture. That is worse than the drawing, because it looks
authoritative while teaching something false.

So the rule for every set:

> **One base image. Every variant is an edit of it. Exactly one thing changes.**

Generate the base, then use the model's image *editing* on that same image for
each variant. Do not re-prompt from scratch.

## What to vary

Two axes, one at a time from the base. Six images per scene, not nine — the
cross-product teaches nothing the two rows do not.

### Aperture — three images

Framing, subject, pose, light and time of day identical. Only the depth of field
changes.

| Variant | Ask for |
|---|---|
| `wide` | the background dissolved into soft, unreadable blur; only the subject sharp |
| `mid` | the background soft but its shapes still recognisable |
| `deep` | the background sharply detailed, front to back |

Do **not** name f-numbers in the prompt. Models treat "f/8" as a style token, not
a measurement, and you will get an arbitrary amount of blur. Describe the visible
consequence instead, and let the app supply the number.

### Focal length — three images

This is the one that goes wrong. A model asked for "the same scene at 200mm" will
usually just crop in, which is *zooming without moving* — the fixed-standpoint
case. The app's Aperture tab teaches the other one: you step back, so the subject
stays the same size and the **background** changes scale.

State it explicitly, every time:

> The subject must occupy exactly the same height in the frame in all three. The
> photographer has moved, not zoomed. In the wide version the camera is close and
> much more of the background is visible, small. In the long version the camera is
> far back and the background is magnified, filling the frame behind the subject.

| Variant | Ask for |
|---|---|
| `wide` | camera close, wide field, background small and distant, some perspective stretch |
| `norm` | the scene's own focal length — this is the base image |
| `long` | camera far back, narrow field, background magnified and compressed behind the subject |

**Check the result before accepting it.** The subject must be the same height in
all three. If it grew, the model cropped and the set is wrong — regenerate.

## Which scenes are worth it

Six per scene across eighteen scenes is 108 images and roughly 6 MB, which is too
much to generate by hand and too much to ship. Do these six scenes first — they
have the widest subject-to-background separation, so the effect is strongest and
most legible at phone size:

| Scene | Separation | Why it shows well |
|---|---|---|
| `water` | 4.0 | the biggest separation in the set |
| `street` | 3.0 | deep street, obvious background scale change |
| `portrait` | 2.0 | the canonical aperture lesson |
| `sports` | 2.3 | long lens, strong compression |
| `macro` | 2.3 | depth of field measured in millimetres |
| `food` | 1.5 | close subject, controllable background |

Skip the ones whose background is at infinity (`landscape`, `architecture`,
`nightcity`, `stars`, `fireworks`, `moon`). Aperture does almost nothing visible
there, and a variation set would imply a difference that is not real.

## Naming

The ingest script reads the filenames, so they have to be exact:

```
<scene>__ap-wide.png     <scene>__ap-mid.png     <scene>__ap-deep.png
<scene>__fl-wide.png     <scene>__fl-norm.png    <scene>__fl-long.png
```

For example `portrait__ap-wide.png`, `water__fl-long.png`. PNG or JPEG both work.

## Getting them in

Put every generated file in one folder and run:

```
node tools/ingest-variants.mjs ~/Downloads/stops-variants
```

It validates the scene ids and variant names against the app's own data, rejects
anything it does not recognise, downscales each to 900 px on the long edge,
writes them into `app/photos/variants/`, and regenerates `app/js/variants.js`
with the manifest. It prints what it found, what is missing from each set, and
what it ignored.

Then check them at the size they will actually be seen:

```
node tools/variant-sheet.mjs
```

That writes a contact sheet putting each set side by side at the real banner
width. This is where you catch a focal set the model cropped instead of
re-shooting: look along the row and check the subject is the same height in all
three.

## After that

Nothing in the app reads `variants.js` yet — wiring it up is deliberately not
built ahead of the pictures, because how the control should feel depends on what
the sets actually look like. Once a couple of sets exist and survive the contact
sheet, the shape is small: the settings screen's photograph picks the nearest
variant to the current aperture and focal length instead of the single base
image, and says it is an approximation, because the steps are three points on a
continuous axis and the app will be interpolating between them by eye.
