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
    case notInLibrary    // no photograph with that identifier any more
    case failed(String)  // the library refused, and said why

    var isPicture: Bool {
      if case .picture = self { return true }
      return false
    }
  }

  private let asset: PHAsset?
  private let id: String
  private let size: CGSize
  private let full: Bool
  private let trouble: ((String) -> Void)?
  @State private var loaded: Loaded = .waiting

  /// The asset comes from the scan that found it in the first place. Looking it
  /// up again by identifier is the fallback, not the plan.
  ///
  /// `full` asks for a picture worth filling a screen with. `trouble` is how a
  /// tile the size of a thumbnail says what went wrong: there is no room for a
  /// sentence inside one, so it hands the sentence to whatever has the width to
  /// print it.
  init(asset: PHAsset?, id: String, size: CGSize,
       full: Bool = false, trouble: ((String) -> Void)? = nil) {
    self.asset = asset; self.id = id; self.size = size
    self.full = full; self.trouble = trouble
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
    case .notInLibrary:
      Placeholder(icon: "questionmark", note: "Not in the library any more", size: size)
    case .failed(let why):
      Placeholder(icon: "exclamationmark.triangle", note: why, size: size)
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
    let found = asset ?? PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject
    guard let found else {
      loaded = .notInLibrary
      trouble?("The library has no photograph with the identifier \(id).")
      return
    }

    let options = PHImageRequestOptions()
    // The one rule this feature was built under. A photograph that lives only
    // in iCloud is reported as such rather than fetched: no data spent, and
    // nothing to wait on when there is no signal.
    options.isNetworkAccessAllowed = false
    // The same delivery mode at both sizes, deliberately. Fast format was tried
    // for the rows and returns only a rendition that happens to be cached
    // already, which is nothing at all for a photograph that has just arrived.
    // Opportunistic was tried after it. Since the full screen has worked from
    // the start, the row now asks for exactly what the full screen asks for and
    // differs from it in nothing but the size wanted.
    options.deliveryMode = .highQualityFormat
    options.resizeMode = .fast
    options.isSynchronous = false

    PHImageManager.default().requestImage(
      for: found, targetSize: size, contentMode: .aspectFit, options: options
    ) { image, info in
      let next: Loaded
      if let image {
        next = .picture(image)
      } else if (info?[PHImageCancelledKey] as? Bool) == true {
        return
      } else if (info?[PHImageResultIsInCloudKey] as? Bool) == true {
        next = .notOnPhone
      } else if let error = info?[PHImageErrorKey] as? NSError {
        // Whatever the library actually objected to, said out loud. Guessing at
        // this from the other side of a zip file has cost three rounds already.
        next = .failed(error.localizedDescription)
      } else {
        next = .failed("No picture and no reason, at \(Int(size.width)) points.")
      }
      Task { @MainActor in
        // A second callback carrying nothing must not wipe out a picture the
        // first one already delivered.
        if loaded.isPicture, !next.isPicture { return }
        loaded = next
        // Every outcome that is not a photograph reports itself. Last time only
        // refusals did, so the one that actually happened stayed silent and
        // looked like the feature simply not working.
        switch next {
        case .failed(let why): trouble?(why)
        case .notOnPhone: trouble?("The original is in iCloud and is not fetched.")
        case .notInLibrary: trouble?("The photograph is no longer in the library.")
        case .picture, .waiting: break
        }
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
  private let assets: [String: PHAsset]
  @State private var showing: String
  @State private var trouble: String?

  init(frames: [Frame], kind: Finding.Kind, start: String, assets: [String: PHAsset]) {
    self.frames = frames; self.kind = kind; self.assets = assets
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
            AssetImage(asset: assets[frame.id], id: frame.id,
                       size: CGSize(width: 2000, height: 2000), full: true,
                       trouble: { trouble = $0 })
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
      if let trouble {
        Text(trouble)
          .font(.system(size: 11))
          .foregroundStyle(Palette.hex(0xE0704F))
          .multilineTextAlignment(.center)
          .padding(.horizontal, 24)
          .fixedSize(horizontal: false, vertical: true)
      }
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
