import Foundation

/// The lens, and whether it can take the photograph on the card.
///
/// One standard lens, no setup, no questions. Every scene is written for it.
/// The photographer may add one lens of their own, and the point of letting
/// them is not configuration: it is that the card can then say something true
/// about the thing in their bag. Sometimes that is "yours will not reach this".
/// Sometimes it is "yours is two stops better than the one these numbers
/// assume", which is the most useful sentence a beginner can be handed before
/// they spend money.
public struct Lens: Hashable, Codable, Sendable {
  public let min: Double
  public let max: Double
  public let widest: Double

  public init(min: Double, max: Double, widest: Double) {
    self.min = min; self.max = max; self.widest = widest
  }

  public var name: String { "\(short) f/\(printed(widest))" }
  public var short: String {
    min == max ? "\(printed(min)) mm" : "\(printed(min)) to \(printed(max)) mm"
  }
  public func covers(_ focal: Double) -> Bool { focal >= min && focal <= max }

  /// A lens the photographer typed in, cleaned up, or nil if it is not one.
  public static func make(min: Double, max: Double, widest: Double) -> Lens? {
    let lo = min.rounded(), hi = max.rounded()
    guard lo > 0, hi > 0, widest > 0, lo >= 4, hi <= 2000, hi >= lo, widest >= 0.7, widest <= 45
    else { return nil }
    return Lens(min: lo, max: hi, widest: widest)
  }

  /// The lens every scene is written for. f/2 rather than the f/4 a real kit
  /// zoom offers, and no such lens is sold: at f/4 no scene could show a
  /// background that had genuinely dissolved, so the most striking thing an
  /// aperture does was missing from an app whose whole job is to show what
  /// apertures do. The gear page says so plainly.
  public static let standard = Lens(min: 24, max: 105, widest: 2)
}

public struct Gear: Hashable, Codable, Sendable {
  public var own: Lens?
  public init(own: Lens? = nil) { self.own = own }
  public var lenses: [Lens] { own.map { [Lens.standard, $0] } ?? [Lens.standard] }
}

public enum Verdict: String, Sendable { case ok, good, warn }

public struct LensAdvice: Sendable {
  public let lens: Lens
  public let tone: Verdict
  public let verdict: String
  public let lines: [String]
}

public enum LensAdvisor {
  /// Stops between two f-numbers, positive meaning the first is the wider one.
  static func stopsWider(from: Double, to: Double) -> Double { log2((to * to) / (from * from)) }

  static func stops(_ s: Double) -> String {
    let n = (s * 3).rounded() / 3
    if abs(n - n.rounded()) < 0.05 {
      let whole = Int(n.rounded())
      return "\(whole) stop\(whole == 1 ? "" : "s")"
    }
    return String(format: "%.1f stops", n)
  }

  public static func advise(gear: Gear, focal: Double, aperture: Double) -> LensAdvice {
    let standardFits = Lens.standard.covers(focal)
    guard let own = gear.own else {
      return LensAdvice(
        lens: .standard, tone: .ok,
        verdict: "Set the standard zoom to \(printed(focal)) mm.",
        lines: ["Everything in this app is written for a \(Lens.standard.name), which is a teaching lens rather than one you can buy. Add your own on the Gear page and this will talk about that one instead."])
    }

    if own.covers(focal) {
      if own.widest > aperture {
        // Their lens cannot open as wide as the shot asks for. Two different
        // things are lost and both are worth saying: the light comes back on
        // the ISO, and the depth of field does not come back at all.
        let short = stopsWider(from: aperture, to: own.widest)
        return LensAdvice(
          lens: own, tone: .warn,
          verdict: "Your \(own.short) reaches \(printed(focal)) mm, but only opens to f/\(printed(own.widest)).",
          lines: [
            "That is \(stops(short)) short of the f/\(printed(aperture)) on the card. Shoot it at f/\(printed(own.widest)) and the camera picks \(stops(short)) more ISO to make the brightness up, which costs you a little grain.",
            "The background is the part that does not come back. It will stay closer to what you see at f/\(printed(own.widest)) than to the photograph above.",
          ])
      }
      let gap = stopsWider(from: own.widest, to: aperture)
      if gap >= 0.9 {
        // The case worth building for: their lens is better than the one the
        // card assumes.
        return LensAdvice(
          lens: own, tone: .good,
          verdict: "Your \(own.name) does this, and does it better than the standard zoom.",
          lines: [
            "Wide open at f/\(printed(own.widest)) it is \(stops(gap)) brighter than the f/\(printed(aperture)) on the card, so the camera drops the ISO by the same amount.",
            "The background will also go softer than the photograph above, which is what people mean when they say a fast lens looks different.",
          ])
      }
      return LensAdvice(
        lens: own, tone: .ok,
        verdict: "Your \(own.short) covers this. Set it to \(printed(focal)) mm.",
        lines: ["It opens to f/\(printed(own.widest)), which is enough for the f/\(printed(aperture)) this shot wants."])
    }

    // Their lens will not reach. Say what to do about it, and fall back to the
    // standard zoom rather than leaving them with nothing.
    let tooLong = own.min > focal
    let reach = tooLong ? "\(printed(own.min)) mm at its widest" : "\(printed(own.max)) mm at its longest"
    var lines = [tooLong
      ? "To frame this with it you would have to walk a long way back, and often there is nowhere to walk back to."
      : "You can walk closer instead, but the subject then sits against a background that has grown behind it, which is a different photograph."]
    if standardFits {
      lines.append("The standard \(Lens.standard.short) zoom does reach \(printed(focal)) mm, so put that on.")
    }
    return LensAdvice(
      lens: standardFits ? .standard : own, tone: .warn,
      verdict: "Your \(own.short) will not do this: it is \(reach), and this wants \(printed(focal)) mm.",
      lines: lines)
  }
}
