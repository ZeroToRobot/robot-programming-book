<!-- counts: blocker=0 major=1 minor=10 build=pass -->

# Chapter 17 SME Review (Phase B, lightweight)

**Chapter:** `src/section-3-autonomous-control/17-simulation-and-advantagekit-on-the-xrp.md` at HEAD (1,465 lines)
**Inputs:** `robot-programming-book-exercises/ch17-simulation-and-advantagekit-on-the-xrp/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md` (B1, B2, M2, M4, D3, D4a)
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

The IO layer is taught the way AdvantageKit's own templates are built: an interface with an `@AutoLog` inputs class and empty `default` methods, one real and one sim implementation, `updateInputs` plus `Logger.processInputs` in `periodic()`, physics stepped inside the sim's `updateInputs`, and every getter reading `inputs`. Software zeroing (never resetting hardware) is exactly right for replay and is explained with the right reasons. The refactor-then-feature split, with a "no behavior change" commit in between, is a habit worth the whole chapter. The chapter is honest about what the simulator misses and gives the right rule ("the simulator is for finding bugs, the robot is for finding the truth"). Load is the problem, as Phase A said (M4): interfaces, polymorphism, `default` methods, nested static classes and annotation processing, plus a vendordep, Gradle edits, a four-file refactor and a physics model. Nothing here changes that verdict; the fixes below are small.

**Prose claims checked** (VERIFY.md checked the code and API):
- AdvantageScope **File > Connect to Simulator** with the live source **NetworkTables 4 (AdvantageKit)** (§17.9 step 1, line 1259). Confirmed: the docs list it as a live source chosen from that menu. Source: [AdvantageScope Live Sources](https://docs.advantagescope.org/overview/live-sources).
- "AdvantageKit's own example projects choose real or simulated hardware with `isReal()`" (line 77) and the Explore's **Differential Drive** template (line 1450). Confirmed: AdvantageKit's template list has a Differential Drive Template, and the templates pick their mode from `RobotBase.isReal()`. Source: [AdvantageKit Template Projects](https://docs.advantagekit.org/getting-started/template-projects/).
- "XRP cannot measure its battery" (carried from Ch 16) holds: on the XRP, `RobotController.getBatteryVoltage()` returns the simulator's 12 V, which VERIFY.md also saw in `DifferentialDrivetrainSim.setInputs`. Source: [XRP forum thread](https://xrp.discourse.group/t/how-can-i-use-a-wpilib-java-method-to-display-the-supply-voltage-of-the-xrp-to-the-dashboard/902).
- Team 6328 is from Littleton, Massachusetts; AdvantageScope ships with WPILib; "since Java 8" default methods; interface methods implicitly public. All right.
- Every Additional Resources link resolves (checked 2026-11-01). B2 (pinned `v26.0.2` URL) and B1 (Kraken, Pigeon 2 in §17.11) are applied at HEAD.

## New findings (Phase B)

### m1: The `DistanceSensor` example would crash if a student ran it

**Where:** §17.5, lines 211 to 220 (`sensor = new RangefinderDistanceSensor();`), and Practice 1, line 1345 ("create ... `RangefinderDistanceSensor`").

**Problem:** `RangefinderDistanceSensor` creates its own `XRPRangefinder`, which opens analog input 2. `Sensors` already owns that input, so creating one in `Robot` throws a "resource already allocated" error at startup (the same once-only rule Ch 22 states for XRP hardware). Practice 1 only instantiates the fake, so the Build is safe, but a curious student who types the §17.5 snippet into `Robot` with the real branch hits an exception the chapter never mentions, in the chapter most likely to lose them.

**Fix:** Add to the end of the §17.5 walk-through: "Do not actually create a `RangefinderDistanceSensor` in your Explorer: `Sensors` already owns the rangefinder, and WPILib lets each piece of hardware be opened only once. That is one more reason real hardware belongs in exactly one IO class." In Practice 1, say "create (but do not construct) `RangefinderDistanceSensor`".

**Source:** the book's own Ch 22 rule (XRP analog inputs can be created only once per run); HAL resource allocation [verify the exact error text in the 2026 simulator]

### m2: The two-recorders callout should warn that the `FRC_` log now doubles everything

**Where:** §17.6 "Two flight recorders" callout, lines 340 to 342.

**Problem:** VERIFY.md found (not counted there) that `DataLogManager` records all of NetworkTables, and `NT4Publisher` puts every AdvantageKit value on NetworkTables, so the `FRC_` file now carries a second copy of all 134 AdvantageKit entries as `NT:/AdvantageKit/...`. `DriverStation.startDataLog` also duplicates what `LoggedRobot` already records. Build step 7 sends students back into SysId's Log Loader with this file, where the list is now much longer than Ch 16 showed. Not a bug, but a recovery-path gap, and logging every value twice is not a habit that scales to a competition robot (Ch 24 fixes it by retiring `DataLogManager`).

**Fix:** Add to the callout: "One side effect: because AdvantageKit also publishes on NetworkTables, the `FRC_` file now holds a copy of everything AdvantageKit records, under `NT:/AdvantageKit/`. When you load it in SysId, the entries you want are still the seven ending in `-drive`. Recording everything twice is wasteful, and Chapter 24 retires one of the recorders."

**Source:** VERIFY.md "The logs (DataLogReader)"; [AdvantageKit: Installing in an existing project](https://docs.advantagekit.org/getting-started/installation/existing-projects)

### m3: The IO classes reach up into `Drivetrain` for their numbers

**Where:** `DrivetrainIOXRP` lines 468 and 512, `DrivetrainIOSim` lines 998 to 1006 and 1019 to 1020, and the "Public constants" callout, lines 889 to 891.

**Problem:** The seam diagram (lines 93 to 112) says `Drivetrain` sits above the IO layer, but both IO classes now depend on `Drivetrain` (`Drivetrain.WHEEL_DIAMETER_METERS`, `NOMINAL_BATTERY_VOLTS`, all six gains), so each side of the seam depends on the other. It compiles and works, and Ch 20's "a number lives with the thing it describes" keeps it this way on purpose. But it is not how AdvantageKit's templates do it (they keep shared numbers in a `DriveConstants` class both sides read), and a student who later writes a second subsystem will copy the two-way dependency. The callout explains `public` but not the direction.

**Fix:** Add one sentence to "Public constants": "Notice the direction: the IO classes now read numbers from `Drivetrain`, the class above the seam. That is fine for one subsystem. AdvantageKit's templates put numbers that both sides need into their own constants class, and Chapter 20 starts you on that road with `Constants.java`."

**Source:** [AdvantageKit Differential Drive Template](https://docs.advantagekit.org/getting-started/template-projects/diff-drive-template)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | Nothing sends 0 V on disable, so the simulated robot keeps driving after Disable (one-line fix: `drivetrain.stop()` in `disabledInit()`, or 0 V while disabled in `DrivetrainIOSim`) | |
| 2 | MINOR | Per-side feedforward against an averaged sim model: wheels settle apart and the sim curves with no PID; "Drives straight? Perfectly" is wrong | |
| 3 | MINOR | `subtractFriction` acts only while driven; a coasting sim wheel has no friction and slides further than the real one | |
| 4 | MINOR [verify on hardware] | The real robot is "the same, within tolerance", not "exactly as before": inputs are 20 ms older and the 0.02 deadband moves to the wheel powers | |
| 5 | MINOR [verify on hardware] | §17.10's list misses that the simulated sensors answer a loop sooner than the real ones | |
| 6 | MINOR | The pinned vendordep's own `jsonUrl` is `releases/latest`, so "Check for updates" will one day offer v27; tell students to decline | B2, D3 |
| 7 | MINOR | "Logger before anything is created" is not literally true: field initializers run first | |
| 8 | MINOR | Change list says "hardware imports are gone" but `DifferentialDrive` stays; four comment rewrites unlisted | |

Covered by Phase A, not counted:
- **M2 / D4a:** §17.9 step 4 (line 1239) opens the field in the Sim GUI's **NetworkTables > SmartDashboard > Field**; the bench plot (line 1246) uses the Sim GUI **Plot** window. Concretely for Phase C: the AdvantageScope **2D Field** tab in step 4 of "A first look at AdvantageScope" (line 1262) becomes the XRP's field map, so choose the **Evergreen** (FTC) field there as Ch 24 does, drop line 1264's "the full-size FRC field makes the Explorer's course look tiny", and point line 1239 at it. The bench plot moves to AdvantageScope's Line Graph, which this chapter already introduces.
- **M4:** the chapter's load (five Java ideas plus AdvantageKit, Gradle, the IO refactor and the physics model). Phase A's split at §17.8, or the checkpoint tags, still apply. The recovery path for a failed `build.gradle` edit ("compare character by character", line 307) is the weakest point for a zero-experience reader; a checkpoint `build.gradle` would fix it.
- The CLAUDE.md Ch 17 note "AdvantageKit vendordep (latest URL)" is stale (the chapter correctly pins v26.0.2); Devang's to fix by hand.

## Verdict

The architecture and the habits are exactly what strong 2026 teams use, and the prose claims I could check are right. The one real defect is VERIFY 1: the simulated robot keeps driving after Disable, which looks to a student like a bug in their own code and undercuts the "disable cleans up" story Ch 18 tells next. Top three changes for Phase C:

1. **VERIFY 1:** make disabled mean stopped in simulation (`drivetrain.stop()` in `disabledInit()`, or 0 V while `DriverStation.isDisabled()` in `DrivetrainIOSim`).
2. **M4 for this chapter:** split it at §17.8 or add a checkpoint tag after the refactor commit, with a known-good `build.gradle`.
3. **VERIFY 2 and 3 plus D4a:** correct the "drives straight perfectly" and friction claims, and move the field map to AdvantageScope's 2D Field on the Evergreen field.
