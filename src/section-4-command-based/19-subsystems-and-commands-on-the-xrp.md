# Chapter 19: Subsystems and Commands on the XRP

In Chapter 18 you met the head chef. You started WPILib's command scheduler in `robotPeriodic()`, gave it one small job (the `Auto Light` command that keeps the LED on while autonomous runs), and watched it clean up after itself when you disabled the robot in the middle of the course. Then you sat down with `reflections.md` and wrote a plan: a table of every action the Explorer can take, which part of the robot each one needs, and when each one is finished.

This chapter turns that plan into code. `Drivetrain` becomes a real WPILib **subsystem**. The turn, the drive to a distance, and the drive to the line each become a **command class** of their own, written once and used everywhere. Driving with the sticks becomes the drivetrain's **default command**, so the scheduler, not `teleopPeriodic()`, decides who drives. By the end, `teleopPeriodic()` will be empty, the "Remembered from loop to loop" group in `Robot.java` will shrink from nine fields to three, and the disabled-in-the-middle bug from Section 18.1 will be impossible to write.

On the Java side, you will learn two things that every multi-file robot project needs. The first is **packages**: how to sort your files into folders, and how Java finds a class that lives in a different folder. The second is the rest of the inheritance story that Chapter 5 started: **abstract classes**, and what your class gets for free when it `extends` one.

This is a big refactor, and it is honest to say so. You will touch every file in the project. To keep it safe, the chapter stops twice to check that the robot still drives exactly as it did before. A refactor that changes behavior is a bug, so you will commit at each of those safe places.

You will need your XRP for both checks and for the Build exercise.

---

## 19.1 From Plan to Code

Open `reflections.md` and find the plan table from the Chapter 18 Build exercise. Yours will be worded differently, but it should hold roughly the same rows as this one:

| Subsystem | Commands that require it | Finished when |
|---|---|---|
| `Drivetrain` | Drive leg 1 (0.5 m, holding the heading) | The distance PID is at its setpoint |
| `Drivetrain` | Turn left to heading 90 | The heading PID is at its setpoint |
| `Drivetrain` | Drive until the line | Either sensor sees tape, or 1.0 m |
| `Drivetrain` | Stop and stay stopped after the course | Never (until autonomous ends) |
| `Drivetrain` | Drive with the sticks | Never |
| `Drivetrain` | Bench: A home, B turn to 90, X drive out | At the target |
| `Drivetrain` | Bench: left bumper cruise | Never (until you let go) |
| `Drivetrain` | SysId: four tests on the D-pad | You let go, or a safety net |
| The LED | Auto Light | Autonomous reaches `STEP_DONE` |
| (none) | Y: reset the pose | Instantly |

Read down the middle column and you will notice something: most rows say the **same kind of thing** with different numbers. "Turn to heading 90" on the bench and "turn left to heading 90" in autonomous are the same action. "Drive out 0.30 m" and "drive leg 1, 0.5 m" are the same action. That is Section 18.2's second growing pain, the same action written more than once, and this table is the cure. Each **kind** of action becomes one command class, and each row becomes one **object** of that class, with its own numbers.

Here is the plan for the Explorer, sorted that way:

| Command class (one file each) | What it does | Rows it covers |
|---|---|---|
| `TurnToHeading` | Turns in place until the gyro reads a heading | Autonomous turn, bench A and B |
| `DriveDistance` | Drives straight for a distance, holding its heading | Leg 1, bench X, and a new bench button to drive back |
| `DriveUntilLine` | Drives ahead until a sensor sees tape | Leg 2 |
| `DriveWithSticks` | Arcade drive with every Chapter 8 to 11 rule | Driving with the sticks |

The small rows (stop and stay stopped, the cruise, the SysId tests) do not need classes of their own. You will build them from lambdas with the `Commands` factories you met in Chapter 18, and for SysId, WPILib has a ready-made tool.

### Three decisions

A plan always leaves a few questions open. Here are the three this chapter settles.

**`Sensors` is not a subsystem.** Chapter 18 left this one open. A subsystem is something a command needs to **control**, so that two commands cannot fight over it. Nobody fights over a rangefinder: the wall stop and the line finder can both read sensors at the same moment, and neither changes anything. So `Sensors` stays a plain class. Commands that need it are handed it, read it, and never "require" it.

**The LED stays as it is, for now.** `Auto Light` turns the LED on and off, so in a bigger program the LED would be a subsystem, to stop two commands from fighting over it. Today only one command touches it. Practice 5 makes the LED a subsystem, and asks what changes.

**The Y button stays in `robotPeriodic()`.** Resetting the pose is instant and works even while disabled, which is not how commands behave. Chapter 20 is about tying buttons to commands, and it handles Y properly.

> **One noun, many verbs**
>
> Look at how lopsided the plan is: one subsystem, and every command needs it. That is normal for a drivetrain. On a competition robot (Chapter 34), the drivetrain still has the most commands, but an arm, an intake, and a shooter each bring their own, and then the one-command-per-subsystem rule starts letting commands run **side by side**: the drivetrain drives while the intake runs, because they require different subsystems.

---

## 19.2 New Java: Packages, Folders for Your Code

Count the Java files in your project's `src/main/java/frc/robot` folder. After Chapter 17, there are seven: `Main`, `Robot`, `Sensors`, `Drivetrain`, `DrivetrainIO`, `DrivetrainIOXRP`, and `DrivetrainIOSim`. This chapter adds four command files, which makes eleven, all in one folder. By the end of Section VI, the Mini Swerve will have more than forty.

Think about the parts bins in your team's shop. If every screw, nut, bearing, and zip tie went into one big box, you could still find things, slowly, by digging. Nobody runs a shop that way. You sort them into bins and label the bins. Java's version of a labeled bin is called a **package**.

### You have been using packages since Chapter 4

Look at the top of `Robot.java`:

```java
package frc.robot;

import edu.wpi.first.wpilibj.XboxController;
import edu.wpi.first.wpilibj2.command.Command;
```

The first line says which package `Robot` lives in: `frc.robot`. Each `import` line names a class in **another** package. `XboxController` lives in the package `edu.wpi.first.wpilibj`, and `Command` lives in `edu.wpi.first.wpilibj2.command`. You have typed dozens of these lines without thinking about them. Here is what they mean.

- **A package is a folder.** The dots in the name are folder separators. `frc.robot` is the folder `frc/robot`, and that is exactly where `Robot.java` lives: `src/main/java/frc/robot/Robot.java`. The name and the folder **must** match.
- **A class's full name includes its package.** The real name of `Command` is `edu.wpi.first.wpilibj2.command.Command`. That is called its **fully qualified name**. Two teams can both write a class called `Drivetrain`, and Java can tell them apart by their packages.
- **An `import` is a shortcut.** It tells Java, "when I say `Command` in this file, I mean `edu.wpi.first.wpilibj2.command.Command`." Without the import, you could still use the class by typing its full name every time. Nobody wants to.
- **Classes in the same package can see each other without imports.** That is why `Robot` has never needed to import `Drivetrain` or `Sensors`: until now, they were all in `frc.robot`.

Package names are written in lowercase, and they usually start with something that identifies the owner. WPILib's start with `edu.wpi.first`, because WPILib comes from Worcester Polytechnic Institute (whose web address ends in `wpi.edu`, written backward). FRC robot projects use `frc.robot`.

### The plan: two new packages

WPILib's command-based template and almost every FRC team's code on GitHub use the same layout, and so will the Explorer:

```
src/main/java/frc/robot/
    Main.java
    Robot.java
    Sensors.java
    subsystems/
        Drivetrain.java
        DrivetrainIO.java
        DrivetrainIOSim.java
        DrivetrainIOXRP.java
    commands/
        DriveDistance.java
        DriveUntilLine.java
        DriveWithSticks.java
        TurnToHeading.java
```

The drivetrain and its IO layer move into `frc.robot.subsystems`. The four new command classes go into `frc.robot.commands`. `Robot`, `Main`, and `Sensors` stay where they are. (`Sensors` stays because it is not a subsystem; see Section 19.1. In Chapter 20, `RobotContainer` and `Constants` will join `Robot` at the top.)

> **Should the IO files get their own folder?**
>
> AdvantageKit's own templates go one level deeper, with a package per subsystem: `frc.robot.subsystems.drive` holds the drive subsystem and all of its IO classes. On a robot with six subsystems and eighteen IO files, that is worth it. With one subsystem, `frc.robot.subsystems` is plenty. Either way is correct; what matters is that a team picks one and sticks to it.

### Access across packages: why `public` finally matters

Since Chapter 7, you have written `public` in front of classes, constructors, and methods, mostly because the examples did. Here is the reason it matters.

Java has four levels of access. You know two of them:

| Written as | Who can use it |
|---|---|
| `public` | Any class, in any package |
| (nothing at all) | Only classes in the **same package**. This is called **package-private**. |
| `private` | Only the class itself |
| `protected` | The same package, plus subclasses (Section 19.4) |

Package-private is the one you have never noticed, because until now every class was in the same package. Leave out `public` on a constructor, and nothing goes wrong, as long as everything lives in `frc.robot`. Move the class to `frc.robot.commands`, and suddenly `Robot` cannot use it:

```
error: DriveDistance(Drivetrain,double) is not public in DriveDistance; cannot be accessed from outside package
        driveLeg1 = new DriveDistance(drivetrain, LEG_1_DISTANCE_METERS);
                    ^
```

Read it the Chapter 10 way: the constructor exists, but it is package-private, and `Robot` is in a different package. The fix is one word: `public`. Every class, constructor, and method that another package needs must be `public`. Everything else should stay `private`.

> **A common beginner mistake**
>
> Moving a file into a new folder, but not changing its `package` line. VS Code underlines the `package` line in red, with a message like `The declared package "frc.robot" does not match the expected package "frc.robot.subsystems"`. Fix it right away. Java's compiler does not check folders itself, so the build may not fail on that line; instead, an error appears somewhere else, usually `cannot find symbol` on an `import`, which is much harder to trace back. Whenever you move a Java file, the first line moves with it: the folder and the `package` line must always agree.

### Step by step: moving the drivetrain

Do this now, with the robot code exactly as you left it at the end of Chapter 18.

**Step 1: Make the folders.** In VS Code's Explorer panel, right-click the `frc/robot` folder (under `src/main/java`), choose **New Folder...**, and name it `subsystems`. Do it again for `commands`. The `commands` folder stays empty until Section 19.5.

**Step 2: Move four files.** Drag `Drivetrain.java`, `DrivetrainIO.java`, `DrivetrainIOXRP.java`, and `DrivetrainIOSim.java` into the new `subsystems` folder. VS Code's Java support may offer to update the package lines and imports for you. It is fine to let it, but check every step below anyway: the build is the judge, not the offer.

**Step 3: Fix the `package` lines.** The first line of each of the four moved files must now be:

```java
package frc.robot.subsystems;
```

The four files still see each other without imports (`DrivetrainIOXRP` still says `Drivetrain.WHEEL_DIAMETER_METERS`), because they moved **together**, into the same package.

**Step 4: Import them in `Robot.java`.** `Robot` is still in `frc.robot`, so it needs four new imports. Put them with the others, in alphabetical order:

```java
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.DrivetrainIO;
import frc.robot.subsystems.DrivetrainIOSim;
import frc.robot.subsystems.DrivetrainIOXRP;
```

**Step 5: Build.** If the build succeeds, you are done. If it fails with an error about `DrivetrainIOInputsAutoLogged` (the class AdvantageKit generates for you in Chapter 17), a stale copy from the old package is in the way. Close the simulation if it is running, delete the `build` folder at the top of your project (it holds only things Gradle makes, and Gradle makes it again), and build once more.

Nothing about the robot changed, so there is nothing to test on the floor yet. That comes at the end of the next section.

> **Packages, in one sentence**
>
> A **package** is a named folder of classes, declared by the `package` line at the top of each file; a class's full name includes its package, `import` lets you use the short name, and only `public` things can be used from another package.

---

## 19.3 `Drivetrain` Becomes a Subsystem

Chapter 18 promised this would take one word. Here it is. In `Drivetrain.java`, change the class line from:

```java
public class Drivetrain {
```

to:

```java
public class Drivetrain extends SubsystemBase {
```

and add the import:

```java
import edu.wpi.first.wpilibj2.command.SubsystemBase;
```

Then find the `periodic()` method you wrote in Chapter 17, and put `@Override` on the line above it:

```java
/**
 * Read the hardware, log what it said, and update the pose. The command scheduler
 * calls this once every loop, in every mode, before any command runs.
 */
@Override
public void periodic() {
    readInputs();
    odometry.update(getRotation2d(), getLeftDistanceMeters(), getRightDistanceMeters());
    Logger.recordOutput("Drivetrain/Pose", getPose());
}
```

The Javadoc changed too, because something important changed: **you no longer call `periodic()`. The scheduler does.** In Chapter 17, when you named this method, you were told the name was a preview. Every subsystem has a `periodic()` method, and step 1 of the scheduler's loop (Section 18.5) is "every subsystem's `periodic()` runs." So in `robotPeriodic()`, delete the first line:

```java
// The drivetrain reads its inputs and updates the pose first, every loop (Chapter 17).
drivetrain.periodic();   // DELETE this line, and the comment above it
```

Your `robotPeriodic()` is now:

```java
@Override
public void robotPeriodic() {
    // Y puts the robot back at the start pose. Works even while disabled.
    if (controller.getYButtonPressed()) {
        drivetrain.resetPose(START_POSE);
        DataLogManager.log("Pose reset to start");
    }

    // The command scheduler: subsystems' periodic() first, then every
    // scheduled command, once per loop (Section 18.5).
    CommandScheduler.getInstance().run();

    updateDashboard();
}
```

How does the scheduler know the drivetrain exists? You never told it. That is the most interesting thing `SubsystemBase` does, and the next section explains it. For now, trust it, and add one more line at the end of the `Robot()` constructor, under the `Scheduler` line from Chapter 18:

```java
SmartDashboard.putData("Drivetrain", drivetrain);
```

A subsystem can be put on the dashboard, just like the scheduler. It publishes two facts that you will lean on all chapter: `.command`, the name of the command using the drivetrain right now (or `none`), and `.default`, the name of its default command (Section 19.7).

> **Did you forget to delete the call?**
>
> If `drivetrain.periodic();` is still in `robotPeriodic()`, nothing crashes. `periodic()` just runs **twice** every loop, once from your call and once from the scheduler. On the real XRP, you would barely notice: the encoders are read twice, and AdvantageKit records every input twice. On the **simulated** Explorer, it is dramatic. `DrivetrainIOSim` moves its pretend robot forward 20 milliseconds every time its inputs are read, so the simulated robot lives at **double speed**: it drives the course in half the time and overshoots every PID target. If your simulated robot ever seems to have had too much coffee, look for a second call to `periodic()`.

### Check: the robot drives exactly as before

This is the first safe place to stand. Build, switch on the XRP, and run the program with `USE_SIMULATED_ROBOT = false`.

1. In the Simulation GUI, open **NetworkTables** > **SmartDashboard** > **Drivetrain**. While disabled, `.command` says `none`, and `.default` says `none`.
2. Drive in teleop. The pose widgets and the field map move exactly as before, which proves the scheduler is calling `periodic()`: nothing else updates the pose any more.
3. Run autonomous once, and run the cruise check in Test mode (hold the left bumper, watch `Measured Forward (m per s)` settle near 0.10).

If all three behave as they did at the end of Chapter 18, commit (see the Git exercise). Nothing uses commands yet except `Auto Light`, so `.command` stays `none` the whole time. That changes soon.

---

## 19.4 New Java: Inheritance, Part Two

In Chapter 5, `extends` gave your `Robot` class a whole robot loop that you never wrote. `Robot extends TimedRobot` (and since Chapter 17, `LoggedRobot`) meant "a `Robot` **is a** `TimedRobot`, plus my changes." You overrode a few methods like `teleopPeriodic()`, and everything else came along for free.

`Drivetrain extends SubsystemBase` is the same idea, and this section looks closer at what "for free" means. You need it now, because in the next section you will write four classes that each extend WPILib's `Command`, and each one depends on what it inherits.

### Abstract classes: a blueprint you cannot build directly

Try this anywhere in `Robot`, just to see it fail:

```java
SubsystemBase mystery = new SubsystemBase();   // ERROR
```

```
error: SubsystemBase is abstract; cannot be instantiated
```

`SubsystemBase` is declared like this in WPILib:

```java
public abstract class SubsystemBase implements Subsystem, Sendable {
```

The word **`abstract`** means "this class is not finished on its own; it exists to be extended." You cannot create an object of an abstract class with `new`. You can only create objects of a **subclass** that extends it, like `Drivetrain`. A `SubsystemBase` with no motors and no sensors would be a subsystem of nothing, so WPILib does not let you make one.

`Command` is abstract for the same reason. A command that does not say what it does is not a command. `new Command()` fails the same way.

Think of a robot kit's chassis drawing with the motor mounts drawn but the motors left blank. It is a real, useful drawing. Every robot built from it has those mounts. But nobody builds "the chassis drawing" itself: you build **a** robot from it, with your motors in the blanks.

> **Abstract class or interface?**
>
> In Chapter 17, `DrivetrainIO` was an **interface**: a promise of methods, with no fields and (except `default` methods) no code. An abstract class can have both: real fields, real constructors, and real methods with code in them, plus the blanks a subclass fills in. A class can implement many interfaces, but it can extend only **one** class. That is why WPILib gives you both: `Subsystem` is an interface (the promise), and `SubsystemBase` is an abstract class that keeps the promise and adds useful code. You extend the class, and get both.

### The parent's constructor runs first

So how did the scheduler find out about your drivetrain? Here is `SubsystemBase`'s constructor, from WPILib's source, lightly trimmed:

```java
public SubsystemBase() {
    String name = this.getClass().getSimpleName();
    SendableRegistry.addLW(this, name, name);
    CommandScheduler.getInstance().registerSubsystem(this);
}
```

The last line signs the subsystem up with the scheduler. But you never called this constructor. Or did you?

Here is the rule: **when you create an object of a subclass, the parent class's constructor runs first, before a single line of the subclass's constructor.** Java does it automatically. When `Robot` says `new Drivetrain(drivetrainIO)`:

1. Java creates the object.
2. `SubsystemBase()` runs. The drivetrain gets the name `"Drivetrain"` (from its class name) and is registered with the scheduler.
3. `Drivetrain`'s field initializers run (the kinematics, the two feedforwards, the inputs object).
4. `Drivetrain(DrivetrainIO io)`'s own body runs.

You can make step 2 visible by writing it yourself. The very first line of any constructor may be a call to the parent's constructor, spelled **`super(...)`**:

```java
public Drivetrain(DrivetrainIO io) {
    super();   // runs SubsystemBase(): what Java does anyway if you leave it out
    this.io = io;
    // ...
}
```

`super` means "my parent class," the way `this` means "this object." If you leave the line out, Java quietly puts `super();` there for you. That is why `Drivetrain` was registered without asking. (The parent has a second constructor, `super("Some Name")`, if you ever want a subsystem's name to differ from its class name.)

### What you inherit, and what you override

`Drivetrain` now has methods it never wrote. Some come from `SubsystemBase`, and many come from the `Subsystem` interface as `default` methods, the Chapter 17 idea of "a promise with a fallback." Here are the ones that matter for this chapter:

| Inherited method | Where its code lives | What it does |
|---|---|---|
| `periodic()` | `Subsystem`, `default`, empty | Called by the scheduler every loop. You override it. |
| `getName()` | `SubsystemBase` | Returns `"Drivetrain"`. The scheduler's loop-overrun messages use it. |
| `setDefaultCommand(Command)` | `Subsystem`, `default` | Sets the command that runs when nothing else needs this subsystem (Section 19.7). |
| `getCurrentCommand()` | `Subsystem`, `default` | The command using this subsystem right now, or `null`. |

When your class writes a method with the **same name and parameters** as one it inherited, yours replaces the inherited one for objects of your class. That is **overriding**, and it is exactly what you did with `teleopPeriodic()` in Chapter 5. The difference here is that the inherited `periodic()` already **has** a body: an empty one. If you do not override it, it still runs, every loop, and does nothing.

That makes one mistake dangerous. Suppose you mistype the name:

```java
public void periodc() {        // no @Override, and a typo
    readInputs();
    // ...
}
```

This compiles. It is a perfectly good new method named `periodc`, and the scheduler never calls it, because it calls `periodic`. The inherited empty `periodic()` runs instead, the pose never updates, and nothing tells you why. Put `@Override` on it, and the compiler catches the typo at once:

```
error: method does not override or implement a method from a supertype
```

That is why every override in this book carries `@Override`. Chapter 17 warned about the same trap with `default` methods. With inheritance, it matters even more.

### `Command`, from the inside

Now the class you are about to extend four times. WPILib's `Command` is an abstract class. Here are the parts you will use, from its source, trimmed down to just their shape:

```java
public abstract class Command implements Sendable {

    protected Command() { ... }   // names the command after its class

    public void initialize() {}              // empty unless you override it
    public void execute() {}                 // empty unless you override it
    public void end(boolean interrupted) {}  // empty unless you override it
    public boolean isFinished() {            // "never finished" unless you override it
        return false;
    }

    public final void addRequirements(Subsystem... requirements) { ... }
}
```

Four things to read in it:

- **The four methods from Section 18.4 all have bodies already.** Three do nothing. `isFinished()` returns `false`, which means "never finished." Override only the ones your command needs. Forget to override `isFinished()` on a command that should end, and it runs forever.
- **The constructor is `protected`.** That is the fourth access level from the table in Section 19.2. Only subclasses (and classes in WPILib's own package) can call it. Since your subclass's constructor calls it automatically, as `super()`, it does its job: it names each command after its class, so a `TurnToHeading` shows up as `TurnToHeading` in the Scheduler widget.
- **`addRequirements` is `final`.** You met `final` on variables (Chapter 4) and fields (Chapter 10): "this cannot be changed." On a method, `final` means "subclasses may not override this." WPILib does not want anyone changing how requirements are recorded, because the whole scheduler depends on it.
- **The `...` in `Subsystem... requirements`** means "any number of these." You can write `addRequirements(drivetrain)` or, on a bigger robot, `addRequirements(drivetrain, intake)`. Inside the method, `requirements` holds all of them. You will not need to write a method like this yourself.

> **Inheritance, in one sentence**
>
> When a class `extends` another, every object of it **is a** parent object too: the parent's constructor runs first, the parent's methods come along for free, and the subclass **overrides** only the methods it needs to change, marking each with `@Override`. An **abstract** class is a parent that cannot be created on its own.

---

## 19.5 Your First Command Class: `TurnToHeading`

Turning to a heading appears three times in the Explorer today: the `STEP_TURN_LEFT` case in autonomous, and the A and B buttons on the Test mode tuning bench. It is the right first command to write: it is short, it uses everything from Section 19.4, and it replaces three copies of the same idea.

### First: where do the PID gains live?

Chapter 15's rule was "one controller per job," and Section 18.4 promised that every command would bring its own PID controller. That raises a practical question. `TurnToHeading`, `DriveDistance`, and `DriveUntilLine` all need a heading controller (the drives use one to hold the heading straight). If each command set up its own, with its own copy of the gains, then retuning the heading gains would mean editing three files, and one day someone would edit only two.

So the gains get one home, and every command asks that home for a fresh, ready-to-use controller. The home is `Drivetrain`: the gains describe how **this** drivetrain responds, just as its SysId gains do, and those already live there.

Add this group of constants to `Drivetrain.java`, after `STOPPED_SPEED_METERS_PER_SECOND`. They are the same constants you have in `Robot.java`, now `public`:

```java
// How fast the driving commands may go (Section 13.8). Moved here from Robot.java.
public static final double AUTO_DRIVE_METERS_PER_SECOND = 0.20;
public static final double AUTO_TURN_RADIANS_PER_SECOND = 2.0;

// PID gains (Section 15.9), moved here from Robot.java. Use your own tuned values.
// Distance: meters of error in, meters per second of forward speed out.
public static final double DISTANCE_KP = 5.0;
public static final double DISTANCE_KI = 0.0;
public static final double DISTANCE_KD = 0.0;
public static final double DISTANCE_TOLERANCE_METERS = 0.01;
public static final double DISTANCE_RATE_TOLERANCE_METERS_PER_SECOND = 0.02;

// Heading: degrees of error in, radians per second of turn rate out.
public static final double HEADING_KP = 0.3;
public static final double HEADING_KI = 0.5;
public static final double HEADING_KD = 0.0;
public static final double HEADING_I_ZONE_DEGREES = 10.0;
public static final double HEADING_TOLERANCE_DEGREES = 2.0;
public static final double HEADING_RATE_TOLERANCE_DEGREES_PER_SECOND = 10.0;
```

**Copy them, do not cut them, for now.** `Robot.java` still uses its own copies until you replace it in Section 19.8, and copying keeps every step buildable. Be sure to copy **your** tuned values from Chapters 15 and 16, not the example numbers above.

Then add a new section to `Drivetrain`, after `getChassisSpeeds()`, with the import `edu.wpi.first.math.controller.PIDController`:

```java
// PID controllers for the commands that drive this drivetrain

/**
 * A new, ready-to-use controller for driving to a distance: meters in, meters per
 * second out. Each command makes its own, because a PID controller remembers.
 *
 * @return a distance controller with this drivetrain's gains and tolerances
 */
public static PIDController createDistanceController() {
    PIDController controller = new PIDController(DISTANCE_KP, DISTANCE_KI, DISTANCE_KD);
    controller.setTolerance(
        DISTANCE_TOLERANCE_METERS, DISTANCE_RATE_TOLERANCE_METERS_PER_SECOND);
    return controller;
}

/**
 * A new, ready-to-use controller for facing a heading: degrees in, radians per
 * second out. Each command makes its own, because a PID controller remembers.
 *
 * @return a heading controller with this drivetrain's gains, tolerances, and I zone
 */
public static PIDController createHeadingController() {
    PIDController controller = new PIDController(HEADING_KP, HEADING_KI, HEADING_KD);
    controller.setTolerance(
        HEADING_TOLERANCE_DEGREES, HEADING_RATE_TOLERANCE_DEGREES_PER_SECOND);
    controller.enableContinuousInput(-180.0, 180.0);
    controller.setIZone(HEADING_I_ZONE_DEGREES);
    return controller;
}
```

These are **static factory methods**, like `Rotation2d.fromDegrees()` in Chapter 14 and `Commands.startEnd()` in Chapter 18: `static` methods whose whole job is to build an object and hand it back. They are `static` because they do not need any particular drivetrain object, only the constants. And each call builds a **new** controller, so no two commands ever share one. The setup lines from your `Robot()` constructor (tolerances, continuous input, I zone) now live here, once.

### The listing

Create `TurnToHeading.java` in the `commands` folder. In VS Code, right-click `commands` and choose **New File...**, so it lands in the right place. (The WPILib extension can also generate an empty command for you: right-click the folder and look for **Create a new class/command**. Type this first one yourself anyway; you learn the shape by writing it.) Type it, do not paste:

```java
package frc.robot.commands;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import frc.robot.subsystems.Drivetrain;

/** Turn in place until the robot faces a heading, using a heading PID controller. */
public class TurnToHeading extends Command {

    private final Drivetrain drivetrain;
    private final double targetHeadingDegrees;

    // This command's own controller. No other job can touch it.
    private final PIDController headingController = Drivetrain.createHeadingController();

    /**
     * Create a command that turns to a heading.
     *
     * @param drivetrain the drivetrain to turn
     * @param targetHeadingDegrees the heading to face; counterclockwise positive
     */
    public TurnToHeading(Drivetrain drivetrain, double targetHeadingDegrees) {
        this.drivetrain = drivetrain;
        this.targetHeadingDegrees = targetHeadingDegrees;
        addRequirements(drivetrain);   // "I need the drivetrain while I run"
    }

    @Override
    public void initialize() {
        headingController.reset();   // a new job: forget the last one
        DataLogManager.log("TurnToHeading " + targetHeadingDegrees + " deg started");
    }

    @Override
    public void execute() {
        double turnRate = headingController.calculate(
            drivetrain.getHeadingDegrees(), targetHeadingDegrees);
        turnRate = MathUtil.clamp(turnRate,
            -Drivetrain.AUTO_TURN_RADIANS_PER_SECOND, Drivetrain.AUTO_TURN_RADIANS_PER_SECOND);
        drivetrain.drive(0.0, turnRate);

        SmartDashboard.putNumber("Heading Error (deg)", headingController.getError());
        SmartDashboard.putBoolean("Heading At Target", headingController.atSetpoint());
    }

    @Override
    public boolean isFinished() {
        return headingController.atSetpoint();
    }

    @Override
    public void end(boolean interrupted) {
        drivetrain.stop();
        DataLogManager.log("TurnToHeading " + (interrupted ? "interrupted" : "finished")
            + " at " + drivetrain.getHeadingDegrees() + " deg");
    }
}
```

Compare it with the preview in Section 18.4. It is the same command, with four upgrades: a `package` line and imports, a controller from the factory instead of gains typed inline, a clamp so the turn never goes faster than `AUTO_TURN_RADIANS_PER_SECOND`, and a log message at each end. Walk through it:

- **`package frc.robot.commands;`** and **`import frc.robot.subsystems.Drivetrain;`**: the command lives in one package and uses a class from another, exactly as in Section 19.2.
- **`extends Command`** gives it the four empty methods, `addRequirements`, a name, and everything the scheduler needs. The class overrides all four methods, each with `@Override`.
- **The constructor only remembers.** It stores the drivetrain and the target, and calls `addRequirements(drivetrain)`. It does not touch the motors, read the gyro, or reset anything. A command object is usually created long before it runs (you will create all of them in the `Robot()` constructor), so anything about **this run** belongs in `initialize()`. Section 19.6 shows what goes wrong otherwise.
- **`initialize()`** resets the controller, so this turn does not inherit the last turn's error sum, and logs the start.
- **`execute()`** is one loop's worth of work: calculate, clamp, drive, publish. It never waits.
- **`isFinished()`** asks the controller. Its answer is `true` only when the heading is within 2 degrees **and** the turn has slowed below 10 degrees per second (Chapter 15's two tolerances).
- **`end(interrupted)`** stops the motors however the command ends, and the log says which way it ended.

> **Why the dashboard widgets moved into the command**
>
> In Chapter 15, `updateDashboard()` published `Heading Error (deg)` and `Heading At Target` from `Robot`'s heading controller. That controller is about to disappear: each command now has its own. So the command publishes its own controller's numbers, from `execute()`, while it runs. When no turn is running, the widgets keep their last values, which is exactly what you want to look at after a turn ends. The live gain-tuning widgets (`Heading PID`, `Distance PID`) go away for now, because there is no longer one controller to tune; Chapter 23 brings live tuning back, for every command at once.

---

## 19.6 Remember It When You Start: `DriveDistance` and `DriveUntilLine`

The other two driving commands look a lot like `TurnToHeading`. The interesting part is one question about each line of code: does it belong in the **constructor**, or in **`initialize()`**?

### The constructor trap

Here is a first try at the important part of `DriveDistance`. It drives straight for some distance, measured from wherever the robot was when the command began:

```java
public DriveDistance(Drivetrain drivetrain, double distanceMeters) {
    this.drivetrain = drivetrain;
    this.distanceMeters = distanceMeters;
    startDistanceMeters = drivetrain.getAverageDistanceMeters();   // BUG
    addRequirements(drivetrain);
}
```

It compiles, and the first time you use it, it works. Then watch it on the tuning bench, where the X button will run `new DriveDistance(drivetrain, 0.30)`, an object created once, in the `Robot()` constructor, when the program starts:

1. The program starts. The robot is at 0.00 m, so the constructor stores `startDistanceMeters = 0.00`.
2. You press X. The robot drives 0.30 m and stops. 
3. You press X again, expecting another 0.30 m. The command measures from **0.00**, so it thinks it has already driven 0.30 m. It is at its setpoint. It finishes immediately, and the robot does not move.
4. You drive back to the start with the sticks and press X. Now it drives forward 0.30 m, as if nothing were wrong.

The bug is the same one as Section 18.6's "now or later?": the starting distance was read **now** (when the object was made, at program start) instead of **later** (each time the command starts). The rule for commands is simple:

- **The constructor runs once,** when the command object is created. It should only store what never changes: the subsystem, the target, the settings. And call `addRequirements`.
- **`initialize()` runs every time the command starts.** Anything about **this run**, such as where the robot started or which way it was facing, is read here, and so is every reset.

> **Ask "once, or every time?"**
>
> For every line you put in a command's constructor, ask: "should this happen once, when the program starts, or every time the command runs?" If the answer is "every time," it goes in `initialize()`. A command object may run a hundred times in one practice session. Its constructor runs once.

### Relative and absolute targets

Look at the two commands side by side, and you will notice they ask for different **kinds** of targets:

- `new TurnToHeading(drivetrain, 90.0)` means "face heading 90." It does not matter which way the robot faces when it starts; it ends facing the same direction on the floor every time. That is an **absolute** target, measured in the **field's** frame.
- `new DriveDistance(drivetrain, 0.30)` means "drive 0.30 m **from here**." Start it anywhere and it ends 0.30 m further on. That is a **relative** target, measured from the robot's own starting point.

Both are useful, and robot programmers mix them constantly. Leg 1 is relative ("half a meter from the start line") and the turn is absolute ("face up leg 2"), which is how a person would describe the course too. Chapter 14's odometry is what makes absolute targets possible: you can only say "face 90" or "go to (0.5, 0.4)" if the robot knows where it is on the field. In Chapter 29, the Mini Swerve's sticks become field-relative ("push up and the robot drives away from you, whichever way it faces"), and in Chapter 31, PathPlanner drives to absolute poses on the real field.

`DriveDistance` also holds a heading while it drives, and that heading is relative too: whatever the robot was facing when the command started. In autonomous, after the pose reset, that is 0, the same heading Chapter 15's leg 1 held. On the bench, it is whatever you were facing when you pressed X.

### The listing

Create `DriveDistance.java` in `commands`:

```java
package frc.robot.commands;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import frc.robot.subsystems.Drivetrain;

/**
 * Drive straight for a distance, measured from wherever the robot is when the command
 * starts, while holding the heading it started with.
 */
public class DriveDistance extends Command {

    private final Drivetrain drivetrain;
    private final double distanceMeters;

    // One controller per job: one for the distance, one to hold the heading.
    private final PIDController distanceController = Drivetrain.createDistanceController();
    private final PIDController headingController = Drivetrain.createHeadingController();

    // Remembered when the command STARTS (initialize), not when it is created.
    private double startDistanceMeters = 0.0;
    private double holdHeadingDegrees = 0.0;

    /**
     * Create a command that drives a distance.
     *
     * @param drivetrain the drivetrain to drive
     * @param distanceMeters how far to drive; negative drives backward
     */
    public DriveDistance(Drivetrain drivetrain, double distanceMeters) {
        this.drivetrain = drivetrain;
        this.distanceMeters = distanceMeters;
        addRequirements(drivetrain);
    }

    @Override
    public void initialize() {
        startDistanceMeters = drivetrain.getAverageDistanceMeters();
        holdHeadingDegrees = drivetrain.getHeadingDegrees();
        distanceController.reset();
        headingController.reset();
        DataLogManager.log("DriveDistance " + distanceMeters + " m started at " + drivetrain.getPose());
    }

    @Override
    public void execute() {
        double forward = distanceController.calculate(getTraveledMeters(), distanceMeters);
        forward = MathUtil.clamp(forward,
            -Drivetrain.AUTO_DRIVE_METERS_PER_SECOND, Drivetrain.AUTO_DRIVE_METERS_PER_SECOND);

        double turnRate = headingController.calculate(
            drivetrain.getHeadingDegrees(), holdHeadingDegrees);
        turnRate = MathUtil.clamp(turnRate,
            -Drivetrain.AUTO_TURN_RADIANS_PER_SECOND, Drivetrain.AUTO_TURN_RADIANS_PER_SECOND);

        drivetrain.drive(forward, turnRate);

        SmartDashboard.putNumber("Distance Error (m)", distanceController.getError());
        SmartDashboard.putBoolean("Distance At Target", distanceController.atSetpoint());
    }

    @Override
    public boolean isFinished() {
        return distanceController.atSetpoint();
    }

    @Override
    public void end(boolean interrupted) {
        drivetrain.stop();
        DataLogManager.log("DriveDistance " + (interrupted ? "interrupted" : "finished")
            + " after " + getTraveledMeters() + " m");
    }

    /** How far the robot has driven since this command started, in meters. */
    private double getTraveledMeters() {
        return drivetrain.getAverageDistanceMeters() - startDistanceMeters;
    }
}
```

Walk through what is new compared to `TurnToHeading`:

- **Two controllers, one per job.** Both come from the factories. The distance controller decides how fast to go, and the heading controller decides how much to steer to stay straight, the same two-controller drive as Chapter 15's leg 1.
- **Two fields that are not `final`:** `startDistanceMeters` and `holdHeadingDegrees`. They are set in `initialize()`, every run, and only read after that. They are the command's own "remembered from loop to loop" fields. In Section 18.2's table, `stepStartDistanceMeters` was a field of `Robot` shared by every autonomous step. Now each driving command keeps its own.
- **`getTraveledMeters()`** is Chapter 12's `getStepDistanceMeters()`, moved to where it belongs. The encoders are never reset; the command subtracts its own starting point, the same trick `Drivetrain` uses for zeroing (Section 17.7).
- **The distance can be negative.** `new DriveDistance(drivetrain, -0.30)` drives backward 0.30 m: the PID controller sees a negative target and asks for a negative speed. You will use that on the bench.

Now `DriveUntilLine.java`, also in `commands`:

```java
package frc.robot.commands;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj2.command.Command;
import frc.robot.Sensors;
import frc.robot.subsystems.Drivetrain;

/**
 * Drive ahead at a steady speed, holding the heading it started with, until either
 * reflectance sensor sees the line, or until a maximum distance as a safety limit.
 */
public class DriveUntilLine extends Command {

    private final Drivetrain drivetrain;
    private final Sensors sensors;
    private final double maxDistanceMeters;

    private final PIDController headingController = Drivetrain.createHeadingController();

    // Remembered when the command starts.
    private double startDistanceMeters = 0.0;
    private double holdHeadingDegrees = 0.0;

    /**
     * Create a command that drives until the line.
     *
     * @param drivetrain the drivetrain to drive
     * @param sensors the sensors that watch for the line (read only, never required)
     * @param maxDistanceMeters give up after this far, line or no line
     */
    public DriveUntilLine(Drivetrain drivetrain, Sensors sensors, double maxDistanceMeters) {
        this.drivetrain = drivetrain;
        this.sensors = sensors;
        this.maxDistanceMeters = maxDistanceMeters;
        addRequirements(drivetrain);   // the drivetrain only: nobody fights over a sensor
    }

    @Override
    public void initialize() {
        startDistanceMeters = drivetrain.getAverageDistanceMeters();
        holdHeadingDegrees = drivetrain.getHeadingDegrees();
        headingController.reset();
        DataLogManager.log("DriveUntilLine started at " + drivetrain.getPose());
    }

    @Override
    public void execute() {
        double turnRate = headingController.calculate(
            drivetrain.getHeadingDegrees(), holdHeadingDegrees);
        turnRate = MathUtil.clamp(turnRate,
            -Drivetrain.AUTO_TURN_RADIANS_PER_SECOND, Drivetrain.AUTO_TURN_RADIANS_PER_SECOND);
        drivetrain.drive(Drivetrain.AUTO_DRIVE_METERS_PER_SECOND, turnRate);
    }

    @Override
    public boolean isFinished() {
        return isLineSeen() || getTraveledMeters() >= maxDistanceMeters;
    }

    @Override
    public void end(boolean interrupted) {
        drivetrain.stop();
        if (interrupted) {
            DataLogManager.log("DriveUntilLine interrupted after " + getTraveledMeters() + " m");
        } else if (isLineSeen()) {
            DataLogManager.log("Line found after " + getTraveledMeters() + " m");
        } else {
            DataLogManager.log("No line within " + maxDistanceMeters + " m, stopping");
        }
    }

    /** True if either reflectance sensor is over the line. */
    private boolean isLineSeen() {
        return sensors.isLeftOnLine() || sensors.isRightOnLine();
    }

    /** How far the robot has driven since this command started, in meters. */
    private double getTraveledMeters() {
        return drivetrain.getAverageDistanceMeters() - startDistanceMeters;
    }
}
```

- **It is handed `Sensors`, but only requires the drivetrain.** `addRequirements(drivetrain, sensors)` would not even compile: `Sensors` is not a `Subsystem`, and the compiler says so (`method addRequirements in class Command cannot be applied to given types`). That is the decision from Section 19.1, enforced by Java.
- **It has two ways to finish,** just like the old `STEP_DRIVE_TO_LINE` case: the line, or the safety distance. `end()` looks at which one happened, and logs the same two messages the old code did, plus a third for "interrupted."
- **`isLineSeen()` is a private helper.** `isFinished()` and `end()` both need the same question, so it is written once. A command class is a class like any other, and can have as many private helpers as it likes.

> **Nothing runs yet**
>
> Build now. Everything should compile, and the robot should behave exactly as in Section 19.3, because nothing creates any of these commands yet. That is a fine place to be: three classes written, each one small enough to read in a minute, waiting to be used.

---

## 19.7 The Default Command: `DriveWithSticks`

Here is what `teleopPeriodic()` has done since Chapter 11: read the sticks, apply the deadband, check for a wall, log the wall stop, choose slow mode, limit reverse, scale the turn, drive, and publish two widgets. Every loop, unconditionally, in one method.

Section 18.1 showed what goes wrong with that. As soon as anything else wants the drivetrain in teleop, `teleopPeriodic()` has to know about it, step aside with a `return`, and remember to step back. The scheduler has a better answer.

### "Whenever nobody else needs it"

A **default command** is a command that the scheduler starts for a subsystem **automatically, whenever no other command requires that subsystem.** It is step 5 of the scheduler's loop from Section 18.5: "Idle subsystems get their default."

For a drivetrain, the default command is nearly always "drive with the sticks." Follow the life of the drivetrain through a teleop session:

1. Teleop starts. Nothing requires the drivetrain, so at the end of the first loop, the scheduler starts its default: `DriveWithSticks.initialize()`, and from the next loop on, `execute()` every loop. The driver drives.
2. Something else needs the drivetrain (in Chapter 20, a button that turns to face the tape). The newcomer requires the drivetrain, so `DriveWithSticks` is **interrupted**: its `end(true)` stops the motors. The new command runs.
3. The new command finishes. The drivetrain is idle again, so in the same loop, the scheduler starts `DriveWithSticks` again. The driver has the sticks back.

Nobody wrote "step aside" or "step back." The default command does not even know the other command exists.

### Reading the sticks later, every loop

`DriveWithSticks` needs the stick positions every loop, but it should not know anything about **which** controller, **which** axes, or which way is "up." Those are `Robot`'s business (and in Chapter 20, `RobotContainer`'s). So the command is handed three **suppliers**, the Chapter 18 way to pass "a value you can ask for again, fresh, whenever you want":

- a `DoubleSupplier` for forward, already deadbanded and flipped into the robot's frame,
- a `DoubleSupplier` for rotation, the same way,
- a `BooleanSupplier` for slow mode.

Every loop, `execute()` calls `getAsDouble()` and `getAsBoolean()` on them and gets **this** loop's values. Section 18.6's "now or later?" rule, put to work: the suppliers are stored now, and the sticks are read later.

### The listing

Create `DriveWithSticks.java` in `commands`. Most of `execute()` is your Chapter 11 `teleopPeriodic()`, moved here almost line for line:

```java
package frc.robot.commands;

import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import frc.robot.Sensors;
import frc.robot.subsystems.Drivetrain;
import java.util.function.BooleanSupplier;
import java.util.function.DoubleSupplier;

/**
 * Drive with the controller: arcade drive with slow mode, gentler turns, limited
 * reverse, and a wall stop. Meant to be the drivetrain's default command.
 */
public class DriveWithSticks extends Command {

    // The driving rules from Chapters 8 to 11, moved here from Robot.java.
    private static final double FULL_SPEED_SCALE = 1.0;
    private static final double SLOW_MODE_SCALE = 0.5;
    private static final double TURN_SCALE = 0.7;
    private static final double MAX_REVERSE_SPEED = 0.5;
    public static final double WALL_STOP_DISTANCE_METERS = 0.20;   // public: the dashboard uses it

    private final Drivetrain drivetrain;
    private final Sensors sensors;

    // Live values from the controller: asked again every loop (Section 18.6).
    private final DoubleSupplier forwardSupplier;
    private final DoubleSupplier rotationSupplier;
    private final BooleanSupplier slowModeSupplier;

    // Was the wall stop on last loop? (the Chapter 10 "did it just change?" pattern)
    private boolean wasBlocked = false;

    /**
     * Create the drive-with-the-sticks command.
     *
     * @param drivetrain the drivetrain to drive
     * @param sensors the sensors, for the wall stop (read only, never required)
     * @param forwardSupplier forward, -1.0 to 1.0; positive drives forward
     * @param rotationSupplier rotation, -1.0 to 1.0; positive turns left (counterclockwise)
     * @param slowModeSupplier true while slow mode is on
     */
    public DriveWithSticks(Drivetrain drivetrain, Sensors sensors,
            DoubleSupplier forwardSupplier, DoubleSupplier rotationSupplier,
            BooleanSupplier slowModeSupplier) {
        this.drivetrain = drivetrain;
        this.sensors = sensors;
        this.forwardSupplier = forwardSupplier;
        this.rotationSupplier = rotationSupplier;
        this.slowModeSupplier = slowModeSupplier;
        addRequirements(drivetrain);
    }

    @Override
    public void initialize() {
        wasBlocked = false;
    }

    @Override
    public void execute() {
        // Read: ask the suppliers for this loop's values.
        double forward = forwardSupplier.getAsDouble();
        double rotation = rotationSupplier.getAsDouble();

        // Decide: slow mode, and never drive forward into a wall.
        double speedScale = slowModeSupplier.getAsBoolean() ? SLOW_MODE_SCALE : FULL_SPEED_SCALE;
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

    // No isFinished(): the one this class inherits from Command returns false,
    // so this command runs until something interrupts it. Exactly right for driving.

    @Override
    public void end(boolean interrupted) {
        drivetrain.stop();
        if (wasBlocked) {
            DataLogManager.log("Wall stop OFF");   // the stop ends with the command
        }
        SmartDashboard.putBoolean("Blocked", false);
    }
}
```

Walk through it:

- **The teleop constants moved here,** because they are the driving rules, and this is now the class that drives. `WALL_STOP_DISTANCE_METERS` is `public`, because `Robot`'s dashboard shows `Wall Close` using the same distance, and one number should live in one place.
- **`wasBlocked` moved here too.** It is the command's memory, reset in `initialize()` each time the command starts. That is one more field gone from `Robot`.
- **There is no `isFinished()`.** The inherited one from Section 19.4 returns `false`, and "never finished on its own" is exactly right for driving. A default command that finished would be started again on the very next loop, over and over.
- **`end()` cleans up the wall stop.** If the command is interrupted while blocked, the log would otherwise say "Wall stop ON" forever. Now `end()` writes "Wall stop OFF" and clears the `Blocked` widget. This is Section 18.1's second bug (frozen widgets, stale "did it change?" memory), fixed by having a place where cleanup always runs.
- **The command never reads the controller.** It does not even import `XboxController`. Whoever creates it decides what "forward" means. In Practice 3, you hand it a completely different source of "forward" without changing a line of this file.

> **Default commands everywhere**
>
> Almost every subsystem on a competition robot has a default command. An arm's default holds it at its current angle, so it does not sag when no command is moving it. An intake's default stops the rollers. An LED strip's default shows the alliance color. In Chapter 29, the Mini Swerve's `DriveWithSticks` grows field-oriented math, and in Chapter 33 an auto-align command interrupts it whenever the driver holds a button, then hands the sticks straight back. The pattern you are writing today is the one you will use on every robot.

---

## 19.8 Rewiring `Robot.java`

You have a subsystem and four command classes. Now `Robot.java` has to use them, everywhere: in teleop through the default command, in autonomous one step at a time, and in Test mode for the tuning bench and SysId. These pieces have to arrive **together**, because of one fact about default commands:

> **The default command runs in every enabled mode.**
>
> The scheduler does not know or care which mode the robot is in. If the drivetrain has a default command, and no command requires the drivetrain, the default runs: in teleop, but also in autonomous and in Test mode. Any old code that still calls `drivetrain.drive(...)` from `autonomousPeriodic()` or `testPeriodic()` would fight the default command for the motors every loop, and the default would win, because the scheduler runs after the mode methods. So the old autonomous and Test mode code must become commands at the same moment the default command arrives.

So this section replaces `Robot.java` in one go. Here is the complete file. The changes since Chapter 18 are:

- new imports for the commands, the subsystems (from Section 19.2), the SysId routine, and three units; `PIDController`, `SysIdRoutineLog`, and `State` are no longer imported;
- the teleop constants, PID constants, auto speed constants, and `LEG_1_HEADING_DEGREES` are gone (they moved into `DriveWithSticks` and `Drivetrain`, or are no longer needed);
- `distanceController`, `headingController`, `sysIdLog`, and `sysIdTimer` are gone; instead, there are fields for the commands, created in the constructor;
- the "Remembered from loop to loop" group is down to three fields;
- the constructor sets the default command and creates every command;
- `robotPeriodic()` no longer calls `drivetrain.periodic()` (Section 19.3);
- `updateDashboard()` lost its PID block, `Step Distance (m)`, and `SysId Test`;
- `disabledInit()` lost its SysId line;
- autonomous runs one command per step;
- `teleopPeriodic()` is empty;
- Test mode schedules commands, and the SysId helpers are gone.

Also delete the copies of the PID and auto speed constants you left in `Robot.java` in Section 19.5: from now on, the ones in `Drivetrain` are the only ones. Replace your whole `Robot.java` with this. Type the changed parts, do not paste:

```java
package frc.robot;

import static edu.wpi.first.units.Units.Second;
import static edu.wpi.first.units.Units.Seconds;
import static edu.wpi.first.units.Units.Volts;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.XboxController;
import edu.wpi.first.wpilibj.simulation.AnalogInputSim;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj.xrp.XRPOnBoardIO;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine;
import frc.robot.commands.DriveDistance;
import frc.robot.commands.DriveUntilLine;
import frc.robot.commands.DriveWithSticks;
import frc.robot.commands.TurnToHeading;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.DrivetrainIO;
import frc.robot.subsystems.DrivetrainIOSim;
import frc.robot.subsystems.DrivetrainIOXRP;
import org.littletonrobotics.junction.LoggedRobot;
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.NT4Publisher;
import org.littletonrobotics.junction.wpilog.WPILOGWriter;

public class Robot extends LoggedRobot {

    // Constants: one shared copy each, never reassigned.

    // Which robot to drive: false for the real XRP, true for the simulated one (Section 17.9).
    private static final boolean USE_SIMULATED_ROBOT = false;

    private static final int DRIVER_CONTROLLER_PORT = 0;
    private static final double STICK_DEADBAND = 0.1;

    // Autonomous: obstacle course leg 1. Measured on our floor; re-test on new surfaces.
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

    // Tuning bench (Test mode): how far X and Back drive, and how fast
    // the left bumper cruises with feedforward alone (no PID).
    private static final double BENCH_DRIVE_DISTANCE_METERS = 0.30;
    private static final double BENCH_CRUISE_METERS_PER_SECOND = 0.10;

    // SysId tests (Test mode, D-pad), in the drivetrain's volts.
    private static final double SYSID_RAMP_VOLTS_PER_SECOND = 0.5;   // quasistatic: a slow ramp
    private static final double SYSID_STEP_VOLTS = 4.0;              // dynamic: a sudden step
    private static final double SYSID_TIMEOUT_SECONDS = 8.0;         // safety net: time
    private static final double SYSID_MAX_DISTANCE_METERS = 0.75;    // safety net: distance from start

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
    private final XRPOnBoardIO onBoardIO = new XRPOnBoardIO();   // the LED (Chapter 4)
    private final Timer autoTimer = new Timer();   // times the whole routine
    private final Timer stepTimer = new Timer();   // times the current step
    private final Field2d field = new Field2d();   // the map on the dashboard

    // Pretend sensors for the simulated robot (Section 17.9). Unused on the real XRP.
    private final AnalogInputSim leftReflectanceSim = new AnalogInputSim(0);
    private final AnalogInputSim rightReflectanceSim = new AnalogInputSim(1);
    private final AnalogInputSim rangefinderSim = new AnalogInputSim(2);

    // Commands. Created in the constructor, once the drivetrain exists.
    private final Command autoLight;

    // Autonomous: one command per step (Section 19.7).
    private final Command driveLeg1;
    private final Command turnLeft;
    private final Command driveToLine;
    private final Command holdStill;

    // Test mode: the tuning bench (Section 19.8).
    private final Command benchTurnHome;
    private final Command benchTurnLeft;
    private final Command benchDriveOut;
    private final Command benchDriveBack;
    private final Command benchCruise;

    // Test mode: the SysId tests (Section 19.8).
    private final SysIdRoutine sysIdRoutine;
    private final Command sysIdQuasistaticForward;
    private final Command sysIdQuasistaticReverse;
    private final Command sysIdDynamicForward;
    private final Command sysIdDynamicReverse;

    // Remembered from loop to loop.
    private int autoStep = STEP_NOT_STARTED;
    private Command autoStepCommand = Commands.none();   // never null (Chapter 10)
    private int lastDpad = -1;                            // -1: nothing pressed

    public Robot() {
        // AdvantageKit first, before anything else is created (Section 17.6).
        Logger.recordMetadata("ProjectName", "XRP Explorer");
        Logger.recordMetadata("Robot", USE_SIMULATED_ROBOT ? "Simulated XRP" : "Real XRP");
        Logger.addDataReceiver(new WPILOGWriter());   // write a log file into logs/
        Logger.addDataReceiver(new NT4Publisher());   // publish live, for AdvantageScope
        Logger.start();

        // The Chapter 10 flight recorder keeps running too. SysId (Chapter 16) reads its file.
        DataLogManager.start();
        DriverStation.startDataLog(DataLogManager.getLog());

        DataLogManager.log("XRP Explorer started!");
        SmartDashboard.putString("Mode", "Starting");

        // Real hardware or simulated: decide here, once. Nothing else needs to know.
        DrivetrainIO drivetrainIO;
        if (USE_SIMULATED_ROBOT) {
            drivetrainIO = new DrivetrainIOSim();
            DataLogManager.log("Drivetrain: SIMULATED");
        } else {
            drivetrainIO = new DrivetrainIOXRP();
            DataLogManager.log("Drivetrain: real XRP");
        }
        drivetrain = new Drivetrain(drivetrainIO);
        sensors = new Sensors();

        // The field map: publish once, and draw where the course should take the robot.
        SmartDashboard.putData("Field", field);
        field.getObject("Course").setPoses(START_POSE, CORNER_POSE, LINE_POSE);

        // Driving with the sticks is the drivetrain's default command: it runs
        // whenever no other command needs the drivetrain (Section 19.6).
        drivetrain.setDefaultCommand(new DriveWithSticks(
            drivetrain,
            sensors,
            () -> -MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND),
            () -> -MathUtil.applyDeadband(controller.getRightX(), STICK_DEADBAND),
            controller::getRightBumperButton));

        // Autonomous: one command per step (Section 19.7).
        driveLeg1 = new DriveDistance(drivetrain, LEG_1_DISTANCE_METERS);
        turnLeft = new TurnToHeading(drivetrain, TURN_HEADING_DEGREES);
        driveToLine = new DriveUntilLine(drivetrain, sensors, LEG_2_MAX_DISTANCE_METERS);
        holdStill = Commands.run(drivetrain::stop, drivetrain).withName("Hold Still");

        // Test mode: the tuning bench (Section 19.8).
        benchTurnHome = new TurnToHeading(drivetrain, 0.0);
        benchTurnLeft = new TurnToHeading(drivetrain, TURN_HEADING_DEGREES);
        benchDriveOut = new DriveDistance(drivetrain, BENCH_DRIVE_DISTANCE_METERS);
        benchDriveBack = new DriveDistance(drivetrain, -BENCH_DRIVE_DISTANCE_METERS);
        benchCruise = Commands.runEnd(
                () -> drivetrain.drive(BENCH_CRUISE_METERS_PER_SECOND, 0.0),   // every loop
                drivetrain::stop,                                               // at the end
                drivetrain)
            .withName("Bench Cruise");

        // Test mode: WPILib's SysId routine runs the four tests for us (Section 19.8).
        // Named "drive", so the log entries match Chapter 16's.
        sysIdRoutine = new SysIdRoutine(
            new SysIdRoutine.Config(
                Volts.of(SYSID_RAMP_VOLTS_PER_SECOND).per(Second),
                Volts.of(SYSID_STEP_VOLTS),
                Seconds.of(SYSID_TIMEOUT_SECONDS)),
            new SysIdRoutine.Mechanism(
                volts -> drivetrain.setVolts(volts.in(Volts), volts.in(Volts)),
                drivetrain::logSysId,
                drivetrain,
                "drive"));
        sysIdQuasistaticForward = sysIdRoutine.quasistatic(SysIdRoutine.Direction.kForward)
            .until(() -> drivetrain.getAverageDistanceMeters() >= SYSID_MAX_DISTANCE_METERS)
            .withName("SysId Quasistatic Forward");
        sysIdQuasistaticReverse = sysIdRoutine.quasistatic(SysIdRoutine.Direction.kReverse)
            .until(() -> drivetrain.getAverageDistanceMeters() <= -SYSID_MAX_DISTANCE_METERS)
            .withName("SysId Quasistatic Reverse");
        sysIdDynamicForward = sysIdRoutine.dynamic(SysIdRoutine.Direction.kForward)
            .until(() -> drivetrain.getAverageDistanceMeters() >= SYSID_MAX_DISTANCE_METERS)
            .withName("SysId Dynamic Forward");
        sysIdDynamicReverse = sysIdRoutine.dynamic(SysIdRoutine.Direction.kReverse)
            .until(() -> drivetrain.getAverageDistanceMeters() <= -SYSID_MAX_DISTANCE_METERS)
            .withName("SysId Dynamic Reverse");

        // The LED is on while the autonomous routine runs (Section 18.7).
        autoLight = Commands.startEnd(
                () -> onBoardIO.setLed(true),     // start: LED on
                () -> onBoardIO.setLed(false))    // end: LED off, however it ends
            .until(() -> autoStep == STEP_DONE)
            .withName("Auto Light");

        // Show which commands are running, live, on the dashboard.
        SmartDashboard.putData("Scheduler", CommandScheduler.getInstance());
        SmartDashboard.putData("Drivetrain", drivetrain);
    }

    @Override
    public void robotPeriodic() {
        // Y puts the robot back at the start pose. Works even while disabled.
        if (controller.getYButtonPressed()) {
            drivetrain.resetPose(START_POSE);
            DataLogManager.log("Pose reset to start");
        }

        // The command scheduler: subsystems' periodic() first, then every
        // scheduled command, once per loop (Section 18.5).
        CommandScheduler.getInstance().run();

        updateDashboard();
    }

    /** Publish every sensor reading, every loop, in every mode. */
    private void updateDashboard() {
        // Controller (from Chapter 8)
        SmartDashboard.putNumber("Left Y", controller.getLeftY());
        SmartDashboard.putNumber("Right X", controller.getRightX());

        // Encoders
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
        SmartDashboard.putBoolean("Wall Close",
            sensors.isObstacleWithin(DriveWithSticks.WALL_STOP_DISTANCE_METERS));

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
    }

    @Override
    public void disabledInit() {
        SmartDashboard.putString("Mode", "Disabled");
        DataLogManager.log("Mode: Disabled");
    }

    @Override
    public void disabledPeriodic() {}

    // Autonomous: a step at a time, each step a command (Section 19.7).

    @Override
    public void autonomousInit() {
        SmartDashboard.putString("Mode", "Autonomous");
        DataLogManager.log("Mode: Autonomous");

        // Every run starts here: on the start line, facing down leg 1.
        drivetrain.resetPose(START_POSE);
        autoTimer.restart();
        startStep(STEP_DRIVE_LEG_1);

        // Light the LED for as long as the routine runs (Section 18.7).
        CommandScheduler.getInstance().schedule(autoLight);
    }

    @Override
    public void autonomousPeriodic() {
        if (autoStep == STEP_DONE) {
            return;   // Hold Still has the drivetrain until autonomous ends
        }

        // Safety net: no step may run longer than STEP_TIMEOUT_SECONDS.
        if (stepTimer.hasElapsed(STEP_TIMEOUT_SECONDS)) {
            DataLogManager.log("Auto step " + autoStep + " TIMED OUT");
            startStep(STEP_DONE);   // Hold Still needs the drivetrain, so it interrupts the step
            return;
        }

        // When this step's command has ended, move on to the next step.
        if (!autoStepCommand.isScheduled()) {
            startStep(autoStep + 1);   // the steps are numbered in order
        }
    }

    /**
     * Move autonomous to a new step: restart its timer and schedule its command.
     *
     * @param newStep the step to start, one of the STEP_ constants
     */
    private void startStep(int newStep) {
        autoStep = newStep;
        stepTimer.restart();
        DataLogManager.log("Auto step " + newStep + " started at " + autoTimer.get() + " s, "
            + drivetrain.getPose());

        // Scheduling the step's command interrupts whatever command had the drivetrain.
        autoStepCommand = getStepCommand(newStep);
        CommandScheduler.getInstance().schedule(autoStepCommand);
    }

    /**
     * The command that does one step of the course.
     *
     * @param step one of the STEP_ constants
     * @return the command for that step
     */
    private Command getStepCommand(int step) {
        switch (step) {
            case STEP_DRIVE_LEG_1:
                return driveLeg1;
            case STEP_TURN_LEFT:
                return turnLeft;
            case STEP_DRIVE_TO_LINE:
                return driveToLine;
            default:
                return holdStill;
        }
    }

    @Override
    public void teleopInit() {
        SmartDashboard.putString("Mode", "Teleop");
        DataLogManager.log("Mode: Teleop");

        // Autonomous is over, so its light and its step are too, even if the routine never finished.
        autoLight.cancel();
        autoStepCommand.cancel();
    }

    @Override
    public void teleopPeriodic() {
        // Nothing here. The drivetrain's default command drives with the sticks.
    }

    // Simulation (Section 17.9)

    @Override
    public void simulationPeriodic() {
        // An XRP program always runs as a simulation on your laptop (Section 17.2), so this
        // method runs with the real robot too. Only pretend when the robot is pretend.
        if (USE_SIMULATED_ROBOT) {
            simulateSensors();
        }
    }

    /**
     * Give the simulated robot a simulated floor: nothing ahead of it, and black tape
     * everywhere past the line. The XRP's sensor classes read these as if they were real.
     */
    private void simulateSensors() {
        // Rangefinder: 5 volts is the most it can read, 4 meters. The way ahead is clear.
        rangefinderSim.setVoltage(5.0);

        // Reflectance: 5 volts is black, 0 volts is white. The tape is LINE_DISTANCE_METERS up the y axis.
        boolean pastTheLine = drivetrain.getPose().getY() >= LINE_DISTANCE_METERS;
        double reflectanceVolts = pastTheLine ? 5.0 : 0.0;
        leftReflectanceSim.setVoltage(reflectanceVolts);
        rightReflectanceSim.setVoltage(reflectanceVolts);
    }

    // Test mode: the tuning bench and the SysId tests, all commands now (Section 19.8).

    @Override
    public void testInit() {
        SmartDashboard.putString("Mode", "Test");
        DataLogManager.log("Mode: Test (tuning bench and SysId)");

        // Start clean: nothing left over from another mode (WPILib's template does this too).
        CommandScheduler.getInstance().cancelAll();
        drivetrain.resetPose(START_POSE);
        lastDpad = -1;
    }

    @Override
    public void testPeriodic() {
        // Each button starts a command. A new command interrupts the one using the
        // drivetrain, and when a command ends, the sticks get the drivetrain back.
        if (controller.getAButtonPressed()) {
            CommandScheduler.getInstance().schedule(benchTurnHome);
        }
        if (controller.getBButtonPressed()) {
            CommandScheduler.getInstance().schedule(benchTurnLeft);
        }
        if (controller.getXButtonPressed()) {
            CommandScheduler.getInstance().schedule(benchDriveOut);
        }
        if (controller.getBackButtonPressed()) {
            CommandScheduler.getInstance().schedule(benchDriveBack);
        }

        // Left bumper (hold): cruise forward on feedforward alone. Let go to stop.
        if (controller.getLeftBumperButtonPressed()) {
            CommandScheduler.getInstance().schedule(benchCruise);
        }
        if (controller.getLeftBumperButtonReleased()) {
            benchCruise.cancel();
        }

        // D-pad (hold): a SysId test.
        updateSysIdTests();
    }

    /** When the D-pad changes, stop any SysId test, then start the one now held (if any). */
    private void updateSysIdTests() {
        int dpad = controller.getPOV();
        if (dpad == lastDpad) {
            return;   // nothing changed since last loop
        }
        lastDpad = dpad;

        CommandScheduler.getInstance().cancel(
            sysIdQuasistaticForward, sysIdQuasistaticReverse,
            sysIdDynamicForward, sysIdDynamicReverse);

        switch (dpad) {
            case 0:     // up
                CommandScheduler.getInstance().schedule(sysIdQuasistaticForward);
                break;
            case 180:   // down
                CommandScheduler.getInstance().schedule(sysIdQuasistaticReverse);
                break;
            case 90:    // right
                CommandScheduler.getInstance().schedule(sysIdDynamicForward);
                break;
            case 270:   // left
                CommandScheduler.getInstance().schedule(sysIdDynamicReverse);
                break;
            default:    // let go, or a diagonal: no test
                break;
        }
    }
}
```

The rest of this section walks through the four big changes.

### The default command, wired up

In the constructor:

```java
drivetrain.setDefaultCommand(new DriveWithSticks(
    drivetrain,
    sensors,
    () -> -MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND),
    () -> -MathUtil.applyDeadband(controller.getRightX(), STICK_DEADBAND),
    controller::getRightBumperButton));
```

Read it aloud: "The drivetrain's default command is a new `DriveWithSticks`, using the drivetrain and the sensors, with forward from the left stick's Y (deadbanded and flipped), rotation from the right stick's X (deadbanded and flipped), and slow mode from the right bumper." Two lambdas and one method reference, each filling in a functional interface from Chapter 18. The minus signs and the deadband are the same ones your `teleopPeriodic()` had since Chapter 8; they moved into the lambdas, because they are about the controller, not about driving.

`setDefaultCommand` is one of the methods `Drivetrain` inherited from `Subsystem` (Section 19.4). It checks one thing: the default command must **require** the subsystem it is the default for. If you forget `addRequirements(drivetrain)` in `DriveWithSticks`, the program stops the moment it starts, with:

```
java.lang.IllegalArgumentException: Default commands must require their subsystem!
```

Read the stack trace the Chapter 10 way, and the first `frc.robot` line points straight at the `setDefaultCommand` call.

And `teleopPeriodic()`, the method that did everything for eleven chapters?

```java
@Override
public void teleopPeriodic() {
    // Nothing here. The drivetrain's default command drives with the sticks.
}
```

### Autonomous: one command per step

Chapter 20 will turn the whole course into a single command: `driveLeg1.andThen(turnLeft).andThen(driveToLine)`. Until then, the Explorer uses a bridge: the old `switch` structure stays, but each step's **work** is done by a command, and the step code only decides **which** command runs next.

The four step commands are created once, in the constructor:

```java
driveLeg1 = new DriveDistance(drivetrain, LEG_1_DISTANCE_METERS);
turnLeft = new TurnToHeading(drivetrain, TURN_HEADING_DEGREES);
driveToLine = new DriveUntilLine(drivetrain, sensors, LEG_2_MAX_DISTANCE_METERS);
holdStill = Commands.run(drivetrain::stop, drivetrain).withName("Hold Still");
```

The first three are your classes. The fourth is built from a lambda: `Commands.run` with a method reference that stops the drivetrain every loop, and, after it, the drivetrain as a **requirement** (Chapter 18 promised you would add requirements to factory commands one day). It never finishes. Its whole job is to **hold** the drivetrain after the course, so the default command cannot start and let the sticks drive during autonomous. In a match, nobody should be touching the controller in autonomous, but "should not" is not a safety system.

`startStep()` now does two things: restart the step timer, and schedule the step's command, chosen by `getStepCommand()` (a `switch` whose cases `return`, as in Chapter 16). `autonomousPeriodic()` is reduced to two questions, every loop:

1. **Has this step run too long?** Then go to `STEP_DONE`. Scheduling `holdStill` interrupts the step's command, because both require the drivetrain. You do not cancel the old command yourself; the one-command-per-subsystem rule does it, and the old command's `end(true)` stops the motors and logs "interrupted."
2. **Has this step's command ended?** `autoStepCommand.isScheduled()` is `true` while the scheduler is running it, and `false` once it has finished. Then start the next step.

Notice everything that is **not** here any more: no `drivetrain.drive(...)` calls, no PID math, no `atSetpoint()`, no `getStepDistanceMeters()`, no `stepStartDistanceMeters`. All of that lives in the commands, written once.

In `teleopInit()`, one line joins Chapter 18's `autoLight.cancel()`:

```java
autoStepCommand.cancel();
```

If autonomous ends with `holdStill` still holding the drivetrain (it always does, after a finished course), this lets go, and the default command gets the sticks back. And `autoStepCommand` starts out as `Commands.none()`, a command that does nothing at all, rather than `null`. That way, `teleopInit()` can call `cancel()` on it even if autonomous never ran, without a `NullPointerException` (Chapter 10).

> **A bridge, not a destination**
>
> Look at what you just built: a `switch` that waits for one command to end, then starts the next. That is a small, hand-built version of a **sequential command group**, and it has small hand-built flaws. For one loop between steps, the drivetrain is idle, so the scheduler briefly starts the default command, which is interrupted again before it ever drives. Chapter 20 replaces the whole thing with `andThen`, which hands the drivetrain straight from one command to the next with no gap, and deletes `autoStep`, `startStep()`, and `getStepCommand()` for good.

### Test mode: buttons start commands

The tuning bench used to hold two targets in fields and run both PID controllers all the time. Now each button just **schedules** a command:

| Button | Command | What happens |
|---|---|---|
| A | `TurnToHeading` to 0 | Turn back to face down leg 1 |
| B | `TurnToHeading` to 90 | Turn left to face up leg 2 |
| X | `DriveDistance` 0.30 m | Drive out 0.30 m from here |
| Back | `DriveDistance` -0.30 m | Drive back 0.30 m from here |
| Left bumper (hold) | `Bench Cruise` | Feedforward-only cruise at 0.10 m/s; let go to stop |
| Sticks | `DriveWithSticks` (default) | Whenever no bench command is running |

(Back is the small button left of center on an Xbox controller. Newer controllers label it **View**, with two overlapping rectangles.)

Two things about this table are new. First, **the sticks work in Test mode now**, because the default command runs whenever nothing else needs the drivetrain. After X drives out, you can drive back by hand, or press Back. Second, **commands interrupt each other.** Press X, and while the robot is driving out, press B. `DriveDistance` is interrupted (its log says so), and the turn starts at once. The old bench needed careful code to make that work. Now it is just the rule.

The cruise is built from lambdas, like `holdStill`:

```java
benchCruise = Commands.runEnd(
        () -> drivetrain.drive(BENCH_CRUISE_METERS_PER_SECOND, 0.0),   // every loop
        drivetrain::stop,                                               // at the end
        drivetrain)
    .withName("Bench Cruise");
```

`Commands.runEnd` is a cousin of Chapter 18's `startEnd`: its first action runs **every loop**, and its second runs once, at the end. It is scheduled when the left bumper is **pressed** and cancelled when it is **released**, which gives you "hold to run."

> **Pressed, not held**
>
> The bench uses `getAButtonPressed()`, not `getAButton()`. "Pressed" is `true` for one loop, the moment the button goes down. If you used `getAButton()`, then for as long as your thumb is on A, the bench would schedule the turn again every loop. Scheduling a command that is already running does nothing, so you would not see a problem at first. Then the turn finishes while your thumb is still down, and it immediately starts over. Chapter 20's button bindings make this choice explicit, with names like `onTrue` and `whileTrue`.

### SysId: WPILib's routine does the bookkeeping

In Chapter 16, the four SysId tests took six helper methods, five fields, and a latch, because a test is an action that lasts many loops and has to clean up however it ends. In other words, a test is a command. WPILib agrees, and gives you a class that builds the four test commands for you: `SysIdRoutine`.

It needs two things. A **config**, with the ramp rate, the step voltage, and the timeout (the same numbers as Chapter 16, as units-library measures):

```java
new SysIdRoutine.Config(
    Volts.of(SYSID_RAMP_VOLTS_PER_SECOND).per(Second),
    Volts.of(SYSID_STEP_VOLTS),
    Seconds.of(SYSID_TIMEOUT_SECONDS))
```

and a **mechanism**: how to drive it, how to log it, what it requires, and its name in the log:

```java
new SysIdRoutine.Mechanism(
    volts -> drivetrain.setVolts(volts.in(Volts), volts.in(Volts)),
    drivetrain::logSysId,
    drivetrain,
    "drive")
```

Read the first line aloud: "given some volts, drive both sides at that many volts." It is a lambda with **one parameter**, `volts`, filling in a functional interface called `Consumer<Voltage>` ("something that takes a `Voltage` and does something with it"). Chapter 18's lambdas all had empty parentheses; this one has a name in them, because WPILib hands it a value each time. `drivetrain::logSysId` is your Chapter 16 logging method, passed as a method reference, and since it takes one `SysIdRoutineLog`, it fits a `Consumer<SysIdRoutineLog>`. The name `"drive"` keeps the log entries exactly as Chapter 16 named them (`voltage-left-drive`, `sysid-test-state-drive`, and so on), so your SysId analysis settings still work.

Then `sysIdRoutine.quasistatic(...)` and `sysIdRoutine.dynamic(...)` each return a ready-made command that ramps or steps the volts, logs every loop, records the test state, stops at the timeout, and, in its cleanup, sends zero volts and records the end of the test. The Explorer adds one decorator to each, the distance safety net:

```java
sysIdQuasistaticForward = sysIdRoutine.quasistatic(SysIdRoutine.Direction.kForward)
    .until(() -> drivetrain.getAverageDistanceMeters() >= SYSID_MAX_DISTANCE_METERS)
    .withName("SysId Quasistatic Forward");
```

The net is a little different from Chapter 16's. It used to stop each test 0.75 m from where **that test** started. Now it is a line on the floor 0.75 m in front of where Test mode started (`testInit()` resets the pose), and the reverse tests have a matching line 0.75 m behind. Leave that much room behind the robot.

`updateSysIdTests()` watches the D-pad. When it **changes**, it cancels every SysId test and schedules the one for the new direction, if any. That is the Chapter 10 "did it just change?" pattern again, with `lastDpad` as its memory. And the latch, `sysIdWaitingForRelease`? Gone, and not replaced. A test only ever **starts** when the D-pad changes, so a test stopped by a safety net cannot restart until you let go and press again. The structure made the bug impossible.

> **What left `Robot.java`**
>
> Count the "Remembered from loop to loop" fields. Chapter 18's table had nine (counting the imagined `aligning`). Now there are three: `autoStep` and `autoStepCommand` (for the autonomous bridge, gone in Chapter 20) and `lastDpad`. Every other piece of "what am I in the middle of?" now lives inside the command that is in the middle of it: the start distance in `DriveDistance`, the wall memory in `DriveWithSticks`, the test timer inside WPILib's SysId commands. That is Section 18.2's first growing pain, solved.

---

## 19.9 Run It: Every Mode, on Commands

This is the second safe place to stand, and the bigger test. Build, switch on the XRP, and run the program with `USE_SIMULATED_ROBOT = false`. Keep these open in the Simulation GUI: **NetworkTables** > **SmartDashboard** > **Scheduler** and **Drivetrain**, and the terminal.

### Teleop

1. While **disabled**, the Scheduler list is empty, and Drivetrain's `.default` says `DriveWithSticks`. Its `.command` says `none`: default commands do not start while the robot is disabled.
2. Enable **Teleoperated**. `DriveWithSticks` appears in the Scheduler list, and `.command` says `DriveWithSticks`. Drive. Everything from Chapters 8 to 11 should feel exactly the same: the deadband, slow mode on the right bumper, gentler turns, limited reverse, and the wall stop with its log messages.

### Autonomous

3. Press Y, then enable **Autonomous**. Watch the Scheduler list. `Auto Light` and `DriveDistance` appear first. Then `DriveDistance` is replaced by `TurnToHeading`, then by `DriveUntilLine`, and finally by `Hold Still`, while `Auto Light` disappears. The terminal tells the same story:

```
Mode: Autonomous
Auto step 1 started at 0.0 s, Pose2d(...)
DriveDistance 0.5 m started at Pose2d(...)
DriveDistance finished after 0.497 m
Auto step 2 started at 2.6 s, Pose2d(...)
TurnToHeading 90.0 deg started
TurnToHeading finished at 89.1 deg
Auto step 3 started at 4.1 s, Pose2d(...)
DriveUntilLine started at Pose2d(...)
Line found after 0.392 m
Auto step 4 started at 6.2 s, Pose2d(...)
```

(Your numbers will differ, and real ones will have more decimal places. What matters is the order, and that every command says "finished," not "interrupted.") The robot should drive the course just as well as it did in Chapter 18. The math did not change; only where it lives did.

4. Run it again, and **disable** halfway through leg 1. Everything stops at once: `DriveDistance interrupted after ...` in the terminal, the LED goes out, and the Scheduler list empties. Enable autonomous again: the routine starts over cleanly, because every command resets itself in `initialize()`.
5. Run it again, and switch straight to **Teleoperated** partway through the turn. The turn is interrupted, and on the next loop, `DriveWithSticks` has the drivetrain.

### Test mode

6. Enable **Test**. The sticks drive. Press B: the robot turns to 90 and stops, and the sticks work again. Press A: it turns back to 0. Press X, then Back: out 0.30 m, and back 0.30 m.
7. Press X, and while it is driving, press B. The terminal shows `DriveDistance interrupted`, and the turn starts. Press X twice in a row, waiting for the first to finish: the robot drives out 0.30 m **each** time, because each run reads its start in `initialize()`.
8. Hold the left bumper for the cruise check, as in Chapter 16. `Measured Forward (m per s)` should settle near 0.10. Let go, and it stops.
9. If you want to re-run SysId, run all four D-pad tests in one run of the program, exactly as in Section 16.6. Each test now shows by name in the Scheduler list while it runs. The log file has the same entries as before, so SysId analyzes it the same way.

### The simulated Explorer

Switch the XRP off, set `USE_SIMULATED_ROBOT = true`, and repeat checks 2, 3, 6, and 7 on the simulated robot. Nothing about commands knows or cares which robot it is driving; that was Chapter 17's whole point, and it still holds. Set `USE_SIMULATED_ROBOT = false` again before you commit.

> **Command stuck in the list?**
>
> If a command stays in the Scheduler list long after the robot has stopped moving, its `isFinished()` is never returning `true`. Check that the command overrides `isFinished()` at all (the inherited one says "never"), that it has `@Override`, and that its tolerances are achievable on your robot: a heading tolerance of 2 degrees and a rate tolerance of 10 degrees per second must both be met at once. The `Heading Error (deg)` and `Heading At Target` widgets show which one is failing.

Diagnose anything else strange:

| What you see | Most likely cause |
|---|---|
| `Default commands must require their subsystem!` at startup | `DriveWithSticks` is missing `addRequirements(drivetrain)` |
| The sticks do nothing in teleop, and the Scheduler list is empty | `setDefaultCommand` is missing, or the scheduler's `run()` is missing from `robotPeriodic()` |
| The sticks do nothing in teleop, and `Hold Still` is listed | `teleopInit()` is missing `autoStepCommand.cancel()` |
| X works the first time, then does nothing | A start distance is read in the constructor, not `initialize()` (Section 19.6) |
| Autonomous skips straight through all its steps | A command's `isFinished()` is `true` before it starts moving: check the controller is `reset()` in `initialize()` and that `calculate` is called in `execute()` |
| The simulated robot runs at double speed | `drivetrain.periodic()` is still called in `robotPeriodic()` (Section 19.3) |
| A bench button needs to be pressed twice | You used `getXButton()` instead of `getXButtonPressed()` |

When every mode works on both robots, commit. Your Explorer is now a command-based robot: one subsystem, a default command, and commands for every action, with `Robot.java` deciding only **when** each one runs.

---

## 19.10 Subsystems and Commands Everywhere

What you built in this chapter is the shape of every robot program for the rest of this book.

- **Chapter 20, button bindings and command groups.** `RobotContainer` takes over the job of creating subsystems and commands from `Robot`. The `getAButtonPressed()` checks in `testPeriodic()` become **bindings** (`controller.a().onTrue(...)`, `whileTrue(...)`), and the autonomous bridge becomes one command: `driveLeg1.andThen(turnLeft).andThen(driveToLine)`, plus a step where two things happen at once. You will also do the pair merge-conflict lab, two programmers changing command classes at the same time.
- **Chapter 21, state machines.** A line-following command whose `execute()` is a small state machine, and the discovery that a sequence of commands **is** a state machine.
- **Chapter 22, unit tests.** A command is a small object with a clear start and finish, so you can test one: create a `Drivetrain(new DrivetrainIOSim())`, run `DriveDistance` on it for a few simulated seconds, and check how far it went.
- **Chapter 23, live tuning.** The gains in `Drivetrain` become tunable while the robot runs, for every command at once.
- **Chapters 26 to 33, the Mini Swerve.** A `Drive` subsystem with four swerve modules, each with its own IO layer, in `frc.robot.subsystems`. `DriveWithSticks` becomes field-oriented, and vision brings an auto-align command that borrows the drivetrain from it.
- **Chapters 34 and 35, the competition robot.** An arm, an elevator, and an intake, each a subsystem with a default command, and commands that require two subsystems at once.

---

## Chapter Summary

> **What you learned in Chapter 19**
>
> * A plan table turns into code by kind: each **kind** of action becomes one command class (`TurnToHeading`, `DriveDistance`, `DriveUntilLine`, `DriveWithSticks`), and each use becomes one **object** with its own numbers. `Sensors` is not a subsystem, because nothing needs to control it.
> * New Java: a **package** is a folder of classes, declared by the `package` line. A class's full name includes its package, `import` lets you use the short name, and only `public` things can be used from another package. Leaving out the modifier makes something **package-private**.
> * `Drivetrain extends SubsystemBase` makes it a subsystem. Its constructor calls `SubsystemBase()` first (**`super()`**, automatically), which registers it with the scheduler, so the scheduler now calls its `periodic()`.
> * New Java: an **abstract** class cannot be created with `new`; it exists to be extended. A subclass inherits its methods, and **overrides** only the ones it changes, always with `@Override`. `Command` gives every command four methods with default bodies (`isFinished()` returns `false`), a `protected` constructor, and a `final` `addRequirements`.
> * A command's **constructor** runs once and stores only what never changes; **`initialize()`** runs every time the command starts and reads everything about this run. Reading a start position in the constructor is the "now or later?" bug again.
> * A **default command** runs whenever no other command requires its subsystem, in every enabled mode. `DriveWithSticks` is handed suppliers for the sticks, so it reads them fresh every loop without knowing which controller they come from.
> * The Explorer now runs every mode on commands: autonomous schedules one command per step, Test mode buttons schedule bench commands, WPILib's `SysIdRoutine` builds the SysId tests, and `teleopPeriodic()` is empty.

---

## Exercises

### Practice

**1. Package detective.** In a practice branch, list every `import` in `Robot.java` in `reflections.md`, grouped by package. Which packages are yours, which are WPILib's, and which are AdvantageKit's? Then delete the line `import frc.robot.commands.TurnToHeading;` and, instead, change one use of it to the fully qualified name: `new frc.robot.commands.TurnToHeading(drivetrain, 0.0)`. Does it build? Finally, remove `public` from `TurnToHeading`'s constructor, build, and copy the error message into `reflections.md` with one sentence explaining it in your own words. Delete the branch when you are done.

**2. The constructor trap, on purpose.** In a practice branch, move the two lines that set `startDistanceMeters` and `holdHeadingDegrees` from `DriveDistance.initialize()` into its constructor. Before running, predict what the bench X button will do the first, second, and third time you press it, without moving the robot in between. Write your predictions down. Run it and compare. Then predict and test one more case: what does autonomous do on its **second** run, after you press Y to reset the pose? Put the lines back.

**3. Same command, different sticks.** `DriveWithSticks` does not care where "forward" comes from. In a practice branch, change only the lambdas in `setDefaultCommand` so that the **triggers** drive: right trigger forward, left trigger backward (`controller.getRightTriggerAxis() - controller.getLeftTriggerAxis()`), and the left stick's X steers. Notice that `DriveWithSticks.java` did not change at all. In two sentences, explain why that is a good thing for a team with two drivers who like different controls.

**4. Write a command from scratch: `DriveForTime`.** Write `DriveForTime(Drivetrain drivetrain, double metersPerSecond, double seconds)` in `commands`. It drives straight at a speed for a time, using a `Timer` field (Chapter 12): restart it in `initialize()`, and finish when `hasElapsed(seconds)`. Do not forget `addRequirements` and a `drivetrain.stop()` in `end()`. Add it to the bench on the right bumper (`getRightBumperButtonPressed()`) at 0.10 m/s for 2.0 seconds. Before you run it, predict how far it will go, using `Measured Forward (m per s)`. How close was the prediction? Why might it fall short? (Hint: Chapter 16's kA.)

**5. Challenge: an LED subsystem.** Create `Led extends SubsystemBase` in `subsystems`, wrapping the `XRPOnBoardIO` with `setOn(boolean)`. Move the `onBoardIO` field out of `Robot` and into `Led`. Change `Auto Light` to `Commands.startEnd(() -> led.setOn(true), () -> led.setOn(false), led)`. Then add a bench command on the right stick button (`getRightStickButtonPressed()`) that blinks the LED: `Commands.run(...)` toggling every 0.2 s, `.withTimeout(2.0)`, requiring `led`. Run autonomous, switch to Test, and press it. Then start autonomous and, in a practice change, schedule the blink from `autonomousInit()` right after `Auto Light`. What happens to `Auto Light`, and why? Give `Led` a default command that turns the LED off. Does anything change?

**6. Class or factory?** `holdStill` is one line: `Commands.run(drivetrain::stop, drivetrain)`. Write it instead as a class, `HoldStill extends Command`, with the four methods it needs (which ones are those?). Count the lines. Then go the other way: could `TurnToHeading` be written with `Commands.run(...)` and decorators? Try it, and write three sentences in `reflections.md` on when you would choose a class and when a factory. (Hint: where would the PID controller live, and how would `initialize()`'s reset happen?)

### Build (XRP Explorer)

Turn the drivetrain into a subsystem, write four command classes, and run every mode on commands.

1. Make a branch (see the Git exercise).
2. Create the `subsystems` and `commands` folders, move the four drivetrain files, fix their `package` lines, and add the four imports to `Robot.java` (Section 19.2). Build.
3. Make `Drivetrain` extend `SubsystemBase`, add `@Override` to `periodic()`, delete `drivetrain.periodic()` from `robotPeriodic()`, and publish the drivetrain to the dashboard (Section 19.3).
4. On the real XRP, run the Section 19.3 check: teleop, autonomous, and the cruise check behave exactly as at the end of Chapter 18. Commit.
5. Copy your tuned PID gains and auto speed limits into `Drivetrain` as `public static final` constants, and add `createDistanceController()` and `createHeadingController()` (Section 19.5).
6. Create `TurnToHeading`, `DriveDistance`, `DriveUntilLine`, and `DriveWithSticks` in `commands` (Sections 19.5 to 19.7). Build: nothing uses them yet.
7. Replace `Robot.java` with the Section 19.8 listing. Keep your own values in every constant that you measured or tuned. Delete the old copies of the constants that moved to `Drivetrain`.
8. On the real XRP, run all nine checks in Section 19.9: teleop, autonomous (including disabling mid-route and switching straight to teleop), and Test mode (bench, interrupting, the cruise).
9. On the simulated Explorer, repeat checks 2, 3, 6, and 7. Set `USE_SIMULATED_ROBOT = false` again.
10. **Update your plan.** In `reflections.md`, add a third column to your Chapter 18 plan table, "Now written as," and fill it in for every row: the class or factory that implements it, and its name in the Scheduler list. Circle (or bold) any row that is still not a command. Chapter 20 starts from those.

Diagnose anything strange with the table at the end of Section 19.9. Two more, specific to the move:

- **`The declared package "frc.robot" does not match the expected package "frc.robot.subsystems"`:** you moved a file but did not change its first line (Section 19.2, Step 3).
- **`cannot find symbol ... class Drivetrain` in `Robot.java`:** the `import frc.robot.subsystems.Drivetrain;` line is missing.

When the Explorer drives the course, the bench, and teleop entirely on commands, on both robots, you are ready for Chapter 20.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. `DriveDistance` reads its starting distance in `initialize()`, not in its constructor. Describe exactly what would go wrong on the tuning bench if it were the other way round, and connect it to Chapter 18's "now or later?" question.
2. `Drivetrain` never calls `CommandScheduler.getInstance().registerSubsystem(this)`, and you never call it either. So how does the scheduler know to run `Drivetrain.periodic()`? Use the words "parent," "constructor," and "first."
3. The default command runs in every enabled mode. Explain why that forced this chapter to convert autonomous and Test mode at the same time as teleop, and why `holdStill` exists.
4. `DriveWithSticks` takes three suppliers instead of the `XboxController`. Give two advantages of that design, one for today and one for Chapter 22's unit tests.

If any answer feels shaky, re-read Sections 19.4, 19.6, and 19.8.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b subsystems-and-commands
```

After Build step 4, commit the safe place:

```bash
git add .
git commit -m "Ch19: packages and Drivetrain as a subsystem"
```

After Build step 9, with `USE_SIMULATED_ROBOT = false`:

```bash
git add .
git commit -m "Ch19: command classes, default command, every mode on commands"
git push -u origin subsystems-and-commands
```

Open a pull request into `main`. Look at **Files changed** before you merge, and notice how Git shows the moved files: as `Drivetrain.java` deleted from one folder and added to another, or, if Git notices that the contents barely changed, as a **rename** from `frc/robot/Drivetrain.java` to `frc/robot/subsystems/Drivetrain.java`. Git detects renames by comparing contents, not by watching you drag files, which is why it helps to move files in one commit and change them in a later one, as you did here. Merge, delete the branch, then `git checkout main` and `git pull`.

Why two commits? Because the first one is a pure move plus a one-word change, and the robot behaved exactly as before. If anything goes wrong later, `git bisect` (Chapter 10) can tell you in one step whether the move or the rewrite caused it.

### Collab: Command Review

Chapter 20's pair lab has two people changing command classes at once. Practice reading each other's first.

1. Pair up. Each of you writes one new command class from this list, on your own branch, without showing your partner: `DriveForTime` (Practice 4), `BackAwayFromWall` (drive backward slowly until the rangefinder reads more than 0.30 m), or `SquareUp` (turn to the nearest multiple of 90 degrees, using `Math.round(heading / 90.0) * 90.0`, read in `initialize()`).
2. Open a pull request and ask your partner to review it. The reviewer checks every item on this list, and leaves a comment on any line that fails one:
   - Does every method that should be overridden have `@Override`?
   - Does the constructor call `addRequirements` for every subsystem the command controls, and only those?
   - Is anything about **this run** read in the constructor instead of `initialize()`?
   - Does `isFinished()` exist, and can it actually become `true` on this robot?
   - Does `end()` stop the motors, whether or not it was interrupted?
   - Is everything another package needs `public`, and everything else `private`?
3. Fix what the review found, and merge.

Afterward, each of you writes two sentences in `reflections.md`: which checklist item caught something, and which one you would add to the list.

### Explore

Open the **XRP Reference** example you created for Chapter 18's Explore exercise (or create it again: **WPILib: Create a new project** > **Example** > **XRP Reference**, in a scratch folder). It is organized the same way your Explorer is now.

- Open its `subsystems` and `commands` folders. Which subsystems does it have? Is there one the Explorer does not?
- Open its `DriveDistance` command and compare it with yours. How does it measure distance: by resetting the encoders in `initialize()`, or by remembering a start? Which approach would break the Explorer's odometry (Chapter 14), and why?
- Find where it sets the drivetrain's default command, and compare the lambdas it passes with yours.
- WPILib's example names its fields with an `m_` prefix (`m_drive`, `m_distance`), a convention many teams use for "member" (field) variables. The Explorer uses `this.` instead. Write two sentences in `reflections.md` on which you prefer, and why it matters more that a team agrees than which one it picks.

---

> **Additional Resources**
>
> * **Subsystems**: [docs.wpilib.org/en/stable/docs/software/commandbased/subsystems.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/subsystems.html) WPILib's guide to `SubsystemBase`, `periodic()`, and default commands
> * **Commands**: [docs.wpilib.org/en/stable/docs/software/commandbased/commands.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/commands.html) writing command classes, the four methods, and requirements, with the factory alternatives
> * **Structuring a Command-Based Robot Project**: [docs.wpilib.org/en/stable/docs/software/commandbased/structuring-command-based-project.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/structuring-command-based-project.html) the standard `subsystems` and `commands` package layout, and what goes where
> * **Creating an Identification Routine**: [docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/creating-routine.html](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/creating-routine.html) WPILib's guide to `SysIdRoutine`, its config, and its mechanism
> * **Creating and Using Packages (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/package/packages.html](https://docs.oracle.com/javase/tutorial/java/package/packages.html) Java's official lesson on packages, imports, and fully qualified names
> * **Abstract Methods and Classes (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/IandI/abstract.html](https://docs.oracle.com/javase/tutorial/java/IandI/abstract.html) abstract classes, and how they compare with interfaces

---

*Next up, Chapter 20: Button Bindings, RobotContainer, and Command Groups. You will move the robot's wiring into `RobotContainer`, tie buttons to commands with bindings instead of `if` statements, and turn the whole obstacle course into a single command built from the ones you wrote here.*
