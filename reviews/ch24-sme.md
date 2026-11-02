<!-- counts: blocker=0 major=0 minor=14 build=pass -->

# Chapter 24 SME Review (Phase B, lightweight)

**Chapter:** `src/section-5-advantagekit-capstone/24-advantagescope-visualizing-and-replaying-logs.md` at HEAD (1,628 lines)
**Inputs:** `robot-programming-book-exercises/ch24-advantagescope-visualizing-and-replaying-logs/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This is the chapter that makes the AdvantageKit investment from Ch 17 pay off. It is accurate and current for AdvantageKit 26. The input/output split is taught as *the* idea of the chapter. Outputs are recorded where decisions are made (requested volts in `setVolts`, follower state every loop, a `Course/Step` timeline, and `Commands/` from the scheduler hooks), keys are fixed words, and the one-recorder decision retires `DataLogManager` correctly (its `log()` would restart it). SysId moves to the exact pattern AdvantageKit documents. The best teaching move in the book may be §24.9: it replays a run *before* the `Sensors` seam exists, so students see a replay quietly lie, learn to find the first difference, and meet the replay bubble on a real example. The determinism audit, "a replay can only be as good as its log", and "replay as a habit, not a rescue" are exactly the habits strong teams keep. Anonymous classes arrive at the one place the code needs them (`new DrivetrainIO() {}`), and the lambda versus anonymous versus named-class table is clear.

**Prose claims checked** (VERIFY.md checked the code, every API, the replay path end to end, and the AdvantageScope menu strings):
- SysId through AdvantageKit (§24.5): matches AdvantageKit's page exactly. The `recordState` lambda is `(state) -> Logger.recordOutput(..., state.toString())`, the `Mechanism` log consumer is `null` ("data is recorded by AdvantageKit"), and the export is **File > Export Data**, format **WPILOG**, timestamps **AdvantageKit Cycles**. Source: [SysId Compatibility](https://docs.advantagekit.org/data-flow/sysid-compatibility).
- "AdvantageKit's own example projects do the same with their vision code, which also only reads" (line 1179): right. The AdvantageKit vision template's `Vision` is a `SubsystemBase` that no command requires.
- §24.12 "writes to a USB stick ... `/U/logs` ... formatted FAT32" (line 1431): right. AdvantageKit says "A FAT32 formatted USB stick must be connected to one of the roboRIO USB ports". Source: [AdvantageKit installation](https://docs.advantagekit.org/getting-started/installation/existing-projects).
- Every Additional Resources link resolves (checked 2026-11-01: Traditional Replay, Built-In Logging, Non-Deterministic Data Sources, Deterministic Timestamps, SysId Compatibility, Log Files, Line Graph).

## New findings (Phase B)

### m1: The corner test types `false` and `0.0` where Chapter 22 taught named inputs

**Where:** §24.11 Step 5, lines 1396 to 1406 (`FollowLine.decideNextState(State.FOLLOWING, false, errorAtTheCorner, 0.0)`).

**Problem:** `FollowLineTest` already has `LINE_LOST` and `NOT_SEARCHING`, and Ch 22 §22.5 made the point explicitly: `decideNextState(State.FOLLOWING, false, 0.3, 0.0)` "reads like nothing". The one test in the book that comes from a real log, and that the chapter presents as a model ("A number from a log has become a guard"), drops the habit. Students copy the newest example.

**Fix:**
```java
assertEquals(State.SEARCHING_LEFT,
    FollowLine.decideNextState(State.FOLLOWING, LINE_LOST, errorAtTheCorner, NOT_SEARCHING));
```
and one clause after the listing: "It uses the pretend readings from the top of the file, so it reads like the arrow it checks."

**Source:** book §22.5 ("Named inputs are the test-code version of Chapter 8's 'no magic numbers'")

### m2: The "easiest line to commit by mistake" has no automatic check, although CI is right there

**Where:** §24.8 callout "Set it back before you commit", lines 827 to 829; Git, line 1560 (`git diff` before the commit).

**Problem:** The chapter correctly calls `ROBOT_MODE` "the easiest to commit by mistake", and says a `REPLAY` commit stops a teammate's robot from starting at all. Its only guard is a person reading `git diff`. Ch 22 just built the better tool: a check that runs on every push. A one-line test makes CI catch the mistake on the pull request, which is the lesson of Ch 22's Collab applied to the student's own most likely error. The same test pattern handles `TUNING_MODE` for Ch 25's release.

**Fix:** Add to the callout: "Better still, let CI remember for you. In `src/test/java/frc/robot`, add `ConstantsTest`:"
```java
@Test
void committedCodeDrivesTheRealRobot() {
    assertEquals(RobotMode.REAL, Constants.ROBOT_MODE,
        "set ROBOT_MODE back to REAL before you commit");
}
```
"Now a `SIM` or `REPLAY` commit turns the pull request red." (This makes 31 tests. Phase C can keep 30 by putting it in the Exercises as a Practice instead, if the counts must not move.) One honest note for the text: this test also goes red on your laptop while you are in `SIM`, which is the point. Run your sim session, set it back, then build.

**Source:** book §22.9 and the Ch 22 Collab

### m3: The bug planted from the dashboard has to be taken out of the dashboard

**Where:** §24.11 Step 1, line 1336 (set **FollowLine/Side Error** to `0.9`); Step 5, line 1412 ("Restart the Explorer (which puts the Tuning tab back to the values in your code)").

**Problem:** The chapter's own lesson is that "tuned values are inputs" (line 1371). Yet it ends the exercise by trusting a restart to clear one. If Elastic is still open, it may republish `0.9` when the robot comes back. That is VERIFY.md's [verify], the same one as Ch 23 m4, and `LoggedNetworkNumber` keeps a value the topic already has. The student would then "follow the corner" with the planted bug still active, and see it stop again after writing a test that says it will not. Clearing the planted value by hand costs one step and makes the exercise safe either way.

**Fix:** At the end of Step 3 (or before the restart in Step 5): "Before you go on, set **Side Error** on the Tuning tab back to your code's value (the number in `SIDE_ERROR`), and close Elastic. A planted bug in a dashboard outlives the run it broke." Change line 1412 to "Restart the Explorer, reopen Elastic, and check that **Side Error** shows your code's value."

**Source:** VERIFY.md "Not verifiable here" (line 1412); Ch 23 review m4

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | `step()` makes each course step start one loop later, not "right away, in the same loop" | |
| 2 | MINOR | `DriveWithSticks` turns on in the same loop the course is cancelled, not the next | |
| 3 | MINOR | An instant command like `Reset Pose` only ever logs `false` (same-loop true then false) | |
| 4 | MINOR | `PIDController` reads no clock; drop it from the "clock is an input" list | |
| 5 | MINOR [verify] | "A two-minute run replays in a second or two": a few seconds, plus startup | |
| 6 | MINOR | The extensions error begins `Error at ...Logger.start(...)`, and the Sim GUI may flash open first | |
| 7 | MINOR | The replay's leg 2 ends on its timeout, and `Leg 3` lasts two loops | |
| 8 | MINOR | Deleting `simulationPeriodic()` prints WPILib's `Default simulationPeriodic() method... Override me!` | |
| 9 | MINOR | Git step: `git status` before the last commit shows only step 8's files | |
| 10 | MINOR | Practice 5 from a terminal (`./gradlew simulateJava`) hits the extensions error; pair it with Practice 6 | |
| 11 | MINOR | Reflect 5's "Sensors before Drivetrain" does not compile (`variable drivetrain might not have been initialized`); let the question lead there | |

Covered by Phase A, not counted:
- **D4a / M2 (Ch 14 row):** once Ch 14 shows the XRP map in AdvantageScope's 2D Field on the Evergreen FTC field, §24.3's "2D Field" part (lines 148 to 154, "In Chapter 17 the Explorer's course looked tiny on a full FRC field. You can do better.") becomes a second visit. Shorten it to the new parts (two poses on one field, the replay comparison), and change the Build step 2 wording to "a quick tour". The intro's "you will be able to open any run in AdvantageScope" stays: opening **logs**, rather than a live connection, is still new here.
- **D4:** nothing else. The chapter uses Elastic only to check the chooser (line 839) and the Tuning tab (line 1336), and never opens the SmartDashboard app. No B3 wording ("deploy") for the XRP.
- **M4 (load):** at 1,628 lines with eight Build steps and four refactors (outputs, `DataLogManager` and SysId, `RobotMode`, the `Sensors` seam), this is the longest of Ch 22 to 24. The Java load is right (anonymous classes, plus one generic method to read). The robot load is what is heavy. M4's checkpoint tag at the end of Ch 24 matters most here, because Ch 25's capstone starts from this exact code. A mid-chapter checkpoint after Build step 5 (`RobotMode` committed, before the seam) would also let a stuck student redo §24.9 and §24.10 from a known state.

## Verdict

Technically the cleanest of the three chapters: every listing builds, every replay probe matched, and the AdvantageKit and SysId patterns are the documented 2026 ones. No new majors. The three new minors all apply the book's own earlier lessons more consistently: named test inputs (Ch 22), CI as the guard for the line students commit by mistake (Ch 22), and tuned values as inputs that must be cleared on purpose (Ch 23). The VERIFY minors are timing and wording details. They are worth fixing because this chapter's whole message is "the log tells the exact truth", so the prose should be just as exact about loops. Top three changes for Phase C:

1. **VERIFY 1, 2, 3 and 7 together:** correct the loop-level claims about `step()`, the default command and instant commands, so what students see on the timeline matches the text, loop for loop.
2. **m2:** add the `ROBOT_MODE` guard test (or offer it as a Practice), so CI, not memory, keeps a `SIM` or `REPLAY` commit off `main`.
3. **m3 with VERIFY 10:** make the replay exercises self-cleaning and runnable as printed. Reset the planted `Side Error` before restarting, and pair Practice 5 with Practice 6's extension settings.
