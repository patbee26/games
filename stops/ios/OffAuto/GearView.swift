import SwiftUI
import OffAutoKit

/// The lens you own, the theme, and whether the app may look at your
/// photographs. Nothing else needs setting up.
struct GearView: View {
  @Environment(\.colorScheme) private var scheme

  init() {}
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var photos: PhotoLibrary
  @State private var editing = false
  @State private var min = ""
  @State private var max = ""
  @State private var widest = ""
  @State private var error = ""

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        Text("Almost nothing needs setting up. The one thing worth telling the app is which lens you actually own.")
          .font(.system(size: 14.5))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(3)
          .padding(.bottom, 2)
          .fixedSize(horizontal: false, vertical: true)

        card(key: "The lens this app assumes", name: Lens.standard.name, raised: false) {
          Text("On a full-frame camera. No zoom like this is actually sold: it is a teaching lens, chosen so that every lesson here is reachable without owning anything else. The f/2 end is what lets a background dissolve completely, which is a thing worth seeing before you go looking for it.")
          Text("The kit zoom on a real camera is usually f/4. Add yours below and every card will say what changes.")
        }

        if let own = store.gear.own, !editing {
          card(key: "Your lens", name: own.name, raised: true) {
            Text("Every card will now say whether this one can take the photograph, and what changes if you use it instead.")
            HStack(spacing: 9) {
              Button("Change it") { begin(from: own) }.buttonStyle(GhostButton())
              Button("Remove it") { store.gear.own = nil }.buttonStyle(GhostButton())
            }
            .padding(.top, 4)
          }
        }

        if editing {
          form
        } else if store.gear.own == nil {
          Button { begin(from: nil) } label: {
            VStack(alignment: .leading, spacing: 3) {
              Text("Add a lens of your own")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Palette.amber(scheme))
              Text("One is enough. The cards will talk about it.")
                .font(.system(size: 12.5))
                .foregroundStyle(Palette.ink3(scheme))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(15)
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
              .strokeBorder(Palette.line2(scheme), style: StrokeStyle(lineWidth: 1, dash: [5, 4])))
          }
          .buttonStyle(.plain)
        }

        Text("Light and dark")
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(Palette.ink(scheme))
          .padding(.top, 14)
        Text("Dark is the right answer at dusk and the wrong one in direct sun, which is where half of this gets read. The same button sits at the top of the scene list.")
          .font(.system(size: 14.2))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(3)
          .fixedSize(horizontal: false, vertical: true)
        Picker("Theme", selection: $store.appearance) {
          ForEach(Appearance.allCases) { choice in
            Text(choice.name).tag(choice)
          }
        }
        .pickerStyle(.segmented)

        Text("Your photographs")
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(Palette.ink(scheme))
          .padding(.top, 14)
        photoSection

        Text("Starting over")
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(Palette.ink(scheme))
          .padding(.top, 14)
        Text("The introduction is the three cards you saw the first time you opened this. It explains what the app is for and the one camera setting it asks of you.")
          .font(.system(size: 14.2))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(3)
          .fixedSize(horizontal: false, vertical: true)
        Button("Show the introduction again") { store.seenIntro = false }
          .buttonStyle(GhostButton())
      }
      .padding(.horizontal, 18)
      .padding(.bottom, 24)
    }
    .background(Palette.bg(scheme).ignoresSafeArea())
    .navigationTitle("Your gear")
  }

  /// Reading the settings off the photographs already on this phone, and the
  /// one switch that turns the whole thing off again.
  @ViewBuilder
  private var photoSection: some View {
    switch store.photoAnswer {
    case .unasked:
      Text("You have not been asked yet. The scene list will ask once, and there is nothing to set up here until it has.")
        .font(.system(size: 14.2))
        .foregroundStyle(Palette.ink2(scheme))
        .lineSpacing(3)
        .fixedSize(horizontal: false, vertical: true)
    case .elsewhere:
      VStack(alignment: .leading, spacing: 10) {
        Text("You said your pictures go straight from the card to a computer, so this app never looks at your photographs and never asks to.")
          .font(.system(size: 14.2))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(3)
          .fixedSize(horizontal: false, vertical: true)
        Button("They do come to this phone") {
          store.photoAnswer = .onPhone
          Task { await photos.request() }
        }
        .buttonStyle(GhostButton())
      }
    case .onPhone:
      VStack(alignment: .leading, spacing: 10) {
        Text(photoStatus)
          .font(.system(size: 14.2))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(3)
          .fixedSize(horizontal: false, vertical: true)
        Text("It reads the aperture, shutter, ISO and focal length your camera writes into the head of each file. It does not open the picture, and nothing leaves the phone.")
          .font(.system(size: 12.8))
          .foregroundStyle(Palette.ink3(scheme))
          .lineSpacing(2)
          .fixedSize(horizontal: false, vertical: true)
        HStack(spacing: 9) {
          Button("Look again") { Task { await photos.request() } }
            .buttonStyle(GhostButton())
          Button("Stop looking") {
            store.photoAnswer = .elsewhere
            store.dismissed = []
          }
          .buttonStyle(GhostButton())
        }
      }
    }
  }

  private var photoStatus: String {
    switch photos.state {
    case .denied:
      return "Off Auto has not been allowed to see your photographs, so there is nothing to look back at. Settings, then Off Auto, then Photos is where that lives."
    case .scanning:
      return "Reading the settings off your last few photographs."
    case .noCameraFiles:
      return photos.limited
        ? "None of the photographs you picked came from a camera. Allowing the whole library would give it something to work with."
        : "Nothing from a camera on this phone yet. Bring some across and the scene list will have something to say about your last shoot."
    case .ready(let session):
      guard let session else {
        return "Camera files found, but not enough of them together to call a shoot. Five frames in one afternoon is the bar."
      }
      return "Your last shoot was \(DebriefStrip.when(session.start).lowercased()), \(session.count) frames. The scene list says the one thing worth saying about it."
    case .idle:
      return "Ready to look at your last shoot."
    }
  }

  @ViewBuilder
  private func card<Content: View>(key: String, name: String, raised: Bool,
                                   @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 9) {
      Text(key.uppercased()).font(.data(10.5)).kerning(0.9)
        .foregroundStyle(Palette.ink4(scheme))
      Text(name).font(.system(size: 20, weight: .semibold))
        .foregroundStyle(Palette.ink(scheme))
      content()
        .font(.system(size: 13.4))
        .foregroundStyle(Palette.ink2(scheme))
        .lineSpacing(3)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(15)
    .background(raised ? Palette.raise(scheme) : Palette.card(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
      .strokeBorder(raised ? Palette.raiseLine(scheme) : Palette.line(scheme)))
  }

  private var form: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("YOUR LENS").font(.data(10.5)).kerning(0.9)
        .foregroundStyle(Palette.amber(scheme))
      Text("Read it off the front of the lens. A zoom has two focal lengths; a prime has one, so put the same number in both.")
        .font(.system(size: 12.8)).foregroundStyle(Palette.ink3(scheme))
        .lineSpacing(2).fixedSize(horizontal: false, vertical: true)
      HStack(spacing: 9) {
        field("From", $min, unit: "mm")
        field("To", $max, unit: "mm")
        field("Opens to f/", $widest, unit: nil)
      }
      Text("If yours gets darker as you zoom in, put in the darker number. That way nothing the app tells you will be optimistic.")
        .font(.system(size: 12.8)).foregroundStyle(Palette.ink3(scheme))
        .lineSpacing(2).fixedSize(horizontal: false, vertical: true)
      if !error.isEmpty {
        Text(error).font(.system(size: 13)).foregroundStyle(Palette.warn(scheme))
          .fixedSize(horizontal: false, vertical: true)
      }
      HStack(spacing: 9) {
        Button("Save", action: save)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(scheme == .dark ? Palette.hex(0x14100A) : Palette.hex(0xFFFBF2))
          .padding(.horizontal, 18).padding(.vertical, 10)
          .background(Palette.amber(scheme), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        Button("Cancel") { editing = false; error = "" }.buttonStyle(GhostButton())
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(15)
    .background(Palette.raise(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
      .strokeBorder(Palette.raiseLine(scheme)))
  }

  private func field(_ label: String, _ text: Binding<String>, unit: String?) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(label).font(.system(size: 11.5)).foregroundStyle(Palette.ink3(scheme))
      HStack(spacing: 3) {
        TextField("", text: text)
          .keyboardType(.decimalPad)
          .font(.data(17))
          .foregroundStyle(Palette.ink(scheme))
        if let unit {
          Text(unit).font(.data(12)).foregroundStyle(Palette.ink4(scheme))
        }
      }
      .padding(.horizontal, 11).padding(.vertical, 10)
      .background(Palette.bg(scheme), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
      .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Palette.line2(scheme)))
    }
  }

  private func begin(from lens: Lens?) {
    min = lens.map { printed($0.min) } ?? ""
    max = lens.map { printed($0.max) } ?? ""
    widest = lens.map { printed($0.widest) } ?? ""
    error = ""
    editing = true
  }

  private func save() {
    guard let a = Double(min), let b = Double(max), let c = Double(widest),
          let lens = Lens.make(min: a, max: b, widest: c) else {
      error = "That does not look like a lens. Check the two focal lengths and the f-number on the front of it."
      return
    }
    store.gear.own = lens
    editing = false
    error = ""
  }
}

struct GhostButton: ButtonStyle {
  @Environment(\.colorScheme) private var scheme
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(size: 14))
      .foregroundStyle(Palette.ink2(scheme))
      .padding(.horizontal, 16).padding(.vertical, 10)
      .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous)
        .strokeBorder(Palette.line2(scheme)))
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}
