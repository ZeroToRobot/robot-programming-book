# Chapter 23: SmartDashboard, Shuffleboard, and Live Tuning

In Chapter 22 the Explorer got a safety net. Twenty-four tests walk `FollowLine` through every arrow of its state diagram, check the drivetrain's math, drive the commands on the simulated robot, and run the whole obstacle course in autonomous, every time you build. GitHub Actions runs them again on every push, and puts a green check or a red X on every pull request.

What has not changed since Chapter 2 is how you **tune**. You change `STEER_KP` from `3.0` to `2.5`, build, wait for the program to start, put the robot back on the tape, enable, watch, disable, and do it all again. Every number you try costs you a minute, and most of that minute is waiting. Choosing a different autonomous routine is the same: you edit `getAutonomousCommand()`, and rebuild.

This chapter makes the dashboard talk **back**. By the end, the Explorer has a real dashboard with two tabs: a **Driver** tab with a dropdown that picks the autonomous routine, and a **Tuning** tab with every PID gain and all three of `FollowLine`'s promised tuning numbers, which you can change while the robot is running. You will tune the whole obstacle course that way, live, and then copy the winning numbers back into your code, where your tests stand guard over them.

Along the way, you will find out something important about the tools in this chapter's title. WPILib changed its advice about dashboards for 2026, and the SmartDashboard and Shuffleboard **apps** are on their way out. Section 23.3 says exactly what changed, what it means for the code you have written since Chapter 4 (good news: very little), and which dashboard the book uses from here on.

On the Java side, you will learn **generics**: the angle brackets in `SendableChooser<Command>` that you have been seeing since Chapter 19 and quietly skipping past. And you will learn what it means for a `static final` field to point at an object that **changes**, which is exactly what a tunable number is.

You will need your XRP for most of this chapter, and a strip of tape for the line follower.

---

## 23.1 Edit, Build, Run, Repeat

Here is a tuning session from Chapter 21, timed.

You are tuning `STEER_KP` on a gentle bend. The robot wiggles, so you lower the gain from `3.0` to `2.5`. You stop the program, edit the number, and run **WPILib: Simulate Robot Code**. Gradle compiles the code and runs the tests (Chapter 22 made every build do that). The program starts, the Simulation GUI opens, and the Explorer reconnects. You put the robot back at the start of the tape, enable teleop, hold the left bumper, and watch. Better, but now it drifts wide on the bend. Try `2.8`. Stop, edit, build, start, reconnect, place, enable, watch.

Each try takes about a minute, and you spend maybe five seconds of that minute actually watching the robot. Tuning one number well can take ten tries. The follower has three numbers, the drivetrain has six PID gains, and each one affects the others. That is an afternoon, spent mostly watching Gradle.

There is a worse cost, too. Between two tries, a minute passes and the robot is picked up and put down. The battery sags a little. You put the robot a few millimeters further left. You forget exactly what the last run looked like. Good tuning is a careful **experiment**, changing one thing at a time and comparing results, and every minute between two tries makes the comparison worse.

### You had this once

In Chapter 15 you tuned the heading PID controller **live**. `SmartDashboard.putData("Heading PID", headingController)` put the controller itself on the dashboard, and you changed its P, I, and D in the Simulation GUI while the robot turned. No rebuilding.

Chapter 19 took that away, and Section 19.5 explained why. Each command now owns its own PID controllers, created from `Drivetrain`'s factories, because a PID controller remembers (its error sum, its last error), and two jobs must never share one. Count how many heading controllers the Explorer has today:

- the obstacle course's `DriveDistance`, `TurnToHeading`, and `DriveUntilLine`,
- the teleop A button's `TurnToHeading`,
- the Test mode bench's two `TurnToHeading`s (A and B) and two `DriveDistance`s (X and Back).

Eight heading controllers, eight separate objects, and that is before this chapter adds any more. Put one of them on the dashboard and change its gain, and you have changed one command out of eight. The other seven still use the old number.

So the question for live tuning is not "how do I put a controller on the dashboard?" It is: **where does a gain live, so that one change on the dashboard reaches every command that uses it?** Section 23.8 answers that with a small class of your own and one well-placed `static`.

### And choosing a routine means editing code

Since Chapter 20, `getAutonomousCommand()` has been one line: `return obstacleCourse;`. That is fine for running the course. But when you are tuning leg 1, you want autonomous to drive **only** leg 1, over and over. When you are tuning the follower, you want to start the robot on the tape and run **only** `FollowLine`. Right now, each of those means editing `getAutonomousCommand()` and rebuilding, and remembering to change it back before you commit.

Every FRC team solves this the same way: a dropdown on the dashboard, called a **chooser**, that lists the autonomous routines. The drive team picks one before the match, and the robot runs whatever was picked. Chapter 20 promised you one. Section 23.6 builds it.

> **Tune on the robot, keep it in the code**
>
> Live tuning changes numbers while the program runs. When the program stops, those changes are gone, and the next run starts from the numbers in your code again. That is on purpose. The dashboard is a **scratchpad** for experiments; your code, in Git, is the **notebook** where results are written down. Section 23.10 ends every tuning session the same way: copy the numbers that worked into your constants, run the tests, and commit.

---

## 23.2 What a Dashboard Really Is: NetworkTables

Since Chapter 4, you have been calling `SmartDashboard.putNumber("Heading (deg)", ...)` and watching the number appear on your laptop. Before you can send numbers the **other** way, it helps to know what actually happens when you call `putNumber`.

### A server and its clients

Your robot program does not draw the dashboard. It does not even know a dashboard is open. Instead, it runs a small **server** called **NetworkTables**, which WPILib starts for you. A NetworkTables server keeps a list of named values, and any program that connects to it, called a **client**, can read those values, be told the moment one changes, and publish new values of its own.

A dashboard is just a NetworkTables client that draws pictures of the values. The Simulation GUI's **NetworkTables** view is a client. The SmartDashboard app you have used since Chapter 4 is a client. AdvantageScope, which you connected in Chapter 17, is a client. They can all be connected at the same time, and they all see the same values, because they are all reading the same server.

Where does the server run? Wherever the robot program runs. Chapter 2 explained that an XRP program runs on your **laptop**, and talks to the XRP over Wi-Fi. So for the Explorer, the NetworkTables server is on your laptop too, and every dashboard connects to it at `localhost`, the network name a computer uses for itself. That is true even when the real XRP is driving: the XRP only carries motor and sensor numbers back and forth, and never runs any of your code.

> **On a real FRC robot, the server is on the robot**
>
> In Chapter 26 your program moves onto the Mini Swerve's **roboRIO**, and the NetworkTables server goes with it. The dashboard then runs on the Driver Station laptop and connects over the robot's radio, to an address built from your team number (for team 3415, `10.34.15.2`). Everything in this chapter still works; only the address changes. At competitions, the field limits how much data each robot may send, so a team that publishes a thousand values every loop can find its dashboard lagging. That is one more reason to keep the driver's dashboard small (Section 23.11).

### Topics: names like folders

Every value on a NetworkTables server lives in a **topic**: a named channel with a fixed type, such as a number, a boolean, or a string. Topic names look like folder paths, with slashes. When you write

```java
SmartDashboard.putNumber("Heading (deg)", drivetrain.getHeadingDegrees());
```

WPILib publishes the number to the topic `/SmartDashboard/Heading (deg)`. The `SmartDashboard` class always puts its values inside a table (a folder) named `SmartDashboard`. That is the whole job of the class: it is a short way to write numbers, booleans, strings, and widgets into that one table.

Other code writes to other tables. AdvantageKit's `NT4Publisher`, which you added to `Robot()` in Chapter 17, publishes everything AdvantageKit logs into a table named `AdvantageKit`. That is what AdvantageScope reads when you choose **NetworkTables 4 (AdvantageKit)**.

Run the Explorer now (real or simulated) and look in the Simulation GUI's **NetworkTables** window. You will see both tables. Open **SmartDashboard** and find `Heading (deg)` and `Line State`. Open **AdvantageKit** and find the drivetrain's inputs from Chapter 17. Two programs (your code and AdvantageKit) are writing into one server, and the Simulation GUI is reading both.

### Values can travel both ways

Here is the part this chapter is about. A client does not only **read**. It can also publish a new value to a topic, and the server passes that new value to everyone else, **including your robot program**. Your code can then read it.

That is exactly how Chapter 15's live PID widget worked. When you typed a new P into the Simulation GUI, the GUI published it to `/SmartDashboard/Heading PID/p`, the server passed it to your program, and the `PIDController` (which had told WPILib how to read and write its gains when you called `putData`) called its own `setP()`. Every dashboard control that changes the robot, from a chooser to a slider, works that way: a client publishes, and the robot program reads.

> **NetworkTables, in one sentence**
>
> **NetworkTables** is a small database that the robot program serves and every dashboard connects to as a **client**: each value lives in a **topic** with a folder-like name, such as `/SmartDashboard/Heading (deg)`, and any client can read it, be told when it changes, or publish a new value that the robot can read back.

---

## 23.3 Which Dashboard? What Changed in 2026

This chapter's title names two dashboards: **SmartDashboard** and **Shuffleboard**. When the book's outline was written, those were the two dashboards that came with WPILib for Java teams. Before writing this chapter, we checked what WPILib says about them for the 2026 season. Here is what we found.

### What WPILib's documentation says

WPILib's dashboard overview page for 2026 says that SmartDashboard and Shuffleboard "do not have a person to maintain them so are not receiving bug fixes or improvements," and that "they are deprecated and will be removed for the 2027 season." Shuffleboard's own pages carry a warning: it "is deprecated and will be removed for 2027 due to its lack of a maintainer and resource utilization issues."

The documentation for the 2027 season (still in development as this is written) lists them under **removed features**: "All Java GUI tools have been removed due to lack of maintenance." For SmartDashboard it adds that the app uses an old version of the NetworkTables protocol (NT3) which has itself been removed. And it says what to use instead: "Use Elastic as a driver dashboard and use AdvantageScope for debugging and data visualization."

**Deprecated** means the same thing for a program as it did for a method in Chapter 11: it still works today, but it is on its way out, so do not start depending on it. Both apps still come with the 2026 WPILib installer, and both still work with your code this season.

### What it means for your code: almost nothing

Here is the good news. What is going away is the **app** called SmartDashboard, the window you open with **WPILib: Start Tool** > **SmartDashboard**. The **class** called `SmartDashboard`, the one in your code, is a different thing with the same name. It is a helper for writing into the `/SmartDashboard` table on the NetworkTables server, and it is **not** deprecated: WPILib 2026's Java documentation for `SmartDashboard` has no deprecation notice on the class or any of its methods. Elastic, AdvantageScope, the Simulation GUI, and Glass all read the `/SmartDashboard` table. So every `SmartDashboard.putNumber` you have written since Chapter 4 keeps working, with any dashboard you choose.

Shuffleboard has a Java side too: a `Shuffleboard` class that lets code arrange widgets on Shuffleboard tabs. You will see it in older robot code on GitHub, looking like this:

```java
// Shuffleboard's Java API, as older team code uses it. Recognize it; the book does not write it.
ShuffleboardTab tuningTab = Shuffleboard.getTab("Tuning");
GenericEntry steerKpEntry = tuningTab.add("Steer kP", 3.0)
    .withWidget(BuiltInWidgets.kNumberSlider)
    .getEntry();
```

That class is not marked deprecated in WPILib 2026's Java documentation either. But the app that reads its layouts is going away, and Elastic has removed its own support for it (Elastic's documentation says support for the Shuffleboard API "has been removed in favor of downloading full layouts from the robot"). So the book will not write any new Shuffleboard code. If you meet it in another team's repository, you now know what it is: a way of saying from code which tab and which widget a value should get.

### The dashboards you have, and what the book uses

All of these come with the WPILib 2026 installer, and open from **WPILib: Start Tool**:

| Dashboard | What it is for | Status for 2026 | In this book |
|---|---|---|---|
| SmartDashboard (the app) | A simple driver dashboard | Deprecated; removed for 2027 | Chapters 4 to 22. Retired in this chapter |
| Shuffleboard | Driver and programmer dashboard with tabs | Deprecated; removed for 2027 | Not used |
| Simulation GUI (and Glass) | A programmer's tool: NetworkTables view, plots, Field2d, the simulated joystick | Current | Still used: the controller setup (Chapter 8) and quick looks |
| **Elastic** | A modern driver dashboard, made by FRC Team 353 | Current; WPILib's recommended driver dashboard | **From this chapter on**: the Driver and Tuning tabs |
| **AdvantageScope** | Logs, graphs, 3D field views, and replay, made by FRC Team 6328 | Current; WPILib's recommended tool for debugging and data | Chapter 17, and all of Chapter 24 |

Elastic and AdvantageScope are both made by FRC teams, and both are open source. WPILib now ships them with every installation.

> **Why this chapter still says "Shuffleboard"**
>
> The book's outline was written before WPILib's 2026 announcement, and the chapter keeps its name so links and the table of contents stay stable. The ideas in it (a dashboard is a NetworkTables client, a chooser picks a routine, a tunable number is published once and read every loop) are the same in every dashboard, past and future. Only the app changes. When a tool you depend on is deprecated, the right move is the one you just watched: check the official documentation, find the recommended replacement, and move before the old tool disappears, not during build season.

> **Check the docs, not your memory**
>
> Dashboards, vendor libraries, and even WPILib's own recommendations change from year to year. Everything in this section was checked against WPILib's 2026 documentation, which was current when this chapter was written. When you read it, check the **Dashboards** pages at docs.wpilib.org again (the link is in this chapter's resources). If the advice has changed, follow the documentation.

---

## 23.4 Your First Elastic Dashboard

Time to build a real dashboard. You will make it once, save it to a file in your project, and commit it, so that your whole team gets the same dashboard.

### Step 1: Open Elastic and connect

Run the Explorer, with the XRP switched on and `USE_SIMULATED_ROBOT = false`. Then, in VS Code, open the Command Palette (**Ctrl+Shift+P**), run **WPILib: Start Tool**, and choose **Elastic**.

Elastic opens with an empty grid, and a red **Network Tables: Disconnected** at the bottom of the window. It does not know where your robot is yet. Click the **gear** (settings) at the top of the window, and find the **IP Address Mode** dropdown. Elastic offers several:

- **Driver Station** asks the Driver Station for the robot's address. It is the right choice for a roboRIO robot.
- **Team Number** and **RoboRIO mDNS** build the address from your team number. They are for roboRIO robots too.
- **localhost** connects to a NetworkTables server on this same computer.

Choose **localhost**. Your XRP program, and so its NetworkTables server, runs on your laptop (Section 23.2), so `localhost` is right for the Explorer whether it is driving the real XRP or the simulated one. Close the settings. The bottom of the window turns green: **Network Tables: Connected**.

### Step 2: Add widgets

Click **Add Widget** at the top of the window. A dialog opens with the tables on the server: you will recognize **SmartDashboard** and **AdvantageKit**. Click **SmartDashboard** to open it, and you will see every value your code publishes.

Drag these onto the grid, one at a time. Elastic draws a green outline where a widget can go, and a red one where it cannot:

- `Mode`
- `Line State`
- `Heading (deg)`
- `Wall Close` and `Blocked`
- `Field`
- `Scheduler`

Elastic picks a widget for each value from its type. `Mode` and `Line State` become **Text Display** widgets; `Wall Close` and `Blocked` become **Boolean Box**es, which turn a color when `true`; `Field` becomes a **Field** that draws your `Field2d`, robot icon and course poses included (Chapter 14); and `Scheduler` becomes a list of every command that is running, with a button to cancel each. Drag a widget's edges to resize it, and drag the widget itself to move it.

To change how a widget looks, right-click it and choose **Edit Properties**. Under **Container Settings** you can rename it and change its **widget type**. Try it on `Heading (deg)`: change it from a Text Display to a **Graph**, which draws the heading over time. Turn the XRP by hand, and watch the line move. To remove a widget, right-click it and choose **Remove**.

### Step 3: Two tabs

Along the top of the grid is a row of **tabs**, like the tabs in a web browser. Right-click the first one and rename it **Driver**. Then click **+** to add a second tab, and name it **Tuning**. Leave it empty for now; Section 23.9 fills it.

> **A driver dashboard is not a programmer dashboard**
>
> The drive team looks at the dashboard in quick glances, between watching the robot and the field. Every widget on the **Driver** tab should answer a question the drive team has during a match: which autonomous is selected, is the robot in the right mode, is it blocked, where does it think it is. Big, few, and readable from a step back. Everything a **programmer** wants (raw sensor readings, PID errors, graphs) goes on other tabs. A Driver tab with forty numbers on it is a Driver tab nobody reads.

### Step 4: Save the layout in your project

Elastic keeps your layout for next time when you choose **File** > **Save**. That is enough for your own laptop. But a dashboard is part of the robot program, just like a binding: if a teammate clones your repository, they should get the same dashboard. So save a copy into the project too.

Choose **File** > **Export Layout**, go to your Explorer project folder, then into `src`, then `main`, then `deploy` (create the `deploy` folder if it does not exist), and save the file as `elastic-layout.json`. You can open it in VS Code: it is a text file in **JSON**, a format for writing structured data, a little like the YAML of Chapter 22 but with braces and quotes. You will not edit it by hand. Elastic writes it, and Elastic reads it back with **File** > **Open Layout**.

Why `src/main/deploy`? That folder is where a WPILib project keeps files that travel with the robot program. On a roboRIO, its contents are copied onto the robot every time you deploy, and Elastic can even download a layout straight from the robot (Practice 6 tries it). For now, it is just a sensible, standard place for the file to live.

> **Lock it before a match**
>
> Elastic's **Edit** menu has **Lock Layout**. A locked layout cannot be changed until you unlock it: widgets cannot be moved, removed, or added. Lock the Driver tab's layout before every match, so a stray click in the pit cannot drag the autonomous chooser off the screen.

---

## 23.5 New Java: Generics

The dashboard is ready for its first control: the autonomous chooser. WPILib's chooser class is declared like this:

```java
public class SendableChooser<V> implements Sendable, AutoCloseable {
```

and you will create one like this:

```java
SendableChooser<Command> autoChooser = new SendableChooser<>();
```

Those angle brackets are not new to you. You have seen them three times already, and each time the book said "do not worry about the brackets yet." Now is the time to worry about them, a little.

| Where | What you wrote or read | What the brackets said |
|---|---|---|
| Chapter 19, SysId | `Consumer<Voltage>` | a function that takes a `Voltage` |
| Chapter 20, groups | `List<Command>` | a list of `Command`s |
| Chapter 21, `Commands.select` | `Map<State, Command>` | a map from `State`s to `Command`s |

### A box with a label on it

A chooser is a **container**: a dropdown full of options, each with a name and a value. The question a container always raises is: **values of what type?** A chooser of autonomous routines holds `Command`s. A chooser of drive speeds might hold `Double`s. A chooser of colors for an LED strip might hold an enum.

WPILib did not want to write `CommandChooser`, `DoubleChooser`, and `ColorChooser`, with the same code three times. So it wrote one class, `SendableChooser<V>`, where `V` is a **type parameter**: a placeholder for "whatever type of value this chooser holds." When you write `SendableChooser<Command>`, you fill the placeholder in with a **type argument**, `Command`, and you get a chooser of commands. A class with a type parameter is called a **generic class**, and the whole feature is called **generics**.

Think of a storage bin in the shop with a label on the front. The bin itself is the same design whatever goes in it. The label (`<Command>`) says what this bin is for, and everyone who reaches into it knows what they will find.

### Reading a generic class's documentation

To understand a generic class's methods, take its documentation and replace the type parameter everywhere with your type argument. `SendableChooser`'s Javadoc says:

```java
public void addOption(String name, V object)
public void setDefaultOption(String name, V object)
public V getSelected()
```

For a `SendableChooser<Command>`, read every `V` as `Command`:

```java
public void addOption(String name, Command object)
public void setDefaultOption(String name, Command object)
public Command getSelected()
```

That is the promise generics make. You may only put `Command`s into this chooser, and what you get back out is a `Command`, ready to schedule. The compiler checks both halves.

### What the compiler catches

Try to break the promise, and the build fails. Here are two mistakes, and what Java says about each:

```java
autoChooser.addOption("Oops", 3.0);   // a number is not a Command
String name = autoChooser.get();      // what comes out is a Command, not a String
```

```
error: incompatible types: double cannot be converted to Command
        autoChooser.addOption("Oops", 3.0);
                                      ^
error: incompatible types: Command cannot be converted to String
        String name = autoChooser.get();
                                     ^
```

Both mistakes are caught **at compile time**, at your desk, with the exact line marked. That is the whole point of generics.

### Before generics: casts, and crashes

Java did not always have generics; they arrived in 2004, in Java 5. Before that, a container held plain `Object`s, which can be anything, and getting a value back out needed a **cast** (Chapter 9's `(double)`, but for objects) to tell Java what you believed it was. You can still write it that way, and the compiler only warns you:

```java
List options = new ArrayList();      // no brackets: a list of anything
options.add("Obstacle Course");
options.add(3.0);                    // nothing stops this
String second = (String) options.get(1);   // "trust me, it is a String"
```

It compiles. Then it runs, and crashes:

```
Exception in thread "main" java.lang.ClassCastException: class java.lang.Double cannot be cast to class java.lang.String
```

The same mistake that generics catch at your desk, the old way catches on the robot, in the middle of autonomous. A list written without its brackets, like `List` instead of `List<String>`, is called a **raw type**. Never write one on purpose. If VS Code underlines a `List` or `Map` with a warning that says "raw type," it is asking you to add the brackets.

### The diamond

On the right-hand side of

```java
SendableChooser<Command> autoChooser = new SendableChooser<>();
```

the brackets are empty. That `<>` is called the **diamond**, for its shape. It tells Java to work out the type argument from the left-hand side, so you do not have to type `Command` twice. You will almost always use it.

### Only object types go in the brackets

One rule surprises everyone the first time. The brackets take a **class** (or an interface or enum), never a primitive type like `double`, `int`, or `boolean`:

```java
List<double> speeds;   // ERROR
```

```
error: unexpected type
  required: reference
  found:    double
```

For each primitive type, Java has a matching class, called a **wrapper class**: `Double` for `double`, `Integer` for `int`, `Boolean` for `boolean`. So a chooser of speeds is a `SendableChooser<Double>`. You can still put plain `0.3` into it and get a plain `double` back out: Java converts between `double` and `Double` for you, automatically. That conversion is called **autoboxing** (putting the number in a box) and **unboxing** (taking it out). You will rarely have to think about it.

> **Generics, in one sentence**
>
> A **generic class** like `SendableChooser<V>` is written once with a **type parameter** (`V`), and each time you use it you supply a **type argument** in angle brackets (`SendableChooser<Command>`), so the compiler can check that only that type goes in, and that what comes out needs no cast; use the **diamond** `<>` on the right of `new`, and a **wrapper class** like `Double` when you need a primitive type.

You will not write your own generic class in this book. Reading and using them is what robot code needs, and you now have that. WPILib and the Java library are full of them: `List`, `Map`, `Optional`, `Supplier`, and every chooser.

---

## 23.6 An Autonomous Chooser

WPILib's documentation shows the standard way to pick an autonomous routine from the dashboard: a `SendableChooser<Command>`, filled with routines, published with `SmartDashboard.putData`, and asked for its selection in `getAutonomousCommand()`. The Explorer will do exactly that, with one change: it uses **AdvantageKit's** version of the chooser.

### Why AdvantageKit's chooser?

In Chapter 17 you split the drivetrain into an IO layer, so that AdvantageKit could record every **input** the robot read: every encoder count, every gyro angle. Section 17.6 explained the reason. If AdvantageKit records every input, then a log can later be **replayed**: the same code is run again on the recorded inputs, and makes exactly the same decisions (that is Chapter 24).

A dashboard selection is an input too. If the drive team picked "Leg 1 Only," the robot did something completely different from the obstacle course. AdvantageKit's documentation is direct about this: anything your code reads from NetworkTables has to be treated as input data, or replay will not behave correctly. A plain `SendableChooser` reads straight from NetworkTables, and AdvantageKit never sees it. So AdvantageKit provides `LoggedDashboardChooser<V>`, a chooser that records which option was selected every loop, and plays it back during a replay.

It is used almost exactly like `SendableChooser`, and it is generic in the same way:

| `SendableChooser<V>` (WPILib) | `LoggedDashboardChooser<V>` (AdvantageKit) |
|---|---|
| `new SendableChooser<>()`, then `SmartDashboard.putData("Auto Routine", chooser)` | `new LoggedDashboardChooser<>("Auto Routine")`: publishes itself |
| `setDefaultOption(name, value)` | `addDefaultOption(name, value)` |
| `addOption(name, value)` | `addOption(name, value)` |
| `getSelected()` | `get()` |

Underneath, `LoggedDashboardChooser` creates an ordinary `SendableChooser` and publishes it to `/SmartDashboard/Auto Routine`. So every dashboard shows it as a normal chooser. AdvantageKit simply reads the selection once per loop, records it, and remembers it for you.

### Step 1: The chooser and its options

Open `RobotContainer.java`. Add one import, in alphabetical order with the others (it goes near the bottom, with the `org.` imports after `frc.`):

```java
import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;
```

Add the chooser as a field, right after `obstacleCourse`:

```java
// The dashboard's autonomous dropdown (Chapter 23). AdvantageKit records the choice.
private final LoggedDashboardChooser<Command> autoChooser =
    new LoggedDashboardChooser<>("Auto Routine");
```

Read the type aloud: "a logged dashboard chooser of commands." The diamond on the right fills in `Command` from the left.

In the constructor, right after `obstacleCourse = buildObstacleCourse();`, add one line:

```java
configureAutoChooser();
```

Then add these two methods just after `buildObstacleCourse()`:

```java
/**
 * Fill the dashboard's Auto Routine dropdown. The obstacle course is the default.
 * Every option is its own command object: a command can only belong to one group.
 */
private void configureAutoChooser() {
    autoChooser.addDefaultOption("Obstacle Course", obstacleCourse);
    autoChooser.addOption("Leg 1 Only", buildLeg1Only());
    autoChooser.addOption("Follow Line Only",
        new FollowLine(drivetrain, sensors)
            .withTimeout(CourseConstants.FOLLOW_TIMEOUT_SECONDS)
            .andThen(holdStill())
            .withName("Follow Line Only"));
    autoChooser.addOption("Sit Still", holdStill());
}

/**
 * Just leg 1 of the course: reset the pose and drive to the corner, then hold still.
 * Run it again and again while tuning the distance gains (Section 23.10).
 *
 * @return the routine, ready to schedule
 */
private Command buildLeg1Only() {
    return Commands.sequence(
            resetPose(),
            new DriveDistance(drivetrain, CourseConstants.LEG_1_DISTANCE_METERS)
                .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS))
        .andThen(holdStill())
        .withName("Leg 1 Only");
}
```

Walk through it:

- **Four options.** The whole course, as the default. **Leg 1 Only**, for tuning the distance controller. **Follow Line Only**, for tuning the follower in autonomous: place the robot on the tape first. And **Sit Still**, which holds the drivetrain and does nothing else, for the match where the safest autonomous is none at all.
- **`addDefaultOption`** marks the course as the option the chooser starts on. If nobody touches the dropdown, autonomous runs the course, just as it has since Chapter 20.
- **Every option is a new object.** Chapter 20's one-owner rule says a command that is part of a group cannot be scheduled alone or put in a second group. `buildLeg1Only()` builds a brand-new `DriveDistance`, separate from the course's, and `holdStill()` is a factory that returns a new command every call. If "Leg 1 Only" and "Follow Line Only" shared one `Hold Still` command object in their two `andThen`s, the second `andThen` would fail with Chapter 20's "Commands that have been composed may not be added to another composition or scheduled individually!" the moment the program started.
- **"Sit Still" is `holdStill()`, not `Commands.none()`.** Remember that `DriveWithSticks` is the drivetrain's default command in every mode. A routine that does nothing would let the default command run, and then a bumped joystick could move the robot in autonomous. `Hold Still` requires the drivetrain, so the sticks stay quiet.

### Step 2: Ask the chooser

Replace `getAutonomousCommand()` with:

```java
/**
 * The command to run in autonomous: whichever routine the Auto Routine dropdown has
 * selected.
 *
 * @return the selected routine, or the obstacle course if nothing is selected yet
 */
public Command getAutonomousCommand() {
    Command selected = autoChooser.get();
    if (selected == null) {
        return obstacleCourse;   // no answer from the dashboard yet (and in tests, never)
    }
    return selected;
}
```

`autoChooser.get()` returns a `Command`, because the chooser holds `Command`s. No cast. That is generics paying off.

But why the `null` check, when the course is already the default? Because of **when** `LoggedDashboardChooser` reads the dashboard. AdvantageKit updates its dashboard inputs once per loop, just before `robotPeriodic()` runs, and records what it found. Until the first loop, the chooser has not read anything yet, and `get()` answers `null`: "I have no answer." On the robot that window is a fraction of a second at startup, long before anyone enables autonomous. But a **test** has no robot loop at all, and Chapter 22's `ObstacleCourseTest` calls `getAutonomousCommand()` directly. Without the check, it would get `null`.

What would `null` do? Section 20.7's `Robot.autonomousInit()` stores the command in `autonomousCommand` and schedules it. The scheduler ignores a `null` with a warning (`Tried to schedule a null command`), so nothing would run. Then `teleopInit()` calls `autonomousCommand.cancel()`, and Chapter 10's `NullPointerException` crashes the program. The check turns "no answer yet" into the safest answer you have, the routine that was the default all along. It is the same habit as Chapter 20's `Commands.none()` in `Robot`: never hand anyone a `null` they will call a method on.

### Step 3: Run the tests, then use it

Build. The build runs your tests, and all twenty-four should pass: `ObstacleCourseTest` still gets the obstacle course, through the `null` check.

Make it fail on purpose, as Chapter 22 taught you. Delete the three lines of the `if`, so `getAutonomousCommand()` just returns `autoChooser.get()`, and run the tests:

```
ObstacleCourseTest > courseEndsAtTheEndOfTheLine() FAILED
```

and the report says `expected: <0.5> but was: <0.0>`. The robot never moved: nothing was scheduled, the LED never came on, and the test's loop ended at once with the robot still at the start line. A test you wrote for the obstacle course just caught a bug in a chooser it has never heard of. Put the `if` back, and run the tests again: green.

Now run the Explorer, real or simulated. In Elastic, open **Add Widget** > **SmartDashboard**. There is a new entry, `Auto Routine`. Drag it onto the **Driver** tab. Elastic recognizes it as a chooser and draws a **ComboBox Chooser**: a dropdown showing `Obstacle Course`. Open it, and pick `Leg 1 Only`.

Press Y to reset the pose, put the XRP at the start line, and enable **Autonomous**. The robot drives leg 1, stops at the corner, and holds still. The Scheduler widget shows `Leg 1 Only`, and the terminal shows only the `DriveDistance` lines. Disable, put it back, pick `Obstacle Course`, and enable autonomous again: the whole course.

> **Choose before you enable**
>
> `Robot.autonomousInit()` asks for the autonomous command once, at the moment autonomous starts. Changing the dropdown halfway through a routine does nothing until the next time autonomous is enabled. That is what a drive team wants: the choice is made in the queue, before the match, and nothing a nervous hand does on the laptop during autonomous can change it. Export your layout again (**File** > **Export Layout**, same file), so the chooser is part of the saved Driver tab.

> **The chooser is in the log**
>
> Because the chooser is AdvantageKit's, every run's log records which routine was selected. In AdvantageScope, or in Chapter 24's replay, you will find it under `NetworkInputs`, as `SmartDashboard/Auto Routine`. Months from now, when someone asks "which auto did we run in qualification 14?", the log knows.

---

## 23.7 Live Tuning: The Old Way, and Its Traps

Now the numbers. Here is how live tuning has been done on many FRC teams for years, with nothing but the `SmartDashboard` class. It is worth seeing, because you will find it in a lot of robot code, and because it has four traps that are worth learning to spot.

```java
// In the constructor: show the starting value on the dashboard.
SmartDashboard.setDefaultNumber("Steer kP", STEER_KP);

// Every loop: read back whatever the dashboard says now.
double steerKp = SmartDashboard.getNumber("Steer kP", STEER_KP);
```

`setDefaultNumber` publishes the value only if the topic does not exist yet, so a value someone has already typed in is not overwritten. `getNumber` reads the topic, or returns the second argument if it is missing. Type a new value into the dashboard, and the next loop uses it. It works. Now the traps.

**Trap 1: the value that will not stay changed.** Write `putNumber` instead of `setDefaultNumber`, and put it somewhere that runs every loop:

```java
SmartDashboard.putNumber("Steer kP", STEER_KP);   // BUG: runs every loop
```

Now you type `2.5` into the dashboard, and 20 milliseconds later your own code publishes `3.0` over it. The number on the screen flickers back, and whatever you type, the robot never sees it. This is the single most common live-tuning bug, and it is maddening, because the dashboard looks like it works. (Practice 2 lets you see it for yourself.)

**Trap 2: the typo nobody notices.** The key is a `String`, typed twice: once to publish, once to read. Type `"Steer KP"` in one place and `"Steer kP"` in the other, and you get **two** topics. You tune one; the code reads the other, which never changes. Java cannot help, because to the compiler both are just text.

**Trap 3: the log cannot see it.** `SmartDashboard.getNumber` reads NetworkTables directly, the way a plain `SendableChooser` does. AdvantageKit never records the value. Tune the follower down to `2.5`, and the log of that run says nothing about it. Replay the log in Chapter 24, and the code runs with `3.0`, steers differently, and the replay no longer matches what the robot did.

**Trap 4: no off switch.** At a competition, the tuning numbers are still on the dashboard, and still change the robot. A mis-click on the wrong tab in the pit, or a dashboard that loads an old layout with old values, and the robot drives a match with gains nobody chose.

### What a better tunable number looks like

Turn the four traps around, and you have a design:

1. **Publish the default once,** and never overwrite what the dashboard says. (Trap 1.)
2. **Type the key once,** in one place, and have the rest of the code use a Java variable, which the compiler checks. (Trap 2.)
3. **Record every value as an input,** so the log and replay know about it. (Trap 3.)
4. **One switch turns all tuning off,** and then every number is just its value from the code. (Trap 4.)

AdvantageKit already solves the first and third. Its `LoggedNetworkNumber` publishes a default once, reads the dashboard's value once per loop (at the same moment it reads the chooser), and records it under `NetworkInputs` in the log. AdvantageKit's documentation recommends it for exactly this job, and recommends putting tunable values in a table named `/Tuning`, which AdvantageScope's **tuning mode** knows how to edit.

The other two are yours to write: a small class that types the key once, adds the off switch, and that every command can share. That is the next section.

---

## 23.8 New Java: One Object, Shared by Every Command

Go back to Section 23.1's question. The Explorer has eight heading controllers, in eight command objects. You want **one** number on the dashboard, `Heading kP`, and every one of the eight to use it.

### Instance or static?

Chapter 7 drew the line between the two kinds of field:

- An **instance** field belongs to one object. Every `DriveDistance` object has its own `distanceMeters` and its own `startDistanceMeters`, because each one drives its own distance from its own start.
- A **`static`** field belongs to the **class**. There is exactly one, shared by every object of the class, and it exists even if no object has been created yet.

A PID controller has to be an instance field: it remembers this run's error, and two commands must never share one (Chapter 15's "one controller per job"). But a **gain** is not about one run. `Heading kP` describes how this drivetrain should be steered, by every command, in every run. One number for the whole program: that is `static`.

So the gains will be `static` fields of `Drivetrain`, next to the constants they start from. Each one will hold a `TunableNumber`, a small class you will write in a moment. Here is one of them:

```java
private static final TunableNumber headingKp = new TunableNumber("Drivetrain/Heading kP", HEADING_KP);
```

There is exactly one `headingKp` in the whole program. The first time any code uses the `Drivetrain` class, Java runs its `static` field initializers once, from top to bottom, and creates it. Every command's `initialize()` then asks that one object for the latest value.

### `final`, again: the variable does not change, the object can

Look at that line again: `static final`. Since Chapter 8, `static final` has meant "a constant." But this field is the opposite of a constant. Its whole purpose is that its value **changes** while the robot runs. How can it be `final`?

Because `final` is about the **variable**, not the object. Chapter 10 showed that a variable of a class type holds a **reference**: an arrow pointing at an object. `final` means that the arrow can never be pointed at a different object. It says nothing about whether the object it points to can change.

- `headingKp` will point at the same `TunableNumber` object for the whole life of the program. Nobody can write `headingKp = new TunableNumber(...)` somewhere else and quietly break the link to the dashboard. `final` guarantees that.
- The `TunableNumber` object itself can report a new value every time someone types one into the dashboard. `final` does not stop that.

Chapter 14 met the other half of this idea. `START_POSE` is `static final` **and** a true constant, because `Pose2d` is **immutable**: no method can change a `Pose2d` object after it is made. A `static final` reference to an immutable object is a constant. A `static final` reference to a **changeable** object is a fixed link to something that changes.

| Declaration | Can the variable point elsewhere? | Can its value change? | Name it |
|---|---|---|---|
| `static final double HEADING_KP = 0.3;` | No | No | `UPPER_SNAKE_CASE`: a constant |
| `static final Pose2d START_POSE = new Pose2d();` | No | No (`Pose2d` is immutable) | `UPPER_SNAKE_CASE`: a constant |
| `static final TunableNumber headingKp = ...;` | No | **Yes** (that is the point) | `camelCase`: not a constant |

That last column is a naming rule the book follows from now on, and so do most Java style guides: **`UPPER_SNAKE_CASE` is only for values that can never change.** A `static final` field that points at something changeable is named like any other variable, in `camelCase`. The name tells a reader, before they look anywhere else, "this one moves."

> **Shared, changeable state: handle with care**
>
> A `static` field that changes is shared by every object in the program, which is exactly what you want for a gain, and exactly what makes shared, changing state dangerous in general: any code anywhere can be affected by a change made somewhere else. That is why the book has avoided it until now, and why it is used here for one narrow job. The tunable numbers can only be changed from one place, the dashboard; no robot code ever sets them; and with tuning mode off, they never change at all. If you find yourself wanting a `static` field that robot code changes, stop and look for an object that should own it instead.

### Writing `TunableNumber`

Here is the class. It goes in a new package, `frc.robot.util`, for small helpers that are not subsystems or commands. In VS Code, right-click `src/main/java/frc/robot`, choose **New Folder...**, and name it `util`. Then create `TunableNumber.java` in it. Type it, do not paste:

```java
package frc.robot.util;

import frc.robot.Constants;
import org.littletonrobotics.junction.networktables.LoggedNetworkNumber;

/**
 * A number you can change from a dashboard while the robot runs (Chapter 23). It
 * appears in the Tuning table in Elastic and AdvantageScope, and AdvantageKit logs
 * every change. With Constants.TUNING_MODE off, it is simply its default value.
 */
public class TunableNumber {

    private final double defaultValue;

    // The number on the dashboard, or null when tuning mode is off.
    private final LoggedNetworkNumber dashboardNumber;

    /**
     * Create a tunable number.
     *
     * @param key its name on the dashboard, in the Tuning table; slashes make folders
     * @param defaultValue the value from the code, used until someone changes it
     */
    public TunableNumber(String key, double defaultValue) {
        this.defaultValue = defaultValue;
        dashboardNumber = Constants.TUNING_MODE
            ? new LoggedNetworkNumber("/Tuning/" + key, defaultValue)
            : null;
    }

    /**
     * The value to use right now.
     *
     * @return the dashboard's value in tuning mode, otherwise the default
     */
    public double get() {
        if (dashboardNumber == null) {
            return defaultValue;
        }
        return dashboardNumber.get();
    }

    /**
     * The value from the code, whatever the dashboard says.
     *
     * @return the default value
     */
    public double getDefault() {
        return defaultValue;
    }
}
```

Walk through it, trap by trap:

- **The key is typed once,** as the constructor's first argument. Everywhere else, code uses the Java variable (`headingKp.get()`), and a misspelled variable is a compile error, not a silent second topic. (Trap 2.)
- **`"/Tuning/" + key`** puts every tunable number in the `/Tuning` table, so they all appear together, in one folder, on every dashboard. A key with a slash, like `"Drivetrain/Heading kP"`, makes a folder inside it.
- **`LoggedNetworkNumber`** publishes the default **once**, when it is created, and never again. After that, it only reads. Your code can never overwrite a value someone typed. (Trap 1.) It also reads the dashboard once per loop, at the start of the loop, and records what it read in the log, so the log and replay know every value the robot used. (Trap 3.)
- **`Constants.TUNING_MODE`** is the off switch. When it is `false`, the constructor creates no `LoggedNetworkNumber` at all: nothing is published, nothing is read, and `get()` returns the default from the code. (Trap 4.)
- **`dashboardNumber` is `final`, and it is set in the constructor on both paths** of the ternary (Chapter 8): either to a new `LoggedNetworkNumber`, or to `null`. Java lets a `final` field be assigned in the constructor exactly once, on every path (Chapter 14). Here `null` means what Chapter 10 said it means: "there is no object here." And `get()` checks for it before calling a method on it, the same habit as the chooser's `null` check.
- **`getDefault()`** answers "what does the code say?" whatever the dashboard says. You will use it when it is time to write your tuned values down.

> **Why not just use `LoggedNetworkNumber` everywhere?**
>
> You could, and many teams do. `TunableNumber` adds two small things: the `/Tuning` folder is typed once, in one place, instead of in every key, and one constant turns all tuning off for competition. Writing a small class that wraps a library class, to add exactly what your team needs, is a very common move. Team 6328, the team that writes AdvantageKit and AdvantageScope, has a class in its own robot code called `LoggedTunableNumber` that does the same job, with a few extras.

---

## 23.9 Every Gain on One Tab

Now wire it in: one switch in `Constants`, six tunable gains in `Drivetrain`, one line in each driving command, and three tunable numbers in `FollowLine`. Work through the steps in order, building after each one.

### Step 1: The off switch

In `Constants.java`, add a second top-level constant, right after `USE_SIMULATED_ROBOT`:

```java
// Live tuning from the dashboard (Chapter 23): true while developing, false at competition.
public static final boolean TUNING_MODE = true;
```

### Step 2: `TunableNumber`

Create `frc/robot/util/TunableNumber.java` from Section 23.8, if you have not already. Build.

### Step 3: The drivetrain's gains

Open `Drivetrain.java` and import the new class:

```java
import frc.robot.util.TunableNumber;
```

Find the PID constants that Chapter 19 moved here, and add this block right after the last of them, `HEADING_RATE_TOLERANCE_DEGREES_PER_SECOND`:

```java
// Live-tunable copies of the six PID gains (Chapter 23): one of each, shared by every
// command that drives this drivetrain. The constants above are their starting values.
private static final TunableNumber distanceKp =
    new TunableNumber("Drivetrain/Distance kP", DISTANCE_KP);
private static final TunableNumber distanceKi =
    new TunableNumber("Drivetrain/Distance kI", DISTANCE_KI);
private static final TunableNumber distanceKd =
    new TunableNumber("Drivetrain/Distance kD", DISTANCE_KD);
private static final TunableNumber headingKp =
    new TunableNumber("Drivetrain/Heading kP", HEADING_KP);
private static final TunableNumber headingKi =
    new TunableNumber("Drivetrain/Heading kI", HEADING_KI);
private static final TunableNumber headingKd =
    new TunableNumber("Drivetrain/Heading kD", HEADING_KD);
```

They go **after** the constants, because Java creates `static` fields from top to bottom, and each tunable starts from a constant. They are `private`: no other class needs the tunables themselves, only controllers set up with them, which the next methods provide.

Now replace the two factories, `createDistanceController()` and `createHeadingController()`, with these, and add the two new methods after them:

```java
/**
 * A new, ready-to-use controller for driving to a distance: meters in, meters per
 * second out. Each command makes its own, because a PID controller remembers.
 *
 * @return a distance controller with the latest gains and this drivetrain's tolerances
 */
public static PIDController createDistanceController() {
    PIDController controller =
        new PIDController(distanceKp.get(), distanceKi.get(), distanceKd.get());
    controller.setTolerance(
        DISTANCE_TOLERANCE_METERS, DISTANCE_RATE_TOLERANCE_METERS_PER_SECOND);
    return controller;
}

/**
 * A new, ready-to-use controller for facing a heading: degrees in, radians per
 * second out. Each command makes its own, because a PID controller remembers.
 *
 * @return a heading controller with the latest gains, and this drivetrain's
 *     tolerances and I zone
 */
public static PIDController createHeadingController() {
    PIDController controller =
        new PIDController(headingKp.get(), headingKi.get(), headingKd.get());
    controller.setTolerance(
        HEADING_TOLERANCE_DEGREES, HEADING_RATE_TOLERANCE_DEGREES_PER_SECOND);
    controller.enableContinuousInput(-180.0, 180.0);
    controller.setIZone(HEADING_I_ZONE_DEGREES);
    return controller;
}

/**
 * Give a distance controller the latest gains from the Tuning tab. Commands call this
 * in initialize(), so a new value takes effect the next time a command starts.
 *
 * @param controller the distance controller to update
 */
public static void useLatestDistanceGains(PIDController controller) {
    controller.setPID(distanceKp.get(), distanceKi.get(), distanceKd.get());
}

/**
 * Give a heading controller the latest gains from the Tuning tab. Commands call this
 * in initialize(), so a new value takes effect the next time a command starts.
 *
 * @param controller the heading controller to update
 */
public static void useLatestHeadingGains(PIDController controller) {
    controller.setPID(headingKp.get(), headingKi.get(), headingKd.get());
}
```

The factories changed in one way only: each controller starts with the **latest** gains instead of the constants. The two new methods do the same for a controller that already exists, with `PIDController.setPID(p, i, d)`. The tolerances, continuous input, and I zone are not tunable; they stay exactly as they were.

The public `DISTANCE_KP` and `HEADING_KP` constants do not change, and are still `public`. Chapter 22's tests use the tolerance constants, and you will copy your tuned values back into all of them at the end of Section 23.10.

### Step 4: Every driving command uses the latest gains

Each command creates its controllers once, when the command object is created at program start (Section 19.5). So a gain typed into the dashboard later would never reach a controller that already exists. The fix is one line per controller, in `initialize()`, which runs **every time** the command starts: Section 19.6's "once, or every time?" rule again.

In `TurnToHeading.java`, `initialize()` becomes:

```java
@Override
public void initialize() {
    headingController.reset();                            // a new job: forget the last one
    Drivetrain.useLatestHeadingGains(headingController);  // with the latest gains (Chapter 23)
    DataLogManager.log("TurnToHeading " + targetHeadingDegrees + " deg started");
}
```

In `DriveDistance.java`, add two lines after the two `reset()` calls:

```java
distanceController.reset();
headingController.reset();
Drivetrain.useLatestDistanceGains(distanceController);   // the latest gains (Chapter 23)
Drivetrain.useLatestHeadingGains(headingController);
```

And in `DriveUntilLine.java`, one line after its `reset()`:

```java
headingController.reset();
Drivetrain.useLatestHeadingGains(headingController);   // the latest gains (Chapter 23)
```

That is every PID controller in the Explorer. Build.

> **When does a new value take effect?**
>
> You just made a choice that deserves a second look: a new PID gain takes effect when a command **starts**, not in the middle of a run. Changing a gain halfway through a turn makes the controller's output jump, and changing kI after the error sum has built up can kick the robot hard. Worse, a run that used two sets of gains is a useless experiment: you cannot tell which gains did what. Applying gains at the start makes every run one clean test of one set of gains. And on the Test mode bench, starting the next run is one button press. The line follower, next, makes the other choice, on purpose.

### Step 5: The line follower's three numbers

Chapter 21 promised that `STEER_KP`, `SIDE_ERROR`, and the follow speed would become live controls. Open `FollowLine.java` and import:

```java
import frc.robot.util.TunableNumber;
```

Change the comment above `FOLLOW_METERS_PER_SECOND` and `STEER_KP`:

```java
// Driving along the line. Starting values: the Tuning tab can change them (Chapter 23).
```

Then add this block after `SEARCH_MAX_DEGREES`:

```java
// Live-tunable copies of three of the numbers above (Chapter 23): one of each, shared
// by every FollowLine, and read every loop. The constants are their starting values.
private static final TunableNumber followSpeed =
    new TunableNumber("FollowLine/Follow Speed (m per s)", FOLLOW_METERS_PER_SECOND);
private static final TunableNumber steerKp =
    new TunableNumber("FollowLine/Steer kP", STEER_KP);
private static final TunableNumber sideError =
    new TunableNumber("FollowLine/Side Error", SIDE_ERROR);
```

In `followSpeeds()`, use the tunables instead of the constants:

```java
/** Drive along the line, steering toward whichever sensor sees more black. */
private ChassisSpeeds followSpeeds() {
    double error = getSteeringError();
    lastSteeringError = error;
    double turnRate = MathUtil.clamp(steerKp.get() * error,
        -Drivetrain.AUTO_TURN_RADIANS_PER_SECOND, Drivetrain.AUTO_TURN_RADIANS_PER_SECOND);
    return new ChassisSpeeds(followSpeed.get(), 0.0, turnRate);
}
```

The follower reads these two **every loop**. That is the right choice here, and the opposite of the PID gains. Its steering is a P controller with no memory: no error sum, no last error. Changing the gain changes how hard it steers from this loop on, and nothing jumps. And a line follow lasts several seconds, along a whole bend. Being able to lower `Steer kP` **while** the robot wiggles down the tape, and watch the wiggle shrink, is exactly what you want.

### Step 6: `SIDE_ERROR` without breaking the tests

`SIDE_ERROR` is different. It is used inside `decideNextState()`, which Chapter 22 made a **pure function**: every fact comes in as a parameter, and it reads nothing else. A tunable side error is a new fact, so it must come in as a new parameter. If `decideNextState()` read `sideError.get()` itself, it would no longer be pure.

But fourteen tests call `decideNextState()` with four arguments, and they should not all have to change. Chapter 11's **overloading** solves it, exactly the way Chapter 22 used two constructors for `RobotContainer`. Replace `decideNextState()` and `stateForLostLine()` with these three methods:

```java
/**
 * The transitions, using the side error from the code, SIDE_ERROR. Chapter 22's
 * tests ask this version their questions.
 *
 * @param state the state the follower is in now
 * @param lineSeen true if either reflectance sensor sees the line
 * @param lastSteeringError the steering error the last time the line was seen
 * @param searchedDegrees how far the robot has turned since its search began
 * @return the state to be in next
 */
static State decideNextState(
        State state, boolean lineSeen, double lastSteeringError, double searchedDegrees) {
    return decideNextState(state, lineSeen, lastSteeringError, searchedDegrees, SIDE_ERROR);
}

/**
 * The transitions (Section 21.5): given the state we are in and what the robot
 * knows, where next? Every fact, including the side error (tunable since Chapter 23),
 * comes in through a parameter, and it changes nothing.
 *
 * @param state the state the follower is in now
 * @param lineSeen true if either reflectance sensor sees the line
 * @param lastSteeringError the steering error the last time the line was seen
 * @param searchedDegrees how far the robot has turned since its search began
 * @param sideError an error bigger than this means the line was off to one side
 * @return the state to be in next
 */
static State decideNextState(State state, boolean lineSeen, double lastSteeringError,
        double searchedDegrees, double sideError) {
    return switch (state) {
        case FOLLOWING -> lineSeen ? State.FOLLOWING : stateForLostLine(lastSteeringError, sideError);
        case SEARCHING_LEFT, SEARCHING_RIGHT ->
            lineSeen ? State.FOLLOWING : stateForSearch(state, searchedDegrees);
        case END_OF_LINE, GAVE_UP -> state;   // finished: stay finished
    };
}

/** The line just disappeared. Where was it, the last time we saw it? */
private static State stateForLostLine(double lastSteeringError, double sideError) {
    if (lastSteeringError > sideError) {
        return State.SEARCHING_LEFT;
    }
    if (lastSteeringError < -sideError) {
        return State.SEARCHING_RIGHT;
    }
    return State.END_OF_LINE;   // it was right under us, and then it was gone
}
```

Finally, in `execute()`, the decide step gathers one more fact:

```java
// 1. Decide: does this loop's reading move us to a new state?
State next = decideNextState(
    state, isLineSeen(), lastSteeringError, getSearchedDegrees(), sideError.get());
```

Look at the shape. The **thin part**, `execute()`, gathers the facts from the robot, now including the dashboard. The **pure part**, the five-parameter `decideNextState()`, decides. The four-parameter version is a one-line convenience that supplies `SIDE_ERROR`, so the tests keep asking their questions in exactly the words they used before. Not one rule changed, and `SIDE_ERROR` is still a package-private constant, so every test that builds its pretend errors from it still works.

Build. All twenty-four tests should still pass.

> **If your `FollowLine` has `WAITING_FOR_CLEAR`**
>
> If your pair merged Chapter 21's Collab lab, and you gave `decideNextState()` an `obstacleAhead` parameter in Section 22.4, keep it: the long version takes `obstacleAhead` and then `sideError` last, and the short version passes `SIDE_ERROR` for it. Pass `sideError` on to `stateWhileFollowing()`, and from there to `stateForLostLine()`.

### Step 7: Three more tests

The tests from Chapter 22 still check every rule, with `SIDE_ERROR`. Now check the new parameter. Add these two tests at the end of `FollowLineTest`:

```java
// Live tuning (Chapter 23): the side error can come from the dashboard.

@Test
void aSmallerSideErrorTurnsTheSameLossIntoASearch() {
    double lastError = 0.15;   // between the two side errors below
    assertEquals(State.END_OF_LINE, FollowLine.decideNextState(
        State.FOLLOWING, LINE_LOST, lastError, NOT_SEARCHING, 0.2));
    assertEquals(State.SEARCHING_LEFT, FollowLine.decideNextState(
        State.FOLLOWING, LINE_LOST, lastError, NOT_SEARCHING, 0.1));
}

@Test
void theShortVersionUsesSideErrorFromTheCode() {
    assertEquals(
        FollowLine.decideNextState(
            State.FOLLOWING, LINE_LOST, LINE_WAS_LEFT, NOT_SEARCHING, FollowLine.SIDE_ERROR),
        FollowLine.decideNextState(State.FOLLOWING, LINE_LOST, LINE_WAS_LEFT, NOT_SEARCHING));
    assertEquals(
        FollowLine.decideNextState(
            State.FOLLOWING, LINE_LOST, LINE_WAS_CENTERED, NOT_SEARCHING, FollowLine.SIDE_ERROR),
        FollowLine.decideNextState(State.FOLLOWING, LINE_LOST, LINE_WAS_CENTERED, NOT_SEARCHING));
    assertEquals(
        FollowLine.decideNextState(
            State.FOLLOWING, LINE_LOST, LINE_WAS_RIGHT, NOT_SEARCHING, FollowLine.SIDE_ERROR),
        FollowLine.decideNextState(State.FOLLOWING, LINE_LOST, LINE_WAS_RIGHT, NOT_SEARCHING));
}
```

The first test types its numbers in, on purpose. It is not checking your tuned side error; it is checking the **rule** that a parameter is used at all: the same lost line is "the end" with a side error of 0.2, and "search left" with 0.1. Chapter 22's Collab asked when a number in a test is a requirement rather than a copy of a tuning value. This is a requirement. The second test checks that the short version really does pass `SIDE_ERROR` along: for a line lost on the left, in the middle, and on the right, asking the short version gives the same answer as asking the long one with `SIDE_ERROR`. Notice that this `assertEquals` compares two answers from the code with each other, instead of an answer with a value you typed. That is a useful trick when the exact answer does not matter, only that two ways of asking agree.

Then a test for the new class. Create `src/test/java/frc/robot/util/TunableNumberTest.java`:

```java
package frc.robot.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** Tests for TunableNumber. In a test, nobody is typing into a dashboard. */
class TunableNumberTest {

    private static final double DELTA = 1e-9;

    @Test
    void startsAtTheValueFromTheCode() {
        TunableNumber number = new TunableNumber("Test/Starts At Default", 1.5);
        assertEquals(1.5, number.get(), DELTA);
        assertEquals(1.5, number.getDefault(), DELTA);
    }
}
```

Run **WPILib: Test Robot Code**. The report shows **27 tests**, all green.

> **Tuning never leaks into the tests**
>
> A `LoggedNetworkNumber` reads the dashboard only when AdvantageKit's logger runs its loop, at the start of every robot loop. Tests never start the logger, and there is no dashboard on GitHub's runner anyway. So in every test, every `TunableNumber` is exactly its default, the number in your code. That is what keeps the tests deterministic (Chapter 22): what you typed into Elastic this afternoon can never make a test pass on your laptop and fail on GitHub. It also means the tests check the numbers you **committed**, not the ones you are trying. Section 23.10 turns that into a habit.

### Step 8: The Tuning tab

Run the Explorer, and in Elastic, switch to your empty **Tuning** tab. Open **Add Widget**. There is a new table at the top level, **Tuning**, next to **SmartDashboard** and **AdvantageKit**. Open it, and you will find two folders, **Drivetrain** and **FollowLine**, holding your nine numbers, each showing its value from the code.

Drag all nine onto the Tuning tab. Group them by job: the three distance gains together, the three heading gains together, and the follower's three. Elastic shows each as a **Text Display**. To change one, click in it, type the new value, and press **Enter**. (If your version of Elastic shows a submit button instead, use that. Right-click, **Edit Properties**, can turn the button on or off.)

Then add the things you will want to **watch** while you tune, from the **SmartDashboard** table:

- `Heading (deg)`, as a **Graph**, for tuning turns.
- `Distance Error (m)`, as a **Graph**, for tuning `DriveDistance`.
- `Line Error`, as a **Graph**, and `Line State`, for tuning the follower.
- `Auto Routine`, a second copy of the chooser, so you never have to switch tabs to pick "Leg 1 Only."

Export the layout again, over the same `src/main/deploy/elastic-layout.json`.

Try one change before you go on. Make sure `Heading kP` shows `0.3` (or your own value). Click in it, type `0.6`, and press Enter. Now look at the Simulation GUI's **NetworkTables** window: under **Tuning** > **Drivetrain**, `Heading kP` reads `0.6` there too. One server, many clients, all agreeing. Set it back.

---

## 23.10 Tune the Course, Live

Now the payoff. You will tune the Explorer's turn, its drive, its line follower, and then the whole course, with the robot running the entire time.

### Ground rules for a tuning session

Live tuning makes it easy to change numbers fast. That is exactly its danger: change three things at once, and you learn nothing. Good tuning is an experiment, and the rules of a good experiment apply:

1. **One number at a time.** Change one, run, watch. Then decide whether to keep it.
2. **Same start, every run.** Put the robot back at the same spot, facing the same way. Use the Y button (reset pose) before every autonomous run.
3. **Write it down before you change it.** Keep a tuning log in `reflections.md` (a format is below). If you do not write down the old value, you cannot go back to it.
4. **Know what "better" means before you start.** Turn faster? Overshoot less? Stop closer? Decide first, so you know when you are done.

> **Reading a step response**
>
> When you ask a controller to go somewhere new (face 90 degrees instead of 0), and graph where the robot actually is, the curve is called a **step response**, and engineers describe it with four numbers. **Rise time**: how long it takes to get most of the way there. **Overshoot**: how far it swings past the target. **Settling time**: how long until it stays within the tolerance. **Steady-state error**: how far off it ends up, if it never quite gets there. Raising kP usually shortens the rise time and adds overshoot; kD reduces overshoot; kI removes steady-state error, and adds overshoot if there is too much of it. Every PID controller on every robot, from the XRP's heading to a competition arm in Chapter 34, is tuned by looking at these four things. Chapter 38 measures them properly, on a competition robot, with AdvantageScope.

### Session 1: The turn

1. Enable **Test** mode. On the Tuning tab, look at the `Heading (deg)` graph.
2. Press **B**. The robot turns to heading 90 (Chapter 19's tuning bench). Watch the graph: how quickly does it rise, does it go past 90, and how long until it settles?
3. Press **A** to turn back to 0. That run is another step, in the other direction.
4. Now change **one** gain. If the turn is slow and lazy, raise `Heading kP` a little (try 0.4 for 0.3). If it overshoots and swings back, lower it. Press B, then A. Compare the graph with the last run.
5. Repeat until the turn is quick and settles with little or no overshoot. If it stops a degree or two short and stays there, that is steady-state error: Chapter 15's kI is the tool for that, and Chapter 16's feedforward may have made it less necessary (many readers found kI could be 0 after Chapter 16). If it overshoots no matter what kP is, try a small kD.

Each change takes effect the **next** time a command starts (Section 23.9), so every press of A or B is a clean run with the gains on the screen.

### Session 2: The drive

1. Still in Test mode, watch the `Distance Error (m)` graph. Press **X** (drive out 0.30 m), then **Back** (drive back).
2. Tune `Distance kP` the same way: fast, without overshooting the target. The heading gains are already tuned, so the robot should stay straight while you work.
3. Now test it in its real job. Disable, pick **Leg 1 Only** in the chooser, press **Y**, put the robot at the start line, and enable **Autonomous**. The robot drives leg 1 and stops. Is it at the corner? Measure. Run it three times, and see how much it varies.

### Session 3: The line follower, while it follows

1. Put the robot on a strip of tape with a gentle bend, and enable **Teleop**. Hold the **left bumper**.
2. Watch the `Line Error` graph as it follows. A wiggle along a straight line shows as a wave in the graph.
3. While it is following, lower `Steer kP` (try 2.5 for 3.0) and press Enter. The follower reads it on the very next loop: you can watch the wave in the graph get smaller, and the robot settle down, in the middle of one run.
4. Try `Follow Speed (m per s)` the same way. Faster runs are tempting, but the follower has less time to react on a bend.
5. Last, `Side Error`, on a right-angle corner. If the robot logs `END_OF_LINE` at the corner instead of searching (Section 21.9's tuning table), lower `Side Error` and try again. Then check the real end of the tape: it should still say `END_OF_LINE` there, not search.

### Session 4: The whole course

Pick **Obstacle Course**, press Y, and run autonomous. Run it three times without changing anything. If one leg is the weak spot, use **Leg 1 Only**, the bench, or the left bumper to work on that leg alone, then come back and run the whole course again.

### Keep a tuning log

Every change goes in a table in `reflections.md`, as you make it:

```markdown
## Tuning log, Chapter 23

Surface: kitchen floor, tape: black electrical. Battery: fresh.

| Number | Was | Tried | What I saw | Keep? |
|---|---|---|---|---|
| Heading kP | 0.3 | 0.4 | B turn: faster, 3 deg overshoot | Yes |
| Heading kI | 0.5 | 0.0 | stops 1 deg short, no overshoot | Yes |
| Steer kP | 3.0 | 2.5 | wave on straight tape gone | Yes |
```

A log like this is how a team remembers **why** a number is what it is, long after everyone has forgotten the afternoon. When a gain looks strange next season, the log says what it was tried against, and on which floor.

### Make it permanent

When the course runs well, the numbers that make it work exist only on the dashboard and in your log. Stop the program, and they are gone. So write them into the code:

1. Copy each kept value into its **constant**: `DISTANCE_KP` and the rest in `Drivetrain`, `STEER_KP`, `FOLLOW_METERS_PER_SECOND`, and `SIDE_ERROR` in `FollowLine`.
2. Build. The build runs every test **with your new numbers**: `FollowLineTest` builds its pretend errors from your new `SIDE_ERROR`, `DriveCommandsTest` drives the simulated robot with your new gains, and `ObstacleCourseTest` runs the whole course with them. If they all pass, your new tuning works on the model of your robot too.
3. Run the Explorer again, and check the Tuning tab: every number should now start at your new value.
4. Commit and push (see the Git exercise). GitHub runs the tests again. The green check now means "these are the numbers we tuned, and they still pass everything."

If a test goes **red** after you copy your numbers in, do not just change the test. Chapter 22 said a failing test is a question. Maybe your new heading gains overshoot on the simulated robot by more than the tolerance, because the model is lighter than your real Explorer (or heavier). That is worth knowing, and worth one sentence in your tuning log, before you decide what to change.

> **Tuning the simulated Explorer**
>
> Everything in this section works on the simulated robot too: set `USE_SIMULATED_ROBOT = true`, and the Tuning tab tunes the model from Chapter 17. That is a great way to practice the routine without tape and batteries. But numbers tuned on the model are tuned for the model. The real Explorer has friction the model does not, a battery that sags, and wheels that slip. Tune on the floor, and use the simulator to practice and to check that nothing is broken.

Diagnose anything strange:

| What you see | Most likely cause |
|---|---|
| Elastic says **Network Tables: Disconnected** | The robot program is not running, or the **IP Address Mode** is not **localhost** |
| The **Tuning** table is missing in Add Widget | `TUNING_MODE` is `false`, or the program has not created any command or drivetrain yet. Check that the program started |
| You type a new gain and the robot does not change at all | For the PID gains: the command was already running, and the new value applies at its next start. Press the button again. If it never applies, the `useLatest...Gains` line is missing from that command's `initialize()` |
| A value snaps back to the old number a moment after you type it | Something is publishing over it every loop: a leftover `SmartDashboard.putNumber` with the same name (Section 23.7's Trap 1) |
| The Tuning tab shows an old tuned value after you copied new numbers into the code and restarted | A dashboard can keep the last value it was given and send it again when it reconnects. Close and reopen Elastic, and check the value again |
| `Auto Routine` is missing from the SmartDashboard table | `autoChooser` is not created, or the program crashed while starting. Read the terminal from the top |
| Autonomous runs the obstacle course whatever you pick | The dropdown was changed after autonomous was enabled (it is read once, in `autonomousInit()`), or `getAutonomousCommand()` still returns `obstacleCourse` |
| `Commands that have been composed may not be added to another composition` when the program starts | Two chooser options share one command object. Each option needs its own (`holdStill()` is a factory for a reason) |
| `cannot find symbol: class TunableNumber` | The `import frc.robot.util.TunableNumber;` line is missing, or the file is not in a `util` folder with `package frc.robot.util;` |
| `illegal forward reference` on a `TunableNumber` line | The tunable is above the constant it starts from. Move the block below the constants |

---

## 23.11 Dashboards at Competition

Everything in this chapter so far is for the pit, the shop, and your kitchen floor. A competition is different, and so is the dashboard.

### What the drive team needs

On the field, the dashboard has one main job: make sure the robot does what the drive team expects. That means the **Driver** tab, locked, with the autonomous chooser where nobody can miss it. Many teams add a check to their queue routine: before the match, the drive coach reads the chooser's selection aloud, and the driver confirms it. A robot that runs the wrong autonomous perfectly still loses the points.

### Turn tuning off

Before an event, set `TUNING_MODE` to `false`, build, run the tests, and commit. With tuning off, no tunable number is published at all, so nothing typed into a dashboard, by anyone, can change a gain during a match, and the robot runs exactly the numbers that your tests checked and your commit recorded. Chapter 39's competition-day checklist includes this switch, along with tagging the release that goes on the robot.

### On the Mini Swerve

When your code moves to the roboRIO in Chapter 26, the NetworkTables server moves with it (Section 23.2), and Elastic connects with **IP Address Mode** set to **Driver Station** instead of **localhost**. The Driver tab, the chooser, `TunableNumber`, and the Tuning tab all come along unchanged. That is one advantage of keeping the dashboard layout in your repository: the next robot starts with a working dashboard.

WPILib also has a class called `Preferences`, which saves named values in a file on the roboRIO, so they survive a reboot. Some teams tune with it. The book does not, for the reason in Section 23.1: the place a tuned number belongs is your code, in Git, where the tests check it and the history explains it.

> **AdvantageScope can tune too**
>
> AdvantageScope, which you will spend all of Chapter 24 in, has a **tuning mode**. When it is connected with the **NetworkTables 4 (AdvantageKit)** live source, it shows values in the `/Tuning` table, and clicking the slider icon next to its search bar makes them editable, right next to its graphs. That is why `TunableNumber` puts everything in `/Tuning`: Elastic and AdvantageScope both find your numbers there. AdvantageScope's graphs are far more powerful than Elastic's, so many programmers tune there and drive from Elastic. Try it in Practice 7.

### What you built

- **One dashboard, two jobs.** A **Driver** tab with the autonomous chooser, the mode, the field, and the robot's status, and a **Tuning** tab with nine live numbers and the graphs to judge them. Both are saved in your repository.
- **An autonomous chooser** with four routines, logged by AdvantageKit, defaulting to the course, safe even before its first loop.
- **Nine tunable numbers**, each a single object shared by every command that uses it, published once, read when it matters, logged every loop, and switched off with one constant.
- **A tuning routine**: change one number, run, log it, keep it in the code, and let the tests check it.

---

## Chapter Summary

> **What you learned in Chapter 23**
>
> * A dashboard is a **NetworkTables** client. The robot program runs the server (on your laptop for the XRP, on the roboRIO later), values live in **topics** with folder-like names such as `/SmartDashboard/Heading (deg)`, and any client can publish a new value that the robot reads back.
> * For 2026, WPILib's documentation calls the **SmartDashboard and Shuffleboard apps** deprecated, to be removed for 2027, and recommends **Elastic** as the driver dashboard and **AdvantageScope** for debugging and data. The **`SmartDashboard` class** in your code is not deprecated; it writes into the `/SmartDashboard` table, which every dashboard reads.
> * Your **Elastic** layout has a locked **Driver** tab and a **Tuning** tab, and it is exported to `src/main/deploy/elastic-layout.json` and committed, so the whole team gets the same dashboard.
> * New Java: **generics**. A generic class like `SendableChooser<V>` has a **type parameter**; `SendableChooser<Command>` supplies a **type argument**, so the compiler checks what goes in and what comes out needs no cast. The **diamond** `<>` fills it in from the left; **wrapper classes** (`Double`) stand in for primitive types; **raw types** throw away the checking.
> * AdvantageKit's **`LoggedDashboardChooser<Command>`** picks the autonomous routine and records the choice for replay. `getAutonomousCommand()` falls back to the course when the chooser has no answer yet, which keeps `ObstacleCourseTest` passing.
> * New Java: a **`static final` reference to a changeable object**. `final` fixes which object a variable points at, not whether the object can change. One `static` `TunableNumber` per gain is shared by every command; it is named in `camelCase` because it is not a constant. `TunableNumber` wraps AdvantageKit's `LoggedNetworkNumber` to avoid the four traps of `SmartDashboard.getNumber` (overwriting, typo keys, invisible to the log, no off switch), with `TUNING_MODE` as the off switch.
> * PID gains take effect when a command **starts**; the follower's gains every **loop**. `decideNextState()` stays a pure function by taking the side error as a parameter, with an **overload** that keeps the old tests unchanged. Tuning is an experiment: one change at a time, read the **step response**, keep a log, and copy the winners into the code, where the tests check them.

---

## Exercises

### Practice

**1. Find it on the server.** Run the Explorer and open the Simulation GUI's **NetworkTables** window. Before you look, write down in `reflections.md` which table you expect each of these to be in: `Line State`, `Steer kP`, `Auto Routine`, and the drivetrain's left distance from Chapter 17. Then find each one, and write down its full topic name (for example, `/SmartDashboard/Line State`). Which one surprised you? Then open the **AdvantageKit** table and look for a folder named `NetworkInputs`. What is in it, and why is it there?

**2. Spring the trap.** In a practice branch, add this line at the end of `updateDashboard()` in `RobotContainer`:

```java
SmartDashboard.putNumber("Trap Demo", 1.0);
```

Run the Explorer, put `Trap Demo` on an Elastic tab, and try to change it to `5.0`. What happens? Now delete that line and put this one in the `RobotContainer` constructor instead:

```java
SmartDashboard.setDefaultNumber("Trap Demo", 1.0);
```

Try again. In two sentences, explain the difference, using the words "every loop." Then delete the practice branch.

**3. Predict the compiler.** In a practice branch, create a class `GenericsDrill` in `frc.robot` with a method containing these lines. Before you build, write next to each line whether it compiles, and if not, roughly what Java will say. Then build and compare.

```java
SendableChooser<String> colors = new SendableChooser<>();
colors.addOption("Red", "red");
colors.addOption("Blue", 2);
String picked = colors.getSelected();
double number = colors.getSelected();
SendableChooser<double> speeds = new SendableChooser<>();
SendableChooser<Double> speedsAgain = new SendableChooser<>();
speedsAgain.addOption("Slow", 0.1);
double slow = speedsAgain.getSelected();
```

One of the lines that compiles could still crash **when the program runs**, on a robot where nobody has picked anything yet. Which one, and why? (Hint: these choosers have no default option. What does `getSelected()` return when there is no default and no selection, and what happens when Java tries to unbox that into a `double`?) Which line returns the same thing, but does not crash?

**4. One more knob.** Make `SEARCH_RADIANS_PER_SECOND` tunable too. First decide: should it take effect every loop, like `Steer kP`, or only when a search starts? Write one sentence defending your choice. Then implement it, add it to the Tuning tab, and test it on a right-angle corner. Does a faster search find the corner more reliably, or does it sweep past the tape between two loops (Section 21.9)?

**5. A button on the dashboard.** Every `Command` can be put on the dashboard with `putData`, and Elastic draws it as a button. In a practice branch, add this to the end of the `RobotContainer` constructor:

```java
SmartDashboard.putData("Run Leg 1", buildLeg1Only());
```

Put `Run Leg 1` on an Elastic tab, and click it while the robot is **disabled**. What happens, and why? (Section 18.5.) Now enable teleop and click it. Then answer: why would a drive team not want a button like this on the **Driver** tab? Why is it handy on a programmer's tab?

**6. Download the layout from the robot.** Elastic can fetch a layout from a web server in the robot program. In a practice branch, add these imports and this line at the end of the `RobotContainer` constructor:

```java
import edu.wpi.first.net.WebServer;
import edu.wpi.first.wpilibj.Filesystem;
```

```java
// Serve src/main/deploy, so Elastic can download the layout (Elastic: File > Load Layout From Robot).
WebServer.start(5800, Filesystem.getDeployDirectory().getPath());
```

Run the Explorer. In Elastic, choose **File** > **Load Layout From Robot**. Does it find your `elastic-layout.json`? On a roboRIO, this is how a team makes sure every Driver Station laptop gets the same dashboard: the layout is deployed with the code. On the Explorer, the "robot" serving the file is your own laptop. Write down what happened, and why this would matter more on a team with three Driver Station laptops.

**7. Tune in AdvantageScope.** Open AdvantageScope (**WPILib: Start Tool** > **AdvantageScope**) and connect with **File** > **Connect to Simulator** > **NetworkTables 4 (AdvantageKit)**. Find the **Tuning** table in the sidebar. Turn on **tuning mode** with the slider icon to the right of the search bar (it turns purple), and change `Heading kP` there. Make a **Line Graph** of the drivetrain's heading input, run the bench turn (Test mode, B then A), and compare the graph with Elastic's. Which tool would you rather tune in, and which would you rather drive with? (AdvantageScope's documentation on tuning mode: [docs.advantagescope.org/overview/live-sources/tuning-mode](https://docs.advantagescope.org/overview/live-sources/tuning-mode).)

### Build (XRP Explorer)

Give the Explorer a real dashboard, an autonomous chooser, and live tuning, then tune the whole course.

1. Make a branch (see the Git exercise).
2. Open Elastic, connect with **localhost**, and build the **Driver** tab (Section 23.4). Add the empty **Tuning** tab. Export the layout to `src/main/deploy/elastic-layout.json`. Commit.
3. Add the autonomous chooser to `RobotContainer` (Section 23.6, Steps 1 and 2). Build: 24 tests pass. Delete the `null` check, see `ObstacleCourseTest` fail, and put it back. Add `Auto Routine` to the Driver tab, and run **Leg 1 Only** and **Obstacle Course** in autonomous. Export the layout again. Commit.
4. Add `TUNING_MODE` and `TunableNumber`, and wire in the six drivetrain gains, the `useLatest...Gains` lines in the three commands, and `FollowLine`'s three numbers (Section 23.9, Steps 1 to 6). Build. Drive the robot in teleop, run the bench in Test mode, and run the course: nothing should behave differently, because every tunable starts at its constant.
5. Add the three new tests (Step 7). Run them: **27 tests**, all green.
6. Build the **Tuning** tab (Step 8). Change `Heading kP` and check that the Simulation GUI's NetworkTables window agrees. Export the layout. Commit.
7. Tune: Sessions 1 to 4 of Section 23.10, on your real floor, with a tuning log in `reflections.md`.
8. Copy the values you kept into your constants. Build (every test runs with your new numbers). Restart the Explorer and check that the Tuning tab starts at the new values. Run the whole course three times. Commit, push, open a pull request, wait for the green check, and merge.

Leave `TUNING_MODE` set to `true` for now. Chapter 25, the capstone, turns it off for the release.

If the HTML report shows **27 tests, 0 failures**, your Driver tab picks the autonomous routine, and the course runs with numbers you tuned live, you are ready for Chapter 24.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. WPILib deprecated the SmartDashboard app, but you did not change a single `SmartDashboard.putNumber` in your code. Explain why, using the words **NetworkTables** and **client**.
2. A `SendableChooser` from before generics held plain `Object`s, and `getSelected()` needed a cast. Describe a mistake that the old way would only catch while the robot was running, and say how `SendableChooser<Command>` catches it earlier.
3. `headingKp` is declared `static final`, yet its value changes while the robot runs. Explain how both can be true, and why it is named `headingKp` and not `HEADING_KP_TUNABLE`.
4. The drivetrain's PID gains take effect when a command starts, but `Steer kP` takes effect every loop. Give one reason for each choice. What could go wrong if you applied a new `Heading kI` in the middle of a turn?
5. You tuned `Steer kP` down to 2.4 on the dashboard and the follower is perfect. You commit and push, and your teammate pulls and runs it. The follower wiggles again. What happened, and which step of Section 23.10 would have prevented it? Why is it a good thing that the tests never see a value typed into the dashboard?

If any answer feels shaky, re-read Sections 23.2, 23.5, 23.8, and 23.9.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b live-tuning
```

After Build step 2:

```bash
git add .
git commit -m "Ch23: Elastic dashboard with a Driver tab, saved in the project"
```

After Build step 3:

```bash
git add .
git commit -m "Ch23: Autonomous chooser on the dashboard"
```

After Build step 6:

```bash
git add .
git commit -m "Ch23: Live-tunable PID gains and line follower numbers"
```

After Build step 8, with your tuned values in the constants and your tuning log in `reflections.md`:

```bash
git status
git add .
git commit -m "Ch23: Gains from the live tuning session"
git push -u origin live-tuning
```

Check `git status` first: `src/main/deploy/elastic-layout.json`, `src/main/java/frc/robot/util/TunableNumber.java`, and `src/test/java/frc/robot/util/TunableNumberTest.java` should all be included. Open a pull request into `main`, wait for the green check, merge, delete the branch, and `git checkout main` and `git pull`.

Look at the history of one gain: `git log -p -- src/main/java/frc/robot/subsystems/Drivetrain.java` shows every change to the drivetrain, and your last commit shows each tuned number changing from its old value to its new one. Together with the tuning log, that is the full story of every number on your robot: what it was, what it is, and why.

### Collab: One Layout, Two Editors

A dashboard layout is a file, and two people can change it at once. This lab shows what that looks like in Git, and what to do about a file that a program writes.

As before, the **owner** is the person whose Explorer repository you use, and the **teammate** is the other partner. Both: finish this chapter's Build and merge it, so the owner's `main` has the layout file. The teammate pulls the owner's `main`.

**Part A: two dashboards, one file.** Work at the same time.

1. **Owner:** create a branch `driver-tab-range`. Open the layout in Elastic (**File** > **Open Layout**), add `Distance Ahead (m)` to the Driver tab, and export over `src/main/deploy/elastic-layout.json`. Commit (`Add the rangefinder to the Driver tab`), push, open a pull request, and merge it once it is green.
2. **Teammate:** create a branch `driver-tab-heading`. Open the same layout, add `Pose Heading (deg)` to the Driver tab, and export over the same file. Commit (`Add the heading to the Driver tab`) and push.
3. **Teammate:** bring `main` into your branch, as in Section 11.8: `git fetch origin`, then `git merge origin/main`. Git almost certainly reports a **conflict** in `elastic-layout.json`. Open it in VS Code and look at the conflict markers.

**Part B: do not hand-merge a generated file.** You could try to resolve those markers by hand, the Chapter 11 way. Look at them first: hundreds of lines of braces and numbers (widget positions, sizes, settings), and one misplaced comma makes the whole file unreadable to Elastic. A file that a **program** writes is not meant to be merged by a person. Instead:

1. **Teammate:** take `main`'s version of the file whole, which already has the owner's widget:

   ```bash
   git checkout --theirs src/main/deploy/elastic-layout.json
   ```

   During a merge, `--theirs` means "the version from the branch I am merging in," here `origin/main`.
2. Open that layout in Elastic, add **your** widget (`Pose Heading (deg)`) again, and export over the file.
3. `git add src/main/deploy/elastic-layout.json`, then `git commit` to finish the merge, and push. The pull request goes green. **Owner:** review it in Elastic, not just on GitHub: check out the branch, open the layout, and look at it. Then merge.

**Part C: whose floor?** Now the numbers.

1. **Teammate:** on a new branch, tune `Steer kP` on **your** floor and tape, live. Copy your value into `STEER_KP`, add your tuning log rows to the pull request's description (not just to your own `reflections.md`), and open the pull request.
2. **Owner:** before you merge, check out the branch and try the follower on **your** floor. Does it follow as well there? Add a review comment with what you saw.
3. **Both:** decide together. One gain for both floors? A compromise value? Or a note in the tuning log that says which surface the number was tuned for? Merge your decision.

Afterward, each of you adds a rule to the project's `CONTRIBUTING.md` (Chapter 11) about the layout file (for example: "Never hand-merge `elastic-layout.json`. Take one side, re-add your widgets in Elastic, and export.") and one about tuning (for example: "A pull request that changes a gain includes the tuning log rows that justify it."). In `reflections.md`, write two sentences: why is a merge conflict in a generated file different from one in code you wrote, and why does a tuned number need a note saying where it was tuned?

### Explore

- Read WPILib's **Dashboard Introduction** page and its list of dashboards. Then read the 2027 **Removed features** page (link in the resources below; it is for a season still in development). What else is being removed for 2027, besides the Java dashboards? Pick one and find out why.
- In Elastic's documentation, read the **Widgets List & Properties Reference**. Find two widgets you have not used yet, and describe which value from the Explorer you would show with each.
- Find Team 6328's robot code on GitHub, and search it for `LoggedTunableNumber`. Compare it with your `TunableNumber`. What can theirs do that yours cannot? (Look for a method that tells the code whether a value has **changed** since it last asked. Where would that be useful on the Explorer?)
- Read AdvantageKit's **Dashboard Inputs** page (link below). It shows the `LoggedDashboardChooser` you used and mentions two more logged classes for dashboard values. What are they, and what could the Explorer use them for?

---

> **Additional Resources**
>
> * **Dashboard Introduction (WPILib)**: [docs.wpilib.org/en/stable/docs/software/dashboards/dashboard-intro.html](https://docs.wpilib.org/en/stable/docs/software/dashboards/dashboard-intro.html) every dashboard that comes with WPILib, what each is for, and the 2026 deprecation notice for SmartDashboard and Shuffleboard
> * **Removed features, 2027 (WPILib)**: [docs.wpilib.org/en/latest/docs/yearly-overview/removed-features.html](https://docs.wpilib.org/en/latest/docs/yearly-overview/removed-features.html) what the 2027 season removes, and WPILib's advice to use Elastic and AdvantageScope instead
> * **Elastic documentation**: [frc-elastic.gitbook.io/docs](https://frc-elastic.gitbook.io/docs) connecting, widgets, tabs, layouts, and every widget's properties, from Team 353
> * **Dashboard Inputs (AdvantageKit)**: [docs.advantagekit.org/data-flow/recording-inputs/dashboard-inputs](https://docs.advantagekit.org/data-flow/recording-inputs/dashboard-inputs) why dashboard values are inputs, `LoggedDashboardChooser`, the logged number classes, and tuning with AdvantageScope
> * **Lesson: Generics (Oracle Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/generics/index.html](https://docs.oracle.com/javase/tutorial/java/generics/index.html) why generics exist, type parameters, the diamond, and raw types, with more detail than robot code needs

---

*Next up, Chapter 24: AdvantageScope: Visualizing and Replaying Logs. You will open the logs AdvantageKit has been writing since Chapter 17, scrub through a course run loop by loop, watch `FollowLine` change state on a timeline, and replay a run, chooser selection and tuned values included, to find a bug without the robot.*
