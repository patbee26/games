import Foundation

/// A light level, as the exposure value it meters at ISO 100.
public struct Light: Identifiable, Hashable, Sendable {
  public let id: String
  public let name: String
  public let sub: String
  public let ev: Double

  public init(id: String, name: String, sub: String, ev: Double) {
    self.id = id; self.name = name; self.sub = sub; self.ev = ev
  }

  public static func find(_ id: String) -> Light? { all.first { $0.id == id } }
}

/// The three axes a scene can teach on.
public enum Axis: String, CaseIterable, Hashable, Sendable {
  case aperture, focal, shutter

  /// The order the three photographs on this axis were made in, which is also
  /// the order their settings climb in.
  public var steps: [Step] {
    switch self {
    case .aperture: return [.wide, .mid, .deep]
    case .focal: return [.wide, .norm, .long]
    case .shutter: return [.fast, .mid, .slow]
    }
  }

  public var question: String {
    switch self {
    case .aperture: return "What if I change the aperture?"
    case .focal: return "What if I change the lens?"
    case .shutter: return "What if I change the shutter?"
    }
  }

  /// The half of the filename that names the axis, matching the web app's
  /// pictures, so the same photographs serve both.
  public var slug: String {
    switch self {
    case .aperture: return "ap"
    case .focal: return "fl"
    case .shutter: return "sh"
    }
  }
}

public enum Step: String, Hashable, Sendable {
  case wide, mid, deep, norm, long, fast, slow
}

/// The three settings an axis's three photographs were taken at.
public struct Steps: Hashable, Sendable {
  public var values: [Step: Double]

  public init(wide: Double, mid: Double, deep: Double) {
    values = [.wide: wide, .mid: mid, .deep: deep]
  }
  public init(wide: Double, norm: Double, long: Double) {
    values = [.wide: wide, .norm: norm, .long: long]
  }
  public init(fast: Double, mid: Double, slow: Double) {
    values = [.fast: fast, .mid: mid, .slow: slow]
  }
  public subscript(step: Step) -> Double? { values[step] }
}

/// One line of reasoning per leg of the exposure.
public struct Why: Hashable, Sendable {
  public let lens: String
  public let aperture: String
  public let shutter: String
  public init(lens: String, aperture: String, shutter: String) {
    self.lens = lens; self.aperture = aperture; self.shutter = shutter
  }
}

/// A scene, with its settings declared rather than solved.
public struct Lesson: Identifiable, Hashable, Sendable {
  public let id: String
  public let name: String
  public let blurb: String
  public let focal: Double
  public let aperture: Double
  public let shutter: Double
  public let tripod: Bool
  /// A second of daylight needs a filter, and saying so is the lesson rather
  /// than a fault to design around.
  public let needsFilter: Bool
  /// Conditions worth shooting this in. The first is the one the card assumes.
  public let lights: [String]
  public let why: Why
  public let axes: [Axis: Steps]

  public init(id: String, name: String, blurb: String, focal: Double, aperture: Double,
              shutter: Double, tripod: Bool, needsFilter: Bool, lights: [String],
              why: Why, axes: [Axis: Steps]) {
    self.id = id; self.name = name; self.blurb = blurb; self.focal = focal
    self.aperture = aperture; self.shutter = shutter; self.tripod = tripod
    self.needsFilter = needsFilter; self.lights = lights; self.why = why; self.axes = axes
  }

  public static func find(_ id: String) -> Lesson? { all.first { $0.id == id } }

  /// The condition the card is written for.
  public var light: Light { Light.find(lights[0]) ?? Light.all[3] }

  /// The setting the card is showing, on a given axis.
  public func shotValue(_ axis: Axis) -> Double {
    switch axis {
    case .aperture: return aperture
    case .focal: return focal
    case .shutter: return shutter
    }
  }

  /// The axes this scene teaches, in a stable order.
  public var teaching: [Axis] { Axis.allCases.filter { axes[$0] != nil } }

  /// What the tile says the scene is about.
  public var teaches: String {
    let a = teaching
    if a.contains(.shutter) { return "shutter speed" }
    if a.contains(.aperture) && a.contains(.focal) { return "aperture and lens" }
    if a.contains(.aperture) { return "aperture" }
    return "lens"
  }
}
