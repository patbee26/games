import Foundation

/// Working out the one card.
///
/// The camera is in manual with Auto ISO, so the photographer sets the aperture
/// and the shutter and the camera picks the ISO. That is the whole reason the
/// card can carry two numbers: they are the two creative decisions, and the
/// third leg has no creative consequence worth teaching on day one. So the only
/// sum here is the one the camera itself does.
///
///     EV = log2(N² / t) − log2(ISO / 100)
///
/// rearranged for the ISO the camera will land on:
///
///     ISO = 100 · (N² / t) / 2^EV
public enum Exposure {
  /// The floor and ceiling Auto ISO is allowed to use.
  public static let isoMin: Double = 100
  public static let isoMax: Double = 12800

  /// The ISO the camera would choose, before it is clamped to what it has.
  public static func iso(aperture: Double, shutter: Double, ev: Double) -> Double {
    100 * ((aperture * aperture) / shutter) / pow(2, ev)
  }
}

/// A chip: one axis moved to one of its other two settings.
public struct Change: Hashable, Sendable {
  public let axis: ShotAxis
  public let step: Step
  public init(axis: ShotAxis, step: Step) { self.axis = axis; self.step = step }
}

/// The settings for a scene in a light, optionally with one thing changed.
public struct Shot: Sendable {
  public let lesson: Lesson
  public let light: Light
  public let change: Change?
  public let focal: Double
  public let aperture: Rung
  public let shutter: Rung
  public let iso: Rung
  public let isoWanted: Double
  /// Stops of light beyond what the lowest ISO can take. A camera cannot go
  /// below its base ISO, so this is light that has to be taken away.
  public let over: Double
  /// Stops of light the camera does not have.
  public let under: Double

  public var needsFilter: Bool { lesson.needsFilter && over > 0.6 }

  /// Which photograph goes with these settings. With no chip tapped it is the
  /// scene's own picture; with one tapped it is that chip's variation.
  public var photo: String {
    guard let change else { return lesson.id }
    return "\(lesson.id)__\(change.axis.slug)-\(change.step.rawValue)"
  }

  public init(lesson: Lesson, light: Light, change: Change?) {
    self.lesson = lesson
    self.light = light

    var focal = lesson.focal, aperture = lesson.aperture, shutter = lesson.shutter
    var applied: Change?
    if let change, let value = lesson.axes[change.axis]?[change.step] {
      applied = change
      switch change.axis {
      case .aperture: aperture = value
      case .focal: focal = value
      case .shutter: shutter = value
      }
    }
    self.change = applied
    self.focal = focal

    let wanted = Exposure.iso(aperture: aperture, shutter: shutter, ev: light.ev)
    self.isoWanted = wanted
    self.aperture = Ladders.aperture(aperture)
    self.shutter = Ladders.shutter(shutter)
    self.iso = Ladders.iso(min(Exposure.isoMax, max(Exposure.isoMin, wanted)))
    self.over = wanted < Exposure.isoMin ? log2(Exposure.isoMin / wanted) : 0
    self.under = wanted > Exposure.isoMax ? log2(wanted / Exposure.isoMax) : 0
  }

  /// The stops of light a change costs, positive meaning it needs more.
  public var cost: Double {
    guard change != nil else { return 0 }
    let before = Shot(lesson: lesson, light: light, change: nil)
    return log2(isoWanted / before.isoWanted)
  }
}

public extension Lesson {
  func shot(in light: Light, change: Change? = nil) -> Shot {
    Shot(lesson: self, light: light, change: change)
  }
  func shot(change: Change? = nil) -> Shot {
    Shot(lesson: self, light: light, change: change)
  }
}
