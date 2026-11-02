<!-- counts: blocker=0 major=3 minor=16 build=pass -->

# Chapter 25 SME Review (Phase B, lightweight)

**Chapter:** `src/section-5-advantagekit-capstone/25-xrp-capstone-project.md` at HEAD (1648 lines)
**Inputs:** `robot-programming-book-exercises/ch25-xrp-capstone-project/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

A strong capstone. It teaches the way a good team works (acceptance criteria first, a design doc reviewed as a PR, tests before code, pair programming, a tuning log, a release built from committed code with the SHA in every log), and it does it with one small feature instead of a big one. `ParkAtWall` reuses every earlier pattern (enum states with `isDone()`, a pure static decision, a thin fact-gathering part, a tunable gain read every loop, outputs every loop), and the record is introduced for a real reason: one decision with two parts. The release section (gversion, `GitDirty`, annotated tags, detached HEAD, semver) is current practice for 2026 teams and matches the AdvantageKit Version Control page. D2 is applied (line 1432 names Kraken X60, Talon FX, CANcoder, Pigeon 2), M1 is applied (line 1313 says `2026.2.1`), and B3 and D4 have no leftovers (VERIFY.md checked).

**Prose claims checked** (beyond what VERIFY.md checked):
- `XRPRangefinder.getDistanceMeters()` is `(voltage / 5.0) * 4.0`, so 5 V is 4 m (line 96): right.
- AdvantageKit recommends gversion and its templates use it (line 1151); the event-deploy auto-commit task (line 1228): right. Source: [AdvantageKit: Version Control](https://docs.advantagekit.org/getting-started/installation/version-control).
- A workflow with `on: push` and no branch filter runs for pushed tags (line 1333): right. Source: [GitHub: Events that trigger workflows](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#push).
- A plain `git push` does not send tags; `git checkout <tag>` gives detached HEAD with the quoted message (lines 1329, 1384 to 1390): right. Source: [Pro Git: Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging).
- VS Code's built-in Markdown preview does not draw Mermaid (line 265): right without an extension.

## New findings (Phase B)

### M1: The "safety distance" is said to protect against a lost echo, but it is longer than the wall gap

**Where:** §25.2 line 101 ("If the echo never comes back, the reading jumps toward 4 meters, and the robot drives on, looking for a wall that is right in front of it. That is why leg 4 needs a safety distance."); §25.7 Step 1 line 828 ("The safety distance is twice the gap..."); the design doc's Risks (lines 232 to 235); the §25.8 tuning table row "Says `NO_WALL` right away, or drives on past the wall" (line 1101).

**Problem:** `LEG_4_MAX_DISTANCE_METERS` is 0.60 and `WALL_GAP_METERS` is 0.30. A robot whose rangefinder stops hearing the wall drives 0.60 m at full auto speed, so it reaches the wall long before the safety distance runs out. The safety distance only stops a robot that **never** had a wall in front of it (no wall, or leg 3 ended crooked). The chapter teaches the opposite, and the tuning table lists "drives on past the wall" as a sensor problem, not a collision. On a 0.2 m/s XRP that is a bump. In Ch 33 the same pattern (drive at a target until a sensor says stop) runs on a Mini Swerve at several meters per second, and "a distance limit covers sensor dropout" is exactly the wrong lesson to carry there. Teams that do this well cross-check the sensor against odometry, or treat an implausible jump as a fault.

**Fix:** Correct the prose, and give the student one sentence of the real rule. In §25.2, replace the last two sentences of the bullet with: "If the echo never comes back, the reading jumps toward 4 meters, and the robot thinks the way is clear. The safety distance in Section 25.7 stops a robot that never finds a wall at all. It does **not** stop one that loses an echo 15 cm from the wall: that robot is inside the safety distance and drives on. The defense is a wall the sensor can hear (below), and on a faster robot, a check that the sensor agrees with the encoders." In §25.7 Step 1, after line 828: "Notice what it cannot do: it is longer than the gap, so it never stops a robot from reaching the wall. That is the rangefinder's job." In the tuning table, split the row: "Says `NO_WALL` right away" (sensor not hearing the wall) and "Drives into the wall" (the echo dropped out near the wall: stop, fix the wall, and never raise the safety distance to hide it). Optionally add Extension F: "Trust, but check: if the reading jumps up by more than 0.20 m in one loop while the encoders say the robot moved forward, go to `NO_WALL`," which is a pure-function change with its own tests.

**Source:** book §25.7 constants (lines 819 to 823); [WPILib: Ultrasonics, software](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/ultrasonics-software.html)

### M2: The two-meeting plan has no cut line, so "behind" has no recovery path

**Where:** Introduction line 20 ("The plan fits in two lab meetings"); §25.1 "The two meetings" table (lines 55 to 61); the "Ahead, or behind?" callout (line 65: "do the capstone with the smallest scope that meets the eight checks").

**Problem:** Meeting 1 holds a design doc written, PR'd, reviewed with two comments, fixed, and merged; then three test files, the whole command, the pretend wall with ray casting, the course and chooser changes, a deliberate failure, an AdvantageScope check, and a second PR with review. Meeting 2 holds floor tuning, gversion, a README rewrite, a release PR, three clean runs (which restart on any failure), log checks, a replay comparison, tagging, and the release page. For two zero-experience students that is closer to four meetings than two. The callout's escape hatch is empty: the "smallest scope that meets the eight checks" **is** the whole chapter, because the eight checks name every step. A pair that misses the plan has nothing to drop and no sense of whether they are on time. (M4 covers chapter length book-wide; this is about the schedule the chapter promises.)

**Fix:** Change line 20 to "The plan takes **two to three lab meetings**, with the video finished at home." In §25.1, add a time column to the meetings table (rough minutes per section) and a third row, "Meeting 3 (if you need it): three clean runs, tag, release." Replace the callout's second half with an explicit cut line: "If you are behind, these can wait until after `v1.0.0`, because no acceptance criterion depends on them: the Mermaid diagram (Section 25.3), watching leg 4 live in AdvantageScope (Section 25.7 Step 6), the teleop wall-stop check, and the README sections beyond **Running it** and **Authors**. Never cut the tests, the design doc review, or the three clean runs: they are the capstone."

**Source:** CLAUDE.md "Teaching philosophy"; Phase A M4

### m1: `ParkAtWall` holds whatever heading leg 3 ended on, not the course's heading

**Where:** §25.6 listing lines 680 and 703 (`holdHeadingDegrees = drivetrain.getHeadingDegrees()`), the walkthrough at line 790, and the design doc's third risk (lines 234 to 235).

**Problem:** `FollowLine` ends by losing the line, often mid-correction, so the robot can finish a few degrees off the line. `ParkAtWall` then locks in that crooked heading and drives the rangefinder's beam at the wall at an angle, which is the third risk in the design doc. The book already knows the right heading: `CourseConstants.TURN_HEADING_DEGREES`, the direction the line runs. Holding the start heading was right for `DriveUntilLine` in Ch 19, which had no better target; here, holding the known course heading squares the robot up as it parks, so the "risk" mostly goes away. It also reads well as a design-doc lesson: a review question ("why hold a heading we know might be wrong?") the doc could have caught.

**Fix:** Add a `targetHeadingDegrees` constructor parameter, pass `CourseConstants.TURN_HEADING_DEGREES` from the course and from **Park At Wall Only**, and drop `holdHeadingDegrees` from `initialize()`. In the walkthrough: "The heading hold is `DriveUntilLine`'s, with one change: it holds the course's heading, 90 degrees, not the heading it started with. Leg 3 can end a few degrees crooked, and the rangefinder only sees straight ahead, so squaring up as it drives is worth one more parameter." Update the design doc's third risk to "Leg 3 ends crooked: `ParkAtWall` turns back to 90 degrees as it drives." If the Build must stay as is, add this as a design-review question in §25.3 Step 3 instead.

**Source:** book Ch 19 `DriveUntilLine`; CLAUDE.md Ch 25 entry

### m2: "Write all the tests first" is called test-driven development, which is one test at a time

**Where:** §25.5 line 436 ("write **all** the tests for a new feature before its code exists. That way of working is called **test-driven development**"); the summary (line 1468).

**Problem:** TDD as its originators describe it is a short loop: write **one** failing test, make it pass, refactor, repeat. Writing a whole list of tests up front and then the code is "test-first." The chapter's approach is fine for a capstone where the design doc fixed every answer, but a student who later reads about TDD will find the book's definition doesn't match.

**Fix:** "...write the tests for a new feature before its code exists. Strict **test-driven development** (Chapter 22 named it) does that one test at a time: one red test, just enough code to make it green, tidy up, repeat. Here the design doc has already decided every answer, so you write all six first, which is called **test-first**. Extension A is a good place to try the one-at-a-time loop."

**Source:** [Martin Fowler: Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

### m3: The `Co-authored-by:` example uses the old noreply address format

**Where:** §25.6 lines 802 and 805; §25.7 line 1056; §25.8 line 1117; Git exercise lines 1580 to 1595.

**Problem:** GitHub accounts created after July 2017 have a noreply address of the form `ID+USERNAME@users.noreply.github.com`. Every account a student has today is that kind. A student who copies the book's `alexchen@users.noreply.github.com` pattern with their partner's username may get a commit that does not show the partner, and the chapter's promise ("the commit shows both partners' pictures") fails with no hint why.

**Fix:** Change the examples to `Co-authored-by: Alex Chen <12345678+alexchen@users.noreply.github.com>` and add to line 805: "It starts with a number and a `+`. Copy it exactly from **Settings** > **Emails**; do not build it from the username."

**Source:** [GitHub Docs: Setting your commit email address](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address); [Creating a commit with multiple authors](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)

### m4: The Release Swap assumes the other pair can see a private repository

**Where:** Collab: Release Swap, steps 1 to 4 (lines 1619 to 1622).

**Problem:** Ch 22 already allows for private repositories (rulesets need GitHub Pro on private repos), and many teams keep student repos private. Then the other pair's link shows a 404: they can't clone the release or open an Issue, and the lab stalls on its first step.

**Fix:** Add to step 1: "If your repository is private, first add the other pair as collaborators with **Read** access, or (with your mentor's OK) make the repository public. Remove the access after the swap if you like."

**Source:** [GitHub Docs: Inviting collaborators](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository)

### m5: The GitHub release form's checkbox is named "Set as a pre-release" [verify]

**Where:** §25.10 Step 5, line 1343 ("Leave **This is a pre-release** unchecked").

**Problem:** GitHub's current release form labels the checkboxes **Set as a pre-release** and **Set as the latest release**. A beginner looking for the exact bold words can't find them. [verify against the live form]

**Fix:** "Leave **Set as a pre-release** unchecked, check that **Set as the latest release** is ticked, and click **Publish release**."

**Source:** [GitHub Docs: Managing releases in a repository](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | With no tape at all the robot still parks (leg 2 drives to about where the line ends), so `courseParksAtTheWall` cannot tell whether legs 2 and 3 found the line; line 975 is wrong too | |
| 2 | MINOR | The test reads the rangefinder before any coasting (0.1197), and the state flips at or below 0.12, not "just above" | |
| 3 | MINOR | Outside `ParkAtWall`, assigning the field gives "has private access", not "cannot assign a value to final variable" | |
| 4 | MINOR [verify] | "More than 100 ms, five whole loops" is roboRIO-sized; on the laptop it was about one loop | |
| 5 | MINOR | gversion counts a staged but uncommitted change as clean (`DIRTY = 0`) | |
| 6 | MINOR | `NO_WALL` stays `NO_WALL` has no test, so "every arrow has a test" is false | |
| 7 | MINOR | `git diff main` also shows `reflections.md` | |
| 8 | MINOR | The design doc's plain-text States lines run together when rendered | |
| 9 | MINOR | Wrong cross-references (21.3 for nested enums, "Exercise 4", "Section 24.11's Practice 2") and the Ctrl+click path to `ImmutableDistance` | |
| 10 | MINOR | The `buildObstacleCourse()` listing leaves its Javadoc saying nothing about parking | |
| 11 | MINOR | `() -> pose` is ten characters, not eight | |
| 12 | MINOR [verify] | AdvantageKit's templates write `GitDirty` as a switch statement, not a switch expression | |

No Phase A finding is duplicated here. B1 (hand-off table) and M1 (`2026.2.1`) are already applied in this chapter and were re-checked: both are right at HEAD.

## Verdict

The best-structured chapter in the book for "how real teams work," with current, defensible practice throughout and a feature small enough to finish. The two new majors are about trust: the chapter tells students a safety distance protects them from a sensor dropout when it does not (M1), and it promises two meetings with no way to cut scope when a pair runs over (M2). Together with VERIFY 1 (a course test that passes with no line at all), they are the places where the capstone's own message ("prove it, don't feel it") is undercut. Top three changes for Phase C:

1. Fix the safety-distance reasoning in §25.2, §25.7 and the tuning table (M1), and add the line-followed assert to `courseParksAtTheWall` (VERIFY 1).
2. Make the plan "two to three meetings" with time estimates and an explicit cut line (M2).
3. Hold the course heading in `ParkAtWall` (m1) and add the `noWallStaysNoWall` test so criterion 2 is true (VERIFY 6).
