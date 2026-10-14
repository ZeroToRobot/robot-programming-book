# Chapter 18: Why Command-Based?

In Chapter 17 you split the drivetrain along a seam. The thinking stayed in `Drivetrain`, the hardware moved into `DrivetrainIOXRP` and `DrivetrainIOSim`, and the Explorer learned to drive a robot made of math. That was a big change to how one class is organized. This chapter is about how the **whole program** is organized.

Open `Robot.java` and scroll. Slowly. It has an autonomous routine written as a `switch`, with five step constants and a helper that starts each step. It has a teleop drive with a wall stop, a slow mode, and a turn limit. It has a PID tuning bench in Test mode, and right next to it, a SysId test runner with two safety nets and a latch. It has two PID controllers shared by three different jobs. And it has a group of fields under the comment "Remembered from loop to loop" that has grown every chapter since Chapter 10.

None of that is wrong. All of it works. But you have probably noticed that each new feature is harder to add than the last, and that every feature has to know about the others. This chapter starts with one small feature request and follows it until the problem is impossible to miss. Then it shows you how nearly every FRC team solves that problem: **command-based programming**, where the robot is described as **subsystems** (the parts) and **commands** (the actions), and a **scheduler** runs them for you.

This is a "why" chapter. You will not rebuild the Explorer here; that is the job of Chapters 19 and 20, one careful piece at a time. Here you will learn the ideas, so the rebuild makes sense, and you will make two small changes that every later chapter needs: you will start WPILib's command scheduler, and you will run your very first command on the Explorer, alongside all of your old code.

On the Java side, you will learn the one piece of Java that command-based code uses on nearly every line: the **lambda**, a way to hand a piece of code to someone else to run later.

You will need your XRP for the Build exercise. Most of the chapter is reading and thinking, so get comfortable.

---

## 18.1 One Small Feature Request

Here is a request your drive coach might make on any Tuesday:

> "When I hold A in teleop, can the robot turn itself to face the tape, at heading 90, and then give me the sticks back?"

It is a reasonable request. Real FRC drivers ask for exactly this kind of thing, usually called **auto-align**: the driver gets the robot close, holds a button, and the code lines it up perfectly with the goal. (In Chapter 33 the Mini Swerve does it for real, using a camera to find the target.) And you already have every piece you need: the heading PID controller, the `calculateTurnRate()` helper, and the constant `TURN_HEADING_DEGREES`.

So you write it. It goes in `teleopPeriodic()`, before the driver's sticks are read, because while the robot is aligning, the sticks should be ignored:

```java
// Hold A: turn to face the tape, then hand the sticks back.
if (controller.getAButtonPressed()) {
    headingController.reset();   // forget whatever job it was doing before
    aligning = true;
    DataLogManager.log("Align started");
}
if (aligning) {
    drivetrain.drive(0.0, calculateTurnRate(TURN_HEADING_DEGREES));
    if (headingController.atSetpoint() || !controller.getAButton()) {
        aligning = false;
        drivetrain.stop();
        DataLogManager.log("Align ended");
    }
    return;   // skip the rest of teleop: no driving by sticks while aligning
}
```

Plus one new field, in the "Remembered from loop to loop" group:

```java
private boolean aligning = false;
```

Read it aloud. "When A is first pressed, clear the heading controller and start aligning. While aligning, spin toward 90. Stop aligning when the heading is there or the driver lets go. While aligning, skip everything else in teleop."

You test it. It works. The robot spins to face the tape and stops. Ship it.

Then, two days later, three things happen.

**First**, at practice, the driver holds A, and halfway through the turn the robot is disabled (someone pressed Disable, or in a match, the match ended). `aligning` is still `true`. Nothing set it back, because `teleopPeriodic()` never ran again to notice. The next time the robot is enabled in teleop, before anyone touches anything, **it starts spinning**. That is not just a bug. On a full-size robot, that is how people get hurt. The fix is one line, `aligning = false;`, but it does not go in the align code. It goes in `disabledInit()`, a different method, far away, which you have to remember exists. (Look at your Chapter 16 SysId code: `disabledInit()` already has a line just like it, `changeSysIdTest(State.kNone)`, for exactly the same reason.)

**Second**, you notice that the wall stop's log messages are wrong. While aligning, the `return` skips the rest of `teleopPeriodic()`, including the code that updates `wasBlocked` and publishes `Blocked` and `Slow Mode`. Those widgets freeze while the robot aligns, and when the align ends, the "did it just change?" logic from Chapter 10 compares against a stale value. Your new feature broke an old one without touching a single line of it.

**Third**, a teammate wants the same align in autonomous, to straighten up before driving to the tape. But the turn code is now written in **three** places: the `STEP_TURN_LEFT` case in autonomous, the B button on the Test mode tuning bench, and now the A button in teleop. Each copy resets the controller in its own place, ends in its own way, and logs in its own words. A fix to one does not fix the others.

None of these are beginner mistakes. They are what happens to **every** robot program written this way once it gets big enough. Your Explorer just got big enough.

> **A common beginner mistake**
>
> Testing only the happy path. The align feature worked perfectly the first time you tried it, because you held A until it finished, then let go. Bugs in robot code hide on the paths nobody tests: disabling in the middle, pressing two buttons at once, switching modes mid-action. Whenever you add a behavior that lasts longer than one loop, ask: "What happens if it is interrupted?"

---

## 18.2 Five Growing Pains

Step back from the align feature and look at the whole of `Robot.java`. The trouble with the align code is not that you wrote it badly. It is that the program's **structure** gave you no good place to put it. The same five problems show up again and again.

### 1. "What am I doing right now?" is scattered across fields

Here are the fields in your "Remembered from loop to loop" group, and what each one is really for:

| Field | Which job it belongs to | What it remembers |
|---|---|---|
| `wasBlocked` | Teleop wall stop | Was the robot blocked last loop? |
| `autoStep` | Autonomous | Which step is running |
| `stepStartDistanceMeters` | Autonomous | Where the current step started |
| `benchTargetDistanceMeters` | Test mode tuning bench | Where the bench is driving to |
| `benchTargetHeadingDegrees` | Test mode tuning bench | Which way the bench is facing |
| `sysIdTest` | Test mode SysId | Which SysId test is running |
| `sysIdStartDistanceMeters` | Test mode SysId | Where the test started |
| `sysIdWaitingForRelease` | Test mode SysId | Did a safety net stop the test? |
| `aligning` | Teleop auto-align | Is the align running? |

Nine fields, five different jobs, all sitting in one class where any method can read or change any of them. Every one of them answers some version of the same question: "what is this part of the program in the middle of doing?" There is no single place that answers it for the whole robot.

### 2. The same action is written more than once

Turning to a heading appears in autonomous, on the tuning bench, and in the align. Driving to a distance appears in autonomous and on the bench. Stopping cleanly appears everywhere. Each copy is slightly different, and the differences are where the bugs live. In Chapter 6 you learned to turn repeated code into a method. That works for a calculation, like `calculateTurnRate()`, but an **action that lasts many loops** is harder: it needs a start, a middle that runs every loop, a finish line, and a cleanup, and those four pieces end up spread across `Init` methods, `Periodic` methods, and fields.

### 3. Two pieces of code can drive the same motors

In Chapter 16, you had to write this at the top of `testPeriodic()`:

```java
if (updateSysIdTest()) {
    return;
}
```

That `return` exists for one reason: without it, the SysId test and the PID bench would **both** send volts to the drivetrain in the same loop, and the last one to call `drive()` would win. The align feature needed the same trick. Every time you add a behavior that moves the robot, you have to hand-build a "nobody else touch the motors" rule out of `return` statements and `if`s, and you have to get the order exactly right. Nothing checks it for you.

### 4. Every action needs a cleanup, in every way it can end

An action can end in two ways: it **finishes** (the turn reached 90 degrees) or it is **interrupted** (the driver let go, the robot was disabled, a different mode started). Both need cleanup: stop the motors, reset a controller, log the end, clear the "I am running" field. In your code, the finish cleanup lives next to the action, and the interrupted cleanup lives wherever you remembered to put it: `disabledInit()`, the top of `testPeriodic()`, `changeSysIdTest()`. The align bug in Section 18.1 was a missing interrupted cleanup.

### 5. The mode methods do everything

`teleopPeriodic()` reads the sticks, applies the deadband, checks the wall, logs the wall stop, scales for slow mode, limits reverse, drives, publishes widgets, and now aligns. `testPeriodic()` runs two different tools. Each mode method is the one place where everything that can happen in that mode is mixed together. To understand any one behavior, you have to read all of them.

> **Why not just be more careful?**
>
> You could keep this structure and be very, very careful. Small programs are written this way all the time, and the `TimedRobot` structure you have used since Chapter 5 is a perfectly good way to start. But FRC robots are not small programs. A competition robot might have a drivetrain, an intake, an arm, a shooter, LEDs, and vision, five or six programmers, and six weeks. Being careful does not scale. A structure that makes the mistakes impossible does.

---

## 18.3 Nouns and Verbs: Subsystems and Commands

Command-based programming starts by sorting the robot into two kinds of things.

**Subsystems are the nouns.** A **subsystem** is a part of the robot that can do one thing at a time: the drivetrain, an arm, an intake, a shooter. It owns its hardware (through its IO layer, if it has one), it knows its own state, and it offers methods to make it do things: `drive()`, `setVolts()`, `getPose()`. You have already built one. `Drivetrain` is a subsystem in everything but name, and in Chapter 19 it gets the name.

**Commands are the verbs.** A **command** is one action the robot can take: drive 0.5 meters, turn to heading 90, follow the line until the tape, drive with the sticks, run a SysId test. A command uses one or more subsystems for as long as it runs, and then it ends. Each command is its own object, so the align from Section 18.1 is not a few lines tangled into `teleopPeriodic()`; it is a thing, with a name, that you can run from a button in teleop, as a step in autonomous, or from the tuning bench, and it is written exactly once.

Here is the Explorer, sorted:

| Nouns (subsystems) | Verbs (commands) that use them |
|---|---|
| `Drivetrain` | Drive with the sticks, drive to a distance, turn to a heading, drive until the line, auto-align, SysId tests, feedforward cruise |
| The onboard LED | Light while autonomous runs, blink a warning |
| `Sensors` | Nothing needs to "use" them; commands only read them |

Notice that most of the verbs need the same noun. That is normal: on most robots, the drivetrain is the busiest subsystem by far. It is also exactly why the rule in the next section matters so much.

> **What about `Sensors`?**
>
> A subsystem is something a command needs to **control**, so that two commands do not fight over it. Nobody fights over a rangefinder: any number of commands can read it at the same time. Many teams still make sensor classes into subsystems, to get the `periodic()` method you will meet in Section 18.5, but they rarely make commands "require" them. Chapter 19 decides what the Explorer's `Sensors` should be.

### The third piece: the scheduler

Nouns and verbs need a third piece to work: someone to decide which verbs run, every loop. That is the **command scheduler**. Think of a restaurant kitchen at dinner rush:

- The kitchen has **stations**: a grill, a fryer, a salad station. Each station can work on one order at a time. These are the subsystems.
- Each **order ticket** says what to make, and which stations it needs. A burger with fries needs the grill and the fryer. These are the commands.
- The **head chef** walks the line, over and over. For each ticket on the rail, the chef checks that its stations are free, tells the cooks to keep going, and pulls the ticket when the dish is done. If a rush order needs the grill, the chef **bumps** whatever was on it, and the grill gets cleaned before the rush order starts. When the kitchen closes, every ticket comes down. The head chef is the scheduler.

The cooks never argue over the grill, because only the head chef assigns it. That is the "nobody else touch the motors" rule from Section 18.2, built into the kitchen instead of hand-written with `return` statements.

> **Command-based, in one sentence**
>
> Command-based programming describes a robot as **subsystems** (the parts, each doing one thing at a time) and **commands** (the actions, each using some subsystems until it ends), and lets WPILib's **scheduler** run the commands, prevent conflicts, and clean up after them every loop.

---

## 18.4 The Life of a Command

Every command, from the simplest to the most complicated, has the same life, in four parts. WPILib's `Command` class names them as four methods:

| Method | When the scheduler calls it | Its job |
|---|---|---|
| `initialize()` | Once, when the command starts | Get ready: reset controllers, remember where you started, log |
| `execute()` | Every loop while it runs | Do one loop's worth of work: read, decide, drive |
| `isFinished()` | Every loop, right after `execute()` | Answer "am I done?" with `true` or `false` |
| `end(boolean interrupted)` | Once, when it stops | Clean up: stop the motors, log. `interrupted` says how it ended |

Look at the last row closely. `end` is called **however** the command stops. If `isFinished()` returned `true`, `end` gets `false` ("I finished my job"). If anything else stopped it (a more important command needed the same subsystem, the robot was disabled, a button was released), `end` gets `true` ("I was interrupted"). Either way, `end` runs. The cleanup cannot be forgotten, because it is not your job to call it. That is pain number 4, solved by the structure.

### You have already written commands

Here is the surprise. You have been writing commands since Chapter 12, without the name. Look at the turn step of your autonomous routine:

```java
case STEP_TURN_LEFT:
    drivetrain.drive(0.0, calculateTurnRate(TURN_HEADING_DEGREES));
    if (headingController.atSetpoint()) {
        startStep(STEP_DRIVE_TO_LINE);
    }
    break;
```

and the `startStep()` helper that started it. Pull them apart, and the four parts of a command are all there:

| Part | In your autonomous turn step |
|---|---|
| `initialize()` | `startStep(STEP_TURN_LEFT)`: remember the start distance, restart the step timer, reset both PID controllers, log |
| `execute()` | `drivetrain.drive(0.0, calculateTurnRate(TURN_HEADING_DEGREES))` |
| `isFinished()` | `headingController.atSetpoint()`, or the step timer passing `STEP_TIMEOUT_SECONDS` |
| `end()` | `startStep(STEP_DRIVE_TO_LINE)`, which stops caring about the turn and starts the next step |

The `switch` statement, `autoStep`, and `startStep()` were a small, hand-built scheduler that could run one command at a time, in a fixed order. Your Chapter 16 `changeSysIdTest()` was another one: it ended the old test cleanly and started the new one, and it was the only place the running test could change. You built these because the problem demanded them. Command-based gives you one good, tested version of that machinery, so you never have to build it again.

### The same turn, as a command

Here is a preview of what the turn looks like as a command class. **Do not type this yet.** It will not compile until Chapter 19, when `Drivetrain` becomes a subsystem and you write your own command classes. Just read it, and match each method to the table:

```java
public class TurnToHeading extends Command {
    private final Drivetrain drivetrain;
    private final PIDController headingController = new PIDController(0.3, 0.5, 0.0);
    private final double targetHeadingDegrees;

    public TurnToHeading(Drivetrain drivetrain, double targetHeadingDegrees) {
        this.drivetrain = drivetrain;
        this.targetHeadingDegrees = targetHeadingDegrees;
        headingController.enableContinuousInput(-180.0, 180.0);
        headingController.setTolerance(2.0, 10.0);
        addRequirements(drivetrain);   // "I need the drivetrain while I run"
    }

    @Override
    public void initialize() {
        headingController.reset();
    }

    @Override
    public void execute() {
        double turnRate = headingController.calculate(
            drivetrain.getHeadingDegrees(), targetHeadingDegrees);
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

Four things to notice, all of them answers to Section 18.2:

- **Its state is its own.** The target and the PID controller are fields of **this command**, not of `Robot`. No other job can touch them. The scattered-fields problem is gone, because every action keeps its memory inside itself.
- **It has its own PID controller.** Chapter 15's rule was "one controller per job." In `Robot.java`, three jobs had to share one heading controller because it was a field of `Robot`. Here, every `TurnToHeading` object brings its own.
- **It is written once and used anywhere.** `new TurnToHeading(drivetrain, 90.0)` can be a step in autonomous, the A button in teleop, or the B button on the bench. One copy, one set of bugs, one fix.
- **`addRequirements(drivetrain)`** tells the scheduler which subsystem this command uses. That one line replaces every `return` you wrote to keep two behaviors off the motors.

> **A controller's life is a command's life**
>
> Look at where the PID calls landed. `reset()` is in `initialize()`, `calculate()` is in `execute()`, `atSetpoint()` is `isFinished()`, and stopping is `end()`. That is not a coincidence. A feedback controller doing one job **is** an action with a start, a loop, a finish line, and a cleanup. Chapter 15's rule "clear the sum when the job changes" becomes automatic: a new job is a new command, and a new command calls `initialize()`. In Chapter 23 you will tune these controllers live, and in Chapter 31 PathPlanner will hand you whole path-following commands built the same way.

---

## 18.5 The Scheduler: One Head Chef

The command scheduler is a WPILib class called `CommandScheduler`. There is exactly one of it in the whole program, and you reach it with `CommandScheduler.getInstance()`. (A class designed to have exactly one object, reached through a `static` method like this, is called a **singleton**. It makes sense here: a kitchen with two head chefs giving different orders is worse than a kitchen with none.)

The scheduler does nothing on its own. It works only when you call its `run()` method, and you call it **once every loop**, from `robotPeriodic()`:

```java
CommandScheduler.getInstance().run();
```

That one line is the head chef's walk down the line. Here is what happens inside it, in order, every 20 milliseconds. (This list comes straight from WPILib's source code for `CommandScheduler.run()`.)

1. **Subsystems check in.** Every subsystem's `periodic()` method runs. In Chapter 17 you gave `Drivetrain` a method named `periodic()` that reads the inputs and updates odometry, and you call it yourself in `robotPeriodic()`. In Chapter 19, once `Drivetrain` is a subsystem, the scheduler calls it for you, and you will delete your own call.
2. **Buttons are checked.** Any button or condition you have tied to a command is checked, and commands are started if their button was just pressed. (Chapter 20 is all about this.)
3. **Commands run.** For each running command: if the robot is disabled, the command is **cancelled**. Otherwise its `execute()` runs, then its `isFinished()` is asked, and if the answer is `true`, its `end(false)` runs and it is removed.
4. **Changes are applied.** Commands that were started or cancelled during this loop are started or cancelled now.
5. **Idle subsystems get their default.** A subsystem with no command using it can have a **default command**, which starts automatically. "Drive with the sticks" is the classic default command for a drivetrain: whenever nothing else needs the drivetrain, the driver has it. (Chapter 19.)

### Requirements: one command per subsystem

The heart of the scheduler is one rule: **at most one running command may require each subsystem.** When a new command starts, the scheduler looks at its requirements:

- If none of its subsystems are in use, it simply starts. Its `initialize()` runs.
- If a subsystem it needs is already in use, the command already using it is **interrupted**: its `end(true)` runs, and then the new command starts. (A command can ask not to be interrupted, and then the newcomer is refused instead. That is rare, and you will not need it on the Explorer.)

Run the align feature through these rules, written as a command. The driver presses A, and the align command starts. It requires the drivetrain, so the "drive with the sticks" default command is interrupted, and its `end(true)` stops the motors. The align runs. When it finishes, its `end(false)` stops the motors, the drivetrain is free, and at step 5 of the very same loop, the default command starts again and the driver has the sticks back. If the robot is disabled in the middle, step 3 cancels the align and its `end(true)` runs. Nothing remembers "I was aligning," because there is no `aligning` field. The bug from Section 18.1 cannot happen.

And the wall stop? It would live in the drive-with-the-sticks command, so it runs whenever that command runs and is simply not running while the align has the drivetrain. Nothing to skip with a `return`, nothing to freeze.

> **The disabled rule**
>
> When the robot is disabled, the scheduler cancels every running command, and calls each one's `end(true)`. (A command can ask to keep running while disabled. That is meant only for things that cannot move the robot, like LEDs or logging.) You no longer write "if it was running, stop it" in `disabledInit()`. The scheduler already did.

### Never block the loop

Each command gets a slice of the same 20 millisecond loop. If one command's `execute()` takes too long, every other command, and the rest of your robot code, waits. The scheduler keeps a stopwatch on itself, and if a single `run()` takes longer than the loop, it prints `CommandScheduler loop overrun` followed by how long each part took, the same way `TimedRobot` warns about a slow loop.

This is Chapter 12's rule, "check, do not wait," and it matters even more now. Never put a `while` loop that waits for something, or a `Thread.sleep()`, inside a command. A command that wants to wait simply returns `false` from `isFinished()` until the moment arrives. The scheduler asks again next loop.

> **Command-based is still the same robot loop underneath**
>
> The scheduler is not a new kind of robot. It is a normal Java object that you call from `robotPeriodic()`, inside the same 20 millisecond loop you have used since Chapter 5. Your `Robot` class still extends `LoggedRobot`, which still runs the mode methods, just as `TimedRobot` did. Command-based is a better way to organize what happens **inside** each loop, not a replacement for the loop.

---

## 18.6 New Java: Lambdas, Code You Can Hand to Someone

Before you can run your first command, you need one more piece of Java, and it is the one you will see most often in command-based code.

### The problem: passing "what to do"

Here is a small, useful command you will build in a moment: "turn the LED on when this command starts, and turn it off when it ends." WPILib has a ready-made way to build that kind of command, called `Commands.startEnd(...)`. You give it two things: what to do at the start, and what to do at the end.

But those "things" are not numbers or objects. They are **actions**: little pieces of code. How do you pass a piece of code to a method?

You already know one way, from Chapter 17. You could write an interface with a single method, then a class that implements it, then pass an object of that class. Java even has a ready-made interface for "an action with no inputs and no answer." It is called `Runnable`, it lives in the `java.lang` package (so it needs no import), and it has exactly one method:

```java
public interface Runnable {
    void run();
}
```

So the long way to say "turn the LED on" looks like this:

```java
public class LedOn implements Runnable {
    private final XRPOnBoardIO onBoardIO;

    public LedOn(XRPOnBoardIO onBoardIO) {
        this.onBoardIO = onBoardIO;
    }

    @Override
    public void run() {
        onBoardIO.setLed(true);
    }
}
```

That is eleven lines, and a whole new file, to say `onBoardIO.setLed(true)`. Then another file just like it, `LedOff`, for the end. A real robot program would need hundreds of these tiny classes. Nobody would bear it.

### The short way: a lambda

A **lambda expression** (or just **lambda**) is Java's short way to write exactly that: an object that implements a one-method interface, with the method's body written right where you need it. Here is the same `Runnable` as a lambda:

```java
Runnable ledOn = () -> onBoardIO.setLed(true);
```

Read it aloud: "`ledOn` is an action that takes nothing, and sets the LED on." The parts:

- **`()`** is the parameter list. `Runnable`'s `run()` method takes no parameters, so it is empty.
- **`->`** is the arrow. Read it as "does" or "goes to."
- **`onBoardIO.setLed(true)`** is the body: the code that runs when someone calls `run()`.

Java works out the rest. It sees that the variable's type is `Runnable`, that `Runnable` has one method, and that the lambda fits that method's shape (no parameters, no answer). The lambda **is** a `Runnable` object, made on the spot, with no class file.

And here is the most important thing about it: **writing a lambda does not run it.** The line above does not turn on the LED. It makes an object that **knows how** to turn on the LED, and stores it in `ledOn`. The LED changes only when someone calls `run()`:

```java
Runnable ledOn = () -> onBoardIO.setLed(true);   // nothing happens yet
ledOn.run();                                       // NOW the LED turns on
ledOn.run();                                       // and again, every time it is called
```

That is exactly what a command needs: you describe the action now, and the scheduler runs it later, at the right moment, as many times as needed.

> **Lambda, in one sentence**
>
> A lambda is a small piece of code, written as `(parameters) -> body`, that becomes an object you can store and pass around, and that runs only when someone calls it.

### Interfaces with one method: functional interfaces

A lambda can stand in for any interface that has exactly **one** method to fill in. Java calls those **functional interfaces**, and WPILib uses three of them constantly. `Runnable` needs no import; the other two live in the `java.util.function` package:

| Interface | Its one method | A lambda for it | Used for |
|---|---|---|---|
| `Runnable` | `void run()` | `() -> onBoardIO.setLed(true)` | An action: do something |
| `BooleanSupplier` | `boolean getAsBoolean()` | `() -> sensors.isLeftOnLine()` | A question: is it true right now? |
| `DoubleSupplier` | `double getAsDouble()` | `() -> -controller.getLeftY()` | A live number: what is it right now? |

Notice the "supplier" pattern. A `BooleanSupplier` is not a `boolean`. It is a way to **get** a boolean, fresh, whenever you ask. `sensors.isLeftOnLine()` is `true` or `false` at one moment; `() -> sensors.isLeftOnLine()` can be asked again every loop, and gives the answer for **that** loop. That difference is the whole point, and it is where most lambda bugs come from (see "Now or later?" below).

If a lambda's body needs more than one line, put it in braces, like a method body. If it gives an answer, use `return`:

```java
BooleanSupplier lineSeen = () -> {
    boolean either = sensors.isLeftOnLine() || sensors.isRightOnLine();
    return either;
};
```

For one line, leave out the braces, the semicolon inside, and the `return`: `() -> sensors.isLeftOnLine() || sensors.isRightOnLine()` means the same thing.

> **Wait, isn't `Runnable` used for threads?**
>
> If you search the web for `Runnable`, most results are about **threads** (running code in parallel on several processor cores). That is where `Runnable` was first used, back in Java 1.0. A `Runnable` is just "something that can be run"; who runs it, and when, is up to whoever you give it to. In command-based code, the scheduler runs it, on the normal robot loop. No threads involved.

### Method references, again

In Chapter 7 you wrote this, and were told to read `leftMotor::set` as "leftMotor's set method":

```java
new DifferentialDrive(leftMotor::set, rightMotor::set);
```

Now you can see what it really is. `DifferentialDrive` wants two functional-interface objects that each take a power and send it to a motor. A **method reference** is an even shorter lambda, for when the body would do nothing but call one existing method. These two lines mean the same thing:

```java
BooleanSupplier leftOnLine = () -> sensors.isLeftOnLine();
BooleanSupplier leftOnLine = sensors::isLeftOnLine;
```

Use whichever reads better. When the lambda is "call this one method, with the same inputs," the method reference is usually clearer. When it does anything more (negates a value, combines two calls, passes a constant), write the lambda.

### Capturing: lambdas can use the variables around them

A lambda can use variables from the code around it. `() -> onBoardIO.setLed(true)` uses the field `onBoardIO`, even though it is not a parameter. This is called **capturing** the variable. Lambdas can capture two kinds of variables, with one important difference:

- **Fields** (like `onBoardIO`, `autoStep`, `drivetrain`): the lambda reads the field **when it runs**, so it always sees the field's current value.
- **Local variables** (declared inside a method): the lambda can use them only if they are never changed after they are first given a value. Java calls that **effectively final**. Try to break the rule, and the compiler stops you:

```java
int presses = 0;
Runnable count = () -> System.out.println(presses);   // ERROR here...
presses++;                                             // ...because of this line
```

```
error: local variables referenced from a lambda expression must be final or effectively final
```

Read it the Chapter 10 way: the lambda uses `presses`, and `presses` changes after the lambda was made. Why the rule? A local variable dies when its method ends (Chapter 15's scope and lifetime), but the lambda might be run long after that, by the scheduler. So Java gives the lambda a **copy** of the local's value, and forbids the local from changing, so the copy can never be out of date. If you need a value that changes, and that a lambda must see, make it a field.

### Now or later? The lambda bug every team meets

Here is the most common lambda bug in FRC, in one example. You want a condition: "has the robot turned 90 degrees from where it started?" Watch where the reading happens:

```java
double startHeadingDegrees = drivetrain.getHeadingDegrees();   // read NOW, once

BooleanSupplier turnedQuarter =
    () -> drivetrain.getHeadingDegrees() - startHeadingDegrees >= 90.0;   // read LATER, every time
```

`startHeadingDegrees` is read **now**, when this code runs, and the lambda keeps a copy. That is what you want: the starting heading should not change. `drivetrain.getHeadingDegrees()` inside the lambda is read **later**, every time someone asks `turnedQuarter.getAsBoolean()`. That is also what you want: the current heading.

Now the bug. A teammate writes:

```java
double headingDegrees = drivetrain.getHeadingDegrees();   // read NOW, once
BooleanSupplier turnedQuarter = () -> headingDegrees >= 90.0;   // BUG
```

It compiles. It looks reasonable. But `headingDegrees` was read once, when the robot was facing 0, and the lambda kept that copy forever. `turnedQuarter` will answer `false` every single loop, for the rest of the match, no matter how far the robot turns. Anything waiting on it waits forever.

The rule: **anything that should be fresh each loop must be read inside the lambda.** When you write a lambda, point at each value in it and ask, "Is this read now, or later?"

> **Why you sometimes see `lambda$` in a stack trace**
>
> In Chapter 10 you read a stack trace with a line like `at edu.wpi.first.wpilibj.RobotBase.lambda$startRobot$0(RobotBase.java:507)`. Now you know what that was: a lambda inside WPILib's `startRobot` method. Java gives each lambda a hidden name like `lambda$startRobot$0` (the method it was written in, and a number). When a crash happens inside one of **your** lambdas, the trace shows a line like `at frc.robot.Robot.lambda$new$0(Robot.java:142)`: a lambda written in `Robot`'s constructor (`new`), at line 142. Go to that line.

---

## 18.7 Your First Commands

Time to run a command on the Explorer. You will not rewrite anything you already have. Your autonomous `switch`, your teleop drive, your tuning bench, and your SysId tests all stay exactly as they are. You will add the scheduler next to them, and give it one small job.

### Commands from lambdas

You do not always have to write a command class like `TurnToHeading`. For small jobs, WPILib's `Commands` class has **factory methods** (Chapter 14: `static` methods that build an object for you) that turn lambdas into commands. A few you will use often:

| Factory | What the command does |
|---|---|
| `Commands.runOnce(action)` | Runs `action` once, at the start, and finishes right away |
| `Commands.run(action)` | Runs `action` every loop, and never finishes on its own |
| `Commands.startEnd(start, end)` | Runs `start` when it begins and `end` when it stops; never finishes on its own |
| `Commands.waitSeconds(seconds)` | Does nothing, and finishes after that many seconds |
| `Commands.waitUntil(condition)` | Does nothing, and finishes when `condition` (a `BooleanSupplier`) is true |
| `Commands.print(message)` | Prints `message` once, and finishes |

Each action is a `Runnable` and each condition is a `BooleanSupplier`, so each one is usually a lambda. (Each factory can also be given the subsystems the command requires, after the lambdas. The Explorer does not have any subsystems yet, so for now, leave them off.)

Then, to change how a command **ends**, every command has **decorator** methods that wrap it in a new command:

| Decorator | The new command... |
|---|---|
| `.until(condition)` | ends when `condition` becomes true (or when the original ends, if that comes first) |
| `.withTimeout(seconds)` | ends after that many seconds, at most |
| `.withName("Name")` | is the same command, with a name that shows up on the dashboard and in logs |

Decorators return a new command, so they chain, the way `pose.getRotation().getDegrees()` chained in Chapter 14. Here is the command you are about to add:

```java
Commands.startEnd(
        () -> onBoardIO.setLed(true),     // start: LED on
        () -> onBoardIO.setLed(false))    // end: LED off, however it ends
    .until(() -> autoStep == STEP_DONE)
    .withName("Auto Light");
```

Read it aloud: "A command that turns the LED on when it starts and off when it ends, that ends when the autonomous step is `STEP_DONE`, named Auto Light." That is three lambdas: two `Runnable`s and one `BooleanSupplier`. The last one reads the **field** `autoStep`, so it sees the current step every time the scheduler asks.

It is a small job, but it shows off everything from Section 18.4: the start and the end are kept together in one place, and the LED is turned off **however** the command stops: when autonomous finishes, when the robot is disabled in the middle, or when teleop starts.

### Step 1: Check that you have the command library

WPILib's command-based library is a vendor library called **WPILib-New-Commands**. The XRP project templates include it, so it should already be in your project: look in the `vendordeps` folder (next to `src`) for `WPILibNewCommands.json`, beside the `AdvantageKit.json` you added in Chapter 17. If it is not there, open the command palette, run **WPILib: Manage Vendor Libraries**, and install **WPILib-New-Commands** from the libraries that come with WPILib. (The "New" is historical: it replaced an older command library that has since been retired, and the name stuck.)

### Step 2: The imports

Add these to the imports in `Robot.java`:

```java
import edu.wpi.first.wpilibj.xrp.XRPOnBoardIO;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
```

Notice the package: `wpilibj2`, not `wpilibj`. Every class in the command library lives under `edu.wpi.first.wpilibj2.command`. If VS Code suggests an import from some other package for `Command`, it is the wrong one.

### Step 3: The LED and the command fields

In Chapter 4 you blinked the XRP's onboard LED with an `XRPOnBoardIO` object. If your `Robot.java` still has one, keep it and skip the first line below. If any old Chapter 4 code still sets the LED (in `robotPeriodic()`, say), **delete it**: two pieces of code setting the same LED is exactly the "two pieces of code driving the same motors" problem from Section 18.2, and the last one to write would win.

Add to "The robot's parts, created once" group:

```java
private final XRPOnBoardIO onBoardIO = new XRPOnBoardIO();   // the LED (Chapter 4)
```

And add a new group after the two PID controllers:

```java
// Commands (Chapter 18). Created in the constructor.
private final Command autoLight;
```

### Step 4: Create the command in the constructor

At the very end of the `Robot()` constructor, add:

```java
// Commands (Section 18.7): the LED is on while the autonomous routine runs.
autoLight = Commands.startEnd(
        () -> onBoardIO.setLed(true),     // start: LED on
        () -> onBoardIO.setLed(false))    // end: LED off, however it ends
    .until(() -> autoStep == STEP_DONE)
    .withName("Auto Light");

// Show which commands are running, live, on the dashboard.
SmartDashboard.putData("Scheduler", CommandScheduler.getInstance());
```

The command is created **once**, here, like every other object in `Robot`, and run as many times as you like.

> **Why not create it where the field is declared?**
>
> You might try `private final Command autoLight = Commands.startEnd(...)` up with the other fields. It fails with `error: illegal forward reference`, pointing at `autoStep`. Java creates fields in the order they are written, and `autoStep` is declared further down, in the "Remembered from loop to loop" group. Even though the lambda would not read `autoStep` until much later, Java refuses to let a field's starting value mention a field that is not created yet. The constructor runs after every field exists, so there it is fine. This is the same reason Chapter 14 created `odometry` in the constructor.

### Step 5: Start the scheduler

In `robotPeriodic()`, after the drivetrain and the Y button and before `updateDashboard()`, add the scheduler's heartbeat:

```java
@Override
public void robotPeriodic() {
    // The drivetrain reads its inputs and updates the pose first, every loop (Chapter 17).
    drivetrain.periodic();

    // Y puts the robot back at the start pose. Works even while disabled.
    if (controller.getYButtonPressed()) {
        drivetrain.resetPose(START_POSE);
        DataLogManager.log("Pose reset to start");
    }

    // The command scheduler: runs every scheduled command, once per loop (Section 18.5).
    CommandScheduler.getInstance().run();

    updateDashboard();
}
```

Without this line, nothing in the command library works at all. Commands could still be started, but nobody would ever run, check, or end them.

### Step 6: Schedule it, and cancel it

To **schedule** a command means to hand it to the scheduler and say "start this now." At the end of `autonomousInit()`, after `startStep(STEP_DRIVE_LEG_1)`, add:

```java
// Light the LED for as long as the routine runs (Section 18.7).
CommandScheduler.getInstance().schedule(autoLight);
```

And at the end of `teleopInit()`:

```java
// Autonomous is over, so its light is too, even if the routine never finished.
autoLight.cancel();
```

`schedule` starts the command right away: its start action runs immediately, and the LED comes on before `autonomousInit()` even returns. From then on, the scheduler checks it every loop. `cancel()` stops a running command early, and runs its end action, just like an interruption. (If the command is not running, `cancel()` does nothing, so it is always safe to call.) WPILib's own command-based template does exactly this in its `teleopInit()`, so that an unfinished autonomous never carries on into teleop.

> **`schedule()` the old way**
>
> Older code, and many examples online, start a command with `autoLight.schedule();`. That method still exists, but WPILib marked it **deprecated** in 2025, with a note that it will be removed. (Chapter 11: deprecation is a library's polite way of saying "please switch.") VS Code shows it crossed out. Use `CommandScheduler.getInstance().schedule(...)`, which says plainly who is doing the scheduling.

### Step 7: Watch it work

Build, switch on your XRP, and run the program with `USE_SIMULATED_ROBOT = false`.

1. In the Simulation GUI, open **NetworkTables** > **SmartDashboard** > **Scheduler**. It lists the names of the commands that are running right now. Before autonomous, the list is empty.
2. Press Y to reset the pose, and start **Autonomous**. The LED comes on, the Explorer drives the course exactly as it did in Chapter 17, and `Auto Light` appears in the Scheduler list.
3. When the robot finds the tape and `autoStep` reaches `STEP_DONE`, the LED goes out and `Auto Light` disappears from the list. Its `until` condition came true, so the scheduler ended it.
4. Run autonomous again, and this time **disable** the robot in the middle of leg 1. The LED goes out immediately. You never wrote a single line about the LED in `disabledInit()`. The scheduler saw that the robot was disabled, cancelled the command, and ran its end action.
5. Run autonomous again, and switch straight to **Teleoperated** partway through. The LED goes out, because `teleopInit()` cancelled the command.

Then try it on the simulated Explorer from Chapter 17 (`USE_SIMULATED_ROBOT = true`, XRP off). There is no real LED, but the Simulation GUI's **DIO** window shows the LED's channel (DIO 1) turning on and off at the same moments.

Your Explorer is now a command-based robot in the smallest possible way: the scheduler runs every loop, and one command uses it. Everything else is still the old structure. That is fine, and it is on purpose. Chapter 19 moves the drivetrain over, and Chapter 20 moves the rest.

> **Did the LED stay on after you disabled?**
>
> Then the scheduler is not running. Check that `CommandScheduler.getInstance().run();` is in `robotPeriodic()`, spelled exactly, and that `robotPeriodic()` has its `@Override`. Without the `run()` call, `schedule()` still runs the start action (so the LED comes on), but nothing ever checks the command again, so nothing ever ends it.

---

## 18.8 What Changes, and What Stays

Before Chapter 19 starts moving code around, it helps to know what command-based will change about the Explorer, and what it will not touch.

### What stays

- **The IO layer.** `DrivetrainIO`, `DrivetrainIOXRP`, and `DrivetrainIOSim` do not change at all. Command-based is about organizing the **logic above** the seam: who decides what the drivetrain does, and when. The seam is below all of that. AdvantageKit's own templates are command-based robots with IO layers, and you now have both halves.
- **`Drivetrain`'s methods.** `drive()`, `arcadeDrive()`, `setVolts()`, `getPose()`, `resetPose()`, and the getters stay. Commands **call** them.
- **Your math.** Kinematics, odometry, feedforward, and PID are exactly the same. They move into commands, but they do not change.
- **`LoggedRobot` and the mode methods.** `Robot` still extends `LoggedRobot`. The mode methods get much shorter, but they stay.

### What changes

- **`Drivetrain` becomes a subsystem** (Chapter 19). It gets a one-word change to its first line, and its `periodic()` is called by the scheduler.
- **Every action becomes a command** (Chapters 19 to 21). The autonomous steps, the tuning bench targets, the SysId tests, and the drive with the sticks.
- **Autonomous becomes a chain of commands** (Chapter 20). The `switch` statement, `autoStep`, and `startStep()` go away (see the preview below).
- **A new class, `RobotContainer`** (Chapter 20), becomes the place where subsystems and commands are created and buttons are tied to commands. `Robot.java` shrinks to a few lines, like the WPILib template.
- **The "Remembered from loop to loop" group empties out.** Each command keeps its own memory, inside itself.

Here is a preview of that autonomous chain, again not for typing yet:

```java
driveDistance(0.50).andThen(turnToHeading(90.0)).andThen(driveUntilLine())
```

Read it aloud: "drive half a meter, and then turn to heading 90, and then drive until the line." That is the whole obstacle course leg in one line, and every piece of it is a command you can test on its own.

### What it costs

Command-based is not free, and it is worth being honest about that before you commit to it.

- **More files.** One `Robot.java` becomes a `Robot`, a `RobotContainer`, a `Constants`, a subsystem or two, and a file per command. Each file is short and does one thing, but there are more of them to find.
- **"Where does this run?"** In `TimedRobot` code, you can read `teleopPeriodic()` from top to bottom and know exactly what happens every loop. In command-based code, the loop is inside the scheduler, so you have to learn to think in commands: which ones are running, and what each one does. The Scheduler widget and AdvantageKit's logs (Chapter 24) help a lot.
- **New ways to be confused.** "My command never ran" has a few classic causes: the scheduler's `run()` is missing, the robot is disabled, another command took its subsystem, or (Practice 5) the command was used inside another command and then scheduled on its own. You will learn them all, and Appendix D lists them.

Teams accept these costs because of what they buy: features that do not break each other, actions written once and reused everywhere, and cleanup that cannot be forgotten. On a robot with six subsystems and five programmers, that trade is not close.

> **Do you have to use command-based?**
>
> No. WPILib supports both, and some excellent teams write `TimedRobot` code with their own structure. But command-based is what WPILib's documentation, templates, and examples are built around, it is what PathPlanner (Chapter 31) expects, and it is what you will find in most FRC teams' code on GitHub. Learning it means you can read their code, and they can read yours.

---

## 18.9 Command-Based Everywhere

From here on, command-based is how every robot in this book is organized.

- **Chapter 19, subsystems and commands.** `Drivetrain` becomes a subsystem, and the autonomous steps become command classes like the `TurnToHeading` preview in Section 18.4. Drive with the sticks becomes the drivetrain's default command.
- **Chapter 20, button bindings and command groups.** Buttons are tied to commands in `RobotContainer`, and the obstacle course becomes one command built from smaller ones, including two things happening at once. Your pair merge-conflict lab happens there too.
- **Chapter 21, state machines.** The line-follower becomes a command that is also a state machine, and you will see that a chain of commands is really a state machine written a different way.
- **Chapter 22, unit tests.** A command is a small object with a clear start and finish, which makes it easy to test: create a `Drivetrain(new DrivetrainIOSim())`, run a command on it, and check where it ended up.
- **Chapter 26, the roboRIO.** The Mini Swerve starts life as a command-based project, using everything from this section of the book.
- **Chapter 31, PathPlanner.** PathPlanner turns paths you draw into commands, and lets you trigger your own commands at points along a path.
- **Chapters 34 and 35, the competition robot.** An arm, an intake, and a shooter each become a subsystem. A real autonomous routine is a long chain of commands, some running at the same time ("drive to the next game piece **while** lowering the intake"), and the scheduler's one-command-per-subsystem rule keeps them from fighting.

The kitchen gets busier, but the head chef's rules never change.

---

## Chapter Summary

> **What you learned in Chapter 18**
>
> * As a `TimedRobot` program grows, five problems grow with it: "what am I doing now" fields scattered across the class, the same action written in several places, two pieces of code driving the same motors, cleanups forgotten when an action is interrupted, and mode methods that do everything.
> * **Command-based programming** sorts the robot into **subsystems** (the nouns: parts that do one thing at a time) and **commands** (the verbs: actions that use subsystems until they end), run by the **command scheduler**.
> * Every command has four parts: `initialize()` once at the start, `execute()` every loop, `isFinished()` to say when it is done, and `end(interrupted)` once at the end, **however** it ends. Your Chapter 12 autonomous steps were commands all along.
> * The scheduler runs when you call `CommandScheduler.getInstance().run()` every loop. It runs subsystems' `periodic()`, checks buttons, runs commands, and enforces one rule: at most one command per subsystem. A new command **interrupts** the old one, and disabling the robot cancels every command.
> * New Java: a **lambda**, `(parameters) -> body`, is a piece of code turned into an object that runs only when called. It fills in any **functional interface** (one method), such as `Runnable`, `BooleanSupplier`, and `DoubleSupplier`. A **method reference** like `sensors::isLeftOnLine` is a shorter lambda.
> * Lambdas read fields when they run, but captured local variables must be **effectively final**, and are copied when the lambda is made. Anything that must be fresh each loop has to be read **inside** the lambda.
> * The Explorer now runs the scheduler, and its first command, built with `Commands.startEnd(...)` and `.until(...)`, lights the LED during autonomous and turns it off however the routine ends.

---

## Exercises

### Practice

**1. Three ways to say the same thing.** In a practice branch (`git checkout -b practice-lambdas`), write a class `LineSeen implements BooleanSupplier` (with `import java.util.function.BooleanSupplier;`) whose `getAsBoolean()` returns `true` if either reflectance sensor is on the line (it will need the `Sensors` object, passed to its constructor). Then, in `teleopPeriodic()`, create three `BooleanSupplier`s: one `new LineSeen(sensors)`, one lambda that does the same thing, and one method reference that checks only the left sensor. Publish all three with `SmartDashboard.putBoolean(...)`, calling `getAsBoolean()` on each. Drive over the tape and watch them. Count the lines each version took. Delete the branch when you are done.

**2. Now or later?** Still in a practice branch, add this at the top of `teleopInit()`, with a field `private BooleanSupplier turnedQuarter;`:

```java
double headingAtStartDegrees = drivetrain.getHeadingDegrees();
turnedQuarter = () -> drivetrain.getHeadingDegrees() - headingAtStartDegrees >= 90.0;
```

and in `teleopPeriodic()`, publish `turnedQuarter.getAsBoolean()` as `Turned Quarter`. Before running, predict: what does the widget show as you turn left slowly through a full circle? Run it and check. Then change the lambda to the buggy version from Section 18.6 (read the heading into a local first, compare the local inside the lambda), predict again, and run it. In `reflections.md`, write two sentences explaining the difference in your own words, using the words "now" and "later."

**3. Commands on the bench.** At the end of `teleopInit()`, schedule three commands, one at a time, and watch each one in the Scheduler widget:

```java
CommandScheduler.getInstance().schedule(Commands.print("Teleop started"));
CommandScheduler.getInstance().schedule(Commands.waitSeconds(5.0).withName("Five Seconds"));
CommandScheduler.getInstance().schedule(
    Commands.waitUntil(controller::getAButton).withName("Waiting for A"));
```

For each, predict how long it will stay in the Scheduler list before you run it. Then: disable the robot while `Waiting for A` is listed and enable again. Is it still there? Why? Finally, add `.withTimeout(3.0)` to the `waitUntil` command and try again without pressing A. Remove the test code when you are done.

**4. Label the parts.** Print out (or copy into `reflections.md`) your `autonomousPeriodic()`, `startStep()`, and `autonomousInit()`. For **each** of the three driving steps, label which lines are its `initialize()`, its `execute()`, its `isFinished()`, and its `end()`, as Section 18.4 did for the turn. Which step has **two** ways to finish? Then do the same for one SysId test in Test mode, using `changeSysIdTest()` and `updateSysIdTest()`. Where is its interrupted cleanup?

**5. Break it on purpose.** Two experiments, read the Chapter 10 way:

- (a) Comment out `CommandScheduler.getInstance().run();` and run autonomous. Does the LED come on? Does it go off at the tape? When you disable? Explain each answer using Step 6 and the "Did the LED stay on" callout. Put the line back.
- (b) Split the command in the constructor into two fields: `private final Command ledOnWhileRunning;` set to just the `Commands.startEnd(...)` part, and `autoLight` set to `ledOnWhileRunning.until(...).withName("Auto Light")`. Then, in `teleopInit()`, also schedule `ledOnWhileRunning` by itself. Run teleop and read the exception and its message. What is WPILib protecting you from? (Hint: one command object cannot be in two places at once.) Undo the change.

### Build (XRP Explorer)

Start the command scheduler, run the Explorer's first command, and plan the rest.

1. Make a branch (see the Git exercise).
2. Check that `vendordeps/WPILibNewCommands.json` exists, and install WPILib-New-Commands if it does not (Section 18.7, Step 1).
3. Add the four imports, the `onBoardIO` field (if you do not have one already) and the `autoLight` field. Delete any old Chapter 4 code that still sets the LED (Steps 2 and 3).
4. Create `autoLight` and publish the scheduler at the end of the constructor (Step 4).
5. Add `CommandScheduler.getInstance().run();` to `robotPeriodic()`, before `updateDashboard()` (Step 5).
6. Schedule `autoLight` at the end of `autonomousInit()`, and cancel it at the end of `teleopInit()` (Step 6).
7. On the real XRP, run the five checks in Step 7: empty Scheduler list, LED on and `Auto Light` listed during autonomous, LED off at the tape, LED off when disabled mid-route, LED off when switching straight to teleop. Confirm that the course itself runs exactly as it did in Chapter 17.
8. Repeat the autonomous checks on the simulated Explorer, watching DIO 1 in the Simulation GUI. Set `USE_SIMULATED_ROBOT = false` again before you commit.
9. **Plan the rebuild.** In `reflections.md`, make a table with two columns, "Subsystem" and "Commands that require it," for the whole Explorer. List every action the robot can take today (every autonomous step, every Test mode button, the bumper cruise, the D-pad SysId tests, driving with the sticks, the Y pose reset, the LED). For each command, also write its finish condition, or "never" if it only ends when interrupted. Chapter 19 starts from this list.

Diagnose anything strange:

- **The build fails with `package edu.wpi.first.wpilibj2.command does not exist`:** the WPILib-New-Commands vendor library is missing (Step 1).
- **`error: illegal forward reference` on the `autoLight` line:** you created the command where the field is declared. Move it into the constructor (Step 4).
- **The LED comes on but never goes off:** the scheduler is not running. See "Did the LED stay on after you disabled?" in Section 18.7.
- **The LED never comes on:** check that `autonomousInit()` really schedules `autoLight`, and that nothing else (old Chapter 4 code in `robotPeriodic()`, for example) sets the LED back to `false` every loop.
- **The LED goes off the moment autonomous starts:** `autoStep` is already `STEP_DONE` when the command is scheduled. Schedule it **after** `startStep(STEP_DRIVE_LEG_1)`, not before.
- **The Scheduler widget is missing:** check the `SmartDashboard.putData("Scheduler", ...)` line, and look under **NetworkTables** > **SmartDashboard**.
- **VS Code shows `schedule()` crossed out:** you wrote `autoLight.schedule()`. Use `CommandScheduler.getInstance().schedule(autoLight)` (the "`schedule()` the old way" callout).

When the LED tracks the autonomous routine on both robots, and your plan table lists every action the Explorer can take, you are ready for Chapter 19.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. In Section 18.1, why did the robot start spinning by itself after being disabled in the middle of an align? Explain how the same feature, written as a command, avoids that bug, naming the scheduler rule that does it.
2. In Chapter 16, `testPeriodic()` needed `if (updateSysIdTest()) { return; }`. Which of the five growing pains was that line working around, and what replaces it in command-based code?
3. Why does `.until(() -> autoStep == STEP_DONE)` work, when `.until(autoStep == STEP_DONE)` would not even compile? What would go wrong if Java did allow the second one?
4. Command-based has real costs. Name one that worries you, and one reason a team with five programmers would accept it anyway.

If any answer feels shaky, re-read Sections 18.2, 18.5, and 18.6.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b command-scheduler
```

After Build step 8, with `USE_SIMULATED_ROBOT = false`:

```bash
git add .
git commit -m "Ch18: command scheduler and auto light command"
git push -u origin command-scheduler
```

Open a pull request into `main`. In the description, paste your plan table from Build step 9: it is the to-do list for the next two chapters, and a pull request description is a good place for a team to agree on a plan before the code is written. Review **Files changed**: only `Robot.java` should have changed (and `vendordeps/WPILibNewCommands.json`, if you had to install it). Merge, delete the branch, then `git checkout main` and `git pull`.

Why commit something this small? Because it is a safe place to stand. The scheduler is now running, and everything else behaves exactly as it did. If anything strange happens while you rebuild in Chapter 19, you can come back here and know the scheduler was not the cause.

### Collab: Be the Scheduler

This one needs no computer. Work in a group of three or four.

1. Write each of these commands on an index card, with its **requirements** and its **finish condition**: "Drive with sticks (requires Drivetrain; never finishes)", "Auto-align (requires Drivetrain; finishes at heading 90)", "Drive 0.5 m (requires Drivetrain; finishes at 0.5 m)", "Auto Light (requires nothing; finishes when autonomous is done)", "Blink warning (requires LED; finishes after 2 s)".
2. One person is the **scheduler**. One is the **Drivetrain**, and one is the **LED**: each can hold one card at a time. The last person is the **driver**, calling out events: "teleop starts," "A pressed," "heading reaches 90," "disabled," and so on.
3. Every clap is one loop. On each clap, the scheduler walks through the five steps of Section 18.5 out loud: subsystems check in, buttons, run each command and ask if it is finished, apply changes, start default commands. When a command ends, its holder says "end, interrupted" or "end, finished," and acts out the cleanup.
4. Play three scenarios: a normal align in teleop; an align that gets disabled halfway; and the driver pressing A while "Drive 0.5 m" is running.

Afterward, each of you writes two sentences in `reflections.md`: which rule surprised you most, and which bug from Section 18.1 the scheduler prevented in your scenarios.

### Explore

WPILib ships an XRP example that is already command-based. In VS Code, run **WPILib: Create a new project**, choose **Example**, then **XRP Reference**, and create it in a scratch folder (not inside your Explorer project). Open `RobotContainer.java` and the `commands` folder. Find:

- a command class with all four methods, and match each one to Section 18.4's table;
- a call to `addRequirements(...)`;
- at least two lambdas and one method reference, and the functional interface each one fills in;
- the line that makes driving with the sticks the drivetrain's default command.

Then open `TurnDegrees.java` and compare how it decides it is finished with how your Explorer's heading PID decides. Write three sentences in `reflections.md`: which approach is more accurate, why, and one thing in WPILib's example that you would like the Explorer to have.

---

> **Additional Resources**
>
> * **What Is "Command-Based" Programming?**: [docs.wpilib.org/en/stable/docs/software/commandbased/what-is-command-based.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/what-is-command-based.html) WPILib's introduction to subsystems, commands, and the scheduler, with a `TimedRobot` comparison much like Section 18.1
> * **Commands**: [docs.wpilib.org/en/stable/docs/software/commandbased/commands.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/commands.html) the four methods of a command, the `Commands` factories, and the decorators from Section 18.7
> * **The Command Scheduler**: [docs.wpilib.org/en/stable/docs/software/commandbased/command-scheduler.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-scheduler.html) what happens inside `run()`, step by step, and how interruption works
> * **Treating Functions as Data**: [docs.wpilib.org/en/stable/docs/software/basic-programming/functions-as-data.html](https://docs.wpilib.org/en/stable/docs/software/basic-programming/functions-as-data.html) WPILib's own explanation of `Runnable`, lambdas, method references, and capturing, written for robot programmers
> * **Lambda Expressions (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html](https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html) Java's official tutorial on lambdas and functional interfaces
> * **`Commands` (WPILib Javadoc)**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj2/command/Commands.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj2/command/Commands.html) every command factory, with what each one does

---

*Next up, Chapter 19: Subsystems and Commands on the XRP. You will turn `Drivetrain` into a real subsystem, write your first command classes for the obstacle course, and make driving with the sticks a default command, so the scheduler, not `teleopPeriodic()`, decides who drives.*
