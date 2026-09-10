import Foundation

/// One photograph, reduced to the four numbers this app has anything to say
/// about. Everything else the file carries is deliberately not read.
public struct Frame: Identifiable, Hashable, Sendable {
  public let id: String
  public let date: Date
  public let aperture: Double
  public let shutter: Double
  public let iso: Double
  /// In full-frame terms, since that is what every scene is written in.
  public let focal: Double

  public init(id: String, date: Date, aperture: Double, shutter: Double, iso: Double, focal: Double) {
    self.id = id; self.date = date; self.aperture = aperture
    self.shutter = shutter; self.iso = iso; self.focal = focal
  }

  /// The light this was taken in, worked back out of the exposure. This is the
  /// quiet trick the whole feature rests on: with the light known, a wrong
  /// choice can be told apart from a photograph that was never available.
  public var ev: Double { log2((aperture * aperture) / shutter) - log2(iso / 100) }
}

/// An afternoon out. Frames close together in time, which is as good a
/// definition of "a shoot" as anything the file can tell us.
public struct Session: Identifiable, Hashable, Sendable {
  public let frames: [Frame]
  public var id: String { frames.first?.id ?? "empty" }
  public var start: Date { frames.first?.date ?? .distantPast }
  public var end: Date { frames.last?.date ?? .distantPast }
  public var count: Int { frames.count }

  public init(frames: [Frame]) { self.frames = frames.sorted { $0.date < $1.date } }
}

public enum Sessions {
  /// Three hours, which is long enough to include lunch and short enough that
  /// Saturday and Sunday do not become one thing.
  public static let gap: TimeInterval = 3 * 3600

  public static func group(_ frames: [Frame], gap: TimeInterval = gap) -> [Session] {
    let sorted = frames.sorted { $0.date < $1.date }
    var sessions: [Session] = []
    var current: [Frame] = []
    for frame in sorted {
      if let last = current.last, frame.date.timeIntervalSince(last.date) > gap {
        sessions.append(Session(frames: current))
        current = []
      }
      current.append(frame)
    }
    if !current.isEmpty { sessions.append(Session(frames: current)) }
    return sessions
  }

  /// The most recent session worth saying anything about. Fewer than five
  /// frames is not a shoot, it is a test frame and a picture of a cat.
  public static func latest(_ frames: [Frame], minimumFrames: Int = 5) -> Session? {
    group(frames).last { $0.count >= minimumFrames }
  }
}

/// What the app noticed about a session. One of these, or none.
public struct Finding: Identifiable, Sendable {
  public enum Kind: String, Sendable {
    case shake, grain, oneAperture   // worth fixing
    case spread, steady              // worth saying out loud
  }

  public let kind: Kind
  public let headline: String
  public let body: String
  /// The frames it is talking about, so the reader can go and look at them.
  public let frames: [Frame]
  public var id: String { kind.rawValue }
  public var isPraise: Bool { kind == .spread || kind == .steady }
}

/// Reading a session and finding the one thing worth saying.
///
/// One thing, never a list. If three habits are visible it names the one that
/// affected the most frames and keeps the others to itself, because a reader
/// handed three corrections fixes none of them. And it looks for something done
/// well with the same seriousness it looks for faults: a tutorial that only ever
/// finds fault teaches you to stop opening it.
public enum Debrief {
  /// Half a stop of slack before a frame counts as slower than the hands can
  /// hold, because the reciprocal rule is a rough thing rather than a law.
  static let shakeSlack = 1.4
  /// Where grain starts to be a thing worth mentioning.
  static let grainISO: Double = 3200

  public static func finding(for session: Session, gear: Gear) -> Finding? {
    let frames = session.frames
    guard frames.count >= 2 else { return nil }

    // Worth fixing first, most-frames-affected first within that, and only
    // then something done well. Never two at once.
    if let found = shake(frames) { return found }
    if let found = grain(frames, gear: gear) { return found }
    if let found = oneAperture(frames) { return found }
    if let found = spread(frames) { return found }
    return steady(frames)
  }

  // MARK: worth fixing

  static func shake(_ frames: [Frame]) -> Finding? {
    let slow = frames.filter { $0.shutter > Optics.handheldFloor(focal: $0.focal) * shakeSlack }
    guard slow.count >= 2 else { return nil }
    let focal = printed((slow.map(\.focal).reduce(0, +) / Double(slow.count)).rounded())
    return Finding(
      kind: .shake,
      headline: "\(count(slow.count)) \(were(slow.count)) slower than your hands hold at \(focal) mm.",
      body: "The rest were fine. Below about one over the focal length your own movement smears the "
          + "whole frame rather than just the subject, so if these look soft everywhere, that is "
          + "this and not your focus.",
      frames: slow)
  }

  /// Grain that was paid for and did not have to be. Only counts when the lens
  /// in the bag actually had the stops to spare.
  static func grain(_ frames: [Frame], gear: Gear) -> Finding? {
    let costly = frames.filter { frame in
      guard frame.iso >= grainISO,
            let widest = widestAperture(for: frame.focal, gear: gear) else { return false }
      return 2 * log2(frame.aperture / widest) >= 1
    }
    guard costly.count >= 2 else { return nil }
    let worst = costly.max { a, b in a.iso < b.iso } ?? costly[0]
    guard let widest = widestAperture(for: worst.focal, gear: gear) else { return nil }
    let spare = 2 * log2(worst.aperture / widest)
    return Finding(
      kind: .grain,
      headline: "\(count(costly.count)) \(were(costly.count)) grainier than \(they(costly.count)) needed to be.",
      body: "One was at \(Ladders.aperture(worst.aperture).label) and ISO \(Ladders.iso(worst.iso).label), "
          + "with a lens that opens to \(Ladders.aperture(widest).label). Opening up would have bought "
          + "\(stops(spare)) back off the ISO, and the background would have softened as well.",
      frames: costly)
  }

  /// Not a fault, and worded as an observation, because f/8 all afternoon is
  /// exactly right for the street card and exactly wrong for the portrait one.
  static func oneAperture(_ frames: [Frame]) -> Finding? {
    let apertures = frames.map(\.aperture)
    guard let low = apertures.min(), let high = apertures.max() else { return nil }
    guard 2 * log2(high / low) < 0.2 else { return nil }
    let evs = frames.map(\.ev)
    guard let dark = evs.min(), let bright = evs.max(), bright - dark >= 2 else { return nil }
    return Finding(
      kind: .oneAperture,
      headline: "Every frame was at \(Ladders.aperture(low).label).",
      body: "The light moved \(stops(bright - dark)) across this set and the aperture did not move at "
          + "all. That is a fine answer on some cards and the wrong one on others: it is one of the "
          + "two decisions you actually get to make.",
      frames: frames)
  }

  // MARK: worth saying out loud

  static func spread(_ frames: [Frame]) -> Finding? {
    let apertures = frames.map(\.aperture)
    guard let low = apertures.min(), let high = apertures.max() else { return nil }
    let range = 2 * log2(high / low)
    guard range >= 3 else { return nil }
    return Finding(
      kind: .spread,
      headline: "You worked \(stops(range)) of aperture across this set.",
      body: "From \(Ladders.aperture(low).label) to \(Ladders.aperture(high).label). That is the "
          + "aperture being used as a decision rather than left where it was, which is the whole "
          + "thing these cards are trying to teach.",
      frames: frames)
  }

  /// Only worth saying when it was actually a challenge. Praising someone for
  /// holding 1/1000 in bright sun is praising the sun.
  static func steady(_ frames: [Frame]) -> Finding? {
    let close = frames.filter { frame in
      let floor = Optics.handheldFloor(focal: frame.focal)
      let margin = log2(floor / frame.shutter)
      return margin >= 0 && margin <= 2
    }
    guard close.count * 4 >= frames.count, close.count >= 2 else { return nil }
    return Finding(
      kind: .steady,
      headline: "Nothing here was slower than your hands could hold.",
      body: "\(count(close.count)) of \(frames.count) sat within a couple of stops of the limit, so "
          + "this was not a set where the light made it easy. You kept the shutter above it anyway.",
      frames: close)
  }

  // MARK: saying it

  /// How wide the lens in their bag actually opens at this focal length, or nil
  /// when there is no way to know.
  ///
  /// The standard lens is what the cards assume, not something anybody owns, so
  /// it only counts when the photographer has not told us about a lens of their
  /// own. Once they have, that is the lens to judge by, and if it does not reach
  /// the focal length they shot at then they used something we have never heard
  /// of and the app has no business having an opinion. Blaming somebody for not
  /// opening to f/2 on a lens that stops at f/4 is the exact failure this whole
  /// feature is trying to avoid.
  static func widestAperture(for focal: Double, gear: Gear) -> Double? {
    guard let own = gear.own else { return Lens.standard.widest }
    return own.covers(focal) ? own.widest : nil
  }

  static func stops(_ s: Double) -> String {
    let n = s.rounded()
    if n < 1 { return "part of a stop" }
    return "\(Int(n)) stop\(n == 1 ? "" : "s")"
  }

  public static let words = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
                      "Nine", "Ten", "Eleven", "Twelve"]
  public static func count(_ n: Int) -> String { n < words.count ? words[n] : "\(n)" }
  static func were(_ n: Int) -> String { n == 1 ? "was" : "were" }
  static func they(_ n: Int) -> String { n == 1 ? "it" : "they" }
}
