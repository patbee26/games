# Off Auto, for iOS

A SwiftUI port of the web app in [`../next/`](../next/). Same twelve scenes, same
photographs, same numbers, and the numbers are *provably* the same rather than
apparently the same. See **The fixture** below.

## What is verified, and by what

The app **builds and runs**. It was written on a Linux machine with no Xcode and
no iOS SDK, so it reached that state through one compiler error rather than
none: SwiftUI has its own `Axis`, which made the name ambiguous. Everything
before that was found by reading, and is recorded in the history if the
reasoning is ever interesting.

`OffAutoKit` is checked far harder than "it compiles". Every scene, light, chip,
piece of lens advice and both computed guide tables are asserted against the
shipped web app, and that check runs anywhere with a Swift toolchain:

```
cd ios/OffAutoKit && swift test      # 26 tests, no Xcode needed
```

What no test covers is how any of it **looks**, since there is nothing here that
can render a view. The layout, the spacing and the mark are eyes-only.

## Opening it

Three ways, most reliable last.

1. **Open `OffAuto.xcodeproj`.** Hand-written, never opened by me. It uses the
   synchronized-folder format, so it needs **Xcode 16 or newer**.
2. **`brew install xcodegen && cd ios && xcodegen`**, which generates the
   project from [`project.yml`](project.yml). That file is a specification
   rather than a serialised object graph, so if the two disagree, believe it.
3. **Make one in Xcode**, which takes about two minutes and cannot go wrong:
   File ▸ New ▸ Project ▸ iOS App, name it `OffAuto`, SwiftUI, save it into
   `ios/`. Then drag the `OffAuto` folder in, and add `OffAutoKit` with
   File ▸ Add Package Dependencies ▸ Add Local.

Signing is only needed for a physical phone. A simulator needs none.

### If it will not build

Capture what it actually said and send me the file:

```
cd ios
xcodebuild -project OffAuto.xcodeproj -scheme OffAuto \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build \
  > ~/Desktop/offauto-build.txt 2>&1
```

There is a shared scheme in the project so that command works without opening
Xcode first. Everything I need is in that file.

## How it is laid out

| | |
|---|---|
| `OffAutoKit/` | Every number the app states, and no user interface at all |
| `OffAuto/` | The SwiftUI app: the screens and the mark |
| `tools/` | Generators, run with node from the repository root |

`OffAutoKit` is a package rather than a folder of files on purpose. It holds no
UI, so it builds and its tests run on Linux as well as on a Mac, which is the
only reason half of this port could be proved correct at all.

## The fixture

`tools/fixture.mjs` runs the **JavaScript** model over every scene, every light
it offers and every chip, and writes the answers to
`OffAutoKit/Tests/OffAutoKitTests/model-fixture.json`. The Swift tests read the
same file and assert the same answers, down to the strings.

So the question "is the port faithful?" is not a matter of reading both and
hoping. It is `swift test`, and it currently answers yes for:

- the shutter, aperture and ISO ladders, and how values snap to them
- all fifteen light levels
- all twelve scenes, including the copy
- the ISO the camera lands on in every light each scene offers, plus over and
  under exposure
- all thirty-three chips: label, value, result, and the settings each produces
- every branch of the lens advice, over four gear configurations
- the guide's hand-held floor, subject-movement and depth-of-field tables at
  five focal lengths

## Regenerating

Run from the repository root, after changing the web app:

```
node ios/tools/gen-data.mjs      # the twelve scenes, into Swift
node ios/tools/fixture.mjs       # the golden answers, from the JavaScript
node ios/tools/gen-assets.mjs    # the photographs and the app icon
```

`Generated.swift` and the asset catalog are both derived. Editing either by hand
is how the two apps start disagreeing about what a portrait is shot at.

## The debrief

The one thing here that the web app cannot do. After you have been out with the
camera and brought the files across to the phone, the top of the scene list says
**one** thing about that shoot: three frames slower than your hands hold, or a
whole afternoon at one aperture, or, just as often, something you did well.

It is a debrief and not a checker, and the difference is the whole design:

- **It is never entered.** There is no mode, no file picker, no button that says
  analyse. It is waiting when you next open the app, and it goes away once read.
- **One finding, never a list.** If three habits are visible it names the one
  that touched the most frames. A reader handed three corrections fixes none.
- **It praises as readily as it corrects**, and only when the praise is earned:
  holding 1/1000 in bright sun is praising the sun, so that one does not count.
- **It knows what you own.** It will not tell you to open up to f/2 on a lens
  that stops at f/4, which is exactly the failure that would make it worthless.

The trick underneath is that the light can be recovered from the file:
`EV = log2(N²/t) - log2(ISO/100)`. With the light known, a wrong choice can be
told apart from a photograph that was never available in the first place, and
almost nothing else about this feature works without that.

`Debrief.swift` holds all of it and no UI, so it is tested like everything else
in the kit. One of those tests caught the f/2 bug described above.

### What it reads

Before iOS is allowed to put up its permission sheet, the app asks in plain
words where the pictures off your camera end up. iOS offers no way to find out
whether there are camera files worth looking at without first being granted the
whole library, so somebody who cards straight to a laptop should never see that
dialog at all, and does not.

If you say the files come to the phone, it reads the aperture, shutter, ISO and
focal length out of the head of each file, newest first, and stops as soon as it
has one whole shoot. It reads at most half a megabyte per file, never opens the
picture, never downloads anything sitting only in iCloud, and skips anything the
phone itself took. Nothing leaves the device, because there is no code in this
app that could send it anywhere.

## Light and dark

The phone's own setting is the default, but there is a button at the top of the
scene list and a three-way control on the gear page. Dark is right at dusk and
wrong in direct sun, and this app gets read in both.

## What is deliberately not here

No camera access, no network, no accounts, no analytics. The photo library is
read only in the narrow way described above, and only after being asked twice.
`UserDefaults` holds five small things: whether you have seen the introduction,
the one lens you may add, light or dark, what you said about your photographs,
and which debriefs you have already read.
