import SwiftUI
import OffAutoKit

/// A chip: a question, not a control.
struct ChipButton: View {
  @Environment(\.colorScheme) private var scheme
  private let chip: Chip
  private let on: Bool
  private let tap: () -> Void

  init(chip: Chip, on: Bool, tap: @escaping () -> Void) {
    self.chip = chip; self.on = on; self.tap = tap
  }

  var body: some View {
    Button(action: tap) {
      HStack(alignment: .firstTextBaseline, spacing: 5) {
        Text(chip.label).font(.system(size: 12.5, weight: on ? .semibold : .regular))
        Text(chip.value).font(.data(11))
          .foregroundStyle(on ? (scheme == .dark ? Palette.hex(0x4A3A16) : Palette.hex(0xE8D6AE))
                              : Palette.ink3(scheme))
      }
      .foregroundStyle(on ? (scheme == .dark ? Palette.hex(0x14100A) : Palette.hex(0xFFFBF2))
                          : Palette.ink(scheme))
      .padding(.horizontal, 11)
      .padding(.vertical, 7)
      .background(on ? Palette.amber(scheme) : Palette.card2(scheme), in: Capsule())
      .overlay(Capsule().strokeBorder(on ? Palette.amber(scheme) : Palette.line2(scheme)))
    }
    .buttonStyle(.plain)
  }
}

/// What the light is doing, said once and plainly.
struct NoticeView: View {
  @Environment(\.colorScheme) private var scheme
  enum Tone { case amber, warn }
  let tone: Tone
  let icon: String
  let head: String
  let body_: String

  init(tone: Tone, icon: String, head: String, body: String) {
    self.tone = tone; self.icon = icon; self.head = head; self.body_ = body
  }

  var body: some View {
    HStack(alignment: .top, spacing: 11) {
      Image(systemName: icon)
        .font(.system(size: 15, weight: .medium))
        .foregroundStyle(tone == .warn ? Palette.warn(scheme) : Palette.amber(scheme))
        .padding(.top, 1)
      VStack(alignment: .leading, spacing: 3) {
        Text(head)
          .font(.system(size: 13.4, weight: .semibold))
          .foregroundStyle(Palette.ink(scheme))
        Text(body_)
          .font(.system(size: 13.4))
          .foregroundStyle(tone == .warn ? Palette.warn(scheme) : Palette.amberDim(scheme))
          .lineSpacing(3)
      }
      .fixedSize(horizontal: false, vertical: true)
      Spacer(minLength: 0)
    }
    .padding(12)
    .background(tone == .warn ? Palette.warnBg(scheme) : Palette.amberBg(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
      .strokeBorder(tone == .warn ? Palette.warnLine(scheme) : Palette.amberLine(scheme)))
  }
}

/// What the light does, now that there is no step asking about it.
///
/// The aperture and the shutter are the scene's decision and do not move; the
/// ISO is the entire visible consequence of standing in brighter or darker
/// light. Reading it as a column makes that point better than picking one
/// condition ever did, because the pattern is the lesson and one row of it is
/// not.
struct LightRangeView: View {
  @Environment(\.colorScheme) private var scheme
  private let lesson: Lesson

  init(lesson: Lesson) { self.lesson = lesson }

  var body: some View {
    if lesson.lights.count >= 2 {
      VStack(alignment: .leading, spacing: 0) {
        VStack(alignment: .leading, spacing: 7) {
          Text("IF THE LIGHT CHANGES").font(.data(10.5)).kerning(1)
            .foregroundStyle(Palette.ink4(scheme))
          Text("The aperture and the shutter stay exactly where they are, because they are what this photograph needs. The camera moves the ISO instead, and that is the only thing the light changes.")
            .font(.system(size: 12.8))
            .foregroundStyle(Palette.ink3(scheme))
            .lineSpacing(3)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, 14)
        .padding(.top, 13)
        .padding(.bottom, 12)

        ForEach(lesson.lights, id: \.self) { id in
          if let light = Light.find(id) { row(light) }
        }
      }
      .background(Palette.card(scheme))
      .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
      .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Palette.line(scheme)))
    }
  }

  /// Where the shot is not available in a given light the row says so, rather
  /// than printing an ISO the camera could not reach. On a scene that needs a
  /// filter it says which filter, which is the answer to "which one do I buy".
  private func row(_ light: Light) -> some View {
    let shot = lesson.shot(in: light)
    let here = light.id == lesson.light.id
    var value = shot.iso.label
    var muted = false
    if shot.over > 0.6 {
      value = lesson.needsFilter ? "\(Int(shot.over.rounded()))-stop ND" : "too bright"
      muted = true
    } else if shot.under > 0.6 {
      value = "too dark"
      muted = true
    }
    return HStack(spacing: 11) {
      RoundedRectangle(cornerRadius: 6, style: .continuous)
        .fill(swatch(light.id))
        .frame(width: 20, height: 20)
        .overlay(RoundedRectangle(cornerRadius: 6, style: .continuous).strokeBorder(Palette.line2(scheme)))
      Text(light.name)
        .font(.system(size: 13.4, weight: here ? .semibold : .regular))
        .foregroundStyle(here ? Palette.ink(scheme) : Palette.ink2(scheme))
      if here {
        Text("THIS CARD").font(.data(9.5)).kerning(0.8)
          .foregroundStyle(Palette.amber(scheme))
      }
      Spacer(minLength: 8)
      Text(value)
        .font(.data(muted ? 12.5 : 15))
        .foregroundStyle(muted ? (lesson.needsFilter ? Palette.amberDim(scheme) : Palette.ink4(scheme))
                               : (here ? Palette.amber(scheme) : Palette.ink(scheme)))
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
    .background(here ? Palette.card2(scheme) : .clear)
    .overlay(alignment: .top) { Rectangle().fill(Palette.line(scheme)).frame(height: 1) }
  }

  /// A swatch, so the column can be skimmed by eye before it is read. Warm and
  /// bright at the top, cold and dark at the bottom, which is what the day does.
  private func swatch(_ id: String) -> LinearGradient {
    let pairs: [String: (UInt32, UInt32)] = [
      "harsh-sun": (0xFFF4D6, 0xFFD98A), "hazy-sun": (0xFFF6E6, 0xF2D9A8),
      "overcast": (0xF4F5F6, 0xD5D9DD), "heavy-cloud": (0xC9CDD2, 0x9AA1A8),
      "late-day": (0xFFD9A0, 0xE08A4C), "blue-hour": (0x5C7CA8, 0x2A3E5E),
      "night-street": (0x3A3550, 0x15121F), "bright-in": (0xF6EFE2, 0xDBC9A8),
      "room-night": (0xC9A972, 0x6E5638), "dim-in": (0x8A6A44, 0x3A2C1C),
    ]
    let (a, b) = pairs[id] ?? (0x191B1E, 0x141618)
    return LinearGradient(colors: [Palette.hex(a), Palette.hex(b)],
                          startPoint: .topLeading, endPoint: .bottomTrailing)
  }
}

/// What to say about the photographer's own lens for this shot.
struct LensView: View {
  @Environment(\.colorScheme) private var scheme
  private let advice: LensAdvice

  init(advice: LensAdvice) { self.advice = advice }

  var body: some View {
    VStack(alignment: .leading, spacing: 9) {
      HStack(alignment: .top, spacing: 11) {
        Image(systemName: advice.tone == .warn ? "exclamationmark.triangle"
                : (advice.tone == .good ? "checkmark" : "camera.aperture"))
          .font(.system(size: 15, weight: .medium))
          .foregroundStyle(tint)
          .padding(.top, 2)
        VStack(alignment: .leading, spacing: 3) {
          Text("YOUR LENS").font(.data(10.5)).kerning(0.9)
            .foregroundStyle(Palette.ink4(scheme))
          Text(advice.verdict)
            .font(.system(size: 14.5, weight: .semibold))
            .foregroundStyle(Palette.ink(scheme))
            .lineSpacing(2)
        }
        .fixedSize(horizontal: false, vertical: true)
        Spacer(minLength: 0)
      }
      ForEach(advice.lines, id: \.self) { line in
        Text(line)
          .font(.system(size: 13.2))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(3)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(13)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(background)
    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(border))
  }

  private var tint: Color {
    switch advice.tone {
    case .warn: return Palette.warn(scheme)
    case .good: return Palette.amber(scheme)
    case .ok: return Palette.ink3(scheme)
    }
  }
  private var background: Color {
    switch advice.tone {
    case .warn: return Palette.warnBg(scheme)
    case .good: return Palette.amberBg(scheme)
    case .ok: return Palette.card(scheme)
    }
  }
  private var border: Color {
    switch advice.tone {
    case .warn: return Palette.warnLine(scheme)
    case .good: return Palette.amberLine(scheme)
    case .ok: return Palette.line(scheme)
    }
  }
}

/// Chips wrap onto as many rows as they need. SwiftUI has no flow container, so
/// this is the smallest one that does the job.
struct FlowLayout: Layout {
  var spacing: CGFloat = 6

  init(spacing: CGFloat = 6) { self.spacing = spacing }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? .infinity
    let rows = layout(subviews: subviews, width: width)
    let height = rows.last.map { $0.y + $0.height } ?? 0
    return CGSize(width: width == .infinity ? (rows.map(\.width).max() ?? 0) : width, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let rows = layout(subviews: subviews, width: bounds.width)
    for row in rows {
      var x = bounds.minX
      for index in row.indices {
        let size = subviews[index].sizeThatFits(.unspecified)
        subviews[index].place(at: CGPoint(x: x, y: bounds.minY + row.y),
                              proposal: ProposedViewSize(size))
        x += size.width + spacing
      }
    }
  }

  private struct Row { var indices: [Int] = []; var y: CGFloat = 0; var height: CGFloat = 0; var width: CGFloat = 0 }

  private func layout(subviews: Subviews, width: CGFloat) -> [Row] {
    var rows: [Row] = []
    var row = Row()
    var x: CGFloat = 0
    var y: CGFloat = 0
    for index in subviews.indices {
      let size = subviews[index].sizeThatFits(.unspecified)
      if x > 0, x + size.width > width {
        row.y = y; row.width = x - spacing
        rows.append(row)
        y += row.height + spacing
        row = Row(); x = 0
      }
      row.indices.append(index)
      row.height = max(row.height, size.height)
      x += size.width + spacing
    }
    if !row.indices.isEmpty { row.y = y; row.width = x - spacing; rows.append(row) }
    return rows
  }
}
