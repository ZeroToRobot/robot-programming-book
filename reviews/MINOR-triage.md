# MINOR Findings: Triage (Phase C, part 2)

**Date:** 2026-11-02. Every MINOR item in `00-book-wide.md` and `ch01-sme.md` to `ch28-sme.md` (VERIFY table rows included) was checked against the current text, after the Phase C commits and the renumbering.

**IDs** use the review file's **old** number (`ch17-m1` is `### m1` in `ch17-sme.md`; `ch17-v4` is row 4 of its VERIFY table; `bw-m3` is book-wide). **Headings, fixes and file names** use the **new** chapter numbers. Line numbers are as of 2026-11-02 and will drift as fixes land.

**Totals:** 289 rows. FIX 246, DONE 27 (already fixed by Phase C), VERIFY-WEB 8, HARDWARE 5, SKIP 3. Almost every FIX is a one-line edit (S); about 25 are a paragraph or a code change (M).

## Missed MAJORs (do first)

| ID | Ch | Problem | Fix |
|---|---|---|---|
| ch02-M1 | 2 | The Git exercise runs `git init` and commits before Ch 3 installs and configures Git (fails with "'git' is not recognized" or "Author identity unknown") | Replace it with "Nothing to do yet"; Ch 3 Section 3.6 starts with `git init` and the first commit, and drops the "If you followed Chapter 2's Git exercise" paragraph and `git branch -M main` |
| ch23-v1 | 24 | DONE (batch 1) | The real failure is `the course never finished ==> expected: <false> but was: <true>`, after the full 40 s |

## High priority among the MINORs

- **ch17-m1 (Ch 18 Practice 1):** with `testingAtMyDesk = false` the practice makes a second rangefinder on the channel `Sensors` already owns, so it almost certainly stops at startup with `AllocationException`. Probe it, then rewrite the practice so it does not allocate the channel twice.
- **Ch 3, new in Phase C:** the push-rejected callout (line 378) says Section 3.8 "shows you what one looks like", but 3.8 only describes a conflict. Fix the sentence, or do ch03-m1 (a short practice conflict).
- **Ch 6 safety (ch06-m2, ch06-m3):** Ch 6 is the first chapter where motors move, before Ch 7's "stop before you start". Add a short stop/enable note. Line 72 still says "SmartDashboard".
- **Renumbering leftovers:** Ch 6 line 473 ("By Chapter 20" is now 19); Ch 9 (gear ratios are Ch 29, pose estimation Ch 31, vision Ch 34); Ch 16 line 1313 ("Chapters 19 to 21" should be Ch 20); Ch 15 line 1185 should point at Ch 33 for onboard PID; Ch 14 Practice 4 "Field window".
- **Known wrong error texts:** ch21-v1 (Ch 22 "enum types may not be instantiated"); ch25-v4 (Ch 26 "more than 100 ms, five whole loops").

## Needs planning (touches a stub chapter)

- ch28-m1: `ChassisSpeeds.discretize` is not promised anywhere for Ch 30. Record it in CLAUDE.md's Ch 30 plan rather than in `src/`.
- ch27-m1: no chapter uses `setUpdateFrequency` / `optimizeBusUtilization`. The Ch 28 sentence should name no chapter (or Ch 38 gets it in its plan).
- ch14-m3: the drift-per-meter promise belongs in CLAUDE.md's Ch 31 plan.

## VERIFY-WEB (8) and HARDWARE (5)

VERIFY-WEB: bw-m4 (docs.wpilib.org per-year paths), ch10-m4 (debugger on an XRP run), ch11-m4 (Student Pack GitHub Pro and branch protection), ch11-v6 (CONTRIBUTING link on the default branch only), ch16-m3 (SysId "Diagnostic Plots" and "Direction" labels), ch26-m1 (field behavior after a mid-match code restart), ch26-m2 (who installs Java on the roboRIO), ch26-m5 (two `TalonFX` objects with one CAN ID).

HARDWARE: ch15-v4 (leg 1 ends a few mm short of `X: 0.50`), ch17-v5 (simulated sensors answer a loop sooner), ch18-v3 (DIO 1 starts on in the Sim GUI), ch21-v6 (line ending mid-correction reads as lost), ch27-m5 (Tuner X card colors and year picker). Also still open from Phase C: the Ch 12 and 13 XRP top speed (Ch 12 sample log times wait on it, ch12-v3).

## Batch 1 (done 2026-11-02)

The two missed MAJORs (ch02-M1: Git moved from Ch 2 into Ch 3 Section 3.6, which now runs `git init` and a first commit, and the Ch 3 claim that WPILib installs Git is gone; ch23-v1) and every high-priority item above: Ch 18 Practice 1 (probed: a second `XRPRangefinder` throws `AllocationException: Code: -1029`; the real branch is now a predict-the-crash step with a warning callout in 18.3), the Ch 3 push-rejected pointer, Ch 6 (enable Teleop, Elastic, a "Test new stopping code slowly" callout, Chapter 19), the pointers in Ch 9, 14 (Practice 4 only; the ghost-pose look is still HARDWARE), 15 and 16, and the Ch 22 and 26 error texts. A scan of every pointer to Ch 17 or later in Ch 1 to 16 found no others.

## Plan

Fix in five batches, one commit per batch in each repo, exercises and solutions updated with the chapter and rebuilt where code changes: (1) the missed MAJORs and high-priority items; (2) Ch 1 to 11; (3) Ch 12 to 18; (4) Ch 19 to 26; (5) Ch 27 to 29. VERIFY-WEB items are checked online inside their batch; HARDWARE items are left for Devang. Mark each row's status in this file as it lands.

---


## Book-wide

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| bw-m1 | `TRACKWIDTH_METERS` vs `TRACK_WIDTH_METERS`; Spark MAX spellings | FIX | M | XRP Ch 13 to 18+ use `TRACKWIDTH_METERS`, only Ch 29 (swerve) uses `TRACK_WIDTH_METERS`: rename Ch 29's 7 uses (and "track width" prose) to `TRACKWIDTH_METERS`/"trackwidth" to match WPILib and the XRP chapters, plus the ch29 solution. Ch 1 prose "Spark MAX" (2x) becomes "SPARK MAX" | `section-6-mini-swerve/29-swerve-kinematics.md`, `ch29-*/solution`, `section-1-foundations/01-*.md` |
| bw-m2 | Ch 23 title names retired apps | DONE | | Now Ch 24 "Live Tuning and the Autonomous Chooser" in heading and `SUMMARY.md` | `src/SUMMARY.md`, `24-*.md` |
| bw-m3 | No alliance-flip preview before swerve chapters | FIX | S | Ch 14 line 108 already mentions the blue-wall origin; add one sentence: red robots flip paths and poses, covered in Ch 30 and Ch 32 (old 29, 31) | `section-3-autonomous-control/14-*.md` |
| bw-m4 | Docs links use `/en/stable/`, will move to 2027 | VERIFY-WEB | S | Check whether docs.wpilib.org keeps a per-year path (e.g. `/en/2025/`) once a season rolls over. If not, add one line under the Ch 2 versions table about using the docs version picker | `section-1-foundations/02-*.md` |
| bw-m5 | CLAUDE.md "Current status" stale | DONE | | CLAUDE.md line 212 now says Ch 1 to 29 written, 30 to 40 stubs | `CLAUDE.md` |

## Ch 1

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch01-m1 | XRP called "WebSockets-based" (that's the Romi) | FIX | S | Line 211: "On the XRP, your Java program runs on your laptop, and WPILib talks to the XRP over Wi-Fi. Your code looks almost identical..." | `01-what-is-frc-programming.md` |
| ch01-m2 | `SparkMax` etc. called WPILib classes | FIX | S | Line 76: each maker ships its own library (REVLib, Phoenix 6); line 98: list `XboxController`, `Timer`, `DifferentialDrive`, then one sentence on vendor libraries (Ch 28) | `01-*.md` |
| ch01-m3 | "Deploy to the XRP" wording | FIX | S | Lines 108, 209, 218, 242, 361 already say "run". Only line 52 left: drop "over Wi-Fi" from the roboRIO deploy sentence (USB/Ethernet usual) | `01-*.md` |
| ch01-m4 | Competition day normalizes last-minute deploys | FIX | S | Line 179: replace "deploying a last-minute fix" with checking the code on the robot is the tested version, plus the small-fix-tested-in-pits rule (Ch 40 checklist, old 39) | `01-*.md` |
| ch01-m5 | "Driver inputs are ignored" in auto | FIX | S | Line 120: "the game rules say drivers can't control the robot, so your program must act entirely on its own". Keeping "15 to 20 s, check the manual" avoids the 2026 [verify] | `01-*.md` |

## Ch 2

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch02-m1 | Shuffleboard callout / line 29 old apps | FIX | S | Callout already replaced (line 417). Line 29 still says "opening tools like SmartDashboard and Shuffleboard": change to "Elastic and AdvantageScope" | `02-setting-up-your-environment.md` |
| ch02-m2 | Firmware download is "latest" | FIX | S | Line 131: link the v2.1.0 release tag; add an "XRP firmware 2.1.0" row to the versions table (line 83); line 533: "use the firmware version in the versions table". Quick check that v2.1.0 is still the 2026 firmware | `02-*.md` |
| ch02-m3 | Enable before learning how to stop | DONE | | Line 369 says click Disabled to stop; the "laptop is the robot's brain" callout explains stopping; Ch 7 has the full "stop before you start" callout before first motion | `02-*.md`, `07-*.md` |
| ch02-v1 | Step 2 omits template's `XRPDrivetrain.java` | FIX | S | Add bullet at line 272: "`XRPDrivetrain.java`: a small example drivetrain the template uses; you replace it in Chapter 7" | `02-*.md` |
| ch02-v2 | Says to add `SmartDashboard` import; template has it | FIX | S | Line 394: "The template already imports `SmartDashboard`; check this line is at the top:" | `02-*.md` |
| ch02-v3 | "Open SmartDashboard" should be Elastic | DONE | | §2.8 "Open Elastic" (lines 402 to 415) | `02-*.md` |

Aside (not a MINOR, outside scope): Ch 2 MAJOR M1 looks unfixed. The Git exercise (lines 512 to 525) still runs `git init` and commits in Ch 2, before Ch 3 installs and configures Git.

## Ch 3

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch03-m1 | Merge-conflict "preview" is only described | FIX | M | Now worse: the new push-rejected callout (line 378) says "Section 3.8 shows you what one looks like", but §3.8 only describes. Add the 2-minute `git-practice` conflict step (branch `other`, edit line 1 both sides, `git merge`, markers, resolve) or reword line 378 | `03-git-and-github.md` |
| ch03-m2 | "GitHub will eventually require" 2FA | FIX | S | Line 130: "GitHub requires it for accounts that contribute code, so set it up when asked. An authenticator app is best." | `03-*.md` |
| ch03-m3 | `println`/`//` used before Ch 4; output never checked | FIX | S | After the §3.6 snippet (line 309): one line on `println` and "run it, see `XRP Explorer starting up.` in the terminal, then commit". Practice 1 (line 519): give `//` comment syntax with an example | `03-*.md` |
| ch03-m4 | README "XRP Serial" field mislabeled | FIX | S | Line 547: "**XRP Wi-Fi name**: <your XRP's network name, for example XRP-1A2B-3C4D>"; same in the solution README | `03-*.md`, `ch03-git-and-github/solution/README.md` |
| ch03-m5 | HTTPS callout's unsupported claims | FIX | S | Lines 145 to 147: "Both are fine. HTTPS needs less setup, so this book uses it. You can switch later." Drop "GitHub recommends" and "most professional developers" | `03-*.md` |
| ch03-v4 | `.gitignore` description wrong | FIX | S | Line 290: entries like `/build/`, `.gradle`, `bin/`, `.DS_Store`; lines starting `!` are kept, like `.vscode/settings.json` (confirmed in template lines 107 to 108, 140) | `03-*.md` |
| ch03-v5 | Says project already has a README | FIX | S | Line 345: "your project already has a `.gitignore` and a license, and you'll write your own README at the end of this chapter" | `03-*.md` |
| ch03-v6 | WPILib VS Code "usually installs" Git | FIX | S | Line 79: "Git may already be on your computer. Let's check." (WPILib installer does not install Git) | `03-*.md` |
| ch03-v7 | PowerShell 5.1: `echo >` writes UTF-16, `&&` fails | FIX | S | Line 559: split into two commands; add a short note near line 155/174 to use Git Bash (or PowerShell 7) as the terminal on Windows for this chapter | `03-*.md`, `ch03-*/assignment.md` if it repeats the `&&` line |

## Ch 4

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch04-m1 | Comments and arithmetic never named | FIX | M | Add a "Comments" paragraph after the first §4.1 listing, and a 4-row `+ - * /` table before "Changing a Variable's Value" (~line 168), with the int-division teaser | `04-your-first-java-program.md` |
| ch04-m2 | Contradictory semicolon-error claims | FIX | S | Line 283: "the error says `';' expected` and points at the end of the line that needs one" | `04-*.md` |
| ch04-m3 | "Updating 50 times per second" on dashboard | FIX | S | Line 446: "Your code sends the values every loop, and the dashboard redraws several times a second. For every single loop, you'll use logs in Chapter 17." Wording is safe without settling the NT flush-rate [verify] | `04-*.md` |
| ch04-m4 | Python/JS called untyped; no units-library pointer | FIX | S | Lines 456/469: "a language that checks types only while the program runs (like Python)"; add a sentence in the line 475 callout pointing to Ch 16's units library | `04-*.md` |
| ch04-v3 | `robotPeriodic()` listing drops Ch 2 `Status` line | FIX | S | After line 420 listing intro: "This replaces the `Status` line from Chapter 2." | `04-*.md` |
| ch04-v4 | `Match Time` key holds uptime, not match clock | FIX | M | Rename key/variable to `Uptime`/`uptimeSeconds` (lines 426 to 430, 444, 529) to match Ch 5's uptime; update assignment, answer key, solution `Robot.java` line 72, and Ch 5 line 295 "Mode widget you added" check | `04-*.md`, `ch04-*/assignment.md`, `answer-key.md`, `solution/.../Robot.java` |
| ch04-v5 | "Blinking the LED" but nothing blinks | FIX | S | §4.6 heading (line 315): "Turning On the LED"; line 5: "turn on a real LED"; Ch 5 line 3 "a blinking LED" too | `04-*.md`, `05-*.md` |
| ch04-v6 | "(you added this in Chapter 2)" import | FIX | S | Line 415: "(the template already imports it)" | `04-*.md` |

## Ch 5

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch05-m1 | "Hardcoded into FRC's network protocol" 50 Hz | FIX | S | Line 36: DS sends packets every 20 ms and `TimedRobot` runs on the same beat by default; teams can change it, this book never does; on the XRP the loop runs on the laptop | `05-how-a-robot-program-is-structured.md` |
| ch05-m2 | "Why not a `main()`?" while `Main.java` exists | FIX | M | After line 321, add the `Main.java` / `RobotBase.startRobot(Robot::new)` paragraph from the review | `05-*.md` |
| ch05-m3 | TimedRobot resource link 404 | FIX | S | Line 405: delete the `convenience-features/timed-robot.html` bullet and fold its description into the line 406 bullet (same target page) | `05-*.md` |
| ch05-m4 | Empty `{}` bodies, Exit methods, comments unexplained | FIX | M | After the skeleton: one paragraph on empty bodies; one sentence in §5.4 on `autonomousExit()` etc.; Reflect (line 358): "(A comment is a line starting with `//`.)" | `05-*.md` |
| ch05-v3 | `LastInitTime` called a string | FIX | S | Chapter line 367 now says "dashboard value"; add "(a number: `putNumber`)". Answer-key line 30 still says the book says "string": drop that note | `05-*.md`, `ch05-*/answer-key.md` |
| ch05-v4 | `disabledPeriodic()` print contradicts Ch 4 | FIX | S | Line 368: publish uptime with `SmartDashboard.putNumber("Uptime", ...)` (assignment step 5 already does) | `05-*.md` |
| ch05-v5 | §5.2 listing is trimmed, not the real template | FIX | S | Line 44: "Here is a trimmed version. The real template also has an auto chooser and a small `XRPDrivetrain`, which you replace in Section 5.6 and Chapter 7." | `05-*.md` |
| ch05-v6 | "talked briefly about classes in Chapter 4" | FIX | S | Line 104: "Chapter 4 mentioned classes in passing" | `05-*.md` |
| ch05-v7 | Simulation listed as a fifth mode | FIX | S | Lines 156, 164, 344: four modes; note that `simulationPeriodic()` runs in addition whenever the program runs in simulation (always, on the XRP) | `05-*.md` |
| ch05-v8 | "formally in Chapter 7" for `extends` | FIX | S | Ch 7 does not teach inheritance; Ch 20 §20.4 "Inheritance, Part Two" does. Line 112: "in Chapter 20" | `05-*.md` |
| ch05-v9 | "create a fresh one" loses Git history | FIX | S | Lines 42 and 229: "If it's not on this laptop, clone it from GitHub (`git clone <your repo URL>`)" | `05-*.md` |

## Ch 6

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch06-m1 | `speed != 0.0` on a double, before the rule | FIX | S | After the read-aloud paragraph (~line 466): safe only because `applyDeadband` returns exactly `0.0`; measured values use `<`/`>`, Chapter 12 explains | `06-conditionals-loops-and-methods.md` |
| ch06-m2 | No reminder to enable Teleop | DONE (batch 1) | S | After line 72: "Then click **Teleoperated** in the Robot State panel; `teleopPeriodic()` only runs while Teleop is enabled." Same parenthetical in Practice 1. Also line 72 still says "watching SmartDashboard": make it Elastic | `06-*.md` |
| ch06-m3 | Wall-stop test needs a safety habit | DONE (batch 1) | S | Ch 6 Build is the first time motors move (Ch 7's callout comes after). Before line 532 add: finger on **Disabled**, part stick first, rangefinder can miss angled or soft walls | `06-*.md` |
| ch06-m4 | "Watchdog will start barking" | FIX | S | Line 215: name the console message `Loop time of 0.02s overrun` and the per-method timing list. Confirm exact text in 2026.2.1 `Watchdog` source while editing | `06-*.md` |
| ch06-m5 | Command-based chapter number wrong | FIX | S | Line 473 now says "By Chapter 20"; "Why Command-Based?" is Ch 19 after renumbering: "In Chapter 19, when you meet..." | `06-*.md` |
| ch06-v5 | Can't back away once wall is close | SKIP | | The assignment's "Check yourself" (assignment.md line 67, answer key line 86) uses this as a deliberate predict-and-fix task | |
| ch06-v7 | Promised non-blocking blink never appears | DONE | | Build step 5 heartbeat (lines 512 to 530), line 217 callout points to it, "fixed rate" claim gone | `06-*.md` |
| ch06-v8 | Practice/Git/Reflect disagree on which project | FIX | S | Chapter Git section (lines 569 to 577) still commits only the Practice. Match assignment.md: Practice commit in scratch project, Build commit `Ch6: deadband helper and wall stop in teleop` in the Explorer with `reflections.md` | `06-*.md` |
| ch06-v9 | `!=` table example compares strings | FIX | S | Line 89: `count != 5` (or `mode != 0`) | `06-*.md` |
| ch06-v10 | `getRightTrigger()`, deprecated `getLeftBumper()` | DONE | | Lines 165, 170 use `getRightTriggerAxis()` and `getLeftBumperButton()` | `06-*.md` |
| ch06-v12 | "Java basics" link points at units page | FIX | S | Line 587: drop the bullet (or point to a real WPILib Java basics page if one exists) | `06-*.md` |

Extra (D4 leftover, not in review): Ch 6 line 72 "watching SmartDashboard" names the app; Practice 1 and Build step 4 say "to SmartDashboard", which is fine as the class. Folded into ch06-m2.

## Ch 7

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch07-m1 | Dot "object on the left" vs static `SmartDashboard` example | DONE | | Line 125 now says that one has a class on the left, see §7.9 | `07-classes-objects-and-the-xrp-hardware-layer.md` |
| ch07-m2 | "Wasteful and buggy" undersells the allocation error | DONE | | Line 387 names `XRPMotor 0 already allocated` | `07-*.md` |
| ch07-m3 | `static` never exercised | DONE | | Practice line 497 adds the `batteriesMade` static vs instance step | `07-*.md` |
| ch07-v3 | Inversion diagnosis ambiguous | DONE | | Lines 480 to 481: spin = remove inversion; backward = invert left, remove right | `07-*.md` |
| ch07-v4 | `arcadeDrive(0.6)` squaring hidden | DONE | | "Barely moves" bullet (line 482) says `0.6` is about a third of full power, Ch 8 explains | `07-*.md` |
| ch07-v5 | Template `XRPDrivetrain.java` never mentioned | DONE | | "Delete the template's `XRPDrivetrain.java`" callout, lines 264 to 266 | `07-*.md` |

## Counts

DONE 12, FIX 47, VERIFY-WEB 1, HARDWARE 0, SKIP 1 (61 items).


## Ch 8

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch08-m1 | `...Pressed()` traps (edge remembered while not called; first caller uses it up) | FIX | S | After the 8.7 table (line ~388) add: "really means pressed since the last time this line asked; ask once per loop and keep the answer in a variable; a press while the line wasn't running (e.g. disabled) still counts next time." | book 08 |
| ch08-m2 | Slow Mode widget uses `speedScale == SLOW_MODE_SCALE` | SKIP | L | Ch 12 line 336 now uses this exact line as its "exact copies are safe" example; changing it ripples through Ch 8 to 20 listings and ~12 solutions for little gain. | n/a |
| ch08-m3 | "get it, battery or not" overpromises (XRP can't measure battery) | FIX | S | Line 457: "...and get close. The motor model (Ch 16) gets you most of the way, and encoder feedback (Ch 15) fixes the rest, even on a tired battery." Matches Ch 16 line 148. | book 08 |
| ch08-m4 | "Input shaping" wrong term | DONE | S | Line 344 now says "input curve (WPILib's name ... `squareInputs`)". | book 08 |
| ch08-m5 | `Constants.java` promise says "every tunable value", Ch 21 keeps gains in their classes | FIX | S | Line 217: "By Chapter 21 the constants several classes share move into `Constants.java`, and ones that describe one part of the robot live with that part." (Ch 21 line 221 rule.) | book 08 |
| ch08-m6 | Practice 2 smooth deadband has no hint | FIX | S | Add hint ladder after line 510: positives first; `value - deadband` is 0 at the edge, `1 - deadband` at full stick, so divide by that; then handle negatives with `Math.abs` and restore the sign. | book 08 |
| ch08-v2 | `left = forward - rotation` example numbers ignore squaring/scaling | DONE | S | Line 340 now gives "left about 0.18, right about 0.25" and explains squaring then scaling; "sum goes past 1.0" gone. | book 08 |
| ch08-v3 | "Correction to Chapter 7" callout | DONE | S | No "Correction" callout left in Ch 8. | book 08 |
| ch08-v4 | Slow mode snippet doesn't say it replaces the `arcadeDrive` line; `Cmd` widgets show unscaled values | FIX | S | Line ~443: "Replace the `drivetrain.arcadeDrive(forward, rotation);` line with:" and add one sentence that `Forward Cmd`/`Rotation Cmd` still show the values before scaling. Assignment already says Replace. | book 08 |
| ch08-v5 | "Half speed" is really quarter power | DONE | S | Line 457 callout says "about a quarter of full power". | book 08 |
| ch08-v6 | Practice 3 uses `%` (taught in Ch 29) | FIX | S | Line 517: change to `double result2 = a > 10 ? 1.0 : -1.0;` (or drop the line). Update answer key if it has the `%` answer. | book 08, ex ch08 answer-key.md |

## Ch 9

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch09-m1 | Forward pointers to wrong chapters | DONE (batch 1) | S | Line 51: gear ratios on the Mini Swerve arrive in Chapter 29 (29.3), not 28. Line 233: "in Chapter 31 you will build a pose estimator, and in Chapter 34 feed it camera measurements..." | book 09 |
| ch09-m2 | "bury RioLog" wrong for XRP | FIX | S | Line 718: "would bury the VS Code terminal in a thousand lines a second." | book 09 |
| ch09-m3 | "Integrate ... fifty times a second" implies your code integrates | FIX | S | Line 189: "Add up that rate over time ... The XRP does that adding for you in its firmware, and `getAngle()` hands you the total." | book 09 |
| ch09-m4 | Wall stop chatters at threshold; add hysteresis sprinkle | FIX | S | End of "Noise and filtering" callout (line 458): `Blocked` may flicker near 20 cm (**chatter**); fixes are a debounce (Ch 21) or two thresholds, **hysteresis** (Ch 22). | book 09 |
| ch09-m5 | Wall stop called "keep it safe" | FIX | S | Line 714 callout: add "A reflex like this helps the driver but is not a safety system; you just saw ways the rangefinder misses a wall. The real safety system is a person on Disable." | book 09 |
| ch09-v1 | Build step 1 / 9.5 say remove temp fields but not the two `Count` lines | FIX | S | Lines 299 and 805: "remove the temporary encoder fields **and the two `Left Count`/`Right Count` lines** from `Robot.java`". | book 09, ex ch09 assignment.md (check) |
| ch09-v2 | "Correction to Chapter 6" callout | FIX | S | Ch 6 already uses `getDistanceMeters() < 0.20` (lines 358, 373); delete the stale callout at lines 440 to 442. | book 09 |
| ch09-v3 | Listing drops Ch 8's `Forward Cmd`/`Rotation Cmd` silently | FIX | S | Add a bullet to "what changed since Chapter 8" (line 702): the two `Cmd` widgets are gone; the sensor widgets replace them. | book 09 |

## Ch 10

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch10-m1 | "In Chapter 4 you met RioLog" stale after B3 | DONE | S | Line 233 now says prints were seen in the terminal and RioLog is for the roboRIO; matches Ch 4 lines 238 and 295. | book 10 |
| ch10-m2 | Log-on-change pattern floods when wall stop chatters | FIX | S | After "Read it aloud" (line 457): creeping slowly may log several ON/OFF pairs; that's the reading wobbling across 20 cm (**chatter**), Ch 21/22 show fixes. | book 10 |
| ch10-m3 | Bug swap Collab: authors should verify their bug shows | FIX | S | Line 962: "Before you push, test your bad commit and the one before it on the robot. If you can't see the difference, pick another bug. Write your test in one sentence for your partner." | book 10 |
| ch10-m4 | No mention of breakpoints [verify] | VERIFY-WEB | S | Check WPILib 2026 docs/VS Code extension: does Simulate Robot Code (or a Debug sim option) attach the Java debugger for XRP? If yes, add the breakpoint bullet in 10.6 with the Motor Safety caveat. | book 10 |
| ch10-v2 | Example line numbers (101, 94, 54, 31, 23) match no listing | FIX | M | Use Ch 9 listing numbers (109, 114, 63, 40, 29) per VERIFY issue 2, incl. call-stack diagram (lines 184 to 186) and steps 4 to 5 (lines 222 to 223); note "might not have been initialized" points at the constructor's closing brace; or add "your line numbers will differ" to 10.3. | book 10 |
| ch10-v3 | Stack trace has roboRIO bottom frames | FIX | M | Replace lines 207 to 208 with `RobotBase.startRobot(RobotBase.java:527)` and `frc.robot.Main.main(Main.java:23)` (sim trace in VERIFY.md); add blank line before `Warning at`; adjust line numbers to match v2. | book 10 |
| ch10-v4 | Compile error output lacks GradleRIO 2026 banner, old Gradle line | FIX | S | Line 110: "> Compilation failed; see the compiler output below." and add the `Compilation Error!` banner lines; say the banner means scroll up. | book 10 |
| ch10-v5 | Missing `}` gives `';' expected` / `reached end of file`, not `class, interface...` | FIX | S | Table line 142: `class, interface...` = extra `}`; add row `reached end of file while parsing` = missing `}`; Practice 1.5 (line 879): first error points just after the missing brace, don't add a `;`. | book 10, ex ch10 answer-key.md |

## Ch 11

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch11-m1 | `SLOW_MODE_SCALE` "semantic conflict" example is a text conflict | FIX | S | Line 661: one teammate lowers `SLOW_MODE_SCALE` to 0.3, another adds `TURN_SCALE` on another line; Git merges cleanly and slow-mode turns become too slow to aim. | book 11 |
| ch11-m2 | Mixes docs.wpilib.org (hand-written) with Javadoc API reference | FIX | S | Line 233: the API reference at github.wpilib.org (XboxController, XRPGyro pages) is generated from doc comments; docs.wpilib.org tutorials are hand-written. Line 9 and line 699: "turn into WPILib's API reference pages". | book 11 |
| ch11-m3 | Review checklist lacks robot-safety row | FIX | S | Add row to 11.4 table: "Could this make the robot move unexpectedly?" plus one line: movement changes say "driven, not only built" in How I tested it. | book 11 |
| ch11-m4 | Student Pack gives GitHub Pro for protected branches [verify] | VERIFY-WEB | S | Confirm on education.github.com/pack and GitHub plans that Pro (via Student Pack) includes branch protection/rulesets on private repos; then add one sentence at line 684. | book 11 |
| ch11-v1 | "exactly one place that talks to `diffDrive`" false (`stop()`) | FIX | S | Line 343: soften to "the only drive method that talks to `diffDrive`", or have Part A change `stop()` to `arcadeDrive(0.0, 0.0)` (then update solution). | book 11 (ex ch11 solution Drivetrain.java if code route) |
| ch11-v2 | "Reverse capped at half" ignores squaring | FIX | S | Lines 456, 587, 800: "capped at half stick, which squaring turns into about quarter power". | book 11 |
| ch11-v3 | `--graph` picture omits PR merge commit and Part A commit | FIX | S | Lines 394 to 401: paste the real graph from VERIFY.md issue 3 (with `Merge pull request #1` and `Ch11: Javadoc...`), or label "simplified". | book 11 |
| ch11-v4 | Rename "updates the one call" but there are two | FIX | S | Line 630: "updates both calls to it in `Robot.java`". | book 11 |
| ch11-v5 | Practice 2.3 `getAccelZ()` is used; natural spot conflicts | FIX | S | Line 746: "A deletes `getAccelZ()` and its dashboard line"; "B adds a Robot Tipped widget in `teleopPeriodic()`". Check answer key. | book 11, ex ch11 answer-key.md |
| ch11-v6 | CONTRIBUTING link won't show on the `team-rules` PR [verify] | VERIFY-WEB | S | Check GitHub docs (setting guidelines for contributors): link appears only when file is on default branch. If so, line 878: "After it merges, open a new PR or New issue page and look for the link." | book 11 |

## Ch 12

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch12-m1 | "Wheels scrub" wrong reason for a 2-wheel XRP | FIX | M | Line 344: encoders mislead in turns from wheel slip, caster drag, and contact points not exactly 155 mm apart; scrub is a 4/6-wheel FRC thing; Ch 13 measures it. Line 378: "friction of the caster dragging". Summary line 871 too. Consider Ch 14 lines 180, 1055 for consistency. | book 12 (and 14) |
| ch12-m2 | `>=` turn check only works for left turns | FIX | S | After line 372: "This check only works for left turns; a right turn to -90 needs `<=` and negative rotation. Ch 15's PID with tolerance turns either way." | book 12 |
| ch12-v2 | "0.5 means 0.5" ignores default 0.02 deadband rescale (0.4898) | FIX | S | Line 167: add "(almost: `DifferentialDrive`'s tiny 0.02 deadband from Ch 8 makes it 0.49)". | book 12 |
| ch12-v3 | Sample log omits `XRP Explorer started!`, shows rounded times | FIX | S | Lines 806 to 815: add `XRP Explorer started!` line and note real times print as long decimals (e.g. `1.1799999999999997 s`). Times themselves wait on the open top-speed HARDWARE item. | book 12 |
| ch12-v4 | Intro says turn for half a second, course turns 0.6 s | FIX | S | Line 7: "then turn for a little over half a second" or "for 0.6 seconds". | book 12 |
| ch12-v5 | CLAUDE.md Ch 12 entry "plus a timed segment" | DONE | S | CLAUDE.md line 111 now describes the chapter correctly; no "timed segment". | CLAUDE.md |

## Ch 13

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch13-m1 | Diagnose says print private `speedToPower` | FIX | S | Line 1009: "Check the constant. If it looks right, add a temporary `println` inside `drive()` that prints the two powers, then remove it." | book 13, ex ch13 assignment.md (check) |
| ch13-m2 | Mutate vs return-new rule overstated; Ch 28 `withOutput` breaks it | FIX | S | Line 487: "return type is a strong hint ... returns same class usually builds a new one, but not always (Chapter 28 shows one that changes the object and returns it). Check the Javadoc." Confirm the `withOutput` section's new chapter number. | book 13 |
| ch13-m3 | Practice 4 retypes 0.28 and 0.155 as magic numbers | FIX | M | Make `MAX_WHEEL_SPEED_METERS_PER_SECOND` and `TRACKWIDTH_METERS` public (or add getters) and use them by name in lines 987 to 988; same in assignment and answer key. | book 13, ex ch13 assignment.md, answer-key.md |
| ch13-m4 | Feedforward callout calls kV "voltage" though code uses power | FIX | S | Line 543: "how much extra push each m/s needs. Here push is power (1/0.28, about 3.6); in Ch 16 you'll measure it in volts, so the number looks different." | book 13 |
| ch13-v1 | "left 0.21, right 0.5" only true with squaring off | FIX | S | Line 221: add "with squaring off; with Ch 8's squared call it's about 0.18 and 0.25" (matches Ch 8 line 340). | book 13 |
| ch13-v2 | `tankDrive` "more or less straight" hides 0.02 deadband rescale | FIX | S | Line 762: name the 0.02 deadband rescale, or add `diffDrive.setDeadband(0.0)` in the constructor (M if code route: listings and solutions Ch 13 on). | book 13 |
| ch13-v3 | "turn will be the wrong shape" wrong (desaturate runs first) | FIX | S | Line 1010: "every power is huge; desaturate caps the faster wheel at 1.0 and keeps the turn's shape, but the robot runs at full power". | book 13 |
| ch13-v4 | "Only two parts of Robot.java change" forgets import and `Measured` widgets | FIX | S | Line 790: list the import and the two `Measured` widgets from 13.8 too. | book 13 |

## Ch 14

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch14-m1 | `resetPose` teaches hardware zeroing as the rule | FIX | M | Add callout after the walk-through (line ~660): "You don't actually have to zero the sensors": `resetPosition` with current readings alone moves the pose; Explorer zeroes only because the turn step reads raw heading; Ch 17 switches to software zeroing. | book 14 |
| ch14-m2 | Field map rewrite to AdvantageScope 2D Field | FIX | S | Main rewrite DONE (lines 693 to 717, 1181, 1194 to 1195, Evergreen, Resources). Leftover: Practice 4 line 1173 "the Field window open" to "AdvantageScope's 2D Field open". Whether a second pose on Poses draws as a ghost by default needs a look in AdvantageScope (HARDWARE). | book 14 |
| ch14-m3 | Practice 2 promise to Ch 31 (drift per meter) unrecorded | FIX | S | Add "compare Ch 14 Practice 2 drift per meter with the Mini Swerve" to the Ch 31 entry in CLAUDE.md and the promises list in 00-book-wide.md (old "Ch 30" row). Line 1085 sim-vs-real promise is now kept by Ch 18. | CLAUDE.md, reviews/00-book-wide.md |
| ch14-v1 | "four new imports" in Robot.java, really three | FIX | S | Line 723: "three new imports" (Pose2d, Rotation2d, Field2d). | book 14 |
| ch14-v2 | `autonomousPeriodic` runs before `robotPeriodic`; logged pose is a loop stale; 91.10 sample | FIX | S | Line 994: "before the dashboard reads the pose" and note mode methods see last loop's pose; line 1026: heading just under 90 (e.g. `Rads: 1.55, Deg: 88.79`). | book 14 |
| ch14-v3 | Reason for constructing odometry in constructor misstated; "(Chapter 12)" | FIX | S | Line 655: starting readings would be taken before encoders are set up and zeroed, so a leftover count becomes a jump on the first update; "(Chapter 10)". | book 14 |
| ch14-v4 | "In Chapter 20 ... `periodic()`": Ch 17 introduces it | FIX | S | Line 664: "In Chapter 17 the update moves into `periodic()`, and in Chapter 20 WPILib starts calling it for you." | book 14 |
| ch14-v5 | Practice 1 move 6 needs cos/sin 135, not in 14.3 table | FIX | S | Add row after line 139: `| 135 degrees | -0.707 | 0.707 | equal parts -x and +y |`. | book 14 |
| ch14-v6 | Uniform wheel-size error doesn't open a closed square | FIX | S | Line 1057: add "It shows on straight runs like the course; on a closed square it mostly cancels, because every side is equally too long." | book 14 |
| ch14-v7 | Practice 4 encoder-only reset after a straight push looks correct | FIX | S | Line 1173: "drive forward 30 cm, turn left a quarter turn, drive 20 cm, and press Y"; ask where the icon lands and why. | book 14 |

## Counts

- DONE: 6
- FIX: 51
- VERIFY-WEB: 3
- HARDWARE: 0 (Ch 14 m2 has a small app check folded into its FIX)
- SKIP: 1
- Total: 61


## Ch 15 (review ch15-sme)

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch15-m1 | Scope bug listing uses undefined `HAND_KI` | FIX | S | Before the §15.6 listing (line 316) add "To try it, add `private static final double HAND_KI = 2.0;` next to `HAND_KP`"; after the field fix add "now leg 1 finishes" | src/section-3-autonomous-control/15-pid-control-making-the-robot-accurate.md |
| ch15-m2 | "B then A is a left turn" reads backwards | FIX | S | Line 1124: "pressing B turns left to 90, and pressing A after it turns right, back to 0" | 15-pid...md |
| ch15-m3 | Clamp is a crude profile; `ProfiledPIDController` filed under arms only | FIX | S | Add 2 sentences to "The times got longer" (line 1168) on motion profiles; line 1189 "Arms, elevators, and smooth drive-to-distance moves use" (Ch 35) | 15-pid...md |
| ch15-v1 | `0.0003 / 0.02` is 0.015, not 0.016 | FIX | S | Line 285: "about 0.32 mm ... `0.00032 / 0.02 = 0.016`" | 15-pid...md |
| ch15-v2 | Default integrator cap useless for distance; "copy the heading setup" gives 10 m I zone | FIX | S | Line 496: default cap suits heading only; for distance `setIZone(0.03)` and maybe `setIntegratorRange(-0.1, 0.1)`. Line 1273: "an I zone in meters (a few cm)" | 15-pid...md |
| ch15-v3 | Negative gain "throws the moment you try"; `setP` and widget accept it | FIX | S | Line 438: "the constructor throws ... a negative number typed into the widget is accepted, and the robot runs away" | 15-pid...md |
| ch15-v4 | Rate tolerance ends leg 1 6 to 8 mm short; sample log `X: 0.50` | HARDWARE | S | Sim probe says `X: 0.49`; confirm on a real XRP, then change sample log (line 1158) and add "a few mm short, inside 1 cm" at line 1166 | 15-pid...md |
| ch15-v5 | Bench buttons set both targets; X then B drives an arc | FIX | S | After line 1063 add "After a drive, press A before B (X then B drives back along a curve while it turns)" | 15-pid...md |
| ch15-v6 | "Double P until it rings" may never ring with 2 rad/s clamp | FIX | S | Step 2 (line 1123): add stopping rule "if P reaches about 2 and it still does not ring, stop: the clamp is limiting; use the smallest P that finishes in tolerance" (assignment already says this) | 15-pid...md |
| ch15-v7 | Practice 3 "move `errorSum` inside" breaks `reset()` | FIX | S | Line 1226: "add `double errorSum = 0.0;` as the first line of `calculate` (leave the field; the local hides it)" | 15-pid...md |
| ch15-v8 | Practice 5 finger nudge may not show the cascade | FIX | M | Line 1256: add tape-measure reading next to `Pose Y`, start with `resetPose(new Pose2d(0.0, 0.03, new Rotation2d()))`, one sentence that a slide fools odometry (copy from assignment) | 15-pid...md |
| ch15-v9 | §15.11 says `TurnToAngle` | FIX | S | Line 1183: `TurnToHeading` | 15-pid...md |
| ch15-v10 | Talon FX onboard PID pointer is wrong chapter | DONE (batch 1) | S | Line 1185: point to Ch 33 (Ch 29 line 428 says loops move into the Talon FX in Ch 33) | 15-pid...md |

## Ch 16 (review ch16-sme)

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch16-m1 | "Try every possible kS, kV, kA" misdescribes least squares | FIX | S | Line 195: use review's wording ("finds the one set ... a little algebra gets there in one step") | src/section-3-autonomous-control/16-sysid-characterization-on-the-xrp.md |
| ch16-m2 | 165-line SysId runner not signposted as temporary | DONE (batch 1) | S | Before listing (line 505) add "This is a teaching version: in Chapter 20, `SysIdRoutine` replaces it". End-of-chapter checkpoint (line 1396) already exists. Also line 1313 "Chapters 19 to 21" should say Chapter 20 | 16-sysid...md |
| ch16-m3 | "Diagnostic Plots" window and "Direction" box not in docs | VERIFY-WEB | S | Check allwpilib `sysid` GUI source (or open SysId 2026.2.1) for exact labels; fall back to "Diagnostics pane, forward and backward plots" (line 800) | 16-sysid...md |
| ch16-v1 | "two regular imports" but three named | FIX | S | Line 915: "three regular imports" | 16-sysid...md |
| ch16-v2 | §16.8 listing drops Ch 14 Javadoc | DONE | | Ch 14 and Ch 16 `Drivetrain` listings now match (no getter Javadoc in either; same `getHeadingDegrees` Javadoc) | |
| ch16-v3 | "You could pick 1.0" needs scaled test volts and re-run | FIX | S | Line 146: "You could pick 1.0, scale the SysId test voltages to match, re-run SysId, and..." | 16-sysid...md |
| ch16-v4 | Tests swing 15 to 20 deg, end 30 cm to side | FIX | S | "Space" (line 698): add "leave about 30 cm on each side; straighten it by hand between tests". Wording is safe without hardware | 16-sysid...md |
| ch16-v5 | Sample log missing "stopped by a safety net" line | FIX | S | Lines 721 to 732: show the safety-net line and ~8.0 s for quasistatic tests; add "(normal)" to step 1 | 16-sysid...md |
| ch16-v6 | "five or so entries with no `NT:`" | FIX | S | Line 760: "seven entries whose names end in `-drive`" | 16-sysid...md |
| ch16-v7 | Practice 1 acceleration row cannot be checked with one-arg `calculate` | FIX | S | Line 1356: add "(for the acceleration row, `calculateWithVelocities(0.10, 0.11)` gives about 3.39)" | 16-sysid...md |
| ch16-v8 | `tankDrive` 0.02 deadband folds into kS | FIX | S | Line 350: "with no squaring (it still ignores powers under 0.02, which SysId measures as part of kS, so it cancels too)" | 16-sysid...md |

## Ch 17 (review ch17-sme)

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch17-m2 | Two-recorders callout: `FRC_` log now doubles all AdvantageKit values | FIX | S | Callout line 244: add `NT:/AdvantageKit/` side effect; "still the seven ending in `-drive`"; Chapter 25 retires one | src/section-3-autonomous-control/17-advantagekit-and-the-io-layer.md |
| ch17-m3 | IO classes read constants from `Drivetrain` (two-way dependency) | FIX | S | "Public constants" callout (line 794): add one sentence on direction and AdvantageKit's constants class; Chapter 21 `Constants.java` | 17-advantagekit...md |
| ch17-v4 | Real robot is "same within tolerance", not "exactly as before" | FIX | S | Heading line 796 and Build step 4 (line 922): "the same, within tolerance" plus one clause on 20 ms older inputs and deadband move. Wording safe without hardware | 17-advantagekit...md |
| ch17-v6 | Pinned vendordep's `jsonUrl` is `releases/latest`; updates will offer v27 | FIX | S | After line 186 add "If VS Code later offers to update AdvantageKit, decline" | 17-advantagekit...md |
| ch17-v7 | "Logger before anything is created": field initializers run first | FIX | S | Line 229 and listing comment (232, 822): "before anything the constructor creates" | 17-advantagekit...md, 18-simulating-the-xrp.md (line 322 comment) |
| ch17-v8 | "hardware imports are gone" but `DifferentialDrive` stays | FIX | S | Line 435: "the hardware imports are gone except `DifferentialDrive` (for its static math)"; list the comment rewrites | 17-advantagekit...md |

## Ch 18 (review ch17-sme)

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch17-m1 | Creating `RangefinderDistanceSensor` beside `Sensors` throws "already allocated" | DONE (batch 1) | M | Worse now: Ch 18 Practice 1 (line 525) has students run the `false` branch. Tell students it throws because `Sensors` owns the rangefinder (or make it the lesson), and add the note after §18.3 snippet (line 94). Confirm exact error text by running Simulate Robot Code | 18-simulating-the-xrp.md, 17-advantagekit...md (Practice 1) |
| ch17-v2 | "Drives straight? Perfectly" wrong: per-side FF vs averaged model curves | FIX | S | §18.6 table line 465: "Almost; per-side feedforward on twin sim motors drifts a little, PID corrects" | 18-simulating-the-xrp.md |
| ch17-v3 | `subtractFriction` only while driven; coasting sim wheel slides further | FIX | S | Add bullet to §18.6 list (after line 474): "No friction while coasting" | 18-simulating-the-xrp.md |
| ch17-v5 | Sim sensors answer a loop sooner than real ones | HARDWARE | S | Confirm the one-loop lag on a real XRP before adding a §18.6 bullet | 18-simulating-the-xrp.md |

## Ch 19 (review ch18-sme)

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch18-m1 | LED called a subsystem; card says "requires LED" | FIX | S | Table line 136 and Collab card line 791: say LED is a subsystem only on bigger robots; Explorer can make one in Ch 20 Practice 5 (already exists); card "requires nothing" or "requires LED (if you build Ch 20's `Led`)" | src/section-4-command-based/19-why-command-based.md |
| ch18-m2 | `TurnToHeading` preview hard-codes gains | FIX | S | Line 205: `Drivetrain.createHeadingController()` with comment "Chapter 20 writes this"; drop lines 211 to 212. Fixes v10 too | 19-why...md |
| ch18-v3 | DIO 1 starts on in sim, first "LED on" not visible | HARDWARE | S | Sim probe says DIO 1 starts true; confirm in the Sim GUI DIO window, then add a note at line 612 | 19-why...md |
| ch18-v4 | `robotPeriodic()` listing rewords first comment silently | FIX | S | After the listing (line 575): "(The first comment is updated too, now that `periodic()` reads the IO layer.)" | 19-why...md |
| ch18-v5 | `withName` "is the same command" | FIX | S | Line 483: "a new command that runs the original, with a name..." | 19-why...md |
| ch18-v6 | All factories take subsystems: only `runOnce`, `run`, `startEnd` | FIX | S | Line 475: "The first three can also be given the subsystems..." | 19-why...md |
| ch18-v7 | "That is eleven lines" | FIX | S | Line 333: "a dozen lines, plus a `package` line and an import" | 19-why...md |
| ch18-v8 | Forward-reference callout: "same reason" as Ch 14 `odometry` | FIX | S | Line 553: "Chapter 14 met the same error with the course constants, and put `odometry` in the constructor for a related reason" | 19-why...md |
| ch18-v9 | "Two PID controllers shared by three different jobs" | FIX | S | Line 5: "two different jobs" (align not built yet) | 19-why...md |
| ch18-v10 | Preview drops I zone and clamp | FIX | S | Covered by ch18-m2 fix | 19-why...md |
| ch18-v11 | Diagnose: "LED goes off at once" blames schedule order | FIX | S | Line 748: cause is a reversed `until` condition (`!=` for `==`); the order does not matter | 19-why...md |

## Ch 20 (review ch19-sme)

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch19-m1 | "which is not how commands behave" contradicts `ignoringDisable` | FIX | S | Line 65: "commands do not run while disabled unless you ask; Chapter 21 shows how" | src/section-4-command-based/20-subsystems-and-commands-on-the-xrp.md |
| ch19-m2 | `speedScale == SLOW_MODE_SCALE` compares doubles | FIX | M | `DriveWithSticks` line 912: keep `boolean slowMode` and publish it; update solution file | 20-subsystems...md, exercises ch20 solution `DriveWithSticks.java` |
| ch19-m3 | Practice 6 needs untaught decorators | FIX | S | Line 1691 hint: introduce `.beforeStarting(...)` and `.finallyDo(...)`; PID controller as captured local | 20-subsystems...md |
| ch19-m4 | Stuck bench command locks out sticks, no way out | FIX | S | Callout line 1630: "press another bench button or disable; give bench commands `.withTimeout(5.0)`" | 20-subsystems...md |
| ch19-m5 | Collab checklist lacks "second way to end" | FIX | S | Add checklist item after line 1767; `BackAwayFromWall` description "or 0.30 m of backing up, whichever first" (line 1763) | 20-subsystems...md |
| ch19-v1 | `DriveUntilLine` holds the turn's end heading, contradicting "math did not change" | FIX | S | Line 1614: "almost the same; leg 2 now holds the heading the turn ended at" | 20-subsystems...md |
| ch19-v2 | Double-call callout: no overshoot, AdvantageKit does not log twice | FIX | S | Line 257: drop "AdvantageKit records every input twice" and "overshoots every PID target" | 20-subsystems...md |
| ch19-v3 | Diagnose "pressed twice" wrong for `getXButton()` | FIX | S | Line 1644: symptom is "restarts over and over while held" | 20-subsystems...md |
| ch19-v4 | Diagnose "skips straight through" names never-finish causes | FIX | S | Line 1642: give finish-at-once causes (start read in constructor, tolerance too loose, setpoint never set) | 20-subsystems...md |
| ch19-v5 | SysId fences: a test can drive almost 1.5 m | FIX | S | Line 1577: "leave 0.75 m on both sides of the Test-mode start, and start each test near the middle" | 20-subsystems...md |
| ch19-v6 | Listing comments point to wrong 20.x sections | FIX | S | Recheck comments at lines 1064 to 1077, 1121 to 1146, 1258, 1369 against headings (default command is 20.7, rewiring is 20.8) | 20-subsystems...md, solution `Robot.java` |
| ch19-v7 | "nine fields to three" (Ch 19 had eight) | DONE | | Callout line 1583 now says "nine (counting the imagined `aligning`)" | |
| ch19-v8 | File count ignores template `XRPDrivetrain.java` | DONE | | Ch 7 line 264 tells students to delete it, so seven is right | |
| ch19-v9 | Practice 1: one fully qualified use does not build | FIX | S | Line 1681: "change every use of it" (or keep import and change one use) | 20-subsystems...md |

## Ch 21 (review ch20-sme)

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch20-m1 | `BackAwayFromWall` backs up blind with no limit | FIX | S | Collab binding line 1711: `.withTimeout(3.0)` with the "nothing watches behind" comment; same at the moved B binding (line 1728) | src/section-4-command-based/21-button-bindings-robotcontainer-and-command-groups.md |
| ch20-m2 | Single-subsystem factories in `RobotContainer`, against WPILib guidance | FIX | M | Add the "Where should a factory live?" paragraph after the field/factory table (line 467) | 21-button-bindings...md |
| ch20-m3 | Y resets pose mid-autonomous | FIX | S | Lines 806 to 809, 837, 1034: `controller.y().and(RobotModeTriggers.autonomous().negate())`; update controls table, Reflect 1, Diagnose | 21-button-bindings...md, solution `RobotContainer.java` |
| ch20-v2 | Practice 5: binding `obstacleCourse` field gives NPE | DONE | | Practice 5 (line 1496) now says bind it in the constructor after `obstacleCourse = buildObstacleCourse();` | |
| ch20-v3 | Sim USER button reads pressed | DONE | | Practice 5 now says do it on the real XRP and explains the sim behavior | |
| ch20-v4 | `MathUtil`/`Commands` constructors shown empty; real ones throw | FIX | S | Line 102: show `throw new AssertionError("utility class")`; line 108: say `RobotModeTriggers` is the empty one | 21-button-bindings...md |
| ch20-v5 | Diagnose: deadline group says "parallel group" | FIX | S | Row line 1413: list both texts ("parallel composition" or "parallel group") | 21-button-bindings...md |
| ch20-v6 | "Originally composed at" starts with a WPILib line | FIX | S | Line 435: add `at edu.wpi.first.wpilibj2.command.Commands.sequence(...)` before the `frc.robot` line; say "the first `frc.robot` line" in 439 | 21-button-bindings...md |
| ch20-v7 | Bindings in periodic: no loop overrun on a laptop | FIX | S | Line 829 and row 1418: drop the overrun claim; "on a roboRIO the pile would eventually slow the loop" | 21-button-bindings...md |
| ch20-v8 | "nine fields of what am I doing" | FIX | S | Line 1370: "eight fields (nine with Section 19.1's `aligning`)" | 21-button-bindings...md |
| ch20-v9 | `OperatorConstants` is roboRIO Command Robot template, not XRP Command | FIX | S | Line 201 (and 1745 is fine): "WPILib's roboRIO Command Robot template" | 21-button-bindings...md |

## Ch 22 (review ch21-sme)

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch21-m1 | "easy to test" oversells `decideNextState()` | FIX | S | Line 706: "not quite easy to test yet: it reads sensors and gyro itself; Chapter 23 passes them in" | src/section-4-command-based/22-state-machines.md |
| ch21-m2 | XRP course link is Python, not said | FIX | S | Line 391: "in Python"; resource line 1405: "(Python and Blockly; compare its `error` line with `getSteeringError()`)" | 22-state-machines.md |
| ch21-m3 | `Line State` stale after command ends | FIX | M | `end()` (line 571): publish final state plus "(interrupted)"; one sentence in walk-through; update solution `FollowLine.java` | 22-state-machines.md, exercises ch22 solution |
| ch21-v1 | javac 17 says "enum types", not "enum classes" | DONE (batch 1) | S | Line 258: `enum types may not be instantiated` | 22-state-machines.md |
| ch21-v2 | Missing semicolon message text | FIX | S | Row line 1122: "`',', '}', or ';' expected` (and more errors at the constructor)" | 22-state-machines.md |
| ch21-v3 | Without `.and(teleop)` bumper works in every mode | FIX | S | Row line 1128: "does nothing: binding uses `test` or is missing"; separate row for missing `.and(teleop)` | 22-state-machines.md |
| ch21-v4 | Sim leg 2 changes (sensors ahead of center) | FIX | S | Line 1037: "on the real robot the first four steps should not change; on the sim leg 2 stops a few cm sooner" | 22-state-machines.md |
| ch21-v5 | `END_POSE` is tape end; center stops short | FIX | S | Line 856 and 1112: "marks the end of the tape; the robot's center stops a few cm before it" | 22-state-machines.md |
| ch21-v6 | Line ending mid-correction reads as lost | HARDWARE | M | Seen on sim floor (8 of 29 shapes); confirm frequency on real tape before changing text or end test | 22-state-machines.md |
| ch21-v8 | Practice 5(c) skipped follower reports last state | DONE | | Practice 5 (line 1226) now asks to restart and explains why the second run lies | |
| ch21-v9 | Build step 4 builds before `FollowLine` import | FIX | S | Line 1241: "Add the `FollowLine` import (Step 2) and the teleop binding..." | 22-state-machines.md |
| ch21-v10 | Chatter callout: edge case still chatters; naive debounce erases memory | FIX | M | Callout line 733: soften "protected" claim; warn that debouncing `isLineSeen()` loses `lastSteeringError`; prefer hysteresis | 22-state-machines.md |
| ch21-v11 | "0.4 to 0.7" can sit below `LINE_THRESHOLD` (0.45) | FIX | S | Check 1 line 1049: "Both should read above your `LINE_THRESHOLD` (Section 9.7); if not, lower it". Wording safe without hardware | 22-state-machines.md |

## Counts

FIX 72, DONE 6, HARDWARE 4, VERIFY-WEB 1, SKIP 0 (83 items)


## Ch 23 (review ch22-sme)

File: `section-4-command-based/23-unit-testing-robot-code.md`

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch22-m1 | setup-gradle saves its cache only from `main` | FIX | S | Line 1275: "saves downloaded files between runs, but only from runs on `main`; until your first PR is merged every run downloads everything" | Ch 23 §23.9 |
| ch22-m2 | Forward promise names `SwerveModule` (class is `Module`) | FIX | S | Line 1346: "each swerve `Module` and the drive's kinematics get unit tests on fake IO layers as they are written (Chapters 28 and 29)" | Ch 23 §23.10 |
| ch22-m3 | A YAML tab does not make the workflow "never run" | FIX | S | Line 1450: split row; add "red run that says **Invalid workflow file** / a tab or bad indent; the error names the line" | Ch 23 Diagnose |
| ch22-v3 | "When tests pass, Gradle says nothing" is false | FIX | S | Line 170: Gradle lists every `PASSED` and the printouts; what matters is `BUILD SUCCESSFUL`; joystick warnings are harmless. Line 1017: printouts are under the test's `STANDARD_OUT` too | Ch 23 §23.2, §23.7 |
| ch22-v4 | Allocation message is `Analog Input 2`, not `0` | FIX | S | `Analog Input 0` to `Analog Input 2` at lines 1206 and 1445 | Ch 23 §23.8, Diagnose |
| ch22-v5 | Diagnose "`DriveDistance never finished`": wrong causes | FIX | S | Line 1443: row "`expected: <0.3> but was: <0.0>` / DS not enabled, disabled robot refuses to schedule"; drop the `stepTiming` cause | Ch 23 Diagnose |
| ch22-v6 | No LED flicker without `setAutonomous(true)` | FIX | S | Line 1182: "every teleop binding is live while the course runs"; line 1446: drop the `setAutonomous` clause | Ch 23 §23.8, Diagnose |
| ch22-v7 | Loop starts only because sim `DigitalOutput` starts true | FIX | S | Add one sentence after line 1185: "In simulation a digital output starts on, so the loop starts at once" | Ch 23 §23.8 |
| ch22-v8 | `@Test` with parameters fails, not skipped | FIX | S | Line 1441: drop "or has parameters"; add row `ParameterResolutionException` / a `@Test` has parameters | Ch 23 Diagnose |
| ch22-v9 | Practice 4 breaks 14 calls; only the "3" test goes red | FIX | S | Line 1381: add `NO_SEARCHES_YET = 0` as the last arg of every call in `FollowLineTest`; "the second one is red" | Ch 23 Practice 4; answer-key.md |
| ch22-v10 | `git status` shows only `.github/` by then | FIX | S | Line 1504: "check that `.github/` is listed under Untracked files (tests were committed earlier; `git log --stat`)" | Ch 23 Git |

## Ch 24 (review ch23-sme)

File: `section-4-command-based/24-smartdashboard-shuffleboard-and-live-tuning.md`

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch23-v1 (MAJOR, coordinator item) | Null-check failure message wrong | FIX | S | Confirmed still wrong at line 418: use `the course never finished ==> expected: <false> but was: <true>`, after the full 40 s (LED starts on in sim) | Ch 24 §24.6; CLAUDE.md Ch 24 entry |
| ch23-m1 | Step response read on single-topic Elastic Graph | FIX | M | Lines 922 to 953: keep Elastic Graphs as quick looks; add "to read overshoot, use an AdvantageScope Line Graph and hover the peak"; callout at 1046 already half there | Ch 24 §24.9 Step 8, §24.10 |
| ch23-m2 | Overwrite trap "flickers"; it snaps back at once | FIX | S | Line 454: "the box shows `3.0` again at once" (matches Diagnose line 1018) | Ch 24 §24.7 |
| ch23-m3 | Nothing on Driver tab shows tuning mode is on | FIX | M | Step 1 (line 604): add `SmartDashboard.putBoolean("Tuning Mode", Constants.TUNING_MODE)` as a Driver tab Boolean Box; mention at line 1038; update solution | Ch 24 §24.9, §24.11; ch24 solution |
| ch23-m4 | "Start at new values" check can be fooled by Elastic resending | FIX | S | Line 1002 and Build step: "Close Elastic, run the Explorer, reopen Elastic, check". Harmless either way; optional hands-on check whether Elastic republishes | Ch 24 §24.10, Build |
| ch23-v2 | `autoChooser.get()` on a `SendableChooser` | FIX | S | Lines 229, 237: use `autoChooser.getSelected()` (javac message stays the same) | Ch 24 §24.5 |
| ch23-v3 | Simulate Robot Code does not run tests | FIX | S | Line 21: "Gradle compiles the code (the tests run when you build, not when you simulate)" | Ch 24 §24.1 |
| ch23-v4 | "fourteen tests": eleven tests, fourteen calls | FIX | S | Line 782: "eleven tests call `decideNextState()` fourteen times" | Ch 24 §24.9 Step 6 |
| ch23-v5 | Elastic menu names | FIX | S | Mostly done (lines 163, 165, 1127, 1131); line 426 still says **File > Export Layout**: change to **File > Save** | Ch 24 §24.6 callout |
| ch23-v6 | Some values appear only after their command runs | FIX | S | Line 155 (and line 81): add "`Line State`, `Blocked` appear once their command has run: enable teleop, hold left bumper once"; same note for Step 8 (line 922) | Ch 24 §24.2, §24.4, §24.9 |
| ch23-v7 | `git status` lists only step 8 changes | FIX | S | Line 1204: "you should see `Drivetrain.java`, `FollowLine.java`, `reflections.md`; the layout and `TunableNumber` went in earlier" | Ch 24 Git |

## Ch 25 (review ch24-sme)

File: `section-5-advantagekit-capstone/25-advantagescope-visualizing-and-replaying-logs.md`

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch24-m1 | Corner test uses `false`, `0.0` not named inputs | FIX | S | Line 1414: `decideNextState(State.FOLLOWING, LINE_LOST, errorAtTheCorner, NOT_SEARCHING)` (both constants exist in `FollowLineTest`); update solution | Ch 25 §25.11 Step 5; ch25 solution FollowLineTest |
| ch24-m2 | No CI guard for committing `ROBOT_MODE` != REAL | FIX | M | Add `ConstantsTest.committedCodeDrivesTheRealRobot` to the callout at line 839, or as a Practice to keep the 30-test count | Ch 25 §25.8; ch25 assignment/answer-key |
| ch24-m3 | Planted `Side Error` must be cleared by hand | FIX | S | After line 1346 flow: "set Side Error back to `SIDE_ERROR` and close Elastic"; line 1422: "restart, reopen Elastic, check Side Error shows your code's value" | Ch 25 §25.11 |
| ch24-v1 | `step()` starts each step one loop later | FIX | S | Line 317: "the step starts in the next loop: one extra 20 ms per step, too little to matter" | Ch 25 §25.4 |
| ch24-v2 | `DriveWithSticks` turns on in the same loop | FIX | S | Line 363: "turns on in the next loop" to "turns on in the same loop" | Ch 25 §25.4 |
| ch24-v3 | Instant commands only ever log `false` | FIX | S | After line 347: one sentence that `Reset Pose` only shows `false`; `Course/Step` shows instant steps | Ch 25 §25.4 |
| ch24-v4 | `PIDController` reads no clock | FIX | S | Line 520: drop "the PID controllers' loop period" | Ch 25 §25.6 |
| ch24-v5 | Replay takes a few seconds, not "a second or two" | FIX | S | Line 522 "in a few seconds"; also line 875 "a second or two later" to "a few seconds later" | Ch 25 §25.6, §25.9 |
| ch24-v6 | Extensions error begins `Error at ...Logger.start`; Sim GUI may flash | FIX | S | Lines 866 to 870: "an error that says `All HAL simulation extensions...` (the Sim GUI window may flash open first)" | Ch 25 §25.9 Step 2 |
| ch24-v7 | Replay leg 2 ends on timeout; `Leg 3` lasts two loops | FIX | S | Line 891: "ends on its timeout ... `Leg 3` starts, and ends almost at once" | Ch 25 §25.9 Step 3 |
| ch24-v8 | Deleting `simulationPeriodic()` prints "Override me!" | FIX | S | Line 1233: add note that WPILib prints `Default simulationPeriodic() method... Override me!` once, and it is fine | Ch 25 §25.10 Step 5 |
| ch24-v9 | `git status` before last commit lists only step 8 files | FIX | S | Line 1595: move the check to the step 7 commit; last commit shows `FollowLine.java`, `FollowLineTest.java`, `reflections.md` | Ch 25 Git, Build |
| ch24-v10 | Practice 5 from a terminal hits the extensions error | FIX | S | Line 1508: "run it with `./gradlew simulateJava`; it needs the extensions off, see Practice 6, do the two together" | Ch 25 Practice 5 |
| ch24-v11 | Reflect 5 order does not compile | FIX | S | Line 1543: add "(Try it: what does the compiler say? Then imagine `drivetrain` were not `final`.)"; update answer key | Ch 25 Reflect 5; ch25 answer-key.md |

## Ch 26 (review ch25-sme)

File: `section-5-advantagekit-capstone/26-xrp-capstone-project.md`

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch25-m1 | `ParkAtWall` holds leg 3's crooked heading | FIX | M | Add `targetHeadingDegrees` param, pass `TURN_HEADING_DEGREES` from course and Park At Wall Only, drop line 706; update walkthrough and design doc risk 3. Or make it a design-review question in §26.3 | Ch 26 §26.3, §26.6, §26.7; ch26 solution |
| ch25-m2 | "All tests first" called TDD | FIX | S | Line 439: strict TDD is one test at a time; writing all six first is "test-first"; Extension A tries the loop | Ch 26 §26.5; summary |
| ch25-m3 | `Co-authored-by` uses old noreply format | FIX | S | Lines 805, 1062, 1124, 1258, 1588 to 1603: `12345678+alexchen@users.noreply.github.com`; line 808: "starts with a number and `+`, copy it from Settings > Emails" | Ch 26 §26.6 to §26.9, Git |
| ch25-m4 | Release Swap assumes the other pair can see a private repo | FIX | S | Line 1626 step 1: "If your repository is private, add the other pair as collaborators with Read access first" | Ch 26 Collab |
| ch25-m5 | Release form checkbox is "Set as a pre-release" | FIX | S | Line 1350: "Leave **Set as a pre-release** unchecked, check **Set as the latest release** is ticked" | Ch 26 §26.10 Step 5 |
| ch25-v2 | Test reads 0.1197 before coasting; flip at or below 0.12 | FIX | S | Line 1041: "around 12 cm, and the robot coasts a few mm more after"; line 1049: "as the distance crosses 0.12" | Ch 26 §26.7 Steps 5, 6 |
| ch25-v3 | Outside `ParkAtWall` the error is "has private access" | FIX | S | Line 385: "Try it inside `ParkAtWall` ..." plus the `private access` message for a test | Ch 26 §26.4 |
| ch25-v4 | "More than 100 ms, five whole loops" (coordinator item) | DONE (batch 1) | S | Confirmed at line 434: "can take more than 100 ms on a roboRIO; on your laptop it is closer to one loop" | Ch 26 §26.4 callout; CLAUDE.md Ch 26 Java entry |
| ch25-v5 | gversion counts staged changes as clean | FIX | S | Line 1206: add "a change you have `git add`ed but not committed counts as clean too, so commit first, then build" | Ch 26 §26.9 Step 2 |
| ch25-v6 | No `noWallStaysNoWall` test | FIX | M | Add test 7 (39 tests; red stage 37 tests, 5 failed) and fix counts at lines 13, 590, 799, 1043, 1270, 1370, 1544; or reword criterion 2 (line 33) and line 298 to "every rule" (S) | Ch 26 §26.1, §26.3, §26.5; ch26 solution |
| ch25-v7 | `git diff main` also shows `reflections.md` | FIX | S | Line 1254: add "`reflections.md` (your tuning log)" | Ch 26 §26.9 Step 4 |
| ch25-v8 | Design doc States lines run together when rendered | FIX | S | Lines 207 to 210: indent as a code block or make a list | Ch 26 §26.3 |
| ch25-v9 | Wrong cross-refs and Ctrl+click path | FIX | S | Line 418 "Section 22.3" to "Section 22.6"; line 434 "Exercise 4" to "Practice 4"; line 1521 "Section 25.11's Practice 2" to "Chapter 25's Practice 2"; line 423 add "then Ctrl+click `ImmutableDistance`" | Ch 26 §26.4, Practice 4 |
| ch25-v10 | `buildObstacleCourse()` Javadoc says nothing about parking | FIX | S | Line 953 listing: include the Javadoc with "..., and park at the wall" | Ch 26 §26.7 Step 4 |
| ch25-v11 | `() -> pose` is ten characters | FIX | S | Line 940: "in one short line" | Ch 26 §26.7 Step 3 |
| ch25-v12 | Templates use a switch statement, not expression | FIX | S | Line 1229: "the same strings as AdvantageKit's template projects, written as one switch expression" | Ch 26 §26.9 Step 2 |

## Ch 27 (review ch26-sme)

File: `section-6-mini-swerve/27-from-xrp-to-roborio.md`

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch26-m1 | "Has to be enabled again before teleop" is wrong on a field | VERIFY-WEB | S | Check FMS/DS docs on code restart mid-match; then line 1202: "comes back enabled in the match's mode, but as a brand-new program (pose, state, auto step gone)" | Ch 27 §27.10 Step 1 |
| ch26-m2 | Image "includes a JVM" vs deploy installs it | VERIFY-WEB | S | Check GradleRIO / WPILib deploy docs for the roboRIO JRE install; then line 363 "the deploy tool installs one on a fresh image" and line 450 "first deploy after imaging also installs Java" | Ch 27 §27.6, §27.7 |
| ch26-m3 | Low battery alert can flicker at the threshold | FIX | M | Add 0.5 s rising `Debouncer` to the low-battery alert (Ch 21's), tests use `stepTiming` or zero time; or make it Practice 7 and say so near line 779 | Ch 27 §27.8 Step 4; ch27 solution |
| ch26-m4 | Deploy tries addresses "in order" and "first wins" | FIX | S | Line 191: "tries several addresses at once ... whichever answers first wins" | Ch 27 §27.4 callout, §27.7 |
| ch26-m5 | One-container callout predicts an error Phoenix 6 will not give | VERIFY-WEB | S | Check Phoenix 6 behavior for two `TalonFX` objects with one CAN ID; then rewrite line 1143 (`previously allocated` for DIO; CAN objects give no error) | Ch 27 §27.9 callout |
| ch26-v2 | `Logging to` line still prints with no USB stick | FIX | S | Line 958: "If the DS shows `[AdvantageKit] Failed to open output log file.` right after the `Logging to` line, the stick is missing ..." | Ch 27 §27.8 Step 8 |
| ch26-v3 | "Chapter 25's enum, word for word": comments changed | FIX | S | Line 584: "with the comments updated for the new robot" | Ch 27 §27.8 Step 1 |
| ch26-v4 | "Two lines inside `configureBindings()`" | FIX | S | Line 312: "the two statements (and their comments) inside `configureBindings()`" | Ch 27 §27.5 Step 4 |
| ch26-v5 | Practice 3 PowerShell `&` fenced as `bash` | FIX | S | Line 1450: fence `powershell`, say "in VS Code's terminal (PowerShell)" | Ch 27 Practice 3 |
| ch26-v6 | AdvantageScope shows no yellow alert | FIX | S | Line 967: "Elastic (Section 27.11) shows the yellow **Battery low** alert, and AdvantageScope has it in the log" | Ch 27 §27.8 Step 8 |
| ch26-v7 | CLAUDE.md "No CAN/SparkMAX" | DONE | S | CLAUDE.md has no SparkMAX mention now | CLAUDE.md |

## Ch 28 (review ch27-sme)

File: `section-6-mini-swerve/28-can-bus-and-real-motor-controllers.md`

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch27-m1 | No mention of `setUpdateFrequency` / `optimizeBusUtilization` | FIX | S | After the CANivore sentence (line 98): your code sets each signal's rate; no chapter does it yet, so either name no chapter or add it to a later chapter's plan (old note promised Ch 31) | Ch 28 §28.2 |
| ch27-m2 | Explore asks about Tuner X generator, never answered | FIX | S | Add short "What about Tuner X's swerve generator?" callout in §28.8 intro, pointing to Ch 29's `TunerConstants` table (now at Ch 29 line 682) | Ch 28 §28.8 |
| ch27-m3 | Team robot's front-left inversion hint | FIX | S | Line 1350 callout: "On our team's Mini Swerve the front left needed both motors inverted; yours may differ: the table wins" (check sample first) | Ch 28 §28.9 |
| ch27-m4 | Split note and checkpoint | DONE | S | "How to split this chapter" at line 23, Checkpoint at line 1752 | Ch 28 |
| ch27-m5 | Tuner X green/purple card colors and year picker | HARDWARE | S | Open Tuner X 2026; else keep only red and yellow rows (lines 199 to 202) and reword line 209 "pick the newest 2026 firmware" | Ch 28 §28.4 Steps 3, 4 |
| ch27-v1 | Leftover button bindings print 17 joystick warnings | FIX | M | Add `CommandScheduler.getInstance().getDefaultButtonLoop().clear();` to `AutoLightTest.tearDown()` (and `MotorCheckTest`); not in book or solution yet | Ch 28 §28.11; ch28 and ch29 solution tests |
| ch27-v2 | Vendordep swept into the move-only commit | FIX | S | Before line 640: commit `vendordeps` first ("Ch28: Add Phoenix 6"), or use `git add src` for the move | Ch 28 §28.8 Step 1 |
| ch27-v3 | Git recap repeats `checkout -b`, uses `git add .` | FIX | S | Lines 1774 to 1781: drop `checkout -b`, use `git add src/.../DriveConstants.java` for the inversions commit | Ch 28 Git |
| ch27-v4 | Summary says "rotor rotations" | FIX | S | Line 1697: "(motor rotations, rotations per second, volts, amps, degrees)" | Ch 28 Summary |
| ch27-v5 | "Overwritten at the next deploy" | FIX | S | Line 258: "overwritten the next time the robot program starts (every deploy, and every power-on)" | Ch 28 §28.4 callout |

## Ch 29 (review ch28-sme)

File: `section-6-mini-swerve/29-swerve-kinematics.md`

| ID | Finding (short) | Status | Effort | Fix / reason | Files |
|---|---|---|---|---|---|
| ch28-m1 | `runVelocity` skips `ChassisSpeeds.discretize` | FIX | M | Line 1259 bullet: one sentence previewing `discretize` and "you will add it in Chapter 30"; Ch 30 has no `discretize` yet, so add it there too | Ch 29 §29.8; Ch 30 |
| ch28-m2 | Whole-file `DriveConstants` wipes measured inversions | FIX | S | Above lines 647 to 656 add `// Copy your driveInverted and steerInverted from Chapter 28 (Section 28.9).`; Step 1 note "put your Chapter 28 values back" | Ch 29 §29.8 Step 1 |
| ch28-m3 | Split note and checkpoint | DONE | S | "How to split this chapter" at line 24, Checkpoint at line 1786 | Ch 29 |
| ch28-v3 | Step 8 stopgap leaves a failing test before commit | FIX | S | Line 1309: "the build shows one failing test until Section 29.10 rewrites it; Simulate Robot Code still runs" | Ch 29 §29.8 Step 8 |
| ch28-v4 | Every wheel steers exactly 45 degrees, not a quarter turn | FIX | S | Line 1662: "they have to steer 45 degrees each (thanks to `optimize`, never more)" | Ch 29 §29.10 |
| ch28-v5 | "Almost no overshoot": one rebound of about 9 degrees | FIX | S | Line 424: "well under a tenth of a second, swing back once by about 10 degrees, settle within a fifth of a second" | Ch 29 §29.6 |
| ch28-v6 | Kinematics callout claims an impossible test-order failure | FIX | S | Line 678: make conditional ("a test that asked for zero speeds would start with angles another test left behind") | Ch 29 §29.8 callout |
| ch28-v7 | Practice 2 range equals `inputModulus`; hint misleads | FIX | S | Line 1729: "they should all agree; check 180 and -180 especially" (or change the range to -180 included, 180 excluded) | Ch 29 Practice 2; ch29 answer-key.md |
| ch28-v8 | Git recap repeats `checkout -b swerve-kinematics` | FIX | S | Line 1808: drop it or say "on the branch from Section 29.8" | Ch 29 Git |
| ch28-v9 | Inertia loads credited to TalonFX template | SKIP | S | Review downgraded to no action: the credit at line 1005 is right | none |
| ch28-v10 | Reflect 2 assumes wheels on a long robot roll at different speeds | FIX | S | Line 1795: expect "still the same: every corner of a centered rectangle is equally far from the center; the angles change"; update answer key | Ch 29 Reflect 2; ch29 answer-key.md |

## Counts

FIX 75, DONE 3, VERIFY-WEB 3, HARDWARE 1, SKIP 1 (83 MINOR items). Plus one coordinator MAJOR confirmation row (ch23-v1, still wrong, FIX), not counted.

