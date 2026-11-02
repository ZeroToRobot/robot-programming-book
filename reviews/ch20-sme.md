<!-- counts: blocker=0 major=1 minor=11 build=pass -->

# Chapter 20 SME Review (Phase B, lightweight)

**Chapter:** `src/section-4-command-based/20-button-bindings-robotcontainer-and-command-groups.md` at HEAD (1,752 lines)
**Inputs:** `robot-programming-book-exercises/ch20-button-bindings-robotcontainer-and-command-groups/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md` (D4, D4a, M4)
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This is a strong chapter. Bindings are taught by asking how the command should end (`onTrue` for self-finishing, `whileTrue` for hold-to-run), mode gating with `RobotModeTriggers` is introduced the moment two bindings would collide, `ignoringDisable` comes with the right safety rule ("only commands that never move anything"), `deadlineFor` is used instead of the deprecated `deadlineWith`, and the one-owner rule is explained through object memory rather than as an arbitrary WPILib error. The finished `Robot.java` matches WPILib's 2026 Command Robot template almost line for line, and the controls table in `configureBindings()`'s Javadoc is a habit drive teams will thank students for. The pair lab ending in a double-bound button that Git and the compiler both miss is excellent setup for Ch 21's Collab. Load is high (M4), but the chapter is honest about it and has two safe places.

**Prose claims checked** (VERIFY.md checked the code and API):
- "Be careful with `toggleOnTrue` for drivers. WPILib's own documentation discourages it" (§20.6 callout, line 695; VERIFY marked it [verify]). Confirmed: the docs say toggles "are not a highly-recommended option for user control" and that the preferred method is two buttons. Source: [Binding Commands to Triggers](https://docs.wpilib.org/en/stable/docs/software/commandbased/binding-commands-to-triggers.html).
- "if the command finishes while the button is still held, `whileTrue` does not start it again" (line 697). Confirmed on the same page.
- "WPILib's template suggests the same trick for constants" (static imports, line 254). Confirmed by VERIFY.md's template comparison (the Command Robot `Constants` Javadoc recommends static imports).
- "WPILib's documentation calls it exactly that: a declarative way to describe a robot" (line 50) and the `RobotContainer` template comment paraphrase (line 882). Confirmed (VERIFY.md template comparison; [What Is "Command-Based" Programming?](https://docs.wpilib.org/en/stable/docs/software/commandbased/what-is-command-based.html)).
- "A match's autonomous period is only 15 to 20 seconds" (line 356). Already confirmed in Phase A.

---

## New findings (Phase B)

### m1: `BackAwayFromWall` drives backward blind, with no time or distance limit

**Where:** Collab Part B step 2, the `BackAwayFromWall` listing, lines 1645 to 1685 (`execute()` drives at -0.10 m/s; `isFinished()` is only `!sensors.isObstacleWithin(CLEAR_DISTANCE_METERS)`).

**Problem:** The book's own driving rules limit reverse "because nothing watches behind the robot" (Ch 19 line 896), and this command drives backward with only a forward-facing sensor to stop it. If the rangefinder keeps reading something close (a hand that follows the robot, a reflection, a sensor glitch), the robot keeps backing up: it is bound with `onTrue`, so letting go of X does not stop it. On a table, that ends on the floor. It is a listing students type and review together, so it sets a habit: every command that moves needs a second way to end. The rest of the book does this well (`DriveUntilLine`'s maximum distance, `FollowLine`'s `GAVE_UP`, every course step's timeout), which makes the gap here stand out.

**Fix:** Bind it with a timeout, and say why in one sentence:
```java
// Teleop: press X to back away from a wall. The timeout is the safety net:
// nothing watches behind the robot.
controller.x().and(teleop).onTrue(
    new BackAwayFromWall(drivetrain, sensors).withTimeout(3.0));
```
Ch 19's Collab checklist gets the matching item (Ch 19 m5).

### m2: Single-subsystem factories live in `RobotContainer`, against WPILib's guidance

**Where:** §20.4 "Factory methods", lines 441 to 447, and §20.5/§20.7, `holdStill()` (line 1126) and `resetPose()` (line 1109) as private methods of `RobotContainer`.

**Problem:** WPILib's docs recommend that a command factory "conceptually related to only a single subsystem" be an instance method of that subsystem (for example `drivetrain.holdStill()`), and keep outside classes for commands that use several subsystems. The book teaches only the `RobotContainer` location, and later chapters keep adding there (Ch 23's "Sit Still", Ch 25). On a competition robot with six subsystems, `RobotContainer` becomes the file every pair conflicts on, which the chapter's own pair lab demonstrates. The Explore exercise (line 1734) asks exactly the right question, but the main text never gives the answer.

**Fix:** Add one paragraph after the field/factory table: "Where should a factory live? WPILib's guideline: if the command uses only one subsystem, make the factory a method **of that subsystem**, so `drivetrain.holdStill()` would live in `Drivetrain`. If it uses several, or knows about the course, it belongs outside them, in `RobotContainer` or an `Autos` class. The Explorer keeps its three small factories in `RobotContainer` for now so this chapter changes as few files as possible; the Explore exercise asks you to decide where each should go." Optionally move `holdStill()` into `Drivetrain` in a later chapter's Build.

**Source:** [Organizing Command-Based Robot Projects](https://docs.wpilib.org/en/stable/docs/software/commandbased/organizing-command-based.html)

### m3: Y resets the pose in every mode, including in the middle of the autonomous course

**Where:** §20.6 "Disabled: `ignoringDisable`", line 800 ("The binding is then one line, with no mode, because it should work in every mode"), and `configureBindings()`, line 1025.

**Problem:** `Reset Pose` has no requirement, so pressing Y during autonomous does not interrupt the course; it zeroes the drivetrain's software distance and heading underneath it. `DriveDistance` and `TurnToHeading` then measure from stale starting points: leg 1 drives its full distance again, or the turn turns another 90 degrees. A real competition habit is that zeroing buttons are for disabled and teleop only. The fix uses only what §20.6 just taught (`negate()`, `RobotModeTriggers`).

**Fix:**
```java
// Any mode except autonomous: Y puts the robot back at the start pose.
// (In autonomous, the course resets the pose itself, and a reset mid-course would confuse it.)
controller.y().and(RobotModeTriggers.autonomous().negate()).onTrue(resetPose());
```
and the controls table row becomes `Not auto   Y   reset the pose to the start line (works while disabled)`. Update Reflect 1 and the Diagnose row for Y if their wording changes.

---

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | Practice 3: a `turnLeft` field assigned in `buildObstacleCourse()` is still `null` when `configureBindings()` runs, so the program fails with an NPE, not the one-owner error the exercise is about | |
| 2 | MINOR | Practice 5: binding the `obstacleCourse` field inside `configureBindings()` gives an NPE, so "Does WPILib allow it?" gets a misleading no | |
| 3 | MINOR [verify on hardware] | Practice 5: the simulated USER button reads pressed, so the course drives off as soon as Test mode starts | |
| 4 | MINOR | `MathUtil` and `Commands` constructors are shown as empty; the real ones throw, which the Explore bullet then treats as unusual | |
| 5 | MINOR | Diagnose table: the deadline group's error text says "parallel group", not "parallel composition" | |
| 6 | MINOR | One-owner error: the real "Originally composed at" block starts with a WPILib line before the first `frc.robot` line | |
| 7 | MINOR [verify] | Bindings in a periodic method: the pile is real, but no loop overrun appears on a laptop | |
| 8 | MINOR | "nine fields of what am I doing right now": Ch 18 had eight | (same count error as Ch 19 VERIFY 7) |
| 9 | MINOR | "WPILib's command-based template ... `OperatorConstants`": true of the roboRIO Command Robot template, not the XRP Command template | |

Not counted (Phase A): the Simulation GUI **NetworkTables > SmartDashboard** checks at lines 605 and 1371 move to Elastic (D4), and the field map check in §20.8 step 1 ("the robot icon on the field map jumps back") moves to AdvantageScope's 2D Field (D4a).

---

## Verdict

Accurate and current for WPILib 2026; every prose claim I checked holds, including the `toggleOnTrue` warning that VERIFY.md could not check offline. The one MAJOR (Practice 3's NPE) comes from the constructor calling `configureBindings()` before `buildObstacleCourse()`, which also causes VERIFY 2, so Phase C can fix both by rewording the two exercises (or by swapping the constructor order, which would also make the "everything a binding uses must exist first" rule simpler to state). The new findings are habits: a backing-up command with no safety net, factories that WPILib would put in the subsystem, and a pose reset that can fire mid-autonomous. Load is high (M4) but the two safe places are well placed. Top three changes for Phase C:

1. Fix Practice 3 and Practice 5 (VERIFY 1 and 2): tell the student where to create the field, or move `obstacleCourse = buildObstacleCourse();` above `configureBindings()` and adjust the "order of things" paragraph.
2. Add the timeout to `BackAwayFromWall`'s binding (m1) and gate Y out of autonomous (m3).
3. Add the one-paragraph "where should a factory live?" note (m2), and show the real `MathUtil` constructor (VERIFY 4).
