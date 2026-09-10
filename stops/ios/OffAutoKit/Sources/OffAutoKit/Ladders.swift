import Foundation

/// Numbers formatted the way the web app formats them, which is the way a
/// camera prints them: whole where they are whole, and no trailing zeros.
/// Swift's default would render f/4 as "f/4.0".
public func printed(_ x: Double) -> String {
  if x == x.rounded() && abs(x) < 1e15 { return String(Int(x)) }
  var s = String(format: "%.10f", x)
  while s.hasSuffix("0") { s.removeLast() }
  if s.hasSuffix(".") { s.removeLast() }
  return s
}

/// A value a camera dial actually stops on.
public struct Rung: Hashable, Sendable {
  public let value: Double
  public let label: String
}

/// The values a camera dial actually stops on, in third-stop increments.
/// Everything the app states is snapped to one of these, so the number on
/// screen is a number that can be dialled in.
public enum Ladders {
  public static let shutters: [Rung] = {
    let denominators: [Double] = [
      8000, 6400, 5000, 4000, 3200, 2500, 2000, 1600, 1250, 1000, 800, 640,
      500, 400, 320, 250, 200, 160, 125, 100, 80, 60, 50, 40, 30, 25, 20, 15,
      13, 10, 8, 6, 5, 4, 3,
    ]
    let longs: [Double] = [0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30]
    return denominators.map { Rung(value: 1 / $0, label: "1/" + printed($0)) }
      + longs.map { Rung(value: $0, label: ($0 == $0.rounded() ? printed($0) : String(format: "%.1f", $0)) + "s") }
  }()

  public static let apertures: [Rung] = [
    1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3,
    7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32,
  ].map { Rung(value: $0, label: "f/" + printed($0)) }

  public static let isos: [Rung] = [
    50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250,
    1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000,
    25600, 32000, 40000, 51200,
  ].map { Rung(value: $0, label: printed($0)) }

  /// Nearest rung, measured in stops rather than raw difference. A third of a
  /// stop is the same distance at 1/8000 as at thirty seconds, and a raw
  /// difference is not.
  public static func snap(_ value: Double, to ladder: [Rung]) -> Rung {
    var best = ladder[0]
    var bestDistance = Double.infinity
    for rung in ladder {
      let distance = abs(log2(rung.value / value))
      if distance < bestDistance { bestDistance = distance; best = rung }
    }
    return best
  }

  public static func shutter(_ s: Double) -> Rung { snap(s, to: shutters) }
  public static func aperture(_ n: Double) -> Rung { snap(n, to: apertures) }
  public static func iso(_ v: Double) -> Rung { snap(v, to: isos) }
}
