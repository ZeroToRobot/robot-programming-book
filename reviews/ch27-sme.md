<!-- counts: blocker=0 major=1 minor=10 build=pass -->

# Chapter 27 SME Review (Phase B, lightweight)

**Chapter:** `src/section-6-mini-swerve/27-can-bus-and-real-motor-controllers.md` at HEAD (1794 lines)
**VERIFY:** `robot-programming-book-exercises/ch27-can-bus-and-real-motor-controllers/VERIFY.md` (build pass, 11 tests, 5 issues)
**Compared against:** the team's `2026-Mini-Example/2026-Mini-Swerve` (read-only), AdvantageKit's TalonFX swerve template (`template_projects/sources/talonfx_swerve`, main branch), CTRE's Tuner X swerve generator output (`TunerConstants`), and the Phoenix 6 docs.

**Overall on best practice:** this chapter's Phoenix 6 habits are the right ones, and better than the team's own sample code. A full `TalonFXConfiguration` on every boot (CTRE's own recommendation), `Inverted` instead of negated outputs, one reused `VoltageOut` per motor, `BaseStatusSignal.refreshAll` (non-blocking, per the docs), a 0.5 s falling debounce on the connected flag, alerts that name the CAN ID, a `whileTrue` dead-man's switch, and simulation that never creates a `TalonFX`. All of these match the AdvantageKit TalonFX template line for line in spirit. The sample robot does none of them: it applies no configuration and negates the duty cycle in code. Building `ModuleIOTalonFX` by hand is the right way to teach it: students see every device, signal, and setting that the generator would hide in `TunerConstants`. Only one habit here needs fixing before it hardens, and it's the config-apply step (M1).

Prose checked and confirmed against the docs (no action): the 20 ms heartbeat and 100 ms disable ([WPILib CAN addressing](https://docs.wpilib.org/en/stable/docs/software/can-devices/can-addressing.html)); ID 63 reserved for broadcast; the full Talon FX LED table, including "alternating red/green = Pro-only command while unlicensed" ([Talon FX hardware reference](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/talonfx/index.html)); the CANcoder's "slow red = no CAN, fast green = CAN good and magnet in range" ([CANcoder reference](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/cancoder/index.html)); "apply a full configuration so untouched configs are factory defaulted" and "`apply` is blocking, so never in periodic" ([Configuration](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/api-usage/configuration.html)); `refreshAll` is non-blocking ([Status Signals](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/api-usage/status-signals.html)); 120 A drive slip current and 60 A steer stator limit as CTRE's generated defaults; red Tuner X card = duplicate ID and yellow = newer firmware available.

---

## New findings (Phase B)

### M1: A configuration that fails once is never retried, so a motor can silently keep last year's settings

**Where:** §27.6 "Every setting, every time" and "It worked is a return value" (lines 457 to 465); `ModuleIOTalonFX.applyConfig` (lines 880 to 888); the walkthrough bullet at line 900.

**Problem:** The chapter's whole argument for a full configuration on every boot is that it "wipes all of that away, and puts every motor into a state you wrote down" (line 459). But `applyConfig` tries exactly once, with the default timeout. On a real robot the first `apply` is the most likely to fail: the roboRIO program can start while a Talon FX is still booting or flashing its LEDs after a power-on, and one busy-bus moment can produce an `RxTimeout`. When that happens, the device later answers normally, so the debounced `Connected` flag goes true and **the "not answering" alert clears** (line 900 says the alert "will keep reminding everyone, every loop", but it won't). The motor then runs on whatever is stored on it: maybe coast, maybe the old inversion, maybe no stator limit. The only trace is one `reportError` line in RioLog at boot, which nobody reads during a match. That is exactly the "quietly wrong" robot that §27.0 promises to prevent, and the wrong inversion is the "one wheel spins backward" bug from line 7. AdvantageKit's TalonFX template wraps every Talon FX apply in `tryUntilOk(5, () -> ...apply(config, 0.25))` for this reason. The habit "apply once and hope" is one a student would carry straight onto a competition robot.

**Fix:** Retry with a `while` loop (Ch 6), which needs no new Java. In `DriveConstants`, add:

```java
    // Applying settings (Section 27.6): how many tries, and how long to wait for each answer.
    public static final int CONFIG_ATTEMPTS = 5;
    public static final double CONFIG_TIMEOUT_SECONDS = 0.25;
```

and replace `applyConfig` with:

```java
    /** Send a whole configuration to one motor, try again if it does not answer, and say so if it never does. */
    private static void applyConfig(TalonFX motor, TalonFXConfiguration config, String description) {
        StatusCode result = motor.getConfigurator().apply(config, DriveConstants.CONFIG_TIMEOUT_SECONDS);
        int attempts = 1;
        while (!result.isOK() && attempts < DriveConstants.CONFIG_ATTEMPTS) {
            result = motor.getConfigurator().apply(config, DriveConstants.CONFIG_TIMEOUT_SECONDS);
            attempts++;
        }
        if (!result.isOK()) {
            DriverStation.reportError(
                description + " motor (CAN " + motor.getDeviceID() + ") did not take its settings after "
                    + attempts + " tries: " + result,
                false);
        }
    }
```

Add one paragraph after "It worked is a return value": "A motor that misses its settings once is not lost: it might still have been booting when your program started. So `applyConfig` asks up to five times, a quarter of a second each, which is what AdvantageKit's template does. Only a motor that never answers gets reported. Notice what a missed configuration would mean: the motor answers later, so its alert clears, but it runs on whatever settings were stored on it before. That is why the retry matters more than the message." Optionally, also raise a sticky `Alert` ("X did not take its settings. Restart the robot code.") so the failure reaches Elastic and not only RioLog. Phase C: Ch 28's `report(StatusCode, device)` (Ch 28 §28.8 Step 3) must keep the retry, for the CANcoder too. A small `static StatusCode applyWithRetries(Supplier<StatusCode> apply)` helper (Ch 18 lambdas, Ch 23 generics) is the natural Ch 28 shape, and it mirrors AdvantageKit's `tryUntilOk`.

**Source:** [AdvantageKit TalonFX template `ModuleIOTalonFX.java`](https://github.com/Mechanical-Advantage/AdvantageKit/blob/main/template_projects/sources/talonfx_swerve/src/main/java/frc/robot/subsystems/drive/ModuleIOTalonFX.java) (`tryUntilOk(5, () -> driveTalon.getConfigurator().apply(driveConfig, 0.25))`); [Phoenix 6 Configuration](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/api-usage/configuration.html) (`apply` is blocking and waits up to the timeout)

---

### m1: The chapter teaches how to measure bus utilization, but not the one call strong teams use to control it

**Where:** §27.2 "How busy is the bus?" (lines 86 to 88), §27.9 "The bus" (line 1342), Explore bullet 4 (line 1779).

**Problem:** Students learn to read `SystemStats/CANBus/Utilization` and to "estimate what it might be with three times as many devices", but they never learn that the code decides how often each signal is sent. AdvantageKit's template sets 50 Hz on the signals it reads (`BaseStatusSignal.setUpdateFrequencyForAll(50.0, ...)`) and turns the rest down with `ParentDevice.optimizeBusUtilizationForAll(...)`. This isn't urgent for 12 devices on the roboRIO bus, and adding it now would add load to a heavy chapter. But a student who meets a crowded bus on the competition robot will only know to buy a CANivore.

**Fix:** In "How busy is the bus?", after the CANivore sentence, add: "Your code also controls how often each device reports. Phoenix 6 lets you set each signal's rate with `setUpdateFrequency`, and turn off the ones you never read with `optimizeBusUtilization`. Chapter 30 does both, when odometry needs some readings faster and the rest can slow down." Phase C must keep that promise in Ch 30.

**Source:** [Phoenix 6 Status Signals](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/api-usage/status-signals.html) (`setUpdateFrequency`, `optimizeBusUtilization`, 4 Hz default for optimized signals)

---

### m2: The Explore asks why the book builds swerve by hand instead of using the Tuner X generator, but the chapter never answers

**Where:** §27.8 intro (line 605) and Explore bullet 2 (line 1777).

**Problem:** Most 2026 Kraken teams start from Tuner X's swerve project generator, and AdvantageKit's TalonFX template is configured from that same `TunerConstants` file. Students will hear "just use the generator" from other teams by the next meeting. If the book's only answer is an open Explore question, a student with no experience can't defend the from-scratch path, or see how it connects. That connection is what makes the from-scratch path worth doing.

**Fix:** Add a short callout after the line 605 paragraph:

> **What about Tuner X's swerve generator?**
>
> Tuner X can write a swerve project for you: you type in the CAN IDs, gear ratios, and inversions, and it produces a file called `TunerConstants`. Many teams with Krakens start there, and AdvantageKit's TalonFX template reads that same file. This book builds the pieces by hand first, so every device, setting, and reading has a line you wrote and can test. When you open a generated project later (Chapter 28's Explore), you will recognize each line, because you will have written its twin.

**Source:** [AdvantageKit TalonFX swerve template](https://docs.advantagekit.org/getting-started/template-projects/talonfx-swerve-template) (two setup paths, both through `TunerConstants`); [CTRE Swerve Project Generator](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/index.html)

---

### m3: The team's own robot already hints at its inversions; the chapter can say so without spoiling the measurement

**Where:** §27.9 callout "Do not be surprised by a pattern" (lines 1326 to 1328). This was suggested in Phase A under B1 ("One difference for Phase B to note"); it isn't applied at HEAD.

**Problem:** The team's sample inverts the front left drive and steer only. A student who finds that same lopsided result on a robot whose modules are all identical may think the check went wrong.

**Fix:** Add to the callout: "On our team's Mini Swerve, the front left module turned out to need both motors inverted, and the other three did not. Yours may differ: the table wins."

**Source:** `2026-Mini-Example/2026-Mini-Swerve/.../RobotContainer.java` (front left constructed with `true, true`)

---

### m4: Length and load (Phase A M4): give the chapter a natural break and a checkpoint

**Where:** The whole chapter (1794 lines): the Tuner X lab (§27.4), two Java concepts (§27.5, §27.7), six new files (§27.8), the motor check on the robot (§27.9), the drill (§27.10), and two test files (§27.11).

**Problem:** This is one of the three longest chapters. It also mixes two kinds of session: hands-on robot work (§27.2 to 27.4, 27.9 to 27.10) and laptop work (§27.5 to 27.8, 27.11). A team with one robot and three students will have people waiting for a turn. The book never tells them they can split the work.

**Fix:** Add a "How to split this chapter" note under the opening list: "Meeting 1: Sections 27.1 to 27.4 at the robot (CAN map, Tuner X, IDs, firmware), while a teammate starts 27.5 on a laptop. Meeting 2: 27.5 to 27.8 and 27.11, all in the simulator. Meeting 3: 27.9 and 27.10 on the robot." Per M4, add a checkpoint tag at the end of §27.8 Step 8 ("if your simulator does not show the motor check stepping, compare with the `ch27-sim` checkpoint").

**Source:** `reviews/00-book-wide.md` M4

---

### m5: Two Tuner X details to confirm before print [verify]

**Where:** §27.4 Step 3 card color table (lines 187 to 192), and Step 4 "pick **2026** as the year" (line 199).

**Problem:** CTRE's docs confirm that red means a duplicate ID and yellow means newer firmware is available. I couldn't find a current CTRE page that defines **green** as "up to date" or **purple** as "unexpected firmware", or that confirms the batch upgrade has a year picker labeled that way. If these labels are wrong, a student will be confused at the first screen.

**Fix:** Check against Tuner X 2026 on the robot. If they're unconfirmed, keep only the red and yellow rows, and replace Step 4.2 with "pick the newest **2026** firmware for each device type" (the wording CTRE uses in its season notes).

**Source:** [CAN Bus Troubleshooting](https://v6.docs.ctr-electronics.com/en/stable/docs/troubleshooting/canbus-troubleshooting.html) (red card = duplicate ID)

---

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | Leftover `RobotContainer` button bindings from `AutoLightTest` are polled during `MotorCheckTest`. This prints 17 "Joystick Button 1 not available" warnings, and the tests aren't isolated. Fix: `getDefaultButtonLoop().clear()` in teardown | |
| 2 | MINOR | The vendordep, installed before the branch, gets swept into the "move only" commit by `git add .` | |
| 3 | MINOR | The Git recap repeats `git checkout -b can-motors` (fails), and uses `git add .` for the inversions commit | |
| 4 | MINOR | The Summary says "rotor rotations", but the code reads `getPosition()` (motor rotations). Ch 28's `SensorToMechanismRatio` makes the difference real | |
| 5 | MINOR | "Overwritten at the next deploy" should be "the next time the robot program starts" | |

No severities changed. VERIFY's "not verifiable" item on FOC (line 515, "the Talon FX simply ignores the setting") is still **[verify]**. The Phoenix 6 API docs say only that FOC "requires Phoenix Pro", and the licensing page doesn't describe the fallback. It's very likely right, since `EnableFOC` defaults to true and unlicensed Krakens drive normally on `VoltageOut`. The safe wording is "Without the license, the Talon FX drives the motor the normal way."

---

## Verdict

This is a strong chapter. Its Phoenix 6 practice is current for 2026 and already matches the AdvantageKit TalonFX template's structure and habits. It teaches the right things the team's sample code gets wrong: full configs, `Inverted` over negation, request reuse, and named alerts. Its CAN, LED, and heartbeat facts check out against CTRE and WPILib docs. The from-scratch build is the right teaching choice here: one class shows every device and signal, and the IO layer keeps tests free of vendor code. The one habit to fix before it carries into a competition robot is the single-shot configuration apply. **Top three for Phase C:** (1) M1, retry the configuration apply (and keep the retry in Ch 28's `report`), with the paragraph on why a missed config hides behind a cleared alert; (2) the m2 generator callout, so students can connect the from-scratch path to `TunerConstants` and the AdvantageKit template; (3) VERIFY 1 and 2 together: clear the default button loop in test teardown, and commit the vendordep before the move, so the first build and first commit look the way the book says.
