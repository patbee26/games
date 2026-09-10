import XCTest
@testable import OffAutoKit

/// The port, held to the shipped web app rather than to my reading of it.
///
/// `ios/tools/fixture.mjs` runs the JavaScript model over every scene, every
/// light it offers and every chip, and writes down the answers. These tests
/// assert that the Swift produces the same ones, down to the strings. It is
/// worth the machinery because the port was written where Xcode does not exist:
/// this is the half that could be proved, so it was made provable.
final class FixtureTests: XCTestCase {
  struct Fixture: Decodable {
    struct Rung: Decodable { let label: String? ; let v: Double? ; let `in`: Double }
    struct Ladders: Decodable { let snapShutter: [Rung]; let snapAperture: [Rung]; let snapIso: [Rung] }
    struct LightRow: Decodable { let id: String; let name: String; let sub: String; let ev: Double }
    struct AtLight: Decodable { let light: String; let iso: Double; let over: Double; let under: Double; let isoWanted: Double }
    struct ChipRow: Decodable {
      let axis: String; let step: String; let label: String; let value: String; let result: String
      let question: String; let aperture: String; let shutter: String; let focal: Double; let iso: Double; let cost: Double
    }
    struct WhyRow: Decodable { let focal: String; let aperture: String; let shutter: String }
    struct Scene: Decodable {
      let id: String; let name: String; let blurb: String
      let focal: Double; let aperture: Double; let shutter: Double
      let tripod: Bool; let nd: Bool; let why: WhyRow
      let lights: [String]; let axes: [String: [String: Double]]
      let atLight: [AtLight]; let chips: [ChipRow]
    }
    struct LensRow: Decodable {
      struct Own: Decodable { let min: Double; let max: Double; let widest: Double; let name: String }
      let own: Own?; let focal: Double; let aperture: Double
      let tone: String; let lensName: String; let verdict: String; let lines: [String]
    }
    struct StandardLens: Decodable { let name: String; let min: Double; let max: Double; let widest: Double }
    struct IsoSample: Decodable { let aperture: Double; let shutter: Double; let ev: Double; let iso: Double }
    let standardLens: StandardLens
    let isoSample: [IsoSample]
    let ladders: Ladders
    let lights: [LightRow]
    let scenes: [Scene]
    let lens: [LensRow]
    struct MoverRow: Decodable { let name: String; let subject: Double; let label: String }
    struct GuideRow: Decodable {
      let focal: Double; let floor: String; let stabilised: String
      let movers: [MoverRow]; let depths: [MoverRow]
    }
    let guide: [GuideRow]
  }

  static let fixture: Fixture = {
    guard let url = Bundle.module.url(forResource: "model-fixture", withExtension: "json"),
          let data = try? Data(contentsOf: url),
          let decoded = try? JSONDecoder().decode(Fixture.self, from: data)
    else { fatalError("model-fixture.json is missing or will not decode. Run: node ios/tools/fixture.mjs") }
    return decoded
  }()
  var fixture: Fixture { Self.fixture }

  private func axis(_ slug: String) -> Axis {
    switch slug {
    case "ap": return .aperture
    case "fl": return .focal
    default: return .shutter
    }
  }

  // MARK: the ladders

  func testSnappingMatches() {
    for row in fixture.ladders.snapShutter {
      XCTAssertEqual(Ladders.shutter(row.in).label, row.label, "shutter \(row.in)")
    }
    for row in fixture.ladders.snapAperture {
      XCTAssertEqual(Ladders.aperture(row.in).label, row.label, "aperture \(row.in)")
    }
    for row in fixture.ladders.snapIso {
      XCTAssertEqual(Ladders.iso(row.in).value, row.v, "iso \(row.in)")
    }
  }

  func testNumbersPrintTheWayACameraPrintsThem() {
    // Swift would render f/4 as "f/4.0" left to itself, which is not a thing
    // written on any lens.
    XCTAssertEqual(printed(4), "4")
    XCTAssertEqual(printed(5.6), "5.6")
    XCTAssertEqual(printed(1.8), "1.8")
    XCTAssertEqual(printed(105), "105")
  }

  // MARK: the tables

  func testLightsMatch() {
    XCTAssertEqual(Light.all.count, fixture.lights.count)
    for row in fixture.lights {
      let light = Light.find(row.id)
      XCTAssertNotNil(light, "missing light \(row.id)")
      XCTAssertEqual(light?.name, row.name)
      XCTAssertEqual(light?.sub, row.sub)
      XCTAssertEqual(light?.ev, row.ev)
    }
  }

  func testScenesMatch() {
    XCTAssertEqual(Lesson.all.count, fixture.scenes.count)
    for row in fixture.scenes {
      guard let lesson = Lesson.find(row.id) else { return XCTFail("missing scene \(row.id)") }
      XCTAssertEqual(lesson.name, row.name, row.id)
      XCTAssertEqual(lesson.blurb, row.blurb, row.id)
      XCTAssertEqual(lesson.focal, row.focal, row.id)
      XCTAssertEqual(lesson.aperture, row.aperture, row.id)
      XCTAssertEqual(lesson.shutter, row.shutter, accuracy: 1e-9, row.id)
      XCTAssertEqual(lesson.tripod, row.tripod, row.id)
      XCTAssertEqual(lesson.needsFilter, row.nd, row.id)
      XCTAssertEqual(lesson.lights, row.lights, row.id)
      XCTAssertEqual(lesson.why.lens, row.why.focal, row.id)
      XCTAssertEqual(lesson.why.aperture, row.why.aperture, row.id)
      XCTAssertEqual(lesson.why.shutter, row.why.shutter, row.id)
      for (slug, steps) in row.axes {
        guard let ported = lesson.axes[axis(slug)] else { return XCTFail("\(row.id) is missing axis \(slug)") }
        for (step, value) in steps {
          XCTAssertEqual(ported[Step(rawValue: step)!] ?? .nan, value, accuracy: 1e-9, "\(row.id) \(slug)-\(step)")
        }
      }
    }
  }

  // MARK: the sum the camera does

  func testTheIsoIsTheOneTheCameraWouldPick() {
    for sample in fixture.isoSample {
      XCTAssertEqual(Exposure.iso(aperture: sample.aperture, shutter: sample.shutter, ev: sample.ev),
                     sample.iso, accuracy: 1e-3)
    }
  }

  func testEveryCardInEveryLightMatches() {
    for row in fixture.scenes {
      guard let lesson = Lesson.find(row.id) else { return XCTFail("missing scene \(row.id)") }
      for at in row.atLight {
        guard let light = Light.find(at.light) else { return XCTFail("missing light \(at.light)") }
        let shot = lesson.shot(in: light)
        XCTAssertEqual(shot.iso.value, at.iso, "\(row.id) in \(at.light)")
        XCTAssertEqual(shot.over, at.over, accuracy: 1e-6, "\(row.id) in \(at.light) over")
        XCTAssertEqual(shot.under, at.under, accuracy: 1e-6, "\(row.id) in \(at.light) under")
        XCTAssertEqual(shot.isoWanted, at.isoWanted, accuracy: 1e-3, "\(row.id) in \(at.light) wanted")
      }
    }
  }

  // MARK: the chips

  func testEveryChipMatches() {
    var seen = 0
    for row in fixture.scenes {
      guard let lesson = Lesson.find(row.id) else { return XCTFail("missing scene \(row.id)") }
      let ported = lesson.chipGroups.flatMap(\.chips)
      XCTAssertEqual(ported.count, row.chips.count, "\(row.id) chip count")
      for expected in row.chips {
        guard let chip = ported.first(where: { $0.axis == axis(expected.axis) && $0.step.rawValue == expected.step })
        else { return XCTFail("\(row.id) has no \(expected.axis)-\(expected.step) chip") }
        XCTAssertEqual(chip.label, expected.label, "\(row.id) \(chip.id) label")
        XCTAssertEqual(chip.value, expected.value, "\(row.id) \(chip.id) value")
        XCTAssertEqual(chip.result, expected.result, "\(row.id) \(chip.id) result")
        XCTAssertEqual(chip.axis.question, expected.question, "\(row.id) \(chip.id) question")

        let shot = lesson.shot(change: chip.change)
        XCTAssertEqual(shot.aperture.label, expected.aperture, "\(row.id) \(chip.id) aperture")
        XCTAssertEqual(shot.shutter.label, expected.shutter, "\(row.id) \(chip.id) shutter")
        XCTAssertEqual(shot.focal, expected.focal, "\(row.id) \(chip.id) focal")
        XCTAssertEqual(shot.iso.value, expected.iso, "\(row.id) \(chip.id) iso")
        XCTAssertEqual(shot.cost, expected.cost, accuracy: 1e-3, "\(row.id) \(chip.id) cost")
        seen += 1
      }
    }
    XCTAssertEqual(seen, 33, "the web app has thirty-three chips across the twelve scenes")
  }

  func testAChipMovesExactlyOneSetting() {
    for lesson in Lesson.all {
      let before = lesson.shot()
      for chip in lesson.chipGroups.flatMap(\.chips) {
        let after = lesson.shot(change: chip.change)
        var moved: [Axis] = []
        if after.aperture.label != before.aperture.label { moved.append(.aperture) }
        if after.shutter.label != before.shutter.label { moved.append(.shutter) }
        if after.focal != before.focal { moved.append(.focal) }
        XCTAssertEqual(moved, [chip.axis], "\(lesson.id) \(chip.id)")
      }
    }
  }

  // MARK: the lens

  func testTheStandardLensMatches() {
    XCTAssertEqual(Lens.standard.name, fixture.standardLens.name)
    XCTAssertEqual(Lens.standard.min, fixture.standardLens.min)
    XCTAssertEqual(Lens.standard.max, fixture.standardLens.max)
    XCTAssertEqual(Lens.standard.widest, fixture.standardLens.widest)
  }

  // MARK: the guide's computed tables

  func testTheGuideTablesMatch() {
    // The optics under the shutter and aperture pages. A table that says a
    // 24 mm lens needs f/8 where it does not is teaching something false, and
    // not doing that is the whole point of using the real equations.
    for row in fixture.guide {
      XCTAssertEqual(Ladders.shutter(Optics.handheldFloor(focal: row.focal)).label, row.floor,
                     "hand-held floor at \(row.focal)mm")
      XCTAssertEqual(Ladders.shutter(Optics.handheldFloor(focal: row.focal, stabiliserStops: 3)).label,
                     row.stabilised, "stabilised floor at \(row.focal)mm")

      for expected in row.movers {
        guard let mover = Movers.all.first(where: { $0.name == expected.name })
        else { return XCTFail("missing mover \(expected.name)") }
        let subject = mover.at50 * (row.focal / 50)
        XCTAssertEqual(subject, expected.subject, accuracy: 1e-4, expected.name)
        let threshold = Movers.threshold(focal: row.focal, speed: mover.speed, subject: subject)
        XCTAssertEqual(Ladders.shutter(threshold).label, expected.label,
                       "\(expected.name) at \(row.focal)mm")
      }

      for expected in row.depths {
        guard let depth = Depths.all.first(where: { $0.name == expected.name })
        else { return XCTFail("missing depth \(expected.name)") }
        let subject = depth.at50 * (row.focal / 50)
        XCTAssertEqual(subject, expected.subject, accuracy: 1e-4, expected.name)
        let needed = Depths.aperture(focal: row.focal, subject: subject, far: subject + depth.gap)
        let label = needed.map { Ladders.aperture($0).label } ?? "any"
        XCTAssertEqual(label, expected.label, "\(expected.name) at \(row.focal)mm")
      }
    }
  }

  func testEveryPieceOfLensAdviceMatches() {
    for row in fixture.lens {
      let gear = Gear(own: row.own.flatMap { Lens.make(min: $0.min, max: $0.max, widest: $0.widest) })
      if let own = row.own { XCTAssertEqual(gear.own?.name, own.name) }
      let advice = LensAdvisor.advise(gear: gear, focal: row.focal, aperture: row.aperture)
      let label = "\(row.own?.name ?? "no lens") at \(row.focal)mm f/\(row.aperture)"
      XCTAssertEqual(advice.tone.rawValue, row.tone, label)
      XCTAssertEqual(advice.lens.name, row.lensName, label)
      XCTAssertEqual(advice.verdict, row.verdict, label)
      XCTAssertEqual(advice.lines, row.lines, label)
    }
  }
}
