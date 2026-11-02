<!-- counts: blocker=0 major=2 minor=6 build=pass -->

# Chapter 12 SME Review (Phase B, lightweight)

**Chapter:** `src/section-3-autonomous-control/12-timer-and-encoder-autonomous.md` at HEAD (993 lines)
**Inputs:** `robot-programming-book-exercises/ch12-timer-and-encoder-autonomous/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This is a strong first autonomous chapter. "A periodic method is a snapshot, not a story", "check, do not wait", "measure the thing you care about", "sensors decide when a step is done, the timer catches the steps that never will", a running encoder total with a per-step trip meter instead of mid-routine resets, and "turn **to** a heading" are the habits that carry straight into command-based code and odometry. The timer versus encoder experiment with a tape measure is the right way to teach it. The sprinkles (dead reckoning, stopping distance, bang-bang versus P, feedforward, kS) are short and point to the right chapters. The Java load (the `switch` statement and comparing `double`s) fits the 1 to 2 concept budget.

**Prose claims checked:**
- Autonomous runs "15 to 20 seconds, depending on the year's game" (lines 5 and 863). The 2026 game's autonomous period is 20 s and earlier games used 15 s [verify the 2026 figure against the game manual], so the range is right.
- The Motor Safety callout (0.1 s, `Output not updated often enough`) was checked by VERIFY against the source. Its docs link matches. Source: [Using the WPILib Classes to Drive your Robot](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/wpi-drive-classes.html).

## New findings (Phase B)

### M1: The chapter treats a table as a normal place to test autonomous

- **Where:** §12.3 line 186 ("carpet instead of a table, or the other way around"), Practice 1 table, line 881 (`| 1 | Timer | Table | 50 |`), §12.4 line 274 ("Try `AUTO_DRIVE_SPEED = 0.8`"), and the "drives off the edge of the table" (line 301) and "run straight off a table" (line 817) warnings. Line 13 asks for "a clear patch of floor".
- **Problem:** This chapter is the first time the robot moves with nobody's hands on a controller, and it deliberately shows bugs that never stop (`==` on a `double`, no `done` step). Telling students to run those on a table, at up to 0.8 power, teaches a habit that breaks XRPs, and later heavier robots. Strong teams have a simple rule from day one: autonomous runs on the floor, with someone ready to disable. The book already has that kind of rule for the Mini Swerve in Ch 26 (wheels off the ground, e-stop). The XRP version belongs here.
- **Fix:** Change every "table" surface to floor surfaces ("hard floor" and "carpet", or "your usual floor" and "a rug"), including the Practice 1 example row: `| 1 | Timer | Hard floor | 50 |`. Add a callout at the end of §12.1:
  > **Autonomous safety rules**
  >
  > From now on, your code can move the robot without you. Two rules, every time: run autonomous **on the floor**, never on a table or desk, and keep a hand on **Disable** (the **Disabled** button in the Sim GUI's Robot State panel, or Enter in the Driver Station) for the whole run. Most of the bugs in this chapter make the robot keep driving. The floor and your finger on Disable turn that from a broken robot into a funny story.
- **Source:** CLAUDE.md, Ch 26 safety rules (e-stop with Space, Enter disables)

### m1: "Wheels scrub when turning in place" doesn't describe a two-wheel XRP

- **Where:** §12.5 line 340 ("turning in place is exactly when wheels **scrub**: they slide sideways across the floor as the robot pivots"), and line 374 ("the friction of the wheels scrubbing sideways").
- **Problem:** Scrub is a real effect on 4- and 6-wheel skid-steer FRC drivetrains, where wheels off the turning center have to slide sideways. The XRP has two drive wheels on one axle, which roll along their turning circle, plus a caster that slides. What fools its encoders in a turn is wheel slip, the caster dragging, and the fact that the wheels don't touch the floor exactly 155 mm apart. Ch 13 Practice 2 measures that "effective trackwidth". The gyro conclusion is right; only the reason is off, and the student will see a different reason in Ch 13.
- **Fix:** Line 340: "But turning is exactly when encoders are least trustworthy. The wheels can slip, the caster drags on the floor, and the wheels don't touch the ground exactly 155 mm apart, so the wheel distances say one thing while the robot does another. (On a big FRC robot with four or six wheels, turning also makes the wheels **scrub**, sliding sideways, which is even worse.) Chapter 13 measures how far off your XRP is." Line 374: "...not strong enough at `0.5` to overcome the friction of the caster dragging and the wheels getting started."
- **Source:** [Getting to know your XRP](https://docs.wpilib.org/en/stable/docs/xrp-robot/getting-to-know-xrp.html) (two drive motors, 155 mm trackwidth); CLAUDE.md Ch 13 entry (Practice 2, effective trackwidth)

### m2: The turn check only works for left turns, and the chapter doesn't say so

- **Where:** §12.5 test, line 362, and the listing, line 700 (`getHeadingDegrees() >= TURN_HEADING_DEGREES`), next to the "turn to a heading" callout, line 378.
- **Problem:** A student who reads "turn to a heading" and tries a right turn by setting `TURN_HEADING_DEGREES = -90.0` gets a robot that finishes the turn step on its first loop (`0 >= -90` is true) and drives straight on. The collab and the Build both invite tinkering with constants, and this is the first thing many will try. It's also a good lead-in to why Ch 15's PID with a tolerance replaces `>=`.
- **Fix:** Add after the turn-test paragraph at line 372: "This check only works for **left** turns, where the heading climbs toward the target. To turn right to `-90`, the test would have to be `<=`, and the rotation negative. For now, every turn on the course is a left turn. In Chapter 15, a PID controller with a tolerance turns either way with the same code, which is one of the reasons it exists."
- **Source:** none needed

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR [verify on hardware] | Ch 12's sample log implies about 0.86 m/s at full power, and Ch 13 says 0.28 m/s. If Ch 13 is right, leg 1 takes about 3.6 s, so the 3.0 s `STEP_TIMEOUT_SECONDS` fires in leg 1 every run (and leg 2's 1.0 m cap can never be reached before the timeout either). Measure once and make both chapters agree | none |
| 2 | MINOR | "You want `0.5` to mean `0.5`": `DifferentialDrive`'s default 0.02 deadband still rescales it to 0.4898 | none |
| 3 | MINOR | The sample log leaves out `XRP Explorer started!` and shows rounded numbers. Real output prints raw `double`s like `2.5599999999999983 s` | none |
| 4 | MINOR | The intro says "turn for half a second", but the timed course turns for 0.6 s | none |
| 5 | MINOR | CLAUDE.md's Ch 12 Build entry ("plus a timed segment") doesn't match the chapter. This is for Devang to fix by hand; it's outside Phase C's `src/` scope | none |
| (not counted) | | §12.7 line 797 "open SmartDashboard" and Build step 3, line 925: Elastic layout | D4, M2 |
| (not counted) | | B3 ("deploy" becomes **Simulate Robot Code** for the XRP): no hits. Ch 12 says "Run the program" and uses the Sim GUI's Robot State panel (line 178) | B3 |
| (not counted) | | The Ch 10 planted-bug change (`return -leftEncoder.getDistance();`) doesn't touch Ch 12. The routine relies on both encoders counting up going forward, as Ch 9 set up | Ch 10 VERIFY 1 |

## Verdict

Chapter 12 builds and runs as printed, and its step logic is right in a simulated probe. It teaches the right autonomous habits in the right order. The one thing that will hurt students is the timeout (VERIFY 1): if the XRP is as slow as Ch 13 says, the very first full run times out in leg 1, with no Diagnose entry to explain it. The other is a safety habit: the chapter casually tests on tables while demonstrating bugs that never stop (M1). Top three changes for Phase C:

1. Measure a real XRP's top speed once, then make Ch 12's timeout and sample log and Ch 13's speed figures agree. Add a Diagnose line for "leg 1 logs `TIMED OUT`" (VERIFY 1).
2. Move every test to the floor and add the two-rule autonomous safety callout (M1).
3. Correct the turning explanation for a two-wheel robot (m1), say that the `>=` turn check is left-only (m2), and show the real log format (VERIFY 3).
