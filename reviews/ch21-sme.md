<!-- counts: blocker=0 major=1 minor=13 build=pass -->

# Chapter 21 SME Review (Phase B, lightweight)

**Chapter:** `src/section-4-command-based/21-state-machines.md` at HEAD (1,400 lines)
**Inputs:** `robot-programming-book-exercises/ch21-state-machines/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md` (D4, D4a)
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This is one of the best-taught chapters in Section IV. It opens with a problem that plain `if`s cannot solve (white, white means three different things), names the idea, draws the diagram before any code, and checks every box for a missing arrow. The code habits are exactly what strong teams use: an enum for states, switch expressions with no `default` so the compiler finds every place a new state needs a decision, decide-then-act kept apart, one `changeState()` door for logging and entry actions, and finished states that say *how* the machine ended. The "a sequence is a state machine with no choices" table ties Ch 12, Ch 20 and this chapter together, and the inside-a-command versus built-from-commands table gives students a real rule for choosing. The Collab, where Git merges cleanly and the compiler catches the missing case, is the right payoff for Ch 20's double-bound button. Load is reasonable for two Java concepts.

**Prose claims checked** (VERIFY.md checked the code and API):
- "The XRP's own introductory robotics course teaches line following exactly this way" (§21.5, line 382, link at line 1396; VERIFY marked it [verify]). Confirmed: the page exists and uses `error = reflectance.get_left() - reflectance.get_right()` with proportional steering. Its code is **Python** and Blockly, not Java (see m2). Source: [Following the Line: Proportional Control with Both Sensors](https://introtoroboticspbl.readthedocs.io/en/latest/course/line_following/proportional_control_with_two_sensors.html).
- "with the Java version WPILib uses, writing the full name in a `case` is an error" (§21.3, line 190). Confirmed for Java 17 (WPILib 2026's JDK); qualified enum labels are allowed from Java 21 (JEP 441), so the "with the Java version WPILib uses" qualifier is exactly right. Source: [JEP 441](https://openjdk.org/jeps/441).
- `getInterruptionBehavior()` returning `kCancelSelf` or `kCancelIncoming` (line 258), `onlyIf` ending at once when false, `either` requiring both branches' subsystems and asking its condition in `initialize()` (lines 763 to 790). Confirmed by VERIFY.md's source checks and the [Command Compositions](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html) page.

---

## New findings (Phase B)

### m1: "easy to test" oversells `decideNextState()` as written

**Where:** §21.6 "`decideNextState()`", line 697 ("it does not drive, log, or change any field. It only answers a question. That makes it easy to reason about, and, in Chapter 22, easy to test") and §21.10, line 1127.

**Problem:** As written, `decideNextState()` reads `sensors.isLeftOnLine()`, `drivetrain.getHeadingDegrees()` and the `state` and `searchStartHeadingDegrees` fields. Testing it needs a real `Sensors` (XRP analog inputs, which can be created once per test run) and a `Drivetrain`. Ch 22 has to rewrite it as a static method that takes every fact as a parameter before it can be tested. A student who takes "easy to test" literally will try in Ch 22 and hit the hardware wall. The good lesson (no side effects) is right; it is only half of what makes a method testable.

**Fix:** "...It only answers a question. That makes it easy to reason about. It is not quite easy to **test** yet, because it still reads the sensors and the gyro itself; Chapter 22 hands it those readings as parameters, and then a test can ask it anything."

### m2: The XRP course link is Python, and the chapter does not say so

**Where:** §21.5, line 382, and Additional Resources, line 1396.

**Problem:** A zero-experience reader who follows the link finds `reflectance.get_left()` in Python and Blockly, and may think they have the wrong page or the wrong language. One clause prevents that, and turns it into a useful comparison.

**Fix:** Line 382: "The XRP's own introductory robotics course teaches line following exactly this way, in Python (it is linked in this chapter's resources; the idea is the same in any language)." Resources line: add "(Python and Blockly; compare its `error` line with `getSteeringError()`)".

### m3: `Line State` keeps showing the last running state after the command ends

**Where:** §21.6 `FollowLine` listing, `execute()` line 552 publishes `Line State`; `end()` (lines 562 to 566) does not.

**Problem:** When the driver lets go of the bumper mid-follow, `Line State` stays `FOLLOWING` on the dashboard forever, even though nothing is following. The chapter tells students the widget is how they tell decide bugs from act bugs (line 672), and Ch 19 made the same point about cleaning up widgets in `end()` (`DriveWithSticks` clears `Blocked`). A stale state widget is the classic way a pit crew misreads a robot.

**Fix:** In `end()`, after `drivetrain.stop();`:
```java
SmartDashboard.putString("Line State", state.name() + (interrupted ? " (interrupted)" : ""));
```
and one sentence in the `isFinished()`/`end()` walk-through: "`end()` also updates `Line State` one last time, so the dashboard never shows a follower that is not running."

---

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | javac 17 says `enum types may not be instantiated`, not "enum classes" | |
| 2 | MINOR | Missing semicolon after the last constant: the real message is `',', '}', or ';' expected` | |
| 3 | MINOR | Diagnose row: without `.and(teleop)` the bumper works in every mode; only `test` or a missing binding does nothing | |
| 4 | MINOR | On the simulated Explorer leg 2 changes (sensors now ahead of center), so "first four steps should not have changed" is wrong there | |
| 5 | MINOR | `END_POSE` marks the end of the tape; the robot's center stops a few centimeters short | |
| 6 | MINOR [verify on hardware] | A line that ends mid-correction reads as lost, so the follower searches and gives up; common on the sharp simulated floor | |
| 7 | MAJOR | Practice 5: paper over a straight leg 3 gives `END_OF_LINE`, and removing only the leg 3 tape still runs the follower on the crossbar, so neither instruction does what it says | |
| 8 | MINOR | Practice 5 (c): a skipped follower's `getState()` returns the last run's state, so `select` can report success falsely | |
| 9 | MINOR | Build step 4 builds before the `FollowLine` import is added | |
| 10 | MINOR | Chatter callout: one sensor on the edge still chatters, and a naive debounce erases `lastSteeringError` | |
| 11 | MINOR [verify on hardware] | Check 1's "around 0.4 to 0.7" can sit below `LINE_THRESHOLD` (0.45), starting the follower in `GAVE_UP` | |

Not counted (Phase A): the Simulation GUI **NetworkTables > SmartDashboard** check at line 1034 moves to Elastic (D4), and "Watch the **Field** view" for the simulated course (line 1103, Build step 8) moves to AdvantageScope's 2D Field (D4a).

---

## Verdict

Technically correct and pedagogically strong; the state machine habits it teaches are the ones competition teams use. The one MAJOR is an exercise whose setup instructions do not produce the situation it asks about (VERIFY 7), and VERIFY 8 is its sibling, so Phase C should rewrite Practice 5 as a whole. The new findings are small: do not promise testability before Ch 22 delivers it, say the linked course is Python, and clean up the state widget in `end()`. Top three changes for Phase C:

1. Rewrite Practice 5's setup (VERIFY 7 and 8): use the corner-plus-paper trick from check 7 for a give-up, remove the crossbar and the leg 3 tape for the skip, and restart the program (or ask why the second run lies).
2. Fix the floor-reading guidance so the follower actually starts (VERIFY 11) and soften the chatter callout (VERIFY 10), since both strand a student on the real XRP with no obvious cause.
3. Apply m1 and m3 together in §21.6: one sentence on what Ch 22 changes to make `decideNextState()` testable, and the `Line State` update in `end()`.
