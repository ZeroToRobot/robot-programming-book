<!-- counts: blocker=0 major=3 minor=11 build=pass -->

# Chapter 26 SME Review (Phase B, lightweight)

**Chapter:** `src/section-6-mini-swerve/26-from-xrp-to-roborio.md` at HEAD (1555 lines)
**Inputs:** `robot-programming-book-exercises/ch26-from-xrp-to-roborio/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md, with extra weight on robot safety, deploy, and Driver Station practice (the book's first roboRIO chapter).

A careful first roboRIO chapter. The decision to move the program before moving any motor is right, and so is the order: fact sheet, safety rules, image and team number, an empty deploy, then a subsystem that cannot hurt anyone. `RoboRio` is a well-chosen first IO layer: it teaches why `SystemStats` (an output) is not enough for a decision that replay must reproduce, uses WPILib's `Alert` the way the 2025+ docs intend (create once, `set` every loop), and latches the brownout alert for the person who looks after the run. `ROBOT_MODE = RobotBase.isReal() ? REAL : SIM_MODE` matches the AdvantageKit templates. The exceptions section has the right philosophy for robot code (catch only what you can handle, never catch to hide, let bugs crash on the bench), with AdvantageKit's own `WPILOGWriter` catch as the worked example. D2 is applied throughout (Kraken X60 with Talon FX, CANcoder, Pigeon 2), and B2 is applied (pinned `v26.0.2` URL, line 326).

**Prose claims checked against the 2026 docs** (VERIFY.md could not check anything on the real robot):
- Space bar E-stops "even when the Driver Station window is not in front"; Enter disables; after an E-stop the roboRIO must be rebooted; the three-key enable (lines 125, 132): all right. "When connected to the field ... keyboard shortcuts are ignored, space bar included," and the field E-Stop button (line 136): right. Source: [WPILib: FRC Driver Station](https://docs.wpilib.org/en/stable/docs/software/driverstation/driver-station.html).
- Diagnostics tab shows the roboRIO image version, and has **Restart Robot Code** and **Reboot roboRIO** (lines 428, 472): right (same page).
- Brownout stages (line 509 to 512): 6.8 V PWM rail drop; 6.3 V fixed on roboRIO 1, 6.75 V default and settable on roboRIO 2; CAN motor controllers sent a disable, PWM and user rails off; Power LED amber; recovery above 7.5 V; blackout below about 4.5 V: all right. Source: [WPILib: roboRIO Brownout](https://docs.wpilib.org/en/stable/docs/software/roborio-info/roborio-brownouts.html).
- Battery: "12.7 to 13.5 volts" fully charged at rest, and "12.5 volts on an idle robot should be swapped" (lines 486, 489): both quoted correctly. Source: [WPILib: Robot Battery Basics](https://docs.wpilib.org/en/stable/docs/hardware/hardware-basics/robot-battery.html).
- A second VH-109 as the access point for shop practice (line 173): right; the docs "strongly recommend" two VH-109s and advise against the single-radio 2.4 GHz mode at home. Source: [WPILib: Programming your Radio](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/radio-programming.html).
- `Alert` is new in 2025, with `kError`, `kWarning`, `kInfo` (line 680): right. Source: [WPILib: Persistent Alerts](https://docs.wpilib.org/en/stable/docs/software/telemetry/persistent-alerts.html).
- roboRIO 2 imaged on the microSD card, team number set afterward with **Edit Startup Settings** (line 152 to 153): right. Source: [WPILib: roboRIO 2 imaging](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/roborio2-imaging.html).

## New findings (Phase B)

### M1: The safety rules leave out safety glasses and "disable before you touch it"

**Where:** §26.3, rules 1 to 6 (lines 123 to 128), which the chapter says are "the rules for every chapter in Section VI"; the Collab "robot rules" PR (line 1527) copies them into `CONTRIBUTING.md`.

**Problem:** This list becomes the team's written safety rules for eight chapters, and the student is told to copy it into `CONTRIBUTING.md`. It leaves out the two rules every FRC shop enforces first:
1. **Safety glasses** for everyone near an enabled robot (and in the shop at all). FIRST requires them in the pits and on the field, and most teams require them whenever the battery is in.
2. **Disable before anyone reaches in.** Rule 2 covers hands coming away before enabling, but nothing says "the robot is disabled, and the DS shows it, before any hand goes near a module." A disabled robot can be re-enabled by one click from the one laptop; an enabled one on blocks still has wheels and steering gears spinning at Kraken speed, which catch fingers, hair, sleeves, and lanyards. "Wheels off the ground" makes the robot stay put; it does not make spinning modules safe to touch.

A short battery point is also missing: never let anything metal touch both battery terminals (a wrench across a robot battery can weld itself in place). Chapter 27 is the first chapter that spins motors, and it inherits whatever this list says.

**Fix:** Add to the list, as rule 1 so it is read first: "**Safety glasses on.** Everyone within reach of the robot wears safety glasses whenever the battery is plugged in. FIRST requires them at events; wear them in the shop, so it is a habit." Add after rule 2: "**Disabled before hands go in.** Before anyone touches the robot, the Driver Station operator disables it and says 'Disabled!' Then, and only then, hands go in. Spinning modules on blocks still catch fingers, hair, and loose sleeves: tie back long hair, and no lanyards near the robot." Extend rule 5: "Keep metal tools away from the battery terminals: a wrench across them is a short circuit with hundreds of amps behind it." Mention in the Collab bullet that the mentors' own shop rules come first.

**Source:** [FIRST Safety Manual](https://www.firstinspires.org/resource-library/frc/safety-manual) [verify the current URL and the exact glasses rule wording]; [WPILib: Robot Battery Basics](https://docs.wpilib.org/en/stable/docs/hardware/hardware-basics/robot-battery.html)

### M2: `main` and "run it in a scratch file" are never explained, and this is the book's first `main`

**Where:** §26.10 Step 2 (`TeamNumber`, line 1214), Step 3 (`Notes`, line 1261), Practice 1 (line 1407, "run it in a scratch file"), and Practice 3 (lines 1436 to 1443). A grep of `src/` finds `static void main` and `String[] args` in no chapter before 26.

**Problem:** For 25 chapters every program was a robot project started by WPILib. Here the student is handed `public static void main(String[] args)` three times and told to "run it in a scratch file," with no word on what `main` is, what `String[] args` means (arrays are Ch 27), or **how** to run a file that is not a robot project. Practice 3 gives `javac` and `javap` commands but never the `java` command that runs a program. A zero-experience student either drops the file into `src/main/java/frc/robot` (where it builds into the robot jar, or breaks the build for `Notes`, which is meant not to compile) or gets stuck. Phase A asked Phase B to check exactly this `String[] args` signpost; it is missing. It is also a missed connection: `Main.java` (line 224) is the template's `main`, and the jar's `Main-Class` (Practice 4) points at it.

**Fix:** Add a short callout in §26.6 right after the `javap` example, titled "Running a one-file program":

> Every Java program starts in a method named `main`: `public static void main(String[] args)`. Your robot project has one too, in `Main.java`, and it is the class the jar's `Main-Class` line names. (The `String[] args` part is an **array** of words typed after the program's name; you will meet arrays in Chapter 27, and you can ignore it until then.) To try a small program on its own, put it in a folder **outside** your robot project, and in a terminal in that folder run it with WPILib's Java: `& "C:\Users\Public\wpilib\2026\jdk\bin\java.exe" TeamNumber.java` on Windows (PowerShell), or `~/wpilib/2026/jdk/bin/java TeamNumber.java` on a Mac or Linux. Java compiles and runs a one-file program in one step.

Then have Step 2, Step 3, and Practice 1 say "in your scratch folder (Section 26.6)". Practice 3's fence fix is VERIFY 5.

**Source:** [JEP 330: Launch Single-File Source-Code Programs](https://openjdk.org/jeps/330) (Java 11 and later, so WPILib's JDK 17 has it); CLAUDE.md Java skills progression (arrays in Ch 27); Phase A "Concepts used before they are taught"

### m1: "Has to be enabled again before teleop" is not how a field works [verify]

**Where:** §26.10 Step 1, line 1190 ("By the time the program is back, a 15-second autonomous could be over, and your robot has to be enabled again before teleop can use it.").

**Problem:** At an event the field (FMS) controls enable, not the drive team. When the code restarts mid-match, the robot comes back enabled in whatever mode the field is in; nobody presses Enable. The real costs are the seconds of dead robot, everything the code remembered (pose, state machines, which auto step it was on) being gone, and the robot rejoining with fresh state. Students who believe they have to re-enable will look for a button that does not exist on the field. [verify the exact FMS behavior after a code restart against the FRC Game Manual or the FMS docs]

**Fix:** "By the time the program is back, a 15-second autonomous could be over. On the field, the robot comes back enabled in whatever mode the match is in, but it comes back as a brand-new program: its pose, its state machines, and which autonomous step it was on are all gone."

**Source:** [WPILib: FRC Driver Station](https://docs.wpilib.org/en/stable/docs/software/driverstation/driver-station.html) ("FMS Connected" replaces the enable controls)

### m2: The roboRIO image is said to include the JVM, but the deploy installs it [verify]

**Where:** §26.6 line 351 ("The roboRIO's image includes a JVM for ARM"), against §26.7 Step 3 line 438 ("The first deploy of a season may also copy Java itself, if the roboRIO's image did not include it").

**Problem:** The two sentences disagree, and the second is closer to how GradleRIO works: the WPILib JRE for the roboRIO is a deploy artifact that GradleRIO installs when it is missing (which is why the first deploy after imaging is slow). A student who reads 26.6 and then sees a long "deploying JRE" step after a re-image will think something is wrong. [verify against the GradleRIO source or WPILib's deploy docs]

**Fix:** Line 351: "The roboRIO gets a JVM for ARM too: WPILib's deploy tool installs one the first time you deploy to a freshly imaged roboRIO." Line 438: "The first deploy after the roboRIO is imaged also installs Java itself, which takes a few extra minutes, once."

**Source:** [GradleRIO README](https://github.com/wpilibsuite/GradleRIO) ("Deploying alternate JRE")

### m3: The low battery warning can flicker at the threshold

**Where:** §26.8 Step 4, `RoboRio.periodic()` line 721, and the walkthrough at line 767 ("a warning that flickers ... teaches everyone to ignore warnings").

**Problem:** The chapter's own argument for checking only while disabled applies at the threshold too: a resting battery near 12.5 V reads 12.48, 12.51, 12.49 from loop to loop, so the alert blinks on and off at 50 Hz in Elastic's Alerts widget. The book taught `Debouncer` in Ch 20 for exactly this, and real team code debounces battery alerts.

**Fix:** Add a field `private final Debouncer lowBatteryDebouncer = new Debouncer(0.5, DebounceType.kRising);` and set the alert from `lowBatteryDebouncer.calculate(DriverStation.isDisabled() && inputs.batteryVolts < LOW_BATTERY_VOLTS)`. Add to the walkthrough: "It must also stay low for half a second before the warning shows, with Chapter 20's `Debouncer`, so a battery sitting right at 12.5 does not blink." The tests then need `SimHooks.stepTiming` or a `Debouncer` time of zero in the test; if that is too much for this chapter, make it Practice 7 instead and say so in the walkthrough.

**Source:** [WPILib: Debouncer](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/filters/debouncer.html)

### m4: The deploy tool tries its addresses at the same time, not in order [verify]

**Where:** §26.4 callout "Why one robot, many names", line 179 ("tries several addresses for your roboRIO, in order ... Whichever answers first wins") and §26.7 Step 3 item 2 (line 435).

**Problem:** "In order" and "whichever answers first wins" contradict each other. GradleRIO's target discovery starts all the candidate addresses together and uses the first that connects. The practical lesson (one Deploy button for USB and radio) is right; the mechanism is stated two ways.

**Fix:** "The deploy tool tries several addresses for your roboRIO at once: its network name (`roborio-3415-FRC.local`), its radio address (`10.34.15.2`), the USB address (`172.22.11.2`), and a few more for unusual networks. Whichever answers first wins."

**Source:** [GradleRIO](https://github.com/wpilibsuite/GradleRIO) [verify]

### m5: The one-container callout predicts an error Phoenix 6 devices will not give [verify]

**Where:** §26.9 callout "Where the one-container rule went", line 1131 ("The moment a simulation IO class creates something WPILib only allows once, the old rule comes back, and the error will look like Chapter 10's `already allocated`").

**Problem:** The next hardware the Mini Swerve adds is Phoenix 6 devices (Ch 27). Phoenix 6 lets a program create more than one `TalonFX` object with the same CAN ID without throwing, so two tests (or two IO objects) can quietly drive the same simulated device. And roboRIO HAL resources throw `AllocationException: ... previously allocated`, not the XRP's `IllegalArgumentException: XRPMotor 0 already allocated`. The callout sets students up to wait for a crash that will not come.

**Fix:** "Keep an eye on that as the Mini Swerve grows. roboRIO hardware like a DIO channel can still be created only once (the error says `previously allocated`). CAN devices from Phoenix 6 are different: Java lets you make two `TalonFX` objects for one motor without any error, and both will drive it. So the rule from Chapter 7 still stands: create each hardware object once, in one IO class."

**Source:** `hal-java-2026.2.1.jar` (`edu.wpi.first.hal.util.AllocationException`, checked locally); [Phoenix 6 docs](https://v6.docs.ctr-electronics.com/en/stable/) [verify the duplicate-ID behavior]

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | Practice 1's `null` premise is false: `Integer.parseInt(null)` throws `NumberFormatException`, which the `catch` handles | |
| 2 | MINOR [verify] | With no USB stick, the `Logging to` line still prints, then `Failed to open output log file.` | |
| 3 | MINOR | "The enum is Chapter 24's, word for word": the comments changed | |
| 4 | MINOR | "The two lines inside `configureBindings()`" are two statements on three lines plus comments | |
| 5 | MINOR | Practice 3's `&` commands are PowerShell, fenced as `bash` | |
| 6 | MINOR [verify] | AdvantageScope does not show a yellow alert; only Elastic does | |
| 7 | MINOR | CLAUDE.md's Ch 26 entry still says "No CAN/SparkMAX" (book note, not chapter text; Devang by hand) | B1 / D2 |

Covered by Phase A, not counted: line 1352 and the Collab (line 1528) say Elastic's **Load Layout From Robot**; the menu item is **File > Download From Robot** (M2, verified in Elastic 2026.1.1). Chapter length (1555 lines, two Java topics plus Alerts, imaging, and safety) is M4.

## Verdict

The right first roboRIO chapter: no motors, one small honest subsystem, and every claim about the Driver Station, brownouts, batteries, imaging, and the radio checks out against the 2026 WPILib docs. The gaps are at the edges a beginner can't fill in alone. The safety list that the whole of Section VI inherits is missing safety glasses and "disabled before hands go in" (M1). The exception examples are the first plain-Java programs in the book and come with no `main` explanation and no way to run them (M2). And VERIFY 1's Practice question has no correct answer. Top three changes for Phase C:

1. Add safety glasses, "disabled before hands go in," and the battery-terminal rule to §26.3 (M1).
2. Add the "Running a one-file program" callout to §26.6, and point Steps 2 and 3 and Practices 1 and 3 at it (M2, VERIFY 5).
3. Fix Practice 1's `null` question (VERIFY 1), and correct the field re-enable claim and the JVM-on-the-image sentence (m1, m2).
