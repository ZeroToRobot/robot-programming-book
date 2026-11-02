<!-- counts: blocker=0 major=0 minor=14 build=pass -->

# Chapter 19 SME Review (Phase B, lightweight)

**Chapter:** `src/section-4-command-based/19-subsystems-and-commands-on-the-xrp.md` at HEAD (1,781 lines)
**Inputs:** `robot-programming-book-exercises/ch19-subsystems-and-commands-on-the-xrp/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md` (D4, D4a, M4)
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

The command-based structure is taught the way strong 2026 teams write it: `frc.robot.subsystems` and `frc.robot.commands`, one class per command, every command's `end()` stopping the motors, requirements on every command that moves the drivetrain (including the factory ones), suppliers instead of a controller inside `DriveWithSticks`, and `SysIdRoutine` replacing the hand-built SysId state. The "once, or every time?" rule for constructor versus `initialize()` is the most useful habit in the chapter, and the deliberate constructor trap (Practice 2) makes it stick. The two safe places with commits match the refactor discipline from Ch 17. The real problem is load, which Phase A already reported (M4): a 470-line `Robot.java` replacement, half of which (the autonomous bridge, the polled bench) Ch 20 deletes. Nothing below changes that verdict; the new findings are small.

**Prose claims checked** (VERIFY.md checked the code and API):
- "the default would win, because the scheduler runs after the mode methods" (§19.8, line 938). Confirmed: `IterativeRobotBase.loopFunc()` calls the mode's periodic method, then `robotPeriodic()`, where the scheduler runs. Source: [allwpilib IterativeRobotBase.java](https://github.com/wpilibsuite/allwpilib/blob/main/wpilibj/src/main/java/edu/wpi/first/wpilibj/IterativeRobotBase.java).
- "right-click the folder and look for **Create a new class/command**" (§19.5, line 465). [verify] It is a right-click menu item of the WPILib extension, not a command-palette entry, and the [WPILib Commands in Visual Studio Code](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/wpilib-commands-vscode.html) page does not list it. Check the exact menu text in the 2026.2.1 extension. The chapter's wording ("look for") is already safely loose.
- "WPILib's command-based template and almost every FRC team's code on GitHub use the same layout" (§19.2, line 89). Confirmed for the template (`commands/`, `subsystems/`). Source: [Structuring a Command-Based Robot Project](https://docs.wpilib.org/en/stable/docs/software/commandbased/structuring-command-based-project.html).
- `testInit()` "(WPILib's template does this too)" (line 1364). Confirmed by Ch 20 VERIFY.md's template comparison (`cancelAll()` in `testInit()`).

---

## New findings (Phase B)

### m1: "which is not how commands behave" contradicts Ch 20's `ignoringDisable`

**Where:** §19.1 "Three decisions", line 53: "Resetting the pose is instant and works even while disabled, which is not how commands behave."

**Problem:** Commands can run while disabled; they just do not by default. Ch 20 §20.6 fixes Y with exactly `.ignoringDisable(true)`. A student who remembers "commands cannot run while disabled" will be confused by Ch 20, or will think `ignoringDisable` is a hack.

**Fix:** "Resetting the pose is instant and has to work while the robot is disabled, and commands do not run while disabled unless you ask for it. Chapter 20 is about tying buttons to commands, and it shows how to ask."

**Source:** [Commands: runsWhenDisabled](https://docs.wpilib.org/en/stable/docs/software/commandbased/commands.html)

### m2: `speedScale == SLOW_MODE_SCALE` compares doubles with `==`

**Where:** §19.7 `DriveWithSticks` listing, line 900: `SmartDashboard.putBoolean("Slow Mode", speedScale == SLOW_MODE_SCALE);`

**Problem:** It is correct here (both sides are the same constant, never computed), but Ch 12 taught "never `==` on `double`s", and this is the first file a student writes from scratch that breaks the rule with no comment. Students copy patterns, not reasons. It is also roundabout: the code already had the boolean.

**Fix:**
```java
boolean slowMode = slowModeSupplier.getAsBoolean();
double speedScale = slowMode ? SLOW_MODE_SCALE : FULL_SPEED_SCALE;
...
SmartDashboard.putBoolean("Slow Mode", slowMode);
```

### m3: Practice 6 asks for decorators the book has not taught

**Where:** Exercises, Practice 6, line 1679: "could `TurnToHeading` be written with `Commands.run(...)` and decorators? Try it."

**Problem:** The working answer (answer-key §7) needs `beforeStarting(...)` for the reset and `finallyDo(...)` for the stop. Neither has appeared yet (`finallyDo` arrives in Ch 20 Practice 4, `beforeStarting` never). A zero-experience reader has `until` and `withName` only, and will get stuck with no recovery path.

**Fix:** Add to the hint: "Two decorators you have not met yet will help: `.beforeStarting(runnable)` runs something once, before the command starts (your `initialize()`), and `.finallyDo(runnable)` runs something however it ends (your `end()`). The PID controller can be a local variable that the lambdas capture (Section 18.6)."

**Source:** [Command Compositions: decorators](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html)

### m4: A bench command that never reaches tolerance locks out the sticks, and the chapter gives no way out

**Where:** §19.9 callout "Command stuck in the list?", line 1620; §19.8 bench table, line 1510 ("Sticks | `DriveWithSticks` (default) | Whenever no bench command is running").

**Problem:** On a real XRP, a `TurnToHeading` that sits 2.5 degrees off and buzzing never finishes, so it holds the drivetrain forever and the sticks do nothing. The callout explains why, but not what the student does right now. Autonomous has `STEP_TIMEOUT_SECONDS`; the bench has nothing. Habit to teach: every command that moves a mechanism has a second way to end.

**Fix:** Add to the callout: "To get the sticks back right away, press another bench button (the new command interrupts the stuck one) or disable. To make the bench safe for good, give each bench command a timeout when you create it: `new TurnToHeading(drivetrain, 0.0).withTimeout(5.0)`."

### m5: The Collab review checklist has no "second way to end" item

**Where:** Collab: Command Review, lines 1747 to 1754 (`BackAwayFromWall`: "drive backward slowly until the rangefinder reads more than 0.30 m").

**Problem:** `BackAwayFromWall` drives backward, where "nothing watches behind the robot" (the book's own reason for `MAX_REVERSE_SPEED`, line 896), and its only end is a forward-facing sensor reading. The checklist asks whether `isFinished()` *can* become true, but not whether the command has a fallback if the sensor never says so. See Ch 20 m1 for the listing.

**Fix:** Add a checklist item: "Does a command that moves have a safety limit (a `withTimeout`, or a maximum distance) in case its sensor never says 'done'?" And in the `BackAwayFromWall` description: "...until the rangefinder reads more than 0.30 m, or 0.30 m of backing up, whichever comes first."

---

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | `DriveUntilLine` holds the heading the turn stopped at, not 90, so leg 2 changes slightly, contradicting "the math did not change" | |
| 2 | MINOR | "Did you forget to delete the call?" callout: double speed is right, but no overshoot, and AdvantageKit does not record inputs twice | |
| 3 | MINOR | Diagnose row "needs to be pressed twice" is wrong for `getXButton()`; the real symptom is restarting while held | |
| 4 | MINOR | Diagnose row "skips straight through all its steps" names causes that make a command never finish, not finish at once | |
| 5 | MINOR | SysId fences: a test starting near one fence can drive almost 1.5 m; tell readers to leave room on both sides | |
| 6 | MINOR | Section numbers in `Robot.java` listing comments point to 19.7 instead of 19.8 and vice versa | |
| 7 | MINOR | "nine fields to three": Ch 18 had eight real fields | (same count error as Ch 20 VERIFY 8) |
| 8 | MINOR | File count ignores the template's unused `XRPDrivetrain.java` | |
| 9 | MINOR | Practice 1: changing one of three `TurnToHeading` uses to the full name does not build | |

Not counted (Phase A): the Simulation GUI **NetworkTables > SmartDashboard** checks at lines 253, 1577 and 1581 move to Elastic's Scheduler and Subsystem widgets (D4); the "run the program" wording already matches B3.

---

## Verdict

Technically sound and well aligned with how strong teams structure command-based code in 2026. The VERIFY.md items are all small wording fixes, and the new findings are about habits: say "by default" when describing disabled commands, keep Ch 12's `double` rule visible, give every moving command a fallback end (the bench and `BackAwayFromWall`), and do not ask for decorators before teaching them. Load stays the main risk (M4): Phase C should decide on the M4 checkpoint or downloadable bridge for §19.8 before polishing anything else here. Top three changes for Phase C:

1. Apply M4 to §19.8: give students the `Robot.java` listing as a checkpoint branch or diff (it is 470 lines, and Ch 20 deletes the bridge and the polled bench), and fix the comment section numbers while there (VERIFY 6).
2. Fix the misleading Diagnose rows and the double-call callout (VERIFY 2, 3, 4), and add the bench timeout and recovery advice (m4).
3. Add the "second way to end" rule to the Collab checklist (m5) and the decorator hint to Practice 6 (m3).
