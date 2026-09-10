import XCTest
@testable import OffAutoKit

/// The scenarios `tools/fake-shoot.mjs` writes into a simulator, run through
/// the analysis they are meant to trigger.
///
/// That script prints a sentence and says the app will say it. Without this,
/// that is a claim in a comment: if a scenario drifted into landing on a
/// different finding, the first sign would be somebody staring at a simulator
/// deciding the app was broken, when the test data was. So the promise is
/// asserted against the shipped code instead.
final class ShootTests: XCTestCase {
  struct Shoot: Decodable {
    struct Item: Decodable {
      let second: Double, aperture: Double, shutter: Double, iso: Double, focal: Double
    }
    let name: String
    let kind: String?
    let expects: String
    let frames: [Item]
  }

  static let shoots: [Shoot] = {
    guard let url = Bundle.module.url(forResource: "shoots", withExtension: "json"),
          let data = try? Data(contentsOf: url),
          let decoded = try? JSONDecoder().decode([Shoot].self, from: data)
    else { fatalError("shoots.json is missing. Run: node ios/tools/fake-shoot.mjs --fixture") }
    return decoded
  }()

  func testEveryScenarioSaysWhatItPromises() {
    let start = Date(timeIntervalSince1970: 1_700_000_000)
    for shoot in Self.shoots {
      let frames = shoot.frames.enumerated().map { index, item in
        Frame(id: "\(shoot.name)-\(index)", date: start.addingTimeInterval(item.second),
              aperture: item.aperture, shutter: item.shutter, iso: item.iso, focal: item.focal)
      }

      // The whole path the app takes, not just the analysis: a set of frames
      // has to survive being grouped into a session before anything is said
      // about it, and "quiet" is a scenario precisely because it should not.
      guard let session = Sessions.latest(frames) else {
        XCTAssertNil(shoot.kind, "\(shoot.name): too few frames to be a shoot at all")
        continue
      }
      XCTAssertEqual(session.count, frames.count, "\(shoot.name): should be one session")

      let found = Debrief.finding(for: session, gear: Gear())
      XCTAssertEqual(found?.kind.rawValue, shoot.kind, "\(shoot.name): landed on the wrong finding")
      XCTAssertEqual(found?.headline, shoot.expects, "\(shoot.name): said something else")
    }
  }

  /// Six scenarios that all produced the same sentence would pass the test
  /// above and be useless as test data.
  func testTheScenariosAreActuallyDifferent() {
    let kinds = Set(Self.shoots.compactMap(\.kind))
    XCTAssertEqual(kinds.count, Finding.Kind.allCases.count,
                   "every finding the app can make should have a scenario that triggers it")
  }
}
