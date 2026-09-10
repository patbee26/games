import SwiftUI
import OffAutoKit

/// Five pages. The first explains the triangle; the rest are references that
/// compute against a focal length you pick, rather than being fixed prose.
struct GuideView: View {
  @Environment(\.colorScheme) private var scheme

  init() {}
  @State private var page = Page.theory
  @State private var focal: Double = 50

  enum Page: String, CaseIterable, Identifiable {
    case theory = "Theory", stops = "Stops", shutter = "Shutter", aperture = "Aperture", rules = "Rules"
    var id: String { rawValue }
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 4) {
            ForEach(Page.allCases) { item in
              Button(item.rawValue) { page = item }
                .font(.system(size: 13.5))
                .foregroundStyle(page == item ? Palette.ink(scheme) : Palette.ink3(scheme))
                .padding(.horizontal, 13).padding(.vertical, 8)
                .background(page == item ? Palette.card(scheme) : .clear, in: Capsule())
                .overlay(Capsule().strokeBorder(page == item ? Palette.line2(scheme) : .clear))
            }
          }
          .padding(.horizontal, 18)
        }
        .padding(.bottom, 6)

        VStack(alignment: .leading, spacing: 0) {
          switch page {
          case .theory: theory
          case .stops: stops
          case .shutter: shutter
          case .aperture: aperture
          case .rules: rules
          }
        }
        .padding(.horizontal, 18)
      }
      .padding(.bottom, 24)
    }
    .background(Palette.bg(scheme).ignoresSafeArea())
    .navigationTitle("How it works")
  }

  // MARK: pieces

  private func heading(_ text: String) -> some View {
    Text(text).font(.system(size: 17, weight: .semibold))
      .foregroundStyle(Palette.ink(scheme))
      .padding(.top, 22).padding(.bottom, 8)
      .fixedSize(horizontal: false, vertical: true)
  }

  private func para(_ text: String) -> some View {
    Text(.init(text))
      .font(.system(size: 14.2))
      .foregroundStyle(Palette.ink2(scheme))
      .lineSpacing(4)
      .padding(.bottom, 11)
      .fixedSize(horizontal: false, vertical: true)
  }

  private func legs(_ rows: [(String, String)]) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
        HStack(alignment: .top, spacing: 12) {
          Text(row.0).font(.data(12)).foregroundStyle(Palette.amber(scheme))
            .frame(width: 76, alignment: .leading).padding(.top, 2)
          Text(.init(row.1)).font(.system(size: 13.6))
            .foregroundStyle(Palette.ink2(scheme)).lineSpacing(3)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 11)
        .overlay(alignment: .top) {
          if index > 0 { Rectangle().fill(Palette.line(scheme)).frame(height: 1) }
        }
      }
    }
    .padding(.horizontal, 15)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Palette.card(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Palette.line(scheme)))
    .padding(.bottom, 12)
  }

  /// A row of one of the reference tables: a name, a number, and sometimes the
  /// working behind it.
  struct Row: Identifiable {
    let name: String
    let value: String
    var note: String? = nil
    var id: String { name }
  }

  private func rows(_ items: [Row]) -> some View {
    VStack(spacing: 0) {
      ForEach(Array(items.enumerated()), id: \.offset) { index, item in
        VStack(alignment: .leading, spacing: 3) {
          HStack(alignment: .firstTextBaseline) {
            Text(item.name).font(.system(size: 13.8)).foregroundStyle(Palette.ink(scheme))
            Spacer(minLength: 12)
            Text(item.value).font(.data(15)).foregroundStyle(Palette.amber(scheme))
          }
          if let note = item.note {
            Text(note).font(.system(size: 11.8)).foregroundStyle(Palette.ink4(scheme))
          }
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .overlay(alignment: .top) {
          if index > 0 { Rectangle().fill(Palette.line(scheme)).frame(height: 1) }
        }
      }
    }
    .background(Palette.card(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Palette.line(scheme)))
    .padding(.bottom, 12)
  }

  private var focalPicker: some View {
    FlowLayout(spacing: 6) {
      ForEach(focalOptions, id: \.self) { option in
        Button("\(printed(option)) mm") { focal = option }
          .font(.system(size: 12.5, weight: focal == option ? .semibold : .regular))
          .foregroundStyle(focal == option
            ? (scheme == .dark ? Palette.hex(0x14100A) : Palette.hex(0xFFFBF2)) : Palette.ink(scheme))
          .padding(.horizontal, 11).padding(.vertical, 7)
          .background(focal == option ? Palette.amber(scheme) : Palette.card2(scheme), in: Capsule())
          .overlay(Capsule().strokeBorder(focal == option ? Palette.amber(scheme) : Palette.line2(scheme)))
      }
    }
    .padding(.bottom, 4)
  }

  private var focalOptions: [Double] { [24, 35, 50, 85, 105] }

  // MARK: the pages

  private var theory: some View {
    VStack(alignment: .leading, spacing: 0) {
      heading("A photograph is one measured amount of light")
      para("The sensor needs a certain amount of light to make a picture that is neither black nor white. Too little and the photograph is dark and muddy. Too much and the bright parts go blank and nothing brings them back.")
      para("There are exactly three ways to change how much light arrives, and **every one of them changes the picture as well as the brightness**. That second half is the whole craft. If they only changed the brightness, a camera would need one dial and nobody would need to learn anything.")
      legs([
        ("Aperture", "How wide the lens opens. **Wide open, which means a small f-number, lets in the most light and throws the background out of focus.** Stopped down keeps everything sharp and costs you light."),
        ("Shutter", "How long the light is let in for. **Fast freezes movement, slow lets it smear.** Slow also lets in far more light."),
        ("ISO", "How hard the camera amplifies what it got. **It is the only one of the three with no creative effect**, just grain when it goes high."),
      ])
      heading("Why it is called a triangle")
      para("Because the three are tied together. Fix the amount of light you need, and you cannot move one of them without moving another to compensate. Open the aperture a stop and you must halve the shutter time, or drop the ISO, or the picture comes out a stop too bright.")
      para("So there is never one right answer, only a set of answers that all give the same brightness and **look completely different from each other**. Choosing between them is the thing you are actually learning.")
      heading("Two of the three are yours")
      para("The aperture and the shutter change what the photograph looks like. The ISO does not. That asymmetry is the single most useful fact in this app, because it tells you which decisions are worth your attention.")
      para("So: **put the camera in M and set the ISO to Auto.** You take the two decisions that matter and the camera takes the one that does not. Cap it at about 6400 while you are learning.")
      heading("Why the f-numbers look backwards")
      para("f/2 is a **wider** opening than f/8. The number is a fraction of the lens's focal length, so a bigger number means a smaller hole. It is the one genuinely confusing piece of notation in photography and everyone trips on it. Smaller number, more light, blurrier background.")
      heading("The lens is not a zoom ring")
      para("Changing focal length while standing still just crops. The lesson in this app is the other one: **change the focal length and move your feet so the subject stays the same size in the frame.** Do that and the background swells or shrinks behind them. That is the real difference between a wide lens and a long one, and it has nothing to do with how much fits in the frame.")
    }
  }

  private var stops: some View {
    let shutters = ["1/2000", "1/1000", "1/500", "1/250", "1/125", "1/60", "1/30", "1/15"]
    let apertures = ["f/16", "f/11", "f/8", "f/5.6", "f/4", "f/2.8", "f/2", "f/1.4"]
    let isos = ["100", "200", "400", "800", "1600", "3200", "6400", "12800"]
    return VStack(alignment: .leading, spacing: 0) {
      para("A **stop** is a doubling or a halving of light. It is the unit everything is counted in, and once you can count in it the three settings become interchangeable currency.")
      para("Every step down this table is **one stop brighter**. Give a stop in one column, take it back in another, and the exposure does not move. The picture does.")
      HStack(spacing: 7) {
        Image(systemName: "arrow.down")
        Text("MORE LIGHT").font(.data(10.5)).kerning(1)
      }
      .foregroundStyle(Palette.amber(scheme))
      .padding(.bottom, 10)
      VStack(spacing: 0) {
        HStack {
          ForEach(["Shutter", "Aperture", "ISO"], id: \.self) {
            Text($0.uppercased()).font(.data(10.5)).kerning(0.8)
              .foregroundStyle(Palette.ink4(scheme))
              .frame(maxWidth: .infinity)
          }
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Palette.line(scheme)).frame(height: 1) }
        ForEach(0..<shutters.count, id: \.self) { row in
          HStack {
            Text(shutters[row]).font(.data(14)).foregroundStyle(Palette.ink(scheme)).frame(maxWidth: .infinity)
            Text(apertures[row]).font(.data(14)).foregroundStyle(Palette.ink1(scheme)).frame(maxWidth: .infinity)
            Text(isos[row]).font(.data(14)).foregroundStyle(Palette.ink1(scheme)).frame(maxWidth: .infinity)
          }
          .padding(.vertical, 8)
          .overlay(alignment: .top) {
            if row > 0 { Rectangle().fill(Palette.line(scheme).opacity(0.6)).frame(height: 1) }
          }
        }
      }
      .background(Palette.card(scheme))
      .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
      .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Palette.line(scheme)))
      .padding(.bottom, 12)
      para("Read a row across and you have three settings that let in the same light. The aperture column looks oddly spaced because it is: f-numbers go up by a factor of about 1.4 per stop, not 2, since the light depends on the **area** of the opening rather than its width.")
    }
  }

  private var shutter: some View {
    VStack(alignment: .leading, spacing: 0) {
      para("There are two different blurs and beginners usually fix the wrong one. **Camera shake** smears the whole frame and comes from your hands. **Subject movement** smears only the thing that moved. The shutter has to beat whichever is worse.")
      focalPicker
      heading("Camera shake, at \(printed(focal)) mm")
      rows([
        Row(name: "The reciprocal rule", value: Ladders.shutter(1 / focal).label,
            note: "1 divided by \(printed(focal))"),
        Row(name: "With a stabilised lens", value: Ladders.shutter(pow(2, 3) / focal).label,
            note: "about three stops of help"),
      ])
      para("The old rule is that you can hand-hold down to one over the focal length. It is a rough thing, not a law: braced against a wall you will do better, and cold or tired you will do worse.")
      heading("Subject movement, at \(printed(focal)) mm")
      rows(Movers.all.map { mover -> Row in
        let subject = mover.at50 * (focal / 50)
        let threshold = Movers.threshold(focal: focal, speed: mover.speed, subject: subject)
        return Row(name: mover.name, value: Ladders.shutter(threshold).label,
                   note: "\(printed(mover.speed)) m/s, \(String(format: "%.1f", subject)) m away")
      })
      para("These are the speeds at which the movement **starts** to show. Two stops faster and it is properly frozen.")
      para("Here is the part worth knowing: framed the same way, a moving subject needs **the same shutter speed on any lens**. A longer lens magnifies the movement, but you also stand further back, and the two cancel exactly. Only camera shake gets worse with a long lens.")
    }
  }

  private var aperture: some View {
    VStack(alignment: .leading, spacing: 0) {
      para("The aperture does two jobs at once, and they pull against each other. It sets **how much light gets in** and **how much of the scene is sharp**. You cannot buy one without paying in the other.")
      focalPicker
      heading("Enough depth, at \(printed(focal)) mm")
      rows(Depths.all.map { depth -> Row in
        let subject = depth.at50 * (focal / 50)
        let needed = Depths.aperture(focal: focal, subject: subject, far: subject + depth.gap)
        return Row(name: depth.name, value: needed.map { Ladders.aperture($0).label } ?? "any",
                   note: "\(String(format: "%.1f", subject)) m away, \(printed(depth.gap)) m deep")
      })
      para("Stop down at least this far and everything in that group comes out sharp. Notice how quickly it climbs when the subject is close.")
      heading("The three things that set the blur")
      legs([
        ("Aperture", "Wider opening, less depth. The obvious one, and the only one most people think about."),
        ("Distance", "The closer you are to your subject, the less depth you have. This one matters more than the aperture and gets noticed less."),
        ("Background", "The further behind your subject it is, the more it blurs. A wall right behind a face will stay readable at any aperture."),
      ])
      heading("Do not stop down further than you need")
      para("Past about f/11 on full frame, the picture starts getting softer again rather than sharper. Light bends around the edge of a very small opening, which is called **diffraction**. f/16 and f/22 are for when you need the depth or want to burn off light, not for sharpness.")
    }
  }

  private var rules: some View {
    VStack(alignment: .leading, spacing: 0) {
      para("Nine things worth remembering, none of which you have to work out on the spot.")
      rows([
        Row(name: "Sunny 16", value: "f/16 at 1/ISO"),
        Row(name: "One stop", value: "x2 light"),
        Row(name: "Doubling the ISO", value: "+1 stop"),
        Row(name: "Opening one f-stop", value: "+1 stop"),
        Row(name: "Halving the shutter", value: "-1 stop"),
        Row(name: "Hand-held floor", value: "1 / focal"),
        Row(name: "A stabilised lens", value: "3 stops slower"),
        Row(name: "Stars, before they trail", value: "500 / focal"),
        Row(name: "A 10-stop filter", value: "1/500 to 2s"),
      ])
      para("Every rule here is a starting point. Your camera's meter and your own eyes outrank all of them, and the histogram outranks your eyes.")
    }
  }
}
