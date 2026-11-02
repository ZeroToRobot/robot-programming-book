<!-- counts: blocker=0 major=4 minor=10 build=pass -->

# Chapter 28 SME Review (Phase B, lightweight)

**Chapter:** `src/section-6-mini-swerve/28-swerve-kinematics.md` at HEAD (1811 lines)
**VERIFY:** `robot-programming-book-exercises/ch28-swerve-kinematics/VERIFY.md` (build pass, 18 tests, 10 issues)
**Compared against:** the team's `2026-Mini-Example/2026-Mini-Swerve` (read-only), AdvantageKit's TalonFX swerve template (`template_projects/sources/talonfx_swerve`, main branch, and its docs page), CTRE's Tuner X swerve generator (`TunerConstants`), and the Phoenix 6 API docs.

**Overall on best practice:** the swerve math is taught the right way: by hand first, with WPILib checked against the student's own tables. The 2026 API is current (instance `optimize` and `cosineScale`, `desaturateWheelSpeeds`). Several choices match the AdvantageKit template exactly: an instance kinematics field (no `static final`), a stop-while-disabled in `Drive.periodic()`, `SensorToMechanismRatio` on the drive motor, CANcoder direction and offset kept in code, and "offset = minus the reading". The AdvantageKit docs give the same calibration rule: "The value saved in `TunerConstants` must be the negative of the value displayed in AdvantageScope." The from-scratch build is right for teaching kinematics, optimization, and calibration. Where it would teach a habit to unlearn is the control layer. Steering and driving run as roboRIO loops sending `VoltageOut`, which no strong 2026 Phoenix 6 team ships, and the chapter frames moving them as optional (M1). The other gap: the book never connects what students built by hand to the `TunerConstants` file they will meet in every Kraken team's code (M2).

Prose checked and confirmed against the docs (no action): `MagnetOffset` "is added to the reported position" (line 328), and `SensorDirection` is defined "as seen facing the LED side of the CANcoder". That supports line 327's "mounted under the module counts the other way" ([MagnetSensorConfigs](https://api.ctr-electronics.com/phoenix6/stable/java/com/ctre/phoenix6/configs/MagnetSensorConfigs.html)). Also confirmed: `SensorToMechanismRatio` as "sensor rotations to the mechanism's output, greater than 1 is a reduction" ([FeedbackConfigs](https://api.ctr-electronics.com/phoenix6/stable/java/com/ctre/phoenix6/configs/FeedbackConfigs.html)); "Phoenix remembers the last request" (line 1215), since control requests are re-sent automatically at `UpdateFreqHz` ([Control Requests](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/api-usage/control-requests.html)); and AdvantageKit's template "does the same" stop-while-disabled (line 1215), uses an instance kinematics field, and runs both loops on the Talon FX (line 418).

---

## New findings (Phase B)

### M1: Steering and driving on the roboRIO are framed as optional, so students will take them to a competition

**Where:** §28.6 callout "Why steer on the roboRIO?" (lines 416 to 418), "Driving the wheel" (lines 420 to 428), and Explore bullet 2 (line 1793).

**Problem:** The callout honestly says competition teams run the steering loop on the Talon FX. It then calls moving it "a good project once Chapter 32 has measured the real gains". That makes the roboRIO loop the default and the motor-controller loop an extra. Chapter 29 then drives the robot on the floor with this code, and nothing later in the plan promises the switch. CLAUDE.md says "Talon FX onboard loops later", and Phase A lists on-controller closed loops as a season topic with no chapter. What students would carry forward:

- Steering at 50 Hz on a CANcoder value that is up to a loop old, through a `VoltageOut` that only lands on the next CAN frame. The Talon FX closes the same loop at 1 kHz with no round trip.
- An open-loop drive (`speed * kV`, no velocity feedback). The robot will be slow under load and won't match odometry's idea of speed.
- `PIDController` gains in volts per radian. Every generated and template project uses Talon `Slot0` gains in volts per **rotation**, a factor of 2 pi that will bite them the first time they copy a number.

CTRE's generated `SwerveDrivetrain` and the AdvantageKit TalonFX template both send `PositionVoltage` to the steer motor (CANcoder as remote sensor, continuous wrap) and `VelocityVoltage` to the drive motor. Teaching the roboRIO loop first is the right call. Leaving it as the end state isn't.

**Fix:** Rewrite the callout as a promise, and get Devang to pick the chapter (Ch 32 fits, since it measures the gains):

> **Why steer on the roboRIO, for now?**
>
> A Talon FX can run this loop itself, a thousand times a second, reading the CANcoder straight off the CAN bus. CTRE's generated swerve code and AdvantageKit's template both do exactly that, for steering (`PositionVoltage`, with the CANcoder as a remote sensor) and for the drive wheel too (`VelocityVoltage`). This book starts on the roboRIO because `PIDController` is the controller you already know from Chapter 15, every number shows up in AdvantageScope, and the pretend module runs the same code. It is a starting point, not the finish. In Chapter 32, once SysId has measured the real gains, both loops move into the Talon FX: `ModuleIO` trades its two volts methods for `setDriveVelocity` and `setSteerAngle`, and `Module.runSetpoint` gets shorter. One thing to watch when you get there: a Talon's steering gain is in volts per **rotation**, not per radian, so the same module needs a kP about 6.3 times bigger.

On "Driving the wheel" (line 428), change the last sentence to: "Chapter 32 replaces it with a measured feedforward, and moves the speed loop into the Talon FX." The Mini Swerve is unlicensed (§27.6), so Phase C should name `RemoteCANcoder`, not `FusedCANcoder`, as the Ch 32 feedback source. Fused and Sync need Phoenix Pro.

**Source:** [AdvantageKit TalonFX template `ModuleIOTalonFX.java`](https://github.com/Mechanical-Advantage/AdvantageKit/blob/main/template_projects/sources/talonfx_swerve/src/main/java/frc/robot/subsystems/drive/ModuleIOTalonFX.java) (`PositionVoltage`/`VelocityVoltage`, `FeedbackSensorSourceValue.RemoteCANcoder`); [Phoenix 6 Control Requests](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/api-usage/control-requests.html); `reviews/00-book-wide.md` "Season topics" paragraph

---

### M2: The book never maps what students built by hand onto `TunerConstants`, the file every Kraken team's code is built from

**Where:** §28.8 Step 1 walkthrough (lines 653 to 664), the §28.5 callout "Why not just measure it in Tuner X?" (lines 345 to 347), and the Additional Resources line "the swerve code this book's `Drive`, `Module`, and `ModuleIO` grow toward" (line 1805).

**Problem:** The book points students at the AdvantageKit TalonFX template twice: in the Explores, and as what the code "grows toward". That template, like CTRE's own `CommandSwerveDrivetrain`, is configured through a `TunerConstants` file. A team either generates it with Tuner X or edits it by hand (both paths are on AdvantageKit's page). A student who opens it finds `kDriveGearRatio`, `kWheelRadius`, `kFrontLeftEncoderOffset`, `kInvertLeftSide`, `kSlipCurrent` and so on. Nothing tells them that these are the same facts they measured in Ch 27 and 28. A few traps sit in the translation: the wheel is a **radius**, drive inversion is set **per side**, offsets are `Rotations.of(...)`, steering gains are per rotation, and there's a **couple ratio**, a fact about the module that the book never mentions. Separately, the §28.5 callout describes only Tuner X's on-device zero button. The generator's offset step writes offsets into `TunerConstants`, in code, which is the book's own principle, so the callout makes Tuner X sound more opposed to the book than it is.

**Fix:** Add a callout at the end of the Step 1 walkthrough:

> **The same facts, in someone else's file**
>
> Open almost any Kraken team's swerve code, or AdvantageKit's TalonFX template, and you will find a file called `TunerConstants`, written by Tuner X's swerve generator or by hand. It holds what your `DriveConstants` holds, with different names:
>
> | Your `DriveConstants` | In `TunerConstants` |
> |---|---|
> | `DRIVE_GEAR_RATIO`, `STEER_GEAR_RATIO` | `kDriveGearRatio`, `kSteerGearRatio` |
> | `WHEEL_DIAMETER_METERS` | `kWheelRadius` (half of it!) |
> | `FREE_SPEED_METERS_PER_SECOND` | `kSpeedAt12Volts` |
> | `driveInverted` | `kInvertLeftSide`, `kInvertRightSide` (one per side) |
> | `steerInverted`, `encoderInverted` | `kFrontLeftSteerMotorInverted`, `kFrontLeftEncoderInverted` (and so on) |
> | `encoderOffsetRotations` | `kFrontLeftEncoderOffset` |
> | `location` | `kFrontLeftXPos`, `kFrontLeftYPos` |
> | `DRIVE_STATOR_LIMIT_AMPS` | `kSlipCurrent` |
> | `STEER_KP`, `STEER_KD` | `steerGains` (in volts per **rotation**) |
>
> One entry has no twin in your file yet: `kCoupleRatio`, how far the drive wheel turns when only the module steers. Chapter 30 needs it for odometry.

Phase C should check the names against a freshly generated 2026 file **[verify]**, and make sure Ch 30 deals with the couple ratio or drops that line. In the §28.5 callout, add: "Tuner X's swerve generator does it the other way: it measures the offsets, then writes them into a code file, which is this book's rule too."

**Source:** [AdvantageKit TalonFX swerve template docs](https://docs.advantagekit.org/getting-started/template-projects/talonfx-swerve-template) (generator and manual paths through `TunerConstants`; "must be the negative of the value displayed in AdvantageScope"); [CTRE Swerve Project Generator](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/index.html)

---

### m1: `runVelocity` skips `ChassisSpeeds.discretize`, the first line of the template's version

**Where:** `Drive.runVelocity` (lines 1140 to 1154), and Explore bullet 3 (line 1794).

**Problem:** Phase A asked Phase B to check that skew correction is at least previewed. It is, but only as an Explore. AdvantageKit's `runVelocity` begins with `ChassisSpeeds discreteSpeeds = ChassisSpeeds.discretize(speeds, 0.02);`. Without it, the robot drifts sideways when it drives and spins at once. On blocks that doesn't matter. In Ch 29 on the floor, it will be the first "why does it curve?" question.

**Fix:** Keep the code as it is in Ch 28, which has enough to carry. Add one sentence to the `runVelocity` walkthrough bullet (line 1216): "There is one more line AdvantageKit's version has at the top, `ChassisSpeeds.discretize`. It fixes a small sideways drift when the robot drives and spins at once. You will see the drift in Chapter 29, and add the line there." Phase C must keep that promise in Ch 29.

**Source:** [AdvantageKit TalonFX template `Drive.java`](https://github.com/Mechanical-Advantage/AdvantageKit/blob/main/template_projects/sources/talonfx_swerve/src/main/java/frc/robot/subsystems/drive/Drive.java); [WPILib `ChassisSpeeds.discretize`](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/kinematics/ChassisSpeeds.html)

---

### m2: The whole-file `DriveConstants` listing wipes out the inversions the reader measured in Ch 27

**Where:** §28.8 Step 1, lines 549 and 632 to 643.

**Problem:** The text says "Your Chapter 27 inversions ... stay exactly as they are", but the listing gives the whole file with `false, false` on all four modules. Most beginners paste a whole-file listing. The motors then quietly go back to their unmeasured directions. The kinematics check catches it later ("All four wheels push backward", or a module that spins forever), but only after a confusing session on blocks.

**Fix:** Mark the two measured values in the listing, for example `"FrontLeft", 1, 2, 1, /* your Ch 27 */ false, false, /* new */ false, 0.0,`. Or add a line comment above the four constants: `// Copy your driveInverted and steerInverted from Chapter 27 (Section 27.9). Do not paste these falses over them.` Then add to Step 1's first paragraph: "If you paste this file, put your Chapter 27 values back before you build."

---

### m3: Length and load (Phase A M4): this is the longest chapter in Section VI, and its robot half needs its own session

**Where:** The whole chapter (1811 lines): hand math (§28.2), gears (§28.3), two Java concepts (§28.4, §28.7), calibration theory (§28.5), steering (§28.6), six files (§28.8), three on-robot procedures (§28.9), and three test files (§28.10).

**Problem:** §28.9 alone is three precise procedures: hand ratio checks, a CANcoder calibration with a straightedge, and the kinematics check. Each one has a diagnosis table. A team that reaches it at the end of a long meeting will rush the calibration. That is the one step whose mistakes (a bevel gear on the wrong side) look like code bugs in Ch 29.

**Fix:** Add a "How to split this chapter" note: "Meeting 1: Sections 28.1 to 28.4 (hand math and `%`, no robot). Meeting 2: 28.5 to 28.8 and 28.10 in the simulator. Meeting 3: 28.9 on the robot, start to finish, with no code changes except the offsets commit." Add a checkpoint tag at the end of §28.8 Step 8, per M4.

**Source:** `reviews/00-book-wide.md` M4

---

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | Break-on-purpose claims two tests fail. Only `spinningPointsEveryWheelAroundTheCenter` fails, because `DriveTest` uses one kinematics object both ways and can't see a wrong location. Verified alternative drill: negate the pretend steer volts | |
| 2 | MAJOR | "`getDegrees()` on either gives 90" is wrong. `Rotation2d.fromRotations(3.25).getDegrees()` is 1170. `equals`, `minus`, and `rotateBy` wrap, but `getDegrees()` doesn't | |
| 3 | MINOR | The Step 8 stopgap edit to `ModuleTest` compiles, but leaves one failing test before the commit | |
| 4 | MINOR | "Steer a quarter turn or more" in `DriveTest`. With `optimize`, every wheel steers exactly 45 degrees | |
| 5 | MINOR | "Almost no overshoot": the simulator shows one rebound of about 9 degrees before it settles | |
| 6 | MINOR | The `static final` kinematics callout claims a test-order failure that these tests can't produce. Make it conditional | |
| 7 | MINOR | Practice 2's range matches `inputModulus` exactly, so the "look at ±180" hint points at a difference that doesn't exist | |
| 8 | MINOR | The Git recap repeats `git checkout -b swerve-kinematics` (fails) | Same pattern as Ch 27 VERIFY 3 |
| 9 | ~~MINOR [verify]~~ **No action (not counted)** | The 0.025 / 0.004 kg m^2 loads credited to the TalonFX template | **Changed:** AdvantageKit's TalonFX template page tells users to set `kSteerInertia` to 0.004 and `kDriveInertia` to 0.025 in `TunerConstants` (its `ModuleIOSim` reads `constants.DriveInertia` and `constants.SteerInertia`). The book's credit is right. Optional wording: "the loads AdvantageKit's TalonFX template tells you to use" |
| 10 | MINOR | Reflect 2 assumes that wheels on a long robot roll at different speeds in a spin, but every corner of a centered rectangle is the same distance from the center | |

Ch 27 VERIFY 1 (the button-loop warnings) is still there, as VERIFY.md notes. It isn't counted again here.

---

## Verdict

The math half of this chapter is excellent: hand rules, worked examples that become tests, a careful `%` lesson tied to the CANcoder, and pass-by-reference taught through `desaturateWheelSpeeds`. Its calibration procedure matches the AdvantageKit template's own rule. Two prose claims are wrong, and a student will trip on them while checking their own work (VERIFY 1 and 2). The bigger issue for a student headed to a competition robot is where the from-scratch build stops. A roboRIO `PIDController` and open-loop `VoltageOut` are right for learning, but the chapter treats them as the finish line. And nothing connects the hand-built constants to the `TunerConstants` that the AdvantageKit and CTRE projects are built on. **Top three for Phase C:** (1) VERIFY 1 and 2: fix the break-on-purpose drill (use the negated steer volts drill) and the `getDegrees()` sentence; (2) M1: turn the "Why steer on the roboRIO?" callout into a promise with a named chapter, with Devang picking Ch 32 or another, and record it in CLAUDE.md's plan; (3) M2: the `TunerConstants` mapping callout, so the template and generator Explores land.
