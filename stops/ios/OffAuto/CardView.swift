import SwiftUI
import OffAutoKit

/// The card. It states the shot and has no controls on it.
///
/// The only interactive thing is the row of chips under the photograph, and a
/// chip is a question rather than a setting: tap one and the photograph changes
/// to show the answer, one number moves, and the card says what it cost.
struct CardView: View {
  @Environment(\.colorScheme) private var scheme
  @EnvironmentObject private var store: Store
  private let lesson: Lesson
  @State private var change: Change?

  init(lesson: Lesson) { self.lesson = lesson }

  private var shot: Shot { lesson.shot(change: change) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        photoCard
        settings
        ForEach(Array(notices.enumerated()), id: \.offset) { _, notice in notice }
        LightRangeView(lesson: lesson)
        LensView(advice: LensAdvisor.advise(gear: store.gear, focal: shot.focal, aperture: shot.aperture.value))
      }
      .padding(.horizontal, 18)
      .padding(.bottom, 24)
    }
    .background(Palette.bg(scheme).ignoresSafeArea())
    .navigationTitle(lesson.name)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .principal) {
        VStack(spacing: 1) {
          Text(lesson.name).font(.system(size: 17, weight: .semibold))
          Text("Written for \(lesson.light.name.lowercased())")
            .font(.system(size: 12)).foregroundStyle(Palette.ink3(scheme))
        }
      }
    }
  }

  // MARK: the photograph, and the questions attached to it

  private var photoCard: some View {
    VStack(alignment: .leading, spacing: 0) {
      Image(shot.photo)
        .resizable()
        .aspectRatio(3 / 2, contentMode: .fit)
        .frame(maxWidth: .infinity)
      HStack(alignment: .firstTextBaseline, spacing: 10) {
        Text(change == nil ? lesson.blurb : "Changed: \(Chips.result(axis: change!.axis, step: change!.step)).")
          .font(.system(size: 13))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(2)
          .fixedSize(horizontal: false, vertical: true)
        Spacer(minLength: 0)
        Text(change == nil ? "THE SHOT" : "WHAT IF")
          .font(.data(11)).kerning(0.5)
          .foregroundStyle(Palette.amber(scheme))
      }
      .padding(.horizontal, 14)
      .padding(.vertical, 11)
      Divider().overlay(Palette.line(scheme))
      chips
    }
    .background(Palette.card(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Palette.line(scheme)))
  }

  private var chips: some View {
    let groups = lesson.chipGroups
    let single = groups.count == 1
    return VStack(alignment: .leading, spacing: 9) {
      Text(single ? groups[0].question : "What happens if I change something?")
        .font(.system(size: 13.5, weight: .semibold))
        .foregroundStyle(Palette.ink1(scheme))
      ForEach(groups) { group in
        VStack(alignment: .leading, spacing: 6) {
          if !single {
            Text(group.question).font(.system(size: 12)).foregroundStyle(Palette.ink4(scheme))
          }
          FlowLayout(spacing: 6) {
            ForEach(group.chips) { chip in
              ChipButton(chip: chip, on: change == chip.change) {
                withAnimation(.easeOut(duration: 0.15)) {
                  change = (change == chip.change) ? nil : chip.change
                }
              }
            }
          }
        }
      }
    }
    .padding(.horizontal, 13)
    .padding(.vertical, 12)
  }

  // MARK: the settings, raised out of the page

  private var settings: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack {
        Text(change == nil ? "THE IDEAL SETTINGS" : "WITH YOUR CHANGE")
          .font(.data(10.5)).kerning(1)
          .foregroundStyle(Palette.amber(scheme))
        Spacer()
        if change != nil {
          Button("Back to the ideal") { withAnimation { change = nil } }
            .font(.system(size: 12.5))
            .foregroundStyle(Palette.amber(scheme))
        }
      }
      .padding(.horizontal, 14)
      .padding(.top, 11)

      HStack(alignment: .top, spacing: 0) {
        Dial(key: "Aperture", value: shot.aperture.label, note: apertureNote, moved: change?.axis == .aperture)
        divider
        Dial(key: "Shutter", value: shot.shutter.label,
             note: lesson.tripod ? "on a tripod" : "hand-held", moved: change?.axis == .shutter)
        divider
        Dial(key: "ISO", value: shot.iso.label, note: isoNote, moved: false)
      }
      Divider().overlay(Palette.line(scheme))
      VStack(alignment: .leading, spacing: 8) {
        why(.focal, "Lens")
        why(.aperture, "Aperture")
        why(.shutter, "Shutter")
      }
      .padding(14)
    }
    .background(Palette.raise(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
      .strokeBorder(change == nil ? Palette.raiseLine(scheme) : Palette.amberLine(scheme)))
  }

  private var divider: some View {
    Rectangle().fill(Palette.line(scheme)).frame(width: 1).padding(.vertical, 12)
  }

  private var apertureNote: String {
    shot.aperture.value <= 4 ? "wide open" : (shot.aperture.value >= 16 ? "right down" : "mid-range")
  }

  /// The number is the whole visible consequence of the light, so it is the
  /// number that gets the large slot. It used to read "Auto" here with the
  /// value in grey underneath, which made the light look as though it did
  /// nothing.
  private var isoNote: String {
    if shot.iso.value >= 6400 { return "Auto, and grainy" }
    if shot.iso.value >= 1600 { return "Auto, grain starts here" }
    return "Auto, set by the camera"
  }

  /// The scene's own reasoning explains the shot, so on the axis a chip has
  /// changed it is no longer describing what is on the card. That row is
  /// replaced with what the change did and what it was before.
  @ViewBuilder
  private func why(_ axis: ShotAxis, _ label: String) -> some View {
    HStack(alignment: .top, spacing: 9) {
      Text(label.uppercased())
        .font(.data(10.5)).kerning(0.8)
        .foregroundStyle(Palette.ink4(scheme))
        .frame(width: 62, alignment: .leading)
        .padding(.top, 3)
      Group {
        if let change, change.axis == axis {
          let was = lesson.shotValue(axis)
          let shown = axis == .aperture ? "f/\(printed(was))"
            : (axis == .focal ? "\(printed(was)) mm" : Ladders.shutter(was).label)
          let moved = axis == .focal
            ? "and you have moved your feet to keep the subject the same size, not just turned the zoom ring"
            : "from \(shown), which is the shot"
          let result = Chips.result(axis: axis, step: change.step)
          (Text(axis == .focal ? "\(printed(shot.focal)) mm. " : "")
            + Text("Changed").foregroundStyle(Palette.amber(scheme)).fontWeight(.semibold)
            + Text(", \(moved). \(result.prefix(1).uppercased() + result.dropFirst())."))
        } else {
          Text((axis == .focal ? "\(printed(shot.focal)) mm. " : "") + reason(axis))
        }
      }
      .font(.system(size: 13.2))
      .foregroundStyle(Palette.ink2(scheme))
      .lineSpacing(3)
      .fixedSize(horizontal: false, vertical: true)
    }
  }

  private func reason(_ axis: ShotAxis) -> String {
    switch axis {
    case .focal: return lesson.why.lens
    case .aperture: return lesson.why.aperture
    case .shutter: return lesson.why.shutter
    }
  }

  // MARK: what the light is doing to this card

  private var notices: [NoticeView] {
    var out: [NoticeView] = []
    if shot.over > 0.6 {
      let stops = Int(shot.over.rounded())
      out.append(lesson.needsFilter
        ? NoticeView(tone: .amber, icon: "circle.lefthalf.filled",
                     head: "Fit a \(stops)-stop neutral-density filter.",
                     body: "A whole second of daylight is \(stops) stops more light than the lowest ISO can take. The filter is not an accessory here. It is how this photograph is made at all.")
        : NoticeView(tone: .warn, icon: "exclamationmark.triangle",
                     head: "\(stops) stop\(stops == 1 ? "" : "s") too much light.",
                     body: "Even at ISO 100 this is brighter than these settings can hold. Wait for softer light, close the aperture, or use a faster shutter."))
    }
    if shot.under > 0.6 {
      let stops = Int(shot.under.rounded())
      out.append(NoticeView(tone: .warn, icon: "exclamationmark.triangle",
                            head: "\(stops) stop\(stops == 1 ? "" : "s") short of light.",
                            body: "The camera runs out of ISO before it gets there. Open the aperture, slow the shutter, or find more light."))
    }
    if change != nil {
      let cost = shot.cost
      if abs(cost) > 0.4 {
        let stops = Int(abs(cost).rounded())
        let plural = stops == 1 ? "" : "s"
        out.append(NoticeView(
          tone: .amber, icon: "sun.max",
          head: cost > 0 ? "That costs \(stops) stop\(plural) of light."
                         : "That gives you back \(stops) stop\(plural) of light.",
          body: cost > 0
            ? "The camera makes it up on ISO, which is why the ISO climbed. Every creative decision is paid for somewhere, and this is where."
            : "The camera drops the ISO to match, which is cleaner. Light you do not spend on one setting is light another one gets."))
      }
    }
    return out
  }

  private struct Dial: View {
    @Environment(\.colorScheme) private var scheme
    let key: String, value: String, note: String, moved: Bool

    var body: some View {
      VStack(alignment: .leading, spacing: 5) {
        Text(key.uppercased())
          .font(.data(10.5)).kerning(0.9)
          .foregroundStyle(moved ? Palette.amber(scheme) : Palette.ink3(scheme))
        Text(value)
          .font(.data(25))
          .foregroundStyle(moved ? Palette.amber(scheme) : Palette.ink(scheme))
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text(note)
          .font(.system(size: 11.5))
          .foregroundStyle(Palette.ink4(scheme))
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.horizontal, 12)
      .padding(.vertical, 14)
    }
  }
}
