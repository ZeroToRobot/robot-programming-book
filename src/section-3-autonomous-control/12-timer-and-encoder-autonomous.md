# Chapter 12: Timer and Encoder Autonomous

In Chapter 10 you learned to hunt down bugs, including ones buried in your Git history. In Chapter 11 you merged a teammate's work into your own, conflict and all. Through both of those chapters, the Explorer only drove when a human held the controller.

That is about to change. Every FRC match starts with **autonomous**: 15 to 20 seconds, depending on the year's game, when the drivers put their hands down and the robot runs on code alone. No sticks, no buttons, no one to correct it. Whatever your program tells the robot to do, it does, and if the robot ends up in the wrong place, there is nothing anyone can do about it until teleop begins.

This chapter gives the Explorer its first real autonomous routine. You will build it two ways. First with a **timer**: "drive forward for one second, then turn for half a second." Then with the **sensors** from Chapter 9: "drive forward until the encoders say 0.5 meters, then turn until the gyro says 90 degrees." You will run both versions on the same course, measure where the robot actually stops with a tape measure, and find out for yourself which one puts the robot where you meant.

By the end of the chapter, the Explorer will run leg 1 of its obstacle course on its own: drive forward, turn left, drive to a black line, and stop.

On the Java side, you will learn the **`switch` statement**, the tool for "do one of several things, depending on a number," and you will learn why you should almost never use `==` to compare two `double`s. On the robotics side, you will meet **dead reckoning**, **stopping distance**, and the reason the next three chapters (kinematics, odometry, and PID) exist at all.

You will need your XRP, a clear patch of floor about a meter square, a tape measure or ruler, and a strip of black electrical tape.

---

## 12.1 Autonomous: The Robot Is on Its Own

Picture the start of a match. The robot sits against the alliance wall. The field lights flash, the buzzer sounds, and the robot drives out, turns, scores a game piece, and backs into position, all with nobody touching a controller. Fifteen seconds later, teleop begins and the drivers take over.

That is autonomous. Most FRC games reward it heavily: points scored in autonomous are often worth more than the same action in teleop, and simply leaving the starting zone usually earns points on its own. A team with a reliable autonomous routine starts every match ahead.

The key word is **reliable**. An autonomous routine that works three matches out of five is worse than a simpler one that works every time, because a failed autonomous can do worse than score nothing. It can leave the robot stranded, tangled with an alliance partner, or pointed the wrong way when teleop begins.

### What the robot needs to know

When a human drives, the human is the sensor. The driver sees that the robot is drifting left and corrects it. The driver sees the wall coming and slows down. In Chapter 9 you called this **closing the loop**: the driver watches the result and adjusts the command.

In autonomous, nobody watches. So the robot needs some way to answer two questions on its own, fifty times a second:

1. **What should I be doing right now?** Driving forward? Turning? Stopped?
2. **Am I done with it yet?** Have I gone far enough? Have I turned far enough?

There are two ways to answer the second question, and they are the two halves of this chapter:

- **Ask the clock.** "I have been driving for one second, so I am probably about where I want to be." This is simple, needs no sensors, and works surprisingly well on a good day.
- **Ask the sensors.** "The encoders say I have driven 0.50 meters, so I am where I want to be." This needs sensors, and a little more code, but it measures what you actually care about.

You already wrote the first kind in Chapter 7: a one-second nudge forward. It has been sitting in `autonomousPeriodic()` ever since. In this chapter, you will find out exactly how good it is, and then replace it with something better.

> **Dead reckoning: navigating by arithmetic**
>
> Before satellites and GPS, ship navigators found their position with **dead reckoning**: "We sailed northeast at 8 knots for 3 hours, so we are about 24 nautical miles northeast of where we started." It works, but every small error in the speed or heading adds up, so the longer the voyage, the further off the estimate gets. A timed autonomous routine is dead reckoning with the crudest possible speedometer: a motor power setting. Encoder-based driving is dead reckoning with a real speedometer. In Chapter 14, **odometry** will do dead reckoning properly, fifty times a second, combining the encoders and the gyro into a running estimate of where the robot is on the field. And in Chapter 33, cameras will correct the errors that dead reckoning always piles up.

### Leg 1 of the obstacle course

Since Chapter 1, the goal of the XRP Explorer has been an autonomous obstacle course. This chapter builds its first leg. Lay it out on your floor now, so it is ready when the code is:

```
                       =========    <- black tape line, across the path
                           ^
                           |    leg 2: drive until the line
                           |    (tape about 0.4 m past the corner)
                           |
   [START] --------------->+    <- the corner: turn left 90 degrees
             leg 1: 0.5 m
```

1. Mark a **start line** with a short piece of masking tape (or any tape that is not black, so the line sensors ignore it). The front edge of the robot's wheels will line up with it.
2. Measure **0.5 meters** straight ahead of the start line and mark the **corner** with a small piece of masking tape off to one side, where the robot will not drive over it.
3. From the corner, measure about **0.4 meters** to the left and lay a strip of **black electrical tape** across the path, about 20 cm long. That is the line.

Use the same surface you measured your `LINE_THRESHOLD` on in Chapter 9. If you change surfaces, re-measure.

---

## 12.2 The `Timer`: A Stopwatch, Not an Alarm Clock

In Chapter 5 you met `Timer.getFPGATimestamp()`, which tells you how many seconds have passed since the robot program started. That is a **clock**: it never stops and it never resets. It is useful for stamping the time on an event, but awkward for questions like "how long have I been driving?" You would have to save the time when driving started and subtract it every loop.

In Chapter 7 you used the better tool without much explanation: a `Timer` **object**.

```java
private final Timer autoTimer = new Timer();
```

A `Timer` object is a **stopwatch**. You can start it, stop it, reset it to zero, and ask how much time is on it. And because it is an object (Chapter 7), you can have as many as you want, each timing something different, the same way a track coach can hold a stopwatch for every runner.

Here are the methods you will use:

| Method | What it does |
|---|---|
| `start()` | Starts the stopwatch running. Does nothing if it is already running. |
| `stop()` | Freezes the stopwatch. `get()` keeps returning the frozen time. |
| `reset()` | Sets the time back to `0`. Does not start or stop it. |
| `restart()` | Stops, resets to `0`, and starts again, all in one call. |
| `get()` | Returns the time on the stopwatch, in seconds, as a `double`. |
| `hasElapsed(seconds)` | Returns `true` if at least that many seconds are on the stopwatch. |

`restart()` is the one you will reach for most. "Start timing this from zero, right now" is almost always what you mean. It is why `autonomousInit()` has called `autoTimer.restart()` since Chapter 7: every time autonomous begins, the stopwatch starts again from zero.

`hasElapsed` is a small convenience. These two lines mean exactly the same thing:

```java
if (autoTimer.get() >= 1.0) { ... }
if (autoTimer.hasElapsed(1.0)) { ... }
```

Use whichever reads more clearly to you. `hasElapsed` reads like a sentence: "if the auto timer has elapsed one second."

### Check, do not wait

Here is the autonomous routine almost every beginner wants to write first:

```java
// BUG: do not do this in a periodic method!
drivetrain.arcadeDrive(0.5, 0.0);
Timer.delay(1.0);
drivetrain.stop();
```

It reads perfectly: drive, wait one second, stop. And it is exactly the trap Chapter 6 warned you about. `autonomousPeriodic()` is called fifty times a second, and it is supposed to finish in a few milliseconds each time. `Timer.delay(1.0)` freezes the entire program for a full second. During that second, nothing else runs: no dashboard updates, no safety checks, no logging, nothing. Then, twenty milliseconds later, `autonomousPeriodic()` is called again, and the whole thing starts over: drive, freeze, stop, drive, freeze, stop.

The `Timer` object lets you do the same thing without freezing anything. Instead of **waiting** for a second to pass, each loop **checks** whether it has passed yet:

```java
if (autoTimer.get() < 1.0) {
    drivetrain.arcadeDrive(0.5, 0.0);
} else {
    drivetrain.stop();
}
```

Read it aloud: "Every loop, look at the stopwatch. If less than one second has passed, drive. Otherwise, stop." Each call to `autonomousPeriodic()` takes a fraction of a millisecond. The robot keeps updating the dashboard, keeps logging, and keeps reacting, and after fifty loops, the answer to "has one second passed?" changes from no to yes.

This is the most important idea in the whole chapter, and it will stay true for every robot you ever program: **a periodic method is a snapshot, not a story.** It does not say "first this, then that." It says "given how things are right now, here is what to do for the next 20 milliseconds." The story comes from running the snapshot fifty times a second while the world changes around it.

> **The watchdog that stops runaway motors**
>
> WPILib's `DifferentialDrive` has a safety feature called **Motor Safety**. Every time you call `arcadeDrive` or `stop`, it resets a 0.1 second timer. If 0.1 seconds pass without a new command, WPILib assumes your program is stuck, stops the motors, and prints a warning containing `Output not updated often enough`. That is a good thing: a robot whose code froze should not keep driving blind at full speed. It also means every loop of `autonomousPeriodic()` must give the drivetrain a command, even if that command is "stop." If you ever see that warning, look for a `Timer.delay`, a long loop, or a path through your code that forgets to call the drivetrain.

---

## 12.3 Version 1: Drive by the Clock

Time to measure how good timed driving really is. The test is simple: try to drive exactly **50 centimeters** using only the clock.

### The timed 50 cm test

Open `Robot.java`. First add two constants with the others at the top of the class:

```java
    private static final double AUTO_DRIVE_SPEED = 0.5;
    private static final double TIMED_DRIVE_SECONDS = 1.0;
```

Then replace the inside of `autonomousPeriodic()`:

```java
    @Override
    public void autonomousPeriodic() {
        if (autoTimer.get() < TIMED_DRIVE_SECONDS) {
            drivetrain.arcadeDrive(AUTO_DRIVE_SPEED, 0.0, false);
        } else {
            drivetrain.stop();
        }
    }
```

Two things changed from Chapter 7, and both are about honesty:

- **Named constants** replace the `1.0` and `0.6` that have been sitting there as magic numbers since Chapter 7. You are about to tune these, and you should be able to find them at a glance.
- **The third argument, `false`**, uses the linear `arcadeDrive` overload you wrote in Chapter 11. The two-number version squares its inputs, which is great for a driver's thumb and confusing for autonomous: `0.5` would quietly become `0.25`. In autonomous, you want `0.5` to mean `0.5`.

Also add a line to `autonomousInit()`, right before `autoTimer.restart()`, so every run starts its distance count from zero:

```java
        drivetrain.resetEncoders();
```

The timed routine does not **use** the encoders. But your sensor dashboard still shows `Avg Distance (m)` in every mode, so the encoders can act as a referee: they will tell you how far the robot thinks it went.

### Calibrate the time

You do not know yet how long one second at half power takes the robot. Find out:

1. Place the XRP with the front of its wheels on the start line, pointing straight down leg 1.
2. Run the program. In the Sim GUI's **Robot State** panel (or the Driver Station), choose **Autonomous** and enable it.
3. When the robot stops, disable it. Measure how far the front of the wheels moved past the start line, in centimeters. Also write down the `Avg Distance (m)` widget.
4. Adjust `TIMED_DRIVE_SECONDS` to aim for 50 cm. If one second went 40 cm, try `1.25`. If it went 65 cm, try `0.77`. (Distance and time are roughly proportional at a steady speed, though the robot also needs a moment to speed up, so it may take a couple of tries.)

Repeat until one run lands within a centimeter or two of 50 cm. Congratulations: you have a calibrated timed autonomous.

### Now run it five more times

Do not change anything. Put the robot back on the start line and run it again. And again. Five runs, all with the same code. Record each one in a table like the one in Practice 1. Then try a different surface (carpet instead of a table, or the other way around) and do three more runs.

Here is what usually happens. Your numbers will be different, and that is the point of measuring:

- On the same surface, the runs are close but not identical. Maybe 48, 51, 50, 47, 49.
- On a different surface, every run is off in the same direction. Carpet drags on the wheels, so maybe 41, 42, 40.
- Late in the session, as the batteries drain, the robot starts coming up short.
- The robot does not stop on a dime. Even after `stop()`, it rolls a little.
- It may not go perfectly straight, either. Ending a centimeter or two to the side is common.

Why? Because `0.5` is not a speed. It is a fraction of the battery's voltage (Chapter 7 called it "a fraction of power"). The actual speed depends on how charged the batteries are, how much the floor drags on the wheels, how warm the motors are, and how much the two motors differ from each other. The timer measures the one thing you control perfectly (time) and hopes everything else stays the same. It never quite does.

> **Feedforward: predicting the power you need**
>
> If you knew exactly how motor power turns into speed on your robot, you could compute the power needed for any speed instead of guessing. That relationship is called a **feedforward** model, and it has a piece for the power it takes just to overcome friction and start moving, a piece for each extra meter per second, and a piece for speeding up. In Chapter 16 you will measure all three on your XRP with a tool called **SysId**, and your Explorer will finally be able to ask for "0.3 meters per second" instead of "0.5 power and hope."

### A timed obstacle course

Before you give up on the clock, see what a full timed course would look like. Each step happens during its own window of time:

```java
    @Override
    public void autonomousPeriodic() {
        double t = autoTimer.get();

        if (t < 1.0) {
            drivetrain.arcadeDrive(0.5, 0.0, false);    // leg 1: forward
        } else if (t < 1.6) {
            drivetrain.arcadeDrive(0.0, 0.5, false);    // turn left
        } else if (t < 2.4) {
            drivetrain.arcadeDrive(0.5, 0.0, false);    // leg 2: forward
        } else {
            drivetrain.stop();                          // done
        }
    }
```

(Magic numbers are left in on purpose here so you can see the timeline. You will not keep this version.)

This is an `if`/`else if` chain from Chapter 6. Java checks the conditions top to bottom and runs the **first** one that is true. At `t = 1.3`, the first test (`1.3 < 1.0`) is false, the second (`1.3 < 1.6`) is true, so the robot turns, and Java never even looks at the rest.

It works. But look at what you would have to do to tune it. The times are **cumulative**: `1.6` means "the turn ends 1.6 seconds after autonomous started," not "turn for 0.6 seconds." If you discover that leg 1 should be 1.2 seconds instead of 1.0, you have to change **every number below it** too, or the turn will happen at the wrong time. Add a fourth step in the middle and you rewrite the whole timeline. And the turn is the worst step of all: the angle you get from "0.5 rotation for 0.6 seconds" changes with the floor and the batteries just like the distance does, and an angle error at the corner turns into a big position error at the end of leg 2.

You can try this version in Practice 2 if you are curious. Then you will replace both of its weaknesses: the sensors will decide when each step is done, and a `switch` statement will keep the steps separate so changing one does not disturb the others.

---

## 12.4 Version 2: Drive by the Encoders

In Chapter 9 you gave the drivetrain a getter that answers the question you actually care about: `getAverageDistanceMeters()`, how far the center of the robot has moved. So ask it.

### The encoder 50 cm test

Add a constant for the target distance:

```java
    private static final double TEST_DISTANCE_METERS = 0.50;
```

Then replace `autonomousPeriodic()` again:

```java
    @Override
    public void autonomousPeriodic() {
        if (drivetrain.getAverageDistanceMeters() < TEST_DISTANCE_METERS) {
            drivetrain.arcadeDrive(AUTO_DRIVE_SPEED, 0.0, false);
        } else {
            drivetrain.stop();
        }
    }
```

Read it aloud: "Every loop, ask how far we have gone. If it is less than half a meter, keep driving. Otherwise, stop." The clock is gone. The only thing that decides when to stop is a measurement of the thing you are trying to control.

Keep `drivetrain.resetEncoders()` in `autonomousInit()`. It matters even more now: if the encoders still read `0.50` from the last run, the robot will think it is already done and never move.

Run it five times on your first surface and three times on the other, exactly like the timed test, and record the results.

You should see two things right away. First, the runs are much more **consistent**: the surface and the batteries no longer change where the robot stops very much, because a slower robot simply takes a little longer to reach 0.50 m. Second, the robot probably goes **too far**, by about the same amount every time. Maybe it stops at 52 or 53 cm, every single run.

Try one more experiment. After the robot stops, with autonomous still enabled, gently pull it back toward the start line by hand. It drives forward again, back to 0.50 m. You did not write any code for that. It is just what happens when the robot checks a measurement every loop instead of a stopwatch: the code is always asking "am I there yet?", and if you move the robot, the answer changes. This is your first **closed-loop** autonomous.

### Why the robot overshoots

The code says "stop at 0.50 m," and it does: on the first loop where the distance is `0.50` or more, it calls `stop()`. But "stop" means "cut the power," not "freeze in place." At that moment, the robot is still rolling, and it takes a moment to coast to a halt. The extra distance it covers after the power is cut is its **stopping distance**.

You can watch it happen. Your encoders kept counting during the coast, so the `Avg Distance (m)` widget shows where the robot actually stopped, not where the code said "stop." The gap between `0.50` and that final number is the stopping distance, measured.

A faster robot has a longer stopping distance. Try `AUTO_DRIVE_SPEED = 0.8` and watch the overshoot grow. Try `0.3` and watch it shrink (though below some power, the robot will not move at all, because the motors cannot overcome friction).

> **Slowing down as you arrive: a preview of PID**
>
> How do you park a car exactly at a line? You do not drive full speed and then slam the brakes. You ease off as the line gets close, so you are barely moving when you reach it. A robot can do the same thing: make the drive power **proportional to the distance remaining**. Far from the target, drive fast. Ten centimeters away, drive slowly. At the target, the power is zero. In code, that is one line: `power = kP * (target - distance)`, where `kP` is a number you tune. That is the **P** in **PID control**, and Chapter 15 is all about it. Today's code is the simplest possible version: full speed until you arrive, then zero. Engineers call that **bang-bang control**, and overshoot is its signature.

### Comparing `double`s: never use `==`

Look at the condition again:

```java
if (drivetrain.getAverageDistanceMeters() < TEST_DISTANCE_METERS) {
```

Why not drive until the distance **equals** `0.50`? Like this:

```java
// BUG: the robot will almost certainly never stop!
if (drivetrain.getAverageDistanceMeters() == TEST_DISTANCE_METERS) {
    drivetrain.stop();
} else {
    drivetrain.arcadeDrive(AUTO_DRIVE_SPEED, 0.0, false);
}
```

There are two reasons this fails, one about robots and one about Java.

**The robot reason: sampling.** Your code only looks at the encoders once every 20 milliseconds. If the robot is moving half a meter per second, it travels a full centimeter between looks. One loop it reads `0.4952`, the next it reads `0.5047`. It never reads exactly `0.5000`, so the `==` is never true, and the robot drives off the edge of the table. This is like trying to stop a car at a line by glancing at it once a second: you will never catch the instant it is exactly on the line, but you will easily notice that you have **passed** it.

**The Java reason: `double`s are almost never exact.** Try this in a scratch file or in your `Robot()` constructor:

```java
System.out.println(0.1 + 0.2);            // prints 0.30000000000000004
System.out.println(0.1 + 0.2 == 0.3);     // prints false
```

A `double` stores numbers in binary, and most decimal fractions (like `0.1`) cannot be written exactly in binary, the same way `1/3` cannot be written exactly in decimal (`0.3333...`). So `double` math produces tiny rounding errors, far too small to matter for driving a robot, but big enough to make `==` fail. Every measurement from a sensor, and every result of arithmetic, has errors like this.

So for `double`s, ask one of two questions instead of "are they equal?":

| Question | How to write it | Use it when |
|---|---|---|
| Have I reached or passed it? | `distance >= target` | Moving in one direction toward a target, as in this chapter |
| Am I close enough? | `Math.abs(target - distance) < tolerance` | The value could be on either side, and "close" is good enough |

`Math.abs` is another `static` utility method, like `Math.max` from Chapter 11. It returns the **absolute value**: the number with its minus sign removed. `Math.abs(-0.03)` is `0.03`. So `Math.abs(target - distance)` is "how far apart are they, ignoring which one is bigger," and comparing that to a small **tolerance** asks "are they within this much of each other?"

```java
private static final double DISTANCE_TOLERANCE_METERS = 0.02;

boolean closeEnough = Math.abs(TEST_DISTANCE_METERS - drivetrain.getAverageDistanceMeters())
    < DISTANCE_TOLERANCE_METERS;
```

That reads as "are we within 2 centimeters of the target?" WPILib has a shortcut for exactly this check, `MathUtil.isNear(expected, actual, tolerance)`, in the same `MathUtil` class as `applyDeadband` from Chapter 8. You will use tolerances constantly in Chapter 15, where the PID controller asks "am I close enough to call this done?"

> **When is `==` fine for a `double`?**
>
> In Chapter 8 you wrote `speedScale == SLOW_MODE_SCALE`. That one is safe, because `speedScale` is not measured or computed: it is a copy of `SLOW_MODE_SCALE` itself (or of `FULL_SPEED_SCALE`), chosen by the ternary. A copy of a value is exactly equal to the original. The danger is comparing a value that came from a sensor or from arithmetic. Rule of thumb: `==` is for `int`s, `boolean`s, and exact copies. For anything measured, use `>=`, `<=`, or a tolerance.

---

## 12.5 Turning to a Heading with the Gyro

Driving straight is half the course. The other half is the corner.

You might think the encoders could handle turning too. When the XRP spins in place to the left, the right wheel rolls forward and the left wheel rolls back, and in the Chapter 9 kinematics callout you computed the heading from that difference. But turning in place is exactly when wheels **scrub**: they slide sideways across the floor as the robot pivots, so the wheel distances say one thing while the robot does another. In Chapter 9's Practice 3, the gyro probably beat the encoder estimate for a quarter turn. The gyro measures rotation directly, and it does not care whether the wheels slipped. So the gyro decides when a turn is done.

### The turn test

Add two constants:

```java
    private static final double AUTO_TURN_SPEED = 0.5;
    private static final double TEST_HEADING_DEGREES = 90.0;
```

In `autonomousInit()`, next to `resetEncoders()`, reset the gyro too, so the robot's heading at the start of autonomous is `0`:

```java
        drivetrain.resetHeading();
```

Then replace `autonomousPeriodic()` one more time:

```java
    @Override
    public void autonomousPeriodic() {
        if (drivetrain.getHeadingDegrees() < TEST_HEADING_DEGREES) {
            drivetrain.arcadeDrive(0.0, AUTO_TURN_SPEED, false);
        } else {
            drivetrain.stop();
        }
    }
```

Forward is `0.0`, so the robot spins in place. Rotation is **positive**, and in WPILib's robot frame, positive rotation is counterclockwise: the robot turns **left**. The gyro agrees: turning left makes the heading climb from `0` toward `90`. Same convention, both ends. You checked this on your own robot in Chapter 9; if your gyro needed a minus sign then, it is already inside `getHeadingDegrees()`, and this code works unchanged. That is the payoff of putting the fix in the getter.

Put a piece of tape on the floor along one side of the robot before you run it, so you can see the starting angle. Run it a few times. You will see the same pattern as before: the turns are consistent, and they **overshoot**. The heading widget probably settles a few degrees past `90`. Turning has a stopping distance too (engineers would call it momentum, or **angular momentum**), and the faster you spin, the farther you coast.

If the robot does not turn at all, or turns in jerky little bursts, the motors are not strong enough at `0.5` to overcome the friction of the wheels scrubbing sideways. Try `0.6`. The amount of power it takes just to get a robot moving is one of the three numbers SysId measures in Chapter 16. It is called **kS**, for static friction.

> **Turn by an angle, or turn to a heading?**
>
> There are two ways to describe a turn. "Turn **by** 90 degrees" means "whatever way you are facing now, turn 90 more." "Turn **to** a heading of 90 degrees" means "end up facing 90 degrees from where you faced at the start of autonomous." They sound the same, but they behave differently when something goes wrong. If the robot drifted 3 degrees to the right during leg 1, "turn by 90" ends up 3 degrees off, and that error is carried into every step after it. "Turn to 90" turns 93 degrees and fixes it. That is why this code resets the gyro once, in `autonomousInit()`, and never in the middle of the routine: every turn is measured from the same starting direction, so errors do not pile up. In Chapter 14, odometry takes this idea all the way: the robot will always know its heading **and** its position relative to where autonomous began.

---

## 12.6 One Step at a Time: The `switch` Statement

You now have three working pieces: drive to a distance, turn to a heading, and (from Chapter 9) see a line. The obstacle course needs them **in order**: drive, then turn, then drive to the line, then stop. And you already know from Section 12.2 that you cannot write "first this, then that" in a periodic method. Each loop is a snapshot.

So the robot needs to **remember** which step it is on. That is a job for a field, the same way `wasBlocked` remembered something from the last loop in Chapter 10:

```java
private int autoStep;
```

The plan: number the steps. Each loop, look at `autoStep` and do whatever that step says. When a step's job is done, change `autoStep` to the next number. The next loop, the robot does the next step.

You could write that with an `if`/`else if` chain:

```java
if (autoStep == 1) {
    // drive leg 1
} else if (autoStep == 2) {
    // turn
} else if (autoStep == 3) {
    // drive to the line
} else {
    // stop
}
```

That works (and `==` is fine here, because `autoStep` is an `int`). But Java has a statement built for exactly this shape, "do one of several things, depending on the value of one variable": the **`switch` statement**.

### How `switch` works

```java
switch (autoStep) {
    case 1:
        // drive leg 1
        break;
    case 2:
        // turn
        break;
    case 3:
        // drive to the line
        break;
    default:
        // stop
        break;
}
```

Walk through it:

- **`switch (autoStep)`** says "look at the value of `autoStep`."
- Each **`case 1:`** is a **label**: "if the value is `1`, start here." Java jumps straight to the matching label. It does not test the others one by one the way an `if` chain does.
- The code after a label runs until Java reaches **`break;`**, which means "jump out of the `switch` now."
- **`default:`** is where Java goes if no label matches, like the final `else`. Always include one.

A `switch` works on `int`s, `String`s, and a few other types (but not `double`s, which, after Section 12.4, should make sense). Its labels must be **constants**: values Java can know before the program ever runs. A literal like `2` is a constant. So is a `static final int` like the ones you have been writing since Chapter 8.

That means you can, and should, give the steps names instead of numbers:

```java
private static final int STEP_DRIVE_LEG_1 = 1;
private static final int STEP_TURN_LEFT = 2;
private static final int STEP_DRIVE_TO_LINE = 3;
private static final int STEP_DONE = 4;
```

```java
switch (autoStep) {
    case STEP_DRIVE_LEG_1:
        // ...
```

`case STEP_TURN_LEFT:` tells a reader exactly what that block is for. `case 2:` does not. This is the "no magic numbers" habit from Chapter 8, applied to steps.

### The missing `break` bug

Here is the one thing about `switch` that bites everyone once. Without a `break`, Java does not stop at the end of a case. It keeps going, straight into the code under the next label. This is called **fall-through**:

```java
switch (autoStep) {
    case STEP_DRIVE_LEG_1:
        drivetrain.arcadeDrive(AUTO_DRIVE_SPEED, 0.0, false);
        // BUG: no break here!
    case STEP_TURN_LEFT:
        drivetrain.arcadeDrive(0.0, AUTO_TURN_SPEED, false);
        break;
    // ...
}
```

During step 1, Java runs the drive line, falls through into the turn case, and runs the turn line too. The second command replaces the first within the same loop, so the motors only ever see "turn." You enable autonomous, and the robot spins in place instead of driving forward. The code compiles without a single warning. It is a logic error, the hardest kind from Chapter 10, and the fix is one word.

> **A common beginner mistake**
>
> Forgetting `break` is the classic `switch` bug, in every language that has one. Make it a habit to type `break;` the moment you type a `case` label, before you write anything in between. When you review a teammate's pull request (Chapter 11), check that every case ends with a `break`, or with a comment explaining why it should not.

Sometimes, fall-through is exactly what you want: two labels that should run the same code. Stack them with nothing between:

```java
    case STEP_DONE:
    default:
        drivetrain.stop();
        break;
```

"If the step is `STEP_DONE`, or anything unexpected, stop." Nothing is missing here: there is simply no code between the two labels to forget a `break` after.

> **The newer arrow form**
>
> Since Java 14, `switch` has a second form that cannot fall through: `case STEP_TURN_LEFT -> { ... }`, with an arrow and curly braces instead of a colon and `break`. WPILib uses Java 17, so the arrow form works in your robot project, and some teams prefer it for exactly this reason. This book uses the colon form because it is what you will see in most robot code online, including the `autonomousPeriodic()` of a fresh WPILib XRP template, which uses a `switch` to pick between autonomous routines. If you understand the colon form and its `break`, the arrow form will take you thirty seconds to learn.

### Moving from one step to the next

Each step needs three things to happen at the moment it begins:

1. `autoStep` changes to the new step.
2. The step remembers where it started, so it can measure its own distance.
3. The step's own stopwatch restarts, so it can tell if it is taking too long.

Three things that always happen together belong in a helper method (Chapter 6):

```java
    /**
     * Move autonomous to a new step.
     *
     * @param newStep the step to start, one of the STEP_ constants
     */
    private void startStep(int newStep) {
        autoStep = newStep;
        stepStartDistanceMeters = drivetrain.getAverageDistanceMeters();
        stepTimer.restart();
        DataLogManager.log("Auto step " + newStep + " started at " + autoTimer.get() + " s");
    }

    /** How far the robot has driven since the current step started, in meters. */
    private double getStepDistanceMeters() {
        return drivetrain.getAverageDistanceMeters() - stepStartDistanceMeters;
    }
```

Why remember a starting distance instead of just resetting the encoders at the start of each step? Think of a car's odometer. To measure one leg of a road trip, you do not unscrew the odometer and set it back to zero; you note the reading at the start of the leg and subtract. Resetting would work today. But in Chapter 14, **odometry** will use the encoders' running totals to track where the robot is on the field, and resetting them in the middle of a routine would make the robot think it teleported. Subtracting a starting value keeps the totals intact and gives each step its own trip meter.

The log line uses the event-logging habit from Chapter 10: one message per step change, not one per loop. After a run, the log tells you exactly when each step started, which is the first thing you will want to know when a routine misbehaves.

### A safety net: step timeouts

What if a step never finishes? Maybe the rangefinder cable fell out, a wheel is stuck against a table leg, or the robot missed the black line and is driving off toward the kitchen. With nothing to stop it, a step that is waiting for a sensor will wait forever.

This is where the timer comes back, not as the thing that decides when a step is done, but as a **safety net**. Give every step a time limit. If a step is still running after, say, three seconds, something has gone wrong, so stop the robot and log it:

```java
        if (autoStep != STEP_DONE && stepTimer.hasElapsed(STEP_TIMEOUT_SECONDS)) {
            DataLogManager.log("Auto step " + autoStep + " TIMED OUT");
            startStep(STEP_DONE);
        }
```

Pick the timeout by measuring: run the routine, see how long the slowest step normally takes (the log tells you), and set the timeout comfortably above that. Too tight and a slightly slow run gets cut off; too loose and a broken run drives a long way before it gives up.

So the final answer to "timer or encoders?" turns out to be: **both, with different jobs**. Sensors decide when a step is done. The timer catches the steps that never will be.

> **You just built a state machine**
>
> A variable that remembers which step the robot is on, code that behaves differently in each step, and rules for moving from one step to the next: that is a **finite state machine**, one of the most useful ideas in all of robotics. Your steps are its **states**, and conditions like "distance reached 0.5 m" are its **transitions**. Chapter 21 gives state machines a full chapter, with Java's `enum` replacing the `static final int` step numbers. And in Chapter 20, WPILib's **command groups** will let you write this whole routine as one readable line per step, with the step-tracking handled for you.

---

## 12.7 The Full Routine: Obstacle Course Leg 1

Here is everything together. This is the full `Robot.java`, starting from the end of Chapter 11 (the pair lab left `TURN_SCALE` and `MAX_REVERSE_SPEED` in `teleopPeriodic()`). Remove the temporary test constants from Sections 12.3 to 12.5 (`TIMED_DRIVE_SECONDS`, `TEST_DISTANCE_METERS`, `TEST_HEADING_DEGREES`) as you go. `Drivetrain.java` and `Sensors.java` do not change. Type it, do not paste:

```java
package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.DriverStation;
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
    private static final double TURN_SCALE = 0.7;
    private static final double MAX_REVERSE_SPEED = 0.5;

    // Autonomous: obstacle course leg 1. Measured on our floor; re-test on new surfaces.
    private static final double AUTO_DRIVE_SPEED = 0.5;
    private static final double AUTO_TURN_SPEED = 0.5;
    private static final double LEG_1_DISTANCE_METERS = 0.50;
    private static final double TURN_HEADING_DEGREES = 90.0;
    private static final double LEG_2_MAX_DISTANCE_METERS = 1.00;
    private static final double STEP_TIMEOUT_SECONDS = 3.0;

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
    }

    @Override
    public void robotPeriodic() {
        // Y zeroes the encoders and the gyro. Works even while disabled.
        if (controller.getYButtonPressed()) {
            drivetrain.resetEncoders();
            drivetrain.resetHeading();
            DataLogManager.log("Sensors zeroed");
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

        // Every run measures from here: zero distance, zero heading.
        drivetrain.resetEncoders();
        drivetrain.resetHeading();
        autoTimer.restart();
        startStep(STEP_DRIVE_LEG_1);
    }

    @Override
    public void autonomousPeriodic() {
        switch (autoStep) {
            case STEP_DRIVE_LEG_1:
                // Drive straight ahead until the encoders say we have gone far enough.
                drivetrain.arcadeDrive(AUTO_DRIVE_SPEED, 0.0, false);
                if (getStepDistanceMeters() >= LEG_1_DISTANCE_METERS) {
                    startStep(STEP_TURN_LEFT);
                }
                break;

            case STEP_TURN_LEFT:
                // Spin in place until the gyro says we face 90 degrees (left is positive).
                drivetrain.arcadeDrive(0.0, AUTO_TURN_SPEED, false);
                if (drivetrain.getHeadingDegrees() >= TURN_HEADING_DEGREES) {
                    startStep(STEP_DRIVE_TO_LINE);
                }
                break;

            case STEP_DRIVE_TO_LINE:
                // Drive ahead until either line sensor sees the tape.
                drivetrain.arcadeDrive(AUTO_DRIVE_SPEED, 0.0, false);
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
        DataLogManager.log("Auto step " + newStep + " started at " + autoTimer.get() + " s");
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

Walk through what changed since Chapter 11:

- **New constants**, in two groups. The autonomous tuning values (speeds, distances, the heading, the timeout) sit together with a comment saying they were measured, so the next person knows to re-measure. The step numbers get their own group, plus `STEP_NOT_STARTED` so the dashboard shows `0` before autonomous has ever run.
- **A second `Timer`**, `stepTimer`. `autoTimer` still times the whole routine (it shows up in the log), and `stepTimer` times only the current step, for the timeout. Two stopwatches, two jobs.
- **Two new remembered fields**: `autoStep` and `stepStartDistanceMeters`. Neither is `final`, because both change while the program runs.
- **`autonomousInit()`** zeroes the encoders and the gyro, restarts the routine's stopwatch, and starts step 1. Everything the routine measures is measured from this moment.
- **`autonomousPeriodic()`** is one `switch`, then the timeout check. Every case gives the drivetrain a command every loop (Motor Safety is happy), then checks whether its job is done. Each step only knows about itself and which step comes next.
- **`startStep()` and `getStepDistanceMeters()`** are private helpers with Javadoc (Chapter 11). Every step change goes through `startStep()`, so every step change is logged the same way.
- **Three new dashboard widgets**: `Auto Step`, `Step Time (s)`, and `Step Distance (m)`. When something goes wrong, the first question is "which step was it on?", and now you can see it.
- **Teleop did not change at all.** Neither did `Drivetrain` or `Sensors`. In Chapter 8, the drivetrain did not care whether its numbers came from a controller or a timer. Now it does not care whether they come from a controller or a `switch`.

### Run it

Place the robot on the start line, pointing down leg 1. Run the program, open SmartDashboard, and put the `Auto Step` widget somewhere you can see it. Choose **Autonomous** and enable.

You should see the robot drive forward about half a meter, spin left a quarter turn, drive to the black line, and stop, with `Auto Step` counting `1`, `2`, `3`, `4` along the way. Disable it, then look at the terminal panel, where `DataLogManager.log` also prints. You should see the story of the run:

```
********** Robot program startup complete **********
Mode: Disabled
Mode: Autonomous
Auto step 1 started at 0.0 s
Auto step 2 started at 1.18 s
Auto step 3 started at 1.84 s
Line found after 0.39 m
Auto step 4 started at 2.73 s
Mode: Disabled
```

(Your times and distances will be different. The order should not be.)

> **On a real field, autonomous ends on its own**
>
> At a competition, the field's control system switches every robot from autonomous to teleop when the autonomous period ends, whether your routine is finished or not. On your desk there is no field control system, so autonomous lasts until you disable it. That is one more reason every step needs a way to finish, and the routine needs a clear "done" step that stops the motors. A routine that relies on "the period will end eventually" will one day run straight off a table.

---

## 12.8 Timer vs Encoders: What the Tape Measure Says

You have now run the same 50 cm test with a timer and with encoders, and you have a table of real measurements to prove what happened. Put your results side by side. Most readers find something like this:

| | Timer | Encoders |
|---|---|---|
| Same surface, same session | Close, varies by a few cm | Very close, nearly identical runs |
| Different surface | Off by a lot, all in one direction | Nearly unchanged |
| Tired batteries | Comes up short | Nearly unchanged, just slower |
| Overshoot past the target | Hard to separate from everything else | Small and consistent |
| Needs sensors | No | Yes |
| Something blocks the robot | Stops on schedule anyway | Keeps pushing until the timeout |

The pattern underneath the table is the most important idea in this chapter: **measure the thing you care about.** The timer controls time and hopes the distance follows. The encoders measure distance directly. Every factor that changes the robot's speed (batteries, floor, motor temperature) fools the timer, and barely bothers the encoders, because a slow robot just takes a little longer to reach the same number.

Notice that last row, though. Encoders are not magic. They do not know about the world, only about the wheels. Here is what they **cannot** fix:

- **Wheel slip.** If a wheel spins on a slick floor, or the robot pushes against something, the encoders count distance the robot did not actually travel.
- **Curving.** If the two sides of the drivetrain are not perfectly matched, the robot drifts to one side while driving "straight." The average distance can be exactly right while the robot ends up off to the side.
- **Overshoot.** The encoders measure the stopping distance perfectly, but your code only stops the motors; it does not slow down early.

Each of those has a fix coming. Chapter 13 turns "forward and rotation" into exact wheel speeds with **kinematics**. Chapter 14 combines the encoders and gyro to track the robot's **position**, so curving shows up as a measurable sideways error. Chapter 15 uses **PID control** to slow down on approach and to steer the robot straight using the gyro. And Chapter 16 measures your drivetrain with **SysId**, so you can ask for a speed instead of a power.

### When the timer is still the right tool

Timers do not disappear from autonomous. They just change jobs. Good uses for a `Timer` in autonomous:

- **Timeouts**, like your `STEP_TIMEOUT_SECONDS`. "Give up if this takes too long" is always a timer's job.
- **Waiting for something you cannot measure.** "Wait half a second for the game piece to leave the shooter" is a timed step on many real robots, when there is no sensor to say it has left.
- **Pauses on purpose.** "Wait one second so our alliance partner can drive past first" is a common autonomous strategy.
- **When the sensor is broken.** A timed backup routine is much better than no routine. Many teams keep one ready for exactly this reason.

> **Do not tune a routine you cannot repeat**
>
> When an autonomous routine misses, the first temptation is to change a number and try again. Before you do, run it three times **without** changing anything. If the three runs land in three different places, no number you change will fix it: the problem is inconsistency, and you need to find what is changing between runs (batteries? the start position? a slipping wheel?). Only when the routine misses **the same way** every time is it ready to tune. This is the scientist's approach from Chapter 10, applied to autonomous, and it will save you hours of chasing your tail.

---

## Chapter Summary

> **What you learned in Chapter 12**
>
> * In **autonomous**, the first 15 to 20 seconds of a match depending on the game, the robot runs on code alone. Reliability matters more than ambition.
> * A `Timer` object is a **stopwatch**: `restart()`, `get()`, `hasElapsed(seconds)`. In a periodic method, **check** the time every loop instead of **waiting** with `Timer.delay()`. A periodic method is a snapshot, not a story. Every loop must also command the drivetrain, or **Motor Safety** stops the motors.
> * A **timed** routine is simple, but `0.5` is power, not speed, so batteries and surfaces change where the robot ends up. **Encoder** driving measures distance directly and is far more repeatable. Both overshoot by the robot's **stopping distance**, which PID control (Chapter 15) will fix.
> * Never compare measured `double`s with `==`: sensors are sampled every 20 ms and `double` math has tiny rounding errors (`0.1 + 0.2` is not `0.3`). Use `>=` for "reached or passed" and `Math.abs(target - value) < tolerance` for "close enough."
> * The **gyro** decides when a turn is done, because wheels scrub during turns. Reset it once at the start of autonomous and turn **to a heading**, so small errors do not pile up.
> * The **`switch` statement** picks one block of code based on a value. Every `case` ends with `break`, or the code **falls through** into the next case. Name your cases with `static final int` constants.
> * A multi-step routine is a variable that remembers the current step, a `switch` that acts on it, and rules for moving to the next step: a **state machine**. Sensors decide when a step is done; a **timeout** catches steps that never finish.

---

## Exercises

### Practice

**1. The 50 cm showdown.** Do this while you read Sections 12.3 and 12.4: the timed runs before you replace the timed code, the encoder runs after. For each run, measure how far the front of the wheels ended up past the start line with a tape measure, and write down the `Avg Distance (m)` widget too. Record everything in a table:

| Run | Method | Surface | Target (cm) | Tape measure (cm) | Encoders (cm) | Error (cm) |
|---|---|---|---|---|---|---|
| 1 | Timer | Table | 50 | | | |
| ... | | | | | | |

Do at least five runs of each method on your usual surface and three of each on a second surface (or with your oldest batteries). Then write one paragraph comparing the two methods. Which one was more **accurate** (close to 50 cm on average)? Which was more **repeatable** (close to itself)? Did the tape measure and the encoders ever disagree, and if so, why? Save the table and the paragraph in `reflections.md`.

**2. Predict the switch.** For each version of this code, predict what the robot does during step 1, then explain why in one sentence:

```java
switch (autoStep) {
    case STEP_DRIVE_LEG_1:
        drivetrain.arcadeDrive(AUTO_DRIVE_SPEED, 0.0, false);
    case STEP_TURN_LEFT:
        drivetrain.arcadeDrive(0.0, AUTO_TURN_SPEED, false);
        break;
    default:
        drivetrain.stop();
        break;
}
```

1. The code exactly as shown.
2. With `break;` added after the first `arcadeDrive`.
3. With `break;` added after the first `arcadeDrive`, but `autoStep` is `7`.
4. With every `break;` removed.

Then predict what each line prints, and check in a scratch file or your `Robot()` constructor:

```java
System.out.println(0.1 + 0.2 == 0.3);
System.out.println(0.5 + 0.25 == 0.75);
System.out.println(Math.abs((0.1 + 0.2) - 0.3) < 0.0001);
System.out.println(Math.abs(-0.04));
```

The second line is a surprise. (Hint: `0.5` and `0.25` are one half and one quarter. What is special about halves and quarters in binary?)

**3. Lead the turn.** Your turn overshoots by a few degrees. One simple fix is to stop **early** by the amount the robot coasts. Measure the overshoot over five turns (the `Heading (deg)` widget after the robot stops, minus `90`). Add a constant `TURN_COAST_DEGREES` set to your average overshoot, and change the turn condition to `drivetrain.getHeadingDegrees() >= TURN_HEADING_DEGREES - TURN_COAST_DEGREES`. Run five more turns. How close do they get to `90`? Now change `AUTO_TURN_SPEED` to `0.7` without changing `TURN_COAST_DEGREES`. What happens, and what does that tell you about this kind of fix? (Chapter 15 has a better one.)

### Build (XRP Explorer)

Give the Explorer its first real autonomous routine: obstacle course leg 1.

1. Lay out the course from Section 12.1 on your floor: start line, corner mark at 0.5 m, black tape line about 0.4 m to the left of the corner.
2. Update `Robot.java` to the listing in Section 12.7. Build and confirm `BUILD SUCCESSFUL`.
3. Power on the XRP flat and still, wait for the gyro calibration to finish, and run the program. Arrange the three new autonomous widgets on your SmartDashboard and save the layout.
4. Place the robot on the start line and run autonomous. Watch `Auto Step` count from `1` to `4`.
5. Read the terminal output and confirm each step started in order. Note how long each step took.
6. Run it five times. Each time, measure how far from the center of the tape the robot's line sensors stopped. Record the results.
7. Set `STEP_TIMEOUT_SECONDS` to about one and a half times your slowest step's normal time.
8. Test the safety nets on purpose. Run once with the black tape removed: the robot should stop after `LEG_2_MAX_DISTANCE_METERS` and log `No line within...`. Run once while gently holding the robot still with your hand during leg 1: the step should time out and log `TIMED OUT`.

Diagnose anything strange:

- **Spins in place instead of driving forward:** a missing `break` after `STEP_DRIVE_LEG_1` (Section 12.6).
- **Does nothing at all, and `Auto Step` stays at `0`:** `autonomousInit()` is not calling `startStep(STEP_DRIVE_LEG_1)`, or you are in Teleoperated instead of Autonomous.
- **Turns right instead of left:** your gyro or rotation sign is flipped. Check that the heading climbs when you turn the robot left by hand (Chapter 9), and that `AUTO_TURN_SPEED` is positive.
- **Turns forever:** the heading never reaches `90`. Watch the `Heading (deg)` widget. If it goes negative, see the previous item. If it stays at `0`, the gyro is not working; power-cycle the XRP flat and still.
- **Skips leg 1 and turns immediately:** the encoders were not reset, or a distance is already above `0.50` from an earlier run. Check `autonomousInit()`.
- **Drives right over the line:** your `LINE_THRESHOLD` does not match this surface, or the robot was going so fast it passed the tape between loops. Re-measure (Chapter 9) and try a lower `AUTO_DRIVE_SPEED`.
- **Stops at the line but well to one side of the corner mark:** the robot curved during leg 1. That is expected for now. Chapter 15 drives straight with the gyro.
- **Prints `Output not updated often enough`:** some path through `autonomousPeriodic()` does not command the drivetrain. Check that every case calls `arcadeDrive` or `stop`.

When the robot runs leg 1 five times in a row and stops on the line every time, you have a working autonomous routine. Every later chapter in Sections III and IV upgrades a piece of it: kinematics, odometry, PID, feedforward, then command-based steps in Chapter 20, until the whole obstacle course runs on its own in Chapter 25.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Your timed routine was calibrated to drive exactly 50 cm, and it did, once. Why did it miss on a different surface or with tired batteries, while the encoder version did not? What is the timer actually measuring, and what were you hoping it would measure?
2. The encoder routine still overshoots by about the same amount every run. Why is a robot that misses **the same way** every time easier to fix than one that misses by a different amount each time?
3. Your routine resets the gyro once, in `autonomousInit()`, and never in the middle. Describe what would go wrong over a long routine with several turns if you reset the heading at the start of every turn and turned "by 90 degrees" each time.

If any answer feels shaky, re-read Sections 12.3, 12.4, and 12.5.

### Git

Use the team workflow from Chapter 11, even though this is your own repository. Practice is how it becomes automatic:

```bash
git checkout main
git pull
git checkout -b encoder-auto
```

Do the Build exercise on that branch. When the routine runs reliably:

```bash
git add .
git commit -m "Ch12: encoder autonomous v1"
git push -u origin encoder-auto
```

Open a pull request into `main` with a what, why, and how-I-tested description. For "how I tested it," paste your five Build runs. Read the **Files changed** tab yourself before merging (Chapter 11's "review your own PR first"), then merge it, delete the branch, and finish with `git checkout main` and `git pull`.

Six months from now, when someone asks "how accurate is our autonomous?", that pull request will have the answer, with numbers.

### Collab: The Line Challenge

Work with a partner, each with your own XRP. One person places the black tape line anywhere from 0.3 m to 0.7 m past the corner, without telling the other. Each of you runs your routine once without changing any code. Whose robot stops closer to the center of the tape? Then swap who places the line. Afterward, compare your autonomous constants and your Practice 1 tables: which differences in your code or your robots explain the results?

---

> **Additional Resources**
>
> * **Programming the XRP**: [docs.wpilib.org/en/stable/docs/xrp-robot/programming-xrp.html](https://docs.wpilib.org/en/stable/docs/xrp-robot/programming-xrp.html) the official guide to creating and running XRP programs from your laptop with Simulate Robot Code
> * **`Timer` Javadoc**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/Timer.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/Timer.html) every method on WPILib's `Timer`, including `restart`, `hasElapsed`, and `advanceIfElapsed`
> * **Using the WPILib Classes to Drive your Robot**: [docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/wpi-drive-classes.html](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/wpi-drive-classes.html) how `DifferentialDrive` works, including its Motor Safety watchdog
> * **`MathUtil` Javadoc**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/MathUtil.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/MathUtil.html) `isNear` for tolerance checks, alongside `applyDeadband` from Chapter 8
> * **The switch Statement (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/nutsandbolts/switch.html](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/switch.html) Java's own explanation of `case`, `break`, `default`, and fall-through, with examples you can run

---

*Next up, Chapter 13: Kinematics: How Movement Is Calculated. You will open up the math inside `arcadeDrive`, turn a forward speed and a turn rate into exact left and right wheel speeds, and drive the Explorer by velocity instead of by power.*
