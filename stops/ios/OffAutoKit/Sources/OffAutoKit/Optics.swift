import Foundation

/// The physical optics the guide's two computed tables rest on.
///
/// The real equations rather than a hand-tuned curve, for the same reason the
/// web app uses them: a table that says a 24 mm lens needs f/8 to hold two
/// people sharp when it does not is teaching something false, and not doing
/// that is the whole point.
public enum Optics {
  /// Sensor width in mm. Full frame, since that is the camera every scene is
  /// written for and a crop factor is one more thing to explain on day one.
  public static let sensorWidth: Double = 36
  public static var circleOfConfusion: Double { sensorWidth / 1500 }

  /// Slowest shutter worth suggesting hand-held: the reciprocal rule, with
  /// stabilisation buying stops on top of it.
  public static func handheldFloor(focal: Double, stabiliserStops: Double = 0) -> Double {
    (1 / focal) * pow(2, stabiliserStops)
  }

  /// The shutter at which this subject's movement starts to show, where its
  /// smear crosses a given fraction of the frame width.
  public static func motionThreshold(focal: Double, speed: Double, subject: Double,
                                     fraction: Double = 0.006) -> Double? {
    guard speed > 0, focal > 0, subject > 0 else { return nil }
    return (fraction * sensorWidth * subject) / (speed * focal)
  }

  /// The f-number needed to hold something at `far` inside the circle of
  /// confusion while focused at `subject`.
  public static func apertureForDepth(focal: Double, subject: Double, far: Double) -> Double? {
    guard focal > 0, subject > 0, far > subject else { return nil }
    let f = focal / 1000
    let ratio = far.isFinite ? (far - subject) / (subject * far) : 1 / subject
    return ((f * f) * ratio * 1000) / circleOfConfusion
  }
}

/// Things that move, and how fast, for the shutter page.
public struct Mover: Hashable, Sendable {
  public let name: String
  public let speed: Double
  /// How far away it sits when framed at 50 mm. Distance scales with focal
  /// length to hold the framing, and the focal length then cancels out of the
  /// sum exactly, which is the surprising part worth teaching.
  public let at50: Double
}

public enum Movers {
  public static let all: [Mover] = [
    Mover(name: "Someone posing", speed: 0.3, at50: 2),
    Mover(name: "Someone walking", speed: 1.4, at50: 5),
    Mover(name: "A child or a dog", speed: 3, at50: 3),
    Mover(name: "A runner", speed: 6, at50: 8),
    Mover(name: "A cyclist going past", speed: 8, at50: 10),
    Mover(name: "A bird in flight", speed: 12, at50: 20),
  ]

  public static func threshold(focal: Double, speed: Double, subject: Double) -> Double {
    Optics.motionThreshold(focal: focal, speed: speed, subject: subject) ?? 1
  }
}

/// Groups of things that all have to be sharp, for the aperture page.
public struct Depth: Hashable, Sendable {
  public let name: String
  public let at50: Double
  /// The gap between the near and far thing that both have to be sharp. It does
  /// not scale with focal length: two rows of people are a metre apart whatever
  /// lens is pointed at them.
  public let gap: Double
}

public enum Depths {
  public static let all: [Depth] = [
    Depth(name: "Both eyes on one face", at50: 1.5, gap: 0.08),
    Depth(name: "Two people side by side", at50: 2.5, gap: 0.4),
    Depth(name: "Two rows of people", at50: 4, gap: 1),
    Depth(name: "A table of six", at50: 2.5, gap: 1.6),
  ]

  public static func aperture(focal: Double, subject: Double, far: Double) -> Double? {
    Optics.apertureForDepth(focal: focal, subject: subject, far: far)
  }
}
