import XCTest
@testable import OffAutoKit

/// The debrief is the only part of the app that says something about the
/// photographer rather than about photography, so it is the part most able to
/// be wrong in a way that stings. These check that it fires when it should,
/// stays quiet when it should, and never says two things at once.
final class DebriefTests: XCTestCase {
  private let start = Date(timeIntervalSince1970: 1_700_000_000)

  private func frame(_ index: Int, minutesIn: Double = 0,
                     aperture: Double = 5.6, shutter: Double = 1 / 500,
                     iso: Double = 400, focal: Double = 50) -> Frame {
    Frame(id: "f\(index)", date: start.addingTimeInterval(minutesIn * 60),
          aperture: aperture, shutter: shutter, iso: iso, focal: focal)
  }

  private func session(_ frames: [Frame]) -> Session { Session(frames: frames) }

  // MARK: grouping an afternoon

  func testFramesCloseInTimeAreOneSession() {
    let frames = (0..<8).map { frame($0, minutesIn: Double($0) * 12) }
    XCTAssertEqual(Sessions.group(frames).count, 1)
  }

  func testAGapOfHoursSplitsTheSession() {
    // Saturday and Sunday must not become one thing.
    let saturday = (0..<6).map { frame($0, minutesIn: Double($0) * 10) }
    let sunday = (6..<12).map { frame($0, minutesIn: 1440 + Double($0) * 10) }
    let sessions = Sessions.group(saturday + sunday)
    XCTAssertEqual(sessions.count, 2)
    XCTAssertEqual(sessions[0].count, 6)
    XCTAssertEqual(sessions[1].count, 6)
  }

  func testTheLatestSessionIsTheMostRecentRealOne() {
    // A test frame and a picture of a cat is not a shoot.
    let realShoot = (0..<9).map { frame($0, minutesIn: Double($0) * 10) }
    let twoStrays = (9..<11).map { frame($0, minutesIn: 2880 + Double($0)) }
    let latest = Sessions.latest(realShoot + twoStrays)
    XCTAssertEqual(latest?.count, 9)
  }

  func testNothingIsSaidAboutASingleFrame() {
    XCTAssertNil(Debrief.finding(for: session([frame(0)]), gear: Gear()))
  }

  // MARK: the things worth fixing

  func testSlowFramesAreNamedWithTheirCount() {
    // 1/15 at 85 mm is well past what hands hold.
    var frames = (0..<10).map { frame($0, minutesIn: Double($0), shutter: 1 / 250, focal: 85) }
    for index in 0..<4 {
      frames[index] = frame(index, minutesIn: Double(index), shutter: 1 / 15, focal: 85)
    }
    let found = Debrief.finding(for: session(frames), gear: Gear())
    XCTAssertEqual(found?.kind, .shake)
    XCTAssertEqual(found?.frames.count, 4)
    XCTAssertEqual(found?.headline, "Four were slower than your hands hold at 85 mm.")
    XCTAssertEqual(found?.isPraise, false)
  }

  func testOneSlowFrameIsNotAHabit() {
    // Everybody gets one. It is a pattern that is worth a sentence.
    var frames = (0..<10).map { frame($0, minutesIn: Double($0), shutter: 1 / 250, focal: 85) }
    frames[0] = frame(0, shutter: 1 / 15, focal: 85)
    XCTAssertNotEqual(Debrief.finding(for: session(frames), gear: Gear())?.kind, .shake)
  }

  func testGrainIsOnlyBlamedWhenTheLensHadStopsToSpare() {
    // f/8 at ISO 6400 with a lens that opens to f/2 is two stops thrown away.
    let costly = (0..<6).map { frame($0, minutesIn: Double($0), aperture: 8, iso: 6400, focal: 50) }
    let found = Debrief.finding(for: session(costly), gear: Gear())
    XCTAssertEqual(found?.kind, .grain)
    XCTAssertEqual(found?.frames.count, 6)

    // The same frames shot wide open are not the photographer's fault, and the
    // app must not tell them otherwise.
    let unavoidable = (0..<6).map { frame($0, minutesIn: Double($0), aperture: 2, iso: 6400, focal: 50) }
    XCTAssertNotEqual(Debrief.finding(for: session(unavoidable), gear: Gear())?.kind, .grain)
  }

  func testAddingAFastLensChangesWhoIsToBlame() {
    // At f/4 on the standard f/2 zoom there is a stop going spare, so it fires.
    let frames = (0..<6).map { frame($0, minutesIn: Double($0), aperture: 4, iso: 6400, focal: 50) }
    XCTAssertEqual(Debrief.finding(for: session(frames), gear: Gear())?.kind, .grain)

    // With a 50 mm f/4 prime in the bag there is nothing going spare at 50 mm,
    // and the app must judge by the lens they own rather than by the fictional
    // teaching zoom the cards assume.
    let slowPrime = Gear(own: Lens.make(min: 50, max: 50, widest: 4))
    XCTAssertNotEqual(Debrief.finding(for: session(frames), gear: slowPrime)?.kind, .grain)
  }

  func testANeverMovedApertureIsAnObservationNotAFault() {
    // Same aperture across four stops of light: worth a sentence, and worded as
    // one, since f/8 all afternoon is right for street and wrong for portrait.
    let frames = (0..<8).map { index in
      frame(index, minutesIn: Double(index) * 10, aperture: 8,
            shutter: 1 / 250, iso: [100, 100, 200, 400, 800, 1600, 1600, 1600][index], focal: 35)
    }
    let found = Debrief.finding(for: session(frames), gear: Gear())
    XCTAssertEqual(found?.kind, .oneAperture)
    XCTAssertEqual(found?.headline, "Every frame was at f/8.")
  }

  func testAFixedApertureInFixedLightIsNotWorthMentioning() {
    let frames = (0..<8).map { frame($0, minutesIn: Double($0), aperture: 8, iso: 200) }
    XCTAssertNotEqual(Debrief.finding(for: session(frames), gear: Gear())?.kind, .oneAperture)
  }

  func testNothingIsBlamedOnALensTheAppHasNeverHeardOf() {
    // They added a 50 mm prime and then shot at 105 mm, so they used some other
    // lens entirely. The app does not know what it opens to and must not guess.
    let frames = (0..<6).map { frame($0, minutesIn: Double($0), aperture: 8, iso: 6400, focal: 105) }
    let prime = Gear(own: Lens.make(min: 50, max: 50, widest: 1.8))
    XCTAssertNotEqual(Debrief.finding(for: session(frames), gear: prime)?.kind, .grain)
    // With no lens added, the cards' own assumption is the fair one to use.
    XCTAssertEqual(Debrief.finding(for: session(frames), gear: Gear())?.kind, .grain)
  }

  // MARK: the things worth saying out loud

  func testWorkingTheApertureIsPraised() {
    let apertures: [Double] = [2, 2.8, 4, 5.6, 8, 11]
    let frames = apertures.enumerated().map { index, N in
      frame(index, minutesIn: Double(index) * 5, aperture: N, shutter: 1 / 500, iso: 400)
    }
    let found = Debrief.finding(for: session(frames), gear: Gear())
    XCTAssertEqual(found?.kind, .spread)
    XCTAssertEqual(found?.isPraise, true)
  }

  func testHoldingTheShutterIsPraisedOnlyWhenItWasHard() {
    // Within a couple of stops of the limit at 105 mm: a real hold.
    let hard = (0..<8).map { frame($0, minutesIn: Double($0), shutter: 1 / 125, focal: 105) }
    XCTAssertEqual(Debrief.finding(for: session(hard), gear: Gear())?.kind, .steady)

    // 1/500 at 35 mm in daylight is the light doing the work, not the hands.
    let easy = (0..<8).map { frame($0, minutesIn: Double($0), shutter: 1 / 500, focal: 35) }
    XCTAssertNil(Debrief.finding(for: session(easy), gear: Gear()))
  }

  // MARK: never two at once

  func testAFaultAlwaysBeatsAComplimentAndOnlyOneIsEverReturned() {
    // This set has both: a wide spread of aperture, and four frames too slow.
    let apertures: [Double] = [2, 2.8, 4, 5.6, 8, 11, 16, 16]
    var frames = apertures.enumerated().map { index, N in
      frame(index, minutesIn: Double(index) * 5, aperture: N, shutter: 1 / 250, focal: 85)
    }
    for index in 0..<4 {
      frames[index] = frame(index, minutesIn: Double(index) * 5,
                            aperture: apertures[index], shutter: 1 / 15, focal: 85)
    }
    let found = Debrief.finding(for: session(frames), gear: Gear())
    XCTAssertEqual(found?.kind, .shake, "a fault must come before a compliment")
    XCTAssertNotNil(found)
  }

  func testTheLightIsRecoveredFromTheExposure() {
    // Sunny 16, backwards. This is what lets a wrong choice be told apart from
    // a photograph that was never available.
    XCTAssertEqual(frame(0, aperture: 16, shutter: 1 / 100, iso: 100).ev, 14.6, accuracy: 0.2)
    XCTAssertEqual(frame(0, aperture: 5.6, shutter: 1 / 60, iso: 3200).ev, 5.9, accuracy: 0.2)
  }
}
