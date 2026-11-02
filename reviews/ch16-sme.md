<!-- counts: blocker=0 major=0 minor=11 build=pass -->

# Chapter 16 SME Review (Phase B, lightweight)

**Chapter:** `src/section-3-autonomous-control/16-sysid-characterization-on-the-xrp.md` at HEAD (1,447 lines)
**Inputs:** `robot-programming-book-exercises/ch16-sysid-characterization-on-the-xrp/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This is a strong chapter. Feedforward is motivated by a bug the student has already felt (Ch 15's stalls near the target), the box and bike analogies land, and the habits it teaches are the ones strong teams use: one feedforward per side, gains named with their units and dated, measurements taken on the real floor, the raw log committed next to the gains, and PID kept for the residual. The kS buzz section and its deadband are a real-world lesson most teams learn the hard way. The hand-written SysId runner is more code than a competition team would write, but it makes `SysIdRoutine` transparent when it arrives in Ch 19, and the hold-to-run thumb plus two safety nets is a good safety habit.

**Prose claims checked against the WPILib docs** (VERIFY.md checked the code and the API, not these):
- "WPILib's own documentation recommends exactly this: tests you have to hold down" (§16.5, line 413). Confirmed: "It is recommended to bind them to buttons that the user must hold down for the duration of the test." Defaults 1 V/s, 7 V, 10 s also match. Source: [Creating an Identification Routine](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/creating-routine.html).
- Acceleration R² "rarely goes above 0.5, even on very good data", sim velocity R² "above 0.9 means a good fit", "kA tends toward zero and can be ignored" for a light mechanism, and the **Velocity Threshold** setting (§16.7, lines 799 to 818, 805). All confirmed. Source: [Viewing Diagnostics](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/viewing-diagnostics.html).
- Log Loader, **Open data log file...**, Data Selector, **Test State** slot, the Units dropdown, scaling boxes, and **Load** (§16.7 Steps 1 and 2). Confirmed. Source: [Loading Data](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/loading-data.html).
- "WPILib's own SysId example asks each motor what it was last told, with `motor.get()`, and multiplies by the battery voltage" (line 355). Matches the `SysIdRoutine` example's `DriveSubsystem`.
- Every Additional Resources link resolves (checked 2026-11-01).

## New findings (Phase B)

### m1: "Try every possible kS, kV, and kA" misdescribes least squares

**Where:** §16.3 "What SysId does with the data", line 185.

**Problem:** Least squares does not search; it solves for the best gains directly. A student who later meets brute-force search (or tries to "help" SysId by narrowing a range) carries the wrong picture. The intuition is fine; the wording states it as fact.

**Fix:** "The method is called **least squares**: it finds the one set of kS, kV, and kA whose predicted voltages are closest to the measured ones, on average, over every loop of every test. You can picture it as trying every possible set and keeping the best, but a little algebra gets there in one step. You do not have to do any of that math."

**Source:** [Introduction to System Identification](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/introduction.html)

### m2: The 165-line SysId runner is not signposted as scaffolding

**Where:** §16.5 "The Test mode code", lines 493 to 495 ("Type it, do not paste"), and §16.10 line 1303.

**Problem:** Students type about 165 lines (the latch, four helpers, the safety nets), and Ch 19 deletes all of it for `SysIdRoutine`. §16.10 says `SysIdRoutine` "does what your Test mode code does", but never says the code will be replaced. In the chapter M4 names as the start of the steepest stretch, a beginner who sinks an evening into typos here has no clue it is temporary, and no known-good copy to recover from.

**Fix:** Add one sentence before the listing: "This code is a teaching version: in Chapter 19, WPILib's `SysIdRoutine` replaces it with a few lines, and you will know exactly what those lines do because you wrote them out here once." Pair it with M4's checkpoint (a known-good `Robot.java` for the end of §16.5) so a stuck student can diff instead of retyping.

**Source:** CLAUDE.md Ch 19 Build entry; Phase A M4

### m3 [verify]: Two SysId UI names are not in the docs

**Where:** §16.7 Step 4, line 790 ("Open the **Diagnostic Plots** window ... Use the **Direction** box to see both **Forward** and **Backward**").

**Problem:** WPILib's docs call it the **Diagnostics** pane and say only that the plots "are separated by direction" and to "view both the forward and backward plots". I could not confirm a window named "Diagnostic Plots" or a control named "Direction" for SysId 2026, and VERIFY.md did not run the app. A beginner hunting for a box that is named differently stalls here.

**Fix:** Open SysId 2026.2.1 and copy the exact labels. If they differ, write: "In the **Diagnostics** pane, look at both the **forward** and the **backward** plots (SysId shows each direction separately)."

**Source:** [Viewing Diagnostics](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/viewing-diagnostics.html), [Loading Data](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/loading-data.html) ("check the fit diagnostics in the Diagnostics pane")

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | Change list says "two regular imports" but names and adds three | |
| 2 | MINOR | §16.8 listing silently drops five Ch 14 Javadoc comments, including the "keeps counting past 360" fact Ch 15 depends on | |
| 3 | MINOR | "You could pick 1.0" is true only if the SysId test volts are scaled and SysId is re-run | |
| 4 | MINOR [verify on hardware] | With the chapter's own gains, each test swings the robot 15 to 20 degrees and four tests end 30 cm to the side; "Space" needs side clearance | |
| 5 | MINOR | Sample log never shows the quasistatic "stopped by a safety net" line that the example robot actually produces | |
| 6 | MINOR | "Five or so entries with no `NT:`" is wrong; say "seven entries ending in `-drive`" | |
| 7 | MINOR | Practice 1's acceleration row cannot be checked with one-argument `calculate`; `calculateWithVelocities` gives 3.39, not 3.30 | |
| 8 | MINOR | `tankDrive`'s 0.02 deadband becomes part of the fitted kS (about 0.12 V); harmless on the robot, matters for Ch 17's sim | |

Not counted: §16.9 "Retune" step 1 ("the **Heading PID** widget") and "the tuning bench and plots from Section 15.9" are M2/D4 (Elastic PIDController widget, AdvantageScope Line Graph). The Simulation GUI uses here (Robot State, Joysticks) stay, per M2. Load (1,447 lines, four Java items plus a large Build) is M4.

## Verdict

Technically sound and well taught; the only real hazards are practical ones a beginner meets on the floor. Every prose claim about SysId and WPILib I could check is right. No blockers or majors. Top three changes for Phase C:

1. **VERIFY 4:** tell students the robot will swing 15 to 20 degrees per test and leave 30 cm of side clearance, so the robot does not drive off a desk strip.
2. **VERIFY 8 with VERIFY 3:** one sentence each, so the "pretend volts cancel" story is exactly true (scaled test volts; the 0.02 deadband lives inside kS). Ch 17's simulator inherits this.
3. **m2:** label the Test mode SysId runner as a teaching version replaced in Ch 19, and give students the M4 checkpoint for it.
