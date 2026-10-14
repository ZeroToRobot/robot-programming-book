# Chapter 21: State Machines

In Chapter 20 the Explorer became a fully command-based robot. `RobotContainer` declares every part, every button, and the obstacle course, and the course itself is one command: a sequence of steps with the LED running alongside it. At the end, you wrote down a control you wish the Explorer had. This chapter builds one that many drivers ask for first: **hold a button over a line of tape, and the robot follows the line by itself.** The same command becomes leg 3 of the obstacle course.

Following a line sounds like a job for a few `if` statements. Left sensor sees black, steer left; right sensor sees black, steer right. You will try exactly that in Section 21.1, and you will find the moment it breaks: when both sensors see white, the right thing to do depends on **what happened before**. A robot that needs to remember what it was doing, and act differently because of it, needs a **state machine**.

You have built state machines three times already without the name: the `autoStep` switch in Chapter 12, the `wasBlocked` field in Chapter 10, and the command sequence in Chapter 20. This chapter names the idea, shows you how to draw one before you code it, and builds a line follower whose insides are a state machine. Then it shows that a command group and a state machine are two ways of writing the same thing, and how to choose between them.

On the Java side, you finally write your own **enum**, the type Chapter 12 promised when it numbered the autonomous steps with `int`s and Chapter 16 previewed with WPILib's `SysIdRoutineLog.State`. You will also learn the **switch expression**, the arrow-shaped `switch` that hands back a value and refuses to compile if you forget a case. Together, they make a state machine that the compiler helps you keep correct.

You will need your XRP, the course from Chapter 12, and about a meter more of black electrical tape.

---

## 21.1 A Line That Bends

Lay a strip of black electrical tape on your floor, a meter or so long, with a gentle curve in it. Put the Explorer on one end, with the two reflectance sensors over the tape, and think about how you would drive it along by hand. You would watch where the tape goes, and steer to keep the robot on top of it.

The robot cannot watch. It has two reflectance sensors under its front edge, side by side, and each one reports a number from `0.0` (white) to `1.0` (black). Black electrical tape is about 19 mm wide, which is close to the distance between the two sensors. So when the robot is centered on the tape, each sensor sees **part** of it, and both read somewhere in the middle. When the robot drifts, one sensor slides further onto the tape and reads darker, and the other slides off and reads lighter.

Chapter 9 gave you the heart of it: "If the left sensor sees black and the right sees white, the line is drifting off to the left, so the robot should steer left." Here is a first try, written the Chapter 6 way, as one `if` per situation. Imagine it in a command's `execute()`:

```java
// A first try at following a line. It works, until it does not.
boolean left = sensors.isLeftOnLine();
boolean right = sensors.isRightOnLine();

if (left && right) {
    drivetrain.drive(0.10, 0.0);    // centered: drive straight
} else if (left) {
    drivetrain.drive(0.10, 1.0);    // line is to the left: steer left
} else if (right) {
    drivetrain.drive(0.10, -1.0);   // line is to the right: steer right
} else {
    drivetrain.drive(0.0, 0.0);     // no line: ...stop?
}
```

Read it aloud: "Both on, go straight. Left on, steer left. Right on, steer right. Neither on, stop." The first three cases are fine. Drive it along a gentle curve, and the robot wiggles its way to the end.

Now think hard about the last case, both sensors on white. When does that happen?

1. **The robot reached the end of the tape.** The line was right underneath, centered, and then it simply ran out. Stopping is exactly right.
2. **The tape curved sharply to the left,** faster than the robot could turn. The left sensor was the last one to see it, and then it slid off too. The line is still there, just off to the left. Stopping here is wrong: the robot should turn left to find it again.
3. **The same, to the right.** The robot should turn right.

The sensors read **exactly the same thing** in all three cases: white, white. There is no `if` you can write about this loop's readings that tells them apart. The difference is in the past. In case 1, the robot was centered a moment ago. In case 2, it had been steering left. In case 3, right.

That is the whole problem of this chapter, in one sentence: **the right action depends not only on what the robot sees now, but on what it was doing before.** To handle that, the robot needs to remember something from loop to loop. And once it remembers what it was doing, "what it was doing" becomes a thing with a name: its **state**.

> **Reacting versus remembering**
>
> Code that decides only from this loop's readings is called **reactive**: the same inputs always give the same output. `DriveWithSticks` is almost reactive (stick forward, robot forward). Reactive code is simple and good, and you should use it whenever it is enough. But the moment two situations look identical to the sensors and need different actions, reactive code cannot work, and you need memory. The skill this chapter teaches is noticing that moment, and then organizing the memory so it stays understandable.

---

## 21.2 States, Transitions, and Actions

A **state machine** (in full, a **finite state machine**) is a way of describing something that can be in one of a fixed list of situations, and moves between them according to rules. It has three parts:

- **States**: the list of situations. The machine is always in **exactly one** of them. "Following the line." "Searching to the left." "Stopped at the end."
- **Transitions**: the rules for moving from one state to another, each one triggered by something happening. "While following, if the line disappears and it was last seen on the left, go to searching left."
- **Actions**: what the machine does while it is in each state. "While searching left, turn left in place."

"Finite" just means the list of states is fixed and countable, not that the machine ever stops.

Here is one you use every day. A combination padlock on a school locker is a state machine. Its states are "locked, waiting for the first number," "first number right, waiting for the second," "two right, waiting for the third," and "open." Each correct number moves it to the next state, and a wrong number sends it back to the start. Two people can turn the dial to the very same number, and one opens the lock and the other does not, because the lock **remembers** which numbers came before. The current number is the input; which number you are on is the state.

### Drawing one

Programmers draw state machines before they code them, as a **state diagram**: a box for each state, an arrow for each transition, and a label on each arrow saying what triggers it. Here is the locker:

```
           right first number        right second number        right third number
  [START] -------------------> [ONE] --------------------> [TWO] -------------------> [OPEN]
     ^                           |                            |
     |        wrong number       |                            |
     +---------------------------+----------------------------+
```

Drawing is not a formality. The diagram is where you find the missing cases, before the robot finds them for you on the floor. For every state, you ask: "what can happen here, and where does each of those things take me?" If a box has no arrow for some input, you have found a bug that has not been written yet.

### Three you have already built

You have been writing state machines since Chapter 10. Look back at them with the new words.

**`wasBlocked`, in Chapter 10.** The wall stop's logging used a `boolean` field to remember last loop's answer:

```java
if (blocked && !wasBlocked) {
    DataLogManager.log("Wall stop ON at " + sensors.getDistanceAheadMeters() + " m");
}
if (!blocked && wasBlocked) {
    DataLogManager.log("Wall stop OFF");
}
wasBlocked = blocked;
```

That is a state machine with two states, "clear" and "blocked." The transitions are "something is now within 20 cm" and "nothing is." The actions are on the **transitions**, not in the states: a log line, once, at the moment of change. It is the smallest useful state machine there is.

**`autoStep`, in Chapter 12.** The autonomous routine kept a number for which step it was on, a `switch` to do each step's work, and code that moved to the next step when a step was done. Chapter 12 said so in a callout: "Your steps are its **states**, and conditions like 'distance reached 0.5 m' are its **transitions**."

**The course, in Chapter 20.** `Commands.sequence(...)` holds a list of commands and an index of which one is running, and moves to the next one when the current one finishes. Chapter 20 showed you its source. That is the same machine as `autoStep`, written once, inside WPILib. Section 21.7 comes back to this, because it is the key to the whole chapter.

> **State machines on a competition robot**
>
> On the Explorer, there is one subsystem and one line follower. A competition robot is full of state machines. An intake is "empty," "intaking," "holding a game piece," or "ejecting," and a beam-break sensor moves it from intaking to holding. A shooter is "idle," "spinning up," "at speed," and "firing," and must never fire before it is at speed. Many teams go further and write one state machine for the whole robot, often called a **superstructure**, so that the arm, elevator, and intake can never be told to do two things that collide. Chapter 34 builds the competition robot's mechanisms, and their state machines look exactly like the one you will draw in Section 21.5.

---

## 21.3 New Java: Enums

Before you code a state machine, you need a way to write down its states. Chapter 12 used numbers:

```java
private static final int STEP_NOT_STARTED = 0;
private static final int STEP_DRIVE_LEG_1 = 1;
private static final int STEP_TURN_LEFT = 2;
private static final int STEP_DRIVE_TO_LINE = 3;
private static final int STEP_DONE = 4;

private int autoStep = STEP_NOT_STARTED;
```

It worked, and named constants were much better than bare numbers. But an `int` is a number, and Java will let you do anything to it that you can do to a number. Every one of these lines compiles:

```java
autoStep = 7;                       // there is no step 7
autoStep = STEP_DONE + 1;           // or step 5
int step = STEP_TURN_LEFT * 2;      // what is twice a turn?
DataLogManager.log("Step " + autoStep);   // prints "Step 2": which one was 2 again?
```

Nothing stops a typo from putting the robot into a state that does not exist, and the log shows numbers you have to translate by hand. Chapter 12 said there was a better tool, and Chapter 16 gave you a taste of it with WPILib's `SysIdRoutineLog.State`. Now you write your own.

### Your first enum

An **enum** (short for **enumeration**, a list where every item is named) is a type with a fixed list of values, written out by name. Here is a toy one, away from the robot so you can see the syntax on its own:

```java
public enum TrafficLight {
    RED,
    YELLOW,
    GREEN
}
```

That is the whole file, `TrafficLight.java`. It looks like a class with `enum` where `class` would be, and a comma-separated list of names inside. Those names are the type's **constants**, and by Java convention they are written in UPPER_SNAKE_CASE like any other constant. (WPILib's own enums use the `k` prefix instead, as in `SysIdRoutine.Direction.kForward`. Either style works; the book uses plain UPPER_SNAKE_CASE for its own.)

Now `TrafficLight` is a type, just like `int` or `Pose2d`, and you can make variables of it:

```java
TrafficLight light = TrafficLight.RED;

if (light == TrafficLight.RED) {
    DataLogManager.log("Stop");
}

light = TrafficLight.GREEN;
DataLogManager.log("The light is " + light);   // prints "The light is GREEN"
```

Walk through what changed compared to `int` steps:

- **A `TrafficLight` variable can only hold `RED`, `YELLOW`, or `GREEN`.** There is no fourth value, and no way to make one. `light = 7;` is a compile error (`incompatible types: int cannot be converted to TrafficLight`), and so is `light = TrafficLight.BLUE;` (`cannot find symbol`). The typo that put Chapter 12's robot in step 7 cannot even be written.
- **You compare with `==`.** Each constant is one single object, created once when the program starts, so `==` asks "is this the very same one?", and the answer is always right. (You met this with `State.kNone` in Chapter 16.)
- **It prints its own name.** `"The light is " + light` gives `The light is GREEN`, not a number. That alone makes enums worth it: every log line says what it means.
- **There is no arithmetic.** `TrafficLight.RED + 1` does not compile. If you want "the next one," you have to say what "next" means, which is a good thing (you will, in a moment).

The constants are written with the type's name in front, `TrafficLight.RED`, the same way you write a `static final` constant with its class name in front. If the enum is declared **inside** another class, its full name includes that class too, exactly like `SysIdRoutineLog.State` and the nested `Constants` groups from Chapter 20. The line follower's enum will live inside its command, as `FollowLine.State`.

### `switch` on an enum

An enum and a `switch` are made for each other. Here is the Chapter 12 shape, with an enum:

```java
switch (light) {
    case RED:
        DataLogManager.log("Stop");
        break;
    case YELLOW:
        DataLogManager.log("Slow down");
        break;
    case GREEN:
        DataLogManager.log("Go");
        break;
}
```

Notice the `case` labels: just `RED`, not `TrafficLight.RED`. Inside a `switch` on a `TrafficLight`, Java already knows which type the labels belong to, so you write the bare name. In fact, with the Java version WPILib uses, writing the full name in a `case` is an error:

```
error: an enum switch case label must be the unqualified name of an enumeration constant
```

("Unqualified" means "without the type name in front.") Everywhere else, outside `case` labels, you write the full `TrafficLight.RED`.

### Three things every enum can do

Java gives every enum a few methods for free:

| Method | What it gives you | Example |
|---|---|---|
| `name()` | The constant's name, as a `String` | `TrafficLight.GREEN.name()` is `"GREEN"` |
| `values()` | Every constant, in the order they are written | `TrafficLight.values()` has three items |
| `valueOf(String)` | The constant with that exact name | `TrafficLight.valueOf("RED")` is `TrafficLight.RED` |

`name()` is what you will put on the dashboard, since `SmartDashboard.putString` takes a `String`. `values()` is handy with the `for` loop from Chapter 6: `for (TrafficLight each : TrafficLight.values())` visits all three, which you will use in Practice 1. (`valueOf` is picky: `valueOf("Red")` throws an `IllegalArgumentException`, `No enum constant`, because the case does not match.)

### An enum is a class

Here is the part that surprises people. An enum is not a list of numbers in disguise. It is a **class**, with exactly as many objects as it has constants, all created by Java when the program starts. That means an enum can have **fields**, a **constructor**, and **methods**, just like the classes you have written since Chapter 7.

Suppose each light should know how long it stays on. Give the enum a field, set by a constructor, and pass each constant its value in parentheses:

```java
public enum TrafficLight {
    RED(30.0),
    YELLOW(4.0),
    GREEN(25.0);   // a semicolon ends the list when more code follows

    private final double durationSeconds;

    TrafficLight(double durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    /** How long this light stays on, in seconds. */
    public double getDurationSeconds() {
        return durationSeconds;
    }

    /** The light that comes after this one. */
    public TrafficLight next() {
        return switch (this) {
            case RED -> GREEN;
            case GREEN -> YELLOW;
            case YELLOW -> RED;
        };
    }
}
```

Walk through it:

- **`RED(30.0)`** creates the `RED` object by calling the constructor with `30.0`. Each constant is a constructor call that Java makes for you, once.
- **The semicolon after `GREEN(25.0)`** ends the list of constants. It is required whenever the enum has anything after the list, and forgetting it is the most common enum compile error.
- **`private final double durationSeconds`** is an ordinary field. Each of the three objects has its own copy. It is `final`, so the objects never change: an enum's constants should be as constant as their name says (the immutability idea from Chapter 14).
- **The constructor has no `public`.** An enum's constructor is always `private`, whether you write the word or not. Nobody outside can call it: `new TrafficLight(10.0)` is a compile error, `enum classes may not be instantiated`. That is the same idea as Chapter 20's holder classes, a `private` constructor so nobody can make more objects, taken one step further: Java makes exactly the objects in the list, and no others, ever.
- **`next()`** is an ordinary method. Inside it, `this` is whichever light you called it on, so `TrafficLight.RED.next()` is `GREEN`. Its body is a new kind of `switch`, with arrows instead of colons, that hands back a value. That is the next section.

> **An enum, in one sentence**
>
> An **enum** is a class with a fixed list of objects, each one named and created once by Java; a variable of the enum's type can hold only one of those objects, compares with `==`, prints its own name, and can carry fields and methods like any other class.

> **Enums you have already used**
>
> WPILib is full of enums. `SysIdRoutine.Direction` (`kForward`, `kReverse`) told your SysId tests which way to drive in Chapter 19. `SysIdRoutineLog.State` named the four tests in Chapter 16. Every `Command` has a `getInterruptionBehavior()` that returns an `InterruptionBehavior` enum (`kCancelSelf` or `kCancelIncoming`), which decides what happens when another command wants the same subsystem. Now that you can read an enum, open any of them in VS Code (hold Ctrl and click the name) and you will recognize the shape: a list of constants, maybe a field or two.

---

## 21.4 New Java: Switch Expressions

Look again at `next()`:

```java
public TrafficLight next() {
    return switch (this) {
        case RED -> GREEN;
        case GREEN -> YELLOW;
        case YELLOW -> RED;
    };
}
```

This is a **switch expression**. The `switch` statements you wrote in Chapter 12 **do** things: each case runs some lines, then `break`s. A switch expression **is** a value, the way `a + b` or `cond ? x : y` is a value. Java picks the case that matches, and the whole `switch` becomes whatever is on the right of that case's arrow. Here, the `return` hands that value back.

Chapter 12 mentioned the arrow form in a callout. Here are the two side by side, doing the same job:

```java
// Chapter 12 style: a switch STATEMENT. Each case assigns, then breaks.
TrafficLight after;
switch (light) {
    case RED:
        after = TrafficLight.GREEN;
        break;
    case GREEN:
        after = TrafficLight.YELLOW;
        break;
    default:
        after = TrafficLight.RED;
        break;
}

// This chapter: a switch EXPRESSION. The whole switch is the value.
TrafficLight after = switch (light) {
    case RED -> TrafficLight.GREEN;
    case GREEN -> TrafficLight.YELLOW;
    case YELLOW -> TrafficLight.RED;
};
```

Walk through the differences:

- **`case X ->` instead of `case X:`.** With an arrow, only that case's code runs. There is no falling through into the next case, so there is no `break`, and the missing-`break` bug from Section 12.6 cannot happen.
- **The result goes on the right of the arrow.** Each case is one value (or one expression that makes a value, like a method call).
- **It ends with a semicolon,** after the closing brace, because the whole thing is one long expression inside a statement, like `int x = 3 + 4;`.
- **Two cases with the same result share one line**, separated by a comma: `case END_OF_LINE, GAVE_UP -> ...`. That replaces Chapter 12's "stacked labels."

### The compiler checks every case

Now the feature that makes switch expressions perfect for state machines. Delete one case from the expression above, say `YELLOW`, and build:

```
error: the switch expression does not cover all possible input values
```

A switch expression must produce a value for **every** possible input, so when you switch on an enum, you must handle **every constant** (or add a `default`). If you forget one, the program does not compile. That sounds strict. It is wonderful.

Think about what happens in a team's code over a season. In week 2, someone adds a fourth light, `FLASHING_RED`, to the enum. Every `switch` statement in the program still compiles, and silently does nothing for `FLASHING_RED`, because a statement is allowed to skip cases. Weeks later, someone finds the robot doing nothing in some odd moment. With switch **expressions**, the moment `FLASHING_RED` is added, every expression that switches on `TrafficLight` turns red in VS Code, each one a list item saying "you have not decided what to do here yet." The compiler walks you to every place that needs a decision.

That is why the book's rule for state machines is: **switch on the state with a switch expression, and do not add a `default`.** A `default` would quietly cover the new state, which is exactly what you do not want.

> **Only expressions are checked**
>
> The arrow form also works for `switch` **statements**, which do things and return nothing:
>
> ```java
> switch (light) {
>     case RED -> DataLogManager.log("Stop");
>     case GREEN -> DataLogManager.log("Go");
> }
> ```
>
> No fall-through, no `break`, and very tidy. But with the Java version WPILib uses, a statement is **not** checked for missing cases: the example above compiles happily without `YELLOW`. If you want the compiler's help, make the switch produce a value. In the line follower, both switches produce values: one produces the next state, and the other produces how fast to drive.

> **When one arrow is not enough**
>
> Sometimes a case needs a few lines of work before it has its answer. Then the case can have a block in braces, and hands back its value with the word `yield` ("produce this as the result"): `case RED -> { log("stopping"); yield TrafficLight.GREEN; }`. The line follower avoids `yield` by moving those few lines into a small private method, so each case stays one line long. Either is fine; the short form is easier to read in a state machine.

---

## 21.5 Designing the Line Follower

Now back to the robot. This section designs the line follower on paper, the way you would at a whiteboard with your team, and the next section turns the design into code almost line for line.

### Leg 3 of the course

First, give the line a home. The obstacle course from Chapter 12 ends at a strip of black tape laid **across** leg 2. Leg 3 starts there: a second strip of black tape that begins at the **middle** of that crossbar and runs on, the same way leg 2 was heading, so that the two strips make a **T**.

```
                               end of the line
                                     |
                                     |   leg 3: follow the line (about 0.6 m)
                                     |
                       ==============+==============    <- the crossbar from Chapter 12
                                     ^
                                     |    leg 2: drive until the line
                                     |
   [START] ------------------------->+    <- the corner: turn left 90 degrees
             leg 1: 0.5 m
```

1. Find the spot on the crossbar where your robot's sensors stop at the end of leg 2. Run autonomous once and mark it with a pencil. That is where the new strip starts, so the robot lands on top of it.
2. Lay about **0.6 meters** of black electrical tape from that spot, straight on, with the tape's edge flat and no wrinkles. Start with a straight line. Once everything works, you will add a gentle bend.
3. Measure the strip from the crossbar to its end. That is `FOLLOW_LINE_LENGTH_METERS`, which you will type in Section 21.8.

### Steering: how hard to turn

In `FOLLOWING`, the robot drives forward and steers toward the tape. How hard should it steer? The first try in Section 21.1 had three choices: hard left, straight, or hard right. That is called **bang-bang control**, after the sound a thermostat's switch makes: fully on, or fully off. It works, but the robot wiggles back and forth across the line, because it always overcorrects.

You know a better way from Chapter 15. Measure how far off you are, and steer in **proportion** to it. The two reflectance readings give you a measurement for free:

```
error = left reflectance - right reflectance
```

- Centered on the tape, both sensors see the same amount of black, so the error is about `0`.
- Drifted right, the line slides under the left sensor: left reads darker, so the error is **positive**.
- Drifted left, the error is **negative**.

Then `turnRate = STEER_KP * error`. A positive turn rate is counterclockwise, which is a left turn (the Chapter 8 rule), so a positive error steers left, toward the line. That is a P controller (Chapter 15) with the setpoint at zero, and the reflectance difference as the measurement. Small drift, gentle steering; big drift, hard steering. The XRP's own introductory robotics course teaches line following exactly this way (it is linked in this chapter's resources).

> **Bang-bang, P, and everything between**
>
> Bang-bang control is not always wrong. A robot's compressor (Chapter 36) is bang-bang on purpose: on below a pressure, off above it, because "half on" is meaningless for a pump. For anything that should move smoothly, proportional control is better, and a full PID (Chapter 15) is better still when there is a steady error to wipe out. The line follower uses P only. Its job is to stay close to the line, not to sit exactly on its center, and the line is always moving under the robot anyway.

Notice the error also tells you **which side the line was on**. That is the memory the robot needs when it loses the line. If the last error before the line vanished was clearly positive, the line was under the left sensor when the robot lost it, so it went off to the left. Clearly negative: right. Close to zero: the line was centered, and then gone, so it ended.

### The states

Here are the follower's states. Every situation the robot can be in is one of these, and it is always in exactly one:

| State | What the robot does | Done? |
|---|---|---|
| `FOLLOWING` | Drives forward at `FOLLOW_METERS_PER_SECOND`, steering by the error | No |
| `SEARCHING_LEFT` | Turns left in place, looking for the line | No |
| `SEARCHING_RIGHT` | Turns right in place, looking for the line | No |
| `END_OF_LINE` | Stops: the line ended | Yes |
| `GAVE_UP` | Stops: it searched too far and never found the line | Yes |

### The diagram

Here are the transitions, as a state diagram. Each arrow is labeled with what makes it happen:

```
     start, on the line
            |
            v
     +-------------+   line lost, last error > +0.2    +-----------------+
     |             | --------------------------------> | SEARCHING_LEFT  | ---+
     |             | <-------------------------------- |                 |    |
     |             |             line seen             +-----------------+    |
     |  FOLLOWING  |                                                          | turned more
     |             |   line lost, last error < -0.2    +-----------------+    | than 120 deg
     |             | --------------------------------> | SEARCHING_RIGHT | ---+
     |             | <-------------------------------- |                 |    |
     +-------------+             line seen             +-----------------+    |
            |                                                                 v
            | line lost, last error near 0                              +-----------+
            v                                      start, no line ----> |  GAVE_UP  |
     +-------------+                                                    +-----------+
     | END_OF_LINE |
     +-------------+
```

Read it as sentences:

- **From `FOLLOWING`:** while the line is seen, stay. When the line is lost, look at the last error: clearly positive, go to `SEARCHING_LEFT`; clearly negative, `SEARCHING_RIGHT`; near zero, `END_OF_LINE`.
- **From either `SEARCHING_` state:** the moment either sensor sees the line, go back to `FOLLOWING`. If the robot has turned more than 120 degrees since it started searching, the line is not coming back: `GAVE_UP`.
- **`END_OF_LINE` and `GAVE_UP`** have no arrows out. Once there, the follower is finished.
- **The start:** if the robot is on the line when the follower starts, it begins in `FOLLOWING`. If it is not, there is nothing to follow, and it begins in `GAVE_UP`.

Now do the check from Section 21.2: for every state, is every input covered? `FOLLOWING` has "line seen" and "line lost" (split three ways by the error). The searches have "line seen," "not yet, still turning," and "turned too far." The finished states ignore everything. Every box, every input, has exactly one arrow. That is a design you can code.

The same table, the way you will code it, is called a **transition table**. One row per state, and the next state for each situation:

| In state... | Line seen | Line not seen |
|---|---|---|
| `FOLLOWING` | `FOLLOWING` | Last error above +0.2: `SEARCHING_LEFT`. Below -0.2: `SEARCHING_RIGHT`. Otherwise: `END_OF_LINE` |
| `SEARCHING_LEFT`, `SEARCHING_RIGHT` | `FOLLOWING` | Turned more than 120 degrees since the search began: `GAVE_UP`. Otherwise: stay |
| `END_OF_LINE`, `GAVE_UP` | Stay | Stay |

### Memory beyond the state

Look closely at the search's "turned more than 120 degrees" arrow. To know how far it has turned, the robot needs the heading it had **when the search began**. And to choose a search direction, it needs the **last error** while it was following. Neither of those is a state; they are numbers. Real state machines almost always have a few of these remembered values alongside the state, sometimes called **extended state**. The rule for them is the same as for the state itself: each one belongs to the state machine, is reset when the machine starts, and has a clear moment when it is set.

The search heading has an especially clear moment: it is set **once, at the instant the machine enters a search state**, never while it is searching. Something done once on the way into a state is called an **entry action**. It is the same idea as a command's `initialize()`: "once, when you start, not every loop" (Section 19.6).

> **The finished states are not a formality**
>
> Why have `END_OF_LINE` and `GAVE_UP` at all? The command could just finish. But the two endings mean different things to whoever started the follower. In autonomous, ending at the end of the line means "leg 3 done, all is well"; giving up means "something went wrong, check the tape and the sensors." Keeping them as named states means the reason is logged, shown on the dashboard, and available to the code that runs next (Practice 5 uses it). A good state machine's last state says **how** it ended, not just that it did.

---

## 21.6 The `FollowLine` Command

Now the code. The line follower is a command, because it needs the drivetrain while it runs, and its insides are the state machine you just drew. Create `FollowLine.java` in the `commands` folder. Type it, do not paste:

```java
package frc.robot.commands;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import frc.robot.Sensors;
import frc.robot.subsystems.Drivetrain;

/**
 * Follow a line of black tape with the two reflectance sensors, as a state machine:
 * follow the line, search for it when it is lost, and stop when it ends.
 */
public class FollowLine extends Command {

    /** Everything the line follower can be doing. */
    public enum State {
        FOLLOWING(false),         // on the line: drive and steer to stay on it
        SEARCHING_LEFT(false),    // lost it, last seen on the left: turn left to find it
        SEARCHING_RIGHT(false),   // lost it, last seen on the right: turn right to find it
        END_OF_LINE(true),        // lost it while centered: the line ended, so stop
        GAVE_UP(true);            // searched too far without finding it, so stop

        private final boolean done;

        State(boolean done) {
            this.done = done;
        }

        /** True for the states where the line follower has finished. */
        public boolean isDone() {
            return done;
        }
    }

    // Driving along the line. Untested starting points: tune them on your own tape.
    private static final double FOLLOW_METERS_PER_SECOND = 0.10;
    private static final double STEER_KP = 3.0;   // radians per second of turn, per unit of error

    // Losing the line, and finding it again.
    private static final double SIDE_ERROR = 0.2;   // an error bigger than this: the line was off to one side
    private static final double SEARCH_RADIANS_PER_SECOND = 1.5;
    private static final double SEARCH_MAX_DEGREES = 120.0;

    private final Drivetrain drivetrain;
    private final Sensors sensors;

    // The state machine's memory. Set in initialize(), every run.
    private State state = State.FOLLOWING;
    private double lastSteeringError = 0.0;      // where the line was, the last time we saw it
    private double searchStartHeadingDegrees = 0.0;
    private double startDistanceMeters = 0.0;

    /**
     * Create a command that follows a line until it ends.
     *
     * @param drivetrain the drivetrain to drive
     * @param sensors the sensors that see the line (read only, never required)
     */
    public FollowLine(Drivetrain drivetrain, Sensors sensors) {
        this.drivetrain = drivetrain;
        this.sensors = sensors;
        addRequirements(drivetrain);
    }

    @Override
    public void initialize() {
        lastSteeringError = 0.0;
        startDistanceMeters = drivetrain.getAverageDistanceMeters();
        state = isLineSeen() ? State.FOLLOWING : State.GAVE_UP;   // the start state
        DataLogManager.log("FollowLine started in " + state + " at " + drivetrain.getPose());
    }

    @Override
    public void execute() {
        // 1. Decide: does this loop's reading move us to a new state?
        State next = decideNextState();
        if (next != state) {
            changeState(next);
        }

        // 2. Act: every state has exactly one way of driving.
        ChassisSpeeds speeds = switch (state) {
            case FOLLOWING -> followSpeeds();
            case SEARCHING_LEFT -> new ChassisSpeeds(0.0, 0.0, SEARCH_RADIANS_PER_SECOND);
            case SEARCHING_RIGHT -> new ChassisSpeeds(0.0, 0.0, -SEARCH_RADIANS_PER_SECOND);
            case END_OF_LINE, GAVE_UP -> new ChassisSpeeds();   // all zeros: stopped
        };
        drivetrain.drive(speeds);

        SmartDashboard.putString("Line State", state.name());
        SmartDashboard.putNumber("Line Error", getSteeringError());
    }

    @Override
    public boolean isFinished() {
        return state.isDone();
    }

    @Override
    public void end(boolean interrupted) {
        drivetrain.stop();
        DataLogManager.log("FollowLine " + (interrupted ? "interrupted" : "finished")
            + " in " + state + " after " + getTraveledMeters() + " m");
    }

    /**
     * The state this line follower is in right now.
     *
     * @return the current state
     */
    public State getState() {
        return state;
    }

    /** The transitions: given the state we are in and what the sensors say, where next? */
    private State decideNextState() {
        return switch (state) {
            case FOLLOWING -> isLineSeen() ? State.FOLLOWING : stateForLostLine();
            case SEARCHING_LEFT, SEARCHING_RIGHT -> isLineSeen() ? State.FOLLOWING : stateForSearch();
            case END_OF_LINE, GAVE_UP -> state;   // finished: stay finished
        };
    }

    /** The line just disappeared. Where was it, the last time we saw it? */
    private State stateForLostLine() {
        if (lastSteeringError > SIDE_ERROR) {
            return State.SEARCHING_LEFT;
        }
        if (lastSteeringError < -SIDE_ERROR) {
            return State.SEARCHING_RIGHT;
        }
        return State.END_OF_LINE;   // it was right under us, and then it was gone
    }

    /** Still searching. Keep going, or give up? */
    private State stateForSearch() {
        double searchedDegrees = Math.abs(drivetrain.getHeadingDegrees() - searchStartHeadingDegrees);
        return searchedDegrees > SEARCH_MAX_DEGREES ? State.GAVE_UP : state;
    }

    /** Move to a new state: log it, and run the new state's entry action, once. */
    private void changeState(State next) {
        DataLogManager.log("FollowLine: " + state + " -> " + next);
        state = next;
        if (state == State.SEARCHING_LEFT || state == State.SEARCHING_RIGHT) {
            searchStartHeadingDegrees = drivetrain.getHeadingDegrees();
        }
    }

    /** Drive along the line, steering toward whichever sensor sees more black. */
    private ChassisSpeeds followSpeeds() {
        double error = getSteeringError();
        lastSteeringError = error;
        double turnRate = MathUtil.clamp(STEER_KP * error,
            -Drivetrain.AUTO_TURN_RADIANS_PER_SECOND, Drivetrain.AUTO_TURN_RADIANS_PER_SECOND);
        return new ChassisSpeeds(FOLLOW_METERS_PER_SECOND, 0.0, turnRate);
    }

    /** Positive when the line is more under the left sensor, negative when more under the right. */
    private double getSteeringError() {
        return sensors.getLeftReflectance() - sensors.getRightReflectance();
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

It is the longest command you have written, but every piece of it is a piece of the diagram. Take it from the top.

### The enum: the list of states

`public enum State` is written **inside** the command, so its full name is `FollowLine.State`, just like `SysIdRoutineLog.State`. It belongs here because these states only make sense for this command. It is `public` so that other code can ask the follower what state it ended in (Section 21.7 and Practice 5 do).

Each constant carries one fact, `done`, through the constructor: `END_OF_LINE(true)`, `FOLLOWING(false)`. The method `isDone()` reads it. That moves the question "is this a finished state?" into the list of states itself, right next to each name, where nobody adding a sixth state can miss it. The comment on each constant is the state's one-line description from the table in Section 21.5.

An enum written inside a class is automatically `static`, like the nested `Constants` groups in Chapter 20, so you never need a `FollowLine` object to name a state: `FollowLine.State.GAVE_UP` works anywhere.

### The constants and fields

The tuning numbers live at the top, `private static final`, because they describe this command's own behavior (Chapter 20's rule: a number lives with the thing it describes). They are untested starting points. You will tune `STEER_KP` and `FOLLOW_METERS_PER_SECOND` on your own tape in Section 21.9.

Then come four fields that are **not** `final`, under the comment "The state machine's memory":

- **`state`**, the current state. This is the one field that every other line of the class revolves around.
- **`lastSteeringError`**, where the line was the last time the robot saw it. It decides which way to search.
- **`searchStartHeadingDegrees`**, set by the search's entry action, to measure how far the search has turned.
- **`startDistanceMeters`**, only for the log message at the end, the same `getTraveledMeters()` trick as `DriveDistance`.

All four are set in `initialize()` (or by an entry action), never in the constructor. A `FollowLine` object will be bound to a button and run many times in one practice session, and every run must start fresh: Section 19.6's "once, or every time?" rule.

### `initialize()`: choosing the start state

`initialize()` resets the memory, and then picks the start state with a ternary from Chapter 8: on the line, start `FOLLOWING`; not on the line, start in `GAVE_UP`. The second case means "you started me somewhere with no line," and the follower finishes on the very first loop, with a log message that says so.

### `execute()`: decide, then act

Every loop, `execute()` does two things, in the same order every time:

1. **Decide.** `decideNextState()` looks at the current state and the sensors and returns the next state. If it is different, `changeState()` makes the move.
2. **Act.** A switch expression turns the state into a `ChassisSpeeds` (Chapter 13): how fast to drive and turn. Then one line sends it to the drivetrain.

Keeping those two jobs apart is the most important habit in this chapter. The **decide** part is all about transitions: arrows on the diagram. The **act** part is all about actions: what each box does. When the robot misbehaves, you can ask two separate questions. "Was it in the wrong state?" is a decide bug. "Was it in the right state, doing the wrong thing?" is an act bug. The log and the `Line State` widget tell you which.

Both are switch expressions on `state` with no `default`, so if you add a sixth state, both stop compiling until you have decided what it does and where it goes. The act switch's last case, `case END_OF_LINE, GAVE_UP -> new ChassisSpeeds();`, handles two states in one line; a `ChassisSpeeds` made with no arguments is all zeros, which is "stopped."

> **Why build a `ChassisSpeeds`, instead of calling `drive()` in each case?**
>
> You could write a switch **statement** with `drivetrain.drive(...)` in each case. It would work, but a statement is not checked for missing cases (Section 21.4), and every case would repeat the call. Making the switch **produce** the speeds gets the compiler's check, and leaves exactly one line that touches the drivetrain. It is also exactly the shape that Chapter 13's `drive(ChassisSpeeds)` was made for.

### `decideNextState()`: the transition table, in code

Put the transition table from Section 21.5 next to this method:

```java
return switch (state) {
    case FOLLOWING -> isLineSeen() ? State.FOLLOWING : stateForLostLine();
    case SEARCHING_LEFT, SEARCHING_RIGHT -> isLineSeen() ? State.FOLLOWING : stateForSearch();
    case END_OF_LINE, GAVE_UP -> state;   // finished: stay finished
};
```

Each row of the table is one case. Read the first aloud: "If we are following: if the line is seen, keep following; otherwise, work out where it went." The two helpers hold the parts of the table that need a few lines:

- **`stateForLostLine()`** is the heart of the chapter: the same input (no line) gives three different answers, depending on the **remembered** error. This is the exact situation from Section 21.1 that plain `if`s could not handle.
- **`stateForSearch()`** compares the heading now with the heading when the search began. `Math.abs` makes it work for left and right searches alike. `getHeadingDegrees()` keeps counting past 360 instead of jumping back to 0 (Chapter 9), so the subtraction never jumps either.

Notice what `decideNextState()` does **not** do: it does not drive, log, or change any field. It only answers a question. That makes it easy to reason about, and, in Chapter 22, easy to test.

### `changeState()`: the one door between states

Every change of state goes through this one method. That gives you two things for free:

- **A log line on every transition:** `FollowLine: FOLLOWING -> SEARCHING_LEFT`. The `->` in that string is just two characters of text, an arrow for people reading the log. Because enums print their own names, the log reads like the diagram.
- **One place for entry actions.** When the new state is a search, it records the heading, **once**, on the way in. If you set `searchStartHeadingDegrees` inside the search's action instead, it would be reset every loop, and the robot would never give up.

### `followSpeeds()`: the P controller

This is the steering from Section 21.5: read the error, **remember** it in `lastSteeringError` for the next time the line is lost, multiply by `STEER_KP`, clamp to the drivetrain's turn limit (Chapter 15's `MathUtil.clamp`), and drive forward. The only line here that is about the state machine is the one that remembers.

### `isFinished()` and `end()`

`isFinished()` is one line: `return state.isDone();`. The command is finished exactly when the state machine is in a finished state, and the enum knows which those are. `end()` stops the motors however the command ends, and the log says both **how** it ended (finished or interrupted) and **where** (the state). Holding the left bumper and letting go halfway gives `FollowLine interrupted in FOLLOWING after 0.214 m`.

### `getState()`

The one public method besides the four command methods. It lets other code read, but not change, the state: a getter, like the ones in Chapter 9. Section 21.7 uses it.

> **The command lifecycle is a state machine too**
>
> Look at how `FollowLine`'s state machine sits inside the command's methods. `initialize()` picks the **start state**. Each `execute()` is one **step**: decide, then act. `isFinished()` asks whether the machine is in a **finished state**. `end()` is the cleanup that runs however the machine stops. WPILib's `Command` was designed with exactly this shape in mind, which is why a state machine fits inside a command so neatly. And the scheduler itself keeps each command in one of a few states (scheduled, running, ended), moving it between them every loop. It is state machines all the way down.

> **Chatter: when a machine flickers between states**
>
> Right at the edge of the tape, a reflectance reading can wobble around `LINE_THRESHOLD` for a few loops (Section 20.6 used `debounce` on the line light for exactly this reason). A state machine whose transitions depend on that reading can flicker between two states, every loop or two. Engineers call it **chatter**. The line follower is protected from the worst of it, because a search ends the moment the line is seen and following does not care how faintly it is seen. If your robot ever logs a long run of `FOLLOWING -> SEARCHING_LEFT -> FOLLOWING -> ...`, the cure is the same as in Chapter 20: make a transition require its condition for a short time (a debounce), or use two thresholds, a higher one to say "found" and a lower one to say "lost." The two-threshold trick is called **hysteresis**, and a thermostat uses it so the furnace does not click on and off every few seconds.

---

## 21.7 A Sequence Is a State Machine

Before `FollowLine` goes into the course, step back and look at the course itself. Here is Chapter 20's `buildObstacleCourse()`, drawn as a state diagram:

```
  [Reset Pose] --done--> [DriveDistance] --done--> [TurnToHeading] --done--> [DriveUntilLine] --done--> [Hold Still]
                          (or 7 s)                  (or 7 s)                  (or 7 s)
```

Every box is a state. The "action" of each state is its command's `execute()`. Every arrow is the same kind of transition: "this command is finished." That is all a sequence is: **a state machine with no choices.** Each state has exactly one arrow out, and it always points to the next one.

Put Chapter 12's hand-written state machine next to Chapter 20's sequence, and every part of one has a twin in the other:

| State machine idea | Chapter 12: `switch` on `autoStep` | Chapter 20: a command sequence |
|---|---|---|
| The list of states | The `STEP_` constants | The commands, in order |
| The current state | `autoStep` | The group's `m_currentCommandIndex` |
| A state's action | The code in its `case` | The command's `execute()` |
| A transition | `startStep(STEP_TURN_LEFT)` when the distance is reached | The command's `isFinished()` returning `true` |
| An entry action | The first lines of `startStep()` | The command's `initialize()` |
| An exit action | (none: easy to forget) | The command's `end()` |
| A safety transition | `stepTimer.hasElapsed(...)` | `.withTimeout(...)` |

This is what the project's plan meant by "state machines and command groups are two ways of writing the same idea." A command group **is** a state machine, where each state is a whole command. A command with a `switch` inside **is** a state machine, where each state is a few lines of `execute()`. Neither one is more correct. They are different tools for different sizes of state.

### Choices: groups that branch

A real state diagram has states with **more than one arrow out**, and which one to follow depends on what happened. `FollowLine`'s `FOLLOWING` state has three. Can a command group do that too?

It can. WPILib has a family of commands that choose, when they start, which command to run:

| Command | The diagram shape | What it does |
|---|---|---|
| `Commands.either(a, b, condition)` | A fork with two arrows | When it starts, asks `condition`: `true` runs `a`, `false` runs `b` |
| `Commands.select(map, selector)` | A fork with many arrows | When it starts, asks `selector` for a key, and runs the command the map stores under that key |
| `a.onlyIf(condition)` | A fork where one arrow skips ahead | Runs `a` only if `condition` is true; otherwise ends at once |
| `a.repeatedly()` | An arrow back to the start | Starts `a` over every time it ends, forever |
| `a.until(condition)` | An extra arrow out of a state | Ends `a` early when `condition` becomes true (a race, Section 20.3) |

`either` is the one the course needs. Look at `DriveUntilLine` from Chapter 19: it has **two** ways to finish, "line found" and "drove `LEG_2_MAX_DISTANCE_METERS` with no line." In a state diagram, those are two different arrows out of the same box, and they should lead to different places:

```
                                         line under the sensors
                                  +-----------------------------> [FollowLine] ---+
  ... --> [DriveUntilLine] --done-+                                               +--> [Hold Still]
                                  +-----------------------------> [log a note] ---+
                                         no line under the sensors
```

If there is a line under the sensors, follow it. If `DriveUntilLine` gave up without finding one, there is nothing to follow, and the robot should not go looking for a line that is not there. In code, that fork is one `either`:

```java
Commands.either(
    new FollowLine(drivetrain, sensors)                    // found the line: follow it
        .withTimeout(CourseConstants.FOLLOW_TIMEOUT_SECONDS),
    Commands.runOnce(() -> DataLogManager.log("No line here, so no leg 3")),
    this::isLineSeen)
```

Read it aloud: "Either follow the line, or log a note, depending on whether the line is seen." Three things to know about `either`:

- **The condition is checked when the `either` starts, not when it is built.** It is a `BooleanSupplier` (Chapter 18), asked once, in the `either`'s `initialize()`, at the moment `DriveUntilLine` hands over. That is the "now or later?" rule from Section 18.6 working in your favor: the course is built at startup, but the question is asked at the right moment, in the middle of autonomous.
- **It requires everything either branch requires.** WPILib cannot know in advance which branch will run, so the `either` holds the drivetrain (because `FollowLine` needs it) even if it ends up only logging a note. Inside a sequence that already holds the drivetrain, that changes nothing.
- **Both branches belong to the `either`.** The one-owner rule from Section 20.4 applies: build each branch fresh, right there.

`Commands.onlyIf` would also work here (`new FollowLine(...).onlyIf(this::isLineSeen)`), and it is shorter. The book uses `either` because the "no line" branch leaves a line in the log, and a log that says **why** a step was skipped is worth one extra line of code.

> **`select`: a fork with an enum on every arrow**
>
> When a fork has more than two arrows, `either` becomes awkward. `Commands.select` takes a `Map`, which is a lookup table from keys to values (Java's `Map.of(key1, value1, key2, value2)` builds a small one), and a `Supplier` that produces the key. Enums make perfect keys, because the compiler knows every possible one:
>
> ```java
> Commands.select(
>     Map.of(
>         FollowLine.State.END_OF_LINE, celebrate(),
>         FollowLine.State.GAVE_UP, signalTrouble()),
>     followLine::getState)
> ```
>
> "When this starts, look at the follower's state, and run the command for it." If the key is not in the map, `select` prints a warning and does nothing. Practice 5 builds exactly this, so the robot tells you with its LED how leg 3 ended.

### Two ways to write the same machine

So when should a state machine live **inside** one command, as `FollowLine` does, and when should it be **made of** commands, as the course is? Ask how big the states are:

| Write it inside one command when... | Build it from commands when... |
|---|---|
| States change every few loops (`FOLLOWING` to `SEARCHING_LEFT` and back, many times a second) | Each state lasts a while and has a clear finish (drive 0.5 m, turn to 90) |
| The states share memory (the last error, the search heading) | Each state needs only its own memory |
| Every state uses the same subsystem in a slightly different way | The states are whole actions you already have as commands, and may reuse elsewhere |
| The transitions depend on sensor readings, loop by loop | The transitions are mostly "this one is finished" |

`FollowLine` is the first column all the way down. Could you build it from commands anyway? You could: a "follow" command that runs `until` the line is lost, then a `select` that picks a search command by direction, all inside a `repeatedly()`. But the last error and the search heading would have to live in fields **outside** all of those commands, shared by them, which is exactly the scattered memory that Section 18.2 warned about. One command with a small state machine inside keeps all of that in one place.

The course is the second column all the way down. Writing it as one big `switch` was Chapter 12, and you saw where that went. The best robot code uses both, nested: **a state machine of commands, where some of the commands have a state machine inside.** That is the shape of the course after this chapter.

> **Why the scheduler sees only one command**
>
> Chapter 20 pointed out that the Scheduler widget shows only `Obstacle Course`, never `DriveDistance` or `FollowLine`. Now you can say why in state machine words. The scheduler runs one state machine (the group), and the group runs its own states internally, the same way `FollowLine` runs its states internally. Nobody outside needs to know which state a machine is in, unless the machine chooses to tell them, which is what the `Line State` widget and the log messages are for.

---

## 21.8 Leg 3: Wiring It In

Time to put `FollowLine` to work: on a button in teleop, and as leg 3 of the obstacle course. Everything here is in `Constants.java` and `RobotContainer.java`. `Robot.java` does not change at all, which is the Chapter 20 promise kept.

### Step 1: Course constants

In `Constants.java`, add three constants to the end of `CourseConstants`, after `LINE_POSE`:

```java
        // Leg 3 (Chapter 21): follow the line from the crossbar to its end.
        public static final double FOLLOW_LINE_LENGTH_METERS = 0.60;   // crossbar to end of tape, measured
        public static final double FOLLOW_TIMEOUT_SECONDS = 10.0;
        public static final Pose2d END_POSE = new Pose2d(
            LEG_1_DISTANCE_METERS, LINE_DISTANCE_METERS + FOLLOW_LINE_LENGTH_METERS,
            Rotation2d.fromDegrees(TURN_HEADING_DEGREES));
```

Use **your** measured length. `FOLLOW_TIMEOUT_SECONDS` is a safety net, like every step's timeout: 0.6 m at 0.10 m/s takes about 6 seconds, plus time for a search or two. `END_POSE` is where the robot should finish if your line is straight. It is only for the field map (and the simulated floor in Step 4), so a bent line just means the robot finishes somewhere else, which is fine. The follower itself never looks at it: it stops when the **tape** ends, not when it reaches a number.

The step constants (`FollowLine`'s speeds, gains, and search limit) stay inside `FollowLine`, because they describe how the follower behaves, not the course. That is Chapter 20's rule again.

### Step 2: The course, with leg 3

In `RobotContainer.java`, import the new command next to the others:

```java
import frc.robot.commands.FollowLine;
```

Replace `buildObstacleCourse()` with this version. The only change in the code is the new last step of the sequence, the `either` from Section 21.7, and the Javadoc:

```java
/**
 * Build the obstacle course as one command: drive, turn, drive to the line, and
 * follow the line to its end, with the LED on the whole way, then hold still until
 * autonomous ends.
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
            .withTimeout(CourseConstants.STEP_TIMEOUT_SECONDS),
        Commands.either(
            new FollowLine(drivetrain, sensors)                    // found the line: follow it
                .withTimeout(CourseConstants.FOLLOW_TIMEOUT_SECONDS),
            Commands.runOnce(() -> DataLogManager.log("No line here, so no leg 3")),
            this::isLineSeen));

    return course
        .deadlineFor(lightTheLed().withName("Auto Light"))   // LED on while the course runs
        .andThen(holdStill())                                // then keep the drivetrain
        .withName("Obstacle Course");
}
```

Leg 3 sits **inside** the sequence, so it is inside the deadline too: the LED stays on until the follower finishes, and then `Hold Still` takes over, exactly as before.

`this::isLineSeen` is a method reference to a new private helper. Add it just above the SysId fences:

```java
/** True if either reflectance sensor sees the line, right now. */
private boolean isLineSeen() {
    return sensors.isLeftOnLine() || sensors.isRightOnLine();
}
```

Now that the helper exists, the line light's trigger in `configureBindings()` can use it too, instead of repeating the same lambda. Change the first line of the line light binding to:

```java
Trigger lineSeen = new Trigger(this::isLineSeen)
```

and leave the `.debounce(...)` line under it as it was. One question, one method, used twice.

> **Three `isLineSeen()`s?**
>
> `DriveUntilLine`, `FollowLine`, and now `RobotContainer` each have a private `isLineSeen()`. That is a small smell: the question "is either sensor on the line?" is really about the **sensors**, so it belongs in `Sensors`, as a public `isEitherOnLine()`, and then all three could call it. Practice 7 asks you to make that move. It is left as an exercise so the Build step changes as few files as possible, and because spotting duplication like this, after the code works, is a skill worth practicing.

### Step 3: Follow the line in teleop

In `configureBindings()`, add one binding right after the line light's:

```java
// Teleop: hold the left bumper over a line, and the robot follows it to the end.
controller.leftBumper().and(teleop).whileTrue(new FollowLine(drivetrain, sensors));
```

and add its row to the controls table, right after the teleop `A` row:

```
 *            left bumper    follow the line (hold); let go to take the sticks back
```

Follow it through, the way you followed the A button in Section 20.6. Hold the left bumper over the tape: `FollowLine` interrupts `DriveWithSticks` and follows. Let go: `whileTrue` cancels it, `end(true)` stops the motors, and the sticks are back. Hold it to the end of the line: the follower reaches `END_OF_LINE`, finishes, and the sticks come back even with your finger still on the bumper. Hold it with no line under the robot: it starts in `GAVE_UP`, finishes on its first loop, and nothing moves.

The left bumper was already bound in **Test** mode, to the bench cruise. `.and(teleop)` and `.and(test)` keep the two from ever meeting. (If your Chapter 20 pair lab left `X` and `B` bound in teleop, keep them; the left bumper was chosen because it is free in teleop for everyone.)

### Step 4: Show leg 3 on the field map

In the constructor, add `END_POSE` to the course's poses on the field map:

```java
field.getObject("Course").setPoses(
    CourseConstants.START_POSE, CourseConstants.CORNER_POSE, CourseConstants.LINE_POSE,
    CourseConstants.END_POSE);
```

### Step 5: Give the simulated robot the tape

The simulated Explorer from Chapter 17 has a very simple floor: both reflectance sensors read black as soon as the robot's **center** is past the crossbar. That was enough for `DriveUntilLine`, but it is useless for following a line, because both sensors always agree. To follow anything, each pretend sensor has to know where **it** is on the floor, and whether that spot is black.

Here is the idea, and it is one you will use for the rest of your robotics life. A sensor is bolted to the robot at a fixed spot: say 5 cm ahead of the robot's center and a centimeter to the left. That spot is measured in the **robot's frame** (Chapter 14's coordinate frames, with the robot at the origin facing along +x). To find where the sensor is on the **field**, you start at the robot's pose and move by that offset, turned to match the robot's heading. WPILib does that with one method: `pose.transformBy(transform)`, where a `Transform2d` is "a move, measured from the robot's point of view."

In `RobotContainer.java`, add three imports:

```java
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Transform2d;
import edu.wpi.first.math.geometry.Translation2d;
```

Add these constants under the three `AnalogInputSim` fields:

```java
// The pretend floor (Section 21.8): where the sensors sit, and how big the tape is.
private static final double SIM_SENSOR_AHEAD_METERS = 0.05;          // ahead of the robot's center
private static final double SIM_SENSOR_SIDE_METERS = 0.01;           // each side of the center line
private static final double SIM_TAPE_HALF_WIDTH_METERS = 0.02;       // 4 cm: wider than real tape
private static final double SIM_CROSSBAR_HALF_LENGTH_METERS = 0.10;  // a 20 cm crossbar
```

They describe the pretend robot and the pretend floor, which only the simulation has, so they live next to the simulation code. They are rough on purpose. The real XRP's sensors are not at exactly these spots, and the pretend tape is twice as wide as real electrical tape, so that the simulated robot, which can finish leg 1 a centimeter or so to one side, still lands on the line. A pretend floor only has to be good enough to exercise the code.

Then replace `simulationPeriodic()` with this, and add the helper below it:

```java
/**
 * Give the simulated robot a simulated floor (Section 17.9), now with the whole
 * course's tape on it (Section 21.8). Robot calls this every loop; it does nothing
 * unless the robot is the simulated one.
 */
public void simulationPeriodic() {
    if (!Constants.USE_SIMULATED_ROBOT) {
        return;   // the real XRP has a real floor
    }

    // Rangefinder: 5 volts is the most it can read, 4 meters. The way ahead is clear.
    rangefinderSim.setVoltage(5.0);

    // Reflectance: 5 volts is black, 0 volts is white. Each sensor checks the pretend tape.
    Pose2d pose = drivetrain.getPose();
    leftReflectanceSim.setVoltage(isOnPretendTape(pose, SIM_SENSOR_SIDE_METERS) ? 5.0 : 0.0);
    rightReflectanceSim.setVoltage(isOnPretendTape(pose, -SIM_SENSOR_SIDE_METERS) ? 5.0 : 0.0);
}

/**
 * Is one reflectance sensor over the pretend tape? The tape is a T: the crossbar
 * across leg 2, and the line to follow running on from its middle.
 *
 * @param robotPose where the robot is on the field
 * @param sideMeters where the sensor is, left (positive) or right of the robot's center
 * @return true if that sensor is over black tape
 */
private boolean isOnPretendTape(Pose2d robotPose, double sideMeters) {
    // Robot frame to field frame: where on the floor is this sensor?
    Translation2d sensor = robotPose.transformBy(
        new Transform2d(SIM_SENSOR_AHEAD_METERS, sideMeters, new Rotation2d())).getTranslation();

    double acrossLine = Math.abs(sensor.getX() - CourseConstants.LEG_1_DISTANCE_METERS);
    double alongLeg2 = sensor.getY() - CourseConstants.LINE_DISTANCE_METERS;

    boolean onCrossbar = Math.abs(alongLeg2) <= SIM_TAPE_HALF_WIDTH_METERS
        && acrossLine <= SIM_CROSSBAR_HALF_LENGTH_METERS;
    boolean onFollowLine = acrossLine <= SIM_TAPE_HALF_WIDTH_METERS
        && alongLeg2 >= 0.0
        && alongLeg2 <= CourseConstants.FOLLOW_LINE_LENGTH_METERS;
    return onCrossbar || onFollowLine;
}
```

Walk through `isOnPretendTape()`:

- **`new Transform2d(ahead, side, new Rotation2d())`** is the sensor's spot in the robot's frame: so far ahead, so far to the left (positive) or right (negative), not rotated. `robotPose.transformBy(...)` turns that into a pose on the field, and `getTranslation()` keeps just the x and y. Positive side is left because +y is to the robot's left (Chapter 14).
- **`acrossLine` and `alongLeg2`** measure the sensor's spot against the course: how far it is sideways from the line that runs up leg 2 (at x = `LEG_1_DISTANCE_METERS`), and how far it is past the crossbar (at y = `LINE_DISTANCE_METERS`).
- **`onCrossbar`** is "within half a tape's width of the crossbar, and within its 20 cm." **`onFollowLine`** is "within half a tape's width of the line, between the crossbar and the end." Each is one `boolean`, built with `&&` (Chapter 6), and the answer is either one.

Then `simulationPeriodic()` asks once for each sensor, with the side offset flipped for the right one.

> **Robot frame, field frame, everywhere**
>
> "Where on the field is a thing that is bolted to my robot?" is one of the most common questions in robot code. In Chapter 28, the Mini Swerve's four wheels are each at their own offset from the robot's center. In Chapter 33, the camera is mounted at an offset, and its view of an AprilTag has to be moved from the camera's frame, to the robot's, to the field's, before it can correct the robot's pose. Each of those steps is a `Transform2d` (or its 3D cousin), and each one is the same move you just made for a 1 cm sensor offset.

Build. Then, before you test anything, make sure the old behavior is safe: the course's first four steps should not have changed at all. The next section checks everything.

---

## 21.9 Run It: Follow the Line

Build, switch on the XRP, and run the program with `USE_SIMULATED_ROBOT = false`. Keep **NetworkTables** > **SmartDashboard** open with `Line State`, `Line Error`, `Left Reflectance`, `Right Reflectance`, and the Scheduler, and watch the terminal. Everything below says what the terminal should show; your numbers will differ.

### On the bench: teleop

Start with a plain straight strip of tape, away from the course, so nothing else can confuse you.

1. **Before you enable,** put the robot on the tape, centered, and look at the two reflectance widgets. Both should read somewhere in the middle (around `0.4` to `0.7` on most floors), and `Line Error` near `0`. Slide the robot sideways by hand a few millimeters each way: one reading rises, the other falls, and the error swings positive when the tape is under the **left** sensor. If it swings the other way, your sensors are reversed in your head or in your code; fix that before going on.
2. Enable **Teleoperated**, and **hold the left bumper**. `FollowLine` replaces `DriveWithSticks` in the Scheduler list, `Line State` says `FOLLOWING`, and the robot creeps along the tape. At the end of the tape, it stops by itself, and the terminal tells the story:

```
FollowLine started in FOLLOWING at Pose2d(...)
FollowLine: FOLLOWING -> END_OF_LINE
FollowLine finished in END_OF_LINE after 0.587 m
```

`DriveWithSticks` is back in the list, even though you are still holding the bumper (`whileTrue` does not restart a finished command, Section 20.6).

3. Put it back, hold the bumper, and **let go halfway**. `FollowLine interrupted in FOLLOWING after ...`, and the sticks work at once.
4. Hold the bumper with the robot **off** the tape: `FollowLine started in GAVE_UP`, then `finished in GAVE_UP after 0.0 m`. Nothing moves.

### Bends, corners, and searches

5. Add a **gentle bend** to your strip, a curve you could draw around a dinner plate. Follow it. Watch `Line Error` swing as the robot steers through the bend and settles again on the straight.
6. Now make a **sharp corner**: a right angle to the left. At the corner, the robot will drive off the end of the first piece. Watch the log:

```
FollowLine: FOLLOWING -> SEARCHING_LEFT
FollowLine: SEARCHING_LEFT -> FOLLOWING
```

It lost the line with the error positive (the line was under the left sensor last), turned left in place, found the new piece, and carried on. That is the case Section 21.1's plain `if`s got wrong.

7. Force a **give up**. Start a follow on the sharp corner, and as soon as `Line State` says `SEARCHING_LEFT`, slide a sheet of white paper over the tape ahead of the robot. It turns, finds nothing, and after 120 degrees: `SEARCHING_LEFT -> GAVE_UP`, and it stops.

### Tuning

The numbers at the top of `FollowLine` are estimates. Tune them on your own tape, one at a time, the way you tuned PID in Chapter 15:

| What you see | Change |
|---|---|
| The robot wiggles from side to side all along a straight line | Lower `STEER_KP` |
| The robot drifts off the outside of gentle bends | Raise `STEER_KP`, or lower `FOLLOW_METERS_PER_SECOND` |
| On a sharp corner, it logs `END_OF_LINE` instead of searching | Lower `SIDE_ERROR` (the corner looked "centered"), or slow down so the error has time to grow before the line is lost |
| At the real end of the tape, it searches instead of stopping | Raise `SIDE_ERROR`, or check that the tape's end is cut square |
| It searches past the line without stopping | Lower `SEARCH_RADIANS_PER_SECOND`: the sensors swept over the tape between two loops |

Chapter 23 lets you change these numbers live, from the dashboard, without rebuilding. For now, change, build, and run.

### The whole course

8. Lay out the full course: leg 1, the crossbar, and your leg 3 strip starting where the robot stops. Press Y, then enable **Autonomous**. The robot drives leg 1, turns, drives to the crossbar, and follows the line to its end, with the LED on the whole way. Then the LED goes out and `Hold Still` holds the robot. The log reads like the diagram from Section 21.7:

```
Pose reset to start
DriveDistance 0.5 m started at Pose2d(...)
DriveDistance finished after 0.497 m
TurnToHeading 90.0 deg started
TurnToHeading finished at 89.1 deg
DriveUntilLine started at Pose2d(...)
Line found after 0.392 m
FollowLine started in FOLLOWING at Pose2d(...)
FollowLine: FOLLOWING -> END_OF_LINE
FollowLine finished in END_OF_LINE after 0.583 m
```

9. Pick up the crossbar and leg 3 tape, and run the course again. `DriveUntilLine` drives its maximum distance and logs `No line within 1.0 m, stopping`; the `either` takes its other branch and logs `No line here, so no leg 3`; and the robot holds still. The fork in the diagram, working.

### The simulated Explorer

Switch the XRP off, set `USE_SIMULATED_ROBOT = true`, and run the course in autonomous. Watch the **Field** view: the robot icon drives leg 1, turns, and runs up leg 3 to the `END_POSE` marker. Then hold the left bumper in teleop with the simulated robot sitting on the pretend line, and drive it off the side with the sticks between tries.

The simulated sensors are perfectly sharp: each one reads pure black or pure white, so the error is always `-1`, `0`, or `+1`, and the steering looks jerkier than on the real robot. That is the pretend floor, not your code. Set `USE_SIMULATED_ROBOT = false` again before you commit.

Diagnose anything strange:

| What you see | Most likely cause |
|---|---|
| `the switch expression does not cover all possible input values` | A case is missing from `decideNextState()` or from the act switch in `execute()`. Every state needs a line in both |
| `an enum switch case label must be the unqualified name of an enumeration constant` | A `case` says `State.FOLLOWING` or `FollowLine.State.FOLLOWING`; inside a `case`, write just `FOLLOWING` |
| `';' expected` near the end of the enum's list | The semicolon after `GAVE_UP(true)` is missing |
| `Line Error` is positive when the tape is under the **right** sensor | `getSteeringError()` subtracts the wrong way round, so the robot steers away from the line |
| The robot spins forever and never gives up | The heading for the search is being set every loop instead of once: `searchStartHeadingDegrees` must be set only in `changeState()` |
| The second follow in a session finishes instantly | `state` is only set in its field initializer, not in `initialize()` (the constructor trap from Section 19.6) |
| `END_OF_LINE` on every bend | `SIDE_ERROR` is too high, or `STEER_KP` is too low, so the robot is never far enough off to one side |
| Autonomous skips leg 3 even though the tape is there | The leg 3 strip does not start where the robot stops, so neither sensor is on tape when the `either` checks |
| The left bumper does nothing in teleop | The binding is missing `.and(teleop)`, or uses `test` |

---

## 21.10 State Machines Everywhere

Once you can see state machines, you see them in every robot program, at every size.

- **Chapter 22, unit tests.** `decideNextState()` only answers a question: given a state and some sensor readings, which state comes next? That makes it the perfect first thing to test. Chapter 22 drives the follower through every arrow in the diagram, with pretend sensor readings, in a fraction of a second, without a robot.
- **Chapter 23, live tuning.** `STEER_KP`, `SIDE_ERROR`, and the follow speed become dashboard sliders.
- **Chapter 24, AdvantageScope.** A state that is logged by name every loop becomes a timeline you can scrub through after a run: you can see exactly which loop the follower went from `FOLLOWING` to `SEARCHING_LEFT`, and what the sensors read at that moment.
- **Chapter 31, PathPlanner.** Autonomous routines become sequences of paths and commands, with branches like "if we are holding a game piece, score it; otherwise, go get one": `either` at competition scale.
- **Chapter 33, auto-align.** Lining up on an AprilTag is a small state machine: "no tag in view, turn and look," "tag in view, drive toward it," "close enough, stop," with a search that gives up, just like `FollowLine`'s.
- **Chapters 34 and 35, the competition robot.** The intake, the shooter, and the arm each have their own states, and the whole robot often has a superstructure state machine on top that makes sure no two mechanisms are ever told to collide.

Whenever you start a feature that has to remember what it was doing, draw the diagram first. It takes five minutes, and it finds the missing arrow before the robot does.

---

## Chapter Summary

> **What you learned in Chapter 21**
>
> * When two situations look the same to the sensors but need different actions (both reflectance sensors on white, at the end of the line or past a sharp corner), reactive code cannot decide. The robot needs to remember what it was doing: its **state**.
> * A **state machine** has **states** (it is always in exactly one), **transitions** (rules for moving between states), and **actions** (what it does in each state, plus **entry actions** done once on the way in). Draw it as a **state diagram** first, and check that every state has an arrow for every input.
> * New Java: an **enum** is a type with a fixed list of named values. Enum values compare with `==`, print their own names, and work in `switch` with bare `case` labels. An enum is a class: its constants are objects Java creates once, its constructor is always `private`, and it can have fields and methods (`FollowLine.State.isDone()`).
> * New Java: a **switch expression** (`case X -> value`) produces a value, never falls through, and must cover **every** enum constant, so adding a state makes the compiler point at every place that needs a decision. Switch on the state with expressions and no `default`.
> * `FollowLine` is a state machine inside a command: `initialize()` picks the start state, each `execute()` **decides** the next state and then **acts** on it, `isFinished()` asks whether the state is a finished one, and every transition goes through one `changeState()` method that logs it and runs entry actions. In `FOLLOWING`, it steers with a P controller on the difference between the two sensors.
> * A **command sequence is a state machine with no choices**: each command is a state and "finished" is the transition. `Commands.either`, `Commands.select` (with enum keys), `onlyIf`, `repeatedly`, and `until` add branches and loops. Write a state machine **inside** a command when its states are small, fast, and share memory; build it **from** commands when its states are whole actions. The course is now both: a sequence whose last step is an `either`, whose first branch is a state machine.

---

## Exercises

### Practice

**1. A traffic light of your own.** In a practice branch, create `TrafficLight.java` in `frc.robot` with the enum from Section 21.3 (durations and `next()`). In `RobotContainer`, add a field `private TrafficLight light = TrafficLight.RED;` and, at the end of `configureBindings()`, a Test mode binding that logs the light and moves to the next one each time you press Start:

```java
controller.start().and(RobotModeTriggers.test()).onTrue(
    Commands.runOnce(() -> {
        DataLogManager.log(light + " for " + light.getDurationSeconds() + " s");
        light = light.next();
    }));
```

Press Start six times and check the log. Then: (a) add a `for` loop over `TrafficLight.values()` to the constructor that logs every light and its duration once at startup; (b) add a fourth constant, `FLASHING_RED(1.0)`, between `YELLOW` and `GREEN`, build, and copy the error message into `reflections.md`. Which line does it point at, and why there? (c) Decide where `FLASHING_RED` goes in the cycle, fix `next()`, and build again. Delete the branch when you are done.

**2. Trace the machine.** Without running anything, fill in this table in `reflections.md`. The follower starts in `FOLLOWING` on loop 1. "On" means `isLeftOnLine()` or `isRightOnLine()` is true. Assume `SIDE_ERROR` is `0.2`, and that a search turns 3 degrees per loop.

| Loop | Left reading | Right reading | Left on? | Right on? | State after this loop's decide | `lastSteeringError` after this loop |
|---|---|---|---|---|---|---|
| 1 | 0.55 | 0.50 | yes | yes | | |
| 2 | 0.70 | 0.30 | yes | no | | |
| 3 | 0.60 | 0.10 | yes | no | | |
| 4 | 0.10 | 0.05 | no | no | | |
| 5 | 0.10 | 0.05 | no | no | | |
| 6 | 0.50 | 0.10 | yes | no | | |
| 7 | 0.50 | 0.48 | yes | yes | | |
| 8 | 0.05 | 0.05 | no | no | | |

(Careful: `lastSteeringError` only changes on loops that end in `FOLLOWING`, because only `followSpeeds()` sets it.) What state is the follower in after loop 8, and is the command finished? Then answer: if loops 4 and 5 had come straight after loop 1, which state would loop 4 have gone to, and why?

**3. Break it three ways.** In a practice branch, make each change on its own, predict what will happen, try it, and undo it:

- (a) Delete the `SEARCHING_RIGHT` line from the act switch in `execute()`. Does it build? What does the error say?
- (b) Move `searchStartHeadingDegrees = drivetrain.getHeadingDegrees();` out of `changeState()` and into the `SEARCHING_LEFT` case of the act switch (you will need a small helper method so the case can both record the heading and return speeds). Force a search with the white-paper trick from Section 21.9. Does the robot ever give up? Why not?
- (c) Delete the line `state = isLineSeen() ? ...` from `initialize()`. Follow the line to its end once with the left bumper, then put the robot back at the start and hold the bumper again. What happens on the second try, and which section of Chapter 19 warned you about this?

Write one sentence per change in `reflections.md`: "this is a decide bug," or "this is an act bug," or "this is a memory bug," and why.

**4. Three strikes.** On a wavy line with several sharp corners, the follower might search, find the line, lose it again, and search again, over and over. Add a rule: after the **third** search in one run, give up. Draw the new diagram first in `reflections.md` (which arrow changes?). Then implement it with one new `int` field, `searchCount`. Where is it reset? Where is it counted: in a state's action, or in an entry action? Why does that choice matter? Test it on your sharpest corners.

**5. How did leg 3 end?** Make the robot tell you with its LED. In a practice branch, change `buildObstacleCourse()` so `FollowLine` is a local variable, created before the sequence, and used in the `either` (instead of `new FollowLine(...)` there). Add this factory method to `RobotContainer`:

```java
/** A command that blinks the LED some number of times, then leaves it off. */
private Command blinkTheLed(int times) {
    Command oneBlink = Commands.sequence(
        Commands.runOnce(() -> onBoardIO.setLed(true)),
        Commands.waitSeconds(0.2),
        Commands.runOnce(() -> onBoardIO.setLed(false)),
        Commands.waitSeconds(0.2));
    return oneBlink.repeatedly().withTimeout(0.4 * times);
}
```

Then replace `.andThen(holdStill())` with:

```java
.andThen(holdStill().alongWith(                      // hold still, and signal how leg 3 ended
    Commands.select(
        Map.of(
            FollowLine.State.END_OF_LINE, blinkTheLed(5),
            FollowLine.State.GAVE_UP, lightTheLed().withTimeout(3.0)),
        followLine::getState)))
```

(Import `java.util.Map`.) Run the course with the line, and with the white paper covering the end of leg 3 so the follower searches and gives up. Then answer in `reflections.md`: (a) Why is it fine to call `followLine::getState` when `followLine` belongs to the `either`? Does reading a command count as "using" it under the one-owner rule? (b) Why must `holdStill()` run **alongside** the signal, not before it or after it? (c) Remove the leg 3 tape entirely, so the `either` skips the follower. What key does `select` see, and what appears in the terminal? Fix it by adding an entry to the map, and decide what the robot should show for that case.

**6. Corners and speed.** Lay out a test strip with a gentle bend, a sharper bend, and a right-angle corner. Run the follower over it five times at each of three speeds (`FOLLOW_METERS_PER_SECOND` of 0.06, 0.10, and 0.15), and record in a table how many runs reached the end, and how many searches the log shows. What happens to the right-angle corner as the speed goes up? Use Section 21.5's explanation of `SIDE_ERROR` to explain why.

**7. One question, one home.** `DriveUntilLine`, `FollowLine`, and `RobotContainer` each have a private `isLineSeen()` (see the callout in Section 21.8). Add a public `isEitherOnLine()` to `Sensors`, with a Javadoc comment, and make all three use it. Delete the three private copies. Build and run the course to check that nothing changed. In one sentence: why does this question belong in `Sensors`, and not in `Drivetrain` or a command?

**8. Challenge: the course the old way.** In a practice branch, write the **whole** course as one command class, `CourseAsOneCommand`, with its own `enum Step { RESET, DRIVE_LEG_1, TURN, DRIVE_TO_LINE, FOLLOW_LINE, DONE }` and a switch expression on it in `execute()`, the way Chapter 12 would have, if it had had enums. (You may use a `FollowLine` object inside it, calling its `initialize()`, `execute()`, and `isFinished()` yourself, exactly as a sequence does.) Get it to drive the course. Then count the lines in your class and in `buildObstacleCourse()`, and write three sentences in `reflections.md` comparing them: which is easier to read, which is easier to change, and which would you rather debug at a competition.

### Build (XRP Explorer)

Give the Explorer a line follower, in teleop and as leg 3 of the course.

1. Make a branch (see the Git exercise).
2. Lay out leg 3 on your floor (Section 21.5): a strip of black tape about 0.6 m long, starting where the robot stops on the crossbar. Measure it.
3. Create `FollowLine.java` in the `commands` folder (Section 21.6). Build.
4. Add the teleop binding and its controls table row (Section 21.8, Step 3). Build.
5. On a separate straight strip of tape, run checks 1 to 4 in Section 21.9. Then checks 5 to 7, with a bend and a corner. Tune `STEER_KP`, `FOLLOW_METERS_PER_SECOND`, and `SIDE_ERROR` for your tape and floor, and record your final values and why in `reflections.md`. Commit.
6. Add the leg 3 constants (Step 1), the new `buildObstacleCourse()` and the `isLineSeen()` helper (Step 2), the line light's new trigger line, and `END_POSE` on the field map (Step 4). Build.
7. On the real XRP, run checks 8 and 9: the whole course, with and without the tape.
8. Add the pretend tape to the simulated floor (Step 5). On the simulated Explorer, run the course in autonomous and watch the Field view. Set `USE_SIMULATED_ROBOT = false` again.
9. **Draw the course.** In `reflections.md`, draw the whole obstacle course as a state diagram, including the fork after `DriveUntilLine` and, inside the `FollowLine` box, a smaller copy of the follower's own diagram. Mark which parts are command groups and which part is a state machine inside a command. Commit.

Diagnose anything strange with the table at the end of Section 21.9.

When the Explorer follows a line to its end, both on a button and as the last leg of the course, you are ready for Chapter 22.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Section 21.1's first try used four `if`s and no memory. Describe the exact situation where it does the wrong thing, and explain why no `if` about **this loop's** readings could ever fix it.
2. `execute()` always decides first, then acts. Suppose the robot is in `FOLLOWING` and drives off the end of the line. Walk through that one loop: which method notices, which state the robot moves to, and what it does in that same loop. What would go wrong if `execute()` acted first and decided second?
3. Why does the book say "no `default`" in a switch expression on a state? Describe what would happen, months later, if a teammate added a new state to an enum whose switch expressions all had a `default`.
4. Give one example from a competition robot (an intake, a shooter, an arm, or an autonomous routine) that you would write as a state machine **inside** one command, and one that you would build **from** commands. Use the table in Section 21.7 to justify each.
5. `Commands.either(..., this::isLineSeen)` asks its question when the `either` **starts**, not when `buildObstacleCourse()` runs. What would the course do if the question were answered when the course was built, at program startup? Which chapter's "now or later?" lesson is this?

If any answer feels shaky, re-read Sections 21.1, 21.4, and 21.7.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b line-follower
```

After Build step 5, with the follower working on a button:

```bash
git add .
git commit -m "Ch21: FollowLine state machine command, on the left bumper in teleop"
```

After Build step 9, with `USE_SIMULATED_ROBOT = false`:

```bash
git add .
git commit -m "Ch21: Leg 3 of the course follows the line, with a simulated floor"
git push -u origin line-follower
```

Open a pull request into `main`. In the description, paste your state diagram from Build step 9 inside a code block (three backticks on the line before and after), so it keeps its shape. A reviewer who reads the diagram first, and the code second, can check that every arrow has its line of code. Merge, delete the branch, then `git checkout main` and `git pull`.

### Collab: The Merge Git Cannot Check, but Java Can

In Chapter 20's pair lab, Git merged two bindings onto one button without a complaint, and nothing caught it until someone pressed X. This lab sets up the same kind of collision in a state machine, and this time something catches it.

As before, the **owner** is the person whose Explorer repository you use, and the **teammate** is the other partner. Both: finish this chapter's Build and merge it into `main`. The teammate clones (or pulls) the owner's repository, as in Chapter 20. Both: `git checkout main` and `git pull`.

**Part A: two features at once.** Work at the same time. Nobody merges yet.

1. **Owner:** create a `wait-for-clear` branch. The drive coach wants the follower to stop, without giving up, if something is in the way, and carry on when it moves. In `FollowLine.java`:

   - Add a new state right after `FOLLOWING` in the enum:

     ```java
     WAITING_FOR_CLEAR(false), // something in the way: stop until it moves
     ```

   - Add a constant after `SEARCH_MAX_DEGREES`:

     ```java
     // Something in the way: stop closer than this, and wait for it to move.
     private static final double OBSTACLE_STOP_METERS = 0.15;
     ```

   - In the act switch in `execute()`, add a line after the `SEARCHING_RIGHT` case:

     ```java
     case WAITING_FOR_CLEAR -> new ChassisSpeeds();   // stopped, but not finished
     ```

   - In `decideNextState()`, replace the `FOLLOWING` case and add one for the new state:

     ```java
     case FOLLOWING -> stateWhileFollowing();
     case WAITING_FOR_CLEAR -> isObstacleAhead() ? state : State.FOLLOWING;
     ```

   - Add two helpers right after `decideNextState()`:

     ```java
     /** Following: stop for an obstacle, keep following, or work out where the line went. */
     private State stateWhileFollowing() {
         if (isObstacleAhead()) {
             return State.WAITING_FOR_CLEAR;
         }
         return isLineSeen() ? State.FOLLOWING : stateForLostLine();
     }

     /** True if the rangefinder sees something too close ahead. */
     private boolean isObstacleAhead() {
         return sensors.isObstacleWithin(OBSTACLE_STOP_METERS);
     }
     ```

   Draw the new arrows on your copy of the diagram. Build, test it (hold the left bumper, and put your hand in front of the robot partway along the line), and commit: `Add WAITING_FOR_CLEAR to FollowLine`.

2. **Teammate:** create a `line-status` branch. The drive coach also wants a plain-English status on the dashboard. In `FollowLine.java`, add this method right after `getState()`:

   ```java
   /** The state, in words a driver understands. */
   private String describeState() {
       return switch (state) {
           case FOLLOWING -> "On the line";
           case SEARCHING_LEFT -> "Lost it, looking left";
           case SEARCHING_RIGHT -> "Lost it, looking right";
           case END_OF_LINE -> "Reached the end";
           case GAVE_UP -> "Could not find the line";
       };
   }
   ```

   and, in `execute()`, one line after the `Line Error` line:

   ```java
   SmartDashboard.putString("Line Status", describeState());
   ```

   Build, test it (watch `Line Status` change as the robot follows, searches, and stops), and commit: `Add a Line Status widget to FollowLine`.

3. **Both:** push your branch and open a pull request into `main`.

**Part B: a clean merge that does not build.**

1. **Teammate:** merge the owner's `wait-for-clear` PR on GitHub, and delete the branch.
2. **Both:** look at the teammate's `line-status` PR. GitHub says it has **no conflicts** and can be merged. **Do not merge it.** Predict first: will `main` still build if you do?
3. **Teammate:** on your laptop, bring `main` into your branch, exactly as in Section 11.8: `git checkout line-status`, `git fetch origin`, `git merge origin/main`. Git merges without a single conflict, because the two of you changed different lines. Now build:

   ```
   error: the switch expression does not cover all possible input values
   ```

   pointing at `describeState()`. Git could not see the problem, but Java could: the owner's new state reached a switch expression that was written before the state existed. This is the same kind of **semantic conflict** as Chapter 20's double-bound button, and this time the compiler caught it, because the state is an enum and the switch is an expression with no `default`.

4. **Both:** decide what the status should say while waiting. Add the missing case (for example, `case WAITING_FOR_CLEAR -> "Something in the way, waiting";`), build, test, commit (`Describe WAITING_FOR_CLEAR in Line Status`), and push.
5. **Owner:** review the PR. Check that every state in the enum appears in every switch. Approve, merge, and delete the branch. **Both:** `git checkout main`, `git pull`, build, and run.

**Part C: swap.** Repeat Parts A and B in the other partner's repository, with roles reversed.

Afterward, each of you writes two sentences in `reflections.md`. First: if the teammate had merged the PR on GitHub without building locally, what would have happened to `main`, and who would have found out, and when? Second: Chapter 22 sets up a robot (GitHub Actions) that builds every pull request automatically. How would it have changed this lab?

### Explore

- Open WPILib's **Command Compositions** page (link below) and find the section on selecting compositions. It describes `select`, `either`, and one more decorator that this chapter did not use, the opposite of `onlyIf`. Which one is it, and when would the Explorer use it?
- Open `ConditionalCommand` in VS Code (hold Ctrl and click `either`, then click through to the class it creates). Find where it asks the condition, and where it decides which subsystems it requires. Write two sentences in `reflections.md` connecting what you find to the bullets in Section 21.7.
- Read the **Finite-state machine** article's turnstile example (link below). Draw the turnstile's state diagram in `reflections.md` in the same style as Section 21.5, then write it as a Java enum with a `next(boolean coin, boolean push)` method using a switch expression.
- Find a top FRC team's robot code on GitHub (The Blue Alliance lists many teams' repositories), and search it for `enum`. Find one enum that names the states of a mechanism or of the whole robot. Copy its constants into `reflections.md`, and guess, from the names alone, what each state does.

---

> **Additional Resources**
>
> * **Enum Types (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/javaOO/enum.html](https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html) Java's official lesson on enums, including enums with fields, constructors, and methods
> * **Switch Expressions (Java 17 language guide)**: [docs.oracle.com/en/java/javase/17/language/switch-expressions.html](https://docs.oracle.com/en/java/javase/17/language/switch-expressions.html) arrow cases, `yield`, and why a switch expression on an enum must cover every constant
> * **Command Compositions**: [docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html) WPILib's guide to sequences and parallel groups, plus the selecting compositions (`either`, `select`) used for branches
> * **Finite-state machine (Wikipedia)**: [en.wikipedia.org/wiki/Finite-state_machine](https://en.wikipedia.org/wiki/Finite-state_machine) states, transitions, and state diagrams, with the classic turnstile example
> * **Following the Line: Proportional Control with Both Sensors**: [introtoroboticspbl.readthedocs.io/en/latest/course/line_following/proportional_control_with_two_sensors.html](https://introtoroboticspbl.readthedocs.io/en/latest/course/line_following/proportional_control_with_two_sensors.html) the XRP introductory course's lesson on steering with the difference between the two reflectance sensors

---

*Next up, Chapter 22: Unit Testing Robot Code. You will write tests that drive `FollowLine` through every arrow of its state diagram, and run the obstacle course, all without a robot, and set up GitHub to build and test every pull request automatically.*
