<!-- counts: blocker=0 major=1 minor=5 build=none -->

# Chapter 1 SME Review (Phase B, lightweight)

**Chapter:** `src/section-1-foundations/01-what-is-frc-programming.md` at HEAD (361 lines)
**VERIFY file:** `robot-programming-book-exercises/ch01-what-is-frc-programming/VERIFY.md` (build=none, no issues)
**Phase A items re-checked:** B1 (line 221 now names Kraken X60, Talon FX, CANcoder, Pigeon 2) and M3 (line 50 and the "Which season this book is written for" callout at line 58) are applied correctly. No gap found.

## New findings (Phase B)

### M1: The "glimpse of real code" teaches habits the book later calls bugs

**Where:** §1.6 "One Glimpse of Real Code", lines 265 to 304, and the Reflect exercise (line 329), which asks students to re-read both snippets after Chapter 19.

**Problem:** The two snippets are what students will hold up against Chapter 19 and Chapter 20, and they don't match what those chapters teach:
- `drivetrain.resetEncoders()` in `initialize()` (line 286). Chapter 12 says the routine "never resets encoders mid-routine", Chapter 14 makes `resetEncoders()` private because resetting breaks odometry, and Chapter 19's `DriveDistance` instead remembers `startDistanceMeters` in `initialize()`. Resetting sensors inside a command is exactly the habit strong teams avoid (it silently corrupts pose estimation).
- `getAverageDistanceMeter()` (line 296) doesn't exist; the book's getter is `getAverageDistanceMeters()` (Ch 9 line 286). A student who searches for it later finds nothing.
- `drivetrain.drive(0.4, 0)` (line 291): from Chapter 13 on, `drive` takes meters per second, and 0.4 m/s is faster than the XRP's measured top speed (`MAX_WHEEL_SPEED_METERS_PER_SECOND` placeholder 0.28).
- `new JoystickButton(controller, XboxController.Button.kA.value).whileTrue(...)` (line 267): the book (Ch 20) and the 2026 WPILib templates use `CommandXboxController`, so the line becomes `controller.a().whileTrue(...)`. Line 263 says this is "the kind of code you'll be writing by Chapter 20", and it isn't.

When the student does the Reflect comparison after Ch 19, they will find the preview contradicts the chapter, or worse, copy the reset-in-initialize pattern.

**Fix:** Rename the command to the book's `DriveDistance` and make it a simplified version of Chapter 19's:

```java
// When the driver holds A, drive forward half a meter
controller.a().whileTrue(new DriveDistance(drivetrain, 0.5));
```

```java
public class DriveDistance extends Command {
    private final Drivetrain drivetrain;
    private final double distanceMeters;
    private double startDistanceMeters = 0.0;

    public DriveDistance(Drivetrain drivetrain, double distanceMeters) {
        this.drivetrain = drivetrain;
        this.distanceMeters = distanceMeters;
        addRequirements(drivetrain);
    }

    @Override
    public void initialize() {
        startDistanceMeters = drivetrain.getAverageDistanceMeters();
    }

    @Override
    public void execute() {
        drivetrain.drive(0.20, 0.0);  // 0.20 meters per second, no turning
    }

    @Override
    public boolean isFinished() {
        return drivetrain.getAverageDistanceMeters() - startDistanceMeters >= distanceMeters;
    }

    @Override
    public void end(boolean interrupted) {
        drivetrain.stop();
    }
}
```

Keep the line-306 sentence and add one: "`initialize` remembers where the robot started, so the command measures its own trip without erasing anything."

**Source:** [WPILib: Binding commands to triggers](https://docs.wpilib.org/en/stable/docs/software/commandbased/binding-commands-to-triggers.html) (`CommandXboxController`); Ch 19 `DriveDistance` (HEAD line 608).

### m1: The XRP is not "WebSockets-based"

**Where:** §1.5, line 211.

**Problem:** "The XRP runs WPILib's WebSockets-based hardware abstraction layer" describes the Romi. The XRP firmware uses "a custom binary protocol over UDP", and the robot program runs on the laptop through WPILib's simulation framework. This also sets up the wrong mental model that B3 is fixing in Ch 2.

**Fix:** "On the XRP, your Java program runs on your laptop, and WPILib talks to the XRP over Wi-Fi. Your code looks almost identical to competition robot code. The class names are slightly different (`XRPMotor` instead of `TalonFX`), but the patterns ... are exactly the same."

**Source:** [xrp-wpilib-firmware README](https://github.com/wpilibsuite/xrp-wpilib-firmware); [WPILib: Programming the XRP](https://docs.wpilib.org/en/stable/docs/xrp-robot/programming-xrp.html)

### m2: Vendor motor classes are called WPILib classes (left for Phase B by Phase A)

**Where:** §1.2 line 76 ("Each has its own Java class in WPILib") and line 98 ("WPILib classes like `XboxController`, `SparkMax`, and `DifferentialDrive`").

**Problem:** `SparkMax` comes from REVLib and `TalonFX` from Phoenix 6, installed as vendor libraries. Students meet vendordeps in Chapter 17 and Chapter 27; if Ch 1 says these are WPILib, the first "cannot find symbol SparkMax" in a new project is confusing.

**Fix:** Line 76: "Each maker ships its own Java library for its controllers (REV's REVLib, CTR Electronics' Phoenix 6), but they all work the same way from your program's perspective." Line 98: "WPILib classes like `XboxController`, `Timer`, and `DifferentialDrive`. Motor controller makers add their own libraries on top, called **vendor libraries**, which you'll install in Chapter 27." Per m1 in Phase A, spell it "SPARK MAX".

**Source:** [WPILib: 3rd party libraries](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/3rd-party-libraries.html)

### m3: Ch 1 also says code is deployed to the XRP (extends B3)

**Where:** Line 108 ("You can deploy to it from your own laptop"), line 209 (table: "Connects to your laptop for deployment"), line 218 ("Deploy from your desk"), line 242 ("still deploys"), line 361 (teaser: "deploy your first (empty) robot program").

**Problem:** B3 lists Ch 2 to 5 only. Ch 1 plants the "deploy" model first, so a Phase C fix that stops at Ch 2 leaves the contradiction.

**Fix:** Line 108: "You can run your code on it from your own laptop". Line 209: "Connects to your laptop, which runs your program". Line 218: "Run it from your desk." Line 242: "still builds, still runs". Line 361: "...flash your XRP firmware, and run your first (empty) robot program on it." Line 52 is about the roboRIO and is right in spirit; drop "over Wi-Fi" (roboRIO deploys usually go over USB or Ethernet, Ch 26).

**Source:** B3 in `reviews/00-book-wide.md`

### m4: The competition-day picture normalizes untested last-minute deploys

**Where:** §1.4 "Competition Day", line 179 ("The programmer is deploying a last-minute fix").

**Problem:** It is presented as the normal, slightly heroic role. Strong teams treat an untested deploy right before a match as a last resort: it is one of the most common ways to lose a match. The book's own Ch 25 and Ch 39 teach tagging and freezing a release. Ch 1 is where habits get set, so the framing matters.

**Fix:** Replace the sentence with: "The programmer is checking the Driver Station, confirming the right autonomous routine is selected, and making sure the code on the robot is the version that was tested. If something must change, a good team has a rule for that too: a small fix, tested in the pits, and committed so everyone knows what's on the robot. Chapter 39 builds that checklist."

### m5: "Driver inputs are ignored" in autonomous is a game rule, not the system

**Where:** §1.3, line 120.

**Problem:** The Driver Station keeps sending controller data during autonomous; it's the game rules that keep drivers' hands off, and your code that must not read the sticks. (2019's Sandstorm drove in autonomous mode with live controllers.) A student who believes the system ignores inputs won't think to guard against it later. Also, "15 to 20 seconds" is fine; 2026 is 20 s [verify against the 2026 game manual].

**Fix:** "The Driver Station connection is still active, but the game rules say drivers can't control the robot, so your program must act entirely on its own..."

**Source:** [verify] 2026 game manual, autonomous period length and driver interaction rule.

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| (none) | | VERIFY.md lists no new issues. The `SparkMax` "WPILib class" note it mentions is reported above as m2 | B1 note |

## Verdict

Chapter 1 does its job well: the 50 Hz loop as "the most important idea", the push-a-button walkthrough and the ecosystem map are exactly the right mental model for a zero-experience reader, and the length is comfortable. The Phase A fixes are in place. The one real problem is the code glimpse, which previews a version of the command the book later teaches against. Top three changes for Phase C: (1) replace the §1.6 snippets with a simplified Chapter 19 `DriveDistance` and a `CommandXboxController` binding (M1); (2) change "deploy" to "run" in Ch 1 alongside B3, and fix the WebSockets line (m3, m1); (3) correct the vendor-library wording at lines 76 and 98 (m2).
