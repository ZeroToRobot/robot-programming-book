# Chapter 16: SysId Characterization on the XRP

In Chapter 13 you taught the Explorer to drive in meters per second, and you made one honest guess to get there. To turn a speed into a motor power, `speedToPower` divides by the robot's top speed: want half your top speed, send half power. The comment on that method has been waiting three chapters to be cashed in: "A rough estimate... Chapter 16 replaces it." In Chapter 15 you added PID, and PID covered up the guess. When the robot drove slower than you asked, the controller noticed the error and pushed harder. When it stalled a centimeter short because a small power could not beat friction, the I term wound up until it could.

That works, but it is backwards. PID can only push **after** something has gone wrong. Every correction starts with an error, and on the XRP, small errors meet a wall of friction. You saw the cost in Chapter 15: turns that needed a whole I term to finish, and a routine that got slower when it got more accurate.

There is a better way to start, and it is how every good FRC team drives. Before you ask PID for anything, **predict** the power the robot needs. To predict it, you need to know your robot: how much push it takes to get moving, how much more for each meter per second, and how much more to speed up. Those three numbers are called **kS**, **kV**, and **kA**. Measuring them is called **system identification**, and WPILib's tool for it is **SysId**.

In this chapter, the Explorer runs four short experiments on itself while it records everything to a log file. SysId reads the log and fits a model of your robot. Then you replace Chapter 13's one line of division with a **feedforward** built from that model, one per side, because your two motors are not twins. By the end, the Explorer will drive the speed you ask for **before** PID does anything, and PID will be left with only the small job of cleaning up.

On the Java side, you will learn **static imports** and WPILib's **units library**, which lets the compiler catch a whole family of mistakes that has destroyed real spacecraft.

You will need your XRP, about a meter and a half of clear, flat floor, and fresh batteries. Put the fresh batteries in **before** you start. You will see why in Section 16.2.

---

## 16.1 Feedback Reacts, Feedforward Predicts

Picture riding a bike toward a hill. You can see it coming. A rider who only **reacts** waits until the bike slows down on the slope, notices, and then pedals harder. They lose speed on every hill, then catch up. A rider who **predicts** starts pedaling harder just as the slope begins, because they know a hill takes more effort. Their speed barely changes. Both riders use their eyes to fix small mistakes, but the second one makes far fewer mistakes to fix.

Those are the two halves of robot control:

- **Feedback** (PID, Chapter 15) **reacts**. It measures what happened, compares it with what you wanted, and corrects the difference. It needs an error before it can do anything.
- **Feedforward** **predicts**. It looks only at what you want ("0.10 meters per second, please") and calculates the power that should produce it, using a model of the robot. It never looks at a sensor at all.

Each one covers the other's weakness. Feedforward is fast, because it acts before any error exists, but it is never perfect: the model is a little off, the floor is a little different, a battery is a little tired. Feedback is accurate, because it watches the sensors, but it is always a little late. Together, feedforward does most of the work and feedback cleans up what is left:

```
                       +---> [ feedforward: model of the robot ] ----+
                       |                                             |
  what you want -------+                                            (+) ---> motors
                       |                                             |
                       +---> ( - ) ---> [ feedback: PID ] -----------+
                               ^
                               |
                         what the sensors say
```

### You already have a feedforward

You wrote a feedforward in Chapter 13 without much ceremony:

```java
private double speedToPower(double metersPerSecond) {
    return metersPerSecond / MAX_WHEEL_SPEED_METERS_PER_SECOND;
}
```

It predicts a power from a speed, using one number measured on your robot. That is a model. It is just a very simple one, and Chapter 13 admitted what it leaves out: "a little power does nothing at all, because the motors first have to overcome friction." Chapter 13 Build even showed the result. You asked for 0.20 m/s and the `Measured Forward (m per s)` widget read something like 0.17. The guess was always low, and the gap got worse at slow speeds.

In Chapter 15, PID hid that gap. Look at the chain inside `drive()` once more: the distance controller asks for a speed, `drive()` turns it into wheel speeds, and `speedToPower` turns each wheel speed into a power. If `speedToPower` is wrong, PID has to make up the difference with extra error. That is why the steady-state gaps in Chapter 15 were so stubborn: near the target, PID asked for a small speed, `speedToPower` turned it into a small power, and the small power could not beat friction. The problem was never really PID's. It was the model underneath it.

> **Feedforward, in one sentence**
>
> Feedforward predicts the power a motion needs from a model of the robot, before anything happens; feedback measures what actually happened and corrects the rest. Every motion on a well-programmed FRC robot, from a drivetrain to an arm to a shooter wheel, uses both.

---

## 16.2 What It Takes to Move a Robot: kS, kV, and kA

Push a heavy box across the floor. Three different things resist you.

1. **Getting it to budge.** At first you push and nothing happens. The box sticks to the floor until you push past some amount, and then it starts to slide. That is **friction**, and it does not care how fast you want to go. It takes that much push just to move at all.
2. **Keeping it moving faster.** Once the box slides, keeping it sliding slowly is easy, but keeping it sliding fast takes more. On a motor, this effect is stronger and very predictable. A spinning motor acts a little like a generator, making its own voltage that pushes back against the battery. Engineers call it **back-EMF**. The faster the motor spins, the more it pushes back, so holding a higher speed takes proportionally more voltage.
3. **Speeding it up.** To go from slow to fast, you push extra hard for a moment, then ease back to the pushing that holds the new speed. That extra push is about **mass**: the heavier the box, the more it takes to change its speed.

A DC motor driving a robot works exactly the same way, and engineers write it as one equation. It is one of the most useful equations in FRC programming:

```
volts = kS × sign(velocity) + kV × velocity + kA × acceleration
```

| Term | Robot meaning | Box meaning | Units on the XRP |
|---|---|---|---|
| **kS** (static) | Volts to overcome friction, just to start moving | Getting it to budge | volts |
| **kV** (velocity) | Extra volts for each meter per second of speed | Keeping it moving faster | volts per (meter per second) |
| **kA** (acceleration) | Extra volts for each meter per second, per second, of speeding up | Speeding it up | volts per (meter per second per second) |

`sign(velocity)` is just "plus or minus 1, depending on the direction." Friction always fights the motion, so if you drive backward, the kS push points backward too. (When the velocity is exactly zero, `sign` gives zero, which matters later in this chapter.)

### A worked example

Here are the numbers from one XRP. Yours will be different, and finding yours is what this chapter is for:

```
kS = 0.95 volts      kV = 18.0 volts per (m/s)      kA = 1.1 volts per (m/s²)
```

How many volts does it take to cruise at a steady 0.10 m/s? Steady means not speeding up, so the acceleration is zero:

```
volts = 0.95 × 1 + 18.0 × 0.10 + 1.1 × 0
      = 0.95 + 1.80 + 0
      = 2.75 volts
```

Read that out loud: "0.95 volts to get unstuck, plus 1.8 volts to hold a tenth of a meter per second." Here is the same model at a few speeds:

| Speed (m/s) | kS part | kV part | Total volts |
|---|---|---|---|
| 0.00 | 0 (not moving) | 0.00 | 0.00 |
| 0.02 | 0.95 | 0.36 | 1.31 |
| 0.05 | 0.95 | 0.90 | 1.85 |
| 0.10 | 0.95 | 1.80 | 2.75 |
| 0.20 | 0.95 | 3.60 | 4.55 |

Look at the slow rows. At 0.02 m/s, the kS part is almost three times the kV part. At slow speeds, **friction is most of the job**. That is exactly where Chapter 15's PID stalled: it asked for a crawl, the old model sent a crawl's worth of power, and friction ate it.

Now the kA part. Suppose leg 1 asks the robot to go from 0 to 0.20 m/s in half a second. That is an acceleration of `0.20 ÷ 0.5 = 0.4` m/s per second, which needs an extra `1.1 × 0.4 = 0.44` volts for that half second. The XRP is light, so kA is small, and for most of what the Explorer does you can leave it out. On a 50 kilogram competition robot, kA is a big deal.

### The old guess, as a picture

Draw volts against steady speed and every model becomes a line:

```
  volts
    6 |                                           .  the real XRP:
      |                                     .  '       starts at kS, slope kV
    4 |                               .  '
      |                         .  '          /
      |                   .  '           /       Chapter 13's guess:
    2 |             .  '            /            starts at 0
      |       .  '             /
  kS -|  .  '             /
      |              /
    0 +----------/-------------------------------------- speed (m/s)
      0         0.05        0.10        0.15        0.20       0.25
```

Chapter 13's `speedToPower` is a line that starts at zero. The real robot's line starts at kS. The two lines meet near top speed, which is why the guess was fine at full speed and poor at slow speed. Asking for 0.10 m/s, the guess sends about 2.1 volts. The real robot needs 2.75, and with only 2.1 it crawls at about 0.07 m/s. Every slow request comes out slower than asked.

> **Pretend volts: what "volts" means on an XRP**
>
> The XRP's motors really are driven by voltage: `set(0.5)` switches the battery on and off so fast that the motor feels about half the battery's voltage. But the XRP has no way to **measure** its battery, so your code cannot know whether half power is 3.0 volts or 2.4.
>
> This chapter uses **pretend volts**: power times a fixed number, `NOMINAL_BATTERY_VOLTS = 6.0`, which is about what four fresh AA batteries give. When you record a test, you log pretend volts. When you drive, you divide pretend volts by the same 6.0 to get power. Because the same number is used both ways, it cancels out. You could pick 1.0 and the robot would drive exactly the same, but every gain would be harder to compare with the rest of the FRC world, where kS is usually written in volts.
>
> The catch is batteries. As they drain, a given power produces less real voltage, so the robot gets slower, and a model measured on fresh batteries will over-promise. That is why you put fresh batteries in for the tests, and why PID stays in the loop to cover the drift. A roboRIO **can** measure its battery, and its motor controllers can compensate on every loop, which you will use in Chapter 26 and again when you repeat SysId on real brushless motors in Chapter 32.

---

## 16.3 System Identification: Let the Robot Tell You

You could try to measure kS by hand. Creep the power up slowly until the wheels start turning, note the power, done. Then measure kV: drive at a few powers, record the speeds, and draw a line. You did a rough version of this in Chapter 13 when you measured top speed. It works, a little. But each measurement is noisy, the wheels start at slightly different points every time, and kA is almost impossible to see by eye, because the XRP reaches its speed in a fraction of a second.

**System identification** does it properly. You run a few carefully designed experiments, record the voltage, position, and speed fifty times a second, and let a computer find the kS, kV, and kA that best explain **all** of the data at once. The robot tells you what it is, in numbers.

### The four tests

SysId uses two kinds of test, each run forward and backward.

**The quasistatic test** ("as if standing still") raises the voltage very slowly, in a steady ramp:

```
 volts                                   speed
   4 |                         /           0.17 |                        /
     |                    /                     |                    /
   2 |               /                          |               /
     |          /                               |          /
 kS -|     /                                  0 +_________/______________
   0 |/_________________________ time              starts moving at kS
     0 s   2 s   4 s   6 s   8 s                  0 s   2 s   4 s   6 s   8 s
```

For the first couple of seconds, nothing happens: the voltage has not reached kS yet. Then the robot starts to creep, and its speed rises in step with the voltage. Because the ramp is so slow, the robot is barely speeding up at any moment, so the acceleration term is almost zero. That leaves only `kS + kV × velocity`, a straight line. Where the robot starts moving tells you kS, and how steeply speed rises with voltage tells you kV.

**The dynamic test** does the opposite. It jumps straight to a fixed voltage and holds it:

```
 volts                                   speed
   4 |______________________               0.17 |     ____________________
     |                                          |   /
     |                                          |  /
     |                                          | /
   0 +_________________________ time          0 +/_______________________
     0 s     1 s     2 s     3 s                0 s     1 s     2 s     3 s
```

The robot leaps forward, accelerating hard at first, then less and less until it settles at the speed that voltage can hold. Those first moments, while the speed curves up, are where kA shows itself: how much of the voltage went into speeding up instead of holding speed.

**Forward and reverse.** Each test is run in both directions, for four tests in all. Motors and gearboxes are often a little different backward, and running each test both ways lets SysId average out small differences, like a floor that slopes slightly one way. A handy side effect: running a reverse test right after a forward one brings the robot back near where it started.

### What SysId does with the data

Once you have the data, SysId does what you may have done in math or science class with a scatter plot: it finds the **line of best fit**. With three unknowns, it is a "line" in more dimensions than a graph can show, but the idea is the same. The method is called **least squares**: try every possible kS, kV, and kA, and keep the set whose predicted voltages are closest to the measured ones, on average, over every loop of every test. You do not have to do any of that math. You have to give it good data.

> **System identification, in one sentence**
>
> Run experiments that push the robot in known ways, record what it actually does, and let a curve fit find the model that best explains it. The model is only as good as the experiments, which is why the tests are slow ramps and sudden steps, in both directions, on the robot's real floor.

Here is the whole workflow, start to finish. The rest of this chapter walks through each step:

1. **Record.** Your robot code runs the four tests and writes the voltage, position, and speed of each side, plus the name of the test, into the robot's `.wpilog` log (Sections 16.5 and 16.6).
2. **Analyze.** The SysId app on your laptop reads the log and fits kS, kV, and kA for each side (Section 16.7).
3. **Use.** You copy the numbers into `Drivetrain.java`, where a `SimpleMotorFeedforward` turns them into a feedforward (Section 16.8).

---

## 16.4 New Java: Static Imports and the Units Library

Before writing the recording code, you need two new pieces of Java. WPILib's SysId logger is strict about units, and for a very good reason.

### A unit mistake that lost a spacecraft

In 1999, NASA's Mars Climate Orbiter reached Mars after a nine-month trip and was lost. One piece of software, written by one team, calculated thruster data in **pound-force seconds**, an English unit. The software that used those numbers, written by another team, expected **newton-seconds**, a metric unit. Each number was correct. They were in different units, and nothing checked. The spacecraft flew too close to the planet and was never heard from again.

You have been protecting yourself from that bug since Chapter 9, by putting units in names: `getLeftDistanceMeters()`, `AUTO_TURN_RADIANS_PER_SECOND`, `WALL_STOP_DISTANCE_METERS`. That is a good habit, and it is the book's main style. But it has a weakness: names are only for humans. Java will happily let you write this:

```java
double distanceMeters = drivetrain.getHeadingDegrees();   // BUG, but compiles
```

Both are `double`s, so the compiler sees nothing wrong.

### Measures: numbers that know their units

WPILib's **units library** fixes that by making the unit part of the **type**. Instead of a bare `double`, you create a **measure**, an object that holds a number and its unit together:

```java
Distance leg1 = Meters.of(0.50);
```

Read it aloud: "`leg1` is a `Distance`, and it is 0.50 meters." `Meters.of(0.50)` is a static factory method (Chapter 14), like `Rotation2d.fromDegrees`. `Distance` is the type, the same way `Pose2d` is a type.

To get a plain number back out, you say which unit you want it **in**:

```java
leg1.in(Meters)          // 0.5
leg1.in(Centimeters)     // 50.0
leg1.in(Inches)          // 19.68503937007874
```

The conversion happens for you, and it is always right. You can do math, too: `leg1.plus(Centimeters.of(40))` is a `Distance` of 0.9 meters, and the library handled the centimeters.

Here is the real payoff. Because a measure's unit is part of its type, mixing up units becomes a **compile error**:

```java
Voltage oops = Volts.of(4.0).plus(Meters.of(0.5));   // ERROR
```

```
error: incompatible types: Distance cannot be converted to Measure<? extends VoltageUnit>
```

Read the message the Chapter 10 way, word by word: "incompatible types" (the wrong kind of thing), "Distance cannot be converted" (you gave it a distance), "to Measure<? extends VoltageUnit>" (it wanted something measured in a voltage unit). The angle brackets are Java's way of writing "a measure of some voltage unit"; you will meet them properly later in the book. The important part is that this mistake can no longer reach your robot. It is Chapter 10's lesson about `final` again: move bugs from runtime, where they wreck something, to compile time, where they cost you ten seconds.

| You write | Type | What it holds |
|---|---|---|
| `Meters.of(0.5)` | `Distance` | 0.5 meters |
| `Volts.of(4.0)` | `Voltage` | 4 volts |
| `MetersPerSecond.of(0.1)` | `LinearVelocity` | 0.1 meters per second |
| `Seconds.of(8.0)` | `Time` | 8 seconds |
| `Degrees.of(90)` | `Angle` | 90 degrees |

The units come from a class called `Units` in the package `edu.wpi.first.units`, and the measure types come from `edu.wpi.first.units.measure`. If you print a measure, Java shows it with its unit: `Meters.of(0.5)` prints as `5.000e-01 m`, which is scientific notation for 0.5 meters.

### Static imports: saying `Meters` instead of `Units.Meters`

`Meters`, `Volts`, and the rest are `static final` fields of the `Units` class, just like the constants you have written since Chapter 8. Normally you reach a static field through its class name: `Math.PI`, `Units.Meters`. With units, that gets noisy fast:

```java
Units.MetersPerSecond.of(drivetrain.getLeftSpeedMetersPerSecond())
```

A **static import** brings one static member of a class directly into your file, so you can use it by its own name:

```java
import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.Volts;
```

The word `static` after `import` is the whole difference. A regular `import` brings in a **class** (so you can write `Encoder` instead of `edu.wpi.first.wpilibj.Encoder`). A static import brings in a **static field or method** of a class (so you can write `Meters` instead of `Units.Meters`). Static imports go at the top of the file with the regular ones; by convention, they come first, in their own group.

| Import | Lets you write | Instead of |
|---|---|---|
| `import edu.wpi.first.wpilibj.Encoder;` | `Encoder` | `edu.wpi.first.wpilibj.Encoder` |
| `import static edu.wpi.first.units.Units.Meters;` | `Meters` | `Units.Meters` |
| `import static java.lang.Math.PI;` | `PI` | `Math.PI` |

> **Use static imports sparingly**
>
> A static import hides where a name came from. When you read `Meters` in a file, it is obvious. When you read `clamp(x, 0, 1)`, is that `MathUtil.clamp` or something else? Java's own tutorial gives the same advice: use static imports for a few constants that are used constantly and are clear on their own, like units. Do not static-import everything. That is why this book keeps writing `MathUtil.clamp` and `Math.abs` in full.

### Which style should you use?

You now have two ways to keep units straight: unit-suffixed `double`s (`distanceMeters`), and measures (`Distance distance`). The book will keep using the first style for most of the Explorer, because it is simple and you already know it. You will use measures **at the boundaries**, where a library asks for them. The SysId logger is the first one: its `voltage` method only accepts a `Voltage`, so nobody can ever log meters as volts by accident. In Chapter 17 and on the roboRIO, more libraries will ask for measures, and many teams use them everywhere. Both styles share one goal: a number should never travel without its unit.

---

## 16.5 Recording the Tests

Now build the experiment. The Explorer needs to do three things:

1. **Drive both sides at an exact voltage**, chosen by the test, with no PID and no kinematics in the way.
2. **Log each side's voltage, position, and speed** every loop while a test runs.
3. **Log which test is running**, so SysId can tell the four tests apart.

The first two belong in `Drivetrain`, which owns the motors and encoders. The third belongs in `Robot`, which decides when to run a test. You will add the full feedforward to `Drivetrain` in Section 16.8. For now, add only the new pieces below, and leave `speedToPower` alone: you want to see the old guess fail before you replace it.

### `Drivetrain`: driving by voltage

Add this constant to `Drivetrain`, below `MAX_WHEEL_SPEED_METERS_PER_SECOND`:

```java
// The XRP cannot measure its batteries, so "volts" in this class means power times
// this number. Four fresh AA cells give about 6 volts. Logging and driving both use
// the same number, so it cancels out (Section 16.2).
private static final double NOMINAL_BATTERY_VOLTS = 6.0;
```

Then two fields, after the `odometry` field. They remember the last voltage sent to each side, because the logger needs to know it:

```java
// The volts most recently sent to each side by setVolts(), for the SysId log.
private double leftVolts = 0.0;
private double rightVolts = 0.0;
```

Now the method that drives by voltage. Put it after `stop()`, under a new comment line `// Driving by voltage`:

```java
/**
 * Drive each side at a voltage. Volts become power by dividing by the
 * nominal battery voltage, so the result is limited to the battery's range.
 *
 * @param leftVolts the left side's voltage; positive drives forward
 * @param rightVolts the right side's voltage; positive drives forward
 */
public void setVolts(double leftVolts, double rightVolts) {
    this.leftVolts = MathUtil.clamp(leftVolts, -NOMINAL_BATTERY_VOLTS, NOMINAL_BATTERY_VOLTS);
    this.rightVolts = MathUtil.clamp(rightVolts, -NOMINAL_BATTERY_VOLTS, NOMINAL_BATTERY_VOLTS);
    diffDrive.tankDrive(
        this.leftVolts / NOMINAL_BATTERY_VOLTS,
        this.rightVolts / NOMINAL_BATTERY_VOLTS,
        false);
}
```

The parameters have the same names as the fields, so `this.leftVolts` means the field and plain `leftVolts` means the parameter (Chapter 7). The method clamps first, because the battery cannot give more than it has, then stores the clamped value, so the log records what the motors really got. `tankDrive(..., false)` sends each side its power with no squaring, exactly as `drive()` already does.

Change `stop()` to use it, so a stop also clears the remembered volts:

```java
/** Stop both motors. */
public void stop() {
    setVolts(0.0, 0.0);
}
```

And add `MathUtil` to the imports: `import edu.wpi.first.math.MathUtil;`.

> **Why remember the volts instead of asking the motor?**
>
> WPILib's own SysId example asks each motor what it was last told, with `motor.get()`, and multiplies by the battery voltage. On the XRP, that trips over two things. The XRP cannot measure its battery (Section 16.2). And `XRPMotor.get()` on an **inverted** motor returns the value **after** inversion, so the right motor would report a negative power while driving forward. Remembering exactly what you sent, in one place, avoids both. It is the same "one source of truth" idea as `getRotation2d()` in Chapter 14.

### `Drivetrain`: logging for SysId

WPILib's class for recording SysId data is `SysIdRoutineLog`. It writes into the same `.wpilog` flight recorder you started with `DataLogManager` in Chapter 10, so there is nothing new to set up. You give it one **motor** at a time, and for each one, its voltage, position, and velocity, as measures:

```java
/**
 * Record one loop of SysId data for each side: the volts sent, the distance,
 * and the speed. Call it every loop while a SysId test is running.
 *
 * @param log the log for this SysId routine
 */
public void logSysId(SysIdRoutineLog log) {
    log.motor("left")
        .voltage(Volts.of(leftVolts))
        .linearPosition(Meters.of(getLeftDistanceMeters()))
        .linearVelocity(MetersPerSecond.of(getLeftSpeedMetersPerSecond()));
    log.motor("right")
        .voltage(Volts.of(rightVolts))
        .linearPosition(Meters.of(getRightDistanceMeters()))
        .linearVelocity(MetersPerSecond.of(getRightSpeedMetersPerSecond()));
}
```

Put it after `getChassisSpeeds()`, under a comment line `// System identification`. It needs one regular import and three static ones, which go **above** the regular imports at the top of the file:

```java
import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.Volts;

import edu.wpi.first.math.MathUtil;
// ... the rest of your imports ...
import edu.wpi.first.wpilibj.sysid.SysIdRoutineLog;
```

Read the left block aloud: "For the motor named left, log a voltage of `leftVolts` volts, a position of the left distance in meters, and a velocity of the left speed in meters per second." Each method returns the same motor log back, so the calls chain together, just like `pose.getRotation().getDegrees()` in Chapter 14.

Notice that each method only accepts the right kind of measure. `voltage` takes a `Voltage`, `linearPosition` takes a `Distance`, `linearVelocity` takes a `LinearVelocity`. If you swap two of them, the code does not compile. With twelve numbers flying into a log every loop, that is exactly the protection you want.

Each side gets logged as its own "motor" with its own entries. In the log file, the entries are named after the data, the motor, and the routine, like `voltage-left-drive` and `velocity-right-drive`. You will look for those names in SysId.

> **Objects are fine to create every loop**
>
> `logSysId` creates six new measure objects every 20 milliseconds. Chapter 13 drew the line: "create once" is for **hardware**, where a second object would fight the first for the same port. Small data objects like `ChassisSpeeds`, `Pose2d`, and measures are cheap, and creating them each loop is normal. (WPILib's own example goes further and reuses "mutable" measures to save even that small cost. On a laptop running an XRP, it does not matter.)

### `Robot`: four tests on the D-pad

Now `Robot.java` needs a way to start and stop each test. It goes in **Test** mode, next to the Chapter 15 tuning bench, on the one part of the controller the bench does not use yet: the **D-pad** (the plus-shaped pad on the left).

| Hold | Test | Voltage |
|---|---|---|
| D-pad **up** | Quasistatic forward | Ramps up from 0 by 0.5 volts per second |
| D-pad **down** | Quasistatic reverse | Ramps down from 0 by 0.5 volts per second |
| D-pad **right** | Dynamic forward | Jumps to 4 volts |
| D-pad **left** | Dynamic reverse | Jumps to minus 4 volts |

Up and down are the slow tests, forward and back. Right and left are the fast ones (think of a number line: right is positive). A test runs only while you **hold** its direction. Let go and the robot stops. Your thumb is the first safety net, and WPILib's own documentation recommends exactly this: tests you have to hold down, so you can stop one instantly if the robot heads somewhere it should not.

There are two more safety nets in the code. No test may run longer than 8 seconds, or drive farther than 0.75 meters. If either happens, the test stops, and it stays stopped until you let go of the D-pad.

Why 0.5 volts per second and 4 volts? They are chosen to fit a desk robot on a small floor. At 0.5 volts per second, the example XRP from Section 16.2 starts creeping after about 2 seconds and reaches about 0.17 m/s at 8 seconds, having covered about half a meter. A 4 volt step reaches the same speed almost immediately, so a 2 or 3 second dynamic test covers about the same half meter. (A full-size FRC robot uses WPILib's defaults, 1 volt per second and 7 volts, and needs 3 to 6 meters of carpet.)

#### Which test? An enum you did not write

`SysIdRoutineLog` gives names to the four tests, plus "no test," in a type called `SysIdRoutineLog.State`:

```java
State.kQuasistaticForward
State.kQuasistaticReverse
State.kDynamicForward
State.kDynamicReverse
State.kNone
```

`State` is an **enum**, short for enumeration: a type with a fixed list of named values, and nothing else. A `State` variable can hold exactly one of those five, never a typo, never a sixth. In Chapter 12 you named your autonomous steps with `static final int` constants, and promised enums for later. This is a preview of why. Chapter 21 teaches you to write your own; for now, you only use WPILib's. Three things to know:

- You compare enum values with `==`, just like `int`s: `if (sysIdTest == State.kNone)`.
- `State` lives **inside** `SysIdRoutineLog`, so its full name is `SysIdRoutineLog.State`. Importing `edu.wpi.first.wpilibj.sysid.SysIdRoutineLog.State` lets you write just `State`.
- Printing one gives the name SysId expects in the log: `State.kQuasistaticForward` prints as `quasistatic-forward`.

#### The constants and fields

Add two imports to `Robot.java`:

```java
import edu.wpi.first.wpilibj.sysid.SysIdRoutineLog;
import edu.wpi.first.wpilibj.sysid.SysIdRoutineLog.State;
```

Replace the tuning bench constant with this group (the cruise speed is for Section 16.6):

```java
// Tuning bench (Test mode): how far the X button drives out, and how fast
// the left bumper cruises with feedforward alone (no PID).
private static final double BENCH_DRIVE_DISTANCE_METERS = 0.30;
private static final double BENCH_CRUISE_METERS_PER_SECOND = 0.10;

// SysId tests (Test mode, D-pad), in the drivetrain's volts.
private static final double SYSID_RAMP_VOLTS_PER_SECOND = 0.5;   // quasistatic: a slow ramp
private static final double SYSID_STEP_VOLTS = 4.0;              // dynamic: a sudden step
private static final double SYSID_TIMEOUT_SECONDS = 8.0;         // safety net: time
private static final double SYSID_MAX_DISTANCE_METERS = 0.75;    // safety net: distance
```

Add these fields after the two PID controllers:

```java
// SysId: one log for the whole routine, named "drive" in the log file.
private final SysIdRoutineLog sysIdLog = new SysIdRoutineLog("drive");
private final Timer sysIdTimer = new Timer();   // times the current SysId test
```

And these at the end of the "Remembered from loop to loop" group:

```java
private State sysIdTest = State.kNone;   // the SysId test running now, or kNone
private double sysIdStartDistanceMeters = 0.0;
private boolean sysIdWaitingForRelease = false;
```

Ask the Chapter 15 question about each one: does it need to survive until the next loop? The running test, where it started, and whether we are waiting for the D-pad to be let go all do, so they are fields. `sysIdLog` and `sysIdTimer` are objects with memory, created once, like the PID controllers.

At the end of `updateDashboard()`, add a widget, because every new behavior gets one:

```java
// SysId
SmartDashboard.putString("SysId Test", sysIdTest.toString());
```

And at the end of `disabledInit()`, end any test that was running when you disabled the robot, so the log records a clean finish:

```java
// If a SysId test was running, end it properly.
changeSysIdTest(State.kNone);
```

#### The Test mode code

Here is the whole Test mode section of `Robot.java`, from the comment above `testInit()` to the end of the class. It replaces the Chapter 15 version. `testInit()` and `setBenchTarget()` are unchanged except for one log message; `testPeriodic()` has two new blocks; everything below `// SysId` is new. Type it, do not paste:

```java
// Test mode: the PID tuning bench (Section 15.9) and the SysId tests (Section 16.5).

@Override
public void testInit() {
    SmartDashboard.putString("Mode", "Test");
    DataLogManager.log("Mode: Test (tuning bench and SysId)");
    drivetrain.resetPose(START_POSE);
    setBenchTarget(0.0, LEG_1_HEADING_DEGREES);
}

@Override
public void testPeriodic() {
    // The D-pad runs a SysId test. While one runs, nothing else may drive.
    if (updateSysIdTest()) {
        return;
    }

    // A: home. B: turn left to 90. X: drive out. (Y still resets the pose.)
    if (controller.getAButtonPressed()) {
        setBenchTarget(0.0, LEG_1_HEADING_DEGREES);
    }
    if (controller.getBButtonPressed()) {
        setBenchTarget(0.0, TURN_HEADING_DEGREES);
    }
    if (controller.getXButtonPressed()) {
        setBenchTarget(BENCH_DRIVE_DISTANCE_METERS, LEG_1_HEADING_DEGREES);
    }

    // Left bumper (hold): cruise forward on feedforward alone, no PID.
    if (controller.getLeftBumperButton()) {
        drivetrain.drive(BENCH_CRUISE_METERS_PER_SECOND, 0.0);
        return;
    }
    if (controller.getLeftBumperButtonReleased()) {
        setBenchTarget(drivetrain.getAverageDistanceMeters(), benchTargetHeadingDegrees);
    }

    // Both controllers run all the time, holding whatever target the buttons chose.
    drivetrain.drive(
        calculateForwardSpeed(drivetrain.getAverageDistanceMeters(), benchTargetDistanceMeters),
        calculateTurnRate(benchTargetHeadingDegrees));
}

/**
 * Give the tuning bench a new target, and clear both controllers' memory.
 *
 * @param distanceMeters where to drive to, measured from the last pose reset
 * @param headingDegrees the heading to face; counterclockwise positive
 */
private void setBenchTarget(double distanceMeters, double headingDegrees) {
    benchTargetDistanceMeters = distanceMeters;
    benchTargetHeadingDegrees = headingDegrees;
    distanceController.reset();
    headingController.reset();
    DataLogManager.log("Bench target: " + distanceMeters + " m, " + headingDegrees + " deg");
}

// SysId (Section 16.5)

/**
 * Run a SysId test for as long as a D-pad direction is held, with two safety nets.
 *
 * @return true if a test is driving the robot this loop
 */
private boolean updateSysIdTest() {
    State requested = getSysIdTestFromDpad();

    // After a safety stop, ignore the D-pad until it is let go.
    if (requested == State.kNone) {
        sysIdWaitingForRelease = false;
    }
    if (sysIdWaitingForRelease) {
        requested = State.kNone;
    }

    // Safety nets: no test may run too long or drive too far.
    if (sysIdTest != State.kNone
            && (sysIdTimer.hasElapsed(SYSID_TIMEOUT_SECONDS)
                || Math.abs(getSysIdDistanceMeters()) >= SYSID_MAX_DISTANCE_METERS)) {
        DataLogManager.log("SysId " + sysIdTest + " stopped by a safety net");
        sysIdWaitingForRelease = true;
        requested = State.kNone;
    }

    changeSysIdTest(requested);
    if (sysIdTest == State.kNone) {
        return false;
    }

    // Drive both sides at the test's volts, then record what happened.
    double volts = getSysIdVolts();
    drivetrain.setVolts(volts, volts);
    drivetrain.logSysId(sysIdLog);
    sysIdLog.recordState(sysIdTest);
    return true;
}

/**
 * Which SysId test the D-pad asks for. Up and down are the slow (quasistatic)
 * tests; right and left are the fast (dynamic) ones.
 *
 * @return the requested test, or {@code State.kNone} if no direction is held
 */
private State getSysIdTestFromDpad() {
    switch (controller.getPOV()) {
        case 0:
            return State.kQuasistaticForward;
        case 180:
            return State.kQuasistaticReverse;
        case 90:
            return State.kDynamicForward;
        case 270:
            return State.kDynamicReverse;
        default:
            return State.kNone;
    }
}

/**
 * Switch to a different SysId test (or to none). Ends the old test cleanly and
 * starts the new one's timer and distance.
 *
 * @param newTest the test to run, or {@code State.kNone} to stop
 */
private void changeSysIdTest(State newTest) {
    if (newTest == sysIdTest) {
        return;   // nothing changed
    }
    if (sysIdTest != State.kNone) {
        // The old test is over: stop, mark the end in the log, and hold still here.
        drivetrain.stop();
        sysIdLog.recordState(State.kNone);
        DataLogManager.log("SysId " + sysIdTest + " ended after " + sysIdTimer.get()
            + " s and " + getSysIdDistanceMeters() + " m");
        setBenchTarget(drivetrain.getAverageDistanceMeters(), benchTargetHeadingDegrees);
    }
    if (newTest != State.kNone) {
        sysIdTimer.restart();
        sysIdStartDistanceMeters = drivetrain.getAverageDistanceMeters();
        DataLogManager.log("SysId " + newTest + " started");
    }
    sysIdTest = newTest;
}

/**
 * The volts the current SysId test asks for right now.
 *
 * @return volts for both sides; negative for the reverse tests
 */
private double getSysIdVolts() {
    double volts;
    if (sysIdTest == State.kQuasistaticForward || sysIdTest == State.kQuasistaticReverse) {
        volts = SYSID_RAMP_VOLTS_PER_SECOND * sysIdTimer.get();   // climbs slowly
    } else {
        volts = SYSID_STEP_VOLTS;                                  // jumps at once
    }
    boolean reverse = sysIdTest == State.kQuasistaticReverse || sysIdTest == State.kDynamicReverse;
    return reverse ? -volts : volts;
}

/** How far the robot has driven since the current SysId test started, in meters. */
private double getSysIdDistanceMeters() {
    return drivetrain.getAverageDistanceMeters() - sysIdStartDistanceMeters;
}
```

Walk through it from the top:

- **`testPeriodic()`** asks `updateSysIdTest()` first. If a test is driving, it returns right away, so the PID bench never fights a test for the motors. Otherwise the bench runs as in Chapter 15, with one addition: holding the **left bumper** cruises forward at `BENCH_CRUISE_METERS_PER_SECOND` through `drive()`, with no PID. Letting go makes the bench hold the robot where it stopped, instead of driving it back to an old target. You will use the cruise in Section 16.6.
- **`updateSysIdTest()`** runs every loop in Test mode. It reads which test the D-pad wants, applies the two safety nets, switches tests if the request changed, and, if a test is running, drives both sides at the test's voltage, logs the drivetrain, and logs the test's name. It returns `true` while a test is driving. The order matters: drive, then log what you just sent, then log which test it was. That is the same order WPILib's own SysId code uses.
- **`sysIdWaitingForRelease`** is the latch behind "stays stopped until you let go." Without it, a test stopped by the timeout would start again on the very next loop, because your thumb is still on the D-pad. This is Chapter 10's "did it just change?" pattern with a remembered `boolean`, used to remember a different fact.
- **`getSysIdTestFromDpad()`** turns the D-pad into a `State`. `controller.getPOV()` returns the direction you are pressing as an angle in degrees, clockwise from up: `0` up, `90` right, `180` down, `270` left, and `-1` when nothing is pressed. (Diagonals like `45` fall through to `default`.) Notice that each `case` ends with `return` instead of `break`. A `return` leaves the whole method, so there is nothing to fall through to. That is often the neatest way to write a `switch` whose only job is to choose a value.
- **`changeSysIdTest()`** is the only place the running test changes, so the bookkeeping cannot be forgotten. Ending a test stops the motors, writes `kNone` to the log (SysId uses it to see where one run ends), and tells the bench to hold this spot. Starting a test restarts the timer and remembers the starting distance. If the new test is the same as the old one, it does nothing at all.
- **`getSysIdVolts()`** is the experiment itself. Quasistatic: ramp rate times seconds. Dynamic: the step. Reverse tests flip the sign.
- **The tests call `setVolts`, not `drive`.** That is deliberate. A test must push the motors with a known voltage, straight through, with no kinematics, no desaturation, and especially no feedforward: you cannot measure the model while the model is steering.

> **One routine, one log file**
>
> SysId can analyze only one file at a time, and it expects all four tests in it. Each time you start your program, `DataLogManager` begins a **new** log file. So run all four tests in **one** run of your program. If you have to restart partway through (a crash, a dead battery), start over and run all four again. And never mix motions in one routine: if you ever characterize turning (Practice 4), do it in a separate run, so it lands in a separate file.

---

## 16.6 Running the Tests

Build, and fix anything the compiler finds. Then get ready.

### Before you start

- **Fresh batteries.** Section 16.2 explained why: the model you measure is only true for the batteries you measure it with.
- **The right floor.** Run the tests on the floor where you run the course. A model measured on a smooth desk will be wrong on carpet, because kS is mostly the floor's friction.
- **Space.** Put the robot at one end of a clear, straight stretch about a meter and a half long, pointing down it. The forward tests drive about half a meter forward, and the reverse tests bring it back. Leave room behind it, too, in case a reverse test runs longer than its forward partner.
- **Controller.** Set up as in Chapter 8: in the Simulation GUI, in Joysticks slot 0, with **Map gamepad** checked.

### Check the old guess first

Before you change the model, measure how wrong the old one is. This is your "before" picture.

1. Run the program and choose **Test** in the Simulation GUI's **Robot State** panel. The robot holds still: that is the tuning bench holding its home target.
2. Hold the **left bumper**. The robot cruises forward, asking `drive()` for 0.10 m/s, with no PID to help. Watch `Measured Forward (m per s)` once the robot has been moving for a second, then let go.
3. Press **A** to bring it home. Do it three times, and write down the steady measured speed each time.

With the old `speedToPower`, you will probably see something well under 0.10, perhaps around 0.07. That is the Section 16.2 picture, live: the old line starts at zero, the real one starts at kS.

### Run the four tests

Still in Test mode, in the **same** run of the program:

1. **Quasistatic forward.** Hold **D-pad up**. For a second or two, nothing seems to happen. That is the voltage climbing toward kS. Then the robot starts to creep, and slowly speeds up. Keep holding until it has driven about half a meter, or until it stops by itself (a safety net). Let go. Watch `SysId Test` change from `quasistatic-forward` back to `none`.
2. **Quasistatic reverse.** Wait until the robot is completely still, then hold **D-pad down** the same way. It backs up toward where it started.
3. **Dynamic forward.** Hold **D-pad right**. The robot leaps forward. Let go after 2 or 3 seconds, before it runs out of room.
4. **Dynamic reverse.** Hold **D-pad left**, 2 or 3 seconds, and let go.

The terminal shows each test's start and end:

```
Mode: Test (tuning bench and SysId)
Bench target: 0.0 m, 0.0 deg
SysId quasistatic-forward started
SysId quasistatic-forward ended after 7.42 s and 0.48 m
Bench target: 0.4791 m, 0.0 deg
SysId quasistatic-reverse started
SysId quasistatic-reverse ended after 7.51 s and -0.47 m
Bench target: 0.0123 m, 0.0 deg
SysId dynamic-forward started
SysId dynamic-forward ended after 2.63 s and 0.42 m
Bench target: 0.4341 m, 0.0 deg
SysId dynamic-reverse started
SysId dynamic-reverse ended after 2.71 s and -0.43 m
Bench target: 0.0062 m, 0.0 deg
```

(Your numbers will differ. Java will print more decimal places than shown here.) Then **disable** the robot and **stop** the program, so the log file is closed and complete.

> **Start each test from a standstill**
>
> Every test should start with the robot completely still, and if possible, from the same spot. A quasistatic test that starts while the robot is still rolling from the last one will make the robot look like it needs no voltage to move, and kS will come out too small. Count to two between tests.

Diagnose anything strange:

- **Nothing happens when you hold the D-pad:** check the Simulation GUI's Joysticks window. When you press the D-pad, a **POV** value should change from `-1` to `0`, `90`, `180`, or `270`. If it does not, the gamepad is not mapped; check **Map gamepad**. Also make sure the robot is **enabled** in **Test**.
- **The quasistatic test stops by itself after 8 seconds and the robot never moved:** your robot needs more than 4 volts to move (kS is big, or the batteries are tired). Fresh batteries first. If it still does not move, raise `SYSID_TIMEOUT_SECONDS` to 12.
- **The robot spins or curves sharply during a test:** a little curving is normal (it is exactly the motor mismatch SysId is about to measure). A sharp curve means one side is not driving; check that both `Left Speed` and `Right Speed` change during the test.
- **The test keeps running after you let go:** the `return` at the top of `testPeriodic()` or the `getSysIdTestFromDpad()` mapping has a typo. Disable the robot first, then check.
- **`SysId Test` never changes from `none`:** `updateSysIdTest()` is not being called, or `changeSysIdTest()` never assigns `sysIdTest = newTest`.

### Find the log file

Your log is in the `logs` folder inside your project, exactly where Chapter 10's logs went: the newest file whose name starts with `FRC_` and ends in `.wpilog`. Remember Chapter 10's warning: `logs/` is in `.gitignore`, so this file is not saved by Git. You will keep a copy on purpose in the Git exercise.

---

## 16.7 Analyzing the Data in SysId

Open SysId from VS Code: `WPILib: Start Tool` > `SysId`. It opens with several panes: **Log Loader**, **Data Selector**, **Analyzer**, and a **Program Log** at the bottom.

### Step 1: Load the log

In the **Log Loader** pane, click **Open data log file...** and choose your newest `FRC_...wpilog` from the project's `logs` folder. The pane fills with a list of every entry in the log. It is a long list: `DataLogManager` records every dashboard value too (those start with `NT:`). You are looking for five or so entries with **no** `NT:` in front:

```
sysid-test-state-drive
voltage-left-drive          voltage-right-drive
position-left-drive         position-right-drive
velocity-left-drive         velocity-right-drive
```

Each name is the data, then the motor name from `logSysId` (`left`, `right`), then the routine name you gave `new SysIdRoutineLog("drive")`.

### Step 2: Tell SysId which entries are which

1. Drag **`sysid-test-state-drive`** from the Log Loader into the **Test State** slot in the Data Selector. SysId reads the test names and should report all four tests. If it lists one as missing, that test is not in this file; you will have to run all four again.
2. Set **Analysis Type** to **Simple**. "Simple" is the plain kS, kV, kA model from Section 16.2. (The others, Elevator and Arm, add a gravity term, which you will need in Chapter 34.)
3. Drag **`velocity-left-drive`** into **Velocity**, **`position-left-drive`** into **Position**, and **`voltage-left-drive`** into **Voltage**.
4. Set **Units** to **Meters**. Leave both scaling boxes at `1`: your positions and speeds are already in meters, because `setDistancePerPulse` did the conversion back in Chapter 9.
5. Click **Load**.

### Step 3: Read the gains

The **Analyzer** pane shows a **Feedforward Analysis** section with three numbers: **Ks**, **Kv**, and **Ka**. Those are your left side's gains. Write them down. (Hover over each one for SysId's description of it.) With Units set to Meters, Ks is in volts, Kv in volts per meter per second, and Ka in volts per meter per second squared. (They are in pretend volts, which is exactly what your code will feed them back.)

Here is what one XRP's left side looked like, as an example only:

| Gain | Example (left side) | What it says |
|---|---|---|
| Ks | 0.95 | It takes about 0.95 volts, about 16% power, just to get this side moving |
| Kv | 18.0 | Every extra 0.1 m/s of cruise speed needs another 1.8 volts |
| Ka | 1.1 | Speeding up at 0.5 m/s per second needs another 0.55 volts while it lasts |

### Step 4: Check the fit

A number from a bad fit is worse than no number, because you will trust it. SysId shows you how good the fit is.

Open the **Diagnostic Plots** window. The **time domain** plots show the measured velocity during the tests, and SysId's **simulation**: what a robot with exactly your fitted kS, kV, and kA would have done with the same voltages. Use the **Direction** box to see both **Forward** and **Backward**.

- **Quasistatic plots** should look like a nearly straight ramp. The simulated line should lie on top of the measured one.
- **Dynamic plots** should rise fast and then level off, curving like the sketch in Section 16.3. On the XRP, that rise lasts only a few loops, so it may look like a step with a tiny curve on top.

Then look at the numbers above the plots:

| Metric | What it measures | What to hope for |
|---|---|---|
| **Sim velocity R²** | How well the model's simulated speed matches the real speed (1.0 is perfect) | Above 0.9 means a good fit |
| **Sim velocity RMSE** | The typical size of the model's speed error, in meters per second | Small compared to the speeds you drove |
| **Acceleration R²** | How well the model explains the measured acceleration | Often low; WPILib's docs say it rarely goes above 0.5, even on very good data |

> **Why kA is the shakiest number**
>
> The XRP is very light for its motors, so it reaches its speed in a small fraction of a second. At 50 measurements a second, that is only a handful of data points, and each one is noisy (a speed is a difference of two encoder readings, Chapter 15's warning about D). WPILib's documentation says it plainly: when a mechanism is light compared to its motor power, kA tends toward zero and can be ignored for feedforward. That is true on the XRP. Keep the number SysId gives you, but do not be surprised if it changes a lot from one set of tests to the next, or if SysId marks it with a warning. Ks and Kv are the ones that matter for this chapter.

### Step 5: The right side

Drag **`velocity-right-drive`**, **`position-right-drive`**, and **`voltage-right-drive`** into the three slots in place of the left ones, and click **Load** again. Check the fit the same way, and write down the right side's Ks, Kv, and Ka.

Compare the two sides. They will not match exactly. If your robot curved slightly left in Chapter 14, look at the numbers: the **left** side probably needs a little more voltage for the same speed (a bigger Ks or Kv). That curve was never a mystery. It was two motors with two different models, being sent the same power.

### When the fit looks wrong

| What you see | Likely cause | What to try |
|---|---|---|
| SysId says no tests found, or some missing | The tests are split across log files, or a test was too short | Run all four again in one program run |
| Quasistatic plot has a flat "tail" at the start before the ramp | Data from before the robot moved is being included | Raise **Velocity Threshold** in the Analyzer a little, then look again |
| Big gap in the acceleration vs velocity plot | Velocity Threshold too high | Lower it a little |
| Ks is negative, or Kv is far from Chapter 13's estimate (6 divided by your top speed) | Wrong entries in the slots (for example, position in the Velocity slot), or units left on something other than Meters | Check every slot and the Units box |
| Forward and backward plots look very different | Something rubbed or slipped one way; a tilted floor | Check the wheels and the floor; rerun |
| Sim velocity R² well below 0.9 | Noisy, bumpy, or interrupted tests | Smoother floor, fresh batteries, start every test from a standstill |

> **The Feedback Analysis section**
>
> Below the feedforward gains, SysId also offers **Feedback Analysis**: suggested PID gains, calculated from your model. Skip it for now. SysId's gains assume the PID output is in **volts**, and the Explorer's controllers output **speeds** (meters per second and radians per second), which `drive()` then turns into volts. Different units, so the numbers would not mean what SysId thinks. In Chapter 32, you will build a velocity controller that does output volts, and SysId's suggestions will be a great starting point there.

---

## 16.8 Feedforward in the Drivetrain

You have the numbers. Now put them to work where the guess used to be.

### `SimpleMotorFeedforward`

WPILib's class for the kS, kV, kA model is `SimpleMotorFeedforward`, in `edu.wpi.first.math.controller`, right next to `PIDController`. You create one with your three gains:

```java
SimpleMotorFeedforward feedforward = new SimpleMotorFeedforward(0.95, 18.0, 1.1);
```

and ask it for the volts a velocity needs:

```java
double volts = feedforward.calculate(0.10);   // 0.95 + 18.0 × 0.10 = 2.75
```

That is the Section 16.2 equation, with the acceleration taken as zero. `calculate(velocity)` is for holding a speed, which is what `drive()` asks for. The model also knows a few handy things about your robot, like its predicted top speed: `feedforward.maxAchievableVelocity(6.0, 0.0)` gives `(6.0 - kS) ÷ kV`, the fastest speed that 6 volts can hold.

Unlike a `PIDController`, a feedforward has **no memory**. It does not remember the last loop's error or add anything up. Give it the same speed twice and it gives the same volts twice. So why make it an object at all? Because it bundles the three gains that belong together, and because the class does the math correctly in every direction (that `sign(velocity)` part is easy to forget by hand). Still, you need one **per side**, because each side has its own gains.

> **Older code you might see**
>
> In code written before 2025, you will often see `feedforward.calculate(velocity, acceleration)` with two arguments. That version is **deprecated** in WPILib 2026 and marked for removal. For a speed that changes over time, the replacement is `calculateWithVelocities(currentVelocity, nextVelocity)`, which works out the acceleration term from where the speed is now and where it should be next loop. The Explorer does not plan its speeds ahead of time yet, so it uses one-argument `calculate`. You will need the acceleration term when your speeds come from a motion profile (Chapter 34) or a path (Chapter 31).

### Replacing the guess

In `drive()`, the old last step was:

```java
diffDrive.tankDrive(
    speedToPower(wheelSpeeds.leftMetersPerSecond),
    speedToPower(wheelSpeeds.rightMetersPerSecond),
    false);
```

The new one asks each side's feedforward for volts and sends them through `setVolts`:

```java
// Feedforward: wheel speeds in, volts out, one model per side.
setVolts(
    calculateVolts(leftFeedforward, wheelSpeeds.leftMetersPerSecond),
    calculateVolts(rightFeedforward, wheelSpeeds.rightMetersPerSecond));
```

`speedToPower` is gone. In its place is a small helper:

```java
private double calculateVolts(SimpleMotorFeedforward feedforward, double metersPerSecond) {
    if (Math.abs(metersPerSecond) < STOPPED_SPEED_METERS_PER_SECOND) {
        return 0.0;   // asked to stop (or nearly): do not shove against friction
    }
    return feedforward.calculate(metersPerSecond);
}
```

It takes the feedforward as a **parameter** (an object as a parameter, Chapter 13), so the same helper serves both sides. And it has one guard you have not seen before.

### The kS buzz

Think about what kS does near zero. Ask for +0.001 m/s and the feedforward sends almost a full volt forward: `0.95 + 18.0 × 0.001 = 0.97`. Ask for -0.001 m/s and it sends almost a full volt **backward**. A tiny change in the request flips the push from one direction to the other.

Now picture the tuning bench holding the robot at its target. The PID controllers' outputs hover around zero, a hair positive, then a hair negative. Without a guard, the feedforward would slam almost a volt forward, then almost a volt back, many times a second. The robot would buzz and twitch in place.

The guard says: if a wheel is asked for less than `STOPPED_SPEED_METERS_PER_SECOND` (5 millimeters per second), that is a request to stop, so send nothing. It is a **deadband**, the same idea as `applyDeadband` on the sticks in Chapter 8, applied to a speed instead of a joystick.

> **Feedforward meets feedback near zero**
>
> Near a target, the PID output is small and changes sign as the robot crosses the setpoint. That is exactly where kS is at its most aggressive. Every team that adds kS to a position controller meets this. The usual fixes are the ones you have: a small deadband on the request, a PID tolerance so the job ends once it is "close enough," and not too much `kP`. If your robot still buzzes at a bench target, raise `STOPPED_SPEED_METERS_PER_SECOND` a little, or lower `kP` a little.

### The new `Drivetrain.java`

Here is the complete `Drivetrain` after this chapter, starting from the end of Chapter 14. The changes are:

- three static imports and two regular imports (`MathUtil`, `SimpleMotorFeedforward`, `SysIdRoutineLog`);
- the `NOMINAL_BATTERY_VOLTS` constant, six gain constants, and `STOPPED_SPEED_METERS_PER_SECOND`;
- two feedforward fields and the two remembered-volts fields;
- `stop()` now uses `setVolts`;
- a new **Driving by voltage** section with `setVolts`;
- `drive()` uses feedforward, `calculateVolts` replaces `speedToPower`;
- a new **System identification** section with `logSysId`.

**Put your own gains in the six constants**, from your SysId results, with the date. The listing's values are the example from Section 16.7, from one XRP; they have not been tested on yours.

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
import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj.sysid.SysIdRoutineLog;
import edu.wpi.first.wpilibj.xrp.XRPGyro;
import edu.wpi.first.wpilibj.xrp.XRPMotor;

public class Drivetrain {

    // Physical facts about the XRP drivetrain.
    private static final double WHEEL_DIAMETER_METERS = 0.060;
    private static final double COUNTS_PER_WHEEL_REV = 585.0;   // 12 counts x 48.75:1
    private static final double METERS_PER_COUNT =
        Math.PI * WHEEL_DIAMETER_METERS / COUNTS_PER_WHEEL_REV;
    private static final double TRACKWIDTH_METERS = 0.155;      // wheel center to wheel center

    // Measured at full power on our floor (Section 13.8). Re-measure with new batteries.
    private static final double MAX_WHEEL_SPEED_METERS_PER_SECOND = 0.28;

    // The XRP cannot measure its batteries, so "volts" in this class means power times
    // this number. Four fresh AA cells give about 6 volts. Logging and driving both use
    // the same number, so it cancels out (Section 16.2).
    private static final double NOMINAL_BATTERY_VOLTS = 6.0;

    // Feedforward gains from SysId (Section 16.7). EXAMPLE VALUES: replace them with
    // your own robot's, and write the date you measured them.
    private static final double LEFT_KS_VOLTS = 0.95;
    private static final double LEFT_KV_VOLT_SECONDS_PER_METER = 18.0;
    private static final double LEFT_KA_VOLT_SECONDS_SQUARED_PER_METER = 1.1;
    private static final double RIGHT_KS_VOLTS = 0.85;
    private static final double RIGHT_KV_VOLT_SECONDS_PER_METER = 17.4;
    private static final double RIGHT_KA_VOLT_SECONDS_SQUARED_PER_METER = 0.9;

    // Asked for less than this, a wheel stops instead of pushing against friction.
    private static final double STOPPED_SPEED_METERS_PER_SECOND = 0.005;

    // Motors.
    private final XRPMotor leftMotor = new XRPMotor(0);
    private final XRPMotor rightMotor = new XRPMotor(1);
    private final DifferentialDrive diffDrive =
        new DifferentialDrive(leftMotor::set, rightMotor::set);

    // Sensors the drivetrain needs to drive accurately.
    private final Encoder leftEncoder = new Encoder(4, 5);
    private final Encoder rightEncoder = new Encoder(6, 7);
    private final XRPGyro gyro = new XRPGyro();

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
    // after the encoders know their distance per pulse.
    private final DifferentialDriveOdometry odometry;

    // The volts most recently sent to each side by setVolts(), for the SysId log.
    private double leftVolts = 0.0;
    private double rightVolts = 0.0;

    public Drivetrain() {
        rightMotor.setInverted(true);

        // From now on, getDistance() returns meters.
        leftEncoder.setDistancePerPulse(METERS_PER_COUNT);
        rightEncoder.setDistancePerPulse(METERS_PER_COUNT);
        resetEncoders();

        // Start counting from the sensors' current readings, at pose (0, 0), facing 0.
        odometry = new DifferentialDriveOdometry(
            getRotation2d(), getLeftDistanceMeters(), getRightDistanceMeters());
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
        diffDrive.arcadeDrive(forward, rotation, squareInputs);
    }

    /** Stop both motors. */
    public void stop() {
        setVolts(0.0, 0.0);
    }

    // Driving by voltage

    /**
     * Drive each side at a voltage. Volts become power by dividing by the
     * nominal battery voltage, so the result is limited to the battery's range.
     *
     * @param leftVolts the left side's voltage; positive drives forward
     * @param rightVolts the right side's voltage; positive drives forward
     */
    public void setVolts(double leftVolts, double rightVolts) {
        this.leftVolts = MathUtil.clamp(leftVolts, -NOMINAL_BATTERY_VOLTS, NOMINAL_BATTERY_VOLTS);
        this.rightVolts = MathUtil.clamp(rightVolts, -NOMINAL_BATTERY_VOLTS, NOMINAL_BATTERY_VOLTS);
        diffDrive.tankDrive(
            this.leftVolts / NOMINAL_BATTERY_VOLTS,
            this.rightVolts / NOMINAL_BATTERY_VOLTS,
            false);
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
     * The volts one side needs to hold a wheel speed, from that side's feedforward
     * model. Replaces Chapter 13's speedToPower guess.
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
            .voltage(Volts.of(leftVolts))
            .linearPosition(Meters.of(getLeftDistanceMeters()))
            .linearVelocity(MetersPerSecond.of(getLeftSpeedMetersPerSecond()));
        log.motor("right")
            .voltage(Volts.of(rightVolts))
            .linearPosition(Meters.of(getRightDistanceMeters()))
            .linearVelocity(MetersPerSecond.of(getRightSpeedMetersPerSecond()));
    }

    // Odometry

    /**
     * Update the robot's pose from the encoders and gyro. Call this once every loop,
     * in every mode, so the pose never misses a move.
     */
    public void updateOdometry() {
        odometry.update(getRotation2d(), getLeftDistanceMeters(), getRightDistanceMeters());
    }

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
     * to match, so the pose never jumps. This is the only way to reset the drivetrain's sensors.
     *
     * @param pose where the robot is right now, in field coordinates
     */
    public void resetPose(Pose2d pose) {
        resetEncoders();
        resetHeading();
        odometry.resetPosition(
            getRotation2d(), getLeftDistanceMeters(), getRightDistanceMeters(), pose);
    }

    // Encoders

    public int getLeftCount() {
        return leftEncoder.get();
    }

    public int getRightCount() {
        return rightEncoder.get();
    }

    public double getLeftDistanceMeters() {
        return leftEncoder.getDistance();
    }

    public double getRightDistanceMeters() {
        return rightEncoder.getDistance();
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
        return leftEncoder.getRate();
    }

    public double getRightSpeedMetersPerSecond() {
        return rightEncoder.getRate();
    }

    // Gyro

    /**
     * The robot's heading since the last reset.
     *
     * @return the heading in degrees; counterclockwise (turning left) is positive
     */
    public double getHeadingDegrees() {
        return gyro.getAngle();
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
        return gyro.getRate();
    }

    // Private: only resetPose() may reset the sensors, so the odometry always knows.

    private void resetEncoders() {
        leftEncoder.reset();
        rightEncoder.reset();
    }

    private void resetHeading() {
        gyro.reset();
    }
}
```

Walk through what changed since Section 16.5:

- **The gain constants** are named the way WPILib's own examples name them, with the units spelled out: kS in `VOLTS`, kV in `VOLT_SECONDS_PER_METER` (volts per meter per second is the same as volt seconds per meter), and kA in `VOLT_SECONDS_SQUARED_PER_METER`. Long names, but no one will ever wonder what units they are in.
- **`leftFeedforward` and `rightFeedforward`** are created once as fields, with each side's gains. They sit next to `kinematics` because they do the same kind of job: one more piece of math between "what motion do you want" and "what do the motors do."
- **`drive()`** now runs a three-stage pipeline: kinematics turns the robot's motion into wheel speeds, desaturation keeps them reachable, and feedforward turns each wheel speed into volts.
- **`calculateVolts()`** replaces `speedToPower`, with the stop deadband.
- **`MAX_WHEEL_SPEED_METERS_PER_SECOND`** is still used for desaturation. Practice 2 has you check it against what your gains predict.

And look at what did **not** change: `Robot.java`'s autonomous routine, the PID controllers, the helpers. Chapter 15 promised it: "In Chapter 16, the reverse will happen: feedforward will improve `drive()`'s speed-to-power step, and the PID code in `Robot.java` will not change." The split between **what** motion (Robot) and **how** to make it (Drivetrain) paid off again.

---

## 16.9 Feedforward Plus PID: Check, Retune, and Run

Build. Then check whether the model works, retune PID for its smaller job, and run the course.

### Check: does it drive the speed you ask for?

Run the program, enter **Test**, and repeat the cruise check from Section 16.6: hold the **left bumper**, watch `Measured Forward (m per s)`, let go, press **A**. Three times.

This time, with nothing but feedforward and no PID at all, the measured speed should sit close to 0.10. Not perfect: perhaps 0.095 or 0.105. But compare it with your "before" number. The robot now does what you ask **before** any sensor gets a vote. That is what the whole chapter was for.

Try it at another speed, too. Change `BENCH_CRUISE_METERS_PER_SECOND` to `0.05` (a speed the old guess was terrible at) and run the check again. Put it back to `0.10` when you are done.

### Retune: PID has a smaller job now

Your Chapter 15 gains were tuned for a robot whose model was wrong. Now that feedforward handles most of the work, especially the friction near zero that PID used to fight, those gains may be more than the robot needs.

Use the tuning bench and plots from Section 15.9, heading first:

1. **Try removing the I term.** Set **I** to `0` in the **Heading PID** widget. Press B and A a few times. With kS doing its share, many robots now finish their turns without any integral at all. If yours does, set `HEADING_KI = 0.0`.
2. **If turns still stop a few degrees short,** bring I back, smaller than before. Section 16.10 explains why turning in place may still need a little.
3. **Check P.** If the turn now overshoots or rings, back `kP` off a little: feedforward is adding push that P used to supply.
4. **Then the distance controller,** with X and A. It probably needs no changes.
5. **Write the new gains into the constants** with the date, as always.

### Run the course

Put the robot on the start line and run **Autonomous**, five times, recording the same numbers as in Chapter 15's Build: where leg 1 ended, where the turn ended, the final pose, the tape measure, and this time also the **step times** from the log.

Compare with your Chapter 15 table. You should see:

- **Accuracy about the same or better.** PID still decides when each step is done.
- **Faster steps.** PID no longer has to wait for an integral to build up before the robot moves its last centimeter. The last few millimeters of each leg, and the last few degrees of each turn, happen sooner. And when the routine asks for `AUTO_DRIVE_METERS_PER_SECOND = 0.20`, the robot actually goes 0.20, not 0.17.

That is Chapter 15's promise: accurate **and** quick.

> **What feedforward cannot see**
>
> Feedforward is a prediction from a model measured on one day, on one floor, with one set of batteries. It cannot see what changed since. When your batteries drain, the robot gets slower than the model predicts. On a different floor, kS is different. PID covers small changes like these, which is why you keep it. For big changes, run SysId again: it takes ten minutes, and the tool already knows how. Write the date next to your gains, and when the robot starts to feel different, compare today's SysId numbers with the ones in your Git history.

---

## 16.10 Feedforward Everywhere

You will build a feedforward, measure it, or tune one on nearly every mechanism for the rest of this book. A few things to know before you go.

### Turning is a different motion

Your SysId tests drove straight. When the XRP spins in place, its wheels scrub sideways across the floor (Chapter 13), and scrubbing adds friction that driving straight never sees. So the straight-line kS **underestimates** what a turn in place needs. That is why the heading controller may keep a little `kI` even with feedforward. You can measure the difference yourself in Practice 4, by running a quasistatic test that spins the robot instead of driving it. Full FRC drivetrains are sometimes characterized both ways, straight and spinning, for exactly this reason.

### Where you will see it next

- **Chapter 17, simulation.** A simulated robot needs a model of how voltage turns into motion. kV and kA are exactly that model, and they are what WPILib's drivetrain simulation is built from.
- **Chapters 18 to 20, commands.** WPILib's `SysIdRoutine` class does what your Test mode code does, as ready-made commands. Now that you have written the four tests yourself, you will know exactly what it is doing when you meet it.
- **Chapter 23, live tuning.** Feedforward gains can be published and adjusted live, like your PID gains.
- **Chapter 26, the roboRIO.** A real robot can measure its battery, and its motors can be given volts that stay volts as the battery sags. Pretend volts become real volts.
- **Chapter 31, path following.** PathPlanner plans a speed for every moment along a path, and feedforward turns each one into volts, with PID correcting the drift.
- **Chapter 32, SysId on the Mini Swerve.** The same four tests, on brushless motors with real voltages, through `SysIdRoutine`, and this time SysId's suggested PID gains will fit.
- **Chapter 34, mechanisms.** Arms and elevators add one more term, **kG**, the volts to hold the mechanism up against gravity. WPILib has `ArmFeedforward` and `ElevatorFeedforward` for those, and SysId's Arm and Elevator analysis types measure them.

Every one of them is the same idea as this chapter. Know your robot, in numbers. Predict what it needs. Let feedback clean up the rest.

---

## Chapter Summary

> **What you learned in Chapter 16**
>
> * **Feedback** (PID) reacts to an error after it happens; **feedforward** predicts the power a motion needs, before it happens, from a model of the robot. Good robot code uses both: feedforward does most of the work, feedback corrects the rest. Chapter 13's `speedToPower` was a feedforward with a missing piece.
> * A DC motor drive follows `volts = kS × sign(velocity) + kV × velocity + kA × acceleration`. **kS** overcomes friction, **kV** holds a speed against back-EMF, and **kA** speeds the robot up. At slow speeds, kS is most of the job, which is why the old guess and P-only control stalled there.
> * **System identification** measures the model: **quasistatic** tests ramp the voltage slowly (revealing kS and kV), **dynamic** tests step it suddenly (revealing kA), each forward and reverse, all in one log file. **SysId** fits the gains by least squares and shows how good the fit is.
> * New Java: WPILib's **units library** puts the unit in the type (`Meters.of(0.5)` is a `Distance`, `.in(Centimeters)` converts), so mixing units is a compile error. A **static import** (`import static ...Units.Meters;`) lets you use a static member by its own name; use them sparingly. You also used a library **enum**, `SysIdRoutineLog.State`, and a `switch` whose cases `return`.
> * The Explorer records tests in **Test** mode on the D-pad with `SysIdRoutineLog`, driving through `setVolts` in **pretend volts** (power times `NOMINAL_BATTERY_VOLTS`), with a hold-to-run thumb and two safety nets.
> * `Drivetrain.drive()` now goes kinematics, desaturation, then one `SimpleMotorFeedforward` per side, with a small **deadband** so kS does not buzz near zero. The robot drives the speed you ask for with no PID, and PID retunes to a smaller job, usually with less or no `kI`.
> * A feedforward is only as good as the conditions it was measured in: batteries, floor, robot. Measure on the real floor with fresh batteries, keep PID in the loop, and re-run SysId when things change.

---

## Exercises

### Practice

**1. Feedforward by hand.** Using the example gains from Section 16.7 (`kS = 0.95`, `kV = 18.0`, `kA = 1.1`) and `NOMINAL_BATTERY_VOLTS = 6.0`, fill in the table. "Old power" is what Chapter 13's `speedToPower` sent, with a top speed of 0.28. "New power" is the feedforward's volts divided by 6.0.

| Speed (m/s) | Acceleration (m/s²) | Feedforward volts | New power | Old power |
|---|---|---|---|---|
| 0.05 | 0 | | | |
| 0.10 | 0 | 2.75 | 0.458 | 0.357 |
| 0.20 | 0 | | | |
| 0.10 | 0.5 | | | |
| -0.10 | 0 | | | |

The second row is done for you. Then answer: at which speed is the old guess furthest off, as a fraction of what was needed? Why is the `-0.10` row not just "the same as `0.10`, but negative" for the kS part? (It is, but explain **why** that is right.) Check your volts in code with a temporary `System.out.println(new SimpleMotorFeedforward(0.95, 18.0, 1.1).calculate(0.05));` in the constructor, then remove it.

**2. Predict your top speed.** With your own gains for each side, compute the predicted top speed at full power: `(NOMINAL_BATTERY_VOLTS - kS) ÷ kV`. (Or let the model do it: `leftFeedforward.maxAchievableVelocity(6.0, 0.0)`.) Compare with the top speed you measured in Chapter 13 and put in `MAX_WHEEL_SPEED_METERS_PER_SECOND`. If the slower side's prediction is **lower** than that constant, desaturation will let `drive()` ask that side for a speed it cannot reach. Change the constant to the slower side's prediction, and write a comment saying where the number came from. If the prediction is higher, explain in one sentence why your Chapter 13 measurement and the prediction might differ (think about which batteries you used each time).

**3. Units playground.** In your `Robot()` constructor, add temporary lines that create `Meters.of(0.5)`, `Centimeters.of(40)`, and `Inches.of(12)`. Before you run anything, predict what each of these prints:

```java
System.out.println(Meters.of(0.5).in(Centimeters));
System.out.println(Inches.of(12).in(Meters));
System.out.println(Meters.of(0.5).plus(Centimeters.of(40)).in(Meters));
System.out.println(Meters.of(0.5));
```

Use static imports for `Meters`, `Centimeters`, and `Inches`. Run, and compare. Then write two lines that should **not** compile: one that passes a `Distance` to `log.motor("left").voltage(...)`, and one that adds volts to meters. Read each error message aloud, the Chapter 10 way, and copy both into `reflections.md` with one sentence each explaining what the compiler protected you from. Remove all the test lines.

**4. Characterize a turn.** Make a temporary copy of your project branch (`git checkout -b sysid-turn`). In `updateSysIdTest()`, change `drivetrain.setVolts(volts, volts)` to `drivetrain.setVolts(-volts, volts)`, so the "forward" tests spin the robot counterclockwise in place and the "reverse" tests spin it clockwise. Start a **fresh** run of the program, and run all four tests (the distance safety net will not stop a spin, so let go after about one full turn). Analyze the **right** side in SysId and compare its Ks with your straight-line Ks for that side. Is it bigger? By how much? Explain, using the word "scrub," why a heading controller on a robot like this may still need a little `kI` with feedforward. Then `git checkout` back to your main branch and delete the temporary one.

**5. The battery test.** Do the cruise check from Section 16.9 (left bumper, 0.10 m/s, no PID) three times with fresh batteries and three times with well-used ones (or with the batteries you used last week). Record the measured speed each time. How far did the speed drift? Which part of the Explorer's code now covers that drift during autonomous, and why could a roboRIO avoid most of it? Answer in two or three sentences.

### Build (XRP Explorer)

Characterize the Explorer and drive it with a measured feedforward.

1. Add `NOMINAL_BATTERY_VOLTS`, the remembered-volts fields, `setVolts()`, the new `stop()`, and `logSysId()` to `Drivetrain` (Section 16.5). Leave `speedToPower` in place for now.
2. Add the imports, constants, fields, dashboard widget, `disabledInit()` line, and the new Test mode section to `Robot.java` (Section 16.5). Build and confirm `BUILD SUCCESSFUL`.
3. With fresh batteries, on your course floor, do the "before" cruise check (Section 16.6) three times and record the measured speed.
4. In one run of the program, run all four SysId tests (Section 16.6). Stop the program and find the log file.
5. Analyze the left and right sides in SysId (Section 16.7). In `reflections.md`, record for each side: Ks, Kv, Ka, the sim velocity R², and one sentence about how the time domain plots looked. If either R² is below 0.9, find the cause using the table in Section 16.7 and rerun the tests.
6. Update `Drivetrain` to the full listing in Section 16.8, with **your** gains and today's date. Build.
7. Do the "after" cruise check three times. Put the before and after speeds side by side in `reflections.md`.
8. Retune the heading and distance controllers on the bench (Section 16.9). Record what you changed, especially what happened when you set the heading I to zero.
9. Run the autonomous course five times and fill in your Chapter 15 table again, adding a column for each step's time. Compute the average error and the average time for each step, before and after.

Diagnose anything strange:

- **The robot drives backward when it should drive forward, or spins in place on a straight request:** a side's gains are negative or in the wrong constants. kV and kA must be positive (a negative one makes `SimpleMotorFeedforward` throw `IllegalArgumentException` when the robot starts). Check that the left gains are in the `LEFT_` constants.
- **The cruise check is fast or slow by the same amount every time:** the gains are from a different floor or different batteries. Rerun SysId in today's conditions.
- **The robot buzzes or twitches while holding a bench target:** the kS buzz (Section 16.8). Raise `STOPPED_SPEED_METERS_PER_SECOND` a little, or lower `kP` a little.
- **Leg 1 now overshoots:** feedforward is adding push on top of the old P. Lower `DISTANCE_KP` a little.
- **The robot curves more than it did before:** the left and right gains may be swapped. Each side's numbers come from its own entries (`-left-drive`, `-right-drive`).
- **Teleop feels exactly the same as before:** that is expected. Teleop still uses `arcadeDrive`, which sends power straight from the sticks. Feedforward only affects `drive()`.

When the Explorer cruises within about 10% of the speed you ask for with no PID, and runs the course at least as accurately as in Chapter 15 but faster, your robot is characterized. In Chapter 17, you will use what it now knows about itself to build a robot that runs without the robot.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Explain the difference between feedforward and feedback using an example that has nothing to do with robots. Then explain why the Explorer needs both.
2. Why does the quasistatic test ramp the voltage **slowly**? What would go wrong with measuring kS and kV if the ramp were fast? Use the word "acceleration."
3. Your Chapter 14 robot curved slightly on a straight leg. Explain how measuring each side separately can reduce that curve **before** PID does anything, and why Chapter 15's heading hold was treating the symptom instead of the cause.
4. The SysId logger's `voltage` method only accepts a `Voltage`, not a `double`. Describe a bug this prevents, and connect it to the Mars Climate Orbiter.

If any answer feels shaky, re-read Sections 16.1, 16.3, and 16.4.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b feedforward
```

Do the Build exercise on that branch. Because `logs/` is ignored by Git, your SysId data would otherwise disappear the next time you clean up. Keep the evidence: make a folder called `sysid` in your project, copy your SysId log file into it with a name that says what it is and when (for example, `sysid/2026-11-20-drive-straight.wpilog`), and commit it with your code:

```bash
git add .
git commit -m "Ch16: SysId characterization and feedforward"
git push -u origin feedforward
```

Open a pull request into `main`. In the description, include both sides' Ks, Kv, and Ka, the sim velocity R² for each, your before and after cruise speeds, and your before and after course table. Review **Files changed**: you should see `Drivetrain.java`, `Robot.java`, and the log file. Merge, delete the branch, then `git checkout main` and `git pull`.

Months from now, when someone asks "why is kS 0.95?", the answer will be one `git log` away: the data, the date, and the numbers it produced, all in one commit.

### Collab: Robot Swap

Work with a partner. Each of you should have your own characterized Explorer.

1. Each of you writes your six gains on a card.
2. Swap **gains**, not robots: put your partner's gains into your `Drivetrain` constants on a temporary branch (`git checkout -b swap-test`).
3. Run the cruise check (left bumper, 0.10 m/s, no PID) three times on your own robot with your partner's gains, and then three times with your own.
4. Compare. How far off was the speed with someone else's model? Did the robot curve in a direction it did not with your own gains?

Afterward, each of you writes two sentences in `reflections.md`: how different your two robots' gains were, and what that tells you about using one team's numbers on another team's robot (or last year's numbers on this year's). Switch back to your own branch and delete `swap-test`.

### Explore

WPILib's documentation has an interactive simulation, **Tuning a Flywheel Velocity Controller** (link below), where you control a shooter wheel's speed in your browser. Try it three ways: feedback only (feedforward gains at zero, tune only P), feedforward only (P at zero), and both. Which gets the wheel to its speed fastest? Which recovers best when the simulation feeds a ball into the flywheel? Write two or three sentences in `reflections.md` comparing what you saw with your cruise check from Section 16.9.

---

> **Additional Resources**
>
> * **Introduction to DC Motor Feedforward**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-feedforward.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-feedforward.html) WPILib's explanation of the kS, kV, kA equation and where each term comes from
> * **Introduction to System Identification**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/introduction.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/introduction.html) the official SysId guide, with pages on creating a routine, loading data, reading the gains, and diagnosing a bad fit
> * **Feedforward Control in WPILib**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/controllers/feedforward.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/controllers/feedforward.html) how to use `SimpleMotorFeedforward`, `ArmFeedforward`, and `ElevatorFeedforward` in code
> * **The Java Units Library**: [docs.wpilib.org/en/stable/docs/software/basic-programming/java-units.html](https://docs.wpilib.org/en/stable/docs/software/basic-programming/java-units.html) WPILib's guide to measures, units, conversions, and type safety
> * **Using Package Members (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/package/usepkgs.html](https://docs.oracle.com/javase/tutorial/java/package/usepkgs.html) Java's own explanation of imports, including "The Static Import Statement" and when not to use it
> * **Tuning a Flywheel Velocity Controller**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-flywheel.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-flywheel.html) an interactive simulation comparing feedforward and feedback, no robot required

---

*Next up, Chapter 17: Simulation and AdvantageKit on the XRP. You will split the drivetrain into an IO layer so the same code can run on the real XRP or a simulated one, and see how the model you just measured can make a simulated robot behave like yours.*
