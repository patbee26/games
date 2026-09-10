import SwiftUI
import OffAutoKit

@main
struct OffAutoApp: App {
  var body: some Scene {
    WindowGroup { RootView() }
  }
}

/// What the app remembers between launches, which is almost nothing: whether
/// the introduction has been seen, and the one lens the photographer may add.
final class Store: ObservableObject {
  @Published var seenIntro: Bool {
    didSet { UserDefaults.standard.set(seenIntro, forKey: "seenIntro") }
  }
  @Published var gear: Gear {
    didSet {
      let data = try? JSONEncoder().encode(gear)
      UserDefaults.standard.set(data, forKey: "gear")
    }
  }

  init() {
    seenIntro = UserDefaults.standard.bool(forKey: "seenIntro")
    if let data = UserDefaults.standard.data(forKey: "gear"),
       let saved = try? JSONDecoder().decode(Gear.self, from: data) {
      gear = saved
    } else {
      gear = Gear()
    }
  }
}

struct RootView: View {
  @Environment(\.colorScheme) private var scheme
  @StateObject private var store = Store()
  @State private var tab = Tab.shoot

  enum Tab: Hashable { case shoot, guide, gear }

  var body: some View {
    TabView(selection: $tab) {
      NavigationStack { SceneListView() }
        .tabItem { Label("Shoot", systemImage: "camera") }
        .tag(Tab.shoot)
      NavigationStack { GuideView() }
        .tabItem { Label("Guide", systemImage: "book") }
        .tag(Tab.guide)
      NavigationStack { GearView() }
        .tabItem { Label("Gear", systemImage: "camera.aperture") }
        .tag(Tab.gear)
    }
    .tint(Palette.amber(scheme))
    .environmentObject(store)
    .fullScreenCover(isPresented: .init(get: { !store.seenIntro }, set: { if !$0 { store.seenIntro = true } })) {
      IntroView { store.seenIntro = true }
    }
  }
}
