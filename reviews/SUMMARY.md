# Review Summary: Phases A and B

> **Renumbered 2026-11-01 (M4):** the old Ch 17 was split into Ch 17 (AdvantageKit and the IO Layer) and Ch 18 (Simulating the XRP), and the old Ch 18 to 39 are now Ch 19 to 40. The review files keep the **old** numbers. Old 17.1, 17.2, 17.8 to 17.11 are now 18.1, 18.2, 18.4 to 18.7; old 17.3, 17.4, 17.6, 17.7 are now 17.1 to 17.4; old 17.5 is split (polymorphism is 18.3, default methods are in 17.2).

**Status (2026-11-01):** Phase A (`00-book-wide.md`) and the lightweight Phase B (`chNN-sme.md`, run as described in `PHASE-B-LIGHT.md`) are complete for the 28 written chapters. Each Phase B file combines its own new findings with the issues carried over from the build verification, which lives in `robot-programming-book-exercises/chNN-*/VERIFY.md`. Chapters 29 to 39 are stubs and were not reviewed.

**Totals:** 7 blockers, 44 majors and 281 minors. Every chapter with code builds (27 of 27).

## Per chapter

| Ch | Blocker | Major | Minor | Build | Phase C priority |
|---|---|---|---|---|---|
| 1 | 0 | 1 | 5 | none | The §1.6 code preview teaches patterns the book later calls bugs |
| 2 | 2 | 1 | 6 | pass | Both blockers fixed (B3; the Driver Station isn't in Start Tool). M1: the Git exercise runs before Git is installed |
| 3 | 0 | 5 | 8 | pass | No recovery path for a rejected push (`pull.rebase`); the constructor snippet empties the auto chooser; `git add Robot.java` fails from the project root |
| 4 | 1 | 2 | 8 | pass | Blocker fixed (B3). M1: "use a variable from anywhere" contradicts scope |
| 5 | 1 | 2 | 11 | pass | Blocker fixed (B3). M1: "WPILib catches exceptions and stops the motors" is false; "replace its contents" drops the Ch 4 Build |
| 6 | 2 | 5 | 11 | pass | Both blockers fixed (undefined parts and units; B3). M1: every loop the chapter teaches is the blocking kind it forbids |
| 7 | 0 | 3 | 6 | pass | **Merge conflict with the new Ch 6 parts** ("XRPMotor 0 already allocated"); no "how to stop the robot" before it first moves; "positive turns right" is wrong |
| 8 | 0 | 1 | 11 | pass | The deadband "creep" lesson doesn't show, because `arcadeDrive` squares the input and applies its own 0.02 deadband |
| 9 | 0 | 0 | 8 | pass | Wrong chapter numbers in forward references |
| 10 | 1 | 1 | 8 | pass | Blocker fixed (the planted bug). Event logging floods when the wall stop chatters |
| 11 | 0 | 1 | 10 | pass | The pair lab has no solo path, but Ch 12 builds on its result |
| 12 | 0 | 2 | 6 | pass | Ch 12 and Ch 13 disagree on the XRP's top speed **[needs a measurement on a real XRP]**; table-top testing of bugs that never stop |
| 13 | 0 | 0 | 8 | pass | A private `speedToPower` is called from `Robot` |
| 14 | 0 | 0 | 10 | pass | D4a: the map moves to AdvantageScope; a `resetPose` callout for CAN hardware |
| 15 | 0 | 0 | 13 | pass | `HAND_KI` is undefined; the distance controller's integrator cap protects nothing |
| 16 | 0 | 0 | 11 | pass | SysId needs room to the side; [verify] the panel labels in SysId 2026.2.1 |
| 17 | 0 | 1 | 10 | pass | The simulated robot keeps driving after Disable (one-line fix) |
| 18 | 0 | 2 | 11 | pass | The motivating bug doesn't happen with the printed code; wait and print commands survive a disable |
| 19 | 0 | 0 | 14 | pass | Length and load (M4); bench commands have no timeout |
| 20 | 0 | 1 | 11 | pass | Practice 3 and 5 crash at startup with an NPE (the constructor order) |
| 21 | 0 | 1 | 13 | pass | Practice 5's setups don't produce the cases it asks about |
| 22 | 0 | 2 | 11 | pass | The course test can't tell whether leg 3 ran; the "shorten the line" red test stays green |
| 23 | 0 | 2 | 10 | pass | The D4/D4a rewrite (a one-pass list is in `ch23-sme.md`); the null-check failure text is wrong |
| 24 | 0 | 0 | 14 | pass | Timeline timing claims; a `ROBOT_MODE` guard test |
| 25 | 0 | 3 | 16 | pass | The leg 4 "safety distance" can't protect the robot (0.60 m limit vs 0.30 m gap); "two meetings" has no slack; the blind spot from Ch 22 |
| 26 | 0 | 3 | 11 | pass | The safety rules lack glasses, hands-off-while-disabled and battery shorts; `main` and `String[] args` are unexplained |
| 27 | 0 | 1 | 10 | pass | `applyConfig` never retries (AdvantageKit's template uses `tryUntilOk`) |
| 28 | 0 | 4 | 10 | pass | Onboard Talon FX loops promised to no chapter; no map to `TunerConstants`; `fromRotations(3.25).getDegrees()` is 1170 |

## Blockers: all fixed (uncommitted, awaiting Devang's review)

The 7 blockers were counted against the committed text. All are fixed in the working copy:
- **B3 in Ch 2, 4, 5 and 6:** "deploy" is now Simulate Robot Code, plus the Simulation GUI and the terminal. The same pass also cleaned up Ch 1, 3, 7, 8, 10 and 22.
- **Ch 2:** the Driver Station is no longer opened through Start Tool.
- **Ch 6:** the parts are declared, the meters are fixed, and current controller APIs are used.
- **Ch 10:** a planted bug that shows on the XRP, with Ch 11 updated to match.

## Phase C order (majors)

1. **Cross-chapter, do first:**
   - **Ch 7:** remove the Ch 6 parts when building `Drivetrain`. This is now required.
   - **M2 / D4 / D4a:** the Elastic and AdvantageScope rewrite across Ch 2 to 25, using the Phase A change table plus `ch23-sme.md`.
   - **M4:** checkpoints and meeting splits.
2. **Safety:** Ch 7 (how to stop before it moves), Ch 12 (floor only, hand on Disable), Ch 26 (the complete safety rules), and Ch 25 (a real safety stop).
3. **Exercises that can't work as written:** Ch 18 (the motivating bug), Ch 20 (Practice 3 and 5), Ch 21 (Practice 5), Ch 22 and 25 (the course test blind spot), and Ch 11 (a solo path).
4. **Wrong claims:** Ch 5 (exceptions), Ch 4 (scope), Ch 8 (deadband and squaring), Ch 18 (disable semantics), Ch 28 (`getDegrees`).
5. **Best practice:** Ch 27 (config retry) and Ch 28 (onboard loops, `TunerConstants` map), plus Ch 1, Ch 3 and Ch 6's loop lesson.
6. **Needs hardware before fixing:** the Ch 12 and 13 top speed.

## Phase C status (2026-11-02, new chapter numbers)

Done and committed, in this order:

1. **Cross-chapter:** Ch 7 hand-off from Ch 6; M2/D4/D4a Elastic and AdvantageScope; M4 (Ch 17 split into 17 and 18, the book renumbered to 40 chapters, mentor checkpoints, meeting-split notes, capstone in two to three meetings).
2. **Safety:** Ch 7 (stop before you start), Ch 12 (floor only, finger on Disabled), Ch 27 (glasses, disabled before hands go in, battery shorts), Ch 26 (what the leg 4 safety distance cannot stop; extension E).
3. **Broken exercises:** Ch 19 (the align bug is real; the disabled rule), Ch 21 (Practice 3 and 5), Ch 22 (Practice 5), Ch 23 and 26 (the course test asserts `Line State`), Ch 11 (solo path).
4. **Wrong claims:** Ch 5 (exceptions), Ch 4 (scope), Ch 8 (deadband and squaring), Ch 19 (disable semantics), Ch 29 (`getDegrees`, the break-on-purpose drill).
5. **Best practice:** Ch 28 and 29 (configuration retries), Ch 29 (onboard loops promised for Ch 33; `TunerConstants` map), Ch 1 (code glimpse), Ch 3 (`pull.rebase`, push rejected, sign-in, constructor, `git add` path), Ch 6 (non-blocking heartbeat).

Still open:

- **Needs hardware:** the Ch 12 and 13 XRP top speed (Ch 12 VERIFY 1). Measure one real XRP at full power, then make Ch 12's sample log and 3.0 s `STEP_TIMEOUT_SECONDS` agree with Ch 13's `MAX_WHEEL_SPEED_METERS_PER_SECOND`, and add a Diagnose line for leg 1 timing out.
- **MINOR findings:** done 2026-11-02 in five batches (see `MINOR-triage.md`), plus the two MAJORs Phase C missed. Left: five HARDWARE rows and one AdvantageScope look.

## CLAUDE.md

Updated 2026-11-02 (local only, the file is gitignored): the "Current status" line; Ch 12 (built twice, clock then sensors); Ch 22 "enum types may not be instantiated"; Ch 24 "2026 Javadoc" and the real null-check failure text; Ch 26 record-logging cost; Ch 27 "No CAN/Talon FX"; Ch 28 and 29 configuration retries and `applyWithRetries`; Ch 33 moves steering (`PositionVoltage`, `RemoteCANcoder`) and driving (`VelocityVoltage`) onto the Talon FX. The Ch 17 "latest URL" note was already gone.
