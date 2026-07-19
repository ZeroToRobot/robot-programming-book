# Chapter 4: Your First Java Program

You have a working development environment. You have a version-controlled project on GitHub. Now it's time to write some actual Java.

This chapter introduces variables, the four data types you'll use most often, and how to print values from your program so you can see what's happening. You'll write code that lives entirely on your laptop at first, then move it to the XRP and watch a real LED blink based on a real variable. By the end, you'll be able to read live values from your robot in SmartDashboard while it's running.

If you've never written code before, this is the chapter where it starts to feel like programming. Take your time, and don't be afraid to break things.

---

## 4.1 What Is a Variable?

Every robot program is a 50 Hz loop that reads inputs and writes outputs. Chapter 1 made that idea central. But here's the part we glossed over: between the inputs and the outputs, the program needs somewhere to put values. The joystick reading. The motor speed you computed from it. The current battery voltage. The number of seconds since autonomous started.

Those values live in **variables**.

A variable is a named container in your program that holds a value. You give it a name, you say what kind of value it holds, and you can read from it or write to it as many times as you want.

Here's the simplest possible example:

```java
int batteryPercent = 85;
```

In English: "create a container called `batteryPercent` that holds whole numbers, and put the value `85` in it."

You can read it later:

```java
System.out.println(batteryPercent);  // prints 85
```

You can change it:

```java
batteryPercent = 80;
System.out.println(batteryPercent);  // now prints 80
```

That's the whole idea. A variable is a labeled box. You can look inside, you can put something new in, and you can refer to it by name from anywhere in your code.

> **Why do we need variables at all?**
>
> Imagine writing a program that computes the average of three sensor readings. Without variables, you'd have to take each reading and immediately use it before reading the next one, with no way to compare or combine them. Variables are how programs remember things long enough to do something useful with them.

---

## 4.2 The Four Data Types You'll Use Most

Java is a **typed language**, which means every variable has to declare what kind of value it holds. The compiler enforces this. If you say a variable holds whole numbers, you can't later put a sentence in it.

This feels like extra work at first, but it's actually a feature: it catches a huge category of bugs before the robot ever moves. We'll come back to that idea at the end of the chapter.

Here are the four types you'll use constantly in robot code:

### `int`: whole numbers

`int` (short for "integer") holds whole numbers, positive or negative, no decimal point.

```java
int teamNumber = 3415;
int encoderTicks = -120;
int blinkCount = 0;
```

You'll use `int` for counts, IDs, and anything that's inherently a whole number: a CAN ID, a button index, the number of times a sensor has triggered.

### `double`: numbers with decimals

`double` holds numbers that can have a fractional part. Most physical measurements in robotics are doubles: distances, voltages, angles, motor speeds.

```java
double motorSpeed = 0.75;
double batteryVoltage = 12.3;
double angleDegrees = -45.5;
```

Motor speeds in WPILib are doubles between `-1.0` and `1.0`. Sensor readings are almost always doubles. When in doubt for a numeric value in robot code, use `double`.

> **Why "double"?**
>
> The name comes from "double-precision floating-point number," a technical term for how the computer stores it. There's also a `float` type that uses less memory but is less precise. In FRC code, we always use `double`. Don't worry about `float` for now.

### `boolean`: true or false

`boolean` holds exactly one of two values: `true` or `false`. That's it. No middle ground, no other options.

```java
boolean isEnabled = true;
boolean buttonPressed = false;
boolean limitSwitchTriggered = false;
```

Booleans are how the robot answers yes/no questions: Is the robot enabled? Is the limit switch pressed? Are we in autonomous mode? You'll use them in conditionals (`if` statements) starting in Chapter 6.

### `String`: text

`String` holds a piece of text, surrounded by double quotes:

```java
String robotName = "XRP Explorer";
String currentMode = "teleop";
String statusMessage = "Robot is running!";
```

You'll use strings mostly for messages on the dashboard, log output, and labels. The robot itself doesn't care about text, but the humans watching it do.

### A Reference Table

| Type | Holds | Example values |
| --- | --- | --- |
| `int` | whole numbers | `0`, `42`, `-7`, `3415` |
| `double` | numbers with decimals | `0.5`, `-1.0`, `12.3`, `3.14` |
| `boolean` | true or false | `true`, `false` |
| `String` | text in double quotes | `"hello"`, `"XRP-1"`, `""` |

> **Capitalization matters**
>
> `int`, `double`, and `boolean` start with lowercase letters. `String` starts with a capital `S`. This isn't a typo, it reflects something deeper about how Java works (we'll get to it in Chapter 7). For now, just remember: lowercase for the first three, capital `S` for `String`.

---

## 4.3 Declaring and Using Variables

Let's look at the structure of a variable declaration more carefully.

```java
int teamNumber = 3415;
```

Three parts:

1. `int` is the **type**: what kind of value the variable holds
2. `teamNumber` is the **name**: how you refer to the variable later
3. `3415` is the **value**: what's actually inside

The `=` is called the **assignment operator**. It doesn't mean "is equal to" the way it does in math. It means "put this value into this variable." Think of it as an arrow pointing left: the value on the right gets stored in the variable on the left.

The line ends with a semicolon `;`. Java requires a semicolon at the end of every statement. Forgetting them is the single most common beginner mistake. The compiler will tell you exactly which line is missing one, but you'll still forget sometimes. Everyone does.

### Naming Variables

You have a lot of freedom in naming variables, but there are some rules and some strong conventions:

**Rules (the compiler enforces these):**

- Names start with a letter, `_`, or `$` (in practice, always a letter)
- After the first character, you can use letters, digits, `_`, and `$`
- No spaces, no dashes, no special characters like `!` or `@`
- You can't use Java keywords as names (`int`, `class`, `if`, `return`, etc.)

**Conventions (the team enforces these):**

- Use **camelCase**: start with a lowercase letter, capitalize each new word. `motorSpeed`, `batteryVoltage`, `isEnabled`. Not `motorspeed`, not `MotorSpeed`, not `motor_speed`.
- Names should be descriptive. `batteryVoltage` is much better than `bv` or `x`.
- Boolean names usually start with `is`, `has`, or similar: `isEnabled`, `hasTarget`, `buttonPressed`.

> **Naming is a real engineering skill**
>
> Good names make code readable. Bad names make code mysterious. A variable called `x` tells you nothing. A variable called `leftEncoderDistanceMeters` tells you exactly what it is, what unit it's in, and where it came from.
>
> Spend the extra second to give variables real names. Your future self (and your teammates reviewing your pull requests) will thank you.

### Changing a Variable's Value

Once a variable is declared, you can change its value without re-declaring the type:

```java
int blinkCount = 0;
blinkCount = 1;
blinkCount = 2;
blinkCount = blinkCount + 1;  // now 3
```

That last line is worth pausing on. `blinkCount = blinkCount + 1` is not a math equation. It means: "take the current value of `blinkCount`, add 1, and put the result back in `blinkCount`." This pattern shows up everywhere in robot code, especially for counters.

There's also a shortcut for it:

```java
blinkCount++;  // exactly the same as blinkCount = blinkCount + 1
```

You'll see both forms in real code.

---

## 4.4 Printing Values with `System.out.println`

A variable is invisible until you make it visible. The simplest way to see what's in a variable is to print it.

In Java, the basic print statement is:

```java
System.out.println("Hello, robot!");
```

`System.out.println` (read out loud as "System out print line") prints whatever you put inside the parentheses to a console window, followed by a newline. You can print strings:

```java
System.out.println("Robot starting up");
```

Numbers:

```java
System.out.println(42);
System.out.println(3.14);
```

Variables:

```java
int teamNumber = 3415;
System.out.println(teamNumber);
```

And combinations, using the `+` operator to glue strings and values together:

```java
int teamNumber = 3415;
double batteryVoltage = 12.3;
System.out.println("Team " + teamNumber + " battery: " + batteryVoltage + "V");
// prints: Team 3415 battery: 12.3V
```

When `+` is used between a string and a number, Java automatically converts the number to its text form and joins them. This is called **string concatenation**.

> **`println` vs `print`**
>
> `System.out.println` adds a newline at the end so the next thing prints on a new line. `System.out.print` does not. You'll almost always want `println` for robot logging, since you usually want each message on its own line.

### Where Does the Output Go?

When you run code on your laptop (in a normal Java program), `System.out.println` prints to your terminal or VS Code's output panel.

When you run code on the XRP, it prints to the **RioLog** (a window inside VS Code that shows messages from the robot). You can open RioLog with `Ctrl+Shift+P` → `WPILib: Start RioLog`. We'll look at it in action shortly.

`System.out.println` is fine for occasional messages, but for live values you want to watch change over time, there's a better tool: SmartDashboard. We'll use that later in this chapter.

---

## 4.5 Writing and Running Code on Your Laptop First

Before we touch the XRP, let's write some Java that runs on your laptop. This is the fastest way to see how variables and printing work without the overhead of a deploy cycle.

We'll do this inside your XRP Explorer project, but in a way that runs on your laptop, not on the robot. The Desktop Support checkbox you ticked when creating the project in Chapter 2 is what makes this possible.

### Step 1: Open `Robot.java`

In VS Code, open `src/main/java/frc/robot/Robot.java`. You should see the TimedRobot template from Chapter 2.

Find the `robotInit()` method. It's the method called once, at the very start, when the robot program first runs.

### Step 2: Add Some Variables and Prints

Inside `robotInit()`, add the following:

```java
@Override
public void robotInit() {
    int teamNumber = 3415;
    double batteryVoltage = 12.3;
    boolean isReady = true;
    String robotName = "XRP Explorer";

    System.out.println("---- Robot starting up ----");
    System.out.println("Robot: " + robotName);
    System.out.println("Team: " + teamNumber);
    System.out.println("Battery: " + batteryVoltage + "V");
    System.out.println("Ready? " + isReady);
}
```

Replace `3415` with your own team number if you have one. The point isn't the specific values, it's seeing variables and prints work together.

### Step 3: Build the Project

Press `Ctrl+Shift+P` → `WPILib: Build Robot Code`. You should see `BUILD SUCCESSFUL`.

If you see a red error message instead, read it carefully. The most common errors at this stage are:

- **Missing semicolon**: the compiler will point at the next line and complain
- **Mismatched quotes**: every `"` needs a matching `"`
- **Typo in a name**: Java is case-sensitive, `BatteryVoltage` and `batteryVoltage` are different variables

Fix any errors and build again until you get a clean build.

### Step 4: Deploy to the XRP

Connect to the XRP's Wi-Fi (you remember the drill from Chapter 2). Then `WPILib: Deploy Robot Code`. Wait for `SUCCESS`.

### Step 5: Open RioLog and See the Output

`Ctrl+Shift+P` → `WPILib: Start RioLog`. A window opens at the bottom of VS Code.

The XRP just rebooted with your new code, and `robotInit()` ran exactly once at startup. You should see your print messages in RioLog:

```
---- Robot starting up ----
Robot: XRP Explorer
Team: 3415
Battery: 12.3V
Ready? true
```

If you see this, your code ran on the robot. The variables you declared in Java actually existed in the XRP's memory long enough to be printed.

> **Why these messages only show up once**
>
> `robotInit()` is called exactly once when the program starts. The XRP rebooted on deploy, so the program just started, so `robotInit` just ran. If you want to see something print repeatedly, you'd put it in `robotPeriodic()`, which runs every 20 ms. Don't do that with print statements: you'd get 50 messages per second and saturate the log. We'll get to a much better approach in Section 4.7.

---

## 4.6 Your First Real Output: Blinking the LED

Printing values to a console is fine, but this is a robotics book. Let's make something physical happen.

The XRP has an onboard LED you can control from your code. We'll write a program that turns it on, and then a slightly more interesting one that uses a variable to decide whether to turn it on or off.

### Setting Up the LED

WPILib gives you a class called `XRPOnBoardIO` that exposes the XRP's LED, button, and a couple of other things. To use it, you need two things:

1. An `import` line at the top of the file so Java knows where the class lives
2. A variable that holds an instance of the class

Add the import near the top of `Robot.java`, with the other imports:

```java
import edu.wpi.first.wpilibj.xrp.XRPOnBoardIO;
```

Then, just inside the `Robot` class but outside any method, add a field:

```java
public class Robot extends TimedRobot {

    private final XRPOnBoardIO onBoardIO = new XRPOnBoardIO();

    @Override
    public void robotInit() {
        // ... your existing code
    }
    // ... rest of the file
}
```

Don't worry about `private final` or `new XRPOnBoardIO()` for now. You'll understand both completely by Chapter 7. For this chapter, just trust that this line gives you a variable called `onBoardIO` that you can use to control the LED.

### Turning the LED On

Inside `robotInit()`, after your print statements, add:

```java
onBoardIO.setLed(true);
```

`setLed` is a method on the `onBoardIO` object. You're passing it a boolean: `true` means on, `false` means off.

Build and deploy. Watch the XRP. The LED should turn on and stay on.

You just controlled physical hardware from a Java program. That's the loop from Chapter 1, even if a very small version of it.

### Using a Variable to Control the LED

Let's tie this back to variables. Change your code to:

```java
@Override
public void robotInit() {
    boolean ledShouldBeOn = true;

    System.out.println("LED state: " + ledShouldBeOn);
    onBoardIO.setLed(ledShouldBeOn);
}
```

Now the LED state is held in a variable. Deploy and watch. The LED should still be on, but now its state is determined by `ledShouldBeOn`.

Change the variable to `false`, redeploy, and watch the LED stay off. This is a tiny example, but it captures the whole idea: your code reads or computes a value, stores it in a variable, and the variable drives behavior in the world.

> **One step closer to a real program**
>
> Right now, the LED state is hardcoded. You change it by editing your code and redeploying. In Chapter 6 you'll learn how to compute the value at runtime: turn the LED on if a button is pressed, or if a sensor sees something, or if the robot is in autonomous mode. The variable stays the same. What changes is where its value comes from.

---

## 4.7 SmartDashboard: Watching Variables Live

Here's a problem with print statements: every time you want to know what a variable is doing right now, you have to print it, redeploy, run the robot, and read the log. That's slow, and the log fills up fast if you print every loop.

SmartDashboard solves this. You send a value from your robot code, and SmartDashboard displays it as a live widget on your laptop screen. The value updates every time you send it, with no log spam.

You already used `SmartDashboard.putString` once in Chapter 2. Let's use it for real now.

### The `put` Methods

SmartDashboard has a `put` method for each data type:

```java
SmartDashboard.putNumber("Battery Voltage", 12.3);
SmartDashboard.putBoolean("Is Enabled", true);
SmartDashboard.putString("Status", "Running");
```

The first argument is the **key**: a label that becomes the widget name on the dashboard. The second is the **value** to display.

Notice that `putNumber` is used for both `int` and `double`. SmartDashboard treats them the same way, so a single `putNumber` works for any numeric value.

### A Live Loop Example

Print statements went in `robotInit()` because it only runs once. SmartDashboard is the opposite: it's designed to be called every loop, so you put it in `robotPeriodic()`, which runs every 20 ms.

Make sure `SmartDashboard` is imported (you added this in Chapter 2):

```java
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
```

Then, in `robotPeriodic()`:

```java
@Override
public void robotPeriodic() {
    double matchTime = Timer.getFPGATimestamp();
    boolean ledOn = onBoardIO.getLed();
    String mode = isEnabled() ? "Enabled" : "Disabled";

    SmartDashboard.putNumber("Match Time", matchTime);
    SmartDashboard.putBoolean("LED On", ledOn);
    SmartDashboard.putString("Mode", mode);
}
```

You'll need one more import:

```java
import edu.wpi.first.wpilibj.Timer;
```

Don't worry about the `?` on the `mode` line: it's a shorthand for an if/else that we'll cover in Chapter 6. For now, just know it sets `mode` to `"Enabled"` if the robot is enabled, `"Disabled"` otherwise.

Build, deploy, and open SmartDashboard (`WPILib: Start Tool` → `SmartDashboard`). You should see three widgets: `Match Time` ticking up, `LED On` showing the current LED state, and `Mode` changing whenever you enable or disable the robot in the Driver Station.

That's a live view of what's happening on your robot, updating 50 times per second, with no print spam.

> **Print for setup, dashboard for runtime**
>
> A useful rule of thumb: use `System.out.println` for things that happen once or rarely (startup, errors, mode transitions). Use SmartDashboard for things that change continuously (sensor readings, motor speeds, state). Both are useful. Mixing them up is a common reason debug output becomes unreadable.

---

## 4.8 Why Java Makes You Declare Types

Let's circle back to a question that probably bothered you earlier: why does Java make you write `int` or `double` or `boolean`? Other languages (Python, JavaScript) don't require this. Why does Java?

The short answer: it catches bugs before the robot moves.

Imagine you accidentally try to do this:

```java
int teamNumber = 3415;
teamNumber = "three thousand four hundred fifteen";  // ERROR
```

Java will refuse to compile that code. The compiler sees that `teamNumber` was declared as an `int` and you're trying to put a `String` in it. You get an error at build time, before the program even runs.

In a language without types, that same mistake might compile fine and only blow up at runtime, possibly in the middle of a match, possibly in a way that's hard to trace back to its cause. The robot runs into a wall, you check the logs, and you see something that doesn't immediately look like the bug.

Type checking is a safety net. It costs you a few extra characters when you declare variables. In return, an entire category of bugs is impossible.

> **A real-world example**
>
> A common bug is mixing up units. You read a sensor that returns angles in radians and pass it to a function expecting degrees. Java's type system can't catch unit mismatches by default, but a more advanced technique called custom types can. You'll see a hint of this in WPILib's `Rotation2d` class in Chapter 14: it represents an angle without committing to a particular unit, and provides methods like `getDegrees()` and `getRadians()` so you have to ask for the unit explicitly.
>
> The general principle is the same: the more your types tell the compiler about what's allowed, the more bugs the compiler can catch for you.

---

## 4.9 What You Built

Take stock of what just happened. In one chapter, you went from "what is a variable?" to:

- Declaring variables of four different types
- Printing values to a log on the robot
- Using a variable to control a physical LED
- Streaming live values from the robot to your laptop dashboard

That's the input/process/output loop from Chapter 1, but now you're the one writing the "process" part. The variables are how the program holds state between reading inputs and writing outputs.

Every chapter from here on builds on this. Joystick values come in as doubles. Encoder readings are doubles. Buttons are booleans. Motor commands are doubles between -1.0 and 1.0. Subsystem state will live in fields like the ones you declared above. There's nothing in the rest of this book that doesn't reduce, eventually, to variables holding values and methods doing things with them.

---

## Chapter Summary

> **What you learned in Chapter 4**
>
> - A **variable** is a named container that holds a value; you declare its type, give it a name, and assign a value with `=`
> - The four main data types are **`int`** (whole numbers), **`double`** (decimal numbers), **`boolean`** (true/false), and **`String`** (text)
> - **`System.out.println`** prints values once to RioLog; great for startup messages and errors
> - **`SmartDashboard.putNumber`/`putBoolean`/`putString`** stream live values to your laptop dashboard; great for watching values change in real time
> - The XRP's onboard LED can be controlled with `onBoardIO.setLed(boolean)`; this is your first real input-to-output loop
> - Java's **type system** catches an entire class of bugs at build time instead of letting them blow up during a match

---

## Exercises

### Practice

In `robotInit()`, declare four variables of four different types: an `int`, a `double`, a `boolean`, and a `String`. Before you run the program, write down on paper exactly what you expect each `System.out.println` to print. Then run it and compare. If anything surprised you, that's worth understanding before you move on.

Next, add a fifth variable that combines two of the others into a string, like:

```java
String summary = "Team " + teamNumber + " is ready: " + isReady;
System.out.println(summary);
```

Predict the output, then verify.

### Build (XRP Explorer)

Add the LED control and the SmartDashboard live values from Sections 4.6 and 4.7 to your XRP Explorer project. Specifically:

1. Add a `boolean ledShouldBeOn` variable in `robotInit()` and use it to set the LED
2. In `robotPeriodic()`, send `Match Time`, `LED On`, and `Mode` to SmartDashboard
3. Confirm all three widgets appear in SmartDashboard and the values look reasonable

This is the start of a habit you'll keep for the rest of the book: every chapter where the Explorer gains new behavior, that behavior gets a dashboard widget so you can see it working.

### Reflect

In your own words, answer these questions in writing. Two or three sentences each is fine.

1. Why does Java require you to declare a variable's type? What kind of bug does this prevent?
2. What's the difference between `System.out.println` and `SmartDashboard.putNumber`? When would you use each?
3. The line `blinkCount = blinkCount + 1` doesn't make sense as a math equation. What does it mean as code?

If your answer to any of these feels shaky, re-read the relevant section before moving on. The concepts in this chapter are foundational, and Chapter 5 assumes you're comfortable with them.

### Git

Commit your work with a clear message:

```bash
git add .
git commit -m "Ch4: variables, LED control, dashboard live values"
git push
```

---

> **Additional Resources**
>
> - **Java primitive types**: [docs.oracle.com/javase/tutorial/java/nutsandbolts/datatypes.html](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/datatypes.html) the official tutorial on Java's basic types, with more detail than you need but a useful reference
> - **Java naming conventions**: [google.github.io/styleguide/javaguide.html#s5-naming](https://google.github.io/styleguide/javaguide.html#s5-naming) Google's Java style guide; the conventions used by most professional Java codebases
> - **WPILib SmartDashboard guide**: [docs.wpilib.org/en/stable/docs/software/dashboards/smartdashboard](https://docs.wpilib.org/en/stable/docs/software/dashboards/smartdashboard/index.html) every widget type and how to use it
> - **WPILib XRP API reference**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/xrp/package-summary.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/xrp/package-summary.html) Javadoc for `XRPOnBoardIO`, `XRPMotor`, and the rest of the XRP-specific classes
> - **WPILib RioLog documentation**: [docs.wpilib.org/en/stable/docs/software/vscode-overview/viewing-console-output.html](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/viewing-console-output.html) how to view, filter, and save robot console output

---

*Next up, Chapter 5: How a Robot Program Is Structured. You'll learn what every method in the TimedRobot template actually does, when each one runs, and how the 50 Hz loop from Chapter 1 is implemented in code.*