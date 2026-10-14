# Chapter 7: Classes, Objects, and the XRP Hardware Layer

In Chapter 5 you built the XRP Explorer's mode skeleton. In Chapter 6 you filled those periodic methods with real logic: conditionals, loops, and helper methods that made the robot decide and repeat. Everything you wrote lived in one file, `Robot.java`, and that was fine while the robot did almost nothing.

It will not stay fine. A real robot is not one thing; it is many things bolted together: a drivetrain, an arm, an intake, a shooter, a climber. Each has its own motors, its own sensors, its own behavior. If all of that code lives in `Robot.java`, the file becomes a thousand-line junk drawer that nobody can read, least of all you in three weeks.

This chapter is the fix. You are going to learn **classes** and **objects**, the single most important organizing idea in Java, and then use them to build your first real piece of the Explorer: a `Drivetrain` class that owns the XRP's two motors and knows how to drive. By the end, the XRP will move under a method you wrote, and `Robot.java` will stay clean.

We spend the first half on the concepts, slowly, because they are the foundation for every chapter that follows. Take your time with them.

---

## 7.1 Why Classes? The `Robot.java` Problem

Imagine you kept piling everything into `Robot.java` the way we have so far. By the time the Explorer can drive, sense, and run autonomous routines, the `Robot()` constructor alone might look like this:

```java
public Robot() {
    leftMotor = new XRPMotor(0);
    rightMotor = new XRPMotor(1);
    rightMotor.setInverted(true);
    gyro = new XRPGyro();
    rangefinder = new XRPRangefinder();
    lineSensor = new XRPReflectanceSensor();
    // ... and twenty more lines
}
```

And `teleopPeriodic()` would be a wall of motor math, sensor reads, and dashboard prints all mixed together. Which lines belong to the drivetrain? Which belong to the arm? You cannot tell by looking. Everything is in one pile.

Here is the deeper problem. The two motors and the drive logic are not really separate things that happen to share a file. They are **one** thing: the drivetrain. It would be nice if the code said so.

That is what a class does. A class lets you take a group of related data (the motors) and the behavior that acts on it (drive, stop) and wrap them into a single named unit. Then `Robot.java` can just say `drivetrain.arcadeDrive(...)` and not care how the drivetrain works inside.

> **The junk drawer test**
>
> A good sign your code wants a class: you catch yourself writing a comment like `// drivetrain stuff` to fence off one region of a file from another. That comment is telling you the "stuff" wants to be its own class. Comments describe groupings; classes enforce them.

Think of a class as a CAD drawing and an object as the fabricated part. The drawing is not the part. It is the plan for making parts. From one drawing your team can machine ten identical brackets. From one class your program can create ten identical objects. Hold on to that picture; we build on it for the rest of the chapter.

---

## 7.2 Classes vs Objects: One Blueprint, Many Things

Two words, used constantly, easy to blur together. Let us pin them down.

A **class** is a blueprint. It describes what something is made of and what it can do, but it is not itself a usable thing. Writing a class is like drawing the plans for a wheel: dimensions, material, bolt pattern. You cannot roll a drawing across the floor.

An **object** is a real thing built from that blueprint. You create one with the keyword `new`. Writing `new Wheel()` is like handing the drawing to the machine shop and getting back an actual wheel you can bolt on.

You have already met this idea without the vocabulary. Back in Chapter 5:

```java
public class Robot extends TimedRobot { ... }
```

`Robot` is a class. WPILib builds one object from it when your program starts. You never wrote `new Robot()` yourself; WPILib did it behind the scenes.

Here is the idea that unlocks everything: **one class can make many objects, and each one is independent.** The XRP has two motors, and you create them like this:

```java
XRPMotor leftMotor = new XRPMotor(0);
XRPMotor rightMotor = new XRPMotor(1);
```

One class, `XRPMotor`. Two objects, `leftMotor` and `rightMotor`. They share the same blueprint (both know how to spin), but they are separate parts wired to separate channels. Telling the left motor to spin does nothing to the right one, exactly like two real motors on a real robot.

> **Class vs object, in one sentence**
>
> A class is the blueprint; an object is a thing built from it with `new`. One blueprint, many things.

You will create objects constantly from here on: motors, sensors, timers, controllers, commands. Every one of them is `new SomeClass(...)`, producing an object you then talk to.

---

## 7.3 State and Behavior: Fields and Methods

A class describes two things about its objects: what they know, and what they can do.

- What an object **knows** is stored in **fields** (sometimes called instance variables). Fields are the object's state.
- What an object **can do** is written as **methods**. Methods are the object's behavior.

Let us build a tiny class that has nothing to do with robots, so the syntax is the only new thing. A scorekeeper that tracks points:

```java
public class ScoreKeeper {

    // A field: each ScoreKeeper remembers its own score.
    private int points = 0;

    // A method: behavior that changes the state.
    public void addPoints(int amount) {
        points = points + amount;
    }

    // A method that reports the state.
    public int getPoints() {
        return points;
    }
}
```

`points` is a field: a piece of data that lives inside the object. `addPoints` and `getPoints` are methods: things the object can do. Notice `addPoints` changes `points`, and `getPoints` hands it back. The methods act on the field.

Now the important part. Create two scorekeepers and watch them stay independent:

```java
ScoreKeeper red = new ScoreKeeper();
ScoreKeeper blue = new ScoreKeeper();

red.addPoints(5);
red.addPoints(3);
blue.addPoints(10);

System.out.println(red.getPoints());   // prints 8
System.out.println(blue.getPoints());  // prints 10
```

Two objects from one class, each with its **own** `points`. Adding to `red` never touched `blue`. This is the whole reason objects are useful: each one carries its own state, so you can have many of them without their data getting tangled.

> **Every object gets its own copy of the fields**
>
> When you write `new ScoreKeeper()`, Java sets aside fresh memory for that object's fields. Ten scorekeepers means ten separate `points` values. The class is written once; the state is stored per object. This is exactly why two `XRPMotor` objects can spin at different speeds at the same time.

The dot you keep seeing, as in `red.addPoints(5)`, means "call the `addPoints` method on the `red` object." The object goes on the left of the dot; the thing you want it to do goes on the right. You have used this since Chapter 4, every time you wrote `SmartDashboard.putNumber(...)`. Now you know what the dot means.

---

## 7.4 Constructors and `this`: How Objects Are Born

When you write `new XRPMotor(0)`, what does the `0` do? It gets handed to a special method called the **constructor**.

A constructor runs once, at the moment an object is created, and its job is to set the object up. It has the same name as the class and no return type. If you do not write one, Java gives you an empty one for free. That is why `new ScoreKeeper()` worked above without us writing a constructor.

Most of the time you want a constructor so you can configure each object as it is born. Here is a `Wheel` class where each wheel remembers which channel it is wired to:

```java
public class Wheel {

    private int channel;

    // Constructor: runs when you write new Wheel(...)
    public Wheel(int channel) {
        this.channel = channel;
    }

    public int getChannel() {
        return channel;
    }
}
```

Create two wheels, each configured differently by its constructor:

```java
Wheel left = new Wheel(0);
Wheel right = new Wheel(1);
```

Now look at that line inside the constructor:

```java
this.channel = channel;
```

There are two things named `channel` in scope here: the field (`channel`, belonging to the object) and the parameter (`channel`, the value passed in). Java needs to know which is which. **`this`** means "the object I am part of," so `this.channel` is the field, and plain `channel` is the parameter. The line reads: "store the passed-in channel into this object's channel field."

You do not always need `this`. It is required only when a parameter and a field share a name, which is a common and perfectly good style. When in doubt, `this.field` is never wrong.

> **`new Thing(...)` runs the constructor**
>
> The arguments in the parentheses are the constructor's parameters. `new XRPMotor(0)` calls XRPMotor's constructor with `0`, which tells that motor object it lives on device channel 0. Every `new` you have ever written ran a constructor, even the empty ones.
>
> You have also been writing a constructor since Chapter 4: `public Robot()` in `Robot.java`. It has the class's name and no return type, and it runs once when WPILib creates your robot object at startup. That is exactly why it is the right place for one-time setup.

---

## 7.5 Encapsulation: `private` vs `public`

Look back at the `Wheel` class. The field was declared `private`, but the methods were `public`. That was deliberate, and it is one of the most valuable habits in programming. It has a name: **encapsulation**.

- `private` means "only code inside this class can touch this." Outsiders cannot read or change it directly.
- `public` means "anyone can use this."

The pattern is: **make fields private, and expose behavior through public methods.** Hide the data; publish the actions.

Why bother? Because it lets a class protect itself. Compare two versions of `ScoreKeeper`. The unprotected version:

```java
public int points = 0;   // public field
```

Now any code anywhere can write `red.points = -999;` and drop the object into a nonsense state. Nothing stops it.

The encapsulated version keeps `points` private and only allows changes through a method that enforces the rules:

```java
private int points = 0;

public void addPoints(int amount) {
    if (amount < 0) {
        return;   // refuse to subtract; scores only go up
    }
    points = points + amount;
}
```

Now the rule lives in one place, and the object can enforce it. Nobody can reach in and break it.

There is a second payoff, and it is the one that matters most for robot code. When the internals are private, **you can change them without breaking anyone else's code.** As long as the public methods keep the same names and behavior, the rest of the program never notices what you changed inside.

> **The encapsulation payoff for robots**
>
> Suppose your whole program drives by calling `drivetrain.arcadeDrive(forward, turn)`. If the motors are private inside the `Drivetrain` class, then the day you rewire the robot, swap motor types, or flip which side is inverted, you edit exactly one file: `Drivetrain.java`. Every other file keeps calling `arcadeDrive` and keeps working. Without encapsulation, a wiring change means hunting down every raw `motor.set(...)` call in the whole codebase. Encapsulation turns a fifty-file edit into a one-file edit.

Keep this in mind for the next few sections, because it is the entire reason we are about to wrap the XRP's motors in a class instead of using them directly.

---

## 7.6 The XRP Hardware Layer

Everything so far has been general Java. Now we point it at the robot.

A **hardware layer** is a set of classes whose only job is to stand between your robot's logic and the physical hardware. Instead of the rest of your code saying "set the motor on channel 0 to 0.5," it says "drive forward." The hardware layer translates intent into wiring.

The XRP gives you the raw pieces. Its two drive motors are represented by the `XRPMotor` class, and they live on fixed channels:

- Left motor: channel 0
- Right motor: channel 1

You could command them directly:

```java
leftMotor.set(0.5);
rightMotor.set(0.5);
```

`set` takes a number from `-1.0` (full reverse) to `1.0` (full forward), where `0.0` is stopped. But driving a robot by setting each motor by hand gets old fast. To turn, you need different speeds on each side, and doing that arithmetic everywhere you want to drive is exactly the kind of scattered, repeated code that encapsulation is meant to prevent.

> **What does `-1.0` to `1.0` actually mean?**
>
> That number is not a real-world speed. It is a fraction of the power available to the motor, delivered as a PWM (pulse-width modulation) signal by the motor controller. `0.5` means roughly "half power," not "half a meter per second." How far and how fast the robot actually moves for a given command depends on the battery charge, the robot's weight, friction, and the gear ratio. Turning a command like `0.5` into a repeatable, real-world speed or distance is a topic of its own: you measure the relationship (SysId characterization, Ch 16) and correct with feedback (PID, Ch 15). For now, know that `set` commands power, and precise motion is something you will learn to control later.

WPILib hands you a helper built for two-sided drivetrains: the `DifferentialDrive` class. You give it the two motors, and it gives you convenient drive methods. The one we want is `arcadeDrive`:

```java
diffDrive.arcadeDrive(forward, rotation);
```

`forward` is how fast to drive straight (`-1.0` to `1.0`), and `rotation` is how hard to turn (`-1.0` to `1.0`, positive turns right). `DifferentialDrive` does the left-versus-right math for you. It is called "arcade" because it feels like an arcade racing game: one input for speed, one for steering.

Our plan: build a small `Drivetrain` class that owns the two `XRPMotor` objects and a `DifferentialDrive`, keeps them private, and exposes exactly two public actions, `arcadeDrive` and `stop`. That is the hardware layer for the Explorer's drive.

> **Why not use `DifferentialDrive` directly in `Robot.java`?**
>
> We could. But then `Robot.java` would hold the motors, the inversion setting, and the drive object, and every future drive detail would pile up there too. Wrapping it in our own `Drivetrain` class gives us one obvious home for everything about driving, and it is the exact shape we will formalize as a "subsystem" in Chapter 19. We are building the good habit early.

---

## 7.7 Building the `Drivetrain` Class

Time to write it. In VS Code, create a new file next to `Robot.java`, in the same `frc.robot` folder, named `Drivetrain.java`. Type the following. As always, type it, do not paste; the point is to feel the structure.

```java
package frc.robot;

import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj.xrp.XRPMotor;

public class Drivetrain {

    // The two drive motors. Private: nothing outside this class touches them.
    private final XRPMotor leftMotor = new XRPMotor(0);
    private final XRPMotor rightMotor = new XRPMotor(1);

    // WPILib's helper that turns "forward + turn" into left/right speeds.
    private final DifferentialDrive diffDrive =
        new DifferentialDrive(leftMotor::set, rightMotor::set);

    public Drivetrain() {
        // The two motors face opposite ways on the chassis, so the same
        // positive power spins them in opposite directions. Inverting one side
        // makes "positive = forward" true for both. You will confirm which side
        // needs this in the Build exercise.
        rightMotor.setInverted(true);
    }

    /** Drive the robot. forward and rotation are each -1.0 to 1.0. */
    public void arcadeDrive(double forward, double rotation) {
        diffDrive.arcadeDrive(forward, rotation);
    }

    /** Stop both motors. */
    public void stop() {
        diffDrive.arcadeDrive(0.0, 0.0);
    }
}
```

Walk through it with the vocabulary you just learned:

- **Class.** `public class Drivetrain` is the blueprint. When `Robot.java` writes `new Drivetrain()`, it gets one object built from this plan.
- **Fields.** `leftMotor`, `rightMotor`, and `diffDrive` are fields: the state each `Drivetrain` object owns. They are `private`, so they are invisible outside this class. They are also `final`, meaning "assigned once and never reassigned," a good default for hardware you create at startup and keep for the whole match.
- **Field initializers.** The `= new XRPMotor(0)` on the field line creates the motor objects as the `Drivetrain` is built. Two `XRPMotor` objects from one `XRPMotor` class, on channels 0 and 1, exactly like Section 7.2.
- **Constructor.** `public Drivetrain()` runs once when the object is created. Here it does one setup job: inverting the right motor.
- **Methods.** `arcadeDrive` and `stop` are the public behavior. They are the only two things the outside world can ask a `Drivetrain` to do, and both simply forward the request to `diffDrive`. The motors stay hidden.

That is the entire hardware layer for the drive: three private fields, one constructor, two public methods. Small, focused, and it will barely change for the rest of the book.

> **What `leftMotor::set` means**
>
> That double colon is a **method reference**. `leftMotor::set` is shorthand for "the `set` method belonging to the `leftMotor` object." `DifferentialDrive` needs to know how to send a speed to each side, so we hand it the left motor's `set` method and the right motor's `set` method to call. You will see method references again; for now, just read `leftMotor::set` as "leftMotor's set method."

---

## 7.8 Wiring the Drivetrain into `Robot.java`

The `Drivetrain` class exists, but nothing creates one yet. Open `Robot.java` and connect it. Here is the file with the drivetrain wired in, starting from your Chapter 5 skeleton:

```java
package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;

public class Robot extends TimedRobot {

    // A field: the Robot owns one Drivetrain object.
    private final Drivetrain drivetrain;

    public Robot() {
        System.out.println("XRP Explorer started!");
        SmartDashboard.putString("Mode", "Starting");

        // Create the drivetrain ONCE, at startup.
        drivetrain = new Drivetrain();
    }

    @Override
    public void robotPeriodic() {}

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
    public void autonomousPeriodic() {
        drivetrain.stop();
    }

    @Override
    public void teleopInit() {
        SmartDashboard.putString("Mode", "Teleop");
    }

    @Override
    public void teleopPeriodic() {
        drivetrain.stop();
    }
}
```

Two things to notice.

First, `drivetrain` is created inside the `Robot()` constructor, not inside a periodic method. This is the Chapter 5 rule in action: objects that should exist for the whole match are created **once**, at startup. If you put `new Drivetrain()` inside `teleopPeriodic()`, you would build a brand new drivetrain fifty times a second, which is both wasteful and buggy. The field is also `final`, just like the motors inside `Drivetrain`: Java lets a constructor assign a `final` field exactly once, and refuses to compile any later attempt to replace it.

Second, both `autonomousPeriodic()` and `teleopPeriodic()` call `drivetrain.stop()`. Right now the robot has no reason to move, so the safe default is to command a stop every loop. There is a real reason to call `stop()` every loop and not just once: `DifferentialDrive` has a built-in safety timer that expects to hear from you regularly. If nothing calls a drive method for a fraction of a second, it assumes your code has hung and cuts the motors, printing a warning. Calling `stop()` each loop keeps it satisfied and keeps the robot safely still.

Build the project (`WPILib: Build Robot Code`) and confirm `BUILD SUCCESSFUL`. The robot will not move yet, and that is correct. Making it move is the Build exercise, where you will also confirm your motors are wired and inverted the right way.

> **Create once in the constructor, use in periodic**
>
> This is the same trap from Chapter 5, worth repeating because it catches everyone once. `new` belongs in the `Robot()` constructor (or in field initializers, as inside `Drivetrain`). Calls to methods like `arcadeDrive` and `stop` belong in the periodic methods. Set up once; act every loop.

---

## 7.9 Objects Are Everywhere in WPILib

Step back and notice how much of what you have used all along was objects and classes in disguise.

- `Timer.getFPGATimestamp()` from Chapter 5 calls a method on the `Timer` class.
- `SmartDashboard.putString(...)` calls a method on the `SmartDashboard` class.
- `new XRPMotor(0)` builds an object from the `XRPMotor` class.

There is one distinction worth naming, because you have now used both kinds. Some methods are called on the class itself, and some are called on an object you created.

- `SmartDashboard.putNumber("Time", 3.0)` is called on the **class**. `SmartDashboard` is capitalized because it is a class name, not an object you built. Methods like this are **static**: they belong to the class as a whole. There is only one dashboard, so you never write `new SmartDashboard()`.
- `drivetrain.arcadeDrive(0.6, 0.0)` is called on an **object** you created. There could be many drivetrains in principle, so the method belongs to a specific one. These are **instance** methods.

The rule of thumb: if the name before the dot is capitalized, it is usually a class and the method is static. If it is a lowercase variable you made with `new`, it is an object and the method is an instance method.

This matters because it unlocks the WPILib documentation. Until now, a page like the one for `DifferentialDrive` was a wall of unfamiliar words. Now you can read it: the "Constructors" section tells you what to pass to `new`, the "Methods" section lists the behaviors you can call on the object, and the types like `double` tell you what goes in and comes out. You have the vocabulary to read any class WPILib gives you.

> **Reading the docs is a skill, not a fallback**
>
> Strong FRC programmers do not memorize every WPILib class. They memorize the shape of a class (fields, constructor, methods) and then read the docs for the specifics as they need them. You just learned that shape. From here on, "look it up in the WPILib docs" is a real, usable instruction, not a dead end.

---

## Chapter Summary

> **What you learned in Chapter 7**
>
> * A **class** is a blueprint; an **object** is a thing built from it with `new`. One class can create many independent objects.
> * **Fields** hold each object's state; **methods** are its behavior. Every object gets its own copy of the fields, which is why two motors can run at different speeds.
> * A **constructor** runs once when an object is created and sets it up. `this.field` refers to the object's own field, needed when a parameter shares the field's name.
> * **Encapsulation** means private fields and public methods: hide the data, expose the actions. The payoff is that you can change a class's internals without breaking any code that uses it.
> * A **hardware layer** wraps raw hardware in classes that express intent ("drive") instead of wiring ("set channel 0"). You built the `Drivetrain` class as the Explorer's drive hardware layer.
> * WPILib is full of classes and objects. **Static** methods are called on a class (`SmartDashboard.putNumber`); **instance** methods are called on an object you created (`drivetrain.arcadeDrive`).

---

## Exercises

### Reflect

Open `Drivetrain.java` and `Robot.java` side by side. On paper, or in a comment, answer in plain English:

1. Which lines of code know that the left motor is on channel 0? (Only `Drivetrain` should.)
2. If you rewired the left motor to a different channel, how many files would you have to edit, and why?
3. Why is `arcadeDrive` public but `leftMotor` private? What could go wrong if `leftMotor` were public?

If you can answer all three clearly, you understand encapsulation better than a lot of people who have been programming for a year.

### Build (XRP Explorer)

Make the Explorer move, and use the motion to check your wiring.

1. Add a `Timer` field to `Robot.java` and import it: `private final Timer autoTimer = new Timer();` (import `edu.wpi.first.wpilibj.Timer`).
2. Change your autonomous methods to drive forward for one second, then stop:

```java
@Override
public void autonomousInit() {
    SmartDashboard.putString("Mode", "Autonomous");
    autoTimer.restart();
}

@Override
public void autonomousPeriodic() {
    if (autoTimer.get() < 1.0) {
        drivetrain.arcadeDrive(0.6, 0.0);   // forward, no turning
    } else {
        drivetrain.stop();
    }
}
```

3. Put the XRP on the floor with room ahead of it. Build, deploy, then in the Driver Station select **Autonomous** and click **Enable**.

Watch what happens and diagnose it:

- **Drives straight forward, then stops:** wiring is correct. Done.
- **Spins in place:** one side is driving backward. Change the inversion in `Drivetrain`'s constructor (invert the left motor instead of the right, or remove the inversion), redeploy, and test again.
- **Drives backward:** both sides are reversed from what you expect. Invert both, or swap which direction you call "forward."
- **Barely moves:** the XRP is fighting friction. Raise `0.6` toward `0.9` and test again.

Once it drives straight forward for one second and stops, you have a working hardware layer with verified wiring. Leave the code in place; Chapter 8 replaces the timed nudge with real driver control.

### Practice

Away from the robot, drill the concepts from Sections 7.2 through 7.4. In a scratch file, write a class called `Battery` with:

- a private field `voltage` (a `double`),
- a constructor that takes a starting voltage and stores it with `this.voltage = ...`,
- a public method `drain(double amount)` that lowers the voltage but never below `0.0`,
- a public method `getVoltage()` that returns the current voltage.

Then create **two** `Battery` objects with different starting voltages, drain them by different amounts, and print both voltages to prove each object keeps its own state. If both batteries end up reading the same value, you accidentally shared state somewhere; find out why.

### Git

Your `Drivetrain` is a real addition to the Explorer. Commit it. From the integrated terminal in VS Code:

```bash
cd path/to/XRPExplorer
git add .
git commit -m "Ch7: Drivetrain hardware layer with arcadeDrive"
git push
```

Confirm the new `Drivetrain.java` file appears in your commit on GitHub. From here on, most chapters add a class or two, and your repository is starting to look like a real robot project.

---

> **Additional Resources**
>
> * **WPILib XRP guide**: [docs.wpilib.org/en/stable/docs/xrp-robot/index.html](https://docs.wpilib.org/en/stable/docs/xrp-robot/index.html) the official setup and programming guide for the XRP, including the motor channels
> * **WPILib drivetrain classes**: [docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/wpi-drive-classes.html](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/wpi-drive-classes.html) explains `arcadeDrive`, `tankDrive`, and the `DifferentialDrive` helper
> * **Java classes and objects**: [docs.oracle.com/javase/tutorial/java/javaOO/classes.html](https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html) the official tutorial on defining classes, fields, and methods
> * **Java constructors**: [docs.oracle.com/javase/tutorial/java/javaOO/constructors.html](https://docs.oracle.com/javase/tutorial/java/javaOO/constructors.html) a focused walkthrough of constructors and how `this` works
> * **Controlling access with `private` and `public`**: [docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html](https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html) the official guide to access control, the mechanism behind encapsulation

---

*Next up, Chapter 8: Controller Input and Teleop Drive. You will connect a game controller to the `arcadeDrive` method you just built and drive the XRP around in real time, reading the joysticks fifty times a second.*
