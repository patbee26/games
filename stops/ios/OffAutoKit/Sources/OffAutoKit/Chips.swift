import Foundation

/// The chips under the picture: "what happens if I change something".
///
/// A chip is not a control. Nothing on the card can be set, and the settings it
/// shows are the settings for the shot. A chip answers a question, namely what
/// this would look like if I opened the aperture, and answering it swaps the
/// photograph, moves one number, and says what it cost.
public struct Chip: Identifiable, Hashable, Sendable {
  public let axis: Axis
  public let step: Step
  /// Which way and how far, said the way a person would say it out loud.
  public let label: String
  /// The setting itself, as it reads on a dial.
  public let value: String
  /// What changes in the picture, said of the picture rather than the setting.
  public let result: String

  public var id: String { "\(axis.slug)-\(step.rawValue)" }
  public var change: Change { Change(axis: axis, step: step) }
}

public struct ChipGroup: Identifiable, Hashable, Sendable {
  public let axis: Axis
  public let question: String
  public let chips: [Chip]
  public var id: String { axis.rawValue }
}

public extension Lesson {
  /// Every step on every axis except the one the shot is already at, since a
  /// chip that changes nothing is a chip that teaches nothing.
  ///
  /// On the aperture axis none of the three is the shot, so all three appear.
  /// That is the point of the four-picture ladder: the photograph with the
  /// background completely gone is something the reader can ask for.
  var chipGroups: [ChipGroup] {
    teaching.compactMap { axis in
      guard let steps = axes[axis] else { return nil }
      let shot = shotValue(axis)
      let chips = axis.steps.compactMap { step -> Chip? in
        guard let value = steps[step], abs(value / shot - 1) >= 0.01 else { return nil }
        return Chip(axis: axis, step: step,
                    label: Chips.label(axis: axis, distance: Chips.distance(axis: axis, from: shot, to: value)),
                    value: Chips.value(axis: axis, value),
                    result: Chips.result(axis: axis, step: step))
      }
      return ChipGroup(axis: axis, question: axis.question, chips: chips)
    }
  }
}

public enum Chips {
  /// How far a step is from the shot, and which way.
  ///
  /// Aperture and shutter are counted in stops, which is what the change
  /// actually costs. Focal length is counted as a ratio, because a lens twice
  /// as long is twice as long whatever you started from. Negative is the open,
  /// fast or wide direction.
  public static func distance(axis: Axis, from: Double, to value: Double) -> Double {
    switch axis {
    case .aperture: return 2 * log2(value / from)
    case .shutter: return log2(value / from)
    case .focal: return value >= from ? value / from : -(from / value)
    }
  }

  /// Where the boundaries between "a little", "right down" and "all the way"
  /// sit, per axis.
  static func tiers(_ axis: Axis) -> (Double, Double) {
    switch axis {
    case .aperture: return (1.6, 3.2)
    case .focal: return (1.8, 3)
    case .shutter: return (1.6, 4)
    }
  }

  /// Three sizes each way, rather than two, because the aperture axis spans
  /// four stops and a single "close it down" would have to serve both f/8 and
  /// f/16 on the same card. Two chips reading the same thing is worse than a
  /// clumsy word.
  public static func label(axis: Axis, distance: Double) -> String {
    let (near, far) = tiers(axis)
    let magnitude = abs(distance) < near ? 1 : (abs(distance) < far ? 2 : 3)
    let size = distance < 0 ? -magnitude : magnitude
    switch axis {
    case .aperture:
      switch size {
      case -3: return "Open it all the way"
      case -2: return "Open it right up"
      case -1: return "Open it a little"
      case 1: return "Close it a little"
      case 2: return "Close it right down"
      default: return "Close it all the way"
      }
    case .focal:
      switch size {
      case -3: return "Much wider, up close"
      case -2: return "Wider, step closer"
      case -1: return "Slightly wider"
      case 1: return "Slightly longer"
      case 2: return "Longer, step back"
      default: return "Much longer, far back"
      }
    case .shutter:
      switch size {
      case -3: return "Much faster"
      case -2: return "Faster"
      case -1: return "A bit faster"
      case 1: return "A bit slower"
      case 2: return "Slower"
      default: return "Much slower"
      }
    }
  }

  public static func value(axis: Axis, _ value: Double) -> String {
    switch axis {
    case .aperture: return Ladders.aperture(value).label
    case .shutter: return Ladders.shutter(value).label
    case .focal: return "\(printed(value)) mm"
    }
  }

  /// Said of the picture rather than of the setting, since the setting is
  /// already on the chip, and said of "the subject" and "the movement" so that
  /// one sentence serves twelve scenes. Panning is the reason the shutter lines
  /// say "the movement" and never "the background": there it is the background
  /// that streaks, and the same sentence has to be true of both.
  public static func result(axis: Axis, step: Step) -> String {
    switch (axis, step) {
    case (.aperture, .wide): return "the background dissolves away completely"
    case (.aperture, .mid): return "the background goes soft, but you can still tell what it is"
    case (.aperture, .deep): return "everything is sharp, front to back"
    case (.focal, .wide): return "far more fits in behind, and all of it looks small and far off"
    case (.focal, .norm): return "the background sits about where your eye would put it"
    case (.focal, .long): return "a narrow slice of background, magnified up behind the subject"
    case (.shutter, .fast): return "the movement freezes, caught in one instant"
    case (.shutter, .mid): return "the movement just starts to show"
    case (.shutter, .slow): return "the movement draws itself out into streaks"
    default: return ""
    }
  }
}
