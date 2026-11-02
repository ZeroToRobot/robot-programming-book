<!-- counts: blocker=0 major=0 minor=13 build=pass -->

# Chapter 15 SME Review (Phase B, lightweight)

**Chapter:** `src/section-3-autonomous-control/15-pid-control-making-the-robot-accurate.md` at HEAD (1344 lines)
**Inputs:** `robot-programming-book-exercises/ch15-pid-control-making-the-robot-accurate/VERIFY.md` and `answer-key.md`, `robot-programming-book-exercises/ELASTIC-EVALUATION.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This is one of the best chapters in the book for a beginner. It builds PID from a shower handle, makes the student write P by hand and watch it stall, derives the stall gap, and only then hands over `PIDController`. The habits it teaches are the ones strong teams actually enforce: units on every gain, setpoint minus measurement, fix signs in the getter and never with a negative gain, one controller per job, `reset()` when the job changes, an I zone instead of raw `kI`, continuous input on headings, `atSetpoint()` with a rate tolerance, and a Test-mode tuning bench with a plot. It says plainly that I is a seasoning and feedforward (Ch 16) is the better fix for friction. The Java thread (compound assignment, scope and lifetime) is exactly two concepts and is motivated by the I term's need for memory, which is the cleanest weave of the three threads in Section III. Planned for two meetings, which is right for its length.

**Prose claims checked** (not covered by VERIFY.md's API checks):
- Explore: "Tuning a Turret Position Controller" exists, has interactive feedback-only and combined simulations, and says feedback alone lags and gets "stuck" near the setpoint with static friction. Matches the exercise. Source: [Tuning a Turret Position Controller](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-turret.html)
- Back-references: Ch 4 `blinkCount++` (line 218), Ch 8 "closed-loop" callout (line 66), Ch 12 "bang-bang" and the P preview (lines 34, 72), Ch 5 Test mode "for testing mechanisms" (line 1055), and Ch 10's promise of a setpoint-vs-measurement graph (line 1085): all present at HEAD.
- §15.11 PathPlanner "two sets of PID gains" (line 1185): right for the holonomic controller the Mini Swerve will use (`PPHolonomicDriveController` takes translation and rotation `PIDConstants`). Source: [PathPlanner: Build an Auto](https://pathplanner.dev/pplib-build-an-auto.html)

## New findings (Phase B)

### m1: The scope bug example uses a constant the student never defined

- **Where:** §15.6 "Here is the bug", line 316 (`double speed = HAND_KP * error + HAND_KI * errorSum;`).
- **Problem:** `HAND_KP` was added in §15.2, but `HAND_KI` appears nowhere else. The chapter has just told the student to keep the hand-written controller "while you read the next two sections, because you will keep experimenting with it" (line 150), so a student who types this in to see the bug for themselves gets `cannot find symbol: variable HAND_KI` and never reaches the real lesson (the I term doing nothing).
- **Fix:** Before the listing: "To try it, add `private static final double HAND_KI = 2.0;   // (m/s) per (meter x second) of error` next to `HAND_KP`." And after the fix with the field: "Run it again with the field version. Now the robot finishes leg 1 instead of timing out."
- **Source:** the §15.2 and §15.6 listings

### m2: "B then A is a left turn; A then B is a right turn" is backwards as most students will read it

- **Where:** §15.9 tuning recipe, step 3, line 1122.
- **Problem:** Pressing B (heading 90) from home is the **left** turn; pressing A afterward (heading 0) is the **right** turn. Read as "press B, then press A", the sentence names the second press, which is a right turn. A student checking "both directions" may test only one and think they tested both, or decide their robot's signs are wrong.
- **Fix:** "Test turns in both directions: pressing **B** turns left to 90, and pressing **A** after it turns right, back to 0. Watch both on the plot; friction is often different each way."
- **Source:** the §15.9 bench table (lines 1061 to 1063)

### m3: The clamp is a crude motion profile, and the chapter only names the real tool for arms

- **Where:** §15.2 "Limits: clamping the output" (lines 99 to 109), §15.10 "The times got longer" (line 1166), and §15.11's `ProfiledPIDController` bullet (line 1187, "Arms and elevators use a cousin ...").
- **Problem:** Clamped P control asks for the full 0.20 m/s (or 2 rad/s) on the first loop of every step, with no limit on acceleration, then hands over to P in the last few centimeters. On the XRP that's harmless, but it's the pattern that makes a 50 kg robot wheel-slip at the start of every move and throws off odometry (Ch 14's "wheel slip" culprit). Strong teams drive to a distance or heading with a motion profile (`TrapezoidProfile` inside a `ProfiledPIDController`), or a path follower. The chapter names `ProfiledPIDController` but files it under arms only, so a student building a drive-to-distance on the Mini Swerve has no reason to reach for it.
- **Fix:** Add two sentences to the "The times got longer" bullet or §15.11: "Notice that each step starts by asking for full speed at once. A smarter controller plans a smooth speed-up, a steady cruise, and a slow-down (a **motion profile**), and runs PID on that moving target. WPILib's `ProfiledPIDController` does exactly that; Chapter 34 uses it for arms, and the same class works for driving to a distance or turning to a heading." Change line 1187's "Arms and elevators use" to "Arms, elevators, and smooth drive-to-distance moves use".
- **Source:** [Combining Motion Profiling and PID Control with ProfiledPIDController](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/controllers/profiled-pidcontroller.html)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | One encoder count: `0.0003 ÷ 0.02` is 0.015, not 0.016 (use 0.00032) | none |
| 2 | MINOR | The default integrator cap (1.0) is no cap for the 0.20 m/s distance output, and "copy the heading controller's setup" invites a 10 meter I zone; probed a 16 cm overshoot | none |
| 3 | MINOR | "Throws ... the moment you try" a negative gain: only the constructor checks; `setP` and the dashboard widget accept negatives silently | none |
| 4 | MINOR [verify on hardware] | The 0.02 m/s rate tolerance passes at one count per loop, so leg 1 ends 6 to 8 mm short every run; the sample log's `X: 0.50` won't match | none |
| 5 | MINOR | Each bench button sets both targets, so X then B drives back along an arc and A no longer returns home | none |
| 6 | MINOR [verify on hardware] | With the 2 rad/s clamp, doubling P past about 0.4 may never reach "ringing"; the recipe needs a stopping rule | none |
| 7 | MINOR | Practice 3 "move `errorSum` inside `calculate`" breaks `reset()`; say "add a local, leave the field" | none |
| 8 | MINOR [verify on hardware] | Practice 5's finger nudge may not show the cascade working: the turn part is undone by heading hold, and a slide is invisible to odometry | none |
| 9 | MINOR | §15.11 names Ch 19's command `TurnToAngle`; it is `TurnToHeading` | none |
| 10 | MINOR [verify] | §15.11 points to Ch 27 for Talon FX onboard PID; Ch 27 uses `VoltageOut` only and Ch 28 keeps steering on the roboRIO | B1 (applied: the SparkMAX wording is gone; the chapter pointer is still wrong) |
| (not counted) | | §15.7 line 526, all of §15.9 "Seeing the gains" and "Seeing the response", Build step 2, the Diagnose "NetworkTables menu" item, and the Summary use the Simulation GUI's PID window and Plot | D4, M2. Phase A's Ch 15 row already gives the target: Elastic **PIDController** widget with **Publish Values** (so line 1081's "takes effect **as you type**" note must be rewritten: in Elastic a typed gain applies when you press Publish Values), `izone` as its own Text Display (the widget has no I zone box), and setpoint plus measurement on one **AdvantageScope Line Graph** (an Elastic Graph shows one topic). Test-mode selection stays in the Simulation GUI |

## Verdict

No blockers or majors: the control theory is right, the WPILib claims all check out against the 2026.2.1 source (VERIFY), and the habits are the ones strong teams teach. The chapter's weak spots are in the tuning experience itself, where the XRP's clamp and friction make some of the promised plot shapes and outcomes unlikely (VERIFY 4, 5, 6, 8), plus the dashboard move to Elastic and AdvantageScope. Top three changes for Phase C:

1. Rewrite the tuning section for D4 (Elastic PIDController widget with Publish Values, a separate `izone` widget, AdvantageScope Line Graph for setpoint and measurement), and fix the "as you type" note while doing it.
2. Make the tuning recipe and bench match what students will see: a stopping rule for "double P until it rings" (VERIFY 6), press A before B after a drive (VERIFY 5), the left/right wording (m2), and leg 1 ending a few millimeters short (VERIFY 4).
3. Fix the windup advice for distance (an I zone in meters, `setIntegratorRange`, VERIFY 2) and the negative-gain claim for live edits (VERIFY 3), since both bite exactly when students tune live.
