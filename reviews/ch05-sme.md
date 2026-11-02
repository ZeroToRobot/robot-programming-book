<!-- counts: blocker=1 major=2 minor=11 build=pass -->

# Chapter 5 SME Review (Phase B, lightweight)

**Chapter:** `src/section-1-foundations/05-how-a-robot-program-is-structured.md` at git HEAD (412 lines)
**Inputs:** `PHASE-B-LIGHT.md`, `00-book-wide.md` (D1 to D5, D4a, B1 to B3, M1 to M5), `robot-programming-book-exercises/ch05-how-a-robot-program-is-structured/VERIFY.md` and `answer-key.md`
**Review date:** 2026-11-01

Not re-reported: the SmartDashboard app (M2, D4), deploy and RioLog (B3), and everything in VERIFY.md.

---

## New findings (Phase B)

### M1: "If your code throws an exception, WPILib catches it and stops the motors" teaches a false safety net

**Where:** §5.7, line 327.

**Problem:** WPILib doesn't catch an exception and carry on. An uncaught exception ends the robot program. `RobotBase` prints the stack trace and "The robot program quit unexpectedly" (the book's own Ch 26 quotes it), the Driver Station shows no robot code, and on a roboRIO the program restarts a few seconds later. During a match that is a dead robot. Students who read line 327 come away thinking exceptions are handled for them, which is the opposite of the lesson in Ch 10 and Ch 26. The same paragraph also credits "WPILib" with disabling the robot when the Driver Station disconnects. That's done by the control system's communication layer (and, on the XRP, by the robot dropping out of enabled), not by anything in the user's program.

**Fix:** Replace the middle of the paragraph:

> The TimedRobot template enforces a structure that WPILib can monitor. If your `teleopPeriodic()` takes too long, WPILib prints a warning. If the Driver Station stops talking to the robot, the robot disables itself within a fraction of a second. And if your code crashes with an error, the whole program stops, the motors stop with it, and you see the error in the console. You'll learn to read those errors in Chapter 10. None of these safety checks would be possible if your code were a free-form loop.

**Source:** [WPILib: Reading stacktraces](https://docs.wpilib.org/en/stable/docs/software/basic-programming/reading-stacktraces.html); [WPILib: Robot Program, TimedRobot](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html)

---

### m1: "Why 50 Hz" says the rate is hardcoded and the same for every team

**Where:** §5.1 callout, line 36 ("The number is hardcoded into FRC's network protocol: every team's robot runs at the same rate, on the same schedule").

**Problem:** The Driver Station does send control packets every 20 ms, but the robot loop's rate is `TimedRobot`'s default period, which a team can change (`super(0.01)` in the constructor, or `addPeriodic` for a second, faster loop). Some strong teams do. On the XRP there isn't a roboRIO at all: the loop runs on the laptop. A student who later reads a team's code with `super(0.01)` will think it's illegal.

**Fix:** "The Driver Station sends the robot a packet every 20 milliseconds, and `TimedRobot` runs your loop on the same beat by default. Teams *can* change it, but almost nobody needs to, and this book never does. On the XRP, the loop runs on your laptop, at the same 20 ms."

**Source:** [TimedRobot Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/TimedRobot.html) (`kDefaultPeriod`, `TimedRobot(double period)`, `addPeriodic`); [WPILib: Creating a robot program](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html) (20 ms default, changing it risks overruns)

---

### m2: §5.7 asks "why not a `main()` method?" while the project has one

**Where:** §5.7, line 321.

**Problem:** Every WPILib project has `Main.java` with `main()`, and students see it in the file tree. The section is the right place to open it. It shows the Hollywood Principle in one line (`RobotBase.startRobot(Robot::new)`: "here is my class, you call it"), and it answers the question "who calls my constructor?" that §5.3 (line 116) leaves open.

**Fix:** After line 321, add:

> Actually, your project *does* have a `main()`. Open `Main.java`. Its one real line is `RobotBase.startRobot(Robot::new);`, which means "WPILib, here is my `Robot` class: create it and run it." (The `::` is explained in Chapter 7.) After that, WPILib is in charge. It calls your constructor once, then your Init and Periodic methods for as long as the program runs. The comment in that file says not to change it, and you won't.

**Source:** [WPILib: Creating a robot program](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html)

---

### m3: The TimedRobot resource link is a 404

**Where:** Additional Resources, line 405 (`docs/software/convenience-features/timed-robot.html`).

**Problem:** That page doesn't exist (HTTP 404 on 2026-11-01). It's the first link in the list, and it's the one a student uses to check the lifecycle.

**Fix:** Point it to the TimedRobot section of [Creating a robot program](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html), which covers `init()`, `periodic()` and `exit()` and the 20 ms default. Then merge it with the second bullet, which links the same page.

---

### m4: The skeleton's empty bodies `{}` and the Exit methods aren't explained, but the Reflect asks for "every line"

**Where:** §5.6 Step 2, lines 259, 267, 275 and 283 (`{}` on one line); §5.4, line 166; Reflect, lines 356 to 358 (explain every line, then "write the explanation as a code comment").

**Problem:** §5.3 reads the template line by line, but the skeleton then introduces `disabledInit`, `disabledPeriodic`, `testInit`, `testPeriodic` and the one-line `{}` body, none of which §5.3 reads. Those are exactly the lines the answer key says students can't explain. The Reflect also asks for code comments, which no chapter has taught (see Ch 4 m1). Separately, WPILib also calls `autonomousExit()`, `teleopExit()` and the rest when a mode ends. Students see them in the docs and in other teams' code, so one sentence will save them a search.

**Fix:** After the skeleton (line 287), add:

> A method written `public void disabledPeriodic() {}` has an **empty body**: the method exists, and WPILib calls it, but there's nothing inside yet. You'll fill several of these in over the next chapters.

In §5.4, after line 166: "There is also an `Exit` method for each mode (`autonomousExit()`, `teleopExit()`, and so on). WPILib calls it once when that mode ends. This book doesn't use them, but you'll see them in other teams' code." In the Reflect, add: "(A comment is a line starting with `//`. Java ignores it.)"

**Source:** [IterativeRobotBase Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/IterativeRobotBase.html) (`autonomousExit`, `teleopExit`, `disabledExit`, `testExit`)

---

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | §5.6 "replace its contents" silently throws away the Ch 4 Build (LED, live values) and the template's chooser and drivetrain use | |
| 2 | **BLOCKER** (VERIFY: MAJOR) | Deploy, RioLog, "since the robot was powered on", and "green for Joysticks": the XRP runs through Simulate Robot Code, with the Robot State panel | B3. Raised to match Phase A's B3: as written, Step 3 never runs the skeleton, so Step 4's lifecycle check can't work |
| 3 | MINOR | Build step 2: `LastInitTime` called a "string" but holds a `double` (`putString` won't compile) | |
| 4 | MINOR | Build step 3: a `disabledPeriodic()` print contradicts Ch 4's "no prints every loop" | |
| 5 | MINOR | §5.2 listing is a trimmed template, not what the 2026 XRP template shows | |
| 6 | MINOR | "We talked briefly about classes in Chapter 4" overstates Ch 4 | |
| 7 | MINOR | Simulation listed as a fifth mode; `simulationPeriodic()` runs in addition to the current mode | |
| 8 | MINOR | "formally in Chapter 7": inheritance part two is Ch 19 [verify Ch 7 text] | |
| 9 | MINOR | "create a fresh one" loses the Ch 3 Git history; clone from GitHub instead | |

---

## Verdict

The chapter's teaching design is good. It reads the template aloud, gives the "once vs every loop" rule with two realistic bugs, explains `@Override` by the typo it catches, and the Hollywood Principle callout is a good one for teenagers. It's short (412 lines) and right for its load. The weak spots are a false safety claim (M1), the B3 run step that blocks the lifecycle experiment, and a Build step that wipes the previous chapter without saying so. Top three changes for Phase C:

1. Replace deploy, RioLog and the Driver Station steps with Simulate Robot Code and the Robot State panel (B3, VERIFY 2), so the Step 4 lifecycle check actually works.
2. Rewrite the §5.7 safety paragraph: exceptions stop the program, they aren't caught for you (M1).
3. Say what §5.6 Step 2 removes and why, or keep the Ch 4 LED and live values in the skeleton (VERIFY 1). Then fix Build steps 2 and 3 (`putNumber`, no print).
