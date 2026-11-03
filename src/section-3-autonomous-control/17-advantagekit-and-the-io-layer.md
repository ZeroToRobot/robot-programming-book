# Chapter 17: AdvantageKit and the IO Layer

In Chapter 16 you taught the Explorer to know itself in numbers. Four short experiments, one log file, and SysId handed you kS, kV, and kA for each side: how many volts it takes to get moving, to hold a speed, and to speed up. You put those numbers into a feedforward, and the robot started driving the speed you asked for before PID did anything at all.

Look at how you got those numbers. The robot drove, a log file recorded what it did, and afterward a tool read the file and told you something you could not have seen by watching. That is a **flight recorder**, and it is one of the most useful things a robot can have. When an autonomous routine goes wrong at a competition, it goes wrong once, in two seconds, with a crowd watching. Without a recording, all you have is what people remember. With a good one, you can sit down after the match and see exactly what every sensor said and what your code decided.

This chapter gives the Explorer a much better flight recorder: **AdvantageKit**, a logging library written by FRC Team 6328, Mechanical Advantage, and used by many of the best teams in the world. AdvantageKit records every **input** your code receives, so carefully that you can later play a run back through your code and watch it make the same decisions again.

To make that work, AdvantageKit needs every reading from the hardware to pass through one place where it can be recorded. So you will split `Drivetrain` in two, along a clean line: the **logic** (kinematics, feedforward, odometry) above, and the **hardware** (motors, encoders, gyro) below. The hardware half goes into a small class of its own, behind a standard shape that any hardware could fit. The pattern is called an **IO layer**. It pays off three times: AdvantageKit records everything that crosses the line; in Chapter 18 you will plug a simulated robot in below the line, and drive the Explorer with no robot at all; and when you move to the roboRIO in Chapter 27, most of your drivetrain code will not need to change.

This is the most important structural change since you created `Drivetrain` in Chapter 7. You will use the same pattern on every robot for the rest of this book: the Mini Swerve in Section VI and the competition robot in Section VII both get IO layers.

On the Java side, you will learn the idea that makes an IO layer possible: **interfaces**, including **default methods**, the kind AdvantageKit uses.

You will need your XRP for the whole chapter. When you finish, the Explorer should drive the same as it did at the end of Chapter 16, within your PID tolerances. That is the point: a big change on the inside, and nothing different on the floor.

---

## 17.1 Finding the Seam: Logic Above, Hardware Below

To record everything the hardware says, and later to swap one robot for another, the code needs one place where the hardware plugs in. Look at your `Drivetrain` from Chapter 16. It does three different kinds of jobs, all mixed together in one class:

- **The public interface** (the methods other classes call): `drive()`, `arcadeDrive()`, `setVolts()`, `getPose()`, `resetPose()`, the getters.
- **The control logic** (the thinking): inverse kinematics, desaturation, feedforward, odometry, the stop deadband.
- **The hardware interface** (the talking): `new XRPMotor(0)`, `new Encoder(4, 5)`, `leftEncoder.getDistance()`, `gyro.getAngle()`, `diffDrive.tankDrive(...)`.

Only the third kind is about the XRP. The kinematics do not care whether the wheels are real. The feedforward does not care whether the volts go to a motor or an equation. Odometry only needs two distances and a heading; it does not care where they came from.

So that is the seam. Cut the class in two: everything that thinks stays in `Drivetrain`, and everything that talks to hardware moves into a separate, small **IO class** (IO is short for input/output). Then the IO class is the only place the hardware is read, so it is the one place AdvantageKit has to watch. And because `Drivetrain` only knows the shape of the plug, not what is behind it, you can later write a second IO class, a simulated robot (Chapter 18), and plug either one into the same `Drivetrain`:

```
                    Robot.java
                        |
                        v
  +---------------------------------------------+
  | Drivetrain                                  |
  |   drive(), getPose(), resetPose(), ...      |   the logic: identical
  |   kinematics, feedforward, odometry         |   on both robots
  +---------------------------------------------+
         | volts down               ^ readings up
         v                          |
  +---------------------------------------------+
  | DrivetrainIO: the seam                      |
  +---------------------------------------------+
         |                                |
         v                                v
  DrivetrainIOXRP                  DrivetrainIOSim
  motors, encoders, gyro           a model built from
  on the real XRP                  your SysId numbers
  (this chapter)                   (Chapter 18)
```

Only two things cross the seam:

- **Going down: outputs.** The volts for each side. That is all the hardware needs to be told.
- **Coming up: inputs.** What the hardware reports: each side's distance and speed, the heading, the turn rate, and the volts it is actually applying.

Think of a wall outlet. A lamp does not care whether the electricity in the wall came from a power plant, a solar panel, or a generator in the garage. It only cares that the outlet has the standard shape and gives the standard voltage. The outlet is the seam. As long as every power source fits the same outlet, every lamp works with every power source.

`DrivetrainIO` is the Explorer's outlet. To build it, you need a way to write down "the standard shape" in Java. That is exactly what an interface is.

> **Why the seam goes here**
>
> You could cut anywhere: put the feedforward in the IO class, or the kinematics. AdvantageKit's rule is to cut as low as possible, so the IO class only reads sensors and sends commands, and every bit of thinking stays above it. Thinking that lives above the seam runs the same way on every robot, so a bug you fix on one robot (or, from Chapter 18, in the simulator) is fixed on every robot. Thinking that hides below the seam has to be written, and debugged, once per robot.

---

## 17.2 New Java: Interfaces

Start with a smaller example than a drivetrain.

Suppose the Explorer needs a distance sensor. Today it uses the XRP's rangefinder. Next year, you might use a different sensor. And in a simulation, there is no sensor at all, so you want a pretend one that returns whatever number you choose. The code that uses the sensor (the wall stop in teleop, say) only ever asks one question: "how far is it to the wall?" It should not have to change when the sensor does.

An **interface** writes down that question as a promise, with no answer attached:

```java
public interface DistanceSensor {
    /** How far ahead the nearest object is, in meters. */
    double getDistanceMeters();
}
```

Read it aloud: "A `DistanceSensor` is anything that can tell you its distance in meters." That is all an interface is: a list of method signatures (Chapter 11: the name, the parameter types, and the return type) with no bodies. There are no curly braces after `getDistanceMeters()`, just a semicolon. The interface says **what** a distance sensor can do and says nothing about **how**.

An interface cannot do anything by itself. You cannot write `new DistanceSensor()`, any more than you can plug a lamp into the idea of an outlet. You need a class that keeps the promise. A class **implements** an interface by saying so, and then writing a body for every method the interface lists:

```java
import edu.wpi.first.wpilibj.xrp.XRPRangefinder;

/** The real XRP rangefinder, as a DistanceSensor. */
public class RangefinderDistanceSensor implements DistanceSensor {
    private final XRPRangefinder rangefinder = new XRPRangefinder();

    @Override
    public double getDistanceMeters() {
        return rangefinder.getDistanceMeters();
    }
}
```

```java
/** A pretend sensor that always reports the same distance. For testing. */
public class FixedDistanceSensor implements DistanceSensor {
    private final double distanceMeters;

    public FixedDistanceSensor(double distanceMeters) {
        this.distanceMeters = distanceMeters;
    }

    @Override
    public double getDistanceMeters() {
        return distanceMeters;
    }
}
```

Walk through it:

- **`implements DistanceSensor`** is a promise to the compiler: "this class has every method `DistanceSensor` lists." The compiler holds you to it. If you leave out `getDistanceMeters()`, the build fails with an error like `RangefinderDistanceSensor is not abstract and does not override abstract method getDistanceMeters() in DistanceSensor`. Read it the Chapter 10 way: the class broke its promise, and the message names the missing method.
- **`@Override`** is the same annotation you have written on `teleopPeriodic()` since Chapter 5. It tells the compiler "this method is meant to fill in one from above." If you misspell the method name, `@Override` turns a silent bug into a compile error. Always write it.
- **The two classes have nothing else in common.** One owns an `XRPRangefinder`; the other owns a number. They are completely different inside. All they share is the promise.
- **Methods in an interface are automatically `public`**, so the interface does not need to say so. The classes that implement them must write `public`, because a promise made in public must be kept in public.

> **Interface vs `extends`**
>
> In Chapter 5, `Robot extends TimedRobot` meant "a `Robot` **is a** `TimedRobot`, and gets all of its code for free." Chapter 14 added "has a" (composition). An interface is a third relationship: "**can do**." A class `implements` an interface to promise it can do certain things, but it gets no code for free; it writes every method itself. A class can only `extends` one parent class, but it can implement as many interfaces as it likes.

### You have been using interfaces since Chapter 7

Open `XRPMotor` in WPILib's source (or hover over it in VS Code and follow the link). Its first line is:

```java
public class XRPMotor implements MotorController {
```

`MotorController` is a WPILib interface with methods like `set(double speed)`, `get()`, and `setInverted(boolean)`. WPILib's motor controller classes implement it, from the XRP's little motors to the PWM controllers on full-size robots. That is why so much WPILib code works with motors it has never heard of. It is written against the promise, not against any particular motor.

### Default methods: a promise with a fallback

One more piece, because AdvantageKit's IO layers use it. Since Java 8, an interface may give a method a **default** body, used by any class that does not write its own:

```java
public interface DistanceSensor {
    double getDistanceMeters();

    /** True if something is closer than the given distance. */
    default boolean isObstacleWithin(double meters) {
        return getDistanceMeters() < meters;
    }
}
```

Now every `DistanceSensor` can answer `isObstacleWithin(...)` for free, built on top of the one method it had to write. A class can still `@Override` it if it has a better answer. (`MotorController` does this too: its `setVoltage(...)` method is a default, written once in the interface on top of `set(...)`, so every motor controller gets it without writing it.)

AdvantageKit takes this one step further: in an IO interface, **every** method gets a default body, and the defaults do nothing at all. That sounds strange, but it gives you a third kind of IO for free: one that has no hardware and no model, and simply does nothing when asked. You will need exactly that in Chapter 25, when you replay a log file and the "hardware" is the log. For now, there is one consequence to remember:

> **A common beginner mistake**
>
> When an interface's methods all have empty defaults, the compiler cannot tell you that you forgot one. If an IO class leaves out `setVolts()`, it still compiles; the default runs, does nothing, and the robot never moves. The only protection is the habit from Section 17.2: write `@Override` on every method you mean to fill in, and when something "does nothing," check whether your method's name or parameters match the interface exactly.

---

## 17.3 AdvantageKit: A Flight Recorder That Can Replay

You already have a flight recorder. Since Chapter 10, `DataLogManager` has written a log file every time the program runs: your event messages, the Driver Station state, and everything on NetworkTables. In Chapter 16, SysId read that file to measure your robot.

**AdvantageKit** is a different kind of recorder, and it is built around the seam from Section 17.1. Its big idea is this: if you record every **input** your code receives (every sensor reading, every button press, every timestamp), then the inputs are the whole story. Your robot code is just a machine that turns inputs into outputs. Feed the same inputs back into the same code, and it must make the same decisions, loop for loop. That means you can take a log from a real match, play its inputs back into your code on a laptop, and watch your code make the same mistake it made on the field. Then add a print, fix the bug, and play it again to prove the fix. That is called **log replay**, and it is the deep dive in Chapter 25.

For replay to work, AdvantageKit has to see every input, which means every input has to flow through one place where it can be recorded. That place is the IO layer's **inputs** object. So the IO pattern you are about to build does two jobs at once: it gives AdvantageKit a single, clean list of everything the hardware said, and (in Chapter 18) it lets you swap the real robot for a simulated one.

> **Who makes AdvantageKit?**
>
> AdvantageKit is free and open source, written and maintained by FRC Team 6328, Mechanical Advantage, from Littleton, Massachusetts. They also make **AdvantageScope**, the log viewer that comes with WPILib, which you used for the map in Chapter 14 and the PID graphs in Chapter 15. Section 17.5 shows what it can do with AdvantageKit's recordings. Many top teams use both, and the IO layer pattern you are learning in this chapter is how their code is organized.

### Step 1: Install the AdvantageKit library

AdvantageKit is a **vendor library** (a vendordep): code from outside WPILib that you add to a project. In VS Code, with your Explorer project open:

1. Open the command palette (`Ctrl+Shift+P`, or `Cmd+Shift+P` on a Mac) and run **WPILib: Manage Vendor Libraries**.
2. Choose **Install new libraries (online)**.
3. Paste this URL and press Enter:

```
https://github.com/Mechanical-Advantage/AdvantageKit/releases/download/v26.0.2/AdvantageKit.json
```

That link names a version on purpose. **AdvantageKit 26.0.2** is the newest version that runs on WPILib 2026 and the roboRIO, the versions this whole book uses (Chapter 2). A "latest" link would one day hand you a version built for a different robot controller, and your project would stop building. If VS Code later offers to update AdvantageKit, decline: the file's own update link points at the newest release, not at 26.0.2.

A new file appears in your project: `vendordeps/AdvantageKit.json`. It tells Gradle which version of AdvantageKit to download. The next build needs an internet connection, once, to download it.

### Step 2: Add two lines to `build.gradle`

AdvantageKit writes some code for you while your project builds (you will see what in Step 4). Gradle has to be told to let it. Open `build.gradle` (in the top folder of your project, next to `src`). Find the `dependencies {` block. Add these two lines at the end of it, just before its closing `}`:

```groovy
    def akitJson = new groovy.json.JsonSlurper().parseText(new File(projectDir.getAbsolutePath() + "/vendordeps/AdvantageKit.json").text)
    annotationProcessor "org.littletonrobotics.akit:akit-autolog:$akitJson.version"
```

The first line reads the version number out of `AdvantageKit.json`. The second adds AdvantageKit's **annotation processor**, a small program that runs during the build. Then add this block at the very end of `build.gradle`, after everything else:

```groovy
task(replayWatch, type: JavaExec) {
    mainClass = "org.littletonrobotics.junction.ReplayWatch"
    classpath = sourceSets.main.runtimeClasspath
}
```

You will not use `replayWatch` until Chapter 25, but it is part of AdvantageKit's standard setup, and adding it now means `build.gradle` is finished.

Both blocks come straight from AdvantageKit's installation page (linked in Additional Resources). Copy them carefully: Gradle files are fussy, and a missing quote or brace makes the whole build fail. If the build fails after this step, compare your lines with the documentation character by character.

### Step 3: `Robot` becomes a `LoggedRobot`

AdvantageKit needs to run a little code at the start and end of every loop, to record the inputs and save the outputs. It does that with its own robot base class. Change the first line of your class:

```java
public class Robot extends LoggedRobot {
```

and replace the import of `TimedRobot` with:

```java
import org.littletonrobotics.junction.LoggedRobot;
```

`LoggedRobot` works just like `TimedRobot`: the same mode methods, the same 20 millisecond loop. Your `autonomousPeriodic()`, `teleopPeriodic()`, and the rest keep working unchanged. This is Chapter 5's `extends` paying off: swap the parent class, and every method you wrote is still an `@Override` of the same method in the new parent.

Then AdvantageKit has to be told where to send what it records, and started. That goes at the very **top** of the `Robot()` constructor, so the logger is running before anything the constructor creates (the drivetrain and the sensors). (Java creates the fields that have an `=` right on their line, like the controller and the timers, just before the constructor runs. AdvantageKit does not record any of those, so that is fine.) You will see the top of the finished constructor in Section 17.4. Here is the new part:

```java
// AdvantageKit first, before anything the constructor creates (Section 17.3).
Logger.recordMetadata("ProjectName", "XRP Explorer");
Logger.addDataReceiver(new WPILOGWriter());   // write a log file into logs/
Logger.addDataReceiver(new NT4Publisher());   // publish live, for AdvantageScope
Logger.start();
```

- **`recordMetadata`** writes a label into the log, so a log file found months later says what it is.
- **`WPILOGWriter`** saves everything to a log file. Running on your laptop, it writes into the same `logs/` folder `DataLogManager` uses, with a name that starts with `akit_`.
- **`NT4Publisher`** publishes everything live over NetworkTables, so AdvantageScope can graph it while the robot runs.
- **`Logger.start()`** starts recording. After this line, no more receivers or metadata can be added.

> **Two flight recorders**
>
> Keep `DataLogManager.start()` in the constructor, right after `Logger.start()`. From now on, each run of your program writes **two** log files into `logs/`: the `FRC_...` file from Chapter 10, and the new `akit_...` file. Your SysId routine from Chapter 16 still writes to the `FRC_...` file, and SysId still reads it exactly as in Section 16.7. AdvantageKit's file is the one AdvantageScope and log replay are built around.
>
> One side effect: `DataLogManager` records everything on NetworkTables, and `NT4Publisher` puts everything AdvantageKit records there. So the `FRC_...` file now also holds a copy of every AdvantageKit value, under `NT:/AdvantageKit/`. When you load it in SysId, the list is much longer than in Chapter 16, but the entries you want are still the seven whose names end in `-drive`. Recording everything twice is wasteful, and Chapter 25 retires one of the recorders.

### Step 4: `@AutoLog`, the code you do not write

AdvantageKit can only record an inputs object if the object knows how to write itself into a log, field by field, and read itself back out again for replay. Writing those two methods by hand would be dull and easy to get wrong: add a field, forget to log it, and replay silently breaks.

So AdvantageKit writes them for you. You put an **annotation** on the inputs class:

```java
@AutoLog
public static class DrivetrainIOInputs {
    public double leftDistanceMeters = 0.0;
    // ... more fields
}
```

You have seen annotations since Chapter 5: `@Override` is a note to the compiler. `@AutoLog` is a note to AdvantageKit's annotation processor (the one you added in Step 2). During every build, the processor looks for classes marked `@AutoLog` and **generates** a new class for each one, named after it with `AutoLogged` on the end: `DrivetrainIOInputsAutoLogged`. The generated class has every field of yours, plus the logging code, written out one line per field. Here is the start of it, so you can see there is no magic:

```java
public class DrivetrainIOInputsAutoLogged extends DrivetrainIO.DrivetrainIOInputs implements LoggableInputs, Cloneable {
  @Override
  public void toLog(LogTable table) {
    table.put("LeftDistanceMeters", leftDistanceMeters);
    table.put("RightDistanceMeters", rightDistanceMeters);
    // ... one line for every field
  }
  // ... fromLog() reads them back the same way
```

Notice two things you already know. It `extends` your class, so it **is a** `DrivetrainIOInputs` and can go anywhere one is expected. And it `implements LoggableInputs`, an AdvantageKit interface with two methods, `toLog` and `fromLog`: the promise that it can be logged. That is the interface and the "is a" relationship working together.

You never edit the generated file. It lives in your project's `build` folder, and Gradle rewrites it on every build. You only create objects of it.

> **If VS Code says `DrivetrainIOInputsAutoLogged` cannot be found**
>
> The generated class does not exist until the first successful build. Until then, VS Code underlines it in red. Build once (**WPILib: Build Robot Code**), and the red goes away. If it does not, check Step 2: without the `annotationProcessor` line, the processor never runs and the class is never written.

---

## 17.4 The Drivetrain IO Layer

Time to cut the drivetrain along the seam. You will end up with three files where you had one:

| File | What it is | Talks to hardware? |
|---|---|---|
| `DrivetrainIO.java` | The interface: the seam itself, plus the inputs class | No |
| `DrivetrainIOXRP.java` | The real XRP's motors, encoders, and gyro | Yes |
| `Drivetrain.java` | The logic, now built on top of any `DrivetrainIO` | No |

All three go in `src/main/java/frc/robot`, next to `Robot.java`. Do this section with your real XRP, and test it at the end: when you are done, the Explorer should drive the same as it did in Chapter 16. (In Chapter 18, a fourth file, `DrivetrainIOSim.java`, joins them: a simulated robot.)

### `DrivetrainIO`: the seam

Create `DrivetrainIO.java`. Type it, do not paste:

```java
package frc.robot;

import org.littletonrobotics.junction.AutoLog;

/**
 * Everything the drivetrain needs from its hardware, and nothing else. A real XRP
 * and a simulated one each implement this interface in their own way.
 */
public interface DrivetrainIO {

    /** What the hardware reports, read once per loop. AdvantageKit logs every field. */
    @AutoLog
    public static class DrivetrainIOInputs {
        public double leftDistanceMeters = 0.0;
        public double rightDistanceMeters = 0.0;
        public double leftSpeedMetersPerSecond = 0.0;
        public double rightSpeedMetersPerSecond = 0.0;
        public double leftAppliedVolts = 0.0;
        public double rightAppliedVolts = 0.0;
        public double headingDegrees = 0.0;
        public double turnRateDegreesPerSecond = 0.0;
    }

    /**
     * Read every sensor and copy the readings into {@code inputs}.
     *
     * @param inputs the object to fill in; the drivetrain reads only from this
     */
    default void updateInputs(DrivetrainIOInputs inputs) {}

    /**
     * Drive each side at a voltage.
     *
     * @param leftVolts the left side's voltage; positive drives forward
     * @param rightVolts the right side's voltage; positive drives forward
     */
    default void setVolts(double leftVolts, double rightVolts) {}
}
```

Walk through it:

- **`DrivetrainIOInputs`** is a plain data class, like `ChassisSpeeds` in Chapter 13: public fields, no methods, just numbers traveling together. It lists every input that crosses the seam. Every name ends in its unit, as always, and AdvantageScope will read those unit words too.
- **It is written inside the interface**, as a **nested class**. You have used nested types before (`SysIdRoutineLog.State` in Chapter 16, `DifferentialDrive.WheelSpeeds` below). Putting it here keeps the seam's two halves together: what goes down (`setVolts`) and what comes up (`DrivetrainIOInputs`). From outside, its full name is `DrivetrainIO.DrivetrainIOInputs`. The `static` means it does not belong to any particular IO object.
- **`updateInputs` takes the inputs object and fills it in.** It does not return a new one. That is Chapter 13's "a method that changes an object" (`desaturate`), used on purpose: `Drivetrain` makes one inputs object, once, and the IO class refreshes it every loop.
- **Two methods, both `default` and both empty**, the AdvantageKit way (Section 17.2). Only two methods cross the seam, because the hardware has only two jobs: report, and drive.

> **What is not in the interface**
>
> There is no `resetEncoders()` and no `resetGyro()`. The IO layer only reads and drives; it never changes what a sensor reports. You will see in a moment how `Drivetrain` zeroes its sensors without touching the hardware at all, and why that is better.

### `DrivetrainIOXRP`: the real robot

Create `DrivetrainIOXRP.java`. Almost everything in it is cut from your old `Drivetrain`, so most of the lines will look familiar:

```java
package frc.robot;

import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj.xrp.XRPGyro;
import edu.wpi.first.wpilibj.xrp.XRPMotor;

/** The real XRP's drivetrain hardware: two motors, two encoders, and the gyro. */
public class DrivetrainIOXRP implements DrivetrainIO {

    // Facts about the XRP's encoders. Only this class talks to them, so they live here.
    private static final double COUNTS_PER_WHEEL_REV = 585.0;   // 12 counts x 48.75:1
    private static final double METERS_PER_COUNT =
        Math.PI * Drivetrain.WHEEL_DIAMETER_METERS / COUNTS_PER_WHEEL_REV;

    // Motors.
    private final XRPMotor leftMotor = new XRPMotor(0);
    private final XRPMotor rightMotor = new XRPMotor(1);
    private final DifferentialDrive diffDrive =
        new DifferentialDrive(leftMotor::set, rightMotor::set);

    // Sensors.
    private final Encoder leftEncoder = new Encoder(4, 5);
    private final Encoder rightEncoder = new Encoder(6, 7);
    private final XRPGyro gyro = new XRPGyro();

    // The volts most recently sent to each side. The motors cannot tell us, so we remember.
    private double leftVolts = 0.0;
    private double rightVolts = 0.0;

    public DrivetrainIOXRP() {
        rightMotor.setInverted(true);

        // From now on, getDistance() returns meters.
        leftEncoder.setDistancePerPulse(METERS_PER_COUNT);
        rightEncoder.setDistancePerPulse(METERS_PER_COUNT);
    }

    @Override
    public void updateInputs(DrivetrainIOInputs inputs) {
        inputs.leftDistanceMeters = leftEncoder.getDistance();
        inputs.rightDistanceMeters = rightEncoder.getDistance();
        inputs.leftSpeedMetersPerSecond = leftEncoder.getRate();
        inputs.rightSpeedMetersPerSecond = rightEncoder.getRate();
        inputs.leftAppliedVolts = leftVolts;
        inputs.rightAppliedVolts = rightVolts;
        inputs.headingDegrees = gyro.getAngle();
        inputs.turnRateDegreesPerSecond = gyro.getRate();
    }

    @Override
    public void setVolts(double leftVolts, double rightVolts) {
        this.leftVolts = leftVolts;
        this.rightVolts = rightVolts;

        // Pretend volts become power: divide by the nominal battery voltage (Section 16.2).
        diffDrive.tankDrive(
            leftVolts / Drivetrain.NOMINAL_BATTERY_VOLTS,
            rightVolts / Drivetrain.NOMINAL_BATTERY_VOLTS,
            false);
    }
}
```

Walk through it:

- **`implements DrivetrainIO`**, then an `@Override` for each of the interface's two methods. Without the `@Override`s, a typo in a method name would silently leave the default (do nothing) in charge.
- **Every piece of XRP hardware is here, and only here.** The motors, the inversion of the right motor, the encoder channels, the counts per revolution, the gyro. If you ever moved this code to a robot with different motors, this is the only file that would change.
- **`COUNTS_PER_WHEEL_REV` and `METERS_PER_COUNT` moved here** from `Drivetrain`, because they describe these encoders. The wheel diameter stays in `Drivetrain`, because Chapter 18's simulator will need it too; this class reaches it as `Drivetrain.WHEEL_DIAMETER_METERS`.
- **`updateInputs`** reads each sensor exactly once and copies the reading into the inputs object. Nothing else in the whole program reads these sensors any more.
- **`leftVolts` and `rightVolts`** are the remembered volts from Chapter 16, moved down a layer. They are reported as inputs, so the log always shows what the motors were told.
- **`setVolts`** is the only place pretend volts turn into power. If you ever change how volts work on the XRP (and when Chapter 27 moves to a robot that can measure real volts), this one method is what changes.

### `Drivetrain`: the logic, on top of the seam

Now the old `Drivetrain`, with the hardware taken out. Here is the complete file. The changes since Chapter 16 are:

- the `Encoder`, `XRPGyro`, and `XRPMotor` imports are gone (`DifferentialDrive` stays, for its static arcade math), and `Logger` is imported;
- `WHEEL_DIAMETER_METERS`, `TRACKWIDTH_METERS`, `NOMINAL_BATTERY_VOLTS`, and the six gains are now `public`, because the IO classes need them;
- the motors, encoders, gyro, `DifferentialDrive`, and remembered volts are replaced by two fields, `io` and `inputs`;
- three new "zero" fields, and a `zeroSensors()` method that replaces `resetEncoders()` and `resetHeading()`;
- the constructor takes a `DrivetrainIO`;
- `updateOdometry()` becomes `periodic()`, which reads the inputs first;
- `arcadeDrive` and `setVolts` send volts through `io`;
- every getter reads from `inputs`; `getLeftCount()` and `getRightCount()` are gone;
- a few comments are reworded to match: the `NOMINAL_BATTERY_VOLTS` comment, the odometry field's comment, and the Javadoc on `setVolts` and `calculateVolts`.

Replace your whole `Drivetrain.java` with this. Type the changed parts, do not paste:

```java
package frc.robot;

import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.Volts;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.SimpleMotorFeedforward;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.DifferentialDriveKinematics;
import edu.wpi.first.math.kinematics.DifferentialDriveOdometry;
import edu.wpi.first.math.kinematics.DifferentialDriveWheelSpeeds;
import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj.sysid.SysIdRoutineLog;
import org.littletonrobotics.junction.Logger;

public class Drivetrain {

    // Physical facts about the XRP drivetrain. Public, because the IO classes need them too.
    // Sharing is safe: a final value can never be changed by anyone.
    public static final double WHEEL_DIAMETER_METERS = 0.060;
    public static final double TRACKWIDTH_METERS = 0.155;      // wheel center to wheel center

    // Measured at full power on our floor (Section 13.8). Re-measure with new batteries.
    private static final double MAX_WHEEL_SPEED_METERS_PER_SECOND = 0.28;

    // The XRP cannot measure its batteries, so "volts" in this program means power times
    // this number. Four fresh AA cells give about 6 volts (Section 16.2).
    public static final double NOMINAL_BATTERY_VOLTS = 6.0;

    // Feedforward gains from SysId (Section 16.7). EXAMPLE VALUES: replace them with
    // your own robot's, and write the date you measured them. The simulator uses them too.
    public static final double LEFT_KS_VOLTS = 0.95;
    public static final double LEFT_KV_VOLT_SECONDS_PER_METER = 18.0;
    public static final double LEFT_KA_VOLT_SECONDS_SQUARED_PER_METER = 1.1;
    public static final double RIGHT_KS_VOLTS = 0.85;
    public static final double RIGHT_KV_VOLT_SECONDS_PER_METER = 17.4;
    public static final double RIGHT_KA_VOLT_SECONDS_SQUARED_PER_METER = 0.9;

    // Asked for less than this, a wheel stops instead of pushing against friction.
    private static final double STOPPED_SPEED_METERS_PER_SECOND = 0.005;

    // The hardware, real or simulated. This class never needs to know which.
    private final DrivetrainIO io;
    private final DrivetrainIOInputsAutoLogged inputs = new DrivetrainIOInputsAutoLogged();

    // The math that connects robot motion to wheel speeds.
    private final DifferentialDriveKinematics kinematics =
        new DifferentialDriveKinematics(TRACKWIDTH_METERS);

    // The math that connects wheel speeds to volts: one model per side,
    // because no two motors are exactly alike.
    private final SimpleMotorFeedforward leftFeedforward = new SimpleMotorFeedforward(
        LEFT_KS_VOLTS, LEFT_KV_VOLT_SECONDS_PER_METER, LEFT_KA_VOLT_SECONDS_SQUARED_PER_METER);
    private final SimpleMotorFeedforward rightFeedforward = new SimpleMotorFeedforward(
        RIGHT_KS_VOLTS, RIGHT_KV_VOLT_SECONDS_PER_METER, RIGHT_KA_VOLT_SECONDS_SQUARED_PER_METER);

    // Keeps track of where the robot is on the floor. Created in the constructor,
    // after the first sensor readings arrive.
    private final DifferentialDriveOdometry odometry;

    // What each sensor read at the last pose reset. Every reading is measured from here.
    private double leftZeroMeters = 0.0;
    private double rightZeroMeters = 0.0;
    private double headingZeroDegrees = 0.0;

    /**
     * Create the drivetrain on top of some hardware.
     *
     * @param io the hardware to drive: a {@code DrivetrainIOXRP} or a {@code DrivetrainIOSim}
     */
    public Drivetrain(DrivetrainIO io) {
        this.io = io;

        // Read the hardware once, and call those first readings zero.
        readInputs();
        zeroSensors();

        // Start counting from here, at pose (0, 0), facing 0.
        odometry = new DifferentialDriveOdometry(
            getRotation2d(), getLeftDistanceMeters(), getRightDistanceMeters());
    }

    // Every loop

    /**
     * Read the hardware, log what it said, and update the pose. Call this once every loop,
     * in every mode, before anything else asks the drivetrain a question.
     */
    public void periodic() {
        readInputs();
        odometry.update(getRotation2d(), getLeftDistanceMeters(), getRightDistanceMeters());
        Logger.recordOutput("Drivetrain/Pose", getPose());
    }

    /** Copy the hardware's readings into inputs, and hand them to AdvantageKit. */
    private void readInputs() {
        io.updateInputs(inputs);
        Logger.processInputs("Drivetrain", inputs);
    }

    // Driving by power

    /**
     * Drive the robot with arcade controls. The inputs are squared, which gives
     * finer control at low speed: half stick (0.5) becomes quarter power (0.25).
     *
     * @param forward forward speed, -1.0 (full reverse) to 1.0 (full forward)
     * @param rotation turn speed, -1.0 to 1.0; positive turns left (counterclockwise)
     */
    public void arcadeDrive(double forward, double rotation) {
        arcadeDrive(forward, rotation, true);
    }

    /**
     * Drive the robot with arcade controls, choosing whether to square the inputs.
     *
     * @param forward forward speed, -1.0 (full reverse) to 1.0 (full forward)
     * @param rotation turn speed, -1.0 to 1.0; positive turns left (counterclockwise)
     * @param squareInputs true to square the inputs (gentle near center),
     *     false for a linear response (0.5 means 0.5)
     */
    public void arcadeDrive(double forward, double rotation, boolean squareInputs) {
        // The same arcade math as always, then each side's power becomes volts.
        DifferentialDrive.WheelSpeeds powers =
            DifferentialDrive.arcadeDriveIK(forward, rotation, squareInputs);
        setVolts(powers.left * NOMINAL_BATTERY_VOLTS, powers.right * NOMINAL_BATTERY_VOLTS);
    }

    /** Stop both motors. */
    public void stop() {
        setVolts(0.0, 0.0);
    }

    // Driving by voltage

    /**
     * Drive each side at a voltage, limited to the battery's range.
     *
     * @param leftVolts the left side's voltage; positive drives forward
     * @param rightVolts the right side's voltage; positive drives forward
     */
    public void setVolts(double leftVolts, double rightVolts) {
        io.setVolts(
            MathUtil.clamp(leftVolts, -NOMINAL_BATTERY_VOLTS, NOMINAL_BATTERY_VOLTS),
            MathUtil.clamp(rightVolts, -NOMINAL_BATTERY_VOLTS, NOMINAL_BATTERY_VOLTS));
    }

    // Driving by velocity

    /**
     * Drive the robot at a chassis velocity, using inverse kinematics and feedforward.
     * If a wheel would need to go faster than it can, both wheels slow down
     * together, so the robot still follows the same curve.
     *
     * @param speeds the desired motion; vy is ignored, because a differential drive
     *     cannot move sideways
     */
    public void drive(ChassisSpeeds speeds) {
        // Inverse kinematics: robot motion in, wheel speeds out.
        DifferentialDriveWheelSpeeds wheelSpeeds = kinematics.toWheelSpeeds(speeds);

        // Changes wheelSpeeds itself: no wheel above top speed, same curve.
        wheelSpeeds.desaturate(MAX_WHEEL_SPEED_METERS_PER_SECOND);

        // Feedforward: wheel speeds in, volts out, one model per side.
        setVolts(
            calculateVolts(leftFeedforward, wheelSpeeds.leftMetersPerSecond),
            calculateVolts(rightFeedforward, wheelSpeeds.rightMetersPerSecond));
    }

    /**
     * Drive the robot at a forward speed and turn rate, using inverse kinematics.
     *
     * @param forwardMetersPerSecond forward speed; negative drives backward
     * @param turnRateRadiansPerSecond turn rate; positive turns left (counterclockwise)
     */
    public void drive(double forwardMetersPerSecond, double turnRateRadiansPerSecond) {
        drive(new ChassisSpeeds(forwardMetersPerSecond, 0.0, turnRateRadiansPerSecond));
    }

    /**
     * The volts one side needs to hold a wheel speed, from that side's feedforward model.
     *
     * @param feedforward the side's model, measured by SysId
     * @param metersPerSecond the wheel speed to hold
     * @return the volts to send to that side
     */
    private double calculateVolts(SimpleMotorFeedforward feedforward, double metersPerSecond) {
        if (Math.abs(metersPerSecond) < STOPPED_SPEED_METERS_PER_SECOND) {
            return 0.0;   // asked to stop (or nearly): do not shove against friction
        }
        return feedforward.calculate(metersPerSecond);
    }

    /**
     * How the robot is actually moving right now, from the encoders and forward kinematics.
     *
     * @return the measured forward speed (m/s) and turn rate (rad/s, counterclockwise positive)
     */
    public ChassisSpeeds getChassisSpeeds() {
        DifferentialDriveWheelSpeeds measured = new DifferentialDriveWheelSpeeds(
            getLeftSpeedMetersPerSecond(), getRightSpeedMetersPerSecond());
        return kinematics.toChassisSpeeds(measured);
    }

    // System identification

    /**
     * Record one loop of SysId data for each side: the volts sent, the distance,
     * and the speed. Call it every loop while a SysId test is running.
     *
     * @param log the log for this SysId routine
     */
    public void logSysId(SysIdRoutineLog log) {
        log.motor("left")
            .voltage(Volts.of(inputs.leftAppliedVolts))
            .linearPosition(Meters.of(getLeftDistanceMeters()))
            .linearVelocity(MetersPerSecond.of(getLeftSpeedMetersPerSecond()));
        log.motor("right")
            .voltage(Volts.of(inputs.rightAppliedVolts))
            .linearPosition(Meters.of(getRightDistanceMeters()))
            .linearVelocity(MetersPerSecond.of(getRightSpeedMetersPerSecond()));
    }

    // Odometry

    /**
     * Where the robot is on the floor, according to odometry.
     *
     * @return the robot's pose: x and y in meters from the origin, and its heading
     */
    public Pose2d getPose() {
        return odometry.getPoseMeters();
    }

    /**
     * Tell the robot where it is. Zeroes the encoders and gyro, and resets the odometry
     * to match, so the pose never jumps. This is the only way to zero the drivetrain's sensors.
     *
     * @param pose where the robot is right now, in field coordinates
     */
    public void resetPose(Pose2d pose) {
        zeroSensors();
        odometry.resetPosition(
            getRotation2d(), getLeftDistanceMeters(), getRightDistanceMeters(), pose);
    }

    // Encoders (all readings come from inputs, never straight from hardware)

    public double getLeftDistanceMeters() {
        return inputs.leftDistanceMeters - leftZeroMeters;
    }

    public double getRightDistanceMeters() {
        return inputs.rightDistanceMeters - rightZeroMeters;
    }

    /**
     * How far the center of the robot has moved, on average.
     *
     * @return the average of the left and right distances, in meters
     */
    public double getAverageDistanceMeters() {
        return (getLeftDistanceMeters() + getRightDistanceMeters()) / 2.0;
    }

    public double getLeftSpeedMetersPerSecond() {
        return inputs.leftSpeedMetersPerSecond;
    }

    public double getRightSpeedMetersPerSecond() {
        return inputs.rightSpeedMetersPerSecond;
    }

    // Gyro

    /**
     * The robot's heading since the last reset.
     *
     * @return the heading in degrees; counterclockwise (turning left) is positive
     */
    public double getHeadingDegrees() {
        return inputs.headingDegrees - headingZeroDegrees;
    }

    /**
     * The robot's heading as a {@code Rotation2d}, the form odometry needs. Built from
     * {@code getHeadingDegrees()}, so any sign fix there applies here too.
     *
     * @return the heading; counterclockwise (turning left) is positive
     */
    public Rotation2d getRotation2d() {
        return Rotation2d.fromDegrees(getHeadingDegrees());
    }

    public double getTurnRateDegreesPerSecond() {
        return inputs.turnRateDegreesPerSecond;
    }

    // Private: only resetPose() and the constructor may zero the sensors.

    /** Remember the current readings as the new zero. The hardware itself is never reset. */
    private void zeroSensors() {
        leftZeroMeters = inputs.leftDistanceMeters;
        rightZeroMeters = inputs.rightDistanceMeters;
        headingZeroDegrees = inputs.headingDegrees;
    }
}
```

Walk through what changed:

- **Two new fields carry the seam.** `io` has the interface type `DrivetrainIO`, not `DrivetrainIOXRP`. Today the only object that can go in it is a `DrivetrainIOXRP`, but `Drivetrain` is written against the promise, not the class. Chapter 18 shows why that matters, when a second kind of object arrives. `inputs` has the generated type `DrivetrainIOInputsAutoLogged`. It is created once, and refreshed every loop.
- **The constructor takes the IO object as a parameter.** `Drivetrain` does not choose its own hardware. Whoever creates it does. Today that is always the real XRP; in Chapter 18, `Robot` gets a choice. Either way, the choice is made in `Robot`, not here.
- **`periodic()` replaces `updateOdometry()`.** It does three things, in this order: read the hardware (`readInputs()`), update the pose from the fresh readings, and log the pose as an **output**. The name `periodic` is a preview: in Chapter 20, `Drivetrain` becomes a WPILib subsystem, and WPILib will call a method with exactly this name for you, every loop.
- **`readInputs()` is the two-line heart of AdvantageKit:** `io.updateInputs(inputs)` asks the hardware to fill in the inputs, and `Logger.processInputs("Drivetrain", inputs)` records them under the name `Drivetrain`. (During replay in Chapter 25, the same line does the opposite: it fills the inputs **from** the log.)
- **Every getter reads `inputs`, never the hardware.** All code that runs during one loop sees the same readings, taken at the same moment. In Chapter 16, `getLeftDistanceMeters()` asked the encoder every time it was called, so two calls in the same loop could disagree by a tick. Now they cannot.
- **`arcadeDrive` goes through volts now.** `DifferentialDrive.arcadeDriveIK(...)` is a `static` method: the arcade math you have used since Chapter 8, with no motors attached. It returns the power for each side as a `DifferentialDrive.WheelSpeeds` (a tiny nested data class with `left` and `right` fields). Multiplying by `NOMINAL_BATTERY_VOLTS` turns power into pretend volts, and `setVolts` sends them down the seam. Teleop has to go through the seam too, or AdvantageKit would never see what teleop asked for (and in Chapter 18, a simulated robot could never be driven with a controller).
- **`logSysId()` uses `inputs.leftAppliedVolts`** instead of a remembered field. The IO layer remembers, and the inputs report it.
- **`getLeftCount()` and `getRightCount()` are gone.** Raw encoder counts are an XRP detail that other robots, and Chapter 18's simulated one, do not have. Meters are what the rest of the program uses.

### Zeroing in software

Look at `zeroSensors()` and the getters closely, because they hide a good idea.

In Chapter 14, `resetPose()` reset the encoders and the gyro: it told the hardware to start counting from zero. Now nothing ever resets the hardware. The encoders count up forever. Instead, `zeroSensors()` **remembers** what each sensor read at the moment of the reset, and every getter subtracts it:

```java
public double getLeftDistanceMeters() {
    return inputs.leftDistanceMeters - leftZeroMeters;
}
```

You have seen this trick before. In Chapter 12, instead of resetting the encoders at the start of every autonomous step, you remembered `stepStartDistanceMeters` and subtracted it. Same idea, one level down.

Why bother, when the hardware can reset itself? Two reasons:

1. **Timing.** The inputs are read once, at the start of the loop. If `resetPose()` told the hardware to reset halfway through a loop, the inputs would still hold the old readings until the next loop. Odometry would be reset using old numbers, and on the next loop the pose would jump. Remembering a zero takes effect instantly, using the same numbers everyone else is seeing.
2. **Replay.** In Chapter 25, when you replay a log, there is no hardware to reset, only recorded readings. A reset that lives in `Drivetrain`'s own fields works the same way during replay as it did on the robot.

From outside the class, nothing changed. `getLeftDistanceMeters()` is still "meters since the last reset," and `resetPose()` still works the way Chapter 14 taught it. That is encapsulation (Chapter 7) doing its job: the inside changed completely, and no other class had to notice.

> **Public constants**
>
> Since Chapter 8, constants have been `private static final`. Some of `Drivetrain`'s are now `public static final`, because the IO classes need the wheel size, the trackwidth, the nominal volts, and the SysId gains. Sharing a constant is safe: `final` means no other class can change it, only read it. It is fields that can change (like `leftZeroMeters`) that must stay `private`.
>
> Notice the direction, though: the IO classes now read numbers from `Drivetrain`, the class above the seam, so each side of the seam leans on the other. That is fine for one subsystem. AdvantageKit's own template projects put the numbers both sides need into a separate constants class that both sides read. In Chapter 21, the constants that many classes share move into a `Constants.java` file of their own.

### Check: the real robot drives the same as before

Before going any further, prove the split did not break anything. `Robot.java` needs only a few changes:

1. Make the AdvantageKit changes from Section 17.3: `extends LoggedRobot`, its import, and the `Logger` lines at the top of the constructor, with these imports:

```java
import org.littletonrobotics.junction.LoggedRobot;
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.NT4Publisher;
import org.littletonrobotics.junction.wpilog.WPILOGWriter;
```

2. Change `drivetrain = new Drivetrain();` to:

```java
drivetrain = new Drivetrain(new DrivetrainIOXRP());
```

3. In `robotPeriodic()`, change `drivetrain.updateOdometry();` to `drivetrain.periodic();`.
4. In `updateDashboard()`, delete the two lines that publish `Left Count` and `Right Count`.

Here is the top of the constructor now, down to the line that creates `Sensors`. Everything after it (the field map and the PID setup) is unchanged:

```java
public Robot() {
    // AdvantageKit first, before anything the constructor creates (Section 17.3).
    Logger.recordMetadata("ProjectName", "XRP Explorer");
    Logger.addDataReceiver(new WPILOGWriter());   // write a log file into logs/
    Logger.addDataReceiver(new NT4Publisher());   // publish live, for AdvantageScope
    Logger.start();

    // The Chapter 10 flight recorder keeps running too. SysId (Chapter 16) reads its file.
    DataLogManager.start();
    DriverStation.startDataLog(DataLogManager.getLog());

    DataLogManager.log("XRP Explorer started!");
    SmartDashboard.putString("Mode", "Starting");

    drivetrain = new Drivetrain(new DrivetrainIOXRP());
    sensors = new Sensors();
    // ... the field map and PID setup, unchanged from Chapter 15
}
```

The order matters. AdvantageKit starts first, so it is recording before the drivetrain and the sensors exist. `DataLogManager` starts next, as in Chapter 10. Only then is the drivetrain created, so the first thing its constructor does (reading the hardware once) is recorded too.

Build. If the compiler complains about `getLeftCount`, `updateOdometry`, or `resetEncoders`, you missed one of the steps above; the error message names the line.

Then run the program with your XRP on, and repeat three checks you already know: drive in teleop, run the Chapter 16 cruise check in Test mode (left bumper, `Measured Forward (m per s)` near 0.10), and run autonomous once. Everything should behave the same as at the end of Chapter 16, within your PID tolerances (a turn may end a degree or so differently). Two small things really did change underneath. Every reading now comes from `inputs`, which `robotPeriodic()` refreshes after the mode methods run, so `autonomousPeriodic()` sees the readings from the end of the last loop, 20 ms older than before. And the small deadband `DifferentialDrive` applies (it ignores powers under 0.02) now acts on each wheel's power instead of on the sticks. If everything matches within tolerance, commit (see the Git exercise). A refactor that changes behavior is a bug; a refactor that does not is a safe place to stand.

> **Refactoring, in one sentence**
>
> A **refactor** changes how code is organized without changing what it does. The test for a good one is boring: the robot does exactly what it did before. Always check that first, and commit it, before adding anything new on top.

---

## 17.5 A First Look at AdvantageScope

Everything the drivetrain's hardware reported is now being recorded by AdvantageKit, and published live. **AdvantageScope** can show it. You opened it in Chapters 14 and 15 to see the map and the PID graphs; now it has much more to show. Chapter 25 is a full tour; for now, just two views.

With the real Explorer running (XRP on, **WPILib: Simulate Robot Code**, as always):

1. In AdvantageScope's menu, choose **File** > **Connect to Simulator** > **NetworkTables 4 (AdvantageKit)**. This is a different entry from the plain **NetworkTables 4** you used in Chapter 14: it knows how AdvantageKit names things. The window title stops saying "Searching" when it connects.
2. The left sidebar now lists everything AdvantageKit is publishing. Open **Drivetrain**: there are your eight inputs, one for every field in `DrivetrainIOInputs`, with the names `@AutoLog` gave them (`LeftDistanceMeters`, `HeadingDegrees`, and so on). Open **RealOutputs** > **Drivetrain**: there is `Pose`, the output you logged in `periodic()`.
3. The main area starts on a **Line Graph** tab. Drag `LeftSpeedMetersPerSecond` and `RightSpeedMetersPerSecond` onto it. Drive in teleop and watch both lines move. Hold the left bumper in Test mode and watch them climb to about 0.10 and level off: the cruise check from Chapter 16, as a picture.
4. Add a new tab with the **+** button at the top of the window, and choose **2D Field**. Pick the FTC **Evergreen** field, as in Chapter 14, and drag `Pose` from **RealOutputs** > **Drivetrain** onto the **Poses** list at the bottom. Press **Y** to reset the pose, run autonomous, and watch it.

This is the same map as Chapter 14's, drawn from a different source: there, `Field2d` published the pose to the dashboard; here, AdvantageKit records it as an output, so it also lands in the log file. Look in your project's `logs/` folder after a run: next to the `FRC_...` file there is now an `akit_...` file with everything you just watched. Chapter 25 will show you how to open it, replay a run, and line up the graphs with the field.

> **The inputs are the whole story**
>
> Look at the **Drivetrain** folder again. Those eight numbers are everything the drivetrain's hardware told your code this run, loop by loop. Nothing reached `Drivetrain` any other way. That is the promise the IO layer makes, and it is why AdvantageKit can replay a run: give the same code the same inputs, and it must make the same decisions.

---

## 17.6 What the Seam Is For

Right now, the IO layer looks like extra files for no change in behavior. That is exactly right for a refactor, and the payoff starts in the very next chapter:

- **Chapter 18, simulation.** You will write a second class that implements `DrivetrainIO`, with no hardware in it at all: a model of the Explorer built from your Chapter 16 SysId numbers. One constant chooses which one `Drivetrain` gets, and the Explorer drives across your screen with the real robot switched off.
- **Chapter 23, unit tests.** A test can hand `Drivetrain` a fake IO object that reports whatever numbers the test chooses, and check what `Drivetrain` does with them.
- **Chapter 25, log replay.** An IO object with no hardware and no model, the empty default methods from Section 17.2, lets the inputs come from a log file instead.
- **Chapter 27 onward, the roboRIO.** New hardware means new IO classes. The logic above the seam is what you carry over.

---

## Chapter Summary

> **What you learned in Chapter 17**
>
> * An **IO layer** cuts a subsystem along a seam: logic above, hardware below. Only volts go down and **inputs** come up. `Drivetrain` holds the logic; `DrivetrainIOXRP` holds every piece of XRP drivetrain hardware, and nothing else does.
> * New Java: an **interface** is a promise of methods with no bodies; a class `implements` it and must write each one, with `@Override`. An interface is a type, so a field or parameter can have an interface type. **Default methods** give an interface fallback bodies; AdvantageKit's IO interfaces default every method to "do nothing," which is why a forgotten or misspelled method compiles silently.
> * **AdvantageKit** records every input that crosses the seam, so a run can be replayed later. `Robot` extends `LoggedRobot`, starts the `Logger` first, and `@AutoLog` **generates** the `DrivetrainIOInputsAutoLogged` class during the build.
> * `Drivetrain` reads the hardware once per loop, in `periodic()`, and every getter reads `inputs`. It zeroes its sensors in software, by remembering what they read at the reset.
> * A **refactor** changes how code is organized without changing what it does. Check it on the real robot, and commit it, before you build anything on top.

---

## Exercises

### Practice

**1. Interfaces on a small scale.** In a scratch copy of your project (or a new branch, `git checkout -b practice-interfaces`), create the `DistanceSensor` interface and its two classes, `RangefinderDistanceSensor` and `FixedDistanceSensor`, from Section 17.2, and add the `isObstacleWithin` default method. Then, in the `Robot()` constructor, add:

```java
FixedDistanceSensor fake = new FixedDistanceSensor(0.15);
System.out.println(fake.getDistanceMeters());
System.out.println(fake.isObstacleWithin(0.20));
```

Before you run it, predict both lines. Then try three things, one at a time, and read each compiler error aloud the Chapter 10 way: (a) delete `getDistanceMeters()` from `FixedDistanceSensor`; (b) put it back, but misspell it as `getDistanceMeter()`, keeping the `@Override`; (c) fix the spelling, then give `FixedDistanceSensor` its own version of the default method that always answers `false`, but spell it `isObstacleWith(double meters)` and leave off the `@Override`. Which of the three does the compiler catch, and what does each error say? In (c), which method runs when you call `fake.isObstacleWithin(0.20)`, and why? Write one sentence in `reflections.md` about what `@Override` protected you from. Delete the practice branch when you are done.

**2. Break the seam on purpose.** On a scratch branch, add a line to `Drivetrain.periodic()` that reads hardware directly: create a `new Encoder(4, 5)` field in `Drivetrain` (the left encoder's two channels, the same ones `DrivetrainIOXRP` uses) and print its `getDistance()` next to `inputs.leftDistanceMeters` every 50 loops. Build and run. What happens at startup, and why? (Hint: Chapter 7's "create hardware once" rule.) Now imagine it had worked: name one thing AdvantageKit's recording would be missing. Write both answers in `reflections.md`, then delete the branch.

**3. A third IO class, by hand.** Without changing `Robot.java`, write (on paper or in a scratch file) a class `DrivetrainIOStill` that implements `DrivetrainIO` and reports a robot sitting perfectly still at a heading of 45 degrees, no matter what volts it is sent. Which methods must it override, and which can it leave to the defaults? What would `getPose()` report after a few seconds if `Drivetrain` were given one? You will build a much more interesting third class in Chapter 18.

**4. Challenge: an IO layer for `Sensors`.** Give the `Sensors` class the same treatment as `Drivetrain`. Create a `SensorsIO` interface with an `@AutoLog` inputs class (`distanceAheadMeters`, `leftReflectance`, `rightReflectance`, and the three accelerometer values) and `updateInputs`, and a `SensorsIOXRP` that reads the real sensors. Change `Sensors` to take a `SensorsIO` in its constructor, add a `periodic()` that reads and logs the inputs, and call it in `robotPeriodic()` right after `drivetrain.periodic()`. Check in AdvantageScope that a **Sensors** folder appears next to **Drivetrain**. This is optional; Chapter 25 does it for real and explains what it buys you.

### Build (XRP Explorer)

Split the drivetrain into an IO layer and install AdvantageKit, on the real XRP.

1. Install the AdvantageKit vendordep and add the two `build.gradle` blocks (Section 17.3, Steps 1 and 2). Build once with an internet connection and confirm `BUILD SUCCESSFUL`.
2. Change `Robot` to extend `LoggedRobot`, and add the `Logger` setup at the top of the constructor (Section 17.3, Step 3).
3. Create `DrivetrainIO.java` and `DrivetrainIOXRP.java`, and replace `Drivetrain.java` with the new listing (Section 17.4). Keep **your** SysId gains in the six constants, not the example values.
4. Make the small `Robot.java` changes in "Check: the real robot drives the same as before," build, and confirm on the **real** XRP that teleop, the cruise check, and autonomous behave the same as at the end of Chapter 16, within your PID tolerances.
5. Connect AdvantageScope and find the eight `Drivetrain` inputs and the `Pose` output (Section 17.5). Find the `akit_...` log file in `logs/`.

Diagnose anything strange:

- **`DrivetrainIOInputsAutoLogged` cannot be found:** the project has not built successfully since you added `@AutoLog`, or the `annotationProcessor` line is missing from `build.gradle` (Section 17.3, Step 4).
- **The build fails right after editing `build.gradle`:** a quote, parenthesis, or brace is missing. Compare with the AdvantageKit installation page character by character. If you still cannot find it, ask your mentor for the Chapter 16 checkpoint's `build.gradle` and add the two blocks to that.
- **The robot does nothing at all, but the program runs:** a method in `DrivetrainIOXRP` does not exactly match the interface, so the empty default runs instead. Check that both methods have `@Override`.
- **On the real robot, the heading or distances jump the moment you press Y:** `resetPose()` must call `zeroSensors()` before `odometry.resetPosition(...)`, and `zeroSensors()` must copy from `inputs`, not from zero.
- **The pose never changes on the field, but the robot drives:** `robotPeriodic()` still calls the old `updateOdometry()`, or does not call `drivetrain.periodic()` at all.
- **AdvantageScope connects but shows no Drivetrain folder:** you picked plain **NetworkTables 4**; choose **NetworkTables 4 (AdvantageKit)**.

When the real Explorer drives the same as it did in Chapter 16 and AdvantageScope shows the drivetrain's inputs, your Explorer has an IO layer. Every chapter from here on builds on it.

> **Checkpoint**
>
> Stuck, or did the build stop working and you cannot find why? Ask your mentor for the **Chapter 17 checkpoint**: a known-good copy of the project at the end of this chapter. Do not copy it over your work. Compare it with yours, file by file (in VS Code, right-click a file and choose **Select for Compare**, then right-click yours and choose **Compare with Selected**), find the difference, and fix your own code. Then commit as usual.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Every getter in the new `Drivetrain` reads from `inputs`, and the hardware is read only once per loop. Give one bug this prevents on the real robot, and one reason it matters for AdvantageKit's log replay.
2. Every method in `DrivetrainIO` has an empty default body. Give one advantage of that, and one danger, and say what habit protects you from the danger.
3. `Drivetrain` no longer resets the encoders or the gyro; it remembers zeros instead. Explain in your own words why resetting the hardware halfway through a loop could make the pose jump.

If any answer feels shaky, re-read Sections 17.2 and 17.4.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b io-layer
```

Commit after Build step 4, when the refactor is checked on the real robot:

```bash
git add .
git commit -m "Ch17: AdvantageKit and drivetrain IO layer (no behavior change)"
git push -u origin io-layer
```

Open a pull request into `main`. Review **Files changed**: you should see the two new IO files, `Drivetrain.java`, `Robot.java`, `build.gradle`, and the new `vendordeps/AdvantageKit.json`. You should **not** see `DrivetrainIOInputsAutoLogged.java`: it is generated inside `build/`, which the WPILib template's `.gitignore` already keeps out of Git. Generated files never go in version control; anyone who builds the project gets a fresh copy. Merge, delete the branch, then `git checkout main` and `git pull`.

Why commit a change the robot cannot even feel? Because if something goes wrong later, `git log` (Chapter 10) shows a clean line between "the code was reorganized and still worked" and whatever came next. If the real robot ever misbehaves, you can check out this commit and know the refactor was not the cause.

### Collab: Find the Hardware

Work with a partner. Swap laptops (or open each other's pull request on GitHub).

1. Each of you reads the **other's** `Drivetrain.java`, top to bottom, and lists every line that still talks to hardware: creates a motor, encoder, or gyro, or calls one of their methods. The right answer is **none**. Every hardware line should be in `DrivetrainIOXRP`.
2. Then read the other's `DrivetrainIOXRP.java` and list every line that **thinks**: kinematics, feedforward, odometry, a PID controller, a decision. The right answer is **none** again, except turning pretend volts into power.
3. Compare lists. For anything either of you found, decide together which side of the seam it belongs on, and fix it in a commit on your own branch.

Afterward, each of you writes two sentences in `reflections.md`: what was easiest to put on the wrong side of the seam, and how you would explain the rule to a new teammate.

### Explore

AdvantageKit's own template projects use the same IO pattern you just built, on full-size robots. Read the **IO Interfaces** page in the AdvantageKit documentation (linked below). Then find the **Differential Drive** template on AdvantageKit's **Template Projects** pages and look at its `DriveIO` interface. Write three sentences in `reflections.md`: one input their `DriveIO` records that yours does not, one thing they put in the interface that you did not, and whether their interface methods also have default bodies.

---

> **Additional Resources**
>
> * **IO Interfaces (AdvantageKit)**: [docs.advantagekit.org/data-flow/recording-inputs/io-interfaces](https://docs.advantagekit.org/data-flow/recording-inputs/io-interfaces) the AdvantageKit explanation of the IO layer, with diagrams of a subsystem before and after
> * **Installing AdvantageKit in an Existing Project**: [docs.advantagekit.org/getting-started/installation/existing-projects](https://docs.advantagekit.org/getting-started/installation/existing-projects) the vendordep URL, the `build.gradle` lines, and the `LoggedRobot` setup from Section 17.3
> * **AdvantageScope Live Sources**: [docs.advantagescope.org/overview/live-sources](https://docs.advantagescope.org/overview/live-sources) how to connect AdvantageScope to a robot or the simulator
> * **Interfaces (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/IandI/createinterface.html](https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html) and [docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html](https://docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html) Java's own explanation of interfaces, `implements`, and default methods

---

*Next up, Chapter 18: Simulating the XRP. Your SysId numbers can do something surprising: run them backwards, and you have a robot made of math. You will plug it in below the seam and drive the Explorer with the real robot switched off.*
