# Chapter 17: Simulation and AdvantageKit on the XRP

In Chapter 16 you taught the Explorer to know itself in numbers. Four short experiments, one log file, and SysId handed you kS, kV, and kA for each side: how many volts it takes to get moving, to hold a speed, and to speed up. You put those numbers into a feedforward, and the robot started driving the speed you asked for before PID did anything at all.

Those three numbers can do something else, and it is a little surprising. If you know how many volts it takes to produce a speed, you also know what speed a voltage will produce. Run the model backwards, and you have a robot that exists only as math. It drives, it turns, it coasts to a stop, and it does all of that with no motors, no batteries, and no floor. That is a **simulation**.

Here is why you want one. Your Chapter 15 autonomous routine has five steps, two PID controllers, a timeout, and a line sensor. Every time you change one line of it, you have to find the robot, find fresh batteries, find a clear patch of floor, put the robot on the start line, run it, measure it, and carry it back. A simulated Explorer runs the same routine on your laptop, on the bus, at 11 PM the night before a competition, as many times as you like. It will not tell you the final answer (only the real robot can do that), but it will catch the bug where the robot turns right instead of left long before the real robot drives off the table.

To make that work, the Explorer's code has to be able to run on two different robots without knowing which one it is driving. So in this chapter you will split `Drivetrain` in two, along a clean line: the **logic** (kinematics, feedforward, odometry) above, and the **hardware** (motors, encoders, gyro) below. Below the line you will write two versions: one that talks to the real XRP, and one that simulates it. The pattern is called an **IO layer**, and it comes from **AdvantageKit**, a logging library written by FRC Team 6328, Mechanical Advantage, and used by many of the best teams in the world. You will install AdvantageKit too, and it will start recording everything the drivetrain's hardware says, on both robots.

This is the most important structural change since you created `Drivetrain` in Chapter 7. You will use the same pattern on every robot for the rest of this book: the Mini Swerve in Section VI and the competition robot in Section VII both get IO layers, and when you move to the roboRIO in Chapter 26, the payoff is that most of your drivetrain code will not need to change at all.

On the Java side, you will learn the two ideas that make an IO layer possible: **interfaces** and **polymorphism**.

You will need your XRP for the first half of the chapter and the last section. In between, you will not need it at all. That is the point.

---

## 17.1 A Robot in Your Laptop: Why Simulate?

Picture three situations every FRC programmer meets sooner or later.

**There is no robot yet.** In build season, the programmers get the robot last. The mechanical team is still cutting metal for the first four weeks, and the code has to be ready the moment the robot is. Teams that wait for the robot to start testing lose half the season.

**There is one robot, and six programmers.** Even when the robot exists, it is a shared resource. The drive team needs it for practice, the mechanical team needs it for repairs, and you are third in line. Your Explorer is your own, but on the Mini Swerve in Section VI, a whole team will share one robot.

**The robot is fine, but you are not near it.** Your code changed. You want to know if the turn still works. The robot is in a bin at school.

In all three, the question is the same: can you test robot code without a robot?

A **simulation** is a stand-in for the robot that runs on your computer. The robot code runs exactly as it would on the real thing, but instead of sending volts to motors and reading real encoders, it sends volts to a **model** (a few equations that describe how the robot moves) and reads pretend encoders that the model keeps up to date. The code cannot tell the difference. As far as `autonomousPeriodic()` knows, it is driving a robot.

What can a simulation catch? More than you might think:

- **Logic bugs.** A `switch` case that falls through, a step that never ends, a timeout that never fires.
- **Sign errors.** The turn goes right when it should go left. The robot drives backward in autonomous.
- **Sequence bugs.** The routine skips a step, or runs two steps at once.
- **Crashes.** A `NullPointerException` in `autonomousInit()` crashes your program in the simulator just as it would on the robot.
- **Rough tuning.** If your model came from SysId, PID gains that are wildly wrong in the simulator will be wildly wrong on the robot too.

What can it not catch? Anything the model leaves out: a loose wheel, a dirty floor, a tired battery, a gyro that drifts. You will look at this honestly in Section 17.10. The rule every team learns is the same: **the simulator is for finding bugs, the robot is for finding the truth.**

> **Physics simulation, in one sentence**
>
> A physics simulation is your robot code driving a mathematical model of the robot instead of the real one, so you can test logic, signs, and sequences anywhere, then confirm the final behavior on real hardware.

---

## 17.2 Wait, Isn't the XRP Already Simulated?

If you have been paying close attention since Chapter 2, something about this chapter might feel odd. To drive your XRP, you already run **WPILib: Simulate Robot Code**, and the **Simulation GUI** window already opens. Is the Explorer not already a simulation?

Not quite, and the difference is worth getting right, because it is a common confusion and it shapes the code you will write in this chapter.

The word "simulation" is doing two jobs in WPILib:

1. **Where your code runs.** A real FRC robot runs its code on a computer inside the robot, the **roboRIO**. Your XRP's program does not run on the XRP. It runs on your laptop, and the XRP is a remote-controlled body: an extension called **XRP client** (`halsim_xrp`) sends your motor commands to the robot over Wi-Fi and brings its sensor readings back. WPILib calls any program that runs on a regular computer instead of a roboRIO a "simulation," which is why the Simulation GUI opens.
2. **What the robot is.** A **physics simulation** replaces the robot itself with a model. No XRP, no Wi-Fi, no batteries. The motor commands go to equations, and the sensor readings come from the same equations.

Here is the picture. Up to now, you have used the top row. This chapter adds the bottom row:

```
  Your laptop                                              The floor
  +------------------------------------------+
  | Robot code --> XRP client (halsim_xrp) --+----Wi-Fi---> real XRP
  |                                          |
  | Robot code --> a model of the XRP        |              (nothing)
  +------------------------------------------+
```

Both rows run on your laptop. Both rows open the Simulation GUI. And here is the catch that will matter in a few pages: WPILib has a method, `RobotBase.isSimulation()`, that real FRC code uses to ask "am I simulated?" On the XRP, it **always** returns `true`, even when the real robot is driving across your floor, because the code is always running on your laptop. Its partner, `RobotBase.isReal()`, always returns `false` on the XRP.

So the Explorer cannot ask WPILib which robot it is driving. You will tell it, with one constant, in Section 17.9.

> **A common confusion**
>
> On a roboRIO robot, `isReal()` means "the real robot" and `isSimulation()` means "a model of the robot." On the XRP, `isSimulation()` is always `true`, because the code always runs on your laptop. AdvantageKit's own example projects choose real or simulated hardware with `isReal()`. That works on a roboRIO, but on the XRP it would always pick the simulation. That is why the Explorer uses its own constant instead.

---

## 17.3 Finding the Seam: Logic Above, Hardware Below

To drive a model instead of a robot, the code needs a place where you can unplug one and plug in the other. Look at your `Drivetrain` from Chapter 16. It does three different kinds of jobs, all mixed together in one class:

- **The public interface** (the methods other classes call): `drive()`, `arcadeDrive()`, `setVolts()`, `getPose()`, `resetPose()`, the getters.
- **The control logic** (the thinking): inverse kinematics, desaturation, feedforward, odometry, the stop deadband.
- **The hardware interface** (the talking): `new XRPMotor(0)`, `new Encoder(4, 5)`, `leftEncoder.getDistance()`, `gyro.getAngle()`, `diffDrive.tankDrive(...)`.

Only the third kind is about the XRP. The kinematics do not care whether the wheels are real. The feedforward does not care whether the volts go to a motor or an equation. Odometry only needs two distances and a heading; it does not care where they came from.

So that is the seam. Cut the class in two: everything that thinks stays in `Drivetrain`, and everything that talks to hardware moves into a separate, small **IO class** (IO is short for input/output). Then you can write two IO classes, one real and one simulated, and plug either one into the same `Drivetrain`:

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
```

Only two things cross the seam:

- **Going down: outputs.** The volts for each side. That is all the hardware needs to be told.
- **Coming up: inputs.** What the hardware reports: each side's distance and speed, the heading, the turn rate, and the volts it is actually applying.

Think of a wall outlet. A lamp does not care whether the electricity in the wall came from a power plant, a solar panel, or a generator in the garage. It only cares that the outlet has the standard shape and gives the standard voltage. The outlet is the seam. As long as every power source fits the same outlet, every lamp works with every power source.

`DrivetrainIO` is the Explorer's outlet. To build it, you need a way to write down "the standard shape" in Java. That is exactly what an interface is.

> **Why the seam goes here**
>
> You could cut anywhere: put the feedforward in the IO class, or the kinematics. AdvantageKit's rule is to cut as low as possible, so the IO class only reads sensors and sends commands, and every bit of thinking stays above it. Thinking that lives above the seam runs the same way on every robot, so a bug you fix in the simulator is fixed on the real robot too. Thinking that hides below the seam has to be written, and debugged, once per robot.

---

## 17.4 New Java: Interfaces

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

---

## 17.5 New Java: Polymorphism

An interface is also a **type**. You can declare a variable, a field, or a parameter whose type is `DistanceSensor`:

```java
DistanceSensor sensor;
```

That variable can hold **any** object whose class implements `DistanceSensor`:

```java
DistanceSensor sensor;
if (testingAtMyDesk) {
    sensor = new FixedDistanceSensor(1.0);   // pretend: the wall is a meter away
} else {
    sensor = new RangefinderDistanceSensor(); // the real rangefinder
}

boolean blocked = sensor.getDistanceMeters() < WALL_STOP_DISTANCE_METERS;
```

Look at the last line. It calls `sensor.getDistanceMeters()` without knowing, or caring, which kind of sensor it has. If `sensor` holds a `FixedDistanceSensor`, Java runs `FixedDistanceSensor`'s method and gets `1.0`. If it holds a `RangefinderDistanceSensor`, Java runs that class's method and reads the real hardware. The decision is made **while the program runs**, by looking at the actual object the variable refers to (Chapter 10: a variable holds a reference to an object, not the object itself).

This is called **polymorphism**, from the Greek for "many shapes": one variable type, many possible kinds of object behind it, and each object answers the same call in its own way.

Here is why it matters so much. The wall-stop line was written once. It will never need to change, no matter how many kinds of distance sensor you invent. To switch sensors, you change the one line that **creates** the object. Everything that **uses** it stays the same. Programmers call this "programming to an interface": write the code that uses a thing against its interface, and you can swap the thing without touching that code.

That is the whole plan for the drivetrain. `Drivetrain` will have a field of type `DrivetrainIO`. `Robot` decides, once, whether to put a real one or a simulated one in it. `Drivetrain` calls `io.setVolts(...)` and `io.updateInputs(...)`, and Java runs whichever version is plugged in.

> **The type of the variable vs the class of the object**
>
> In `DistanceSensor sensor = new FixedDistanceSensor(1.0);`, the **variable's type** is `DistanceSensor`, and the **object's class** is `FixedDistanceSensor`. The variable's type decides which methods you are allowed to call: only the ones the interface lists. The object's class decides which code actually runs. If `FixedDistanceSensor` had an extra method, `setDistance()`, you could not call it through `sensor`, because a `DistanceSensor` does not promise to have one.

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

AdvantageKit takes this one step further: in an IO interface, **every** method gets a default body, and the defaults do nothing at all. That sounds strange, but it gives you a third kind of IO for free: one that has no hardware and no model, and simply does nothing when asked. You will need exactly that in Chapter 24, when you replay a log file and the "hardware" is the log. For now, there is one consequence to remember:

> **A common beginner mistake**
>
> When an interface's methods all have empty defaults, the compiler cannot tell you that you forgot one. If `DrivetrainIOSim` leaves out `setVolts()`, it still compiles; the default runs, does nothing, and the simulated robot never moves. The only protection is the habit from Section 17.4: write `@Override` on every method you mean to fill in, and when something "does nothing," check whether your method's name or parameters match the interface exactly.

---

## 17.6 AdvantageKit: A Flight Recorder That Can Replay

You already have a flight recorder. Since Chapter 10, `DataLogManager` has written a log file every time the program runs: your event messages, the Driver Station state, and everything on NetworkTables. In Chapter 16, SysId read that file to measure your robot.

**AdvantageKit** is a different kind of recorder, and it is built around the seam from Section 17.3. Its big idea is this: if you record every **input** your code receives (every sensor reading, every button press, every timestamp), then the inputs are the whole story. Your robot code is just a machine that turns inputs into outputs. Feed the same inputs back into the same code, and it must make the same decisions, loop for loop. That means you can take a log from a real match, play its inputs back into your code on a laptop, and watch your code make the same mistake it made on the field. Then add a print, fix the bug, and play it again to prove the fix. That is called **log replay**, and it is the deep dive in Chapter 24.

For replay to work, AdvantageKit has to see every input, which means every input has to flow through one place where it can be recorded. That place is the IO layer's **inputs** object. So the IO pattern you are about to build does two jobs at once: it lets you swap the real robot for a simulated one, and it gives AdvantageKit a single, clean list of everything the hardware said.

> **Who makes AdvantageKit?**
>
> AdvantageKit is free and open source, written and maintained by FRC Team 6328, Mechanical Advantage, from Littleton, Massachusetts. They also make **AdvantageScope**, the log viewer that comes with WPILib, which you will open for the first time in Section 17.9. Many top teams use both, and the IO layer pattern you are learning in this chapter is how their code is organized.

### Step 1: Install the AdvantageKit library

AdvantageKit is a **vendor library** (a vendordep): code from outside WPILib that you add to a project. In VS Code, with your Explorer project open:

1. Open the command palette (`Ctrl+Shift+P`, or `Cmd+Shift+P` on a Mac) and run **WPILib: Manage Vendor Libraries**.
2. Choose **Install new libraries (online)**.
3. Paste this URL and press Enter:

```
https://github.com/Mechanical-Advantage/AdvantageKit/releases/latest/download/AdvantageKit.json
```

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

You will not use `replayWatch` until Chapter 24, but it is part of AdvantageKit's standard setup, and adding it now means `build.gradle` is finished.

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

Then AdvantageKit has to be told where to send what it records, and started. That goes at the very **top** of the `Robot()` constructor, before anything else, so the logger is running before any part of the robot is created. You will see the top of the finished constructor in Section 17.9. Here is the new part:

```java
// AdvantageKit first, before anything else is created (Section 17.6).
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
> Keep `DataLogManager.start()` in the constructor, right after `Logger.start()`. From now on, each run of your program writes **two** log files into `logs/`: the `FRC_...` file from Chapter 10, and the new `akit_...` file. Your SysId routine from Chapter 16 still writes to the `FRC_...` file, and SysId still reads it exactly as in Section 16.7. AdvantageKit's file is the one AdvantageScope and log replay are built around. Chapter 24 looks at both and decides which one the Explorer really needs.

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

## 17.7 The Drivetrain IO Layer

Time to cut the drivetrain along the seam. You will end up with four files where you had one:

| File | What it is | Talks to hardware? |
|---|---|---|
| `DrivetrainIO.java` | The interface: the seam itself, plus the inputs class | No |
| `DrivetrainIOXRP.java` | The real XRP's motors, encoders, and gyro | Yes |
| `DrivetrainIOSim.java` | A model of the XRP (Section 17.8) | No, it is the hardware |
| `Drivetrain.java` | The logic, now built on top of any `DrivetrainIO` | No |

All four go in `src/main/java/frc/robot`, next to `Robot.java`. Do this section with your real XRP, and test it at the end: when you are done, the Explorer should drive exactly as it did in Chapter 16. Only then do you add the simulation.

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
- **Two methods, both `default` and both empty**, the AdvantageKit way (Section 17.5). Only two methods cross the seam, because the hardware has only two jobs: report, and drive.

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
- **`COUNTS_PER_WHEEL_REV` and `METERS_PER_COUNT` moved here** from `Drivetrain`, because they describe these encoders. The wheel diameter stays in `Drivetrain`, because the simulation needs it too; this class reaches it as `Drivetrain.WHEEL_DIAMETER_METERS`.
- **`updateInputs`** reads each sensor exactly once and copies the reading into the inputs object. Nothing else in the whole program reads these sensors any more.
- **`leftVolts` and `rightVolts`** are the remembered volts from Chapter 16, moved down a layer. They are reported as inputs, so the log always shows what the motors were told.
- **`setVolts`** is the only place pretend volts turn into power. If you ever change how volts work on the XRP (and when Chapter 26 moves to a robot that can measure real volts), this one method is what changes.

### `Drivetrain`: the logic, on top of the seam

Now the old `Drivetrain`, with the hardware taken out. Here is the complete file. The changes since Chapter 16 are:

- the hardware imports are gone, and `Logger` is imported;
- `WHEEL_DIAMETER_METERS`, `TRACKWIDTH_METERS`, `NOMINAL_BATTERY_VOLTS`, and the six gains are now `public`, because the IO classes need them;
- the motors, encoders, gyro, `DifferentialDrive`, and remembered volts are replaced by two fields, `io` and `inputs`;
- three new "zero" fields, and a `zeroSensors()` method that replaces `resetEncoders()` and `resetHeading()`;
- the constructor takes a `DrivetrainIO`;
- `updateOdometry()` becomes `periodic()`, which reads the inputs first;
- `arcadeDrive` and `setVolts` send volts through `io`;
- every getter reads from `inputs`; `getLeftCount()` and `getRightCount()` are gone.

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

- **Two new fields carry the seam.** `io` has the interface type `DrivetrainIO`, so it can hold a `DrivetrainIOXRP` or a `DrivetrainIOSim`. That is polymorphism (Section 17.5). `inputs` has the generated type `DrivetrainIOInputsAutoLogged`. It is created once, and refreshed every loop.
- **The constructor takes the IO object as a parameter.** `Drivetrain` does not choose its own hardware. Whoever creates it does. This is the one line in the whole program that decides real or simulated, and it is in `Robot`, not here.
- **`periodic()` replaces `updateOdometry()`.** It does three things, in this order: read the hardware (`readInputs()`), update the pose from the fresh readings, and log the pose as an **output**. The name `periodic` is a preview: in Chapter 19, `Drivetrain` becomes a WPILib subsystem, and WPILib will call a method with exactly this name for you, every loop.
- **`readInputs()` is the two-line heart of AdvantageKit:** `io.updateInputs(inputs)` asks the hardware to fill in the inputs, and `Logger.processInputs("Drivetrain", inputs)` records them under the name `Drivetrain`. (During replay in Chapter 24, the same line does the opposite: it fills the inputs **from** the log.)
- **Every getter reads `inputs`, never the hardware.** All code that runs during one loop sees the same readings, taken at the same moment. In Chapter 16, `getLeftDistanceMeters()` asked the encoder every time it was called, so two calls in the same loop could disagree by a tick. Now they cannot.
- **`arcadeDrive` goes through volts now.** `DifferentialDrive.arcadeDriveIK(...)` is a `static` method: the arcade math you have used since Chapter 8, with no motors attached. It returns the power for each side as a `DifferentialDrive.WheelSpeeds` (a tiny nested data class with `left` and `right` fields). Multiplying by `NOMINAL_BATTERY_VOLTS` turns power into pretend volts, and `setVolts` sends them down the seam. Teleop has to go through the seam too, or the simulated robot could never be driven with a controller.
- **`logSysId()` uses `inputs.leftAppliedVolts`** instead of a remembered field. The IO layer remembers, and the inputs report it.
- **`getLeftCount()` and `getRightCount()` are gone.** Raw encoder counts are an XRP detail that a simulated robot does not have. Meters are what the rest of the program uses.

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
2. **Replay.** In Chapter 24, when you replay a log, there is no hardware to reset, only recorded readings. A reset that lives in `Drivetrain`'s own fields works the same way during replay as it did on the robot.

From outside the class, nothing changed. `getLeftDistanceMeters()` is still "meters since the last reset," and `resetPose()` still works the way Chapter 14 taught it. That is encapsulation (Chapter 7) doing its job: the inside changed completely, and no other class had to notice.

> **Public constants**
>
> Since Chapter 8, constants have been `private static final`. Some of `Drivetrain`'s are now `public static final`, because the IO classes need the wheel size, the trackwidth, the nominal volts, and the SysId gains. Sharing a constant is safe: `final` means no other class can change it, only read it. It is fields that can change (like `leftZeroMeters`) that must stay `private`. In Chapter 20, the constants that many classes share move into a `Constants.java` file of their own.

### Check: the real robot drives exactly as before

Before going any further, prove the split did not break anything. You will finish wiring `Robot.java` in Section 17.9, but for now make just these changes so it builds:

1. Make the AdvantageKit changes from Section 17.6: `extends LoggedRobot`, its import, and the `Logger` lines at the top of the constructor, with these imports:

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

Build. If the compiler complains about `getLeftCount`, `updateOdometry`, or `resetEncoders`, you missed one of the steps above; the error message names the line.

Then run the program with your XRP on, and repeat three checks you already know: drive in teleop, run the Chapter 16 cruise check in Test mode (left bumper, `Measured Forward (m per s)` near 0.10), and run autonomous once. Everything should behave exactly as it did at the end of Chapter 16. If it does, commit (see the Git exercise) before you go on. A refactor that changes behavior is a bug; a refactor that does not is a safe place to stand.

> **Refactoring, in one sentence**
>
> A **refactor** changes how code is organized without changing what it does. The test for a good one is boring: the robot does exactly what it did before. Always check that first, and commit it, before adding anything new on top.

---

## 17.8 A Robot Made of Math: `DrivetrainIOSim`

Now the fun part. You need a class that keeps the `DrivetrainIO` promise without any hardware: when it is told volts, it works out how a robot like yours would move, and when it is asked for inputs, it reports what that robot's encoders and gyro would read.

### Running the model backwards

In Chapter 16, the model went one way. You knew the speed and acceleration you wanted, and the model told you the volts:

```
volts = kS × sign(velocity) + kV × velocity + kA × acceleration
```

A simulator needs the opposite direction. It knows the volts (the code just sent them) and the speed the robot has right now, and it needs the acceleration. Solve the same equation for acceleration:

```
acceleration = (volts - kS × sign(velocity) - kV × velocity) ÷ kA
```

Read it aloud: "Take the volts. Friction eats kS of them. Holding the current speed eats kV times the speed. Whatever is left over speeds the robot up, and kA says how much." Then, every 20 milliseconds:

1. Work out the acceleration from the volts and the current speed.
2. New speed = old speed + acceleration × 0.02 seconds.
3. New position = old position + speed × 0.02 seconds.

That is a whole physics simulation. Try it by hand with the example left side from Chapter 16 (`kS = 0.95`, `kV = 18.0`, `kA = 1.1`), starting at rest and sending a steady 2.75 volts (the feedforward's answer for 0.10 m/s). Friction takes 0.95, leaving 1.80 volts to work with:

| Time (s) | Speed (m/s) | Acceleration (m/s²) |
|---|---|---|
| 0.00 | 0.000 | (1.80 - 0) ÷ 1.1 = 1.64 |
| 0.02 | 0.033 | (1.80 - 18.0 × 0.033) ÷ 1.1 = 1.10 |
| 0.04 | 0.055 | 0.74 |
| 0.06 | 0.070 | 0.50 |
| 0.08 | 0.080 | 0.34 |
| 0.10 | 0.086 | 0.23 |

Watch the pattern. The faster the robot goes, the more of the volts kV eats, so the acceleration shrinks. The speed creeps up toward 1.80 ÷ 18.0 = 0.10 m/s and never overshoots it. That is exactly what your cruise check measured on the real robot in Section 16.9, and exactly what the model in Section 16.2 predicted. The simulation is your SysId model, run one small step at a time.

> **Simulation, in one sentence**
>
> A physics simulation steps a model forward in time: from the inputs (volts) and the current state (speed, position), it works out what happens in the next small slice of time, over and over, about fifty times a second.

### Letting WPILib do the math: `DifferentialDrivetrainSim`

You could write those three steps yourself (Practice 2 asks you to, for one wheel). But a drivetrain has two wheels, and from two wheel speeds you also need the heading and the position on the floor: Chapter 13's forward kinematics and Chapter 14's odometry, one more time. WPILib has a class that does all of it, carefully, called **`DifferentialDrivetrainSim`**. It is built from exactly the numbers you have:

- **`LinearSystemId.identifyDrivetrainSystem(kVLinear, kALinear, kVAngular, kAAngular)`** builds the model (WPILib calls it a "linear system") from SysId gains. "Linear" gains describe driving straight, the kind you measured. "Angular" gains describe spinning in place, which you would measure with the turning test in Chapter 16's Practice 4.
- **`new DifferentialDrivetrainSim(model, motor, gearing, trackwidth, wheelRadius, noise)`** wraps the model in a simulated robot with a trackwidth and wheels.
- **`setInputs(leftVolts, rightVolts)`** tells it the volts, **`update(0.02)`** moves it forward one loop, and getters like `getLeftPositionMeters()`, `getLeftVelocityMetersPerSecond()`, and `getHeading()` tell you what happened.

Two of its inputs need a decision:

- **Turning gains.** You measured only straight driving. If you pass your straight-line kV and kA for the angular gains too, WPILib treats each wheel as its own little motor that does not care what the other is doing. That is a reasonable first model of an XRP, whose two wheels really are driven separately. It ignores the extra friction of scrubbing in a turn (Section 16.10), which you will see again in Section 17.10.
- **Friction.** WPILib's model has kV and kA, but no kS. A simulated robot with no friction would move at the smallest voltage, and your feedforward, which adds kS to every request, would make it drive too fast. So the Explorer adds friction itself, the way the equation above does: before the volts reach the model, take kS away.

### The listing

Create `DrivetrainIOSim.java`. Type it, do not paste:

```java
package frc.robot;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.simulation.DifferentialDrivetrainSim;

/**
 * A simulated XRP drivetrain, built from the model SysId measured in Chapter 16.
 * No hardware at all: volts go in, physics comes out.
 */
public class DrivetrainIOSim implements DrivetrainIO {

    // WPILib's drivetrain simulation takes one kV and one kA for the whole robot,
    // so use the average of your two sides.
    private static final double SIM_KV_VOLT_SECONDS_PER_METER =
        (Drivetrain.LEFT_KV_VOLT_SECONDS_PER_METER + Drivetrain.RIGHT_KV_VOLT_SECONDS_PER_METER) / 2.0;
    private static final double SIM_KA_VOLT_SECONDS_SQUARED_PER_METER =
        (Drivetrain.LEFT_KA_VOLT_SECONDS_SQUARED_PER_METER
            + Drivetrain.RIGHT_KA_VOLT_SECONDS_SQUARED_PER_METER) / 2.0;

    // Friction, which WPILib's simulation leaves out. We add it ourselves, one side at a time.
    private static final double SIM_LEFT_KS_VOLTS = Drivetrain.LEFT_KS_VOLTS;
    private static final double SIM_RIGHT_KS_VOLTS = Drivetrain.RIGHT_KS_VOLTS;

    // How much time passes in each step of the simulation: one robot loop.
    private static final double LOOP_SECONDS = 0.02;

    // The simulated robot. It drives straight and turns using the same kV and kA,
    // because we measured only straight driving (Section 17.8).
    private final DifferentialDrivetrainSim sim = new DifferentialDrivetrainSim(
        LinearSystemId.identifyDrivetrainSystem(
            SIM_KV_VOLT_SECONDS_PER_METER, SIM_KA_VOLT_SECONDS_SQUARED_PER_METER,
            SIM_KV_VOLT_SECONDS_PER_METER, SIM_KA_VOLT_SECONDS_SQUARED_PER_METER),
        DCMotor.getRomiBuiltIn(1),          // only used for current draw, which we never read
        1.0,                                // gearing: already inside kV and kA
        Drivetrain.TRACKWIDTH_METERS,
        Drivetrain.WHEEL_DIAMETER_METERS / 2.0,
        null);                              // no sensor noise (Practice 4 adds some)

    // The volts most recently asked for, before friction takes its share.
    private double leftVolts = 0.0;
    private double rightVolts = 0.0;

    @Override
    public void updateInputs(DrivetrainIOInputs inputs) {
        // Move the simulated robot forward one loop, with friction taking its share of the volts.
        sim.setInputs(
            subtractFriction(leftVolts, SIM_LEFT_KS_VOLTS),
            subtractFriction(rightVolts, SIM_RIGHT_KS_VOLTS));
        sim.update(LOOP_SECONDS);

        // Report what the simulated sensors would have read.
        inputs.leftDistanceMeters = sim.getLeftPositionMeters();
        inputs.rightDistanceMeters = sim.getRightPositionMeters();
        inputs.leftSpeedMetersPerSecond = sim.getLeftVelocityMetersPerSecond();
        inputs.rightSpeedMetersPerSecond = sim.getRightVelocityMetersPerSecond();
        inputs.leftAppliedVolts = leftVolts;
        inputs.rightAppliedVolts = rightVolts;
        inputs.headingDegrees = sim.getHeading().getDegrees();

        // Turn rate from the wheel speeds: forward kinematics again (Section 13.4).
        double turnRateRadiansPerSecond =
            (inputs.rightSpeedMetersPerSecond - inputs.leftSpeedMetersPerSecond)
                / Drivetrain.TRACKWIDTH_METERS;
        inputs.turnRateDegreesPerSecond = Math.toDegrees(turnRateRadiansPerSecond);
    }

    @Override
    public void setVolts(double leftVolts, double rightVolts) {
        this.leftVolts = leftVolts;
        this.rightVolts = rightVolts;
    }

    /**
     * The volts left over after friction takes its share. Friction eats the first kS volts
     * in either direction; anything less than kS does not move the robot at all.
     *
     * @param volts the volts sent to one side
     * @param ksVolts that side's kS
     * @return the volts that actually push the robot
     */
    private static double subtractFriction(double volts, double ksVolts) {
        if (Math.abs(volts) <= ksVolts) {
            return 0.0;
        }
        return volts - Math.copySign(ksVolts, volts);
    }
}
```

Walk through it:

- **Same promise, completely different inside.** `DrivetrainIOSim` implements the same two methods as `DrivetrainIOXRP`, with `@Override` on each, and there is not one piece of hardware in it. Put the two files side by side: that is Section 17.4's `RangefinderDistanceSensor` and `FixedDistanceSensor`, at full size.
- **The model comes from your SysId gains,** read from `Drivetrain`'s public constants, so when you re-run SysId and update the gains, the simulator updates too. The `SIM_` constants are separate names on purpose: in Practice 3 you will make the simulated robot deliberately **different** from the model the feedforward uses, to see how PID copes.
- **`setVolts` only remembers.** Nothing moves when you call it. The robot moves in `updateInputs`, once per loop: apply the volts, step the physics by `LOOP_SECONDS`, then report. That keeps simulated time in step with the robot loop.
- **`subtractFriction`** is the kS term from the equation, done by hand. If the volts are smaller than kS, nothing moves, just like a real XRP sitting still at low power. Otherwise kS is taken away, in whichever direction the volts push. `Math.copySign(ksVolts, volts)` gives you `ksVolts` with the sign of `volts`: plus 0.95 for forward, minus 0.95 for reverse. It is `private static` because it uses only its parameters, not any field (Chapter 7).
- **`getHeading()`** is counterclockwise positive, the same as the Explorer's `getHeadingDegrees()` (Chapter 9). The turn rate comes from the two wheel speeds and the trackwidth: forward kinematics, the Chapter 13 formula for ω, then converted to degrees.
- **Three arguments you can mostly ignore.** `DCMotor.getRomiBuiltIn(1)` describes a motor; the simulation uses it only to estimate current draw, which the Explorer never reads. WPILib has no XRP motor in its list, so the Romi's motor (from a similar small robot) stands in. The gearing is `1.0`, because your kV and kA were measured at the wheels, with the gearbox already included. And `null` means "no sensor noise," so the simulated encoders are perfect (Practice 4 changes that).

> **What does `sim.update` actually do?**
>
> It does the three steps from the start of this section, but more carefully. Instead of one 20 millisecond step with one acceleration, it takes several smaller steps inside each one and checks its own error, a technique from numerical math called Runge-Kutta integration. It also tracks the robot's x, y, and heading on the floor as it goes. You do not need to know how; you do need to know that it is your SysId equation underneath.

---

## 17.9 Switching Robots: The Simulated Explorer

Two pieces are left, both in `Robot.java`: a way to choose which robot to run, and a simulated floor for the sensors that are not part of the drivetrain.

### One constant to choose the robot

Section 17.2 explained why the Explorer cannot ask WPILib whether it is driving a real robot. So it gets a constant. Add it as the first constant in `Robot.java`, right under the "Constants" comment, so it is the first thing anyone opening the file sees:

```java
// Which robot to drive: false for the real XRP, true for the simulated one (Section 17.9).
private static final boolean USE_SIMULATED_ROBOT = false;
```

Then replace `drivetrain = new Drivetrain(new DrivetrainIOXRP());` (from the check in Section 17.7) with the real decision:

```java
// Real hardware or simulated: decide here, once. Nothing else needs to know.
DrivetrainIO drivetrainIO;
if (USE_SIMULATED_ROBOT) {
    drivetrainIO = new DrivetrainIOSim();
    DataLogManager.log("Drivetrain: SIMULATED");
} else {
    drivetrainIO = new DrivetrainIOXRP();
    DataLogManager.log("Drivetrain: real XRP");
}
drivetrain = new Drivetrain(drivetrainIO);
```

Read it aloud. `drivetrainIO` is a local variable whose type is the interface. Either branch puts a different kind of object in it. Then one line hands it to `Drivetrain`, which never asks which kind it got. Section 17.5's polymorphism, in the one place it matters most.

Notice what `USE_SIMULATED_ROBOT = true` does **not** create: no `XRPMotor`, no `Encoder`, no `XRPGyro`. The simulated robot never touches the XRP's drivetrain hardware, so there is nothing for the real robot's motors to receive.

While you are here, add a second metadata line under `recordMetadata("ProjectName", ...)`, so every log file says which robot made it:

```java
Logger.recordMetadata("Robot", USE_SIMULATED_ROBOT ? "Simulated XRP" : "Real XRP");
```

That is Chapter 8's ternary operator choosing between two strings.

Here is the top of the constructor now, down to the line that creates `Sensors`. Everything after it (the field map and the PID setup) is unchanged:

```java
public Robot() {
    // AdvantageKit first, before anything else is created (Section 17.6).
    Logger.recordMetadata("ProjectName", "XRP Explorer");
    Logger.recordMetadata("Robot", USE_SIMULATED_ROBOT ? "Simulated XRP" : "Real XRP");
    Logger.addDataReceiver(new WPILOGWriter());   // write a log file into logs/
    Logger.addDataReceiver(new NT4Publisher());   // publish live, for AdvantageScope
    Logger.start();

    // The Chapter 10 flight recorder keeps running too. SysId (Chapter 16) reads its file.
    DataLogManager.start();
    DriverStation.startDataLog(DataLogManager.getLog());

    DataLogManager.log("XRP Explorer started!");
    SmartDashboard.putString("Mode", "Starting");

    // Real hardware or simulated: decide here, once. Nothing else needs to know.
    DrivetrainIO drivetrainIO;
    if (USE_SIMULATED_ROBOT) {
        drivetrainIO = new DrivetrainIOSim();
        DataLogManager.log("Drivetrain: SIMULATED");
    } else {
        drivetrainIO = new DrivetrainIOXRP();
        DataLogManager.log("Drivetrain: real XRP");
    }
    drivetrain = new Drivetrain(drivetrainIO);
    sensors = new Sensors();
    // ... the field map and PID setup, unchanged from Chapter 15
}
```

The order matters. AdvantageKit starts first, so it is recording before any hardware exists. `DataLogManager` starts next, as in Chapter 10. Only then is the drivetrain created, so the first thing its constructor does (reading the hardware once) is recorded too.

### A simulated floor for the other sensors

The drivetrain has its IO layer, but the `Sensors` class from Chapter 9 still talks to the XRP directly: the rangefinder, the two reflectance sensors, and the accelerometer. With no robot connected, they read zero. Two of those zeros would cause trouble:

- **A rangefinder reading of 0 meters means a wall is touching the front of the robot,** so teleop's wall stop would refuse to drive forward at all.
- **Reflectance readings of 0 mean white floor everywhere,** so autonomous's last step would never find the tape, and would stop at its 1.0 meter safety limit instead.

WPILib lets simulation code set what a sensor reads. The XRP's rangefinder and reflectance sensors are **analog inputs** (they report a voltage between 0 and 5 volts), and the `AnalogInputSim` class can set that voltage. Looking in WPILib's source for `XRPReflectanceSensor` and `XRPRangefinder` shows which channels they use and how they turn volts into readings:

| Sensor | Analog channel | Reading |
|---|---|---|
| Left reflectance | 0 | volts ÷ 5 (0.0 white, 1.0 black) |
| Right reflectance | 1 | volts ÷ 5 |
| Rangefinder | 2 | volts ÷ 5 × 4 meters |

Add the import:

```java
import edu.wpi.first.wpilibj.simulation.AnalogInputSim;
```

and these fields, after `field`:

```java
// Pretend sensors for the simulated robot (Section 17.9). Unused on the real XRP.
private final AnalogInputSim leftReflectanceSim = new AnalogInputSim(0);
private final AnalogInputSim rightReflectanceSim = new AnalogInputSim(1);
private final AnalogInputSim rangefinderSim = new AnalogInputSim(2);
```

Then add a new section to `Robot.java`, just above the Test mode section:

```java
// Simulation (Section 17.9)

@Override
public void simulationPeriodic() {
    // An XRP program always runs as a simulation on your laptop (Section 17.2), so this
    // method runs with the real robot too. Only pretend when the robot is pretend.
    if (USE_SIMULATED_ROBOT) {
        simulateSensors();
    }
}

/**
 * Give the simulated robot a simulated floor: nothing ahead of it, and black tape
 * everywhere past the line. The XRP's sensor classes read these as if they were real.
 */
private void simulateSensors() {
    // Rangefinder: 5 volts is the most it can read, 4 meters. The way ahead is clear.
    rangefinderSim.setVoltage(5.0);

    // Reflectance: 5 volts is black, 0 volts is white. The tape is LINE_DISTANCE_METERS up the y axis.
    boolean pastTheLine = drivetrain.getPose().getY() >= LINE_DISTANCE_METERS;
    double reflectanceVolts = pastTheLine ? 5.0 : 0.0;
    leftReflectanceSim.setVoltage(reflectanceVolts);
    rightReflectanceSim.setVoltage(reflectanceVolts);
}
```

- **`simulationPeriodic()`** is one more mode method from WPILib's robot base class, like `robotPeriodic()`. It runs every loop, after everything else, but only when the program is running as a simulation. On a roboRIO it never runs. On the XRP, as Section 17.2 warned, it **always** runs, so the `if` makes sure the Explorer only pretends when `USE_SIMULATED_ROBOT` is `true`.
- **The simulated tape is not a strip.** Anywhere the robot's y is at least `LINE_DISTANCE_METERS` reads as black. On the course, the only way to get there is to turn left at the corner and drive up leg 2, which is exactly when autonomous starts looking for it. A simple fake that is good enough for the job is a very common simulation trick.
- **The accelerometer** still reads zero. Nothing in the Explorer depends on it, so it is left alone.

> **Why not give `Sensors` an IO layer too?**
>
> You could, and on a competition robot you would: every sensor's readings should cross a seam, so AdvantageKit can record and replay them. The drivetrain is the part where it matters most today, and doing one subsystem carefully teaches the pattern better than doing four in a hurry. Practice 6 walks you through doing `Sensors` yourself, and Chapter 24 shows what replay gains from it.

### Running the simulated Explorer

Build, then:

1. **Switch your XRP off.** In simulation, there must be no real robot answering. If the XRP is on and connected, its real sensor readings and your simulated ones would fight over the same channels.
2. Set `USE_SIMULATED_ROBOT = true`. Build.
3. Run **WPILib: Simulate Robot Code**, the same as always. If VS Code asks which simulation extensions to use, the Simulation GUI must be checked. The XRP client can stay checked; with the XRP switched off, it simply has no robot to talk to.
4. In the Simulation GUI, set up your controller in **Joysticks** slot 0 (Chapter 8), and open the field: **NetworkTables** > **SmartDashboard** > **Field** (Chapter 14).

Now look at the field. The robot is a dot at the start line. Choose **Teleoperated** in the Robot State panel, and drive. The dot moves. It turns when you turn, slows when you let go, and the `Pose X (m)` and `Measured Forward (m per s)` widgets change as if the robot were real. There is no robot. Every one of those numbers came from the model you measured in Chapter 16.

Then try the routines you already have, in order:

- **The cruise check.** Choose **Test**, hold the left bumper, and watch `Measured Forward (m per s)`. It should settle almost exactly on 0.10, because the simulated robot obeys precisely the model your feedforward was built from.
- **The tuning bench.** Still in Test, press **B** (turn to 90), then **A** (home), then **X** (drive out 0.30 m). Open a plot (**Plot** > **New Plot Window**, Section 15.9) of the heading setpoint and measurement, and watch PID do its job on a robot made of math.
- **Autonomous.** Press **Y** to reset the pose, choose **Autonomous**, and watch the dot drive leg 1, turn left, and drive up to the tape. On the field, it should end on the `Course` ghost's last pose, or very close. The event log in VS Code's terminal panel should show each step starting and `Line found after ... m`.

> **Did the dot not move?**
>
> Check, in order: Is `USE_SIMULATED_ROBOT` really `true`, and did you build after changing it? (The terminal log says `Drivetrain: SIMULATED` at startup.) Is the robot enabled in the Robot State panel? Did `DrivetrainIOSim`'s methods both get an `@Override`? A missing `@Override` with a typo in a name leaves the empty default in charge, and a robot that silently does nothing. Is `Drivetrain.periodic()` the first line of `robotPeriodic()`? Without it, the simulation never steps.

### A first look at AdvantageScope

Everything the drivetrain's hardware reported is now being recorded by AdvantageKit, and published live. **AdvantageScope** can show it. It comes with WPILib: open it with **WPILib: Start Tool** > **AdvantageScope** (or the AdvantageScope shortcut the WPILib installer put on your desktop). Chapter 24 is a full tour; for now, just two views.

With the simulated Explorer running:

1. In AdvantageScope's menu, choose **File** > **Connect to Simulator** > **NetworkTables 4 (AdvantageKit)**. The window title stops saying "Searching" when it connects.
2. The left sidebar now lists everything AdvantageKit is publishing. Open **Drivetrain**: there are your eight inputs, one for every field in `DrivetrainIOInputs`, with the names `@AutoLog` gave them (`LeftDistanceMeters`, `HeadingDegrees`, and so on). Open **RealOutputs** > **Drivetrain**: there is `Pose`, the output you logged in `periodic()`.
3. The main area starts on a **Line Graph** tab. Drag `LeftSpeedMetersPerSecond` and `RightSpeedMetersPerSecond` onto it. Drive in teleop and watch both lines move. Hold the left bumper in Test mode and watch them climb to 0.10 and stop, the curve from your table at the start of Section 17.8.
4. Add a new tab with the **+** button at the top of the window, and choose **2D Field**. Drag `Pose` from **RealOutputs** > **Drivetrain** onto the **Poses** list at the bottom. A robot appears on a field. Run autonomous and watch it.

The full-size FRC field makes the Explorer's course look tiny, and that is fine. Chapter 24 will show you how to zoom, replay, and line up the graphs with the field.

> **Simulated or real, the same recordings**
>
> Everything you just saw works on the real robot too. Set `USE_SIMULATED_ROBOT = false`, switch the XRP on, and connect AdvantageScope the same way: the inputs now come from the real encoders and gyro, through `DrivetrainIOXRP`, and the graphs and field show the real robot. AdvantageScope does not know or care which robot made the data. Neither does `Drivetrain`.

---

## 17.10 Sim Versus Real: What the Simulator Cannot See

You now have two Explorers. It is time to be honest about how different they are, because a team that trusts its simulator too much learns the difference on the field.

Run autonomous five times on the simulated robot and record where each step ended, as you did in Chapter 15 and Chapter 16. Then switch to the real robot (`USE_SIMULATED_ROBOT = false`, XRP on, batteries fresh) and run it five times. You will probably see something like this pattern:

| | Simulated | Real |
|---|---|---|
| Every run the same? | Exactly the same, to the millimeter | A little different each time |
| Leg 1 ends at 0.50 m? | Almost exactly | Within a centimeter or so |
| Turn ends at 90 degrees? | Almost exactly | Within your tolerance, plus a little slide |
| Drives straight? | Perfectly | Curves a little, PID corrects |
| Time for the routine | About the same every run | Varies with battery and floor |

The simulator is **too perfect**, and the reasons are all things the model leaves out:

- **No noise.** Simulated encoders and the simulated gyro report exact values. Real ones tick in steps, jitter, and drift.
- **Perfect heading.** The simulated heading is worked out from the same two wheel distances as the encoders, so gyro and encoders always agree. On the real robot, wheels slip and scrub, and the gyro and encoders disagree a little. (Chapter 14's square that never closed came from exactly that.)
- **Twin motors.** The simulation averages your two sides' kV and kA, so its two sides are identical, except for kS. Your real robot's sides are not twins.
- **Batteries that never tire.** The model is a snapshot of the day you ran SysId. The simulated robot is always on fresh batteries.
- **No scrub in turns.** The simulation uses straight-line gains for turning. The real robot fights more friction when it spins in place (Section 16.10).

None of this makes the simulator useless. It means you use it for what it is good at:

| Use the simulator to find | Use the real robot to find |
|---|---|
| Logic bugs: wrong step order, missing `break`, a step that never ends | Final PID and feedforward tuning |
| Sign errors: turning the wrong way, driving backward | How the robot behaves on this floor, with these batteries |
| Crashes and exceptions | Sensor problems: noise, drift, a loose wire |
| Whether a new routine roughly works before you try it | Whether it really works |

A good team's habit: **every change runs in simulation first, then on the robot.** The simulator catches the silly mistakes in seconds, so the precious minutes with the robot are spent on the problems only the robot can show you.

> **Check your simulator against SysId**
>
> Here is a neat way to prove the simulator is built from your model. Run the Chapter 16 SysId tests on the **simulated** robot (Test mode, the D-pad, in one run of the program), then load the `FRC_...` log file into SysId exactly as in Section 16.7. SysId should hand back gains very close to the ones the simulator was built from: kV and kA near the `SIM_` averages, and kS near your two sides' kS. If it does, the whole chain works: the D-pad tests, the logging, the IO layer, and the model. If it does not, something in the chain is wrong, and you found out without a robot. (Exercise Build step 7 asks you to do this.)

---

## 17.11 Simulation and IO Layers Everywhere

You will meet this chapter's two ideas, simulation and the IO layer, on every robot for the rest of the book.

- **Chapter 19, subsystems.** `Drivetrain` becomes a WPILib `SubsystemBase`, and WPILib calls its `periodic()` method for you every loop. You already named it.
- **Chapter 22, unit tests.** Automated tests need a robot that does exactly the same thing every time. You just built one. A test can create `new Drivetrain(new DrivetrainIOSim())`, drive it, and check where it ended up, on every push to GitHub, with no robot anywhere.
- **Chapter 24, AdvantageScope and replay.** The inputs AdvantageKit is recording right now are what make replay possible. You will play a real run back through your code and watch it make the same decisions.
- **Chapter 26, the roboRIO.** The Mini Swerve has completely different hardware: brushless motors on CAN, a navX gyro, real battery volts. Its drivetrain gets new IO classes for the new hardware. The logic above the seam (kinematics, feedforward, odometry, PID) is the part you carry over, and the part you already know works, because you tested it in simulation.
- **Chapter 32, SysId on the Mini Swerve.** A swerve module's motors get the same treatment: measure the model, then simulate it.
- **Chapter 34, mechanisms.** WPILib has simulation classes for most FRC mechanisms, built the same way as `DifferentialDrivetrainSim`: `FlywheelSim` for shooter wheels, `ElevatorSim`, `SingleJointedArmSim`, and more. Each mechanism gets an IO interface, a real IO class, and a sim IO class.
- **Chapter 37, AdvantageKit on the competition robot.** Every subsystem gets an IO layer, and every match is logged for replay.

Real FRC teams lean on this hard. With a good simulator and IO layers in place, programmers can write and test autonomous routines for weeks before the robot exists, and the first day on real hardware is spent tuning, not debugging.

---

## Chapter Summary

> **What you learned in Chapter 17**
>
> * A **physics simulation** runs your robot code against a mathematical model of the robot instead of the real one. It finds logic bugs, sign errors, and crashes anywhere, any time; the real robot is still where you find the truth.
> * On the XRP, the program **always** runs on your laptop, so `isSimulation()` is always `true` and `isReal()` is always `false`. The Explorer chooses its robot with its own constant, `USE_SIMULATED_ROBOT`.
> * An **IO layer** cuts a subsystem along a seam: logic above, hardware below. Only volts go down and **inputs** come up. `Drivetrain` holds the logic; `DrivetrainIOXRP` and `DrivetrainIOSim` are two interchangeable kinds of hardware.
> * New Java: an **interface** is a promise of methods with no bodies; a class `implements` it and must write each one, with `@Override`. **Polymorphism** lets a variable of the interface type hold any implementing object, and Java runs that object's version of each method. **Default methods** give an interface fallback bodies, which is why a forgotten method compiles silently.
> * **AdvantageKit** records every input that crosses the seam, so a run can be replayed later. `Robot` extends `LoggedRobot`, starts the `Logger` first, and `@AutoLog` **generates** the `DrivetrainIOInputsAutoLogged` class during the build.
> * `DrivetrainIOSim` is your Chapter 16 SysId model run forward in time, with WPILib's `DifferentialDrivetrainSim` doing the math and a hand-written friction term for kS. Sensors outside the drivetrain get simulated values with `AnalogInputSim` in `simulationPeriodic()`.
> * The simulator is **too perfect**: no noise, perfect heading, twin motors, fresh batteries. Run every change in simulation first, then confirm it on the robot.

---

## Exercises

### Practice

**1. Interfaces on a small scale.** In a scratch copy of your project (or a new branch, `git checkout -b practice-interfaces`), create the `DistanceSensor` interface and its two classes, `RangefinderDistanceSensor` and `FixedDistanceSensor`, from Section 17.4. Add the `isObstacleWithin` default method from Section 17.5. Then, in the `Robot()` constructor, add:

```java
DistanceSensor fake = new FixedDistanceSensor(0.15);
System.out.println(fake.getDistanceMeters());
System.out.println(fake.isObstacleWithin(0.20));
```

Before you run it, predict both lines. Then try three things, one at a time, and read each compiler error aloud the Chapter 10 way: (a) delete `getDistanceMeters()` from `FixedDistanceSensor`; (b) put it back, but misspell it as `getDistanceMeter()`, keeping the `@Override`; (c) fix the spelling, then give `FixedDistanceSensor` its own version of the default method that always answers `false`, but spell it `isObstacleWith(double meters)` and leave off the `@Override`. Which of the three does the compiler catch, and what does each error say? In (c), which method runs when you call `fake.isObstacleWithin(0.20)`, and why? Write one sentence in `reflections.md` about what `@Override` protected you from. Delete the practice branch when you are done.

**2. A simulator you write yourself.** Section 17.8's table stepped one wheel forward by hand. Write it as code. Make a class `WheelSim` with fields for kS, kV, kA (set in the constructor), and for the speed and position (starting at 0), and a method `void update(double volts, double seconds)` that does the three steps from Section 17.8, with friction. In the `Robot()` constructor, temporarily create `new WheelSim(0.95, 18.0, 1.1)`, call `update(2.75, 0.02)` in a `for` loop 100 times (two seconds), and print the speed every 10 loops. Compare your numbers with the table in Section 17.8 and with the cruise check on the simulated Explorer. Then try `update(0.5, 0.02)`: what happens, and why? Remove the test code afterward.

**3. A tired robot.** The simulated robot always obeys exactly the model the feedforward uses, which is why the cruise check lands on 0.10. Real robots do not. In `DrivetrainIOSim`, multiply `SIM_KV_VOLT_SECONDS_PER_METER` by `1.15`, as if the batteries were tired and the robot needed 15% more volts for every meter per second. Before you run it, predict: will the feedforward-only cruise check read more or less than 0.10, and roughly what? Run it and compare. Then run autonomous. Does it still finish? Which part of the code is now covering for the wrong model? Put the multiplier back to `1.0` (or delete it) when you are done.

**4. Add sensor noise.** Real sensors are not perfect. `DifferentialDrivetrainSim` can add random noise to what it reports. Replace the `null` at the end of the constructor with:

```java
VecBuilder.fill(0.001, 0.001, 0.0001, 0.05, 0.05, 0.005, 0.005)
```

(and `import edu.wpi.first.math.VecBuilder;`). The seven numbers are standard deviations (how big the random wobble typically is) for x, y, heading, left speed, right speed, left distance, and right distance, in meters, radians, and meters per second. They are the starting values WPILib's documentation suggests. Run autonomous five times. Is every run still identical? Watch `Distance Error (m)` and the PID plots: what does the noise do to the derivative term if you set `kD` above zero? Write two sentences on why noise makes a simulator **more** useful, even though it makes it less tidy.

**5. Build a wall.** Change `simulateSensors()` so the simulated rangefinder sees a wall at x = 1.0 meter, across the field. The distance ahead is `1.0 - pose.getX()` when the robot faces along +x (heading near 0). Convert it to volts (`meters ÷ 4 × 5`), and keep it between 0 and 5 volts with `MathUtil.clamp`. Then drive at the wall in teleop. Does the wall stop from Chapter 9 trigger at 0.20 meters? Watch `Distance Ahead (m)` and `Blocked`. (Extra: what happens if you approach the wall facing a different way? What would you need to make the simulated rangefinder correct at any heading? Do not build it; describe it in two sentences.)

**6. Challenge: an IO layer for `Sensors`.** Give the `Sensors` class the same treatment as `Drivetrain`. Create a `SensorsIO` interface with an `@AutoLog` inputs class (`distanceAheadMeters`, `leftReflectance`, `rightReflectance`, and the three accelerometer values) and `updateInputs`, a `SensorsIOXRP` that reads the real sensors, and a `SensorsIOSim` that computes them from the robot's pose (so it needs the pose: think about how to give it one). Change `Sensors` to take a `SensorsIO` in its constructor, add a `periodic()` that reads and logs the inputs, and call it in `robotPeriodic()` right after `drivetrain.periodic()`. Then `simulateSensors()` and the three `AnalogInputSim` fields can go. When it works, the Explorer has no hardware outside an IO class. This is optional, and Chapter 24 explains what it buys you.

### Build (XRP Explorer)

Split the drivetrain into an IO layer, install AdvantageKit, and drive a simulated Explorer.

1. Install the AdvantageKit vendordep and add the two `build.gradle` blocks (Section 17.6, Steps 1 and 2). Build once with an internet connection and confirm `BUILD SUCCESSFUL`.
2. Change `Robot` to extend `LoggedRobot`, and add the `Logger` setup at the top of the constructor (Section 17.6, Step 3).
3. Create `DrivetrainIO.java` and `DrivetrainIOXRP.java`, and replace `Drivetrain.java` with the new listing (Section 17.7). Keep **your** SysId gains in the six constants, not the example values.
4. Make the four small `Robot.java` changes in "Check: the real robot drives exactly as before," build, and confirm on the **real** XRP that teleop, the cruise check, and autonomous behave exactly as at the end of Chapter 16. Commit.
5. Create `DrivetrainIOSim.java` (Section 17.8). Add `USE_SIMULATED_ROBOT`, the real-or-simulated decision, the second metadata line, the `AnalogInputSim` fields, and `simulationPeriodic()` with `simulateSensors()` (Section 17.9).
6. Switch the XRP off, set `USE_SIMULATED_ROBOT = true`, and run the simulated Explorer: drive it in teleop, run the cruise check and the tuning bench in Test mode, and run autonomous until the field shows it reaching the tape. Connect AdvantageScope and find the eight `Drivetrain` inputs and the `Pose` output (Section 17.9).
7. Check the simulator against SysId: on the simulated robot, run all four Chapter 16 SysId tests in one run of the program, and analyze the `FRC_...` log in SysId. In `reflections.md`, record the gains SysId found next to the gains the simulator was built from.
8. Fill in the sim versus real table from Section 17.10 with your own five runs of each.
9. Set `USE_SIMULATED_ROBOT = false` before you commit, so the code in `main` always drives the real robot by default.

Diagnose anything strange:

- **`DrivetrainIOInputsAutoLogged` cannot be found:** the project has not built successfully since you added `@AutoLog`, or the `annotationProcessor` line is missing from `build.gradle` (Section 17.6, Step 4).
- **The build fails right after editing `build.gradle`:** a quote, parenthesis, or brace is missing. Compare with the AdvantageKit installation page character by character.
- **The simulated dot does not move:** see "Did the dot not move?" in Section 17.9.
- **The simulated robot drives forward when it should turn, or turns the wrong way:** a sign is wrong in `DrivetrainIOSim`. Check that `setVolts` stores `leftVolts` into `this.leftVolts` and `rightVolts` into `this.rightVolts`, not the other way round.
- **Teleop will not drive forward in simulation, and `Blocked` is true:** the simulated rangefinder is reading 0. Check that `simulationPeriodic()` is spelled exactly right, with `@Override`, and that `USE_SIMULATED_ROBOT` is `true`.
- **Autonomous drives 1.0 meter up leg 2 and stops with `No line within 1.0 m`:** the simulated tape is not being seen. Check `simulateSensors()` and `LINE_DISTANCE_METERS`.
- **On the real robot, the heading or distances jump the moment you press Y:** `resetPose()` must call `zeroSensors()` before `odometry.resetPosition(...)`, and `zeroSensors()` must copy from `inputs`, not from zero.
- **The real robot does nothing, but the simulated one works:** `USE_SIMULATED_ROBOT` is still `true`, so no `XRPMotor` exists. The terminal log says which drivetrain started.

When the real Explorer drives exactly as it did in Chapter 16, the simulated one runs the whole course on your laptop, and AdvantageScope shows the drivetrain's inputs from both, your Explorer has an IO layer. Every chapter from here on builds on it.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. `Drivetrain` has a field of type `DrivetrainIO`, but there is no such thing as a `new DrivetrainIO()`. Explain what kind of object is really in that field, who decided, and why `Drivetrain` is written so that it cannot tell.
2. Why can the Explorer not use `RobotBase.isReal()` to decide whether to create `DrivetrainIOXRP` or `DrivetrainIOSim`? What would go wrong if it tried?
3. Every getter in the new `Drivetrain` reads from `inputs`, and the hardware is read only once per loop. Give one bug this prevents on the real robot, and one reason it matters for AdvantageKit's log replay.
4. Your simulated autonomous ends in exactly the same place every time, and your real one does not. List two things the simulation leaves out that could explain the difference, and say which kind of bug you would still trust the simulator to find.

If any answer feels shaky, re-read Sections 17.2, 17.5, and 17.7.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b io-layer-and-sim
```

Commit twice, at the two safe places to stand. First, after Build step 4 (the refactor, checked on the real robot):

```bash
git add .
git commit -m "Ch17: AdvantageKit and drivetrain IO layer (no behavior change)"
```

Then after Build step 9 (the simulator, with `USE_SIMULATED_ROBOT = false`):

```bash
git add .
git commit -m "Ch17: simulated drivetrain from SysId model"
git push -u origin io-layer-and-sim
```

Open a pull request into `main`. In the description, include your sim versus real table and the gains SysId found on the simulated robot. Review **Files changed**: you should see the three new IO files, `Drivetrain.java`, `Robot.java`, `build.gradle`, and the new `vendordeps/AdvantageKit.json`. You should **not** see `DrivetrainIOInputsAutoLogged.java`: it is generated inside `build/`, which the WPILib template's `.gitignore` already keeps out of Git. Generated files never go in version control; anyone who builds the project gets a fresh copy. Merge, delete the branch, then `git checkout main` and `git pull`.

Why two commits? Because if something goes wrong later, `git log` (Chapter 10) shows a clean line between "the code was reorganized and still worked" and "a simulator was added." If the real robot ever misbehaves, you can check out the first commit and know the refactor was not the cause.

### Collab: Bug in a Box

Work with a partner. Each of you needs a working simulated Explorer.

1. Partner A makes a branch, `git checkout -b mystery-bug`, and plants **one** small bug in `Robot.java` or `Drivetrain.java` (not in an IO class): a flipped sign, a wrong constant, a missing `break`, a step that starts the wrong next step. A commits it and pushes the branch, and says nothing about it.
2. Partner B fetches the branch (`git fetch`, then `git checkout mystery-bug`), sets `USE_SIMULATED_ROBOT = true`, and finds the bug **using only the simulator**: the field, the Sim GUI plots, the terminal log, and AdvantageScope. No real robot allowed. B writes down each clue that led to the bug.
3. Swap roles and repeat.

Afterward, each of you writes two sentences in `reflections.md`: which tool gave the most useful clue, and whether the bug would have been easier or harder to find on the real robot. Delete both `mystery-bug` branches.

### Explore

AdvantageKit's own template projects use the same IO pattern you just built, on full-size robots. Read the **IO Interfaces** page in the AdvantageKit documentation (linked below), then find the **Differential Drive** template on AdvantageKit's **Template Projects** pages and look at its `DriveIO` interface and `DriveIOSim` class. Write three sentences in `reflections.md`: one thing their drivetrain IO has that yours does not, one thing yours does that theirs does differently, and how their template chooses between real and simulated hardware (and why that would not work on the XRP).

---

> **Additional Resources**
>
> * **Physics Simulation with WPILib**: [docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/physics-sim.html](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/physics-sim.html) WPILib's overview of simulation classes, including `DifferentialDrivetrainSim`, `FlywheelSim`, `ElevatorSim`, and `SingleJointedArmSim`
> * **Creating a Drivetrain Model**: [docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/drivesim-tutorial/drivetrain-model.html](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/drivesim-tutorial/drivetrain-model.html) part of WPILib's drivetrain simulation tutorial, building `DifferentialDrivetrainSim` from SysId gains
> * **IO Interfaces (AdvantageKit)**: [docs.advantagekit.org/data-flow/recording-inputs/io-interfaces](https://docs.advantagekit.org/data-flow/recording-inputs/io-interfaces) the AdvantageKit explanation of the IO layer, with diagrams of a subsystem before and after
> * **Installing AdvantageKit in an Existing Project**: [docs.advantagekit.org/getting-started/installation/existing-projects](https://docs.advantagekit.org/getting-started/installation/existing-projects) the vendordep URL, the `build.gradle` lines, and the `LoggedRobot` setup from Section 17.6
> * **AdvantageScope Live Sources**: [docs.advantagescope.org/overview/live-sources](https://docs.advantagescope.org/overview/live-sources) how to connect AdvantageScope to a robot or the simulator
> * **Interfaces and Polymorphism (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/IandI/createinterface.html](https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html) and [docs.oracle.com/javase/tutorial/java/IandI/polymorphism.html](https://docs.oracle.com/javase/tutorial/java/IandI/polymorphism.html) Java's own explanation of interfaces, `implements`, default methods, and polymorphism

---

*Next up, Chapter 18: Why Command-Based? Your `Robot.java` has grown an autonomous switch statement, a tuning bench, a SysId test runner, and a pile of remembered fields. You will see why FRC teams organize robot code into subsystems and commands instead, and what that buys a robot that already has an IO layer.*
