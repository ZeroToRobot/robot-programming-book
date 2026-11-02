<!-- counts: blocker=0 major=1 minor=10 build=pass -->

# Chapter 11 SME Review (Phase B, lightweight)

**Chapter:** `src/section-2-driving-sensing/11-collaboration-and-merge-conflicts.md` at HEAD (890 lines)
**Inputs:** `robot-programming-book-exercises/ch11-collaboration-and-merge-conflicts/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This chapter teaches team Git the way good FRC teams practice it: `main` always works, short feature branches, PRs with a what/why/how-tested description, review as kindness plus a checklist, "build after every merge", and merge (not rebase) as the one book-wide rule. The three-way merge table and the "keep both, combine, choose one" framing are the clearest beginner treatment of conflicts I've seen. The Java load is light and well chosen: Javadoc, plus overloading as "adding without breaking", with WPILib's `getLeftBumper()` deprecation as the real-world example. Length (890 lines) is fine for a chapter that needs no robot.

**Prose claims checked:**
- GitHub won't let you approve your own PR (line 185), collaborator invitations expire after 7 days (line 767), and **Settings > Collaborators > Add people** (line 766) are all current GitHub behavior.
- Draft PRs (line 143): since 2025 they work in private repositories on the free plan too, so the line needs no plan caveat. Source: [GitHub changelog, 2025-05-01](https://github.blog/changelog/2025-05-01-draft-pull-requests-are-now-available-in-all-repositories).
- Protected branches need a paid plan for private repositories (line 684): consistent with GitHub's docs. Source: [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## New findings (Phase B)

### M1: The Build needs a partner, but the next chapter's code depends on it, and a solo reader has no way through

- **Where:** Exercises intro, line 708 ("These exercises need a partner"), and the Build pair lab, lines 751 to 813. Ch 12 §12.7 line 550 starts "from the end of Chapter 11 (the pair lab left `TURN_SCALE` and `MAX_REVERSE_SPEED` in `teleopPeriodic()`)", and Ch 19's `DriveWithSticks` carries the same rules.
- **Problem:** A student reading alone (a rookie over the summer, a small team with one programmer, someone whose partner dropped out) can't do Parts B to E, and the cumulative build then won't match Ch 12's listing. The book gives no fallback, and GitHub won't let a solo author approve their own PR, so even improvising stalls at Part D step 1.
- **Fix:** Add a callout before Part A:
  > **Working alone?**
  >
  > You can play both roles. Clone your own repository a second time into a folder called `XRPExplorer-teammate`, and open it in a second VS Code window. Do the owner's steps in your usual folder and the teammate's steps in the second one. You won't be able to **Approve** your own PR on GitHub, so leave a **Comment** review instead, then merge. You'll get the same conflict and resolve it the same way, and your Explorer ends up with both features, which Chapter 12 needs. Find a partner for the Chapter 20 pair lab if you can.
- **Source:** Ch 12 at HEAD, line 550; CLAUDE.md Build progression (Ch 11, Ch 19)

### m1: The third "test after a merge" example would be a text conflict, not a semantic one

- **Where:** §11.9, habit 3, line 661 ("two features both changing `SLOW_MODE_SCALE` for different reasons, only shows up when you drive").
- **Problem:** If two branches both change the `SLOW_MODE_SCALE` line, Git reports a merge conflict on that line, the "choose one" case from §11.8. It's not a clean merge, so the example contradicts the section it illustrates, and a sharp student will say so.
- **Fix:** "A semantic conflict that still builds only shows up when you drive. For example, one teammate lowers `SLOW_MODE_SCALE` to `0.3` so aiming is easier, and another adds `TURN_SCALE` on a different line for the same reason. Git merges both cleanly, and now a slow-mode turn is `0.3 x 0.7`, about a fifth of full speed: too slow to aim at all. The smoke test from Chapter 10 is a perfect post-merge check."
- **Source:** none needed (§11.7's own three-way table)

### m2: "The documentation you have been reading on the WPILib website" mixes up the docs site and the API reference

- **Where:** Intro, line 9, and §11.5 point 2, line 233 ("Every page of the WPILib documentation you have opened since Chapter 7 ... was generated from doc comments").
- **Problem:** Most WPILib links in this book go to `docs.wpilib.org`, which is hand-written prose, not Javadoc output. Only the API reference pages at `github.wpilib.org/allwpilib/docs/...` (the `XboxController` and `XRPGyro` pages) are generated from doc comments. A student who opens a docs.wpilib.org tutorial looking for the `@param` lines they just learned about will be confused, and knowing the two sites apart is a real skill for later.
- **Fix:** Line 233: "The `javadoc` tool turns them into web pages. WPILib's **API reference** (the `XboxController` and `XRPGyro` pages you opened in Chapter 7, at github.wpilib.org) was generated this way from the comments above WPILib's own methods. The tutorials at docs.wpilib.org are written by hand. You'll use both: tutorials to learn an idea, the API reference to look up one method." Line 9: "...the special comments that turn into WPILib's API reference pages".
- **Source:** [WPILib Java API reference](https://github.wpilib.org/allwpilib/docs/release/java/index.html)

### m3: The review checklist has no robot-safety question

- **Where:** §11.4 "What to look for" table, lines 191 to 200.
- **Problem:** Every row is a general code-quality check. Robot code reviews also ask the question that matters most on a 125 lb robot: can this change make the robot move when nobody expects it? The book has just taught the wall stop (Ch 9) and will teach Motor Safety in Ch 12. Adding the row now means the habit is there before students review an arm or a climber.
- **Fix:** Add a row: `| Could this make the robot move unexpectedly? | A change that drives the motors in disabled-looking code, removes a wall stop check, or flips the sign of a motor command |`. Add one line under the table: "If a change affects how the robot moves, the PR description's 'How I tested it' should say it was driven, not only built."
- **Source:** none needed

### m4: Students can get branch protection on private repositories for free [verify]

- **Where:** §11.10, line 684 ("private repositories need a paid plan. Ask your mentor how your team is set up.").
- **Problem:** The statement is true, but it leaves students thinking the rule can't be enforced on their own private Explorer. Students can get GitHub Pro free through the GitHub Student Developer Pack, and Pro includes protected branches on private repositories. Ch 22's CI ruleset step hits the same wall ("private repos need GitHub Pro"), so the tip pays off twice. I couldn't confirm whether GitHub currently offers FRC teams a free Team plan for their organization.
- **Fix:** Add: "If you are a student, the free **GitHub Student Developer Pack** includes GitHub Pro, which lets you protect `main` on your own private repositories too."
- **Source:** [GitHub Student Developer Pack](https://education.github.com/pack)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | "Now there is exactly one place that talks to `diffDrive`" is false while `Drivetrain.stop()` still calls `diffDrive.arcadeDrive(0.0, 0.0)`. Reflect 3's premise is half true already | none |
| 2 | MINOR | "Reverse is capped at half" ignores squaring: -0.5 into the two-number `arcadeDrive` is about quarter power (1/16 in slow mode) | none |
| 3 | MINOR | The §11.7 `--graph` picture leaves out GitHub's `Merge pull request #1` commit and the Part A commit | none |
| 4 | MINOR | §11.9's rename "updates the one call" but `updateDashboard()` has a second call, so Maya's branch doesn't build as described | none |
| 5 | MINOR | Practice 2.3: deleting `getAccelZ()` breaks Partner A's own build (the `Accel Z (g)` widget), and the natural spot for B's widget gives a conflict, not a clean merge | none |
| 6 | MINOR [verify] | The `CONTRIBUTING.md` link probably won't appear on the `team-rules` PR until the file is on the default branch | none |
| (not counted) | | §11.4 line 169 says the Ch 10 planted bug "swapped two numbers in `new Encoder(4, 5)`". Being fixed in the working copy: the planted bug becomes `return -leftEncoder.getDistance();`, so this line becomes "It negated the left distance in `getLeftDistanceMeters()`". Counted in Ch 10 | Ch 10 VERIFY 1 |
| (not counted) | | B3 ("deploy" becomes **Simulate Robot Code** for the XRP): no hits in Ch 11, which says "run the program" (Part D step 7) | B3 |

## Verdict

Chapter 11 is accurate and well paced. Every Git listing replays word for word, and the GitHub steps match the current UI. Its weaknesses are a few examples that don't quite do what the prose says (VERIFY 2 and 4, m1) and a hard dependency on having a partner. That last one is the only real gap: the pair lab's result is in Ch 12's starting code, so a solo reader needs a path through. Top three changes for Phase C:

1. Add the "Working alone?" callout so every reader leaves with the merged `TURN_SCALE` and `MAX_REVERSE_SPEED` that Ch 12 starts from (M1).
2. Fix the examples that a student will try and find false: the second `isObstacleWithin` call (VERIFY 4), the squared reverse cap (VERIFY 2), the `SLOW_MODE_SCALE` "semantic" example (m1), and `getAccelZ()` (VERIFY 5).
3. Update line 169 to the new Ch 10 planted bug, and add the robot-safety row to the review checklist (m3).
