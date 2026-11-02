<!-- counts: blocker=3 major=5 minor=5 build=none -->

# Phase A: Book-Wide SME Review

**Reviewer:** SME (senior FRC programming mentor), Phase A of `REVIEW_PLAN.md`
**Target season:** 2026 (WPILib 2026, AdvantageKit v26, Phoenix 6 26.x, PathPlannerLib 2026)
**Review date:** 2026-10-31
**Scope:** `src/SUMMARY.md`, plus the introduction, objectives, and Chapter Summary of each written chapter (1 to 28), with targeted greps across all chapters for versions, hardware names, and concepts used early. Chapters 29 to 39 and Appendices A to E are "Coming soon" stubs and were not reviewed, except for promises the written chapters make about them.

---

## Decisions confirmed by Devang (2026-11-01)

These override any "pick one" or "needs Devang" wording elsewhere in this file. Phase B and Phase C apply them as written.

| # | Decision | What it means for the book | Findings |
|---|---|---|---|
| D1 | **WPILib 2026.2.1 everywhere** | Every version string, GradleRIO line, Javadoc mention, and installer link says `2026.2.1`. No `2026.2.2` anywhere | M1, B2 |
| D2 | **Mini Swerve hardware comes from `C:\repos\2026-Mini-Example`** | Kraken X60 motors with Talon FX controllers, CANcoders, and a Pigeon 2, all on the roboRIO CAN bus with Phoenix 6. No SPARK MAX or navX for the Mini Swerve anywhere. Details are in B1 | B1 |
| D3 | **AdvantageKit pinned to v26.0.2**, the newest release that runs on a roboRIO | Every AdvantageKit install link is the pinned `v26.0.2` URL, never `releases/latest`. The v27 line is SystemCore-only and stays out of the book | B2 |
| D4 | **Elastic is the dashboard everywhere, from Ch 4 on** | The SmartDashboard app is never opened. The `SmartDashboard` *class* (`putNumber`, `putData`) stays in the code. Ch 23 stops "retiring" a dashboard and becomes a live-tuning chapter | M2, m2 |
| D4a | **XRP field map (Ch 14 to 25) uses AdvantageScope's 2D Field, not Elastic** (decided 2026-11-01, after the Elastic check) | Elastic 2026.1.1's Field widget offers only the built-in FRC fields, with no custom size and about 2x zoom, so the XRP course can't be read in it (`robot-programming-book-exercises/ELASTIC-EVALUATION.md`, item 3). The XRP map steps open **AdvantageScope** (File > Connect to Simulator) with a 2D Field tab on a small field; Ch 24 already uses the Evergreen FTC field. Elastic stays the dashboard for values, the chooser, the Scheduler and the Subsystem widgets. The Mini Swerve (Ch 26 on) uses Elastic's FRC field | M2 |
| D5 | **Target season 2026; no move to SystemCore for now** | The book says plainly in Ch 1 and Ch 2 that its XRP and Mini Swerve projects use WPILib 2026 on the roboRIO. SystemCore stays a short "what's coming" note, not a plan | M3 |

---

### Already applied to the chapters (2026-11-01, not committed)

Phase C should **not** redo these. Re-check them in Phase B, and only reopen one if Phase B finds a gap.

| Finding | Applied in | Notes |
|---|---|---|
| **B1** Mini Swerve hardware | `cover.md`, Ch 1 (line 221; line 76 now "built into Kraken and Falcon motors"), Ch 14, Ch 15, Ch 17, Ch 25, and Ch 26 (intro, parts table, fact sheet, lines 499, 1385, and 1555; the Explore exercise now uses the **TalonFX Swerve** template, not Spark Swerve) | `cover.md` was a missed spot in the first pass. Ch 1 lines 29, 76, and 98 still name Spark MAX as general FRC background, which is intended. But line 98 calls `SparkMax` a "WPILib class", and line 76 says each controller "has its own Java class in WPILib". Both classes actually come from vendor libraries (REVLib, Phoenix 6), so that's a MINOR left for Phase B Ch 1 |
| **B2** Pinned installs | Ch 2 §2.3 (pinned 2026.2.1 release link, exact installer names, the "Which year?" rule, and a new **Versions this book uses** table); Ch 17 §17.6 and Ch 26 Step 6 (`releases/download/v26.0.2/AdvantageKit.json`, both checked to resolve) | Ch 2 §2.2 also fixed: the minimum OS is now macOS 13.3+ and 64-bit Windows, per the 2026.2.1 release notes |
| **M1** WPILib 2026.2.1 | Ch 25 line 1313 | A grep of `src/` now finds only `2026.2.1` |
| **M3** Target season | Ch 1 §1.2 (roboRIO sentence, SystemCore paragraph, and a new "Which season this book is written for" callout); Ch 26 §26.5 callout shortened to point at Ch 1 and Ch 2 | The Ch 26 Explore exercise about SystemCore (line 1537) is kept, as planned |

Still open for Phase C: **M2** (Elastic everywhere), **M4**, **M5**, and the MINORs.

---

## Target versions (confirmed)

These are the versions Phase B reviewers check against. Releases checked on 2026-10-31. Mini Swerve versions confirmed from `C:\repos\2026-Mini-Example\2026-Mini-Swerve` on 2026-11-01.

| Library | Book version | Notes | Source |
|---|---|---|---|
| WPILib / GradleRIO | **2026.2.1** (D1) | The GitHub release marked "Latest" for 2026 (16 Jan). The example project uses `id "edu.wpi.first.GradleRIO" version "2026.2.1"`. The hosted Javadoc header reads "2026.2.2", but the book does not cite it | [allwpilib v2026.2.1](https://github.com/wpilibsuite/allwpilib/releases/tag/v2026.2.1) |
| AdvantageKit | **v26.0.2** (D3) | The newest stable release (19 Mar). The v27 releases are SystemCore alphas. The example project's `AdvantageKit.json` is `26.0.2` | [AdvantageKit v26.0.2](https://github.com/Mechanical-Advantage/AdvantageKit/releases/tag/v26.0.2) |
| Phoenix 6 | 26.x via `Phoenix6-frc2026-latest.json` (as Ch 27 has it) | The example project resolves to **26.1.2** (`Phoenix6-26.1.2.json`). The frc2026 "latest" file stays inside the 2026 line, so it is safe. Pinning `26.1.2` is optional | [Phoenix 6 docs](https://v6.docs.ctr-electronics.com/en/stable/) |
| PathPlannerLib | v2026.1.2 | Not used yet (Ch 31 is a stub). Ch 31 must pin the 2026 vendordep | [PathPlanner releases](https://github.com/mjansen4857/pathplanner/releases) |
| Elastic | Whatever ships with the WPILib 2026.2.1 installer | Opened from **WPILib: Start Tool > Elastic** (D4) | [Elastic docs](https://frc-elastic.gitbook.io/docs) |
| Java | 17 | WPILib 2026's JDK. Ch 22's CI uses 17 | |

---

## Chapter map and target-season risks

| Ch | Main topic | Robot | Target-season risks found in Phase A |
|---|---|---|---|
| 1 | What FRC programming is; the ecosystem; the XRP | none | Says the Mini Swerve uses "Spark MAX motor controllers, navX gyro" (B1). Says "Every FRC robot is required to use" a roboRIO, while also introducing SystemCore for 2026-27 (M3) |
| 2 | Install WPILib, flash the XRP, first deploy | XRP | Tells readers to install "the latest release for the current FRC season"; pin 2026.2.1 (B2, D1). Opens the SmartDashboard app; becomes the first Elastic launch (M2, D4) |
| 3 | Git and GitHub basics | XRP | None |
| 4 | Variables, types, printing, live dashboard values | XRP | Sends readers to the **SmartDashboard app**; switch to Elastic (M2, D4) |
| 5 | TimedRobot structure and the mode lifecycle | XRP | Opens the SmartDashboard app; switch to Elastic (D4) |
| 6 | Conditionals, loops, methods | XRP | None |
| 7 | Classes and objects; the `Drivetrain` hardware layer | XRP | Low. The `leftMotor::set` method reference is handled with a light-touch callout |
| 8 | Xbox controller, deadband, arcade drive | XRP | Low. The 2025 `getLeftBumperButton` rename is already called out |
| 9 | Encoders, IMU, rangefinder, reflectance | XRP | Sensor dashboard built in the SmartDashboard app; build it in Elastic and save the layout (D4) |
| 10 | Debugging, exceptions, `DataLogManager`, git bisect | XRP | Low |
| 11 | Branches, PRs, merge conflicts, Javadoc, overloading | none | None |
| 12 | Timer and encoder autonomous; `switch` | XRP | Low. "15 to 20 seconds" of auto matches the 2026 game |
| 13 | Differential kinematics, `ChassisSpeeds` | XRP | Low |
| 14 | Odometry, `Pose2d`, `Field2d` | XRP | Says "the navX on the Mini Swerve (Chapter 29)" (B1). Says the SmartDashboard app has been used "since Chapter 5", but Ch 4 introduces it (M2). `getPoseMeters()` is still present and not deprecated in 2026 |
| 15 | PID and `PIDController` | XRP | Says "Chapter 27, motor controllers. A SparkMAX can run its own PID loop" (B1). The `getError` rename is already called out |
| 16 | SysId, feedforward, units library | XRP | Low. The `calculateWithVelocities` callout matches 2026 |
| 17 | Interfaces, polymorphism, AdvantageKit IO, simulation | XRP | AdvantageKit installed from a `releases/latest` URL (B2). Says the Mini Swerve has "a navX gyro" (B1). Heaviest jump in the curve (M4) |
| 18 | Why command-based; lambdas; the scheduler | XRP | Low. Verified: `Command.schedule()` is `@Deprecated(since="2025", forRemoval=true)` |
| 19 | Subsystems, command classes, packages, abstract classes | XRP | Length and load (M4) |
| 20 | Bindings, `RobotContainer`, command groups | XRP | Low. Verified: `deadlineWith` is deprecated for `deadlineFor` |
| 21 | Enums, switch expressions, `FollowLine` | XRP | None |
| 22 | JUnit, HALSim, GitHub Actions | XRP | Action versions need a Phase B check (`checkout@v7` exists; check `setup-java@v6` and `setup-gradle@v6`) |
| 23 | NetworkTables, Elastic, generics, `TunableNumber` | XRP | Rename it and shrink §23.3 and §23.4, since Elastic now starts in Ch 2 (m2, D4) |
| 24 | AdvantageScope, replay, anonymous classes | XRP | Low |
| 25 | Capstone, records, release and tagging | XRP | `GradleRIO 2026.2.1` in code, but "2026.2.2" in the semver callout (M1). The hand-off table says SPARK MAX and navX (B1) |
| 26 | roboRIO, deploy, JVM, exceptions, `RoboRio` subsystem | Mini Swerve | Intro, parts table, fact sheet, and the "next chapter" text all say SPARK MAX and navX (B1). The AdvantageKit `latest` URL again (B2). The "stay on 2026" callout is good, but it comes too late (M3) |
| 27 | CAN, Phoenix Tuner X, Phoenix 6, arrays | Mini Swerve | Uses Kraken, Talon FX, and Pigeon 2, which contradicts Ch 26 (B1). The Phoenix vendordep is correctly pinned to frc2026 |
| 28 | Swerve kinematics, CANcoder calibration, `%` | Mini Swerve | Low. Uses the instance `optimize`/`cosineScale`, which is current for 2025 and 2026. `TRACK_WIDTH_METERS` vs Ch 13's `TRACKWIDTH_METERS` (m1) |

---

## Findings

### B1: The Mini Swerve's hardware changes between Ch 26 and Ch 27

**Where:**
- Ch 1 line 221: "roboRIO, Spark MAX motor controllers, navX gyro, and a camera"
- Ch 14 line 1061: "the navX on the Mini Swerve (Chapter 29)"
- Ch 15 line 1183: "Chapter 27, motor controllers. A SparkMAX can run its own PID loop"
- Ch 17 line 1316: "brushless motors on CAN, a navX gyro"
- Ch 25 lines 1432 and 1442 (the Phase 2 hand-off table)
- Ch 26: line 5 (intro), lines 71 and 73 ("Meet the Mini Swerve" parts table), line 82, line 104 (fact sheet "Gyro | navX"), line 499 ("Chapter 27 sets that up on the SPARK MAXes"), line 1385, line 1555 (next-chapter teaser)

**Confirmed hardware (D2).** This is from `C:\repos\2026-Mini-Example\2026-Mini-Swerve`, the working Mini Swerve code:

| Device | In the example code | Matches Ch 27 and 28? |
|---|---|---|
| Drive and steer motors | `TalonFX` (Phoenix 6); simulated with `DCMotor.getKrakenX60(1)`, so **Kraken X60** | Yes |
| Absolute encoders | `CANcoder`, one per module | Yes |
| Gyro | `Pigeon2` (CAN ID 0) through `GyroIOPigeon2` | Yes |
| CAN bus | All devices on the roboRIO bus (no `CANBus` or CANivore argument) | Yes ("rio bus, no CANivore") |
| CAN IDs (drive, steer, CANcoder) | FL 1, 2, 1; FR 3, 4, 2; BL 7, 8, 4; BR 5, 6, 3 | Yes, the same as the Ch 27 CAN map |
| Frame | 15.5 in track width and wheelbase; 2 in wheels | Yes (Ch 28) |
| Gear ratios | Drive (48/16)(16/28)(45/15) = 5.14; steer (16/10)(32/15) = 3.41 | Yes (Ch 28) |
| Vendordeps | Phoenix 6 26.1.2, AdvantageKit 26.0.2, GradleRIO 2026.2.1 | See the target versions table |
| Camera | **None in the code** | Unconfirmed. Leave the fact-sheet row blank until Ch 33 |

One difference for Phase B to note, not a bug: the example sets FL drive and steer inverted (`true, true`). The book's `DriveConstants` starts every inversion at `false`, and Ch 27 §27.9 has students measure them. That's the right way to teach it. Ch 27 could add one sentence: "On our team's robot, the front left module turned out to need both motors inverted. Yours may differ."

**Problem:** Ch 27 and Ch 28 (and CLAUDE.md, per the 2026-10-14 decision) build the Mini Swerve on Kraken X60 / Talon FX, CANcoders, and a Pigeon 2 with Phoenix 6, and the example repo confirms that hardware. But Ch 26 tells students to walk around the robot and record "SPARK MAX" and "navX" on the fact sheet, and Ch 26's own teaser says Ch 27 will "give every SPARK MAX an ID". A student who fills in the fact sheet as told will have the wrong CAN map, the wrong vendor library (REVLib vs Phoenix 6), and the wrong gyro port (MXP vs CAN) before Ch 27 opens. This is the book's biggest consistency error.

**Fix:** Replace every Mini Swerve hardware mention before Ch 27 with the CLAUDE.md hardware:
- Ch 26 intro: "**Kraken X60** motors, each with a built-in **Talon FX** motor controller, on a **CAN bus**, **CANcoder** absolute encoders, a **Pigeon 2** gyro, a camera, ..."
- Ch 26 parts table: the row becomes `| **Kraken X60** motors (Talon FX inside) | One per drive and steer job, eight in all, chained together on the **CAN bus** | Chapter 27 |`. The gyro row becomes `| **Pigeon 2** | A gyro and accelerometer on the CAN bus, for the robot's heading | Chapter 29 |`. The encoder row should name **CANcoders**.
- Ch 26 fact sheet: `| Gyro | Pigeon 2 | Label, and its CAN ID (Chapter 27) |`
- Ch 26 lines 499, 1385, and 1555: "SPARK MAX" becomes "Talon FX" (or "Kraken").
- Ch 1 line 221, Ch 14 line 1061, Ch 15 line 1183 ("A Talon FX can run its own PID loop on its own processor ..."), Ch 17 line 1316, and Ch 25 lines 1432 and 1442: swap in Kraken, Talon FX, and Pigeon 2.
- Leave the generic ecosystem mentions of Spark MAX in Ch 1 (lines 29, 76, 98) as they are. They describe FRC in general, not the Mini Swerve.

**Source:** CLAUDE.md "Hardware progression"; [Phoenix 6 hardware reference](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/index.html)

---

### B2: Unpinned "latest" installs will pull in 2027 software, which won't build on a roboRIO

**Where:**
- Ch 2 §2.3 Step 1: "find the latest release for the current FRC season", and the "Which year?" callout ("Download the version that matches the current FRC season")
- Ch 17 line 280 and Ch 26 line 326: the AdvantageKit vendordep URL `https://github.com/Mechanical-Advantage/AdvantageKit/releases/latest/download/AdvantageKit.json`

**Problem:** It is October 2026. WPILib 2027 (Alpha 8 now) and AdvantageKit v27 (alpha 7 now) are built for SystemCore. When they go stable around kickoff, two things break:
1. Ch 2's "current season" rule sends readers to WPILib 2027. The book's code targets 2026, and Ch 26 itself says "stay on WPILib 2026 for this robot". [verify] whether 2027 still supports the XRP, and how many APIs and package names the book uses that 2027 changes.
2. GitHub's `releases/latest` will resolve to AdvantageKit v27, which needs WPILib 2027. A reader on WPILib 2026 who follows Ch 17 or Ch 26 gets a vendordep that won't resolve or won't compile.

Ch 27 already does this right: it pins `Phoenix6-frc2026-latest.json`. AdvantageKit and the installer need the same treatment.

**Fix (per D1, D3, and D5):**
- Ch 2 §2.3 Step 1: "This book uses **WPILib 2026.2.1**. Go to the [WPILib 2026.2.1 release](https://github.com/wpilibsuite/allwpilib/releases/tag/v2026.2.1) and download the installer for your computer. Do not install a newer year, even if the releases page offers one: the book's code is written for 2026." The file names become `WPILib_Windows-2026.2.1.iso`, and so on. Replace the "Which year?" callout with that rule.
- Ch 17 §17.6 and Ch 26 §26.5: `https://github.com/Mechanical-Advantage/AdvantageKit/releases/download/v26.0.2/AdvantageKit.json`. Add one sentence: "This link names a version on purpose. `v26.0.2` is the newest AdvantageKit that runs on WPILib 2026 and the roboRIO; a 'latest' link would one day hand you a version for a different robot controller." Ch 26 should drop "Newer versions of the dialog may also offer AdvantageKit by name", or add "make sure it says 26.0.2".
- Add a short "Versions this book uses" table to Ch 2: WPILib 2026.2.1, AdvantageKit 26.0.2, Phoenix 6 26.x (frc2026), PathPlannerLib 2026, Java 17. Every later chapter can point to it.

**Source:** [allwpilib releases](https://github.com/wpilibsuite/allwpilib/releases), [AdvantageKit releases](https://github.com/Mechanical-Advantage/AdvantageKit/releases) (the v27 alphas say "Most teams should use the stable 2026 releases")

---

### B3: Ch 2 to 5 tell students to "deploy" to the XRP, but XRP code runs on the laptop

*Found on 2026-11-01 while building the exercises (`robot-programming-book-exercises/ch02` and `robot-programming-book-exercises/ch04` VERIFY.md).*

**Where:** Ch 2 §2.7 Step 4 ("Deploy to the XRP", and the "The XRP reboots on every deploy" callout), §2.9's workflow list, the Summary, and the Build exercise (lines 361, 439, 455, 481, 501); Ch 3 lines 469 and 539 (README "How to Run"); Ch 4 line 289; Ch 5 line 291.

**Problem:** WPILib XRP projects have no deploy target. The program runs on the laptop through **WPILib: Simulate Robot Code** with the **XRP Client** extension, and it talks to the XRP firmware over Wi-Fi. In a copy of the 2026 template, `./gradlew deploy` prints `BUILD SUCCESSFUL` and sends nothing, so a student who follows Ch 2 sees a "success" and a robot that does nothing. Ch 17 line 51 already says readers have run Simulate "since Chapter 2", and Ch 26 §26.1 contrasts this with the roboRIO deploy. So the book contradicts itself, and Ch 2 to 5 teach the wrong step at the moment a beginner most needs it to work.

**Fix:** In Ch 2, replace §2.7 Step 4 with "Run your program on the XRP": **WPILib: Simulate Robot Code**, select **XRP Client** (and **Sim GUI**), then enable from the Simulation GUI's Robot State panel or the Driver Station. Delete the reboot callout, and have §2.10 say the deploy step is what Chapter 26 adds. In Ch 2 to 5, change "deploy" to "run" in each workflow list (write, build, run, test, commit), and in the Ch 3 README "How to Run" step.

**Source:** [WPILib: Programming the XRP](https://docs.wpilib.org/en/stable/docs/xrp-robot/programming-xrp.html)

---

### M1: The WPILib patch version differs between chapters

**Where:** Ch 25 line 1158 (`id "edu.wpi.first.GradleRIO" version "2026.2.1"`) and Ch 25 line 1313 ("WPILib `2026.2.2` is year 2026, release 2, patch 2"). A grep of `src/` for `2026\.[0-9]\.[0-9]` finds only these two. CLAUDE.md's Ch 23 entry also says "2026.2.2 Javadoc".

**Problem:** A student comparing their `build.gradle` with the semver callout in the same chapter sees two different versions. Per D1, the book uses 2026.2.1, which matches the GitHub "Latest" release and the example project.

**Fix (per D1, 2026.2.1 everywhere):**
- Ch 25 line 1158 already says `2026.2.1`. Leave it.
- Ch 25 line 1313: "WPILib `2026.2.1` is year 2026, release 2, patch 1."
- CLAUDE.md, Ch 23 entry (Devang, by hand): change "2026.2.2 Javadoc" to "2026 Javadoc".
- Phase C should grep `src/` for `2026\.[0-9]\.[0-9]` after the fix. The only hits should be `2026.2.1`.

**Source:** [allwpilib releases](https://github.com/wpilibsuite/allwpilib/releases)

---

### M2: Ch 4 to 22 teach the SmartDashboard app, which the book itself calls deprecated

**Where:** Ch 4 §4.7 ("open SmartDashboard (`WPILib: Start Tool` → `SmartDashboard`)"), every dashboard check from Ch 5 to 22, Ch 14 line 693 ("The SmartDashboard app you have been using since Chapter 5"), and Ch 23 §23.3.

**Problem:** WPILib's 2026 docs call the SmartDashboard and Shuffleboard **apps** deprecated, with removal in 2027. Ch 23 documents this well. But a beginner spends 19 chapters learning a tool that is already on its way out, then gets told in Ch 23 to replace it. That's a habit the book has to undo. The `SmartDashboard` **class** is fine and isn't the problem. Separately, Ch 14 says "since Chapter 5", but Ch 4 introduces the app.

**Decision (D4): Elastic everywhere, from the first dashboard on.** The callout-only option is withdrawn. The rule for Phase C:

- **Stays:** the `SmartDashboard` *class* in code (`putNumber`, `putBoolean`, `putString`, `putData`). Elastic reads the same `/SmartDashboard` table, so no Java changes.
- **Stays:** the **Simulation GUI** as the XRP's control window: **Robot State** (enable, mode), **Joysticks** (slot 0, Map gamepad), and **DIO** (the LED channel). It is not a dashboard here, and the XRP needs it to run. Ch 8, 12, 15 (Test mode), 16, 17, 18 (DIO), 22, 24 (replay extensions off), and 26 keep these steps as they are.
- **Changes:** every place that opens the **SmartDashboard app**, or uses the Simulation GUI's **NetworkTables > SmartDashboard** menu or **Plot** window as a dashboard, moves to **Elastic**.

**Places to change (from a grep on 2026-11-01; Phase C should re-grep `SmartDashboard app|open SmartDashboard|Start Tool|NetworkTables\*\* > \*\*SmartDashboard|Plot`):**

| Ch | Where | Change to |
|---|---|---|
| 2 | §2.8 "Open SmartDashboard" (line 388) and Exercises (line 477) | First Elastic launch: **WPILib: Start Tool > Elastic**, gear > **IP Address Mode: localhost**, and add the `Status` string widget. This is where Ch 23 §23.4's "first Elastic dashboard" steps move to |
| 3 | Line 585 teaser | "...watching values change live in Elastic" |
| 4 | Intro (line 5), §4.7 (line 440), and Exercises (line 526) | "Build, deploy, and open Elastic (Chapter 2). Add three widgets: `Match Time`, `LED On`, and `Mode`." Add one sentence: the class is called `SmartDashboard` for history, and every dashboard reads it. Rename §4.7 to "Watching Variables Live" |
| 5 | Line 295 | "Open Elastic and the Driver Station" |
| 8 | Line 106 | "open Elastic" |
| 9 | §9.8 (line 722) and Build (line 806) | Arrange widgets in Elastic. Students should **save the layout** here (File > Save), and export it from Ch 9 on, not first in Ch 23 |
| 10 | Line 59 ("Your saved layout...") | Elastic layout |
| 12 | Line 797 | "open Elastic, and put the `Auto Step` widget..." |
| 14 | §14.7 lines 693 to 698, 704, the summary (1101), Build (1178), and the resources (1247) | **Per D4a:** show the map in **AdvantageScope's 2D Field**, not Elastic. Connect with File > Connect to Simulator, add a 2D Field tab, pick a small field (the Evergreen FTC field, as Ch 24 uses), and drag in `SmartDashboard/Field/Robot` and `Course`. Remove "The SmartDashboard app you have been using since Chapter 5 does not have a field map widget". The callout's list becomes "AdvantageScope, Elastic (FRC-sized fields only), and the Simulation GUI". Add an AdvantageScope 2D Field docs link next to the Glass Field2d one. Ch 24's "first full tour" of AdvantageScope then becomes its second visit, so §24.3 can be shorter |
| 15 | §15.7 line 526, §15.9 lines 1072 to 1085, summary 1203, and Build 1261 | PID gains edited in Elastic's **PIDController** widget, which shows kP, kI, kD and the setpoint, with **Publish Values**. Add a separate Text Display for the **`izone`** entry, because the widget has no I zone field. Plot setpoint and measurement in **AdvantageScope's Line Graph** (both on one graph), since an Elastic Graph shows only one topic. Test-mode selection (line 1068) stays in the Simulation GUI |
| 17 | Line 1237 | Controller in the Simulation GUI (stays); the field in AdvantageScope's 2D Field (D4a). Ch 17 already connects AdvantageScope to the simulator |
| 18 | Line 606 | The `Scheduler` widget in Elastic. DIO in the Simulation GUI (lines 612, 739) stays |
| 19 | Line 253 | The `Drivetrain` subsystem widget in Elastic |
| 23 | §23.3, §23.4, the dashboards table (line 129: "Chapters 4 to 22. Retired in this chapter"), lines 139 and 143, and the summary | §23.3 becomes a short "Why this book uses Elastic" note (keep the 2026 deprecation facts and sources). §23.4 shrinks to Elastic's **tabs**, **Edit > Lock Layout**, and **File > Save As** (not "Export Layout") to `src/main/deploy/elastic-layout.json`. Practice 6 uses **File > Download From Robot** (not "Load Layout From Robot"), and so does Ch 26 line 1352. Tunable gains are in the top-level **Tuning** folder of Add Widget, not under SmartDashboard (the first launch is now in Ch 2). In the table, change the SmartDashboard app row to "Not used". Rename the chapter (see m2) |

**Verified 2026-11-01** in Elastic 2026.1.1, both from its source code and hands-on (`robot-programming-book-exercises/ELASTIC-EVALUATION.md`, with screenshots):
- The widget types are ComboBox Chooser, Subsystem, Scheduler, Field and PIDController, and a plain number lands as Text Display.
- File has Open Layout, Save, Save As and Download From Robot.
- Edit has Lock Layout.
- Settings has IP Address Mode with localhost and Driver Station.
- The Field widget is built-in FRC fields only, which led to D4a.
- The PID widget has no I zone field.
- The Graph widget takes one topic.
- The Ch 23 overwrite trap is real: a typed value snaps back the moment you press Enter.

Ch 14 line 693 ("since Chapter 5") goes away with this change.

**Source:** [WPILib dashboard overview](https://docs.wpilib.org/en/stable/docs/software/dashboards/dashboard-intro.html), [2027 removed features](https://docs.wpilib.org/en/latest/docs/yearly-overview/removed-features.html), [Elastic docs](https://frc-elastic.gitbook.io/docs)

---

### M3: The book never says plainly which season it targets, or that its robots stay on 2026 after SystemCore

**Where:** Ch 1 §1.2 ("Every FRC robot is required to use one [roboRIO]", "Starting in the 2026-27 season, FRC is rolling out ... SystemCore"); Ch 26 §26.5 "Stay on WPILib 2026 for this robot".

**Problem:** A student reading in the 2026-27 school year will hear about SystemCore from their team before they reach Ch 26. Ch 1 says the roboRIO is required and that SystemCore is coming this season, both at once. The key rule ("this book's robots run WPILib 2026; don't upgrade") first shows up in Ch 26. By then the student has already installed software in Ch 2 and AdvantageKit in Ch 17. Whether the roboRIO is legal for the 2027 competition season hadn't been settled in an official FIRST source I could find [verify]. Teams should not read the book as saying it is.

**Decision (D5):** the target season is 2026, and the book stays on WPILib 2026 and the roboRIO for now. SystemCore is mentioned, not planned for.

**Fix:**
- Ch 1 §1.2: change "Every FRC robot is required to use one" to "Every FRC robot in the 2026 season uses one, and so does every robot in this book."
- Ch 1 "The SystemCore" and "A note on SystemCore": cut the claims about timing ("Starting in the 2026-27 season") and anything speculative about it. Keep it to: "FIRST has announced a new robot controller, **SystemCore**, as the roboRIO's successor. This book is written for the **2026 season**: WPILib 2026.2.1 and the roboRIO, for the XRP and the Mini Swerve alike. Most of what you learn carries over." Drop "We will revise the relevant chapters in 2027", which turns into a promise with a date.
- Ch 2: the versions table (B2) adds the row "Season: 2026".
- Ch 26 §26.5 "Stay on WPILib 2026 for this robot": shorten it to point back to Ch 1 and Ch 2. Keep the practical rule, "If the Driver Station or VS Code offers a newer year, say no."
- Ch 26 Exercises, line 1537 (the SystemCore Explore exercise): fine as an optional Explore. No change needed.

**Source:** [FIRST Robotics Competition update, 2026](https://info.firstinspires.org/frc-7-9-2026), [WPILib yearly changelog](https://docs.wpilib.org/en/latest/docs/yearly-overview/yearly-changelog.html)

---

### M4: The difficulty curve jumps sharply at Ch 16 to 20, beyond the book's 1-to-2 Java concepts per chapter

**Where:** Section I chapters are 360 to 580 lines each. Ch 16 is 1,447 lines, Ch 17 is 1,463, Ch 19 is 1,781, Ch 20 is 1,752, and Ch 26 to 28 are each 1,555 to 1,811. Ch 19 §19.8 "Rewiring `Robot.java`" alone runs about 640 lines.

**Problem:** The book promises 1 to 2 new Java concepts per chapter (CLAUDE.md "Teaching philosophy"). Here is what some chapters actually introduce:
- **Ch 17:** interfaces, polymorphism, `default` methods, nested static classes, and annotation processing (`@AutoLog`). That is on top of AdvantageKit, physics simulation, and a full IO-layer refactor.
- **Ch 22:** JUnit annotations, assertions, pure functions, dependency injection, `this(...)` chaining, and YAML. On top of that come HALSim and CI.
- **Ch 23:** generics, wrapper classes and autoboxing, raw types, and `static final` references to objects that can change.

For readers with zero programming experience, Ch 17 is the most likely point to drop off. It comes right after Ch 16 (SysId plus the units library) and right before the three-chapter command-based refactor. Each refactor chapter touches every file. A stuck student also can't skip ahead, because the build is cumulative.

**Fix (pick per chapter in Phase C, with Devang):**
- Split Ch 17 at §17.8: "Interfaces and the IO layer" (XRP-only IO, AdvantageKit logging) and "A Robot Made of Math" (`DrivetrainIOSim`, switching robots). Or, if the chapter count must stay at 39, move `default` methods and nested static classes to a later chapter, since AdvantageKit's own docs cover them when needed.
- In Ch 19, move the autonomous "bridge" in §19.8 into a downloadable starting point or a checkpoint branch. Students can then diff it instead of retyping it.
- Add a "checkpoint" callout with a known-good repo tag at the end of Ch 16, 17, 19, 20, and 24. A stuck student can then reset and continue.
- Phase B reviewers for Ch 16 to 20 should rate the exercise difficulty with this in mind.

**Source:** CLAUDE.md "Teaching philosophy" and "Java skills progression"

---

### M5: The repo has no Gradle projects, so Phase B can't run `./gradlew build`

> **Status, 2026-11-01: addressed outside the repo.** `C:\repos\zerotorobot\robot-programming-book-exercises\` now has a Gradle `solution/` for every chapter from 2 to 28, rebuilt from the book's listings. All 27 builds pass, and the test counts match the book: Ch 22 24, Ch 23 27, Ch 24 30, Ch 25 38, Ch 26 6, Ch 27 11, Ch 28 18. Each chapter's `VERIFY.md` lists its book issues (207 in total) in the same BLOCKER/MAJOR/MINOR format. Phase B reviewers should start from those files. Whether to move these projects into this repo (option (a) below) is still Devang's call.

**Where:** The whole repository. `find . -name "build.gradle*"` returns nothing; all code lives in Markdown listings.

**Problem:** REVIEW_PLAN §3.4 and §4 both expect `./gradlew build` for chapters with code. Without a reference project per chapter (or per checkpoint), Phase B can only read listings. Phase C can't prove a fix compiles. Students also have no known-good copy to diff against when they get stuck (see M4). Every Phase B review will report `build=none`, and compile errors in listings, which matter most for students, will go unchecked.

**Fix:** Before Phase B, decide one of the following:
- (a) Add reference projects (for example, `examples/xrp-explorer` with a tag per chapter, and `examples/mini-swerve` with a tag per chapter) and have CI build each tag.
- (b) Have each Phase B job assemble the chapter's final listings into a scratch WPILib 2026 project outside the repo and build it. That respects "never change `src/`", but costs more turns.

Option (a) also fixes the checkpoint gap in M4.

**Source:** `REVIEW_PLAN.md` §3 item 4

---

### m1: Terminology and constant names drift between chapters

**Where:**
- Ch 13 `TRACKWIDTH_METERS` / "trackwidth" vs Ch 28 `TRACK_WIDTH_METERS` / "track width"
- "Spark MAX" (Ch 1), "SparkMAX" (Ch 15), "SPARK MAX" (Ch 25 and 26)
- Ch 14 says the SmartDashboard app dates from "Chapter 5" (see M2)

**Problem:** Each one is small, but students search the book and their own code for exact names. WPILib's own docs use "trackwidth" for both drives.

**Fix:** Use one spelling per term. Suggested: `TRACK_WIDTH_METERS` everywhere, with "track width" in prose. Ch 13 can add one line noting that WPILib's docs write "trackwidth". Once B1 is fixed, the Spark MAX spellings survive only in Ch 1's ecosystem section. Use REV's own spelling there, "SPARK MAX".

**Source:** [REV SPARK MAX](https://docs.revrobotics.com/brushless/spark-max/overview)

---

### m2: Ch 23's title names the two apps the chapter retires

**Where:** `src/SUMMARY.md` and the Ch 23 heading, "SmartDashboard, Shuffleboard, and Live Tuning". The §23.3 callout explains why the title was kept.

**Problem:** A student looking for "Elastic" or "dashboards" in the table of contents won't find it, and the title points at deprecated tools. This is clarity, not correctness: the callout is honest about it.

**Fix (now required by D4):** Once Elastic is the dashboard from Ch 2 on, the old title describes tools the book never opens. Rename it to "Live Tuning and the Autonomous Chooser" (or "Elastic and Live Tuning") in the heading and in `src/SUMMARY.md`. Keep the file name `23-smartdashboard-shuffleboard-and-live-tuning.md` so links don't break, and drop the §23.3 callout about keeping the old title. Devang should also update the Ch 23 title in CLAUDE.md's book structure list by hand.

---

### m3: Field-frame conventions aren't previewed before Section VI

**Where:** Ch 14 §14.2 sets the XRP's field frame with its origin at the start line. Ch 28 promises that "Chapter 29 adds the other frame, the field".

**Problem:** On a real FRC field, WPILib's convention is a blue-alliance origin, and since 2024 the red alliance flips paths and poses (PathPlanner and AprilTag layouts both assume this). The book plans "sprinkles" before deep-dive chapters, but there's no preview of alliance flipping before Ch 29 to 31.

**Fix:** Add a two-sentence sprinkle to Ch 14 §14.2: "On a real FRC field, WPILib puts the origin in the blue alliance's corner for **both** alliances, so a red robot's code has to flip its paths. Chapters 29 and 31 deal with that." Link the coordinate-system doc.

**Source:** [WPILib coordinate system](https://docs.wpilib.org/en/stable/docs/software/basic-programming/coordinate-system.html)

---

### m4: The doc links all use `/en/stable/`, which will move to 2027

**Where:** 129 links to `docs.wpilib.org/en/stable/...` and 3 links to `github.wpilib.org/allwpilib/docs/release/java/...` across Ch 1 to 28.

**Problem:** When 2027 goes stable, these links will show SystemCore-era pages. Some will 404, and some will show changed APIs. That matters most for links students follow to check API claims.

**Fix:** [verify] whether WPILib keeps a per-year docs path after the season rolls over. (`docs.wpilib.org/en/2026/` returned 404 on 2026-10-31.) If it does, run a mechanical replace in Phase C. If not, add one line to the Ch 2 versions table: "Links to docs.wpilib.org show the newest season; if a page looks different from this book, use the version picker at the bottom left and choose 2026." Don't hand-edit 129 links.

---

### m5: CLAUDE.md's "Current status" is stale (not book content; note for Devang)

**Where:** CLAUDE.md "Current status": "All 39 chapter files exist as stubs ... Writing starts with Chapter 1."

**Problem:** The Phase C author agent reads CLAUDE.md. A status line saying nothing is written contradicts the 28 written chapters and the detailed Build entries above it, and it may mislead the agent. This is outside `reviews/` and isn't in Phase C's scope, so Devang should fix it by hand.

**Fix:** "Chapters 1 to 28 are written. Chapters 29 to 39 and Appendices A to E are stubs."

---

## Verified, no action (so Phase B doesn't re-check)

| Claim in the book | Chapter | Result |
|---|---|---|
| `Command.schedule()` is deprecated since 2025, for removal; use `CommandScheduler.getInstance().schedule(...)` | 18 | Correct. `@Deprecated(since="2025", forRemoval=true)` in the 2026 Javadoc |
| `deadlineWith` was renamed to `deadlineFor` in 2025 | 20 | Correct. Same deprecation annotation |
| `DifferentialDriveOdometry.getPoseMeters()` | 14, 16, 17 | Present (inherited from `Odometry`) and not marked deprecated in 2026. No `getPose()` yet |
| `RobotConfig.fromGUISettings()` throws checked exceptions, which makes it the first `try` block | 26 (promise for 31) | Correct. It throws `IOException` and `ParseException` |
| AdvantageKit `v26.0.2` is the 2026 release | 25 | Correct. It is the latest stable |
| Phoenix 6 vendordep pinned to `Phoenix6-frc2026-latest.json` | 27 | Good practice. Keep it |
| `actions/checkout@v7` | 22 | Exists (v7.0.1 is the latest). Phase B still needs to check `setup-java@v6` and `gradle/actions/setup-gradle@v6` |
| Instance `SwerveModuleState.optimize(Rotation2d)` and `cosineScale` | 28 | The current 2025 and 2026 API. The static `optimize` is the old form |

---

## Concepts used before they are taught

The overall ordering is careful. Greps for lambdas (`->`), method references (`::`), arrays (`[]`), and generics (`<T>`) before their teaching chapters found only planned, signposted early uses:

| Concept | Taught in | Earlier use | Verdict |
|---|---|---|---|
| Method reference `leftMotor::set` | 18 | Ch 7 onward, inside the `DifferentialDrive` constructor | Fine. Ch 7 has a "What `leftMotor::set` means" callout, and Ch 18 revisits it |
| Library enum `SysIdRoutineLog.State` | 21 | 16 | Fine. Signposted as a preview |
| Annotations as a tool-read label | 22 | `@Override` (5), `@AutoLog` (17) | Fine. Explained lightly at first use |
| `Consumer<Voltage>` (generic, one-parameter lambda) | 23 (generics) | 19 | Fine. Ch 19 explains it in plain words, and the Ch 23 recap table picks it up |
| `List<Command>` | 23 | 20 (composite pattern) | Fine. "Explained in one line only" |
| `String[] args` | 27 (arrays) | 26 (`main` in the JVM section) | Fine. Ch 27 lists `String[] args` as a callback. Phase B for Ch 26 should check that the listing says "you will meet `[]` in Chapter 27" |

There are no blocking prerequisite gaps in Ch 1 to 28. The pedagogy risk is load, not ordering (M4).

---

## Promises the written chapters make to the unwritten ones

The authors of Ch 29 to 39 must keep these, or Phase C must soften the promises:

- **Ch 29:** field-oriented drive with the **Pigeon 2** (Ch 28). Turns the robot frame into the field frame (Ch 28 §28.1).
- **Ch 30:** `SwerveDrivePoseEstimator`; Field2d (CLAUDE.md).
- **Ch 31:** PathPlanner builds commands from paths (Ch 13, 15, 18, 20, 21). Two sets of PID gains, translation and rotation (Ch 15). Paths produce `ChassisSpeeds` (Ch 13). The book's first `try`/`catch`, around `RobotConfig.fromGUISettings()` (Ch 26). The acceleration term via `calculateWithVelocities` (Ch 16).
- **Ch 32:** SysId through `SysIdRoutine` on brushless motors (Ch 16, 17). Replaces the data-sheet kV and real volts "fully" (Ch 26, 28).
- **Ch 33:** AprilTags correct odometry drift (Ch 14). A three-person merge-conflict lab (CLAUDE.md).
- **Ch 34:** motion profiles feed the feedforward acceleration term (Ch 16).

**Season topics the plan should cover in Ch 29 to 39 (target 2026):** alliance flipping (`DriverStation.getAlliance()` returns an `Optional`; PathPlanner's flip supplier); operator-perspective field-relative drive; the 2026 AprilTag field layout from `AprilTagFields` [verify the 2026 enum name]; CTRE's Tuner X swerve generator, named at least as the alternative most Kraken teams use; Choreo, named as PathPlanner's main alternative; on-controller closed loops (Talon FX `VelocityVoltage` and Motion Magic), which Ch 28 defers to "later"; and swerve setpoint generation and skew correction (`ChassisSpeeds.discretize`), which Phase B for Ch 28 should check is at least previewed.

---

## Verdict

The 28 written chapters fit together unusually well. Each chapter opens by recapping the previous two, the Java progression is ordered with care, early uses of later concepts are signposted, and deprecations from 2025 and 2026 are called out in place. Two book-wide problems must be fixed before the book is safe for the 2026-27 school year. First, the Mini Swerve's hardware changes from SPARK MAX/navX to Kraken/Pigeon 2 between Ch 26 and Ch 27 (B1). The working example in `2026-Mini-Example` confirms Kraken X60/Talon FX, CANcoders, and a Pigeon 2, with the same CAN IDs as Ch 27. Second, several installs track "latest" (B2). Both now have settled fixes (D1 to D5): WPILib 2026.2.1 and AdvantageKit v26.0.2 pinned, target season 2026 on the roboRIO, and Elastic as the only dashboard. Of those, the Elastic change (M2) is the largest Phase C job: it touches Ch 2 to 5, 8 to 10, 12, 14, 15, and 17 to 19, and reshapes Ch 23. The rest is a steep middle of the book for zero-experience readers (M4) and a review process that can't currently build any code (M5). Resolve M5's approach before Phase B starts.
