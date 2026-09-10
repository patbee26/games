// swift-tools-version: 5.9
import PackageDescription

// The model layer as a package, deliberately.
//
// It holds every number the app states and no user interface at all, which
// means it builds and its tests run on Linux as well as on a Mac. That matters
// here: the port was written where Xcode does not exist, so the half of it that
// could be proved correct was made provable, and the fixture it is proved
// against comes straight out of the shipped web app.
let package = Package(
  name: "OffAutoKit",
  platforms: [.iOS(.v17), .macOS(.v13)],
  products: [.library(name: "OffAutoKit", targets: ["OffAutoKit"])],
  targets: [
    .target(name: "OffAutoKit"),
    .testTarget(name: "OffAutoKitTests", dependencies: ["OffAutoKit"],
                resources: [.copy("model-fixture.json")]),
  ]
)
