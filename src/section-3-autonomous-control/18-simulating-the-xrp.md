# Chapter 18: Simulating the XRP

In Chapter 16, SysId handed you three numbers for each side of the Explorer: kS, kV, and kA, how many volts it takes to get moving, to hold a speed, and to speed up. In Chapter 17 you cut `Drivetrain` along a seam, so that every reading from the hardware comes up through one small IO class, and every command goes down through it.

Put those two together and something a little surprising becomes possible. If you know how many volts it takes to produce a speed, you also know what speed a voltage will produce. Run the model backwards, and you have a robot that exists only as math. It drives, it turns, it coasts to a stop, and it does all of that with no motors, no batteries, and no floor. That is a **simulation**. And thanks to Chapter 17's seam, you can plug it in below `Drivetrain` in place of the real XRP, and `Drivetrain` will never know.

Here is why you want one. Your autonomous routine has five steps, two PID controllers, a timeout, and a line sensor. Every time you change one line of it, you have to find the robot, find fresh batteries, find a clear patch of floor, put the robot on the start line, run it, measure it, and carry it back. A simulated Explorer runs the same routine on your laptop, on the bus, at 11 PM the night before a competition, as many times as you like. It will not tell you the final answer (only the real robot can do that), but it will catch the bug where the robot turns right instead of left long before the real robot drives off the table.

On the Java side, you will learn the idea that makes the swap work: **polymorphism**, one variable type with many possible kinds of object behind it.

You will need your XRP only at the end of the chapter, to compare the simulated robot with the real one. In between, you will not need it at all. That is the point.

---

## 18.1 A Robot in Your Laptop: Why Simulate?

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

What can it not catch? Anything the model leaves out: a loose wheel, a dirty floor, a tired battery, a gyro that drifts. You will look at this honestly in Section 18.6. The rule every team learns is the same: **the simulator is for finding bugs, the robot is for finding the truth.**

> **Physics simulation, in one sentence**
>
> A physics simulation is your robot code driving a mathematical model of the robot instead of the real one, so you can test logic, signs, and sequences anywhere, then confirm the final behavior on real hardware.

---

## 18.2 Wait, Isn't the XRP Already Simulated?

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

So the Explorer cannot ask WPILib which robot it is driving. You will tell it, with one constant, in Section 18.5.

> **A common confusion**
>
> On a roboRIO robot, `isReal()` means "the real robot" and `isSimulation()` means "a model of the robot." On the XRP, `isSimulation()` is always `true`, because the code always runs on your laptop. AdvantageKit's own example projects choose real or simulated hardware with `isReal()`. That works on a roboRIO, but on the XRP it would always pick the simulation. That is why the Explorer uses its own constant instead.

---

## 18.3 New Java: Polymorphism

In Chapter 17 you wrote a small interface, `DistanceSensor`, and two classes that keep its promise: `RangefinderDistanceSensor`, which reads the real rangefinder, and `FixedDistanceSensor`, which always reports the same number (Section 17.2). So far you have only used them one at a time. Now put them to work together.

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

> **Do not run the real branch in your Explorer**
>
> `RangefinderDistanceSensor` creates its own `XRPRangefinder`, and `Sensors` already owns that rangefinder. WPILib lets each piece of hardware be opened only once, so a second one stops the program at startup with `AllocationException: Code: -1029`, the same rule Chapter 17's Practice 2 broke on purpose with a second `Encoder`. That is one more reason real hardware belongs in exactly one class. Practice 1 lets you see it happen.

This is called **polymorphism**, from the Greek for "many shapes": one variable type, many possible kinds of object behind it, and each object answers the same call in its own way.

Here is why it matters so much. The wall-stop line was written once. It will never need to change, no matter how many kinds of distance sensor you invent. To switch sensors, you change the one line that **creates** the object. Everything that **uses** it stays the same. Programmers call this "programming to an interface": write the code that uses a thing against its interface, and you can swap the thing without touching that code.

That is the whole plan for the drivetrain, and half of it is already done. Since Chapter 17, `Drivetrain` has had a field of type `DrivetrainIO`, and so far only a `DrivetrainIOXRP` has ever gone in it. This chapter writes a second class that keeps the same promise. Then `Robot` decides, once, whether to put a real one or a simulated one in that field. `Drivetrain` calls `io.setVolts(...)` and `io.updateInputs(...)`, and Java runs whichever version is plugged in.

> **The type of the variable vs the class of the object**
>
> In `DistanceSensor sensor = new FixedDistanceSensor(1.0);`, the **variable's type** is `DistanceSensor`, and the **object's class** is `FixedDistanceSensor`. The variable's type decides which methods you are allowed to call: only the ones the interface lists. The object's class decides which code actually runs. If `FixedDistanceSensor` had an extra method, `setDistance()`, you could not call it through `sensor`, because a `DistanceSensor` does not promise to have one.

---

## 18.4 A Robot Made of Math: `DrivetrainIOSim`

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

- **Turning gains.** You measured only straight driving. If you pass your straight-line kV and kA for the angular gains too, WPILib treats each wheel as its own little motor that does not care what the other is doing. That is a reasonable first model of an XRP, whose two wheels really are driven separately. It ignores the extra friction of scrubbing in a turn (Section 16.10), which you will see again in Section 18.6.
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
    // because we measured only straight driving (Section 18.4).
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

- **Same promise, completely different inside.** `DrivetrainIOSim` implements the same two methods as `DrivetrainIOXRP`, with `@Override` on each, and there is not one piece of hardware in it. Put the two files side by side: that is Section 17.2's `RangefinderDistanceSensor` and `FixedDistanceSensor`, at full size.
- **The model comes from your SysId gains,** read from `Drivetrain`'s public constants, so when you re-run SysId and update the gains, the simulator updates too. The `SIM_` constants are separate names on purpose: in Practice 3 you will make the simulated robot deliberately **different** from the model the feedforward uses, to see how PID copes.
- **`setVolts` only remembers.** Nothing moves when you call it. The robot moves in `updateInputs`, once per loop: apply the volts, step the physics by `LOOP_SECONDS`, then report. That keeps simulated time in step with the robot loop.
- **`subtractFriction`** is the kS term from the equation, done by hand. If the volts are smaller than kS, nothing moves, just like a real XRP sitting still at low power. Otherwise kS is taken away, in whichever direction the volts push. `Math.copySign(ksVolts, volts)` gives you `ksVolts` with the sign of `volts`: plus 0.95 for forward, minus 0.95 for reverse. It is `private static` because it uses only its parameters, not any field (Chapter 7).
- **`getHeading()`** is counterclockwise positive, the same as the Explorer's `getHeadingDegrees()` (Chapter 9). The turn rate comes from the two wheel speeds and the trackwidth: forward kinematics, the Chapter 13 formula for ω, then converted to degrees.
- **Three arguments you can mostly ignore.** `DCMotor.getRomiBuiltIn(1)` describes a motor; the simulation uses it only to estimate current draw, which the Explorer never reads. WPILib has no XRP motor in its list, so the Romi's motor (from a similar small robot) stands in. The gearing is `1.0`, because your kV and kA were measured at the wheels, with the gearbox already included. And `null` means "no sensor noise," so the simulated encoders are perfect (Practice 4 changes that).

> **What does `sim.update` actually do?**
>
> It does the three steps from the start of this section, but more carefully. Instead of one 20 millisecond step with one acceleration, it takes several smaller steps inside each one and checks its own error, a technique from numerical math called Runge-Kutta integration. It also tracks the robot's x, y, and heading on the floor as it goes. You do not need to know how; you do need to know that it is your SysId equation underneath.

---

## 18.5 Switching Robots: The Simulated Explorer

Two pieces are left, both in `Robot.java`: a way to choose which robot to run, and a simulated floor for the sensors that are not part of the drivetrain.

### One constant to choose the robot

Section 18.2 explained why the Explorer cannot ask WPILib whether it is driving a real robot. So it gets a constant. Add it as the first constant in `Robot.java`, right under the "Constants" comment, so it is the first thing anyone opening the file sees:

```java
// Which robot to drive: false for the real XRP, true for the simulated one (Section 18.5).
private static final boolean USE_SIMULATED_ROBOT = false;
```

Then replace `drivetrain = new Drivetrain(new DrivetrainIOXRP());` (from the check in Section 17.4) with the real decision:

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

Read it aloud. `drivetrainIO` is a local variable whose type is the interface. Either branch puts a different kind of object in it. Then one line hands it to `Drivetrain`, which never asks which kind it got. Section 18.3's polymorphism, in the one place it matters most.

Notice what `USE_SIMULATED_ROBOT = true` does **not** create: no `XRPMotor`, no `Encoder`, no `XRPGyro`. The simulated robot never touches the XRP's drivetrain hardware, so there is nothing for the real robot's motors to receive.

While you are here, add a second metadata line under `recordMetadata("ProjectName", ...)`, so every log file says which robot made it:

```java
Logger.recordMetadata("Robot", USE_SIMULATED_ROBOT ? "Simulated XRP" : "Real XRP");
```

That is Chapter 8's ternary operator choosing between two strings.

Here is the top of the constructor now, down to the line that creates `Sensors`. Everything after it (the field map and the PID setup) is unchanged:

```java
public Robot() {
    // AdvantageKit first, before anything else is created (Section 17.3).
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
// Pretend sensors for the simulated robot (Section 18.5). Unused on the real XRP.
private final AnalogInputSim leftReflectanceSim = new AnalogInputSim(0);
private final AnalogInputSim rightReflectanceSim = new AnalogInputSim(1);
private final AnalogInputSim rangefinderSim = new AnalogInputSim(2);
```

Then add a new section to `Robot.java`, just above the Test mode section:

```java
// Simulation (Section 18.5)

@Override
public void simulationPeriodic() {
    // An XRP program always runs as a simulation on your laptop (Section 18.2), so this
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

- **`simulationPeriodic()`** is one more mode method from WPILib's robot base class, like `robotPeriodic()`. It runs every loop, after everything else, but only when the program is running as a simulation. On a roboRIO it never runs. On the XRP, as Section 18.2 warned, it **always** runs, so the `if` makes sure the Explorer only pretends when `USE_SIMULATED_ROBOT` is `true`.
- **The simulated tape is not a strip.** Anywhere the robot's y is at least `LINE_DISTANCE_METERS` reads as black. On the course, the only way to get there is to turn left at the corner and drive up leg 2, which is exactly when autonomous starts looking for it. A simple fake that is good enough for the job is a very common simulation trick.
- **The accelerometer** still reads zero. Nothing in the Explorer depends on it, so it is left alone.

> **Why not give `Sensors` an IO layer too?**
>
> You could, and on a competition robot you would: every sensor's readings should cross a seam, so AdvantageKit can record and replay them. The drivetrain is the part where it matters most today, and doing one subsystem carefully teaches the pattern better than doing four in a hurry. Chapter 17's Practice 4 walks you through doing `Sensors` yourself, and Chapter 25 shows what replay gains from it.

### Running the simulated Explorer

Build, then:

1. **Switch your XRP off.** In simulation, there must be no real robot answering. If the XRP is on and connected, its real sensor readings and your simulated ones would fight over the same channels.
2. Set `USE_SIMULATED_ROBOT = true`. Build.
3. Run **WPILib: Simulate Robot Code**, the same as always. If VS Code asks which simulation extensions to use, the Simulation GUI must be checked. The XRP client can stay checked; with the XRP switched off, it simply has no robot to talk to.
4. In the Simulation GUI, set up your controller in **Joysticks** slot 0 (Chapter 8), then open the map in AdvantageScope's 2D Field and your widgets in Elastic, the same as with the real robot (Chapter 14). The simulated program is a NetworkTables server on your laptop, so neither tool can tell the difference.

Now look at the field. The robot is a dot at the start line. Choose **Teleoperated** in the Robot State panel, and drive. The dot moves. It turns when you turn, slows when you let go, and the `Pose X (m)` and `Measured Forward (m per s)` widgets change as if the robot were real. There is no robot. Every one of those numbers came from the model you measured in Chapter 16.

Then try the routines you already have, in order:

- **The cruise check.** Choose **Test**, hold the left bumper, and watch `Measured Forward (m per s)`. It should settle almost exactly on 0.10, because the simulated robot obeys precisely the model your feedforward was built from.
- **The tuning bench.** Still in Test, press **B** (turn to 90), then **A** (home), then **X** (drive out 0.30 m). Open an AdvantageScope Line Graph (Section 15.9) of the heading setpoint and measurement, and watch PID do its job on a robot made of math.
- **Autonomous.** Press **Y** to reset the pose, choose **Autonomous**, and watch the dot drive leg 1, turn left, and drive up to the tape. On the field, it should end on the `Course` ghost's last pose, or very close. The event log in VS Code's terminal panel should show each step starting and `Line found after ... m`.

> **Did the dot not move?**
>
> Check, in order: Is `USE_SIMULATED_ROBOT` really `true`, and did you build after changing it? (The terminal log says `Drivetrain: SIMULATED` at startup.) Is the robot enabled in the Robot State panel? Did `DrivetrainIOSim`'s methods both get an `@Override`? A missing `@Override` with a typo in a name leaves the empty default in charge, and a robot that silently does nothing. Is `Drivetrain.periodic()` the first line of `robotPeriodic()`? Without it, the simulation never steps.

### Watching it in AdvantageScope

Connect AdvantageScope exactly as in Section 17.5: **File** > **Connect to Simulator** > **NetworkTables 4 (AdvantageKit)**. The **Drivetrain** folder has the same eight inputs, and **RealOutputs** > **Drivetrain** has the same `Pose`. Open the Line Graph tab you set up in Chapter 17, hold the left bumper in Test mode, and watch the two speeds climb toward 0.10 and level off, the curve from your table at the start of Section 18.4. Then run autonomous with the 2D Field tab open.

It all looks the same as it did with the real robot. That is the point.

> **Simulated or real, the same recordings**
>
> Set `USE_SIMULATED_ROBOT = false`, switch the XRP on, and connect AdvantageScope the same way, as you did in Chapter 17: the inputs come from the real encoders and gyro, through `DrivetrainIOXRP`, and the graphs and field show the real robot. AdvantageScope does not know or care which robot made the data. Neither does `Drivetrain`.

---

## 18.6 Sim Versus Real: What the Simulator Cannot See

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

## 18.7 Simulation and IO Layers Everywhere

You will meet the two ideas from Chapters 17 and 18, the IO layer and simulation, on every robot for the rest of the book.

- **Chapter 20, subsystems.** `Drivetrain` becomes a WPILib `SubsystemBase`, and WPILib calls its `periodic()` method for you every loop. You already named it.
- **Chapter 23, unit tests.** Automated tests need a robot that does exactly the same thing every time. You just built one. A test can create `new Drivetrain(new DrivetrainIOSim())`, drive it, and check where it ended up, on every push to GitHub, with no robot anywhere.
- **Chapter 25, AdvantageScope and replay.** The inputs AdvantageKit is recording right now are what make replay possible. You will play a real run back through your code and watch it make the same decisions.
- **Chapter 27, the roboRIO.** The Mini Swerve has completely different hardware: Kraken brushless motors on CAN, a Pigeon 2 gyro, real battery volts. Its drivetrain gets new IO classes for the new hardware. The logic above the seam (kinematics, feedforward, odometry, PID) is the part you carry over, and the part you already know works, because you tested it in simulation.
- **Chapter 33, SysId on the Mini Swerve.** A swerve module's motors get the same treatment: measure the model, then simulate it.
- **Chapter 35, mechanisms.** WPILib has simulation classes for most FRC mechanisms, built the same way as `DifferentialDrivetrainSim`: `FlywheelSim` for shooter wheels, `ElevatorSim`, `SingleJointedArmSim`, and more. Each mechanism gets an IO interface, a real IO class, and a sim IO class.
- **Chapter 38, AdvantageKit on the competition robot.** Every subsystem gets an IO layer, and every match is logged for replay.

Real FRC teams lean on this hard. With a good simulator and IO layers in place, programmers can write and test autonomous routines for weeks before the robot exists, and the first day on real hardware is spent tuning, not debugging.

---

## Chapter Summary

> **What you learned in Chapter 18**
>
> * A **physics simulation** runs your robot code against a mathematical model of the robot instead of the real one. It finds logic bugs, sign errors, and crashes anywhere, any time; the real robot is still where you find the truth.
> * On the XRP, the program **always** runs on your laptop, so `isSimulation()` is always `true` and `isReal()` is always `false`. The Explorer chooses its robot with its own constant, `USE_SIMULATED_ROBOT`.
> * New Java: **polymorphism** lets a variable of an interface type hold any object whose class implements it, and Java runs that object's version of each method. The variable's type decides which methods you may call; the object's class decides which code runs. Write the code that **uses** a thing against its interface, and you can swap the thing by changing only the line that **creates** it.
> * `DrivetrainIOSim` is your Chapter 16 SysId model run forward in time, with WPILib's `DifferentialDrivetrainSim` doing the math and a hand-written friction term for kS. It implements the same `DrivetrainIO` promise as `DrivetrainIOXRP`, with no hardware in it. Sensors outside the drivetrain get simulated values with `AnalogInputSim` in `simulationPeriodic()`.
> * The simulator is **too perfect**: no noise, perfect heading, twin motors, fresh batteries. Run every change in simulation first, then confirm it on the robot.

---

## Exercises

### Practice

**1. One variable, two sensors.** On a scratch branch (`git checkout -b practice-polymorphism`), bring back the `DistanceSensor` interface and its two classes from Chapter 17's Practice 1 (or write them again from Section 17.2). In the `Robot()` constructor, add a local `boolean testingAtMyDesk = true;` and the `if`/`else` from Section 18.3 that puts one or the other kind of sensor into a `DistanceSensor sensor` variable. Then print `sensor.getDistanceMeters()` and `sensor.isObstacleWithin(0.20)`. Before you run it, predict both lines with `testingAtMyDesk` set to `true`, and run it. Then predict what happens with `false`, and run that once: read the error in the terminal and say which hardware it is about and which class already owns it (the callout in Section 18.3 has the answer if you are stuck). Set it back to `true`. Then add a method `setDistance(double meters)` to `FixedDistanceSensor` only, and try to call `sensor.setDistance(0.1)`. What does the compiler say, and why, if the object in `sensor` really is a `FixedDistanceSensor`? Write one sentence in `reflections.md` about the difference between the variable's type and the object's class. Delete the branch when you are done.

**2. A simulator you write yourself.** Section 18.4's table stepped one wheel forward by hand. Write it as code. Make a class `WheelSim` with fields for kS, kV, kA (set in the constructor), and for the speed and position (starting at 0), and a method `void update(double volts, double seconds)` that does the three steps from Section 18.4, with friction. In the `Robot()` constructor, temporarily create `new WheelSim(0.95, 18.0, 1.1)`, call `update(2.75, 0.02)` in a `for` loop 100 times (two seconds), and print the speed every 10 loops. Compare your numbers with the table in Section 18.4 and with the cruise check on the simulated Explorer. Then try `update(0.5, 0.02)`: what happens, and why? Remove the test code afterward.

**3. A tired robot.** The simulated robot always obeys exactly the model the feedforward uses, which is why the cruise check lands on 0.10. Real robots do not. In `DrivetrainIOSim`, multiply `SIM_KV_VOLT_SECONDS_PER_METER` by `1.15`, as if the batteries were tired and the robot needed 15% more volts for every meter per second. Before you run it, predict: will the feedforward-only cruise check read more or less than 0.10, and roughly what? Run it and compare. Then run autonomous. Does it still finish? Which part of the code is now covering for the wrong model? Put the multiplier back to `1.0` (or delete it) when you are done.

**4. Add sensor noise.** Real sensors are not perfect. `DifferentialDrivetrainSim` can add random noise to what it reports. Replace the `null` at the end of the constructor with:

```java
VecBuilder.fill(0.001, 0.001, 0.0001, 0.05, 0.05, 0.005, 0.005)
```

(and `import edu.wpi.first.math.VecBuilder;`). The seven numbers are standard deviations (how big the random wobble typically is) for x, y, heading, left speed, right speed, left distance, and right distance, in meters, radians, and meters per second. They are the starting values WPILib's documentation suggests. Run autonomous five times. Is every run still identical? Watch `Distance Error (m)` and the PID plots: what does the noise do to the derivative term if you set `kD` above zero? Write two sentences on why noise makes a simulator **more** useful, even though it makes it less tidy.

**5. Build a wall.** Change `simulateSensors()` so the simulated rangefinder sees a wall at x = 1.0 meter, across the field. The distance ahead is `1.0 - pose.getX()` when the robot faces along +x (heading near 0). Convert it to volts (`meters ÷ 4 × 5`), and keep it between 0 and 5 volts with `MathUtil.clamp`. Then drive at the wall in teleop. Does the wall stop from Chapter 9 trigger at 0.20 meters? Watch `Distance Ahead (m)` and `Blocked`. (Extra: what happens if you approach the wall facing a different way? What would you need to make the simulated rangefinder correct at any heading? Do not build it; describe it in two sentences.)

### Build (XRP Explorer)

Add a simulated drivetrain below the seam, and drive the Explorer with the real robot switched off.

1. Create `DrivetrainIOSim.java` (Section 18.4).
2. Add `USE_SIMULATED_ROBOT`, the real-or-simulated decision, the second metadata line, the `AnalogInputSim` fields, and `simulationPeriodic()` with `simulateSensors()` (Section 18.5).
3. Switch the XRP off, set `USE_SIMULATED_ROBOT = true`, and run the simulated Explorer: drive it in teleop, run the cruise check and the tuning bench in Test mode, and run autonomous until the field shows it reaching the tape. Connect AdvantageScope and find the same eight `Drivetrain` inputs and the `Pose` output you saw in Chapter 17.
4. Check the simulator against SysId: on the simulated robot, run all four Chapter 16 SysId tests in one run of the program, and analyze the `FRC_...` log in SysId. In `reflections.md`, record the gains SysId found next to the gains the simulator was built from.
5. Fill in the sim versus real table from Section 18.6 with your own five runs of each.
6. Set `USE_SIMULATED_ROBOT = false` before you commit, so the code in `main` always drives the real robot by default.

Diagnose anything strange:

- **The simulated dot does not move:** see "Did the dot not move?" in Section 18.5.
- **The simulated robot drives forward when it should turn, or turns the wrong way:** a sign is wrong in `DrivetrainIOSim`. Check that `setVolts` stores `leftVolts` into `this.leftVolts` and `rightVolts` into `this.rightVolts`, not the other way round.
- **Teleop will not drive forward in simulation, and `Blocked` is true:** the simulated rangefinder is reading 0. Check that `simulationPeriodic()` is spelled exactly right, with `@Override`, and that `USE_SIMULATED_ROBOT` is `true`.
- **Autonomous drives 1.0 meter up leg 2 and stops with `No line within 1.0 m`:** the simulated tape is not being seen. Check `simulateSensors()` and `LINE_DISTANCE_METERS`.
- **The simulated robot moves twice as fast as it should:** `drivetrain.periodic()` is being called twice per loop, so the model steps twice. It belongs in `robotPeriodic()` once.
- **The real robot does nothing, but the simulated one works:** `USE_SIMULATED_ROBOT` is still `true`, so no `XRPMotor` exists. The terminal log says which drivetrain started.

When the simulated Explorer runs the whole course on your laptop, the real one still drives exactly as it did in Chapter 17, and AdvantageScope shows the same inputs from both, the Explorer has two robots behind one seam.

> **Checkpoint**
>
> Stuck, or did the build stop working and you cannot find why? Ask your mentor for the **Chapter 18 checkpoint**: a known-good copy of the project at the end of this chapter. Do not copy it over your work. Compare it with yours, file by file (in VS Code, right-click a file and choose **Select for Compare**, then right-click yours and choose **Compare with Selected**), find the difference, and fix your own code. Then commit as usual.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. `Drivetrain` has a field of type `DrivetrainIO`, but there is no such thing as a `new DrivetrainIO()`. Explain what kind of object is really in that field, who decided, and why `Drivetrain` is written so that it cannot tell.
2. Why can the Explorer not use `RobotBase.isReal()` to decide whether to create `DrivetrainIOXRP` or `DrivetrainIOSim`? What would go wrong if it tried?
3. Your simulated autonomous ends in exactly the same place every time, and your real one does not. List two things the simulation leaves out that could explain the difference, and say which kind of bug you would still trust the simulator to find.

If any answer feels shaky, re-read Sections 18.2, 18.3, and 18.6.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b simulation
```

Commit after Build step 6, with `USE_SIMULATED_ROBOT = false`:

```bash
git add .
git commit -m "Ch18: simulated drivetrain from SysId model"
git push -u origin simulation
```

Open a pull request into `main`. In the description, include your sim versus real table and the gains SysId found on the simulated robot. Review **Files changed**: you should see the new `DrivetrainIOSim.java` and `Robot.java`, and nothing else. `Drivetrain.java` did not change at all, which is the whole idea of the seam. Merge, delete the branch, then `git checkout main` and `git pull`.

### Collab: Bug in a Box

Work with a partner. Each of you needs a working simulated Explorer.

1. Partner A makes a branch, `git checkout -b mystery-bug`, and plants **one** small bug in `Robot.java` or `Drivetrain.java` (not in an IO class): a flipped sign, a wrong constant, a missing `break`, a step that starts the wrong next step. A commits it and pushes the branch, and says nothing about it.
2. Partner B fetches the branch (`git fetch`, then `git checkout mystery-bug`), sets `USE_SIMULATED_ROBOT = true`, and finds the bug **using only the simulator**: the field, the AdvantageScope graphs, the terminal log, and Elastic. No real robot allowed. B writes down each clue that led to the bug.
3. Swap roles and repeat.

Afterward, each of you writes two sentences in `reflections.md`: which tool gave the most useful clue, and whether the bug would have been easier or harder to find on the real robot. Delete both `mystery-bug` branches.

### Explore

AdvantageKit's own template projects simulate full-size robots the same way. Find the **Differential Drive** template on AdvantageKit's **Template Projects** pages (linked below) and look at its `DriveIOSim` class and at how the template decides which IO class to create. Write three sentences in `reflections.md`: one thing their simulator models that yours does not, one thing yours does differently, and how their template chooses between real and simulated hardware (and why that would not work on the XRP).

---

> **Additional Resources**
>
> * **Physics Simulation with WPILib**: [docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/physics-sim.html](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/physics-sim.html) WPILib's overview of simulation classes, including `DifferentialDrivetrainSim`, `FlywheelSim`, `ElevatorSim`, and `SingleJointedArmSim`
> * **Creating a Drivetrain Model**: [docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/drivesim-tutorial/drivetrain-model.html](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/drivesim-tutorial/drivetrain-model.html) part of WPILib's drivetrain simulation tutorial, building `DifferentialDrivetrainSim` from SysId gains
> * **Differential Drive Template (AdvantageKit)**: [docs.advantagekit.org/getting-started/template-projects/diff-drive-template](https://docs.advantagekit.org/getting-started/template-projects/diff-drive-template/) AdvantageKit's official differential drive project, with real and simulated IO classes
> * **Polymorphism (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/IandI/polymorphism.html](https://docs.oracle.com/javase/tutorial/java/IandI/polymorphism.html) Java's own explanation of polymorphism

---

*Next up, Chapter 19: Why Command-Based? Your `Robot.java` has grown an autonomous switch statement, a tuning bench, a SysId test runner, and a pile of remembered fields. You will see why FRC teams organize robot code into subsystems and commands instead, and what that buys a robot that already has an IO layer.*
