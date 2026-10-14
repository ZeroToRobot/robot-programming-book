# Chapter 20: Button Bindings, RobotContainer, and Command Groups

In Chapter 19 you turned the Explorer into a command-based robot. `Drivetrain` became a subsystem, every action became a command, and `teleopPeriodic()` went empty. At the end, you went back to your plan table in `reflections.md` and marked every row that was **still** not a command. A few were left over, and so was a feeling that `Robot.java` was not finished. It still decides, one loop at a time, which button was just pressed and which autonomous step comes next.

This chapter finishes the job. You will tie buttons to commands with **bindings**, so that "when A is pressed, turn to 90" is written once instead of checked every loop. You will turn the whole obstacle course into **one command**, built out of the commands you already wrote, with the LED running alongside it. And you will move all of the robot's wiring into a new class called **`RobotContainer`**, with its numbers in a new file called **`Constants.java`**. When you are done, `Robot.java` will look almost exactly like WPILib's own command-based template, and you will know what every line of it is for.

On the Java side, you will learn two things that show up in every large program. The first is a class that nobody is ever supposed to create: a **`final` class with a `private` constructor**, which is how `Constants`, `MathUtil`, and `Commands` are built. The second is an **object made of objects of its own kind**: a command group is a command that holds other commands, which may themselves be groups.

There is less brand-new code in this chapter than in Chapter 19, and more moving of code you already have. Moving code is where small mistakes hide, so the chapter stops twice to check that the robot behaves exactly as before, and you commit at each of those safe places.

You will need your XRP for both checks and for the Build exercise.

---

## 20.1 What Is Still Not a Command

Open your plan table in `reflections.md`. In Chapter 19's Build exercise, you added a "Now written as" column and bolded every row that was still not a command. Yours probably looks something like this:

| Action | Now written as |
|---|---|
| Drive leg 1, turn, drive until the line | `DriveDistance`, `TurnToHeading`, `DriveUntilLine` |
| **Run the steps in order** | **`autoStep`, `startStep()`, `getStepCommand()`, `autonomousPeriodic()`** |
| Stop and stay stopped after the course | `Hold Still` (`Commands.run`) |
| Drive with the sticks | `DriveWithSticks` (default command) |
| **Start a bench command when a button is pressed** | **`if (controller.getAButtonPressed())` in `testPeriodic()`** |
| **Start and stop a SysId test with the D-pad** | **`updateSysIdTests()` and `lastDpad`** |
| Auto Light | `Commands.startEnd(...).until(() -> autoStep == STEP_DONE)` |
| **Y: reset the pose** | **`if (controller.getYButtonPressed())` in `robotPeriodic()`** |

Every bold row has the same shape. Something in `Robot.java` **asks a question every loop** ("was A just pressed?", "has this step's command ended?", "did the D-pad change?") and, when the answer is yes, starts a command. Here is the clearest example, from `testPeriodic()`:

```java
if (controller.getAButtonPressed()) {
    CommandScheduler.getInstance().schedule(benchTurnHome);
}
if (controller.getBButtonPressed()) {
    CommandScheduler.getInstance().schedule(benchTurnLeft);
}
// ...and so on, for every button
```

That works. But think about what it costs. Each button needs an `if` statement in a periodic method. The "pressed, not held" choice from Section 19.8 has to be made correctly every time, by choosing between `getAButton()` and `getAButtonPressed()`. Hold-to-run, like the left bumper's cruise, takes two `if` statements, one for pressed and one for released. And the D-pad needed a whole helper method and a remembered field, just to notice when it changed.

### Asking every loop, or saying it once

There are two ways to get a pizza delivered. You can walk to the front door every 20 milliseconds and look outside. Or you can install a doorbell, and get on with your day until it rings.

`testPeriodic()` is walking to the door. It is a style of programming called **imperative**: you write out, step by step, what the computer should do every loop. Everything you have written since Chapter 5 has been imperative, and it is the right way to think about what happens **inside** a command.

The doorbell is a style called **declarative**. You **declare** a rule once, when the robot starts up ("when A is pressed in Test mode, run the turn to heading 0"), and the library takes care of checking it every loop and acting at the right moment. You never write the check yourself. Command-based programming is built for this style. WPILib's documentation calls it exactly that: a declarative way to describe a robot.

The scheduler already has a slot for this. Look back at its loop in Section 18.5. Step 2, which you have not used yet, is **"buttons are checked."** That is the doorbell.

> **The kitchen, one more time**
>
> In Chapter 18's kitchen, the head chef runs the line, and each cook does one job. So far, someone has been standing at the pass shouting, every few seconds, "Is table 4's soup done yet? Then start the steak!" A real kitchen does not work that way. The order is written on a ticket, **once**: soup, then steak, then dessert. The chef reads the ticket and keeps it moving. In this chapter, the obstacle course becomes a ticket.

### The plan

This chapter makes four moves, in this order:

1. **Constants** (Section 20.2). The numbers move out of `Robot.java` into `Constants.java`, so the robot's other files can share them.
2. **Command groups** (Sections 20.3 to 20.5). The autonomous bridge becomes one command, and `autoStep` disappears.
3. **Bindings** (Section 20.6). Every "was this pressed?" `if` becomes a one-line rule.
4. **`RobotContainer`** (Section 20.7). The robot's wiring moves out of `Robot.java`, which shrinks to the size of WPILib's template.

Each move leaves the robot working, so you can stop between any two of them.

---

## 20.2 New Java: A Class Nobody Creates

Count the constants at the top of your `Robot.java`. There are more than twenty: the controller port, the deadband, the course distances and poses, the bench distances, the SysId settings. In Chapter 8 you were promised that by Chapter 20 they would move into a file of their own, "so the whole team has one place to look." In Section 20.7, a second class, `RobotContainer`, will need most of them, and `Robot` will still need one. A number that two classes need should not be `private` to either one. It needs a neutral home.

That home is a class called `Constants`. It is a strange kind of class: it holds nothing but `public static final` values, and nobody is ever supposed to create a `Constants` **object**. There would be no point. Every value in it is `static`, so it belongs to the class itself, not to any object (Chapter 7). Java has two tools for saying "this class is not for making objects."

### A `private` constructor: nobody can call `new`

Try this anywhere in `Robot.java`, just to see it fail:

```java
MathUtil helper = new MathUtil();   // ERROR
```

```
error: MathUtil() has private access in MathUtil
```

You have called `MathUtil.applyDeadband(...)` and `MathUtil.clamp(...)` since Chapter 8, always through the class name, never through an object. Here is why you could not have done it any other way. WPILib's source starts like this:

```java
public final class MathUtil {
    private MathUtil() {}
    // ...dozens of public static methods...
}
```

The constructor is `private`, so only code **inside** `MathUtil` could call it, and none does. That one line makes `new MathUtil()` a compile error everywhere else. It does not prevent anything you would want to do: every method is `static`, and you call them through the class.

`Commands`, the class with all the factory methods from Chapter 18, is built exactly the same way, and so is `RobotModeTriggers`, which you will meet in Section 20.6. Compare it with Chapter 19's **abstract** classes, which you also cannot create with `new`, but for the opposite reason. An abstract class is an unfinished blueprint, made to be extended and then built. A class with a private constructor is not a blueprint at all. It is a labeled box of tools and numbers.

### A `final` class: nobody can extend it

The other word in that first line is `final`. You have now seen `final` on three things, and it means "this cannot be changed" each time:

| `final` on... | Means | First seen |
|---|---|---|
| A variable or field | It cannot be given a new value | Chapters 4 and 10 |
| A method | A subclass cannot override it | Chapter 19 (`addRequirements`) |
| A class | Nobody can `extend` it | This chapter |

Nobody should ever write `class MyMath extends MathUtil`, because there is nothing to inherit except static methods, so `MathUtil` is `final`. `Constants` will be `final` for the same reason.

> **A holder class, in one sentence**
>
> A class that only holds `static` values or `static` methods is written `public final class`, so nobody can extend it, with a `private` constructor, so nobody can create one; you use it through its name, like `MathUtil.clamp(...)` or `Constants.USE_SIMULATED_ROBOT`.

### Grouping constants with nested classes

Twenty-five constants in one long list would be hard to read. In Chapter 17 you met **nested classes**: a class written inside another class, like `DrivetrainIO.DrivetrainIOInputs`. `Constants` uses them as labeled drawers. Here is the file. Create `Constants.java` in `src/main/java/frc/robot`, next to `Robot.java`:

```java
package frc.robot;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;

/**
 * The robot's shared constants: numbers about the robot as a whole, the driver's
 * controls, the obstacle course, and Test mode. A number that belongs to just one
 * subsystem or command (like Drivetrain's PID gains) lives in that class instead.
 */
public final class Constants {

    private Constants() {}   // only holds constants: nobody ever creates a Constants object

    // Which robot to drive: false for the real XRP, true for the simulated one (Section 17.9).
    public static final boolean USE_SIMULATED_ROBOT = false;

    /** The driver's controller, and how it feels. */
    public static final class OperatorConstants {
        private OperatorConstants() {}

        public static final int DRIVER_CONTROLLER_PORT = 0;
        public static final double STICK_DEADBAND = 0.1;
        public static final double LINE_LIGHT_DEBOUNCE_SECONDS = 0.1;
    }

    /** The obstacle course, leg 1. Measured on our floor; re-test on new surfaces. */
    public static final class CourseConstants {
        private CourseConstants() {}

        public static final double LEG_1_DISTANCE_METERS = 0.50;
        public static final double TURN_HEADING_DEGREES = 90.0;
        public static final double LEG_2_MAX_DISTANCE_METERS = 1.00;
        public static final double STEP_TIMEOUT_SECONDS = 7.0;

        // The course in field coordinates. Origin: the start line, +x down leg 1.
        // Pose2d is immutable, so these really are constants.
        public static final double LINE_DISTANCE_METERS = 0.40;   // corner to tape, measured
        public static final Pose2d START_POSE = new Pose2d();
        public static final Pose2d CORNER_POSE = new Pose2d(
            LEG_1_DISTANCE_METERS, 0.0, Rotation2d.fromDegrees(TURN_HEADING_DEGREES));
        public static final Pose2d LINE_POSE = new Pose2d(
            LEG_1_DISTANCE_METERS, LINE_DISTANCE_METERS, Rotation2d.fromDegrees(TURN_HEADING_DEGREES));
    }

    /** Test mode: the tuning bench and the SysId tests. */
    public static final class TestModeConstants {
        private TestModeConstants() {}

        // The bench: how far X and Back drive, and how fast the left bumper cruises.
        public static final double BENCH_DRIVE_DISTANCE_METERS = 0.30;
        public static final double BENCH_CRUISE_METERS_PER_SECOND = 0.10;

        // SysId tests, in the drivetrain's volts.
        public static final double SYSID_RAMP_VOLTS_PER_SECOND = 0.5;   // quasistatic: a slow ramp
        public static final double SYSID_STEP_VOLTS = 4.0;              // dynamic: a sudden step
        public static final double SYSID_TIMEOUT_SECONDS = 8.0;         // safety net: time
        public static final double SYSID_MAX_DISTANCE_METERS = 0.75;    // safety net: distance from start
    }
}
```

Copy **your** measured and tuned values in, not the example numbers above. Every one of these is a constant you already have in `Robot.java`, with two changes: each is now `public`, and each lives in a group. There is one new one, `LINE_LIGHT_DEBOUNCE_SECONDS`, which you will use in Section 20.6.

Walk through it:

- **`public final class Constants`** with **`private Constants() {}`**: the holder-class pattern you just met. Each nested class repeats it, so nobody can create an `OperatorConstants` either.
- **`public static final class OperatorConstants`**: a nested class, one per group. It is `static` because it does not belong to any `Constants` object (there are none), exactly like the nested inputs class in Chapter 17.
- **`USE_SIMULATED_ROBOT` sits outside every group.** It is about the whole program, and both `Robot` and `RobotContainer` will read it.
- **The group names follow WPILib's command-based template,** which starts every new command-based project with a `Constants` class holding an `OperatorConstants` group. Teams that read your code will recognize it.

From outside, you name a constant by its class, then its group, then its name: `Constants.CourseConstants.START_POSE`. That is long, so import the group, the same way you import any class. Nested classes can be imported by their full name:

```java
import frc.robot.Constants.CourseConstants;
```

and then the constant is just `CourseConstants.START_POSE`. It reads well: you can see at a glance which drawer every number came from.

### What goes in `Constants`, and what stays

Not every constant moves. `Drivetrain` keeps its wheel size, its SysId gains, and its PID gains, and `DriveWithSticks` keeps its driving rules. The book's rule:

| A number about... | Lives in | Examples |
|---|---|---|
| The robot as a whole, the controls, the field and course, or a mode | `Constants` | `USE_SIMULATED_ROBOT`, `STICK_DEADBAND`, `START_POSE`, `SYSID_STEP_VOLTS` |
| One subsystem's hardware or tuning | That subsystem | `WHEEL_DIAMETER_METERS`, `LEFT_KV_VOLT_SECONDS_PER_METER`, `HEADING_KP` |
| One command's own behavior | That command | `SLOW_MODE_SCALE`, `TURN_SCALE` in `DriveWithSticks` |

Read it as: **a number lives with the thing it describes.** The PID gains describe how this drivetrain responds, so they stay in `Drivetrain`, where Chapter 19 put them. The course's distances describe the course, which is not any one class's business, so they go to `Constants`.

> **Another way teams do it**
>
> Many teams put **every** constant in `Constants`, with a nested group per subsystem: `Constants.DriveConstants.HEADING_KP`, `Constants.ArmConstants.MAX_ANGLE_DEGREES`, and so on. That gives one file to open before a match, at the cost of a very long file and of each subsystem reaching into `Constants` for its own numbers. Both styles work, and you will see both on GitHub. What matters is that a team picks one, writes it in `CONTRIBUTING.md` (Chapter 11), and sticks to it.

### Step by step: moving the constants

**Step 1: Create `Constants.java`** with the listing above, using your own values.

**Step 2: Delete the moved constants from `Robot.java`.** That is everything in the "Constants" block from `USE_SIMULATED_ROBOT` down to `SYSID_MAX_DISTANCE_METERS`. **Keep** the five `STEP_` constants (`STEP_NOT_STARTED` to `STEP_DONE`): they are part of the autonomous bridge, not facts about the robot, and they disappear with the bridge in Section 20.5.

**Step 3: Import the three groups** in `Robot.java`, in alphabetical order, just above the `frc.robot.commands` imports:

```java
import frc.robot.Constants.CourseConstants;
import frc.robot.Constants.OperatorConstants;
import frc.robot.Constants.TestModeConstants;
```

You can also delete `import edu.wpi.first.math.geometry.Rotation2d;`. Only the course poses used it, and they moved.

**Step 4: Put the group's name in front of every use.** VS Code now underlines every moved constant in red. Fix each one by adding its group:

| Constant | Becomes |
|---|---|
| `USE_SIMULATED_ROBOT` | `Constants.USE_SIMULATED_ROBOT` |
| `DRIVER_CONTROLLER_PORT`, `STICK_DEADBAND` | `OperatorConstants.DRIVER_CONTROLLER_PORT`, and so on |
| `LEG_1_DISTANCE_METERS`, `TURN_HEADING_DEGREES`, `LEG_2_MAX_DISTANCE_METERS`, `STEP_TIMEOUT_SECONDS`, `LINE_DISTANCE_METERS`, `START_POSE`, `CORNER_POSE`, `LINE_POSE` | `CourseConstants.LEG_1_DISTANCE_METERS`, and so on |
| `BENCH_DRIVE_DISTANCE_METERS`, `BENCH_CRUISE_METERS_PER_SECOND`, and the four `SYSID_` constants | `TestModeConstants.BENCH_DRIVE_DISTANCE_METERS`, and so on |

`Robot` and `Constants` are in the same package, so `Constants.USE_SIMULATED_ROBOT` needs no import. Some lines get long. The field map's line, for example, is easier to read split in two:

```java
field.getObject("Course").setPoses(
    CourseConstants.START_POSE, CourseConstants.CORNER_POSE, CourseConstants.LINE_POSE);
```

**Step 5: Build.** If an error says `cannot find symbol` with a constant's name, you missed one in Step 4; the error's line number tells you where. Nothing about the robot changed, so a quick drive in teleop is all the testing this needs.

> **Why not static imports?**
>
> Chapter 16 showed static imports: `import static edu.wpi.first.units.Units.Volts;` lets you write `Volts` instead of `Units.Volts`. WPILib's template suggests the same trick for constants, and many teams write `import static frc.robot.Constants.CourseConstants.*;`, where the `*` brings in **every** constant in the group. Then `START_POSE` works on its own. The book does not, because that `*` hides where each name came from: six months later, a reader cannot tell whether `TURN_SCALE` is in `Constants`, in a command, or in the file they are reading. `CourseConstants.TURN_HEADING_DEGREES` answers that question every time you read it.

---

## 20.3 Command Groups: Commands Made of Commands

Here is the autonomous bridge from Chapter 19, the part that decides when to move on:

```java
// When this step's command has ended, move on to the next step.
if (!autoStepCommand.isScheduled()) {
    startStep(autoStep + 1);   // the steps are numbered in order
}
```

Together with `startStep()`, `getStepCommand()`, the `STEP_` numbers, and two remembered fields, that is roughly fifty lines whose only job is "run these three commands, one after another." Chapter 19 called it a bridge, and pointed out a flaw: for one loop between steps, nothing requires the drivetrain, so the scheduler starts the default command, only to interrupt it on the next loop.

"Run these, one after another" is such a common need that WPILib has it built in. Back in Chapter 18, you saw a preview:

```java
driveDistance(0.50).andThen(turnToHeading(90.0)).andThen(driveUntilLine())
```

With the commands from Chapter 19, it reads almost the same:

```java
driveLeg1.andThen(turnLeft).andThen(driveToLine)
```

`andThen` is a **decorator**, like `until` and `withName` from Chapter 18: you call it on a command, and it returns a **new** command. This new command is a **command group** (WPILib also calls it a **composition**): a single command that runs other commands. Read it aloud: "drive leg 1, and then turn left, and then drive to the line." When the group starts, `driveLeg1` starts. When `driveLeg1` finishes, the group ends it and, **in the same loop**, starts `turnLeft`. When `driveToLine` finishes, the whole group finishes. There is no gap between steps, so the default command never sneaks in.

### Four ways to combine commands

"One after another" is one shape. There are four, and between them they describe almost every autonomous routine ever written:

| Group | What it does | Ends when | Factory | Decorator |
|---|---|---|---|---|
| **Sequence** | Runs its commands one after another | The last one ends | `Commands.sequence(a, b, c)` | `a.andThen(b, c)` |
| **Parallel** | Runs its commands at the same time | **All** of them have ended | `Commands.parallel(a, b, c)` | `a.alongWith(b, c)` |
| **Race** | Runs its commands at the same time | **Any one** of them ends; the rest are interrupted | `Commands.race(a, b, c)` | `a.raceWith(b, c)` |
| **Deadline** | Runs its commands at the same time | **One chosen command** (the deadline) ends; the rest are interrupted | `Commands.deadline(a, b, c)` | `a.deadlineFor(b, c)` |

In the deadline row, `a` is the deadline both times. With the factory, the deadline is the **first** argument; with the decorator, it is the command you call `deadlineFor` on.

The factories and the decorators build exactly the same groups. `Commands.sequence(a, b, c)` and `a.andThen(b).andThen(c)` are the same thing. The factory is easier to read when a group has many commands, because they line up in a column; the decorator is handy for adding one more thing to a command you already have.

Here is a way to feel the difference. Suppose `two` is `Commands.waitSeconds(2.0)` and `three` is `Commands.waitSeconds(3.0)`:

| Group | How long it runs |
|---|---|
| `Commands.sequence(two, three)` | 5 seconds: 2, then 3 |
| `Commands.parallel(two, three)` | 3 seconds: both start together, and the group waits for the slower one |
| `Commands.race(two, three)` | 2 seconds: the first to finish wins, and `three` is interrupted |
| `Commands.deadline(two, three)` | 2 seconds: `two` is the deadline |
| `Commands.deadline(three, two)` | 3 seconds: `three` is the deadline, and `two` simply finishes early |

You will check these predictions yourself in Practice 1.

> **`deadlineWith` or `deadlineFor`?**
>
> Older code and many examples online use `a.deadlineWith(b)`. WPILib renamed it to `deadlineFor` in 2025, because "a deadline with b" did not make clear which one was the deadline, and marked the old name deprecated, for removal. Use `deadlineFor`: "`a` is the deadline **for** `b`." (There is also `b.withDeadline(a)`, which makes the same group from the other side.)

### What a group requires

A group is one command, so the scheduler needs to know which subsystems it requires. The rule is simple: **a group requires every subsystem that any of its commands requires.** `driveLeg1.andThen(turnLeft)` requires the drivetrain, because both of its commands do. And the group holds its requirements for its **whole** run, not just while one of its commands needs them. That is exactly what you want from an autonomous routine: from the first step to the last, nobody else gets the drivetrain.

For a sequence, it does not matter that every command requires the same subsystem, because only one of them runs at a time. For the three parallel shapes, it does. Two commands running **at the same time** on the same drivetrain would fight over the motors, which is the very thing the one-command-per-subsystem rule exists to prevent. So WPILib refuses to build such a group:

```java
Commands.parallel(
    new TurnToHeading(drivetrain, 90.0),
    new DriveDistance(drivetrain, 0.30));   // both require the drivetrain
```

```
java.lang.IllegalArgumentException: Multiple commands in a parallel composition cannot require the same subsystems
```

This happens when the group is **built**, in the constructor, not when it runs, so you find out the moment the program starts. Parallel groups are for commands that use **different** subsystems, or no subsystem at all.

### You have been using groups since Chapter 18

Look at what `until` actually does, in WPILib's source:

```java
public ParallelRaceGroup until(BooleanSupplier condition) {
    return raceWith(new WaitUntilCommand(condition));
}
```

and `withTimeout`:

```java
public ParallelRaceGroup withTimeout(double seconds) {
    return raceWith(new WaitCommand(seconds));
}
```

Both are **races**. `autoLight.until(...)` from Chapter 18 was a race between the LED command and a command that does nothing except wait for the condition. Whichever ends first ends the group, and the other is interrupted. When the wait wins, the LED command's end action turns the LED off. A decorator is just a friendly name for a small group.

> **Things happening at once, on a real robot**
>
> On the XRP, there is only one subsystem worth controlling, so parallel groups are mostly about the LED. On a competition robot, they are about **time**. A match's autonomous period is only 15 to 20 seconds, and every second spent waiting is a second not scoring. "Drive to the next game piece, **and** lower the intake on the way" saves the full time it takes to lower the intake, every cycle. A deadline group is the classic shape: the drive is the deadline, and the intake runs alongside it until the robot arrives. In Chapter 35, the competition robot's multi-piece autonomous is built almost entirely from sequences and deadlines.

---

## 20.4 New Java: Objects Made of Objects

So what **is** the thing that `andThen` returns? Its type is `SequentialCommandGroup`, and here is its shape, from WPILib's source, trimmed down:

```java
public class SequentialCommandGroup extends Command {

    private final List<Command> m_commands = new ArrayList<>();   // the commands, in order
    private int m_currentCommandIndex = -1;                       // which one is running

    @Override
    public final void initialize() {
        m_currentCommandIndex = 0;
        m_commands.get(0).initialize();
    }

    @Override
    public final void execute() {
        Command currentCommand = m_commands.get(m_currentCommandIndex);
        currentCommand.execute();
        if (currentCommand.isFinished()) {
            currentCommand.end(false);
            m_currentCommandIndex++;
            if (m_currentCommandIndex < m_commands.size()) {
                m_commands.get(m_currentCommandIndex).initialize();
            }
        }
    }

    @Override
    public final boolean isFinished() {
        return m_currentCommandIndex == m_commands.size();
    }
}
```

A `List` is Java's way of keeping a numbered row of objects: `get(0)` is the first one, `get(1)` the second, and `size()` says how many there are. You will write lists of your own later. (The `m_` prefix means "member," the field-naming habit from Chapter 19's Explore exercise.) Read the rest the way you read `Command` in Chapter 19, and three things stand out.

**It is your Chapter 19 bridge.** A number that remembers which step is running (`m_currentCommandIndex` instead of `autoStep`), a check of whether the current command is finished, and starting the next one. WPILib wrote it once, carefully, so nobody has to write it again. Notice that it starts the next command in the **same loop** the previous one finishes, inside its own `execute()`. That is why there is no gap.

**A group is a `Command`, and it holds `Command`s.** `SequentialCommandGroup extends Command`: a group **is a** command (inheritance, Chapter 5 and Chapter 19). It **has** a list of commands (composition, Chapter 14). Both at once is a pattern programmers call the **composite**: an object made of objects of its own kind. And because the group only ever talks to its members through `Command`'s four methods, it does not know or care what class each one really is. `DriveDistance`, `TurnToHeading`, a `Commands.run(...)`, another group: they all look the same from inside, and each one's own code runs. That is Chapter 17's **polymorphism** at work.

**Groups can hold groups.** Since a group is a command, you can put a group inside a group, which can be inside another group, as deep as you like. The scheduler sees only the outermost one. It calls that group's `execute()`, which calls its current member's `execute()`, which may be another group calling **its** current member. Think of a robot's CAD assembly: the drivetrain is made of gearboxes, each gearbox is made of a motor and gears, and the top-level robot does not need to know any of that to be "the robot."

The methods are `final`, too, the Chapter 19 meaning: a subclass of `SequentialCommandGroup` cannot override `execute()`, because the group's whole job depends on it working exactly this way.

> **A composite, in one sentence**
>
> A **composite** is an object that **is a** kind of thing and **has** other things of the same kind inside it; a command group is a `Command` that holds `Command`s, so a group can be run, decorated, scheduled, or put inside another group, exactly like any single command.

### One owner: a command can belong to only one group

Here is a tempting shortcut. The course turns to heading 90, and the bench's B button turns to heading 90. Why not make one `TurnToHeading` object and use it in both places?

```java
Command turnLeft = new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES);
Command course = Commands.sequence(driveLeg1, turnLeft, driveToLine);
// ...later, the bench...
CommandScheduler.getInstance().schedule(turnLeft);   // BUG: turnLeft belongs to the course
```

It compiles. The moment that last line runs, the robot program stops:

```
java.lang.IllegalArgumentException: Commands that have been composed may not be added to another composition or scheduled individually!
java.lang.Exception: Originally composed at:
    at frc.robot.Robot.<init>(Robot.java:131)
    ...
```

Read it the Chapter 10 way. The exception's type and message say what went wrong, and the second part, "Originally composed at," points at the line where the command was put **into** a group. That is the first place to look.

Why is WPILib so strict? Because a command is an object with **memory**. This `TurnToHeading` has a PID controller with an error sum, and `DriveDistance` remembers where it started. A group remembers which of its commands is running. Now imagine the course is in the middle of `turnLeft` when someone schedules `turnLeft` on its own, too. The same object would be started twice. Its `initialize()` would reset the controller under the course's feet, and its `execute()` would run twice per loop, once from the group and once from the scheduler. It is the two-references-to-one-object problem from Chapter 13, with a moving robot attached. So WPILib keeps a list of every command that has been put into a group, and refuses to let any of them be scheduled on their own or put into a second group. Chapter 18's Practice 5 hit the same wall.

The rule includes **decorators**. `turnLeft.withTimeout(7.0)` puts `turnLeft` inside a race group, so `turnLeft` now belongs to that race. From then on, use the race, not `turnLeft`.

### Factory methods: a fresh command every time

The fix is to build **two** objects. When you need the same kind of command in two places, write a method that builds a brand-new one each time it is called:

```java
/** A command that holds the drivetrain still and never finishes on its own. */
private Command holdStill() {
    return Commands.run(drivetrain::stop, drivetrain).withName("Hold Still");
}
```

This is a **factory method**, like the static factories you met in Chapter 14 (`Rotation2d.fromDegrees`) and Chapter 18 (`Commands.startEnd`), with one difference: it is **not** `static`, because it needs this object's `drivetrain` field. Each call runs `Commands.run(...)` again, so each call returns a **new** command object. Use `holdStill()` in the course, and `holdStill()` somewhere else, and you have two separate commands, each with one owner.

That is why Chapter 18's preview was written with method calls: `driveDistance(0.50)`, `turnToHeading(90.0)`. Each call would build a new command. Compare the two ways of holding a command:

| | A field | A factory method |
|---|---|---|
| Written as | `private final Command holdStill = ...;` | `private Command holdStill() { return ...; }` |
| Used as | `holdStill` | `holdStill()` |
| Objects made | One, ever | One per call |
| Safe in two groups? | No | Yes |

One more thing is allowed, and it surprises people: **binding** one command to two buttons. A binding (Section 20.6) does not put the command into a group. It only schedules it when the button is pressed, the way `testPeriodic()` did. One object can be scheduled from as many places as you like, as long as it is never part of a group. It still runs only once at a time: scheduling a command that is already running does nothing.

> **Class or factory, again**
>
> WPILib's XRP Reference example builds its autonomous routine as a **class**: `public class AutonomousDistance extends SequentialCommandGroup`, with an `addCommands(...)` call in its constructor listing the steps. That is the older style, and you will still see it on many teams' GitHub pages. It works the same way: it is a sequence, and its members belong to it. The book builds groups with factory methods instead, because the whole routine fits on one screen, next to the commands it uses. Practice 6 has you write the course both ways.

---

## 20.5 The Obstacle Course as One Command

Time to replace the bridge. Everything in this section happens in `Robot.java`. In Section 20.7, this code moves to `RobotContainer` without changing a line, so type it carefully now.

### The course, built in one method

Add these four methods to `Robot`, just before `teleopInit()`:

```java
/**
 * Build the obstacle course, leg 1, as one command: drive, turn, and drive to the
 * line, with the LED on the whole way, then hold still until autonomous ends.
 *
 * @return the whole routine, ready to schedule
 */
private Command buildObstacleCourse() {
    Command course = Commands.sequence(
        resetPose(),
        new DriveDistance(drivetrain, CourseConstants.LEG_1_DISTANCE_METERS)
            .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS),
        new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES)
            .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS),
        new DriveUntilLine(drivetrain, sensors, CourseConstants.LEG_2_MAX_DISTANCE_METERS)
            .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS));

    return course
        .deadlineFor(lightTheLed().withName("Auto Light"))   // LED on while the course runs
        .andThen(holdStill())                                // then keep the drivetrain
        .withName("Obstacle Course");
}

// Command factories: each call builds a brand-new command (Section 20.4).

/** A command that puts the robot back at the start pose. Runs even while disabled. */
private Command resetPose() {
    return Commands.runOnce(() -> {
            drivetrain.resetPose(CourseConstants.START_POSE);
            DataLogManager.log("Pose reset to start");
        })
        .ignoringDisable(true)
        .withName("Reset Pose");
}

/** A command that turns the LED on when it starts, and off however it ends. */
private Command lightTheLed() {
    return Commands.startEnd(
        () -> onBoardIO.setLed(true),
        () -> onBoardIO.setLed(false));
}

/** A command that holds the drivetrain still and never finishes on its own. */
private Command holdStill() {
    return Commands.run(drivetrain::stop, drivetrain).withName("Hold Still");
}
```

Read `buildObstacleCourse()` aloud, from the top: "Reset the pose, then drive leg 1, then turn to heading 90, then drive until the line, giving each step at most `STEP_TIMEOUT_SECONDS`. Keep the LED on until that's done. And then hold still. Call the whole thing Obstacle Course." That is the entire autonomous routine, and you can read it in ten seconds. Walk through the pieces:

- **`Commands.sequence(...)`** holds the four steps, in order, one per line. It is the same as chaining three `andThen`s, but the steps line up like a checklist.
- **`resetPose()` is the first step.** In Chapter 19, `autonomousInit()` reset the pose before starting step 1. Now the reset is **part of the routine**, so the routine is complete on its own: wherever you schedule it, it starts from the start pose. `Commands.runOnce` runs its lambda once and finishes immediately, so the drive starts in the same loop. The lambda has a **block body** (Chapter 18), because it does two things. Ignore `.ignoringDisable(true)` for now; it matters for the Y button in Section 20.6.
- **`new DriveDistance(...)`, written right inside the sequence.** No field, no name. Each step is built here, used here, and owned by this group (Section 20.4). The bench will build its own.
- **`.withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS)`** on each step replaces the bridge's `stepTimer`. Each step is now a race against a clock.
- **`.deadlineFor(lightTheLed()...)`** is the course's parallel segment. The sequence is the **deadline**, and the LED command runs alongside it. When the sequence ends, the LED command is interrupted, and its end action turns the LED off. This replaces Chapter 18's `.until(() -> autoStep == STEP_DONE)`, and it is better: it does not need `autoStep` at all. The light simply lasts exactly as long as the course.
- **`.andThen(holdStill())`** comes **after** the deadline group. If `holdStill()` were inside the sequence, the sequence would never end (hold still never does), so the LED would never go out.
- **`.withName("Obstacle Course")`** is the name you will see on the dashboard.

Here is the shape of the whole command, as a tree. Every box is a command, and the scheduler only ever sees the one at the top:

```
Obstacle Course                        (a name around everything)
  sequence, then:                      (andThen)
    deadline group:                    (deadlineFor)
      deadline:  sequence              (Commands.sequence)
                   Reset Pose
                   race: DriveDistance 0.50 m  vs  wait 7 s
                   race: TurnToHeading 90      vs  wait 7 s
                   race: DriveUntilLine        vs  wait 7 s
      alongside: Auto Light
    Hold Still
```

> **A timed-out step now moves on**
>
> In Chapters 12 to 19, a step that ran out of time ended the **whole** routine: `autonomousPeriodic()` jumped straight to `STEP_DONE`. With `withTimeout` on each step, a step that runs out of time is interrupted (its `end(true)` stops the motors and logs "interrupted"), and the **next** step starts. For this course, that is reasonable: a turn that stalls at 85 degrees is better followed by a drive to the line than by nothing. But it is a real change in behavior, so it is worth deciding on purpose. If you would rather a stuck step end everything, put one timeout on the whole sequence instead: `Commands.sequence(...).withTimeout(COURSE_TIMEOUT_SECONDS)`. Reflect question 3 asks which you would choose for a competition robot.

### Wiring it into `Robot`

The course is built once, in the constructor, and kept in a field, exactly like Chapter 19's commands.

**Fields.** Replace the whole group of autonomous command fields (`autoLight`, `driveLeg1`, `turnLeft`, `driveToLine`, `holdStill`) with one:

```java
// Autonomous: the whole course, as one command (Section 20.5).
private final Command obstacleCourse;
```

Then delete the five `STEP_` constants, the `autoTimer` and `stepTimer` fields (and `import edu.wpi.first.wpilibj.Timer;`), and two of the three "Remembered from loop to loop" fields: `autoStep` and `autoStepCommand`. Only `lastDpad` is left, until Section 20.6.

**Constructor.** Delete the block that creates the four step commands and the block that creates `autoLight`. In their place, put:

```java
// Autonomous: the whole course, as one command (Section 20.5).
obstacleCourse = buildObstacleCourse();
```

It must come **after** `drivetrain` and `sensors` are created, since the course uses both.

**Autonomous.** `autonomousInit()` shrinks to this, and `autonomousPeriodic()` becomes empty:

```java
@Override
public void autonomousInit() {
    SmartDashboard.putString("Mode", "Autonomous");
    DataLogManager.log("Mode: Autonomous");

    CommandScheduler.getInstance().schedule(obstacleCourse);
}

@Override
public void autonomousPeriodic() {}
```

Delete `startStep()` and `getStepCommand()` entirely.

**Teleop.** In `teleopInit()`, the two `cancel()` lines become one:

```java
// Autonomous is over, so its routine is too, even if the course never finished.
obstacleCourse.cancel();
```

Cancelling the course interrupts whatever is running inside it (usually `Hold Still`), and the default command gets the sticks back.

**Dashboard.** In `updateDashboard()`, delete the "Autonomous" block (`Auto Step` and `Step Time (s)`). There are no steps to show any more. The terminal tells the story instead, because every command logs its own start and finish.

Build. If the compiler complains about `autoStep`, `stepTimer`, or `STEP_DONE`, there is a leftover use; the error's line number shows where.

### Check: the course, as one command

This is the first safe place to stand. Switch on the XRP and run the program with `USE_SIMULATED_ROBOT = false`. Keep **NetworkTables** > **SmartDashboard** > **Scheduler** and **Drivetrain** open, and the terminal.

1. Press Y, then enable **Autonomous**. The Scheduler list shows one entry: `Obstacle Course`. Not `DriveDistance`, not `Auto Light`: the scheduler only sees the outermost group (Section 20.4). Drivetrain's `.command` also says `Obstacle Course`. The robot drives the course just as it did in Chapter 19, and the LED is on.
2. When the robot finds the tape, the LED goes **out**, but `Obstacle Course` stays in the list. The deadline group has ended, and `Hold Still` is now holding the drivetrain until autonomous ends. The terminal tells the story:

```
Mode: Autonomous
Pose reset to start
DriveDistance 0.5 m started at Pose2d(...)
DriveDistance finished after 0.497 m
TurnToHeading 90.0 deg started
TurnToHeading finished at 89.1 deg
DriveUntilLine started at Pose2d(...)
Line found after 0.392 m
```

3. Run it again, and **disable** halfway through leg 1. `DriveDistance interrupted after ...` appears, the LED goes out, and the list empties. Enable autonomous again: the course starts over from the start pose, because resetting the pose is now its first step.
4. Run it again, and switch straight to **Teleoperated** partway through the turn. The turn is interrupted, and on the next loop, `DriveWithSticks` has the drivetrain.

If all four behave, commit (see the Git exercise). The bridge is gone, and so are `autoStep`, `startStep()`, `getStepCommand()`, two timers, five constants, and five command fields.

> **Where did `Auto Light` go?**
>
> It is still there, inside the group, running exactly as before. It just does not appear in the Scheduler list, because the scheduler did not schedule it: the group did. If you want to see inside a group while it runs, the terminal's log messages are the best window today. In Chapter 24, AdvantageScope shows every command's start and end on a timeline.

---

## 20.6 Triggers: Buttons That Start Commands

Now the doorbells. This section explains how bindings work, using the Explorer's own buttons as examples. Read it through; you will type the real bindings in Section 20.7, when they move into their new home.

### A controller made of triggers

So far the Explorer has used `XboxController`, which answers questions: `getAButton()`, `getAButtonPressed()`, `getLeftY()`. WPILib's command library has a partner class, **`CommandXboxController`**, in the package `edu.wpi.first.wpilibj2.command.button`. You create it the same way, with the same port:

```java
private final CommandXboxController controller =
    new CommandXboxController(OperatorConstants.DRIVER_CONTROLLER_PORT);
```

It still has the sticks, with the same names: `controller.getLeftY()`, `controller.getRightX()`, and the trigger axes. What it adds is one method per button, and each one returns a **`Trigger`**:

| Method | The trigger is true while... |
|---|---|
| `a()`, `b()`, `x()`, `y()` | that button is held |
| `leftBumper()`, `rightBumper()` | that bumper is held |
| `back()`, `start()` | Back (View) or Start (Menu) is held |
| `leftStick()`, `rightStick()` | that stick is pushed down like a button |
| `povUp()`, `povDown()`, `povLeft()`, `povRight()` | the D-pad is held in that direction |
| `leftTrigger()`, `rightTrigger()` | that trigger is squeezed more than halfway |

A **trigger** is a condition with a name: "the A button is held." It is not a value you read once. It is an object that the scheduler checks for you, every loop, in step 2 of its loop from Section 18.5. You tell the trigger what to do when the condition changes, and from then on, you never check it yourself.

### Five bindings

Telling a trigger what to do is called a **binding**. Here is how the bench's A button is bound:

```java
controller.a().onTrue(new TurnToHeading(drivetrain, 0.0));
```

Read it aloud: "When A becomes true, start a turn to heading 0." That one line replaces the `if (controller.getAButtonPressed())` block in `testPeriodic()`. (It is missing one piece, Test mode only, which comes in a moment.)

`Trigger` has five bindings you will use:

| Binding | Starts the command when... | Cancels it when... | Good for |
|---|---|---|---|
| `onTrue(command)` | the trigger becomes true (the button is pressed) | never: it runs until it ends | Actions that finish by themselves: the bench's turns and drives |
| `onFalse(command)` | the trigger becomes false (the button is released) | never | Doing something when the driver lets go |
| `whileTrue(command)` | the trigger becomes true | the trigger becomes false | Hold-to-run: the cruise, the SysId tests, an auto-align |
| `whileFalse(command)` | the trigger becomes false | the trigger becomes true | Rare: the opposite of `whileTrue` |
| `toggleOnTrue(command)` | the trigger becomes true and the command is not running | the trigger becomes true and the command **is** running | One button for on, the same button for off |

Every binding reacts to the trigger **changing**, not to it being true. Chapter 8 called this **edge detection**, and promised that WPILib would let you choose "while held" or "on press" with a single method name. Here is the promise kept. And here is how `onTrue` does it, from WPILib's source, lightly trimmed:

```java
public Trigger onTrue(Command command) {
    addBinding((previous, current) -> {
        if (!previous && current) {
            CommandScheduler.getInstance().schedule(command);
        }
    });
    return this;
}
```

It is a lambda with **two** parameters, `previous` and `current`: the trigger's value last loop and this loop. "Was false, now true" is the moment of the press. That is your Chapter 10 `wasBlocked` pattern, written once inside WPILib, so you never have to write it again. (Every binding method also ends with `return this;`, which is why you can chain two bindings on one button: `controller.a().onTrue(x).onFalse(y)`.)

> **Pick the binding by asking how the command should end**
>
> If the command **finishes on its own** (a turn to a heading, a drive to a distance), use `onTrue`: one press, and it runs to the end. If it **runs until the driver lets go** (a cruise, a SysId test, an auto-align the driver can abort), use `whileTrue`. Be careful with `toggleOnTrue` for drivers. WPILib's own documentation discourages it, because the driver has to remember whether the thing is on, in the middle of a match. Two buttons, one for on and one for off, are easier to drive.

One detail of `whileTrue` matters for the Explorer: if the command **finishes** while the button is still held, `whileTrue` does **not** start it again. It waits for the next press. Keep that in mind for the next example.

### The feature request from Chapter 18, done properly

Chapter 18 opened with a driver's request: "When I hold A in teleop, can the robot turn itself to face the tape, at heading 90, and then give me the sticks back?" The `TimedRobot` version took an `aligning` field, a `return` that froze the dashboard, and a fix in `disabledInit()` that you had to remember. Here is the command-based version:

```java
controller.a().whileTrue(new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES));
```

Follow it through every case:

- **Driver holds A.** `TurnToHeading` is scheduled. It requires the drivetrain, so `DriveWithSticks` is interrupted. The robot turns.
- **The turn finishes while A is still held.** `TurnToHeading` ends. The drivetrain is free, so `DriveWithSticks` starts again in the same loop. The driver has the sticks back, even with a thumb still on A, because `whileTrue` does not restart a finished command.
- **Driver lets go of A in the middle of the turn.** `whileTrue` cancels the turn. Its `end(true)` stops the motors, and the sticks are back.
- **The robot is disabled in the middle.** The scheduler cancels everything (Section 18.5). Nothing remembers "I was aligning," because there is nothing to remember. The spin-on-enable bug from Section 18.1 cannot happen.

One line, every case handled, and no field.

### Combining triggers: "and Test mode"

There is a catch. Bindings are checked **in every mode**, because the scheduler runs in every mode. Bind A to "turn to 90" for teleop and A to "turn to 0" for the bench, and pressing A in either mode would start both. Each would interrupt the other, since both need the drivetrain, and the robot would do whichever happened to be scheduled last.

Triggers can be combined, like `boolean`s:

| Method | The new trigger is true when... |
|---|---|
| `a.and(b)` | both `a` and `b` are true |
| `a.or(b)` | either one is true |
| `a.negate()` | `a` is false |

And WPILib has ready-made triggers for the robot's modes, in a holder class called **`RobotModeTriggers`** (the same pattern as `Constants`: a `private` constructor and nothing but `static` methods):

| Factory | True while the robot is... |
|---|---|
| `RobotModeTriggers.teleop()` | enabled in teleop |
| `RobotModeTriggers.autonomous()` | enabled in autonomous |
| `RobotModeTriggers.test()` | enabled in Test mode |
| `RobotModeTriggers.disabled()` | disabled |

So the two A bindings become:

```java
Trigger teleop = RobotModeTriggers.teleop();
Trigger test = RobotModeTriggers.test();

controller.a().and(teleop).whileTrue(
    new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES));
controller.a().and(test).onTrue(new TurnToHeading(drivetrain, 0.0));
```

"While A is held in teleop, turn to 90. When A is pressed in Test mode, turn to 0." Saving the two mode triggers in local variables keeps every binding short. Whenever you add a button, ask: "which modes should this work in?" The answer is part of the binding.

A mode trigger can also start a command on its own. In Chapter 19, `testInit()` reset the pose so the SysId safety fences would be measured from where Test mode started. That becomes a binding too:

```java
test.onTrue(resetPose());   // every Test session starts at the start pose
```

"When Test mode starts, reset the pose." The factory from Section 20.5 builds a fresh `Reset Pose` command for this binding.

### Triggers that are not buttons

`Trigger` is not only for buttons. Its constructor takes any `BooleanSupplier`, the Chapter 18 functional interface, so **any** condition you can write as a lambda can start a command. Here is a new feature for teleop: the LED lights up while either reflectance sensor sees the line, which helps the driver line up by eye.

```java
Trigger lineSeen = new Trigger(() -> sensors.isLeftOnLine() || sensors.isRightOnLine())
    .debounce(OperatorConstants.LINE_LIGHT_DEBOUNCE_SECONDS);
lineSeen.and(teleop).whileTrue(lightTheLed().withName("Line Light"));
```

"While a sensor sees the line in teleop, light the LED." `lightTheLed()` is the factory from Section 20.5, building a second, separate LED command. (`Auto Light` and `Line Light` never run together, because one is autonomous only and the other is teleop only.)

It also works the other way round. `Trigger` **implements** `BooleanSupplier` (Chapter 17), so a trigger can go anywhere a `BooleanSupplier` is expected. That is how the default command's slow-mode input becomes:

```java
controller.rightBumper()   // a Trigger, used here as the BooleanSupplier for slow mode
```

> **Debouncing: the simplest filter**
>
> Drive the Explorer slowly across the edge of the tape and watch `Left On Line`. Right at the edge, it can flicker: true, false, true, in a few loops, as the sensor sees half black and half white and the reading wobbles around the threshold. Without help, the LED would flicker too. `.debounce(0.1)` makes a new trigger that only becomes true after the original has been true for a whole 0.1 seconds without a break (and becomes false right away). That is a **filter**: it trusts a reading more when it has stayed the same for a while. Every real sensor is noisy, and filters are how robots cope. This one is the simplest kind; in Chapter 30, the Mini Swerve's pose estimator blends wheel odometry and camera measurements by how much each one can be trusted, a far more powerful filter built on the same idea.

### Disabled: `ignoringDisable`

Y resets the pose, and in Chapter 19 it worked even while the robot was disabled. That matters: you put the robot on the start line and press Y **before** you enable. But here is a rule from Section 18.5: **commands do not run while the robot is disabled.** The scheduler cancels them, and it refuses to start new ones. Bind Y to a plain reset command, and pressing it while disabled does nothing at all.

The fix is a decorator that tells the scheduler "this command is safe to run while disabled":

```java
private Command resetPose() {
    return Commands.runOnce(() -> {
            drivetrain.resetPose(CourseConstants.START_POSE);
            DataLogManager.log("Pose reset to start");
        })
        .ignoringDisable(true)
        .withName("Reset Pose");
}
```

That is the `.ignoringDisable(true)` you typed in Section 20.5. The binding is then one line, with no mode, because it should work in every mode:

```java
controller.y().onTrue(resetPose());
```

Use `ignoringDisable(true)` only for commands that **never move anything**: resetting a pose, zeroing a sensor, changing an LED. "Disabled" is a safety promise to everyone standing near the robot. A command that drives a motor must never break it.

### Declare once, in the constructor

Every binding in this section is written **once**, when the robot starts, and never again. That is the declarative style from Section 20.1: the binding is a rule, and the scheduler applies it for as long as the program runs.

> **A common beginner mistake**
>
> Putting a binding in a periodic method:
>
> ```java
> @Override
> public void teleopPeriodic() {
>     controller.a().whileTrue(new TurnToHeading(drivetrain, 90.0));   // BUG
> }
> ```
>
> It compiles, and A even seems to work. But `teleopPeriodic()` runs every 20 milliseconds, and every run **adds another binding**, with a new `TurnToHeading`. After ten seconds of teleop there are five hundred of them. Press A, and all five hundred turns are scheduled in the same loop, each one interrupting the one before it. Leave the robot in teleop for a few minutes and there are thousands, every one checked every loop, until the loop starts running late and the console fills with loop-overrun warnings. Bindings belong in the constructor (and in Section 20.7, in a method the constructor calls), never in anything that runs every loop.

### The Explorer's bindings, all together

Here is every binding the Explorer will have, as you will type them in Section 20.7. Each one replaces a piece of `testPeriodic()`, `robotPeriodic()`, or `testInit()`, or adds something new:

```java
// Any mode: Y puts the robot back at the start pose.
controller.y().onTrue(resetPose());

// Teleop: hold A to turn and face up leg 2 (Section 18.1). Let go, and the sticks are back.
controller.a().and(teleop).whileTrue(
    new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES));

// Teleop: the LED is on while either reflectance sensor sees the line.
Trigger lineSeen = new Trigger(() -> sensors.isLeftOnLine() || sensors.isRightOnLine())
    .debounce(OperatorConstants.LINE_LIGHT_DEBOUNCE_SECONDS);
lineSeen.and(teleop).whileTrue(lightTheLed().withName("Line Light"));

// Test mode: every session starts at the start pose, so the SysId fences start here.
test.onTrue(resetPose());

// Test mode: the tuning bench. Press once; the command runs until it is done.
controller.a().and(test).onTrue(new TurnToHeading(drivetrain, 0.0));
controller.b().and(test).onTrue(
    new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES));
controller.x().and(test).onTrue(
    new DriveDistance(drivetrain, TestModeConstants.BENCH_DRIVE_DISTANCE_METERS));
controller.back().and(test).onTrue(
    new DriveDistance(drivetrain, -TestModeConstants.BENCH_DRIVE_DISTANCE_METERS));

// Test mode: hold the left bumper to cruise on feedforward alone. Let go to stop.
controller.leftBumper().and(test).whileTrue(
    Commands.runEnd(
            () -> drivetrain.drive(TestModeConstants.BENCH_CRUISE_METERS_PER_SECOND, 0.0),
            drivetrain::stop,
            drivetrain)
        .withName("Bench Cruise"));

// Test mode: hold a D-pad direction to run a SysId test. Let go to stop it.
controller.povUp().and(test).whileTrue(
    sysIdRoutine.quasistatic(SysIdRoutine.Direction.kForward)
        .until(this::isPastFrontFence)
        .withName("SysId Quasistatic Forward"));
// ...and the same for povDown (quasistatic reverse), povRight (dynamic forward),
// and povLeft (dynamic reverse)
```

Compare them with what they replace:

- **The bench's four `if` blocks** became four `onTrue` lines. The commands are built right in the binding, so they need no fields.
- **The cruise's two `if` blocks** (schedule on pressed, cancel on released) became one `whileTrue`. Hold-to-run is exactly what `whileTrue` means.
- **The SysId helper `updateSysIdTests()` and its `lastDpad` field** became four `whileTrue` lines. Holding a direction starts its test, and letting go (or sliding to another direction) cancels it. And the Chapter 19 bonus survives: a test stopped by its safety fence cannot restart until you let go and press again, because `whileTrue` only starts a command when its trigger **becomes** true.
- **The fences** are now two small helper methods, `isPastFrontFence()` and `isPastBackFence()`, passed as method references (`this::isPastFrontFence`) instead of four copies of the same lambda.
- **The last "Remembered from loop to loop" field, `lastDpad`, is gone.** The trigger remembers the D-pad's previous state for you.

---

## 20.7 `RobotContainer`: The Robot's Wiring Diagram

Look at what `Robot.java` has become. Its mode methods are almost empty. Its constructor, on the other hand, is long: it picks the drivetrain's IO, creates the drivetrain and the sensors, sets the default command, builds the bench commands and the SysId routine, builds the course, and publishes the dashboard. None of that is about **modes**. It is about how the robot is **put together**: which parts it has, which commands use them, and which button does what.

An electrician would call that a **wiring diagram**, and every FRC robot has one taped inside the electronics panel. WPILib's command-based template gives it its own class, called **`RobotContainer`**. The template's own comment describes it well: since command-based is declarative, very little robot logic belongs in `Robot`'s periodic methods; instead, the robot's structure (its subsystems, commands, and button mappings) is declared in `RobotContainer`.

After this section, the two classes split the work like this:

| `Robot` | `RobotContainer` |
|---|---|
| Starts the loggers (AdvantageKit first) | Creates every subsystem, sensor, and controller |
| Runs the scheduler, every loop | Sets the default command |
| Says which mode it is in | Declares every binding |
| Starts the autonomous command, and stops it in teleop | Builds the autonomous command |
| Clears out commands when Test mode starts | Publishes the dashboard and the simulated sensors |

`Robot` knows **when**. `RobotContainer` knows **what**.

### Step 1: Create `RobotContainer.java`

Create `RobotContainer.java` in `src/main/java/frc/robot`, next to `Robot.java`. Most of it is code you already have in `Robot.java`, moved here and adjusted to the new controller and the new bindings. The parts you typed in Section 20.5 move over unchanged. (If you kept the `Led` subsystem from Chapter 19's Practice 5, keep it: create it here instead of `onBoardIO`, and give `lightTheLed()` the `led` as its requirement.) Type the rest, do not paste:

```java
package frc.robot;

import static edu.wpi.first.units.Units.Second;
import static edu.wpi.first.units.Units.Seconds;
import static edu.wpi.first.units.Units.Volts;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.simulation.AnalogInputSim;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj.xrp.XRPOnBoardIO;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine;
import frc.robot.Constants.CourseConstants;
import frc.robot.Constants.OperatorConstants;
import frc.robot.Constants.TestModeConstants;
import frc.robot.commands.DriveDistance;
import frc.robot.commands.DriveUntilLine;
import frc.robot.commands.DriveWithSticks;
import frc.robot.commands.TurnToHeading;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.DrivetrainIO;
import frc.robot.subsystems.DrivetrainIOSim;
import frc.robot.subsystems.DrivetrainIOXRP;

/**
 * The robot's wiring diagram. It creates the subsystems, ties buttons to commands, and
 * builds the autonomous routine. Robot.java runs the scheduler and asks this class for
 * the autonomous command; everything else about the robot is decided here.
 */
public class RobotContainer {

    // The robot's parts, created once.
    private final Drivetrain drivetrain;
    private final Sensors sensors = new Sensors();
    private final CommandXboxController controller =
        new CommandXboxController(OperatorConstants.DRIVER_CONTROLLER_PORT);
    private final XRPOnBoardIO onBoardIO = new XRPOnBoardIO();   // the LED (Chapter 4)
    private final Field2d field = new Field2d();                 // the map on the dashboard

    // Pretend sensors for the simulated robot (Section 17.9). Unused on the real XRP.
    private final AnalogInputSim leftReflectanceSim = new AnalogInputSim(0);
    private final AnalogInputSim rightReflectanceSim = new AnalogInputSim(1);
    private final AnalogInputSim rangefinderSim = new AnalogInputSim(2);

    // WPILib's SysId routine builds the four SysId test commands (Section 19.8).
    private final SysIdRoutine sysIdRoutine;

    // The autonomous routine: the whole course, as one command (Section 20.5).
    private final Command obstacleCourse;

    public RobotContainer() {
        // Real hardware or simulated: decide here, once. Nothing else needs to know.
        DrivetrainIO drivetrainIO;
        if (Constants.USE_SIMULATED_ROBOT) {
            drivetrainIO = new DrivetrainIOSim();
            DataLogManager.log("Drivetrain: SIMULATED");
        } else {
            drivetrainIO = new DrivetrainIOXRP();
            DataLogManager.log("Drivetrain: real XRP");
        }
        drivetrain = new Drivetrain(drivetrainIO);

        // The field map: publish once, and draw where the course should take the robot.
        SmartDashboard.putData("Field", field);
        field.getObject("Course").setPoses(
            CourseConstants.START_POSE, CourseConstants.CORNER_POSE, CourseConstants.LINE_POSE);

        // SysId: named "drive", so the log entries match Chapter 16's.
        sysIdRoutine = new SysIdRoutine(
            new SysIdRoutine.Config(
                Volts.of(TestModeConstants.SYSID_RAMP_VOLTS_PER_SECOND).per(Second),
                Volts.of(TestModeConstants.SYSID_STEP_VOLTS),
                Seconds.of(TestModeConstants.SYSID_TIMEOUT_SECONDS)),
            new SysIdRoutine.Mechanism(
                volts -> drivetrain.setVolts(volts.in(Volts), volts.in(Volts)),
                drivetrain::logSysId,
                drivetrain,
                "drive"));

        configureBindings();
        obstacleCourse = buildObstacleCourse();

        // Show which commands are running, live, on the dashboard.
        SmartDashboard.putData("Scheduler", CommandScheduler.getInstance());
        SmartDashboard.putData("Drivetrain", drivetrain);
    }

    /**
     * Tie the controller's buttons (and one sensor) to commands. The driver's controls:
     *
     * <pre>
     * Any mode   Y              reset the pose to the start line (works while disabled)
     * Teleop     sticks         drive (the default command)
     *            right bumper   slow mode (hold)
     *            A              turn to face up leg 2 (hold); let go to take the sticks back
     * Test       A, B           turn to heading 0, turn to heading 90
     *            X, Back        drive out 0.30 m, drive back 0.30 m
     *            left bumper    cruise on feedforward alone (hold)
     *            D-pad          a SysId test (hold): up and down ramp, right and left step
     *            sticks         drive, whenever no bench command is running
     * </pre>
     */
    private void configureBindings() {
        Trigger teleop = RobotModeTriggers.teleop();
        Trigger test = RobotModeTriggers.test();

        // The sticks: the drivetrain's default command, in every mode (Section 19.7).
        drivetrain.setDefaultCommand(new DriveWithSticks(
            drivetrain,
            sensors,
            () -> -MathUtil.applyDeadband(controller.getLeftY(), OperatorConstants.STICK_DEADBAND),
            () -> -MathUtil.applyDeadband(controller.getRightX(), OperatorConstants.STICK_DEADBAND),
            controller.rightBumper()));

        // Any mode: Y puts the robot back at the start pose.
        controller.y().onTrue(resetPose());

        // Teleop: hold A to turn and face up leg 2 (Section 18.1). Let go, and the sticks are back.
        controller.a().and(teleop).whileTrue(
            new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES));

        // Teleop: the LED is on while either reflectance sensor sees the line.
        Trigger lineSeen = new Trigger(() -> sensors.isLeftOnLine() || sensors.isRightOnLine())
            .debounce(OperatorConstants.LINE_LIGHT_DEBOUNCE_SECONDS);
        lineSeen.and(teleop).whileTrue(lightTheLed().withName("Line Light"));

        // Test mode: every session starts at the start pose, so the SysId fences start here.
        test.onTrue(resetPose());

        // Test mode: the tuning bench. Press once; the command runs until it is done.
        controller.a().and(test).onTrue(new TurnToHeading(drivetrain, 0.0));
        controller.b().and(test).onTrue(
            new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES));
        controller.x().and(test).onTrue(
            new DriveDistance(drivetrain, TestModeConstants.BENCH_DRIVE_DISTANCE_METERS));
        controller.back().and(test).onTrue(
            new DriveDistance(drivetrain, -TestModeConstants.BENCH_DRIVE_DISTANCE_METERS));

        // Test mode: hold the left bumper to cruise on feedforward alone. Let go to stop.
        controller.leftBumper().and(test).whileTrue(
            Commands.runEnd(
                    () -> drivetrain.drive(TestModeConstants.BENCH_CRUISE_METERS_PER_SECOND, 0.0),
                    drivetrain::stop,
                    drivetrain)
                .withName("Bench Cruise"));

        // Test mode: hold a D-pad direction to run a SysId test. Let go to stop it.
        controller.povUp().and(test).whileTrue(
            sysIdRoutine.quasistatic(SysIdRoutine.Direction.kForward)
                .until(this::isPastFrontFence)
                .withName("SysId Quasistatic Forward"));
        controller.povDown().and(test).whileTrue(
            sysIdRoutine.quasistatic(SysIdRoutine.Direction.kReverse)
                .until(this::isPastBackFence)
                .withName("SysId Quasistatic Reverse"));
        controller.povRight().and(test).whileTrue(
            sysIdRoutine.dynamic(SysIdRoutine.Direction.kForward)
                .until(this::isPastFrontFence)
                .withName("SysId Dynamic Forward"));
        controller.povLeft().and(test).whileTrue(
            sysIdRoutine.dynamic(SysIdRoutine.Direction.kReverse)
                .until(this::isPastBackFence)
                .withName("SysId Dynamic Reverse"));
    }

    /**
     * Build the obstacle course, leg 1, as one command: drive, turn, and drive to the
     * line, with the LED on the whole way, then hold still until autonomous ends.
     *
     * @return the whole routine, ready to schedule
     */
    private Command buildObstacleCourse() {
        Command course = Commands.sequence(
            resetPose(),
            new DriveDistance(drivetrain, CourseConstants.LEG_1_DISTANCE_METERS)
                .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS),
            new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES)
                .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS),
            new DriveUntilLine(drivetrain, sensors, CourseConstants.LEG_2_MAX_DISTANCE_METERS)
                .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS));

        return course
            .deadlineFor(lightTheLed().withName("Auto Light"))   // LED on while the course runs
            .andThen(holdStill())                                // then keep the drivetrain
            .withName("Obstacle Course");
    }

    /**
     * The command to run in autonomous.
     *
     * @return the obstacle course
     */
    public Command getAutonomousCommand() {
        return obstacleCourse;
    }

    // Command factories: each call builds a brand-new command (Section 20.4).

    /** A command that puts the robot back at the start pose. Runs even while disabled. */
    private Command resetPose() {
        return Commands.runOnce(() -> {
                drivetrain.resetPose(CourseConstants.START_POSE);
                DataLogManager.log("Pose reset to start");
            })
            .ignoringDisable(true)
            .withName("Reset Pose");
    }

    /** A command that turns the LED on when it starts, and off however it ends. */
    private Command lightTheLed() {
        return Commands.startEnd(
            () -> onBoardIO.setLed(true),
            () -> onBoardIO.setLed(false));
    }

    /** A command that holds the drivetrain still and never finishes on its own. */
    private Command holdStill() {
        return Commands.run(drivetrain::stop, drivetrain).withName("Hold Still");
    }

    // The SysId safety fences: lines on the floor in front of and behind the Test mode start.

    private boolean isPastFrontFence() {
        return drivetrain.getAverageDistanceMeters() >= TestModeConstants.SYSID_MAX_DISTANCE_METERS;
    }

    private boolean isPastBackFence() {
        return drivetrain.getAverageDistanceMeters() <= -TestModeConstants.SYSID_MAX_DISTANCE_METERS;
    }

    /** Publish every sensor reading. Robot calls this every loop, in every mode. */
    public void updateDashboard() {
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
    }

    /**
     * Give the simulated robot a simulated floor (Section 17.9). Robot calls this every
     * loop; it does nothing unless the robot is the simulated one.
     */
    public void simulationPeriodic() {
        if (!Constants.USE_SIMULATED_ROBOT) {
            return;   // the real XRP has a real floor
        }

        // Rangefinder: 5 volts is the most it can read, 4 meters. The way ahead is clear.
        rangefinderSim.setVoltage(5.0);

        // Reflectance: 5 volts is black, 0 volts is white. The tape is LINE_DISTANCE_METERS up the y axis.
        boolean pastTheLine = drivetrain.getPose().getY() >= CourseConstants.LINE_DISTANCE_METERS;
        double reflectanceVolts = pastTheLine ? 5.0 : 0.0;
        leftReflectanceSim.setVoltage(reflectanceVolts);
        rightReflectanceSim.setVoltage(reflectanceVolts);
    }
}
```

### Step 2: Replace `Robot.java`

Then replace your whole `Robot.java` with this. Keep your own comments wherever you like them better than these:

```java
package frc.robot;

import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import org.littletonrobotics.junction.LoggedRobot;
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.NT4Publisher;
import org.littletonrobotics.junction.wpilog.WPILOGWriter;

public class Robot extends LoggedRobot {

    // Everything about the robot: subsystems, commands, buttons (Section 20.7).
    private final RobotContainer robotContainer;

    // The command autonomous is running, so teleop can stop it.
    private Command autonomousCommand = Commands.none();   // never null (Chapter 10)

    public Robot() {
        // AdvantageKit first, before anything else is created (Section 17.6).
        Logger.recordMetadata("ProjectName", "XRP Explorer");
        Logger.recordMetadata("Robot", Constants.USE_SIMULATED_ROBOT ? "Simulated XRP" : "Real XRP");
        Logger.addDataReceiver(new WPILOGWriter());   // write a log file into logs/
        Logger.addDataReceiver(new NT4Publisher());   // publish live, for AdvantageScope
        Logger.start();

        // The Chapter 10 flight recorder keeps running too. SysId (Chapter 16) reads its file.
        DataLogManager.start();
        DriverStation.startDataLog(DataLogManager.getLog());

        DataLogManager.log("XRP Explorer started!");
        SmartDashboard.putString("Mode", "Starting");

        // Build the robot: every subsystem, command, and button binding.
        robotContainer = new RobotContainer();
    }

    @Override
    public void robotPeriodic() {
        // The command scheduler: subsystems, then buttons, then commands, once per loop.
        CommandScheduler.getInstance().run();

        robotContainer.updateDashboard();
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

        autonomousCommand = robotContainer.getAutonomousCommand();
        CommandScheduler.getInstance().schedule(autonomousCommand);
    }

    @Override
    public void autonomousPeriodic() {}

    @Override
    public void teleopInit() {
        SmartDashboard.putString("Mode", "Teleop");
        DataLogManager.log("Mode: Teleop");

        // Autonomous is over, so its command is too, even if the course never finished.
        autonomousCommand.cancel();
    }

    @Override
    public void teleopPeriodic() {}

    @Override
    public void testInit() {
        SmartDashboard.putString("Mode", "Test");
        DataLogManager.log("Mode: Test (tuning bench and SysId)");

        // Start clean: nothing left over from another mode.
        CommandScheduler.getInstance().cancelAll();
    }

    @Override
    public void testPeriodic() {}

    @Override
    public void simulationPeriodic() {
        // An XRP program always runs as a simulation on your laptop (Section 17.2).
        robotContainer.simulationPeriodic();
    }
}
```

Build. If it succeeds, the move is done. Walk through what happened.

### `RobotContainer`, field by field

- **The parts.** `drivetrain`, `sensors`, `controller`, `onBoardIO`, and `field` moved from `Robot`, with one change: `controller` is now a `CommandXboxController`. Its sticks have the same names, so the default command's lambdas and the dashboard lines did not change. The three pretend sensors for the simulated robot moved too.
- **`sysIdRoutine`** is a field, because four bindings use it. The four SysId **command** fields are gone: each test is built right inside its binding.
- **`obstacleCourse`** is the only command field left. The course is built once, and `Robot` asks for it.
- **The bench command fields are gone,** all five of them, for the same reason as the SysId ones.

### The constructor, and the order of things

The constructor creates the drivetrain first, then the field map and the SysId routine, then calls `configureBindings()`, then builds the course. The order matters in one way: everything a binding or the course **uses** must exist before the method that uses it is called. `configureBindings()` uses `drivetrain` and `sysIdRoutine`, so both are created above it. Swap them, and `sysIdRoutine` is still `null` when the bindings use it, and you get Chapter 10's `NullPointerException` the moment the program starts.

`sensors`, `controller`, `onBoardIO`, and `field` are created in their field declarations, which Java runs before the constructor's body (Section 19.4), so they are always ready.

And `RobotContainer` itself is created **after** AdvantageKit starts. `Robot`'s constructor starts the loggers, then calls `new RobotContainer()` as its very last line. That keeps Chapter 17's rule ("AdvantageKit first, before anything else is created") without `Robot` having to know what "anything else" is.

### `configureBindings()` and its controls table

The Javadoc comment on `configureBindings()` is a table of every control on the robot, by mode. Drive teams love this. Before a match, a new driver can read one comment and know every button, and when a programmer adds a binding, the comment is right there to update. In Section 20.6 you saw every binding in this method. One more line is new: the default command is set here too. A default command is a binding of a kind, "when nothing else needs the drivetrain, drive with the sticks," and putting it with the others means one method holds **everything** the driver can do.

The slow-mode input changed from `controller::getRightBumperButton` to `controller.rightBumper()`: a `Trigger`, used as a `BooleanSupplier` (Section 20.6).

### `getAutonomousCommand()`

```java
public Command getAutonomousCommand() {
    return obstacleCourse;
}
```

This is the one door between the two classes in autonomous. `Robot` does not know what the course is, only that `RobotContainer` will hand it a command to run. In Chapter 23, this method can return whichever routine a dropdown on the dashboard has selected, and `Robot` will not change at all.

### `updateDashboard()` and `simulationPeriodic()`

These two are **public**, because `Robot` calls them every loop. They live here because they need the parts: the dashboard reads the drivetrain, the sensors, and the controller, and the simulated sensors need the drivetrain's pose. `simulationPeriodic()` now checks `Constants.USE_SIMULATED_ROBOT` itself and returns early on the real robot, so `Robot.simulationPeriodic()` can just call it.

(The "Auto Step" and "Step Time" widgets left in Section 20.5. Everything else on the dashboard is exactly as it was.)

### `Robot`, line by line

`Robot.java` is now about a hundred lines, and almost all of them match WPILib's command-based template. Its constructor starts the loggers and creates the `RobotContainer`. `robotPeriodic()` runs the scheduler and the dashboard. `autonomousInit()` asks `RobotContainer` for the autonomous command and schedules it; `teleopInit()` cancels it; `testInit()` cancels everything.

`autonomousCommand` starts as `Commands.none()` rather than `null`, so `teleopInit()` can always call `cancel()` on it, even if autonomous never ran (the Chapter 10 habit from Section 19.8). WPILib's template uses `null` and checks for it with an `if`; both work.

> **What left `Robot.java`**
>
> At the start of Chapter 18, `Robot` held every part of the robot, every constant, every rule, and nine fields of "what am I doing right now." Count what is left in its "Remembered from loop to loop" group: one field, `autonomousCommand`, and it only remembers which command to cancel when teleop starts. Every other piece of memory now lives inside the command that needs it, or inside a trigger, or inside a group. That is Section 18.2's first growing pain, finished.

> **Is `RobotContainer` a subsystem?**
>
> No. It does not extend anything, and no command ever requires it. It is a plain class that **builds** things, much like `Constants` is a plain class that **holds** things. WPILib's template creates exactly one `RobotContainer`, in `Robot`'s constructor, and so does the Explorer.

---

## 20.8 Run It: The Whole Robot, Declared

This is the second safe place to stand, and the full test. Build, switch on the XRP, and run the program with `USE_SIMULATED_ROBOT = false`. Keep **NetworkTables** > **SmartDashboard** > **Scheduler** and **Drivetrain** open, and the terminal.

### Disabled

1. While disabled, drive the robot a little by hand (push it), then press **Y**. `Pose reset to start` appears in the terminal, and the robot icon on the field map jumps back to the start. `Reset Pose` runs while disabled because of `ignoringDisable(true)`. It finishes in the same loop it starts, so it never shows in the Scheduler list.

### Teleop

2. Enable **Teleoperated**. `DriveWithSticks` appears in the list. Drive: the deadband, slow mode on the right bumper, gentle turns, limited reverse, and the wall stop should all feel exactly as before.
3. **Hold A.** The robot turns to face heading 90, `TurnToHeading` replaces `DriveWithSticks` in the list, and when the turn is done, `DriveWithSticks` comes back, even if your thumb is still on A. Turn away by hand, hold A again, and let go halfway through the turn: the turn stops at once, and the sticks work.
4. Drive slowly over the tape. The LED comes on while a sensor sees the line (`Line Light` in the list) and goes off when it does not.
5. Press **X**, **B**, and **Back**. Nothing happens: those are Test mode bindings, and `.and(test)` keeps them out of teleop.

### Autonomous

6. Press Y, then enable **Autonomous**, and repeat the four checks from Section 20.5: `Obstacle Course` in the list, the LED on until the line, the same terminal story, a clean restart after disabling, and the sticks back when you switch to teleop.

### Test mode

7. Enable **Test**. The sticks drive. Press **B**: the robot turns to 90 and stops, and the sticks work again. Press **A**: it turns back to 0. Press **X**, then **Back**: out 0.30 m, and back 0.30 m.
8. Press X, and while the robot drives, press B. The terminal shows `DriveDistance interrupted`, and the turn starts. Press X twice in a row, waiting for the first to finish: the robot drives out 0.30 m each time.
9. Hold the **left bumper**: `Bench Cruise` appears, and `Measured Forward (m per s)` settles near 0.10. Let go, and it stops.
10. If you want to re-run SysId, run all four D-pad tests in one run of the program, exactly as in Section 16.6. Each test shows by name while it runs, and the log has the same entries as before.

### The simulated Explorer

Switch the XRP off, set `USE_SIMULATED_ROBOT = true`, and repeat checks 2, 3, 6, 7, and 8. (The line light has nothing to show on the simulated robot until it crosses the pretend tape, and then it stays on.) Set `USE_SIMULATED_ROBOT = false` again before you commit.

Diagnose anything strange:

| What you see | Most likely cause |
|---|---|
| `Commands that have been composed may not be added to another composition or scheduled individually!` | One command object is in a group and also used somewhere else. Read the "Originally composed at" line, and build a fresh command with a factory method (Section 20.4) |
| `Multiple commands in a parallel composition cannot require the same subsystems` at startup | Two commands in a `parallel`, `race`, or `deadline` group both require the drivetrain (Section 20.3) |
| Y does nothing while disabled, but works while enabled | `resetPose()` is missing `.ignoringDisable(true)` |
| A bench button does something in teleop | Its binding is missing `.and(test)` |
| A button does nothing in any mode | The binding was never declared: is `configureBindings()` called from the constructor? Or the binding has `.and(...)` with the wrong mode |
| `NullPointerException` at startup, pointing into `configureBindings()` | Something the bindings use (`drivetrain`, `sysIdRoutine`) is created **after** `configureBindings()` is called |
| A button seems to start its command several times, and things get slower the longer teleop runs | A binding is inside a periodic method instead of the constructor (Section 20.6) |
| The LED stays on after the course finds the line | `holdStill()` ended up **inside** the `Commands.sequence(...)`, so the deadline never ends |
| The sticks do nothing in teleop after autonomous | `teleopInit()` is missing `autonomousCommand.cancel()`, so `Hold Still` still has the drivetrain |

When every check passes on both robots, commit. Your Explorer is now organized exactly the way WPILib's template and most FRC teams organize a robot: a `Robot` that runs the scheduler, a `RobotContainer` that declares the robot, a `Constants` file, and folders of subsystems and commands.

---

## 20.9 Bindings and Groups Everywhere

The shape you finished in this chapter is the shape of every robot in the rest of the book.

- **Chapter 21, state machines.** A sequence is a state machine with no choices: each command is a state, and "finished" is the only way to the next one. Chapter 21 builds a line-follower whose states **choose** where to go next, and shows how state machines and command groups fit together.
- **Chapter 22, unit tests.** Because the commands do not know about the controller, and the bindings live in one place, you can test a command, or the whole obstacle course, with no controller at all.
- **Chapter 23, live tuning and choosers.** `getAutonomousCommand()` can return whichever routine is selected in a dropdown on the dashboard, so the drive team picks the autonomous before the match without anyone changing code.
- **Chapter 29, the Mini Swerve's driver controls.** A `CommandXboxController`, a default command for field-oriented driving, and bindings for "reset the heading," "slow mode," and "lock the wheels."
- **Chapter 31, PathPlanner.** PathPlanner turns paths you draw into commands, and builds whole autonomous routines out of paths and your own commands, as one big group.
- **Chapter 33, auto-align.** Holding a button runs a vision auto-align with `whileTrue`, exactly like the Explorer's A button, and hands the sticks straight back.
- **Chapters 34 and 35, the competition robot.** Driver and operator controllers with dozens of bindings, triggers from sensors ("a game piece is in the intake"), and multi-piece autonomous routines built from sequences and deadlines.

---

## Chapter Summary

> **What you learned in Chapter 20**
>
> * Code that asks a question every loop ("was A just pressed?") is **imperative**. Command-based code is **declarative**: you declare a rule once ("when A is pressed, run this"), and the scheduler checks it for you every loop.
> * New Java: a class that only holds `static` things is written `public final class`, so nobody can extend it, with a **`private` constructor**, so nobody can create one. `Constants`, `MathUtil`, `Commands`, and `RobotModeTriggers` are all built this way. The Explorer's shared numbers now live in `Constants`, grouped in nested classes, while numbers that describe one subsystem or command stay in that class.
> * A **command group** is one command that runs others: a **sequence** (one after another), **parallel** (all at once, until all end), **race** (until any one ends), or **deadline** (until one chosen command ends). A group requires every subsystem its members require, and parallel members may not share one. `until` and `withTimeout` are small race groups.
> * New Java: a group is a **composite**, an object that **is a** `Command` and **has** `Command`s, so groups can hold groups. Because commands have memory, a command can belong to only **one** group and cannot also be scheduled on its own; a **factory method** builds a fresh command each time you need one.
> * The obstacle course is now one command: a sequence of the three steps (each with a timeout) as the deadline for `Auto Light`, then `Hold Still`. `autoStep`, `startStep()`, and the bridge are gone.
> * A **trigger** is a condition the scheduler checks every loop. **Bindings** (`onTrue`, `whileTrue`, `onFalse`, `toggleOnTrue`) start and stop commands when it changes. Triggers combine with `and`, `or`, and `negate`; `RobotModeTriggers` limits a binding to one mode; any `BooleanSupplier`, like a sensor, can be a trigger, and `debounce` filters out flicker. `ignoringDisable(true)` lets a command that moves nothing run while disabled.
> * **`RobotContainer`** declares the robot: its parts, its default command, its bindings (with a controls table), and its autonomous command. `Robot` only starts the loggers, runs the scheduler, and starts and stops the autonomous command.

---

## Exercises

### Practice

**1. Predict the clock.** In a practice branch, add this to the end of `configureBindings()`. It runs a group when you press Start in Test mode, and prints the time at the start and the end (`Timer.getFPGATimestamp()` is the robot's clock, in seconds; import `edu.wpi.first.wpilibj.Timer`):

```java
controller.start().and(RobotModeTriggers.test()).onTrue(
    Commands.sequence(
        Commands.runOnce(() -> DataLogManager.log("Start: " + Timer.getFPGATimestamp())),
        Commands.parallel(Commands.waitSeconds(2.0), Commands.waitSeconds(3.0)),
        Commands.runOnce(() -> DataLogManager.log("End: " + Timer.getFPGATimestamp()))));
```

Before you run it, predict the gap between "Start" and "End." Then change `Commands.parallel` to `Commands.race`, then to `Commands.deadline` (twice, once with each wait first), and then to `Commands.sequence`, predicting each time before you run. Make a table in `reflections.md`: group, prediction, measured. Finally, nest one: `Commands.race(Commands.sequence(Commands.waitSeconds(2.0), Commands.waitSeconds(2.0)), Commands.waitSeconds(3.0))`. Predict, then run. (Why does it need two separate `waitSeconds(2.0)` calls, instead of one wait used twice? Section 20.4 has the answer.) Delete the branch when you are done.

**2. Which binding?** In a practice branch, bind `Commands.waitSeconds(3.0).withName("Three Seconds")` to the right stick button (`controller.rightStick()`) in Test mode with `onTrue`. For each of these, predict how long `Three Seconds` stays in the Scheduler list, then try it: a quick tap; holding for one second; holding for five seconds. Repeat with `whileTrue`, then with `toggleOnTrue` (for toggle, add: tap, wait one second, tap again). Fill in a 3 by 4 table in `reflections.md`. Which binding would you choose for a command that should keep running only while the driver holds the button?

**3. One owner, on purpose.** In a practice branch, in `buildObstacleCourse()`, pull the turn out into a local variable, `Command turnLeft = new TurnToHeading(...)`, and use `turnLeft` in the sequence. Then, in `configureBindings()`, bind the same object to the right bumper in Test mode: `controller.rightBumper().and(RobotModeTriggers.test()).onTrue(turnLeft)`. (You will need to make `turnLeft` a field so both methods can see it.) Predict: does the program start? What happens when you press the right bumper in Test mode? Run it, and copy the error's first three lines into `reflections.md`. Which line does "Originally composed at" point to? Fix it by giving the bench its own `new TurnToHeading(...)`, and explain in one sentence why that works. Then undo everything.

**4. Two things at once.** First, try an illegal group: in a practice branch, add `Commands.parallel(new TurnToHeading(drivetrain, 90.0), new DriveDistance(drivetrain, 0.30))` to a Test mode binding. When does it fail: when you press the button, or when the program starts? Why then? Now build a legal one: make the robot **blink** its LED while it turns. A blink is a group too:

```java
Command blink = Commands.sequence(
        Commands.runOnce(() -> onBoardIO.setLed(true)),
        Commands.waitSeconds(0.2),
        Commands.runOnce(() -> onBoardIO.setLed(false)),
        Commands.waitSeconds(0.2))
    .repeatedly()
    .finallyDo(() -> onBoardIO.setLed(false));
```

`repeatedly()` starts the sequence over each time it ends, forever, and `finallyDo` runs its lambda however the command ends. Bind `new TurnToHeading(drivetrain, 90.0).deadlineFor(blink)` to the right bumper in Test mode. Why must the turn be the deadline, and not the blink? What would `alongWith` do here instead? What would go wrong without `finallyDo`?

**5. The XRP's own button.** The XRP board has a small button labeled **USER**. `XRPOnBoardIO` reads it with `getUserButtonPressed()` (despite the name, it is `true` the whole time the button is held). Make it a trigger that runs a **fresh** obstacle course in Test mode:

```java
new Trigger(onBoardIO::getUserButtonPressed)
    .and(RobotModeTriggers.test())
    .toggleOnTrue(buildObstacleCourse());
```

Put the robot anywhere on the floor, enable Test mode, and press USER. Where does the robot think it is when the course starts, and why? Why is this binding `toggleOnTrue`, and not `onTrue`? (Hint: how does the course end?) Then answer: could you bind `obstacleCourse`, the field, instead of calling `buildObstacleCourse()` again? Try it. Does WPILib allow it? Use Section 20.4 to explain why or why not.

**6. Class or factory, part two.** Write the three course steps as a class, the way WPILib's XRP Reference example does: `public class CourseLeg1 extends SequentialCommandGroup` in the `commands` package, whose constructor takes the drivetrain and sensors and calls `addCommands(...)` with the three steps and their timeouts. Use it in `buildObstacleCourse()` in place of the three steps: `Commands.sequence(resetPose(), new CourseLeg1(drivetrain, sensors))`. Run autonomous to check that nothing changed. In `reflections.md`, write three sentences: what the class version is better at, what the factory version is better at, and which you would choose for a robot with ten different autonomous routines.

**7. Challenge: waypoints as constants.** In Chapter 14's Practice 3, you wrote an immutable `Waypoint` class holding a name and a `Pose2d`, and were told Chapter 20 would have a use for something like it. Move `Waypoint` into the `frc.robot` package if it is not there, and replace `START_POSE`, `CORNER_POSE`, and `LINE_POSE` in `CourseConstants` with three `Waypoint` constants: `START`, `CORNER`, and `LINE`. Update every use (`CourseConstants.START.getPose()`, and so on), and make `resetPose()` log the waypoint's name. Then explain in two sentences why it is safe for a `Waypoint` to be a `public static final` constant shared by the whole program, and what could go wrong if `Waypoint` had a `setName` method.

### Build (XRP Explorer)

Give the Explorer its constants file, turn the course into one command, and move the wiring into `RobotContainer`.

1. Make a branch (see the Git exercise).
2. Create `Constants.java`, move the shared constants into it, and update `Robot.java` (Section 20.2). Build, and drive briefly in teleop.
3. Add `buildObstacleCourse()` and the three factory methods to `Robot`, replace the bridge, and update `autonomousInit()`, `teleopInit()`, and the dashboard (Section 20.5). Build.
4. On the real XRP, run the four autonomous checks in Section 20.5. Commit.
5. Create `RobotContainer.java` and replace `Robot.java` with the Section 20.7 listings. Keep your own values and comments. Build.
6. On the real XRP, run all ten checks in Section 20.8: disabled, teleop (including holding A and the line light), autonomous, and Test mode.
7. On the simulated Explorer, repeat checks 2, 3, 6, 7, and 8. Set `USE_SIMULATED_ROBOT = false` again.
8. **Finish the plan.** In `reflections.md`, update the "Now written as" column of your plan table one last time. Every row should now be a command, a group, a default command, or a binding. Then copy the controls table from `configureBindings()` into `reflections.md`, and add one row for a control you wish the Explorer had. Chapter 21 builds one of them.

Diagnose anything strange with the table at the end of Section 20.8. Two more, specific to the move:

- **`cannot find symbol ... variable CourseConstants`** (or another group): the `import frc.robot.Constants.CourseConstants;` line is missing from the file that uses it.
- **`incompatible types: CommandXboxController cannot be converted to ...`** or **`cannot find symbol ... method getAButtonPressed()`**: something still uses the controller the old way. In `RobotContainer`, every button goes through a binding; `getLeftY()` and `getRightX()` are the only methods you call directly.

When the Explorer runs every mode from bindings, groups, and default commands, on both robots, you are ready for Chapter 21.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Describe the Y button two ways: as Chapter 19 wrote it (imperative) and as this chapter writes it (declarative). Which one could a new teammate get wrong more easily, and how?
2. A command can be bound to many buttons, but it can belong to only one group. Explain why those two rules are different, using the words "memory" and "scheduled."
3. The course gives each step its own timeout, so a stuck step lets the next one run. For a competition robot that scores game pieces in autonomous, would you keep per-step timeouts or stop the whole routine when a step gets stuck? Give one reason for your choice that has to do with safety and one that has to do with points.
4. The teleop A button uses `whileTrue`. Describe exactly what the driver would experience if it used `onTrue` instead, in two cases: when the driver holds A through the whole turn, and when the driver lets go halfway.
5. `ignoringDisable(true)` is on `Reset Pose`, but would be a terrible idea on `DriveDistance`. Explain why, and state a rule for which commands may have it.

If any answer feels shaky, re-read Sections 20.1, 20.4, and 20.6.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b bindings-and-groups
```

After Build step 4, commit the first safe place:

```bash
git add .
git commit -m "Ch20: Constants.java and the obstacle course as one command group"
```

After Build step 7, with `USE_SIMULATED_ROBOT = false`:

```bash
git add .
git commit -m "Ch20: RobotContainer and button bindings"
git push -u origin bindings-and-groups
```

Open a pull request into `main`. In **Files changed**, look at `Robot.java`: almost the whole file is red, and `RobotContainer.java` is almost all green. Git sees a deleted block and a new file, not a move, because the code moved **between** files and changed along the way. That is normal for this kind of refactor, and it is exactly why the first commit (constants and the course, in the same file) was kept separate: a reviewer can read the two changes one at a time. Merge, delete the branch, then `git checkout main` and `git pull`.

### Collab: The Pair Binding Lab

This is the pair merge-conflict lab promised in Chapter 11, now in command-based code. You and your partner each add a new command and bind it to a button, on separate branches of the same repository. In command-based code, there is one place everybody edits: `RobotContainer`. That is where your conflict will be. And this time, Git will not catch everything.

As in Chapter 11, the **owner** is the person whose Explorer repository you are working in, and the **teammate** is the other partner. You will do the lab twice, swapping roles.

**Part A: prepare.** Each partner, alone: finish this chapter's Build exercise and merge it into `main`, so both Explorers have a `RobotContainer`. Then the owner shares the repository and the teammate clones it into a new folder, exactly as in Chapter 11's Pair Lab, Part B. Both: run `git checkout main` and `git pull`.

**Part B: two features, two branches.** The drive coach has asked for two new teleop features, and has told **both** of you to put yours on the **X** button, because it is closest to the driver's thumb. Work at the same time. Nobody merges yet.

1. **Owner:** create a `square-up` branch. Add this command to the `commands` folder:

   ```java
   package frc.robot.commands;

   import edu.wpi.first.math.MathUtil;
   import edu.wpi.first.math.controller.PIDController;
   import edu.wpi.first.wpilibj.DataLogManager;
   import edu.wpi.first.wpilibj2.command.Command;
   import frc.robot.subsystems.Drivetrain;

   /** Turn in place to the nearest multiple of 90 degrees, so the robot is square to the course. */
   public class SquareUp extends Command {

       private final Drivetrain drivetrain;
       private final PIDController headingController = Drivetrain.createHeadingController();

       // Chosen when the command starts: the nearest square heading to wherever the robot faces.
       private double targetHeadingDegrees = 0.0;

       /**
        * Create a command that squares the robot up.
        *
        * @param drivetrain the drivetrain to turn
        */
       public SquareUp(Drivetrain drivetrain) {
           this.drivetrain = drivetrain;
           addRequirements(drivetrain);
       }

       @Override
       public void initialize() {
           targetHeadingDegrees = Math.round(drivetrain.getHeadingDegrees() / 90.0) * 90.0;
           headingController.reset();
           DataLogManager.log("SquareUp to " + targetHeadingDegrees + " deg started");
       }

       @Override
       public void execute() {
           double turnRate = headingController.calculate(
               drivetrain.getHeadingDegrees(), targetHeadingDegrees);
           turnRate = MathUtil.clamp(turnRate,
               -Drivetrain.AUTO_TURN_RADIANS_PER_SECOND, Drivetrain.AUTO_TURN_RADIANS_PER_SECOND);
           drivetrain.drive(0.0, turnRate);
       }

       @Override
       public boolean isFinished() {
           return headingController.atSetpoint();
       }

       @Override
       public void end(boolean interrupted) {
           drivetrain.stop();
       }
   }
   ```

   In `RobotContainer`, import it. In the controls table in `configureBindings()`'s Javadoc, add this row **right after** the teleop `A` row:

   ```
    *            X              square up to the nearest 90 degrees
   ```

   And add this binding **right after** the teleop A binding (after its closing `);`, before the line-light comment):

   ```java
   // Teleop: press X to square up to the nearest 90 degrees.
   controller.x().and(teleop).onTrue(new SquareUp(drivetrain));
   ```

   Build, test it in teleop (turn the robot by hand to about 30 degrees, press X, and it should turn back to 0), and commit: `Add SquareUp on X in teleop`.

2. **Teammate:** create a `back-away` branch. Add this command to the `commands` folder:

   ```java
   package frc.robot.commands;

   import edu.wpi.first.wpilibj.DataLogManager;
   import edu.wpi.first.wpilibj2.command.Command;
   import frc.robot.Sensors;
   import frc.robot.subsystems.Drivetrain;

   /** Back slowly away from whatever is in front, until the rangefinder sees open space. */
   public class BackAwayFromWall extends Command {

       private static final double BACK_AWAY_METERS_PER_SECOND = 0.10;
       private static final double CLEAR_DISTANCE_METERS = 0.30;

       private final Drivetrain drivetrain;
       private final Sensors sensors;

       /**
        * Create a command that backs away from a wall.
        *
        * @param drivetrain the drivetrain to drive
        * @param sensors the sensors, for the rangefinder (read only, never required)
        */
       public BackAwayFromWall(Drivetrain drivetrain, Sensors sensors) {
           this.drivetrain = drivetrain;
           this.sensors = sensors;
           addRequirements(drivetrain);
       }

       @Override
       public void initialize() {
           DataLogManager.log("BackAwayFromWall started at " + sensors.getDistanceAheadMeters() + " m");
       }

       @Override
       public void execute() {
           drivetrain.drive(-BACK_AWAY_METERS_PER_SECOND, 0.0);
       }

       @Override
       public boolean isFinished() {
           return !sensors.isObstacleWithin(CLEAR_DISTANCE_METERS);
       }

       @Override
       public void end(boolean interrupted) {
           drivetrain.stop();
       }
   }
   ```

   In `RobotContainer`, import it, add this row **right after** the teleop `A` row in the controls table:

   ```
    *            X              back away from a wall until 0.30 m is clear
   ```

   and add this binding **right after** the teleop A binding:

   ```java
   // Teleop: press X to back away from a wall.
   controller.x().and(teleop).onTrue(new BackAwayFromWall(drivetrain, sensors));
   ```

   Build, test it (drive up to a wall, press X, and the robot backs away slowly until the rangefinder reads more than 0.30 m), and commit: `Add BackAwayFromWall on X in teleop`.

3. **Both:** push your branch and open a pull request into `main`, with a what, why, and how-I-tested description (Section 11.3).

**Part C: merge, and resolve.**

1. **Both:** review each other's PR. Use the command review checklist from Chapter 19's Collab exercise.
2. **Teammate:** merge the owner's `square-up` PR, and delete the branch.
3. **Teammate:** the `back-away` PR now has conflicts. Resolve them on your laptop, following Section 11.8: `git checkout back-away`, `git fetch origin`, `git merge origin/main`. There are **two** conflicts in `RobotContainer.java`, the table row and the binding. Notice what did **not** conflict: the two new command files, and the two `import` lines. New command classes are new files, so they never collide. That is one of the quiet benefits of one class per command.
4. **Teammate:** resolve both conflicts by keeping **both** sides, and build. It builds. **Do not push yet.**

**Part D: the conflict Git cannot see.** Read the controls table you just merged. X is listed twice, with two different jobs. The code has the same problem: two bindings on one button. Git merged the text without a complaint, the compiler accepted it, and the robot will run it. This is Chapter 11's **semantic conflict** (Section 11.9), in its command-based form.

1. **Teammate:** before fixing it, predict: when you press X in teleop facing a wall, both bindings schedule their command in the same loop, and both commands require the drivetrain. Which one runs? Then run it, and watch the terminal and the Scheduler list. (Both bindings fire in the order they were declared. The second command interrupts the first, so the binding declared later wins, and the first command's log line appears for an instant before it is interrupted.)
2. **Both:** decide together where `BackAwayFromWall` should go. B is free in teleop. Move its binding to `controller.b()`, fix its row in the table so that every button appears once, build, and test both buttons.
3. **Teammate:** `git add`, `git commit --no-edit`, then make one more commit for the button change (`Move BackAwayFromWall to B: X was taken`), and push.
4. **Owner:** review the PR's **Files changed**. Is every button in the table exactly once? Does each binding match its row? Approve, merge, and delete the branch.
5. **Both:** `git checkout main`, `git pull`, build, and drive. X squares up, B backs away.

**Part E: swap.** Repeat Parts B through D in the **other** partner's repository, with roles reversed. This time, try to spot the double binding **in the code review**, before anyone runs the robot. Send your mentor the links to both merged PRs.

Diagnose anything strange:

- **No conflict happened:** your table row or binding was not in the same spot as your partner's. Check `main` to make sure both features are there. If X is bound twice, you still have Part D's problem to fix, and nothing warned you.
- **The build fails after resolving:** a leftover conflict marker, or a missing `import` for one of the two commands. Read the first error (Chapter 10).
- **One feature is missing after the merge:** the conflict was resolved with "keep mine" or "keep theirs." Fix forward on a new branch.

Afterward, each of you writes two sentences in `reflections.md`: why did all the conflicts land in `RobotContainer`, and what could a team do (a habit, a file, or a review question) to catch a double-bound button before it reaches the robot?

### Explore

Create WPILib's standard **command-based** template in a scratch folder: **WPILib: Create a new project** > **Template** > **java** > **Command Robot**. (It is the roboRIO version of the XRP template; you only need to read it, not run it.)

- Open its `RobotContainer`. Find `configureBindings()`. One binding uses `new Trigger(...)` with a method reference to the subsystem. What condition is it, and which binding does it use? Another binding calls `m_exampleSubsystem.exampleMethodCommand()`. Open `ExampleSubsystem` and find that method. It is a command **factory**, but it lives in the subsystem, not in `RobotContainer`. Write two sentences in `reflections.md` on when a factory belongs in the subsystem and when it belongs in `RobotContainer`. (Hint: does `resetPose()` need anything besides the drivetrain? Does `buildObstacleCourse()`?)
- Open `commands/Autos.java`. It is a holder class, like `Constants`, but its private constructor **throws an exception**: `throw new UnsupportedOperationException("This is a utility class!")`. Why would WPILib bother, when the constructor is already private? (Hint: is there any way for code **inside** the class to call it?)
- Open the **XRP Reference** example from Chapter 18 again. Its `RobotContainer` uses `JoystickButton` and `new Trigger(m_onboardIO::getUserButtonPressed)`, with `onTrue` and `onFalse` on the same trigger. What does that binding do when you press and release the USER button?
- Read WPILib's **Command Compositions** page (link below). Find one kind of group this chapter did not use, and describe in two sentences when the Explorer might use it.

---

> **Additional Resources**
>
> * **Binding Commands to Triggers**: [docs.wpilib.org/en/stable/docs/software/commandbased/binding-commands-to-triggers.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/binding-commands-to-triggers.html) WPILib's guide to `Trigger`, `CommandXboxController`, every binding, composing triggers, and debouncing
> * **Command Compositions**: [docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html) sequences, parallel, race, and deadline groups, plus the rules about composed commands
> * **Structuring a Command-Based Robot Project**: [docs.wpilib.org/en/stable/docs/software/commandbased/structuring-command-based-project.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/structuring-command-based-project.html) what goes in `Robot`, `RobotContainer`, and `Constants`
> * **Organizing Command-Based Robot Projects**: [docs.wpilib.org/en/stable/docs/software/commandbased/organizing-command-based.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/organizing-command-based.html) command classes versus factory methods, and where to put factories
> * **Writing Final Classes and Methods (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/IandI/final.html](https://docs.oracle.com/javase/tutorial/java/IandI/final.html) Java's official lesson on `final` classes and methods
> * **Nested Classes (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/javaOO/nested.html](https://docs.oracle.com/javase/tutorial/java/javaOO/nested.html) static nested classes, like the groups in `Constants`

---

*Next up, Chapter 21: State Machines. You will build a line-following command whose insides are a state machine, meet Java's `enum` at last, and see how a sequence of commands and a state machine are two ways of writing the same idea.*
