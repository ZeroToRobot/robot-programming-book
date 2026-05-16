# Chapter 5: How a Robot Program Is Structured

In Chapter 4, you wrote your first Java code. Variables, prints, a blinking LED, a few values pushed to SmartDashboard. That was Java. This chapter is about the shape of a robot program.

A robot program isn't a single script that runs once and exits. It's a long-running loop with very specific rules: certain code must run when the robot first turns on, certain code must run only during autonomous, certain code must run on every single tick of the 50 Hz clock you met in Chapter 1. WPILib gives you a template that handles all of that scheduling for you, but only if you understand which method goes where.

By the end of this chapter, you'll be able to read any FRC robot program in the world and understand its structure at a glance. You'll also have the skeleton of your first real build project, the **XRP Explorer**, ready for everything we add to it over the next twenty chapters.

We won't write much new code in this chapter. We'll spend most of it reading the TimedRobot template line by line, until every method, every annotation, and every brace makes complete sense.

---

## 5.1 The Loop, Revisited

Cast your mind back to Chapter 1. The single most important idea in this book:

> A robot program is a loop that runs 50 times per second. Each iteration reads inputs and writes outputs.

That description is true, and it's enough to build intuition with, but it leaves out one important detail. The robot doesn't always do the same thing on every iteration of the loop. Sometimes it's running autonomous code. Sometimes it's running teleop code. Sometimes it's disabled and the only thing it should be doing is updating the dashboard.

So a more accurate description of the loop looks like this:

```
forever:
    read inputs from joysticks and sensors
    figure out which mode the robot is in
    run the code for that mode
    write outputs to motors and lights
    wait until 20 milliseconds have passed since the last loop
```

That "figure out which mode the robot is in" step is what makes the structure of a robot program more interesting than a normal Java program. WPILib handles the timing and the mode tracking for you. Your job is to fill in the right code in the right place.

> **Why 50 Hz, exactly?**
>
> The roboRIO and the Driver Station communicate at 50 Hz, which is once every 20 milliseconds. That's fast enough that human drivers can't perceive any lag, and slow enough that the roboRIO has plenty of CPU time between iterations to do real work like running PID controllers, reading sensors, and logging data. The number is hardcoded into FRC's network protocol: every team's robot runs at the same rate, on the same schedule.

---

## 5.2 The TimedRobot Template

Open `Robot.java` in your XRPExplorer project from Chapter 2. If you didn't keep that project around, create a fresh one now: `WPILib: Create a new project`, **Template** > **Java** > **XRP - TimedRobot**, name it `XRPExplorer` again.

You should see something like this:

```java
package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;

public class Robot extends TimedRobot {

    @Override
    public void robotInit() {
        // Called once when the robot program starts
    }

    @Override
    public void robotPeriodic() {
        // Called every 20ms regardless of mode
    }

    @Override
    public void autonomousInit() {
        // Called once when autonomous starts
    }

    @Override
    public void autonomousPeriodic() {
        // Called every 20ms during autonomous
    }

    @Override
    public void teleopInit() {
        // Called once when teleop starts
    }

    @Override
    public void teleopPeriodic() {
        // Called every 20ms during teleop
    }
}
```

This is the **TimedRobot template**, the foundation of every robot program in this book. It looks small, and most of it looks empty, but every single line is doing real work. Let's go through it slowly.

---

## 5.3 Reading the Template Line by Line

Read this section as if you were reading aloud to a teammate. Saying each piece in plain English is the fastest way to lock the structure into your head.

### `package frc.robot;`

Java organizes code into **packages**, which are essentially named folders. Every file in the WPILib project template lives in the `frc.robot` package. You don't need to think much about packages right now: just know that this line says "this file is part of the robot package."

### `import edu.wpi.first.wpilibj.TimedRobot;`

This line pulls in the **TimedRobot** class from WPILib so that we can use it in this file. Every WPILib class you use, motor controllers, sensors, dashboards, controllers, will need an import statement at the top of the file. VS Code will usually add these automatically when you start typing a class name.

### `public class Robot extends TimedRobot {`

This is the most important line in the whole template, and it deserves its own paragraph.

`public class Robot` declares a Java class named `Robot`. We talked briefly about classes in Chapter 4: they're the blueprints that Java uses to organize code. We'll go much deeper into classes in Chapter 7.

The interesting part is `extends TimedRobot`. In Java, when one class extends another, it inherits all of that class's behavior. WPILib's `TimedRobot` class already knows how to talk to the Driver Station, how to detect mode changes, how to schedule the 50 Hz loop, and a hundred other things. By writing `extends TimedRobot`, we're saying: "Our Robot class is a TimedRobot. Give us all of that built-in behavior for free."

This is why your robot program "just works" without you writing any networking code. WPILib already wrote all of that for you, and your `Robot` class inherits it.

> **Inheritance, in one sentence**
>
> `extends TimedRobot` means: "everything TimedRobot can do, my class can do too, and I can add my own behavior on top." We'll come back to this idea formally in Chapter 7. For now, just trust that `extends TimedRobot` gives you all the FRC plumbing for free.

### `@Override`

Each method has `@Override` written on the line above it. This is a Java **annotation**: a hint to the compiler. It says: "I'm rewriting a method that already exists in TimedRobot."

If you misspell the method name (say, `robotInIt` instead of `robotInit`), the `@Override` annotation will catch it and the compiler will refuse to build. Without `@Override`, your typo would compile cleanly, and your robot would silently never call the method. That bug is unbelievably annoying to find. Always keep `@Override`.

### `public void robotInit()`

`public` means this method can be called from outside the class. `void` means it doesn't return anything. `robotInit` is the method name. The empty parentheses mean it takes no arguments.

`robotInit()` runs **exactly once**, the moment the robot program starts up. This is the place to do one-time setup: creating motor objects, configuring sensors, initializing the dashboard. Anything that should happen once and stay set up for the rest of the program goes here.

### `public void robotPeriodic()`

`robotPeriodic()` runs **every 20 milliseconds**, regardless of what mode the robot is in. Disabled, autonomous, teleop, test: doesn't matter, this method gets called.

This is the right place for code that should always run: updating the dashboard with sensor values, running the command scheduler (you'll meet that in Section IV), logging data. Anything that's true "all the time" lives here.

### `public void autonomousInit()` and `public void autonomousPeriodic()`

`autonomousInit()` runs once, the moment the robot enters autonomous mode. `autonomousPeriodic()` runs every 20 milliseconds while autonomous is active.

This pair is the autonomous mode's heart. `Init` is for setup specific to autonomous: resetting timers, picking which routine to run, zeroing encoders. `Periodic` is for the actual autonomous logic: drive forward until you hit a target, turn, drive again, stop.

### `public void teleopInit()` and `public void teleopPeriodic()`

The same idea, for teleop. `teleopInit()` runs once when teleop starts. `teleopPeriodic()` runs every 20 milliseconds during the driver-controlled period.

`teleopPeriodic()` is where most of your driver-facing code will live: read joystick inputs, calculate motor outputs, send commands to mechanisms. Every iteration, fifty times a second.

---

## 5.4 The Full Mode Lifecycle

The template you just read shows three of the robot's modes: disabled (kind of), autonomous, and teleop. There are actually five modes in FRC:

| Mode | When It Runs | Periodic Method |
| --- | --- | --- |
| **Disabled** | Robot is on but cannot move (safety state) | `disabledPeriodic()` |
| **Autonomous** | First 15 seconds of a match | `autonomousPeriodic()` |
| **Teleop** | Driver-controlled period of a match | `teleopPeriodic()` |
| **Test** | A custom mode for testing mechanisms | `testPeriodic()` |
| **Simulation** | When running in the WPILib simulator | `simulationPeriodic()` |

Each mode also has an `Init` method that fires once when the robot enters that mode. The default template only shows the most common ones, but you can add the others by overriding their methods.

Here's the lifecycle of a typical match, in order:

1. **Robot turns on** → `robotInit()` runs once
2. **Driver Station connects, robot is disabled** → `disabledInit()` runs once, then `disabledPeriodic()` and `robotPeriodic()` run every 20 ms
3. **Match starts, autonomous begins** → `autonomousInit()` runs once, then `autonomousPeriodic()` and `robotPeriodic()` run every 20 ms for 15 seconds
4. **Autonomous ends, teleop begins** → `teleopInit()` runs once, then `teleopPeriodic()` and `robotPeriodic()` run every 20 ms for 2 minutes 15 seconds
5. **Match ends, robot is disabled again** → `disabledInit()` runs once, then `disabledPeriodic()` and `robotPeriodic()` resume

Notice that `robotPeriodic()` runs in **every** mode. It's the universal heartbeat.

> **A common beginner mistake**
>
> A surprising number of bugs come from putting code in the wrong method. Two examples I see every season:
>
> 1. Creating motor objects inside `robotPeriodic()`. This creates a brand new motor object 50 times per second and breaks badly. Motors should be created once, in `robotInit()`.
> 2. Putting `drivetrain.drive(joystick.getY(), joystick.getX())` inside `robotInit()`. The robot reads the joystick exactly once at startup and then never again. The drivetrain code belongs in `teleopPeriodic()`.
>
> The rule of thumb: **Init methods are for "do this once." Periodic methods are for "do this every loop."**

---

## 5.5 Init vs Periodic, Side by Side

This is worth seeing in code. Suppose you wanted to print "Robot started!" once when the robot turns on, and then print the current time on every loop. Here's how it looks:

```java
package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;

public class Robot extends TimedRobot {

    @Override
    public void robotInit() {
        // Runs ONCE at startup
        System.out.println("Robot started!");
    }

    @Override
    public void robotPeriodic() {
        // Runs EVERY 20 ms
        SmartDashboard.putNumber("Time", Timer.getFPGATimestamp());
    }
}
```

If you deploy this and watch SmartDashboard, the `Time` value will tick upward smoothly. If you watch the **RioLog** (we'll set that up in Chapter 10) or the Driver Station log, you'll see "Robot started!" appear exactly once, when the program first runs.

`Timer.getFPGATimestamp()` returns the number of seconds since the robot was powered on. We'll use that timer constantly throughout the rest of the book.

---

## 5.6 Building the XRP Explorer Skeleton

Time to put this knowledge to work. You're going to set up the XRP Explorer project skeleton, which is the foundation we'll add to in every chapter from here through Chapter 25.

The Explorer is a robot that, by Chapter 25, will navigate an autonomous obstacle course on its own: drive a measured distance, turn to a heading, follow a line, stop at a target. We won't build any of that yet. We're just laying the groundwork.

### Step 1: Confirm Your Project Exists

If you still have your `XRPExplorer` project from Chapter 2, open it now. If not, create a fresh one (see Section 5.2 for a refresher).

### Step 2: Set Up the Mode Skeleton

Open `Robot.java` and replace its contents with the following code. Read every line as you type it. Don't paste blindly: typing it teaches your fingers the structure.

```java
package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;

public class Robot extends TimedRobot {

    @Override
    public void robotInit() {
        System.out.println("XRP Explorer started!");
        SmartDashboard.putString("Mode", "robotInit");
    }

    @Override
    public void robotPeriodic() {
        // No mode print here, this runs in every mode
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
    }

    @Override
    public void autonomousPeriodic() {}

    @Override
    public void teleopInit() {
        SmartDashboard.putString("Mode", "Teleop");
    }

    @Override
    public void teleopPeriodic() {}

    @Override
    public void testInit() {
        SmartDashboard.putString("Mode", "Test");
    }

    @Override
    public void testPeriodic() {}
}
```

This is your **mode skeleton**. It does almost nothing on purpose. The only thing it does is announce its current mode to SmartDashboard so you can watch the lifecycle play out in real time.

### Step 3: Build and Deploy

Build the project (`WPILib: Build Robot Code`), confirm `BUILD SUCCESSFUL`, then deploy (`WPILib: Deploy Robot Code`). If you get stuck, Chapter 2 has the full deploy walkthrough.

### Step 4: Watch the Mode Change

Open SmartDashboard (`WPILib: Start Tool` > `SmartDashboard`) and the Driver Station. You should see a `Mode` widget appear with the value `Disabled`.

Now, in the Driver Station:

1. Click the **Autonomous** radio button, then click **Enable**. The Mode widget should change to `Autonomous`.
2. Click **Disable**, then switch to **Teleoperated**, then click **Enable**. The Mode widget should change to `Teleop`.
3. Click **Disable**. The Mode widget should change back to `Disabled`.

You're watching `disabledInit()`, `autonomousInit()`, and `teleopInit()` fire in real time. Each transition triggers exactly one `Init` call, and the `Periodic` methods are running quietly between them at 50 Hz.

If the Mode widget doesn't update when you change modes, double-check that:

- Your laptop is still connected to the XRP's Wi-Fi
- The Driver Station shows green for Communications, Robot Code, and Joysticks
- The deploy actually succeeded (re-deploy if you're not sure)

> **You just verified the lifecycle**
>
> If you saw the Mode widget switch between Disabled, Autonomous, and Teleop, you have empirically confirmed every claim in Sections 5.4 and 5.5. The robot really does call different `Init` methods at different times. WPILib really does manage the lifecycle for you. The template really is doing the work it advertised.
>
> This kind of small experiment is one of the best ways to learn a new system. Whenever a chapter claims something happens "automatically" or "in the background," you can usually verify it with a one-line dashboard print. Make a habit of it.

---

## 5.7 Why This Structure Exists at All

Take a step back for a moment. Why does WPILib force you into this structure? Why not just give you a `main()` method like a normal Java program and let you write whatever loop you want?

The answer is **safety and consistency**.

In a normal program, if your code hangs or crashes, the worst case is a frozen window. In a robot program, if your code hangs while a motor is running, the motor keeps running. That's how hardware breaks, and how people get hurt.

The TimedRobot template enforces a structure that WPILib can monitor. If your `teleopPeriodic()` takes too long to execute, WPILib will print warnings. If your code throws an exception, WPILib catches it and stops the motors. If the Driver Station disconnects, WPILib disables the robot automatically. None of that would be possible if your code were a free-form loop.

The structure is also a contract between programmers. Every FRC robot program in the world has the same basic shape: `robotInit`, the periodic methods, the mode transitions. When you join a new team, or read another team's code on GitHub, or get help on Chief Delphi, you can skip the "where do I start reading?" step. You already know.

> **Frameworks vs. libraries**
>
> WPILib is technically a **framework**, not just a library. The difference: with a library, **you call its code**. With a framework, **it calls your code**. WPILib decides when to call `teleopPeriodic()`. You don't.
>
> This is sometimes called the **Hollywood Principle**: "Don't call us, we'll call you." It's a common pattern in any system that needs to manage a complex lifecycle, including web servers, game engines, and operating systems. FRC is one example among many.

---

## Chapter Summary

> **What you learned in Chapter 5**
>
> * The TimedRobot template gives every FRC program the same structure: an `Init` method (runs once) and a `Periodic` method (runs every 20 ms) for each mode
> * The five robot modes are Disabled, Autonomous, Teleop, Test, and Simulation. `robotPeriodic()` runs in all of them
> * `extends TimedRobot` is how your `Robot` class inherits all of WPILib's lifecycle, networking, and safety machinery
> * `@Override` annotations protect you from typos by forcing the compiler to check that you're really replacing a method that exists in TimedRobot
> * The rule of thumb: **Init methods are for one-time setup. Periodic methods are for code that runs every loop.**
> * The XRP Explorer project skeleton uses dashboard prints in each `Init` to verify the mode lifecycle works exactly as advertised

---

## Exercises

### Reflect

Sit down with a teammate, partner, or someone who can listen patiently. Open `Robot.java` from your XRP Explorer project and read the entire file aloud, line by line, **explaining every line in plain English**. Not "this is a method." Plain English: "This line tells Java to import a class called TimedRobot from WPILib, so I can use it below."

If you hit a line you can't explain, mark it. After you finish, look up the answer (this chapter, the WPILib docs, or Chief Delphi) and write the explanation as a code comment. The goal is to leave no unexplained line behind.

This exercise feels slow. It is. The students who do it once seriously almost never have to do it again, because they actually understand what they're looking at.

### Build

Continue building the XRP Explorer skeleton from Section 5.6.

1. Verify that the `Mode` widget on SmartDashboard correctly reflects each mode change in the Driver Station
2. Add a second SmartDashboard string called `LastInitTime` that records `Timer.getFPGATimestamp()` inside each `Init` method (you'll need to import `Timer`). Watch how the value updates every time you change modes
3. Add a `disabledPeriodic()` print of the current uptime, just to confirm it really does keep ticking while the robot is disabled

After all three changes, build, deploy, and verify on the dashboard. You should be able to switch modes and see both the mode name and the last-init timestamp update in real time.

### Practice

Without looking at this chapter, on a blank piece of paper or in a text file, write out the empty TimedRobot template from memory. Include:

- The package and import lines
- The class declaration with `extends TimedRobot`
- All six methods you saw in Section 5.2 (`robotInit`, `robotPeriodic`, `autonomousInit`, `autonomousPeriodic`, `teleopInit`, `teleopPeriodic`)
- The `@Override` annotations

Compare to the original. What did you forget? Curly braces? Semicolons? `@Override`? Whatever you missed is worth re-reading until you can write the template confidently. You'll be re-creating it from scratch many times during build season, sometimes under time pressure.

### Git

Your XRP Explorer skeleton is a real project now, time to commit it. From the integrated terminal in VS Code:

```bash
cd path/to/XRPExplorer
git add .
git commit -m "Ch5: XRP Explorer skeleton with mode dashboard prints"
```

If you set up a remote in Chapter 2, push:

```bash
git push
```

If your class uses GitHub Classroom, this is the chapter to make sure your assignment repo is set up and your push went through. Confirm on GitHub.com that your commit appears, then submit your repo link via the Classroom assignment for Chapter 5.

This is the first commit that contains your own design decisions, not just template code. From here forward, every chapter will add to this repository. Treat it like the start of something real, because it is.

---

> **Additional Resources**
>
> * **WPILib TimedRobot reference**: [docs.wpilib.org/en/stable/docs/software/convenience-features/timed-robot.html](https://docs.wpilib.org/en/stable/docs/software/convenience-features/timed-robot.html) the official explanation of the TimedRobot lifecycle, with timing diagrams
> * **WPILib Robot Program structure**: [docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html) walks through every file in a generated WPILib project
> * **Java packages and imports**: [docs.oracle.com/javase/tutorial/java/package](https://docs.oracle.com/javase/tutorial/java/package/index.html) the official Java tutorial on packages, if you want a deeper dive into what `package frc.robot;` actually means
> * **Java inheritance and `extends`**: [docs.oracle.com/javase/tutorial/java/IandI/subclasses.html](https://docs.oracle.com/javase/tutorial/java/IandI/subclasses.html) a clear walkthrough of inheritance, the concept behind `extends TimedRobot`
> * **The Hollywood Principle**: [en.wikipedia.org/wiki/Hollywood_principle](https://en.wikipedia.org/wiki/Hollywood_principle) short explanation of "don't call us, we'll call you," the framework design pattern WPILib uses

---

*Next up, Chapter 6: Conditionals, Loops, and Methods. We'll fill out the periodic methods you just created with real Java logic, `if` statements, `for` loops, helper methods, and use them all to make the XRP do something interesting on command.*