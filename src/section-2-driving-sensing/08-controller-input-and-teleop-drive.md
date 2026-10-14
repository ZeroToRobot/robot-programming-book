# Chapter 8: Controller Input and Teleop Drive

In Chapter 7 you built the `Drivetrain` class, the Explorer's hardware layer for driving, and proved your wiring with a one-second autonomous nudge. The robot moved. But it moved on its own, along a path you decided before you pressed Enable. Nobody was driving.

That changes now. In this chapter a human takes the wheel. You will plug in an Xbox controller, read its sticks and buttons fifty times a second, clean up the messy numbers that real sticks produce, and feed the result into the `arcadeDrive` method you wrote last chapter. By the end, you will drive the XRP around a taped course on the floor, with a slow mode for the tight corners.

Along the way you will pick up two pieces of Java that make code easier to read and harder to break: **named constants** (`static final`), which end the habit of scattering mystery numbers through your code, and the **ternary operator**, the one-line `if`/`else` you saw back in Chapter 4 and were promised an explanation for.

This is the chapter where the robot starts to feel like a robot. Enjoy it.

---

## 8.1 What Happens When You Push the Stick?

Picture a match. The driver pushes the left stick forward and the robot surges ahead. It feels instant, like the stick is physically connected to the wheels. It is not. A lot happens in between, and all of it is code you are about to write.

Here is the chain, every 20 milliseconds:

1. Your thumb tilts the stick. Inside the controller, a sensor measures how far it tilted.
2. The controller reports that position over USB to the laptop running the Driver Station.
3. The Driver Station sends the controller's state to your robot program.
4. Your code in `teleopPeriodic()` **reads** the stick position as a number.
5. Your code **decides** what that number should mean for the motors.
6. Your code **writes** a command to the motors through `drivetrain.arcadeDrive(...)`.

Then the loop runs again, and again, fifty times a second. This is the same read, decide, write loop from Chapter 1, except the input is now a human being.

Steps 1 to 3 are handled for you by WPILib and the Driver Station. Steps 4 to 6 are yours. The interesting part is step 5, because the raw numbers from a real controller are not quite what you want to send to a motor. They are a little noisy, a little backward, and a little too sensitive. Most of this chapter is about that middle step: turning what the driver's hand did into what the robot should do.

> **The driver is part of the control loop**
>
> In autonomous, your code reads sensors and corrects the robot by itself. In teleop, the driver is the one watching the robot and correcting it: drifting left, so they push a little right. Engineers call a system like this **closed-loop**, because the output (where the robot went) feeds back into the input (what the driver does next). In Chapter 15 you will write code that closes that loop without a human, using PID control. For now, notice that a good teleop program makes the human's job easy: predictable, smooth, and no surprises.

---

## 8.2 Meet the Xbox Controller

You checked in Chapter 2 that your Xbox controller shows up in the Driver Station. Now you will talk to it from code.

WPILib represents the controller with a class called `XboxController`. You already know what to do with a class: create an object from it with `new`, then call its methods.

```java
XboxController controller = new XboxController(0);
```

The `0` is the **port**: which controller slot this object listens to. The Driver Station can hold several controllers at once (competition teams usually have a driver and an operator), and it numbers them starting at 0. Port 0 means "the first controller in the list."

The controller object has a method for every stick, trigger, and button. These are the ones you will use most:

| Input | Method | Returns |
|---|---|---|
| Left stick, up and down | `getLeftY()` | `double`, `-1.0` to `1.0` |
| Left stick, left and right | `getLeftX()` | `double`, `-1.0` to `1.0` |
| Right stick, up and down | `getRightY()` | `double`, `-1.0` to `1.0` |
| Right stick, left and right | `getRightX()` | `double`, `-1.0` to `1.0` |
| Left and right triggers | `getLeftTriggerAxis()`, `getRightTriggerAxis()` | `double`, `0.0` to `1.0` |
| A, B, X, Y buttons | `getAButton()`, `getBButton()`, ... | `boolean` |
| Bumpers | `getLeftBumperButton()`, `getRightBumperButton()` | `boolean` |

Sticks and triggers are **axes**: they report how far they moved, as a `double`. Buttons report only whether they are held, as a `boolean`. That lines up with the types you learned in Chapter 4: a `double` for "how much," a `boolean` for "yes or no."

> **Older code uses different names**
>
> If you read robot code from before 2025, you will see `getLeftBumper()` instead of `getLeftBumperButton()`. WPILib renamed the bumper methods and marked the old names as deprecated, which means "still works for now, but will be removed." VS Code shows deprecated methods with a line through them. When you see that strikethrough, check the WPILib docs for the new name.

### Step 1: Make sure the controller is in slot 0

Plug in your controller. Your code will ask for port 0, so the controller must be in the first slot:

- In the **Driver Station**, open the **USB Devices** tab. Your controller should be listed at position 0. If another device is above it, drag your controller to the top.
- If you drive your XRP from the **WPILib Simulation GUI** window instead, find the **System Joysticks** list and drag your controller into slot 0 of the **Joysticks** list. Check **Map gamepad** so the sticks map the same way they would on the Driver Station.

Either way, the rule is the same: the number in `new XboxController(0)` must match the slot the controller is in.

> **A common beginner mistake**
>
> The code builds, deploys, and enables, but the robot ignores the sticks completely. Nine times out of ten, the controller is in the wrong slot, or not in any slot at all. Before you debug your code, check the slot. It is a ten-second check that saves an hour.

---

## 8.3 Your First Reading: Putting the Stick on the Dashboard

Before you let a stick drive real motors, look at what it actually reports. This is the "verify with a one-line dashboard experiment" habit from Chapter 5, and here it will teach you something surprising.

Open `Robot.java`. Add the import and a field for the controller, then publish the left stick's Y value and the right stick's X value from `robotPeriodic()`:

```java
import edu.wpi.first.wpilibj.XboxController;
```

```java
// A field: the Robot owns one controller object, on port 0.
private final XboxController controller = new XboxController(0);
```

```java
@Override
public void robotPeriodic() {
    SmartDashboard.putNumber("Left Y", controller.getLeftY());
    SmartDashboard.putNumber("Right X", controller.getRightX());
}
```

Why `robotPeriodic()` and not `teleopPeriodic()`? Because `robotPeriodic()` runs in every mode, including Disabled. You can watch the numbers while the robot is safely disabled, with no motors involved. Reading inputs while disabled is a good habit any time you are about to wire a new input to something that moves.

Build, deploy, and open SmartDashboard. Leave the robot **disabled**. Now play with the sticks and watch the two widgets.

Here is what you should see:

- Push the right stick to the right: `Right X` goes toward `1.0`. Push left: toward `-1.0`. That matches your intuition.
- Push the left stick **forward** (away from you): `Left Y` goes toward **`-1.0`**.

Forward is negative. That is not a bug in your code or your controller. It is how every game controller reports the Y axis.

> **Why is forward negative? Coordinate frames**
>
> Controllers inherited their axes from computer screens, where y grows downward (row 0 is the top of the screen). So "up" on the stick is negative. Robots use a different convention. WPILib's robot coordinate frame says +x points forward out of the front of the robot, +y points to the robot's left, and positive rotation is **counterclockwise** when seen from above.
>
> Two devices, two **coordinate frames**, and your code sits between them. Every time you pass a stick value to the drivetrain, you are translating from the controller's frame to the robot's frame. Usually that translation is a single minus sign. You will meet coordinate frames again and again: when you track the robot's position on the field in Chapter 14, and when you build field-oriented swerve drive in Chapter 29, where "forward" means "away from the driver" no matter which way the robot is facing.

Now take your hands off the controller completely and look again. Is `Left Y` exactly `0.0`? On a brand new controller it might be. On a controller that has been through a season of practice, it probably reads something like `0.03` or `-0.06`, and it may change a little every time you let go of the stick. Keep that in mind. It is the subject of the next section.

---

## 8.4 Stick Drift and the Deadband

A joystick is a mechanical part. Springs pull it back toward the center, but never perfectly. The sensor inside is not perfectly calibrated either. So when nobody is touching the stick, it rarely reports a clean zero. It reports a small, random-looking number near zero. This is called **stick drift**.

Why does that matter? Feed `0.04` into `arcadeDrive` and you are asking the motors for four percent power. On a slick floor, the XRP might creep forward on its own. On carpet, it might not move at all, but the motors still hum and heat up, slowly draining your battery while the robot sits "still." On a competition robot, a creeping drivetrain during a precise lineup is the kind of bug that costs a match.

The fix is a **deadband**: a small zone around zero where any reading is treated as exactly zero. You wrote one yourself in Chapter 6:

```java
private double applyDeadband(double value) {
    if (Math.abs(value) < 0.1) {
        return 0.0;
    }
    return value;
}
```

That works, and it was a great way to learn methods. But it has a subtle problem. Watch what happens as you slowly push the stick forward from rest:

| Stick reading | Your Ch 6 version | Smooth version |
|---|---|---|
| `0.05` | `0.0` | `0.0` |
| `0.09` | `0.0` | `0.0` |
| `0.11` | `0.11` | `0.01` |
| `0.50` | `0.50` | `0.44` |
| `1.00` | `1.00` | `1.00` |

With your version, the output sits at zero and then **jumps** straight to `0.11` the instant the stick crosses the line. The robot lurches instead of easing into motion. The smooth version also returns zero inside the deadband, but outside it, it rescales the rest of the range so the output starts from zero at the edge of the deadband and still reaches `1.0` at full stick. No jump, and the driver still gets full speed.

You could write the smooth version yourself (it is a nice math puzzle, and it is one of this chapter's Practice exercises). But WPILib already ships it, tested and used by thousands of teams, in a class called `MathUtil`:

```java
import edu.wpi.first.math.MathUtil;
```

```java
double forward = MathUtil.applyDeadband(controller.getLeftY(), 0.1);
```

Look at how that call is written: `MathUtil.applyDeadband(...)`. The name before the dot is capitalized, and you never wrote `new MathUtil()`. That is a **static** method, called on the class itself, exactly like `SmartDashboard.putNumber` from Chapter 7. `MathUtil` is a toolbox of math helpers; there is no reason to build a `MathUtil` object, so its methods belong to the class.

It takes two parameters: the value to clean up, and the size of the deadband. It returns the cleaned value.

> **Pick a deadband by measuring, not guessing**
>
> `0.1` is a reasonable starting point for most Xbox controllers. But the right number for **your** controller is a little bigger than the largest value it reports at rest. Let go of the stick ten times and watch the `Left Y` widget. If the biggest resting value you ever see is `0.06`, a deadband of `0.1` gives you a comfortable margin. If you see `0.12`, your controller is worn, and you need a bigger deadband or a new controller.

> **`DifferentialDrive` has a tiny deadband too**
>
> `DifferentialDrive` quietly applies its own deadband of `0.02` to whatever you pass it. That is meant to catch rounding noise, not real stick drift, which is often several times larger. Keep your own deadband; the built-in one is a backstop, not a replacement.

---

## 8.5 No Magic Numbers: `static final` Constants

Look at that line again:

```java
double forward = MathUtil.applyDeadband(controller.getLeftY(), 0.1);
```

What is `0.1`? You know, because you just read Section 8.4. But imagine a teammate opening this file in three months. Is `0.1` a speed? A time? A distance? And when your code has a `0.1` for the left stick, another `0.1` for the right stick, and a third `0.1` that means something else entirely, which ones should change when you get a new controller?

A number dropped into code with no name is called a **magic number**. It works like magic: nobody remembers why it is there, and everybody is afraid to touch it. You saw the danger in Chapter 6's Reflect exercise, where one deadband said `0.1` and the other said `0.15` and nobody noticed.

The fix is to give the number a name, once, at the top of the class:

```java
private static final double STICK_DEADBAND = 0.1;
```

Now the line reads like a sentence:

```java
double forward = MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND);
```

That declaration has two keywords you have seen separately. Put together, they make a **constant**:

- **`final`** means the value can never be reassigned. You met `final` in Chapter 7 on the motor fields. If any code later tries `STICK_DEADBAND = 0.2;`, the program will not even compile. The compiler protects the value for you.
- **`static`** means the value belongs to the class, not to each object. Back in Chapter 7, every `ScoreKeeper` got its own copy of `points`, because each scorekeeper had a different score. A deadband is not like that. It is one fact about the program, so there should be exactly one copy of it, shared by everyone. That is what `static` gives you.

So `static final` reads as "one shared copy that never changes." That is exactly what a constant is.

Java has a naming convention for constants: **ALL_CAPS with underscores** between words. When you see `STICK_DEADBAND` in a file, the capitals tell you instantly that it is a constant, not a variable that might change halfway through the match.

> **You will also see the `k` prefix**
>
> Many WPILib examples and FRC teams write constants as `kStickDeadband`, with a lowercase `k` in front (a habit borrowed from older C++ code, where `k` stood for "konstant"). Both styles mean the same thing. This book uses Java's standard ALL_CAPS style. Whichever style your team picks, use it everywhere, so constants always look like constants.

> **When should a number become a constant?**
>
> A good rule: if a number is something you might **tune** (a deadband, a speed limit, a distance to a wall) or something with a **meaning** (a controller port, a motor channel), give it a name. Numbers that are just math, like the `2` in "divide by 2 to find the middle," can stay as they are. By Chapter 20 your constants will move into their own `Constants.java` file, so the whole team has one place to look for every tunable value on the robot.

---

## 8.6 Arcade Drive from the Sticks

You now have every piece. Time to connect the controller to the drivetrain.

The plan uses the **split-stick arcade** layout that most FRC drivers prefer: the **left stick's Y axis** controls forward and backward, and the **right stick's X axis** controls turning. Splitting them across two thumbs makes it much easier to drive straight while making small steering corrections.

Here is the core of it:

```java
double forward = -MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND);
double rotation = -MathUtil.applyDeadband(controller.getRightX(), STICK_DEADBAND);
drivetrain.arcadeDrive(forward, rotation);
```

Two minus signs, both from Section 8.3:

- **Forward:** pushing the stick forward reads negative, but the robot treats positive as forward. Negate it.
- **Rotation:** pushing the stick right reads positive, but in the robot's frame positive rotation is counterclockwise, which turns the robot **left**. Negate it, so pushing right turns right.

> **Correction to Chapter 7**
>
> Chapter 7 described `arcadeDrive`'s `rotation` as "positive turns right." Current WPILib uses the opposite: positive rotation is counterclockwise, which turns the robot **left**, matching the robot coordinate frame. That is why the rotation line above has a minus sign. If you ever find your robot steering backward, check this sign first.

Here is the complete `Robot.java`, starting from where Chapter 7 left it (including the timed autonomous from Chapter 7's Build exercise). Type it, do not paste:

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

    // The robot's parts, created once.
    private final Drivetrain drivetrain;
    private final XboxController controller = new XboxController(DRIVER_CONTROLLER_PORT);
    private final Timer autoTimer = new Timer();

    public Robot() {
        System.out.println("XRP Explorer started!");
        SmartDashboard.putString("Mode", "Starting");

        drivetrain = new Drivetrain();
    }

    @Override
    public void robotPeriodic() {
        // Raw stick values, visible in every mode (even disabled).
        SmartDashboard.putNumber("Left Y", controller.getLeftY());
        SmartDashboard.putNumber("Right X", controller.getRightX());
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
        // Read: clean up the raw sticks.
        // Decide: flip signs from the controller's frame to the robot's frame.
        double forward = -MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND);
        double rotation = -MathUtil.applyDeadband(controller.getRightX(), STICK_DEADBAND);

        // Write: send the command to the drivetrain.
        drivetrain.arcadeDrive(forward, rotation);

        SmartDashboard.putNumber("Forward Cmd", forward);
        SmartDashboard.putNumber("Rotation Cmd", rotation);
    }
}
```

Walk through what changed since Chapter 7:

- **Imports.** Two new ones: `XboxController` and `MathUtil`. If VS Code underlines either class name in red, the import is missing.
- **Constants.** `DRIVER_CONTROLLER_PORT` and `STICK_DEADBAND` sit at the very top of the class, where anyone opening the file sees them first. Even the port number got a name.
- **The controller field.** Created once, as a field initializer, just like the motors inside `Drivetrain`. Create once, use every loop.
- **`teleopPeriodic()`.** Read, decide, write, in three lines, plus two dashboard widgets so you can see exactly what you are commanding.

`Drivetrain.java` does not change at all. That is encapsulation paying off: the drivetrain already knew how to `arcadeDrive`, and it does not care whether the numbers come from a timer, a controller, or (in Chapter 12) an autonomous routine.

Build, deploy, put the XRP on the floor with some room around it, select **Teleoperated**, and **Enable**. Push the left stick forward gently. You are driving.

> **What `arcadeDrive` does with your two numbers**
>
> A differential drive has no steering wheel. It turns by spinning one side faster than the other. Inside `arcadeDrive`, WPILib converts your forward and rotation values into left and right motor speeds, roughly like this:
>
> ```
> left  = forward - rotation
> right = forward + rotation
> ```
>
> Forward `0.5` with rotation `0.2` (a gentle left turn) gives left `0.3`, right `0.7`. The right side outruns the left, and the robot curves left. If a sum goes past `1.0`, WPILib scales both sides down together so the turn keeps its shape. Turning "how fast and how much turn" into "what each wheel does" is called **inverse kinematics**, and it is the whole subject of Chapter 13. In Chapter 28 you will do the same thing for swerve drive, where each of four wheels also gets its own steering angle.

> **Why small stick movements feel gentle**
>
> The two-number version of `arcadeDrive` **squares** your inputs before using them (keeping the sign). Half stick, `0.5`, becomes `0.25` power. Full stick is still `1.0`. This gives the driver fine control at low speeds, where precision matters, without giving up top speed. Shaping the input curve like this is called **input shaping**, and drivers notice it immediately. If you ever want a linear response, `arcadeDrive(forward, rotation, false)` turns the squaring off.

---

## 8.7 Buttons: Held vs Pressed

Sticks give you a range. Buttons give you yes or no. But there is a catch, and it comes straight from the 50 Hz loop.

Try this experiment. Add a field to count button presses, and count up whenever the A button is held:

```java
private int aPressCount = 0;
```

```java
// In teleopPeriodic():
if (controller.getAButton()) {
    aPressCount = aPressCount + 1;
}
SmartDashboard.putNumber("A Presses", aPressCount);
```

Before you run it, predict: if you tap A once, quickly, what number will appear?

Now run it and tap A once. You will probably see something like `5` or `8`, not `1`. Hold A for two seconds and the count jumps by about `100`.

Why? `getAButton()` answers the question "is A held **right now**?" Your code asks that question fifty times a second. A quick tap lasts about a tenth of a second, so the answer is "yes" for five or so loops in a row, and each "yes" adds one.

WPILib has a second method for exactly this situation:

```java
if (controller.getAButtonPressed()) {
    aPressCount = aPressCount + 1;
}
```

`getAButtonPressed()` answers a different question: "did A **go from up to down** since the last time I asked?" It is `true` for exactly one loop per press, no matter how long you hold the button. Swap it in, redeploy, and every tap now counts as one.

| Method | Question it answers | `true` for |
|---|---|---|
| `getAButton()` | Is A held right now? | Every loop while held |
| `getAButtonPressed()` | Did A just go down? | One loop per press |
| `getAButtonReleased()` | Did A just come up? | One loop per release |

Every button has all three versions (`getBButtonPressed()`, `getRightBumperButtonPressed()`, and so on).

> **Held for "while," pressed for "once"**
>
> Use the held version when the robot should do something **while** the button is down: run an intake while A is held, drive slowly while the bumper is held. Use the pressed version when something should happen **once** per press: toggle a mode on and off, count a scored game piece, switch cameras. Mixing them up is one of the most common teleop bugs. A toggle written with `getAButton()` flips fifty times a second, so where it ends up depends on how long you held the button.

The idea of reacting to the moment something changes, rather than to its current state, is called **edge detection**, and it shows up all over robotics. In Chapter 20 you will bind commands to buttons, and WPILib will let you choose between "while held" and "on press" with a single method name.

---

## 8.8 The Ternary Operator: Slow Mode in One Line

The XRP is small and quick. Driving it through a tight gap at full stick sensitivity is hard. Real FRC drivers solve this with a **slow mode** (sometimes called precision mode): hold a button, and the robot's top speed drops so small corrections are easy.

Let us add one: while the right bumper is held, the XRP drives at half speed. First, two more constants:

```java
private static final double FULL_SPEED_SCALE = 1.0;
private static final double SLOW_MODE_SCALE = 0.5;
```

You already know how to choose between two values. With an `if`/`else` from Chapter 6:

```java
double speedScale;
if (controller.getRightBumperButton()) {
    speedScale = SLOW_MODE_SCALE;
} else {
    speedScale = FULL_SPEED_SCALE;
}
```

That works. But it takes six lines to say one small thing: "the speed scale is slow if the bumper is held, otherwise full." Java has a shorter way to write exactly this pattern, the **ternary operator** (also called the conditional operator):

```java
double speedScale = controller.getRightBumperButton() ? SLOW_MODE_SCALE : FULL_SPEED_SCALE;
```

Read it aloud: "Is the right bumper held? If so, `SLOW_MODE_SCALE`. Otherwise, `FULL_SPEED_SCALE`." The general shape is:

```
condition ? valueIfTrue : valueIfFalse
```

It has three parts (that is what "ternary" means), and the whole thing **produces a value**, which is why you can put it on the right side of an `=`. An `if` statement does things; a ternary expression picks a value.

Now you can finally decode the line from Chapter 4 that you were told not to worry about:

```java
String mode = isEnabled() ? "Enabled" : "Disabled";
```

"Is the robot enabled? If so, `"Enabled"`. Otherwise, `"Disabled"`." One line, one choice, one value.

Put slow mode into `teleopPeriodic()` by multiplying both commands by the scale:

```java
double speedScale = controller.getRightBumperButton() ? SLOW_MODE_SCALE : FULL_SPEED_SCALE;

drivetrain.arcadeDrive(forward * speedScale, rotation * speedScale);
SmartDashboard.putBoolean("Slow Mode", speedScale == SLOW_MODE_SCALE);
```

> **When not to use the ternary**
>
> The ternary is great for a **simple choice between two values**. It is a bad idea for anything more. If you catch yourself nesting one inside another (`a ? b : c ? d : e`), or wanting it to "do" something like drive a motor, switch back to a regular `if`/`else`. The goal is code that reads like a sentence. A ternary that needs to be read three times has failed at that goal.

> **Scaling commands is not the same as limiting speed**
>
> Multiplying by `0.5` cuts the **command** in half, which is roughly half power. On a fresh battery that might be one speed; on a tired battery, noticeably slower. Remember the callout from Chapter 7: `-1.0` to `1.0` is a fraction of power, not a real-world speed. Once your drivetrain knows its true speed from encoders (Ch 9) and a measured motor model (Ch 16), you can ask for "0.3 meters per second" and get it, battery or not.

---

## 8.9 Why the Controller Lives in `Robot.java`

You may have noticed a design choice: the `XboxController` lives in `Robot.java`, not inside `Drivetrain`. That was deliberate.

`Drivetrain` is the hardware layer. Its job is to know about motors and how to drive them. It should not know or care where its commands come from. Today the commands come from a controller. In autonomous they come from a timer. In Chapter 12 they will come from encoders, and in Chapter 15 from a PID controller. If `Drivetrain` read the controller itself, every one of those would need special cases inside the drivetrain.

Keeping them apart gives you a clean split:

- **Inputs** (controllers, and soon sensors) are read in `Robot.java`.
- **Decisions** (deadband, sign flips, slow mode) happen in `Robot.java`.
- **Hardware** (motors, `DifferentialDrive`) is hidden inside `Drivetrain`.

This is the same idea as encapsulation from Chapter 7, applied one level up: each class has one job. In Chapter 20, the input-reading part moves into a dedicated class called `RobotContainer`, and you will see that the split you made here is exactly the shape the command-based framework expects.

> **A controller is a sensor for the driver**
>
> It helps to think of the controller as just another sensor. It reports numbers, those numbers are noisy, they live in their own coordinate frame, and your code has to clean and convert them before they mean anything to the robot. In Chapter 9 you will do exactly the same thing with the encoders, gyro, rangefinder, and line sensors. The skills transfer directly: read, clean, convert, then use.

---

## Chapter Summary

> **What you learned in Chapter 8**
>
> * Teleop is the read, decide, write loop with a human as the input. The `XboxController` class reads sticks as `double` axes and buttons as `boolean` values, from the **port** that matches the controller's slot in the Driver Station.
> * Controllers and robots use different **coordinate frames**. Pushing a stick forward reads negative, and WPILib's positive rotation is counterclockwise, so arcade drive negates both stick values.
> * Real sticks never rest at exactly zero (**stick drift**). A **deadband** treats small readings as zero; `MathUtil.applyDeadband` also rescales the rest of the range so motion starts smoothly. It is a **static** method, called on the class.
> * A **magic number** is an unexplained value in code. Replace it with a **`static final` constant**: one shared copy (`static`) that can never change (`final`), named in ALL_CAPS.
> * **Split-stick arcade drive** sends the left stick's Y to forward and the right stick's X to rotation. Inside, `arcadeDrive` turns those into left and right wheel speeds (a preview of kinematics) and squares them for finer control at low speed.
> * `getAButton()` is `true` **while** a button is held; `getAButtonPressed()` is `true` **once** per press. Use held for "while" behaviors and pressed for toggles and counts.
> * The **ternary operator** (`condition ? a : b`) picks one of two values in a single expression, perfect for choices like slow mode.

---

## Exercises

### Practice

**1. Raw versus filtered.** Add a third widget in `robotPeriodic()` that shows the deadbanded left stick next to the raw one:

```java
SmartDashboard.putNumber("Left Y Filtered",
    MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND));
```

With the robot disabled, let go of the stick ten times and write down the largest resting value of `Left Y`. Then push the stick very slowly forward and note the raw value where `Left Y Filtered` first leaves zero. Does it match your deadband?

Next, set `STICK_DEADBAND` to `0.0`, deploy, enable Teleop, and let go of the controller. Watch and listen. Try it on a hard floor, then on carpet. On which surface does the XRP creep? On which does it only hum? Write two sentences explaining the difference, then put the deadband back.

**2. Write the smooth deadband yourself.** Without looking at WPILib's source, write a method `smoothDeadband(double value, double deadband)` that returns `0.0` inside the deadband and rescales the rest so that the output is `0.0` at the edge of the deadband and `1.0` at a full stick of `1.0`. Remember negative values. Check your method against the table in Section 8.4, then compare your code with WPILib's `MathUtil` source (linked in Additional Resources).

**3. Predict the ternary.** For each line, write the value of `result` before running anything:

```java
int a = 7;
String result1 = a > 5 ? "big" : "small";
double result2 = a % 2 == 0 ? 1.0 : -1.0;
boolean result3 = a < 0 ? true : false;
```

Then explain why `result3` could be written more simply without a ternary at all.

### Build (XRP Explorer)

Give the Explorer full driver control and drive it around a course.

1. Update `Robot.java` to the full listing in Section 8.6. Build and confirm `BUILD SUCCESSFUL`.
2. Add slow mode from Section 8.8: the two scale constants, the ternary in `teleopPeriodic()`, and the `Slow Mode` dashboard widget.
3. With painter's tape, lay out a simple course on the floor: a straight lane about one meter long, a 90 degree turn, and a "garage" box at the end just a little bigger than the XRP.
4. Deploy, select **Teleoperated**, **Enable**, and drive the course. Use slow mode to park in the garage without touching the tape.

Diagnose anything strange:

- **Stick forward drives backward:** the minus sign on `forward` is missing, or there is an extra one.
- **Stick right turns left:** the minus sign on `rotation` is missing, or there is an extra one.
- **Robot creeps when you let go:** your deadband is too small for your controller. Measure it (Practice 1) and raise it.
- **Robot ignores the sticks entirely:** check the controller slot first (Section 8.2), then that you are in **Teleoperated**, not Autonomous.
- **Slow mode does nothing:** check the `Slow Mode` widget. If it never turns true, check that you are using `getRightBumperButton()` and that the multiplication is applied to both values.

When you can drive the course and park in the garage three times in a row, your teleop is working. Time yourself; your lap time is a useful baseline. In Chapter 12 the robot will drive this same kind of course by itself.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Why do we need a deadband? Describe what happens to the motors, and to the robot, when the stick is at rest and there is no deadband.
2. Your teammate writes `private double deadband = 0.1;` instead of `private static final double STICK_DEADBAND = 0.1;`. The robot works the same. What protection did they give up, and what could go wrong later?
3. A teammate wants to toggle slow mode on and off with the B button, and writes `if (controller.getBButton()) { slowMode = !slowMode; }`. Explain, in terms of the 50 Hz loop, why this toggle behaves randomly, and which method fixes it.

If any answer feels shaky, re-read Sections 8.4, 8.5, and 8.7.

### Git

Your Explorer is driveable. That is a milestone worth its own commit:

```bash
git add .
git commit -m "Ch8: controller teleop drive working"
git push
```

Check the commit on GitHub and look at the diff for `Robot.java`. Notice that `Drivetrain.java` is not in the commit at all: you added driver control without touching the hardware layer. That is encapsulation, visible in your history.

---

> **Additional Resources**
>
> * **WPILib joysticks guide**: [docs.wpilib.org/en/stable/docs/software/basic-programming/joystick.html](https://docs.wpilib.org/en/stable/docs/software/basic-programming/joystick.html) how `XboxController` and other controllers are read, including ports and button methods
> * **WPILib coordinate system**: [docs.wpilib.org/en/stable/docs/software/basic-programming/coordinate-system.html](https://docs.wpilib.org/en/stable/docs/software/basic-programming/coordinate-system.html) the robot's coordinate frame, why rotation is counterclockwise positive, and why joystick values get negated
> * **`XboxController` and `MathUtil` Javadoc**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/XboxController.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/XboxController.html) every stick, trigger, and button method; see also [MathUtil](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/MathUtil.html) for `applyDeadband`
> * **Java constants**: [docs.oracle.com/javase/tutorial/java/javaOO/classvars.html](https://docs.oracle.com/javase/tutorial/java/javaOO/classvars.html) the official tutorial on `static` members, including `static final` constants and their naming convention
> * **Java ternary operator**: [docs.oracle.com/javase/tutorial/java/nutsandbolts/op2.html](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/op2.html) the official tutorial on conditional operators, including `?:`

---

*Next up, Chapter 9: All the XRP Sensors. You will read the encoders, gyro, rangefinder, and line sensors, convert their raw numbers into real units, and build a live dashboard showing everything the Explorer can feel.*
