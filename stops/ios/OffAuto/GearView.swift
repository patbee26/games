import SwiftUI
import OffAutoKit

/// Two things live here, and nothing else needs setting up.
struct GearView: View {
  @Environment(\.colorScheme) private var scheme

  init() {}
  @Environment(Store.self) private var store
  @State private var editing = false
  @State private var min = ""
  @State private var max = ""
  @State private var widest = ""
  @State private var error = ""

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        Text("Two things live here, and nothing else needs setting up.")
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

  @ViewBuilder
  private func card(key: String, name: String, raised: Bool,
                    @ViewBuilder content: () -> some View) -> some View {
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
