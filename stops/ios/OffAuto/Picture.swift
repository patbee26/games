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
  }

  private let id: String
  private let size: CGSize
  private let fast: Bool
  @State private var loaded: Loaded = .waiting

  /// `fast` asks for whatever is already lying around, which is what a row of
  /// thumbnails wants. Full screen asks for the real thing.
  init(id: String, size: CGSize, fast: Bool = true) {
    self.id = id; self.size = size; self.fast = fast
  }

  var body: some View {
    content
      .task(id: id) { loaded = await Self.load(id: id, size: size, fast: fast) }
  }

  @ViewBuilder
  private var content: some View {
    switch loaded {
    case .picture(let image):
      Image(uiImage: image).resizable().scaledToFit()
    case .waiting:
      Color.clear
    case .notOnPhone:
      Missing(icon: "icloud", note: "Only in iCloud")
    case .gone:
      Missing(icon: "questionmark", note: "No longer on this phone")
    }
  }

  private struct Missing: View {
    @Environment(\.colorScheme) private var scheme
    let icon: String
    let note: String

    var body: some View {
      VStack(spacing: 6) {
        Image(systemName: icon).font(.system(size: 15))
        Text(note).font(.system(size: 11)).multilineTextAlignment(.center)
      }
      .foregroundStyle(Palette.ink4(scheme))
      .padding(6)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Palette.card2(scheme))
    }
  }

  private static func load(id: String, size: CGSize, fast: Bool) async -> Loaded {
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil)
    guard let asset = assets.firstObject else { return .gone }

    let options = PHImageRequestOptions()
    options.isNetworkAccessAllowed = false
    options.deliveryMode = fast ? .fastFormat : .highQualityFormat
    options.resizeMode = .fast
    options.isSynchronous = false

    return await withCheckedContinuation { continuation in
      // Both of these delivery modes call back exactly once, which is the only
      // reason a continuation is safe here.
      PHImageManager.default().requestImage(
        for: asset, targetSize: size, contentMode: .aspectFit, options: options
      ) { image, info in
        if let image {
          continuation.resume(returning: .picture(image))
        } else if (info?[PHImageResultIsInCloudKey] as? Bool) == true {
          continuation.resume(returning: .notOnPhone)
        } else {
          continuation.resume(returning: .gone)
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
            AssetImage(id: frame.id, size: CGSize(width: 2000, height: 2000), fast: false)
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
