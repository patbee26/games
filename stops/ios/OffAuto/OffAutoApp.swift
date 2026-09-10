import SwiftUI
import OffAutoKit

@main
struct OffAutoApp: App {
  var body: some Scene {
    WindowGroup { RootView() }
  }
}

/// Light, dark, or whatever the phone is already doing.
///
/// The phone's own setting is the right default, but this app gets used
/// outdoors: in direct sun the dark theme is unreadable, and in a dark room the
/// light one is a torch pointed at your own face. Neither of those is worth
/// leaving the app and digging through Settings for, so the choice lives here.
enum Appearance: String, CaseIterable, Identifiable {
  case system, light, dark
  var id: String { rawValue }

  var name: String {
    switch self {
    case .system: return "Phone"
    case .light: return "Light"
    case .dark: return "Dark"
    }
  }

  var icon: String {
    switch self {
    case .system: return "iphone"
    case .light: return "sun.max"
    case .dark: return "moon"
    }
  }

  var scheme: ColorScheme? {
    switch self {
    case .system: return nil
    case .light: return .light
    case .dark: return .dark
    }
  }

  /// What the button does next. Two taps gets you back where you started.
  var next: Appearance {
    switch self {
    case .system: return .dark
    case .dark: return .light
    case .light: return .system
    }
  }
}

/// Whether the photographs from the camera end up on this phone.
///
/// Asked in plain words before iOS is allowed to put up its permission sheet,
/// because iOS gives no way to find out whether there are any camera files to
/// look at without first being granted the whole library. Somebody who cards
/// straight to a laptop should never see that dialog at all.
enum PhotoAnswer: String {
  case unasked, onPhone, elsewhere
}

/// What the app remembers between launches, which is almost nothing: whether
/// the introduction has been seen, the one lens the photographer may add, which
/// way round the theme goes, and what they said about their photographs.
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
  @Published var appearance: Appearance {
    didSet { UserDefaults.standard.set(appearance.rawValue, forKey: "appearance") }
  }
  @Published var photoAnswer: PhotoAnswer {
    didSet { UserDefaults.standard.set(photoAnswer.rawValue, forKey: "photoAnswer") }
  }
  /// Sessions already read and put away. A debrief that keeps coming back after
  /// it has been read is nagging, and nagging gets an app deleted.
  @Published var dismissed: Set<String> {
    didSet { UserDefaults.standard.set(Array(dismissed), forKey: "dismissed") }
  }

  init() {
    seenIntro = UserDefaults.standard.bool(forKey: "seenIntro")
    if let data = UserDefaults.standard.data(forKey: "gear"),
       let saved = try? JSONDecoder().decode(Gear.self, from: data) {
      gear = saved
    } else {
      gear = Gear()
    }
    appearance = Appearance(rawValue: UserDefaults.standard.string(forKey: "appearance") ?? "")
      ?? .system
    photoAnswer = PhotoAnswer(rawValue: UserDefaults.standard.string(forKey: "photoAnswer") ?? "")
      ?? .unasked
    dismissed = Set(UserDefaults.standard.stringArray(forKey: "dismissed") ?? [])
  }
}

struct RootView: View {
  @Environment(\.colorScheme) private var scheme
  @Environment(\.scenePhase) private var phase
  @StateObject private var store = Store()
  @StateObject private var photos = PhotoLibrary()
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
    .tint(Palette.amber(store.appearance.scheme ?? scheme))
    .environmentObject(store)
    .environmentObject(photos)
    .preferredColorScheme(store.appearance.scheme)
    .fullScreenCover(isPresented: .init(get: { !store.seenIntro }, set: { if !$0 { store.seenIntro = true } })) {
      IntroView { store.seenIntro = true }
    }
    .task {
      // Only ever a silent look. Anybody who has not been asked, or who said
      // their files live elsewhere, is left alone.
      if store.photoAnswer == .onPhone { await photos.scanIfAuthorised() }
    }
    .onChange(of: phase) { _, now in
      // Coming back to the app is the moment an import has usually just
      // finished. The library also reports its own changes, but that only
      // covers the half of the time the app was running to hear it.
      if now == .active, store.photoAnswer == .onPhone {
        Task { await photos.scanIfAuthorised() }
      }
    }
  }
}
