# Chapter 24: AdvantageScope: Visualizing and Replaying Logs

In Chapter 23 the Explorer got a real dashboard. A dropdown picks the autonomous routine, and a Tuning tab changes nine numbers while the robot runs. You tuned the whole course that way, and copied the winners back into your code, where twenty-seven tests stand guard over them.

All of that happens **live**. You watch the robot, you watch the dashboard, and when the run is over, it is gone. If the follower did something strange on the third corner, you have your memory of it, a few lines in the terminal, and maybe a video on someone's phone.

But something else has been watching every run since Chapter 17. AdvantageKit has written a log file every time your program started: every encoder reading, every button press, every loop, all in a folder you have probably never opened. This chapter opens it.

By the end of the chapter, you will be able to:

- open any run in **AdvantageScope**, scrub through it loop by loop, and line up graphs, the field, and a table of values on the same moment,
- see every command start and stop on a **timeline**, and watch `FollowLine` change state, the view Chapters 20 and 21 promised you,
- keep **one** log file per run instead of two, and run SysId from it,
- **replay** a run: feed a log back into your code on your laptop, with no robot, and watch your code make the same decisions it made on the floor, chooser selection and tuned values included,
- find a bug in a run that already happened, by adding a log line **after** the run and replaying it.

On the way, you will find out that replay can lie, and why. One part of the Explorer has never gone through an IO layer, and Section 24.9 catches it in the act. Section 24.10 fixes it.

On the Java side, you will learn **anonymous classes**: a class with no name, written right where it is used, in two characters: `{}`. They turn out to be the missing piece of replay, and they explain something about the lambdas you have been writing since Chapter 18. You will also read one more generic method, and meet the difference between an enum's `name()` and its `toString()`, which matters more than you would expect.

You will need your XRP for parts of this chapter, and a strip of tape for the line follower. Everything except Section 24.11's corner can also be done on the simulated robot.

---

## 24.1 The Run You Cannot Repeat

Here is a story every robotics team has lived.

The course has run perfectly twenty times. On the twenty-first run, the follower reaches the end of the crossbar, turns onto the line, and stops dead. `END_OF_LINE`, says the terminal. The line goes on for another half meter. You put the robot back and run it again. Perfect. You run it five more times. Perfect every time.

What happened on run twenty-one? You can guess. The battery? A speck of dust on a sensor? The robot landing a centimeter to the left? `SIDE_ERROR` being a little too big? Every guess is a story, and you cannot test a story about a run that is over. You could add a print and try to make it happen again, but it took twenty-one runs the first time.

Now imagine the same thing at a competition. Autonomous fails in a qualification match. You do not get to rerun the match. You get two minutes of driving, one shot at autonomous, and whatever you can figure out before the next match, twenty minutes from now.

That is the problem this chapter solves. It has two halves.

**Seeing what happened.** A log holds every input and every output, for every loop. If you can look at it the right way, run twenty-one is not a memory any more. It is a timeline you can scrub back and forth, with the sensor readings, the state, and the robot's position on the floor, all at the same instant. Sections 24.2 to 24.5 are about seeing.

**Asking a new question about what happened.** Sometimes the log does not hold the number you need, because you never thought to record it. Usually that would be the end: you would add a print and wait for the bug to come back. **Log replay** is different. It feeds the old run's inputs back into your **new** code, on your laptop, loop by loop, and records what the new code decides. Add a log line, replay, and the old run now has that line in it. Sections 24.6 to 24.11 are about replay.

> **Logs are not just for bugs**
>
> Teams that log well use their logs every day, not only when something breaks. How long does autonomous really take? How close to its limit is the battery in the last ten seconds of a match? How many times did the driver press the button that does nothing? Did the loop ever run late? Every one of those is a question about the past, and every one is answered in a log. In Chapter 37, every match's log becomes a report on your own robot.

---

## 24.2 What Is in Your Logs Folder

Open your Explorer project in VS Code and look in the Explorer pane (the file list on the left) for a folder named `logs`. It is at the top level of your project, next to `src` and `build.gradle`. If you ran the robot this week, it is full.

> **Where are the XRP's logs?**
>
> An XRP program runs on your laptop (Section 17.2), so its logs are written on your laptop, in the project's `logs` folder, whether the robot was real or simulated. The XRP itself never stores anything. A roboRIO is different: it writes logs on the robot, and Section 24.12 shows how to get them off. The `logs` folder is in WPILib's `.gitignore`, so your logs never end up in Git. That is on purpose: logs are big, and every run makes a new one.

You will find two kinds of file, and they come in pairs, one pair for every run:

| File name | Written by | Since |
|---|---|---|
| `FRC_20261013_181502.wpilog` | WPILib's `DataLogManager` | Chapter 10 |
| `akit_26-10-13_18-15-02.wpilog` | AdvantageKit's `WPILOGWriter` | Chapter 17 |

The numbers are the date and time the run started (your names will differ). Both files end in `.wpilog`: they are both written in WPILib's **WPILOG** format, a compact binary file where every value is stored with a name, a type, and a timestamp. That shared format is why one tool can read both.

Chapter 17 kept both recorders running, and promised that this chapter would decide which one the Explorer really needs. Before deciding, look inside.

### Open a log

Run the Explorer, on the real XRP or the simulated one. Drive it around in teleop for half a minute, run the course once in autonomous, and stop the program. You now have a fresh pair of logs.

Open AdvantageScope (**WPILib: Start Tool** > **AdvantageScope**). In its menu, choose **File** > **Open Log(s)...**, go to your project's `logs` folder, and pick the **newest** `akit_` file. (Sort by date, or look at the time in the name.) The sidebar on the left fills with a tree of names.

That tree is the whole run. Close every folder, and look at the top level. These are the ones that matter:

| Table | What is in it | Input or output? |
|---|---|---|
| `Drivetrain` | The eight fields of `DrivetrainIOInputs` (Chapter 17), every loop | Input |
| `DriverStation` | Enabled or disabled, which mode, and every joystick's axes and buttons | Input |
| `NetworkInputs` | Values the dashboard sent the robot: the auto chooser and the Tuning tab (Chapter 23) | Input |
| `RealOutputs` | Everything your code decided to record: `Drivetrain/Pose`, and a few of AdvantageKit's own | Output |
| `RealMetadata` | The labels from `Logger.recordMetadata`, like `ProjectName` | Neither: a label |
| `SystemStats` | The computer's own health, like battery voltage (most useful on a roboRIO) | Input |

Open `Drivetrain`, and you see the eight inputs from Chapter 17. Open `NetworkInputs` > `SmartDashboard`, and there is `Auto Routine`, with the routine you picked, exactly as Chapter 23 said it would be. Open `NetworkInputs` > `Tuning`: there are your nine tunable numbers.

### Inputs and outputs, again

Look at the third column of that table. It is the most important idea in the chapter, so it is worth saying slowly.

An **input** is something the code **receives** from the world: a sensor reading, a joystick, the clock, a number typed into the dashboard. The code cannot choose an input. It can only read it.

An **output** is something the code **decides**: a motor voltage, a pose computed by odometry, a state of the line follower. Feed the code the same inputs, and it must decide the same outputs, because the code is just a machine that turns one into the other.

AdvantageKit records inputs at the **top level** of the log, under the name you gave `Logger.processInputs` (`"Drivetrain"`). It records outputs under **`RealOutputs`**, because they came from a real run of your code. That split is not just tidiness. It is the plan for replay: Section 24.6 will feed the top-level inputs back into the code, and compare the outputs it gets with the `RealOutputs` it got the first time.

> **Where is everything else?**
>
> Look for `Sensors`. It is not there. Look for `Line State`, `Left Reflectance`, or `Distance Ahead (m)`, the values you have put on the dashboard since Chapter 9. Not there either. AdvantageKit records what goes through `processInputs` and `recordOutput`, and the drivetrain is the only part of the Explorer that does. The rangefinder, the reflectance sensors, and the accelerometer reach your code without AdvantageKit ever seeing them. Keep that in mind: it comes back, hard, in Section 24.9.

### And the other file?

Now open the `FRC_` file from the same run, with **File** > **Open Log(s)...** again. (Opening a log replaces the one that was open.) Its tree looks different:

- **`NT`**: everything that was on NetworkTables, which is every `SmartDashboard.putNumber` since Chapter 4: `Line State`, `Left Reflectance`, `Pose X (m)`, all of it. And, because AdvantageKit's `NT4Publisher` publishes everything on NetworkTables too, a second copy of every AdvantageKit value, under `NT` > `AdvantageKit`.
- **`DS`** and **`messages`**: the Driver Station state, and every `DataLogManager.log(...)` message, the lines you have seen in the terminal since Chapter 10.
- After a SysId session (Chapter 16), **`sysid-test-state-drive`** and the motor entries that SysId reads.

So the `FRC_` file holds a few things the `akit_` file does not: your dashboard values, and your log messages. Section 24.5 deals with each one, and then retires the `FRC_` file for good.

---

## 24.3 A Tour of AdvantageScope

AdvantageScope shows the same log in many ways at once. Each way is a **tab**, and every tab is synced to the same moment in the run. Here are the five you will use most, each with something to find in your own log.

Open your `akit_` log again before you start.

### The timeline

Across the top of the window, above the tabs, is the **timeline**: the whole run, left to right. The colored bands show the robot's mode: **green** for autonomous, **blue** for teleop, and no color while disabled. Click anywhere on the timeline to jump to that moment. Click and drag to select a stretch of time.

Two things to try right away:

- Scroll the mouse wheel over the timeline (or over any graph) to zoom in and out. Drag sideways to move.
- Press **Ctrl+\\** (**Cmd+\\** on a Mac) to zoom to the stretch where the robot was enabled. Most runs start with a long disabled stretch while you get ready, and this skips it.

When you click on a moment, every tab jumps there together. That is what makes AdvantageScope more than a graph program: you can see a spike on a graph, click it, and switch to the field to see where the robot was when it happened.

> **Live or log, the same tabs**
>
> Everything in this tour also works live. In Chapter 17 you connected AdvantageScope to the running robot with **File** > **Connect to Simulator** > **NetworkTables 4 (AdvantageKit)**, and the same tabs filled in as the robot drove. A log is simply a run that has finished. Learn a tab once, and you can use it both ways.

### Line Graph: numbers over time

The window starts on a **Line Graph** tab. You used it in Chapter 17. Now use it properly.

The bottom of the tab has three areas you can drag fields into: **left axis**, **right axis**, and **discrete**. Fields with different units belong on different axes, so their scales do not fight. Try this:

1. Drag `Drivetrain` > `LeftSpeedMetersPerSecond` and `RightSpeedMetersPerSecond` onto the left axis.
2. Drag `Drivetrain` > `LeftAppliedVolts` onto the **right** axis.
3. Press **Ctrl+\\** and find the autonomous run (the green band).

Now you can see the cause and the effect on one graph: the volts go up, and a moment later the speed follows. On leg 1, `DriveDistance` asks for a lot of volts at the start, and less as it closes in, the shape of a PID controller you saw in Chapter 15. On the turn, the left and right speeds go in opposite directions.

Hover over the graph, and a line follows your mouse with every value at that moment. Click, and the whole window jumps there.

The **discrete** area is for values that are not smooth numbers: true or false, a word, a mode. Drag `DriverStation` > `Enabled` into it, and it becomes a bar along the bottom that changes color where the value changes. Strings work the same way, and each stretch of the bar is labeled with its value. Section 24.4 fills the discrete area with the most useful timeline you have ever had.

### 2D Field: where was the robot?

Add a tab with the **+** button at the top of the window, and choose **2D Field**. Drag `RealOutputs` > `Drivetrain` > `Pose` onto the **Poses** area at the bottom of the tab.

In Chapter 17 the Explorer's course looked tiny on a full FRC field. You can do better. Open the field choices at the top of the tab, and look for **Evergreen**: a plain field with no game pieces on it. AdvantageScope has an FTC-sized Evergreen field too, 12 feet square, which suits the Explorer far better than a 54-foot FRC field. On the FTC field, the origin, (0, 0), is in the **center** of the field, so your start pose sits right in the middle. That is fine: the course still has the right shape, and you can zoom in with the mouse wheel.

The robot drawn on the field is much bigger than an XRP: AdvantageScope draws FRC- and FTC-sized robots. Watch the **path** instead. Click on the timeline, at the start of autonomous, and drag slowly to the end. The robot traces leg 1, turns, and follows the line, exactly as `getPose()` reported it.

> **Two poses on one field**
>
> You can drag more than one pose onto the field. Right now there is only one, but in Section 24.9 you will have two: the pose the robot reported when it ran (`RealOutputs`), and the pose your code works out when it replays (`ReplayOutputs`). When they sit exactly on top of each other, replay is working. In Chapter 33, a camera will give the robot a second opinion about where it is, and two poses on one field will be how you check the camera.

### Table: every change, in order

Add a **Table** tab, and drag `Drivetrain` > `HeadingDegrees` and `DriverStation` > `Enabled` into it. Each row is one moment where a value **changed**, with its timestamp. Click a row, and the whole window jumps to that moment.

A table is what you want when "about then" is not good enough: which loop, exactly, did the robot become enabled? What was the heading on that loop, and on the next one? Graphs show the shape of a run; tables show its numbers.

### Console: the terminal, saved

Add a **Console** tab, and drag `RealOutputs` > `Console` into it. There is everything your program printed with `System.out.println`, each line with the time it was printed: `XRP Explorer started!`, and every `Mode:` line.

AdvantageKit saves everything printed to the terminal into the log, without being asked. Scroll down, and your `DataLogManager.log` messages are here too: `Pose reset to start`, `FollowLine: FOLLOWING -> END_OF_LINE`, and the rest. `DataLogManager.log` writes each message into the `FRC_` file **and** prints it to the terminal, and AdvantageKit catches the printed copy. Remember that; it decides something in Section 24.5.

### Save the layout

Five tabs is a lot to set up every time. AdvantageScope remembers your tabs when you close it, but you can also save them to a file, the same way you saved Elastic's layout in Chapter 23: **File** > **Export Layout...**. Save it as `advantagescope-layout.json` in the top folder of your project, so it goes into Git with your code. A teammate can load it with **File** > **Import Layout...**, and see every run the way you do.

You will build a better layout in Section 24.4, so wait to commit it.

---

## 24.4 Recording What the Code Decides

So far the log has the drivetrain's inputs and one output, the pose. That is enough to see where the robot went. It is not enough to see **why**. Why did the robot stop at the corner? You would want to know what state the follower was in, which step of the course was running, and what the code asked the motors for. None of that is an input. All of it is an output, and an output is recorded only if the code records it.

`Logger.recordOutput(key, value)` is the whole tool. You used it once, in Chapter 17, for the pose. This section adds four more, each answering a question you will want to ask a log.

### What did the code ask for? Requested volts

`Drivetrain` already has `LeftAppliedVolts` and `RightAppliedVolts`. Those are inputs: what the **hardware** reports it is applying. That is usually what the code asked for, but not always. On a roboRIO, a motor controller with a current limit applies less than it was asked. A brownout applies less. And when your code asked for 7 volts, `setVolts()` clamped it to 6 (Section 16.2).

The number the **code** chose is an output. Record it. Open `Drivetrain.java` and replace `setVolts()`:

```java
/**
 * Drive each side at a voltage, limited to the battery's range.
 *
 * @param leftVolts the left side's voltage; positive drives forward
 * @param rightVolts the right side's voltage; positive drives forward
 */
public void setVolts(double leftVolts, double rightVolts) {
    double left = MathUtil.clamp(leftVolts, -NOMINAL_BATTERY_VOLTS, NOMINAL_BATTERY_VOLTS);
    double right = MathUtil.clamp(rightVolts, -NOMINAL_BATTERY_VOLTS, NOMINAL_BATTERY_VOLTS);
    io.setVolts(left, right);

    // What the code asked for (Chapter 24). The inputs say what the hardware applied.
    Logger.recordOutput("Drivetrain/LeftRequestedVolts", left);
    Logger.recordOutput("Drivetrain/RightRequestedVolts", right);
}
```

Every way of driving (`arcadeDrive`, `drive`, `stop`, SysId) ends in `setVolts()`, so these two lines catch every volt the code ever sends. They will matter even more in Section 24.9: requested volts are the clearest check that replay is working.

### What was the follower doing? `FollowLine/State`

Chapter 21 promised that a state logged every loop would become a timeline. Open `FollowLine.java`, import the logger:

```java
import org.littletonrobotics.junction.Logger;
```

and in `execute()`, right after `drivetrain.drive(speeds);`, add one line:

```java
drivetrain.drive(speeds);
Logger.recordOutput("FollowLine/State", state);   // the state timeline (Chapter 24)
```

Look at what is being recorded: `state`, a `FollowLine.State`, an **enum**. `recordOutput` has versions for numbers, booleans, strings, poses, and more, and one of them takes any enum at all. Its declaration, from AdvantageKit's `Logger` class, is worth learning to read:

```java
public static <E extends Enum<E>> void recordOutput(String key, E value)
```

You learned generics in Chapter 23, on **classes**: `SendableChooser<V>` has a type parameter `V`, declared after the class name. This is a generic **method**. Its type parameter, `<E extends Enum<E>>`, is declared right before the return type, and it belongs to this one method. Read it in three pieces:

- **`<E ...>`**: this method works with some type, which it calls `E`.
- **`extends Enum<E>`**: but not any type. `E` must be an enum. This is a **bound**: it limits which types can fill in `E`. (Every enum you write secretly extends Java's `Enum` class, so `FollowLine.State` qualifies.)
- **`E value`**: the parameter is one of those enum values.

You never write the `<FollowLine.State>` yourself. Java looks at the argument you passed, sees a `FollowLine.State`, and fills in `E` for you. (This is called **type inference**, the same thing the diamond `<>` did for you in Chapter 23.) And because of the bound, the compiler catches a wrong call: pass an `int` or a `Pose2d` to this version, and it simply does not match.

The method records the value's `name()`, the exact word in your enum: `"FOLLOWING"`, `"SEARCHING_LEFT"`. In the log it is a string, so it goes in the Line Graph's discrete area as a bar labeled with each state. Hold that thought about `name()`; it matters in Section 24.5.

> **Why every loop, not only when it changes?**
>
> `changeState()` runs only when the state changes, so recording there would make a smaller log. Recording in `execute()` costs almost nothing, and has one big advantage: the state is in the log for **every** loop the follower runs, so when you click any moment in a run, the Table and the graph can tell you the state at that moment, and the bar starts the moment the follower starts. The `DataLogManager` message in `changeState()` still records each change, with the old state and the new one, which is the other half of the story.

### Which step of the course? `Course/Step`

Chapter 20 promised more. In its callout "Where did `Auto Light` go?", it said that commands inside a group never appear on the Scheduler list, because the scheduler never sees them, and that AdvantageScope would show every command's start and end on a timeline.

Here is the honest version of that promise. The command scheduler can tell you about every command **it** starts and stops. It cannot tell you about the commands inside a group, because, exactly as Chapter 20 said, it never starts them: the group does. So the timeline needs two parts: one for what the scheduler sees, and one for the steps of the course.

The course is a sequence: reset, leg 1, turn, leg 2, leg 3, then hold still. Chapter 21 pointed out that a sequence **is** a state machine, with one state per step. So record its state the way you just recorded the follower's: give each step a name, and write the name to the log when the step starts.

In `RobotContainer.java`, import the logger:

```java
import org.littletonrobotics.junction.Logger;
```

Add this factory with the others:

```java
/**
 * One step of the obstacle course: write its name on the course timeline, then run it
 * (Chapter 24). A sequence is a state machine, and this logs which state it is in.
 *
 * @param name the step's name, as the log will show it
 * @param command what the step does
 * @return the step, ready to go in the course's sequence
 */
private Command step(String name, Command command) {
    return Commands.sequence(
            Commands.runOnce(() -> Logger.recordOutput("Course/Step", name)),
            command)
        .withName(name);
}
```

and wrap each step of `buildObstacleCourse()` in it:

```java
private Command buildObstacleCourse() {
    Command course = Commands.sequence(
        step("Reset Pose", resetPose()),
        step("Leg 1", new DriveDistance(drivetrain, CourseConstants.LEG_1_DISTANCE_METERS)
            .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS)),
        step("Turn", new TurnToHeading(drivetrain, CourseConstants.TURN_HEADING_DEGREES)
            .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS)),
        step("Leg 2", new DriveUntilLine(drivetrain, sensors, CourseConstants.LEG_2_MAX_DISTANCE_METERS)
            .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS)),
        step("Leg 3", Commands.either(
            new FollowLine(drivetrain, sensors)
                .withTimeout(CourseConstants.FOLLOW_TIMEOUT_SECONDS),
            Commands.runOnce(() -> DataLogManager.log("No line here, so no leg 3")),
            this::isLineSeen)));

    return course
        .deadlineFor(lightTheLed().withName("Auto Light"))   // LED on while the course runs
        .andThen(step("Done", holdStill()))                  // then keep the drivetrain
        .withName("Obstacle Course");
}
```

Your `buildObstacleCourse()` may look a little different (your `either` from Chapter 21, your own comments). Keep yours, and only add the `step(...)` wrappers.

`step()` is a **command factory** (Section 20.4) that takes a command and returns a bigger one: a tiny sequence that first records the name, and then runs the step. `Commands.runOnce` finishes in the same loop it starts, so the step itself starts right away, in the same loop. Nothing about how the course drives has changed, and `ObstacleCourseTest` will prove it in a minute.

### Every command the scheduler runs: `Commands/`

Now the other part: everything the scheduler starts and stops, whether a button started it, a trigger, a default, or autonomous. The `CommandScheduler` can call your code whenever it starts or ends a command, if you give it a lambda for each. Add this method to `RobotContainer`:

```java
/**
 * Put every command the scheduler starts and stops on the log's command timeline
 * (Chapter 24): true while it runs, false when it finishes or is interrupted.
 */
private void logCommands() {
    CommandScheduler.getInstance().onCommandInitialize(
        command -> Logger.recordOutput("Commands/" + command.getName(), true));
    CommandScheduler.getInstance().onCommandFinish(
        command -> Logger.recordOutput("Commands/" + command.getName(), false));
    CommandScheduler.getInstance().onCommandInterrupt(
        command -> Logger.recordOutput("Commands/" + command.getName(), false));
}
```

and call it in the constructor, right after `configureAutoChooser();`:

```java
configureBindings();
obstacleCourse = buildObstacleCourse();
configureAutoChooser();
logCommands();
```

Each of the three methods takes a `Consumer<Command>` (Section 18.6): a lambda that receives the command. `onCommandInitialize` calls it when a command starts, `onCommandFinish` when it ends by itself, and `onCommandInterrupt` when something else stops it. The key is built from the command's name, so every command gets its own row: `Commands/Obstacle Course`, `Commands/DriveWithSticks`, `Commands/Line Light`. That is why Chapter 20 had you give every command a name with `withName()`: here is where the names pay off. (A default command's name, if you never gave it one, is its class's simple name, like `DriveWithSticks`.)

### Look at it

Build, and run the tests: all twenty-seven should pass, because nothing drives differently. Then run the Explorer, real or simulated. Run the course in autonomous once. Then switch to teleop, drive a little, hold the left bumper over the tape for a moment, and stop the program.

Open the new `akit_` log, and on a Line Graph tab, drag these into the **discrete** area:

- `RealOutputs` > `Course` > `Step`
- `RealOutputs` > `FollowLine` > `State`
- `RealOutputs` > `Commands` > `Obstacle Course`
- `RealOutputs` > `Commands` > `DriveWithSticks`
- `RealOutputs` > `Commands` > `FollowLine`

and `Drivetrain` > `LeftSpeedMetersPerSecond` onto the left axis. Press **Ctrl+\\**.

Here is the run, as a story you can read from left to right. While the robot is disabled, every row is empty: the scheduler does not run commands while the robot is disabled, unless they are marked to (only `Reset Pose` is). Autonomous starts, and `Obstacle Course` turns on. Under it, `Course/Step` reads `Reset Pose`, `Leg 1`, `Turn`, `Leg 2`, `Leg 3`, and `Done`, with the speed graph showing each step's shape above it. During `Leg 3`, `FollowLine/State` says `FOLLOWING`, and then `END_OF_LINE` at the end of the tape. At the start of teleop, `Obstacle Course` turns off (`teleopInit()` cancels it), and `DriveWithSticks`, the drivetrain's default command, turns on in the next loop, because now nothing else needs the drivetrain. When you held the left bumper, `FollowLine` turned on and `DriveWithSticks` turned off at the same instant, interrupted. Let go, and they swap back.

Notice `Commands/FollowLine`. It is on in teleop, when the bumper started it, but **not** during `Leg 3` of the course: in the course, `FollowLine` runs inside a group, and only the group was scheduled. That is the line between the two timelines. `Commands/` is what the scheduler did; `Course/Step` is what happened inside the course.

Now save this view. Arrange the tabs the way you like them: this Line Graph, a 2D Field with the pose, a Table, and a Console. Export the layout over `advantagescope-layout.json` (Section 24.3), and you have a debugging window for every run from now on.

> **Mind the cost**
>
> Every `recordOutput` writes into the log, every loop. A few dozen numbers is nothing: the Explorer's log grows by a few kilobytes a second. But a key built inside a loop, from a value that keeps changing (`"Commands/" + Timer.getTimestamp()`), would create a new field every loop and make the log enormous. Keys should be fixed words, like file names, never data. Put the data in the value.

---

## 24.5 One Flight Recorder

Time to keep Chapter 17's promise, and decide whether the Explorer needs two log files per run.

Section 24.2 found three things in the `FRC_` file that the `akit_` file does not have, or did not seem to have. Take them one at a time.

**Your log messages.** Section 24.3 showed that AdvantageKit already saves them: every line printed to the terminal lands in `RealOutputs` > `Console`, and `DataLogManager.log` prints every message as well as writing it. So the messages are already in the `akit_` file. What `DataLogManager.log` adds is a second copy, in a second file.

**Your dashboard values.** `Line State`, `Pose X (m)`, `Left Reflectance`, and the rest of `updateDashboard()` are only in the `FRC_` file. But look at where each one comes from. `Pose X (m)` is computed from the drivetrain's inputs. `Left Reflectance` is a sensor reading, which belongs in the log as an input, and will be one by Section 24.10. `Line State` is the follower's state, now recorded as `FollowLine/State`. A dashboard value is a **copy** of something the code already knows. Record the something, and the copy is not needed. (The values that travel the **other** way, from the dashboard into the robot, are inputs, and Chapter 23 already made them AdvantageKit's: the chooser and the Tuning tab are in `NetworkInputs`.)

**SysId.** This one is real. Your SysId routine from Chapter 16 writes its data with `drivetrain::logSysId`, into the `FRC_` file, and nowhere else. So SysId has to move. It turns out to be a small move, because everything SysId needs is already in the `akit_` file: the volts, distances, and speeds are the drivetrain's inputs. SysId only needs to know which **test** was running at each moment.

So the plan is: retire `DataLogManager`, move SysId, and keep one file per run. Here are the steps.

### Step 1: Stop starting `DataLogManager`

Open `Robot.java`. In the constructor, delete these lines:

```java
// The Chapter 10 flight recorder keeps running too. SysId (Chapter 16) reads its file.
DataLogManager.start();
DriverStation.startDataLog(DataLogManager.getLog());
```

AdvantageKit records the Driver Station and every joystick on its own (that is the `DriverStation` table in the log), so `startDataLog` has nothing left to do.

### Step 2: Print instead of `DataLogManager.log`

Here is a trap. `DataLogManager.log()` does not only write a message. If `DataLogManager` has not been started, `log()` **starts it**. Delete the two lines in Step 1, leave one `DataLogManager.log` anywhere in your code, and you still get an `FRC_` file on every run.

So every `DataLogManager.log(` in the project becomes `System.out.println(`. The messages still reach the terminal, and AdvantageKit still saves them in the log's `Console`. VS Code can change them all at once:

1. Choose **Edit** > **Replace in Files** (**Ctrl+Shift+H**).
2. In the search box, type `DataLogManager.log(`. In the box under it, type `System.out.println(`.
3. Look through the list of matches: `Robot.java`, `RobotContainer.java`, `FollowLine.java`, and your commands. Each match is a message, and nothing else.
4. Click **Replace All** (the button next to the replace box), and confirm.

Now every file that imported `DataLogManager` has an unused import, which VS Code marks with a faded color and a warning. Delete `import edu.wpi.first.wpilibj.DataLogManager;` from each, and `import edu.wpi.first.wpilibj.DriverStation;` from `Robot.java` if nothing else in it uses `DriverStation`. (Or right-click in each file and choose **Source Action...** > **Organize Imports**, which removes every unused import at once.)

Build. Search the project for `DataLogManager` (**Ctrl+Shift+F**): the only matches left should be in comments, if any.

### Step 3: SysId through AdvantageKit

Open `RobotContainer.java` and find where the constructor builds `sysIdRoutine`. Replace it with this:

```java
// SysId (Chapter 24): AdvantageKit records which test is running, and the drivetrain's
// inputs already hold the volts, distances, and speeds, so SysId needs no log of its own.
sysIdRoutine = new SysIdRoutine(
    new SysIdRoutine.Config(
        Volts.of(TestModeConstants.SYSID_RAMP_VOLTS_PER_SECOND).per(Second),
        Volts.of(TestModeConstants.SYSID_STEP_VOLTS),
        Seconds.of(TestModeConstants.SYSID_TIMEOUT_SECONDS),
        state -> Logger.recordOutput("Drivetrain/SysIdState", state.toString())),
    new SysIdRoutine.Mechanism(
        volts -> drivetrain.setVolts(volts.in(Volts), volts.in(Volts)),
        null,
        drivetrain,
        "drive"));
```

Two arguments changed.

- **`Config` takes a fourth argument**: a lambda that SysId calls every loop with the test's **state**, a `SysIdRoutineLog.State`, such as "quasistatic, forward." This lambda records it as an output.
- **`Mechanism`'s log consumer is now `null`.** That was `drivetrain::logSysId`, which wrote the motor data into the `FRC_` file. `null` tells SysId "do not log the motors; I have it covered." And because nothing in SysId touches `DataLogManager` any more, no `FRC_` file is started.

Then open `Drivetrain.java`, delete `logSysId()`, and delete the imports VS Code now marks as unused (`SysIdRoutineLog`, and probably `Meters`, `MetersPerSecond`, and `Volts`).

### `name()` or `toString()`?

Look at the lambda again: `state.toString()`. You just learned in Section 24.4 that `recordOutput` takes any enum, and `SysIdRoutineLog.State` is an enum. Why not pass `state` and be done?

Try it. Change the lambda to `state -> Logger.recordOutput("Drivetrain/SysIdState", state)`, run a SysId test, and look in the log. The value says `kQuasistaticForward`. Change it back to `state.toString()`, run again, and it says `quasistatic-forward`.

Every enum has two ways of turning itself into a string:

- **`name()`** is always the exact word in the code: `kQuasistaticForward`. Java writes this method for every enum, and nobody can change it. That makes it perfect for a log you want to search, and it is what `recordOutput` uses.
- **`toString()`** returns `name()` too, unless the enum **overrides** it, the same `@Override` you have been writing since Chapter 5. `SysIdRoutineLog.State` does override it, to return the words the SysId tool looks for in a log: `quasistatic-forward`, `dynamic-reverse`, and so on.

The SysId tool only understands the second form. Give it `kQuasistaticForward`, and it finds no tests at all. So here, `toString()` is not a style choice: it is the format another program expects. When a string leaves your code for someone else's program, check which form it wants.

### Running SysId from the AdvantageKit log

SysId (the tool) cannot read an `akit_` file directly, but AdvantageScope can write a copy it can read. AdvantageKit's documentation gives the recipe (link in the resources):

1. Run the four SysId tests in Test mode exactly as in Chapter 16 (Section 19.8): hold each D-pad direction until the robot stops at a fence. Stop the program.
2. Open the newest `akit_` log in AdvantageScope.
3. Choose **File** > **Export Data...**. Pick **WPILOG** as the format, and **AdvantageKit Cycles** for the timestamps. Save it somewhere you will find it, like your Desktop.
4. Open SysId (**WPILib: Start Tool** > **SysId**) and open the exported file, as in Section 16.7.
5. In SysId's data selector, choose `Drivetrain/SysIdState` (under `RealOutputs`) as the test state. For the left side, choose `LeftAppliedVolts` as the voltage, `LeftDistanceMeters` as the position, and `LeftSpeedMetersPerSecond` as the velocity, all under `Drivetrain`, with meters as the unit. Load it and analyze, exactly as before. Then do the same for the right side.

The export matters because of the timestamps. AdvantageKit records each loop's values with that loop's timestamp, and **AdvantageKit Cycles** writes them out lined up on those loops, so SysId can pair each voltage with the distance and speed from the same loop.

You do not need to rerun SysId now: your feedforward gains from Chapter 16 have not changed. But try steps 1 to 5 once, before you forget how, and check that the gains SysId gives you are close to the ones in your code. If your SysId version's data selector does not look like this, AdvantageKit's SysId page has the details for the current version.

> **Is the `FRC_` file gone for good?**
>
> On the Explorer, yes: build and run, and only `akit_` files appear in `logs`. Delete the old `FRC_` files, or keep a few as a souvenir. On a roboRIO, WPILib itself, and some vendor libraries, may still write logs of their own, and that is fine: Section 24.12 says where a roboRIO keeps its logs. The rule for **your** code is the important one: one recorder, one file per run, and every input and output in it.

Build, run, and drive for a moment. Check `logs`: one new file. Open it, and open the Console tab: every message is there.

---

## 24.6 How Replay Works

Now the big one. Chapter 17 promised that if every input is recorded, you can play a run back through your code and watch it make the same decisions. Here is exactly how that works, and what it needs from your code.

### A normal loop, and a replayed loop

In a normal run, every 20 ms, a loop goes like this (Section 18.5 and Chapter 17):

```
  NORMAL RUN
  hardware -> io.updateInputs(inputs) -> Logger.processInputs("Drivetrain", inputs) -> log (inputs)
                                                         |
                                                         v
                                             your code decides things
                                                         |
                                                         v
                                Logger.recordOutput(...) -> log (RealOutputs)
```

In a **replay**, there is no hardware, and the same loop runs like this:

```
  REPLAY
  (nothing) -> io.updateInputs(inputs) -> Logger.processInputs("Drivetrain", inputs) <- old log
                                                         |
                                                         v
                                             your code decides things
                                                         |
                                                         v
                              Logger.recordOutput(...) -> new log (ReplayOutputs)
```

Three things changed, and your code did not notice any of them:

1. **The IO layer does nothing.** There is no robot. `io.updateInputs(inputs)` leaves the inputs alone, and `io.setVolts()` drives nothing.
2. **`processInputs` reads instead of writes.** This is the line Chapter 17 told you about. In a normal run, it copies the inputs **into** the log. In a replay, it copies the next loop's inputs **out of** the old log, into your inputs object. By the time `Drivetrain` reads `inputs.leftDistanceMeters`, it holds exactly what the real encoder reported on that loop of the real run.
3. **Outputs are written as `ReplayOutputs`**, into a new log file. That new file also gets a copy of everything from the old one, `RealOutputs` included. So in one file, side by side, you have what the code decided on the floor, and what it decides now.

AdvantageKit replays the other built-in inputs the same way: the Driver Station table (enabled, mode, and every joystick), the dashboard's `NetworkInputs` (your auto chooser and tuned numbers), and the **clock**.

### The clock is an input too

That last one is surprising, and it matters. Your code reads the time constantly: `Timer` inside `withTimeout()`, the `Debouncer` on the line light, the PID controllers' loop period. In a normal run, time comes from the computer's clock. In a replay, the clock is replayed too: AdvantageKit records each loop's timestamp, and, during a replay, tells WPILib to use the logged timestamp instead of the real clock. So a `withTimeout(7.0)` in a replay ends on the same loop it ended on the floor, even if the replay finishes the whole run in one second.

It does finish fast. A replay does not wait 20 ms between loops, because nothing physical has to happen between them. A two-minute run replays in a second or two.

### Determinism: the one rule

All of this rests on one rule. Your code is **deterministic** if the same inputs always produce the same outputs: no hidden dice, no peeking at anything that was not recorded. If your code is deterministic, a replay makes exactly the same decisions as the real run, loop for loop. If it is not, the replay drifts off into its own story, and you cannot trust it.

AdvantageKit's documentation lists the usual ways code stops being deterministic (link in the resources):

- **Reading the real clock directly.** `Timer.getFPGATimestamp()` reads the computer's clock, not the logged one. Use `Timer.getTimestamp()`, which follows the logged clock in a replay. (`Timer` objects, timeouts, and debouncers already use the right one.)
- **Reading NetworkTables directly.** `SmartDashboard.getNumber(...)` reads whatever is on the server right now, and during a replay, nothing is. AdvantageKit's dashboard classes (`LoggedDashboardChooser`, `LoggedNetworkNumber`) record what they read, which is exactly why Chapter 23 used them.
- **Random numbers.** `Math.random()` gives a different answer every time.
- **Hardware read outside an IO layer.** If a sensor reading reaches your code without going through `processInputs`, it is not in the log, and a replay cannot know it.
- **Going through a `HashMap` in a loop.** A `HashMap` does not promise any order, so code that does something "for each entry" can do them in a different order next time. (The Explorer does not use one. If yours ever does, a `LinkedHashMap` keeps its entries in the order they were added.)

### Audit the Explorer

Before replaying anything, check your own code against that list. Here is the Explorer, part by part:

| Part | How it reaches the code | Replayable? |
|---|---|---|
| Encoders, gyro, motor volts | `DrivetrainIO`, through `processInputs("Drivetrain", ...)` | Yes |
| Controller buttons and sticks | The Driver Station, recorded by AdvantageKit | Yes |
| Enabled, disabled, which mode | The Driver Station | Yes |
| The clock (`Timer`, `withTimeout`, `debounce`) | AdvantageKit's logged timestamp | Yes |
| Auto chooser and Tuning tab | `LoggedDashboardChooser`, `LoggedNetworkNumber` (Chapter 23) | Yes |
| The order commands and subsystems run in | The scheduler: subsystems in the order they were created | Yes |
| Rangefinder, reflectance, accelerometer | `Sensors`, straight from the hardware objects (Chapter 9) | **No** |
| The LED | An output only: the code sets it, never reads it | Nothing to replay |

Search your project for `getFPGATimestamp` and `SmartDashboard.get`, to be sure (**Ctrl+Shift+F**). Unless you added one in an exercise, the only match is in a log message from Chapter 20's Practice, which only prints, and changes no decision.

That leaves one **No**, and it is a big one. `Sensors` reads the rangefinder and the reflectance sensors straight from their hardware objects. Nothing records them. In a replay, there is no XRP to read them from. So every decision that depends on seeing the line, or seeing a wall, is at risk: `DriveUntilLine`, the line light, the `either` before leg 3, `FollowLine`, and the wall stop in `DriveWithSticks`.

You could fix that right now. Instead, Section 24.9 replays a run **before** fixing it, so you can see what a replay that goes wrong looks like, and learn to spot it. Every team that uses replay meets this problem sooner or later: someone reads a sensor outside the IO layer, and replay quietly starts lying. Knowing what that looks like is worth one wrong replay.

But first, replay needs one piece of Java you have not seen.

---

## 24.7 New Java: Anonymous Classes

In a replay, `RobotContainer` must give `Drivetrain` an IO layer that does nothing at all: `updateInputs` leaves the inputs alone (the log fills them in), and `setVolts` drives nothing. You already wrote exactly that, without noticing. Look at `DrivetrainIO` (Section 17.7):

```java
public interface DrivetrainIO {
    @AutoLog
    public static class DrivetrainIOInputs { ... }

    default void updateInputs(DrivetrainIOInputs inputs) {}

    default void setVolts(double leftVolts, double rightVolts) {}
}
```

Every method has an empty **default**. Chapter 17's callout called that a trap: if you misspell a method in an IO class, the default runs, and nothing happens. For replay, "nothing happens" is exactly the behavior you want. All you need is an object that implements `DrivetrainIO` and uses every default.

### `new DrivetrainIO()` does not work

The obvious try is:

```java
DrivetrainIO replayIO = new DrivetrainIO();
```

Java refuses:

```
error: DrivetrainIO is abstract; cannot be instantiated
```

An interface is a promise, not a class (Section 17.4). You cannot make an object of a promise; you can only make an object of a class that keeps it. So you could write one:

```java
package frc.robot.subsystems;

/** The drivetrain's IO layer during a replay: no hardware, so nothing to do. */
public class DrivetrainIOReplay implements DrivetrainIO {}
```

and that works. It is a whole file for a class with nothing in it, used in exactly one place. Java has a shorter way.

### A class with no name

```java
DrivetrainIO replayIO = new DrivetrainIO() {};
```

Look at it closely. It is `new DrivetrainIO()`, the line that did not compile, followed by `{}`, a pair of braces. Those two characters change everything. They are a **class body**, the same braces that hold the inside of every class you have written. This one is empty.

So the line means: "Make a new class that implements `DrivetrainIO`, with this body. It does not need a name. Then make one object of it, right here." That is an **anonymous class**: a class with no name, written at the exact spot where its one object is created.

It is the same as writing `DrivetrainIOReplay` above, and then `new DrivetrainIOReplay()`, but without the file, and without the name. The object it makes is a real `DrivetrainIO`, and `Drivetrain`'s constructor accepts it like any other.

The braces do not have to be empty. Anything you could write in a class body, you can write in them. Here is an anonymous `DrivetrainIO` that prints every time it is asked to drive:

```java
DrivetrainIO noisyIO = new DrivetrainIO() {
    @Override
    public void setVolts(double leftVolts, double rightVolts) {
        System.out.println("Asked for " + leftVolts + " V and " + rightVolts + " V");
    }
};
```

Notice the semicolon after the closing brace. The whole thing, from `new` to `}`, is one expression that makes one object, and the line that assigns it ends with `;` like any other.

And `@Override` still guards you. Misspell the method as `setVolt` inside the braces, and Java says:

```
error: method does not override or implement a method from a supertype
```

which is Chapter 17's trap, caught by the compiler, the same as in a named class.

### Where does the class go?

Build your project after writing an anonymous class, and look in `build/classes/java/main/frc/robot`. Next to `RobotContainer.class`, you will find files like `RobotContainer$1.class` and `RobotContainer$2.class`. Those are your anonymous classes. Java still compiles each one into a real class. It just names them itself, after the class they are written in, with a number: `$1`, `$2`, in the order they appear. (You may see a few more numbered files than you wrote: the compiler makes small helper classes of its own, for example for a `switch` on an enum.)

You will see names like these in error messages too. If a stack trace (Chapter 10) ever says `at frc.robot.RobotContainer$1.setVolts`, it means "in the first anonymous class inside `RobotContainer`."

### You have been halfway here since Chapter 18

Here is a trigger condition, the way you wrote it in Chapter 18, and the way it would have to be written without lambdas:

```java
// With a lambda (Chapter 18)
BooleanSupplier lineSeen = () -> sensors.isLeftOnLine() || sensors.isRightOnLine();

// The same thing, with an anonymous class
BooleanSupplier lineSeen = new BooleanSupplier() {
    @Override
    public boolean getAsBoolean() {
        return sensors.isLeftOnLine() || sensors.isRightOnLine();
    }
};
```

They do the same job. `BooleanSupplier` is an interface with exactly one abstract method, `getAsBoolean()`, so an object that implements it needs only that one method filled in. Before Java 8 (2014), the anonymous class was the only way to write it, and robot code was full of them. A **lambda** is a short way of writing an anonymous class for an interface with exactly **one** method to fill in, which is called a **functional interface**. The arrow `->` replaces everything except the parameters and the body.

So why not a lambda for `DrivetrainIO`? Try:

```java
DrivetrainIO replayIO = () -> {};
```

and Java says:

```
error: incompatible types: DrivetrainIO is not a functional interface
    no abstract method found in interface DrivetrainIO
```

A lambda is the body of **the** one method that needs filling in. `DrivetrainIO` has two methods, and neither needs filling in, because both have defaults. A lambda would not know which method it was the body of. An anonymous class has no such problem: it is a whole class body, and it can fill in any number of methods, including none.

That gives you a simple rule for choosing:

| You need | Write |
|---|---|
| One method of a functional interface | A lambda: `() -> ...` |
| An object of an interface with defaults, or more than one method to fill in, used once | An anonymous class: `new SomeInterface() { ... }` |
| The same kind of object in more than one place, or one a test needs to reach inside | A named class, in its own file |

> **When to give it a name**
>
> Anonymous classes are handy, and easy to overuse. If the braces grow past a few lines, or you need the same class twice, or a test needs to set its fields (like `FakeDrivetrainIO` in Chapter 22, whose fields the tests change), give it a name and its own file. A class with a name can be found with **Ctrl+P**, documented, and tested. Use anonymous classes for small, obvious, one-place objects, like an IO layer that does nothing.

> **The same rule as lambdas**
>
> An anonymous class can use local variables from the method around it, but only if they are **effectively final**: assigned once and never changed. It is the same rule you met for lambdas in Section 18.6, for the same reason: the object might be used long after the method has returned, so it keeps a copy of the value, and a copy of a variable that keeps changing would be a lie.

---

## 24.8 Three Robots, One Switch

Since Chapter 17, the Explorer has known two robots: the real XRP and the simulated one, chosen by `USE_SIMULATED_ROBOT`. Replay is a third robot: one with no hardware at all, whose inputs come from a file. A `boolean` has two values, and now there are three choices. Chapter 21 taught you what to do when a `boolean` runs out of values: use an **enum**.

### Step 1: `RobotMode`

Open `Constants.java`. Replace `USE_SIMULATED_ROBOT` and its comment with this:

```java
/** The three robots this program can drive (Chapter 24). */
public enum RobotMode {
    REAL,     // the real XRP, over Wi-Fi
    SIM,      // the simulated XRP, on its pretend floor (Chapters 17 and 21)
    REPLAY    // no robot at all: every input comes from a log file
}

// Which robot to drive (Chapter 24). REAL for the XRP; set it back before you commit.
public static final RobotMode ROBOT_MODE = RobotMode.REAL;
```

`RobotMode` is written inside `Constants`, the same way `FollowLine.State` is written inside `FollowLine`, so its full name is `Constants.RobotMode`. `TUNING_MODE` stays right after it.

Build. It fails, in every place that used `USE_SIMULATED_ROBOT`. That is the compiler handing you a to-do list, which is exactly why you deleted the old constant instead of keeping both. Work through the list in the next three steps.

### Step 2: `RobotContainer` builds any of the three

Open `RobotContainer.java` and import the enum:

```java
import frc.robot.Constants.RobotMode;
```

Replace the `useSimulatedRobot` field and its comment with:

```java
// Which robot: real, simulated, or replayed (Chapter 24). A test can ask for any of them.
private final RobotMode mode;
```

Then replace the first lines of the constructors, down to and including `drivetrain = new Drivetrain(drivetrainIO);`:

```java
/** Build the robot that Constants.ROBOT_MODE asks for. Robot.java uses this one. */
public RobotContainer() {
    this(Constants.ROBOT_MODE);
}

/**
 * Build the real robot, the simulated one, or a robot for replaying a log.
 * Package-private, so tests in frc.robot can ask for any of them.
 *
 * @param mode which robot to build
 */
RobotContainer(RobotMode mode) {
    this.mode = mode;

    // Which hardware? Decide here, once. Nothing else needs to know (Chapter 24).
    DrivetrainIO drivetrainIO = switch (mode) {
        case REAL -> new DrivetrainIOXRP();
        case SIM -> new DrivetrainIOSim();
        case REPLAY -> new DrivetrainIO() {};   // no hardware: the log fills in the inputs
    };
    drivetrain = new Drivetrain(drivetrainIO);
    System.out.println("Robot mode: " + mode);
```

Finally, in `simulationPeriodic()`, change the first line:

```java
if (mode != RobotMode.SIM) {
    return;   // only the simulated robot has a pretend floor
}
```

There is your anonymous class, in the `REPLAY` case: an IO layer with every default, built in one line. And there is a **switch expression** from Section 21.4, choosing a value instead of running statements. It has a safety feature you will appreciate one day: a switch expression on an enum must cover **every** value. Add a fourth `RobotMode` someday (a second robot, perhaps), and this line stops compiling until you decide what that robot's drivetrain is. An `if`/`else` chain would have quietly fallen into its `else`.

The pretend floor needed a change too. Before, it ran on any robot that was not real. Now there are two of those, and only one has a pretend floor. In a replay, the floor must stay out of the way: the sensor readings, whatever they are, should come from the log. (They do not, yet. Hold that thought.)

### Step 3: The course test asks for `SIM`

Open `src/test/java/frc/robot/ObstacleCourseTest.java`. Import the enum:

```java
import frc.robot.Constants.RobotMode;
```

and change the line that builds the robot:

```java
RobotContainer robotContainer = new RobotContainer(RobotMode.SIM);
```

`new RobotContainer(true)` meant "the simulated robot," but you had to remember what `true` meant. `RobotMode.SIM` says it.

### Step 4: `Robot` sets up the recorder, or the player

The last error is in `Robot.java`, in the metadata line. This is where the real change happens, because the logger has to be set up differently for a replay. Add three imports:

```java
import frc.robot.Constants.RobotMode;
import org.littletonrobotics.junction.LogFileUtil;
import org.littletonrobotics.junction.wpilog.WPILOGReader;
```

and replace the top of the constructor, down to and including `Logger.start();`:

```java
public Robot() {
    // AdvantageKit first, before anything else is created (Section 17.6).
    Logger.recordMetadata("ProjectName", "XRP Explorer");
    Logger.recordMetadata("RobotMode", Constants.ROBOT_MODE.name());

    if (Constants.ROBOT_MODE == RobotMode.REPLAY) {
        // Replay (Chapter 24): take every input from a log, run as fast as the laptop
        // can, and write what the code decides into a new log next to the old one.
        setUseTiming(false);
        String logPath = LogFileUtil.findReplayLog();
        Logger.setReplaySource(new WPILOGReader(logPath));
        Logger.addDataReceiver(new WPILOGWriter(LogFileUtil.addPathSuffix(logPath, "_replay")));
    } else {
        Logger.addDataReceiver(new WPILOGWriter());   // write a log file into logs/
        Logger.addDataReceiver(new NT4Publisher());   // publish live, for AdvantageScope
    }
    Logger.start();
```

The `else` is Chapter 17's setup, unchanged. The replay half is four lines, and each one is one idea:

- **`setUseTiming(false)`** tells `LoggedRobot` not to wait 20 ms between loops. In a replay nothing physical has to happen between loops, so it runs them back to back, as fast as your laptop can.
- **`LogFileUtil.findReplayLog()`** finds the log to replay, and returns its path. It looks in order: first at an environment variable named `AKIT_LOG_PATH`, if you have set one; then at the log that is **open in AdvantageScope** right now; and if both of those come up empty, it asks you to type a path in the terminal. The second one is the one you will use: open a log in AdvantageScope, and replay picks it up.
- **`Logger.setReplaySource(new WPILOGReader(logPath))`** is the switch that turns `processInputs` around (Section 24.6): from now on, inputs come **out of** this file.
- **`new WPILOGWriter(LogFileUtil.addPathSuffix(logPath, "_replay"))`** writes the replay's log next to the original, with `_replay` added to the name. `akit_26-10-13_18-15-02.wpilog` replays into `akit_26-10-13_18-15-02_replay.wpilog`.

There is no `NT4Publisher` in a replay: nobody is watching live, because there is nothing live to watch.

The metadata line now records the mode by its `name()`: `REAL`, `SIM`, or `REPLAY`. Months from now, a log will tell you which robot made it.

### Step 5: Check that nothing changed

Build, and run the tests: twenty-seven, all green. `ObstacleCourseTest` runs the course on the `SIM` robot, exactly as before.

Then run the Explorer once with `ROBOT_MODE = RobotMode.SIM`, and once with `RobotMode.REAL` and the XRP switched on. The terminal says `Robot mode: SIM` or `Robot mode: REAL`, and both drive as before. Leave it on `REAL` (or on `SIM`, if you have no XRP with you today) for the next section.

> **Set it back before you commit**
>
> `ROBOT_MODE` is the one line in the project you will change most often, and the easiest to commit by mistake. The rule from Chapter 17 still holds, with one more value: commit it as `REAL`. A `SIM` commit makes your teammate's robot sit still while the field view drives. A `REPLAY` commit is worse: their robot does not start at all, because the program waits for a log. Before every commit, look at `git diff` (Chapter 11) for `ROBOT_MODE`.

---

## 24.9 Your First Replay, and a Replay That Lies

Time to replay a run. Follow along exactly, on the real XRP or the simulated one: both make logs that replay the same way.

### Step 1: Record a run

With `ROBOT_MODE` set to `REAL` (XRP on) or `SIM`, run the Explorer. Open Elastic and check that `Auto Routine` says **Obstacle Course**. Put the robot at the start (press Y), and run autonomous until the course is done, then disable. Stop the program.

The newest `akit_` file in `logs` is your run. Open it in AdvantageScope, look at the Line Graph from Section 24.4, and check that it really did the whole course: `Course/Step` goes all the way to `Done`, and `FollowLine/State` ends in `END_OF_LINE`.

**Leave the log open in AdvantageScope.** That is how replay will find it.

### Step 2: Run in replay

In `Constants.java`, set:

```java
public static final RobotMode ROBOT_MODE = RobotMode.REPLAY;
```

Run **WPILib: Simulate Robot Code**, as always. VS Code asks which simulation extensions to use, with two of them checked: **Sim GUI** and **XRP Client** (the XRP template in `build.gradle` checks both by default). **Uncheck both**, and click OK.

Replay must not connect to anything. The Sim GUI would let you change things (enable the robot, move a joystick) in the middle of a replay, and the XRP client would try to talk to a real robot. Either one would mean inputs that are not from the log. AdvantageKit checks, and if you forget to uncheck them, the program stops at once with a message that begins:

```
All HAL simulation extensions must be disabled when running AdvantageKit replay, including the simulation GUI and DriverStation connection.
```

and ends with `*** EXITING DUE TO INVALID SIMULATION CONFIGURATION, SEE ABOVE. ***`. If you see that, run it again, and uncheck both.

With both unchecked, watch the terminal. AdvantageKit says it is replaying the log from AdvantageScope, the program prints `Robot mode: REPLAY`, and then, a second or two later, the program **ends by itself**: the log ran out, so the run is over. No window opened, nothing drove, and your whole course just ran again.

Look at AdvantageScope. It has opened a new log on its own: the `_replay` file, written by the replay.

### Step 3: Compare

The replay log holds both runs: everything from the original, `RealOutputs` included, and the replay's decisions under **`ReplayOutputs`**, with the same names. So you can put them side by side.

On a Line Graph tab:

1. Drag `RealOutputs` > `Drivetrain` > `LeftRequestedVolts` and `ReplayOutputs` > `Drivetrain` > `LeftRequestedVolts` onto the left axis.
2. Drag `RealOutputs` > `Course` > `Step` and `ReplayOutputs` > `Course` > `Step` into the discrete area.
3. Press **Ctrl+\\**.

Start at the left. `Reset Pose`, `Leg 1`, and `Turn` are identical: the two step bars change on the same loops, and the two volts lines lie exactly on top of each other, so closely that you only see one. Your code, on your laptop, with no robot, made the same decision as the robot did, on every loop. That is replay working.

Then comes `Leg 2`, and the two runs come apart.

On the real run, `Leg 2` ends when `DriveUntilLine` sees the crossbar, and `Leg 3` starts. On the replay, `Leg 2` keeps going, and the replay's requested volts keep driving forward while the real ones drop to follow the line. Leg 2 only ends when it reaches its distance limit or its timeout. Then the replay's `Leg 3` starts, and ends in the same loop. Add a Console tab with `ReplayOutputs` > `Console`, and there it is:

```
No line here, so no leg 3
```

The replay decided that there was no line.

### Step 4: Find the first difference

When a replay disagrees with the real run, the first loop where they disagree is the most important moment in the log. Everything after it is a consequence. Everything before it is fine.

Here the first difference is plain: the loop where the real `Leg 2` ended. At that moment, the real `DriveUntilLine` saw black under a reflectance sensor, and the replayed one did not. Look in the log for what the reflectance sensors read at that moment, and you find... nothing. There is no `Sensors` table. Section 24.2 warned you: the reflectance sensors, the rangefinder, and the accelerometer have never been recorded.

So what did the replay's `Sensors` read? It made real XRP sensor objects, as always, and with no XRP connected, each one read zero. A reflectance of zero is a white floor. Every decision about the line went the "white" way: no crossbar, no line, no leg 3. If you drove toward a wall in teleop, the replay was even stranger: a rangefinder that reads zero says the wall is **touching** the robot, so the replayed wall stop refused to drive forward, while the real robot drove happily.

Now open a 2D Field tab and drag **both** poses onto it: `RealOutputs` > `Drivetrain` > `Pose` and `ReplayOutputs` > `Drivetrain` > `Pose`. They match perfectly, the whole way, leg 3 included, even though the replay "decided" to stop at the crossbar. How?

Because the replay's pose is worked out from the **logged** encoders, and the logged encoders say the robot followed the line. The replay can decide anything it likes, but it cannot move the robot. The robot already moved, on the day of the run, and the log says how. That is the most important limit of replay, and it has a name: the **replay bubble**. A replay can only show what your code **would have decided** on each loop, given what the robot really did. If the code decides something different, the replayed robot does not follow that decision, because its inputs still come from the original run.

> **The replay did not lie. The log was incomplete.**
>
> The replay told the exact truth about the inputs it was given. It was given a log with no sensor readings in it. That is the danger: replay never complains about a missing input. It just runs your code on whatever it has, and the result looks like a real answer. The only defense is the audit from Section 24.6, and the habit of checking that `RealOutputs` and `ReplayOutputs` match on a run where nothing went wrong. If they do not match, something is reaching your code without going through the log, and you have to find it before you can trust any replay.

Notice one thing that **did** replay correctly: the routine. No dashboard was connected during the replay, yet the replay ran the obstacle course, because the chooser's selection is in the log, as `NetworkInputs` > `SmartDashboard` > `Auto Routine`, and `LoggedDashboardChooser` read it from there. Pick **Leg 1 Only** before a run, and its replay runs **Leg 1 Only** too.

Set `ROBOT_MODE` back to `REAL` (or `SIM`).

---

## 24.10 `Sensors` Gets Its Seam

The fix is the one Chapter 17 used for the drivetrain: put an IO layer under `Sensors`, so every reading flows through `processInputs`. It is a smaller job this time, because you have done it once.

> **If you did Chapter 22's Practice 6**
>
> You already have most of this. Compare yours with the version here, and take three things from this one: the inputs are logged under the name `Sensors`, `Sensors` becomes a subsystem so the scheduler reads it every loop, and the pretend floor moves into a `SensorsIOSim`. Keep your own tests; Step 6 has two you may already have.

### Step 1: `SensorsIO`

Create `SensorsIO.java` in the `subsystems` folder:

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * Everything the Explorer's world-facing sensors report. The real XRP, the simulated
 * one, and a replayed log each fill in the same inputs (Chapter 24).
 */
public interface SensorsIO {

    /** What the sensors report, read once per loop. AdvantageKit logs every field. */
    @AutoLog
    public static class SensorsIOInputs {
        public double distanceAheadMeters = 0.0;   // rangefinder: 0 to 4 meters
        public double leftReflectance = 0.0;       // 0.0 is white, 1.0 is black
        public double rightReflectance = 0.0;
        public double accelXGs = 0.0;              // accelerometer, in g
        public double accelYGs = 0.0;
        public double accelZGs = 0.0;
    }

    /**
     * Read every sensor and copy the readings into {@code inputs}.
     *
     * @param inputs the object to fill in; Sensors reads only from this
     */
    default void updateInputs(SensorsIOInputs inputs) {}
}
```

The same shape as `DrivetrainIO`: an `@AutoLog` inputs class, with a field for every reading and its unit in the name, and a default method that does nothing. Sensors only report; nothing is ever sent **to** them, so there is no `setVolts()` partner this time.

### Step 2: `SensorsIOXRP`

The real hardware moves out of `Sensors` and into its own IO class. Create `SensorsIOXRP.java` in `subsystems`:

```java
package frc.robot.subsystems;

import edu.wpi.first.wpilibj.BuiltInAccelerometer;
import edu.wpi.first.wpilibj.xrp.XRPRangefinder;
import edu.wpi.first.wpilibj.xrp.XRPReflectanceSensor;

/** The real XRP's rangefinder, reflectance sensors, and accelerometer (Chapter 9). */
public class SensorsIOXRP implements SensorsIO {

    private final XRPRangefinder rangefinder = new XRPRangefinder();
    private final XRPReflectanceSensor reflectance = new XRPReflectanceSensor();
    private final BuiltInAccelerometer accelerometer = new BuiltInAccelerometer();

    @Override
    public void updateInputs(SensorsIOInputs inputs) {
        inputs.distanceAheadMeters = rangefinder.getDistanceMeters();
        inputs.leftReflectance = reflectance.getLeftReflectanceValue();
        inputs.rightReflectance = reflectance.getRightReflectanceValue();
        inputs.accelXGs = accelerometer.getX();
        inputs.accelYGs = accelerometer.getY();
        inputs.accelZGs = accelerometer.getZ();
    }
}
```

These are the same three hardware objects and the same method calls as Chapter 9's `Sensors`. If your `Sensors` reads them a little differently (for example, if you flipped an accelerometer axis in Chapter 9's lab), copy **your** version of each line here.

### Step 3: `SensorsIOSim`, the pretend floor's new home

The pretend floor in `RobotContainer.simulationPeriodic()` worked by setting the **voltages** of pretend analog inputs, so that the real `XRPReflectanceSensor` objects would read black or white. With an IO layer, the simulated robot does not need the hardware objects at all: it can fill in the inputs directly. Create `SensorsIOSim.java` in `subsystems`:

```java
package frc.robot.subsystems;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Transform2d;
import edu.wpi.first.math.geometry.Translation2d;
import frc.robot.Constants.CourseConstants;
import java.util.function.Supplier;

/**
 * The simulated Explorer's sensors, on a pretend floor (Chapters 17 and 21): the way
 * ahead is always clear, the robot sits flat, and the course's T of tape is where
 * CourseConstants says it is.
 */
public class SensorsIOSim implements SensorsIO {

    // Where the reflectance sensors sit, and how big the tape is (Section 21.8).
    private static final double SENSOR_AHEAD_METERS = 0.05;          // ahead of the robot's center
    private static final double SENSOR_SIDE_METERS = 0.01;           // each side of the center line
    private static final double TAPE_HALF_WIDTH_METERS = 0.02;       // 4 cm: wider than real tape
    private static final double CROSSBAR_HALF_LENGTH_METERS = 0.10;  // a 20 cm crossbar
    private static final double CLEAR_AHEAD_METERS = 4.0;            // the farthest the rangefinder reads

    // Where the simulated robot is, asked fresh every loop.
    private final Supplier<Pose2d> robotPose;

    /**
     * Create the pretend sensors.
     *
     * @param robotPose where the robot is on the field, for example {@code drivetrain::getPose}
     */
    public SensorsIOSim(Supplier<Pose2d> robotPose) {
        this.robotPose = robotPose;
    }

    @Override
    public void updateInputs(SensorsIOInputs inputs) {
        Pose2d pose = robotPose.get();
        inputs.distanceAheadMeters = CLEAR_AHEAD_METERS;
        inputs.leftReflectance = isOnPretendTape(pose, SENSOR_SIDE_METERS) ? 1.0 : 0.0;
        inputs.rightReflectance = isOnPretendTape(pose, -SENSOR_SIDE_METERS) ? 1.0 : 0.0;
        inputs.accelXGs = 0.0;
        inputs.accelYGs = 0.0;
        inputs.accelZGs = 1.0;   // sitting flat: one g, straight down
    }

    /**
     * Is one reflectance sensor over the pretend tape? The tape is a T: the crossbar
     * across leg 2, and the line to follow running on from its middle.
     *
     * @param robotPose where the robot is on the field
     * @param sideMeters where the sensor is, left (positive) or right of the robot's center
     * @return true if that sensor is over black tape
     */
    private static boolean isOnPretendTape(Pose2d robotPose, double sideMeters) {
        // Robot frame to field frame: where on the floor is this sensor?
        Translation2d sensor = robotPose.transformBy(
            new Transform2d(SENSOR_AHEAD_METERS, sideMeters, new Rotation2d())).getTranslation();

        double acrossLine = Math.abs(sensor.getX() - CourseConstants.LEG_1_DISTANCE_METERS);
        double alongLeg2 = sensor.getY() - CourseConstants.LINE_DISTANCE_METERS;

        boolean onCrossbar = Math.abs(alongLeg2) <= TAPE_HALF_WIDTH_METERS
            && acrossLine <= CROSSBAR_HALF_LENGTH_METERS;
        boolean onFollowLine = acrossLine <= TAPE_HALF_WIDTH_METERS
            && alongLeg2 >= 0.0
            && alongLeg2 <= CourseConstants.FOLLOW_LINE_LENGTH_METERS;
        return onCrossbar || onFollowLine;
    }
}
```

Most of it is Chapter 21's code, moved: the four `SIM_` constants lose their `SIM_` (the class name already says "sim"), and `isOnPretendTape()` is the same method, now `static` because it only uses its parameters and constants. Three things are new:

- **`Supplier<Pose2d> robotPose`** (Section 18.6): the pretend sensors need to know where the robot is, every loop. Rather than handing them the whole `Drivetrain`, `RobotContainer` will hand them one method, `drivetrain::getPose`. The sensors can ask where the robot is, and nothing else. It is the same trick as the trigger conditions you have been passing around since Chapter 18.
- **Black is `1.0`, white is `0.0`**, the values the real reflectance sensors report, instead of 5 and 0 volts.
- **The accelerometer reads one g down**, as if the robot sat flat on the floor. The old pretend floor never set it, so the simulated accelerometer read zero, which is what a falling robot would read.

### Step 4: `Sensors` becomes a subsystem

Delete `src/main/java/frc/robot/Sensors.java` (right-click > **Delete**), and create a new `Sensors.java` in the **`subsystems`** folder:

```java
package frc.robot.subsystems;

import edu.wpi.first.wpilibj2.command.SubsystemBase;
import org.littletonrobotics.junction.Logger;

/**
 * The Explorer's world-facing sensors: the rangefinder, the two reflectance sensors,
 * and the accelerometer. A subsystem, so the scheduler reads it once every loop, but no
 * command ever requires it: reading a sensor never gets in anyone's way (Chapter 24).
 */
public class Sensors extends SubsystemBase {

    // Measured on our floor and black tape (Section 9.7). Re-measure on new surfaces!
    // Package-private, so SensorsTest can build its readings from it.
    static final double LINE_THRESHOLD = 0.45;

    // The hardware, real or simulated, or nothing at all in a replay.
    private final SensorsIO io;
    private final SensorsIOInputsAutoLogged inputs = new SensorsIOInputsAutoLogged();

    /**
     * Create the sensors on top of some hardware.
     *
     * @param io a {@code SensorsIOXRP}, a {@code SensorsIOSim}, or an empty one for replay
     */
    public Sensors(SensorsIO io) {
        this.io = io;
        readInputs();   // so every getter has a real reading from the very start
    }

    /** Read the sensors and log what they said. The scheduler calls this every loop. */
    @Override
    public void periodic() {
        readInputs();
    }

    /** Copy the hardware's readings into inputs, and hand them to AdvantageKit. */
    private void readInputs() {
        io.updateInputs(inputs);
        Logger.processInputs("Sensors", inputs);
    }

    // Rangefinder

    /**
     * How far away the nearest thing straight ahead is.
     *
     * @return the distance in meters, 0 to 4
     */
    public double getDistanceAheadMeters() {
        return inputs.distanceAheadMeters;
    }

    /**
     * Is something closer than a given distance?
     *
     * @param meters the distance to check
     * @return true if the nearest thing ahead is closer than {@code meters}
     */
    public boolean isObstacleWithin(double meters) {
        return getDistanceAheadMeters() < meters;
    }

    // Reflectance (0.0 = white, 1.0 = black)

    public double getLeftReflectance() {
        return inputs.leftReflectance;
    }

    public double getRightReflectance() {
        return inputs.rightReflectance;
    }

    public boolean isLeftOnLine() {
        return getLeftReflectance() > LINE_THRESHOLD;
    }

    public boolean isRightOnLine() {
        return getRightReflectance() > LINE_THRESHOLD;
    }

    // Accelerometer (in g; Z is about 1.0 when sitting flat)

    public double getAccelX() {
        return inputs.accelXGs;
    }

    public double getAccelY() {
        return inputs.accelYGs;
    }

    public double getAccelZ() {
        return inputs.accelZGs;
    }
}
```

Use your own `LINE_THRESHOLD` from Chapter 9 if you measured a different one, and keep any getter your `Sensors` had that this one does not. Every public method keeps its name, its parameters, and its meaning, so no command that reads `Sensors` has to change how it reads them. Only where the numbers come from has changed: every getter now reads `inputs`, never the hardware, exactly like `Drivetrain`'s getters since Chapter 17.

### Wait: `Sensors` is a subsystem now?

In Section 19.1 you decided that `Sensors` is **not** a subsystem, because a subsystem is something a command needs to control, and nobody fights over a rangefinder. That was right, and it is still true: no command will ever require `Sensors`. Not one `addRequirements` changes.

But a subsystem does two jobs, and Chapter 19 only needed the first. Its first job is to be **required**, so that two commands cannot both drive it. Its second is to have its `periodic()` called by the scheduler, **once every loop, before any command runs** (Section 19.3). `Sensors` now has a job that must happen every loop, before anyone reads it: `readInputs()`. That is exactly the second job. A subsystem that nobody requires is allowed, and it is the simplest way to get there. AdvantageKit's own example projects do the same with their vision code, which also only reads.

You could leave `Sensors` a plain class, and call a method on it from `Robot.robotPeriodic()` before the scheduler runs. That would work too. But then `Sensors` would be the one part of the robot that is read in a different place from all the others, and someone would one day move the call, or forget it. As a subsystem, it is read the same way as the drivetrain, by the same scheduler, in a fixed order.

That order matters. The scheduler calls each subsystem's `periodic()` in the order the subsystems were **created**. `RobotContainer` creates the drivetrain first, then the sensors. So every loop, the drivetrain reads its encoders and updates its pose, and then the sensors are read, and on the simulated robot, the pretend floor already knows this loop's pose. Then the commands run, with fresh readings from both.

And because it is a subsystem, it lives in the `subsystems` package now, next to `Drivetrain`. Section 19.2's rule was that the package says what a class is.

### Step 5: Wire it up

Every file that said `import frc.robot.Sensors;` now needs `import frc.robot.subsystems.Sensors;`: `DriveUntilLine`, `DriveWithSticks`, `FollowLine`, and any command of your own that reads the sensors (Chapter 20's `BackAwayFromWall`, if you wrote it). The build lists every one. Fix each import; nothing else in those files changes.

Then open `RobotContainer.java`, and make five changes.

**1.** Add the imports:

```java
import frc.robot.subsystems.Sensors;
import frc.robot.subsystems.SensorsIO;
import frc.robot.subsystems.SensorsIOSim;
import frc.robot.subsystems.SensorsIOXRP;
```

**2.** The `sensors` field loses its `= new Sensors()`, because the constructor will choose its IO:

```java
private final Sensors sensors;
```

**3.** In the constructor, right after `drivetrain = new Drivetrain(drivetrainIO);`, choose the sensors the same way as the drivetrain:

```java
SensorsIO sensorsIO = switch (mode) {
    case REAL -> new SensorsIOXRP();
    case SIM -> new SensorsIOSim(drivetrain::getPose);
    case REPLAY -> new SensorsIO() {};   // no hardware: the log fills in the inputs
};
sensors = new Sensors(sensorsIO);
```

A second anonymous class, for the same reason as the first.

**4.** Delete the pretend floor from `RobotContainer`: the three `AnalogInputSim` fields, the four `SIM_` constants, `simulationPeriodic()`, `isOnPretendTape()`, and the `mode` field, which nothing reads any more, along with the `this.mode = mode;` line that set it. (The constructor's `mode` **parameter** stays: both `switch`es use it.) Then delete the imports VS Code marks as unused (`AnalogInputSim`, and probably `Rotation2d`, `Transform2d`, and `Translation2d`).

**5.** Open `Robot.java` and delete `simulationPeriodic()`, which called the method you just deleted.

And one change in the tests. Open `ObstacleCourseTest.java` and delete the line in the loop that calls `robotContainer.simulationPeriodic();`. The pretend floor is now part of the simulated robot itself, read by the scheduler like the real sensors, so the test's loop is now exactly `Robot`'s loop: run the scheduler, step the clock.

Build. Fix anything the compiler lists.

### Step 6: Two tests for `Sensors`

`Sensors` can now be built on pretend readings, so it can finally be tested. In `src/test/java/frc/robot/subsystems`, create `FakeSensorsIO.java`, the sensor twin of Chapter 22's `FakeDrivetrainIO`:

```java
package frc.robot.subsystems;

/** Pretend sensors for tests: a test sets these fields, and the next read reports them. */
class FakeSensorsIO implements SensorsIO {

    double distanceAheadMeters = 4.0;   // nothing ahead
    double leftReflectance = 0.0;       // white floor
    double rightReflectance = 0.0;

    @Override
    public void updateInputs(SensorsIOInputs inputs) {
        inputs.distanceAheadMeters = distanceAheadMeters;
        inputs.leftReflectance = leftReflectance;
        inputs.rightReflectance = rightReflectance;
        inputs.accelZGs = 1.0;
    }
}
```

A **named** class, not an anonymous one: the tests need to reach in and set its fields, and a class with no name has no type to reach in through (Section 24.7's rule). Then create `SensorsTest.java` next to it:

```java
package frc.robot.subsystems;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tests for Sensors, on pretend readings. No XRP, and no analog inputs. */
class SensorsTest {

    private FakeSensorsIO io;
    private Sensors sensors;

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);
        io = new FakeSensorsIO();
        sensors = new Sensors(io);
    }

    @AfterEach
    void tearDown() {
        CommandScheduler.getInstance().unregisterAllSubsystems();
    }

    @Test
    void theLineThresholdSplitsBlackFromWhite() {
        io.leftReflectance = Sensors.LINE_THRESHOLD + 0.01;
        io.rightReflectance = Sensors.LINE_THRESHOLD - 0.01;
        sensors.periodic();   // what the scheduler does every loop

        assertTrue(sensors.isLeftOnLine());
        assertFalse(sensors.isRightOnLine());
    }

    @Test
    void anObstacleMustBeCloserThanTheDistanceAsked() {
        io.distanceAheadMeters = 0.20;
        sensors.periodic();

        assertTrue(sensors.isObstacleWithin(0.21));
        assertFalse(sensors.isObstacleWithin(0.20));   // exactly that far is not closer
    }
}
```

Two small things are new compared with Chapter 22's `DrivetrainTest`. `Sensors` is a subsystem now, and every subsystem registers itself with the scheduler when it is created, so the test starts the HAL first (`HAL.initialize`, as in Section 22.6) and unregisters it afterward, so each test starts clean. And each test calls `sensors.periodic()` itself, to stand in for the scheduler: change the fake's readings, then "run a loop," then ask.

Run the tests: **29 tests**, all green. `ObstacleCourseTest` passing is the important one: the simulated course still runs to the end of the line, on the new pretend floor.

> **One robot per test run, still**
>
> Chapter 22 said an IO layer for `Sensors` would let more than one test build the whole robot. It removes half of the problem. On the simulated robot, `Sensors` no longer creates any hardware, so the analog inputs are never claimed. But `RobotContainer` still creates `XRPOnBoardIO`, for the LED, and that claims two digital channels, which can only be claimed once per program. So the rule stands: one test builds the whole robot. Chapter 22's Practice 6 asked "What else in it still creates hardware?" This is the answer.

### Step 7: Record a new run, and replay it

Now the proof. Set `ROBOT_MODE` back to `REAL` (or `SIM`), run the Explorer, and run the course in autonomous, exactly as in Section 24.9. Stop, and open the new log in AdvantageScope. There is a new table at the top level: **`Sensors`**, with all six readings, every loop. On a real XRP, graph `LeftReflectance` and `RightReflectance` during `Leg 2` and `Leg 3`: you can see the crossbar as a spike in both, and then the follower's steering as the two lines take turns.

Set `ROBOT_MODE` to `REPLAY`, run with both extensions unchecked, and compare again, exactly as in Step 3 of Section 24.9. This time, every bar and every line matches, from `Reset Pose` to `Done`, `FollowLine/State` included. The replayed `DriveUntilLine` sees the crossbar on the same loop the real one did, because it reads the same reflectance the real one did, out of the log.

To check every value at once, add a **Statistics** tab. Drag `RealOutputs` > `Drivetrain` > `LeftRequestedVolts` in as the reference, and `ReplayOutputs` > `Drivetrain` > `LeftRequestedVolts` as the field to compare against it, and choose to show the **absolute error** between them. A perfect replay shows an error of zero, for the whole run. (Exercise 4 has you try it on a few more outputs.)

One thing does not work, and it is worth knowing. Try replaying the **old** log from Section 24.9, made before this section. It still goes wrong in the same place: that run never recorded its sensors, and no code change can add them now. A replay can only be as good as its log. Logs made from today on replay properly.

Set `ROBOT_MODE` back to `REAL`, and commit.

---

## 24.11 Debugging With Replay

Back to the story from Section 24.1: a follower that stops at a corner, once, and never again while you watch. With a complete log and replay, you can now take that run apart after it happened. This section walks through it, start to finish.

You need a strip of tape with a right-angle corner, like the one you used for Section 21.9's checks, and the real XRP. (The simulated floor has no corner. This chapter's Collab lab gives simulator-only readers a bug of their own to find.)

### Step 1: Catch a failure in a log

Run the Explorer on the real XRP, open Elastic, and follow the corner a few times in teleop with the left bumper. If your follower never fails, good: your tuning from Chapter 23 works. Give it a reason to fail. On the **Tuning** tab, set **FollowLine/Side Error** to `0.9`, and follow the corner again. This time the follower reaches the corner and stops, and the terminal says `FollowLine: FOLLOWING -> END_OF_LINE`.

You just planted the bug, and you did it from the dashboard, not the code. Keep that in mind. Stop the program.

### Step 2: Read what the log can tell you

Open the newest log in AdvantageScope, and on a Line Graph tab put:

- `Sensors` > `LeftReflectance` and `RightReflectance` on the left axis,
- `RealOutputs` > `FollowLine` > `State` in the discrete area.

Find the moment `State` turns to `END_OF_LINE` (click on the bar, then use the Table tab to step loop by loop if you need to). Just before it, you can watch the corner arrive: the line moves under the left sensor, so `LeftReflectance` stays high while `RightReflectance` falls; then, as the robot runs past the corner, both fall to white. The line was lost, and it was last seen on the **left**. By Section 21.5's rules, that should be `SEARCHING_LEFT`. So why `END_OF_LINE`?

The rule says: when the line disappears, compare `lastSteeringError` with the side error. Bigger than the side error means "off to the left"; smaller means "it was right under us." So you need two numbers at that loop: `lastSteeringError`, and the side error the follower was using.

The second is in the log, because it is an input: `NetworkInputs` > `Tuning` > `FollowLine` > `Side Error`. It says `0.9`.

The first is not anywhere. `lastSteeringError` is not an input (it comes from inputs, but the follower works it out and remembers it) and nobody recorded it as an output. It is the follower's private memory. On any other day, this is where the investigation would end: "add a print, and try to make it happen again."

### Step 3: Add the log line after the run

Open `FollowLine.java`, and in `execute()`, under the state line you added in Section 24.4, record the follower's memory too:

```java
drivetrain.drive(speeds);
Logger.recordOutput("FollowLine/State", state);   // the state timeline (Chapter 24)
Logger.recordOutput("FollowLine/LastSteeringError", lastSteeringError);
```

Now replay the run that already happened. Leave the corner log open in AdvantageScope, set `ROBOT_MODE` to `REPLAY`, and run with both extensions unchecked. When the `_replay` log opens, look under `ReplayOutputs` > `FollowLine`: there is `LastSteeringError`, for every loop of a run that happened **before you wrote the line that records it**. That is the thing only replay can do.

Put it on the graph's left axis, next to the reflectances. At the last loop before `END_OF_LINE`, read its value. On our corner, it was about `0.6`; yours will differ. Whatever it is, it is smaller than `0.9`, so the rule said "it was right under us," and the follower stopped.

Two things make this worth slowing down for.

First, look at your code: `SIDE_ERROR` is still `0.2`. If you had only read the code, the follower could not possibly have stopped: `0.6` is far bigger than `0.2`. The replay used `0.9`, because the replay used the **inputs from the run**, and the side error that day came from the dashboard. Tuned values are inputs, and they replay. A bug that lives in a dashboard setting is invisible in the code, and plain in the log.

Second, check `ReplayOutputs` > `FollowLine` > `State` against `RealOutputs`: they match, loop for loop. Adding a log line changed no decision, which is exactly what a log line should do.

### Step 4: Try a fix, and meet the bubble

You know the cause. Can replay tell you whether a fix works? Partly, and the "partly" is important.

Try it. In `execute()`, **temporarily** replace `sideError.get()` in the decide step with `0.2`:

```java
State next = decideNextState(
    state, isLineSeen(), lastSteeringError, getSearchedDegrees(), 0.2);   // TEMPORARY what-if
```

Replay again. At the corner, `ReplayOutputs` > `FollowLine` > `State` now says `SEARCHING_LEFT` where the real run said `END_OF_LINE`. On that loop, the fix is right: it makes the decision you wanted.

Now look **after** that loop. The replayed follower is searching, and asking the motors to spin left: its requested volts say so. But the replayed `Drivetrain` > `HeadingDegrees` never changes, the line never comes back, and the follower searches on until the log says you let go of the bumper. On the floor, the real robot stopped. Its gyro, logged, says it never turned, and the replay has no way to turn it. That is the **replay bubble** from Section 24.9: every loop after the first changed decision is fiction. Replay can show you that a change fixes the decision on the loop that went wrong. It cannot show you what the robot would have done next, because the robot did something else, and the log is a record of what it did.

So the rest of the proof comes from the tools built for it: tests, the simulator, and the robot. Put the `sideError.get()` back in `execute()`, and replay once more, to check that the replay matches the real run again.

### Step 5: Turn the log's number into a test

The log gave you a real number from a real corner, and Chapter 22 taught you what to do with a real number that matters: write a test that remembers it. In `FollowLineTest.java`, add:

```java
@Test
void aRealCornerStartsASearch() {
    // Measured at a right-angle corner on our tape (Chapter 24 replay): the steering
    // error on the last loop before the line was lost. Use your own log's number.
    double errorAtTheCorner = 0.6;

    assertEquals(State.SEARCHING_LEFT,
        FollowLine.decideNextState(State.FOLLOWING, false, errorAtTheCorner, 0.0));
}
```

Put **your** number in, from your replay. This test uses the four-argument `decideNextState()`, so it checks `SIDE_ERROR`, the value in your code. One day, someone will tune `Side Error` up to `0.7` on a smooth bend, copy it into `SIDE_ERROR` (Chapter 23's last step), and this test will fail, saying, in effect, "that number stops the robot at a real corner, and here is the measurement that proves it." A number from a log has become a guard.

If your number is **smaller** than your `SIDE_ERROR`, the test fails right away, and that is a real finding, not a planted one: your follower would stop at that corner with the gains in your code. Tune the side error down until the test passes, and check the corner again on the floor.

Run the tests: **30 tests**. Restart the Explorer (which puts the Tuning tab back to the values in your code), and follow the corner: it searches, finds the line, and carries on.

Keep the `LastSteeringError` line. It costs almost nothing, and the next time the follower surprises you, it will already be in the log.

> **The replay workflow, in one list**
>
> 1. **Catch it in a log.** Every run is logged, so you already have.
> 2. **Read the log.** Find the first loop where something went wrong, and look at every input around it.
> 3. **If the log is missing a number, add an output and replay.** Now the old run has it.
> 4. **Check the replay matches the real run** wherever your code has not changed.
> 5. **Try a fix in replay**, and trust it only up to the first loop it changes.
> 6. **Prove the fix** with a test, the simulator, and the robot.

---

## 24.12 Logs at Competition

Everything in this chapter works the same way on a full-size FRC robot, with three differences worth knowing now. Chapter 37 covers them in detail.

**Where the logs are.** A roboRIO runs your code on the robot, so its logs are written on the robot too. AdvantageKit's default `WPILOGWriter`, on a roboRIO, writes to a USB stick plugged into the roboRIO, in a folder named `logs` (`/U/logs`, in the roboRIO's own file names). The stick should be formatted **FAT32**. No stick, no logs: the most common way to lose a match's log is to forget the stick.

**Getting them off.** In AdvantageScope, **File** > **Download Logs...** connects to the robot and copies its logs to your laptop. At a competition, that happens between matches, with a laptop on the robot's network. Chapter 39's competition checklist makes it a routine: after every match, download the log, and look at it before the next one.

**Replay as a habit, not a rescue.** The worst time to find out that replay does not work is after a match you need to understand. Replay breaks quietly, as you saw in Section 24.9: someone adds a sensor, reads it outside an IO layer, and nothing complains. Teams that rely on replay check it regularly: after any change that adds a sensor, a dashboard value, or a new kind of input, record a run on the simulator, replay it, and check in the Statistics tab that the outputs match. Two minutes, and you know your logs are still complete.

> **Replay and tuning, later**
>
> Replay has one more use you will meet on the Mini Swerve. In Chapter 30, the robot works out where it is from its wheels, its gyro, and later a camera (Chapter 33), and the code that blends them has numbers that need tuning: how much to trust each one. Those numbers only change **outputs**, never what the robot did. That makes them perfect for replay: record one good run, then replay it again and again with different numbers, and watch the replayed pose on the 2D Field against the real one. The bubble does not matter, because the pose estimate does not steer the robot during the test. Many top teams tune their pose estimation this way, entirely from a log.

### What you built

- **One flight recorder.** Every run writes one `akit_` log with every input and every output, and the terminal's messages in its Console. SysId reads it through an AdvantageScope export.
- **A timeline of decisions.** Requested volts, `FollowLine/State`, `FollowLine/LastSteeringError`, `Course/Step` for each step inside the course, and `Commands/` for everything the scheduler runs, all saved in an AdvantageScope layout in your project.
- **Three robots, one switch.** `RobotMode.REAL`, `SIM`, and `REPLAY`, chosen in one place, with an anonymous class as the replay robot's IO layer.
- **A complete log.** `Sensors` is a subsystem with an IO layer (`SensorsIOXRP`, `SensorsIOSim`, and an empty one for replay), so every input the Explorer has is recorded, and a replay matches the real run loop for loop.
- **A replay workflow**, and 30 tests, one of them a number measured at a real corner.

---

## Chapter Summary

> **What you learned in Chapter 24**
>
> * A WPILOG log holds every value with a name, a type, and a timestamp. AdvantageKit records **inputs** at the top level (`Drivetrain`, `Sensors`, `DriverStation`, `NetworkInputs`) and **outputs** under `RealOutputs`. Inputs are what the code receives; outputs are what it decides.
> * **AdvantageScope** shows one log in many synced tabs: the **timeline** (green auto, blue teleop, **Ctrl+\\** to zoom to enabled), **Line Graph** (left, right, and discrete), **2D Field**, **Table**, **Console**, and **Statistics**. A layout can be exported and committed.
> * `Logger.recordOutput` records a decision. Requested volts, `FollowLine/State`, `Course/Step` (a named step inside a group, which the scheduler never sees), and `Commands/` from the scheduler's `onCommandInitialize`, `onCommandFinish`, and `onCommandInterrupt` make a run readable. Keys are fixed words; data goes in the value.
> * The Explorer keeps **one log file**: `DataLogManager` is retired (its `log()` would start it again, so messages are printed instead, and AdvantageKit saves them), and SysId records its test state with `toString()` and is analyzed from an AdvantageScope export.
> * New Java: a generic **method** with a **bound**, `<E extends Enum<E>>`, and an enum's **`name()`** (always the code's word) versus **`toString()`** (which an enum can override, as SysId's does).
> * **Replay** runs your code on a log's inputs: the IO layer does nothing, `processInputs` reads from the log, the clock and Driver Station and dashboard inputs are replayed, and outputs go to `ReplayOutputs` in a `_replay` log. It needs **deterministic** code: no real clock, no direct NetworkTables reads, no randomness, no hardware outside an IO layer, no unordered maps. All simulation extensions must be off.
> * New Java: **anonymous classes**, `new DrivetrainIO() {}`, a class with no name and one object, compiled as `RobotContainer$1`. A lambda is the short form for a **functional interface** (one abstract method), so an interface with only defaults needs an anonymous class.
> * A replay that disagrees with the real run means an input is missing from the log; the **first difference** points at it. The **replay bubble**: a replay can change decisions, never what the robot did, so everything after the first changed decision is fiction. Prove fixes with tests and the robot.

---

## Exercises

### Practice

**1. Input or output?** Without opening any code, sort each of these into **input**, **output**, or **neither**, and write one sentence each in `reflections.md`: the left encoder's distance; the pose; the Auto Routine chooser's selection; `FollowLine/State`; `Steer kP` on the Tuning tab; the LED; the timestamp of each loop; `LastSteeringError`; `ProjectName`. Then check your answers in a log. Which one surprised you, and why does it matter for replay?

**2. How long is a loop?** Open any log and find `RealOutputs` > `LoggedRobot` > `FullCycleMS`: how long each loop really took, in milliseconds. Graph it for a whole run. Is it always under 20? Find the longest loop, click it, and look at the Console and the command timeline at that moment: what was the robot doing? Now open a `_replay` log and graph the same field under `ReplayOutputs`. Why are those numbers so different, and why does it not matter that they are?

**3. Anonymous class drill.** In a practice branch, write each of these in `RobotContainer`'s constructor, and predict whether it compiles before you build:

```java
DrivetrainIO a = new DrivetrainIO();
DrivetrainIO b = new DrivetrainIO() {};
DrivetrainIO c = () -> {};
SensorsIO d = new SensorsIO() {
    @Override
    public void updateInputs(SensorsIOInputs inputs) {
        inputs.distanceAheadMeters = 0.1;
    }
};
BooleanSupplier e = new BooleanSupplier() {
    @Override
    public boolean getAsBoolean() {
        return true;
    }
};
```

(`BooleanSupplier` needs `import java.util.function.BooleanSupplier;`.) For each one that compiles, write the shortest form that does the same thing (one of them can become a lambda). Then build, and look in `build/classes/java/main/frc/robot` for the `$` files. How many did your anonymous classes add? Delete the practice branch.

**4. A perfect replay, measured.** Record a course run on the simulator, and replay it. In a **Statistics** tab, compare `RealOutputs` with `ReplayOutputs` for `Drivetrain/LeftRequestedVolts`, and then for `Drivetrain/RightRequestedVolts`. What is the largest error? Now plant a non-deterministic input: in a practice branch, add `* (1.0 + 0.01 * Math.random())` to the follow speed in `FollowLine.followSpeeds()`, record a new run, and replay it. What do the statistics say now, and where does the first difference appear? Delete the practice branch.

**5. Replay without opening AdvantageScope.** `LogFileUtil.findReplayLog()` checks an environment variable before it checks AdvantageScope. Find out how to set an environment variable named `AKIT_LOG_PATH` for one program run on your computer (in a terminal, on Windows or macOS), set it to the full path of a log, and replay with AdvantageScope closed. When would this be handier than the AdvantageScope way?

**6. `replayWatch` (optional, a trade-off).** Chapter 17 added a Gradle task named `replayWatch` to `build.gradle`. It replays the log open in AdvantageScope **every time you save a file**, so you can add an output, save, and see it in AdvantageScope a few seconds later. Try it: set `ROBOT_MODE` to `REPLAY`, open a log in AdvantageScope, and in VS Code's terminal run `./gradlew replayWatch` (or `gradlew replayWatch` on Windows). It fails at once, with the "simulation extensions" message from Section 24.9. Why? Find the lines in `build.gradle` that turn on the Sim GUI and the XRP client by default (look for `defaultEnabled`). If you set both to `false`, `replayWatch` works, but now every normal run of the Explorer asks you to check the XRP client by hand, or the robot never connects. Decide whether that trade is worth it for you, write one sentence about why, and put `build.gradle` back if not. (`replayWatch` uses an anonymous class too: AdvantageKit's source for `ReplayWatch` is linked from its replay page. Can you find it?)

**7. A routine replays too.** Record two short autonomous runs: one with **Leg 1 Only** chosen, and one with **Sit Still**. Replay both. Without a dashboard connected, how did the replay know which routine to run? Find the value it used in the log.

**8. Record one more decision.** Pick a decision the log does not show yet, record it, and replay an old run to see it: for example, whether the wall stop in `DriveWithSticks` is holding the robot back (`Logger.recordOutput("DriveWithSticks/WallStop", ...)`), or the line light's debounced trigger. Add it to your AdvantageScope layout, and export the layout again.

### Build (XRP Explorer)

Give the Explorer one complete log, a decision timeline, and replay.

1. Make a branch (see the Git exercise).
2. Tour a log in AdvantageScope: Line Graph, 2D Field on the Evergreen field, Table, and Console (Sections 24.2 and 24.3).
3. Record requested volts, `FollowLine/State`, `Course/Step`, and `Commands/` (Section 24.4). Build: 27 tests pass. Run the course, and read the run on the timeline. Export `advantagescope-layout.json` into your project. Commit.
4. Retire `DataLogManager`, and move SysId to AdvantageKit (Section 24.5). Check that only `akit_` logs appear. Run one SysId test and export it for SysId. Commit.
5. Add `RobotMode`, the three-way `RobotContainer`, and the replay setup in `Robot` (Section 24.8). Build: 27 tests pass. Run `REAL` and `SIM` once each. Commit, with `ROBOT_MODE` set to `REAL`.
6. Record a run, replay it, and find the first difference (Section 24.9). Write in `reflections.md` which loop it was, and why.
7. Give `Sensors` its IO layer, move it to `subsystems`, move the pretend floor into `SensorsIOSim`, and add `SensorsTest` (Section 24.10). Run the tests: **29 tests**. Record a new run, replay it, and check in a Statistics tab that the requested volts match. Commit.
8. Debug the corner with replay, and add `LastSteeringError` and `aRealCornerStartsASearch` (Section 24.11). Run the tests: **30 tests**. Commit, push, open a pull request, wait for the green check, and merge.

If the HTML report shows **30 tests, 0 failures**, your logs folder has one file per run, and a replay of a fresh run matches it loop for loop, you are ready for Chapter 25.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Explain why AdvantageKit keeps inputs and outputs in different places in the log, and what replay does with each.
2. Your first replay agreed with the real run until leg 2, and then disagreed. The pose agreed the whole way. Explain both, using the words **input** and **replay bubble**.
3. Why does `RobotContainer` use `new DrivetrainIO() {}` and not `() -> {}`? When would you write a named class instead?
4. The code said `SIDE_ERROR = 0.2`, and yet the replay stopped at the corner as if it were `0.9`. Explain why, and why that is the replay doing its job, not a bug in it.
5. `Sensors` became a subsystem, though no command requires it. Give the reason, and say what would break, in a replay and in the simulator, if `Sensors` were created **before** `Drivetrain` in `RobotContainer`. (Hint: what order does the scheduler call `periodic()` in, and what does `SensorsIOSim` read?)

If any answer feels shaky, re-read Sections 24.2, 24.6, 24.7, 24.9, and 24.10.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b log-replay
```

After Build step 3:

```bash
git add .
git commit -m "Ch24: Log requested volts, follower state, course steps, and commands"
```

After Build step 4:

```bash
git add .
git commit -m "Ch24: One log file: retire DataLogManager, SysId through AdvantageKit"
```

After Build step 5, with `ROBOT_MODE` set to `REAL`:

```bash
git diff
git add .
git commit -m "Ch24: RobotMode with real, sim, and replay"
```

After Build step 7:

```bash
git add .
git commit -m "Ch24: Sensors IO layer, so replay sees every input"
```

After Build step 8:

```bash
git status
git add .
git commit -m "Ch24: Log the follower's steering memory, and test a real corner"
git push -u origin log-replay
```

Check `git status` before the last commit: `advantagescope-layout.json`, the four new `Sensors` files in `subsystems`, and the two new test files should all be included, and the old `src/main/java/frc/robot/Sensors.java` should show as **deleted**. Git may even notice that the new `Sensors.java` is mostly the old one, and call it a **rename**. Open a pull request into `main`, wait for the green check, merge, delete the branch, and `git checkout main` and `git pull`.

The `logs` folder is not in Git, and it should not be. But a log can be worth keeping: the run that found a bug, or the run your `aRealCornerStartsASearch` number came from. Make a folder outside your project for logs worth keeping, copy that one in, and give it a name that says what it shows, like `corner-stop-side-error-0.9.wpilog`.

### Collab: Bug in a Log

One partner plants a bug in the code, records a run, and hands over only the log. The other finds the bug with replay, without looking at the bug's code. This works entirely on the simulator.

As before, the **owner** is the person whose Explorer repository you use, and the **teammate** is the other partner. Both: finish this chapter's Build and merge it, and pull `main`.

**Part A: plant and record.** **Owner:** without telling your teammate, create a branch `planted`, and make **one** small change that breaks the course on the simulator without crashing it. Some ideas: change a `>` to `>=` in a `FollowLine` rule; swap the left and right reflectance in `SensorsIOSim`; change `LEG_1_DISTANCE_METERS`; make a timeout too short. Set `ROBOT_MODE` to `SIM`, run the course in autonomous, and stop. Send your teammate the newest `akit_` log (by chat, or a shared drive), and nothing else. Do **not** push the branch.

**Part B: replay and hunt.** **Teammate:** open the log in AdvantageScope and read it: how far did the course get? Then set `ROBOT_MODE` to `REPLAY` on **`main`**, the code **without** the bug, and replay the log. Find the **first loop** where `ReplayOutputs` and `RealOutputs` disagree. Because your code and the owner's differ in exactly one place, that loop points at it. Write down:

1. the loop's time, and which outputs disagree first,
2. which inputs at that moment the bug must have read differently from `main`,
3. your best guess at the exact line the owner changed.

Careful: one kind of planted bug does not show up as a difference at all. If the owner changed `SensorsIOSim`, the log's **inputs** are different, and `main` replays those inputs faithfully, so every output agrees. If you find no difference, look at the inputs instead: what does the log say the sensors read, and is that what the pretend floor on `main` would have reported at that pose?

**Part C: check.** **Owner:** push `planted`. **Teammate:** check it out, and compare your guess with `git diff main`. Then swap roles and do it again.

Afterward, in `reflections.md`, each of you writes two sentences: which kind of bug was easiest to find with replay, and which was hardest, and why. Add a rule to the project's `CONTRIBUTING.md` (Chapter 11), for example: "A pull request that adds a sensor reads it through an IO layer, and the author has replayed a simulator run and checked that it matches."

### Explore

- Read AdvantageKit's **Deterministic Timestamps** page (link below). It explains a choice AdvantageKit makes about **when** in the loop a timestamp is taken, and why `Timer.getTimestamp()` returns the same value all through one loop. What would go wrong in replay if it did not?
- In AdvantageScope's documentation, read the **Line Graph** reference. Find out how to graph a field's **rate of change** (its derivative), and use it to graph the drivetrain's acceleration from `LeftSpeedMetersPerSecond` during leg 1. Compare it with `Sensors` > `AccelXGs` (or `AccelYGs`, depending on your robot's axes from Chapter 9).
- AdvantageScope has a **3D Field** tab too. Put the robot's pose on it, and look through the robot models you can choose from. What can a 3D view show that a 2D one cannot, once a robot has an arm or a camera?
- Find Team 6328's robot code on GitHub, and search it for `onCommandInitialize`. How does their command logging differ from yours? (Look for a `Map`, and think about what it counts, and why two commands with the same name might both be running.)

---

> **Additional Resources**
>
> * **Traditional Replay (AdvantageKit)**: [docs.advantagekit.org/getting-started/traditional-replay](https://docs.advantagekit.org/getting-started/traditional-replay) how to run a replay, where the replayed log goes, and `replayWatch`
> * **Built-In Logging (AdvantageKit)**: [docs.advantagekit.org/data-flow/built-in-logging](https://docs.advantagekit.org/data-flow/built-in-logging) everything AdvantageKit records without being asked: the Driver Station, the console, loop timing, and more
> * **Non-Deterministic Data Sources (AdvantageKit)**: [docs.advantagekit.org/getting-started/common-issues/non-deterministic-data-sources](https://docs.advantagekit.org/getting-started/common-issues/non-deterministic-data-sources) the list behind Section 24.6's audit
> * **Deterministic Timestamps (AdvantageKit)**: [docs.advantagekit.org/theory/deterministic-timestamps](https://docs.advantagekit.org/theory/deterministic-timestamps) how the logged clock works, and why it makes replay exact
> * **SysId Compatibility (AdvantageKit)**: [docs.advantagekit.org/data-flow/sysid-compatibility](https://docs.advantagekit.org/data-flow/sysid-compatibility) recording SysId's test state, and exporting a log for the SysId tool
> * **Log Files (AdvantageScope)**: [docs.advantagescope.org/overview/log-files](https://docs.advantagescope.org/overview/log-files) opening, adding, downloading, and exporting logs
> * **Line Graph (AdvantageScope)**: [docs.advantagescope.org/tab-reference/line-graph](https://docs.advantagescope.org/tab-reference/line-graph) axes, the discrete area, and everything else the Line Graph can do
> * **On-Robot Telemetry Recording (WPILib)**: [docs.wpilib.org/en/stable/docs/software/telemetry/datalog.html](https://docs.wpilib.org/en/stable/docs/software/telemetry/datalog.html) `DataLogManager` and the WPILOG format, for when you meet them on other teams' robots
> * **Anonymous Classes (Oracle Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/javaOO/anonymousclasses.html](https://docs.oracle.com/javase/tutorial/java/javaOO/anonymousclasses.html) anonymous classes in depth, with more detail than robot code needs

---

*Next up, Chapter 25: XRP Capstone Project. Everything from Chapters 1 to 24 comes together in one robot: you will plan, build, test, tune, log, and present a capstone of your own on the Explorer, and prove it works with the tools you have built.*
