import SwiftUI
import OffAutoKit

/// What the app has to say about the last time you went out.
///
/// This is a debrief, not a checker. It never asks to be run, it never asks you
/// to pick a file, and it never hands you a list. It sits at the top of the
/// scene list when there is one thing worth saying about your last shoot, says
/// that one thing, and goes away when you have read it.
struct DebriefStrip: View {
  @Environment(\.colorScheme) private var scheme
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var photos: PhotoLibrary
  @State private var showFrames = false

  init() {}

  var body: some View {
    switch store.photoAnswer {
    case .unasked: ask
    case .elsewhere: EmptyView()
    case .onPhone: looking
    }
  }

  // MARK: before iOS is allowed to say anything

  /// Asked in plain words first, because the system dialog cannot be asked
  /// conditionally and there is no way to know whether there is anything to
  /// look at until after it has been answered. Somebody who cards straight to a
  /// laptop should never see it.
  private var ask: some View {
    panel(raised: true) {
      Text("YOUR PHOTOGRAPHS").font(.data(10.5)).kerning(0.9)
        .foregroundStyle(Palette.amber(scheme))
      Text("Where do the pictures off your camera end up?")
        .font(.system(size: 17, weight: .semibold))
        .foregroundStyle(Palette.ink(scheme))
        .fixedSize(horizontal: false, vertical: true)
      Text("If they come across to this phone, this app can read the settings you used and tell you one thing about your last shoot. It reads only the numbers your camera writes into the file: never the picture, and nothing ever leaves the phone.")
        .font(.system(size: 13.4))
        .foregroundStyle(Palette.ink2(scheme))
        .lineSpacing(3)
        .fixedSize(horizontal: false, vertical: true)
      VStack(spacing: 8) {
        Button("They come to this phone") {
          store.photoAnswer = .onPhone
          Task { await photos.request() }
        }
        .buttonStyle(SolidButton())
        Button("Straight from the card to a computer") { store.photoAnswer = .elsewhere }
          .buttonStyle(GhostButton())
          .frame(maxWidth: .infinity)
      }
      .frame(maxWidth: .infinity)
      .padding(.top, 3)
      Text("You can change this on the gear page.")
        .font(.system(size: 12))
        .foregroundStyle(Palette.ink4(scheme))
        .frame(maxWidth: .infinity)
    }
  }

  // MARK: after they said yes

  @ViewBuilder
  private var looking: some View {
    switch photos.state {
    case .denied:
      panel(raised: false) {
        Text("Off Auto cannot see your photographs, so there is nothing to look back at. Settings can change that, and the gear page can turn this off for good.")
          .font(.system(size: 13.2))
          .foregroundStyle(Palette.ink3(scheme))
          .lineSpacing(3)
          .fixedSize(horizontal: false, vertical: true)
      }
    case .idle:
      // Answered on a previous launch, then the permission never got granted.
      Button("Look at my last shoot") { Task { await photos.request() } }
        .buttonStyle(GhostButton())
    case .scanning:
      HStack(spacing: 9) {
        ProgressView().controlSize(.small)
        Text("Reading the settings off your last few photographs.")
          .font(.system(size: 13)).foregroundStyle(Palette.ink3(scheme))
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    case .ready(let session):
      // Nothing found and nothing to say are the same thing here, and both are
      // silence. An app that announces it has no opinion is noise.
      if let session, let finding = Debrief.finding(for: session, gear: store.gear) {
        // Read once, it stops being a card and becomes a line. The card is the
        // notification and has no business coming back every launch; the shoot
        // itself is still there, and wanting another look at it a week later is
        // not the same as needing to be told again.
        if store.dismissed.contains(session.id) {
          line(session: session, finding: finding)
        } else {
          card(session: session, finding: finding)
        }
      }
    case .noCameraFiles:
      EmptyView()
    }
  }

  private func card(session: Session, finding: Finding) -> some View {
    panel(raised: true) {
      HStack(spacing: 7) {
        Image(systemName: finding.isPraise ? "checkmark.circle" : "eye")
          .font(.system(size: 12, weight: .medium))
        Text("YOUR LAST SHOOT").font(.data(10.5)).kerning(0.9)
        Spacer(minLength: 0)
        Text("\(Self.when(session.start)), \(session.count) frames")
          .font(.system(size: 11.5))
          .foregroundStyle(Palette.ink4(scheme))
      }
      .foregroundStyle(finding.isPraise ? Palette.amber(scheme) : Palette.ink4(scheme))

      Text(finding.headline)
        .font(.system(size: 17, weight: .semibold))
        .foregroundStyle(Palette.ink(scheme))
        .lineSpacing(2)
        .fixedSize(horizontal: false, vertical: true)
      Text(finding.body)
        .font(.system(size: 13.4))
        .foregroundStyle(Palette.ink2(scheme))
        .lineSpacing(3)
        .fixedSize(horizontal: false, vertical: true)

      HStack(spacing: 9) {
        Button("Show me \(Self.which(finding.frames.count))") { showFrames = true }
          .buttonStyle(GhostButton())
        Button("Got it") { store.dismissed.insert(session.id) }
          .buttonStyle(GhostButton())
      }
      .padding(.top, 3)
    }
    .sheet(isPresented: $showFrames) {
      DebriefSheet(finding: finding, session: session)
    }
  }

  private func line(session: Session, finding: Finding) -> some View {
    Button { showFrames = true } label: {
      HStack(spacing: 7) {
        Image(systemName: finding.isPraise ? "checkmark.circle" : "eye")
          .font(.system(size: 12, weight: .medium))
        Text("Your last shoot, \(Self.when(session.start).lowercased())")
          .font(.system(size: 13))
        Spacer(minLength: 0)
        Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold))
      }
      .foregroundStyle(Palette.ink3(scheme))
      .padding(.horizontal, 14)
      .padding(.vertical, 11)
      .frame(maxWidth: .infinity)
      .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
        .strokeBorder(Palette.line(scheme)))
    }
    .buttonStyle(.plain)
    .sheet(isPresented: $showFrames) {
      DebriefSheet(finding: finding, session: session)
    }
  }

  // MARK: the shell both cards sit in

  @ViewBuilder
  private func panel<Content: View>(raised: Bool, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 9) {
      content()
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(15)
    .background(raised ? Palette.raise(scheme) : Palette.card(scheme))
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
      .strokeBorder(raised ? Palette.raiseLine(scheme) : Palette.line(scheme)))
  }

  static func which(_ n: Int) -> String {
    n == 1 ? "it" : "the \(Debrief.count(n).lowercased())"
  }

  /// A shoot is remembered as a time of day rather than a timestamp, because
  /// that is how anybody actually remembers being out with a camera.
  static func when(_ date: Date) -> String {
    let calendar = Calendar.current
    let hour = calendar.component(.hour, from: date)
    let part = hour < 12 ? "morning" : (hour < 17 ? "afternoon" : "evening")
    if calendar.isDateInToday(date) { return "This \(part)" }
    if calendar.isDateInYesterday(date) { return "Yesterday \(part)" }
    let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: date),
                                       to: calendar.startOfDay(for: Date())).day ?? 0
    if days < 7 { return "\(date.formatted(.dateTime.weekday(.wide))) \(part)" }
    return date.formatted(.dateTime.day().month(.abbreviated))
  }
}

/// The whole debrief, kept somewhere it can be gone back to.
///
/// What the card said, and then the frames it was talking about so it can be
/// checked rather than believed. Settings only: the photographs themselves are
/// on the phone already and the app has no business showing them back, since
/// the point of the list is to be read next to the pictures rather than
/// instead of them.
struct DebriefSheet: View {
  @Environment(\.colorScheme) private var scheme
  @Environment(\.dismiss) private var dismiss
  private let finding: Finding
  private let session: Session
  @State private var opened: Frame?
  @State private var trouble: String?

  init(finding: Finding, session: Session) {
    self.finding = finding; self.session = session
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 12) {
          Text(finding.headline)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(Palette.ink(scheme))
            .lineSpacing(2)
            .fixedSize(horizontal: false, vertical: true)
          Text(finding.body)
            .font(.system(size: 13.4))
            .foregroundStyle(Palette.ink2(scheme))
            .lineSpacing(3)
            .fixedSize(horizontal: false, vertical: true)
          Text("Tap one to see it, with the setting this is about picked out.")
            .font(.system(size: 13.2))
            .foregroundStyle(Palette.ink3(scheme))
            .lineSpacing(3)
            .fixedSize(horizontal: false, vertical: true)

          VStack(spacing: 0) {
            ForEach(finding.frames) { frame in
              Button { opened = frame } label: { row(frame) }
                .buttonStyle(.plain)
            }
          }
          .background(Palette.card(scheme))
          .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
          .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous)
            .strokeBorder(Palette.line(scheme)))

          Text("Out of \(session.count) frames from \(DebriefStrip.when(session.start).lowercased()).")
            .font(.system(size: 12))
            .foregroundStyle(Palette.ink4(scheme))

          // A thumbnail that will not load has no room to explain itself, so
          // the explanation surfaces here instead of being swallowed.
          if let trouble {
            Text("Some of these could not be shown. \(trouble)")
              .font(.system(size: 12))
              .foregroundStyle(Palette.warn(scheme))
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 24)
      }
      .background(Palette.bg(scheme).ignoresSafeArea())
      .navigationTitle("Your last shoot")
      .navigationBarTitleDisplayMode(.inline)
      .fullScreenCover(item: $opened) { frame in
        FrameView(frames: finding.frames, kind: finding.kind, start: frame.id)
      }
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("Done") { dismiss() }
        }
      }
    }
  }

  /// The picture first, then the numbers. Reading a column of settings and
  /// matching it to an afternoon by timestamp was work the app was leaving to
  /// the reader, and the lesson only lands when the frame and the figure that
  /// explains it are in front of you together.
  private func row(_ frame: Frame) -> some View {
    HStack(spacing: 12) {
      AssetImage(id: frame.id, size: CGSize(width: 132, height: 132),
                 trouble: { trouble = $0 })
        .frame(width: 46, height: 46)
        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 7, style: .continuous)
          .strokeBorder(Palette.line2(scheme)))

      VStack(alignment: .leading, spacing: 3) {
        HStack(spacing: 10) {
          Text(Ladders.aperture(frame.aperture).label)
            .font(.data(13.5))
            .foregroundStyle(Palette.ink(scheme))
          Text(Ladders.shutter(frame.shutter).label)
            .font(.data(13.5))
            .foregroundStyle(Palette.ink(scheme))
          Text("ISO \(Ladders.iso(frame.iso).label)")
            .font(.data(12))
            .foregroundStyle(Palette.ink3(scheme))
        }
        Text("\(printed(frame.focal.rounded())) mm, \(frame.date.formatted(date: .omitted, time: .shortened))")
          .font(.system(size: 11.5))
          .foregroundStyle(Palette.ink4(scheme))
      }
      Spacer(minLength: 4)
      Image(systemName: "chevron.right")
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(Palette.ink4(scheme))
    }
    .padding(.horizontal, 13)
    .padding(.vertical, 10)
    .contentShape(Rectangle())
    .overlay(alignment: .top) { Rectangle().fill(Palette.line(scheme)).frame(height: 1) }
  }
}

/// The one button on a card that is the thing to press.
struct SolidButton: ButtonStyle {
  @Environment(\.colorScheme) private var scheme
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(size: 14, weight: .semibold))
      .foregroundStyle(scheme == .dark ? Palette.hex(0x14100A) : Palette.hex(0xFFFBF2))
      .padding(.horizontal, 18).padding(.vertical, 11)
      .frame(maxWidth: .infinity)
      .background(Palette.amber(scheme), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
      .opacity(configuration.isPressed ? 0.8 : 1)
  }
}
