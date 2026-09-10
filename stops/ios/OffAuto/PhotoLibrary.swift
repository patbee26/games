import Foundation
import Photos
import ImageIO
import OffAutoKit

/// Reading the settings out of the photographs on this phone.
///
/// Two things this deliberately does not do. It never uploads anything, and it
/// never looks at the picture: it reads the exposure block a camera writes into
/// the head of the file and stops. Those are the terms the feature was allowed
/// to exist on.
@MainActor
final class PhotoLibrary: ObservableObject {
  enum State: Equatable {
    case idle              // not asked, or the photographer said their files live elsewhere
    case denied
    case scanning
    case ready(Session?)
    case noCameraFiles     // authorised, looked, and found nothing from a camera
  }

  @Published private(set) var state: State = .idle

  /// They granted a hand-picked few rather than the library. Worth knowing,
  /// because "nothing found" then means "nothing you picked" rather than
  /// "nothing there", and the app should not conclude anything from it.
  @Published private(set) var limited = false

  /// How many of the most recent photographs to look at, at the very most.
  ///
  /// Reading exposure data means reading file bytes, so this is bounded rather
  /// than "the whole library". In practice the walk stops long before this,
  /// as soon as it has a whole shoot: the ceiling is only there so that a phone
  /// with ten thousand snapshots and no camera files gives up quickly rather
  /// than grinding through all of them.
  private let limit = 200
  /// Fewer than this together is a test frame and a picture of a cat.
  private let minimumFrames = 5

  nonisolated init() {}

  var authorised: Bool {
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    return status == .authorized || status == .limited
  }

  func request() async {
    let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
    switch status {
    case .authorized: limited = false; await scan()
    case .limited: limited = true; await scan()
    default: state = .denied
    }
  }

  /// The silent look on launch. It never puts up a dialog: if permission was
  /// refused at some point it says so quietly and stops there.
  func scanIfAuthorised() async {
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    guard status == .authorized || status == .limited else {
      if status == .denied || status == .restricted { state = .denied }
      return
    }
    limited = status == .limited
    await scan()
  }

  private func scan() async {
    state = .scanning
    let frames = await Self.recentCameraFrames(limit: limit, minimum: minimumFrames)
    if frames.isEmpty {
      state = .noCameraFiles
    } else {
      state = .ready(Sessions.latest(frames, minimumFrames: minimumFrames))
    }
  }

  // MARK: reading the files

  /// Walks backwards from the newest photograph until it has one whole shoot.
  ///
  /// Newest first, because the only session this app has anything to say about
  /// is the last one. Once a gap of more than a few hours opens up behind a run
  /// of frames, that run is a shoot and there is no reason to keep reading
  /// files: the usual case costs a few dozen reads rather than two hundred.
  private nonisolated static func recentCameraFrames(limit: Int, minimum: Int) async -> [Frame] {
    let options = PHFetchOptions()
    options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    options.fetchLimit = limit
    options.predicate = NSPredicate(format: "mediaType == %d", PHAssetMediaType.image.rawValue)
    let assets = PHAsset.fetchAssets(with: options)

    var frames: [Frame] = []
    var run: [Frame] = []
    for index in 0..<assets.count {
      guard let frame = await self.frame(from: assets.object(at: index)) else { continue }
      // The gap is measured against the previous frame this walk kept, so a
      // week of phone snapshots sitting in between two camera outings neither
      // splits a shoot nor joins two of them.
      if let last = run.last, last.date.timeIntervalSince(frame.date) > Sessions.gap {
        if run.count >= minimum { break }
        run = []
      }
      run.append(frame)
      frames.append(frame)
    }
    return frames
  }

  /// Reads only the head of the file.
  ///
  /// A camera's exposure block lives in the first APP1 segment of a JPEG, so a
  /// couple of hundred kilobytes is enough and the rest of a forty megabyte raw
  /// file never has to be touched. Network access is off, so anything sitting
  /// only in iCloud is skipped rather than downloaded behind the photographer's
  /// back.
  private nonisolated static func frame(from asset: PHAsset) async -> Frame? {
    guard let resource = PHAssetResource.assetResources(for: asset)
      .first(where: { $0.type == .photo || $0.type == .fullSizePhoto }) else { return nil }

    let options = PHAssetResourceRequestOptions()
    options.isNetworkAccessAllowed = false

    let data: Data? = await withCheckedContinuation { continuation in
      var head = Data()
      var finished = false
      PHAssetResourceManager.default().requestData(for: resource, options: options) { chunk in
        guard !finished else { return }
        head.append(chunk)
        if head.count >= 512_000 { finished = true; continuation.resume(returning: head) }
      } completionHandler: { _ in
        guard !finished else { return }
        finished = true
        continuation.resume(returning: head.isEmpty ? nil : head)
      }
    }

    guard let data,
          let source = CGImageSourceCreateWithData(data as CFData, nil),
          let all = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let exif = all[kCGImagePropertyExifDictionary] as? [CFString: Any]
    else { return nil }

    // Anything the phone took is not what this is about: the photographer is
    // learning a camera, and their own snapshots would drown the signal.
    let tiff = all[kCGImagePropertyTIFFDictionary] as? [CFString: Any]
    let make = (tiff?[kCGImagePropertyTIFFMake] as? String ?? "").lowercased()
    if make.contains("apple") { return nil }

    guard let aperture = number(exif, kCGImagePropertyExifFNumber),
          let shutter = number(exif, kCGImagePropertyExifExposureTime),
          let date = asset.creationDate
    else { return nil }

    // Sensitivity is the one field cameras disagree about: some write a list of
    // one number and some write the number. Reading only one of those shapes
    // would drop every frame and look exactly like an empty library.
    guard let iso = number(exif, kCGImagePropertyExifISOSpeedRatings) else { return nil }

    // Full-frame terms, since that is what every scene is written in.
    let focal = number(exif, kCGImagePropertyExifFocalLenIn35mmFilm)
      ?? number(exif, kCGImagePropertyExifFocalLength)
    guard let focal, focal > 0, aperture > 0, shutter > 0, iso > 0 else { return nil }

    return Frame(id: asset.localIdentifier, date: date,
                 aperture: aperture, shutter: shutter, iso: iso, focal: focal)
  }

  /// One number out of an exposure block, whether the file wrote it as a number
  /// or as a list of one.
  private nonisolated static func number(_ exif: [CFString: Any], _ key: CFString) -> Double? {
    switch exif[key] {
    case let value as Double: return value
    case let value as NSNumber: return value.doubleValue
    case let list as [Double]: return list.first
    case let list as [NSNumber]: return list.first?.doubleValue
    default: return nil
    }
  }
}
