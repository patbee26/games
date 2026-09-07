# Generating variation photographs

The app's preview is drawn rather than photographed because a flat JPEG cannot be
made to answer the settings — see the README for the three reasons and the two
experiments that failed. Real photographs *can* answer them, but only as sets
that are genuinely the same scene shot differently.

This is how to make those sets. Start with one scene, look at it, then decide
whether to do the rest.

---

## Do this first — one scene, about fifteen minutes

### 1. Get the base photograph

Unzip the app. The photographs are in `stops/photos/`. Start with
**`portrait.jpg`** — it is the clearest case.

You do not generate a base. The photograph in the app *is* the base, and every
variant is an edit of it. That is what keeps the set honest: if you generate each
one from scratch you get five different photographs, and the app would be
teaching every incidental difference — the face, the light, the background — as
if it were aperture.

### 2. Upload it to ChatGPT and paste these five prompts

Attach `portrait.jpg` to a new chat. Paste prompt 1. Save the result. Then, in
the **same chat**, paste prompt 2, and so on — so each edit keeps working from
the same picture.

The prompts never describe the subject, because ChatGPT can see it. That means
the same five work for every scene.

---

**Prompt 1** → save as `portrait__ap-wide.png`

> Edit this photograph. Keep the subject, the pose, the expression, the clothing,
> the light, the colours, the framing and the crop exactly as they are. Do not
> move the camera and do not change the subject in any way.
>
> Change one thing only: the depth of field. Render everything behind the subject
> completely dissolved into smooth, unreadable blur — no individual shape in the
> background should be identifiable. The subject stays perfectly sharp. Keep the
> same aspect ratio as the original.

**Prompt 2** → save as `portrait__ap-mid.png`

> Same photograph again, same subject, same pose, same light, same framing,
> camera not moved.
>
> This time the background is clearly soft but its shapes are still
> recognisable — you can tell what things are, they are simply not sharp. The
> subject stays perfectly sharp. Same aspect ratio.

**Prompt 3** → save as `portrait__ap-deep.png`

> Same photograph again, same subject, same pose, same light, same framing,
> camera not moved.
>
> This time everything is sharp front to back. The background is rendered in full
> crisp detail, as sharp as the subject. Same aspect ratio.

**Prompt 4** → save as `portrait__fl-wide.png`

> Same photograph, same subject, same pose, same expression, same clothing, same
> light, same time of day, same mood.
>
> The photographer has physically walked closer to the subject and put on a
> wide-angle lens. They have MOVED. They have not zoomed out and this is not a
> crop.
>
> The subject must occupy exactly the same height in the frame as in the
> original — this is the most important part. Because the camera is now close and
> the lens is wide, much more of the background is visible, everything in it looks
> smaller and further away, and there is a slight wide-angle stretch to the
> perspective. Same aspect ratio.

**Prompt 5** → save as `portrait__fl-long.png`

> Same photograph, same subject, same pose, same expression, same clothing, same
> light, same time of day, same mood.
>
> The photographer has physically walked a long way back and put on a long
> telephoto lens. They have MOVED. They have not zoomed in and this is not a crop.
>
> The subject must occupy exactly the same height in the frame as in the
> original — this is the most important part. Because the camera is now far away
> and the lens is long, only a narrow slice of the background is visible, and it
> appears magnified and compressed, looming larger behind the subject than it does
> now. Same aspect ratio.

### 3. The sixth file is free

`portrait__fl-norm.png` is the original photograph — the scene's own focal
length. Just copy `photos/portrait.jpg` and rename it:

```
cp stops/photos/portrait.jpg ~/stops-variants/portrait__fl-norm.jpg
```

### 4. Install them and look

Put all six in one folder, then from `stops/app/`:

```
node tools/ingest-variants.mjs ~/stops-variants
node tools/variant-sheet.mjs
```

The first validates the names, rescales everything the same way, and writes the
manifest. The second writes `variant-sheet.png` — each set laid out side by side
at the width it will actually be seen at on a phone.

### 4b. If the subject drifts in size, normalise it

A model will hold the subject's size only roughly across the three focal
lengths, and the set's whole claim is that the subject does not change. Put a
`crops.json` next to the images to crop the framing back into line:

```json
{ "portrait": { "fl-wide": { "scale": 1.14, "cy": 0.52 },
                "fl-norm": { "scale": 1.28, "cy": 0.52 } } }
```

`scale` crops in by that factor, `cy` is the vertical centre of the crop. The
ingest applies it automatically and says so. This is legitimate rather than a
fudge: cropping in rescales subject and background together, so it fixes the
framing without touching the ratio between them — which is the thing being
demonstrated. It only ever crops in, so nothing is invented at the edges.

The committed `variants-crops.json` is the one used for portrait, kept so the
set can be rebuilt from the originals. Copy it into your source folder.

### 5. Judge it — this is the step that matters

Open `variant-sheet.png` and read along each row.

**Aperture row:** the subject must be identical in all three. Only the background
sharpness may differ. If the face changed, the model regenerated instead of
editing — say "keep the subject pixel-identical, change only the background
blur" and try again.

**Focal length row:** the subject must be the **same height** in all three, and
the background must get bigger from left to right. If the subject grows across
the row, ChatGPT cropped instead of re-shooting, and the set teaches the wrong
lesson. Say "the subject is too large in this one — it must be exactly the same
size in the frame as the original; you have zoomed in, but the photographer
walked backwards instead" and try again.

Expect to re-roll a couple. The focal ones are the hard ones.

**If the sheet looks right, tell me and I will wire it into the app.** If it
looks wrong after a few tries, that is a real answer too — it means this is not
worth doing, and the drawn preview stays.

---

## Then, only if the first one worked

The same five prompts, with a different photograph attached each time. Do these
five next — they have the widest subject-to-background separation, so the effect
is strongest and most legible at phone size:

| Photograph | Why it is worth doing |
|---|---|
| `water.jpg` | the biggest separation in the set |
| `street.jpg` | deep street, obvious background scale change |
| `sports.jpg` | long lens already, strong compression |
| `macro.jpg` | depth of field measured in millimetres |
| `food.jpg` | close subject, controllable background |

Rename each file for its scene — `water__ap-wide.png`, `street__fl-long.png`,
and so on. Then re-run the same two commands; ingest picks up everything in the
folder at once.

**Skip the rest.** `landscape`, `architecture`, `nightcity`, `stars`,
`fireworks` and `moon` all have their background at infinity. Aperture does
almost nothing visible there, and a variation set would imply a difference that
is not real.

Six scenes is 36 images and about 2 MB added to the app. All eighteen would be
108 images and 6 MB, which is too much to make by hand and too much to ship.

---

## Naming, exactly

The ingest script reads the filenames and rejects anything it does not
recognise, so these have to be right:

```
<scene>__ap-wide     <scene>__ap-mid      <scene>__ap-deep
<scene>__fl-wide     <scene>__fl-norm     <scene>__fl-long
```

`.png` or `.jpg` both work. The scene name must match the app's own id — the ids
are the photograph filenames in `stops/photos/`.

## Why the prompts avoid f-numbers

Because models treat "f/1.8" as a style token rather than a measurement, and you
get an arbitrary amount of blur that does not correspond to anything. The prompts
describe the visible consequence instead, and the app supplies the number. Three
steps is also all that is worth generating: they are three points on a continuous
axis, and the app will be picking the nearest one rather than pretending to
interpolate.
