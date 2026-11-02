<!-- counts: blocker=0 major=1 minor=11 build=pass -->

# Chapter 8 SME Review (Phase B, lightweight)

**Chapter:** `src/section-2-driving-sensing/08-controller-input-and-teleop-drive.md` at HEAD (580 lines)
**Inputs:** `robot-programming-book-exercises/ch08-controller-input-and-teleop-drive/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

A strong chapter. The read, decide, write framing, the "controller is a sensor for the driver" callout, the coordinate-frame sprinkle with forward pointers to Ch 14 and Ch 29, the held vs pressed experiment, and the "controller lives in `Robot`, not `Drivetrain`" design note are all how a good mentor teaches this. The deadband and squaring numbers are where the chapter goes wrong, and VERIFY.md already has those. The new findings are small habits and claims.

## New findings (Phase B)

### m1: The `...Pressed()` methods have two traps the chapter doesn't mention

- **Where:** §8.7, lines 384 to 392 (the table says "`true` for one loop per press"), and Reflect question 3 (line 552).
- **Problem:** The WPILib Javadoc defines `getRawButtonPressed` as true "if the button went from not pressed to held down since the last time this method was called". Two things follow that beginners hit all the time:
  1. A press made while the method isn't being called is remembered. If the toggle lives in `teleopPeriodic()` and the driver taps B while disabled, slow mode flips on the first teleop loop.
  2. The edge is used up by the first call. If two places in the same loop ask `getBButtonPressed()`, only the first one sees `true`.
  Ch 9 (Y reset in `robotPeriodic`), Ch 16 (D-pad and Back button), and Ch 19 (`getBackButtonPressed`) all lean on these methods before Ch 20's triggers replace them.
- **Fix:** Add two sentences after the table: "`getAButtonPressed()` really means 'pressed since the last time **this line** asked'. So ask once per loop, in one place, and remember the answer in a variable if two parts of your code need it. A press made while that line wasn't running (say, while the robot was disabled) still counts the next time it runs."
- **Source:** [`GenericHID.getRawButtonPressed` Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/GenericHID.html#getRawButtonPressed(int)) (wording checked in the 2026.2.1 sources)

### m2: Slow mode reads its state back with `==` on a `double` instead of keeping the `boolean`

- **Where:** §8.8, line 452, `SmartDashboard.putBoolean("Slow Mode", speedScale == SLOW_MODE_SCALE);`, repeated in Ch 9 line 696.
- **Problem:** The program knew the answer as a `boolean` (the bumper) and threw it away, then got it back by comparing two doubles. It works here, because both sides are the same constant. But it plants the habit Ch 12 has to undo ("never `==` on measured values"), and it breaks silently the day someone sets `SLOW_MODE_SCALE = 1.0` while testing. Keeping the decision in a named `boolean` is also the clearer read, decide, write shape.
- **Fix:**
  ```java
  boolean slowMode = controller.getRightBumperButton();
  double speedScale = slowMode ? SLOW_MODE_SCALE : FULL_SPEED_SCALE;

  drivetrain.arcadeDrive(forward * speedScale, rotation * speedScale);
  SmartDashboard.putBoolean("Slow Mode", slowMode);
  ```
  It reads even better as a ternary example: "`slowMode ? SLOW_MODE_SCALE : FULL_SPEED_SCALE`".
- **Source:** none needed

### m3: "Battery or not" overpromises what the XRP's feedforward can do

- **Where:** §8.8 callout, line 461: "Once your drivetrain knows its true speed from encoders (Ch 9) and a measured motor model (Ch 16), you can ask for '0.3 meters per second' and get it, battery or not."
- **Problem:** Ch 16 lines 134 to 138 say the opposite: the XRP cannot measure its battery, so Ch 16's model uses "pretend volts", and "a model measured on fresh batteries will over-promise". Only the PID feedback (Ch 15) covers a tired battery. The student is told two different things about the same robot.
- **Fix:** "...you can ask for '0.3 meters per second' and get close. The motor model (Chapter 16) gets you most of the way, and feedback from the encoders (Chapter 15) fixes the rest, even on a tired battery."
- **Source:** Ch 16 §16.3 at HEAD, lines 134 to 138

### m4: "Input shaping" is the wrong name for squaring the sticks

- **Where:** §8.6 callout, line 348: "Shaping the input curve like this is called **input shaping**."
- **Problem:** In control engineering, "input shaping" is a specific technique for cancelling vibration in flexible systems, not a joystick curve. A student who searches the bolded term finds papers about cranes and robot arms. FRC teams say "squaring the inputs", "an input curve" or "a joystick curve", and WPILib's parameter is `squareInputs`.
- **Fix:** "Shaping the stick's response like this is called an **input curve** (WPILib's name for this one is `squareInputs`), and drivers notice it immediately."
- **Source:** [`DifferentialDrive.arcadeDrive(double, double, boolean)` Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/drive/DifferentialDrive.html)

### m5: The `Constants.java` promise says "every tunable value", but Ch 20 keeps gains in the classes they describe

- **Where:** §8.5 callout, line 217: "By Chapter 20 your constants will move into their own `Constants.java` file, so the whole team has one place to look for every tunable value on the robot."
- **Problem:** Ch 20 (line 73) quotes this promise back, and then (line 212) sets the opposite rule: "a number lives with the thing it describes", so PID gains, SysId gains and driving rules stay in `Drivetrain` and `DriveWithSticks`. That rule is the better practice (it matches the AdvantageKit templates, which keep per-subsystem constants next to the subsystem), so it's the promise in Ch 8 that should change.
- **Fix:** "By Chapter 20 the constants that several classes share will move into their own `Constants.java` file, and the ones that describe one part of the robot will live with that part."
- **Source:** Ch 20 at HEAD, lines 73 and 212

### m6: Practice 2 (write the smooth deadband) has no stepping stone

- **Where:** Practice 2, line 514.
- **Problem:** For a reader who learned `if` and methods two chapters ago, "rescale the rest so the output is 0.0 at the edge and 1.0 at full stick, and remember negatives" is a two-step algebra problem with no hint. The likely outcome is a student who gives up or copies `MathUtil`. The exercise's "why" (see that a library function is just code you could write) is good and worth keeping.
- **Fix:** Add a hint ladder: "Start with positive values only. At the edge, `value - deadband` is `0`. At full stick it is `1 - deadband`. What do you divide by to turn that into `1.0`? Once that works, handle negatives by using `Math.abs` and putting the sign back at the end (or by mirroring the positive case with an `if`)."
- **Source:** none needed

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | §8.4 "0.04 is four percent power" and Practice 1 (deadband 0.0, "creep or hum"): `arcadeDrive`'s own 0.02 deadband plus squaring turns resting drift into well under 1% power, so the experiment will likely show nothing | none |
| 2 | MINOR | The `left = forward - rotation` callout's example numbers and "if a sum goes past 1.0" don't match `arcadeDriveIK`, which squares first and always scales | none |
| 3 | MINOR | "Correction to Chapter 7" callout patches Ch 7's rotation sign instead of fixing Ch 7 | none |
| 4 | MINOR | The slow mode snippet doesn't say it **replaces** the `arcadeDrive` line, and the `Cmd` widgets show values before scaling | none |
| 5 | MINOR | "Half speed" in slow mode is really about a quarter of full power after squaring | none |
| 6 | MINOR | Practice 3 uses `%`, which the book teaches in Ch 28 | none |
| (not counted) | | "Build, deploy" and "redeploy" throughout; the program runs on the laptop | B3 |
| (not counted) | | "open SmartDashboard" (line 106) | D4, M2 |

## Verdict

Chapter 8 is one of the book's best early chapters: one clear new Java idea per section, each motivated by something the student can feel in their thumbs. The weak spot is numerical honesty. The chapter teaches a mental model ("the number is a fraction of power") and then gives deadband, slow mode and power numbers that ignore the squaring the chapter itself explains, so the hands-on checks won't match what the student was told. Top three changes for Phase C:

1. Rework the drift motivation and Practice 1 so the experiment shows something real (VERIFY 1), for example by running it with `arcadeDrive(forward, rotation, false)`.
2. Make the numbers honest about squaring in one pass: the `arcadeDrive` callout (VERIFY 2), "quarter power" slow mode (VERIFY 5), and "replace this line" for the snippet (VERIFY 4).
3. Teach the two `...Pressed()` traps (m1) and keep slow mode as a named `boolean` (m2), since Ch 9 to 19 copy both patterns.
