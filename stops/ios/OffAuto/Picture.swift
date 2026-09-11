import SwiftUI
import Photos
import UIKit
import OffAutoKit

/// A photograph out of the library, drawn at the size it is being shown at.
///
/// Nothing here reaches the network, ever. The request has network access
/// switched off, so a photograph that lives only in iCloud is reported as not
/// being on this phone rather than quietly fetched: the app has no business
/// spending somebody's data, or waiting on a signal that may not be there,
/// because they tapped a thumbnail. In practice the small sizes almost always
/// arrive anyway, since the phone keeps thumbnails locally even for pictures
/// whose originals have been offloaded.
struct AssetImage: View {
  enum Loaded {
    case waiting
    case picture(UIImage)
    case notOnPhone      // the original is in iCloud, and we do not go and get it
    case gone            // deleted since the shoot was read

    var isPicture: Bool {
      if case .picture = self { return true }
      return false
    }
  }

  private let id: String
  private let size: CGSize
  private let full: Bool
  @State private var loaded: Loaded = .waiting

  /// `full` asks for the real thing, which is what the whole screen wants. A
  /// row of thumbnails does not, and takes whatever comes first.
  init(id: String, size: CGSize, full: Bool = false) {
    self.id = id; self.size = size; self.full = full
  }

  var body: some View {
    content
      .onAppear(perform: start)
      .onChange(of: id) { _, _ in loaded = .waiting; start() }
  }

  @ViewBuilder
  private var content: some View {
    switch loaded {
    case .picture(let image):
      Image(uiImage: image).resizable().scaledToFit()
    case .waiting:
      Placeholder(icon: nil, note: nil, size: size)
    case .notOnPhone:
      Placeholder(icon: "icloud", note: "Only in iCloud", size: size)
    case .gone:
      Placeholder(icon: "questionmark", note: "No longer on this phone", size: size)
    }
  }

  /// Whatever is there instead of the photograph, and never nothing.
  ///
  /// An empty tile and a tile that failed look identical, which is exactly the
  /// hole this fell into once already: a thumbnail that did not arrive showed
  /// as blank space rather than as a thumbnail that did not arrive. At row size
  /// there is no room for a sentence, so the icon carries it alone.
  private struct Placeholder: View {
    @Environment(\.colorScheme) private var scheme
    let icon: String?
    let note: String?
    let size: CGSize

    private var roomy: Bool { min(size.width, size.height) > 200 }

    var body: some View {
      ZStack {
        Palette.card2(scheme)
        VStack(spacing: 6) {
          Image(systemName: icon ?? "photo")
            .font(.system(size: roomy ? 20 : 13))
          if roomy, let note {
            Text(note).font(.system(size: 11)).multilineTextAlignment(.center)
          }
        }
        .foregroundStyle(Palette.ink4(scheme))
        .opacity(icon == nil ? 0.4 : 1)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }

  private func start() {
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil)
    guard let asset = assets.firstObject else { loaded = .gone; return }

    let options = PHImageRequestOptions()
    // The one rule this feature was built under. A photograph that lives only
    // in iCloud is reported as such rather than fetched: no data spent, and
    // nothing to wait on when there is no signal.
    options.isNetworkAccessAllowed = false
    // Opportunistic rather than fast: fast returns only a rendition that
    // happens to be cached already, and hands back nothing at all for a
    // photograph that has just arrived on the phone, which is precisely when
    // somebody is most likely to be looking at it. This asks for something now
    // and something better afterwards, so it may call back twice.
    options.deliveryMode = full ? .highQualityFormat : .opportunistic
    options.resizeMode = .fast
    options.isSynchronous = false

    PHImageManager.default().requestImage(
      for: asset, targetSize: size, contentMode: .aspectFit, options: options
    ) { image, info in
      let next: Loaded
      if let image {
        next = .picture(image)
      } else if (info?[PHImageResultIsInCloudKey] as? Bool) == true {
        next = .notOnPhone
      } else if (info?[PHImageCancelledKey] as? Bool) == true {
        return
      } else {
        next = .gone
      }
      Task { @MainActor in
        // A second callback carrying nothing must not wipe out a picture the
        // first one already delivered.
        if loaded.isPicture, !next.isPicture { return }
        loaded = next
      }
    }
  }
}

/// One frame, full screen, with the settings that made it.
///
/// The number the finding is actually about is the one picked out in amber. A
/// frame that is soft from a slow shutter teaches nothing next to a wall of
/// six equal numbers: the whole point is to look at the photograph and the one
/// figure that explains it at the same time.
struct FrameView: View {
  @Environment(\.dismiss) private var dismiss
  private let frames: [Frame]
  private let kind: Finding.Kind
  @State private var showing: String

  init(frames: [Frame], kind: Finding.Kind, start: String) {
    self.frames = frames; self.kind = kind
    _showing = State(initialValue: start)
  }

  /// Which of the three the finding is complaining about, or praising.
  private var subject: String {
    switch kind {
    case .shake, .steady: return "shutter"
    case .grain: return "iso"
    case .oneAperture, .spread: return "aperture"
    }
  }

  var body: some View {
    ZStack(alignment: .top) {
      Color.black.ignoresSafeArea()

      TabView(selection: $showing) {
        ForEach(frames) { frame in
          VStack(spacing: 0) {
            Spacer(minLength: 0)
            AssetImage(id: frame.id, size: CGSize(width: 2000, height: 2000), full: true)
              .frame(maxWidth: .infinity)
            Spacer(minLength: 0)
            settings(frame)
          }
          .tag(frame.id)
        }
      }
      .tabViewStyle(.page(indexDisplayMode: frames.count > 1 ? .always : .never))
      .ignoresSafeArea(edges: .bottom)

      HStack {
        Spacer()
        Button { dismiss() } label: {
          Image(systemName: "xmark")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 34, height: 34)
            .background(.black.opacity(0.45), in: Circle())
        }
      }
      .padding(.horizontal, 16)
    }
  }

  private func settings(_ frame: Frame) -> some View {
    VStack(spacing: 7) {
      HStack(spacing: 16) {
        value(Ladders.aperture(frame.aperture).label, on: subject == "aperture")
        value(Ladders.shutter(frame.shutter).label, on: subject == "shutter")
        value("ISO \(Ladders.iso(frame.iso).label)", on: subject == "iso")
      }
      Text("\(printed(frame.focal.rounded())) mm, \(frame.date.formatted(date: .omitted, time: .shortened))")
        .font(.system(size: 12))
        .foregroundStyle(.white.opacity(0.55))
    }
    .padding(.top, 16)
    .padding(.bottom, 44)
    .frame(maxWidth: .infinity)
    .background(.black)
  }

  private func value(_ text: String, on: Bool) -> some View {
    Text(text)
      .font(.data(on ? 19 : 15, on ? .semibold : .regular))
      .foregroundStyle(on ? Palette.hex(0xE8A33D) : .white.opacity(0.6))
  }
}
