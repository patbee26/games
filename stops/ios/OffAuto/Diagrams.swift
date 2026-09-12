import SwiftUI
import OffAutoKit

/// The two controls this app asks you to touch, drawn rather than photographed.
///
/// Drawn for the same reason the mark is: a photograph of somebody else's
/// camera would teach the shape of that camera. These are the shapes every
/// camera shares, they take their colour from the page, and they stay sharp at
/// any size.

// MARK: the hole

/// The iris, at a given f-number.
///
/// Nine blades, because that is what a decent lens has, and the opening shrinks
/// as the f-number climbs. Seeing f/2 and f/16 next to each other is the
/// fastest way past the one genuinely backwards piece of notation in
/// photography: the bigger number is the smaller hole.
struct ApertureIris: View {
  @Environment(\.colorScheme) private var scheme
  private let f: Double

  init(f: Double) { self.f = f }

  /// The widest the drawing goes, so f/2 fills the barrel and everything else
  /// is honestly smaller than it in proportion to the light it lets through.
  private var opening: Double { min(1, 2 / f) }

  var body: some View {
    GeometryReader { geo in
      let side = min(geo.size.width, geo.size.height)
      ZStack {
        Circle()
          .fill(Palette.line2(scheme))
          .padding(side * 0.07)
        Blades(opening: opening)
          .fill(Palette.amber(scheme))
        Blades(opening: opening)
          .stroke(Palette.card(scheme), lineWidth: side * 0.012)
        Edges(opening: opening)
          .stroke(Palette.card(scheme).opacity(0.55), lineWidth: side * 0.011)
        Circle()
          .strokeBorder(Palette.ink4(scheme), lineWidth: side * 0.035)
      }
      .frame(width: side, height: side)
    }
    .aspectRatio(1, contentMode: .fit)
  }

  private static let blades = 9

  /// The opening itself: a nine-sided hole, which is what a nine-bladed iris
  /// actually makes once it is stopped down at all.
  private struct Blades: Shape {
    let opening: Double

    func path(in rect: CGRect) -> Path {
      let side = min(rect.width, rect.height)
      let centre = CGPoint(x: rect.midX, y: rect.midY)
      let radius = side * 0.39 * opening
      var path = Path()
      for index in 0..<ApertureIris.blades {
        let angle = Double(index) / Double(ApertureIris.blades) * 2 * .pi - .pi / 2
        let point = CGPoint(x: centre.x + cos(angle) * radius, y: centre.y + sin(angle) * radius)
        if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
      }
      path.closeSubpath()
      return path
    }
  }

  /// Where one blade laps over the next, which is the detail that makes it read
  /// as an iris rather than a hole cut in a plate.
  private struct Edges: Shape {
    let opening: Double

    func path(in rect: CGRect) -> Path {
      let side = min(rect.width, rect.height)
      let centre = CGPoint(x: rect.midX, y: rect.midY)
      let inner = side * 0.39 * opening
      let outer = side * 0.43
      var path = Path()
      for index in 0..<ApertureIris.blades {
        let step = 2 * .pi / Double(ApertureIris.blades)
        let angle = Double(index) * step - .pi / 2
        path.move(to: CGPoint(x: centre.x + cos(angle) * inner, y: centre.y + sin(angle) * inner))
        // Swept round by most of one blade, which is the direction they close in.
        let out = angle + step * 0.85
        path.addLine(to: CGPoint(x: centre.x + cos(out) * outer, y: centre.y + sin(out) * outer))
      }
      return path
    }
  }
}

/// Three openings side by side, with what each one costs and buys.
struct IrisRow: View {
  @Environment(\.colorScheme) private var scheme

  init() {}

  private let stops: [(f: Double, label: String, note: String)] = [
    (2, "f/2", "Four stops more light. The background dissolves."),
    (5.6, "f/5.6", "The middle. A face sharp, a room behind it soft."),
    (16, "f/16", "Four stops less. Everything sharp, and you pay for it."),
  ]

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      ForEach(stops, id: \.label) { stop in
        VStack(spacing: 8) {
          ApertureIris(f: stop.f)
            .frame(maxWidth: .infinity)
          Text(stop.label)
            .font(.data(15, .medium))
            .foregroundStyle(Palette.amber(scheme))
          Text(stop.note)
            .font(.system(size: 11.5))
            .foregroundStyle(Palette.ink3(scheme))
            .multilineTextAlignment(.center)
            .lineSpacing(2)
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity)
      }
    }
    .padding(14)
    .background(Palette.card(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Palette.line(scheme)))
    .padding(.bottom, 12)
  }
}

// MARK: the dial

/// A shutter speed dial, engraved the way cameras engrave them.
///
/// Which is the point of drawing it: the dial says 125, not 1/125, and a
/// beginner reading 1000 next to 1 has no reason to know that one of those is
/// eight seconds shorter than the other rather than a thousand times longer.
struct ShutterDial: View {
  @Environment(\.colorScheme) private var scheme
  private let marked: Int

  /// `marked` is the denominator under the index, as written on the dial.
  init(marked: Int = 125) { self.marked = marked }

  private let speeds = [1000, 500, 250, 125, 60, 30, 15, 8]

  var body: some View {
    VStack(spacing: 10) {
      GeometryReader { geo in
        let side = min(geo.size.width, geo.size.height)
        let centre = CGPoint(x: geo.size.width / 2, y: side / 2)
        let radius = side * 0.36
        let index = speeds.firstIndex(of: marked) ?? 0
        let step = 40.0

        ZStack {
          Circle()
            .fill(Palette.card2(scheme))
            .frame(width: side * 0.88, height: side * 0.88)
          Circle()
            .strokeBorder(Palette.line2(scheme), lineWidth: side * 0.02)
            .frame(width: side * 0.88, height: side * 0.88)
          Circle()
            .strokeBorder(Palette.line(scheme), lineWidth: 1)
            .frame(width: side * 0.58, height: side * 0.58)

          ForEach(Array(speeds.enumerated()), id: \.offset) { slot, speed in
            let angle = (Double(slot - index) * step - 90) * .pi / 180
            let on = speed == marked
            Text("\(speed)")
              .font(.data(on ? 14 : 11.5, on ? .semibold : .regular))
              .foregroundStyle(on ? Palette.amber(scheme) : Palette.ink3(scheme))
              .position(x: centre.x + cos(angle) * radius, y: centre.y + sin(angle) * radius)
          }

          // The index mark, which is engraved on the body and never moves.
          Triangle()
            .fill(Palette.amber(scheme))
            .frame(width: side * 0.05, height: side * 0.045)
            .position(x: centre.x, y: centre.y - side * 0.455)
        }
        .frame(width: geo.size.width, height: side)
      }
      .frame(height: 168)

      Text("The dial is engraved with the bottom of the fraction. 125 means one hundred and twenty fifth of a second, and every step along it halves or doubles the light.")
        .font(.system(size: 11.8))
        .foregroundStyle(Palette.ink3(scheme))
        .multilineTextAlignment(.center)
        .lineSpacing(2)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 6)
    }
    .padding(14)
    .frame(maxWidth: .infinity)
    .background(Palette.card(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Palette.line(scheme)))
    .padding(.bottom, 12)
  }

  private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
      var path = Path()
      path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
      path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
      path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
      path.closeSubpath()
      return path
    }
  }
}
