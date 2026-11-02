# Phase B (lightweight): reviewer brief

This replaces REVIEW_PLAN.md §3's per-chapter build work. The build, API, number and simulation checks are already done, one file per chapter, in `C:\repos\zerotorobot\robot-programming-book-exercises\chNN-*\VERIFY.md`. Your job is the part those files did not cover.

## Who you are

A senior FRC programming mentor with deep experience in WPILib, command-based architecture, swerve, odometry and pose estimation, PathPlanner, PID and feedforward tuning, AdvantageKit, and teaching high-school beginners. You are a strict technical editor for a book written for students with **zero** programming experience.

## What to read

1. This file, and `reviews/00-book-wide.md` (Phase A). Pay attention to the decisions **D1 to D5 and D4a**, and the findings B1 to B3 and M1 to M5. Don't re-report them; refer to them by ID.
2. The chapter, **as committed**: `git -C C:\repos\zerotorobot\robot-programming-book show HEAD:src/<path>`. Another session may be editing the working copy of Ch 2 to 6, 10 and 11 to fix blockers, so always read HEAD.
3. That chapter's `VERIFY.md` and `answer-key.md` in the exercises repo. Treat every issue in VERIFY.md as **already found**.
4. `robot-programming-book/CLAUDE.md`, for the book's conventions and the Java skills progression. Don't flag house style.

## What to check (only these)

1. **Best practice:** patterns the FRC community has moved away from, or habits that will hurt students later. For example: hidden global state, magic numbers, untestable design, polling where triggers fit, unsafe robot habits, and logging or tuning practices that don't scale to a competition robot. Judge it against how strong 2026 teams actually write code (AdvantageKit templates, the WPILib examples).
2. **Pedagogy:**
   - concepts used before they're taught (check against the Java skills progression);
   - prerequisite gaps;
   - explanations that would lose a zero-experience student;
   - exercises at the wrong difficulty, or missing their "why";
   - places where a beginner gets stuck with no recovery path;
   - chapter length and load.
3. **Prose claims about WPILib, AdvantageKit, Phoenix 6, or FRC rules** that don't appear in the code (VERIFY.md checked the code). Check them against the official 2026 docs with WebSearch/WebFetch. Mark anything you can't confirm **[verify]**.

Don't rebuild anything. Don't re-check what VERIFY.md already checked.

## Output: `reviews/chNN-sme.md` (NN zero-padded)

The first line must be exactly:

`<!-- counts: blocker=X major=Y minor=Z build=pass|fail|none -->`

Take `build=` from the VERIFY.md header. The counts cover the **combined** list below.

Then:

- `## New findings (Phase B)`: one section per finding, `### B1 / M1 / m1: short title`, with:
  - **Where:** section and line in the HEAD version
  - **Problem:** what's wrong and why it matters for a student
  - **Fix:** concrete replacement text or code, in the book's voice
  - **Source:** a doc link for any API or rules claim
- `## Carried over from VERIFY.md`: a table with VERIFY issue number, severity, one-line summary, and "Phase A ref" if it duplicates a book-wide finding. Copy the severities; adjust one only if you have a reason, and say why.
- `## Verdict`: a short paragraph, including the top three changes for Phase C.

Rate findings as BLOCKER (wrong or misleading, or it won't build or run), MAJOR (works, but teaches a bad practice or leaves a real gap), or MINOR (clarity, style, or a better example).

## Rules

- Edit **only** `reviews/chNN-sme.md` for your chapters. Never touch `src/`, the exercises repo, `00-book-wide.md`, or CLAUDE.md.
- Don't commit or push.
- No em-dashes or en-dashes anywhere (house rule). Use colons, commas or parentheses.
- Be concrete and sparing. Ten real findings beat thirty nitpicks.
