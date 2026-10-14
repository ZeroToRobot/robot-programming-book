# Chapter 13: Kinematics: How Movement Is Calculated

In Chapter 12 you gave the Explorer its first autonomous routine. It drives half a meter, turns left to a heading of 90 degrees, and drives to a black line, with the encoders and gyro deciding when each step is done. You also measured, with a tape measure, exactly how good it is, and you found the limits: the robot overshoots, it curves a little, and it changes speed when the batteries get tired.

Look at one line from that routine:

```java
drivetrain.arcadeDrive(0.0, AUTO_TURN_SPEED, false);
```

`AUTO_TURN_SPEED` is `0.5`. Half of what, exactly? Half a turn per second? Half of the fastest the robot can spin? Neither. It is a number that goes into a formula inside `arcadeDrive`, and you found out how fast the robot actually turns by trying it. The same is true of `AUTO_DRIVE_SPEED`. Your routine works, but it is written in a language the robot's motors speak, not a language that describes motion.

This chapter teaches the robot a better language. You will describe how you want the robot to move in real units: **meters per second** forward and **radians per second** of turning. Then you will work out, first by hand and then with WPILib, exactly how fast each wheel must spin to produce that motion. That conversion is called **kinematics**, and it is the math that sits between "what I want the robot to do" and "what each wheel does" on every FRC robot, from the XRP to a swerve drive. You will also run the math backward, turning the encoders' wheel speeds into "how is the robot actually moving right now?"

This is a concept-heavy chapter, and we will go slowly. There is some algebra, but no more than a formula for the circumference of a circle, and you will check every number on the real robot. By the end, the Explorer's autonomous routine will ask for "0.2 meters per second" and "2 radians per second" instead of "0.5 power," and you will be able to predict how long each step should take before you ever run it.

On the Java side, you will learn to work with **objects that carry several values at once**: passing them into methods, getting them back as return values, and the important difference between a method that **changes** an object and one that **returns a new one**.

You will need your XRP, a clear patch of floor about a meter square, a tape measure, the course from Chapter 12, and a pencil and paper (or a calculator) for the math.

---

## 13.1 What Does "Turn 0.5" Mean?

Imagine you are a coach giving instructions to a runner on a track. "Run at 70 percent effort" is a useful instruction for a trained runner who knows what 70 percent feels like. But it does not tell you how fast they will actually go. That depends on whether they are fresh or tired, whether the track is wet, and whether there is a headwind. "Run at 5 meters per second" is a completely different kind of instruction. It describes the result you want, not the effort.

`arcadeDrive` speaks in effort. Its two numbers run from `-1.0` to `1.0`, and they mean "fraction of full power." That is fine for a human driver, who watches the robot and pushes the stick harder or softer until it does the right thing. It was fine for Chapter 12, too, because the encoders and gyro decided when each step was done. But it causes three real problems as the robot gets smarter:

1. **You cannot plan with it.** How long will a 0.5 meter drive take at `0.5` power? You do not know until you try it, and the answer changes with the batteries. If you knew the robot was going 0.2 meters per second, you could compute the answer: 2.5 seconds.
2. **The turn number is not tied to anything physical.** `rotation = 0.5` on the XRP and `rotation = 0.5` on a 50 kg competition robot produce completely different turns. Even on the same robot, combining `0.5` forward with `0.2` rotation does not tell you how tight the curve will be.
3. **The rest of WPILib does not speak it.** Odometry (Chapter 14), path following with PathPlanner (Chapter 31), and swerve drive (Chapters 28 to 30) all describe motion in meters per second and radians per second. To use any of them, your drivetrain has to understand those units.

So the robot needs to accept instructions like "drive forward at 0.2 meters per second while turning left at 1 radian per second," and figure out for itself what that means for each wheel.

### Kinematics, in one sentence

**Kinematics** is the geometry of motion: how the motion of a robot's wheels relates to the motion of the whole robot, using only distances, angles, and speeds. It does not care about forces, mass, friction, or batteries. (The physics of forces is called **dynamics**, and you will meet a piece of it in Chapter 16.)

Kinematics answers two questions, which are mirror images of each other:

| Direction | The question | Robot example |
|---|---|---|
| **Inverse kinematics** | I want the robot to move like *this*. What should each wheel do? | "Drive 0.2 m/s and turn left 1 rad/s. Left wheel 0.12 m/s, right wheel 0.28 m/s." |
| **Forward kinematics** | The wheels are doing *this*. How is the robot moving? | "Encoders say left 0.12, right 0.18. Robot is going 0.15 m/s forward and turning left." |

You use inverse kinematics to **command** the robot and forward kinematics to **measure** it. In Chapter 8, `arcadeDrive` did a rough, unitless version of inverse kinematics for you. In Chapter 9, you did a version of forward kinematics when you estimated the heading from the two encoders. This chapter does both properly.

> **Why "inverse" is the one you command with**
>
> The names come from how a mechanism is usually analyzed. "Forward" goes in the direction physics goes: the wheels turn, so the robot moves. "Inverse" runs that backward: you start from the motion you want and work back to what the wheels must do. Robot arms use the same words. Forward kinematics of an arm says "given these joint angles, where is the hand?" Inverse kinematics says "I want the hand *here*; what angles do the joints need?" You will meet arm angles in Chapter 34.

---

## 13.2 Describing Motion from the Robot's Point of View

Before you can compute wheel speeds, you need a precise way to say how the robot is moving. WPILib uses a **coordinate frame** attached to the robot itself, the same one you have been using since Chapter 8 without naming it:

```
                 +x  (forward)
                  ^
                  |
                  |
   +y (left) <----+
                 robot
                center

   Positive rotation: counterclockwise (turning left),
   seen from above.
```

- **x** points straight out the front of the robot.
- **y** points out the robot's left side.
- **Positive rotation** is **counterclockwise** when you look down at the robot from above. That is a left turn.

This is why, back in Chapter 8, you negated the right stick: pushing the stick right gives a positive number, but a positive rotation means turn **left**. It is also why your gyro reads positive when the robot turns left (Chapter 9), and why your autonomous turn to `90` degrees in Chapter 12 was a left turn. Same frame, everywhere.

In this frame, any motion of a robot on a flat floor can be described with three numbers:

| Symbol | Name | Meaning | Unit |
|---|---|---|---|
| **v<sub>x</sub>** ("v x") | Forward velocity | How fast the robot moves forward (negative is backward) | meters per second |
| **v<sub>y</sub>** ("v y") | Sideways velocity | How fast the robot slides left (negative is right) | meters per second |
| **ω** ("omega") | Angular velocity | How fast the robot turns (positive is counterclockwise) | radians per second |

The Greek letter **ω** (omega) is what engineers traditionally use for "how fast something is spinning." You will see it in WPILib, in textbooks, and on Chief Delphi.

Together, these three numbers are called the robot's **chassis speeds**. They describe how the whole chassis is moving at one instant, no matter what kind of drivetrain it has.

> **A differential drive cannot slide sideways**
>
> Try it: push your XRP sideways across the table. The wheels resist, because they can only roll forward and backward. A drivetrain with two sides of fixed wheels, like the XRP, the classic "tank drive," and many FRC robots, is called a **differential drive**, and its v<sub>y</sub> is always zero. Engineers call this **non-holonomic**: it cannot move in every direction directly. A **holonomic** drive, like the swerve drive you will build in Section VI, *can* slide sideways, so for swerve, all three numbers matter. Having one description of motion that covers both kinds of drivetrain is exactly why WPILib uses the same three numbers for every robot.

### Radians: the natural unit for turning

You have measured angles in degrees since Chapter 9. Kinematics uses **radians**, and there is a good reason, not just tradition.

Picture a circle with a radius of 1 meter. Walk along its edge until you have walked exactly 1 meter. The angle you have turned through, measured from the center, is **one radian**. Walk 2 meters along the edge: two radians. Walk all the way around the circle (2 × π ≈ 6.28 meters): 2π radians, which is 360 degrees.

So:

```
1 radian     = about 57.3 degrees
90 degrees   = π / 2 radians  = about 1.571 radians
180 degrees  = π radians      = about 3.142 radians
360 degrees  = 2π radians     = about 6.283 radians
```

Here is why robots love radians. For any circle:

```
distance along the edge = radius × angle (in radians)
```

That formula only works in radians. In degrees, you would need an extra `π / 180` every time. And the same is true for speeds: a point at radius `r` on something spinning at `ω` radians per second moves at

```
speed = r × ω
```

That one formula is the whole secret of differential drive kinematics, as you will see in the next section.

Java converts for you with two `static` methods in the `Math` class (you used `Math.toDegrees` in Chapter 9):

```java
double radians = Math.toRadians(90.0);    // 1.5707963267948966
double degrees = Math.toDegrees(1.0);     // 57.29577951308232
```

WPILib also has a `Units` class (`edu.wpi.first.math.util.Units`) with conversions like `Units.degreesToRadians(90.0)` and `Units.inchesToMeters(6.1)`, handy when a datasheet gives you inches.

> **Name your units, every time**
>
> Mixing up degrees and radians is one of the most common bugs in robot code, and it is silent: the code compiles, the robot moves, and it turns 57 times too much or too little. Your Chapter 9 habit of putting the unit in the name (`getHeadingDegrees()`) is your best protection. From this chapter on, every turn rate in your code will end in `RadiansPerSecond` or `DegreesPerSecond`. When you see a bare `turnRate`, be suspicious.

---

## 13.3 The Marching Band Turn: Deriving the Wheel Speeds

Have you ever watched a marching band turn a corner? The band stays in straight rows the whole way around. To pull that off, the musician on the **inside** of the turn barely moves, taking tiny steps, while the musician on the **outside** takes huge strides to keep up. Everyone in the row turns through the same angle in the same time, but the farther you are from the corner, the farther you have to walk.

Your XRP's two wheels are a marching band with two members. When the robot drives along a curve, both wheels go around the same center point, through the same angle, in the same time. The outside wheel has a bigger circle to cover, so it must go faster. Kinematics is just figuring out exactly how much faster.

### Setting up the picture

Here is the XRP from above. It is driving toward the top of the page while curving to the left, so the center of its turn is a point on the floor off to its left, in line with the two wheels:

```
                                      ^  forward
                                      |
   turn center *..............[LEFT]==+==[RIGHT]
               |                      |
               |<--- R - L/2 --->|
               |<-------- R --------->|
               |<-------- R + L/2 --------->|
```

Here is what the picture shows, in words:

- The robot's center is moving forward at **v<sub>x</sub>** and turning at **ω**. Together, those mean the center is traveling around a circle. The **center of the turn** is a point on the floor, off to the robot's left.
- The distance from the turn center to the robot's center is the **turn radius**, **R**.
- The two wheels are a distance **L** apart. This is the **trackwidth**. On the XRP, `L = 0.155` meters. Each wheel sits **L / 2** from the robot's center.
- So the left (inside) wheel is at radius **R - L/2** from the turn center, and the right (outside) wheel is at radius **R + L/2**.

Now apply `speed = radius × ω` to each one. Everything on the robot turns at the same ω, so:

```
robot center:   vx    = R × ω
left wheel:     left  = (R - L/2) × ω  =  R × ω  -  (L/2) × ω
right wheel:    right = (R + L/2) × ω  =  R × ω  +  (L/2) × ω
```

And `R × ω` is just `vx`. Substitute it in, and the turn radius disappears completely:

```
left  = vx - (L / 2) × ω
right = vx + (L / 2) × ω
```

Those two lines are **differential drive inverse kinematics**. Every differential drive robot in FRC uses exactly these two equations. Read them aloud: "Each wheel goes at the robot's forward speed, plus or minus an extra amount for turning. The extra amount is half the trackwidth times the turn rate. The right wheel gets the plus, the left gets the minus, because positive turns left."

> **Check it with the units**
>
> A good habit for any formula: make sure the units work. `vx` is in meters per second. `L / 2` is in meters, and `ω` is in radians per second. Radians are a ratio (distance along the edge divided by radius), so they have no physical unit, and meters times "per second" is meters per second. Both sides of the equation are in meters per second. If you had used degrees per second for ω, the units would not work, and that is the formula's way of telling you to use radians.

### Three special cases worth knowing by heart

**Driving straight (ω = 0).** The turning term is zero, so `left = right = vx`. Both wheels go at the same speed. You already knew that; now the math agrees.

**Spinning in place (vx = 0).** The forward term is zero, so `left = -(L/2) × ω` and `right = +(L/2) × ω`. The wheels go at the same speed in opposite directions. The center of the turn is the center of the robot, and each wheel travels around a circle of radius `L / 2`. This is the turn your Chapter 12 routine did at the corner.

**Pivoting on one wheel.** If `vx = (L/2) × ω`, then `left = 0`. The left wheel stands still and the robot swings around it. The center of the turn is the left wheel itself.

### A worked example

Let us compute one by hand, slowly. Suppose you want the Explorer to drive forward at **0.15 m/s** while turning left at **1.0 rad/s**:

```
L / 2  = 0.155 / 2       = 0.0775 m
(L/2) × ω = 0.0775 × 1.0 = 0.0775 m/s

left  = 0.15 - 0.0775 = 0.0725 m/s
right = 0.15 + 0.0775 = 0.2275 m/s
```

The right wheel goes about three times as fast as the left, and the robot curves left. How tight is the curve? From `vx = R × ω`, the turn radius is `R = vx / ω = 0.15 / 1.0 = 0.15` meters. The robot's center travels around a circle 15 cm in radius.

Here are a few more, so you can see the patterns. Try computing a couple yourself before reading the answers.

| vx (m/s) | ω (rad/s) | Left (m/s) | Right (m/s) | What the robot does |
|---|---|---|---|---|
| 0.20 | 0.0 | 0.200 | 0.200 | Drives straight |
| 0.00 | 2.0 | -0.155 | 0.155 | Spins left in place |
| 0.15 | 1.0 | 0.0725 | 0.2275 | Curves left, 15 cm radius |
| 0.20 | -1.0 | 0.2775 | 0.1225 | Curves **right** (ω is negative) |
| 0.10 | -1.5 | 0.216 | -0.016 | Tight right turn; the right wheel creeps backward |

That last row is interesting. When the turn is tight enough, the turn center ends up *between* the wheels, and the inside wheel has to go slightly backward. Nothing special happens in the math. It just gives you a small negative number, and that is the right answer.

> **What `arcadeDrive` was really doing**
>
> In Chapter 8, you saw that `arcadeDrive` computes `left = forward - rotation` and `right = forward + rotation`. Now you can see it has the same shape as real kinematics, with the `(L / 2)` tucked inside the meaning of `rotation`. Chapter 8 called that version "rough," and here is the full story from WPILib's source code: after adding and subtracting, `arcadeDrive` divides both sides by the same number, chosen so that the faster wheel ends up at exactly the bigger of your two inputs. So forward `0.5` with rotation `0.2` really gives left `0.21` and right `0.5`, not `0.3` and `0.7`. The ratio between the two wheels, and so the shape of the curve, is the same either way (the turn-radius math in Chapter 11 still holds), and this scaling is what keeps full stick in any direction at exactly full power. But it is one more reason `arcadeDrive`'s numbers do not map to any physical speed. Kinematics does.

---

## 13.4 Forward Kinematics: From the Wheels Back to the Robot

Now run the math the other way. Your encoders tell you how fast each wheel is going (`getLeftSpeedMetersPerSecond()` and `getRightSpeedMetersPerSecond()` from Chapter 9). How is the robot moving?

Start from the two inverse equations:

```
left  = vx - (L/2) × ω
right = vx + (L/2) × ω
```

**Add them**, and the turning terms cancel: `left + right = 2 × vx`. **Subtract** left from right, and the forward terms cancel: `right - left = L × ω`. Solve each for the thing you want:

```
vx = (left + right) / 2
ω  = (right - left) / L
```

That is **differential drive forward kinematics**. The robot's forward speed is the **average** of the wheel speeds. The robot's turn rate is the **difference** in wheel speeds, divided by the trackwidth.

You have seen both of these before, wearing different clothes:

- In Chapter 9 you wrote `getAverageDistanceMeters()`, the average of the two wheel **distances**. That is the first equation, for distance instead of speed.
- Also in Chapter 9, the kinematics preview callout computed the heading as `(rightDistance - leftDistance) / 0.155`. That is the second equation, for distance instead of speed.

Distances and speeds follow the same rules, because a speed is just a distance per second. Kinematics was hiding in your code all along.

Try a quick example. The encoders report left `0.12` m/s and right `0.18` m/s:

```
vx = (0.12 + 0.18) / 2     = 0.15 m/s forward
ω  = (0.18 - 0.12) / 0.155 = 0.387 rad/s   (about 22 degrees per second, to the left)
```

### When the formula and the gyro disagree

Here is something you can test. Spin the XRP in place and compare the turn rate from forward kinematics with the turn rate the gyro measures. They will not quite match. The encoders usually claim the robot is turning **faster** than the gyro says it is.

You already know why from Chapter 12: when the robot spins in place, the wheels **scrub**, sliding sideways across the floor instead of rolling cleanly. The wheels turn more than the robot does, so the encoder estimate runs high. The geometry in Section 13.3 assumed perfect rolling with no slip, and real floors do not cooperate.

There is a clever fix. Instead of the trackwidth you measure with a ruler, use an **effective trackwidth**: the number that makes the formula agree with the gyro on your robot and your floor. Because scrubbing makes the wheels travel extra distance, the effective trackwidth usually comes out a little **larger** than the real one. WPILib's own documentation for its kinematics class says exactly this: the empirical value may be larger than the physical one because of scrubbing. You will measure yours in Practice 2.

> **From speeds to position: an odometry preview**
>
> If you know how fast the robot is going and how fast it is turning, fifty times a second, you can add up all those tiny moves to track where the robot is on the floor. Each loop: "since last time, I moved 0.3 cm forward and turned 0.4 degrees left." Keep a running total, and you know the robot's position and heading. That running total is called **odometry**, and it is the subject of Chapter 14. WPILib's kinematics class even has a method for the "tiny move since last time" part, called `toTwist2d`, which takes the change in left and right distance and returns exactly that. This is why Chapter 12 never reset the encoders in the middle of a routine: odometry needs their running totals.

---

## 13.5 Objects That Carry Numbers

Time to put this into code. But first, a Java problem.

Inverse kinematics takes in **three** numbers (vx, vy, ω) and gives back **two** (left and right). Every method you have written so far returns at most **one** value. `getAverageDistanceMeters()` returns one `double`. `isObstacleWithin(...)` returns one `boolean`. How do you write a method that returns two numbers?

You could write two methods, `getLeftWheelSpeed(vx, omega)` and `getRightWheelSpeed(vx, omega)`. That works, but it gets clumsy fast: every caller has to pass the same values twice, and nothing keeps the two results together. If someone changes how one is computed and forgets the other, they disagree.

The Java answer is to **bundle the values into an object**. You have been making objects since Chapter 7. Until now, they have mostly been hardware: a motor, an encoder, a controller. But an object can just as easily hold plain data. A class whose job is to carry a few related values around together is often called a **data class**.

### A homemade version

To see how this works with nothing else in the way, here is a tiny data class you could write yourself. (You will not keep it. WPILib has a better one.)

```java
public class WheelSpeeds {
    public double left;    // meters per second
    public double right;   // meters per second

    public WheelSpeeds(double left, double right) {
        this.left = left;
        this.right = right;
    }
}
```

Now a method can **return** both wheel speeds at once, by creating one `WheelSpeeds` object and returning it:

```java
public static WheelSpeeds computeWheelSpeeds(double vx, double omega) {
    double halfTrackwidth = 0.155 / 2.0;
    return new WheelSpeeds(vx - halfTrackwidth * omega, vx + halfTrackwidth * omega);
}
```

And the caller gets both values in one package:

```java
WheelSpeeds speeds = computeWheelSpeeds(0.15, 1.0);
System.out.println(speeds.left);     // prints about 0.0725
System.out.println(speeds.right);    // prints about 0.2275
```

Walk through it:

- **The return type is a class name.** `public static WheelSpeeds computeWheelSpeeds(...)` says "this method gives back a `WheelSpeeds` object." Any class can be a return type, exactly like `double` or `boolean`.
- **`return new WheelSpeeds(...)`** builds the object and hands it back in one line.
- **The caller stores it in a variable** of type `WheelSpeeds`, then reads its fields with a dot: `speeds.left`.

Objects work as **parameters**, too. A method can take a `WheelSpeeds` and compute something from it:

```java
public static double averageSpeed(WheelSpeeds speeds) {
    return (speeds.left + speeds.right) / 2.0;
}
```

Notice how readable this makes the code. `averageSpeed(speeds)` passes one thing, and the method's signature (Chapter 11) says exactly what kind of thing it needs.

> **Wait: public fields? Chapter 7 said make fields `private`.**
>
> Good catch. Chapter 7 taught you to make fields `private` and expose them through methods, so that nobody outside the class can put an object into a bad state. That rule protects objects that **do** things and have rules to keep, like a `Drivetrain` that should never have its motor replaced halfway through a match. A small data class has no rules to protect: any two numbers are a valid pair of wheel speeds. So many programmers, including the WPILib developers, make the fields of simple data classes `public` and skip the getters. You will see this in `ChassisSpeeds` in a moment. Keep your hardware classes `private`. A data class that is just a labeled bundle of numbers can be an exception.

### WPILib's data classes for kinematics

WPILib already has the classes you need, in the package `edu.wpi.first.math.kinematics`:

**`ChassisSpeeds`** holds the three numbers from Section 13.2:

```java
ChassisSpeeds speeds = new ChassisSpeeds(0.15, 0.0, 1.0);   // vx, vy, omega
```

Its three public fields are named with their units, the habit you have been practicing since Chapter 9:

```java
speeds.vxMetersPerSecond        // 0.15
speeds.vyMetersPerSecond        // 0.0
speeds.omegaRadiansPerSecond    // 1.0
```

**`DifferentialDriveWheelSpeeds`** holds the two wheel speeds, the professional version of the `WheelSpeeds` class above:

```java
DifferentialDriveWheelSpeeds wheelSpeeds = new DifferentialDriveWheelSpeeds(0.12, 0.18);

wheelSpeeds.leftMetersPerSecond     // 0.12
wheelSpeeds.rightMetersPerSecond    // 0.18
```

Both classes also know how to print themselves in a readable way. `System.out.println(speeds)` prints:

```
ChassisSpeeds(Vx: 0.15 m/s, Vy: 0.00 m/s, Omega: 1.00 rad/s)
```

> **"Create once" is for hardware**
>
> Since Chapter 5 you have followed a firm rule: create objects once, in a field or the `Robot()` constructor, and use them every loop. That rule is about **hardware** objects. Creating a second `XRPMotor` on the same channel crashes the program, as you saw in Chapter 10, and hardware objects are expensive to set up. Small data objects like `ChassisSpeeds` are different. Creating a fresh one every loop is normal and cheap, and WPILib's own examples do it. Java automatically cleans up data objects nobody uses anymore, with a background helper called the **garbage collector**. So: hardware, once. Little bundles of numbers, whenever you need them.

---

## 13.6 `DifferentialDriveKinematics`: The Math, in a Class

The last piece is the class that does the converting. `DifferentialDriveKinematics` holds the one fact about your robot that the formulas need, the trackwidth, and has methods for both directions:

```java
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.DifferentialDriveKinematics;
import edu.wpi.first.math.kinematics.DifferentialDriveWheelSpeeds;
```

```java
DifferentialDriveKinematics kinematics = new DifferentialDriveKinematics(0.155);
```

The constructor takes the trackwidth **in meters**. (A version that takes WPILib's `Distance` unit type also exists, but this book sticks with plain `double`s in meters.)

**Inverse kinematics:** chassis speeds in, wheel speeds out.

```java
ChassisSpeeds desired = new ChassisSpeeds(0.15, 0.0, 1.0);
DifferentialDriveWheelSpeeds wheelSpeeds = kinematics.toWheelSpeeds(desired);
```

**Forward kinematics:** wheel speeds in, chassis speeds out.

```java
DifferentialDriveWheelSpeeds measured = new DifferentialDriveWheelSpeeds(0.12, 0.18);
ChassisSpeeds actual = kinematics.toChassisSpeeds(measured);
```

Look at what these methods do with objects. `toWheelSpeeds` takes a `ChassisSpeeds` **parameter** and **returns** a `DifferentialDriveWheelSpeeds`. `toChassisSpeeds` does the opposite. Exactly the pattern from Section 13.5, just with WPILib's classes.

### Check your hand math with code

You did the 0.15 m/s, 1.0 rad/s example by hand in Section 13.3. Now let the computer check it. Put these lines at the end of your `Robot()` constructor temporarily (you will remove them before you commit):

```java
        // Temporary: check the Chapter 13 hand calculations.
        DifferentialDriveKinematics testKinematics = new DifferentialDriveKinematics(0.155);
        ChassisSpeeds testSpeeds = new ChassisSpeeds(0.15, 0.0, 1.0);
        System.out.println(testKinematics.toWheelSpeeds(testSpeeds));
        System.out.println(testKinematics.toChassisSpeeds(new DifferentialDriveWheelSpeeds(0.12, 0.18)));
```

Add the three imports at the top of `Robot.java`, build, and run. In the terminal panel (where your prints have gone since Chapter 10), you should see:

```
DifferentialDriveWheelSpeeds(Left: 0.07 m/s, Right: 0.23 m/s)
ChassisSpeeds(Vx: 0.15 m/s, Vy: 0.00 m/s, Omega: 0.39 rad/s)
```

The printout rounds to two decimal places, but those are your numbers: 0.0725 and 0.2275 for the first line, 0.15 and 0.387 for the second. If you print a single field instead, like `testKinematics.toWheelSpeeds(testSpeeds).rightMetersPerSecond`, you will see something like `0.22749999999999998`. That is the tiny `double` rounding from Chapter 12, and it is the reason the friendly printout rounds.

Notice the last line of the test code. `new DifferentialDriveWheelSpeeds(0.12, 0.18)` is created right inside the parentheses of the method call, without ever getting a variable name. That is fine. When you only need an object for one call, you can build it right where you use it.

> **What about v<sub>y</sub>?**
>
> Try `new ChassisSpeeds(0.15, 0.5, 1.0)`, asking the XRP to slide sideways at half a meter per second, and print the wheel speeds. They are exactly the same as before. `DifferentialDriveKinematics` simply ignores v<sub>y</sub>, because no combination of wheel speeds can make a differential drive slide sideways. And when it runs the other direction, `toChassisSpeeds` always returns a v<sub>y</sub> of `0`. The same `ChassisSpeeds` class works for every drivetrain; each drivetrain's kinematics class uses the parts that apply to it.

Once the numbers match, delete the temporary lines. Keeping test code in the constructor is how a robot program slowly fills up with mystery prints.

---

## 13.7 Changing an Object vs Making a New One

There is one more method you need, and it teaches an important Java idea.

What happens if you ask for more speed than the robot has? Suppose the XRP's wheels top out around 0.28 m/s, and you ask for 0.25 m/s forward while turning at 2.0 rad/s:

```
left  = 0.25 - 0.0775 × 2.0 = 0.095 m/s
right = 0.25 + 0.0775 × 2.0 = 0.405 m/s    <- faster than the wheel can go
```

The left wheel is fine, but the right wheel cannot reach 0.405 m/s. If you just let the right wheel max out at 0.28, the two wheels would be at 0.095 and 0.28. Their ratio would change, and the robot would follow a **different, wider curve** than the one you asked for. That is a sneaky kind of wrong: the robot does not fail, it just goes somewhere else.

The better answer is to slow **both** wheels down by the same factor, so the faster one is exactly at the limit. The ratio stays the same, so the robot follows the **same curve**, just more slowly. That is called **desaturating** (or **normalizing**) the wheel speeds, and `DifferentialDriveWheelSpeeds` has a method for it:

```java
DifferentialDriveWheelSpeeds wheelSpeeds = kinematics.toWheelSpeeds(new ChassisSpeeds(0.25, 0.0, 2.0));
wheelSpeeds.desaturate(0.28);
// wheelSpeeds is now left 0.066, right 0.280
```

Check the math. The scale factor is `0.28 / 0.405 = 0.691`. Left: `0.095 × 0.691 = 0.066`. Right: `0.405 × 0.691 = 0.280`. And the turn radius? Before: `0.25 / 2.0 = 0.125` m. After, using forward kinematics: vx is `(0.066 + 0.280) / 2 = 0.173`, ω is `(0.280 - 0.066) / 0.155 = 1.38`, and `0.173 / 1.38 = 0.125` m. Same circle, slower trip.

This is the same idea `arcadeDrive` used in the callout in Section 13.3, now in real units.

### Look closely at how that was called

```java
wheelSpeeds.desaturate(0.28);
```

There is no `=` on that line. `desaturate` does not **return** a new, corrected set of wheel speeds. Its return type is `void`. Instead, it **changes the object you called it on**: it reaches into `wheelSpeeds` and overwrites its `leftMetersPerSecond` and `rightMetersPerSecond` fields. After that line, the old values are gone.

Now compare a different method that both data classes have, `times`, which multiplies every value by a number:

```java
ChassisSpeeds full = new ChassisSpeeds(0.2, 0.0, 1.0);
ChassisSpeeds half = full.times(0.5);
```

`times` does **not** change `full`. It builds a brand new `ChassisSpeeds` with the multiplied values and **returns** it. After these lines you have two objects: `full` is still 0.2 and 1.0, and `half` is 0.1 and 0.5.

These are the two ways a method can work with an object, and you have to know which one you are calling:

| Kind of method | Example | Return type | What happens to the original |
|---|---|---|---|
| **Changes the object** (mutates it) | `wheelSpeeds.desaturate(0.28)` | usually `void` | It is changed. |
| **Returns a new object** | `full.times(0.5)` | the class itself | It is untouched. You must store the result. |

How do you tell them apart? Look at the return type, in VS Code's hover popup or in the Javadoc (Chapter 11). A `void` method that is called on an object almost always changes that object; there is nothing else for it to do. A method that returns the same class almost always leaves the original alone and hands you a new one.

> **A common beginner mistake**
>
> ```java
> // BUG: the result is thrown away. full is unchanged!
> full.times(0.5);
> drivetrain.drive(full);
> ```
>
> This compiles without a warning, and the robot drives at full speed instead of half. `times` built a new, halved `ChassisSpeeds`, returned it, and nobody caught it, so it was thrown away. The fix is to store the result: `ChassisSpeeds half = full.times(0.5);` and drive with `half`. The opposite mistake is less common but just as confusing: writing `wheelSpeeds = wheelSpeeds.desaturate(0.28);` will not even compile, because `desaturate` returns nothing to assign. Whenever you call a method on an object, ask: "does this change my object, or hand me a new one?"

### Two names, one object

Chapter 10 taught you that a variable holding an object does not contain the object itself. It holds a **reference** to it: an address that says where the object lives. That matters a lot once methods can change objects:

```java
DifferentialDriveWheelSpeeds a = new DifferentialDriveWheelSpeeds(0.1, 0.4);
DifferentialDriveWheelSpeeds b = a;     // b refers to the SAME object as a

b.desaturate(0.28);

System.out.println(a);   // DifferentialDriveWheelSpeeds(Left: 0.07 m/s, Right: 0.28 m/s)
```

The line `b = a` did not copy the wheel speeds. It copied the **address**. `a` and `b` are two names for one object, like two people with the same house key. When `b.desaturate(...)` rearranged the furniture, `a` sees the change too, because it is the same house.

The same thing happens when you pass an object into a method. The method gets a copy of the reference, so if it calls `desaturate` on its parameter, the caller's object changes. That is useful when you mean it and baffling when you do not. Practice 3 lets you predict a few of these before you run them.

---

## 13.8 Driving by Velocity

You now have every piece you need to command the Explorer in real units. The plan for a new `Drivetrain` method:

1. Take in the desired motion, as a `ChassisSpeeds`.
2. Use inverse kinematics to get the left and right wheel speeds, in meters per second.
3. Desaturate them, so no wheel is asked to go faster than it can.
4. Convert each wheel speed into a motor power, and send it to the motors.

Steps 1 to 3 are what you just learned. Step 4 is new, and it is where we have to be honest.

### From meters per second to motor power

The motors do not accept "0.2 meters per second." They accept a power from `-1.0` to `1.0`. So you need a rule to turn a speed into a power. The simplest reasonable rule is: **full power gives top speed, so a fraction of top speed needs that same fraction of power.**

```
power = desired speed / top speed
```

If the top speed is 0.28 m/s and you want 0.14 m/s, use `0.14 / 0.28 = 0.5` power.

This is a guess. It assumes speed is exactly proportional to power, and it is not quite: as you saw in Chapter 12, a little power does nothing at all, because the motors first have to overcome friction. But it is a guess **in the right units**, and it moves all the "what does this number mean?" problems into one place, a single constant, where you can measure it, document it, and later replace it with something better.

> **You just wrote your first feedforward**
>
> Dividing by top speed is the simplest possible **feedforward**: a rule that predicts the power you need for a speed, before the robot even moves. In Chapter 12 you met the idea that a full feedforward model has three parts. The `1 / topSpeed` you are using now is a rough version of one of them, called **kV**: how much extra voltage each extra meter per second needs. It is missing **kS**, the extra push to overcome friction and get moving at all, which is why the robot will drive a bit slower than you ask, especially at low speeds. In Chapter 16, SysId will measure kS, kV, and kA on your XRP, and you will replace this one line of division with a `SimpleMotorFeedforward`. Everything else you build in this chapter stays the same.

### Measure your top speed

The XRP's official documentation says its motors spin the wheels at about **90 RPM with no load at 4.5 volts**. One wheel turn rolls `π × 0.060 = 0.188` meters, and 90 RPM is 1.5 turns per second, so that works out to roughly `1.5 × 0.188 = 0.28` meters per second. That is a fine starting estimate. But "no load" means the wheels spinning in the air, and your batteries may be above or below 4.5 volts, so measure your own robot:

1. Run the Explorer in **Teleoperated**, on the floor, with plenty of room ahead (about a meter and a half).
2. Make sure slow mode is off, then push the left stick **all the way** forward and hold it. Full stick is full power, even with the squared inputs from Chapter 8, because `1.0` squared is still `1.0`.
3. Once the robot has been moving for a second, read the `Left Speed (m per s)` and `Right Speed (m per s)` widgets. They will wobble a little; read the steady value.
4. Do it three times. Write down the **lower** of the two sides, averaged over the runs.

Why the lower side? If one side tops out at 0.31 and the other at 0.29, then 0.29 is the fastest speed **both** wheels can actually reach. A top speed the slow side cannot hit would make desaturation useless on that side.

Write your number down. You will put it in `Drivetrain.java` in a moment. The listing below uses `0.28`, the estimate from the documentation; use yours.

> **Your top speed is a measurement, not a fact**
>
> Top speed depends on the batteries, just like everything in Chapter 12's timed tests did. Fresh batteries give a higher top speed; tired ones give a lower one. That means your speed-to-power conversion will drift as the batteries drain. For now, re-measure if the robot seems sluggish, and put the date you measured it in a comment next to the constant. **PID control** (Chapter 15) is the tool for watching what the robot actually does and correcting for the difference, and in Chapter 16 you will replace this guess with a model measured on your own robot.

### The new `Drivetrain.java`

Here is `Drivetrain` with kinematics added. It starts from the end of Chapter 11, with both `arcadeDrive` overloads and your Javadoc comments. (Your Javadoc wording on the getters may differ from this listing. Keep yours.) Type the new parts, do not paste:

```java
package frc.robot;

import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.DifferentialDriveKinematics;
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

    public Drivetrain() {
        rightMotor.setInverted(true);

        // From now on, getDistance() returns meters.
        leftEncoder.setDistancePerPulse(METERS_PER_COUNT);
        rightEncoder.setDistancePerPulse(METERS_PER_COUNT);
        resetEncoders();
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

    public void resetEncoders() {
        leftEncoder.reset();
        rightEncoder.reset();
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

    public double getTurnRateDegreesPerSecond() {
        return gyro.getRate();
    }

    public void resetHeading() {
        gyro.reset();
    }
}
```

Walk through what changed since Chapter 11:

- **Three new imports**, all from `edu.wpi.first.math.kinematics`.
- **Two new constants.** `TRACKWIDTH_METERS` is a physical fact, so it sits with the other physical facts. `MAX_WHEEL_SPEED_METERS_PER_SECOND` is a **measurement**, so it gets its own comment saying where it came from and when to re-measure it.
- **One new field**, `kinematics`. It is a math object, not hardware, but it never changes, so it is created once and `final` like everything else in this class.
- **Two `drive` methods.** This is method overloading from Chapter 11 again. `drive(ChassisSpeeds)` does the real work: inverse kinematics, desaturate, convert, send. `drive(double, double)` is a convenience that builds the `ChassisSpeeds` for you and **delegates** to the first one, exactly like the two `arcadeDrive` methods. One place does the work.
- **`diffDrive.tankDrive(left, right, false)`.** You have not used this method before. `arcadeDrive` takes forward and rotation and does its own mixing; `tankDrive` takes a left power and a right power and sends them more or less straight to the motors. Kinematics has already done the mixing, so `tankDrive` is the right tool. The `false` turns off squaring, for the same reason as in Chapter 12: you want `0.5` to mean `0.5`. And because it still goes through `diffDrive`, Motor Safety (Chapter 12) keeps watching.
- **A private helper, `speedToPower`.** The rough "divide by top speed" rule lives in exactly one place. In Chapter 16, this is the method you will replace.
- **`getChassisSpeeds()`**, a computed getter (Chapter 9) that runs forward kinematics on the encoder speeds and **returns an object**. This is your robot's speedometer, in real units.

Notice what did **not** change: `arcadeDrive`, `stop`, and every getter. Teleop does not know anything happened.

> **Why does the drivetrain own the kinematics?**
>
> You could have put the `DifferentialDriveKinematics` object in `Robot.java`. But the trackwidth is a fact about the drivetrain, and the conversion from speed to power is a fact about the drivetrain's motors. If you ever change the wheels or the motors, every one of those facts changes together, in one file. `Robot.java` only needs to say how it wants the robot to move. This is encapsulation from Chapter 7: callers describe **what** they want, and the class decides **how**. When you build a swerve drive in Chapter 28, its `drive` method will take the very same `ChassisSpeeds`, and its insides will be completely different.

### See it on the dashboard

Add the measured chassis speeds to `updateDashboard()` in `Robot.java`, right after the gyro widgets:

```java
        // Kinematics: how the robot is moving, measured by the encoders
        ChassisSpeeds measured = drivetrain.getChassisSpeeds();
        SmartDashboard.putNumber("Measured Forward (m per s)", measured.vxMetersPerSecond);
        SmartDashboard.putNumber("Measured Turn (deg per s)",
            Math.toDegrees(measured.omegaRadiansPerSecond));
```

Add `import edu.wpi.first.math.kinematics.ChassisSpeeds;` at the top of `Robot.java`. The turn rate is converted to degrees per second so you can put it right next to the gyro's `Turn Rate (deg per s)` widget and compare. Two different sensors, answering the same question.

---

## 13.9 The Explorer's Autonomous, in Real Units

Now rewrite the Chapter 12 routine to drive by velocity. Only two parts of `Robot.java` change: the autonomous constants and the `drivetrain` calls inside `autonomousPeriodic()`. The steps, the `switch`, the timeouts, and the logging all stay exactly as they were. That is a sign the routine was well organized.

### New constants, with units

Replace `AUTO_DRIVE_SPEED` and `AUTO_TURN_SPEED` with these, and update `STEP_TIMEOUT_SECONDS` (more on that in a moment):

```java
    // Autonomous: obstacle course leg 1. Measured on our floor; re-test on new surfaces.
    private static final double AUTO_DRIVE_METERS_PER_SECOND = 0.20;
    private static final double AUTO_TURN_RADIANS_PER_SECOND = 2.0;   // about 115 deg per s
    private static final double LEG_1_DISTANCE_METERS = 0.50;
    private static final double TURN_HEADING_DEGREES = 90.0;
    private static final double LEG_2_MAX_DISTANCE_METERS = 1.00;
    private static final double STEP_TIMEOUT_SECONDS = 7.0;
```

The names now say what the numbers mean. Anyone reading `AUTO_DRIVE_METERS_PER_SECOND = 0.20` knows exactly what to expect from the robot, with no experiment needed.

Why `2.0` radians per second for the turn? Spinning in place, each wheel goes `0.0775 × 2.0 = 0.155` m/s, a bit over half of top speed. In Chapter 12, you may have needed `0.5` or even `0.6` power just to get the robot to turn in place, because the wheels have to scrub sideways. If your robot hesitates or jerks during the turn, raise this number.

### The new `autonomousPeriodic()`

Replace the three `arcadeDrive` calls with `drive` calls:

```java
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
```

Three lines changed. Read the first one aloud: "Drive forward at the auto drive speed, in meters per second, with no turning." The turn step reads: "Turn left at the auto turn rate, in radians per second, without driving forward." Compare that to `arcadeDrive(0.0, AUTO_TURN_SPEED, false)`: same behavior, but now every number has a meaning.

Everything else in `Robot.java` stays as Chapter 12 left it, including teleop, which still uses `arcadeDrive`. That is on purpose. A human driver does not think in meters per second; they think "a bit more stick." The squared, power-based `arcadeDrive` still feels best in a driver's hands. (Practice 4 lets you try a velocity-based teleop and decide for yourself.)

### Predict before you run

Here is the payoff of real units: you can predict what the robot will do **before** you run it.

| Step | Prediction | Math |
|---|---|---|
| Leg 1 | about 2.5 seconds | 0.50 m ÷ 0.20 m/s |
| Turn left 90 degrees | about 0.8 seconds | 90 degrees is π/2 ≈ 1.571 rad; 1.571 ÷ 2.0 rad/s |
| Drive to the line | about 2 seconds | about 0.4 m ÷ 0.20 m/s |
| Leg 2, line missing | about 5 seconds | 1.00 m ÷ 0.20 m/s |

That last row is why `STEP_TIMEOUT_SECONDS` went up. In Chapter 12, you set the timeout by watching how long the slowest step took. Now you can compute it. The slowest normal step is driving all the way to `LEG_2_MAX_DISTANCE_METERS` when the tape is missing, about 5 seconds, and a timeout shorter than that would cut off a step that is working correctly. `7.0` leaves some margin, because (as you are about to see) the robot will probably run a little slower than you asked.

Now run it. Place the Explorer on the start line, enable **Autonomous**, and watch the terminal log. Compare each step's real time (the differences between the `Auto step ... started at` lines) with your predictions.

### What you will probably see

The routine should still drive leg 1, turn, and stop at the line. But the step times will probably come out a bit **longer** than predicted, and the `Measured Forward (m per s)` widget will probably read a bit **less** than `0.20` during the straight legs.

That is the `speedToPower` guess showing its weakness. You asked for 0.20 m/s, which the guess turned into `0.20 / 0.28 = 0.71` power. But part of that power goes into overcoming friction, so the robot settles a bit below 0.20. The turn is usually even further off, because scrubbing adds a lot of friction.

This is not a failure. It is the first time you could **see** the gap at all. With `arcadeDrive(0.5, ...)`, there was no "asked for" number to compare against. Now there is: commanded 0.20, measured maybe 0.17. A gap you can measure is a gap you can close, and closing it is exactly what PID control (Chapter 15) and feedforward (Chapter 16) do.

> **Open loop, in better units**
>
> Your `drive` method is still **open-loop**: it computes a power and sends it, without checking whether the wheels actually reached the speed you asked for. The difference from Chapter 12 is that the open loop now speaks the right language. Because `getChassisSpeeds()` measures the robot in the same units `drive` is commanded in, the two can be compared directly, and comparing what you asked for with what you got, then correcting, is exactly what **closing the loop** means. Chapters 15 and 16 build the tools for it. And because the speed-to-power step lives inside `Drivetrain`, improving it will not require changing `autonomousPeriodic()`. That is the reward for putting the kinematics in the drivetrain.

---

## 13.10 Kinematics Everywhere

You have spent this whole chapter on a robot with two wheels. Here is why it was worth it.

Every FRC drivetrain, no matter how complicated, works the same way: the rest of the program describes the motion it wants as a `ChassisSpeeds`, and a kinematics class turns that into commands for the wheels. Only the inside of the kinematics class changes:

| Drivetrain | WPILib class | What it computes from a `ChassisSpeeds` |
|---|---|---|
| Differential (XRP, tank drive) | `DifferentialDriveKinematics` | A speed for the left and right sides |
| Mecanum | `MecanumDriveKinematics` | A speed for each of four angled-roller wheels |
| Swerve (Mini Swerve, Chapters 28 to 30) | `SwerveDriveKinematics` | A speed **and** a steering angle for each module |

For swerve, the idea is the same as the marching band, in two dimensions. Each module is at a different spot on the robot, so when the robot spins, each module has to move in a different direction to go around the turn center. Swerve kinematics adds the robot's forward and sideways motion to each module's "spinning" motion, the way you added `vx` and `(L/2) × ω` in this chapter, and gets one arrow per module: how fast, and which way to point. In Chapter 28 you will meet `SwerveDriveKinematics`, and you will recognize it.

The same goes for the tools that come later. PathPlanner (Chapter 31) follows a path by producing a `ChassisSpeeds` fifty times a second and handing it to your drivetrain's `drive` method. Field-oriented driving (Chapter 29) is just a conversion from one `ChassisSpeeds` to another before it reaches kinematics. Once your drivetrain can take a `ChassisSpeeds`, all of that plugs in.

> **The interface that never changes**
>
> Notice what this means for your code. A teammate writing an autonomous routine only needs to know one thing about the drivetrain: "call `drive` with a `ChassisSpeeds`." They do not need to know whether it has two wheels or four modules, or what the trackwidth is. That separation between **what you want** and **how the hardware does it** is the most important design idea in robot code, and you will see it again in Chapter 17, when the AdvantageKit IO layer separates the drivetrain's logic from its hardware, and in Chapter 19, when the drivetrain becomes a command-based subsystem.

---

## Chapter Summary

> **What you learned in Chapter 13**
>
> * **Kinematics** is the geometry of motion: how the robot's motion relates to its wheels' motion. **Inverse kinematics** turns the motion you want into wheel speeds (to command the robot). **Forward kinematics** turns wheel speeds into the robot's motion (to measure it).
> * Robot motion is described in the robot's own frame with three numbers, the **chassis speeds**: v<sub>x</sub> forward, v<sub>y</sub> left, and ω counterclockwise, in meters per second and **radians** per second. A differential drive is **non-holonomic**: its v<sub>y</sub> is always zero.
> * For a differential drive with trackwidth L: `left = vx - (L/2) × ω` and `right = vx + (L/2) × ω`. Going back: `vx = (left + right) / 2` and `ω = (right - left) / L`. The turn radius is `vx / ω`. Scrubbing makes the **effective trackwidth** a little larger than the measured one.
> * A method can return several values by bundling them into a **data class**. WPILib's `ChassisSpeeds` and `DifferentialDriveWheelSpeeds` are data classes with public, unit-named fields. Objects can be **parameters** and **return values**, and small data objects can be created every loop; "create once" is for hardware.
> * Some methods **change the object** they are called on (`desaturate`, which returns `void`), and some **return a new object** (`times`). Ignoring the result of a "returns new" method is a silent bug. Two variables can **refer to the same object**, so a change through one shows up through the other.
> * **Desaturating** scales both wheel speeds by the same factor, so the robot follows the same curve more slowly instead of a different curve.
> * The Explorer now drives by velocity: `drivetrain.drive(ChassisSpeeds)` uses `DifferentialDriveKinematics`, desaturates, and converts speed to power by dividing by a measured top speed, a rough **feedforward** that Chapter 16 will replace. Real units let you **predict** step times, and `getChassisSpeeds()` lets you see the gap between commanded and actual speed that PID and feedforward will close.

---

## Exercises

### Practice

**1. Kinematics by hand, then by code.** Use the XRP's trackwidth, `L = 0.155` m. For each row, compute the left and right wheel speeds by hand (show your work), the turn radius `vx / ω` where it makes sense, and describe in a few words what the robot does:

| | vx (m/s) | ω (rad/s) | Left (m/s) | Right (m/s) | Turn radius (m) | What it does |
|---|---|---|---|---|---|---|
| a | 0.25 | 0.0 | | | | |
| b | 0.0 | -1.0 | | | | |
| c | 0.20 | 1.0 | | | | |
| d | 0.10 | 2.0 | | | | |
| e | -0.15 | 0.5 | | | | |

Then do it backward: the encoders read left `0.20` m/s and right `0.10` m/s. What are vx and ω? Which way is the robot turning, and how many degrees per second?

Finally, verify every answer with code: put temporary lines in your `Robot()` constructor that build a `DifferentialDriveKinematics(0.155)`, call `toWheelSpeeds` and `toChassisSpeeds`, and print the results (Section 13.6). For any row where your hand answer and the code disagree, find the mistake and write one sentence about what it was. Remove the temporary lines when you are done, and save your table in `reflections.md`.

**2. Measure your effective trackwidth.** In Section 13.4, you learned that scrubbing makes the real robot turn as if its wheels were farther apart. Measure how much:

1. Put the robot on your usual surface. Press Y on the controller to zero the encoders and gyro (Chapter 9).
2. In teleop, spin the robot in place to the left for about **five full turns**, slowly. Stop.
3. Read `Heading (deg)`, `Left Distance (m)`, and `Right Distance (m)` from the dashboard.
4. Convert the heading to radians with `Math.toRadians` (or multiply by π/180).
5. Compute: `effective trackwidth = (rightDistance - leftDistance) / headingRadians`.

Do it three times and average. How does your number compare to `0.155`? Is it larger, as Section 13.4 predicts? Try it on a second surface. Would you use the measured value or the effective value for `TRACKWIDTH_METERS`, and why? (There is no single right answer. Defend yours in two sentences.) Why does spinning five turns give a better answer than spinning one?

**3. Same object, or new object?** Predict what each block prints, then check in a scratch file or your `Robot()` constructor. You will need the kinematics imports.

```java
// Block A
ChassisSpeeds a = new ChassisSpeeds(0.2, 0.0, 1.0);
a.times(2.0);
System.out.println(a.vxMetersPerSecond);

// Block B
ChassisSpeeds b = new ChassisSpeeds(0.2, 0.0, 1.0);
ChassisSpeeds c = b.times(2.0);
System.out.println(b.vxMetersPerSecond + " " + c.vxMetersPerSecond);

// Block C
DifferentialDriveWheelSpeeds d = new DifferentialDriveWheelSpeeds(0.1, 0.56);
DifferentialDriveWheelSpeeds e = d;
e.desaturate(0.28);
System.out.println(d.leftMetersPerSecond + " " + d.rightMetersPerSecond);

// Block D
DifferentialDriveWheelSpeeds f = new DifferentialDriveWheelSpeeds(0.1, 0.2);
f.desaturate(0.28);
System.out.println(f.leftMetersPerSecond + " " + f.rightMetersPerSecond);
```

For each block, write one sentence explaining the result. Block D is not a trick, but it might surprise you. (Hint: read what `desaturate` does when nothing is too fast.)

**4. Velocity teleop (optional).** What would teleop feel like in real units? Make a copy of your `teleopPeriodic()` drive line and try this instead, temporarily:

```java
double maxTurnRadiansPerSecond = 2.0 * 0.28 / 0.155;   // fastest spin: both wheels at top speed
drivetrain.drive(limitedForward * speedScale * 0.28,
    rotation * speedScale * TURN_SCALE * maxTurnRadiansPerSecond);
```

First, check the math in the comment: why is the fastest in-place spin `2 × topSpeed / trackwidth`? How many degrees per second is that? Then drive around. How does it feel compared to `arcadeDrive`? (Remember that `arcadeDrive` squares the sticks and `drive` does not.) Which would you give to your drive team, and why? Put teleop back to `arcadeDrive` when you are done, unless you have a good reason to keep the new version and can explain it in your commit message.

### Build (XRP Explorer)

Give the Explorer a drivetrain that drives by chassis velocity, and run the obstacle course in real units.

1. Measure your robot's top speed (Section 13.8), three runs, using the slower side. Write the number and today's date down.
2. Update `Drivetrain.java` to the listing in Section 13.8, with your measured top speed in `MAX_WHEEL_SPEED_METERS_PER_SECOND` and the date in its comment. Build and confirm `BUILD SUCCESSFUL`.
3. Add the two `Measured` widgets to `updateDashboard()` in `Robot.java`, and the `ChassisSpeeds` import. Run in teleop and drive around. Put `Measured Turn (deg per s)` next to the gyro's `Turn Rate (deg per s)` on your dashboard and save the layout.
4. Update the autonomous constants and `autonomousPeriodic()` as in Section 13.9.
5. Before running, fill in a prediction table like the one in Section 13.9 using **your** constants.
6. Run the course five times. For each run, record each step's actual time from the terminal log, and the `Measured Forward (m per s)` value during leg 1.
7. Compare predicted and actual times. Compute the ratio `measured forward speed ÷ commanded forward speed` for leg 1. Keep this number: it is your baseline for the PID and feedforward chapters (15 and 16).
8. Run the two safety-net tests from Chapter 12 again (tape removed; robot held by hand). Confirm they still log `No line within...` and `TIMED OUT` with the new timeout.

Diagnose anything strange:

- **The robot does not move at all in autonomous:** `MAX_WHEEL_SPEED_METERS_PER_SECOND` may be much larger than it should be (a typo like `2.8`), making every power tiny. Print `speedToPower(0.20)` or check the constant.
- **The robot lurches at full power in autonomous:** the opposite problem: top speed too small (a typo like `0.028`), so every power is huge. `tankDrive` caps power at `1.0`, but the turn will be the wrong shape.
- **Turns right instead of left:** check the sign of `AUTO_TURN_RADIANS_PER_SECOND`. Positive turns left. If the constant is positive and the robot still turns right, check that `tankDrive` gets left first, then right.
- **Turns very slowly, or in jerky bursts:** the turn speed is too low to overcome scrubbing friction. Raise `AUTO_TURN_RADIANS_PER_SECOND` to `2.5` or `3.0`.
- **`Measured Turn` and the gyro's turn rate have opposite signs:** one of them is backward. Turn the robot left by hand. Both should go positive. If the gyro is wrong, fix it in `getHeadingDegrees()` and `getTurnRateDegreesPerSecond()` (Chapter 9). If the measured turn is wrong, one encoder is counting backward; check that both distances go up when you push the robot forward.
- **A step times out that used to finish:** the robot is running slower than commanded. Compare `Measured Forward` with `AUTO_DRIVE_METERS_PER_SECOND`, and size the timeout from the measured speed.
- **Compile error `cannot find symbol: class ChassisSpeeds`:** a missing import. Both files that use it need `import edu.wpi.first.math.kinematics.ChassisSpeeds;`.

When the Explorer runs the course five times in a row with the new constants, you have a drivetrain that speaks the same language as odometry, path following, and swerve. In Chapter 14, `Drivetrain` will use the same kinematics ideas to track where the robot is on the floor.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Suppose you built a wider Explorer, with its wheels twice as far apart (doubling the trackwidth). If the left and right wheels go at the same two speeds as before, what happens to the robot's turn radius? Use the formulas to explain, not just intuition. What would that mean for a robot trying to turn tightly in a crowded field?
2. When a wheel is asked to go faster than it can, `desaturate` slows **both** wheels by the same factor. Describe what would happen to the robot's path if you instead just capped the fast wheel at top speed and left the other wheel alone.
3. In Section 13.9, the robot probably drove a little slower than the 0.20 m/s you asked for. Explain why, using the words "open-loop" and "friction." Why is it still better to command 0.20 m/s than 0.5 power, even though neither one is perfectly accurate?

If any answer feels shaky, re-read Sections 13.3, 13.7, and 13.9.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b kinematics-drive
```

Do the Build exercise on that branch. Make sure you removed the temporary test lines from your `Robot()` constructor. When the routine runs reliably:

```bash
git add .
git commit -m "Ch13: kinematics-based drive"
git push -u origin kinematics-drive
```

Open a pull request into `main`. In the description, include your measured top speed, your prediction table from Build step 5 next to the actual step times, and your measured-to-commanded speed ratio. Review the **Files changed** tab yourself, merge, delete the branch, then `git checkout main` and `git pull`.

That speed ratio is a baseline. When later chapters improve how the Explorer turns a speed into a power, you will be able to show, with numbers, how much closer each change gets the robot to the speed you asked for.

### Collab: Call the Wheels

Work with a partner. One person calls out a motion, like "0.2 forward, 1.5 left," and the other has 60 seconds to work out the left and right wheel speeds on paper. Then check with code. Swap roles after each one, five each. For the last two rounds, make it harder: the caller names two wheel speeds, and the solver works out vx, ω, and the turn radius. Afterward, compare where each of you made mistakes. Was it the sign of ω, the `/ 2`, or something else? Each of you writes one "watch out for" note in your `reflections.md`.

---

> **Additional Resources**
>
> * **Introduction to Kinematics and the ChassisSpeeds Class**: [docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/intro-and-chassis-speeds.html](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/intro-and-chassis-speeds.html) WPILib's own introduction to chassis speeds, including the field-relative conversion you will use for swerve
> * **Differential Drive Kinematics**: [docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-kinematics.html](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-kinematics.html) the official guide to `DifferentialDriveKinematics`, `toWheelSpeeds`, and `toChassisSpeeds`
> * **Coordinate System**: [docs.wpilib.org/en/stable/docs/software/basic-programming/coordinate-system.html](https://docs.wpilib.org/en/stable/docs/software/basic-programming/coordinate-system.html) WPILib's robot and field coordinate frames, with pictures, and why counterclockwise is positive
> * **`DifferentialDriveKinematics` Javadoc**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/kinematics/DifferentialDriveKinematics.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/kinematics/DifferentialDriveKinematics.html) every method on the class, including `toTwist2d`, which Chapter 14 builds on
> * **Getting to Know Your XRP**: [docs.wpilib.org/en/stable/docs/xrp-robot/getting-to-know-xrp.html](https://docs.wpilib.org/en/stable/docs/xrp-robot/getting-to-know-xrp.html) the XRP's official specifications: 60 mm wheels, 155 mm trackwidth, and the motor speed used for the top-speed estimate in this chapter

---

*Next up, Chapter 14: Odometry: Knowing Where You Are. You will turn the encoders and gyro into a running estimate of the robot's position on the floor, watch it on a field map as the Explorer drives, and find out why a robot that drives a perfect square never quite ends up where it started.*
