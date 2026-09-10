import SwiftUI

/// The mark: a camera mode dial with its indicator turned away from the green
/// square and onto M, which is the one thing this app asks of anybody and the
/// thing it is named after.
///
/// Drawn rather than shipped as an image so it stays crisp at every size and
/// takes its colour from the text around it. The geometry is the same as the
/// web app's SVG, on the same 64 by 64 grid.
struct Mark: View {
  var body: some View {
    GeometryReader { geo in
      let unit = min(geo.size.width, geo.size.height) / 64
      ZStack {
        Dial().stroke(Color.primary, style: StrokeStyle(lineWidth: 3.6 * unit, lineCap: .round))
        Letter().stroke(Color.primary, style: StrokeStyle(lineWidth: 3.6 * unit, lineCap: .round, lineJoin: .round))
        Circle()
          .fill(Palette.hex(0xE8A33D))
          .frame(width: 10 * unit, height: 10 * unit)
          .position(x: 42 * unit, y: 16.68 * unit)
      }
      .frame(width: 64 * unit, height: 64 * unit)
    }
    .aspectRatio(1, contentMode: .fit)
  }

  /// The ring, with a gap where the indicator sits.
  private struct Dial: Shape {
    func path(in rect: CGRect) -> Path {
      let unit = min(rect.width, rect.height) / 64
      var path = Path()
      path.addArc(center: CGPoint(x: 32 * unit, y: 34 * unit), radius: 20 * unit,
                  startAngle: .degrees(-34), endAngle: .degrees(-86), clockwise: false)
      return path
    }
  }

  private struct Letter: Shape {
    func path(in rect: CGRect) -> Path {
      let unit = min(rect.width, rect.height) / 64
      var path = Path()
      path.move(to: CGPoint(x: 22.5 * unit, y: 42.5 * unit))
      path.addLine(to: CGPoint(x: 22.5 * unit, y: 26.8 * unit))
      path.addLine(to: CGPoint(x: 32 * unit, y: 36.2 * unit))
      path.addLine(to: CGPoint(x: 41.5 * unit, y: 26.8 * unit))
      path.addLine(to: CGPoint(x: 41.5 * unit, y: 42.5 * unit))
      return path
    }
  }
}

/// Mark and wordmark. Two lines, because the name is two words that mean
/// opposite things and stacking them is what makes that read.
struct Lockup: View {
  @Environment(\.colorScheme) private var scheme
  private let hero: Bool

  init(hero: Bool = false) { self.hero = hero }

  var body: some View {
    HStack(spacing: hero ? 16 : 10) {
      Mark()
        .frame(width: hero ? 54 : 34, height: hero ? 54 : 34)
        .foregroundStyle(Palette.ink(scheme))
        .padding(hero ? 16 : 0)
        .background {
          if hero {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
              .fill(Palette.card(scheme))
              .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(Palette.line(scheme)))
          }
        }
      VStack(alignment: .leading, spacing: hero ? -6 : -3) {
        Text("OFF").foregroundStyle(Palette.ink(scheme))
        Text("AUTO").foregroundStyle(Palette.amber(scheme))
      }
      .font(.system(size: hero ? 38 : 16, weight: .bold))
      .kerning(0.4)
    }
  }
}
