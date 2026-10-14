# Chapter 9: All the XRP Sensors

In Chapter 7 you gave the Explorer a hardware layer for its motors. In Chapter 8 you handed the controls to a human: the sticks went in, the wheels turned, and you drove a taped course with a slow mode for the tight corners. The robot can finally move the way you want it to.

But ask the robot a simple question and it has no answer. How far did you just drive? Which way are you facing? Is there a wall in front of you? Are you sitting on the black line? Right now the XRP knows none of this. The only "sensor" it reads is the driver's thumb. Everything else, it does blind.

This chapter gives the Explorer its senses. The XRP carries four kinds of sensors: **encoders** on the wheels, an **IMU** (a gyro plus an accelerometer) on the circuit board, an ultrasonic **rangefinder** on the front, and a pair of **reflectance sensors** underneath. You will read every one of them, turn their raw numbers into real units like meters and degrees, and build a live dashboard that shows everything the Explorer can feel, all at once.

On the Java side you will learn why `931 / 585` can equal `1` in Java (and how to stop it), and you will meet the **getter**, the small method that lets a class share what it knows without letting anyone break it.

This is also the chapter where robotics starts to feel like science. Sensors are measuring instruments, and every measuring instrument is a little bit wrong. Learning how each one is wrong is half of what makes a good robot programmer.

---

## 9.1 Driving Blind: Why a Robot Needs Sensors

Think back to the one-second autonomous nudge from Chapter 7. You told the motors "0.6 power for one second" and hoped. How far did the robot go? It depends. On a fresh battery, farther. On carpet, shorter. If one wheel slipped, it curved. Your code had no idea, because your code never checked.

That is called **open-loop** control: command the motors and hope the world cooperates. In Chapter 8 you saw the fix in a callout: in teleop, the driver watches the robot and corrects it, which closes the loop. To close the loop **without** a human, the robot needs its own eyes and ears. That is what sensors are.

Remember the read, decide, write loop from Chapter 1? Sensors are the "read." Up to now, your read step has been just the controller. After this chapter, it includes everything the XRP can measure about itself and the world around it.

Here is what the XRP carries:

| Sensor | What it measures | WPILib class | Raw output |
|---|---|---|---|
| Wheel encoders (2) | How far each wheel has turned | `Encoder` | Counts (whole numbers) |
| Gyro (in the IMU) | Which way the robot is facing, and how fast it is turning | `XRPGyro` | Degrees, degrees per second |
| Accelerometer (in the IMU) | Pushes, bumps, and tilt | `BuiltInAccelerometer` | g (1 g is the pull of gravity) |
| Ultrasonic rangefinder | Distance to whatever is in front | `XRPRangefinder` | Meters |
| Reflectance sensors (2) | How dark the floor is under each sensor | `XRPReflectanceSensor` | `0.0` (white) to `1.0` (black) |

Notice that some sensors are about the robot itself (how far it drove, which way it faces), and some are about the world (what is in front of it, what is under it). Engineers call the first kind **proprioceptive**, like your sense of where your own arm is with your eyes closed, and the second kind **exteroceptive**, like your eyes and ears. You do not need to memorize those words. But the split will matter in Section 9.5, when you decide which class each sensor belongs in.

> **The controller was your first sensor**
>
> Chapter 8 ended with a promise: a controller is just a sensor for the driver. It reports numbers, those numbers are noisy, they live in their own coordinate frame, and your code has to clean and convert them before they mean anything. Every sensor in this chapter follows the same recipe: **read, clean, convert, then use.** If you understood the deadband and the minus signs in Chapter 8, you already understand the hard part of this chapter.

---

## 9.2 Encoders: Counting Wheel Turns

Start with the sensor you will use most for the rest of the book.

An **encoder** counts rotation. Inside each XRP drive motor, a small magnet spins with the motor shaft, and a sensor next to it notices every time the magnet's poles sweep past. Each of those little events is a **count** (some docs call them ticks or pulses). Spin the shaft forward and the count goes up. Spin it backward and the count goes down.

The XRP's encoders produce **12 counts per revolution of the motor shaft**. But the motor shaft is not the wheel. Between them sits a gearbox, and that gearbox matters a lot.

> **Gear ratios: trading speed for strength**
>
> The XRP motor spins very fast but very weakly. Connected straight to a wheel, it could not push the robot across a carpet. So the gearbox slows it down: the motor turns **48.75 times** for every one turn of the wheel. That is a **48.75:1 gear ratio**. You trade speed for torque (turning strength), the same way a bicycle's lowest gear makes a hill easy but slow. Every FRC mechanism has a gear ratio, and you will multiply and divide by them constantly: on the Mini Swerve's brushless motors in Chapter 27, and when you characterize real mechanisms in Chapter 32.

So for every turn of the **wheel**, the encoder sees:

```
12 counts per motor turn  x  48.75 motor turns per wheel turn  =  585 counts per wheel turn
```

585 counts for one wheel revolution. That is the most important number in this chapter. Write it down.

### Reading the raw counts

The XRP's two drive encoders are wired to fixed pairs of digital channels: the left encoder uses channels **4 and 5**, the right uses **6 and 7**. (An encoder needs two channels because it uses two signals slightly out of step with each other to tell forward from backward.) WPILib's general-purpose `Encoder` class handles both:

```java
import edu.wpi.first.wpilibj.Encoder;
```

```java
private final Encoder leftEncoder = new Encoder(4, 5);
private final Encoder rightEncoder = new Encoder(6, 7);
```

The method `get()` returns the current count as an `int`:

```java
int leftCount = leftEncoder.get();
```

Try it before going further. Put these two fields in `Robot.java` for now (you will move them to the right home in Section 9.5), and publish the counts from `robotPeriodic()`:

```java
SmartDashboard.putNumber("Left Count", leftEncoder.get());
SmartDashboard.putNumber("Right Count", rightEncoder.get());
```

Run the program and leave the robot **disabled**. With the motors off, gently push the XRP forward across the table by hand, or lift it and roll one wheel with your finger. Watch both numbers climb. Push it backward and watch them fall.

According to the WPILib XRP docs, both encoders count **up** when the XRP moves forward, even though the right motor is mounted backward and inverted in your `Drivetrain`. If one of your counts goes down when you push forward, note which one; you will fix it in the Build exercise.

> **Pushing a geared robot by hand**
>
> A 48.75:1 gearbox resists being turned from the wheel end, so pushing the XRP feels stiff. That is normal; push slowly and steadily rather than shoving. Never push it while it is enabled. And notice what is happening: you are turning the motor backward through its gearbox, which is exactly why gear ratios matter in both directions.

---

## 9.3 From Counts to Meters: Unit Conversion and Integer Division

A count of `931` is not useful by itself. You do not tell a teammate "drive forward 931." You say "drive forward 30 centimeters." Your code needs to translate counts into meters, and that translation is a little chain of multiplication and division.

### The conversion, in plain English

1. One wheel revolution is **585 counts**.
2. One wheel revolution rolls the robot forward by one **circumference** of the wheel. The XRP's wheels are **60 mm** across (0.060 m), so the circumference is `pi x 0.060 = 0.1885` meters.
3. So each count is worth `0.1885 / 585 = 0.000322` meters, about a third of a millimeter.
4. Distance in meters = counts x meters per count.

As Java, using the `static final` constants habit from Chapter 8:

```java
private static final double WHEEL_DIAMETER_METERS = 0.060;
private static final double COUNTS_PER_WHEEL_REV = 585.0;
private static final double METERS_PER_COUNT =
    Math.PI * WHEEL_DIAMETER_METERS / COUNTS_PER_WHEEL_REV;
```

`Math.PI` is a constant that Java provides, π to many decimal places. It is a `static final` field on the `Math` class, written in ALL_CAPS, exactly the style you learned last chapter.

Notice that `METERS_PER_COUNT` is a constant **computed from other constants**. That is a good habit. If you ever put bigger wheels on the robot, you change `WHEEL_DIAMETER_METERS` in one place and everything downstream updates. Nobody has to redo the arithmetic by hand.

> **Put the unit in the name**
>
> `WHEEL_DIAMETER_METERS`, not `WHEEL_DIAMETER`. `getLeftDistanceMeters()`, not `getLeftDistance()`. Mixing units is one of the most expensive bugs in engineering history: in 1999 NASA lost the Mars Climate Orbiter because one team's software used pound-force seconds and another expected newton-seconds. Robot code mixes meters, inches, centimeters, degrees, and radians all the time. A unit in every name makes the mismatch visible the moment you read the line. WPILib's standard unit for distance is the **meter**, so this book uses meters too.

### The bug hiding in division

Here is a tempting way to compute how many wheel turns you have made. Read it carefully and predict what it prints:

```java
int counts = 931;
int countsPerRev = 585;
double wheelTurns = counts / countsPerRev;
System.out.println(wheelTurns);
```

`931 / 585` is about `1.59`. But this prints `1.0`.

What happened? In Java, when you divide one `int` by another `int`, the result is also an `int`. Java does the division and then **throws away everything after the decimal point**. This is called **integer division**. `931 / 585` becomes `1`, and only then does Java store that `1` into the `double` variable as `1.0`. By the time the `double` gets involved, the fraction is already gone.

A few more, so the pattern sticks:

```java
System.out.println(7 / 2);      // prints 3, not 3.5
System.out.println(1 / 2);      // prints 0
System.out.println(7.0 / 2);    // prints 3.5
System.out.println(7 / 2.0);    // prints 3.5
```

The rule: **if either side of the division is a `double`, you get a `double` answer.** Only `int / int` throws away the fraction.

There are two ways to fix the wheel-turns line. The first is to make sure one of the numbers is a `double` to begin with, which is why `COUNTS_PER_WHEEL_REV` above is written `585.0`, not `585`. The second is a **cast**:

```java
double wheelTurns = (double) counts / countsPerRev;   // 1.5914...
```

`(double)` in front of a value means "treat this as a `double`." It converts `931` into `931.0` **before** the division happens, so Java does floating-point division and keeps the fraction. Casting is how you tell Java to change a value from one type to another on purpose.

> **A common beginner mistake**
>
> Integer division does not crash. It does not print an error. It just quietly gives you the wrong number, and the robot quietly drives the wrong distance. This makes it one of the nastiest bugs in robot code. Whenever you divide, glance at both sides and ask: "are these both `int`s?" If they are and you want a fraction, add a `.0` or a `(double)` cast.

### Letting the encoder do the math

You could multiply by `METERS_PER_COUNT` every time you read an encoder. But WPILib's `Encoder` class can do it for you. Tell it the distance per count once, at startup, and from then on it hands you meters directly:

```java
leftEncoder.setDistancePerPulse(METERS_PER_COUNT);
rightEncoder.setDistancePerPulse(METERS_PER_COUNT);
```

Now there are two ways to read each encoder:

| Method | Returns | Units |
|---|---|---|
| `get()` | The raw count, as an `int` | Counts |
| `getDistance()` | Count x distance per pulse, as a `double` | Meters (because you configured meters) |
| `getRate()` | How fast the distance is changing | Meters per second |
| `reset()` | Nothing; sets the count back to zero | |

`getRate()` is a bonus: the encoder can tell you **speed**, not just distance. Remember the Chapter 8 callout that said `0.5` on the stick is a fraction of power, not a real speed? This is the measurement that finally lets you see the real speed, in meters per second.

---

## 9.4 The Gyro: Which Way Am I Facing?

Encoders tell you how far each wheel rolled. They do not directly tell you which way the robot is pointing. For that, the XRP has an **IMU** (inertial measurement unit) on its circuit board: a tiny chip containing a **gyroscope** and an **accelerometer**.

A **gyro** measures how fast the robot is rotating. Integrate that rate over time (add up all the tiny turns, fifty times a second) and you get the robot's **heading**: the direction it is facing, in degrees. WPILib gives you the XRP's gyro through the `XRPGyro` class:

```java
import edu.wpi.first.wpilibj.xrp.XRPGyro;
```

```java
private final XRPGyro gyro = new XRPGyro();
```

The methods you will use:

| Method | Returns |
|---|---|
| `getAngle()` | Heading in degrees (rotation around the vertical Z axis) |
| `getRate()` | Turning speed in degrees per second |
| `reset()` | Nothing; makes the current heading the new zero |

There are also `getAngleX()`, `getAngleY()`, and `getAngleZ()` for rotation around each of the three axes. `getAngle()` is the same as `getAngleZ()`: spinning flat on the floor, like a turntable. That is the one that matters for a drivetrain.

> **Keep it still while it wakes up**
>
> The XRP calibrates its gyro every time it powers on. For a few seconds, the green LED flashes quickly while the IMU measures what "not moving" looks like. If you pick up the robot or bump the table during that time, the gyro learns the wrong zero and the heading will slowly creep for the rest of the session. Power the XRP on while it sits flat and still, and wait for the LED to stop flashing.

### Which way is positive?

Put `gyro.getAngle()` on the dashboard, leave the robot disabled, and slowly turn the XRP by hand on the table. Turn it **left** (counterclockwise, seen from above) about a quarter turn. The heading should climb toward `90`. Turn it back right and it falls back toward `0`, then goes negative.

That is the same convention you met in Chapter 8: in WPILib's robot coordinate frame, **positive rotation is counterclockwise**. The gyro, `arcadeDrive`'s rotation input, and (in Chapter 14) the robot's position on the field all agree on it. When every part of your program uses the same convention, the minus signs stay where you expect them.

> **Check the sign on your own robot**
>
> Do the quarter-turn test on your actual XRP before you trust the gyro. If your heading goes **down** when you turn left, your robot does not match the convention, and every turn you program later will go the wrong way. The fix is a single minus sign inside the one method that reads the gyro (you will write that method in Section 9.5). This is exactly the kind of mistake the WPILib docs warn about: if the sensor and the turn direction disagree, a control loop will spin the robot wildly instead of correcting it.

Now spin the robot more than a full turn and watch what happens after `360`. WPILib documents the heading as **continuous**: one and a quarter turns reads about `450`, not `90`. This is deliberate. Code that steers to a heading would panic if the number suddenly jumped from `359` back to `0`. If your reading ever wraps around instead, note it; in Chapter 14 you will meet `Rotation2d`, a WPILib class that handles angles correctly either way.

### Drift: the gyro's slow lie

Leave the robot completely still for five minutes and watch the heading. It will probably not stay at exactly `0.0`. It may creep by a fraction of a degree, or a degree or two. This is **drift**. Each gyro reading has a tiny error, and because heading is a running total of readings, the tiny errors add up over time.

For a two-minute FRC match, a good gyro drifts only a little, and that is fine. For a robot that runs for an hour, drift adds up. This is one reason you will **reset** the gyro at sensible moments (like the start of autonomous) rather than trusting a heading from twenty minutes ago.

> **Every sensor lies a little, in its own way**
>
> Drift is the gyro's characteristic error: small, slow, and growing. Encoders have a different one: they are precise about how far the wheel **turned**, but if the wheel slips on a smooth floor, the robot did not actually move that far. In Chapter 14 you will combine encoders and the gyro to track the robot's position on the field (**odometry**), and in Chapter 30 you will add camera measurements to correct the slow errors of both. Combining sensors so each covers the others' weaknesses is called **sensor fusion**, and it is how every serious robot knows where it is.

### The accelerometer

The other half of the IMU is the **accelerometer**. It measures acceleration along three axes, X, Y, and Z, in units of **g**, where `1.0` g is the pull of Earth's gravity (9.81 meters per second squared). On the XRP you read it with WPILib's standard `BuiltInAccelerometer` class:

```java
import edu.wpi.first.wpilibj.BuiltInAccelerometer;
```

```java
private final BuiltInAccelerometer accelerometer = new BuiltInAccelerometer();
```

`getX()`, `getY()`, and `getZ()` each return a `double` in g.

Here is the surprise: with the robot sitting perfectly still on a flat table, Z reads about **`1.0`**, not `0.0`. The accelerometer cannot tell the difference between gravity and acceleration, so it feels gravity pulling down all the time. X and Y read close to zero. Tilt the robot and some of that 1 g moves into X or Y. That is how a phone knows which way you are holding it.

On the XRP, the accelerometer is mostly useful for noticing **bumps** (a sudden spike when the robot hits something) and **tilt**. Which way do its X and Y axes point on your robot? Rather than take anyone's word for it, you will find out yourself in the Build exercise, by pushing the robot forward sharply and watching which number jumps.

---

## 9.5 Getters: A Read-Only Window into a Class

You now have four sensor objects (two encoders, a gyro, an accelerometer), and two more are coming. Where should they live?

Back in Chapter 8, Section 8.9, you made a split: inputs and decisions in `Robot.java`, hardware hidden inside `Drivetrain`. Sensors are hardware. So they should be private, inside a class, not scattered through `Robot.java`. But which class?

Here is a rule that will hold up for the rest of the book:

- **If the drivetrain needs it to drive accurately, it lives in `Drivetrain`.** The encoders and the gyro measure how the drivetrain itself moves. In Chapter 12 you will drive to a distance and turn to a heading; in Chapter 14 you will track position. All of that is drivetrain work.
- **Everything else lives in a new `Sensors` class.** The rangefinder, the line sensors, and the accelerometer tell you about the world around the robot.

That raises a Java question. If the encoders are `private` inside `Drivetrain`, how does `Robot.java` read them? You cannot write `drivetrain.leftEncoder.getDistance()`; the encoder is private, so that line will not compile.

The answer is a **getter**: a small public method whose only job is to report a value.

```java
public double getLeftDistanceMeters() {
    return leftEncoder.getDistance();
}
```

You actually wrote a getter in Chapter 7 without the name: `getPoints()` on `ScoreKeeper`. Now you can see why the pattern is so common. A getter is a **read-only window**. Outside code can look at the left distance, but it cannot reach in and reset the encoder, change its distance per pulse, or replace it with a different encoder. The `Drivetrain` decides exactly what it shares, and how.

Getters follow naming conventions that make code read like sentences:

- `getSomething()` returns a value: `getHeadingDegrees()`, `getLeftDistanceMeters()`.
- `isSomething()` or `hasSomething()` returns a `boolean`: `isLeftOnLine()`, `isObstacleWithin(0.2)`.

And a getter does not have to just pass a value through. It can **compute** something from other values. That is where getters become powerful:

```java
public double getAverageDistanceMeters() {
    return (getLeftDistanceMeters() + getRightDistanceMeters()) / 2.0;
}
```

When the robot drives straight, both wheels travel the same distance, and the average is how far the center of the robot moved. Nobody outside `Drivetrain` needs to know that it takes two encoders and a division to answer "how far have we gone?" They just ask. (Notice the `2.0`, not `2`. The values being divided are already `double`s, so `2` would also work here, but writing `2.0` is a cheap habit that keeps integer division from ever sneaking in.)

> **Getters are where the units get decided**
>
> A getter is the one place where a raw reading becomes a meaningful number. If the gyro on your robot turns out to read backward (Section 9.4), you fix it with one minus sign inside `getHeadingDegrees()`, and every caller automatically gets the right answer. If you later switch a sensor to a different unit, you convert it inside the getter, and the name still tells the truth. One fix, one place: that is encapsulation from Chapter 7, now applied to reading instead of writing.

### The complete `Drivetrain.java`

Here is `Drivetrain` with the encoders and gyro added. Remove the temporary encoder fields you put in `Robot.java` in Section 9.2, then update `Drivetrain.java`. Type it, do not paste:

```java
package frc.robot;

import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj.xrp.XRPGyro;
import edu.wpi.first.wpilibj.xrp.XRPMotor;

public class Drivetrain {

    // Physical facts about the XRP drivetrain.
    private static final double WHEEL_DIAMETER_METERS = 0.060;
    private static final double COUNTS_PER_WHEEL_REV = 585.0;   // 12 counts x 48.75:1
    private static final double METERS_PER_COUNT =
        Math.PI * WHEEL_DIAMETER_METERS / COUNTS_PER_WHEEL_REV;

    // Motors.
    private final XRPMotor leftMotor = new XRPMotor(0);
    private final XRPMotor rightMotor = new XRPMotor(1);
    private final DifferentialDrive diffDrive =
        new DifferentialDrive(leftMotor::set, rightMotor::set);

    // Sensors the drivetrain needs to drive accurately.
    private final Encoder leftEncoder = new Encoder(4, 5);
    private final Encoder rightEncoder = new Encoder(6, 7);
    private final XRPGyro gyro = new XRPGyro();

    public Drivetrain() {
        rightMotor.setInverted(true);

        // From now on, getDistance() returns meters.
        leftEncoder.setDistancePerPulse(METERS_PER_COUNT);
        rightEncoder.setDistancePerPulse(METERS_PER_COUNT);
        resetEncoders();
    }

    // Driving

    /** Drive the robot. forward and rotation are each -1.0 to 1.0. */
    public void arcadeDrive(double forward, double rotation) {
        diffDrive.arcadeDrive(forward, rotation);
    }

    /** Stop both motors. */
    public void stop() {
        diffDrive.arcadeDrive(0.0, 0.0);
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

    /** How far the center of the robot has moved, on average. */
    public double getAverageDistanceMeters() {
        return (getLeftDistanceMeters() + getRightDistanceMeters()) / 2.0;
    }

    public double getLeftSpeedMetersPerSecond() {
        return leftEncoder.getRate();
    }

    public double getRightSpeedMetersPerSecond() {
        return rightEncoder.getRate();
    }

    public void resetEncoders() {
        leftEncoder.reset();
        rightEncoder.reset();
    }

    // Gyro

    /** Heading in degrees. Counterclockwise (turning left) is positive. */
    public double getHeadingDegrees() {
        return gyro.getAngle();
    }

    public double getTurnRateDegreesPerSecond() {
        return gyro.getRate();
    }

    public void resetHeading() {
        gyro.reset();
    }
}
```

Walk through what changed since Chapter 7:

- **Constants at the top.** The physical facts about the robot (wheel size, counts per revolution) are named once. `METERS_PER_COUNT` is computed from them, with `Math.PI` and no integer division anywhere.
- **Three new private fields.** Two `Encoder` objects on their fixed channels and one `XRPGyro`. Nothing outside this class can touch them.
- **The constructor** now also configures the encoders to report meters and zeroes them.
- **Getters.** Every reading has a public getter with the unit in its name. `getAverageDistanceMeters()` computes a value from two other getters.
- **Two reset methods.** `resetEncoders()` and `resetHeading()` are not getters, but they are the only way outside code can change sensor state, and they do exactly one clear thing each.

`arcadeDrive` and `stop` did not change at all, so nothing in `Robot.java` that drives the robot needs to change either.

> **Why both counts and meters?**
>
> `getLeftCount()` might seem redundant when you have `getLeftDistanceMeters()`. Keep it for now. When a conversion looks wrong, the raw count is how you check: if the count is right and the meters are wrong, the bug is in your constants; if the count itself is wrong, the problem is the encoder or its wiring. Being able to see the raw value **and** the converted value side by side is one of the most useful debugging tools there is. Chapter 10 is all about building that kind of evidence.

---

## 9.6 The Rangefinder: How Far to the Wall?

The XRP's rangefinder is the pair of round "eyes" on the front of the robot. They are not eyes. One is a tiny speaker and the other is a tiny microphone.

The rangefinder sends out a click of sound too high-pitched for humans to hear (**ultrasonic**), then listens for the echo. Sound travels at about 343 meters per second, so the time until the echo comes back tells you how far away the surface was. Bats and submarines do the same thing. So do the parking sensors on a car's bumper.

WPILib wraps it in the `XRPRangefinder` class:

```java
import edu.wpi.first.wpilibj.xrp.XRPRangefinder;
```

```java
private final XRPRangefinder rangefinder = new XRPRangefinder();
```

```java
double distanceAhead = rangefinder.getDistanceMeters();
```

There is also `getDistanceInches()`, if you ever need it. This book uses meters.

> **Correction to Chapter 6**
>
> Chapter 6 used `rangefinder.getDistance()` and compared it to `20.0` centimeters. The real `XRPRangefinder` method is `getDistanceMeters()`, and it returns meters. So the Chapter 6 check "closer than 20 cm" is written `getDistanceMeters() < 0.20`. If you typed the Chapter 6 version into your project and it would not compile, this is why.

### What the rangefinder is bad at

The XRP's rangefinder reports from about 2 centimeters out to **4 meters**. Anything farther than 4 meters reads as 4 meters. Within that range it is quite good, but it has some habits worth knowing:

- **It sees a cone, not a line.** The sound spreads out as it travels, so a table leg off to one side can echo back and look like a wall straight ahead.
- **Soft things absorb sound.** Foam, cloth, and a backpack may not echo well, so the rangefinder may read "far away" when they are right in front of it.
- **Angled surfaces bounce the sound away.** Point the robot at a wall at a steep angle and the echo may never come back, so the reading jumps to something too far.
- **Too close is a blind spot.** Very close to a surface, the echo arrives before the sensor is ready to listen.
- **A reading near zero can mean "unplugged."** If the rangefinder cable is loose, the reading sits at or near `0.0`, which looks exactly like "wall right in front of me." Keep this in mind for the Build exercise.

Put `rangefinder.getDistanceMeters()` on the dashboard and test each of those yourself: a flat book, a book held at an angle, a sweater, your hand at 30 cm. Five minutes of this teaches you more than any table could.

> **Noise and filtering**
>
> Watch the distance widget while the robot sits still facing a wall. The number will flicker a little from loop to loop, even though nothing moved. That is **noise**, and every real sensor has some. For now, ignore small flickers by using thresholds with some margin (stop at 20 cm, not exactly at the wall). Later, you will meet tools that smooth noisy readings by averaging the last few values, and in Chapter 15 you will see why noisy measurements make some control loops twitchy.

---

## 9.7 The Reflectance Sensors: Seeing the Line

Underneath the front of the XRP are two small **reflectance sensors**, left and right. Each one shines invisible infrared light at the floor and measures how much bounces back. A white floor reflects a lot. Black electrical tape reflects very little. That difference is how a robot follows a line.

```java
import edu.wpi.first.wpilibj.xrp.XRPReflectanceSensor;
```

```java
private final XRPReflectanceSensor reflectance = new XRPReflectanceSensor();
```

One object covers both sensors:

```java
double left = reflectance.getLeftReflectanceValue();
double right = reflectance.getRightReflectanceValue();
```

Each returns a `double` from **`0.0` (pure white) to `1.0` (pure black)**. Notice the direction: a **bigger** number means a **darker** floor. The name says "reflectance," but the value goes up as reflection goes down. Think of it as a "darkness" reading.

### Picking a threshold by measuring

To decide "is this sensor on the line?" you need a **threshold**: a number above which you call the floor dark. Do not guess it. Measure it, the same way you measured your deadband in Chapter 8:

1. Put both widgets on the dashboard and set the robot on your normal floor or table. Write down the readings. Maybe they are around `0.1`.
2. Lay a strip of black electrical tape and slide the robot so one sensor is directly over it. Write down that reading. Maybe `0.8`.
3. Pick a threshold about halfway between, like `0.45`.

Halfway gives you the most margin in both directions. If your "white" floor is actually gray carpet that reads `0.4`, the halfway point moves, which is exactly why you measure on the surface you will actually use.

> **The sensors are sensitive to height and light**
>
> The reflectance sensors are designed to sit just a few millimeters above the floor. Lift the robot and every reading changes. Bright sunlight contains a lot of infrared light and can confuse them too. If your readings look strange, check that the robot is sitting flat on the floor and not in a sunbeam.

With two sensors, the robot can tell more than "on the line or not." If the left sensor sees black and the right sees white, the line is drifting off to the left, so the robot should steer left. That one idea is the heart of line following, and it is exactly the kind of decision you will turn into a **state machine** in Chapter 21.

---

## 9.8 The `Sensors` Class and the Live Dashboard

Time to put the world-facing sensors in their own class, then show everything on one dashboard.

Create `Sensors.java` next to `Robot.java` and `Drivetrain.java`:

```java
package frc.robot;

import edu.wpi.first.wpilibj.BuiltInAccelerometer;
import edu.wpi.first.wpilibj.xrp.XRPRangefinder;
import edu.wpi.first.wpilibj.xrp.XRPReflectanceSensor;

public class Sensors {

    // Measured on our floor and black tape (see Section 9.7). Re-measure on new surfaces!
    private static final double LINE_THRESHOLD = 0.45;

    private final XRPRangefinder rangefinder = new XRPRangefinder();
    private final XRPReflectanceSensor reflectance = new XRPReflectanceSensor();
    private final BuiltInAccelerometer accelerometer = new BuiltInAccelerometer();

    // Rangefinder

    public double getDistanceAheadMeters() {
        return rangefinder.getDistanceMeters();
    }

    /** True if something is closer than the given distance, in meters. */
    public boolean isObstacleWithin(double meters) {
        return getDistanceAheadMeters() < meters;
    }

    // Reflectance (0.0 = white, 1.0 = black)

    public double getLeftReflectance() {
        return reflectance.getLeftReflectanceValue();
    }

    public double getRightReflectance() {
        return reflectance.getRightReflectanceValue();
    }

    public boolean isLeftOnLine() {
        return getLeftReflectance() > LINE_THRESHOLD;
    }

    public boolean isRightOnLine() {
        return getRightReflectance() > LINE_THRESHOLD;
    }

    // Accelerometer (in g; Z is about 1.0 when sitting flat)

    public double getAccelX() {
        return accelerometer.getX();
    }

    public double getAccelY() {
        return accelerometer.getY();
    }

    public double getAccelZ() {
        return accelerometer.getZ();
    }
}
```

There is no constructor this time. Every field is created by a field initializer, and nothing needs configuring, so Java's free empty constructor (Chapter 7) is all you need.

Look at `isObstacleWithin(double meters)`. It is a getter that takes a **parameter**. The `Sensors` class answers "is something closer than this distance?" but leaves the decision of **what distance matters** to whoever is asking. At 20 cm, maybe you stop. At 50 cm, maybe you slow down. The sensor class reports facts; `Robot.java` decides what to do about them. That is the same split you made in Chapter 8.

### The updated `Robot.java`

Here is the full `Robot.java`, starting from Chapter 8 with slow mode added in its Build exercise. It adds three things: a `Sensors` object, a dashboard helper method that publishes every reading, and a safety feature that refuses to drive forward into a wall. Type it, do not paste:

```java
package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.XboxController;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;

public class Robot extends TimedRobot {

    // Constants: one shared copy each, never reassigned.
    private static final int DRIVER_CONTROLLER_PORT = 0;
    private static final double STICK_DEADBAND = 0.1;
    private static final double FULL_SPEED_SCALE = 1.0;
    private static final double SLOW_MODE_SCALE = 0.5;
    private static final double WALL_STOP_DISTANCE_METERS = 0.20;

    // The robot's parts, created once.
    private final Drivetrain drivetrain;
    private final Sensors sensors;
    private final XboxController controller = new XboxController(DRIVER_CONTROLLER_PORT);
    private final Timer autoTimer = new Timer();

    public Robot() {
        System.out.println("XRP Explorer started!");
        SmartDashboard.putString("Mode", "Starting");

        drivetrain = new Drivetrain();
        sensors = new Sensors();
    }

    @Override
    public void robotPeriodic() {
        // Y zeroes the encoders and the gyro. Works even while disabled.
        if (controller.getYButtonPressed()) {
            drivetrain.resetEncoders();
            drivetrain.resetHeading();
        }

        updateDashboard();
    }

    /** Publish every sensor reading, every loop, in every mode. */
    private void updateDashboard() {
        // Controller (from Chapter 8)
        SmartDashboard.putNumber("Left Y", controller.getLeftY());
        SmartDashboard.putNumber("Right X", controller.getRightX());

        // Encoders
        SmartDashboard.putNumber("Left Count", drivetrain.getLeftCount());
        SmartDashboard.putNumber("Right Count", drivetrain.getRightCount());
        SmartDashboard.putNumber("Left Distance (m)", drivetrain.getLeftDistanceMeters());
        SmartDashboard.putNumber("Right Distance (m)", drivetrain.getRightDistanceMeters());
        SmartDashboard.putNumber("Avg Distance (m)", drivetrain.getAverageDistanceMeters());
        SmartDashboard.putNumber("Left Speed (m per s)", drivetrain.getLeftSpeedMetersPerSecond());
        SmartDashboard.putNumber("Right Speed (m per s)", drivetrain.getRightSpeedMetersPerSecond());

        // Gyro
        SmartDashboard.putNumber("Heading (deg)", drivetrain.getHeadingDegrees());
        SmartDashboard.putNumber("Turn Rate (deg per s)", drivetrain.getTurnRateDegreesPerSecond());

        // Rangefinder
        SmartDashboard.putNumber("Distance Ahead (m)", sensors.getDistanceAheadMeters());
        SmartDashboard.putBoolean("Wall Close", sensors.isObstacleWithin(WALL_STOP_DISTANCE_METERS));

        // Reflectance
        SmartDashboard.putNumber("Left Reflectance", sensors.getLeftReflectance());
        SmartDashboard.putNumber("Right Reflectance", sensors.getRightReflectance());
        SmartDashboard.putBoolean("Left On Line", sensors.isLeftOnLine());
        SmartDashboard.putBoolean("Right On Line", sensors.isRightOnLine());

        // Accelerometer
        SmartDashboard.putNumber("Accel X (g)", sensors.getAccelX());
        SmartDashboard.putNumber("Accel Y (g)", sensors.getAccelY());
        SmartDashboard.putNumber("Accel Z (g)", sensors.getAccelZ());
    }

    @Override
    public void disabledInit() {
        SmartDashboard.putString("Mode", "Disabled");
    }

    @Override
    public void disabledPeriodic() {}

    @Override
    public void autonomousInit() {
        SmartDashboard.putString("Mode", "Autonomous");
        autoTimer.restart();
    }

    @Override
    public void autonomousPeriodic() {
        if (autoTimer.get() < 1.0) {
            drivetrain.arcadeDrive(0.6, 0.0);
        } else {
            drivetrain.stop();
        }
    }

    @Override
    public void teleopInit() {
        SmartDashboard.putString("Mode", "Teleop");
    }

    @Override
    public void teleopPeriodic() {
        // Read: clean up the raw sticks, flip into the robot's frame.
        double forward = -MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND);
        double rotation = -MathUtil.applyDeadband(controller.getRightX(), STICK_DEADBAND);

        // Decide: slow mode, and never drive forward into a wall.
        double speedScale = controller.getRightBumperButton() ? SLOW_MODE_SCALE : FULL_SPEED_SCALE;
        boolean blocked = forward > 0.0 && sensors.isObstacleWithin(WALL_STOP_DISTANCE_METERS);
        double safeForward = blocked ? 0.0 : forward;

        // Write.
        drivetrain.arcadeDrive(safeForward * speedScale, rotation * speedScale);

        SmartDashboard.putBoolean("Slow Mode", speedScale == SLOW_MODE_SCALE);
        SmartDashboard.putBoolean("Blocked", blocked);
    }
}
```

Walk through what changed since Chapter 8:

- **A `Sensors` field**, created once in the constructor next to the drivetrain.
- **A new constant**, `WALL_STOP_DISTANCE_METERS`, with the unit in its name. This is the 20 cm from Chapter 6, now in meters.
- **`updateDashboard()`**, a private helper method (Chapter 6) that groups twenty `put` calls in one place so `robotPeriodic()` stays readable. It runs in `robotPeriodic()`, so every reading updates in **every mode**, including Disabled. That is what lets you push the robot by hand and watch the numbers.
- **The Y button resets the sensors**, using `getYButtonPressed()` from Chapter 8 so one press means one reset. Zeroing the encoders and gyro before a test is something you will do constantly.
- **The wall stop in `teleopPeriodic()`.** If the driver asks to go forward **and** the rangefinder sees something within 20 cm, the forward command becomes `0.0`. The driver can still back up and turn, because the check only blocks positive `forward`. This is the Chapter 6 Build idea, now with real units, a named constant, and the ternary from Chapter 8.

Why read the Y button in `robotPeriodic()` instead of `teleopPeriodic()`? Because you will often want to zero the sensors while the robot is disabled, right before you push it by hand or start a test. Resetting a sensor does not move anything, so it is safe in any mode.

> **The robot just got a reflex**
>
> The wall stop is small, but it is a big idea: the robot is overriding the driver based on what it senses. Real FRC robots do this all the time: an arm refuses to move past its safe limit, an intake stops when a sensor sees a game piece is loaded, a drivetrain slows near the edge of a scoring zone. A human gives the intent, and the robot's sensors keep it safe. When you build autonomous routines in Chapter 12, you will hand the intent over to code too.

> **Print for setup, dashboard for runtime**
>
> Notice there is no `System.out.println` in `updateDashboard()`. Printing twenty values fifty times a second would bury RioLog in a thousand lines a second. Use prints for things that happen once (startup, mode changes) and the dashboard for values that change every loop. In Chapter 10 you will see how good dashboards and logs turn "it is broken somehow" into "it broke right here."

### Arrange the dashboard

Run the program, open SmartDashboard, and arrange the widgets into groups: encoders in one column, gyro next to it, then the rangefinder, the line sensors, and the accelerometer. In SmartDashboard, turn on **View** > **Editable**, then right-click a number widget to change how it is displayed. A **line plot** is especially good for watching the rangefinder's noise and the gyro's drift over time. Save the layout (**File** > **Save**) so it comes back next session.

This is your **sensor dashboard**: one screen showing everything the Explorer can feel. Keep it open whenever the robot runs. When something goes wrong, the first question is always "what did the sensors say?", and now you can answer it at a glance.

---

## 9.9 Which Sensor for Which Job?

You have six sensors (counting left and right separately) and a dashboard full of numbers. The last skill in this chapter is knowing which one to trust for which question.

| Question | Best sensor | Why | Its weakness |
|---|---|---|---|
| How far have I driven? | Encoders | Precise, fast, and do not drift while the wheels are still | Wheel slip makes them overcount |
| How fast am I going? | Encoders (`getRate()`) | Direct measurement of wheel speed | Same slip problem |
| Which way am I facing? | Gyro | Measures rotation directly, unaffected by wheel slip | Drifts slowly over time |
| Am I driving straight? | Gyro (heading should stay constant) | Catches small curves the driver cannot see | Drift over long runs |
| Is something in front of me? | Rangefinder | Measures the world, not the robot | Cones, soft surfaces, steep angles |
| Am I on the line? | Reflectance sensors | Directly sees the floor | Height and sunlight |
| Did I hit something? | Accelerometer | Sees the sudden spike of a collision | Noisy, and gravity is always mixed in |

Notice how often the "weakness" of one sensor is the "strength" of another. The encoders get fooled by slip; the gyro does not care about slip. The gyro drifts; the encoders do not drift while the robot is parked. That is the whole argument for sensor fusion in one table.

> **Two sensors, one question: a kinematics preview**
>
> You can actually estimate the robot's heading from the encoders alone. When the XRP spins in place to the left, the right wheel rolls forward and the left wheel rolls backward. The XRP's wheels are 155 mm apart (its **trackwidth**). The difference in wheel distances divided by the trackwidth gives the turn in **radians**:
>
> ```
> heading (radians) = (rightDistance - leftDistance) / 0.155
> ```
>
> Multiply by `180 / pi` (or use `Math.toDegrees(...)`) to get degrees. Try it in Practice 3 and compare the result to the gyro. The relationship between wheel speeds and robot motion is called **kinematics**, and it gets its own chapter (Chapter 13). On a swerve drive in Chapter 28, the same kind of math handles four wheels that can each point in any direction.

---

## Chapter Summary

> **What you learned in Chapter 9**
>
> * Sensors are the "read" in the read, decide, write loop. Without them, the robot runs **open-loop**. The XRP has wheel **encoders**, a gyro and accelerometer (the **IMU**), an ultrasonic **rangefinder**, and two **reflectance sensors**.
> * An **encoder** counts rotation. The XRP's encoders produce 12 counts per motor turn; through the **48.75:1 gear ratio**, that is **585 counts per wheel turn**. `setDistancePerPulse` lets `getDistance()` report meters directly.
> * In Java, `int / int` is **integer division**: the fraction is thrown away, silently. Make one side a `double` (`585.0`) or use a **cast** (`(double) counts`) to keep it. Put the **unit in every name**.
> * The **gyro** reports heading in degrees, with **counterclockwise positive**, matching WPILib's robot frame. It slowly **drifts**, and it calibrates at power-on, so keep the robot still. The **accelerometer** reads about `1.0` g on Z at rest because it always feels gravity.
> * A **getter** is a public method that reports a value from private state: a read-only window. `get...` returns a value, `is...` returns a `boolean`, and a getter can compute a value (like an average) or take a parameter (`isObstacleWithin(0.20)`).
> * Sensors the drivetrain needs to drive accurately (encoders, gyro) live in `Drivetrain`; the rest live in `Sensors`. `Robot.java` reads facts from both and decides what to do, like refusing to drive forward into a wall.
> * Every sensor is wrong in its own way: encoders slip, gyros drift, rangefinders miss soft and angled surfaces, reflectance sensors depend on height and light. Combining sensors that cover each other's weaknesses is **sensor fusion**.

---

## Exercises

### Practice

**1. Predict the 30 cm push.** Before touching the robot, calculate on paper how many encoder counts the XRP should report after rolling exactly 30 cm forward. (Hint: start from 585 counts per wheel turn and a 60 mm wheel. You should get about 931.)

Now test it. Lay a ruler or tape measure on the table. Press Y to zero the encoders, then, with the robot disabled, slowly push it forward exactly 30 cm. Record the left count, the right count, and both distances in meters. Calculate your error:

```
error % = (measured - predicted) / predicted x 100
```

Do it three times. Is the error the same every time? Are the left and right counts equal? Write two or three sentences on where the error comes from (your push? the wheels? the floor?).

**2. Predict the division.** Write down what each line prints **before** running it. Then run it in a scratch file (or in your `Robot()` constructor) and check:

```java
System.out.println(931 / 585);
System.out.println(931.0 / 585);
System.out.println((double) 931 / 585);
System.out.println((double) (931 / 585));
System.out.println(3 / 4 * 100);
System.out.println(3 * 100 / 4);
```

The fourth and the last two are the tricky ones. Explain in one sentence each why they print what they print.

**3. Two ways to measure a turn.** Zero the sensors with Y. With the robot disabled, rotate the XRP in place by hand about a quarter turn to the left, trying to keep its center in one spot. Read the left distance, right distance, and the gyro heading. Use the formula from the Section 9.9 callout to compute the heading from the encoders, and compare it to the gyro. Which do you trust more for this, and why? (If you want to show the encoder estimate live, add a dashboard widget using `Math.toDegrees(...)`.)

### Build (XRP Explorer)

Give the Explorer its full set of senses and a live sensor dashboard.

1. Update `Drivetrain.java` to the listing in Section 9.5, and remove any temporary encoder fields from `Robot.java`. Build and confirm `BUILD SUCCESSFUL`.
2. Create `Sensors.java` from Section 9.8.
3. Update `Robot.java` to the listing in Section 9.8. Build again.
4. Power on the XRP flat and still, wait for the LED to stop flashing, then run the program. Open SmartDashboard and arrange your sensor dashboard (Section 9.8).
5. Measure your line threshold on your actual floor and tape (Section 9.7), and update `LINE_THRESHOLD` in `Sensors.java`.
6. Run through this sensor check, with the robot **disabled**, and fix anything that fails:

| Test | Expected result |
|---|---|
| Press Y | Both distances and the heading go to `0` |
| Push the robot forward 10 cm | Both distances rise to about `0.10` |
| Turn the robot left a quarter turn | Heading rises to about `90` |
| Hold a book 30 cm in front of the rangefinder | Distance Ahead reads about `0.30` |
| Move the book to 10 cm | Wall Close turns true |
| Slide black tape under each reflectance sensor | That side's On Line turns true |
| Robot sitting flat and still | Accel Z about `1.0`, X and Y near `0` |
| Push the robot forward sharply | One accelerometer axis spikes; write down which one is "forward" |

7. Enable **Teleoperated** and drive slowly toward a wall. The robot should stop about 20 cm away, and still let you back up and turn.

Diagnose anything strange:

- **One distance goes negative when you push forward:** that encoder is counting backward on your robot. Call `setReverseDirection(true)` on that encoder in the `Drivetrain` constructor.
- **Distances are far too big or too small:** check `COUNTS_PER_WHEEL_REV` and `WHEEL_DIAMETER_METERS`, and compare the raw counts to your prediction from Practice 1.
- **Distances are stuck at `0` while counts change:** `setDistancePerPulse` is missing, or `METERS_PER_COUNT` came out as `0` because of integer division somewhere in its formula.
- **Heading goes down when you turn left:** add a minus sign inside `getHeadingDegrees()` (Section 9.4).
- **Heading creeps while the robot sits still, more than a degree a minute:** the gyro calibrated while moving. Power-cycle the XRP on a flat, still surface.
- **The robot will reverse and turn but never drive forward:** Distance Ahead is probably near `0`. Check that the rangefinder cable is plugged in, and that nothing is right in front of it.
- **On Line never turns true:** your threshold is too high for your tape, or the robot is not sitting flat. Re-measure.

When every row of the table passes, the Explorer can sense distance, heading, obstacles, and lines, and you can see all of it live. In Chapter 12, these sensors replace the timer in autonomous: "drive one second" becomes "drive exactly 0.5 meters," and "turn a bit" becomes "turn to 90 degrees."

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. You want the Explorer to drive in a straight line across the room. Which sensor would you use to keep it straight, and why? Which sensor would you use to stop before it reaches the far wall, and why not use the encoders for that?
2. Integer division never causes an error message. Why does that make it more dangerous than a bug that crashes the program? Describe what a teammate would see on the robot if `METERS_PER_COUNT` were accidentally computed with integer division.
3. Why do the encoders and gyro live in `Drivetrain`, while the rangefinder lives in `Sensors`? What would go wrong in later chapters if every sensor were read directly in `Robot.java`?

If any answer feels shaky, re-read Sections 9.3, 9.5, and 9.9.

### Git

Your Explorer can now feel its surroundings. Commit it:

```bash
git add .
git commit -m "Ch9: full sensor dashboard"
git push
```

On GitHub, look at the commit's file list. You should see a brand new `Sensors.java`, plus changes to `Drivetrain.java` and `Robot.java`. Your project now has three classes, each with one job: driving, sensing the world, and deciding what to do. That shape will carry all the way to the competition robot.

---

> **Additional Resources**
>
> * **Getting to know your XRP**: [docs.wpilib.org/en/stable/docs/xrp-robot/getting-to-know-xrp.html](https://docs.wpilib.org/en/stable/docs/xrp-robot/getting-to-know-xrp.html) the official XRP hardware guide: gear ratio, wheel size, encoder counts, IMU calibration, and the channel used by every sensor
> * **WPILib encoders**: [docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/encoders-software.html](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/encoders-software.html) how the `Encoder` class works, including `setDistancePerPulse`, `getDistance`, and `getRate`
> * **WPILib gyroscopes**: [docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/gyros-software.html](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/gyros-software.html) what gyros measure, why they drift, and why the sensor direction must match the turn direction
> * **XRP sensor Javadoc**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/xrp/XRPGyro.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/xrp/XRPGyro.html) every method on `XRPGyro`; the same package has `XRPRangefinder` and `XRPReflectanceSensor`
> * **Java arithmetic operators**: [docs.oracle.com/javase/tutorial/java/nutsandbolts/op1.html](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/op1.html) the official tutorial on `+`, `-`, `*`, `/`, and `%`; try its examples with `int` and `double` to see integer division for yourself

---

*Next up, Chapter 10: Debugging, Error Messages, and Git Archaeology. You will learn to read compile errors and stack traces, use your new sensor dashboard as a probe, and dig through your Git history to find exactly which commit broke the robot.*
