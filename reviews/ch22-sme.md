<!-- counts: blocker=0 major=2 minor=11 build=pass -->

# Chapter 22 SME Review (Phase B, lightweight)

**Chapter:** `src/section-4-command-based/22-unit-testing-robot-code.md` at HEAD (1,549 lines)
**Inputs:** `robot-programming-book-exercises/ch22-unit-testing-robot-code/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

A strong chapter, and one of the best-designed in the book. It earns testing with a story (the Tuesday "cleanup" that flips a sign), then teaches the habit that matters most for a competition codebase: split each job into a pure decision and a thin part that gathers facts. `FollowLine.decideNextState()` becoming a `static`, package-private pure function is exactly how strong teams make state machines testable. The test doubles are the right ones for 2026 (a hand-written fake on the IO seam, `DrivetrainIOSim` for physics, no mocking library), the simulation tests pause and step the clock the way WPILib's own examples do, and the "red first" and boundary-value habits are taught on purpose, not in passing. The Collab (two green PRs, one red `main`) is a genuinely good lesson about stale checks. The Java load is heavy (book-wide M4 lists it) but every new idea is used immediately on the robot.

**Prose claims checked** (VERIFY.md checked the code, the API, the CI action versions and the YAML):
- "the XRP's sensor classes do not have a `close()` method" (line 1188): right. In the 2026.2.1 `xrpVendordep-java` sources only `XRPGyro` has `close()`; `XRPReflectanceSensor`, `XRPRangefinder`, `XRPOnBoardIO` and `XRPMotor` do not.
- "Private repositories on a free account get a monthly allowance of runner minutes" (line 1208): right (GitHub Free includes Actions minutes for private repos).
- "GitHub only enforces rulesets on public repositories for free accounts ... GitHub Pro, which students can get free through the GitHub Student Developer Pack" (line 1296): right, per the linked rulesets page and the Student Pack.
- "the PID controllers ... assume 20 ms between loops" (line 889): right; `PIDController`'s default period is 0.02 s.
- Every Additional Resources link resolves (checked 2026-11-01: WPILib Unit Testing, JUnit 5.10.1 user guide, GitHub's Java-with-Gradle tutorial, the rulesets page, Fowler's test pyramid).

## New findings (Phase B)

### m1: `setup-gradle` only saves its cache from the default branch

**Where:** §22.9, line 1257 ("It remembers downloaded files between runs, so after the first run, the runner does not download all of WPILib again").

**Problem:** By default, `gradle/actions/setup-gradle` writes its cache only from jobs on the default branch (`main`); jobs on other branches read the cache but never save one. The student's first runs are all on `unit-tests` (Build steps 9 to 11, and the "See it go red" branch), before anything is merged, so every one of those runs downloads WPILib again and takes the full "few minutes". A student who reads "after the first run" and watches the second run take just as long will think something is broken. It starts working as promised only after the PR is merged and `main` has run once.

**Fix:** "It saves downloaded files between runs, so the runner does not download all of WPILib every time. (It saves them only from runs on `main`. Until your first pull request is merged, every run downloads everything; after that, branch runs reuse what `main` saved.)"

**Source:** [setup-gradle docs: caching](https://github.com/gradle/actions/blob/main/docs/setup-gradle.md) ("will only write to the cache from Jobs on the default (`main`/`master`) branch")

### m2: The forward promise names a `SwerveModule` class the Mini Swerve never has

**Where:** §22.10 "Tests from here on", line 1328 ("`SwerveModule` and the kinematics get unit tests from the first day, on fake IO layers").

**Problem:** Ch 27 and Ch 28 call the class `Module` (package `frc.robot.subsystems.drive`), tested by `ModuleTest` on `FakeModuleIO`, plus `SwerveMathTest` and `DriveTest` (CLAUDE.md Ch 27 and Ch 28 entries). A student who searches for `SwerveModule` later will not find it, and `SwerveModuleState` (a different WPILib class) makes the wrong name more confusing. Also, Ch 27 does not test from the first day in the sense the sentence implies: it has 11 tests on fakes, then Ch 28 rewrites the first `ModuleTest` in wheel units.

**Fix:** "Swerve math is much harder to get right than tank drive, and much harder to check on the floor: each swerve `Module` and the drive's kinematics get unit tests on fake IO layers as they are written (Chapters 27 and 28), exactly like `DrivetrainTest`."

**Source:** CLAUDE.md, Build progression, Ch 27 and Ch 28

### m3: A tab in the workflow file does not make the workflow "never run"

**Where:** Build Diagnose table, line 1432 ("On GitHub: the workflow never runs | ... or it has a tab in it").

**Problem:** A wrongly named path does make the workflow never run. But a workflow file that is in the right place and has a YAML error (a tab, a bad indent) does show up: GitHub lists a failed run on the Actions tab with an "Invalid workflow file" error that names the line. Lumping the two together sends a student looking in the wrong place, when GitHub has already pointed at the line. [verify] the exact wording on a test repository.

**Fix:** Split the row: "On GitHub: the workflow never runs | The file is not at exactly `.github/workflows/build.yml` (check the dot, and that `workflows` is plural)" and "On GitHub: a red run that says **Invalid workflow file** | A YAML mistake: a tab, or a line indented one space too many or too few. The error names the line."

**Source:** [GitHub Docs: Workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | §22.8 `FOLLOW_LINE_LENGTH_METERS` experiment passes (24 green) because `END_POSE` moves with the constant; shorten only the pretend tape instead | |
| 2 | MAJOR | The course test cannot tell whether leg 3 ran (the no-line course ends inside every tolerance); add an assert only leg 3 can satisfy and fix the Diagnose row | |
| 3 | MINOR | "When tests pass, Gradle says nothing": GradleRIO prints every `PASSED`, each test's `STANDARD_OUT`, and joystick warnings | |
| 4 | MINOR | The allocation message is `Analog Input 2 previously allocated`, not `0` | |
| 5 | MINOR | Diagnose "`DriveDistance never finished`": neither listed cause gives that message | |
| 6 | MINOR | Without `setAutonomous(true)` the claimed LED flicker does not happen; the reason to keep it is different | |
| 7 | MINOR | The course loop starts only because a simulated `DigitalOutput` starts true; say so | |
| 8 | MINOR | A `@Test` with parameters fails with `ParameterResolutionException`, it is not skipped | |
| 9 | MINOR | Practice 4 breaks all fourteen existing `decideNextState` calls, and only the "3" test goes red | |
| 10 | MINOR | Git step: `git status` shows only `.github/` by then; the tests were committed earlier | |

Covered by Phase A, not counted: "Build, deploy, drive, watch, decide" (line 27) is **B3**; the next-chapter teaser naming SmartDashboard and Shuffleboard (line 1549) is **m2/D4**. The Java load (JUnit, assertions, pure functions, dependency injection, `this(...)`, YAML in one chapter) is **M4**; it is well paced here, and a checkpoint tag at the end of the chapter (M4's suggestion) would help most at Build step 8, where the course test depends on every earlier chapter.

## Verdict

Teaching quality and best practice are both high: pure decision functions, tests on the IO seam, a paused simulated clock, red before green, boundary values, CI on every push and pull request, and an honest section on what tests cannot prove. The two majors are both in the integration test, and both come from the same blind spot: `END_POSE` and leg 2's maximum distance line up, so the test checks less than its name says. My three findings are small clarity fixes about GitHub and one forward reference. Top three changes for Phase C:

1. **VERIFY 2:** give `ObstacleCourseTest` an assert that only a real leg 3 can pass, and fix the Diagnose row. It is the book's model integration test, and right now it passes with no line at all.
2. **VERIFY 1:** change the "break it" experiment to shorten only the pretend tape, so the failure the book prints is the one the student sees.
3. **VERIFY 3 with m1:** describe what the terminal and GitHub really show (every `PASSED` line, and branch runs that redownload until `main` has run once), so a beginner's first CI experience matches the text.
