<!-- counts: blocker=2 major=5 minor=11 build=pass -->

# Chapter 6 SME Review (Phase B, lightweight)

**Chapter:** `src/section-1-foundations/06-conditionals-loops-and-methods.md` at git HEAD (539 lines)
**Inputs:** `PHASE-B-LIGHT.md`, `00-book-wide.md` (D1 to D5, D4a, B1 to B3, M1 to M5), `robot-programming-book-exercises/ch06-conditionals-loops-and-methods/VERIFY.md` and `answer-key.md`
**Review date:** 2026-11-01

Not re-reported: the SmartDashboard app (M2, D4), deploy (B3), and everything in VERIFY.md (missing fields, `getDistance()`, inversion, stick sign, the "command-based" blocking-loop claim, and so on).

---

## New findings (Phase B)

### M1: The only loops the chapter teaches are ones a robot can't use, and the Build has no loop behavior at all

**Where:** §6.6 (lines 194 to 240: every `while`/`for` example blinks with `Timer.delay`); the callout at line 217 ("you use a counter variable that is checked on each tick. We will see this pattern later in the book"); line 346 (the promised non-blocking version, see VERIFY 7); Exercises, Build, lines 473 to 479. CLAUDE.md's Build entry for Ch 6 says "add conditional and loop driven behavior".

**Problem:** A student leaves Ch 6 knowing one loop pattern, "blink with `Timer.delay`", which the same section forbids in every periodic method. The pattern that strong teams actually use in a 20 ms loop (count or time across loops, and never wait) is named but deferred, and nothing in the Build exercises it. That pattern is the core of Ch 12's "check, do not wait", of Ch 18's commands, and of every state machine in the book. Ch 6 is the natural first taste, and it costs about ten lines. It also fulfils the line 346 promise and gives the Explorer a real behavior: a "disabled heartbeat" LED, which competition robots use to show that code is running.

**Fix:** Add a Build step 4, after the wall stop:

> 4. **A heartbeat light, with no waiting.** Make the LED blink while the robot is disabled, so you can tell at a glance that your code is running. You can't use `blinkLED` here, because `disabledPeriodic()` must finish in 20 ms. Instead, count loops. Add a field next to the others (outside every method, so it remembers its value from one loop to the next):
>
> ```java
> private int loopsSinceToggle = 0;
> ```
>
> Then, in `disabledPeriodic()`:
>
> ```java
> // 25 loops x 20 ms = 0.5 s between flips. No waiting:
> // add one, check, and return right away.
> loopsSinceToggle = loopsSinceToggle + 1;
> if (loopsSinceToggle >= 25) {
>     onBoardIO.setLed(!onBoardIO.getLed());
>     loopsSinceToggle = 0;
> }
> ```
>
> The 50 Hz loop *is* your loop. Each call does one small step and leaves. You'll use this "check every loop, never wait" idea for the rest of the book.

Add a Reflect question: "Why does `loopsSinceToggle` have to be declared outside `disabledPeriodic()`? What would happen if you declared it inside?" (It would start at 0 on every call and never reach 25. This builds on Ch 4 M1 and previews Ch 15.) Change the line 217 callout's last sentence to "You'll write this pattern in the Build exercise at the end of this chapter." The `onBoardIO` field comes from the VERIFY 1 hardware listing.

**Source:** [WPILib: Creating a robot program, TimedRobot](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html) (periodic methods every 20 ms; overruns)

---

### m1: `speed != 0.0` on a `double`, three chapters before the "never `==` on doubles" rule

**Where:** §6.8, line 403 (`} else if (speed != 0.0) {`).

**Problem:** It works here, because `applyDeadband` returns exactly `0.0`. But Ch 12 teaches "never `==` on measured values", and a careful student who rereads Ch 6 will think the book broke its own rule, or will copy `!= 0.0` onto a raw sensor value. One sentence now makes the later rule feel familiar, which is how the book's sprinkles are meant to work.

**Fix:** After the read-aloud paragraph (line 434), add:

> Comparing a `double` with `!=` is safe here only because `applyDeadband` hands back exactly `0.0`. A measured value, like a distance, is almost never *exactly* anything, so you'll compare those with `<` and `>`. Chapter 12 explains why.

---

### m2: Code in `teleopPeriodic()` with no reminder to enable Teleop, and no recovery path

**Where:** §6.2, lines 59 to 72 ("try this in `teleopPeriodic()`", "Deploy this and slowly push the XRP toward a wall"); Practice 1, line 463.

**Problem:** Ch 5 taught that `teleopPeriodic()` runs only while Teleop is enabled, but §6.2 doesn't say to enable it. A student who runs the program and pushes the XRP sees no `Status` widget at all, and nothing in the chapter tells them why. That's the commonest "my code does nothing" question at this stage.

**Fix:** In §6.2, after the run step on line 72 (which VERIFY 11 changes from "Deploy this"): "Then select **Teleoperated** and click **Enable** (Chapter 5). `teleopPeriodic()` only runs while Teleop is enabled, so if the `Status` widget never appears, that's the first thing to check." Add the same parenthetical to Practice 1.

---

### m3: The wall-stop test needs a safety habit

**Where:** Exercises, Build, line 479 ("drive the XRP toward a wall and confirm it stops on its own").

**Problem:** This is the first time the reader's own code decides whether the robot stops. The habit strong teams drill is "the first run of new stopping code is slow, with a hand on Disable". The XRP is small, but the habit is what matters, and Ch 26 assumes it (Space to e-stop, Enter to disable). Rangefinders also miss walls that are angled, soft, or very close [verify the XRP rangefinder's minimum range], so "confirm it stops" should not mean "trust it".

**Fix:** Add before line 479:

> **Test new stopping code slowly.** Keep one hand ready to disable (Enter on the Driver Station, or the Disable button). Push the stick only part way the first few times. A rangefinder can miss a wall that's angled or soft, so your code is a helper, not a guarantee. You'll use the same habit on the big robot in Chapter 26.

---

### m4: "The watchdog will start barking" gives a beginner nothing to recognize

**Where:** §6.6 callout, line 215.

**Problem:** It's vivid, but a student who hits it sees a specific console message, not a dog. The book's recovery path is to name the message so they can match it. That message is also the one they'll meet again in Ch 18 (loop overrun).

**Fix:** "The console fills with warnings like `Loop time of 0.02s overrun`, followed by a list of which methods took too long. When you see that message, look for a slow or waiting line in a Periodic method."

**Source:** [IterativeRobotBase Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/IterativeRobotBase.html) and its source, `printLoopOverrunMessage` [verify the exact text in 2026.2.1]

---

### m5: The §6.8 callout dates command-based to Chapter 19

**Where:** §6.8 callout, line 440 ("By Chapter 19, when you learn the command-based framework").

**Problem:** Command-based starts in Ch 18 ("Why Command-Based?"), and Ch 18 is where the "commands name a piece of behavior" idea is introduced. (The §6.6 callout's Chapter 19 mention is covered by VERIFY 6.)

**Fix:** "In Chapter 18, when you meet the command-based framework, ..."

---

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | BLOCKER | §6.8 and the Build use `controller`, `rangefinder`, `leftMotor`, `rightMotor` (and the Practice `onBoardIO`), which are never declared: `cannot find symbol` | |
| 2 | MAJOR | `rangefinder.getDistance()` doesn't exist; use `getDistanceMeters()` with thresholds in meters | |
| 3 | MAJOR | No `rightMotor.setInverted(true)`, so `driveForward` spins the XRP in place | |
| 4 | MAJOR | `controller.getLeftY()` is negative for forward; the Build drives away from the wall | |
| 5 | MINOR | Once the wall is close, the robot can't back away (`isWallClose() && speed > 0.0`) | |
| 6 | MAJOR | §6.6 callout says blocking loops belong "in command-based code" | |
| 7 | MINOR | Promised non-blocking blink never appears; "The LED blinks at a fixed rate" is untrue | Fixed by this review's M1 |
| 8 | MINOR | Practice/Git/Reflect disagree on which project gets the commit and `reflections.md` | |
| 9 | MINOR | `!=` table example compares strings, against the callout below it | |
| 10 | MINOR | `getRightTrigger()` doesn't exist; `getLeftBumper()` deprecated for removal | |
| 11 | **BLOCKER** (VERIFY: MAJOR) | "Deploy this" / "Deploy": the XRP runs through Simulate Robot Code | B3. Raised to match Phase A's B3: the wall-stop check can't happen if the code never runs |
| 12 | MINOR | "WPILib Java basics" links to the units library page | |

---

## Verdict

The conceptual teaching is good. The `==` trap, ordering `else if` from most to least specific, short-circuit evaluation, the copy-paste deadband bug as a Reflect, and "methods read like sentences" are all what a mentor would teach, and the load (four concepts in 539 lines) matches the plan. But the code doesn't stand up: the Build uses hardware that never gets created (VERIFY 1), a method that doesn't exist (VERIFY 2), and motors and a stick that make it spin or drive backward (VERIFY 3 and 4). And the chapter teaches loops only in the blocking form it then forbids (M1). Top three changes for Phase C:

1. Add the "Add the hardware" listing before §6.8 (fields, imports, `setInverted(true)`, the `onBoardIO` field), and correct `getDistanceMeters()`, the stick sign and the controller method names (VERIFY 1 to 4 and 10).
2. Add the non-blocking heartbeat LED as Build step 4 and correct the §6.6 callout, so that "check every loop, never wait" is the loop lesson students carry forward (M1, VERIFY 6 and 7).
3. Replace "Deploy" with Simulate Robot Code (B3, VERIFY 11). Add the Enable Teleop reminder and the slow-test safety habit to the wall-stop test (m2, m3).
