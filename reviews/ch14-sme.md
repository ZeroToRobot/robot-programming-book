<!-- counts: blocker=0 major=0 minor=10 build=pass -->

# Chapter 14 SME Review (Phase B, lightweight)

**Chapter:** `src/section-3-autonomous-control/14-odometry-knowing-where-you-are.md` at HEAD (1253 lines)
**Inputs:** `robot-programming-book-exercises/ch14-odometry-knowing-where-you-are/VERIFY.md` and `answer-key.md`, `robot-programming-book-exercises/ELASTIC-EVALUATION.md`, `reviews/00-book-wide.md` (decision D4a)
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

The chapter teaches odometry the right way round: the blindfolded walk first, then the four-line update by hand, then WPILib's class, then its blind spots. The "teleport problem" and making the raw resets `private` so the rule can't be broken is good design and good teaching (it turns a runtime surprise into a compile error, tying back to Ch 10). The "odometry is a belief, not a fact" callout, the square that never closes, and the AprilTag lighthouse sprinkle set up Ch 30 and 33 well. The Java thread (composition vs inheritance, chaining, static factories, immutability) all hangs off `Pose2d`, so it reads as one idea rather than four, even though it is above the 1-to-2 concept budget on paper.

**Prose claims checked** (not covered by VERIFY.md's API checks):
- "If at any time you reset the gyro or the encoders, you must also reset the odometry" (§14.6, line 391): the WPILib article says the `resetPosition` method "MUST be called with the new gyro angle and wheel distances." Correct. Source: [Differential Drive Odometry](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-odometry.html)
- "AdvantageScope (which you opened briefly in Chapter 10)" (line 704): Ch 10 line 623 invites the reader to open a `.wpilog` in AdvantageScope. Correct. "Your data log records everything published to the dashboard" is right for `DataLogManager` (it logs NetworkTables by default), so a Field2d replay from the Ch 10 log works.
- The Ch 20 promise in Practice 3 ("Chapter 20 has a use for something like it"): kept, Ch 20 Practice 7 "waypoints as constants".
- The §14.2 callout's FRC field origin sentence is covered by Phase A m3 (alliance flipping sprinkle). Not counted again.

## New findings (Phase B)

### m1: `resetPose` zeroes the hardware, which is the habit Chapter 17 has to undo

- **Where:** §14.6 "The teleport problem" (lines 391 to 401), the `resetPose` listing (lines 572 to 577), and the walk-through bullet at line 659.
- **Problem:** The chapter teaches that "resetting the pose" means resetting the encoders and the gyro, then `resetPosition`. That works on the XRP (VERIFY: `XRPGyro.reset()` is a software zero). But `resetPosition` exists precisely so you **don't** have to touch the sensors: it takes the current readings, whatever they are, and calls that spot the new pose. WPILib's own example passes `getDistance()` straight in, not zero, and the AdvantageKit templates never reset a gyro or encoder to move the pose. On the Mini Swerve, zeroing a Pigeon 2 or a Talon FX position is a CAN request that lands a few milliseconds later, so "reset, then read" can read the old value and teleport the pose the chapter just warned about. The book already moves to software zeroing in Ch 17 ("never resets hardware"); a student who learned the rule here as "always zero the sensors" will be surprised there and on the swerve.
- **Fix:** Keep the listing (the turn step still checks `getHeadingDegrees() >= 90`, which needs a zeroed gyro until Ch 15/17). Add a short callout after the walk-through: "> **You don't actually have to zero the sensors** > `resetPosition` takes the sensors' readings **as they are** and calls that spot `newPose`. So `odometry.resetPosition(getRotation2d(), getLeftDistanceMeters(), getRightDistanceMeters(), pose)` alone would move the pose with no jump, without touching any hardware. The Explorer zeroes its encoders and gyro too because its turn step still reads the raw heading. On a real FRC robot, zeroing a motor controller or gyro over the CAN bus takes a moment to arrive, so strong teams leave the sensors alone and reset only the odometry. Chapter 17 switches the Explorer to that style."
- **Source:** [Differential Drive Odometry](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-odometry.html) (constructor and `resetPosition` take the current readings; examples pass `getDistance()`); CLAUDE.md Ch 17 Build ("zeroing in software ... never resets hardware")

### m2: The field map steps need the D4a rewrite, with a specific shape

- **Where:** §14.7 "Where to see it" (lines 693 to 700), the "One map, many viewers" callout (line 704), "Try it" (line 1003), Build step 3 (line 1178), the two Field-window Diagnose items (lines 1191 and 1192), the Summary (line 1101), and Resources (line 1247).
- **Problem:** Phase A M2 already lists these lines (D4a), so the change itself is not new. Two details are not in that table and will trip Phase C: (1) the Sim GUI steps and its "2 m by 2 m" setting, the `imgui.ini` remark (wrong anyway: VERIFY notes the Sim GUI writes `simgui*.json`), and the "icon is huge or invisible" Diagnose item all go away, and need AdvantageScope equivalents, not just a deletion; (2) the `Course` object is published as a pose array, and in AdvantageScope's 2D Field it has to be dragged in separately from `Robot` and given a "Ghost" style, or students will see only the robot. Elastic's Field widget cannot show the course at all (ELASTIC-EVALUATION.md item 3).
- **Fix:** Rewrite "Where to see it" as: "1. Run your program as usual. 2. Open **AdvantageScope** (`WPILib: Start Tool` > `AdvantageScope`) and choose **File > Connect to Simulator**. 3. Add a **2D Field** tab (the + button) and pick the **Evergreen** FTC field from its field list, so the map is a few meters across instead of an FRC field. 4. From the sidebar, drag `SmartDashboard/Field/Robot` onto the field, then drag `SmartDashboard/Field/Course` and set it to **Ghost**." [verify the exact object-type names in AdvantageScope 2026's 2D Field `?` list; the docs page only says the list is in the app. Ch 24 already uses the Evergreen field, so that name is the book's own.] Replace the two Diagnose items with "No `Field` in AdvantageScope's sidebar: check `putData("Field", field)` and that the program is running" and "The robot is a speck: you are on an FRC field; pick the small field in the 2D Field tab's settings." Keep the point that the origin is at the start line, and say where AdvantageScope draws (0, 0) on the chosen field [verify the Evergreen field's origin corner in AdvantageScope 2026]. Add the AdvantageScope 2D Field doc link to Resources.
- **Source:** decision D4a and M2 (Phase A); `ELASTIC-EVALUATION.md` item 3; [AdvantageScope 2D Field](https://docs.advantagescope.org/tab-reference/2d-field)

### m3: Practice 2 makes a promise to Chapter 30 that Phase A did not record

- **Where:** Practice 2, line 1148 ("Keep this number: in Chapter 30, you will compare it with the Mini Swerve's"), and §14.9 line 1082 ("You will compare a simulated run with a real one on the same map", Ch 17).
- **Problem:** Ch 30 is a stub, and Phase A's "Promises" list for Ch 30 names only `SwerveDrivePoseEstimator` and Field2d. If the Ch 30 author doesn't know about it, the student keeps a number that never gets used. The Ch 17 promise: I found no step in Ch 17 at HEAD that puts a simulated and a real run on the same map [verify against Ch 17's exercises].
- **Fix:** Add "drift per meter from Ch 14 Practice 2, compared with the Mini Swerve's" to the Ch 30 row of Phase A's promises list (for the Ch 30 author). For line 1082, either point at the Ch 17 step that does it, or soften to "and you can run the same course in simulation and on the real robot and compare."
- **Source:** `reviews/00-book-wide.md` "Promises the written chapters make to the unwritten ones"

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | §14.7 says "four new imports"; `Robot.java` gains three | none |
| 2 | MINOR | `TimedRobot` runs `autonomousPeriodic()` before `robotPeriodic()`, so `startStep()` logs the previous loop's pose; "before anything reads the pose" (line 991) and the sample log's 91.10 at step 3 don't match the code | none |
| 3 | MINOR | The reason for creating `odometry` in the constructor is misstated (it's the starting readings before the reset, not "raw counts" forever); `drivetrain`/`sensors` moved into the constructor in Ch 10, not Ch 12 | none |
| 4 | MINOR | "In Chapter 19 ... `periodic()`": Ch 17 introduces `periodic()`, Ch 19 makes WPILib call it | none |
| 5 | MINOR | Practice 1 move 6 needs cos/sin of 135, which the §14.3 table doesn't give | none |
| 6 | MINOR | A uniform wheel-size error does not open a closed square (probed); the "where the error comes from" list implies it does | none |
| 7 | MINOR | Practice 4's encoder-only reset after a straight push looks the same as a correct reset; the teleport only shows after a turn | none |
| (not counted) | | §14.7 line 693 "The SmartDashboard app you have been using since Chapter 5", and every Sim GUI Field step | D4, D4a, M2 (see m2 above for the shape of the rewrite) |
| (not counted) | | §14.8 callout now says "Pigeon 2 on the Mini Swerve (Chapter 29)"; the navX wording is already fixed | B1 (applied) |
| (not counted) | | §14.2 FRC field origin sentence, no alliance-flip preview | m3 (Phase A) |

## Verdict

Technically sound and well paced; no blockers or majors. The pose, frame, and immutability teaching is accurate against the 2026 source, and the code structure (`getPose()` / `resetPose()` / `drive()` as the drivetrain's whole public face) is the right one to carry into command-based. The biggest Phase C job is not new: the field map has to move to AdvantageScope (D4a), and m2 gives the concrete step list. Top three changes for Phase C:

1. Rewrite §14.7 "Where to see it", "Try it", Build step 3 and the Field Diagnose items for AdvantageScope's 2D Field on a small field, with `Course` as a ghost (m2, D4a).
2. Add the "you don't actually have to zero the sensors" callout, so `resetPose` doesn't teach hardware zeroing as the rule before Ch 17 and the swerve undo it (m1).
3. Fix the loop-order wording and sample log (VERIFY 2) and the wheel-size claim about the square (VERIFY 6), since both feed Reflect 1 and the Build tables students fill in.
