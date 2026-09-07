# The picture list for v2

> **Done.** All twelve scenes were generated and ingested on 7 September: 50
> images in, 42 variants and 12 base photographs out. What follows is the recipe
> that produced them, kept for the next scene rather than as a list of work
> outstanding. Read [`VARIANTS.md`](VARIANTS.md) for what judging the full batch
> taught — in particular that a focal-length pair can come back swapped.

**33 images to generate, 3 free copies, 6 you already made.** Everything the
twelve scenes need in order to have their one option each.

The method is the one that worked for portrait, and the background to it is in
[`VARIANTS.md`](VARIANTS.md). The rule that matters most:

> **One base image. Every variant is an edit of it. Exactly one thing changes.**

Attach the app's own photograph — `stops/photos/<scene>.jpg` — to a new ChatGPT
chat, then paste the prompts for that scene in order, staying in the same chat so
each edit works from the same picture.

---

## Do this first — one scene, fifteen minutes

**`water`**, the shutter set. It is the most dramatic of the three axes and the
one we have not proved yet, so it is the right thing to test before you make
thirty more.

Attach `stops/photos/water.jpg`. Then the three prompts in §3 below, using the
`water` line from the table. Zip the three, send them, and I will build the
contact sheet exactly as we did for portrait.

**If the shutter axis works, do the rest. If it does not, we drop the five
shutter scenes to no option and the build is unaffected.**

---

## 1. The full list

### Shutter — 5 scenes, 15 images

| Attach | Save as |
|---|---|
| `water.jpg` | `water__sh-fast` `water__sh-mid` `water__sh-slow` |
| `kids.jpg` | `kids__sh-fast` `kids__sh-mid` `kids__sh-slow` |
| `sports.jpg` | `sports__sh-fast` `sports__sh-mid` `sports__sh-slow` |
| `panning.jpg` | `panning__sh-fast` `panning__sh-mid` `panning__sh-slow` |
| `nightcity.jpg` | `nightcity__sh-fast` `nightcity__sh-mid` `nightcity__sh-slow` |

### Aperture — 4 scenes, 12 images

| Attach | Save as |
|---|---|
| `group.jpg` | `group__ap-wide` `group__ap-mid` `group__ap-deep` |
| `food.jpg` | `food__ap-wide` `food__ap-mid` `food__ap-deep` |
| `indoor.jpg` | `indoor__ap-wide` `indoor__ap-mid` `indoor__ap-deep` |
| `street.jpg` | `street__ap-wide` `street__ap-mid` `street__ap-deep` |

### Focal length — 3 scenes, 6 images + 3 free

| Attach | Save as | Free |
|---|---|---|
| `street.jpg` | `street__fl-wide` `street__fl-long` | `street__fl-norm` = copy of `street.jpg` |
| `landscape.jpg` | `landscape__fl-wide` `landscape__fl-long` | `landscape__fl-norm` = copy of `landscape.jpg` |
| `architecture.jpg` | `architecture__fl-wide` `architecture__fl-long` | `architecture__fl-norm` = copy of `architecture.jpg` |

The `fl-norm` step is the scene's own focal length, which is the photograph the
app already has. Just copy and rename it:

```
cp stops/photos/street.jpg ~/stops-v2/street__fl-norm.jpg
```

### Already done

`portrait__ap-wide` `ap-mid` `ap-deep` `fl-wide` `fl-norm` `fl-long`.

---

## 2. Naming and sending

`.png` or `.jpg`, named exactly as above. Put everything in one folder, zip it,
and attach the zip — pasted images do not reach the disk and I cannot process
them.

You can send them in batches. The ingest picks up whatever is in the folder and
tells me what is still missing from each set.

---

## 3. The shutter prompts — new

Three prompts per scene. Each one has a scene-specific line, marked **[what
moves]**, taken from this table:

| Scene | **[what moves]** |
|---|---|
| `water` | the falling water |
| `kids` | the running child and the dog |
| `sports` | the player and the ball |
| `nightcity` | the cars and their headlights |
| `panning` | *use the bespoke set in §3.1 instead* |

---

**Prompt 1** → `<scene>__sh-fast`

> Edit this photograph. Keep the subject, the framing, the composition, the
> light, the colours and the crop exactly as they are. The camera has not moved
> and nothing in the scene has been rearranged.
>
> Change one thing only: the shutter speed was very fast, so **[what moves]** is
> frozen absolutely sharp, caught in a single instant. Every edge of it is crisp,
> with no motion blur anywhere in the frame. Same aspect ratio as the original.

**Prompt 2** → `<scene>__sh-mid`

> Same photograph, same framing, same light, camera not moved.
>
> This time the shutter was moderately fast: **[what moves]** shows a small
> amount of movement — the fastest-moving parts are slightly soft while the main
> body of it stays sharp. Everything stationary is perfectly sharp. Same aspect
> ratio.

**Prompt 3** → `<scene>__sh-slow`

> Same photograph, same framing, same light, camera not moved.
>
> This time the shutter was slow and the camera was on a tripod: **[what moves]**
> is strongly blurred into smooth continuous streaks along its direction of
> travel, while everything stationary in the frame stays perfectly sharp. Same
> aspect ratio.

### 3.1 Panning — a bespoke set

Panning is the one where the *camera* moves, so the generic set does not apply.
Attach `panning.jpg`:

**Prompt 1** → `panning__sh-fast`

> Edit this photograph. Same rider, same bike, same position in the frame, same
> light, same crop.
>
> Change one thing only: the shutter was fast and the camera was held still. The
> rider is sharp **and so is the entire background** — every tree and every
> roadside detail is crisp and readable. The picture looks static, as though the
> rider were parked. Same aspect ratio.

**Prompt 2** → `panning__sh-mid`

> Same photograph, same rider in the same place in the frame, same light.
>
> This time the camera followed the rider at a moderate shutter speed: the rider
> stays sharp and the background shows a mild horizontal smear — you can still
> make out what the background objects are, but they are stretched sideways.
> Same aspect ratio.

**Prompt 3** → `panning__sh-slow`

> Same photograph, same rider in the same place in the frame, same light.
>
> This time the camera followed the rider at a slow shutter speed: the rider is
> still sharp, and the background is pulled into strong horizontal streaks —
> unreadable bands of colour running across the frame. The wheels show rotational
> blur. Same aspect ratio.

---

## 4. The aperture prompts — as used for portrait

Scene-specific line marked **[the background]**:

| Scene | **[the background]** |
|---|---|
| `group` | everyone behind the front row, and the scene behind them |
| `food` | the rest of the table and the room behind it |
| `indoor` | the room behind the subject |
| `street` | the street receding behind the subject |

**Prompt 1** → `<scene>__ap-wide`

> Edit this photograph. Keep the subject, the framing, the composition, the
> light, the colours and the crop exactly as they are. The camera has not moved
> and nothing has been rearranged.
>
> Change one thing only: the depth of field. **[the background]** is completely
> dissolved into smooth, unreadable blur — no individual shape back there can be
> identified. The nearest subject stays perfectly sharp. Same aspect ratio.

**Prompt 2** → `<scene>__ap-mid`

> Same photograph, same subject, same framing, same light, camera not moved.
>
> This time **[the background]** is clearly soft but still recognisable — you can
> tell what things are, they are simply not sharp. The nearest subject stays
> perfectly sharp. Same aspect ratio.

**Prompt 3** → `<scene>__ap-deep`

> Same photograph, same subject, same framing, same light, camera not moved.
>
> This time everything is sharp front to back — **[the background]** rendered in
> full crisp detail, exactly as sharp as the nearest subject. Same aspect ratio.

**For `group`, add this line to all three:** "The front row and the back row are
at clearly different distances from the camera, and the difference between them
is the point of this set."

---

## 5. The focal-length prompts — as used for portrait

The hard one. A model asked for a longer lens will usually just crop, which is
zooming without moving — the opposite of what this teaches. Say it explicitly
every time.

**Prompt 1** → `<scene>__fl-wide`

> Edit this photograph. Same subject, same light, same time of day, same mood.
>
> The photographer has physically walked closer to the subject and put on a
> wide-angle lens. They have MOVED. They have not zoomed out and this is not a
> crop.
>
> The main subject must occupy exactly the same height in the frame as in the
> original — this is the most important part. Because the camera is now close and
> the lens is wide, much more of the background is visible, everything in it
> looks smaller and further away, and there is a slight wide-angle stretch to the
> perspective. Same aspect ratio.

**Prompt 2** → `<scene>__fl-long`

> Edit this photograph. Same subject, same light, same time of day, same mood.
>
> The photographer has physically walked a long way back and put on a long
> telephoto lens. They have MOVED. They have not zoomed in and this is not a
> crop.
>
> The main subject must occupy exactly the same height in the frame as in the
> original — this is the most important part. Because the camera is now far away
> and the lens is long, only a narrow slice of background is visible, and it
> appears magnified and compressed, looming larger behind the subject than it
> does now. Same aspect ratio.

**`landscape` and `architecture` have no single subject**, so replace "the main
subject" with:

- `landscape` — "the nearest foreground element — the rock, the tree, whatever
  anchors the bottom of the frame"
- `architecture` — "the building"

---

## 6. What to check before sending

The two failures worth catching yourself, both visible at a glance:

- **Aperture and shutter sets:** the subject must be identical in all three.
  Only the blur changes. If the face or the pose changed, the model regenerated
  instead of editing — say *"keep the subject identical, change only the blur"*
  and try again.
- **Focal sets:** the subject must be the **same size** in all three, and the
  background must get bigger from left to right. If the subject grows across the
  row, it cropped. Say *"the subject is too large — it must be exactly the same
  size in the frame as the original; you zoomed in, but the photographer walked
  backwards"*.

Small size drift on the focal sets is fixable at my end with a crop factor, as we
did for portrait — do not re-roll for a 10% difference, only for an obvious one.
