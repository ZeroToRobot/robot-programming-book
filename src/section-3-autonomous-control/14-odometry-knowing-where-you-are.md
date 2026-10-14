# Chapter 14: Odometry: Knowing Where You Are

In Chapter 12 you gave the Explorer its first autonomous routine, and in Chapter 13 you rewrote it in real units: 0.20 meters per second forward, 2 radians per second of turning. Along the way you measured the robot's mistakes with a tape measure. It overshoots a little. It curves a little. And the encoders' `Avg Distance (m)` widget can say exactly `0.50` while the robot sits a few centimeters off to one side of where you meant it to be.

That last one is worth thinking about. The robot knows how far it has driven. It knows which way it is facing. But ask it the most basic question a navigator can ask, "where are you?", and it has no answer. It cannot tell you that it is half a meter ahead of the start line and four centimeters to the left. It only knows about its wheels, not about the floor.

This chapter gives the Explorer that answer. You will combine the encoders and the gyro into a running estimate of the robot's position and heading on the floor, updated fifty times a second. That estimate is called the robot's **pose**, and the process of keeping it up to date is called **odometry**. Then you will put a map of the floor on your screen and watch a little robot icon drive around it, in step with the real one.

You will also find out what odometry cannot do. A robot that drives a perfect square should end up exactly where it started, and you will discover that its odometry never quite agrees. Understanding why is the start of everything from PID control (Chapter 15) to camera-based pose correction (Chapter 33).

On the Java side, you will learn about **objects made of other objects** (a pose *has* a position and *has* a heading), and about **immutable objects**, ones that can never change after they are created. Chapter 13 warned you about methods that quietly change an object you share with someone else. Immutable objects are the cure.

You will need your XRP, the course from Chapter 12, a clear patch of floor about a meter square, masking tape, and a tape measure.

---

## 14.1 Where Am I?

Imagine you are blindfolded in a big empty gym. Someone spins you around a few times, then says, "You are facing the north wall. Walk ten steps forward, turn left, walk five steps." Could you point to where you are now?

You probably could, roughly. You know how long your steps are. You felt yourself turn. So you do the arithmetic in your head: "Ten steps north, then five steps west. I am about seven meters north and three and a half meters west of where I started, facing west." You would not be exactly right, because your steps are not all the same length and your left turn was probably not exactly 90 degrees. But you would be close, and you did it without seeing anything.

That is odometry. In Chapter 12 you met its old name, **dead reckoning**, the way ship navigators found their position before satellites: known speed, known heading, known time, so you can work out where you are. The robot has better instruments than a blindfolded person. Its encoders measure every step precisely, and its gyro feels every turn. All it needs is someone to do the arithmetic, fifty times a second, forever.

### Why "how far" is not enough

Look at what your autonomous routine actually checks:

```java
if (getStepDistanceMeters() >= LEG_1_DISTANCE_METERS) {
```

That is a distance along the robot's path, measured by the wheels. If the robot drives perfectly straight, distance along the path is the same as distance across the floor. But you saw in Chapter 12 that it does not drive perfectly straight. If it curves slightly to the left during leg 1, the wheels still count 0.50 meters, but the robot ends up a little short of the corner and a little to the left of it. The encoders cannot tell the difference between those two places. They only know how much the wheels turned.

Here is a bigger example. Suppose the robot drives 0.5 meters, turns left 90 degrees, and drives another 0.4 meters. The encoders have counted 0.9 meters in total. Now suppose instead that it drove 0.9 meters in a straight line. The encoders also say 0.9 meters, but the robot is in a completely different place. Distance traveled is not position.

To know position, the robot needs to combine **how far** it moved with **which way** it was facing while it moved. That is the whole idea of odometry.

> **What a pose is for**
>
> Almost every advanced thing an FRC robot does depends on knowing its pose. Path following (Chapter 31) compares where the robot is to where the path says it should be. Auto-aim at a goal needs to know the angle from the robot to the goal, which needs the robot's position. Vision (Chapter 33) uses AprilTags to correct the pose. Even something as simple as "drive back to where we started" is impossible without one. A robot that knows its pose can make decisions about the field. A robot that only knows its wheel distances can only follow a script.

---

## 14.2 The Field's Point of View: What a Pose Is

In Chapter 13 you described motion from the **robot's** point of view: x forward, y to the robot's left, counterclockwise positive. That frame moves with the robot. When the robot turns left, "forward" turns with it.

To describe **where** the robot is, you need a frame that does **not** move: one nailed to the floor. That is called the **field frame** (or field coordinate system). It has the same three rules as the robot frame, but they are fixed to the field instead of the robot:

```
          +y
           ^
           |
           |        the robot, somewhere on the floor:
           |           x = 0.50 m
           |           y = 0.40 m
           |           heading = 90 degrees (facing +y)
           |
           +-------------------------> +x
        origin
     (start line)
```

- The **origin** is a point you choose on the floor, where x and y are both zero.
- **+x** points in a direction you choose (the direction the robot faces at the start).
- **+y** points 90 degrees counterclockwise from +x, to the left of the +x direction.
- **Headings** are measured counterclockwise from +x. A heading of `0` faces along +x, `90` faces along +y, and `-90` (or `270`) faces along -y.

For the Explorer, the natural choice is: the **origin is the start line**, and **+x points down leg 1**, the way the robot faces when autonomous begins. That way, the robot's starting pose is simply "zero, zero, facing zero."

A robot's **pose** is three numbers in the field frame:

| Part | Meaning | Unit |
|---|---|---|
| **x** | How far along the field's +x direction the robot's center is | meters |
| **y** | How far along the field's +y direction the robot's center is | meters |
| **θ** ("theta"), the heading | Which way the robot faces, counterclockwise from +x | degrees or radians |

### The course, in field coordinates

Here is leg 1 of the obstacle course from Chapter 12, with the field frame drawn on it:

```
       +y
        ^          =========    <- black tape at about (0.50, 0.40)
        |              ^
        |              |   leg 2
        |              |
        +------------->+  ------> +x
     (0, 0)   leg 1    (0.50, 0)
     START             CORNER
```

Before reading on, try to write down the robot's pose at each point. The answers:

| Where | x (m) | y (m) | Heading (deg) | Why |
|---|---|---|---|---|
| Start line | 0.00 | 0.00 | 0 | The origin, facing +x, by definition |
| End of leg 1 | 0.50 | 0.00 | 0 | Drove 0.50 m along +x |
| After the turn | 0.50 | 0.00 | 90 | Spun in place: position the same, now facing +y |
| At the tape | 0.50 | 0.40 | 90 | Drove 0.40 m along +y |

Notice the turn. The robot's position did not change at all, only its heading. And notice leg 2: the robot drove "forward" from its own point of view, but in the field frame that is the +y direction, because the robot was facing 90 degrees. That translation, from "forward" in the robot frame to "some direction" on the field, is exactly what odometry has to compute.

> **Two frames, one robot**
>
> It is easy to mix these up, so say it out loud: **robot frame** is "forward and left, from where I am facing right now." **Field frame** is "along and across the floor, from the start line, no matter where I am facing." Chassis speeds (Chapter 13) live in the robot frame. Poses live in the field frame. On a real FRC field, WPILib puts the field origin at a corner of the field, with +x pointing away from the blue alliance wall, so every team's code agrees on where (0, 0) is. Your desk has no blue alliance wall, so the start line will do. You will meet the full FRC field frame in Chapter 29, when field-oriented driving turns the driver's stick into field-frame motion.

---

## 14.3 Dead Reckoning, One Loop at a Time

Now for the arithmetic. Every 20 milliseconds, odometry asks two questions:

1. **How far did the robot's center move since last time?** The encoders know. If the left wheel went 1.0 cm further and the right wheel went 1.2 cm further, the center moved the average: 1.1 cm. That is the forward-kinematics formula from Chapter 13 (`(left + right) / 2`), applied to small changes in distance instead of speeds.
2. **Which way was it facing?** The gyro knows.

Then it turns "moved 1.1 cm forward, facing this way" into "moved this much in x and this much in y."

### Splitting a move into x and y

Suppose the robot moves a short distance **d** while facing heading **θ**. If θ is `0`, all of the move is along +x. If θ is `90`, all of it is along +y. In between, the move is split between the two, and the split comes from the two most useful functions in robotics, **cosine** and **sine**:

```
change in x = d × cos(θ)
change in y = d × sin(θ)
```

You do not need trigonometry class to use these. Think of `cos(θ)` as "how much of a forward step goes along x when you face θ," and `sin(θ)` as "how much goes along y." Here are the ones worth knowing by heart:

| Heading θ | cos(θ) | sin(θ) | A forward step goes... |
|---|---|---|---|
| 0 degrees | 1 | 0 | all along +x |
| 90 degrees | 0 | 1 | all along +y |
| 180 degrees | -1 | 0 | all along -x (backward along the field) |
| -90 degrees | 0 | -1 | all along -y |
| 45 degrees | 0.707 | 0.707 | equal parts +x and +y |
| 30 degrees | 0.866 | 0.5 | mostly +x, some +y |

Java has both, as `static` methods in the `Math` class, and they expect **radians** (Chapter 13 again):

```java
double headingRadians = Math.toRadians(30.0);
double changeX = 0.10 * Math.cos(headingRadians);   // about 0.0866
double changeY = 0.10 * Math.sin(headingRadians);   // 0.05
```

> **Check it with the Pythagorean theorem**
>
> In the 30 degree example, the robot moved 0.0866 m in x and 0.05 m in y. The straight-line length of that move should still be 0.10 m. Check: `0.0866² + 0.05² = 0.0075 + 0.0025 = 0.0100`, and the square root of that is `0.10`. Cosine and sine never add or lose distance; they only decide how it is split. Java can do this check in one call: `Math.hypot(0.0866, 0.05)` returns about `0.10`.

### The whole update, in four lines

Each loop, odometry keeps the pose from last time and does this:

```
d       = (change in left distance + change in right distance) / 2
θ       = the gyro's heading right now
x       = x + d × cos(θ)
y       = y + d × sin(θ)
```

That is it. Repeat fifty times a second, and x and y trace out the robot's path across the floor.

Try one loop by hand. The robot has just finished the turn and sits at `(0.50, 0.00)` facing `90` degrees. In the next 20 ms, the left encoder goes up by `0.004` m and the right by `0.004` m:

```
d = (0.004 + 0.004) / 2   = 0.004 m
x = 0.50 + 0.004 × cos(90°) = 0.50 + 0.004 × 0 = 0.500
y = 0.00 + 0.004 × sin(90°) = 0.00 + 0.004 × 1 = 0.004
```

The wheels moved "forward," but the pose moved along +y, because the robot faces +y. Do that a hundred more times and y reaches `0.40`: the tape.

### Why the gyro decides the heading

In Chapter 13 you learned that the encoders can compute the heading on their own: `(right - left) / trackwidth`. So why use the gyro?

You already know the answer: **scrubbing**. When the robot turns, its wheels slide sideways a little, so the encoders think it turned more than it really did. You measured this yourself in Chapter 13's effective-trackwidth practice. The gyro feels the actual rotation of the robot's body, so it does not care whether the wheels slipped.

WPILib's odometry agrees. Its `update` method does compute a turn from the encoders, and then immediately **throws it away** and uses the gyro's heading instead. (You can see this in WPILib's source code, in the `Odometry` class. It is about four lines.) The encoders are trusted for how far the robot moved, and the gyro is trusted for which way it faces. Each sensor does the job it is best at. That is the sensor fusion idea from Chapter 9, in its simplest form.

> **A small curve inside each loop**
>
> The four-line version above assumes the robot moves in a tiny straight line each loop, then turns. Real robots turn and drive at the same time, so in each 20 ms the robot actually moves along a tiny arc. WPILib's odometry uses a slightly fancier formula, called the **pose exponential**, that follows the arc exactly instead of approximating it with a straight segment. For the short moves in one 20 ms loop, the difference is tiny, which is why the simple version is a good way to understand it. If you ever write your own odometry, as some teams do for unusual drivetrains, this is the formula to look up. The method is `Pose2d.exp`, and its Javadoc explains it.

---

## 14.4 Objects Made of Objects: `Translation2d`, `Rotation2d`, and `Pose2d`

You could store a pose as three `double` fields: `poseX`, `poseY`, `poseHeadingDegrees`. That works, and it is how you would have done it in Chapter 7. But Chapter 13 showed you a better way to handle values that belong together: bundle them into an object. WPILib does exactly that, with three classes in the package `edu.wpi.first.math.geometry`.

**`Translation2d`** is a position on the floor: an x and a y, in meters.

```java
Translation2d corner = new Translation2d(0.50, 0.0);
corner.getX();      // 0.5
corner.getY();      // 0.0
corner.getNorm();   // 0.5: the straight-line distance from the origin
```

**`Rotation2d`** is an angle. It stores the angle in radians, and it can hand it back in whatever unit you ask for. You usually create one with a **static factory method**, a `static` method whose job is to build an object for you, and whose name says which unit you are giving it:

```java
Rotation2d facingLeft = Rotation2d.fromDegrees(90.0);
facingLeft.getDegrees();   // 90.0
facingLeft.getRadians();   // 1.5707963267948966
facingLeft.getCos();       // about 0 (a tiny number like 6.1E-17)
facingLeft.getSin();       // 1.0
```

You have used `static` methods since Chapter 8 (`MathUtil.applyDeadband`). A static factory is the same idea, with an object as the result. `Rotation2d.fromDegrees(90.0)` reads like a sentence, and nobody reading it has to wonder whether `90.0` was degrees or radians. Compare `new Rotation2d(90.0)`, which compiles, and means **90 radians** (about fourteen full turns). The constructor takes radians. Prefer the factory with the unit in its name.

**`Pose2d`** is a full pose: a `Translation2d` **and** a `Rotation2d`.

```java
Pose2d atTheTape = new Pose2d(0.50, 0.40, Rotation2d.fromDegrees(90.0));
```

### "Has a" versus "is a"

Look at what `Pose2d` contains. Inside, it has two fields: one `Translation2d` and one `Rotation2d`. A pose **has a** position and **has a** heading. Building a class out of other objects like this is called **composition**, and it is the most common way objects are put together in Java.

You have seen the other way to build on a class, back in Chapter 5: `Robot extends TimedRobot`. That is **inheritance**, and it means `Robot` **is a** `TimedRobot`: it gets all of `TimedRobot`'s methods and can do everything a `TimedRobot` can. The two relationships answer different questions:

| Relationship | Java | Robot example | Test sentence |
|---|---|---|---|
| **Inheritance** ("is a") | `class Robot extends TimedRobot` | Your robot program is a kind of timed robot | "A Robot **is a** TimedRobot." Sounds right. |
| **Composition** ("has a") | a field of another class's type | A pose has a translation and a rotation | "A Pose2d **has a** Translation2d." Sounds right. |

Try the test sentences backward and you will see why `Pose2d` uses composition. "A pose is a translation" is wrong: a pose is more than a position. "A pose has a translation" is right. Your own `Drivetrain` uses composition too: it **has** two motors, two encoders, a gyro, and (in a moment) an odometry object. When you are not sure which to use, try the sentences. "Has a" is the answer far more often than "is a."

> **You have been composing since Chapter 7**
>
> The first time you wrote `private final XRPMotor leftMotor = new XRPMotor(0);` inside `Drivetrain`, you used composition: a drivetrain has a motor. The only thing new here is that the parts are data instead of hardware. A `Pose2d` is built out of smaller objects the same way your robot is built out of smaller parts.

### Reaching inside: method chaining

Because a pose has a translation and a rotation inside it, `Pose2d` gives you getters for the parts:

```java
Translation2d position = atTheTape.getTranslation();
Rotation2d heading = atTheTape.getRotation();
double headingDegrees = heading.getDegrees();
```

Each getter returns an **object**, and you can call a method on an object as soon as you have it, so you can chain the calls together in one line:

```java
double headingDegrees = atTheTape.getRotation().getDegrees();     // 90.0
double distanceFromStart = atTheTape.getTranslation().getNorm();  // about 0.64
```

This is called **method chaining**. Read it left to right, one dot at a time: "Take the pose, get its rotation, then get that rotation in degrees." Each dot works on whatever the previous call returned. `Pose2d` also has two shortcuts you will use all the time, `getX()` and `getY()`, which skip the middle step:

```java
atTheTape.getX();    // 0.5, same as atTheTape.getTranslation().getX()
atTheTape.getY();    // 0.4
```

> **A common beginner mistake**
>
> ```java
> double heading = atTheTape.getRotation();   // ERROR: incompatible types
> ```
>
> `getRotation()` returns a `Rotation2d`, not a `double`, and Java will not quietly turn an angle object into a number, because it would not know which unit you wanted. The compiler message is `incompatible types: Rotation2d cannot be converted to double`. The fix is one more link in the chain: `.getDegrees()` or `.getRadians()`. Hover over a method in VS Code (Chapter 11) to see its return type before you chain onto it.

### Printing a pose

Like the classes in Chapter 13, all three print themselves in a readable form:

```java
System.out.println(atTheTape);
```

```
Pose2d(Translation2d(X: 0.50, Y: 0.40), Rotation2d(Rads: 1.57, Deg: 90.00))
```

You can see the composition right there in the printout: a `Pose2d` with a `Translation2d` and a `Rotation2d` inside it.

---

## 14.5 Objects That Never Change

Here is something you will not find in `Pose2d`, `Translation2d`, or `Rotation2d`: a `set` method. There is no `setX`, no `setRotation`, no way to change any of their values after they are created.

That is on purpose. These are **immutable** classes: once an object is built, it stays exactly the same until the program ends. "Immutable" means "cannot change."

How does a class make itself immutable? You already know both tools:

1. Every field is **`private`** (Chapter 7), so no code outside the class can reach in.
2. Every field is **`final`** (Chapter 10), so not even the class's own methods can reassign it after the constructor runs.

If you open `Pose2d` in WPILib's source code, those are its two fields:

```java
private final Translation2d m_translation;
private final Rotation2d m_rotation;
```

(The `m_` prefix is WPILib's naming habit for fields. You do not need to copy it.)

### Then how do you "move" a pose?

If a pose can never change, how does odometry move the robot? The same way `times` worked in Chapter 13: every method that sounds like a change **returns a new object** and leaves the original alone.

```java
Pose2d start = new Pose2d();   // (0, 0), facing 0
Pose2d turned = start.rotateBy(Rotation2d.fromDegrees(90.0));

System.out.println(start);     // still (0, 0), 0 degrees
System.out.println(turned);    // (0, 0), 90 degrees
```

Chapter 13 sorted methods into two kinds: ones that **change** the object (`desaturate`) and ones that **return a new** object (`times`). An immutable class is simply a class where **every** method is the second kind. That makes the rule easy to remember: if you are holding a `Pose2d`, nothing will ever change it out from under you.

And the bug from Chapter 13, ignoring the result, is still the bug to watch for:

```java
// BUG: rotateBy returns a new pose, and it is thrown away.
start.rotateBy(Rotation2d.fromDegrees(90.0));
System.out.println(start);   // still facing 0
```

### Why immutability is worth it

Remember the two-names-for-one-object puzzle from Chapter 13? `b = a`, then `b.desaturate(...)`, and `a` changed too, because both names pointed to the same object. That kind of surprise **cannot happen** with an immutable object. Two variables can still point to the same `Pose2d`, but since neither one can change it, it does not matter. Sharing becomes completely safe.

That has a very practical payoff for robot code: **constants**. In Chapter 8 you learned to write `private static final double` constants. Can you make a constant pose?

```java
private static final Pose2d START_POSE = new Pose2d();
```

`final` here only means the **variable** `START_POSE` can never point to a different object. It says nothing about whether the object itself can change. If `Pose2d` had a `setX` method, anyone could write `START_POSE.setX(3.0)`, and your "constant" would quietly stop being constant. Because `Pose2d` is immutable, `static final` really does mean constant, all the way down.

> **A `final` variable is not a frozen object**
>
> This trips up experienced programmers too. `final` freezes the **reference** (which object the name points to), not the **object**. A `private static final DifferentialDriveWheelSpeeds TOP_SPEEDS = ...` constant could still be changed by calling `TOP_SPEEDS.desaturate(...)`, because `DifferentialDriveWheelSpeeds` is mutable. A `static final` constant is only truly constant if its object is immutable (like `Pose2d`) or is a primitive (like `double`). This is one reason WPILib made the geometry classes immutable: poses get passed around between odometry, path following, vision, and the dashboard, and every one of those parts needs to trust that a pose it was handed will stay put.

You will build one immutable class of your own in Practice 3, and you will find it takes almost no extra work: make the fields `private final`, set them in the constructor, give it getters, and leave out the setters.

---

## 14.6 `DifferentialDriveOdometry`: Dead Reckoning, in a Class

WPILib packages the update loop from Section 14.3 into a class, `DifferentialDriveOdometry`, in `edu.wpi.first.math.kinematics`. You give it three readings each loop, and it keeps the pose.

**Creating it** takes the gyro's current heading and both encoders' current distances, so it knows where the counting starts:

```java
DifferentialDriveOdometry odometry = new DifferentialDriveOdometry(
    gyroHeading,            // a Rotation2d
    leftDistanceMeters,
    rightDistanceMeters);
```

Without a fourth argument, the robot starts at pose `(0, 0)`, facing `0`. You can pass a starting `Pose2d` as a fourth argument if you want it to start somewhere else.

**Updating it** every loop takes the same three readings, and it does the math from Section 14.3:

```java
odometry.update(gyroHeading, leftDistanceMeters, rightDistanceMeters);
```

**Reading it** at any time:

```java
Pose2d pose = odometry.getPoseMeters();
```

The "Meters" in the name is a reminder of the unit: the translation inside is in meters.

Notice what the odometry object does **not** need: the trackwidth. Since it takes the heading from the gyro, it never has to compute a turn from the encoders. That is one less measurement to get wrong.

> **Two habits odometry depends on**
>
> WPILib's documentation spells out two rules, and both are things you set up in Chapter 9. First, when the robot drives forward, **both** encoder distances must go **up**. If one counts backward, odometry thinks one wheel is reversing and the robot's center barely moves. Second, the heading must **increase when the robot turns left** (counterclockwise). If your gyro reads the other way, the pose will curve right every time the real robot curves left. You checked both in Chapter 9. If you added a minus sign to fix your gyro back then, it lives in `getHeadingDegrees()`, so the odometry must get its heading from that method, not straight from the gyro. You will see this in the listing below.

### The teleport problem

In Chapter 12, you were careful **never** to reset the encoders in the middle of the routine. Instead, `startStep()` remembers a starting distance and subtracts it. Chapter 12 promised that this would matter for odometry. Here is why.

Odometry works on **changes**: "the left encoder read 0.500 last loop and 0.504 this loop, so it moved 0.004." Suppose the robot is at the corner, `(0.50, 0.00)`, and some code resets the encoders to zero. On the next loop, odometry sees "the left encoder read 0.500 last loop and 0.000 this loop." As far as it knows, the robot just drove **half a meter backward** in 20 milliseconds. The pose jumps from `(0.50, 0.00)` back to `(0.00, 0.00)`, and the robot icon on your map teleports. The real robot did not move at all.

The gyro has the same problem. Reset it, and odometry sees the heading suddenly snap to zero, and every move after that goes in the wrong direction.

WPILib's documentation puts it as a rule: **if you reset the gyro or the encoders, you must also reset the odometry**, with a method called `resetPosition`:

```java
odometry.resetPosition(gyroHeading, leftDistanceMeters, rightDistanceMeters, newPose);
```

It says, "Here are the sensor readings right now. Count from these, and call this spot `newPose`."

There are two times the Explorer resets its sensors: in `autonomousInit()`, and when you press Y. Both currently call `resetEncoders()` and `resetHeading()` from `Robot.java`. After this chapter, both of those calls would be bugs waiting to happen, because nothing would tell the odometry.

So instead of trusting everyone to remember the rule, `Drivetrain` will make it **impossible to break**. It gets one new public method, `resetPose(Pose2d)`, that resets the encoders, the gyro, and the odometry together. And `resetEncoders()` and `resetHeading()` become **`private`**, so no code outside `Drivetrain` can call one without the others. This is encapsulation from Chapter 7 doing its real job: the class keeps its own rules, so callers cannot get them wrong. And it is the same idea as Chapter 10's `final` fields: move the bug from "the robot does something strange at runtime" to "the code does not compile."

### The new `Drivetrain.java`

Here is `Drivetrain` with odometry added, starting from the end of Chapter 13. The changes are in four places: imports, one new field (assigned in the constructor), a new **Odometry** section, and the two reset methods, which are now `private` and have moved down to the bottom of the class. Type the new parts, do not paste:

```java
package frc.robot;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.DifferentialDriveKinematics;
import edu.wpi.first.math.kinematics.DifferentialDriveOdometry;
import edu.wpi.first.math.kinematics.DifferentialDriveWheelSpeeds;
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
    private static final double TRACKWIDTH_METERS = 0.155;      // wheel center to wheel center

    // Measured at full power on our floor (Section 13.8). Re-measure with new batteries.
    private static final double MAX_WHEEL_SPEED_METERS_PER_SECOND = 0.28;

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

    // Keeps track of where the robot is on the floor. Created in the constructor,
    // after the encoders know their distance per pulse.
    private final DifferentialDriveOdometry odometry;

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
        diffDrive.arcadeDrive(0.0, 0.0);
    }

    // Driving by velocity

    /**
     * Drive the robot at a chassis velocity, using inverse kinematics.
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

        diffDrive.tankDrive(
            speedToPower(wheelSpeeds.leftMetersPerSecond),
            speedToPower(wheelSpeeds.rightMetersPerSecond),
            false);
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
     * Convert a wheel speed into a motor power. A rough estimate: it assumes power
     * and speed are proportional, which ignores friction. Chapter 16 replaces it.
     */
    private double speedToPower(double metersPerSecond) {
        return metersPerSecond / MAX_WHEEL_SPEED_METERS_PER_SECOND;
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

Walk through what changed since Chapter 13:

- **Three new imports**: `Pose2d` and `Rotation2d` from `geometry`, and `DifferentialDriveOdometry` from `kinematics`.
- **One new field, `odometry`**, that is `final` but has no `= new ...` on its line. It gets its value in the constructor instead, just like `drivetrain` and `sensors` in `Robot.java` (Chapter 12). Why wait? Field initializers run **before** the constructor body. If `odometry` were created in its field line, it would read the encoders before `setDistancePerPulse` had run, and it would start counting in raw counts instead of meters. Creating it on the last line of the constructor guarantees every sensor is set up first. Java still checks that a `final` field is assigned exactly once, so if you forget the line, the code does not compile.
- **`getRotation2d()`**, a computed getter (Chapter 9) that turns `getHeadingDegrees()` into a `Rotation2d` with the static factory from Section 14.4. Odometry gets its heading from here, so a sign fix in `getHeadingDegrees()` reaches it automatically. (`XRPGyro` has its own `getRotation2d()` method, and WPILib's examples often call it directly. On your robot, going through your own method keeps one source of truth.)
- **`updateOdometry()`** does one thing: feed the three readings to `odometry.update`. `Robot.java` will call it every loop.
- **`getPose()`** returns the pose. It is a getter that returns an immutable object, so the caller can do anything they like with it and the odometry is never affected.
- **`resetPose(Pose2d)`** resets the sensors and the odometry in the right order: sensors first, then `resetPosition` with the fresh readings. It passes the actual readings (`getLeftDistanceMeters()` and so on) rather than assuming they are exactly zero, so it is correct even if a reading is a hair off.
- **`resetEncoders()` and `resetHeading()` are now `private`.** This will break two places in `Robot.java`, and that is the point: the compiler will show you every caller that needs to change.

> **Why not just update odometry inside `getPose()`?**
>
> It is tempting to make `getPose()` call `odometry.update(...)` first, so the pose is always fresh. Do not. Odometry needs to be updated **exactly once per loop**, at a steady rhythm. If `getPose()` updated it, then calling `getPose()` three times in one loop would update three times (harmless here, but confusing), and **not** calling it during some loop would skip an update (and if the robot moved, that move is folded into the next update less accurately). Keep "update" and "read" separate: one call to `updateOdometry()` per loop, as many calls to `getPose()` as you like. In Chapter 19, when `Drivetrain` becomes a command-based subsystem, the update will move into a method called `periodic()` that WPILib calls for you once per loop.

---

## 14.7 Watching the Robot on a Map: `Field2d`

A pose is three numbers, and you can put them on SmartDashboard like any other numbers. But a robot's position is a picture, not a list. WPILib has a class for drawing it: **`Field2d`**, in `edu.wpi.first.wpilibj.smartdashboard`. It represents a map of the field with a robot drawn on it. Your code tells it where the robot is, and a dashboard draws it.

Using it takes three lines in three places, and they follow the "create once, use every loop" rule you have used since Chapter 5:

```java
// A field: created once.
private final Field2d field = new Field2d();
```

```java
// In the Robot() constructor: publish it once.
SmartDashboard.putData("Field", field);
```

```java
// In updateDashboard(), every loop: move the robot icon.
field.setRobotPose(drivetrain.getPose());
```

`putData` is new. You have used `putNumber`, `putBoolean`, and `putString`, which send one value each time you call them. `putData` is for objects that know how to describe themselves to a dashboard, and it only needs to be called once. After that, the `Field2d` object keeps the dashboard up to date by itself whenever you call `setRobotPose`.

### Where to see it

The SmartDashboard app you have been using since Chapter 5 does not have a field map widget. But you already have a window open that does: the **Simulation GUI**, the window that appears whenever you run your XRP code (Chapter 8 used it for controller setup). It is built on the same tools as WPILib's **Glass** dashboard, and it can show any value your robot publishes, including a `Field2d`.

1. Run your program as usual.
2. In the Simulation GUI window, open the **NetworkTables** menu at the top, then **SmartDashboard**, then click **Field**. A new window opens with a field and a robot drawn on it.
3. The map starts out drawn as a full-size FRC field, more than 16 meters long, so your XRP's whole course is a few pixels in one corner. Right-click the title bar of the Field window to open its settings. Set the field image to none (or leave it if you like the picture), set the field size to **2 meters by 2 meters**, and set the robot size to about **0.2 meters**. Now the map is a two-meter square of floor, and your robot is drawn at a realistic size.
4. Drag and resize the window where you can see it. The Simulation GUI remembers its layout (in a file called `imgui.ini` in your project folder) for the next time you run.

The map draws the field origin at its **bottom-left corner**, with +x to the right and +y up. Your robot starts at `(0, 0)`, so it appears at that corner, pointing right. If you drive forward, it moves right. Turn left, and it rotates to point up. Same frame as Section 14.2, now on screen.

> **One map, many viewers**
>
> `Field2d` does not care who draws it. The same object can be shown in the Simulation GUI, in Glass, in Shuffleboard, and in **AdvantageScope** (which you opened briefly in Chapter 10). Because your data log records everything published to the dashboard, AdvantageScope can even replay a run from the log file and show the robot driving across the map after the fact. Chapter 24 does exactly that. For now, the Simulation GUI is the quickest way to watch it live.

### Drawing the plan, too

A field map gets really useful when you can see the robot **and** where it was supposed to go. `Field2d` can draw extra objects besides the robot. You ask for one by name with `getObject`, and give it one or more poses:

```java
field.getObject("Course").setPoses(START_POSE, CORNER_POSE, LINE_POSE);
```

`getObject("Course")` returns an object of type `FieldObject2d` that the field will draw (creating it the first time you ask), and `setPoses` takes as many poses as you want to give it. The field draws each one as a ghost robot outline. This is method chaining again: `getObject` returns an object, and `setPoses` is called on it, all in one line. Since the course never changes, this goes in the constructor, once.

And look at those three constants. They are `static final Pose2d` constants, which is only safe because `Pose2d` is immutable (Section 14.5).

### The full `Robot.java`

Here is the complete `Robot.java` after this chapter, so you can check yours line by line. It starts from the end of Chapter 13. The changes for this chapter are: four new imports, a new constant group for the course poses, the `field`, two lines in the constructor, the `robotPeriodic()` changes, an **Odometry** block in `updateDashboard()`, the new `resetPose` call in `autonomousInit()`, and the pose in `startStep()`'s log message.

```java
package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.XboxController;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;

public class Robot extends TimedRobot {

    // Constants: one shared copy each, never reassigned.
    private static final int DRIVER_CONTROLLER_PORT = 0;
    private static final double STICK_DEADBAND = 0.1;
    private static final double FULL_SPEED_SCALE = 1.0;
    private static final double SLOW_MODE_SCALE = 0.5;
    private static final double WALL_STOP_DISTANCE_METERS = 0.20;
    private static final double TURN_SCALE = 0.7;
    private static final double MAX_REVERSE_SPEED = 0.5;

    // Autonomous: obstacle course leg 1. Measured on our floor; re-test on new surfaces.
    private static final double AUTO_DRIVE_METERS_PER_SECOND = 0.20;
    private static final double AUTO_TURN_RADIANS_PER_SECOND = 2.0;   // about 115 deg per s
    private static final double LEG_1_DISTANCE_METERS = 0.50;
    private static final double TURN_HEADING_DEGREES = 90.0;
    private static final double LEG_2_MAX_DISTANCE_METERS = 1.00;
    private static final double STEP_TIMEOUT_SECONDS = 7.0;

    // The course in field coordinates. Origin: the start line, +x down leg 1.
    // Pose2d is immutable, so these really are constants.
    private static final double LINE_DISTANCE_METERS = 0.40;   // corner to tape, measured
    private static final Pose2d START_POSE = new Pose2d();
    private static final Pose2d CORNER_POSE = new Pose2d(
        LEG_1_DISTANCE_METERS, 0.0, Rotation2d.fromDegrees(TURN_HEADING_DEGREES));
    private static final Pose2d LINE_POSE = new Pose2d(
        LEG_1_DISTANCE_METERS, LINE_DISTANCE_METERS, Rotation2d.fromDegrees(TURN_HEADING_DEGREES));

    // Autonomous steps, in order.
    private static final int STEP_NOT_STARTED = 0;
    private static final int STEP_DRIVE_LEG_1 = 1;
    private static final int STEP_TURN_LEFT = 2;
    private static final int STEP_DRIVE_TO_LINE = 3;
    private static final int STEP_DONE = 4;

    // The robot's parts, created once.
    private final Drivetrain drivetrain;
    private final Sensors sensors;
    private final XboxController controller = new XboxController(DRIVER_CONTROLLER_PORT);
    private final Timer autoTimer = new Timer();   // times the whole routine
    private final Timer stepTimer = new Timer();   // times the current step
    private final Field2d field = new Field2d();   // the map on the dashboard

    // Remembered from loop to loop.
    private boolean wasBlocked = false;
    private int autoStep = STEP_NOT_STARTED;
    private double stepStartDistanceMeters = 0.0;

    public Robot() {
        // Start the flight recorder first, so it captures everything after this.
        DataLogManager.start();
        DriverStation.startDataLog(DataLogManager.getLog());

        DataLogManager.log("XRP Explorer started!");
        SmartDashboard.putString("Mode", "Starting");

        drivetrain = new Drivetrain();
        sensors = new Sensors();

        // The field map: publish once, and draw where the course should take the robot.
        SmartDashboard.putData("Field", field);
        field.getObject("Course").setPoses(START_POSE, CORNER_POSE, LINE_POSE);
    }

    @Override
    public void robotPeriodic() {
        // Odometry first, every loop, in every mode, so the pose never misses a move.
        drivetrain.updateOdometry();

        // Y puts the robot back at the start pose. Works even while disabled.
        if (controller.getYButtonPressed()) {
            drivetrain.resetPose(START_POSE);
            DataLogManager.log("Pose reset to start");
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

        // Kinematics: how the robot is moving, measured by the encoders
        ChassisSpeeds measured = drivetrain.getChassisSpeeds();
        SmartDashboard.putNumber("Measured Forward (m per s)", measured.vxMetersPerSecond);
        SmartDashboard.putNumber("Measured Turn (deg per s)",
            Math.toDegrees(measured.omegaRadiansPerSecond));

        // Odometry: where the robot is on the floor
        Pose2d pose = drivetrain.getPose();
        SmartDashboard.putNumber("Pose X (m)", pose.getX());
        SmartDashboard.putNumber("Pose Y (m)", pose.getY());
        SmartDashboard.putNumber("Pose Heading (deg)", pose.getRotation().getDegrees());
        field.setRobotPose(pose);

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

        // Autonomous
        SmartDashboard.putNumber("Auto Step", autoStep);
        SmartDashboard.putNumber("Step Time (s)", stepTimer.get());
        SmartDashboard.putNumber("Step Distance (m)", getStepDistanceMeters());
    }

    @Override
    public void disabledInit() {
        SmartDashboard.putString("Mode", "Disabled");
        DataLogManager.log("Mode: Disabled");
    }

    @Override
    public void disabledPeriodic() {}

    @Override
    public void autonomousInit() {
        SmartDashboard.putString("Mode", "Autonomous");
        DataLogManager.log("Mode: Autonomous");

        // Every run starts here: on the start line, facing down leg 1.
        drivetrain.resetPose(START_POSE);
        autoTimer.restart();
        startStep(STEP_DRIVE_LEG_1);
    }

    @Override
    public void autonomousPeriodic() {
        switch (autoStep) {
            case STEP_DRIVE_LEG_1:
                // Drive straight ahead until the encoders say we have gone far enough.
                drivetrain.drive(AUTO_DRIVE_METERS_PER_SECOND, 0.0);
                if (getStepDistanceMeters() >= LEG_1_DISTANCE_METERS) {
                    startStep(STEP_TURN_LEFT);
                }
                break;

            case STEP_TURN_LEFT:
                // Spin in place until the gyro says we face 90 degrees (left is positive).
                drivetrain.drive(0.0, AUTO_TURN_RADIANS_PER_SECOND);
                if (drivetrain.getHeadingDegrees() >= TURN_HEADING_DEGREES) {
                    startStep(STEP_DRIVE_TO_LINE);
                }
                break;

            case STEP_DRIVE_TO_LINE:
                // Drive ahead until either line sensor sees the tape.
                drivetrain.drive(AUTO_DRIVE_METERS_PER_SECOND, 0.0);
                if (sensors.isLeftOnLine() || sensors.isRightOnLine()) {
                    DataLogManager.log("Line found after " + getStepDistanceMeters() + " m");
                    startStep(STEP_DONE);
                } else if (getStepDistanceMeters() >= LEG_2_MAX_DISTANCE_METERS) {
                    DataLogManager.log("No line within " + LEG_2_MAX_DISTANCE_METERS + " m, stopping");
                    startStep(STEP_DONE);
                }
                break;

            case STEP_DONE:
            default:
                drivetrain.stop();
                break;
        }

        // Safety net: no step may run longer than STEP_TIMEOUT_SECONDS.
        if (autoStep != STEP_DONE && stepTimer.hasElapsed(STEP_TIMEOUT_SECONDS)) {
            DataLogManager.log("Auto step " + autoStep + " TIMED OUT");
            startStep(STEP_DONE);
        }
    }

    /**
     * Move autonomous to a new step: remember where it started and restart its timer.
     *
     * @param newStep the step to start, one of the STEP_ constants
     */
    private void startStep(int newStep) {
        autoStep = newStep;
        stepStartDistanceMeters = drivetrain.getAverageDistanceMeters();
        stepTimer.restart();
        DataLogManager.log("Auto step " + newStep + " started at " + autoTimer.get() + " s, "
            + drivetrain.getPose());
    }

    /** How far the robot has driven since the current step started, in meters. */
    private double getStepDistanceMeters() {
        return drivetrain.getAverageDistanceMeters() - stepStartDistanceMeters;
    }

    @Override
    public void teleopInit() {
        SmartDashboard.putString("Mode", "Teleop");
        DataLogManager.log("Mode: Teleop");
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

        // Log the moment the wall stop turns on or off, not every loop.
        if (blocked && !wasBlocked) {
            DataLogManager.log("Wall stop ON at " + sensors.getDistanceAheadMeters() + " m");
        }
        if (!blocked && wasBlocked) {
            DataLogManager.log("Wall stop OFF");
        }
        wasBlocked = blocked;

        // Write. Turns are scaled down so aiming is easier.
        // Reverse is limited because nothing watches behind the robot.
        double limitedForward = Math.max(safeForward, -MAX_REVERSE_SPEED);
        drivetrain.arcadeDrive(limitedForward * speedScale, rotation * speedScale * TURN_SCALE);

        SmartDashboard.putBoolean("Slow Mode", speedScale == SLOW_MODE_SCALE);
        SmartDashboard.putBoolean("Blocked", blocked);
    }
}
```

Walk through what changed since Chapter 13:

- **A new constant group: the course.** `LINE_DISTANCE_METERS` is how far your tape is from the corner; measure yours and put in your number. The three poses are built **from** the other constants, so if you change `LEG_1_DISTANCE_METERS`, the map changes with it. These constants come **after** the autonomous constants on purpose: Java sets up `static` constants from top to bottom, and using a constant on a line above where it is declared is a compile error (`illegal forward reference`).
- **`field`**, created once in its field line and published once in the constructor with `putData`. The constructor also draws the course on the map.
- **`robotPeriodic()`** calls `drivetrain.updateOdometry()` first, before anything reads the pose. It runs in **every** mode, including disabled, so if you pick up the robot and put it down somewhere, or push it by hand, the odometry still tracks every wheel turn.
- **The Y button now calls `resetPose(START_POSE)`** instead of resetting the encoders and gyro separately. (Those two lines would not compile anymore anyway.) Y now means "the robot is on the start line, facing down leg 1."
- **`autonomousInit()` calls `resetPose(START_POSE)`** for the same reason. The rest of the routine is unchanged: the turn still checks `getHeadingDegrees()`, and the steps still measure their distance by subtracting. Odometry watches the routine; it does not drive it yet.
- **`updateDashboard()` has an Odometry block**: three number widgets and the `setRobotPose` call. `pose` is a local variable holding an immutable object, read once and used four times. Notice the chain in `pose.getRotation().getDegrees()`.
- **`startStep()` logs the pose.** Every step change now records where the robot was, which turns your terminal log into a map of the run.

> **Two headings that disagree on purpose**
>
> Put `Heading (deg)` and `Pose Heading (deg)` next to each other, and spin the robot left a full turn and a quarter. `Heading (deg)` reads about `450`, because the gyro keeps counting, as you saw in Chapter 9. `Pose Heading (deg)` reads about `90`. When the odometry combines angles, `Rotation2d` does the math with cosine and sine, and the answer always comes out between `-180` and `180`. Both are correct: one answers "how far have I turned in total?" and the other answers "which way am I facing?" This is the "handles angles correctly either way" promise from Chapter 9. Be careful, though: a `Rotation2d` you build yourself with `Rotation2d.fromDegrees(450.0)` keeps the `450` you gave it. It is when angles are **combined** that they come out tidy.

### Try it: push the robot by hand

Build and run. Open the Field window and arrange the three `Pose` widgets on SmartDashboard. Leave the robot **disabled**. Press Y to reset the pose, then do these by hand, slowly, with the wheels on the table:

1. **Push the robot straight forward about 20 cm.** `Pose X (m)` climbs to about `0.20`, and the robot icon slides right on the map.
2. **Rotate it left a quarter turn in place.** `Pose Heading (deg)` goes to about `90`, and the icon turns to point up. `Pose X` and `Pose Y` barely change.
3. **Push it forward again about 20 cm.** Now `Pose Y (m)` climbs, not X. The icon moves **up** the map. Forward for the robot is +y for the field, because it faces 90 degrees.
4. **Lift the robot straight up, spin both wheels forward with your fingers, and put it back down.** The icon drives forward on the map, even though the robot did not move. Odometry trusts the wheels.
5. **Slide the robot sideways a few centimeters** (gently). The icon does not move at all. A differential drive cannot move sideways (Chapter 13), so odometry assumes it never does.

Those last two are odometry's blind spots in miniature. It believes what the encoders and gyro tell it, and it cannot see the floor.

If the icon moves the wrong way in step 1 or turns the wrong way in step 2, see the diagnosis list in the Build exercise before going further.

### Run the course

Now put the robot on the start line, run **Autonomous**, and watch both the robot and the map. The icon should trace leg 1, turn, and stop near the third ghost outline. The terminal log now says where each step started:

```
Mode: Autonomous
Auto step 1 started at 0.0 s, Pose2d(Translation2d(X: 0.00, Y: 0.00), Rotation2d(Rads: 0.00, Deg: 0.00))
Auto step 2 started at 2.62 s, Pose2d(Translation2d(X: 0.50, Y: 0.01), Rotation2d(Rads: 0.02, Deg: 1.15))
Auto step 3 started at 3.55 s, Pose2d(Translation2d(X: 0.51, Y: 0.01), Rotation2d(Rads: 1.59, Deg: 91.10))
Line found after 0.38 m
Auto step 4 started at 5.61 s, Pose2d(Translation2d(X: 0.50, Y: 0.39), Rotation2d(Rads: 1.59, Deg: 91.29))
```

(Your numbers will differ. Read them anyway.) Look at step 2's line. The robot drove "0.50 m straight," but odometry says it ended with `Y: 0.01` and a heading of about 1 degree: it curved slightly left. That is the drift you measured with a tape measure in Chapter 12, now measured by the robot itself. And look at the last line. The robot believes it stopped at about `(0.50, 0.39)`. Measure where it really is with your tape measure. How close is the robot's belief to the truth?

---

## 14.8 The Square That Never Closes

Here is the classic odometry experiment, and every FRC programmer should do it at least once.

Tape a **50 cm by 50 cm square** on the floor. Put the robot at one corner, centered on it, facing along one side. Press Y to reset the pose. Then drive the square in teleop, slowly, following the tape: forward 50 cm, turn left, forward 50 cm, turn left, and so on, until the robot is back at the starting corner, facing the way it started. Line it up as carefully as you can, by eye.

The robot is back where it started. In a perfect world, odometry would read `(0, 0)` and `0` degrees. It will not. You will see something like:

```
Pose X (m):           0.03
Pose Y (m):          -0.02
Pose Heading (deg):   2.4
```

A few centimeters and a few degrees off, after one lap. Drive the square again without resetting, and the error usually grows. After five laps it might be ten centimeters or more. That growth is called **drift**: odometry's errors do not cancel out, they pile up. Practice 2 asks you to measure it properly.

### Where the error comes from

Every number odometry uses comes from a sensor, and every sensor is a little bit wrong in its own way (Chapter 9's "every sensor lies a little"). Here are the main culprits, in roughly the order they matter on an XRP:

1. **Wheel slip.** When a wheel spins without the robot moving the same distance (a fast start, a slick spot, pushing against something), the encoder counts distance the robot never traveled. You saw this in step 4 of the hand test, in an extreme form.
2. **Scrubbing during turns.** When the robot spins in place, the wheels slide sideways and forward a little. Since odometry takes the heading from the gyro, scrubbing does not fool the heading. But it can nudge the robot's center a few millimeters during each turn that the encoders never see.
3. **Wheel size.** Odometry turns encoder counts into meters using `WHEEL_DIAMETER_METERS = 0.060`. If your real wheels are 59 mm because the tires are worn, or squish under the robot's weight, every distance is about 1.7 percent too long. That is almost a centimeter in a 50 cm leg.
4. **Gyro drift.** The gyro's heading slowly creeps, even when the robot is still (Chapter 9). Small, but it never stops.
5. **Sampling.** Odometry only looks every 20 ms. During a fast, jerky move, a lot can happen between looks. The arc math (Section 14.3) helps, but it assumes smooth motion.
6. **The floor and the world.** Bumps, carpet seams, cables, and (on a real field) other robots pushing yours. Odometry assumes a flat floor and a robot nobody touches.

> **Small angle, big miss**
>
> Of all the errors, heading errors do the most damage, because they get **multiplied** by distance. If the robot thinks it is facing 0 degrees but is really facing 2 degrees, then after driving 0.5 m it is off to the side by `0.5 × sin(2°)`, about 1.7 cm. After driving 5 meters, it is off by about 17 cm. A distance error stays the same size; a heading error grows with every meter you drive. This is why FRC teams spend real money on good gyros, and why the navX on the Mini Swerve (Chapter 29) matters so much.

### Can you reset your way out of it?

Drift is unavoidable, but there is a clever trick to limit it: **reset the pose when you know exactly where you are.** At the start of every autonomous routine, your robot sits on the start line, so you call `resetPose(START_POSE)`. Nothing is more certain than that.

The same idea works in the middle of a routine, if the robot can sense a **landmark** whose position you know. Your course already has one: the black tape line. When the line sensors see it, the robot knows its y position is exactly `LINE_DISTANCE_METERS`, whatever the odometry thought. Correcting the pose at a landmark is how navigation has worked for centuries: sailors reckoned their position by arithmetic, then corrected it every time they sighted a lighthouse.

On a real FRC field, the lighthouses are **AprilTags**: printed square markers at known spots around the field. A camera that sees one can work out the robot's pose directly, and WPILib's **pose estimators** blend that camera pose with odometry, trusting odometry for smooth moment-to-moment tracking and trusting the camera to pull the slow drift back into line. You will build exactly that in Chapters 30 and 33.

> **Odometry is a belief, not a fact**
>
> It helps to think of `getPose()` as the robot's **belief** about where it is: "Based on everything my wheels and gyro have told me since the last reset, I think I am here." A good belief, usually close, always drifting. Every decision your code makes from a pose should leave a little room for that belief to be wrong: a tolerance, a timeout, a landmark check. Chapter 12's habit of always having a safety net applies here too.

---

## 14.9 Odometry Everywhere

You built odometry on a two-wheel robot on your desk. Here is where it goes from here.

- **Chapter 15, PID control.** Your routine still drives "until the encoders say 0.5 m" and turns "until the gyro says 90." With a pose, you can steer the robot to stay on the line `y = 0` during leg 1, correcting the curve you saw in the log. PID control is the tool that turns "I am 1 cm left of where I should be" into "steer a little right."
- **Chapter 17, simulation.** A simulated XRP produces simulated encoder and gyro readings, and your odometry and `Field2d` work on them without a single change. You will compare a simulated run with a real one on the same map.
- **Chapter 30, swerve odometry.** `SwerveDriveOdometry` takes four wheel distances **and** four wheel angles instead of two distances, and does the same "add up tiny moves" job. Everything you learned about poses, the field frame, drift, and resetting carries straight over. Only the "how far did I move this loop" part changes.
- **Chapter 31, path following.** PathPlanner compares the robot's pose to where the path says it should be, fifty times a second, and produces a `ChassisSpeeds` to close the gap. That is your `drive(ChassisSpeeds)` from Chapter 13, fed by your `getPose()` from this chapter.
- **Chapter 33, vision.** AprilTag cameras correct the pose, as in Section 14.8.

Look at how your code is set up for all of this. `Robot.java` asks the drivetrain two questions, "where are you?" (`getPose()`) and "please be here" (`resetPose(...)`), and gives it one instruction, "move like this" (`drive(...)`). It does not know how the drivetrain answers. That is the same separation of **what** from **how** that Chapter 13 ended on, and it is about to pay off for the rest of the book.

---

## Chapter Summary

> **What you learned in Chapter 14**
>
> * **Odometry** is dead reckoning done every loop: add up the robot's small moves to keep a running estimate of where it is. Distance traveled is not position; position needs **how far** and **which way**.
> * A **pose** is x, y, and heading in the **field frame**, a coordinate system fixed to the floor (for the Explorer: origin at the start line, +x down leg 1, counterclockwise positive). Chassis speeds live in the robot frame; poses live in the field frame.
> * Each loop, the center moves `d = (Δleft + Δright) / 2`, split into `d × cos(θ)` along x and `d × sin(θ)` along y. WPILib takes the heading from the **gyro**, because scrubbing fools the encoders, and follows a small arc (the pose exponential) instead of a straight line.
> * `Translation2d`, `Rotation2d`, and `Pose2d` show **composition**: a pose **has a** translation and **has a** rotation, unlike inheritance, where `Robot` **is a** `TimedRobot`. You reach inside with **method chaining** (`pose.getRotation().getDegrees()`) and build angles with **static factory methods** (`Rotation2d.fromDegrees`).
> * The geometry classes are **immutable**: `private final` fields and no setters, so every "change" returns a new object. Immutable objects are safe to share, and only immutable objects make truly constant `static final` object constants.
> * `DifferentialDriveOdometry` needs the gyro heading and both encoder distances to start, `update` once per loop, and `getPoseMeters()` to read. **Resetting sensors without `resetPosition` makes the pose teleport**, so `Drivetrain.resetPose(Pose2d)` resets everything together and the raw resets are now `private`.
> * `Field2d`, published once with `SmartDashboard.putData`, draws the robot and the planned course on a map in the Simulation GUI. Odometry **drifts**: wheel slip, wheel size, scrubbing, gyro drift, and the floor all add up, and heading errors grow with distance. Resetting at known places, and later AprilTags, keep the belief close to the truth.

---

## Exercises

### Practice

**1. Dead reckoning by hand.** The robot starts at pose `(0, 0)`, heading `0`. Each row is one move: the distance its center traveled, then the gyro heading it held while moving (each turn happens in place between moves). Fill in x and y after each move, by hand, using `x + d × cos(θ)` and `y + d × sin(θ)`. Use the table in Section 14.3 for the cosines and sines, and round to three decimals.

| Move | d (m) | Heading (deg) | x after (m) | y after (m) |
|---|---|---|---|---|
| 1 | 0.30 | 0 | 0.300 | 0.000 |
| 2 | 0.20 | 90 | 0.300 | 0.200 |
| 3 | 0.10 | 180 | | |
| 4 | 0.20 | -90 | | |
| 5 | 0.10 | 45 | | |
| 6 | 0.14 | 135 | | |

The first two are done for you. Sketch the path on graph paper as you go. Then check with code: put temporary lines in your `Robot()` constructor that start from `Pose2d start = new Pose2d();` and, for each move, build the next pose with

```java
Pose2d next = new Pose2d(
    previous.getX() + d * Math.cos(Math.toRadians(headingDegrees)),
    previous.getY() + d * Math.sin(Math.toRadians(headingDegrees)),
    Rotation2d.fromDegrees(headingDegrees));
```

and print each one. Notice that you never change a pose; you build a new one from the old one each time, exactly like odometry does. Where does the robot end up? How far is that from where it started (`getTranslation().getNorm()`)? Remove the temporary lines and save your table in `reflections.md`.

**2. The 50 cm square.** Do the experiment from Section 14.8, carefully:

1. Tape a 50 cm by 50 cm square on your usual surface, with a small mark at the starting corner for where the robot's center goes.
2. Power on the XRP flat and still, and wait for the gyro calibration to finish.
3. Put the robot on the starting corner facing along one side, and press Y.
4. Drive one lap in teleop, slowly, turning left at each corner, and stop back on the starting corner, lined up as carefully as you can by eye.
5. Record `Pose X (m)`, `Pose Y (m)`, and `Pose Heading (deg)`. Also record `Heading (deg)`.
6. Without pressing Y, drive two more laps and record again. Then two more (five total) and record again.

Fill in a table:

| Laps | Pose X (m) | Pose Y (m) | Pose Heading (deg) | Heading (deg) | Position error (cm) |
|---|---|---|---|---|---|
| 1 | | | | | |
| 3 | | | | | |
| 5 | | | | | |

The position error is the straight-line distance from `(0, 0)`: `Math.hypot(x, y)`, times 100. Then answer: Is the final pose `(0, 0, 0°)`? Why not? Does the error grow with laps? Steadily, or in jumps? Why does `Pose Heading` read near `0` while `Heading (deg)` reads near `360`, `1080`, or `1800`? Finally, compute the error **per meter driven** (each lap is 2 meters). Keep this number: in Chapter 30, you will compare it with the Mini Swerve's.

**3. Build an immutable class.** Write a small immutable class called `Waypoint` that holds a name (a `String`) and a `Pose2d`:

- `private final` fields, set in a constructor.
- Getters `getName()` and `getPose()`.
- A method `withName(String newName)` that **returns a new** `Waypoint` with the new name and the same pose. (The `with` prefix is a common naming habit for "returns a copy with one thing changed.")
- A `toString()` method that returns something like `"Corner at (0.50, 0.00)"`. (Use `String.format("%s at (%.2f, %.2f)", name, pose.getX(), pose.getY())`. The `%.2f` means "a number with two decimal places." `@Override` it, the same annotation as in Chapter 5.)

Then predict what this prints, and check:

```java
Waypoint a = new Waypoint("Corner", new Pose2d(0.5, 0.0, new Rotation2d()));
Waypoint b = a;
Waypoint c = a.withName("Turn point");
System.out.println(a);
System.out.println(b);
System.out.println(c);
```

Explain in two sentences why `a` and `b` still print the same thing, and why that is no longer a problem the way it was with `desaturate` in Chapter 13. Then try adding a `setName` method that changes the `name` field. What does the compiler say, and why? (You can delete `Waypoint.java` afterward, or keep it; Chapter 20 has a use for something like it.)

**4. Fool the odometry.** With the robot disabled and the Field window open, try to make the odometry wrong in as many different ways as you can in five minutes. Some ideas: lift the robot and spin a wheel, slide it sideways, rotate it while it is lifted, push it while holding one wheel still. For each trick, write one line: what you did, what the map showed, and which sensor was fooled (or which assumption odometry made). Then, as a final trick, temporarily make `resetEncoders()` public again, call it from the Y button **instead of** `resetPose`, drive forward 30 cm, and press Y. Describe what the robot icon does, and use Section 14.6 to explain why. Put `resetPose` back and make `resetEncoders()` private again when you are done.

### Build (XRP Explorer)

Give the Explorer odometry and a live map.

1. Update `Drivetrain.java` to the listing in Section 14.6. Build. Expect compile errors in `Robot.java` about `resetEncoders()` and `resetHeading()` having `private access`. Do not fix them by making the methods public again: read each error, find the line, and go on to step 2.
2. Update `Robot.java` to the listing in Section 14.7. Measure the distance from your corner mark to the tape and put it in `LINE_DISTANCE_METERS`. Build and confirm `BUILD SUCCESSFUL`.
3. Run the program. Open the Field window in the Simulation GUI (Section 14.7), set the field to 2 m by 2 m and the robot to about 0.2 m, and arrange it next to SmartDashboard. Put `Pose X (m)`, `Pose Y (m)`, and `Pose Heading (deg)` on SmartDashboard, near `Heading (deg)`, and save the layout.
4. Do the five-step hand test from Section 14.7. Every step should match.
5. Run the autonomous course five times. For each run, record the final pose from the terminal log (the `Auto step 4` line) **and** measure the robot's real final position with a tape measure from the start line (x along leg 1, y to the left). Record both in a table.
6. For each run, compute the difference between odometry's belief and the tape measure, in centimeters. What is the average? Compare odometry's final heading with the gyro's: are they the same number? (They should be, within a hair, because odometry gets its heading from the gyro.)
7. Run the safety-net tests from Chapter 12 once more (tape removed; robot held still during leg 1). Look at the pose in the `TIMED OUT` run. Does odometry correctly report that the robot did not get far?

Diagnose anything strange:

- **The icon moves left (or backward) when you push the robot forward:** one or both encoders count backward. Check that `Left Distance (m)` and `Right Distance (m)` both go **up** when you push forward (Chapter 9). If only one does, the icon curves instead of going straight.
- **The icon turns right when you turn the robot left:** the heading sign is backward. Check `Heading (deg)` goes up when you turn left. If you fix it in `getHeadingDegrees()`, odometry is fixed too, because it reads through `getRotation2d()`.
- **The icon drives the right way but the map rotates it oddly, or x and y seem swapped:** check that you used `Rotation2d.fromDegrees(...)`, not `new Rotation2d(...)`, which takes **radians**. A heading of `90` radians points somewhere strange.
- **The pose jumps when you press Y or start autonomous:** something is resetting a sensor without `resetPose`. Search your code for `.reset()` outside `Drivetrain`.
- **The pose slowly drifts while the robot sits still:** that is gyro drift (Chapter 9). Power-cycle the XRP flat and still, and wait for the calibration to finish.
- **No Field window, or no Field item in the NetworkTables menu:** check that `SmartDashboard.putData("Field", field);` is in the constructor and that the program is running. The entry only appears once the robot code has published it.
- **The robot icon is huge or invisible:** the field or robot size settings are off. Right-click the Field window's title bar and set them again (Section 14.7).
- **Compile error `illegal forward reference`:** a course pose constant is above a constant it uses. Move the course group below the autonomous constants.

When the map and the real robot agree to within a couple of centimeters at the end of the course, the Explorer knows where it is. In Chapter 15, it will start using that knowledge to steer.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. What causes odometry to drift over time? List **three physical reasons**, and for each one say which sensor it fools (encoders or gyro) and whether you saw evidence of it in your square or course runs.
2. Odometry takes its heading from the gyro instead of computing it from the two encoders. Explain why, using what you measured in Chapter 13's effective-trackwidth practice. Is there anything odometry still trusts the encoders for?
3. `START_POSE` is a `private static final Pose2d`. Explain why this is a safe constant, and describe what could go wrong if `Pose2d` had a `setX` method. Use the words "reference" and "immutable."

If any answer feels shaky, re-read Sections 14.3, 14.5, and 14.8.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b odometry
```

Do the Build exercise on that branch. Make sure you removed any temporary test lines from your `Robot()` constructor. When the map and the robot agree:

```bash
git add .
git commit -m "Ch14: odometry and Field2d"
git push -u origin odometry
```

Open a pull request into `main`. In the description, include your Build step 5 table (odometry's final pose next to the tape measure's) and your drift per meter from Practice 2. Review the **Files changed** tab yourself. Look at how `resetEncoders()` and `resetHeading()` changed from `public` to `private`, and make sure no other file still calls them. Merge, delete the branch, then `git checkout main` and `git pull`.

That table is your accuracy baseline. In Chapter 15, PID will try to beat it.

### Collab: Pose Detective

Work with a partner. One person (the driver) secretly sketches a short path on paper: three or four straight segments with turns between them, staying inside a 1 meter square. Before you start, add a temporary checkpoint button to `robotPeriodic()`, next to the Y button:

```java
if (controller.getAButtonPressed()) {
    DataLogManager.log("Checkpoint: " + drivetrain.getPose());
}
```

The driver presses Y, then drives the path in teleop, pressing A at the start and at each corner. Meanwhile the detective faces away from the robot and the map, and may only look at the terminal log. From the logged poses alone, the detective sketches the path. Compare the sketches. Then swap roles. Afterward, each of you writes one sentence in `reflections.md` about which part of the path was hardest to reconstruct from the numbers, and why.

---

> **Additional Resources**
>
> * **Differential Drive Odometry**: [docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-odometry.html](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-odometry.html) the official guide to `DifferentialDriveOdometry`, including the warning about resetting sensors and `resetPosition`
> * **Translation, Rotation, and Pose**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/geometry/pose.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/geometry/pose.html) WPILib's introduction to `Translation2d`, `Rotation2d`, and `Pose2d`, with pictures of the field frame
> * **The Field2d Widget**: [docs.wpilib.org/en/stable/docs/software/dashboards/glass/field2d-widget.html](https://docs.wpilib.org/en/stable/docs/software/dashboards/glass/field2d-widget.html) how to publish a `Field2d`, open it in Glass, and change the field image, sizes, and drawing style
> * **`Pose2d` Javadoc**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/geometry/Pose2d.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/geometry/Pose2d.html) every method on `Pose2d`, including `exp`, the arc math from Section 14.3
> * **Immutable Objects (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/essential/concurrency/immutable.html](https://docs.oracle.com/javase/tutorial/essential/concurrency/immutable.html) Java's own explanation of immutable objects and a recipe for writing them

---

*Next up, Chapter 15: PID Control: Making the Robot Accurate. You will teach the Explorer to correct its own mistakes, slowing down smoothly as it reaches a target, turning to an exact heading, and steering itself back onto a straight line using the gyro.*
