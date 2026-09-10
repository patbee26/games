import SwiftUI

/// The same tokens the web app uses, so the two look like one product.
///
/// Dark by default because this gets used outdoors at dusk, one-handed, held at
/// arm's length. The light values exist for the other half of the problem,
/// which is direct sun on the screen.
enum Palette {
  static func ink(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0xECEAE6) : hex(0x16181A) }
  static func ink1(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0xD2D6DA) : hex(0x2A2E33) }
  static func ink2(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0xA3A8AE) : hex(0x4E545A) }
  static func ink3(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x71777E) : hex(0x6E747B) }
  static func ink4(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x5C6268) : hex(0x8E949B) }

  static func bg(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x0B0C0D) : hex(0xF2F0EC) }
  static func card(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x141618) : .white }
  static func card2(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x191B1E) : hex(0xF6F4F0) }
  static func raise(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x1E2226) : .white }
  static func line(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x23262A) : hex(0xDFDAD2) }
  static func line2(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x33373C) : hex(0xC8C2B8) }
  static func raiseLine(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x333940) : hex(0xD8D0C2) }

  static func amber(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0xE8A33D) : hex(0x8A5D0C) }
  static func amberDim(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0xA08B62) : hex(0x7A6535) }
  static func amberBg(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x17150F) : hex(0xFBF4E4) }
  static func amberLine(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x342C1B) : hex(0xE7D5AB) }

  static func warn(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0xE0704F) : hex(0xA8331A) }
  static func warnBg(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x1A1211) : hex(0xFDF1EC) }
  static func warnLine(_ scheme: ColorScheme) -> Color { scheme == .dark ? hex(0x40241C) : hex(0xF0CDC0) }

  static func hex(_ value: UInt32) -> Color {
    Color(.sRGB,
          red: Double((value >> 16) & 0xFF) / 255,
          green: Double((value >> 8) & 0xFF) / 255,
          blue: Double(value & 0xFF) / 255)
  }
}

/// Numbers are set in a monospaced face so a column of them lines up, and so a
/// 1 is as wide as an 8. The web app uses IBM Plex Mono; the system monospaced
/// face is the honest equivalent here rather than shipping a font file.
extension Font {
  static func data(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
    .system(size: size, weight: weight, design: .monospaced)
  }
}
