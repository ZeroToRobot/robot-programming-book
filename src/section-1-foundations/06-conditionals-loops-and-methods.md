# Chapter 6: Conditionals, Loops, and Methods

In Chapter 4, you learned how to store values in variables. In Chapter 5, you learned how a robot program is structured: the 50 Hz loop, the modes, the init and periodic methods. Those two chapters gave you the skeleton.

This chapter gives you the muscles.

A robot that can store values but cannot make decisions is not really a robot. It is a glorified data logger. To do anything interesting, your program needs to ask questions ("is the rangefinder seeing a wall?"), repeat work ("blink the LED five times"), and reuse logic so you do not have to copy-paste yourself into a corner ("drive forward at half speed, but use the same code we wrote yesterday").

The three tools that make this possible are conditionals, loops, and methods. They are the verbs of a robot program. Every line of meaningful logic you will ever write uses at least one of them, usually all three.

By the end of this chapter, your XRP will respond to button presses, blink its LED a configurable number of times, and drive forward using a method you wrote yourself, called from the periodic loop with a single clean line.

---

## 6.1 Why Decisions Matter on a Robot

Let's start with a real moment.

Imagine you are driving your XRP toward a wall. You want it to stop automatically before it hits the wall. The rangefinder reads the distance ahead. What do you actually want your code to do?

In English: "If the rangefinder reads less than 20 centimeters, stop the motors. Otherwise, keep driving."

That word "if" is the whole game. Up until this chapter, every line of code you have written runs every single time the loop ticks. Variables get set. Values get printed. The LED blinks at a fixed rate. There is no choice involved.

A conditional is how you give your program a choice. It is the difference between a robot that always does the same thing and a robot that responds to its environment.

> **The smallest unit of intelligence**
>
> Every interesting robot behavior, from "stop before hitting a wall" to "shoot when aimed at the target" to "switch to backup auto if the primary path fails", is built on conditionals. They are the smallest unit of intelligence in a robot program.

---

## 6.2 The `if` Statement

Here is the simplest possible conditional in Java:

```java
if (distance < 20.0) {
    stopMotors();
}
```

Let's read that out loud. "If distance is less than twenty point zero, stop motors." That is almost identical to the English version. Java is unusually readable for a programming language, and `if` statements are where that readability shines.

The structure is always:

```java
if (someConditionThatIsTrueOrFalse) {
    // code that runs when the condition is true
}
```

The thing in parentheses is called the **condition**. It must be a boolean: a value that is either `true` or `false`. The thing in curly braces is called the **body**. It only runs when the condition is true.

If the condition is false, the body is skipped entirely. The program just keeps going.

### A Concrete XRP Example

Open up a chapter scratch project and try this in `teleopPeriodic()`:

```java
double distance = rangefinder.getDistance();
SmartDashboard.putNumber("Distance", distance);

if (distance < 20.0) {
    SmartDashboard.putString("Status", "Wall ahead, stopping");
} else {
    SmartDashboard.putString("Status", "Clear, can drive");
}
```

Deploy this and slowly push the XRP toward a wall while watching SmartDashboard. The status string will switch the moment you cross the 20 cm threshold.

That switch is your conditional firing. Notice that the program does not have to do anything special to detect the switch. It just runs the `if` check 50 times per second, and one of those 50 ticks happens to be the first one where the condition becomes true.

> **The loop and the `if` work together**
>
> The 50 Hz loop and the `if` statement work together. The loop makes sure your conditions get checked constantly. The `if` makes sure the right code runs at the right moment. Together, they give the illusion of continuous responsiveness from a program that is actually just running the same check over and over.

---

## 6.3 Comparison Operators

To write a useful condition, you need to be able to compare values. Java has six comparison operators. You will use all of them in this book.

| Operator | Meaning | Example |
| --- | --- | --- |
| `==` | equal to | `mode == 1` |
| `!=` | not equal to | `state != "DONE"` |
| `<` | less than | `distance < 20.0` |
| `>` | greater than | `voltage > 11.5` |
| `<=` | less than or equal to | `ticks <= 1000` |
| `>=` | greater than or equal to | `angle >= 90.0` |

Each one of these takes two values and produces a boolean. `5 < 10` is `true`. `5 > 10` is `false`. That boolean is exactly what an `if` statement needs.

### The `==` Trap

Notice that the equality operator is two equals signs (`==`), not one. A single equals sign (`=`) means "assign this value", as in `int x = 5;`. Two equals signs mean "are these two values equal?".

This is one of the most common mistakes in early Java code. Watch this:

```java
if (mode = 1) {   // BUG: this assigns 1 to mode, not compares
    // ...
}
```

Java will refuse to compile this if `mode` is an `int`, because the result of an assignment is not a boolean. But if `mode` is a `boolean`, this kind of typo can sneak past the compiler and create a very confusing bug. Read your conditions carefully.

> **Strings need `.equals()`, not `==`**
>
> For comparing strings, do not use `==`. Use `.equals()` instead, like `if (state.equals("DONE"))`. This is a Java quirk worth knowing now: `==` on strings checks whether they are the *same object* in memory, not whether they have the *same contents*. We will revisit this when we get to classes in Chapter 7.

---

## 6.4 `else` and `else if`

The full shape of an `if` statement has two more pieces.

`else` runs when the condition is false:

```java
if (distance < 20.0) {
    stopMotors();
} else {
    driveForward();
}
```

`else if` lets you check more conditions in order:

```java
if (distance < 10.0) {
    SmartDashboard.putString("Status", "Very close, stop now");
} else if (distance < 30.0) {
    SmartDashboard.putString("Status", "Slowing down");
} else {
    SmartDashboard.putString("Status", "All clear");
}
```

Java checks each condition top to bottom. As soon as one is true, it runs that block and skips the rest. If none are true and there is an `else` at the end, the `else` block runs. If there is no `else`, nothing runs.

Order matters. If you flipped the first two conditions in the example above, the `< 30.0` block would always run first, even when you were 5 cm from the wall, because 5 is also less than 30. Always order your conditions from most specific to most general.

---

## 6.5 Boolean Logic: `&&`, `||`, and `!`

Real robot decisions almost always involve more than one condition. You do not just check distance, you check distance *and* whether the driver pressed the override button. You do not just check the gyro, you check whether autonomous mode is active *or* the auto-align trigger is held.

Java has three logical operators for combining booleans:

| Operator | Meaning | When it is true |
| --- | --- | --- |
| `&&` | AND | both conditions are true |
| <code>\|\|</code> | OR | at least one condition is true |
| `!` | NOT | the condition is false |

A few examples in robot terms:

```java
// Only drive forward if the path is clear AND the driver wants to drive
if (distance > 30.0 && controller.getRightTrigger() > 0.1) {
    driveForward();
}

// Stop if the wall is too close OR the driver pulled the brake
if (distance < 20.0 || controller.getLeftBumper()) {
    stopMotors();
}

// Drive only when the robot is NOT tipped over
if (!isTipped) {
    driveForward();
}
```

Read each of those out loud in plain English. The Java reads almost the same way it sounds.

> **Short-circuit evaluation**
>
> Java is "short-circuit" evaluated. In `a && b`, if `a` is already false, Java does not bother checking `b`, because the answer is already known to be false. Same for `||`: if `a` is true, `b` is skipped. This is occasionally useful to know for performance, but more importantly, it means the order of conditions can matter when one condition might fail or be expensive to evaluate.

---

## 6.6 Loops: Doing Things More Than Once

So far, every conditional we have written runs at most once per tick of the 50 Hz loop. That is fine for "stop if the wall is close". But what if you want to blink the LED five times in a row? Or count down from ten?

For that, you need a loop.

### The `while` Loop

A `while` loop keeps running its body as long as a condition is true:

```java
int count = 0;
while (count < 5) {
    led.setOn(true);
    Timer.delay(0.2);
    led.setOn(false);
    Timer.delay(0.2);
    count = count + 1;
}
```

This will blink the LED five times, then stop. Read it line by line: start count at zero, check if count is less than five, run the body (blink once, increment count), check again, repeat until count reaches five.

> **Do not put blocking loops inside periodic methods**
>
> Do not use blocking loops like `while` and `Timer.delay()` inside `teleopPeriodic()` or `autonomousPeriodic()`.
>
> Remember: those methods run 50 times per second. They are expected to finish quickly and return. If you put a `while` loop with `Timer.delay()` inside `teleopPeriodic()`, the entire robot freezes for the duration of the loop. Driver Station inputs are ignored. Other code does not run. The watchdog will start barking.
>
> `while` loops with delays belong in standalone test code, in `robotInit()` (which runs once at startup), or in command-based code, which we get to in Chapter 19. Until then, when you want loop-like behavior in periodic code, you use a counter variable that is checked on each tick. We will see this pattern later in the book.

### The `for` Loop

A `for` loop is a more compact way to count. The five-blink example above is exactly equivalent to:

```java
for (int count = 0; count < 5; count = count + 1) {
    led.setOn(true);
    Timer.delay(0.2);
    led.setOn(false);
    Timer.delay(0.2);
}
```

The three parts inside the parentheses are:

1. **Initialization**: `int count = 0` runs once before the loop starts
2. **Condition**: `count < 5` is checked before each iteration; the loop continues only if true
3. **Update**: `count = count + 1` runs after each iteration

`for` loops are great when you know exactly how many times you want to repeat something. `while` loops are better when you do not know the count in advance, like "keep checking until the rangefinder sees a wall".

There is also a shorthand for the update step. `count = count + 1` is so common that Java has a shortcut: `count++`. You will see both spellings. They mean the same thing.

---

## 6.7 Methods: Naming a Piece of Logic

Now we get to the most important idea in this chapter.

Look at this snippet, written without methods:

```java
@Override
public void teleopPeriodic() {
    double leftStick = controller.getLeftY();
    double rightStick = controller.getRightX();

    if (Math.abs(leftStick) < 0.1) {
        leftStick = 0.0;
    }
    if (Math.abs(rightStick) < 0.1) {
        rightStick = 0.0;
    }

    leftMotor.set(leftStick + rightStick);
    rightMotor.set(leftStick - rightStick);
}
```

It works. But it has a problem. The deadband logic ("if the stick is within 0.1 of zero, treat it as zero") is duplicated. Once for the left stick, once for the right stick. If you decide tomorrow that 0.1 is too small and you want 0.15, you have to change it in two places. If you forget one, you have a subtle bug.

Now look at the same code with a method:

```java
@Override
public void teleopPeriodic() {
    double leftStick = applyDeadband(controller.getLeftY());
    double rightStick = applyDeadband(controller.getRightX());

    leftMotor.set(leftStick + rightStick);
    rightMotor.set(leftStick - rightStick);
}

private double applyDeadband(double value) {
    if (Math.abs(value) < 0.1) {
        return 0.0;
    }
    return value;
}
```

The deadband logic is written exactly once. Both the left and right sticks call the same method. If you want to change the threshold, you change it in one place. If you find a bug in the logic, you fix it once and both sticks benefit.

This is not just neater. It is structurally safer. Every duplicated piece of code is a place where two copies can drift out of sync. Methods eliminate that risk.

### Anatomy of a Method

Here is the deadband method from above, broken into its parts:

```java
private double applyDeadband(double value) {
    if (Math.abs(value) < 0.1) {
        return 0.0;
    }
    return value;
}
```

The pieces are:

| Piece | What it does |
| --- | --- |
| `private` | Visibility, only this class can call this method (covered in Chapter 7) |
| `double` | The **return type**, the kind of value the method gives back |
| `applyDeadband` | The **name** of the method, what you call it by |
| `(double value)` | The **parameter list**, the inputs the method takes |
| `{ ... }` | The **body**, the code that runs when the method is called |
| `return ...` | Sends a value back to whoever called the method |

When you call `applyDeadband(controller.getLeftY())`:

1. Java reads the value of `controller.getLeftY()`, say it returns 0.07
2. That value is passed in as the parameter `value`
3. The body runs, with `value` set to 0.07
4. `Math.abs(0.07)` is 0.07, which is less than 0.1, so the `if` block fires
5. `return 0.0` sends the value 0.0 back to the caller
6. `leftStick` ends up holding 0.0

If the stick had been at 0.5, the `if` block would not fire, and the second `return value` line would send back 0.5 unchanged.

### Methods That Return Nothing

Not every method gives back a value. Some methods just *do* something. For those, the return type is `void`.

```java
private void blinkLED(int times) {
    for (int i = 0; i < times; i++) {
        led.setOn(true);
        Timer.delay(0.2);
        led.setOn(false);
        Timer.delay(0.2);
    }
}
```

`void` literally means "nothing". This method takes a count, blinks the LED that many times, and returns nothing. You call it like `blinkLED(3);` and the method just runs.

Note: this `blinkLED` example uses `Timer.delay`, so just like our earlier `while` example, you would only call it from `robotInit()` or test code, not from `teleopPeriodic()`. We will write a non-blocking version of this in the exercises.

### Methods That Return Booleans

A common pattern is a method that asks a question and returns `true` or `false`:

```java
private boolean isAButtonPressed() {
    return controller.getAButton();
}

private boolean isWallClose() {
    return rangefinder.getDistance() < 20.0;
}
```

These read beautifully when used:

```java
if (isWallClose() && !isAButtonPressed()) {
    stopMotors();
}
```

Compare that to:

```java
if (rangefinder.getDistance() < 20.0 && !controller.getAButton()) {
    stopMotors();
}
```

Both are correct. The first one explains *what* you are checking. The second one explains *how* you are checking it. The first version is much easier to read six weeks later when you are fixing a bug at 11 PM the night before a competition.

> **Good method names read like sentences**
>
> `isWallClose()` and `applyDeadband()` are good. `check1()` and `doStuff()` are bad. When you read your own code aloud and it sounds like English, you have named your methods well.

---

## 6.8 Putting It Together: A Smarter Teleop

Let's combine everything in this chapter into one realistic snippet. Here is a teleop loop that:

* Reads the controller and applies a deadband
* Drives forward only when the path is clear
* Stops automatically if the wall is too close
* Reports its state to SmartDashboard

```java
@Override
public void teleopPeriodic() {
    double speed = applyDeadband(controller.getLeftY());

    if (isWallClose()) {
        stopMotors();
        SmartDashboard.putString("Status", "Stopping, wall close");
    } else if (speed != 0.0) {
        driveForward(speed);
        SmartDashboard.putString("Status", "Driving");
    } else {
        stopMotors();
        SmartDashboard.putString("Status", "Idle");
    }
}

private double applyDeadband(double value) {
    if (Math.abs(value) < 0.1) {
        return 0.0;
    }
    return value;
}

private boolean isWallClose() {
    return rangefinder.getDistance() < 20.0;
}

private void driveForward(double speed) {
    leftMotor.set(speed);
    rightMotor.set(speed);
}

private void stopMotors() {
    leftMotor.set(0);
    rightMotor.set(0);
}
```

Read `teleopPeriodic` aloud. "Get the speed from the controller with a deadband. If the wall is close, stop and report. Otherwise if the speed is nonzero, drive forward and report. Otherwise stop and report idle."

That is the goal. Code that reads like a description of what the robot is doing, with the messy details tucked away in well-named methods.

> **The foundation of clean robot code**
>
> This is the foundation of every clean robot program in this book. By Chapter 19, when you learn the command-based framework, you will see that commands are essentially a more powerful version of the same pattern: each command names a piece of behavior, and the robot composes them into something coordinated. The skill of breaking logic into well-named methods, the one you are practicing right now, is exactly what makes command-based code work later.

---

## Chapter Summary

> **What you learned in Chapter 6**
>
> * **Conditionals** (`if`, `else if`, `else`) let your robot make decisions based on sensor or controller input. They are the smallest unit of intelligence in a program
> * **Comparison operators** (`==`, `!=`, `<`, `>`, `<=`, `>=`) produce booleans, which is what `if` statements need; use `.equals()` for strings, not `==`
> * **Logical operators** (`&&`, `||`, `!`) combine booleans; read them as "and", "or", "not" when reading your code aloud
> * **Loops** (`while`, `for`) repeat code; avoid blocking loops with `Timer.delay()` inside periodic methods, they freeze the 50 Hz cycle
> * **Methods** name a piece of logic so it can be reused; they have a return type, a name, parameters, and a body
> * The biggest reason to write methods is **single source of truth**: logic written once and called many times cannot drift out of sync

---

## Exercises

### Practice

In your XRP scratch project, write these three methods. Each one should be tested by calling it from the appropriate place in `Robot.java`.

1. **`isAButtonPressed()`** returns a `boolean`. Returns `true` when the A button on the controller is held, `false` otherwise. Test it by printing the result to SmartDashboard from `teleopPeriodic()`. Verify the value changes as you press and release the button.

2. **`driveForward(double speed)`** returns nothing (`void`). Sets both drive motors to the given speed. Test it by calling `driveForward(0.3)` when the A button is pressed and `stopMotors()` otherwise. Use the `isAButtonPressed()` method from above when writing the condition.

3. **`blinkLED(int times)`** returns nothing. Blinks the onboard LED the given number of times. For this exercise, write the *blocking* version using `Timer.delay()` and call it once from `robotInit()`. Deploy and verify the LED blinks the expected number of times at startup.

After you have all three working, commit your work.

### Reflect

Write 4 to 6 sentences answering each of these prompts. Save your answers in a file called `reflections.md` in your project. You will refer back to these later in the book.

1. **Why is a method better than copy-pasting the same code in two places?** Give a concrete example, ideally one from your own code.

2. **Find the copy-paste bug.** Below is a broken program. There is a bug caused by duplicated logic getting out of sync between two copies. Find it. Then describe how rewriting the duplicated logic as a method would have prevented the bug entirely.

```java
@Override
public void teleopPeriodic() {
    double leftStick = controller.getLeftY();
    double rightStick = controller.getRightX();

    // Apply deadband to left stick
    if (Math.abs(leftStick) < 0.1) {
        leftStick = 0.0;
    }

    // Apply deadband to right stick
    if (Math.abs(rightStick) < 0.15) {
        rightStick = 0.0;
    }

    leftMotor.set(leftStick + rightStick);
    rightMotor.set(leftStick - rightStick);
}
```

3. **Where in Chapter 5's TimedRobot template would a `while` loop with `Timer.delay()` cause a bug?** Explain in terms of the 50 Hz loop. Where could the same loop run safely?

### Git

After completing the Practice exercises, commit your work:

```bash
git add .
git commit -m "Ch6: utility methods (isAButtonPressed, driveForward, blinkLED)"
git push
```

If you also wrote your `reflections.md` file, include it in the commit. Reflections are part of your work, not separate from it.

> **Write commit messages your future self can read**
>
> A good commit message is a one-line summary of what changed. "Ch6: utility methods" is fine. "Updated stuff" is not. Imagine yourself six months from now scanning the git log to find when you wrote a particular method. Your future self will thank you for clear messages.

---

> **Additional Resources**
>
> * **WPILib Java basics**: [docs.wpilib.org/en/stable/docs/software/basic-programming/java-units.html](https://docs.wpilib.org/en/stable/docs/software/basic-programming/java-units.html) the official WPILib guide to Java fundamentals as they apply to robot code.
> * **Java control flow**: [dev.java/learn/language-basics/controlling-flow](https://dev.java/learn/language-basics/controlling-flow/) Oracle's official Java tutorial on `if`, `for`, `while`, and `switch`. Skip past anything that is not in this chapter for now.
> * **Java methods**: [dev.java/learn/classes/methods](https://dev.java/learn/classes/methods/) deeper dive into method syntax, parameters, and return values. Useful when you want to understand the underlying mechanics.
> * **WPILib applyDeadband utility**: [github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/MathUtil.html](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/MathUtil.html) WPILib has a built-in `MathUtil.applyDeadband()` method. Look at the source to see how it handles edge cases your version probably does not. We will use it in real code from Chapter 8 onward.

---

*Next up, Chapter 7: Classes, Objects, and the XRP Hardware Layer. You will learn what a class actually is, write your first ones (`Drivetrain` and `Sensors`), and read the source code of `XRPMotor` to see what your code is really talking to.*
