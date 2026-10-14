# Chapter 15: PID Control: Making the Robot Accurate

In Chapter 12 you wrote the Explorer's first autonomous routine, and you found its signature flaw: it overshoots. It drives at full speed until the encoders say `0.50`, cuts the power, and coasts a few centimeters past the mark. It turns until the gyro says `90`, cuts the power, and slides a few degrees past. In Chapter 13 you gave it real units, and in Chapter 14 you gave it a map. The map made the flaws impossible to ignore. Your Chapter 14 log showed the robot curving slightly left on a "straight" leg, and your tape measure showed it stopping somewhere near the target, not on it.

Every one of those problems has the same cause. The robot does not **correct** itself. It either pushes as hard as it can, or it does not push at all. It never thinks "I am almost there, so ease off," and it never thinks "I am drifting left, so steer a little right."

This chapter teaches it to think both of those things. The tool is called **PID control**, and it is the single most used idea in all of robot programming. Every FRC robot you will ever work on uses it: to turn to a heading, to hold an arm at a height, to spin a shooter at an exact speed, to point a swerve wheel, to follow a path. By the end of this chapter, the Explorer will slow down smoothly as it reaches the corner, turn to exactly 90 degrees, and hold a straight line using the gyro.

PID is also where robot programming starts to feel less like writing instructions and more like tuning an instrument. The code is short. Getting the numbers right takes patience, a good graph, and a few failed attempts that teach you more than the successful ones. That is why this chapter is planned for two meetings. Give the tuning the time it deserves.

On the Java side, you will learn the **compound assignment operators** (`+=` and friends), and you will learn about **scope and lifetime**: where a variable lives, how long it lasts, and why a PID controller has to be an object with memory instead of a single line of math.

You will need your XRP, the course from Chapter 12, the clear patch of floor from Chapter 14, and a tape measure.

---

## 15.1 Bang-Bang: The Controller You Already Wrote

Think about how you take a shower. You turn the handle, put your hand in the water, and it is too cold. You turn the handle toward hot. Better, but still cold, so you turn it a little more. Now it is too hot, so you nudge it back. After a few small adjustments, it is just right. You never calculated anything. You compared what you **wanted** (warm) with what you **felt** (cold), and you turned the handle in the direction that made the difference smaller. The bigger the difference, the bigger the turn.

That is a **control loop**, and you have been running them your whole life. Steering a bike, filling a glass to the top without spilling, parking a car at a line: each one is "compare what I want with what I have, then adjust."

### Your robot already has a control loop

Here is the leg 1 step from your autonomous routine, as it stood at the end of Chapter 14:

```java
drivetrain.drive(AUTO_DRIVE_METERS_PER_SECOND, 0.0);
if (getStepDistanceMeters() >= LEG_1_DISTANCE_METERS) {
    startStep(STEP_TURN_LEFT);
}
```

It compares what it wants (0.50 m) with what it has (the encoder distance), every 20 milliseconds, and it adjusts. But its adjustment has only two settings: full speed, or stop. Chapter 12 gave this kind of controller its name, **bang-bang control**, after the sound a valve makes when it slams fully open and fully closed. A home thermostat is a bang-bang controller: the furnace is either on or off.

Bang-bang control is simple, and for some jobs it is perfect. A thermostat does not care if the room overshoots by half a degree. But a robot does, and Chapter 12 showed you why bang-bang always overshoots: by the time the code notices it has arrived, the robot is still moving at full speed, and it coasts.

> **A shower with only two settings**
>
> Imagine a shower handle that only has "freezing" and "scalding." You would spend the whole shower flipping it back and forth, never comfortable. That is bang-bang control. What you want is a handle you can turn **a little** when you are close and **a lot** when you are far. PID control is that handle.

### The vocabulary of control

Control engineers use a handful of words for the parts of every loop. You will see them in WPILib's method names, in documentation, and on Chief Delphi, so learn them now:

| Word | Meaning | Shower | Leg 1 of the course |
|---|---|---|---|
| **Setpoint** | What you want | Warm water | 0.50 m |
| **Measurement** | What a sensor says you have right now (also called the **process variable**) | How the water feels | The encoder distance |
| **Error** | Setpoint minus measurement: how far you are from what you want | "Still too cold" | 0.50 minus the distance so far |
| **Output** | What the controller tells the hardware to do | How far to turn the handle | The forward speed to send to `drive()` |
| **Controller** | The rule that turns error into output | Your brain | The code you are about to write |

Notice the order in the error: **setpoint minus measurement**. If the robot has driven 0.30 m toward a 0.50 m setpoint, the error is `0.50 - 0.30 = 0.20`. Positive error means "you have not gotten there yet, keep going forward." If the robot overshoots to 0.53 m, the error is `0.50 - 0.53 = -0.03`. Negative error means "you went too far, back up." The sign of the error tells the robot which way to go. You will lean on that fact all chapter.

Here is the whole loop, drawn as a picture:

```
                 error                   output
  setpoint ---> ( - ) ---> [ controller ] ---> [ drivetrain ] ---+---> the robot moves
                  ^                                              |
                  |                                              |
                  +---------------- measurement <---- [ encoders ] <-+
```

The measurement comes **back around** and is compared with the setpoint again, fifty times a second. That loop back is why this is called **feedback control**, or **closed-loop** control. You met that word in Chapter 8, where the driver's eyes closed the loop, and in Chapter 12, where you pulled the robot back by hand and it drove forward again on its own. In this chapter, the code closes it.

---

## 15.2 P: Push in Proportion to the Error

Here is the idea Chapter 12 previewed. Instead of "full speed or stop," make the output **proportional to the error**:

```
output = kP × error
```

`kP` is a number you choose, called the **proportional gain**. That is the whole P controller. One multiplication.

Try it with numbers. Use `kP = 2.0`, a setpoint of 0.50 m, and remember that the output is a forward speed in meters per second, because the Explorer's `drive()` method speaks meters per second (Chapter 13):

| Distance so far (m) | Error (m) | Output: kP × error (m/s) | What the robot does |
|---|---|---|---|
| 0.00 | 0.50 | 1.00 | Wants to go fast (more than it can) |
| 0.30 | 0.20 | 0.40 | Still fast |
| 0.45 | 0.05 | 0.10 | Slowing down |
| 0.49 | 0.01 | 0.02 | Barely creeping |
| 0.50 | 0.00 | 0.00 | Stopped, right on the mark |
| 0.52 | -0.02 | -0.04 | Gently backing up |

Read that table from top to bottom and you can see the robot park itself. Far from the target, it drives hard. As the error shrinks, so does the speed, so by the time it arrives it is barely moving and has almost nothing to coast with. And if it does overshoot, the error goes negative, and the output goes negative with it. The robot drives back. No `if` statement decides when to stop. The math just runs out of push.

> **What are the units of kP?**
>
> The error is in meters, and the output is in meters per second. So `kP` must turn meters into meters per second: its units are "meters per second of speed, for every meter of error." `kP = 2.0` means "for every meter you are away, drive 2 meters per second." In Chapter 12's preview, the output was a motor **power** instead, so `kP` would have meant "power per meter." Same idea, different units. Always write the units next to a gain in a comment. A `kP` of `2.0` means nothing until you know what it turns into what.

### Limits: clamping the output

The first row of the table asks for 1.00 m/s. Your XRP's top speed is about 0.28 m/s. What happens?

`drive()` already handles it: desaturation (Chapter 13) scales the wheel speeds down to the top speed, so the robot simply drives at full power. That is safe, but it means the start of leg 1 is bang-bang again. More importantly, you lose control of how fast the robot goes. Your routine has run at `AUTO_DRIVE_METERS_PER_SECOND = 0.20` since Chapter 13, and you tuned your course around that speed.

The fix is to **clamp** the output: let the controller ask for anything, then limit the answer to a range you choose. WPILib's `MathUtil` class (the home of `applyDeadband` from Chapter 8 and `isNear` from Chapter 12) has a `static` method for exactly this:

```java
double speed = MathUtil.clamp(kP * error, -0.20, 0.20);
```

`MathUtil.clamp(value, low, high)` returns `value` if it is between `low` and `high`, `low` if it is below, and `high` if it is above. Now the robot drives at 0.20 m/s while it is far away, exactly like before, and the P controller only takes over in the last stretch, when `kP × error` drops below 0.20. With `kP = 2.0`, that happens 10 cm from the target (because `2.0 × 0.10 = 0.20`).

### Try it: P by hand

Before you use WPILib's PID class, write a P controller yourself. It is one line. Add a constant near your other autonomous constants:

```java
private static final double HAND_KP = 2.0;   // (m/s) of speed per meter of error
```

And change the leg 1 case to:

```java
case STEP_DRIVE_LEG_1:
    // P control by hand: speed proportional to the distance left, clamped.
    drivetrain.drive(
        MathUtil.clamp(HAND_KP * (LEG_1_DISTANCE_METERS - getStepDistanceMeters()),
            -AUTO_DRIVE_METERS_PER_SECOND, AUTO_DRIVE_METERS_PER_SECOND),
        0.0);
    if (getStepDistanceMeters() >= LEG_1_DISTANCE_METERS) {
        startStep(STEP_TURN_LEFT);
    }
    break;
```

Read the long line from the inside out: the distance left (`LEG_1_DISTANCE_METERS - getStepDistanceMeters()`), times `HAND_KP`, clamped to the auto speed, sent to `drive()` as the forward speed, with no turning.

Run autonomous three times each with `HAND_KP` set to `1.0`, `3.0`, and `20.0`. Watch the robot and the `Avg Distance (m)` widget. Before you run each one, write down a prediction: will it stop short, stop on the mark, or overshoot?

You will probably see something like this (your numbers will differ):

| HAND_KP | What happens |
|---|---|
| 1.0 | Starts slowing about 20 cm out. Creeps toward the mark, then **stops a few centimeters short** and sits there. Leg 1 never finishes; after 7 seconds, the step times out. |
| 3.0 | Slows later, stops closer, but still a centimeter or two short. It may time out too. |
| 20.0 | Full speed until about 1 cm out, then overshoots by almost as much as bang-bang did. The step ends because the distance passed `0.50`. |

The overshoot at `20.0` makes sense: a huge `kP` slows down so late that it barely slows down at all. It is almost bang-bang again. But the low gains are a surprise. The table in the previous section promised the robot would creep all the way to `0.50`. Instead it stopped short, and the `>=` check never became true. Why?

> **Put it back, for now**
>
> Leave the hand-written P controller in place while you read the next two sections, because you will keep experimenting with it. You will replace it with WPILib's `PIDController` in Section 15.8. The safety-net timeout from Chapter 12 is what rescues the low-gain runs, which is exactly what it was for.

---

## 15.3 Why P Stops Short: Steady-State Error

Look at the bottom of the P table again. At 0.49 m, the output is `2.0 × 0.01 = 0.02` m/s. The robot is asked to creep at two centimeters per second.

But your XRP cannot creep at two centimeters per second. You found this in Chapter 12: below some amount of power, the motors cannot overcome friction, and the wheels do not turn at all. Chapter 13's `speedToPower` turns 0.02 m/s into `0.02 / 0.28 = 0.07` power, which is nowhere near enough to get the wheels moving. So the robot stops, a centimeter or two from the target, with a small error and a small output that is too weak to do anything about it.

That leftover error is called **steady-state error**: the error that remains after the robot has settled down and stopped changing. It is the most common way a P controller disappoints you.

### How far short?

You can predict it. Suppose your robot needs at least 0.04 m/s worth of command (about 0.15 power) to move at all. The robot stops when `kP × error` falls below 0.04:

```
stall gap = (smallest speed that moves the robot) ÷ kP
```

| kP | Stall gap (if 0.04 m/s is the smallest speed that moves) |
|---|---|
| 1.0 | 0.04 ÷ 1.0 = 4 cm |
| 3.0 | 0.04 ÷ 3.0 = about 1.3 cm |
| 5.0 | 0.04 ÷ 5.0 = 0.8 cm |
| 20.0 | 0.04 ÷ 20.0 = 0.2 cm (but now it overshoots) |

This is the P controller's dilemma. A bigger `kP` shrinks the stall gap, but it also slows down later, so it overshoots more. Somewhere in the middle there is a `kP` that is "good enough," and finding it is what **tuning** means. On a robot with a lot of friction, "good enough" may still leave a gap you do not like.

Turning has the same problem, only worse. When the XRP spins in place, its wheels scrub sideways across the floor (Chapter 13), and scrubbing takes a lot of extra power. A P controller that turns toward 90 degrees can easily stall 5 or 10 degrees short.

> **Two fixes, two chapters**
>
> There are two ways to close a steady-state gap. One is to **remember** the gap and push harder the longer it lasts: that is the **I** in PID, and it is next. The other is to **predict** the push needed to beat friction and always add it in. That is called **feedforward**, and it is the job of the friction term **kS** that SysId measures in Chapter 16. Feedforward is usually the better fix, because it attacks the cause (friction) instead of waiting for the symptom (a stalled robot). Most FRC teams use PID **and** feedforward together. In this chapter, you will use I, and in Chapter 16 you will see how much less of it you need once feedforward is doing its share.

---
## 15.4 I: Add Up the Past

Go back to the shower. Suppose the water is just slightly cool, and you nudge the handle, and it is still slightly cool. You do not keep nudging by the same tiny amount forever. The longer it stays cool, the more annoyed you get, and the harder you turn. You are reacting not just to how cold it is **now**, but to how long it has **been** cold.

That is the **integral** term. It keeps a running total of the error over time, and it pushes in proportion to that total:

```
error sum = error sum + (error × 0.02)       every loop
I output  = kI × error sum
```

Each loop, it takes the current error, multiplies by the loop time (0.02 seconds), and adds the result to a running sum. `kI` is the **integral gain**. The "× 0.02" means the sum is measured in "error times seconds," so a 1 cm error that lasts 1 second adds the same amount as a 2 cm error that lasts half a second. (In calculus, this sum is called an **integral**, which is where the name comes from. You do not need calculus to use it. It is just "add up the error, every loop.")

Watch what that does to the stalled robot. Say `kP = 2.0` and the robot stopped 1.5 cm short. P asks for `2.0 × 0.015 = 0.03` m/s, which is not enough to beat friction. Now add an I term with `kI = 2.0`:

| Time stalled | Error (m) | Error sum (m × s) | I output: kI × sum (m/s) |
|---|---|---|---|
| 0.0 s | 0.015 | 0.0000 | 0.000 |
| 0.5 s | 0.015 | 0.0075 | 0.015 |
| 1.0 s | 0.015 | 0.0150 | 0.030 |
| 1.5 s | 0.015 | 0.0225 | 0.045 |

The P term is stuck at 0.03 m/s, because the error is not changing. But the I term keeps growing, and by about half a second, P plus I together (`0.03 + 0.015 = 0.045`) are more than the 0.04 m/s it takes to beat friction. The robot lurches forward the last 1.5 cm. As it arrives, the error drops to zero, so the sum stops growing, and it holds whatever value it reached: exactly enough push to stay put. **I is the term that refuses to accept a small error forever.**

### New Java: compound assignment

That running sum, `errorSum = errorSum + (error × 0.02)`, is so common that Java has a shortcut for it:

```java
errorSum += error * 0.02;     // same as: errorSum = errorSum + error * 0.02;
```

`+=` means "add the right side to the variable on the left, and store the result back in it." You met its little sibling in Chapter 4: `blinkCount++` is the same as `blinkCount += 1`. There is a whole family of these **compound assignment operators**:

| Operator | Example | Same as |
|---|---|---|
| `+=` | `total += 5;` | `total = total + 5;` |
| `-=` | `batteryPercent -= 2;` | `batteryPercent = batteryPercent - 2;` |
| `*=` | `speed *= 0.5;` | `speed = speed * 0.5;` |
| `/=` | `distance /= 100.0;` | `distance = distance / 100.0;` |

Read `+=` as "increases by" and `-=` as "decreases by." `speed *= 0.5` reads as "speed is cut in half," which is exactly what slow mode in Chapter 8 did.

> **A common beginner mistake**
>
> ```java
> errorSum =+ error * 0.02;   // BUG: the + and = are swapped
> ```
>
> This compiles, and it does something completely different. Java reads it as `errorSum = +error * 0.02`, where `+error` just means "positive `error`" (the same as `error`). So instead of adding to the sum, it **replaces** the sum every loop, and the integral never builds up. The compiler cannot catch this, because both versions are legal Java. The operator is always **op, then equals**: `+=`, `-=`, `*=`, `/=`.

### The danger of I: windup

The I term has a dark side, and every FRC team meets it eventually.

During leg 1, the robot drives at 0.20 m/s for over two seconds, with an error that starts at 0.50 m and shrinks slowly. All that time, the error sum is growing. By the time the robot reaches the mark, the sum might be around 0.5 m × s. With `kI = 2.0`, that is an I output of 1.0 m/s, still pushing hard forward, even though the error is now zero. The robot sails past the mark, and the sum only starts to shrink once the error turns negative. By then it has overshot badly, and it may swing back and forth a few times before the sum settles down.

This is called **integral windup**: the sum winds up like a spring during a long approach, then releases all at once. There are three standard defenses, and you will use all three:

1. **Only integrate when you are close.** Ignore the I term while the error is big, and let P do the work there. Start adding up the error only once it is small, inside a band called the **I zone**. Outside the I zone, the sum is cleared to zero.
2. **Cap the sum.** Never let the I output grow past some limit, no matter how long the error lasts.
3. **Clear the sum when the job changes.** When a new step starts, the old step's sum means nothing. Throw it away.

> **I is a seasoning, not the main course**
>
> Professional robot programmers use I sparingly. A little bit fixes a small, stubborn gap. Too much makes the robot slow to settle and prone to overshoot. If you find yourself raising `kI` to fix a big problem, the real fix is usually somewhere else: a better `kP`, or feedforward (Chapter 16). On many FRC mechanisms, `kI` is exactly zero. On the XRP, before it has feedforward, a small `kI` is what gets turns to finish, and you will probably turn it down again in Chapter 16.

---

## 15.5 D: Watch Where the Error Is Going

P looks at the error **now**. I looks at the error in the **past**. The last term, **D** for **derivative**, looks at where the error is **going**.

When you drive a car toward a red light, you do not wait until you are at the line to brake. You see the line approaching fast, and you start braking early. The **rate** at which the gap is closing tells you to slow down, even while the gap is still big.

The derivative term measures that rate: how fast the error changed since the last loop.

```
error rate = (error now - error last loop) ÷ 0.02
D output   = kD × error rate
```

`kD` is the **derivative gain**. When the robot is closing in on the target quickly, the error is shrinking quickly, so the error rate is a big **negative** number, and the D output pushes **backward**, against the motion. It acts like a brake that gets stronger the faster you approach. If the robot is barely moving, the error rate is near zero, and D does nothing.

Here is a worked loop. The robot is 5 cm from the target and approaching at about 0.15 m/s, so in 20 ms the error shrinks from 0.050 to 0.047 m:

```
error rate = (0.047 - 0.050) ÷ 0.02 = -0.15 m/s
D output   = kD × (-0.15)
```

With `kD = 0.5`, that is `-0.075` m/s of braking, subtracted from whatever P and I are asking for. P says "go forward, you are not there yet." D says "yes, but you are arriving fast, so ease off." Together, they arrive smoothly instead of overshooting.

### When D helps, and when it hurts

D is most useful on things that move fast and coast a long way: a heavy arm swinging down, a big robot rolling at full speed, a turret spinning quickly. It lets you use a bigger `kP` (fast and accurate) without the overshoot that big `kP` normally causes.

The XRP is light and slow, and its friction is so strong that it stops almost the moment the power drops. It barely coasts. So D has little to do, and on the XRP you will probably leave `kD` at zero. Two other reasons to be careful with D:

- **Noise.** The error rate is a **difference** of two readings, divided by a tiny time. One encoder count on the XRP is about 0.3 mm. A single extra count in one loop looks like a speed of `0.0003 ÷ 0.02 = 0.016` m/s, even if nothing really changed. Sensor flicker (Chapter 9) gets multiplied by `kD` and sent straight to the motors, which can make them buzz or twitch.
- **Derivative kick.** If the setpoint suddenly jumps (say, from 0 to 90 degrees), the error jumps in a single loop, and the error rate for that one loop is enormous. With a nonzero `kD`, the motors get a one-loop jolt. You may see it as a small twitch at the start of a turn.

> **PID, in one sentence**
>
> **P** pushes in proportion to how far you are from the target **now**, **I** pushes harder the longer you have **been** away from it, and **D** pushes against how fast you are **approaching** it. Add the three together, and that is the output: `kP × error + kI × error sum + kD × error rate`. Every PID controller in the world, from a toaster to a rocket, is those three terms.

---

## 15.6 Where Memory Lives: Scope and Lifetime

Look at what each term needs to know:

| Term | Needs | Where that comes from |
|---|---|---|
| P | The error now | Computed fresh each loop |
| I | The error sum | **Remembered** from every earlier loop |
| D | The error last loop | **Remembered** from the previous loop |

P could be a single line of math. But I and D need **memory**: values that survive from one loop to the next. And where a value lives in Java decides whether it survives. Getting this wrong is one of the most common bugs in all of robot code, so it is worth slowing down.

### Here is the bug

Suppose you add an I term to your hand-written P controller like this:

```java
@Override
public void autonomousPeriodic() {
    double errorSum = 0.0;                                    // BUG: see below
    double error = LEG_1_DISTANCE_METERS - getStepDistanceMeters();
    errorSum += error * 0.02;
    double speed = HAND_KP * error + HAND_KI * errorSum;
    // ...
}
```

It compiles. It runs. And the I term does almost nothing. The robot stalls short exactly as before. Why?

Because `errorSum` is created **inside** `autonomousPeriodic()`. Every 20 ms, `TimedRobot` calls `autonomousPeriodic()` again, the line `double errorSum = 0.0;` runs again, and a brand-new `errorSum` is born at zero. It gets one slice of error added to it, it is used once, and when the method reaches its closing `}`, it disappears. Next loop, a new one is born at zero. The sum never gets past one loop's worth.

### Scope: where a name can be used

Every variable in Java has a **scope**: the region of code where its name means something. The rule is simple: a variable can be used from the line where it is declared to the end of the **innermost pair of curly braces** `{ }` that contain it.

```java
public void autonomousPeriodic() {
    double error = 0.1;               // error's scope starts here...
    if (error > 0.05) {
        double boost = 0.2;           // boost's scope starts here...
        System.out.println(error);    // fine: still inside error's braces
    }                                 // ...and boost's scope ends here
    System.out.println(boost);        // ERROR: cannot find symbol
}                                     // ...and error's scope ends here
```

Variables declared inside a method (or inside an `if`, a loop, or any block within it) are called **local variables**. They are local to their braces. Method parameters are local variables too: they belong to the method they are passed into.

> **Scope inside a `switch`**
>
> A `switch` is one big block, so a local variable declared in one `case` is in scope in every `case` below it, which leads to confusing "already defined" errors if two cases declare a variable with the same name. If a case needs its own local variables, give it its own braces: `case STEP_DRIVE_LEG_1: { double speed = ...; break; }`. In this chapter, the listing avoids the problem by moving the math into small helper methods, so each one has its own local variables.

### Lifetime: how long a value lasts

**Lifetime** is the time a variable actually exists while the program runs. The three kinds of variables you have used all have different lifetimes:

| Kind | Declared | Lives | Example |
|---|---|---|---|
| **Local variable** | Inside a method | From its line until the method's closing brace. A new one every call. | `double error` in a periodic method |
| **Field** (instance variable) | In the class, outside any method | As long as the object exists. For `Robot`, that is the whole time the program runs. | `private int autoStep` |
| **`static` field** | In the class, with `static` | The whole program, one copy shared by all objects (Chapter 7) | `private static final double LEG_1_DISTANCE_METERS` |

So the fix for the bug is to move `errorSum` up one level, from a local variable to a field:

```java
private double errorSum = 0.0;   // a field: lives as long as the Robot does
```

And because a field remembers **everything**, including leftovers from the last step, you have to clear it on purpose when a new job starts. That is the third windup defense from Section 15.4, and the natural place is `startStep()`, which already clears the step's timer and starting distance:

```java
errorSum = 0.0;
```

You have used this pattern before. In Chapter 10, `wasBlocked` had to be a field because it remembered the last loop's answer. In Chapter 12, `autoStep` and `stepStartDistanceMeters` had to be fields because they remembered which step you were in and where it started. Now you know the general rule behind all of them.

> **Choosing where a variable lives**
>
> Ask one question: **does this value need to survive until the next loop?** If yes, it must be a field, and you need to decide when to reset it. If no, make it a local variable, declared as close as possible to where it is used. Smaller scope is safer: a local variable cannot be changed by some other method you forgot about, and it cannot carry a stale value into the next loop. And if a value never changes at all, it is a `static final` constant.

### A PID controller is an object with memory

Put the three terms and the memory together, and you get a small class. Here is a complete, bare-bones PID controller. You will build it yourself in Practice 3, so just read it now:

```java
package frc.robot;

/** A bare-bones PID controller, to see what WPILib's PIDController does inside. */
public class SimplePID {
    private static final double LOOP_PERIOD_SECONDS = 0.02;

    // Gains: set once, in the constructor.
    private final double kP;
    private final double kI;
    private final double kD;

    // Memory: these must survive from one loop to the next, so they are fields.
    private double errorSum = 0.0;
    private double previousError = 0.0;

    public SimplePID(double kP, double kI, double kD) {
        this.kP = kP;
        this.kI = kI;
        this.kD = kD;
    }

    /** Call exactly once per loop. Returns the output for this loop. */
    public double calculate(double measurement, double setpoint) {
        double error = setpoint - measurement;                            // P: the error now
        errorSum += error * LOOP_PERIOD_SECONDS;                          // I: add this loop's slice
        double errorRate = (error - previousError) / LOOP_PERIOD_SECONDS; // D: how fast it changed
        previousError = error;                                            // remember for next loop
        return kP * error + kI * errorSum + kD * errorRate;
    }

    /** Forget the past: call when starting a new job. */
    public void reset() {
        errorSum = 0.0;
        previousError = 0.0;
    }
}
```

Look at the variables and sort them by lifetime. `LOOP_PERIOD_SECONDS` is a `static final` constant: one copy, forever. `kP`, `kI`, and `kD` are `final` fields: they live as long as the object, and never change. `errorSum` and `previousError` are ordinary fields: they live as long as the object, and they change every loop. That is the memory. `error` and `errorRate` are local variables, born and gone within one call to `calculate`. Each one lives exactly as long as it needs to.

This is also why a PID controller **is an object** and not just a method. Each object gets its own copy of the fields. If you want one controller for distance and another for heading, you create two objects, and each one keeps its own sum and its own previous error. If you tried to use **one** object for both jobs, the heading errors would be added into the same sum as the distance errors, and the D term would compare a heading error with a distance error from the loop before. That is nonsense, and the robot would behave like it. **One controller per job.**

---
## 15.7 WPILib's `PIDController`

`SimplePID` works, but WPILib has a better one, already tested by thousands of teams: **`PIDController`**, in the package `edu.wpi.first.math.controller`. Its heart is the same three terms you just read. Around them, it adds the windup defenses, a way to ask "am I there yet?", and a few features you will need for turning. Here are the parts you will use.

### Creating one

```java
private final PIDController distanceController = new PIDController(5.0, 0.0, 0.0);
```

The three arguments are `kP`, `kI`, and `kD`, in that order. Create it **once**, as a field, like every other object that has to last (Chapter 5's "create once, use every loop" rule). It is a field for the reason Section 15.6 explained: its memory has to survive between loops.

By default it assumes it will be called every 0.02 seconds, which is exactly how often `TimedRobot` runs your periodic methods. (A fourth constructor argument can change that, for code that runs at a different rate. You will not need it.)

> **Gains cannot be negative**
>
> If your robot drives away from the target instead of toward it, it is tempting to make `kP` negative. Do not. `PIDController` throws an `IllegalArgumentException` with the message `Kp must be a non-negative number!` the moment you try (Chapter 10 taught you to read that). A robot that runs away from its setpoint has a **sign** problem: an encoder counting backward, a gyro reading clockwise as positive, or a motor that needs inverting. Fix the sign where it starts, in `Drivetrain`'s getters, the way Chapter 9 taught you, and every controller that uses that getter is fixed at once.

### Using it: `calculate`

```java
double speed = distanceController.calculate(getStepDistanceMeters(), LEG_1_DISTANCE_METERS);
```

`calculate(measurement, setpoint)` does one loop of PID: it computes the error, updates the sum and the previous error, and returns the output. Notice the order: **measurement first, setpoint second**. Mix them up and the error comes out backward.

Call it **exactly once per loop**, for the same reason Chapter 14 updated odometry once per loop. Each call adds one 20 ms slice to the sum and treats the last call as "20 ms ago." Call it twice in one loop and the I term grows twice as fast, and the D term compares two readings taken a microsecond apart. Call it in only some loops and the sum misses slices. The listing in Section 15.8 puts each `calculate` call in exactly one place per step.

The output is not clamped, so clamp it yourself:

```java
double speed = MathUtil.clamp(
    distanceController.calculate(getStepDistanceMeters(), LEG_1_DISTANCE_METERS),
    -AUTO_DRIVE_METERS_PER_SECOND, AUTO_DRIVE_METERS_PER_SECOND);
```

### "Am I there yet?": tolerance and `atSetpoint()`

Chapter 12 taught you never to compare measured `double`s with `==`, and to check "close enough" with a tolerance instead. `PIDController` has that built in. Tell it what "close enough" means, once, in the constructor:

```java
distanceController.setTolerance(0.01, 0.02);
```

The first number is the **error tolerance**: within 1 cm of the setpoint counts as there. The second number is optional, and it is the **error derivative tolerance**: the error must also be changing slower than 0.02 m per second. In plain English: "close **and** nearly stopped." Without the second number, a robot that is racing through the target would count as "there" for the one loop it spent passing through it. With it, the robot has to actually settle.

Then, every loop, after `calculate`:

```java
if (distanceController.atSetpoint()) {
    startStep(STEP_TURN_LEFT);
}
```

`atSetpoint()` returns `true` when both conditions are met. It also returns `false` until `calculate` has been called at least once since the last `reset()`, so a brand-new step can never be "done" before it has even measured anything.

### Starting fresh: `reset()`

```java
distanceController.reset();
```

`reset()` clears the controller's memory: the error sum and the previous error. Call it whenever the controller starts a new job, so the last job's sum cannot wind into this one. Your `startStep()` method is the natural place, because it already runs exactly once when each step begins.

### Windup protection: I zone and integrator range

The two windup defenses from Section 15.4 are one line each:

```java
headingController.setIZone(10.0);
```

`setIZone(10.0)` means "if the error is bigger than 10, clear the error sum and do not add to it." The I term only works inside the last 10 units of the approach (10 degrees, for a heading controller). By default, there is no I zone at all.

The cap on the sum is already on by default: WPILib never lets the I term's contribution to the output go above `1.0` or below `-1.0`. You can change that range with `setIntegratorRange(min, max)`, in the same units as the output. On the XRP, where the outputs are in meters or radians per second, the default is a reasonable cap, so you can leave it alone.

### Angles that wrap around: continuous input

Here is a puzzle. The robot is facing `-170` degrees (almost straight backward, turned a little to the right), and you ask it to face `170` degrees (almost straight backward, turned a little to the left). Picture the two directions. They are only 20 degrees apart: the robot should turn 20 degrees to the **right**, through 180.

But the error is `170 - (-170) = 340`. A plain PID controller sees a huge positive error and spins the robot 340 degrees to the **left**, the long way around.

The problem is that headings are a **circle**, and `-180` and `180` are the same direction. You saw this in Chapter 14, where `Pose Heading` wraps around at 180 while the gyro's `Heading (deg)` keeps counting past 360. `PIDController` can be told that its input is a circle:

```java
headingController.enableContinuousInput(-180.0, 180.0);
```

Now, before using the error, the controller wraps it into the range `-180` to `180`. An error of `340` becomes `-20`: "20 degrees clockwise." It always takes the short way around.

It also means you can give the controller the gyro's raw, ever-counting heading. If the robot has spun one and a quarter turns left, `getHeadingDegrees()` reads `450`. Ask it to face `90`, and the error is `90 - 450 = -360`, which wraps to `0`: you are already facing 90 degrees, so do nothing. Correct, without any extra code.

> **Where continuous input shows up next**
>
> Every swerve module (Chapter 28) has a wheel that steers to an angle, and that angle is a circle too. Without continuous input, a module asked to go from `179` degrees to `-179` would spin the whole way around instead of nudging 2 degrees. You will call `enableContinuousInput` for every steering motor on the Mini Swerve. Learn it here, on one gyro, and it will feel familiar there.

### Live tuning: `putData`

Last, `PIDController` knows how to describe itself to a dashboard, just like `Field2d` in Chapter 14:

```java
SmartDashboard.putData("Heading PID", headingController);
```

Call it once, in the constructor. The controller's `kP`, `kI`, `kD`, I zone, and setpoint appear in the Simulation GUI, where you can **edit them while the robot runs**, and the change takes effect on the very next loop. Section 15.9 uses this to tune. It also publishes the controller's latest measurement and error, which you will plot.

### `PIDController` at a glance

| Method | What it does | Where you call it |
|---|---|---|
| `new PIDController(kP, kI, kD)` | Creates a controller | A field, once |
| `setTolerance(error, errorRate)` | Defines "close enough and settled" | Constructor |
| `enableContinuousInput(-180, 180)` | Treats the input as a circle | Constructor (angles only) |
| `setIZone(zone)` | Only integrate when the error is within `zone` | Constructor (if `kI` is not zero) |
| `calculate(measurement, setpoint)` | One loop of PID; returns the output | Every loop, exactly once |
| `atSetpoint()` | `true` when within both tolerances | After `calculate` |
| `getError()` | The current error | Dashboard, logging |
| `reset()` | Clears the sum and the previous error | When a new job starts |

> **Older names you might see**
>
> In code written before 2025, you will find `getPositionError()` instead of `getError()`, and `getVelocityError()` instead of `getErrorDerivative()`. They still work in WPILib 2026, but they are **deprecated** (Chapter 11's "polite renaming"), and VS Code will draw a line through them. Use the new names. The old ones made sense for position controllers only, and `PIDController` controls all kinds of things, including speeds and headings.

---

## 15.8 PID on the Explorer: Turn to a Heading, Drive Straight

Now put it to work. The Explorer gets two controllers, one per job:

- A **distance controller**: measurement in meters, output a forward speed in meters per second. It drives leg 1 and stops on the mark.
- A **heading controller**: measurement in degrees, output a turn rate in radians per second. It turns the robot to 90 degrees, and it **holds** the heading while the robot drives.

Then the routine changes in three places.

### Turning to a heading

The old turn step spun at a fixed rate until the gyro passed 90, then cut the power and coasted past. The new one asks the heading controller for a turn rate every loop:

```java
case STEP_TURN_LEFT:
    // Spin in place: PID slows the turn as the heading closes in on 90.
    drivetrain.drive(0.0, calculateTurnRate(TURN_HEADING_DEGREES));
    if (headingController.atSetpoint()) {
        startStep(STEP_DRIVE_TO_LINE);
    }
    break;
```

`calculateTurnRate` is a small helper you will write in a moment: it asks the heading controller for an output and clamps it to `AUTO_TURN_RADIANS_PER_SECOND`. Far from 90 degrees, the robot turns at full turn rate, as before. In the last few degrees, it slows. If it overshoots, the error goes negative and it turns back. When it is within the tolerance and has stopped turning, the step ends.

Notice the units. The measurement is in degrees (from `getHeadingDegrees()`), but the output is in radians per second (what `drive()` wants). That is fine: `kP` translates between them. A heading `kP` of `0.3` means "0.3 radians per second of turn rate, for every degree of error." Ten degrees away, that asks for 3 rad/s, more than the clamp allows. Three degrees away, it asks for 0.9 rad/s. Write the units in a comment, as always.

### Driving straight: holding a heading

In Chapter 14 your log showed the robot curving a degree or so off course during leg 1, because the two motors are never exactly matched. The heading controller can fix that too. While the robot drives forward, ask the heading controller to hold the heading it started with:

```java
case STEP_DRIVE_LEG_1:
    // Two controllers at once: one drives to the distance, the other holds the heading.
    drivetrain.drive(
        calculateForwardSpeed(getStepDistanceMeters(), LEG_1_DISTANCE_METERS),
        calculateTurnRate(LEG_1_HEADING_DEGREES));
```

Read it aloud: "Drive forward at whatever speed the distance controller says, and turn at whatever rate the heading controller says." If the robot drifts a degree to the left, the heading error is `0 - 1 = -1`, so the heading controller asks for a small **clockwise** turn rate, and the robot steers back to the right. The two controllers work at the same time, on two different parts of the motion, and `drive()` combines them into wheel speeds with the kinematics from Chapter 13. That is exactly what `ChassisSpeeds` was built for: a forward part and a turning part, from wherever they come.

Leg 2 does the same thing, holding 90 degrees while it drives to the line. Leg 2 still drives at a steady speed instead of using the distance controller, because its target is the tape, not a distance. The line sensors decide when it is done.

> **Straight is not the same as on the line**
>
> Holding the heading keeps the robot **pointed** the right way. It does not bring it back to the line `y = 0` if it already drifted sideways before the correction kicked in. A robot that is 1 cm to the left, facing perfectly straight, will drive the whole leg 1 cm to the left. To fix that, you need the pose from Chapter 14: if odometry says `y` is positive (left of the line), aim the heading slightly to the right until `y` comes back to zero. Using one controller's output as another controller's setpoint like this is called a **cascade**, and it is how path followers work. Practice 5 has you build a small one. In Chapter 31, PathPlanner does it for every point along a curved path.

### The helpers

Two small helper methods keep each controller's `calculate` call in exactly one place, with its clamp:

```java
/**
 * Forward speed toward a distance target, from the distance PID, limited to the auto speed.
 *
 * @param distanceMeters how far the robot has driven
 * @param targetMeters how far it should drive
 * @return the forward speed to drive at, in meters per second
 */
private double calculateForwardSpeed(double distanceMeters, double targetMeters) {
    double speed = distanceController.calculate(distanceMeters, targetMeters);
    return MathUtil.clamp(speed, -AUTO_DRIVE_METERS_PER_SECOND, AUTO_DRIVE_METERS_PER_SECOND);
}
```

```java
/**
 * Turn rate toward a target heading, from the heading PID, limited to the auto turn rate.
 *
 * @param targetHeadingDegrees the heading to face; counterclockwise positive
 * @return the turn rate, in radians per second; counterclockwise positive
 */
private double calculateTurnRate(double targetHeadingDegrees) {
    double turnRate = headingController.calculate(drivetrain.getHeadingDegrees(), targetHeadingDegrees);
    return MathUtil.clamp(turnRate, -AUTO_TURN_RADIANS_PER_SECOND, AUTO_TURN_RADIANS_PER_SECOND);
}
```

`speed` and `turnRate` are local variables: they are only needed for one line, so they live and die inside their helpers. The controllers are fields, because their memory has to last.

Why does `calculateForwardSpeed` take the distance as a parameter instead of calling `getStepDistanceMeters()` itself? Because the tuning bench in Section 15.9 measures distance a different way, and the parameter lets both use the same helper.

### What does not change: `Drivetrain`

Look at what you did **not** have to touch: `Drivetrain.java`. Not one line. The PID controllers decide **what** motion the robot needs, as a forward speed and a turn rate. `drive()` decides **how** to make the wheels do it. That split, set up in Chapter 13 and praised again at the end of Chapter 14, means a whole new kind of control dropped in without opening the drivetrain. In Chapter 16, the reverse will happen: feedforward will improve `drive()`'s speed-to-power step, and the PID code in `Robot.java` will not change.

### The full `Robot.java`

Here is the complete `Robot.java` after this chapter. It starts from the end of Chapter 14. If you still have the hand-written `HAND_KP` experiment from Section 15.2, remove it: the distance controller replaces it. The changes for this chapter are:

- one new import, `PIDController`;
- a new constant, `LEG_1_HEADING_DEGREES`, and a new group of PID constants;
- two new controller fields and two tuning bench fields;
- controller setup at the end of the constructor;
- a **PID** block in `updateDashboard()`;
- the three driving steps in `autonomousPeriodic()`;
- two lines in `startStep()`;
- the two helpers;
- a new **tuning bench** in Test mode, at the bottom.

Type the new parts, do not paste:

```java
package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
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
    private static final double AUTO_DRIVE_METERS_PER_SECOND = 0.20;   // PID drives never go faster
    private static final double AUTO_TURN_RADIANS_PER_SECOND = 2.0;    // PID turns never go faster
    private static final double LEG_1_DISTANCE_METERS = 0.50;
    private static final double LEG_1_HEADING_DEGREES = 0.0;
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

    // PID gains: starting points. Tune your own (Section 15.9) and write down the date.
    // Distance: meters of error in, meters per second of forward speed out.
    private static final double DISTANCE_KP = 5.0;
    private static final double DISTANCE_KI = 0.0;
    private static final double DISTANCE_KD = 0.0;
    private static final double DISTANCE_TOLERANCE_METERS = 0.01;
    private static final double DISTANCE_RATE_TOLERANCE_METERS_PER_SECOND = 0.02;

    // Heading: degrees of error in, radians per second of turn rate out.
    private static final double HEADING_KP = 0.3;
    private static final double HEADING_KI = 0.5;
    private static final double HEADING_KD = 0.0;
    private static final double HEADING_I_ZONE_DEGREES = 10.0;
    private static final double HEADING_TOLERANCE_DEGREES = 2.0;
    private static final double HEADING_RATE_TOLERANCE_DEGREES_PER_SECOND = 10.0;

    // Tuning bench (Test mode): how far the X button drives out.
    private static final double BENCH_DRIVE_DISTANCE_METERS = 0.30;

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

    // One PID controller per job. Each one remembers its own past.
    private final PIDController distanceController =
        new PIDController(DISTANCE_KP, DISTANCE_KI, DISTANCE_KD);
    private final PIDController headingController =
        new PIDController(HEADING_KP, HEADING_KI, HEADING_KD);

    // Remembered from loop to loop.
    private boolean wasBlocked = false;
    private int autoStep = STEP_NOT_STARTED;
    private double stepStartDistanceMeters = 0.0;
    private double benchTargetDistanceMeters = 0.0;
    private double benchTargetHeadingDegrees = 0.0;

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

        // PID: what "there" means for each controller, and how headings wrap around.
        distanceController.setTolerance(
            DISTANCE_TOLERANCE_METERS, DISTANCE_RATE_TOLERANCE_METERS_PER_SECOND);
        headingController.setTolerance(
            HEADING_TOLERANCE_DEGREES, HEADING_RATE_TOLERANCE_DEGREES_PER_SECOND);
        headingController.enableContinuousInput(-180.0, 180.0);
        headingController.setIZone(HEADING_I_ZONE_DEGREES);

        // Publish both controllers so their gains can be tuned live.
        SmartDashboard.putData("Distance PID", distanceController);
        SmartDashboard.putData("Heading PID", headingController);
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

        // PID: how far each controller is from its target, and whether it is there
        SmartDashboard.putNumber("Distance Error (m)", distanceController.getError());
        SmartDashboard.putNumber("Heading Error (deg)", headingController.getError());
        SmartDashboard.putBoolean("Distance At Target", distanceController.atSetpoint());
        SmartDashboard.putBoolean("Heading At Target", headingController.atSetpoint());

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
                // Two controllers at once: one drives to the distance, the other holds the heading.
                drivetrain.drive(
                    calculateForwardSpeed(getStepDistanceMeters(), LEG_1_DISTANCE_METERS),
                    calculateTurnRate(LEG_1_HEADING_DEGREES));
                if (distanceController.atSetpoint()) {
                    startStep(STEP_TURN_LEFT);
                }
                break;

            case STEP_TURN_LEFT:
                // Spin in place: PID slows the turn as the heading closes in on 90.
                drivetrain.drive(0.0, calculateTurnRate(TURN_HEADING_DEGREES));
                if (headingController.atSetpoint()) {
                    startStep(STEP_DRIVE_TO_LINE);
                }
                break;

            case STEP_DRIVE_TO_LINE:
                // Drive ahead at a steady speed, holding the new heading, until a sensor sees the tape.
                drivetrain.drive(AUTO_DRIVE_METERS_PER_SECOND, calculateTurnRate(TURN_HEADING_DEGREES));
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
     * Move autonomous to a new step: remember where it started, restart its timer,
     * and clear the PID controllers' memory of the last step.
     *
     * @param newStep the step to start, one of the STEP_ constants
     */
    private void startStep(int newStep) {
        autoStep = newStep;
        stepStartDistanceMeters = drivetrain.getAverageDistanceMeters();
        stepTimer.restart();
        distanceController.reset();
        headingController.reset();
        DataLogManager.log("Auto step " + newStep + " started at " + autoTimer.get() + " s, "
            + drivetrain.getPose());
    }

    /** How far the robot has driven since the current step started, in meters. */
    private double getStepDistanceMeters() {
        return drivetrain.getAverageDistanceMeters() - stepStartDistanceMeters;
    }

    /**
     * Forward speed toward a distance target, from the distance PID, limited to the auto speed.
     *
     * @param distanceMeters how far the robot has driven
     * @param targetMeters how far it should drive
     * @return the forward speed to drive at, in meters per second
     */
    private double calculateForwardSpeed(double distanceMeters, double targetMeters) {
        double speed = distanceController.calculate(distanceMeters, targetMeters);
        return MathUtil.clamp(speed, -AUTO_DRIVE_METERS_PER_SECOND, AUTO_DRIVE_METERS_PER_SECOND);
    }

    /**
     * Turn rate toward a target heading, from the heading PID, limited to the auto turn rate.
     *
     * @param targetHeadingDegrees the heading to face; counterclockwise positive
     * @return the turn rate, in radians per second; counterclockwise positive
     */
    private double calculateTurnRate(double targetHeadingDegrees) {
        double turnRate = headingController.calculate(drivetrain.getHeadingDegrees(), targetHeadingDegrees);
        return MathUtil.clamp(turnRate, -AUTO_TURN_RADIANS_PER_SECOND, AUTO_TURN_RADIANS_PER_SECOND);
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

    // Test mode: the PID tuning bench (Section 15.9).

    @Override
    public void testInit() {
        SmartDashboard.putString("Mode", "Test");
        DataLogManager.log("Mode: Test (PID tuning bench)");
        drivetrain.resetPose(START_POSE);
        setBenchTarget(0.0, LEG_1_HEADING_DEGREES);
    }

    @Override
    public void testPeriodic() {
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
}
```

Walk through what changed since Chapter 14:

- **`LEG_1_HEADING_DEGREES = 0.0`** names the heading leg 1 should hold. It is the start pose's heading, but naming it says what it is for.
- **The PID constants** come in two groups, one per controller, each with its gains, its tolerances, and a comment saying which units go in and which come out. The heading group also has its I zone. The values are **starting points**: you will tune your own in Section 15.9. Only the heading controller has a nonzero `kI`, because turning in place fights the most friction.
- **`distanceController` and `headingController`** are fields, created once, one per job. Their gains come from the constants.
- **The constructor** sets each controller's tolerances (close enough **and** settled), makes the heading controller treat its input as a circle, sets the heading I zone, and publishes both controllers with `putData` for live tuning.
- **`updateDashboard()`** has a new **PID** block: each controller's error and whether it is at its target. Every new behavior gets a widget.
- **Leg 1** drives with two controllers at once and ends when the distance controller is at its setpoint, instead of when the distance passes `0.50`.
- **The turn** uses the heading controller and ends when it is at its setpoint, instead of when the heading passes `90`.
- **Leg 2** still drives at a steady speed (its target is the tape, not a distance) but now holds the heading at 90.
- **`startStep()`** resets both controllers, so no step inherits the last step's error sum. That is the "clear the sum when the job changes" rule from Section 15.4, in one place.
- **`calculateForwardSpeed()` and `calculateTurnRate()`** keep each `calculate` call and its clamp in one place.
- **Test mode** is new: a tuning bench, explained next. `benchTargetDistanceMeters` and `benchTargetHeadingDegrees` are fields because the target has to be remembered between button presses. Ask the Section 15.6 question: does it need to survive until the next loop? Yes, so it is a field.

---
## 15.9 The Tuning Bench: Tuning Live

The gains in the listing are starting points. They came from one XRP on one floor, and yours has different motors, different tires, different batteries, and a different floor. **Tuning** is the process of finding the gains that work for your robot, and it is a skill, not a formula. You get good at it by watching what the robot does, changing one thing, and watching again.

Two things make tuning fast: being able to change a gain **without rebuilding**, and being able to **see** the response as a graph. You have both.

### Test mode: a bench for tuning

Running the whole autonomous routine every time you change a gain would be slow. You would wait through leg 1 to see the turn, and the robot would end up somewhere new every time. Instead, the listing turns **Test** mode into a **tuning bench**. You met Test mode in Chapter 5: one of the robot's modes, "for testing mechanisms." That is exactly what it is for.

In Test mode, both controllers run all the time, holding whatever target the buttons last chose:

| Button | Target | What the robot does |
|---|---|---|
| **A** | Distance 0, heading 0 | Goes "home": back to where it was when Test mode started, facing the same way |
| **B** | Distance 0, heading 90 | Turns in place to face left |
| **X** | Distance 0.30 m, heading 0 | Drives 30 cm forward, holding its heading |
| **Y** | (unchanged from Chapter 14) | Resets the pose: "here is home now" |

Press **B**, then **A**, then **B**, then **A**, and you get a series of 90 degree turns, left and right, in place, as many as you like. Press **X**, then **A**, and the robot drives 30 cm out and back. Each press clears both controllers' memory, through `setBenchTarget()`, so every test starts fresh.

To enter Test mode, choose **Test** where you normally choose Autonomous or Teleoperated (in the Simulation GUI's **Robot State** panel), with your controller set up as in Chapter 8. Give the robot room to drive 30 cm forward, and keep a hand nearby in case it heads somewhere you did not expect.

### Seeing the gains: the PID widget

Your two `putData` calls published the controllers. In the Simulation GUI, open the **NetworkTables** menu, then **SmartDashboard**, then click **Heading PID**. (This is the same menu you used for the Field in Chapter 14.) A small window opens with boxes labeled **P**, **I**, **D**, **Setpoint**, and **IZone**.

Click in the **P** box and type a new number. The new gain takes effect on the very next loop, while the program keeps running. No rebuild, no restart. This is **live tuning**.

Two cautions:

- **The change is not saved in your code.** The moment you restart the program, the controller is created again from `HEADING_KP` and friends. When you find gains you like, **write them down**, and copy them into the constants before you stop. Every team has lost a good tune by forgetting this. Chapter 23 shows you more ways to make live tuning convenient.
- **Ignore the Setpoint box.** Your code passes the setpoint to `calculate` every loop, so anything you type there is overwritten 20 milliseconds later. Use the buttons to change targets.

Also, the new value takes effect **as you type**, so typing `0.35` briefly passes through `0.3`. That is harmless for small changes. For big ones, disable the robot first, type, then enable.

### Seeing the response: a plot

Numbers flickering in a box are hard to read. A graph of the **setpoint** and the **measurement** over time shows everything at once: how fast the robot responds, whether it overshoots, whether it stops short, and whether it wobbles. Chapter 10 promised you this graph. Here is how to make it in the Simulation GUI:

1. Open the **Plot** menu at the top and click **New Plot Window**. An empty window appears with an **Add plot** button. Click it.
2. Open the **NetworkTables** menu and click **NetworkTables View** if that window is not already showing. It lists everything your robot publishes. Expand **SmartDashboard**, then **Heading PID**.
3. Drag **setpoint** from that list into the plot. Then drag **measurement** into the same plot.
4. Resize the plot window so it is wide enough to see a few seconds of history.

Now press B, and watch. The setpoint line jumps from 0 to 90 in a single step. The measurement line follows it up and settles. The shape of that measurement curve is what you are tuning.

> **What the plot does not show**
>
> The measurement in the plot is `getHeadingDegrees()`, the raw gyro heading that keeps counting past 360. If you have been spinning the robot around, it might read `450` while the setpoint reads `90`. The controller does not mind (continuous input wraps the error), but the plot lines will be far apart. Press **Y** to reset the pose, then **A**, and the two lines will line up again.

### Reading the shapes

Here are the shapes you will see, sketched as they would appear on the plot after pressing B:

```
  kP too low              kP about right           kP too high

 90 - - - - - - - - -    90 - - - .-.- - - - -    90 - - -.- - - -.- - - - -
            ______             /   '-------           / \     / \.------
         .-'                  /                      /   \   /
       .'                    /                      /     '-'
      /                     /                      /
   0 /                   0 /                    0 /
     0 s   1 s   2 s         0 s   1 s   2 s        0 s   1 s   2 s
```

The dashed line is the setpoint. On the left, the robot creeps up and stalls below 90: P is too weak to finish against friction. In the middle, it rises quickly, goes a hair past 90, and settles: that is the goal. On the right, it races past 90, turns back, overshoots the other way, and wobbles before it settles. Engineers call that wobble **ringing**, or **oscillation**.

### A tuning recipe

There are entire books about tuning, but this recipe works for most FRC mechanisms, and it works for the XRP. Do the **heading** controller first (turns are the hardest job), using B and A.

1. **Start simple.** Set **I** and **D** to `0`. Set **P** small: `0.05`.
2. **Find the edge.** Press B and A a few times and watch the plot. Then **double** P and try again: `0.1`, `0.2`, `0.4`, `0.8`, and so on. Each time, the robot gets quicker and stops closer. Keep going until the robot overshoots and rings (swings past and back at least once). That is the edge.
3. **Back off.** Set P to about **half** of the value that rang. Test turns in both directions (B then A is a left turn; A then B is a right turn).
4. **Close the last gap with I, only if needed.** If the robot still stalls a few degrees short, outside the 2 degree tolerance, set the **IZone** a little bigger than the gap (the listing uses 10 degrees) and raise **I** in small steps, starting around `0.1`. Watch for the robot to stall briefly, then nudge itself the rest of the way. If it starts overshooting, or pausing and then jumping past, I is too high: lower it.
5. **Try D, only if needed.** If the robot overshoots and you cannot lower P without it stalling, try a small **D**, like `0.005`. On the XRP, you will probably find D does little; leave it at `0` if so.
6. **Check it at the edges.** Test a few turns with tired batteries, and a few on a different surface. A tune that only works on fresh batteries is not done.
7. **Write it down.** Copy the final numbers into `HEADING_KP`, `HEADING_KI`, and `HEADING_KD`, with the date in a comment.

Then tune the **distance** controller the same way, using X and A (out 30 cm and back). Watch it on a second plot: add **Distance PID**'s setpoint and measurement. Distance usually needs only P, because driving straight fights much less friction than turning in place.

### When the plot looks wrong

| What you see | Likely cause | What to try |
|---|---|---|
| Rises slowly, stops well short, flat line | `kP` too low | Double `kP` |
| Shoots past, swings back and forth before settling | `kP` too high | Back `kP` off, or add a little `kD` |
| Swings back and forth forever, never settles | `kP` far too high, or `kI` too high | Halve `kP`; set `kI` to `0` and try again |
| Gets close fast, then a small flat gap that never closes | Friction (steady-state error) | A small `kI` with an I zone; Chapter 16's `kS` |
| Stops short, pauses, then jumps **past** the target | `kI` too high, or the I zone too wide | Lower `kI`, or shrink the I zone |
| Twitches or buzzes while sitting at the target | `kD` amplifying sensor noise, or `kP` too high | Lower `kD` first, then `kP` |
| Moves **away** from the setpoint | A sign is backward | Check the getter's sign (Chapter 9), never a negative gain |
| Looks perfect, but `Heading At Target` never turns on | Tolerance tighter than the robot can settle | Retune, or loosen the tolerance a little |

> **Change one thing at a time**
>
> Chapter 10's debugging rule is also the first rule of tuning. If you change P and I together and the plot gets better, you do not know which change helped, or whether one of them made something else worse. One gain, one change, a few test presses, look at the plot, then decide. It feels slow. It is faster than guessing.

---

## 15.10 Run the Course

With your tuned gains in the constants, rebuild, put the robot on the start line, and run **Autonomous**. Watch the robot, the map, and the terminal. The log looks like Chapter 14's, with your new numbers:

```
Mode: Autonomous
Auto step 1 started at 0.0 s, Pose2d(Translation2d(X: 0.00, Y: 0.00), Rotation2d(Rads: 0.00, Deg: 0.00))
Auto step 2 started at 2.96 s, Pose2d(Translation2d(X: 0.50, Y: 0.00), Rotation2d(Rads: 0.00, Deg: 0.21))
Auto step 3 started at 4.24 s, Pose2d(Translation2d(X: 0.50, Y: 0.00), Rotation2d(Rads: 1.56, Deg: 89.47))
Line found after 0.39 m
Auto step 4 started at 6.33 s, Pose2d(Translation2d(X: 0.50, Y: 0.39), Rotation2d(Rads: 1.57, Deg: 90.08))
```

(Your numbers will differ. Read them anyway.) Compare with your Chapter 14 log, line by line:

- **Step 2's line** is where leg 1 ended. In Chapter 14 it ended past `X: 0.50` with the heading a degree or so off. Now it should end within a centimeter of `0.50`, with the heading near `0`, because one controller stopped it on the mark while the other held it straight.
- **Step 3's line** is where the turn ended. In Chapter 14 the turn ended the moment the heading passed 90, then the robot coasted further. Now it ends only once the heading has **settled** within 2 degrees of 90.
- **The times got longer.** Leg 1 took about 3 seconds instead of 2.6, and the turn took longer too. Slowing down near a target costs time. That is the trade: bang-bang is fast and sloppy, PID is a little slower and much more accurate. In Chapter 16, feedforward will win some of that time back.

Then measure the truth with your tape measure, exactly as you did in Chapter 14's Build, and compare. The Build exercise has you do this five times and fill in a before-and-after table. This is the moment the chapter has been building to: the same robot, the same course, and a measurably better result, because the robot now corrects itself.

> **Accuracy is a chain**
>
> Notice where the remaining error comes from now. The controllers stop the robot exactly where the **sensors** say the target is. If the encoders think the wheels are 60 mm when they are really 59 mm (Chapter 14), the robot will stop precisely at the wrong place. PID makes the robot obey its sensors; it cannot make the sensors right. That is why calibration (measuring your real wheel size and trackwidth) and pose correction (Chapter 33) still matter on a perfectly tuned robot.

---

## 15.11 PID Everywhere

You will write PID code, or tune someone else's, on every robot for the rest of this book. Here is where it shows up next:

- **Chapter 16, feedforward.** SysId measures what it takes to move your XRP, including the friction term **kS**. Then the output becomes **feedforward plus PID**: feedforward predicts most of the power, and PID only corrects what is left. The steady-state gaps that needed `kI` in this chapter mostly disappear.
- **Chapter 19, commands.** These two controllers move into commands called `DriveDistance` and `TurnToAngle`, which own their own controllers and use `atSetpoint()` to decide when they are finished. The ideas do not change; only where the code lives.
- **Chapter 23, live tuning.** More ways to tune from the dashboard, and to keep the tuned numbers.
- **Chapter 27, motor controllers.** A SparkMAX can run its own PID loop on its own processor, much faster than 50 times a second, right next to the motor. You give it gains and a setpoint over the CAN bus.
- **Chapter 28, swerve.** Every swerve module steers its wheel to an angle with a PID controller with continuous input, exactly like your heading controller.
- **Chapter 31, path following.** PathPlanner's controller takes **two** sets of PID gains: one that pushes the robot back onto the path's position, and one that holds the path's heading. That is your leg 1 drive, plus the cascade from Practice 5, in every direction at once.
- **Chapter 33, vision.** Auto-align turns the robot until a camera says the target is centered: a heading controller whose measurement comes from a camera instead of a gyro.
- **Chapter 34, mechanisms.** Arms and elevators use a cousin called `ProfiledPIDController`, which moves the setpoint smoothly instead of letting it jump. A smooth setpoint means no derivative kick, and no slamming a heavy arm into motion.

It is all the same three terms. The measurement changes, the output changes, the units change. Error now, error over time, error rate. Once you can tune a turn on a desk robot, you can tune almost anything.

---

## Chapter Summary

> **What you learned in Chapter 15**
>
> * A **control loop** compares a **setpoint** (what you want) with a **measurement** (what you have) every loop. **Error** is setpoint minus measurement, and its sign says which way to go. **Bang-bang** control (full or nothing) always overshoots.
> * **P** pushes in proportion to the error (`kP × error`), so the robot slows as it arrives. Too low and it stalls short; too high and it overshoots and rings. On a robot with friction, P alone leaves a **steady-state error**, roughly the smallest speed that moves the robot divided by `kP`.
> * **I** adds up the error over time and pushes harder the longer a gap lasts, but it **winds up** during long approaches. Defend with an **I zone**, a cap on the sum, and a reset when the job changes. **D** pushes against how fast the error is changing, like a brake, but it amplifies noise and kicks when the setpoint jumps.
> * New Java: the **compound assignment operators** (`+=`, `-=`, `*=`, `/=`), and the `=+` typo that compiles but replaces instead of adding. **Scope** is where a name can be used (to the end of its braces); **lifetime** is how long a value exists. Values that must survive until the next loop belong in **fields**, not local variables, and need a deliberate reset.
> * A PID controller is **an object with memory**, so you need **one controller per job**. WPILib's `PIDController` is created once as a field, `calculate(measurement, setpoint)` runs once per loop, `setTolerance` and `atSetpoint()` decide "close enough and settled," `reset()` clears the memory, `setIZone` limits windup, and `enableContinuousInput(-180, 180)` makes headings take the short way around. Clamp the output with `MathUtil.clamp`.
> * The Explorer now drives leg 1 with a distance controller and a heading controller at the same time, turns with the heading controller, and holds its heading on leg 2. `Drivetrain` did not change, because the controllers decide **what** motion and `drive()` decides **how**.
> * **Tuning** is done live: `SmartDashboard.putData` makes the gains editable in the Simulation GUI, a plot of setpoint and measurement shows the response, and Test mode is a tuning bench. Raise P until it rings, back off, then add I or D only if needed, one change at a time, and copy the final gains into your code.

---

## Exercises

### Practice

**1. Sketch, then verify.** Before you touch the robot, draw three small graphs of heading versus time after pressing B on the tuning bench, like the ones in Section 15.9, for `kP = 0.05`, `kP = 0.3`, and `kP = 3.0` (with `kI` and `kD` at `0`). For each, write one sentence predicting where the robot will stop and whether it will overshoot. Use the stall gap idea from Section 15.3 to guess **how far** short the low-gain one stops. Then set each gain live in the Heading PID widget, press B and A a few times, and compare the plot with your sketch. Where were you wrong? Paste a screenshot of each plot next to your sketches in `reflections.md`.

**2. PID by hand.** A heading controller has `kP = 0.3`, `kI = 0.5`, `kD = 0.004`, and a setpoint of `90`. Before loop 1, the error sum was `0` and the previous error was `9`. Each loop is 0.02 seconds. Fill in the table, one loop at a time, using the formulas from Sections 15.2, 15.4, and 15.5:

| Loop | Measurement | Error | Error sum | Error rate | P | I | D | Output (before clamping) |
|---|---|---|---|---|---|---|---|---|
| 1 | 82.0 | 8.0 | 0.16 | -50 | 2.4 | 0.08 | -0.2 | 2.28 |
| 2 | 85.0 | | | | | | | |
| 3 | 87.5 | | | | | | | |
| 4 | 89.0 | | | | | | | |

The first row is done for you. Then answer: Which term shrinks fastest as the robot arrives? Which one grows? What would the clamp in `calculateTurnRate()` do to loop 1's output? Why is the D column negative the whole time?

**3. Build your own PID controller.** Create `SimplePID.java` from Section 15.6. Type it, do not paste. Then, in your `Robot()` constructor, add temporary test lines that create a `SimplePID` and a WPILib `PIDController` with the **same** gains (`0.3`, `0.5`, `0.004`), feed both the same five measurements, one call each (`81.0`, `82.0`, `85.0`, `87.5`, `89.0`, all with a setpoint of `90.0`), and print both outputs side by side. They should match. Look at the first output: it is much bigger than the others. Explain why, using the words "previous error" and "derivative kick." Then break `SimplePID` on purpose: move `errorSum` inside `calculate` as a local variable (`double errorSum = 0.0;` as its first line). Rerun. What happens to the I term, and why? Put it back, remove the test lines, and keep `SimplePID.java` or delete it (the robot does not use it).

**4. Which way around?** A heading controller has continuous input on `-180` to `180`. For each setpoint and measurement, predict the error the controller uses, and say which way the robot turns (left or right) and by how much:

| Setpoint | Measurement | Plain error (setpoint minus measurement) | Wrapped error | Turn |
|---|---|---|---|---|
| 90 | 0 | 90 | | |
| 170 | -170 | 340 | | |
| 0 | 350 | -350 | | |
| -90 | 400 | -490 | | |
| 90 | 450 | -360 | | |

Check your answers in code: `MathUtil.inputModulus(setpoint - measurement, -180.0, 180.0)` is the same wrapping `PIDController` does. Then explain in one sentence why the gyro's raw heading (which can read 450) is safe to use as the measurement.

**5. Steer back onto the line.** Holding a heading keeps the robot pointed straight, but it does not undo a sideways drift (Section 15.8). Build a small **cascade**: use the pose's `y` to choose the heading. In the leg 1 case, replace `calculateTurnRate(LEG_1_HEADING_DEGREES)` with `calculateTurnRate(getLineHoldHeadingDegrees())`, and add:

```java
private static final double CROSS_TRACK_DEGREES_PER_METER = 200.0;   // 2 cm off the line: aim 4 degrees back
private static final double MAX_CROSS_TRACK_DEGREES = 15.0;
```

```java
/** The heading that steers leg 1 back onto the line y = 0. Left of the line means aim right. */
private double getLineHoldHeadingDegrees() {
    double correctionDegrees = CROSS_TRACK_DEGREES_PER_METER * drivetrain.getPose().getY();
    return LEG_1_HEADING_DEGREES
        - MathUtil.clamp(correctionDegrees, -MAX_CROSS_TRACK_DEGREES, MAX_CROSS_TRACK_DEGREES);
}
```

Test it: during leg 1, give the front of the robot a gentle sideways nudge with a finger, about a third of the way down the leg. Do five runs with the cascade and five without (use the plain `LEG_1_HEADING_DEGREES`). Record `Pose Y` at the end of leg 1 for each run. Which version ends closer to `y = 0`? Explain in two sentences why the plain heading hold cannot fix a nudge, and the cascade can. (Notice that `CROSS_TRACK_DEGREES_PER_METER` is a gain, too. It is a P controller whose output is another controller's setpoint.) Keep whichever version you prefer.

### Build (XRP Explorer)

Replace the open-loop drive and turn with PID, tune it, and measure the improvement.

1. Remove the `HAND_KP` experiment from Section 15.2, if it is still there. Update `Robot.java` to the listing in Section 15.8. `Drivetrain.java` does not change. Build and confirm `BUILD SUCCESSFUL`.
2. Run the program. In the Simulation GUI, open the **Heading PID** and **Distance PID** widgets (NetworkTables > SmartDashboard), and make a plot with Heading PID's **setpoint** and **measurement** (Section 15.9). Add `Distance Error (m)`, `Heading Error (deg)`, `Distance At Target`, and `Heading At Target` to your SmartDashboard layout and save it.
3. Enter **Test** mode. Tune the heading controller with B and A, following the recipe in Section 15.9. Record the gains you tried and what each plot looked like in a table in `reflections.md`.
4. Make a second plot for Distance PID and tune the distance controller with X and A.
5. Copy your final gains into the constants, with today's date in a comment. Rebuild, and confirm the tuning bench still behaves the same with the gains coming from the code.
6. Run the autonomous course five times. For each run, record: the distance at the end of leg 1 (from the `Auto step 2` log line), the heading at the end of the turn (from the `Auto step 3` line), and the final pose **and** the tape measure's final position, as in Chapter 14. Put your Chapter 14 table next to the new one and compute the average error for each.
7. Run the Chapter 12 safety-net test once more: hold the robot still during the turn. The turn step should time out after 7 seconds, and the routine should stop. PID did not remove the need for a safety net.

Diagnose anything strange:

- **The robot drives backward or spins away from the target:** a sign is backward somewhere. Check that `Avg Distance (m)` goes up when you push forward and `Heading (deg)` goes up when you turn left (Chapter 9). Fix it in the getter, never with a negative gain. (A negative gain will not even run: the constructor throws `IllegalArgumentException`.)
- **Leg 1 never ends and times out after 7 seconds:** the distance controller is stalling outside its 1 cm tolerance. Watch `Distance Error (m)` when it stops. Raise `DISTANCE_KP`, or add a small `DISTANCE_KI` with an I zone (copy the heading controller's setup).
- **The turn never ends and times out:** same idea for the heading. Watch `Heading Error (deg)`. If it is stuck at a few degrees, raise `HEADING_KI` a little. If it keeps swinging back and forth, lower `HEADING_KP`.
- **The robot spins the long way around (more than 180 degrees) to reach a heading:** `enableContinuousInput(-180.0, 180.0)` is missing from the constructor.
- **The I term seems to do nothing:** check that you edited the **I** box (not the IZone box), that the I zone is not `0`, and that the error is inside the I zone. An I zone smaller than the stall gap means the sum is cleared every loop.
- **The robot overshoots wildly at the start of a step, then settles:** the previous step's error sum leaked in. Check that `startStep()` calls `reset()` on both controllers.
- **Gains in the widget snap back to the old values after a restart:** that is expected. Live changes are not saved; copy them into the constants (step 5).
- **No Heading PID item in the NetworkTables menu:** check the `putData` lines in the constructor, and that the program is running.
- **Nothing happens in Test mode:** make sure the robot is **enabled** in Test, that the controller is in Joysticks slot 0 (Chapter 8), and that you pressed a button after enabling.

When the Explorer finishes the turn within 2 degrees of 90 and leg 1 within a centimeter of the mark, five runs in a row, the robot is accurate. In Chapter 16, you will make it accurate **and** quick.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Why does a P-only controller stall short of the target on the XRP, and why can you not fix it completely by raising `kP`? Use the words "friction" and "overshoot."
2. In the bug from Section 15.6, `errorSum` was a local variable. Explain why the I term did nothing, using the words "scope" and "lifetime." Then explain why making it a field also requires resetting it, and where your code does that.
3. The PID routine is a little slower than the bang-bang one. Describe one mechanism on an FRC robot where bang-bang would be perfectly fine, and one where it would be a bad idea. What is the difference between them?
4. Why does the Explorer have two `PIDController` objects instead of one shared by distance and heading? Describe what would go wrong, term by term, if they shared one.

If any answer feels shaky, re-read Sections 15.3, 15.4, and 15.6.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b pid
```

Do the Build exercise on that branch. Make sure you removed the temporary test lines from Practice 3. When your tuned gains are in the constants and the course runs:

```bash
git add .
git commit -m "Ch15: PID turn and straight drive"
git push -u origin pid
```

Open a pull request into `main`. In the description, include your final gains, the date you tuned them, and your before-and-after table from Build step 6. Review the **Files changed** tab yourself. Notice that `Drivetrain.java` does not appear in it at all. Merge, delete the branch, then `git checkout main` and `git pull`.

Your tuned gains are now in your Git history with a date. When the robot feels different in a month (new batteries, a new floor), `git log -p` will show you exactly what the gains were when it worked.

### Collab: PID Detective

Work with a partner, with one robot on the tuning bench and a plot showing Heading PID's setpoint and measurement. Write these four gain sets on cards:

| Card | P | I | IZone | D |
|---|---|---|---|---|
| A | 0.05 | 0 | 10 | 0 |
| B | 3.0 | 0 | 10 | 0 |
| C | 0.3 | 3.0 | 90 | 0 |
| D | Your tuned values | | | |

One person (the tuner) shuffles the cards, picks one in secret, types its gains into the Heading PID widget, and presses B and A a few times. The other person (the detective) may only look at the **plot**, not the widget or the cards. The detective names the card and explains which part of the plot gave it away. Swap roles until each of you has diagnosed all four. Afterward, each of you writes one sentence in `reflections.md` about which card was hardest to tell apart from the others, and why. Put your tuned values back when you are done.

### Explore

WPILib's documentation has interactive tuning simulations that run in your browser. Open **Tuning a Turret Position Controller** (link below). Try to tune the turret with feedback only (P and D, no feedforward), then read what the page says about why that is hard. Write two sentences in `reflections.md` comparing the turret's behavior with your XRP's turn. This is also a preview of Chapter 16.

---

> **Additional Resources**
>
> * **Introduction to PID**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-pid.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-pid.html) WPILib's explanation of the three terms, with diagrams of the response curves
> * **PID Control in WPILib**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/controllers/pidcontroller.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/controllers/pidcontroller.html) the official guide to `PIDController`: tolerances, `reset`, I zone, integrator range, continuous input, and clamping
> * **Tuning a Turret Position Controller**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-turret.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-turret.html) an interactive simulation where you tune gains and watch the response, no robot required
> * **`PIDController` Javadoc**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/controller/PIDController.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/controller/PIDController.html) every method on `PIDController`, including the deprecated older names
> * **Assignment, Arithmetic, and Unary Operators (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/nutsandbolts/op1.html](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/op1.html) Java's own explanation of `+=`, `-=`, and the other compound assignment operators

---

*Next up, Chapter 16: SysId Characterization on the XRP. You will measure exactly how much voltage your XRP needs to start moving, to hold a speed, and to speed up, then use those numbers to drive faster and more accurately with less work for PID.*
