<!-- counts: blocker=0 major=2 minor=10 build=pass -->

# Chapter 23 SME Review (Phase B, lightweight)

**Chapter:** `src/section-4-command-based/23-smartdashboard-shuffleboard-and-live-tuning.md` at HEAD (1,288 lines)
**Inputs:** `robot-programming-book-exercises/ch23-smartdashboard-shuffleboard-and-live-tuning/VERIFY.md` and `answer-key.md`, `robot-programming-book-exercises/ELASTIC-EVALUATION.md` (source reading and the hands-on check), `reviews/00-book-wide.md` (D4, D4a, M2, m2)
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

The technical core of this chapter is excellent and matches how strong 2026 teams tune. It explains NetworkTables as a server with clients before asking students to send values back, it names the four traps of `SmartDashboard.getNumber` tuning (all four are real; the overwrite trap was reproduced in Elastic 2026.1.1), and it builds a `TunableNumber` on AdvantageKit's `LoggedNetworkNumber` under `/Tuning`, with a single off switch. That is the same design as Team 6328's `LoggedTunableNumber`. The decision of *when* a gain takes effect (PID gains at command start, the memoryless follower every loop) is the kind of reasoning most FRC code never writes down. The `LoggedDashboardChooser` with a `null` fallback, "Sit Still" as `holdStill()` instead of `Commands.none()`, and "copy the winners into the constants, then let the tests check them" are all correct habits. The Java (generics read, not written; `static final` references to changeable objects and the naming rule) is well chosen for the code on screen.

What needs the most work is the framing, not the code. Under **D4** the chapter no longer retires a dashboard, and under **D4a** Elastic is not the XRP's field map. Both decisions land hardest here. The list under "Applying D4 and D4a" below gathers every place, so Phase C can do the rewrite in one pass.

**Prose claims checked** (VERIFY.md checked the code, the API, the javac messages and the Elastic menu strings):
- WPILib's dashboard overview quotes (line 101): "do not have a person to maintain them so are not receiving bug fixes or improvements" and "deprecated and will be removed for the 2027 season" are on the page as quoted. Note: that page does **not** itself call Elastic "recommended". The recommendation ("Use Elastic as a driver dashboard and use AdvantageScope for debugging and data visualization") is on the 2027 **Removed features** page, which line 103 quotes correctly. The table at lines 132 to 133 ("WPILib's recommended driver dashboard") should cite that page. Source: [Dashboard intro](https://docs.wpilib.org/en/stable/docs/software/dashboards/dashboard-intro.html), [Removed features](https://docs.wpilib.org/en/latest/docs/yearly-overview/removed-features.html).
- "anything your code reads from NetworkTables has to be treated as input data" (line 333): right. AdvantageKit says data from NetworkTables "must be isolated and treated as input data". Source: [Dashboard Inputs](https://docs.advantagekit.org/data-flow/recording-inputs/dashboard-inputs).
- "recommends putting tunable values in a table named `/Tuning`, which AdvantageScope's tuning mode knows how to edit" (line 500), and the tuning-mode callout (line 1077) and Practice 7: right. AdvantageKit says "Tunable values must be published to the "/Tuning" table", and AdvantageScope's tuning mode is the slider icon next to the search bar, purple when on, with the NetworkTables 4 (AdvantageKit) source. Source: [AdvantageScope tuning mode](https://docs.advantagescope.org/overview/live-sources/tuning-mode).
- The Explore's "two more logged classes" are `LoggedNetworkString` and `LoggedNetworkBoolean` (the page lists them with `LoggedNetworkNumber`).
- Elastic's Add Widget has a top-level **Tuning** folder, not one under SmartDashboard (line 945): **already correct**, matching the hands-on check. Phase C should keep it.

## New findings (Phase B)

### M1: The Driver tab puts the course map in Elastic's Field widget, which D4a ruled out

**Where:** §23.4 Step 2, lines 173 and 176 (drag `Field`; "`Field` becomes a **Field** that draws your `Field2d`, robot icon and course poses included"); the callout at line 186 ("where does it think it is"); the dashboards table, lines 131 and 133 (Simulation GUI "Field2d"; AdvantageScope "Chapter 17, and all of Chapter 24"); "What you built", line 1081 ("the mode, the field, and the robot's status").

**Problem:** D4a moved the XRP's field map to AdvantageScope's 2D Field, because Elastic 2026.1.1's Field widget offers only the nine built-in FRC fields, with no custom size and a zoom limit of about 2x. In the hands-on check the 1 m course was about 55 px tall, and the course poses overlapped (ELASTIC-EVALUATION.md, item 3). So the chapter's flagship "Driver tab" has a widget that shows a speck in the corner of a 16.5 m field. A student who follows Step 2 will either think something is broken or learn to put a useless widget on the drive team's screen. That is the opposite of the callout's own rule ("Big, few, and readable from a step back"). The M2 table row for Ch 23 lists §23.3 and §23.4 but not this widget. And after D4a, the table's AdvantageScope row is wrong too: students have used it for the map since Ch 14.

**Fix:**
- Step 2 list: drop `Field`. In its place: "`Pose X (m)`, `Pose Y (m)` and `Pose Heading (deg)`, as **Text Display**s: on a field this small, three numbers say more than a map."
- Line 176: delete the `Field` clause, and add: "The course map stays in AdvantageScope's 2D Field (Chapter 14). Elastic's **Field** widget draws only full-size FRC fields, so on the Explorer's 1 m course it would be a speck. It becomes the right widget on the Mini Swerve, in Chapter 26."
- Line 186: "which autonomous is selected, is the robot in the right mode, is it blocked, and is it where it should be."
- Table: Simulation GUI row, "In this book: the controller setup (Chapter 8) and the Robot State and DIO panels"; AdvantageScope row, "the XRP field map (from Chapter 14), Chapter 17, and all of Chapter 24".
- Line 1081: "the mode, the robot's pose, and its status".

**Source:** `reviews/00-book-wide.md` D4a; `robot-programming-book-exercises/ELASTIC-EVALUATION.md` items 3 and "What this means for D4", point 2

### m1: Step responses are read on Elastic's single-topic Graph, where AdvantageScope's Line Graph fits better

**Where:** §23.9 Step 8, lines 951 to 953 (`Heading (deg)`, `Distance Error (m)`, `Line Error` as Elastic **Graph**s); "Reading a step response", line 977; §23.10 Sessions 1 to 3, lines 981 to 999.

**Problem:** The callout asks students to read rise time, overshoot and settling time. An Elastic Graph holds one topic (no setpoint line to compare against), shows the last 5 s by default, and has no cursor to read a value off a past moment (ELASTIC-EVALUATION.md, item 5). For the turn, "did it go past 90?" means judging a peak against an unmarked line. M2 already moved Ch 15's setpoint-and-measurement plot to AdvantageScope's Line Graph for this reason. This chapter then teaches the opposite, and only offers AdvantageScope in an optional Practice. Elastic remains right for *editing* the numbers, and Session 3's live wave is fine on an Elastic Graph.

**Fix:** In Step 8, keep the three Elastic Graphs as quick looks, and add: "To read a step response properly, use AdvantageScope too (File > Connect to Simulator > NetworkTables 4 (AdvantageKit)): a Line Graph of `Drivetrain` > `HeadingDegrees` lets you hover over the peak and read the overshoot to a tenth of a degree." In Session 1 step 2: "Watch the graph (in AdvantageScope, hover over the peak): ...". Lift Practice 7's tuning-mode paragraph into §23.11's callout as the recommended way for programmers, since AdvantageScope is WPILib's tool "for debugging and data visualization".

**Source:** [AdvantageScope Line Graph](https://docs.advantagescope.org/tab-reference/line-graph); ELASTIC-EVALUATION.md item 5; book-wide M2, Ch 15 row

### m2: The overwrite trap snaps back at once; it does not flicker

**Where:** §23.7 Trap 1, line 483 ("The number on the screen flickers back").

**Problem:** The hands-on check in Elastic 2026.1.1 (ELASTIC-EVALUATION.md, item 6) found that the typed value reads the old number again **the instant Enter is pressed**, and stays there. That settles VERIFY.md's open [verify] on this point. "Flickers" tells the student to look for a brief change, and some will press Enter, see nothing move, and decide their typing did not register. The Diagnose row at line 1047 already says "snaps back", so the chapter disagrees with itself.

**Fix:** "Now you type `2.5` into the dashboard and press Enter, and the box shows `3.0` again at once: your own code published over it in the very next loop. Whatever you type, the robot never sees it."

**Source:** ELASTIC-EVALUATION.md, hands-on item 6

### m3: Nothing on the Driver tab shows that tuning mode is on

**Where:** §23.9 Step 1, lines 632 to 633 (`TUNING_MODE = true`); §23.11 "Turn tuning off", lines 1065 to 1067; Build, line 1177 ("Leave `TUNING_MODE` set to `true` for now").

**Problem:** The book relies on a person remembering to flip one constant before an event (Ch 25 and Ch 39). That is Trap 4 ("no off switch") moved, not removed: the switch exists, but nothing tells the drive team it is still on. Strong teams make tuning mode impossible to miss. For example, 6328's code raises an alert at startup when tuning is enabled. The Explorer has the tools already: a `SmartDashboard` boolean on the locked Driver tab costs one line, and Ch 26 introduces `Alert`. It is also a nice test of the "Driver tab answers the drive team's questions" rule from line 186.

**Fix:** In Step 1, add after the constant: "and in `RobotContainer`'s constructor, `SmartDashboard.putBoolean("Tuning Mode", Constants.TUNING_MODE);`. Put it on the **Driver** tab as a Boolean Box: if it is lit at a competition, someone forgot a step." In §23.11 "Turn tuning off": "The `Tuning Mode` box on the Driver tab goes dark. Check it in the queue, next to the chooser." (Ch 26 can turn it into an `Alert`.)

**Source:** [Team 6328 robot code](https://github.com/Mechanical-Advantage) (search `tuningMode`) [verify the current file]; book §23.4 callout

### m4: The "start at the new values" check depends on Elastic not resending old ones

**Where:** §23.10 "Make it permanent", step 3, line 1031 ("Run the Explorer again, and check the Tuning tab: every number should now start at your new value"); Build step 8, line 1175; the Diagnose row, line 1048.

**Problem:** `LoggedNetworkNumber`'s constructor publishes `entry.get(defaultValue)`: if the topic already holds a value, that value wins over the code's default (VERIFY.md, API checks). The Diagnose row admits that a dashboard "can keep the last value it was given and send it again when it reconnects" [verify in Elastic]. If that happens, the restarted robot quietly **uses** the old typed gain, not the committed one, and the log records it as an input. A student whose numbers "did not change" is the lucky case. A student who does not check is now tuning on top of a value that is in no file. The guard belongs in the step, not only in the Diagnose table.

**Fix:** Step 3: "Close Elastic, run the Explorer again, then reopen Elastic and check the Tuning tab: every number should now start at your new value. (Closing Elastic first makes sure it cannot hand the robot an old number you typed.)" Same words in Build step 8. Phase C should check on the real app whether Elastic republishes after a robot restart, and drop the parenthesis if it does not.

**Source:** VERIFY.md "API checks" (`LoggedNetworkNumber.setDefault`) and "Not verifiable here"

## Applying D4 and D4a to Chapter 23 (Phase A refs, not counted)

Consolidated for Phase C. Items 1 to 4 come from M2 and m2; item 5 is new above (M1); item 6 is the VERIFY 5 rename, now confirmed hands-on.

1. **Title and framing (m2, D4):** rename to "Live Tuning and the Autonomous Chooser" (heading line 1, `SUMMARY.md`, the next-chapter teasers in Ch 22 line 1549). Rewrite intro line 9 and drop the callout at lines 137 to 139.
2. **§23.3 (M2):** shrink to "Why this book uses Elastic". Keep the 2026 deprecation facts and the 2027 removed-features quote (line 103). Keep the `SmartDashboard` class point (line 109), but drop "the window you open with **WPILib: Start Tool** > **SmartDashboard**". Table row line 129 becomes "Not used". Line 132 becomes "Since Chapter 2". Keep the Shuffleboard recognition snippet (lines 113 to 121); it is useful for reading other teams' code.
3. **§23.4 (M2):** Step 1 (first launch, IP Address Mode localhost) moves to Ch 2. Step 2's `Mode`, `Heading (deg)` and `Scheduler` are already on the student's dashboard from Ch 4, 9 and 18, so Step 2 becomes "rearrange your dashboard onto two tabs". Line 190's **File > Save** is a Ch 9 habit by then. What stays new: tabs, **Edit > Lock Layout**, and saving to `src/main/deploy/elastic-layout.json`.
4. **§23.1 line 29 and §23.2 line 87 (D4):** Ch 15's live PID tuning happened in Elastic's **PIDController** widget, not the Simulation GUI. Line 61: "Elastic, the dashboard you have used since Chapter 2, is a client."
5. **Field map (D4a):** M1 above.
6. **Menu names (M2, VERIFY 5):** **File > Export Layout** becomes **File > Save As** (lines 192, 455, 956, 1169, 1170, 1173, 1245, 1246, 1258). **File > Load Layout From Robot** becomes **File > Download From Robot** (lines 1156, 1160). Confirmed in the running app: File has only Open Layout, Save, Save As and Download From Robot.

Already right and to be kept: the Tuning folder at the top level of Add Widget (line 945); **ComboBox Chooser** (line 449); **Text Display** and **Boolean Box** (line 176); **Edit > Lock Layout** (line 198); IP Address Mode **localhost** (the app's label is "localhost (127.0.0.1)"); the Simulation GUI's NetworkTables window as a *programmer's* view of the server (lines 81, 958, 1106, 1173), which D4 allows.

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | Without the `null` check the course test fails with `the course never finished ==> expected: <false> but was: <true>` after the full 40 s, not `expected: <0.5> but was: <0.0>` | |
| 2 | MINOR | §23.5 calls `autoChooser.get()` on a `SendableChooser`; with that type javac says `cannot find symbol`, so use `getSelected()` | |
| 3 | MINOR | Simulate Robot Code does not run the tests (only Build, Test and Deploy do) | |
| 4 | MINOR | "fourteen tests call `decideNextState()`": eleven tests, fourteen calls | |
| 5 | MINOR | Elastic menu names: Export Layout and Load Layout From Robot do not exist (Save As, Download From Robot) | M2 (confirmed hands-on, ELASTIC-EVALUATION item 1) |
| 6 | MINOR | `Line State`, `Blocked`, `Distance Error (m)`, `Line Error` appear only after their command has run once | |
| 7 | MINOR | Git step: `git status` lists only step 8's changes; the layout and `TunableNumber` were committed earlier | |

VERIFY's "Not verifiable" note on Trap 1 is now settled by the hands-on Elastic check (m2 above): the value snaps back.

## Verdict

The tuning design is the best-practice core of the XRP half of the book, and it should survive Phase C nearly unchanged: `TunableNumber` on `LoggedNetworkNumber` under `/Tuning`, gains applied at command start, the off switch, and constants as the record. The chapter's problems are almost all about which app does what, and D4 and D4a decide them. Once Elastic is the dashboard from Ch 2, this chapter shrinks by roughly §23.3 and half of §23.4, and is better for it: the reader's attention goes to tuning, not tools. The one major found in this pass is a direct consequence of D4a: the Driver tab must not carry Elastic's Field widget. Top three changes for Phase C:

1. **D4, D4a and M1:** do the consolidated rewrite above in one pass. Rename the chapter, cut §23.3 to a short note, reduce §23.4 to tabs, Lock Layout and Save As, drop the Field widget from the Driver tab, and fix the menu names.
2. **VERIFY 1:** correct the "delete the `null` check" failure message and its explanation (the LED starts on in simulation, so the test runs its full 40 s).
3. **m1 with m4:** make AdvantageScope the place to read a step response, and make "close Elastic, restart, check" part of the step that copies tuned values into the code. Those are the two places a student can learn a wrong number.
