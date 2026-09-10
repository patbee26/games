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
cd ios/OffAutoKit && swift test      # 11 tests, no Xcode needed
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
| `OffAuto/` | The SwiftUI app: five screens and the mark |
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

## What is deliberately not here

No camera access, no photo library, no network, no accounts, no analytics. The
app reads nothing and sends nothing. It stores two things in `UserDefaults`:
whether you have seen the introduction, and the one lens you may add.
