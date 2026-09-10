import SwiftUI

/// The first launch. Three cards, and the first of them is the only place the
/// app gets to say what it is called before anybody has seen a photograph, so
/// the mark is there at the size it wears on a home screen.
struct IntroView: View {
  @Environment(\.colorScheme) private var scheme
  @State private var page = 0
  private let done: () -> Void

  init(done: @escaping () -> Void) { self.done = done }

  private struct Card {
    let eyebrow: String
    let title: String
    let paragraphs: [String]
  }

  private let cards: [Card] = [
    Card(eyebrow: "What this is",
         title: "A tutorial, not a calculator.",
         paragraphs: [
          "You have a camera that can do almost anything, and a dial marked M that you have not turned yet. This app exists to get you past that in an afternoon.",
          "It will not work settings out for you. It tells you what to set for twelve photographs worth taking, shows you what they look like, and then gets out of your way.",
         ]),
    Card(eyebrow: "How to use it",
         title: "Pick a scene. Go and shoot.",
         paragraphs: [
          "Two taps and you have a card with two numbers on it. Those are the numbers. Put them in the camera.",
          "There is nothing to configure and nothing to tune. Under the photograph, a row of chips shows you the same scene shot the other way, so you can see what you would be giving up.",
         ]),
    Card(eyebrow: "Before you start",
         title: "Put the camera in M, and set ISO to Auto.",
         paragraphs: [
          "Manual mode with Auto ISO means you make the two decisions that change the picture, which are how wide the lens opens and how long it stays open, and the camera quietly handles the third.",
          "That is the only camera setup this app asks of you. The Guide explains why, if you would like to know.",
         ]),
  ]

  var body: some View {
    let card = cards[page]
    VStack(alignment: .leading, spacing: 0) {
      Spacer(minLength: 0)
      Lockup(hero: page == 0)
        .padding(.bottom, page == 0 ? 26 : 20)
      Text(card.eyebrow.uppercased())
        .font(.data(11)).kerning(1.3)
        .foregroundStyle(Palette.amber(scheme))
      Text(card.title)
        .font(.system(size: 27, weight: .semibold))
        .foregroundStyle(Palette.ink(scheme))
        .padding(.top, 9)
        .fixedSize(horizontal: false, vertical: true)
      ForEach(card.paragraphs, id: \.self) { text in
        Text(text)
          .font(.system(size: 15))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(4)
          .padding(.top, 13)
          .fixedSize(horizontal: false, vertical: true)
      }
      Spacer(minLength: 0)
      HStack(spacing: 6) {
        Spacer()
        ForEach(0..<cards.count, id: \.self) { i in
          Circle()
            .fill(i == page ? Palette.amber(scheme) : Palette.line2(scheme))
            .frame(width: 6, height: 6)
        }
        Spacer()
      }
      .padding(.bottom, 14)
      Button(page == cards.count - 1 ? "Start" : "Next") {
        if page == cards.count - 1 { done() } else { withAnimation { page += 1 } }
      }
      .buttonStyle(PrimaryButton())
      if page < cards.count - 1 {
        Button("Skip", action: done)
          .font(.system(size: 14))
          .foregroundStyle(Palette.ink3(scheme))
          .frame(maxWidth: .infinity)
          .padding(.top, 10)
      }
    }
    .padding(.horizontal, 18)
    .padding(.bottom, 20)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .background(Palette.bg(scheme).ignoresSafeArea())
  }
}

struct PrimaryButton: ButtonStyle {
  @Environment(\.colorScheme) private var scheme
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(size: 15.5, weight: .semibold))
      .foregroundStyle(scheme == .dark ? Palette.hex(0x14100A) : Palette.hex(0xFFFBF2))
      .frame(maxWidth: .infinity)
      .padding(.vertical, 14)
      .background(Palette.amber(scheme), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
      .opacity(configuration.isPressed ? 0.85 : 1)
  }
}
