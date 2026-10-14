# Chapter 10: Debugging, Error Messages, and Git Archaeology

In Chapter 8 you drove the Explorer with a controller. In Chapter 9 you gave it senses: encoders, a gyro, a rangefinder, line sensors, and a dashboard that shows everything it can feel. The Explorer now has three classes, a few hundred lines of code, and a history of commits stretching back to Chapter 3.

That is enough code for things to go wrong in interesting ways. And they will. A missing semicolon stops the build. A program that built fine crashes the moment you run it. A robot that ran perfectly last week now refuses to drive forward, and nobody remembers changing anything.

This chapter is about what to do next. Not "stare at the code and hope," but a real method: read what the error message is telling you, form a guess, test the guess with evidence, and, when the bug is hiding somewhere in your history, dig through your commits until you find exactly the change that caused it. That last part is what we call **Git archaeology**.

You may also be reading this after a break. Maybe it was winter break, maybe a busy few weeks of exams. Either way, your code has been sitting still while you were away, and the first thing we will do is bring it back to life and check that it still works. That turns out to be a debugging skill too.

On the Java side, you will learn what an **exception** is, how the **call stack** turns into the stack trace you see when a program crashes, and what **`null`** means (and why the `final` keyword you have been typing since Chapter 7 quietly protects you from it). On the robot side, the Explorer gets a **flight recorder**: a log file that captures every dashboard value and every important event, so you can look back at what the robot was doing when something went wrong.

This chapter has less new robot behavior than the last two. That is on purpose. Every chapter after this one will produce bugs, and this is the chapter that makes them survivable.

---

## 10.1 Welcome Back: Restarting a Project After a Break

Coming back to code after a few weeks feels strange. You open `Robot.java` and it looks like someone else wrote it. That is normal. Programmers call it **context loss**, and professionals deal with it every Monday morning.

The cure is a short restart routine. Do it now, even if you were here yesterday.

### Step 1: Ask Git where you left off

Open your XRP Explorer project in VS Code, open a terminal, and run:

```bash
git status
```

You want to see `nothing to commit, working tree clean`. If instead you see a list of modified files, you have changes from before the break that were never committed. Run `git diff` to see what they are. If they were finished work, commit them. If you have no idea what they were, that is a sign to read them carefully before deciding.

Next, ask Git what you did most recently:

```bash
git log --oneline -5
```

The `-5` means "only the last five commits." You should see something like this (your IDs will be different):

```
c41e9a0 Ch9: full sensor dashboard
8d2f713 Ch8: controller teleop drive working
5b07c22 Ch7: Drivetrain class with arcadeDrive
91aa4e5 Ch6: helper methods and smarter teleop
0f3d8b1 Ch5: mode skeleton with lifecycle prints
```

Read that list from the bottom up and you have a five-line summary of the last month of your robot's life. This is the first payoff of the `ChN: <description>` habit from Chapter 3. Your commit messages are notes from past-you, and past-you just told present-you exactly where things stand.

If you worked on more than one computer, also run `git pull` so this computer has your latest commits from GitHub.

> **New season, new WPILib?**
>
> WPILib releases a new version each year, and if you install a new one over a break, VS Code may offer to import or update your project. Check with your mentor before you say yes. The code in this book is written for one WPILib year, and upgrading in the middle of a project is a job to do on purpose, not by accident.

### Step 2: Build it and run it

Power on the XRP flat and still, connect to its Wi-Fi, build, and run the program the same way you did in Chapter 9. Open SmartDashboard. Your saved layout from Chapter 9 should come back.

### Step 3: Run a smoke test

Before you change a single line, check that the robot still does what it did before the break. You already have the checklist: it is the sensor check table from the Chapter 9 Build exercise. Press Y to zero, push the robot forward 10 cm, turn it a quarter turn, hold a book in front of the rangefinder. Then enable Teleoperated and drive a little.

Engineers call a quick "does it basically work?" check like this a **smoke test**. The name comes from electronics: when you power on a new circuit board for the first time, the very first test is whether smoke comes out.

> **Why test before you change anything?**
>
> If you start writing new code and then something breaks, you will not know whether your new code broke it or whether it was already broken when you came back. A dead battery, a loose rangefinder cable, or a controller in the wrong slot all look exactly like code bugs. Thirty seconds of testing **first** means that any bug you find later was caused by something you did today. That shrinks the search enormously, and shrinking the search is what this whole chapter is about.

---

## 10.2 Three Kinds of Bugs

Every bug you will ever meet falls into one of three families. Knowing which family you are dealing with tells you where to look and which tool to reach for.

| Kind | When it shows up | What you see | Example |
|---|---|---|---|
| **Compile error** | When you build | `BUILD FAILED` and an error message; the program never runs | A missing semicolon |
| **Runtime error** | While the program runs | The program crashes and prints a stack trace | Calling a method on an object that was never created |
| **Logic error** | While the program runs | Nothing crashes; the robot just does the wrong thing | Integer division making `METERS_PER_COUNT` come out as `0` |

Chapter 2 already introduced the first split: a build error is a problem with your Java, a deploy or connection error is a problem with getting the program to the robot. This table splits "problems with your Java" into three.

Notice the pattern as you go down the table. Compile errors are loud and early: the compiler refuses to continue and points at the exact line. Runtime errors are loud but late: the program starts, then crashes, and leaves you a clue. Logic errors are silent. Nothing tells you anything is wrong. The robot just quietly drives 0 meters, or turns left when it should turn right.

That means **compile errors are the friendliest bugs there are**, even though they are the ones that feel most like failure. A big part of becoming a good programmer is learning to push bugs up the table: to write code so that mistakes become compile errors instead of crashes, and crashes instead of silent wrong behavior. You will see one example of that in Section 10.5.

---

## 10.3 Compile Errors: Reading What the Compiler Tells You

When you build, a program called the **compiler** reads every line of your Java and translates it into something the computer can run. If any line does not follow Java's rules, the compiler stops and tells you what it could not understand. Beginners often skip straight past the message and start changing code at random. Do not. The message is the most useful thing on your screen.

### Anatomy of a compile error

Suppose you leave the semicolon off the first line of `teleopPeriodic()`. The build fails with output like this (trimmed a little):

```
> Task :compileJava FAILED
C:\Users\you\XRPExplorer\src\main\java\frc\robot\Robot.java:101: error: ';' expected
        double forward = -MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND)
                                                                                       ^
1 error

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':compileJava'.
> Compilation failed; see the compiler error output for details.

BUILD FAILED in 2s
```

Read it piece by piece:

- **The file**: `Robot.java`. (The long path in front tells you exactly which `Robot.java`, which matters once you have several projects.)
- **The line number**: `101`. In VS Code, press `Ctrl+G` and type the number to jump straight there.
- **The problem**: `';' expected`. The compiler expected a semicolon and did not find one.
- **The caret**: the `^` on the line below points at the exact spot where the compiler noticed the problem.
- **The count**: `1 error`.

Everything from `FAILURE:` down is Gradle, the build tool, saying "the compile step failed." It is the same every time. The useful part is always **above** it.

You do not even need to build to see most compile errors. VS Code underlines them in red as you type. Hover over the red squiggle to read the message, or open the **Problems** panel (`Ctrl+Shift+M`) to see every error in the project as a clickable list.

> **The compiler notices late, not wrong**
>
> The compiler reads your code the way you read a sentence: left to right, top to bottom. It only realizes a semicolon is missing when it reaches something that cannot possibly come next. So the caret often points just **after** the real mistake, or at the start of the next line. When the line it names looks fine, look at the end of the line **above** it.

### The errors you will see most

Here are the compile errors you will meet again and again in robot code, with the exact wording Java uses:

| Message | What it usually means | Typical fix |
|---|---|---|
| `';' expected` | A statement is missing its semicolon | Add `;` at the end of the line (or the line above) |
| `cannot find symbol` | Java does not recognize a name: a typo, wrong capitalization, a variable used outside its block, or a missing `import` | Check spelling and capitals; add the import |
| `incompatible types: possible lossy conversion from double to int` | You tried to store a `double` in an `int`, which would throw away the fraction | Use a `double` variable, or cast on purpose with `(int)` |
| `missing return statement` | A method promises to return a value, but some path through it does not | Make sure every `if`/`else` path ends with a `return` |
| `variable sensors might not have been initialized` | A `final` field is never given a value in the constructor | Create the object in the constructor (or in the field initializer) |
| `class, interface, enum, or record expected` | Usually an extra or missing `}` somewhere above | Check that every `{` has a matching `}` |

`cannot find symbol` deserves a closer look, because it comes with extra lines that tell you exactly which name Java could not find:

```
Robot.java:94: error: cannot find symbol
        boolean blocked = sensors.isObstacleWithn(WALL_STOP_DISTANCE_METERS);
                                 ^
  symbol:   method isObstacleWithn(double)
  location: variable sensors of type Sensors
```

Read it aloud: "I could not find a **method** called `isObstacleWithn` that takes a `double`, on the **variable** `sensors`, which is a `Sensors`." The typo is right there in the message: `Withn` instead of `Within`. If the symbol is a class name like `SmartDashboard` or `MathUtil`, the usual cause is a missing `import` line at the top of the file. Hover over the red name in VS Code and choose **Quick Fix** (`Ctrl+.`) to add the import for you.

### Fix the first error first

Delete one `}` from the middle of `Robot.java` and build. You may get five, ten, or twenty errors. Do not panic, and do not try to fix them all. One missing brace confuses the compiler about where every following method begins and ends, so it reports problems that are not really there.

The rule: **fix the first error, then build again.** Very often the rest disappear on their own. This is true for every compiler in every language you will ever use.

> **Read the message out loud**
>
> When you are stuck on an error, read the message out loud, word by word, including the `symbol:` and `location:` lines. It sounds silly. It works. Most compile errors tell you exactly what is wrong, and the reason we miss it is that we skim. If you ask a mentor for help, they will very likely start by doing exactly this.

---

## 10.4 Runtime Errors: Exceptions and the Call Stack

Some mistakes are perfectly legal Java. The compiler cannot catch them because the problem only exists while the program is running, with real values. Dividing by a number that happens to be zero is the classic example. The compiler cannot know in advance that the number will be zero.

When something impossible happens while a Java program runs, Java **throws an exception**. An **exception** is an object that describes what went wrong, and "throwing" it means Java stops what it was doing, right in the middle of the line, and starts backing out of the program looking for code that knows how to handle the problem. If nothing handles it, the program stops and prints a report: the **stack trace**.

To read a stack trace, you first need to know what a "stack" is.

### The call stack

Think about what happens every 20 ms in your robot program. WPILib's `TimedRobot` calls your `robotPeriodic()`. Your `robotPeriodic()` calls `updateDashboard()`. `updateDashboard()` calls `drivetrain.getLeftDistanceMeters()`, which calls `leftEncoder.getDistance()` inside WPILib.

Each of those calls is waiting for the one after it to finish. Java keeps track of this chain of "who called whom, and which line are they waiting on" in a structure called the **call stack**. Picture a stack of sticky notes:

```
leftEncoder.getDistance()                 <- running right now (top of the stack)
drivetrain.getLeftDistanceMeters()        <- waiting, at Drivetrain.java line 60
updateDashboard()                         <- waiting, at Robot.java line 45
robotPeriodic()                           <- waiting, at Robot.java line 32
TimedRobot (WPILib's loop)                <- waiting
```

Every time a method calls another, a new note goes on top. Every time a method finishes, its note comes off and the method underneath picks up where it left off. You built this mental model in Chapter 6 when you learned that a method "returns to whoever called it." The call stack is just Java's written record of it.

A **stack trace** is a printout of that stack of notes at the exact moment an exception was thrown. It is a snapshot of where the program was, and how it got there.

### Reading a real stack trace

Here is a crash you might really cause. A teammate is cleaning up `Robot.java`, sees the line `sensors = new Sensors();` in the constructor, decides it is clutter, and deletes it. The build fails with `variable sensors might not have been initialized`. To make the error go away, they delete the word `final` from the `sensors` field. Now it builds. They run it, and this appears:

```
********** Robot program starting **********
XRP Explorer started!
Error at frc.robot.Robot.updateDashboard(Robot.java:54): Unhandled exception: java.lang.NullPointerException: Cannot invoke "frc.robot.Sensors.getDistanceAheadMeters()" because "this.sensors" is null
	at frc.robot.Robot.updateDashboard(Robot.java:54)
	at frc.robot.Robot.robotPeriodic(Robot.java:31)
	at edu.wpi.first.wpilibj.IterativeRobotBase.loopFunc(IterativeRobotBase.java:400)
	at edu.wpi.first.wpilibj.TimedRobot.startCompetition(TimedRobot.java:152)
	at edu.wpi.first.wpilibj.RobotBase.runRobot(RobotBase.java:436)
	at edu.wpi.first.wpilibj.RobotBase.lambda$startRobot$0(RobotBase.java:507)
	at java.base/java.lang.Thread.run(Thread.java:840)
Warning at edu.wpi.first.wpilibj.RobotBase.runRobot(RobotBase.java:450): The robot program quit unexpectedly. This is usually due to a code error.
  The above stacktrace can help determine where the error occurred.
  See https://wpilib.org/stacktrace for more information.
Error at edu.wpi.first.wpilibj.RobotBase.runRobot(RobotBase.java:457): The startCompetition() method (or methods called by it) should have handled the exception above.
```

Then the program stops. The robot was never even enabled. (Your line numbers will differ a little, especially the ones inside WPILib, which change from version to version. The shape will be the same.)

It looks like a wall of text. Here is how to take it apart:

1. **Find the `Error at` line.** The text "The robot program quit unexpectedly" is WPILib's signal that a stack trace was printed above it. Look up.
2. **Read the exception type.** `java.lang.NullPointerException`. That is the name of what went wrong. (Section 10.5 explains this one.)
3. **Read the message after it.** Modern Java explains a `NullPointerException` in plain English: `Cannot invoke "frc.robot.Sensors.getDistanceAheadMeters()" because "this.sensors" is null`. In other words: you tried to call a method on `sensors`, but `sensors` was empty.
4. **Read the `at` lines from the top down until you find your own code.** Lines that start with `frc.robot` are yours. Lines that start with `edu.wpi.first` are WPILib's, and lines that start with `java.` are Java's own. The first `frc.robot` line is where the crash happened: `Robot.java`, line 54, inside `updateDashboard`.
5. **Keep reading down to see how you got there.** `updateDashboard` was called by `robotPeriodic`, at line 31. `robotPeriodic` was called by WPILib's loop. Each line was called by the line **below** it.

That is the whole skill. Type of problem, plain-English message, the first line that is yours, and the chain of calls that led there. In this case it takes you straight to the missing `sensors = new Sensors();`.

> **Your code, not WPILib's**
>
> When a stack trace mentions WPILib classes, it is tempting to think WPILib is broken. It almost never is. WPILib's own documentation says it plainly: an unhandled exception almost always means the team's code has a bug, and almost never means the hardware failed. Skip past the `edu.wpi.first` and `java.` lines and start at the first `frc.robot` line. That is the last place your code had control before things went wrong.

### Where does the output appear?

In Chapter 4 you met RioLog, the VS Code window that shows what a robot program prints. RioLog connects to a **roboRIO**, the computer on a full FRC robot. Your XRP program works differently. As the Chapter 2 "Why firmware?" callout described, your Java code actually runs on your **laptop** and talks to the XRP over Wi-Fi. So when you run the Explorer, its prints, warnings, and stack traces appear in the **terminal panel** at the bottom of VS Code, the same place the build output appears.

When you move to the Mini Swerve in Chapter 26, the program will run on a real roboRIO, and the same text will show up in RioLog and in the Driver Station's console. The format of the errors is identical everywhere, so the reading skills you learn here carry straight over.

> **When asking for help, send the whole thing**
>
> If you post a question to a mentor or on Chief Delphi, copy the **entire** stack trace as text, plus a link to your code on GitHub. Not a photo of your screen, and not just the last line. The first `frc.robot` line and the exception message are what a helper needs to see, and they are usually in the part people leave out.

### Exceptions you will meet on the XRP

| Exception | What it means | Common robot cause |
|---|---|---|
| `NullPointerException` | You used an object variable that holds `null` | A field was declared but never created with `new` |
| `ArithmeticException: / by zero` | Integer division by zero | An `int` constant that was left as `0`, used as a divisor |
| `IllegalArgumentException: XRPMotor 0 already allocated` | Two objects tried to use the same hardware channel | Creating a second `XRPMotor(0)`, or creating `new Drivetrain()` twice |
| `IllegalArgumentException: Invalid XRPMotor device number. Should be 0-3` | A channel number that does not exist | A typo in a channel number |

The "already allocated" one is worth remembering. On a real robot, WPILib refuses to let two pieces of code drive the same motor, because they would fight each other. This is why every chapter has repeated "create hardware objects once, in the constructor." If you ever write `new Drivetrain()` inside a periodic or init method, the second call tries to create the motors a second time, and the program crashes with this exception.

> **Dividing by zero with a `double` does not crash**
>
> `931 / 0` throws an `ArithmeticException`. But `931.0 / 0.0` does not. Floating-point math has special values for this: it quietly produces `Infinity`, and `0.0 / 0.0` produces `NaN` ("not a number"). Your program keeps running, and the robot gets fed a nonsense number. That turns a runtime error into a **logic** error, which is worse. If you ever see `Infinity` or `NaN` on your dashboard, look for a division whose bottom number reached zero.

---

## 10.5 `null`: The Object That Is Not There

The crash in Section 10.4 was a `NullPointerException`, the single most common runtime error in Java. To understand it, you need one more idea about how objects work.

In Chapter 7 you learned that `new Sensors()` builds an object. But the variable `sensors` is not the object itself. It holds a **reference** to the object: think of it as the object's address, or a leash attached to it. When you write `sensors.getDistanceAheadMeters()`, Java follows the reference to the object and calls the method on whatever it finds there.

A reference variable that does not point to any object holds a special value called **`null`**. It means "this leash is not attached to anything." A field like this one starts out as `null`:

```java
private Sensors sensors;   // declared, but no object yet: sensors is null
```

Following a `null` reference is impossible, because there is nothing at the end of the leash. So when Java reaches `sensors.getDistanceAheadMeters()` and `sensors` is `null`, it throws a `NullPointerException`.

Primitive variables (`int`, `double`, `boolean`) cannot be `null`. They hold their value directly, so an `int` field you never set simply starts at `0`. Only object types (`String`, `Sensors`, `XRPMotor`, and so on) can be `null`. That is one more difference between primitives and objects to add to the list from Chapter 7.

### How `final` protects you

Now look again at what the teammate did in Section 10.4. With the field written as

```java
private final Sensors sensors;
```

Java **requires** that the constructor give `sensors` a value. Forget to, and you get a compile error:

```
Robot.java:23: error: variable sensors might not have been initialized
```

That compile error was not an obstacle. It was the compiler catching a crash before it could happen. Deleting `final` did not fix the bug; it turned a friendly compile error into a runtime crash. Remember the table in Section 10.2: you always want to move bugs **up**, toward the compiler, never down.

This is the real reason this book has written hardware fields as `private final ... = new ...;` since Chapter 7. A `final` field must be given a value exactly once, when the object is built, and can never be set to anything else afterward. So a `final` field that compiles can never be `null` when your periodic methods use it.

> **Make the error go away the right way**
>
> When you are frustrated, it is tempting to make an error message disappear by deleting whatever it complains about: remove the `final`, comment out the line, add a cast you do not understand. Before you do, ask: "what is this error protecting me from?" If you cannot answer, ask a mentor. An error that disappears without being understood usually comes back later, at a worse time, as a different and harder bug.

### The fix

The fix for the crash is to put the object back, and the protection with it:

```java
private final Sensors sensors;

public Robot() {
    // ...
    drivetrain = new Drivetrain();
    sensors = new Sensors();
}
```

Two small habits prevent almost every `NullPointerException` in robot code:

1. **Create every object when you declare it, or in the constructor.** Never wait until an init or periodic method.
2. **Make fields `final` whenever they will never be replaced.** For hardware, that is always.

---

## 10.6 Logic Errors: Debugging Like a Scientist

Logic errors are the hard ones. Nothing crashes. No message appears. The robot just does the wrong thing, and you have to figure out why with nothing to go on but what you can observe.

The method that works is the same one scientists use:

1. **Observe** exactly what happens. Not "it is broken," but "when I push the stick forward, the wheels do not turn, but turning and reversing still work."
2. **Guess** (form a **hypothesis**) about the cause. "Maybe the wall stop thinks there is a wall."
3. **Test** the guess with evidence, ideally a test that could prove you wrong.
4. **Repeat** with a new guess if the evidence says no.

The step beginners skip is 3. They guess, then immediately start changing code based on the guess. If the guess was wrong, they have now added a second bug to the first. **Gather evidence before you change anything.**

### Debug by stage: read, decide, write

Since Chapter 1 you have known that every robot program is a loop: **read** the inputs, **decide** what to do, **write** to the outputs. That loop is also the best map for hunting a logic bug. A wrong behavior means at least one stage is wrong, and you can check each stage separately:

- **Read**: are the inputs what you think they are? Is the stick really at `0.8`? Is the rangefinder really reading `1.2` m?
- **Decide**: given those inputs, did your logic make the right choice? Is `blocked` true when it should be false?
- **Write**: did the right numbers actually reach the motors? And did the motors do what they were told?

Your SmartDashboard is the tool for this. Use it as a **probe**: like a multimeter touched to points on a circuit, a dashboard widget lets you see the value of a variable at one exact point in the code, live. Here is `teleopPeriodic()` from Chapter 9 with temporary probes at each stage boundary:

```java
@Override
public void teleopPeriodic() {
    // Read
    double forward = -MathUtil.applyDeadband(controller.getLeftY(), STICK_DEADBAND);
    double rotation = -MathUtil.applyDeadband(controller.getRightX(), STICK_DEADBAND);
    SmartDashboard.putNumber("DBG forward (read)", forward);

    // Decide
    double speedScale = controller.getRightBumperButton() ? SLOW_MODE_SCALE : FULL_SPEED_SCALE;
    boolean blocked = forward > 0.0 && sensors.isObstacleWithin(WALL_STOP_DISTANCE_METERS);
    double safeForward = blocked ? 0.0 : forward;
    SmartDashboard.putNumber("DBG safeForward (decide)", safeForward);

    // Write
    double forwardCommand = safeForward * speedScale;
    SmartDashboard.putNumber("DBG forward command (write)", forwardCommand);
    drivetrain.arcadeDrive(forwardCommand, rotation * speedScale);

    SmartDashboard.putBoolean("Slow Mode", speedScale == SLOW_MODE_SCALE);
    SmartDashboard.putBoolean("Blocked", blocked);
}
```

The `DBG` prefix marks these as temporary, so you remember to remove them when the bug is fixed (and so they sort together on the dashboard).

Now try it on the bug from step 1, "forward does nothing, but turning and reversing work." Push the stick forward and watch:

- `DBG forward (read)` shows `0.8`. **The read stage is fine.**
- `DBG safeForward (decide)` shows `0.0`. **The decide stage changed it.** The only thing that can turn `forward` into `0.0` is `blocked`, and sure enough, the `Blocked` widget is lit.
- So check the input to that decision: `Distance Ahead (m)` reads `0.0` even with nothing in front of the robot.

Three widgets, and you have gone from "the robot is broken" to "the rangefinder reads zero." A reading of exactly `0.0` was in the Chapter 9 list of rangefinder habits: it usually means the cable is unplugged. You found a **hardware** problem using **software** evidence, without guessing and without changing a line of real code.

> **Raw and converted, side by side**
>
> In Chapter 9 you kept `getLeftCount()` next to `getLeftDistanceMeters()` "for debugging." This is why. If the count is right and the meters are wrong, the bug is in your conversion constants. If the count itself is wrong, the bug is in the encoder or its wiring. Showing a value before **and** after each step of processing is the same idea as the stage probes above: it tells you which step to blame.

### Is it the code, the robot, or the battery?

On a real robot, plenty of "bugs" are not in the code at all. Before you spend an hour reading Java, rule out the physical world:

| Symptom | Possible non-code cause | How to check |
|---|---|---|
| Robot ignores the controller | Controller in the wrong slot (Chapter 8) | Look at the stick values on the dashboard |
| Robot drives slowly or weakly | Low batteries, or running on USB power | Fresh batteries, then retest |
| One sensor reads `0.0` or never changes | Loose or unplugged cable | Watch its widget while wiggling the cable gently |
| Heading creeps while sitting still | Gyro calibrated while the robot was moving (Chapter 9) | Power-cycle the XRP flat and still |
| Nothing updates at all | Laptop not on the XRP's Wi-Fi | Check your Wi-Fi connection |

This is a habit real FRC programmers lean on constantly. On a competition robot, a motor that will not spin might be a code bug, a bad CAN connection (Chapter 27), a tripped breaker, or a battery that sagged under load. Your dashboard is how you tell them apart: if the code's output to the motor is correct and the motor still does not move, stop reading code and go look at the robot.

> **You cannot fix what you cannot see**
>
> Control engineers have a word for how well you can figure out what is happening inside a system from what you can measure: **observability**. A robot with good telemetry (live data) is easy to debug and easy to tune; a robot with none is a black box. In Chapter 15 you will tune a PID controller by watching a graph of where the robot is supposed to be against where it actually is. If you cannot see both lines, tuning is guesswork. Every dashboard widget you add now is practice for that.

### A few more techniques

- **Change one thing at a time.** If you change three things and the bug disappears, you do not know which change fixed it, and the other two might have broken something else.
- **Make it smaller.** If the bug happens in a long sequence, find the shortest set of steps that still causes it. A bug you can trigger in five seconds is a bug you can fix.
- **Explain it to a rubber duck.** Explain your code, line by line, out loud, to someone who knows nothing about it: a teammate, a pet, or literally a rubber duck on your desk. Partway through the explanation you will very often hear yourself say "...and then this line does... oh." Programmers have used this technique for decades.
- **Use `println` for events, not loops.** A print in a periodic method fires 50 times a second and floods the terminal (Chapter 4). Print when something **happens**, like a mode change or a button press. For values that change every loop, use the dashboard. For a record you can look back at later, use the log you are about to build.

---

## 10.7 Logging: The Robot's Flight Recorder

The dashboard has one big weakness: it only shows **now**. If the robot does something strange for half a second in the middle of a run, the widget has already changed by the time you look. And at a competition, the strangest bugs happen in a match, when nobody is watching the dashboard at all.

Airplanes solve this problem with a **flight recorder**, the "black box" that records what every instrument read during a flight. If something goes wrong, investigators replay the recording afterward. Your robot can have one too.

WPILib's flight recorder is the **`DataLogManager`** class. Start it once, and it writes a **data log** file that records, with timestamps:

- **every value you publish to SmartDashboard**, every time it changes,
- any text messages you send it,
- and, with one more line, the Driver Station state and the controller inputs.

It is two lines in your constructor:

```java
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.DriverStation;
```

```java
DataLogManager.start();
DriverStation.startDataLog(DataLogManager.getLog());
```

Because every dashboard value is already recorded, your whole Chapter 9 sensor dashboard gets saved automatically. You do not have to log each sensor by hand.

### Logging events

The log also records text messages, and this is where `DataLogManager.log(...)` comes in. It works like `System.out.println`: the message is printed to the terminal **and** saved in the log with a timestamp. So it is a drop-in upgrade for the prints you already have for one-time events:

```java
DataLogManager.log("Mode: Teleop");
```

The best things to log are **events**: moments when something changes. The robot started. The mode changed. The driver zeroed the sensors. The wall stop kicked in. Logging an event once, when it happens, keeps the log readable. Logging the same thing every loop buries the one line you need under a thousand that do not matter.

Here is a pattern for logging the moment something **changes**, using a field to remember what it was last loop:

```java
private boolean wasBlocked = false;
```

```java
if (blocked && !wasBlocked) {
    DataLogManager.log("Wall stop ON at " + sensors.getDistanceAheadMeters() + " m");
}
if (!blocked && wasBlocked) {
    DataLogManager.log("Wall stop OFF");
}
wasBlocked = blocked;
```

Read it aloud: "If we are blocked now but were not last loop, the wall stop just turned on: log it. If we are not blocked now but were last loop, it just turned off: log that. Then remember this loop's value for next time." This is the same "did it just change?" idea as `getYButtonPressed()` from Chapter 8, written by hand. You will use it again when you build state machines in Chapter 21.

### The updated `Robot.java`

Here is the full `Robot.java`, starting from Chapter 9. It adds the data log, turns the one-time prints into logged events, and logs the wall stop. Type it, do not paste:

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

    // The robot's parts, created once.
    private final Drivetrain drivetrain;
    private final Sensors sensors;
    private final XboxController controller = new XboxController(DRIVER_CONTROLLER_PORT);
    private final Timer autoTimer = new Timer();

    // Remembered from the last loop, so we can log changes.
    private boolean wasBlocked = false;

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

        // Write.
        drivetrain.arcadeDrive(safeForward * speedScale, rotation * speedScale);

        SmartDashboard.putBoolean("Slow Mode", speedScale == SLOW_MODE_SCALE);
        SmartDashboard.putBoolean("Blocked", blocked);
    }
}
```

Walk through what changed since Chapter 9:

- **Two new imports**, `DataLogManager` and `DriverStation`, both in `edu.wpi.first.wpilibj`.
- **The flight recorder starts first** in the constructor, before anything else happens, so the log captures the whole run.
- **Events are logged**: startup, every mode change, every sensor reset, and the wall stop turning on and off. The startup `println` became a `DataLogManager.log`, which still prints to the terminal.
- **One new field**, `wasBlocked`. It is not `final`, because its whole job is to change every loop. It is a `boolean`, a primitive, so it can never be `null`; it simply starts at the value you gave it, `false`.
- **The probes from Section 10.6 are gone.** Debug widgets are temporary. Once the bug is fixed, take them out so the dashboard stays readable.

> **Where is the log?**
>
> When your program runs on your laptop, as the Explorer does, the log files go in a folder called `logs` inside your project folder. Each run makes a new file whose name starts with `FRC_` and ends in `.wpilog`. The WPILib project template's `.gitignore` already lists `logs/`, so these files will not end up in your commits (check yours: if `git status` shows `logs/` as untracked, add a line `logs/` to `.gitignore`). On a roboRIO, logs go to a USB drive if one is plugged in.

You can open a `.wpilog` file in **AdvantageScope**, a log viewer that comes with WPILib (`WPILib: Start Tool` > `AdvantageScope`). Take a peek if you are curious: you will find every one of your dashboard values, graphed over time, and your event messages in order. Chapter 24 is all about AdvantageScope, and Chapter 17 turns this simple flight recorder into AdvantageKit's full logging, where you can even **replay** a run through your code after the fact.

---

## 10.8 Git Archaeology: Digging Through History

Some bugs are not new. They crept in a week ago, or three weeks ago, in a commit that looked harmless, and nobody noticed until now. The dashboard tells you **what** is wrong today. It cannot tell you **when** it went wrong or **what changed**. Your Git history can.

The WPILib docs suggest two questions for any bug: when was the last time the code worked, and what has changed since then? Git was built to answer exactly that. Archaeologists dig down through layers of soil, each one a little older, until they find the layer where something changed. Your commits are layers.

### Survey the site: `git log`

You already know `git log --oneline`. A few variations make it far more useful:

```bash
git log --oneline -10
```

Only the last ten commits.

```bash
git log --oneline -- src/main/java/frc/robot/Drivetrain.java
```

Only the commits that changed `Drivetrain.java`. (The `--` means "what follows is a file path.") If the bug is "the encoders read wrong," this is a much shorter list to dig through.

```bash
git log --oneline -S "STICK_DEADBAND"
```

Only the commits that **added or removed** the text `STICK_DEADBAND`. Git calls this the **pickaxe**, an appropriately archaeological name. If you suspect a particular constant or method changed, the pickaxe finds every commit that touched it, even across files.

### Inspect one layer: `git show`

Each commit has an ID (the **hash**), like `c41e9a0`. To see exactly what one commit changed:

```bash
git show c41e9a0
```

You get the author, date, and message, followed by the **diff**: every line that was removed (marked `-`, shown in red) and every line that was added (marked `+`, shown in green). A diff for a one-line change looks like this:

```
-        double rotation = -MathUtil.applyDeadband(controller.getRightX(), STICK_DEADBAND);
+        double rotation = MathUtil.applyDeadband(controller.getRightX(), STICK_DEADBAND);
```

One missing minus sign. That is the whole bug, and `git show` just pointed straight at it. (Press `q` to leave the view, just like `git log`.)

You never need to type the whole hash. The seven characters that `--oneline` shows are plenty.

### Compare two layers: `git diff`

In Chapter 3 you used `git diff` to see your uncommitted changes. Give it commit IDs and it compares any two points in history:

```bash
git diff 8d2f713 c41e9a0
```

That shows everything that changed between the two commits, across every file. Add a file path to narrow it down:

```bash
git diff 8d2f713 c41e9a0 -- src/main/java/frc/robot/Robot.java
```

Git also has a shorthand for "a few commits ago." **`HEAD`** means "the commit you are on right now," and `HEAD~3` means "three commits before that." So this shows everything that changed in your last three commits:

```bash
git diff HEAD~3
```

### Who wrote this line? `git blame`

```bash
git blame src/main/java/frc/robot/Robot.java
```

This prints the file with every line labeled with the commit that last changed it, who made that commit, and when. Despite the name, it is not about blaming people. It answers "why is this line like this?": find the commit, then `git show` it to read the message and see what else changed at the same time.

VS Code has a friendlier view of the same history. In the Explorer sidebar, open the **Timeline** section at the bottom while a file is open. It lists every commit that changed that file; click one to see its diff side by side.

> **This is where commit messages pay off**
>
> Archaeology is only as good as the labels on the layers. Compare digging through these two histories:
>
> ```
> 3e1a9f2 stuff                          3e1a9f2 Ch9: add slow mode on right bumper
> b77c0d4 fix                            b77c0d4 Fix: rotation was inverted, negate getRightX
> 0a5e231 changes                        0a5e231 Raise deadband 0.05 to 0.1, stick was drifting
> ```
>
> On the left, you have to `git show` every single commit to learn anything. On the right, you can often spot the guilty commit just by reading the list. Chapter 3 called commit messages "notes to your future self." This is the moment future-you reads them.

---

## 10.9 Time Travel: Checking Out and Reverting

Reading old code is useful. Running it is better. If you can run the code from last Tuesday and watch whether the bug is there, you get hard evidence, not a guess.

### Visiting an old commit

First, make sure `git status` says your working tree is clean. Commit your work (or, if it is junk, undo it) before you time travel; Git will refuse to switch commits if your uncommitted changes would be overwritten.

Then:

```bash
git checkout 8d2f713
```

Git rewinds every file in your project to exactly how it was at that commit. Build and run the program, and you are driving last week's robot. Git prints a long warning when you do this:

```
Note: switching to '8d2f713'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.
...
HEAD is now at 8d2f713 Ch8: controller teleop drive working
```

**Detached HEAD** sounds alarming, but it only means "you are looking at an old commit, not standing on a branch." Think of it as visiting a museum: look at anything you like, but do not move in. Any commits you make here do not belong to any branch and are easy to lose.

When you are done looking, go back to the present:

```bash
git checkout main
```

Every file snaps back to your latest commit. Nothing was lost.

> **`git checkout` and `git switch`**
>
> Git's own warning message mentions `git switch`. That is a newer command that does the branch-switching half of `git checkout`'s job: `git switch main` does the same thing as `git checkout main`, and `git switch --detach 8d2f713` visits an old commit. Both work. This book uses `git checkout` because you met it in Chapter 3, but you will see `git switch` in newer tutorials.

### Undoing a commit safely: `git revert`

Say you have found the bad commit, `a91f3c2`, and the whole commit was a mistake. You could edit the files by hand to undo it. Git can do it for you, precisely:

```bash
git revert --no-edit a91f3c2
```

```
[main 06f14b6] Revert "Ch9: rotate faster in slow mode"
 1 file changed, 1 insertion(+), 1 deletion(-)
```

`git revert` does not delete the old commit. It creates a **new** commit that does the exact opposite of the old one: every line it added gets removed, every line it removed gets put back. Your history now reads "made this change," then later "undid this change," which is honest and complete. (The `--no-edit` part tells Git to use its automatic message, `Revert "..."`, instead of opening a text editor for you to write one.)

Why not just erase the bad commit from history? Because you have already pushed it to GitHub, and your teammates may have already pulled it. Rewriting shared history causes confusing problems for everyone who has a copy. Reverting is the safe, team-friendly way to undo, and it is the one to use on any branch other people use.

> **Revert or fix forward?**
>
> Revert when an entire commit was wrong. When a commit was mostly good but had one bad line, it is usually better to **fix forward**: make a new commit that corrects just that line, with a message that says what was wrong and why. Either way, the history tells the true story, and the next person to dig through it will understand what happened.

---

## 10.10 `git bisect`: Binary Search for Bugs

Sometimes you know the robot worked three weeks ago and is broken today, there are thirty commits in between, and nothing in the commit messages looks suspicious. You could check out each commit and test it one by one. That is thirty build-and-test cycles. There is a much faster way.

### The guessing game

Think of the game where someone picks a number from 1 to 100 and you guess, and they say "higher" or "lower." Nobody good at that game guesses 1, then 2, then 3. You guess 50. "Lower." Then 25. "Higher." Then 37. Each guess cuts the remaining possibilities in half, and you always win within seven guesses. That strategy is called **binary search**.

`git bisect` plays that game with your history. You tell it one commit where the robot was **good** and one where it is **bad**. It checks out the commit halfway between and asks you to test it. You answer "good" or "bad," and it throws away the half of the history that cannot contain the bug, then picks the middle of what is left.

| Commits to search | Tests, one by one | Tests with bisect |
|---|---|---|
| 8 | up to 8 | 3 |
| 30 | up to 30 | 5 |
| 100 | up to 100 | 7 |
| 1,000 | up to 1,000 | 10 |

Each test halves the search, so even an enormous history takes only a handful of tests. Professional teams use `git bisect` on projects with hundreds of thousands of commits.

### A bisect session, step by step

Suppose the encoders read wrong today, but they were fine at your Chapter 9 commit, `c41e9a0`. Make sure `git status` is clean, then:

```bash
git bisect start
git bisect bad                 # the commit I am on now is broken
git bisect good c41e9a0        # this older commit was fine
```

Git picks the middle commit and checks it out:

```
Bisecting: 3 revisions left to test after this (roughly 2 steps)
[12b9007...] Swap encoder channel order for consistency
```

Now **test it**. Build, run, press Y, push the robot forward 10 cm, and look at the distance widgets. Then tell Git what you saw, with exactly one of these:

```bash
git bisect good      # the bug is NOT in this version
git bisect bad       # the bug IS in this version
```

Git picks the next middle commit. Test again, answer again. After a few rounds, it announces the answer:

```
12b9007... is the first bad commit
commit 12b9007...
Author: Sam Student <sam@example.com>
Date:   ...

    Swap encoder channel order for consistency
```

That is the exact commit where the bug was born. Before you do anything else, end the session:

```bash
git bisect reset
```

That returns you to the branch you were on before `git bisect start`. Now `git show 12b9007` to see the change, and fix it with a revert or a fix-forward commit.

> **Test the same way every time**
>
> Bisect is only as accurate as your answers. If you mark a commit "bad" because of a dead battery, Git will happily lead you to the wrong commit. Before you start, write down a short, exact test ("press Y, push forward 10 cm, both distances should read about `0.10`") and run that same test at every step. If a commit will not even build for an unrelated reason, run `git bisect skip` and Git will pick a different commit to test.

### Why this works so well with small commits

Bisect finds the first bad **commit**. If that commit is one line, you have found the bug. If that commit is "Ch9 plus a bunch of other stuff, 400 lines in six files," you have only narrowed it down to 400 lines. This is the deepest reason behind "commit small, commit often" from Chapter 3: small commits make every tool in this chapter more precise.

---

## Chapter Summary

> **What you learned in Chapter 10**
>
> * Coming back to a project starts with a routine: `git status`, `git log --oneline`, build, run, and a **smoke test** before you change anything, so that any new bug is one you caused today.
> * Bugs come in three kinds. **Compile errors** stop the build and point at a line. **Runtime errors** crash the running program with a stack trace. **Logic errors** are silent. Good code moves bugs toward the compiler.
> * Read compile errors carefully: file, line, message, caret. When the line looks fine, check the line above. **Fix the first error first.**
> * An **exception** is Java's way of stopping when something impossible happens. The **call stack** records which method called which; a **stack trace** is a snapshot of it. Find the first `frc.robot` line, and read down to see how you got there. On the XRP, the output appears in VS Code's terminal panel.
> * An object variable holds a **reference**; one that points to nothing holds **`null`**, and using it throws a `NullPointerException`. Making fields `final` and creating objects in the constructor turns that crash into a compile error.
> * Debug logic errors like a scientist: observe, guess, test with evidence, repeat. Use the dashboard as a **probe** at each stage of read, decide, write, and rule out the robot and the battery before blaming the code.
> * `DataLogManager` is the robot's **flight recorder**: it saves every dashboard value and your logged events to a `.wpilog` file. Git archaeology (`git log -S`, `git show`, `git diff`, `git blame`), time travel (`git checkout <commit>`, `git revert`), and `git bisect` find exactly when and where a bug was introduced.

---

## Exercises

### Practice

**1. Break it on purpose.** The best way to learn error messages is to cause them while you know what you did. Make each change below to your project, **one at a time**. Before you build, predict the error message. Then build, read the real message, compare it to your prediction, and undo the change.

1. Delete the semicolon at the end of any line in `teleopPeriodic()`.
2. Change `sensors.isObstacleWithin(...)` to `sensors.isObstacleWithIn(...)` (capital `I`).
3. Delete the line `import edu.wpi.first.math.MathUtil;`.
4. Change `double forward = ...` to `int forward = ...`.
5. Delete one `}` from the middle of `Robot.java`. How many errors do you get? Which one is the real one?

Write one line per change: the message you got, and what it would tell a teammate who did not know what you changed. (Use `git diff` at the end to make sure you undid everything. If you lost track, `git checkout -- .` throws away all uncommitted changes, so only use it when you mean it.)

**2. Read a stack trace.** Here is a stack trace from a teammate's robot:

```
Error at frc.robot.Drivetrain.<init>(Drivetrain.java:19): Unhandled exception instantiating robot edu.wpi.first.wpilibj.xrp.XRPMotor java.lang.IllegalArgumentException: XRPMotor 0 already allocated
	at edu.wpi.first.wpilibj.xrp.XRPMotor.checkDeviceAllocation(XRPMotor.java:31)
	at edu.wpi.first.wpilibj.xrp.XRPMotor.<init>(XRPMotor.java:53)
	at frc.robot.Drivetrain.<init>(Drivetrain.java:19)
	at frc.robot.Robot.<init>(Robot.java:41)
	...
```

(`<init>` is how a stack trace names a **constructor**. And yes, WPILib's message names `XRPMotor` as the "robot" it was instantiating; it just reports the class at the top of the stack, so do not let that confuse you.) Answer in writing: What type of exception is it? What is the first line of the team's own code? Which method called that one? What do you think the teammate wrote at `Robot.java` line 41, and how would you fix it?

**3. Probe a bug.** Ask a partner to secretly make **one** change to your `teleopPeriodic()` that breaks driving without causing a compile error (for example, delete a minus sign, swap `SLOW_MODE_SCALE` and `FULL_SPEED_SCALE`, or change `>` to `<`). Without reading the code first, add `DBG` probes at the read, decide, and write stages, and use only the dashboard to find which stage is wrong. Then find the line. Swap roles.

### Build (XRP Explorer)

Give the Explorer a flight recorder, then use Git to hunt down a planted bug.

**Part A: the flight recorder.**

1. Update `Robot.java` to the listing in Section 10.7. Build and confirm `BUILD SUCCESSFUL`.
2. Run the program. In the terminal panel, confirm you see `XRP Explorer started!` and `Mode: Disabled`.
3. Press Y, enable Teleoperated, and drive slowly at a wall until the wall stop engages. Back away. Disable.
4. Stop the program and find the newest `FRC_...wpilog` file in your project's `logs` folder.
5. Optional: open it in AdvantageScope and find your `Wall stop ON` message and the `Distance Ahead (m)` values from the same moment.
6. Run `git status` and confirm that `logs/` does **not** appear. If it does, add `logs/` to `.gitignore`.
7. Commit this now (see the Git exercise below), **before** Part B.

**Part B: the bug hunt.** You will create a short history with a bug hidden in it, then find it with `git bisect`. If you can, do this with a partner (see Collab), so that you really do not know which commit is bad. Working alone, you will know where the bug is, and that is fine: the goal is to practice the moves until they are automatic, so they are there for you when you truly do not know.

1. Create a practice branch: `git checkout -b bug-hunt`.
2. Make these six commits, in order, building after each one. Use exactly these messages:

| # | Change | Commit message |
|---|---|---|
| 1 | Add a comment above the constants in `Drivetrain.java` explaining where 585 comes from | `Explain counts per wheel rev` |
| 2 | Change the `Mode` string in `teleopInit()` from `"Teleop"` to `"Teleoperated"` | `Use full mode name on dashboard` |
| 3 | In `Drivetrain.java`, change `new Encoder(4, 5)` to `new Encoder(5, 4)` | `Tidy up encoder setup` |
| 4 | Add the comment `// Gyro: counterclockwise is positive` above the gyro getters in `Drivetrain.java` | `Comment gyro section` |
| 5 | Change `SLOW_MODE_SCALE` from `0.5` to `0.4` | `Make slow mode a bit slower` |
| 6 | Add `DataLogManager.log("Autonomous done")` when the auto timer passes 1 second | `Log end of auto` |

(Change 6 will log every loop after one second. That is a small bug of its own, worth noticing. Can you fix it with the "did it just change?" pattern?)

3. Now pretend you just came back from a break and discover that pushing the robot forward makes the `Avg Distance (m)` widget stay near zero. Write down your exact test: "Press Y, push forward 10 cm, both distances should read about `0.10`."
4. Find the hash of your Part A commit with `git log --oneline`. That is your known-good commit.
5. Run `git bisect start`, `git bisect bad`, and `git bisect good <your Part A hash>`. At each step, build, run, do your exact test, and answer `good` or `bad`.
6. When Git names the first bad commit, write down its hash and message, then run `git bisect reset`.
7. Run `git show` on the bad commit. Explain in one sentence why swapping the channel order breaks the left distance. (Hint: what did the Chapter 9 Build exercise say about encoders that count backward?)
8. Fix it with `git revert --no-edit <hash>`, run your test again to confirm, and look at the new commit in `git log --oneline`.
9. Go back to `main` with `git checkout main`. This branch was practice, so do not merge it. Delete it with `git branch -D bug-hunt` (a capital `D`, because Git warns you before deleting a branch that was never merged).

When you can find the bad commit in three tests and explain why it was bad, you have the most powerful debugging tool in this book. In Chapter 11 you will start merging other people's work into yours, and "which commit broke it?" stops being a practice question.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. The planted bug's commit message was `Tidy up encoder setup`. What would have made that message more helpful to the person hunting the bug? Rewrite it. Then explain why a message that honestly described the change ("Swap left encoder channels to 5, 4") might have led to the bug being caught in review.
2. Your teammate deleted `final` to make a compile error go away, and the program started crashing instead. Explain why a compile error is better than a runtime crash, and why a runtime crash is better than a silent logic error.
3. When the robot misbehaves, why should you gather evidence (with probes, logs, or a smoke test) before changing any code? Describe what can go wrong if you change code based on a guess.

If any answer feels shaky, re-read Sections 10.2, 10.5, and 10.6.

### Git

Commit the flight recorder from Part A of the Build:

```bash
git add .
git commit -m "Ch10: add data logging for events and dashboard values"
git push
```

Then practice time travel on your real history. Find your Chapter 5 commit with `git log --oneline`, check it out with `git checkout <hash>`, and run it. You are looking at the robot from five chapters ago: just a mode skeleton and some prints. Notice how much less the dashboard shows. Then come back with `git checkout main` and run `git status` to confirm you are back on your branch with nothing changed.

Every commit you have pushed since Chapter 3 is a save point you can return to. This exercise is proof.

### Collab

**Bug swap.** Pair up. Each partner creates a `bug-hunt` branch of their own Explorer with six to eight small commits, exactly one of which plants a bug that does not cause a compile error. Give your planted commit a boring, innocent-sounding message. Push the branch to GitHub (`git push -u origin bug-hunt`).

Then swap: clone your partner's repository (if it is private, they can add you as a collaborator on GitHub under **Settings** > **Collaborators**), check out their `bug-hunt` branch, and find the bug with `git bisect`. You may not read their diffs until bisect names a commit. Afterward, compare: how many tests did each of you need, and would better commit messages have made it faster?

---

> **Additional Resources**
>
> * **Reading stacktraces (WPILib)**: [docs.wpilib.org/en/stable/docs/software/basic-programming/reading-stacktraces.html](https://docs.wpilib.org/en/stable/docs/software/basic-programming/reading-stacktraces.html) WPILib's own guide to unhandled exceptions, with worked examples of `NullPointerException`, divide by zero, and "already allocated" errors
> * **On-robot telemetry recording into data logs (WPILib)**: [docs.wpilib.org/en/stable/docs/software/telemetry/datalog.html](https://docs.wpilib.org/en/stable/docs/software/telemetry/datalog.html) how `DataLogManager` works, where log files go, and how to record Driver Station and joystick data
> * **What is an exception? (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/essential/exceptions/definition.html](https://docs.oracle.com/javase/tutorial/essential/exceptions/definition.html) a short explanation of exceptions and the call stack, from Java's own documentation
> * **Pro Git: Debugging with Git**: [git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git](https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git) the free Git book's chapter on `git blame` and `git bisect`, including how to automate bisect with a test script
> * **`git bisect` reference**: [git-scm.com/docs/git-bisect](https://git-scm.com/docs/git-bisect) every bisect option, including `skip`, `log`, and `run`

---

*Next up, Chapter 11: Collaboration and Merge Conflicts. You will work on a feature branch, merge a teammate's changes into yours, and resolve your first real merge conflict, together.*
