import SwiftUI
import OffAutoKit

/// Twelve photographs worth learning. The label sits on the picture rather than
/// under it, because twelve label blocks was a lot of chrome between the reader
/// and the thing worth looking at.
struct SceneListView: View {
  @Environment(\.colorScheme) private var scheme
  @EnvironmentObject private var store: Store

  init() {}

  private let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .center) {
          Lockup()
          Spacer(minLength: 8)
          // The theme, one tap away, because this app gets read outdoors and
          // the right answer changes with the sky rather than with taste.
          Button {
            store.appearance = store.appearance.next
          } label: {
            Image(systemName: store.appearance.icon)
              .font(.system(size: 15, weight: .medium))
              .foregroundStyle(Palette.ink2(scheme))
              .frame(width: 38, height: 38)
              .background(Palette.card(scheme), in: Circle())
              .overlay(Circle().strokeBorder(Palette.line(scheme)))
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Theme: \(store.appearance.name)")
        }
        .padding(.top, 4)
        .padding(.bottom, 12)
        Text("What are you shooting?")
          .font(.system(size: 22, weight: .semibold))
          .foregroundStyle(Palette.ink(scheme))
        Text("Twelve photographs worth learning. Pick one and you will be told exactly what to set, shown what it looks like, and sent outside.")
          .font(.system(size: 14.5))
          .foregroundStyle(Palette.ink2(scheme))
          .lineSpacing(3)
          .padding(.top, 7)
          .fixedSize(horizontal: false, vertical: true)
        DebriefStrip().padding(.top, 16)
        LazyVGrid(columns: columns, spacing: 10) {
          ForEach(Lesson.all) { lesson in
            NavigationLink(value: lesson.id) { Tile(lesson: lesson) }
              .buttonStyle(.plain)
          }
        }
        .padding(.top, 16)
      }
      .padding(.horizontal, 18)
      .padding(.bottom, 24)
    }
    .background(Palette.bg(scheme).ignoresSafeArea())
    .navigationBarTitleDisplayMode(.inline)
    .toolbar(.hidden, for: .navigationBar)
    .navigationDestination(for: String.self) { id in
      if let lesson = Lesson.find(id) { CardView(lesson: lesson) }
    }
  }

  private struct Tile: View {
    @Environment(\.colorScheme) private var scheme
    let lesson: Lesson

    init(lesson: Lesson) { self.lesson = lesson }

    var body: some View {
      Image(lesson.id)
        .resizable()
        .aspectRatio(4 / 3, contentMode: .fill)
        .frame(maxWidth: .infinity)
        .clipped()
        .overlay(alignment: .bottomLeading) {
          VStack(alignment: .leading, spacing: 3) {
            Text(lesson.name)
              .font(.system(size: 15, weight: .semibold))
              .foregroundStyle(Palette.hex(0xF4F2EE))
            Text(lesson.teaches.uppercased())
              .font(.data(9.5)).kerning(1)
              .foregroundStyle(Palette.hex(0xF4C57E))
          }
          .shadow(color: .black.opacity(0.5), radius: 3, y: 1)
          .padding(.horizontal, 11)
          .padding(.bottom, 9)
        }
        .overlay(alignment: .bottom) {
          LinearGradient(colors: [.clear, Palette.hex(0x060708).opacity(0.82)],
                         startPoint: .top, endPoint: .bottom)
            .frame(height: 78)
            .allowsHitTesting(false)
        }
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
          .strokeBorder(Palette.line(scheme)))
    }
  }
}
