<!-- counts: blocker=1 major=1 minor=8 build=pass -->

# Chapter 10 SME Review (Phase B, lightweight)

**Chapter:** `src/section-2-driving-sensing/10-debugging-error-messages-and-git-archaeology.md` at HEAD (978 lines)
**Inputs:** `robot-programming-book-exercises/ch10-debugging-error-messages-and-git-archaeology/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This is one of the most useful chapters in the book for a rookie. "Push bugs up the table" (compile, then runtime, then logic), "fix the first error first", read, decide, write probes, "rule out the battery before blaming the code", and the `final` field as a crash moved into a compile error are exactly the habits strong teams try to build. The load is high (exceptions, the call stack, `null`, `DataLogManager`, and seven Git commands), but every idea is hands-on and the chapter says up front that it adds little robot behavior. That's a fair trade.

**Prose claims checked:**
- §10.4 line 229 ("an unhandled exception almost always means the team's code has a bug, and almost never means the hardware failed") matches the WPILib page: "In almost all cases, the root cause of an unhandled exception is code that isn't correctly implemented. It almost never implies that any hardware has malfunctioned." Source: [Reading stacktraces](https://docs.wpilib.org/en/stable/docs/software/basic-programming/reading-stacktraces.html).
- §10.8 line 631 (the two questions: when did it last work, and what changed since) is on the same page, nearly word for word.
- The bisect table (8, 30, 100, 1000 commits; 3, 5, 7, 10 tests) is ceil(log2 n). Correct.
- §10.7's "On a roboRIO, logs go to a USB drive if one is plugged in" and "AdvantageScope ... comes with WPILib" are right. Source: [On-robot telemetry recording](https://docs.wpilib.org/en/stable/docs/software/telemetry/datalog.html).

## New findings (Phase B)

### M1: The §10.10 walk-through and Reflect 1 still teach the encoder-swap bug

- **Where:** §10.10 line 802 ("Suppose the encoders read wrong today"), the bisect output at lines 813 to 814 and 827 to 832 (`Swap encoder channel order for consistency`), and Reflect 1, line 940 ("Swap left encoder channels to 5, 4").
- **Problem:** VERIFY 1 replaces the Build Part B planted bug with `return -leftEncoder.getDistance();`, because swapping channels changes nothing on an XRP. VERIFY's fix list names Part B's table, steps 3 and 7, and Ch 11 line 169. It doesn't name these three places. If they're left alone, the section that teaches bisect shows a bug that can't happen on the reader's robot, and Reflect 1 asks the student to rewrite a commit message for a change they never made. A careful student will notice and lose trust in both examples.
- **Fix:** Do these in the same edit as VERIFY 1.
  - Line 802: "Suppose the left distance reads backward today, but it was fine at your Chapter 9 commit, `c41e9a0`."
  - Lines 814 and 832: `[12b9007...] Clean up distance getters` and `    Clean up distance getters`.
  - Reflect 1: "The planted bug's commit message was `Tidy up encoder setup`. ... Then explain why a message that honestly described the change ("Negate left distance") might have led to the bug being caught in review."
- **Source:** VERIFY.md issue 1

### m1: "In Chapter 4 you met RioLog" goes stale once B3 lands

- **Where:** §10.4 "Where does the output appear?", line 233.
- **Problem:** The B3 fix in the working copy changes Ch 4 to say that prints appear in VS Code's **terminal** panel, and that RioLog is for the roboRIO in Chapter 26. Line 233 then opens by claiming the reader met RioLog in Ch 4 and has to correct it. After the fix, the paragraph corrects a mistake the book no longer makes.
- **Fix:** "In Chapter 4 you saw your prints appear in VS Code's **terminal** panel. That's because your Java code actually runs on your **laptop** and talks to the XRP over Wi-Fi (the Chapter 2 "Why firmware?" callout). So the Explorer's prints, warnings, and stack traces all appear there, in the same place as the build output." Keep the next paragraph about RioLog on the Mini Swerve.
- **Source:** Ch 4 working copy, lines 236 and 293 (the B3 fix); [WPILib: Programming the XRP](https://docs.wpilib.org/en/stable/docs/xrp-robot/programming-xrp.html)

### m2: The "log only when it changes" pattern still floods the log when the wall stop chatters

- **Where:** §10.7 "Logging events", lines 441 to 457, and the listing, lines 593 to 600.
- **Problem:** The pattern is right, but the wall stop's input is a noisy rangefinder against one threshold (see `ch09-sme.md` m4). Creeping up on the 20 cm line, `blocked` can flip every loop or two, and the log gets dozens of `Wall stop ON` / `Wall stop OFF` pairs in a second. That's exactly the "thousand lines that do not matter" the section warns about. Build Part A step 3 ("drive slowly at a wall") is the most likely way to trigger it, so a student may think the pattern is broken.
- **Fix:** Add after the "Read it aloud" paragraph: "If you creep up on a wall very slowly, you may see `ON` and `OFF` alternate several times. The pattern is working: the rangefinder's reading is wobbling across the 20 cm line, and the log is telling you so. That wobble is called **chatter**, and Chapter 21 shows two ways to calm it."
- **Source:** CLAUDE.md, Ch 21 concepts (chatter, debounce, hysteresis)

### m3: The bug-swap Collab doesn't tell authors to check that their planted bug actually shows up

- **Where:** Collab "Bug swap", line 962.
- **Problem:** VERIFY 1 is a lesson in itself: a planted bug that seems obvious in the code may have no visible effect on the XRP, and then bisect "finds" an innocent commit. The partner then wastes the session, and both students conclude that bisect doesn't work. The fix costs one sentence.
- **Fix:** Add: "Before you push, run your own test on the bad commit and on the commit before it. If you can't see the difference on the robot, your partner can't either: pick a different bug. Then write your test down, in one exact sentence, and give it to your partner along with the branch name."
- **Source:** VERIFY.md issue 1

### m4: A debugging chapter for a laptop-run robot never mentions breakpoints [verify]

- **Where:** §10.6 "A few more techniques", lines 396 to 401.
- **Problem:** On the XRP, the robot program is a desktop Java process, so VS Code's debugger can pause it at a line and show every variable. For a zero-experience student, watching `blocked` and `safeForward` in a Variables panel is often the moment the call stack and `null` click. The chapter's probe-and-log approach is the right default for robots, and it's what AdvantageKit replay builds on in Ch 17 and Ch 24, but a single paragraph would round it out. The catch: while the program is paused, the robot loop stops, and Motor Safety cuts the motors after 0.1 s. That's a nice tie-in to the Ch 12 callout. I couldn't confirm in the 2026 docs that **WPILib: Simulate Robot Code** attaches the debugger. The WPILib debugging page describes **Debug Robot Code** for the roboRIO only.
- **Fix:** If it works, add a bullet: "**Pause the program with a breakpoint.** Click in the margin left of a line number to set a red dot, then run the program. When Java reaches that line, it pauses and VS Code shows every variable's value. The robot stops while you look (Motor Safety, Chapter 12), so use breakpoints on the bench, never while the robot is driving toward something. On a competition robot, logs do this job instead, because you can't pause a match."
- **Source:** [Debugging a Robot Program (WPILib)](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/debugging-robot-program.html)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | BLOCKER | The Build Part B planted bug (`new Encoder(4, 5)` to `(5, 4)`) changes no reading on the XRP, so honest bisect answers name `Log end of auto`. Being fixed in the working copy: the planted bug becomes `return -leftEncoder.getDistance();`. Step 7 and Ch 11 line 169 must follow, and so must the places in M1 above | none |
| 2 | MINOR | Example line numbers in §10.3 to §10.5 (101, 94, 54, 31, 23) match neither the Ch 9 nor the Ch 10 listing. "Might not have been initialized" points at the constructor's closing brace | none |
| 3 | MINOR | The §10.4 stack trace has a roboRIO bottom (`lambda$startRobot$0`, `Thread.run`). The XRP trace ends in `RobotBase.startRobot` and the student's own `Main.main` | none |
| 4 | MINOR | The §10.3 compile error is missing GradleRIO 2026's `Compilation Error!` banner and uses an old Gradle line ("see the compiler error output for details") | none |
| 5 | MINOR | A **missing** `}` gives `';' expected` and `reached end of file while parsing`, not `class, interface, enum, or record expected` (that's an **extra** `}`). Practice 1.5's "first error" invites a wrong `;` | none |
| (not counted) | | Line 83 "a deploy or connection error" recalls Ch 2's deploy step. Being fixed in the working copy: "deploy" becomes **Simulate Robot Code** for the XRP | B3 |
| (not counted) | | Line 59 "Open SmartDashboard. Your saved layout..." and line 338 "Your SmartDashboard is the tool for this": Elastic layout | D4, M2 |

Also note (not counted): the "New season, new WPILib?" callout (line 55) says "one WPILib year" without naming it. Per D1 and D5, it should say "This book uses WPILib 2026.2.1 (Chapter 2). If VS Code offers to update the project to a newer year, say no." Phase A M3 lists Ch 1, 2 and 26 for this rule but not this callout.

## Verdict

Chapter 10 builds as printed, and its debugging advice is what you would want every rookie to absorb. The one thing that breaks it is the bisect lab: the planted bug is invisible on an XRP (VERIFY 1), and that fix is incomplete unless the §10.10 walk-through and Reflect 1 change with it (M1). The rest is accuracy that matters here more than anywhere: the stack trace, the compiler output, and the line numbers are what the student copies from, in a chapter whose whole lesson is "read the message exactly". Top three changes for Phase C:

1. Finish the planted-bug swap everywhere it appears: Part B, §10.10, Reflect 1, and Ch 11 line 169 (VERIFY 1, M1). Tell Collab authors to test their own bug first (m3).
2. Replace the §10.3 and §10.4 sample output with the real XRP and GradleRIO 2026 text, with matching line numbers, and fix the missing-brace row (VERIFY 2 to 5).
3. Rewrite line 233 to match the B3 fix to Ch 4 (m1), and add the chatter note to the event-logging pattern (m2).
