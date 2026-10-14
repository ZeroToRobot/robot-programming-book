# Chapter 28: Swerve Kinematics

In Chapter 27, every device on the Mini Swerve got an address, and every motor got a test. You held A in Test mode, and one motor at a time turned, gently, while your team watched and wrote down which way it went. By the end, the code and the robot agreed about all eight motors.

But the robot still cannot drive. The motor readings are in **motor** rotations, not wheel meters. The CANcoders report numbers, but nobody has told them where "straight ahead" is. And nothing in the code knows how to turn "go forward" into eight motor commands. That last part is the heart of this chapter, and the heart of every swerve robot: given how you want the **robot** to move, how fast should each **wheel** roll, and which way should it point?

Here is what makes a swerve robot worth all this trouble. The Explorer could do two things: roll forward or backward, and turn. A swerve robot can do three, at the same time: roll forward, slide **sideways**, and spin. It can drive across the field in a straight line while it turns to face a target the whole way. No tank drive can do that. The price is math. Four wheels, each at its own angle and speed, all have to agree, every 20 milliseconds, or the robot fights itself.

The good news: the math is Chapter 13's idea, in two directions instead of one, and you can work it out by hand with a calculator. We will. Then WPILib will do it for you, and you will check WPILib's answers against yours.

By the end of this chapter, your team will have:

- the module **gear ratios** in the code, so every reading is in wheel meters and module turns, checked by rolling a wheel by hand,
- every **CANcoder** calibrated, so `0` means "straight ahead" on all four modules,
- a `Module` that **steers** with a PID controller and never turns its wheel more than a quarter turn,
- `SwerveDriveKinematics` turning a robot speed into four wheel speeds and angles,
- a **kinematics check**: hold a button, and watch four wheels point and roll exactly the way your hand math said they would,
- a pretend CANcoder in the simulator, and eighteen tests, green on every push.

On the Java side, you will learn the **remainder operator** `%`, the tool for numbers that wrap around like the hands of a clock, and how **arrays and objects behave when you pass them to a method**: why `desaturateWheelSpeeds` can change your array without returning anything.

The robot does not drive on the floor in this chapter. That is Chapter 29, with a controller and the Pigeon 2. Everything here happens on blocks, wheels in the air, where a mistake costs nothing. You need the Mini Swerve on blocks, a charged battery, a USB stick, your laptop, a straightedge (a metal ruler or a length of aluminum tube), and a piece of tape. Work in your Mini Swerve team.

---

## 28.1 Four Wheels That Can Point Anywhere

Picture the Explorer in Chapter 13, trying to get to a spot one meter to its left. It could not just go there. It had to turn left, drive, and turn back. Its wheels only roll forward and backward along the robot, so "sideways" is not a direction it can move in. In Chapter 13's words, its motion had two parts: a forward speed and a turn rate.

Now look at one swerve module on the Mini Swerve. It has a wheel, a **drive** motor that rolls the wheel, and a **steer** motor that turns the whole wheel around a vertical axis, like the caster on an office chair, but driven. Point all four wheels to the left and roll them, and the robot slides left without turning. Point them at 45 degrees and it moves diagonally. Point each one around a circle, and the robot spins in place. Mix the two, and the robot can slide while it spins.

So a swerve robot's motion has **three** parts, and WPILib packs them into the same class Chapter 13 used, `ChassisSpeeds`:

| Field | What it means | Unit |
|---|---|---|
| `vxMetersPerSecond` | How fast the robot moves **forward** (negative is backward) | Meters per second |
| `vyMetersPerSecond` | How fast the robot moves to its **left** (negative is right) | Meters per second |
| `omegaRadiansPerSecond` | How fast the robot **spins** counterclockwise, seen from above (negative is clockwise) | Radians per second |

On the Explorer, `vy` was always zero, because it had to be. On the Mini Swerve, all three are free. A robot that can move in all three ways at once, independently, is called **holonomic**, and it is why nearly every competitive FRC team drives swerve.

> **The robot's frame, again**
>
> Chapters 13 and 14 set up WPILib's directions, and swerve uses every one of them. From the robot's point of view: **+x** points out the front, **+y** points out the left side, and positive angles are **counterclockwise**, seen from above. "Left" is `+y`, not `-y`: it is the most common sign mistake in all of swerve code, so say it out loud once: "x forward, y left, counterclockwise positive." These are directions **on the robot**. Chapter 29 adds the other frame, the field, and the Pigeon 2 that connects them.

### Two questions, two directions

Chapter 13 gave the math its name: **kinematics**, the geometry of motion, with no forces in it, just speeds and positions. And it works in two directions:

- **Inverse kinematics** goes from the robot to the wheels: "I want the robot to move like **this**. What should each wheel do?" You use it every loop to drive.
- **Forward kinematics** goes from the wheels to the robot: "The wheels are doing **this**. How is the robot moving?" You use it to measure what really happened, and Chapter 30 uses it to keep track of where the robot is.

For the Explorer, each direction was a pair of short formulas. For a swerve robot, each module has two numbers (a speed and an angle), so there are eight numbers on the wheel side and three on the robot side. Let's work out how they connect, by hand, before any code.

---

## 28.2 Swerve Math by Hand

Start with a picture of the Mini Swerve from above. The robot's **center** is the origin. Each module sits at a corner, and its position, measured from the center, is a `Translation2d` (Chapter 14): how far forward, and how far left.

```
                    front (+x)
                        ^
         FL  o----------|----------o  FR
             |          |          |
             |          |          |
 left (+y)  <-----------+          |
             |       (center)      |
             |                     |
         BL  o---------------------o  BR
```

The Mini Swerve is square: its wheel centers are 15.5 inches apart front to back (the **wheelbase**) and 15.5 inches apart left to right (the **track width**). Half of 15.5 inches is 7.75 inches, or **0.197 meters**. So:

| Module | x (forward) | y (left) |
|---|---|---|
| Front left | +0.197 m | +0.197 m |
| Front right | +0.197 m | -0.197 m |
| Back left | -0.197 m | +0.197 m |
| Back right | -0.197 m | -0.197 m |

Read each row against the picture. The front modules have positive x. The left modules have positive y. If that ever feels backward, go back to "x forward, y left."

### Each wheel's velocity has two parts

Here is the one idea that all of swerve kinematics rests on. Every point on a robot moves with two parts added together:

1. **The slide.** If the robot moves forward and left without spinning, every point on it moves exactly the same way: `vx` forward and `vy` left. Every wheel gets the same velocity.
2. **The spin.** If the robot spins about its center, each point moves around a circle, and points far from the center move faster. A corner of the robot moves **sideways to the line** from the center to that corner.

Think about the spin part for the front left corner, with the robot spinning counterclockwise. Because the corner is in **front** of the center, the spin carries it to the **left**. Because it is to the **left** of the center, the spin carries it **backward**. The farther out it is, the bigger each push. That gives the two rules for a module at position (x, y), when the robot spins at ω (the Greek letter omega, for `omegaRadiansPerSecond`):

```
module forward speed   =  vx  -  ω × y
module leftward speed  =  vy  +  ω × x
```

That is the whole of inverse kinematics. The first rule says: modules on the left (positive y) get pushed backward by a counterclockwise spin. The second says: modules in front (positive x) get pushed left. Then turn each module's forward and leftward speeds into one speed and one angle, with two tools: `Math.hypot` from Chapter 14 for the length, and **`Math.atan2`** for the direction.

```
module speed  =  Math.hypot(forward, leftward)       // how fast the wheel must roll
module angle  =  Math.atan2(leftward, forward)       // which way it must point
```

`Math.atan2(y, x)` answers "which direction is the arrow that goes `x` forward and `y` left?" in radians, from -π to π, with 0 pointing straight ahead and positive angles to the left. Notice the order: **y first**. That trips up everyone once.

> **Chapter 13, hiding inside**
>
> Look at the first rule for a wheel on a differential drive, sitting on the left side at y = half the track width, with `vy` stuck at zero: `forward = vx - ω × (trackwidth / 2)`. That is Chapter 13's left-wheel formula, exactly. A tank drive is a swerve drive whose wheels are not allowed to steer. The math did not change; the robot gained a direction.

### Four worked examples

Get out a calculator. Each example uses the four module positions from the table above.

**Example 1: forward at 0.5 m/s.** `vx = 0.5`, `vy = 0`, `ω = 0`. With no spin, both rules give every module `forward = 0.5`, `leftward = 0`. Every wheel points at 0 degrees (straight ahead) and rolls at 0.5 m/s. No surprise, and that is the point: your first test of any math should be one where you already know the answer.

**Example 2: left at 0.5 m/s.** `vx = 0`, `vy = 0.5`, `ω = 0`. Every module gets `forward = 0`, `leftward = 0.5`. `atan2(0.5, 0)` is 90 degrees. All four wheels point left and roll at 0.5 m/s. The robot slides sideways, still facing forward. The Explorer could never do this.

**Example 3: spin in place at 1 radian per second.** `vx = 0`, `vy = 0`, `ω = 1.0`. Now each module is different. Front left, at (+0.197, +0.197):

```
forward  = 0 - 1.0 × 0.197   = -0.197
leftward = 0 + 1.0 × 0.197   = +0.197
speed    = hypot(-0.197, 0.197)  = 0.278 m/s
angle    = atan2(0.197, -0.197)  = 135 degrees
```

Do the other three yourself before you read the table:

| Module | Forward | Leftward | Speed | Angle |
|---|---|---|---|---|
| Front left | -0.197 | +0.197 | 0.278 m/s | 135° |
| Front right | +0.197 | +0.197 | 0.278 m/s | 45° |
| Back left | -0.197 | -0.197 | 0.278 m/s | -135° |
| Back right | +0.197 | -0.197 | 0.278 m/s | -45° |

Draw it. Every wheel points **sideways to the line from the center to its corner**, like the rim of a wheel, and all four roll at the same speed. That makes sense on a square robot: every corner is the same distance from the center, 0.278 meters, and a corner that distance out, spinning at 1 radian per second, moves at 0.278 meters per second. (That is what a radian is: an arc as long as the radius, Chapter 13.)

**Example 4: forward at 0.5 m/s while spinning at 1 radian per second.** Now both parts add up. Front right, at (+0.197, -0.197):

```
forward  = 0.5 - 1.0 × (-0.197)  = 0.697
leftward = 0.0 + 1.0 × (+0.197)  = 0.197
speed    = hypot(0.697, 0.197)   = 0.724 m/s
angle    = atan2(0.197, 0.697)   = 15.8 degrees
```

| Module | Speed | Angle |
|---|---|---|
| Front left | 0.361 m/s | 33.0° |
| Front right | 0.724 m/s | 15.8° |
| Back left | 0.361 m/s | -33.0° |
| Back right | 0.724 m/s | -15.8° |

The right-side wheels roll twice as fast as the left-side ones, and every wheel is angled a little. That is a robot curving left as it drives forward, the same thing the Explorer did in Chapter 13 when its right wheel ran faster than its left. Only now the wheels also **point** along the curve, so nothing scrubs sideways.

Keep these four tables. In Section 28.10 they become tests, and in Section 28.9 you will watch the real wheels match them.

### When a wheel cannot go that fast

Ask for more than the robot can do, and the math does not mind. Try `vx = 2.5` and `ω = 8.0`: the front right and back right modules come out at 4.37 meters per second. Section 28.3 shows that a Mini Swerve wheel can never roll faster than about 3.10 meters per second. So what should the code do?

The wrong answer is to cut just the fast wheels down to 3.10 and leave the others alone. The four wheels would no longer agree about the motion, and the robot would skid and drift in some direction nobody asked for. The right answer is to slow **all four** down by the same fraction, so the fastest wheel is exactly at the limit: 3.10 / 4.37 is 0.71, so every wheel's speed is multiplied by 0.71. The **angles** do not change, so the robot still moves in the right **shape**, just slower. WPILib calls this **desaturating** the wheel speeds (Chapter 13 did the same thing for the Explorer, with `DifferentialDriveWheelSpeeds.desaturate`).

### And back again

Forward kinematics runs the other way: four measured speeds and angles in, one `ChassisSpeeds` out. With four wheels and only three things to work out, there are more equations than unknowns, so WPILib finds the robot motion that fits all four wheels **best** (a method called least squares, which you do not need to know yet). If the wheels all agree, "best" is exact. If one wheel slips, the others outvote it. You will not do this direction by hand. You will use it to check, in Section 28.10, that the simulated robot really does what it was asked.

> **Swerve kinematics, in one sentence**
>
> Each wheel's velocity is the robot's slide plus the robot's spin times that wheel's distance from the center, turned sideways; inverse kinematics adds those up for each corner, and forward kinematics works backward from all four wheels to the one motion that fits them.

---

## 28.3 Gear Ratios: From Motor Turns to Wheel Meters

The math in Section 28.2 speaks in **wheel meters per second** and **module angles**. Everything the robot reported in Chapter 27 was in **motor rotations**. Between the two sit the gears.

### The drive gears

Inside each Mini Swerve module, the drive motor's shaft does not touch the wheel. It turns a small gear, which turns a bigger one, and so on, through three **stages**, until the last gear turns the wheel. The module's designers wrote the stages on the fact sheet as tooth counts. Each stage's **ratio** is the driven gear's teeth divided by the driving gear's teeth:

| Stage | Teeth | Ratio | What it does |
|---|---|---|---|
| 1 | 48 / 16 | 3.0 | The motor's 16-tooth gear turns a 48-tooth gear: 3 motor turns for 1 |
| 2 | 16 / 28 | 0.571 | Under 1: this stage speeds the turn back up a little |
| 3 | 45 / 15 | 3.0 | Another 3 to 1 |

Stages multiply, so the whole **drive gear ratio** is

```
(48 / 16) × (16 / 28) × (45 / 15) = 3.0 × 0.571 × 3.0 = 5.14
```

The motor turns **5.14 times** for every one turn of the wheel. Chapter 13 sprinkled this idea: a gear reduction trades speed for force. The motor spins fast and weak; the wheel spins slower and stronger.

Now the wheel. A Mini Swerve wheel is **2 inches** across, 0.0508 meters. One full turn rolls it one **circumference** along the floor:

```
circumference = π × diameter = π × 0.0508 = 0.1596 meters
```

Put the two together, and one turn of the **motor** rolls the wheel 0.1596 / 5.14 = **0.0310 meters**, about three centimeters. Multiply any drive motor reading in rotations by that, and you have wheel meters.

> **Your fact sheet wins, again**
>
> These are the numbers for the Mini Swerve this book was written with: 2-inch wheels, the gears above, 15.5 inches between wheel centers each way. Your modules may have different gears, a different wheel, or a different frame. Open `docs/robot.md` and check every number in this section against it. If the fact sheet says "unknown," count the teeth (robot off, guards removed by a mentor) or ask the module's maker, and write down how you know. Section 28.9 shows you how to **check** each ratio on the real robot, which is better than trusting any number, including this book's.

### The steer gears

The steer motor turns the module through two stages: **(16 / 10) × (32 / 15) = 3.41**. The steer motor turns 3.41 times for each full turn of the wheel around its vertical axis.

The CANcoder needs no ratio at all. It sits on the module's turning axis itself, with its magnet turning exactly once for each turn of the module. That is the whole reason it is there: its reading **is** the module's angle, with no gears in between to slip or to count wrong.

### How fast can a wheel roll?

The Kraken X60's data sheet says its shaft spins at about **6,000 RPM** with 12 volts and nothing attached: its **free speed**. That is 100 rotations per second. Through the drive gears and around the wheel:

```
100 motor rotations per second / 5.14  =  19.4 wheel rotations per second
19.4 × 0.1596 meters                   =  3.10 meters per second
```

So **3.10 meters per second** is the fastest a Mini Swerve wheel could ever roll, with a full battery and no friction, and the real robot will be a little slower. That is the limit desaturation uses. It also gives the drive its first, rough **feedforward** (Chapter 16): if 12 volts makes 3.10 meters per second, then each meter per second needs about 12 / 3.10 = **3.87 volts**. That is a **kV** read off a data sheet, not measured, and with no **kS** for friction. Chapter 13 did exactly the same thing for the Explorer, with a promise that Chapter 16 would replace it. This time the promise points at Chapter 32, where SysId measures the real kS, kV, and kA on these motors.

### Let the motor do the arithmetic

You could multiply by 0.0310 in your Java code every loop. Phoenix 6 offers something tidier. A Talon FX's configuration has a setting called **`SensorToMechanismRatio`**: "how many turns of the motor make one turn of the thing I care about." Set it to the drive gear ratio, and the Talon FX itself reports **wheel** rotations and wheel rotations per second. Set it to the steer gear ratio on a steer motor, and it reports **module** rotations.

```java
driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.DRIVE_GEAR_RATIO;   // reports wheel turns
steerConfig.Feedback.SensorToMechanismRatio = DriveConstants.STEER_GEAR_RATIO;   // reports module turns
```

Then one multiplication, by the wheel's circumference, turns wheel rotations into meters. The gear ratio lives in one place, the motor's settings, which your code sends in full every time the robot starts (Section 27.6). AdvantageKit's own TalonFX swerve template does the same.

> **Units in the names, still**
>
> Chapter 27 named every reading `driveMotorRotations` and promised the names would change when the units did. They do now: `drivePositionMeters`, `driveVelocityMetersPerSecond`, `steerModuleRotations`. A reading named `driveMotorRotations` that secretly holds meters is the kind of lie that costs a team an afternoon. Change the name and the unit in the same commit.

---

## 28.4 New Java: The Remainder Operator and Wrapping Angles

Turn a swerve module by hand, all the way around, three and a half times. Which way does its wheel point? Not "1,260 degrees." It points backward: 180 degrees. Angles **wrap around**, like the hours on a clock. Thirteen o'clock is one o'clock.

This matters everywhere in swerve code. The CANcoder reports a module's angle from -0.5 to just under 0.5 rotations and then jumps back (Section 27.9 watched it do that). The steer motor's own count, on the other hand, keeps going: turn the module three and a half times, and it reads 3.5. And the steering controller needs to know that 179 degrees and -179 degrees are two degrees apart, not 358. Java has an operator for exactly this kind of arithmetic.

### What is left over

Back to elementary school. 17 divided by 5 is 3, with **2 left over**. Java's **remainder** operator, `%`, gives you just the left-over part:

```java
System.out.println(17 / 5);     // prints 3: integer division (Chapter 9) throws the remainder away
System.out.println(17 % 5);     // prints 2: the remainder, and nothing else
System.out.println(15 % 5);     // prints 0: 5 goes in evenly
System.out.println(4 % 5);      // prints 4: 5 does not go in at all, so all 4 is left over
```

Read `17 % 5` as "17 remainder 5" (many people say "17 mod 5"). The answer is always smaller than the number you divide by. That is what makes it useful: whatever you feed it, `x % 5` lands somewhere from 0 to 4, and it cycles as `x` counts up:

```
x      0  1  2  3  4  5  6  7  8  9  10
x % 5  0  1  2  3  4  0  1  2  3  4  0
```

That cycling is a clock. Twelve-hour time is `hour % 12`. The even CAN IDs are the ones where `id % 2 == 0`. And the angle of a module is its total turning, **remainder one turn**.

It works on `double`s too:

```java
System.out.println(3.25 % 1.0);       // prints 0.25: three whole turns, then a quarter turn
System.out.println(370.0 % 360.0);    // prints 10.0: one full circle, then 10 degrees
```

### The negative surprise

Now the catch. Try a negative number:

```java
System.out.println(-370.0 % 360.0);   // prints -10.0, not 350.0
System.out.println(-7 % 5);            // prints -2, not 3
```

Java's `%` keeps the **sign of the number on the left**. -370 degrees is "one turn clockwise, and then 10 more degrees clockwise," and `%` honestly says -10. Sometimes that is what you want. Often, it is not: if your code assumed every answer would land from 0 to 360, a -10 slips straight past that assumption. This is a famous Java (and C, and C++) trap, and it shows up in robot code exactly where angles go negative, which is everywhere.

> **A common beginner mistake**
>
> Writing `angle % 360` and believing the answer is always between 0 and 360. It is not, for negative angles. The fix is to say exactly which range you want, and use a method built for it, like the one below.

### Wrapping into any range

WPILib has a method for "wrap this number into this range," in Chapter 8's old friend `MathUtil`:

```java
MathUtil.inputModulus(370.0, -180.0, 180.0);    // 10.0
MathUtil.inputModulus(-370.0, -180.0, 180.0);   // -10.0
MathUtil.inputModulus(190.0, -180.0, 180.0);    // -170.0: 10 degrees past "straight back" is -170
MathUtil.inputModulus(3.25, -0.5, 0.5);         // 0.25: a quarter turn
MathUtil.inputModulus(-0.75, -0.5, 0.5);        // 0.25: three quarters clockwise is a quarter counterclockwise
```

You give it the value, the bottom of the range, and the top, and it adds or subtracts whole laps (the top minus the bottom) until the value lands inside. `MathUtil.angleModulus(radians)` is the same thing, with the range fixed at -π to π. Inside `inputModulus` is a careful use of `%` that handles the negative case. You will write your own in Practice 2.

### Where wrapping lives in the Mini Swerve code

You will meet it three times in this chapter:

1. **The pretend CANcoder** in `ModuleIOSim`. The simulated steer motor counts module turns forever, like a real steer motor. A real CANcoder reads from -0.5 to 0.5. So the pretend one is one line: `MathUtil.inputModulus(steerSim.getAngularPositionRotations(), -0.5, 0.5)`.
2. **`Rotation2d`** (Chapter 14) wraps for you. `Rotation2d.fromRotations(3.25)` and `Rotation2d.fromRotations(0.25)` are the same direction, and `getDegrees()` on either gives 90. Subtracting two `Rotation2d`s with `minus` gives the **shortest** difference, already wrapped.
3. **The steering PID controller**. Chapter 15 used `enableContinuousInput(-180, 180)` on the Explorer's heading controller, so a turn from 170 degrees to -170 degrees went the short way, 20 degrees, not 340. A module's steering needs the same thing, in radians: `enableContinuousInput(-Math.PI, Math.PI)`. Inside, the controller wraps the error with `inputModulus` every loop.

> **The remainder, in one sentence**
>
> `a % b` is what is left over after taking as many whole `b`s out of `a` as fit, with the sign of `a`; for angles, use `MathUtil.inputModulus` (or `Rotation2d`) so you get the range you meant, negative numbers included.

---

## 28.5 Where Is Straight Ahead? Calibrating the CANcoders

A Kraken's own encoder is a **relative** encoder: it counts turns from wherever the shaft was when the robot powered on. If a module was pointing sideways at power-on, the steer motor says "0" for sideways. That is useless for steering, which needs to know which way the wheel **really** points.

That is the CANcoder's job. It is an **absolute** encoder: it measures the angle of a magnet stuck to the module's turning shaft, and it knows that angle the instant it powers on, no matter what happened before. But "absolute" only means "always the same answer for the same position." Nobody chose **which** position reads zero. When the module's builders pressed the magnet onto the shaft, it ended up at whatever angle it ended up at. So right now, each of your four CANcoders reads some different number when its wheel points straight ahead.

Two settings on each CANcoder fix that, and like every setting in this book, they live in the code and are sent on every start (Section 27.6):

- **`SensorDirection`**: which way of turning counts as positive. The book's promise (Chapter 27's `ModuleIO` Javadoc) is that **counterclockwise, seen from above**, is positive. A CANcoder mounted upside down, or under the module instead of on top, counts the other way. In Section 27.9, you wrote down whether each CANcoder's reading **rose** or **fell** as its module turned counterclockwise. A CANcoder that fell needs `SensorDirection` set to `Clockwise_Positive`, which flips it.
- **`MagnetOffset`**: a number of rotations **added** to every reading, so that straight ahead reads zero. If a CANcoder reads 0.137 when its wheel is straight, an offset of -0.137 makes it read 0.

In code, each is a field of a `CANcoderConfiguration`, set the same way as a `TalonFXConfiguration`:

```java
CANcoderConfiguration encoderConfig = new CANcoderConfiguration();
encoderConfig.MagnetSensor.SensorDirection = SensorDirectionValue.CounterClockwise_Positive;
encoderConfig.MagnetSensor.MagnetOffset = -0.137;
encoder.getConfigurator().apply(encoderConfig);
```

After the offset, the CANcoder wraps the answer back into -0.5 to 0.5, exactly like `inputModulus` (Section 28.4).

### What does "straight ahead" mean, exactly?

A swerve wheel looks the same pointing forward and pointing backward. Turn one 180 degrees, and it still looks "straight." But it is not the same: the drive motor now rolls the wheel the other way for the same volts. In Chapter 27, your team turned every wheel so its **bevel gear** (the angled gear on one side of the wheel) faced the **same side** of the robot, then found each drive motor's direction **in that position**. So that position, bevel gears on the side you wrote down, is "straight ahead," and it is the only one. Calibrate a module with its bevel gear on the other side, and its "forward" is backward.

> **Why not just measure it in Tuner X?**
>
> Phoenix Tuner X can zero a CANcoder for you, by working out an offset and saving it on the device. It works, and many teams use it. This book does not, for the same reason as Section 27.6: Tuner X would save the offset **on the device**, where nobody can see it in a pull request, and the next full configuration from your code would overwrite it anyway. The offset is a measured fact about your robot. It goes in `DriveConstants`, next to the CAN IDs, in a commit of its own.

You will measure the offsets in Section 28.9, once the code is ready to show you the readings. The procedure has the same shape as the motor check: line up, read, write down, put it in the code, check again.

---

## 28.6 Steering a Module: The Shortest Turn

Inverse kinematics hands each module a target: a speed and an angle, packed in a **`SwerveModuleState`**. A module's job is to get its wheel to that angle and roll at that speed. That sounds simple. Three details make it work well.

### Never turn more than a quarter turn

Suppose a wheel points straight ahead (0 degrees), and the kinematics asks for 180 degrees at 0.5 meters per second: "point backward and roll." The obvious way is to turn the wheel halfway around. But think about what pointing backward and rolling at 0.5 means: the robot goes backward. The wheel can do that **without turning at all**: stay at 0 degrees, and roll at **-0.5** meters per second. Same motion, no steering.

That trick works for any angle. If the target is more than 90 degrees away from where the wheel points now, flip it 180 degrees and roll the other way. Then no wheel ever has to turn more than a quarter turn to reach its target, and the robot reacts faster. WPILib calls this **optimizing** the state, and `SwerveModuleState` has a method for it:

```java
state.optimize(currentAngle);   // maybe flips state.angle by 180 degrees and state.speedMetersPerSecond to negative
```

Here is its whole inside, straight from WPILib:

```java
public void optimize(Rotation2d currentAngle) {
    var delta = angle.minus(currentAngle);
    if (Math.abs(delta.getDegrees()) > 90.0) {
        speedMetersPerSecond *= -1;
        angle = angle.rotateBy(Rotation2d.kPi);
    }
}
```

Read it aloud: "How far is the target from where I point? If it is more than 90 degrees either way, reverse the speed, and turn the target around by half a circle." Notice that `optimize` returns nothing. It **changes the state you call it on**. Section 28.7 is about exactly that.

> **What you will see on the robot**
>
> Because of `optimize`, a module can point the "wrong" way on purpose, rolling backward. In Section 28.9's spin check, some wheels will point at -45 degrees instead of 135 degrees and roll the other way. That is not a bug. A wheel pointing straight back and rolling backward is the same wheel motion as one pointing forward and rolling forward.

### Do not push the wrong way while turning

A module asked to go from 0 to 90 degrees takes a moment to get there. During that moment, if its wheel rolls at full speed, it pushes the robot in whatever direction it points **right now**: forward, at first, which is wrong. The fix is to scale the speed by how well the wheel points: full speed when it is on target, nothing when it is 90 degrees off, and in between, the **cosine** of the error (Chapter 14's `Math.cos`): cos 0° is 1, cos 45° is about 0.71, cos 90° is 0.

```java
state.cosineScale(currentAngle);   // speed times the cosine of (target angle minus current angle)
```

After `optimize`, the error is never more than 90 degrees, so the cosine is never negative. This is called **cosine scaling**, and it is one line. Like `optimize`, it changes the state in place.

### Steering with a PID controller

To reach the target angle, the steer motor needs volts: more when the wheel is far off, less as it gets close. That is Chapter 15's **proportional** control, and the Explorer's `headingController` was the same problem: an angle you want, an angle you have, volts out. Each `Module` gets its own `PIDController` (a PID controller remembers things, so one per job, Chapter 15):

```java
private final PIDController steerController =
    new PIDController(DriveConstants.STEER_KP, 0.0, DriveConstants.STEER_KD);
...
steerController.enableContinuousInput(-Math.PI, Math.PI);   // angles wrap (Section 28.4)
...
double steerVolts = steerController.calculate(currentAngle.getRadians(), state.angle.getRadians());
```

The input is the CANcoder's angle in radians, the setpoint is the target in radians, and the output is volts.

- **kP = 3.0 volts per radian.** A quarter turn off (1.57 radians) asks for about 4.7 volts; 10 degrees off asks for about half a volt.
- **kD = 0.08 volts per radian per second.** The Mini Swerve's steering gears are fast (3.41 to 1), so the module can swing past its target. The D term pushes back against fast swinging, the brake pedal of Chapter 15's three terms.
- **At most 6 volts.** The output is clamped (Chapter 15's `MathUtil.clamp`), so a sudden big error cannot slam a module around while you are still learning how it behaves.

These are **untested starting points**, picked by trying them on the pretend module in the simulator, where they reach a quarter turn in about a tenth of a second with almost no overshoot. A real module has friction, which the simulator does not, so a real wheel may stop a degree or two short of its target, held back by **kS** (Chapter 16). Chapter 32 measures the steering's kS and retunes these gains on the real robot.

> **Why steer on the roboRIO?**
>
> A Talon FX can run a PID loop itself, inside the motor controller, a thousand times a second, reading the CANcoder straight off the CAN bus. Competition teams usually do exactly that, and AdvantageKit's template does too. This book steers with WPILib's `PIDController` on the roboRIO first, because it is the controller you already know from Chapter 15, you can see every number in AdvantageScope, and it works the same on the real robot and the pretend one. Fifty times a second is plenty for a module on blocks. Moving the loop into the Talon FX is a good project once Chapter 32 has measured the real gains.

### Driving the wheel

The drive motor gets the simplest possible treatment for now: the wheel speed from the state, times the 3.87 volts per meter per second from Section 28.3.

```java
double driveVolts = state.speedMetersPerSecond * DriveConstants.DRIVE_KV_VOLT_SECONDS_PER_METER;
```

No PID, no kS. On blocks, with nothing to push against, it gets close. On the floor, with a robot's weight on the wheels, it will roll a little slower than asked. Chapter 29 drives on it anyway (a driver's thumb closes that loop), and Chapter 32 replaces it with measured feedforward.

### And when the robot is asked to stop?

Ask `SwerveDriveKinematics` for a `ChassisSpeeds` of all zeros, and it gives each module a speed of zero, at **whatever angle that module was last asked for**. It does not send the wheels back to 0 degrees. That is on purpose: a driver who lets go of the stick should not see every wheel snap to straight ahead, only to snap back the moment they push again. To remember those angles, a kinematics object keeps a little memory inside, which is why each `Drive` gets **its own** `SwerveDriveKinematics` (Section 28.8) instead of sharing one `static final` constant: Chapter 23's rule says a `static final` is only a true constant if the object cannot change.

---

## 28.7 New Java: Arrays and Objects In and Out of Methods

Section 28.6 had two methods that return `void` and still did something: `optimize` and `cosineScale` changed the state they were called on. Swerve code is full of this, and with arrays it gets sharper. Look at the two calls at the heart of driving:

```java
SwerveModuleState[] states = kinematics.toSwerveModuleStates(speeds);
SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.FREE_SPEED_METERS_PER_SECOND);
```

The first **returns** an array. The second returns nothing at all, and yet after it runs, the speeds inside `states` are different. How can a method change a variable that belongs to its caller? It cannot. But it can change the **object** that variable points at. To see why, run a small experiment.

### Primitives are copied

```java
static void zero(double volts) {
    volts = 0.0;
}

double batteryVolts = 12.6;
zero(batteryVolts);
System.out.println(batteryVolts);   // prints 12.6
```

When you call `zero(batteryVolts)`, Java makes a **copy** of the number 12.6 and hands the copy to the method, as its parameter `volts`. The method changes its copy. The caller's `batteryVolts` never knew. Every primitive (Chapter 4's `int`, `double`, `boolean`) works this way. A method cannot reach back and change your `double`.

### Arrays and objects: the arrow is copied

Now the same experiment with an array:

```java
static void zeroAll(double[] volts) {
    for (int i = 0; i < volts.length; i++) {
        volts[i] = 0.0;
    }
}

double[] batteryVolts = {12.9, 12.6, 12.4, 12.8};
zeroAll(batteryVolts);
System.out.println(batteryVolts[0]);   // prints 0.0
```

Chapter 10 said a variable that holds an object really holds a **reference**: an arrow pointing at the object, which lives somewhere else. Arrays are objects. So when you call `zeroAll(batteryVolts)`, Java copies the **arrow**, not the array. Now there are two arrows, `batteryVolts` in the caller and `volts` in the method, pointing at **one** array. When the method writes `volts[i] = 0.0`, it writes into that one array, and the caller sees it.

| You pass a... | Java copies... | Can the method change what the caller sees? |
|---|---|---|
| Primitive (`double`, `int`, `boolean`) | The value itself | No |
| Array or object | The reference (the arrow) | Yes: it can change the array's slots or the object's fields |

One more twist, to complete the picture. Inside the method, `volts = new double[4];` would point the method's **own** arrow at a brand-new array. The caller's arrow would still point at the old one, untouched. A method can change the object you handed it. It can never make your variable point at a different object. (Java people summarize this as "Java passes everything by value; for objects, the value is the reference.")

### Reading WPILib's methods with this in mind

Now the two calls make sense:

- **`toSwerveModuleStates(speeds)` returns a new array.** Every call makes a fresh `SwerveModuleState[]` with four fresh states in it. You own it; do what you like with it.
- **`desaturateWheelSpeeds(states, max)` changes the array you give it.** It receives a copy of your arrow, walks through the four states, and if any is too fast, scales every state's speed down, in place. It has nothing to return, because the answer is already in your array. WPILib's Javadoc says so in plain words: "The array will be mutated with the normalized speeds!"
- **`state.optimize(angle)` and `state.cosineScale(angle)` change the state object.** `Drive` passes `states[i]` to `Module.runSetpoint`, which calls both. So after the loop, the states inside **`Drive`'s own array** are optimized too.

That last one is easy to see in a log. `Drive.runVelocity` (Section 28.8) records `states` twice: once **before** handing them to the modules, as `Drive/SetpointStates`, and once **after**, as `Drive/OptimizedStates`. Same variable, same array, different numbers, because the modules changed the states inside it. AdvantageKit writes down each value at the moment you call `recordOutput`, so the log keeps both.

> **Mutation is a promise you should write down**
>
> A method that changes its argument surprises people who did not expect it. WPILib warns you in its Javadoc, and `Module.runSetpoint` does too: "Changes `state`." That is Chapter 11's contract again. When you write a method that changes an array or object it was given, say so in its Javadoc. When you call one, read the Javadoc before you reuse the thing you passed in.

### Returning an array: copy, do not hand over

The opposite direction matters too. `Drive` has a `private` array of four modules. Imagine a getter that returned it:

```java
public Module[] getModules() {
    return modules;   // BAD: hands out the arrow to our private array
}
```

Anyone who calls it gets an arrow to `Drive`'s own array, and can write `drive.getModules()[0] = null;`. The `private` on the field means nothing anymore. The fix is to **return a new array** with what the caller needs, and never the private one. That is exactly what `Drive.getModuleStates()` does: it makes a fresh `SwerveModuleState[]` every call, fills it from the modules, and returns that. Whatever the caller does to it, `Drive` does not care.

```java
public SwerveModuleState[] getModuleStates() {
    SwerveModuleState[] states = new SwerveModuleState[modules.length];
    for (int i = 0; i < modules.length; i++) {
        states[i] = modules[i].getState();   // each one a new object, too (Module.getState makes it)
    }
    return states;
}
```

It is Section 27.5's "a `final` array can still change" warning, seen from the other side: keeping an array `private` only protects it if you never hand out the arrow.

---

## 28.8 Build: Swerve Modules and Kinematics

Time to write it. Six files change, and none are new:

| File | What changes |
|---|---|
| `DriveConstants` | Frame size, wheel, gear ratios, free speed, drive kV, steering gains, each module's CANcoder settings and **location** |
| `ModuleIO` | Inputs in wheel meters and module rotations instead of motor rotations |
| `ModuleIOTalonFX` | `SensorToMechanismRatio` on both motors; the CANcoder gets its direction and offset |
| `ModuleIOSim` | Real gear ratios, a heavier pretend load, and a **pretend CANcoder** |
| `Module` | Steering: `runSetpoint`, a steering PID controller, `getAngle`, `getState` |
| `Drive` | `SwerveDriveKinematics`, `runVelocity`, forward kinematics, and the kinematics check |

Then `RobotContainer` gets three new Test mode bindings. Work on a new branch:

```bash
git checkout main
git pull
git checkout -b swerve-kinematics
```

### Step 1: `DriveConstants`

Here is the whole file. Your Chapter 27 inversions (the `true`/`false` values you measured in Section 27.9) stay exactly as they are; only the new parts are new. Type the new parts in, and check every number against your fact sheet.

```java
package frc.robot.subsystems.drive;

import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.util.Units;

/** Facts about the Mini Swerve's drive: size, gears, CAN IDs, directions, and limits (Chapters 27 and 28). */
public final class DriveConstants {
    private DriveConstants() {}

    // The frame, measured between wheel centers (fact sheet): front to back, and left to right.
    public static final double WHEELBASE_METERS = Units.inchesToMeters(15.5);
    public static final double TRACK_WIDTH_METERS = Units.inchesToMeters(15.5);

    // The wheel, and the gears between each motor and what it turns (fact sheet, Section 28.3).
    public static final double WHEEL_DIAMETER_METERS = Units.inchesToMeters(2.0);
    public static final double WHEEL_CIRCUMFERENCE_METERS = Math.PI * WHEEL_DIAMETER_METERS;
    // Drive motor turns per wheel turn: three stages, driven teeth over driving teeth. About 5.14.
    public static final double DRIVE_GEAR_RATIO = (48.0 / 16.0) * (16.0 / 28.0) * (45.0 / 15.0);
    // Steer motor turns per module turn: two stages. About 3.41.
    public static final double STEER_GEAR_RATIO = (16.0 / 10.0) * (32.0 / 15.0);

    // All eight motors are Kraken X60s (fact sheet).
    public static final DCMotor DRIVE_MOTOR = DCMotor.getKrakenX60(1);
    public static final DCMotor STEER_MOTOR = DCMotor.getKrakenX60(1);

    // The fastest a wheel could ever roll: the motor's free speed, through the gears. About 3.10 m/s.
    public static final double FREE_SPEED_METERS_PER_SECOND =
        Units.radiansToRotations(DRIVE_MOTOR.freeSpeedRadPerSec) / DRIVE_GEAR_RATIO * WHEEL_CIRCUMFERENCE_METERS;

    // Drive feedforward from the data sheet: volts per meter per second, about 3.87 (Section 28.3).
    // Chapter 32 replaces it with a measured kS, kV, and kA.
    public static final double NOMINAL_VOLTS = 12.0;
    public static final double DRIVE_KV_VOLT_SECONDS_PER_METER = NOMINAL_VOLTS / FREE_SPEED_METERS_PER_SECOND;

    // Steering PID (Section 28.6): volts per radian of error, volts per radian per second. Untested starting points.
    public static final double STEER_KP = 3.0;
    public static final double STEER_KD = 0.08;
    public static final double STEER_MAX_VOLTS = 6.0;

    // Stator current limits (Section 27.6).
    public static final double DRIVE_STATOR_LIMIT_AMPS = 80.0;
    public static final double STEER_STATOR_LIMIT_AMPS = 40.0;

    // The motor check (Section 27.9).
    public static final double MOTOR_CHECK_VOLTS = 1.5;
    public static final double MOTOR_CHECK_SECONDS = 1.5;
    public static final double MOTOR_CHECK_PAUSE_SECONDS = 0.5;

    // The kinematics check (Section 28.9): slow enough to watch, with the wheels in the air.
    public static final double CHECK_METERS_PER_SECOND = 0.3;
    public static final double CHECK_RADIANS_PER_SECOND = 1.0;

    /**
     * Everything the code needs to know about one swerve module.
     *
     * @param name the module's name in logs and alerts, like "FrontLeft"
     * @param driveCanId the CAN ID of the Kraken that rolls the wheel
     * @param steerCanId the CAN ID of the Kraken that points the wheel
     * @param encoderCanId the CAN ID of the CANcoder that measures where the wheel points
     * @param driveInverted true if positive volts rolled the wheel backward (Section 27.9)
     * @param steerInverted true if positive volts turned the module clockwise (Section 27.9)
     * @param encoderInverted true if the CANcoder's reading fell as the module turned counterclockwise (Section 27.9)
     * @param encoderOffsetRotations added to the CANcoder's reading so straight ahead reads 0 (Section 28.9)
     * @param location where the module sits, from the robot's center: +x forward, +y left
     */
    public record ModuleConstants(
        String name,
        int driveCanId,
        int steerCanId,
        int encoderCanId,
        boolean driveInverted,
        boolean steerInverted,
        boolean encoderInverted,
        double encoderOffsetRotations,
        Translation2d location) {}

    // CAN IDs and directions from the fact sheet. The CANcoder settings start as "no change":
    // Section 28.9 measures the real ones.
    public static final ModuleConstants FRONT_LEFT = new ModuleConstants(
        "FrontLeft", 1, 2, 1, false, false, false, 0.0,
        new Translation2d(WHEELBASE_METERS / 2.0, TRACK_WIDTH_METERS / 2.0));
    public static final ModuleConstants FRONT_RIGHT = new ModuleConstants(
        "FrontRight", 3, 4, 2, false, false, false, 0.0,
        new Translation2d(WHEELBASE_METERS / 2.0, -TRACK_WIDTH_METERS / 2.0));
    public static final ModuleConstants BACK_LEFT = new ModuleConstants(
        "BackLeft", 7, 8, 4, false, false, false, 0.0,
        new Translation2d(-WHEELBASE_METERS / 2.0, TRACK_WIDTH_METERS / 2.0));
    public static final ModuleConstants BACK_RIGHT = new ModuleConstants(
        "BackRight", 5, 6, 3, false, false, false, 0.0,
        new Translation2d(-WHEELBASE_METERS / 2.0, -TRACK_WIDTH_METERS / 2.0));

    /** A new kinematics object for the four modules, in the book's order. Each Drive needs its own (Section 28.6). */
    public static SwerveDriveKinematics createKinematics() {
        return new SwerveDriveKinematics(
            FRONT_LEFT.location(), FRONT_RIGHT.location(), BACK_LEFT.location(), BACK_RIGHT.location());
    }
}
```

Walk through what is new:

- **The frame and wheel**, straight from the fact sheet, through Chapter 13's `Units` helpers so the code says "inches" where the fact sheet does.
- **The gear ratios are written as fractions**, not as `5.14`. Anyone checking them against the fact sheet sees the same tooth counts, and Java does the multiplying.
- **`FREE_SPEED_METERS_PER_SECOND` and `DRIVE_KV_VOLT_SECONDS_PER_METER` are computed** from other constants (Chapter 9's computed constants), so change the gears or the wheel and they follow. `freeSpeedRadPerSec` is a field of WPILib's `DCMotor`: the data sheet's free speed, in radians per second.
- **The order in the file matters now.** `FREE_SPEED_METERS_PER_SECOND` uses `DRIVE_MOTOR`, so `DRIVE_MOTOR` must come first, and the module records use the frame size, so they come last. Chapter 23 explained why: static fields are set up top to bottom, and a field that uses one below it gets "illegal forward reference." (Chapter 27's file had `DRIVE_MOTOR` below the module records. Move it up.)
- **`ModuleConstants` grew three components**: the CANcoder's direction and offset, and the module's **location** as a `Translation2d`. The locations are Section 28.2's table, with signs: front is `+`, left is `+`. A `Translation2d` cannot change once made (Chapter 14), so it is safe inside a record constant.
- **`createKinematics()`** is a static factory (Chapter 19's `createDistanceController()` was one): it makes a **new** `SwerveDriveKinematics` every time it is called. `SwerveDriveKinematics` takes its module positions as varargs (Section 27.5), and their **order** becomes the order of every array it hands back: front left, front right, back left, back right.

> **Why not a `static final` kinematics constant?**
>
> The old swerve draft this book grew from, and plenty of team code online, writes `public static final SwerveDriveKinematics SWERVE_KINEMATICS = new SwerveDriveKinematics(...)`. It works on a robot with one drive. But a `SwerveDriveKinematics` remembers each module's last angle (Section 28.6), so it is a changeable object, and Chapter 23's rule says that is not a constant. Here is how that bites: in Section 28.10, two tests each build a `Drive`. If they shared one kinematics object, the second test would start with the first test's remembered wheel angles, and pass or fail depending on which test ran first. A factory gives every `Drive`, and every test, its own.

### Step 2: The IO interface

`ModuleIO.java`. Only the inputs change. The steer motor and the drive motor now report in the units of what they turn:

```java
package frc.robot.subsystems.drive;

import org.littletonrobotics.junction.AutoLog;

/** One swerve module's devices: a drive motor, a steer motor, and a CANcoder (Chapters 27 and 28). */
public interface ModuleIO {

    /** What the module's three CAN devices report, read once per loop. AdvantageKit logs every field. */
    @AutoLog
    public static class ModuleIOInputs {
        // The drive motor, through the drive gears: how far and how fast the wheel has rolled.
        public boolean driveConnected = false;
        public double drivePositionMeters = 0.0;
        public double driveVelocityMetersPerSecond = 0.0;
        public double driveAppliedVolts = 0.0;
        public double driveCurrentAmps = 0.0;
        public double driveTemperatureCelsius = 0.0;

        // The steer motor, through the steer gears: how far the module has turned since power-on.
        public boolean steerConnected = false;
        public double steerModuleRotations = 0.0;
        public double steerModuleRotationsPerSecond = 0.0;
        public double steerAppliedVolts = 0.0;
        public double steerCurrentAmps = 0.0;
        public double steerTemperatureCelsius = 0.0;

        // The CANcoder: which way the wheel points, from -0.5 to 0.5 rotations. 0 is straight ahead,
        // counterclockwise is positive (once Section 28.9 has calibrated it).
        public boolean encoderConnected = false;
        public double encoderAbsoluteRotations = 0.0;
    }

    /** Read the module's devices into {@code inputs}. */
    public default void updateInputs(ModuleIOInputs inputs) {}

    /** Ask the drive motor for this many volts. Positive should roll the wheel forward. */
    public default void setDriveVolts(double volts) {}

    /** Ask the steer motor for this many volts. Positive should turn the wheel counterclockwise, seen from above. */
    public default void setSteerVolts(double volts) {}
}
```

Three readings were renamed, and each name carries its new unit. `steerModuleRotations` and `encoderAbsoluteRotations` both measure the module's turning, in the same unit, but they are not the same thing: the first starts at zero at power-on and keeps counting past one turn, and the second always knows the true angle and wraps. Steering uses the CANcoder. The steer motor's count is kept for the log, where comparing the two is how you check the steer gear ratio (Section 28.9).

> **AdvantageScope after a rename**
>
> AdvantageKit logs each input under its field name, so after this change the log has `Drive/FrontLeft/DrivePositionMeters` and no `DriveMotorRotations`. Old logs from Chapter 27 still have the old names. That is fine: a log is a record of what the code was at the time, which is one more reason Chapter 25's `GitSHA` metadata is in every log.

### Step 3: The real module

`ModuleIOTalonFX.java`. Three changes from Chapter 27: each motor's configuration gets its `SensorToMechanismRatio`, the CANcoder gets a configuration of its own, and the drive readings are multiplied by the wheel's circumference. The small `applyConfig` helper becomes `report`, so it can check the CANcoder's settings too. Here is the whole file:

```java
package frc.robot.subsystems.drive;

import com.ctre.phoenix6.BaseStatusSignal;
import com.ctre.phoenix6.StatusCode;
import com.ctre.phoenix6.StatusSignal;
import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.VoltageOut;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.InvertedValue;
import com.ctre.phoenix6.signals.NeutralModeValue;
import com.ctre.phoenix6.signals.SensorDirectionValue;
import edu.wpi.first.math.filter.Debouncer;
import edu.wpi.first.math.filter.Debouncer.DebounceType;
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.Current;
import edu.wpi.first.units.measure.Temperature;
import edu.wpi.first.units.measure.Voltage;
import edu.wpi.first.wpilibj.DriverStation;
import frc.robot.subsystems.drive.DriveConstants.ModuleConstants;

/** A real swerve module: two Krakens (each with a Talon FX inside) and a CANcoder, on the CAN bus. */
public class ModuleIOTalonFX implements ModuleIO {
    private final TalonFX driveMotor;
    private final TalonFX steerMotor;
    private final CANcoder encoder;

    // One request per motor, made once and reused every loop (Section 27.7).
    private final VoltageOut driveRequest = new VoltageOut(0.0);
    private final VoltageOut steerRequest = new VoltageOut(0.0);

    // The readings we want from each device. Each one is a signal that refreshes over CAN.
    private final StatusSignal<Angle> drivePosition;
    private final StatusSignal<AngularVelocity> driveVelocity;
    private final StatusSignal<Voltage> driveVolts;
    private final StatusSignal<Current> driveCurrent;
    private final StatusSignal<Temperature> driveTemperature;

    private final StatusSignal<Angle> steerPosition;
    private final StatusSignal<AngularVelocity> steerVelocity;
    private final StatusSignal<Voltage> steerVolts;
    private final StatusSignal<Current> steerCurrent;
    private final StatusSignal<Temperature> steerTemperature;

    private final StatusSignal<Angle> encoderPosition;

    // One late answer is not a lost device. Half a second of silence is (Chapter 20's debounce).
    private final Debouncer driveConnectedDebouncer = new Debouncer(0.5, DebounceType.kFalling);
    private final Debouncer steerConnectedDebouncer = new Debouncer(0.5, DebounceType.kFalling);
    private final Debouncer encoderConnectedDebouncer = new Debouncer(0.5, DebounceType.kFalling);

    public ModuleIOTalonFX(ModuleConstants module) {
        driveMotor = new TalonFX(module.driveCanId());
        steerMotor = new TalonFX(module.steerCanId());
        encoder = new CANcoder(module.encoderCanId());

        TalonFXConfiguration driveConfig = new TalonFXConfiguration();
        driveConfig.MotorOutput.Inverted = direction(module.driveInverted());
        driveConfig.MotorOutput.NeutralMode = NeutralModeValue.Brake;
        driveConfig.CurrentLimits.StatorCurrentLimit = DriveConstants.DRIVE_STATOR_LIMIT_AMPS;
        driveConfig.CurrentLimits.StatorCurrentLimitEnable = true;
        // Report wheel turns, not motor turns (Section 28.3).
        driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.DRIVE_GEAR_RATIO;
        report(driveMotor.getConfigurator().apply(driveConfig),
            module.name() + " drive motor (CAN " + module.driveCanId() + ")");

        TalonFXConfiguration steerConfig = new TalonFXConfiguration();
        steerConfig.MotorOutput.Inverted = direction(module.steerInverted());
        steerConfig.MotorOutput.NeutralMode = NeutralModeValue.Brake;
        steerConfig.CurrentLimits.StatorCurrentLimit = DriveConstants.STEER_STATOR_LIMIT_AMPS;
        steerConfig.CurrentLimits.StatorCurrentLimitEnable = true;
        // Report module turns, not motor turns (Section 28.3).
        steerConfig.Feedback.SensorToMechanismRatio = DriveConstants.STEER_GEAR_RATIO;
        report(steerMotor.getConfigurator().apply(steerConfig),
            module.name() + " steer motor (CAN " + module.steerCanId() + ")");

        // Counterclockwise is positive, and straight ahead reads 0 (Section 28.5).
        CANcoderConfiguration encoderConfig = new CANcoderConfiguration();
        encoderConfig.MagnetSensor.SensorDirection = module.encoderInverted()
            ? SensorDirectionValue.Clockwise_Positive
            : SensorDirectionValue.CounterClockwise_Positive;
        encoderConfig.MagnetSensor.MagnetOffset = module.encoderOffsetRotations();
        report(encoder.getConfigurator().apply(encoderConfig),
            module.name() + " CANcoder (CAN " + module.encoderCanId() + ")");

        drivePosition = driveMotor.getPosition();
        driveVelocity = driveMotor.getVelocity();
        driveVolts = driveMotor.getMotorVoltage();
        driveCurrent = driveMotor.getStatorCurrent();
        driveTemperature = driveMotor.getDeviceTemp();

        steerPosition = steerMotor.getPosition();
        steerVelocity = steerMotor.getVelocity();
        steerVolts = steerMotor.getMotorVoltage();
        steerCurrent = steerMotor.getStatorCurrent();
        steerTemperature = steerMotor.getDeviceTemp();

        encoderPosition = encoder.getAbsolutePosition();
    }

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        // Ask for fresh values. If a device never answers, its status is not OK.
        StatusCode driveStatus = BaseStatusSignal.refreshAll(
            drivePosition, driveVelocity, driveVolts, driveCurrent, driveTemperature);
        StatusCode steerStatus = BaseStatusSignal.refreshAll(
            steerPosition, steerVelocity, steerVolts, steerCurrent, steerTemperature);
        StatusCode encoderStatus = BaseStatusSignal.refreshAll(encoderPosition);

        // The Talon FX already counts wheel turns; one wheel turn rolls one circumference.
        inputs.driveConnected = driveConnectedDebouncer.calculate(driveStatus.isOK());
        inputs.drivePositionMeters = drivePosition.getValueAsDouble() * DriveConstants.WHEEL_CIRCUMFERENCE_METERS;
        inputs.driveVelocityMetersPerSecond =
            driveVelocity.getValueAsDouble() * DriveConstants.WHEEL_CIRCUMFERENCE_METERS;
        inputs.driveAppliedVolts = driveVolts.getValueAsDouble();
        inputs.driveCurrentAmps = driveCurrent.getValueAsDouble();
        inputs.driveTemperatureCelsius = driveTemperature.getValueAsDouble();

        inputs.steerConnected = steerConnectedDebouncer.calculate(steerStatus.isOK());
        inputs.steerModuleRotations = steerPosition.getValueAsDouble();
        inputs.steerModuleRotationsPerSecond = steerVelocity.getValueAsDouble();
        inputs.steerAppliedVolts = steerVolts.getValueAsDouble();
        inputs.steerCurrentAmps = steerCurrent.getValueAsDouble();
        inputs.steerTemperatureCelsius = steerTemperature.getValueAsDouble();

        inputs.encoderConnected = encoderConnectedDebouncer.calculate(encoderStatus.isOK());
        inputs.encoderAbsoluteRotations = encoderPosition.getValueAsDouble();
    }

    @Override
    public void setDriveVolts(double volts) {
        driveMotor.setControl(driveRequest.withOutput(volts));
    }

    @Override
    public void setSteerVolts(double volts) {
        steerMotor.setControl(steerRequest.withOutput(volts));
    }

    /** Which way is positive? Counterclockwise unless the fact sheet says this motor is inverted. */
    private static InvertedValue direction(boolean inverted) {
        return inverted ? InvertedValue.Clockwise_Positive : InvertedValue.CounterClockwise_Positive;
    }

    /** If a device did not take its settings, say so on the Driver Station, and carry on (Section 27.6). */
    private static void report(StatusCode result, String device) {
        if (!result.isOK()) {
            DriverStation.reportError(device + " did not take its settings: " + result, false);
        }
    }
}
```

The message is word for word what Chapter 27's `applyConfig` printed ("FrontLeft steer motor (CAN 9) did not take its settings: ..."), so the wrong-ID drill still reads the same. The only new idea is `SensorDirectionValue`, Phoenix's two-value enum for a CANcoder's direction, chosen with Chapter 8's ternary, the same way `direction()` chooses a motor's.

### Step 4: The pretend module, with a pretend CANcoder

`ModuleIOSim.java`. Chapter 27's pretend motors had a gearing of 1.0 and a tiny made-up load, and no CANcoder. Now they get the real gear ratios and the loads AdvantageKit's own TalonFX swerve template uses, and the CANcoder is one line of Section 28.4:

```java
package frc.robot.subsystems.drive;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;

/** A pretend swerve module: two simulated Krakens through the real gears, and a pretend CANcoder (Chapter 28). */
public class ModuleIOSim implements ModuleIO {
    // How hard each mechanism is to spin up, in kg m^2. AdvantageKit's TalonFX swerve template uses these.
    private static final double DRIVE_INERTIA_KG_METERS_SQUARED = 0.025;
    private static final double STEER_INERTIA_KG_METERS_SQUARED = 0.004;
    private static final double LOOP_SECONDS = 0.02;
    // A motor controller cannot give a motor more than the battery has.
    private static final double MAX_VOLTS = 12.0;
    // Pretend motors never warm up.
    private static final double ROOM_TEMPERATURE_CELSIUS = 22.0;

    private final DCMotorSim driveSim = makeMotorSim(
        DriveConstants.DRIVE_MOTOR, DRIVE_INERTIA_KG_METERS_SQUARED, DriveConstants.DRIVE_GEAR_RATIO);
    private final DCMotorSim steerSim = makeMotorSim(
        DriveConstants.STEER_MOTOR, STEER_INERTIA_KG_METERS_SQUARED, DriveConstants.STEER_GEAR_RATIO);
    private double driveVolts = 0.0;
    private double steerVolts = 0.0;

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        // Let one loop of pretend time go by, at whatever volts the code asked for.
        driveSim.setInputVoltage(driveVolts);
        steerSim.setInputVoltage(steerVolts);
        driveSim.update(LOOP_SECONDS);
        steerSim.update(LOOP_SECONDS);

        // A DCMotorSim with gearing reports the turning of what the gears turn: the wheel, and the module.
        inputs.driveConnected = true;
        inputs.drivePositionMeters = driveSim.getAngularPositionRotations() * DriveConstants.WHEEL_CIRCUMFERENCE_METERS;
        inputs.driveVelocityMetersPerSecond =
            Units.radiansToRotations(driveSim.getAngularVelocityRadPerSec()) * DriveConstants.WHEEL_CIRCUMFERENCE_METERS;
        inputs.driveAppliedVolts = driveVolts;
        inputs.driveCurrentAmps = Math.abs(driveSim.getCurrentDrawAmps());
        inputs.driveTemperatureCelsius = ROOM_TEMPERATURE_CELSIUS;

        inputs.steerConnected = true;
        inputs.steerModuleRotations = steerSim.getAngularPositionRotations();
        inputs.steerModuleRotationsPerSecond = Units.radiansToRotations(steerSim.getAngularVelocityRadPerSec());
        inputs.steerAppliedVolts = steerVolts;
        inputs.steerCurrentAmps = Math.abs(steerSim.getCurrentDrawAmps());
        inputs.steerTemperatureCelsius = ROOM_TEMPERATURE_CELSIUS;

        // The pretend CANcoder: the module's total turning, wrapped into one turn like the real one (Section 28.4).
        // It is perfectly calibrated: straight ahead is exactly 0, with no offset to measure.
        inputs.encoderConnected = true;
        inputs.encoderAbsoluteRotations = MathUtil.inputModulus(steerSim.getAngularPositionRotations(), -0.5, 0.5);
    }

    @Override
    public void setDriveVolts(double volts) {
        driveVolts = MathUtil.clamp(volts, -MAX_VOLTS, MAX_VOLTS);
    }

    @Override
    public void setSteerVolts(double volts) {
        steerVolts = MathUtil.clamp(volts, -MAX_VOLTS, MAX_VOLTS);
    }

    /** A simulated motor turning a load through a gearbox. */
    private static DCMotorSim makeMotorSim(DCMotor motor, double inertiaKgMetersSquared, double gearRatio) {
        return new DCMotorSim(
            LinearSystemId.createDCMotorSystem(motor, inertiaKgMetersSquared, gearRatio), motor);
    }
}
```

- **`makeMotorSim` grew two parameters**, so the drive and the steer can have different loads and gears. With a gear ratio, a `DCMotorSim` reports the position and speed of the **output**, the thing the gears turn. So the drive sim reports wheel rotations, exactly like the real Talon FX with `SensorToMechanismRatio` set, and the same circumference turns both into meters.
- **The loads** (0.025 and 0.004 kg m², a measure of how hard something is to spin up, called its **moment of inertia**) are the numbers AdvantageKit's TalonFX swerve template uses. They are not measured on the Mini Swerve. They make a pretend module that speeds up and turns in believable times, which is all a simulator for code needs.
- **The pretend CANcoder** wraps the pretend module's total turning into -0.5 to 0.5. It needs no offset and no direction, because a pretend module's "straight ahead" is exactly where it started. That is one thing the simulator can never test: your offsets. Section 28.9 tests those on the real robot.

### Step 5: Steering in `Module`

`Module.java`. Here is the whole file. The new parts are the steering controller, `runSetpoint`, `getAngle`, and `getState`. The two getters from Chapter 27 that spoke in motor units are gone, replaced by ones that speak in wheel units:

```java
package frc.robot.subsystems.drive;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.Alert.AlertType;
import frc.robot.subsystems.drive.DriveConstants.ModuleConstants;
import org.littletonrobotics.junction.Logger;

/** One swerve module: its IO, its logged inputs, its alerts, and its steering. Drive owns all four (Chapters 27 and 28). */
public class Module {
    private final ModuleIO io;
    private final ModuleIOInputsAutoLogged inputs = new ModuleIOInputsAutoLogged();
    private final String name;

    // Each module steers with its own controller: a PID controller has memory (Chapter 15).
    private final PIDController steerController =
        new PIDController(DriveConstants.STEER_KP, 0.0, DriveConstants.STEER_KD);

    private final Alert driveSilentAlert;
    private final Alert steerSilentAlert;
    private final Alert encoderSilentAlert;

    public Module(ModuleIO io, ModuleConstants constants) {
        this.io = io;
        name = constants.name();
        driveSilentAlert = new Alert(
            name + " drive motor (CAN " + constants.driveCanId() + ") is not answering.", AlertType.kError);
        steerSilentAlert = new Alert(
            name + " steer motor (CAN " + constants.steerCanId() + ") is not answering.", AlertType.kError);
        encoderSilentAlert = new Alert(
            name + " CANcoder (CAN " + constants.encoderCanId() + ") is not answering.", AlertType.kError);

        // Angles wrap: -179 degrees and 179 degrees are 2 degrees apart (Section 28.4).
        steerController.enableContinuousInput(-Math.PI, Math.PI);
    }

    /** Read this module's inputs and update its alerts. Drive calls this once per loop. */
    public void periodic() {
        io.updateInputs(inputs);
        Logger.processInputs("Drive/" + name, inputs);

        driveSilentAlert.set(!inputs.driveConnected);
        steerSilentAlert.set(!inputs.steerConnected);
        encoderSilentAlert.set(!inputs.encoderConnected);
    }

    /**
     * Point the wheel and roll it to match one module state from the kinematics (Section 28.6).
     * Changes {@code state}: it is optimized and cosine-scaled in place, so the caller sees what was really asked.
     *
     * @param state the speed and angle this module should have
     */
    public void runSetpoint(SwerveModuleState state) {
        Rotation2d angle = getAngle();
        state.optimize(angle);       // never turn more than a quarter turn: roll backward instead
        state.cosineScale(angle);    // roll slowly until the wheel points the right way

        double driveVolts = state.speedMetersPerSecond * DriveConstants.DRIVE_KV_VOLT_SECONDS_PER_METER;
        double steerVolts = MathUtil.clamp(
            steerController.calculate(angle.getRadians(), state.angle.getRadians()),
            -DriveConstants.STEER_MAX_VOLTS,
            DriveConstants.STEER_MAX_VOLTS);
        setVolts(driveVolts, steerVolts);
    }

    /** Ask each motor for volts directly. The motor check uses this (Chapter 27). */
    public void setVolts(double driveVolts, double steerVolts) {
        io.setDriveVolts(driveVolts);
        io.setSteerVolts(steerVolts);
        Logger.recordOutput("Drive/" + name + "/DriveRequestedVolts", driveVolts);
        Logger.recordOutput("Drive/" + name + "/SteerRequestedVolts", steerVolts);
    }

    /** Zero volts on both motors. Brake mode does the rest. */
    public void stop() {
        setVolts(0.0, 0.0);
    }

    /** The module's name, like "FrontLeft". */
    public String getName() {
        return name;
    }

    /** Which way the wheel points, from the CANcoder: 0 is straight ahead, counterclockwise is positive. */
    public Rotation2d getAngle() {
        return Rotation2d.fromRotations(inputs.encoderAbsoluteRotations);
    }

    /** How fast the wheel is rolling, in meters per second. Negative is backward. */
    public double getVelocityMetersPerSecond() {
        return inputs.driveVelocityMetersPerSecond;
    }

    /** What this module is doing right now, measured: its wheel speed and angle. A new object every call. */
    public SwerveModuleState getState() {
        return new SwerveModuleState(inputs.driveVelocityMetersPerSecond, getAngle());
    }

    /** For tests: is the drive motor's "not answering" alert showing? */
    boolean isDriveSilentAlertOn() {
        return driveSilentAlert.get();
    }

    /** For tests: is the steer motor's "not answering" alert showing? */
    boolean isSteerSilentAlertOn() {
        return steerSilentAlert.get();
    }
}
```

Read `runSetpoint` aloud, line by line: "Where does the wheel point now? Optimize the target against that. Scale its speed by how well we point. Volts to roll: the speed times kV. Volts to steer: the PID controller's answer, from where we point to where we want to point, clamped to six volts. Send both." Every line is something Section 28.6 explained.

`getState()` makes a **new** `SwerveModuleState` every call, from the inputs. Nobody who calls it can change the module's inputs through it (Section 28.7). And `getAngle()` uses `Rotation2d.fromRotations`, because the CANcoder speaks rotations and the rest of WPILib speaks `Rotation2d`.

### Step 6: The kinematics in `Drive`

`Drive.java`. The constructor and the motor check from Chapter 27 do not change. Here is the whole file, with the new parts in the middle:

```java
package frc.robot.subsystems.drive;

import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import org.littletonrobotics.junction.Logger;

/** The Mini Swerve's drive: four modules, eight motors, and the swerve math (Chapters 27 and 28). */
public class Drive extends SubsystemBase {
    // Always in this order: front left, front right, back left, back right (Section 27.3).
    private final Module[] modules;
    // Our own kinematics object: it remembers each wheel's last angle (Section 28.6).
    private final SwerveDriveKinematics kinematics = DriveConstants.createKinematics();

    public Drive(ModuleIO frontLeftIO, ModuleIO frontRightIO, ModuleIO backLeftIO, ModuleIO backRightIO) {
        modules = new Module[] {
            new Module(frontLeftIO, DriveConstants.FRONT_LEFT),
            new Module(frontRightIO, DriveConstants.FRONT_RIGHT),
            new Module(backLeftIO, DriveConstants.BACK_LEFT),
            new Module(backRightIO, DriveConstants.BACK_RIGHT)
        };
    }

    @Override
    public void periodic() {
        for (Module module : modules) {
            module.periodic();
        }

        // Disabled means stopped. Then nothing old is waiting in a motor when the robot is enabled again.
        if (DriverStation.isDisabled()) {
            stop();
        }

        Logger.recordOutput("Drive/MeasuredStates", getModuleStates());
        Logger.recordOutput("Drive/MeasuredSpeeds", getChassisSpeeds());
    }

    /**
     * Move the robot at these speeds, relative to the robot itself: forward and left in meters per second,
     * counterclockwise in radians per second. Call it every loop.
     *
     * @param speeds how the robot should move
     */
    public void runVelocity(ChassisSpeeds speeds) {
        // Inverse kinematics (Section 28.2): a new array, one state per module, in the modules' order.
        SwerveModuleState[] states = kinematics.toSwerveModuleStates(speeds);
        // If any wheel is asked to beat its free speed, slow all four together. This changes our array (Section 28.7).
        SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.FREE_SPEED_METERS_PER_SECOND);
        Logger.recordOutput("Drive/RequestedSpeeds", speeds);
        Logger.recordOutput("Drive/SetpointStates", states);

        for (int i = 0; i < modules.length; i++) {
            modules[i].runSetpoint(states[i]);
        }

        // The modules optimized each state in place, so the same array now holds what they really did.
        Logger.recordOutput("Drive/OptimizedStates", states);
    }

    /** Zero volts on all eight motors. */
    public void stop() {
        for (Module module : modules) {
            module.stop();
        }
    }

    /** Every module's measured speed and angle, in the book's order. A new array every call (Section 28.7). */
    public SwerveModuleState[] getModuleStates() {
        SwerveModuleState[] states = new SwerveModuleState[modules.length];
        for (int i = 0; i < modules.length; i++) {
            states[i] = modules[i].getState();
        }
        return states;
    }

    /** Forward kinematics: how the robot is really moving, worked out from its four wheels. Robot-relative. */
    public ChassisSpeeds getChassisSpeeds() {
        return kinematics.toChassisSpeeds(getModuleStates());
    }

    /** Hold the robot at one robot-relative speed while the button is held: the kinematics check (Section 28.9). */
    public Command kinematicsCheck(String name, ChassisSpeeds speeds) {
        return runEnd(() -> runVelocity(speeds), this::stop).withName(name);
    }

    /**
     * Spin every motor alone, one after another: each module's drive motor, then its steer motor,
     * front left first. Bind it with whileTrue, so letting go of the button stops everything.
     */
    public Command motorCheck() {
        Command[] steps = new Command[modules.length * 2];
        for (int i = 0; i < modules.length; i++) {
            steps[2 * i] = spinAlone(modules[i], "drive", DriveConstants.MOTOR_CHECK_VOLTS, 0.0);
            steps[2 * i + 1] = spinAlone(modules[i], "steer", 0.0, DriveConstants.MOTOR_CHECK_VOLTS);
        }
        return Commands.sequence(steps)
            .finallyDo(() -> Logger.recordOutput("Drive/MotorCheck", "None"))
            .withName("Motor Check");
    }

    /** Spin one motor of one module for a moment, log which one, then rest. */
    private Command spinAlone(Module module, String motor, double driveVolts, double steerVolts) {
        String label = module.getName() + " " + motor;
        return runEnd(
                () -> {
                    module.setVolts(driveVolts, steerVolts);
                    Logger.recordOutput("Drive/MotorCheck", label);
                },
                module::stop)
            .withTimeout(DriveConstants.MOTOR_CHECK_SECONDS)
            .andThen(Commands.waitSeconds(DriveConstants.MOTOR_CHECK_PAUSE_SECONDS));
    }
}
```

Walk through the new parts:

- **`kinematics`** is a field, made by the factory in `DriveConstants`, one per `Drive`.
- **`periodic()`** now also stops the motors whenever the robot is disabled. Section 27.1's heartbeat already stops them, inside each Talon FX. But Phoenix remembers the **last request** you sent, so a robot that is enabled again could pick up where it left off. Commands are cancelled when the robot is disabled (Chapter 18), and every command here stops the motors in its `end`, so this is a second lock on the same door. AdvantageKit's template does the same. Then it logs the measured module states and the measured `ChassisSpeeds`, every loop, enabled or not, so you can watch the CANcoders while you turn wheels by hand.
- **`runVelocity`** is the whole of swerve driving, in five lines: inverse kinematics, desaturate, log, hand each state to its module, log again. The loop uses an index (not for-each) because it walks two arrays side by side: `modules[i]` gets `states[i]`, and both arrays are in the book's order. That shared order is the one thing in this method that can go silently wrong, which is why Section 28.10 tests it.
- **`getModuleStates()` and `getChassisSpeeds()`** are Section 28.7's "return a new array" and Section 28.2's forward kinematics. `toChassisSpeeds` takes varargs, so passing it an array works.
- **`kinematicsCheck`** is one `runEnd` command (Chapter 19), like a step of the motor check: it calls `runVelocity` with the same speeds every loop while it runs, and stops the modules when it ends. The `speeds` object is captured by the lambda (Chapter 18). That is safe, because nothing in this code ever changes a `ChassisSpeeds` once it is made.

> **Read, compute, act**
>
> Look at the order inside one loop. The scheduler runs `Drive.periodic()` first (subsystems before commands, Chapter 18), which reads all four modules. Then the kinematics check's command runs `runVelocity`, which computes from those fresh readings and sends volts. Read everything, then decide, then act: the order the old swerve draft and every AdvantageKit project use, so no decision is ever made from a half-old picture of the robot.

### Step 7: `RobotContainer`

Add an import for `ChassisSpeeds`, and three bindings, each held like the motor check:

```java
import edu.wpi.first.math.kinematics.ChassisSpeeds;
```

```java
    /**
     * Tie the controller's buttons to commands. The driver's controls:
     *
     * <pre>
     * Teleop     A              RADIO light orange (hold)
     * Test       A              Motor check: every motor alone, in order (hold; let go to stop)
     * Test       X              Kinematics check: forward (hold)
     * Test       Y              Kinematics check: slide left (hold)
     * Test       B              Kinematics check: spin counterclockwise (hold)
     * </pre>
     */
    private void configureBindings() {
        // Teleop: hold A to light the RADIO light orange. Proof that the controller reaches the roboRIO.
        controller.a().and(RobotModeTriggers.teleop())
            .whileTrue(roboRio.showColor(RadioLEDState.kOrange).withName("Hello Light"));

        // Test: hold A to spin every motor alone, wheels in the air. Let go, and everything stops.
        controller.a().and(RobotModeTriggers.test()).whileTrue(drive.motorCheck());

        // Test: hold X, Y, or B to run the swerve math at a gentle speed, wheels in the air (Section 28.9).
        controller.x().and(RobotModeTriggers.test()).whileTrue(drive.kinematicsCheck(
            "Check Forward", new ChassisSpeeds(DriveConstants.CHECK_METERS_PER_SECOND, 0.0, 0.0)));
        controller.y().and(RobotModeTriggers.test()).whileTrue(drive.kinematicsCheck(
            "Check Left", new ChassisSpeeds(0.0, DriveConstants.CHECK_METERS_PER_SECOND, 0.0)));
        controller.b().and(RobotModeTriggers.test()).whileTrue(drive.kinematicsCheck(
            "Check Spin", new ChassisSpeeds(0.0, 0.0, DriveConstants.CHECK_RADIANS_PER_SECOND)));
    }
```

The three-argument `ChassisSpeeds` constructor takes forward, left, and counterclockwise, in that order: x, y, omega. So "left" is the **second** number, positive. The Javadoc table gets three rows. The kinematics check is Test mode only, and only while held, for the same reason as the motor check: the first time these wheels move under the swerve math, a person is watching with a hand on the button.

### Step 8: Simulate first

Build. If the build fails with "cannot find symbol" on `getDriveMotorRotationsPerSecond`, that is `ModuleTest` from Chapter 27, still asking for a reading that no longer exists. That is the compiler doing its job (Chapter 10): a rename finds every place that used the old name. Section 28.10 rewrites that test. For now, change its two getter calls to `getVelocityMetersPerSecond()` and `getAngle().getRotations()` so the project builds, and run **WPILib: Simulate Robot Code**.

In AdvantageScope, **File** > **Connect to Simulator**. This time, open a **Swerve** tab (the **+** button, then **Swerve**). It draws a little robot with four modules, and an arrow on each one for a module state. Drag **`RealOutputs` > `Drive` > `MeasuredStates`** into its sources, and then **`Drive/SetpointStates`**. AdvantageScope expects four states in the order front left, front right, back left, back right, which is why the book has used that order since Chapter 27. In the tab's settings, set the frame size to 15.5 inches by 15.5 inches, and the max speed to about 3.1 meters per second.

In the Simulation GUI, pick **Test**, enable, and hold each button in turn:

- **X**: every arrow points forward, and they all have the same length.
- **Y**: every arrow swings to point **left**, and the wheels roll left.
- **B**: the arrows go around the robot like a pinwheel, each one sideways to its corner. Compare them with Example 3 in Section 28.2. Some arrows may point the "other" way along the same line, because `optimize` chose to roll backward instead of turning more than 90 degrees. Graph `Drive/OptimizedStates` against `Drive/SetpointStates` and you can see exactly which ones flipped.

Then open a **Line Graph**, and graph `RealOutputs` > `Drive` > `MeasuredSpeeds` while you hold B: its omega should climb to 1.0 radian per second, and its x and y should stay near zero. That is forward kinematics agreeing with inverse kinematics: you asked the robot to spin at 1, and the four pretend wheels, worked backward, say it is spinning at 1. Let go, and everything settles to zero, with every wheel still pointing where it was.

> **Two names for one thing, in 2027**
>
> WPILib 2027 renames `SwerveModuleState` to `SwerveModuleVelocity`, and AdvantageScope's documentation already uses the new name. This book stays on WPILib 2026, where the class is `SwerveModuleState`, and AdvantageScope still draws it. If you read swerve code online that says `SwerveModuleVelocity`, it is the same idea, from the next year.

Commit:

```bash
git add .
git commit -m "Ch28: Gear ratios, steering, and swerve kinematics for the four modules"
```

---

## 28.9 On the Robot: Ratios, Offsets, and the Kinematics Check

The simulator proved the code does the math. The real robot has to prove three more things: that the gear ratios on the fact sheet are right, that each CANcoder knows where straight ahead is, and that the wheels really do what the math says. Robot on blocks, wheels clear, the whole time.

### Check the gear ratios by hand

Deploy the `swerve-kinematics` branch, leave the robot **disabled**, and connect AdvantageScope to the robot. Graph the front left module's `DrivePositionMeters`, `SteerModuleRotations`, and `EncoderAbsoluteRotations`.

1. **The drive ratio.** Put a strip of tape on the front left wheel's tread, pointing straight up. Note `DrivePositionMeters`. Slowly roll the wheel forward by hand, exactly **10 full turns**, counting the tape. (Brake mode resists fast turning, but a slow, steady hand is fine.) The reading should have grown by 10 wheel circumferences: **about 1.60 meters**. If it grew by 3.1 meters, or 0.31, or anything far from 1.60, the drive gear ratio or the wheel size on the fact sheet is wrong. Find out which before you go on.
2. **The steer ratio.** Mark where the front left module points. Slowly turn the whole module by hand, counterclockwise as seen from above, exactly **one full turn**, back to the mark. `SteerModuleRotations` should have grown by **about 1.00**. If it grew by something else, the steer gear ratio is wrong. Meanwhile, `EncoderAbsoluteRotations` should have gone once all the way around, rising from wherever it started, jumping from 0.5 back to -0.5, and arriving back where it started.

Do both checks on one module; if they pass, the ratios are right for all four (the modules are identical). Write "checked by hand, 10 wheel turns = ___ m" in the fact sheet.

> **Measure ten, not one**
>
> Rolling the wheel 10 turns instead of 1 makes your counting error ten times smaller compared with what you are measuring. If you are off by a quarter turn either way, one turn would read 25 percent wrong; ten turns, only 2.5 percent. Scientists call this reducing **relative error**, and it is the same trick as timing ten swings of a pendulum instead of one.

### Calibrate the CANcoders

Now the offsets. You need the robot **disabled**, a straightedge, and two people: one aligning wheels, one reading numbers.

**Step 1: Directions first.** Open `docs/robot.md` and find the CANcoder column you filled in during Section 27.9: did each reading rise or fall as its module turned counterclockwise? For every one that **fell**, set its `encoderInverted` to `true` in `DriveConstants`. Leave every `encoderOffsetRotations` at `0.0`. Deploy.

Check each module by hand: turn it slowly counterclockwise, seen from above. Its `EncoderAbsoluteRotations` must **rise**. If any falls, flip its `encoderInverted` and deploy again. Do not go on until all four rise.

**Step 2: Line up the wheels.** Turn every module so its wheel points straight ahead, with its **bevel gear on the side you wrote on the fact sheet** in Section 27.9 (Section 28.5 explains why). Lay the straightedge along the two left wheels, touching both treads front and back, and nudge them until the edge touches each wheel flat along its length. Do the same on the right side. Sight along the robot from the front: all four wheels should be parallel to the frame rails.

**Step 3: Read.** In AdvantageScope, read `EncoderAbsoluteRotations` for all four modules, to three decimal places, and write them in the fact sheet:

| Module | Bevel gear side | Reading when straight | Offset (minus the reading) |
|---|---|---|---|
| Front left | | 0.137 | -0.137 |
| Front right | | -0.402 | 0.402 |
| Back left | | | |
| Back right | | | |

(The numbers in the first two rows are an example. Yours will be different, and that is the point.)

**Step 4: Put the offsets in the code.** Each offset is **minus** its module's reading, because the CANcoder **adds** the offset (Section 28.5): 0.137 plus -0.137 is 0.

```java
public static final ModuleConstants FRONT_LEFT = new ModuleConstants(
    "FrontLeft", 1, 2, 1, true, false, false, -0.137,
    new Translation2d(WHEELBASE_METERS / 2.0, TRACK_WIDTH_METERS / 2.0));
```

**Step 5: Check again.** Deploy. With the wheels still lined up, all four `EncoderAbsoluteRotations` should read **0.000**, give or take 0.005 (about 2 degrees). Turn each module a quarter turn counterclockwise by hand: it should read about **+0.25**. Open the Swerve tab with `MeasuredStates`: all four arrows point the way the wheels really point. If one is off by about 0.5, its wheel was lined up with its bevel gear on the wrong side: line it up again and redo that module.

Commit the measured values alone, the same way as Chapter 27's inversions:

```bash
git add src/main/java/frc/robot/subsystems/drive/DriveConstants.java
git commit -m "Ch28: CANcoder directions and offsets from the calibration"
```

> **Offsets belong to the robot, not to the code**
>
> Every Mini Swerve has its own offsets, because every magnet was pressed on at its own angle. Swap a module, replace a CANcoder, or even remove and refit a magnet, and that module's offset changes. So write in the fact sheet **when** each offset was measured, and add a line to your team's checklist: "after any module repair, redo the calibration for that module." A robot whose code is perfect and whose offsets are a week old will drive in a beautiful, confident curve, straight into the wall.

### The kinematics check

Now the moment the chapter has been building to. On blocks, wheels clear. Graph `Drive/SetpointStates` and `Drive/MeasuredStates` in the Swerve tab, so you can compare the picture with the wheels.

Before you press anything, say out loud what each check **should** do, using Section 28.2:

- **X (forward)**: all four wheels point straight ahead and roll forward (tops of the wheels moving toward the front of the robot).
- **Y (left)**: all four wheels swing to point **left** and roll toward the left side.
- **B (spin)**: each wheel turns sideways to the line from the center to its corner, and they roll so that the robot **would** spin counterclockwise, seen from above.

Say "Enabling!" Pick **Test**, enable, and hold each button for a few seconds, one at a time. Let go between them. Let go immediately if anything looks wrong.

Check two things for each: which way the wheels **point**, and which way they **roll**. Remember `optimize`: a wheel pointing straight back and rolling backward is doing exactly the same job as one pointing forward and rolling forward. To judge "rolling forward" on a wheel that flipped, ask: "which way would this wheel push the robot?"

| What you see | What it usually means |
|---|---|
| Everything matches the predictions | Done. Write "kinematics check passed" and the date on the fact sheet |
| A module **spins around and around** and never settles | Its steering is fighting itself: the steer motor and the CANcoder disagree about which way is positive. **Let go at once.** Check that module's `steerInverted` (Section 27.9) and `encoderInverted` (Step 1 above): turning counterclockwise must make both `SteerModuleRotations` and `EncoderAbsoluteRotations` rise |
| One wheel points the right way but pushes the wrong way (on X, it would push the robot backward) | That module's offset is half a turn off: calibrated with its bevel gear on the wrong side. Redo its calibration |
| All four wheels push backward on X | Every offset was measured with the bevel gears on the wrong side, or the drive inversions from Section 27.9 are wrong. Check which with the motor check |
| One wheel points 90 degrees away from the others | Its offset is a quarter turn off, or its CANcoder belongs to a different module (CAN IDs crossed). Blink it in Tuner X |
| On Y, every wheel points **right** | The CANcoders and steer motors are all reversed together. Turning a module counterclockwise by hand must make its reading **rise** |
| On B, the wheels make an X or a straight line instead of a pinwheel | The module locations in `DriveConstants` have a sign wrong (a front module with a negative x, a left module with a negative y). The tests in Section 28.10 catch this |
| A wheel shakes back and forth around its angle | The steering gains are too strong for that module. Try `STEER_KP` 2.0 and tell your mentor; Chapter 32 tunes it properly |
| A wheel stops a few degrees short of its angle | Friction (kS) is holding it. Expected for now; Chapter 32 fixes it |

> **The wheels remember**
>
> Let go of B, and look at the wheels: they stay in the pinwheel. Letting go ends the command, its `end` calls `stop()`, and zero volts on a steer motor in brake mode holds the module where it is. Chapter 29's driving command does it a different way: while the driver's sticks sit at zero, it keeps calling `runVelocity` with zero speeds, and Section 28.6's rule (zero speed keeps the last angle) holds the wheels pointed. Either way, if the driver is about to spin again, the wheels are already in place.

### What the log tells you

Download the log (**File** > **Download Logs...**) and open it. A few things worth looking at:

- **`Drive/SetpointStates` vs `Drive/OptimizedStates`** on the B check: at least two modules flip, and their angles differ by exactly 180 degrees and their speeds by a sign. Section 28.7, in a log.
- **`MeasuredSpeeds`** while each button was held: forward kinematics, from the real wheels. On blocks, there is nothing to push against, so the wheels should reach roughly the speeds asked for. Write down the omega you got on B. Chapter 29 sees how much lower it is with the robot's weight on the carpet.
- **Each module's `SteerAppliedVolts`** at the moment a check starts: a burst, then almost nothing once the wheel arrives. That is P control (Chapter 15) on a real mechanism.

---

## 28.10 Tests for the Swerve Math

The kinematics check proved the wheels match the math on this robot, today. Tests prove the code still matches the math tomorrow, after somebody "tidies up" `DriveConstants`. None of the new tests needs a robot.

### Fix and extend the module's tests

First, `FakeModuleIO` needs to be able to pretend the wheel points somewhere. Add one field, and copy it into the inputs:

```java
package frc.robot.subsystems.drive;

/** A pretend module for tests: it remembers the last volts it was asked for (Chapters 27 and 28). */
class FakeModuleIO implements ModuleIO {
    double driveVolts = 0.0;
    double steerVolts = 0.0;
    // Which way the pretend wheel points, in rotations, as the CANcoder would say.
    double encoderRotations = 0.0;

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        inputs.driveConnected = true;
        inputs.steerConnected = true;
        inputs.encoderConnected = true;
        inputs.encoderAbsoluteRotations = encoderRotations;
    }

    @Override
    public void setDriveVolts(double volts) {
        driveVolts = volts;
    }

    @Override
    public void setSteerVolts(double volts) {
        steerVolts = volts;
    }
}
```

Then, in `ModuleTest`, replace the first test (the one that used motor rotations), and add two new ones at the end. The other two tests from Chapter 27 do not change:

```java
    @Test
    void sixVoltsRollsThePretendWheelAtAboutHalfItsFreeSpeed() {
        Module module = new Module(new ModuleIOSim(), DriveConstants.FRONT_LEFT);

        module.setVolts(6.0, 0.0);
        for (int loop = 0; loop < 50; loop++) {   // one second of loops
            module.periodic();
        }

        // Chapter 16's kV from the data sheet, through the drive gears and around the wheel.
        double wheelRotationsPerSecond =
            Units.radiansToRotations(6.0 * DriveConstants.DRIVE_MOTOR.KvRadPerSecPerVolt) / DriveConstants.DRIVE_GEAR_RATIO;
        double expected = wheelRotationsPerSecond * DriveConstants.WHEEL_CIRCUMFERENCE_METERS;
        assertEquals(expected, module.getVelocityMetersPerSecond(), expected * 0.05);
        assertEquals(0.0, module.getAngle().getRotations(), 1e-9);
    }

    @Test
    void aWheelNeverTurnsMoreThanAQuarterTurn() {
        FakeModuleIO io = new FakeModuleIO();   // points straight ahead
        Module module = new Module(io, DriveConstants.FRONT_LEFT);
        module.periodic();

        // "Point straight back and roll at 1 m/s": the same as "stay put and roll backward."
        module.runSetpoint(new SwerveModuleState(1.0, Rotation2d.k180deg));

        assertTrue(io.driveVolts < 0.0, "rolls backward instead of turning around");
        assertEquals(0.0, io.steerVolts, 1e-6);
    }

    @Test
    void aWheelPointingTheWrongWayDoesNotRollYet() {
        FakeModuleIO io = new FakeModuleIO();   // points straight ahead
        Module module = new Module(io, DriveConstants.FRONT_LEFT);
        module.periodic();

        // "Point left and roll": the wheel is a quarter turn away, so cosine scaling holds the speed at 0.
        module.runSetpoint(new SwerveModuleState(1.0, Rotation2d.kCCW_90deg));

        assertEquals(0.0, io.driveVolts, 1e-6);
        assertTrue(io.steerVolts > 0.0, "steers counterclockwise, toward the left");
    }
```

You need two more imports at the top of `ModuleTest`: `edu.wpi.first.math.geometry.Rotation2d` and `edu.wpi.first.math.kinematics.SwerveModuleState`. (`assertTrue` and `Units` are already there from Chapter 27.)

- **The first test** is Chapter 27's, translated into wheel units: six volts for one second on the pretend module, checked against kV through the gears. If someone breaks the gear ratio in `ModuleIOSim`, it fails.
- **The second** is `optimize`: a target exactly half a turn away must not turn the wheel at all, only reverse the roll.
- **The third** is cosine scaling, and the steering's sign: a target a quarter turn to the left must not roll the wheel yet, and must steer **counterclockwise** (positive volts, the promise in `ModuleIO`).

### The swerve math, checked against your hand math

Create `src/test/java/frc/robot/subsystems/drive/SwerveMathTest.java`. These tests use no HAL and no robot: just `DriveConstants` and WPILib's kinematics, checked against the tables you worked out by hand in Section 28.2.

```java
package frc.robot.subsystems.drive;

import static org.junit.jupiter.api.Assertions.assertEquals;

import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import org.junit.jupiter.api.Test;

/** The swerve math from Section 28.2, checked by hand, then checked by the code. */
class SwerveMathTest {
    // The book's order, everywhere (Section 27.3).
    private static final int FRONT_LEFT = 0;
    private static final int FRONT_RIGHT = 1;
    private static final int BACK_LEFT = 2;
    private static final int BACK_RIGHT = 3;

    private final SwerveDriveKinematics kinematics = DriveConstants.createKinematics();

    @Test
    void drivingForwardPointsEveryWheelStraightAhead() {
        SwerveModuleState[] states = kinematics.toSwerveModuleStates(new ChassisSpeeds(0.5, 0.0, 0.0));

        for (SwerveModuleState state : states) {
            assertEquals(0.5, state.speedMetersPerSecond, 1e-9);
            assertEquals(0.0, state.angle.getDegrees(), 1e-9);
        }
    }

    @Test
    void slidingLeftPointsEveryWheelLeft() {
        SwerveModuleState[] states = kinematics.toSwerveModuleStates(new ChassisSpeeds(0.0, 0.5, 0.0));

        for (SwerveModuleState state : states) {
            assertEquals(0.5, state.speedMetersPerSecond, 1e-9);
            assertEquals(90.0, state.angle.getDegrees(), 1e-9);
        }
    }

    @Test
    void spinningPointsEveryWheelAroundTheCenter() {
        SwerveModuleState[] states = kinematics.toSwerveModuleStates(new ChassisSpeeds(0.0, 0.0, 1.0));

        // Section 28.2, Example 3: sideways to each corner, all at 1 rad/s times the corner's distance.
        double cornerDistance = Math.hypot(DriveConstants.WHEELBASE_METERS / 2.0, DriveConstants.TRACK_WIDTH_METERS / 2.0);
        for (SwerveModuleState state : states) {
            assertEquals(cornerDistance, state.speedMetersPerSecond, 1e-9);
        }
        assertEquals(135.0, states[FRONT_LEFT].angle.getDegrees(), 1e-6);
        assertEquals(45.0, states[FRONT_RIGHT].angle.getDegrees(), 1e-6);
        assertEquals(-135.0, states[BACK_LEFT].angle.getDegrees(), 1e-6);
        assertEquals(-45.0, states[BACK_RIGHT].angle.getDegrees(), 1e-6);
    }

    @Test
    void desaturatingSlowsEveryWheelTogether() {
        // Section 28.2: forward at 2.5 m/s while spinning at 8 rad/s asks the right wheels for more than they have.
        SwerveModuleState[] states = kinematics.toSwerveModuleStates(new ChassisSpeeds(2.5, 0.0, 8.0));
        double leftToRightBefore = states[FRONT_LEFT].speedMetersPerSecond / states[FRONT_RIGHT].speedMetersPerSecond;
        double frontLeftAngleBefore = states[FRONT_LEFT].angle.getDegrees();

        SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.FREE_SPEED_METERS_PER_SECOND);

        // The same array, changed in place (Section 28.7): the fastest wheel is now exactly at the limit...
        assertEquals(DriveConstants.FREE_SPEED_METERS_PER_SECOND, states[FRONT_RIGHT].speedMetersPerSecond, 1e-9);
        // ...and the shape of the motion did not change.
        double leftToRightAfter = states[FRONT_LEFT].speedMetersPerSecond / states[FRONT_RIGHT].speedMetersPerSecond;
        assertEquals(leftToRightBefore, leftToRightAfter, 1e-9);
        assertEquals(frontLeftAngleBefore, states[FRONT_LEFT].angle.getDegrees(), 1e-9);
    }
}
```

- **The named indexes** at the top (`FRONT_LEFT = 0`, and so on) make the asserts read like the table in Section 28.2, and keep the book's module order written down in one more place.
- **The spin test is the important one.** If someone swaps the front right and back left positions in `DriveConstants`, or drops a minus sign from a location, the forward and left tests still pass (every wheel gets the same state when the robot does not spin) but this one fails. That is the "wheels make an X" row of the table in Section 28.9, caught on a laptop.
- **The desaturate test** checks Section 28.2's promise: the fastest wheel ends exactly at the limit, and the ratio between wheels and their angles are unchanged. It also shows Section 28.7 in action: `desaturateWheelSpeeds` returned nothing, and the test reads the answer out of its own array.

> **Tolerances again**
>
> Chapter 12 said never to compare `double`s with `==`. These asserts use a tolerance of `1e-9` (one billionth) for numbers that come out of the same arithmetic, and `1e-6` for angles that come out of `atan2`, which wanders in the last few digits. Both are far smaller than anything a robot could notice and far larger than rounding error.

### The whole drive, in the simulator

Last, one test that runs the whole chain: `Drive`, four `Module`s, four `ModuleIOSim`s, the kinematics, and forward kinematics back again. Create `DriveTest.java`:

```java
package frc.robot.subsystems.drive;

import static org.junit.jupiter.api.Assertions.assertEquals;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DriveTest {

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);
        DriverStationSim.setEnabled(true);   // Drive stops its motors while disabled
        DriverStationSim.notifyNewData();
    }

    @AfterEach
    void tearDown() {
        CommandScheduler.getInstance().unregisterAllSubsystems();
        DriverStationSim.resetData();
        DriverStationSim.notifyNewData();
    }

    @Test
    void spinningInPlaceMeasuresAsSpinningInPlace() {
        Drive drive = new Drive(new ModuleIOSim(), new ModuleIOSim(), new ModuleIOSim(), new ModuleIOSim());
        ChassisSpeeds spin = new ChassisSpeeds(0.0, 0.0, 1.0);

        for (int loop = 0; loop < 50; loop++) {   // one second: read, then drive, like the scheduler
            drive.periodic();
            drive.runVelocity(spin);
        }

        // Forward kinematics from the four pretend wheels agrees with what we asked for.
        ChassisSpeeds measured = drive.getChassisSpeeds();
        assertEquals(0.0, measured.vxMetersPerSecond, 0.02);
        assertEquals(0.0, measured.vyMetersPerSecond, 0.02);
        assertEquals(1.0, measured.omegaRadiansPerSecond, 0.05);
    }
}
```

The loop calls `periodic()` and then `runVelocity()`, the same order the scheduler would use (read, then act). It starts with all four pretend wheels pointing straight ahead, so in the first tenth of a second they have to steer a quarter turn or more, and cosine scaling keeps them from rolling until they get close. After a second, the robot the wheels describe should be spinning at 1 radian per second and not sliding. This test fails if the steering is broken, if the drive feedforward is wrong, if `optimize` misbehaves, or if forward and inverse kinematics disagree. It does not care **how**: it checks the one thing a driver would.

No `SimHooks.pauseTiming()` this time: the test calls `periodic()` directly and never asks the clock anything, so the clock does not matter. (`MotorCheckTest` needed it, because its commands time out.)

Run the tests: **18 tests, all green** (Chapter 27's 11, two more in `ModuleTest`, four in `SwerveMathTest`, one in `DriveTest`). Then break one on purpose: in `DriveConstants`, delete the minus sign from `BACK_LEFT`'s x, so the back left module thinks it sits in front. Run the tests. `spinningPointsEveryWheelAroundTheCenter` fails, with the back left angle wrong, and `spinningInPlaceMeasuresAsSpinningInPlace` fails too, because the robot the wheels describe is now sliding. Two tests, from two directions, both pointing at one wrong sign. Put it back.

Commit and push:

```bash
git add .
git commit -m "Ch28: Tests for the swerve math, the module's steering, and the whole drive"
git push -u origin swerve-kinematics
```

Open a pull request into `main`. The reviewer checks: every gear ratio and size in `DriveConstants` matches `docs/robot.md`; every CANcoder offset matches the calibration table; the four locations have the right signs (front `+x`, left `+y`); the check on GitHub is green.

---

## 28.11 What You Built

- **Gear ratios** in the code, as tooth-count fractions, and **checked by hand** on the real robot: ten wheel turns, one module turn.
- **Readings in robot units**: wheel meters from the drive motors (with `SensorToMechanismRatio`), module turns from the steer motors, and true module angles from the CANcoders.
- **Four calibrated CANcoders**: counterclockwise positive, straight ahead at zero, with the offsets measured and committed.
- **A steering `Module`**: optimize, cosine scaling, a PID controller with continuous input, and a data-sheet feedforward for the wheel.
- **`SwerveDriveKinematics`** in `Drive`: `runVelocity` for inverse kinematics, `getChassisSpeeds` for forward kinematics, and every state logged for AdvantageScope's Swerve tab.
- **A kinematics check** in Test mode that proved, on blocks, that four real wheels point and roll the way your hand math said.
- **A pretend CANcoder** and real gear ratios in the simulator, and **eighteen tests**, including your hand math, green on GitHub.

> **What comes next**
>
> The robot can move in any direction, but only in its **own** directions: "forward" means wherever its front is pointing. Give a driver a controller like that, and the moment the robot turns around, every stick is backward. In Chapter 29, the Pigeon 2 tells the code which way the robot faces on the field, the sticks start to mean **field** directions, and the Mini Swerve comes off its blocks and drives.

---

## Chapter Summary

> **What you learned in Chapter 28**
>
> * A swerve robot is **holonomic**: its motion has three independent parts, forward (`vx`), left (`vy`), and counterclockwise spin (`omega`), packed in a `ChassisSpeeds`, in the robot's frame (x forward, y left, counterclockwise positive).
> * **Inverse kinematics** turns a `ChassisSpeeds` into a speed and an angle for each module: each wheel's velocity is the robot's slide plus its spin times the wheel's position (`forward = vx - ω × y`, `leftward = vy + ω × x`), then `Math.hypot` and `Math.atan2`. **Forward kinematics** works back from four wheels to the robot's motion. **Desaturating** slows every wheel by the same fraction so none beats its limit and the motion keeps its shape.
> * **Gear ratios** multiply stage by stage. With `SensorToMechanismRatio`, a Talon FX reports the turning of what its gears turn; times the wheel's circumference gives meters. The motor's free speed, through the gears, gives the wheel's top speed and a data-sheet **kV**. Check every ratio by hand on the real robot.
> * New Java: the **remainder operator** `%` gives what is left over after division, with the sign of the left-hand number, so negative angles surprise people. `MathUtil.inputModulus` wraps a number into any range; `Rotation2d` and a PID controller's continuous input wrap angles for you.
> * A **CANcoder** is an absolute encoder. Its **SensorDirection** makes counterclockwise positive, and its **MagnetOffset** makes straight ahead (bevel gear on the recorded side) read zero; both are measured on the robot and kept in the code.
> * A module **optimizes** its target (never more than a quarter turn; roll backward instead), **cosine-scales** its speed, and steers with a PID controller on the CANcoder angle with continuous input.
> * New Java: Java copies a **primitive's value** into a method, but for an **array or object** it copies the **reference**, so the method can change what the caller sees (`desaturateWheelSpeeds`, `optimize`) but can never point the caller's variable somewhere else. Return a new array rather than a private one.

---

## Exercises

### Practice

**1. Predict the remainder.** Write down what each line prints, then run them in a scratch file and compare:

```java
System.out.println(23 % 10);
System.out.println(10 % 23);
System.out.println(-23 % 10);
System.out.println(725.0 % 360.0);
System.out.println(-90.0 % 360.0);
System.out.println(2.75 % 1.0);
System.out.println(MathUtil.inputModulus(-90.0, 0.0, 360.0));
System.out.println(MathUtil.inputModulus(0.6, -0.5, 0.5));
```

Which two lines would surprise someone who thinks `%` always gives an answer from 0 up?

**2. Write your own wrap.** Write `static double wrapDegrees(double degrees)` that returns the same direction as a number from -180 (not included) up to 180 (included). Use `%`, and handle negative numbers yourself (hint: after `degrees % 360.0`, the answer is from -360 to 360; one or two `if`s will finish the job). Test it on 0, 90, 180, 190, 360, 540, -90, -180, -190, and -725. Then compare your answers with `MathUtil.inputModulus(degrees, -180.0, 180.0)` and write down any that differ. (Look closely at what each one does with exactly 180 and -180.)

**3. Kinematics by hand, then by code.** With the Mini Swerve's dimensions, work out all four module states, by hand, for `new ChassisSpeeds(0.0, 0.4, 1.0)`: sliding left while spinning. Write your table in `reflections.md`. Then add a test to `SwerveMathTest` that checks your four angles. Did your hand math and WPILib agree? If not, which one was wrong, and where?

**4. Who changed my array?** Predict the output, then run it:

```java
import java.util.Arrays;

public class WhoChangedIt {
    static void halve(double[] speeds) {
        for (int i = 0; i < speeds.length; i++) {
            speeds[i] = speeds[i] / 2.0;
        }
    }

    static void replace(double[] speeds) {
        speeds = new double[] {9.0, 9.0, 9.0, 9.0};
    }

    static void halveOne(double speed) {
        speed = speed / 2.0;
    }

    public static void main(String[] args) {
        double[] speeds = {4.0, 2.0, 4.0, 2.0};
        halve(speeds);
        System.out.println(Arrays.toString(speeds));
        replace(speeds);
        System.out.println(Arrays.toString(speeds));
        halveOne(speeds[0]);
        System.out.println(speeds[0]);
    }
}
```

(`Arrays.toString` turns an array into text like `[1.0, 2.0]`. Printing an array directly prints something like `[D@1b6d3586`: the arrow, not the array.) Explain each of the three answers in one sentence, using the words **copy** and **reference**.

**5. Spin around a wheel.** `toSwerveModuleStates` has a second form, `toSwerveModuleStates(speeds, centerOfRotation)`, that spins the robot around any point instead of its center. In the simulator, on a practice branch, change the B check so it spins around the front left module: pass `DriveConstants.FRONT_LEFT.location()` as the center (you will need to add a `runVelocity` overload, Chapter 11). Before you run it, predict: what does the front left wheel do? Watch the Swerve tab. Some teams use this as a defensive "spin around a corner" move. Delete the branch.

**6. Turn off `optimize`.** In the simulator, on a practice branch, comment out the `state.optimize(angle);` line in `Module.runSetpoint`, and run the spin check, then the forward check, then the spin check again. Watch `SteerAppliedVolts` and the Swerve tab. How far does each wheel turn now? Why does the robot take longer to respond? Put the line back and delete the branch.

### Build (Mini Swerve)

Teach the code the gears, find straight ahead, and prove the swerve math on the real robot.

1. Check the fact sheet for the frame size between wheel centers, the wheel diameter, and both gear ratios, as tooth counts. Fill in anything missing, and write how you know (Section 28.3).
2. On branch `swerve-kinematics`, update `DriveConstants`, `ModuleIO`, `ModuleIOTalonFX`, `ModuleIOSim`, `Module`, `Drive`, and `RobotContainer` (Section 28.8). Keep your Chapter 27 inversions.
3. Run the simulator, and check the X, Y, and B kinematics checks in AdvantageScope's Swerve tab against Section 28.2's examples. Commit.
4. Deploy to the robot on blocks. Check the drive ratio (10 wheel turns) and the steer ratio (one module turn) by hand (Section 28.9).
5. Calibrate the CANcoders: directions first, then line up with a straightedge (bevel gears on the recorded side), read, put the offsets in the code, deploy, check that all four read zero when straight and +0.25 a quarter turn left. Commit the offsets alone.
6. Run the kinematics check in Test mode: X, Y, and B, one at a time. Every wheel must point and roll as predicted. Use the table in Section 28.9 for anything that does not.
7. Update `FakeModuleIO` and `ModuleTest`, and write `SwerveMathTest` and `DriveTest`: **18 tests, all green**. Break one on purpose, then fix it (Section 28.10).
8. Push, open the pull request, have a teammate check every ratio and offset against the fact sheet, wait for green, and merge.

If the wheels match your hand math on all three checks, the CANcoders read zero when straight, and GitHub shows eighteen green tests, the Mini Swerve is ready to come off its blocks in Chapter 29.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. The Explorer's kinematics had two numbers on the robot side; the Mini Swerve's has three. What does the third one let a swerve robot do, and why could the Explorer's wheels never do it?
2. On a spin in place, every wheel on the Mini Swerve rolls at the same speed. Would that still be true on a robot that is twice as long as it is wide? Which wheels would roll faster, and why? (Hint: distance from the center.)
3. When one wheel is asked for more than its top speed, why is it wrong to slow down only that wheel? What would the robot do?
4. A module's target is 170 degrees and it points at -170 degrees. Without `enableContinuousInput`, how far would the PID controller try to turn the wheel? With it? With `optimize` as well? Draw it.
5. The CANcoder offsets are measured with the bevel gears on one particular side. What goes wrong with a module calibrated with its bevel gear on the other side, and which check in Section 28.9 catches it?
6. `desaturateWheelSpeeds` returns `void`, yet the test in Section 28.10 can read its answer. Explain how, and then explain why `getModuleStates()` builds a new array instead of returning one that `Drive` keeps.

If any answer feels shaky, re-read Sections 28.2, 28.4, 28.6, and 28.7.

### Git

On the `swerve-kinematics` branch, one commit per idea:

```bash
git checkout -b swerve-kinematics
git add .
git commit -m "Ch28: Gear ratios, steering, and swerve kinematics for the four modules"
git add src/main/java/frc/robot/subsystems/drive/DriveConstants.java
git commit -m "Ch28: CANcoder directions and offsets from the calibration"
git add .
git commit -m "Ch28: Tests for the swerve math, the module's steering, and the whole drive"
git push -u origin swerve-kinematics
```

The second commit is like Chapter 27's inversions commit: only the four `encoderInverted` values and four `encoderOffsetRotations` values change, and nothing else. Check it with `git show` before you push. It is your robot's calibration record, and six months from now, when a module is rebuilt, `git log -p src/main/java/frc/robot/subsystems/drive/DriveConstants.java` shows every offset this robot has ever had, and when.

### Collab: Hand Math Race

Each teammate picks a different `ChassisSpeeds` from this list (or invents one):

- `new ChassisSpeeds(0.3, 0.3, 0.0)`: diagonally forward and left
- `new ChassisSpeeds(-0.5, 0.0, 0.5)`: backward while spinning counterclockwise
- `new ChassisSpeeds(0.0, -0.4, -1.0)`: sliding right while spinning clockwise
- `new ChassisSpeeds(0.2, 0.0, 2.0)`: barely moving forward, spinning fast

Each person:

1. Works out all four module states **by hand**, on paper, with Section 28.2's two rules. No running code yet.
2. Makes a branch (like `hand-math-diagonal`), adds one test to `SwerveMathTest` that checks their four angles and speeds, runs it, and fixes whichever was wrong: the hand math or their test.
3. Pushes and opens a pull request. A teammate reviews it by redoing **one** module's math by hand.

Every new test lands at the end of the same file, so the second and later pull requests will almost certainly hit a **merge conflict** after the first is merged: two people added different methods at the same spot. Resolve it the Chapter 11 way, keeping **both** tests, build, run all the tests, and finish the merge. Afterward, write two sentences in `reflections.md`: which part of your hand math was hardest to get right, and how did the test help you find out?

### Explore

- Read WPILib's page on **swerve drive kinematics**. It writes the inverse kinematics as one big matrix multiplied by `vx`, `vy`, `omega`. Find the rows for one module, and show they are Section 28.2's two rules.
- Open AdvantageKit's **TalonFX Swerve** template and find `Module.runSetpoint`. Compare it with yours, line by line. Theirs sends a **velocity** to the drive motor and a **position** to the steer motor instead of volts. What runs the PID loops in their version, and where? Which chapter of this book is likely to move your code toward theirs?
- Look up **second-order kinematics** or **swerve skew**: when a swerve robot drives forward while spinning, it drifts slightly to one side. WPILib's `ChassisSpeeds.discretize` exists to fix it. Read its Javadoc, and guess why driving and spinning at once makes the robot curve.
- Find a match video of a top FRC team's swerve robot, and watch it in slow motion. Pick a moment where the robot drives one way while turning. Can you see the wheels pointing different directions? Sketch the four arrows.

---

> **Additional Resources**
>
> * **WPILib Swerve Drive Kinematics**: [docs.wpilib.org](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/swerve-drive-kinematics.html) the official guide to `SwerveDriveKinematics`, module states, optimization, and cosine scaling
> * **WPILib Coordinate System**: [docs.wpilib.org](https://docs.wpilib.org/en/stable/docs/software/basic-programming/coordinate-system.html) the robot frame, field frame, and counterclockwise-positive angles every swerve calculation uses
> * **CTRE CANcoder reference**: [v6.docs.ctr-electronics.com](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/cancoder/index.html) magnet offset, sensor direction, and absolute position on the CANcoder
> * **AdvantageScope Swerve tab**: [docs.advantagescope.org](https://docs.advantagescope.org/tab-reference/swerve) how to show module states, robot speeds, and frame size in AdvantageScope
> * **AdvantageKit TalonFX Swerve template**: [docs.advantagekit.org](https://docs.advantagekit.org/getting-started/template-projects/talonfx-swerve-template) the swerve code this book's `Drive`, `Module`, and `ModuleIO` grow toward
> * **Operators (The Java Tutorials)**: [docs.oracle.com](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/op1.html) the remainder operator and the other arithmetic operators
> * **Passing Information to a Method (The Java Tutorials)**: [docs.oracle.com](https://docs.oracle.com/javase/tutorial/java/javaOO/arguments.html) how Java passes primitives and references to methods

---

*Next up, Chapter 29: Swerve Teleop and Field-Oriented Drive. The Pigeon 2 tells the robot which way it faces, the sticks start to mean field directions, and the Mini Swerve comes off its blocks and drives.*
