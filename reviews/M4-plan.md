# M4 plan: split Ch 17, renumber to 40 chapters, checkpoints, meeting splits

Decisions (Devang, 2026-11-01): split Ch 17 into two chapters; checkpoints are mentor-only (from the private exercises repo); add a "How to split this chapter" note to every chapter over about 1,400 lines.

Nothing here is written yet. This is the outline for approval.

---

## 1. The split

Today's Ch 17 (1,465 lines) teaches five Java ideas plus AdvantageKit, the IO refactor and a physics model. It already has a natural seam: Build step 4 ("the real robot drives exactly as before", first commit) ends the refactor, and Section 17.8 starts the simulator. The split goes there.

### New Ch 17: AdvantageKit and the IO Layer (about 800 lines, real XRP only)

Java: **interfaces** (with `implements`, `@Override`) and **default methods**. `@AutoLog` annotation processing and the nested inputs class stay as light touches, because the code needs them.

| New section | Comes from | Change |
|---|---|---|
| Intro | old intro | Rewritten. The motivation is no longer simulation. It is "your robot should keep a flight recorder" (the Ch 16 SysId log was the first taste), and "the hardware should sit behind a seam so it can be swapped". It forward-points to Ch 18 (a simulated robot) and Ch 27 (the roboRIO). The XRP is needed the whole chapter |
| 17.1 Finding the Seam: Logic Above, Hardware Below | old 17.3 | The "why the seam goes here" reasons lead with recording inputs and swapping hardware, and name the simulator as the next chapter's payoff |
| 17.2 New Java: Interfaces | old 17.4, plus "Default methods" from old 17.5 | The `DistanceSensor` example stays. Default methods move up here. Their warning about a forgotten method stays |
| 17.3 AdvantageKit: A Flight Recorder | old 17.6 | Unchanged except section numbers |
| 17.4 The Drivetrain IO Layer | old 17.7 | `Drivetrain(DrivetrainIO io)` gets a one-paragraph preview: "the field's type is the interface, not the class; Chapter 18 shows why that matters". The "Check" subsection stays as the chapter's finish line |
| 17.5 A First Look at AdvantageScope | old 17.9's AdvantageScope steps | Reworded for the **real** XRP (the drivetrain inputs, a Line Graph, the 2D Field). No `USE_SIMULATED_ROBOT` yet |
| Summary and Exercises | split from old | **Practice:** old 1 (interfaces; part (c) is the default method) and old 6 (an IO layer for `Sensors`, optional, real hardware only). **Build:** old steps 1 to 4, plus "connect AdvantageScope". **Reflect:** old 3, plus a new one on the empty default methods. **Git:** commit 1 on branch `io-layer`. **Collab:** new and short: each partner reads the other's `Drivetrain` and lists every line that still touches hardware (the answer should be none). **Explore:** AdvantageKit's IO Interfaces page. **Checkpoint** callout |

### New Ch 18: Simulating the XRP (about 750 lines, the XRP switched off for most of it)

Java: **polymorphism**, which now has two real implementations to choose between. The light touches are `private static` helpers and `Math.copySign`.

| New section | Comes from | Change |
|---|---|---|
| Intro | old intro, paragraphs 2 and 3 | "Run the model backwards" and the 11 PM argument |
| 18.1 A Robot in Your Laptop: Why Simulate? | old 17.1 | Unchanged |
| 18.2 Wait, Isn't the XRP Already Simulated? | old 17.2 | Unchanged |
| 18.3 New Java: Polymorphism | old 17.5 without default methods | The `DistanceSensor` example stays (it was set up in Ch 17). The section ends on "`Drivetrain` already has the field; now it gets a second kind of object" |
| 18.4 A Robot Made of Math: `DrivetrainIOSim` | old 17.8 | Unchanged |
| 18.5 Switching Robots: The Simulated Explorer | old 17.9 without AdvantageScope's first look | Instead it says: "Connect AdvantageScope exactly as in Chapter 17. The graphs look the same, and that is the point." The "Simulated or real" callout stays here |
| 18.6 Sim Versus Real | old 17.10 | Unchanged |
| 18.7 Simulation and IO Layers Everywhere | old 17.11 | Chapter numbers shifted |
| Summary and Exercises | split from old | **Practice:** old 2, 3, 4, 5, plus a new short polymorphism drill (the `testingAtMyDesk` switch). **Build:** old steps 5 to 9. **Reflect:** old 1, 2, 4. **Git:** commit 2 on branch `simulation`. **Collab:** Bug in a Box (unchanged). **Explore:** AdvantageKit's Differential Drive template. **Checkpoint** callout |

The code doesn't change. The Ch 17 end state is the old Build step 4 commit, and the Ch 18 end state is today's ch17 `solution/`.

---

## 2. Renumbering (mechanical, scripted, CRLF-safe)

- **Files:** today's 18 to 39 become 19 to 40 (`git mv`, slug unchanged). The old 17 file is split into `17-advantagekit-and-the-io-layer.md` and `18-simulating-the-xrp.md`. Live URLs change, but the book is still behind the allow list.
- **Sections:**
  - Section III becomes Ch 12 to 18.
  - Section IV becomes Ch 19 to 24.
  - Section V becomes Ch 25 to 26.
  - Section VI becomes Ch 27 to 34.
  - Section VII becomes Ch 35 to 40.
  - "39 chapters" becomes 40.
  - "Ch 1 to 25" (the XRP span) becomes "Ch 1 to 26".
  - `SUMMARY.md` follows.
- **References:**
  - `Chapter N`, `Chapters N to M`, `Ch N`, `Section N.x` and `## N.x` headings for N >= 18 all shift by +1.
  - Commit prefixes in the listings shift too (`Ch19:` becomes `Ch20:`), as do chapter numbers in code comments.
- **References to old Ch 17 are mapped by section:**

  | Old | New |
  |---|---|
  | 17.1, 17.2 | 18.1, 18.2 |
  | 17.3 | 17.1 |
  | 17.4 | 17.2 |
  | 17.5 | 18.3 (17.2 for default methods) |
  | 17.6 | 17.3 |
  | 17.7 | 17.4 |
  | 17.8 | 18.4 |
  | 17.9 | 18.5 (17.5 for AdvantageScope) |
  | 17.10 | 18.6 |
  | 17.11 | 18.7 |

  The roughly 80 bare "Chapter 17" mentions get sorted by hand: IO layer, interfaces and AdvantageKit stay 17; simulator, `DrivetrainIOSim`, `USE_SIMULATED_ROBOT` and polymorphism become 18. Some become "Chapters 17 and 18".
- **Not renumbered:** `reviews/*` stay as historical records (`SUMMARY.md` gets a mapping note). External links are untouched.
- **Exercises repo:**
  - Today's ch18 to ch28 become ch19 to ch29.
  - ch17 splits: a new ch17 `solution/` at the refactor point (built and checked), and today's ch17 `solution/` becomes ch18.
  - Each assignment and answer key is split the same way, and the README table is updated.
- **CLAUDE.md** (you edit it): I'll hand you a list: the chapter list, the section ranges, the Java skills entries for 17 and 18, and the Build progression from Ch 17 on.

## 3. Checkpoints (mentor-only)

At the end of the Build in Ch 16, 17, 18, 20 (old 19), 21 (old 20) and 25 (old 24), plus the Mini Swerve Ch 28 and 29 (old 27 and 28), add:

> **Checkpoint**
>
> Stuck, or did the build stop working and you can't find why? Ask your mentor for the **Chapter N checkpoint**: a known-good copy of the project at the end of this chapter. Don't copy it over your work. Compare it with yours, file by file (in VS Code, right-click a file > **Select for Compare**, then right-click yours > **Compare with Selected**), find the difference, and fix your own code. Then commit as usual.

Ch 20 (old 19) also gets a line at §19.8: the 470-line `Robot.java` listing can be checked against the checkpoint instead of retyped from scratch.

In the exercises repo, the README gets a "For mentors: handing out checkpoints" section: zip the chapter's `solution/` without `build/` and `.gradle/`, or share a single file.

## 4. "How to split this chapter" notes

The note sits right after each chapter's intro, as a callout with a meeting-by-meeting table and rough minutes. It covers every chapter over about 1,400 lines after the renumber. The table uses old numbers:

| Old number | Reviewer's split, where given |
|---|---|
| 16 | |
| 19 | |
| 20 | |
| 21 | |
| 22 | |
| 24 | |
| 25 | Becomes "two to three meetings" with a time column and a cut line (the Ch 25 review's M2) |
| 26 | |
| 27 | Meeting 1 at the robot (27.1 to 27.4); meeting 2 in the simulator; meeting 3 |
| 28 | Meeting 1 is hand math; meeting 2 is the simulator; meeting 3 is §28.9 on the robot |

For the chapters without a reviewer's split, I pick the breaks at each chapter's existing commit points ("safe places to stand").

## Order of work and review points

1. Split Ch 17 into the two chapters. Show you both, and stop for review.
2. Renumber the book and the exercises repo in one scripted pass, and run `mdbook build`. I'll show you a summary diff plus spot checks.
3. Add the checkpoints and the meeting-split notes. Show you.

Each step is committed only after your OK.
