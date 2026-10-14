# Chapter 22: Unit Testing Robot Code

In Chapter 21 the Explorer learned to follow a line. `FollowLine` is a state machine inside a command: it follows the tape, searches when it loses it, and knows the difference between a sharp corner and the end of the line. It runs on the left bumper in teleop and as leg 3 of the obstacle course. And at the very end of the chapter, in the pair lab, Git merged two branches without a single conflict and the build broke anyway. The compiler caught it that time. The chapter ended with a question: what if something checked every change for you, automatically, before it ever reached `main`?

This chapter answers that question in two steps. First, you will write **tests**: small pieces of code whose only job is to run your robot code with known inputs and check the answers. By the end, the Explorer has two dozen of them. They walk `FollowLine` through every arrow of its state diagram, check the drivetrain's math and its sign conventions, drive the commands on the simulated robot from Chapter 17, and run the **whole obstacle course** in autonomous, all without a robot, in a few seconds, every time you build. Second, you will hand those tests to **GitHub Actions**, a computer at GitHub that builds your code and runs every test on every push and every pull request, and puts a green check or a red X next to the change.

On the Java side, you will learn how a testing framework called **JUnit** reads your code: test classes, the `@Test` annotation, and **assertions**, the one-line checks that make a test pass or fail. Then you will learn the most useful idea in the whole chapter, one that changes how you write ordinary robot code too: **testable code**. Code that takes everything it needs as parameters, and hands back an answer without touching anything else, is code you can check with a single line. You will refactor `FollowLine`'s brain into exactly that shape.

This chapter is mostly about code. You will need your XRP only once, near the start, to check that a refactor did not change how the robot drives. Everything else runs on your laptop, and then on GitHub's.

---

## 22.1 The Bug That Comes Back

Here is a story that happens on every team, every season.

On Saturday, you and a teammate spend two hours tuning the line follower. You lower `SIDE_ERROR` so the robot catches sharp corners, and you test it on the practice course twenty times. It works. You commit.

On Tuesday, someone else on the team is cleaning up `FollowLine`. They notice that `getSteeringError()` subtracts left minus right, decide it "looks backwards," and flip it to right minus left. It still compiles. They do not have the tape set up at home, so they do not run it. They push.

On Thursday, at the first practice match of the regional, the Explorer drives up to the line, steers **away** from it, and searches in circles. Nobody knows what changed. Three people are sure their code is fine. The fix takes ninety seconds once someone finds it, and finding it takes the rest of the afternoon.

What went wrong is not that someone made a mistake. People always make mistakes. What went wrong is that **nothing checked**. The only test the line follower had was a person, with tape, on a floor, remembering to try it.

### Testing by hand is real, and slow

You have been testing by hand since Chapter 2, and it has served you well. Build, deploy, drive, watch, decide. Chapter 21's Section 21.9 was a long, careful hand test: nine numbered checks, a sharp corner, a sheet of white paper. That kind of testing is never going away, because some things can only be checked on a real floor.

But count what a hand test costs:

- **Time.** Charge the batteries, lay the tape, switch on the XRP, run the course, put it back, run it again. Thirty seconds per run at best, and most bugs need more than one run.
- **Memory.** You have to remember to test, and remember **what** to test. Did you check the right-hand search after you changed the left one? Did you check what happens when the follower starts off the line?
- **Coverage.** One run takes one path. The follower's diagram has more than a dozen arrows. Some, like "give up after 120 degrees," take effort to trigger on purpose.
- **Repeatability.** The floor, the light, and the batteries change. If a run goes wrong once in ten, was it the code or the room?

And here is the expensive part: every time anyone changes anything, all of it has to be done **again**, because a change in one place can break something somewhere else. A bug that was fixed, and then quietly comes back after a later change, has a name: a **regression**. You met regressions in Chapter 10, where `git bisect` hunted one down. This chapter is about stopping them from getting in at all.

### A test is code that checks code

A **test** is a small method that runs a piece of your robot code with inputs you choose, and checks that the answer is the one you expect. If the answer is right, the test **passes**. If it is wrong, the test **fails**, and tells you what it expected and what it got.

Here is the whole idea in a few lines, written for the Tuesday bug. Do not type it yet; Section 22.5 builds the real version:

```java
@Test
void lostLineOnTheLeftSearchesLeft() {
    State next = FollowLine.decideNextState(State.FOLLOWING, LINE_LOST, LINE_WAS_LEFT, NOT_SEARCHING);
    assertEquals(State.SEARCHING_LEFT, next);
}
```

Read it aloud: "If the robot is following, and the line disappears, and it was last seen on the left, the next state should be searching left." That is one arrow from the Chapter 21 diagram, written as code that checks itself. It runs in a millionth of a second. It needs no robot, no tape, and no batteries. And because it is code, it runs **every time**, for everyone, forever, without anyone remembering to.

> **Tests are the pre-match inspection, automated**
>
> Before every match, a good drive team runs a checklist: battery voltage, bumpers, radio light, the arm moving to its home position. Nobody thinks the robot is broken; the checklist exists because checking takes one minute and a dead robot on the field costs the whole match. Tests are the same habit for code. You write each check once, and then the computer runs the whole list every time the code changes, faster than you could read it.

A **unit test** tests one small piece (one "unit") of your code by itself: one method, or one class. That is where this chapter starts, and it is where most of your tests will live. By Section 22.8 you will also have bigger tests that check many pieces working together.

---

## 22.2 Your First Test

Start with the smallest test that could possibly work, so the only new thing is the testing itself.

`FollowLine.State` has a method, `isDone()`, that says which states are finished ones (Section 21.6). `END_OF_LINE` and `GAVE_UP` are done. The other three are not. That is a fact you can check without a robot, and nothing about it has to change for the check to work. Perfect for a first test.

### Where tests live

Your robot code lives in `src/main/java`. Tests live in a second folder next to it, `src/test/java`, with **the same package folders inside**:

```
XRPExplorer/
  src/
    main/
      java/
        frc/robot/
          Robot.java
          RobotContainer.java
          commands/
            FollowLine.java
    test/
      java/
        frc/robot/
          commands/
            FollowLineTest.java      <- the test for FollowLine, in the same package
```

The test for `FollowLine` is named `FollowLineTest`, and it goes in `frc/robot/commands` under `test`, exactly mirroring where `FollowLine` lives under `main`. That mirroring is not just tidy. A Java package is a **name**, not a folder: `FollowLineTest` says `package frc.robot.commands;`, so it is in the very same package as `FollowLine`, even though the two files sit in different folders. Section 22.4 shows why that matters.

The two folders are also kept apart for a reason. Gradle compiles `src/test` only for testing. Nothing in it is ever part of the robot program, so a test can do things that robot code never should (like pretend to be the hardware), and the robot never carries the extra weight.

### JUnit is already in your project

Java's most common testing framework is **JUnit**. A **framework** is a library that runs **your** code, instead of the other way around: you write test methods, and JUnit finds them, runs them, and reports the results. (WPILib's command scheduler is a framework too: you write commands, and it calls `initialize()` and `execute()`.)

You do not need to install anything. Open `build.gradle` at the top of your project and look near the bottom of the `dependencies` block. The WPILib XRP template put these lines there when you created the project in Chapter 2:

```
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.1'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

test {
    useJUnitPlatform()
    systemProperty 'junit.jupiter.extensions.autodetection.enabled', 'true'
}
```

`testImplementation` means "this library is only for the tests." `junit-jupiter` is JUnit 5 (Jupiter is the name of its newest part). The `test` block tells Gradle to run tests with JUnit. If those lines are missing (some older projects lost them), copy them in exactly as shown. Do not change anything else in `build.gradle`.

### Writing it

In VS Code's file explorer, right-click the `src` folder and choose **New Folder...**. Type `test/java/frc/robot/commands` and press Enter. VS Code creates all four folders at once. Then right-click the new `commands` folder, choose **New File...**, and name it `FollowLineTest.java`. Type this:

```java
package frc.robot.commands;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import frc.robot.commands.FollowLine.State;
import org.junit.jupiter.api.Test;

/** Tests for FollowLine's state machine. */
class FollowLineTest {

    @Test
    void onlyTheEndingStatesAreDone() {
        assertTrue(State.END_OF_LINE.isDone());
        assertTrue(State.GAVE_UP.isDone());
        assertFalse(State.FOLLOWING.isDone());
        assertFalse(State.SEARCHING_LEFT.isDone());
        assertFalse(State.SEARCHING_RIGHT.isDone());
    }
}
```

Walk through it:

- **`package frc.robot.commands;`** puts the test in the same package as `FollowLine`.
- **`import static ...assertTrue;`** brings in two of JUnit's checking methods, so you can call them by their short names. You met static imports in Chapter 16 (`Meters`, `Volts`).
- **`import frc.robot.commands.FollowLine.State;`** imports the nested enum, so the test can say `State.GAVE_UP` instead of `FollowLine.State.GAVE_UP`. Nested types can be imported, just like the `Constants` groups in Chapter 20.
- **`class FollowLineTest`** has no `public`. JUnit can run classes and methods that are package-private, and WPILib's own examples write tests this way, so the book does too.
- **`@Test`** marks `onlyTheEndingStatesAreDone()` as a test. Every method with `@Test` is one test.
- **`assertTrue(...)`** checks that something is `true`, and **`assertFalse(...)`** that it is `false`. If any of the five checks is wrong, the test fails right there.

Read it aloud: "End of line is done. Gave up is done. Following is not done, and neither search is done." That sentence **is** the fact you wanted to check.

### Running it

Open the Command Palette (**Ctrl+Shift+P**) and run **WPILib: Test Robot Code**. Gradle compiles your robot code, compiles your tests, and runs them. The first time takes a little longer. Watch the terminal. When the tests pass, you will see something like:

```
> Task :test

BUILD SUCCESSFUL in 9s
```

That is all. **When tests pass, Gradle says nothing about them.** Silence is success. To see what actually ran, open the report Gradle writes every time: in the file explorer, open `build/reports/tests/test/index.html`, then right-click it and choose **Reveal in File Explorer** (or **Open with Live Server**, if you have that extension), and open it in your browser. It shows one test, in one class, with a green "100% successful." Click through to see the test's name and how long it took (a few milliseconds).

> **Building runs the tests too**
>
> From now on, **WPILib: Build Robot Code** runs every test as part of the build, because Gradle's `build` includes a step called `test`. If a test fails, the build fails, exactly as if the code did not compile. That is on purpose: a failing test is a broken robot that has not been noticed yet. **WPILib: Simulate Robot Code** is how you run the Explorer, as always. If you ever need to build without the tests (to try something quickly while a test is failing), you can run `.\gradlew build -x test` in the terminal (`./gradlew` on macOS and Linux). Do not make a habit of it.

### Making it fail on purpose

A test you have never seen fail is a test you cannot fully trust. Maybe it is not running at all. Maybe it checks the wrong thing. So the first thing to do with any new test is to **break the code it tests**, and watch it catch the break.

Open `FollowLine.java` and change one word in the enum:

```java
END_OF_LINE(false),       // BUG on purpose: should be true
```

Run **WPILib: Test Robot Code** again. This time:

```
> Task :test FAILED

FollowLineTest > onlyTheEndingStatesAreDone() FAILED
    org.opentest4j.AssertionFailedError at FollowLineTest.java:14

1 test completed, 1 failed

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':test'.
> There were failing tests. See the report at: file:///C:/.../build/reports/tests/test/index.html
```

Read it the way Chapter 10 taught you to read a stack trace, from the most useful line:

- **`FollowLineTest > onlyTheEndingStatesAreDone() FAILED`**: which test failed. A good test name already tells you what is broken.
- **`AssertionFailedError at FollowLineTest.java:14`**: which check failed. Line 14 (yours may differ by a line or two) is the first `assertTrue`, about `END_OF_LINE`.
- **`There were failing tests. See the report at:`** a link to the same HTML report. Open it, click the failed test, and you will see the full message: `expected: <true> but was: <false>`.

Now change `false` back to `true`, and run the tests again. `BUILD SUCCESSFUL`. You have now seen the test pass, fail for the right reason, and pass again. That is the whole life of a test.

> **Red, then green**
>
> Programmers call a failing test **red** and a passing one **green**, after the colors most tools show. "Make it red, then make it green" is a habit worth keeping for every test you write: break the code (or write the test before the code exists), see red, then fix it and see green. A test that has only ever been green might be checking nothing at all.

---

## 22.3 New Java: Annotations a Tool Reads, and Assertions

Your first test used three new pieces of Java: an annotation that JUnit looks for, assertions that check answers, and a shape that every good test follows. This section looks at each.

### Annotations, again

You met **annotations** in Chapter 5: `@Override` is a note to the **compiler** that says "this method replaces one from the parent class, so check that it really does." In Chapter 17, `@AutoLog` was a note to AdvantageKit's **annotation processor**, which read it while compiling and wrote a whole class for you.

`@Test` is a note to a third kind of reader: JUnit, while your tests **run**. JUnit loads each class in `src/test/java`, looks through its methods for the ones marked `@Test`, and calls each one. The method itself is ordinary Java. It just has a sign on it that a tool knows to look for. (The way a running program looks at its own classes and methods, and finds the ones with a certain annotation, is called **reflection**. You will not need to write it, but now you know how JUnit finds your tests without your ever calling them.)

JUnit has a few more annotations you will use in this chapter:

| Annotation | On a method that... | JUnit runs it... |
|---|---|---|
| `@Test` | checks one thing | once, as one test |
| `@BeforeEach` | sets up what every test in the class needs | before **each** `@Test` method, every time |
| `@AfterEach` | cleans up after a test | after **each** `@Test` method, even if the test failed |

A test method has no parameters and returns `void`. Each test runs on a **fresh object** of the test class: JUnit creates a new `FollowLineTest` for every `@Test` method, so one test can never leave a field changed for the next one. That is the same "every run starts fresh" rule as a command's `initialize()` (Section 19.6), built into the framework.

### Assertions

An **assertion** is a check that a test makes. If the check is true, nothing happens and the test carries on. If it is false, the assertion throws an exception (Chapter 10), the test stops right there, and JUnit marks it failed. JUnit's assertions are `static` methods of a class called `Assertions`. These are the ones you will use:

| Assertion | Passes when... |
|---|---|
| `assertTrue(condition)` | `condition` is `true` |
| `assertFalse(condition)` | `condition` is `false` |
| `assertEquals(expected, actual)` | the two are equal (for enums, `String`s, `int`s, `boolean`s) |
| `assertEquals(expected, actual, delta)` | two `double`s are within `delta` of each other |

Every assertion can also take a message as its **last** argument, which JUnit prints when the check fails: `assertTrue(seconds < 5.0, "DriveDistance never finished")`. Use one whenever the failure would otherwise be a bare `expected: <true> but was: <false>`, which tells you nothing about **what** was not true.

Import each one you use with its own static import line, as your first test did. JUnit's own examples often write `import static org.junit.jupiter.api.Assertions.*;`, which imports all of them at once. The book does not use wildcard static imports (Chapter 20): one line per assertion shows exactly where each name came from.

> **Expected first, actual second**
>
> `assertEquals(State.SEARCHING_LEFT, next)` puts the answer you **expect** first, and the answer the code **actually** gave second. Java cannot tell if you swap them, because both are just values, and the test still passes or fails the same way. But the failure message would lie: `expected: <SEARCHING_RIGHT> but was: <SEARCHING_LEFT>` would point you at the wrong state. Read every `assertEquals` aloud as "I expect *this*; did I get it?"

### Doubles get a delta

Chapter 12 warned you never to compare measured `double`s with `==`. `0.1 + 0.2` is not exactly `0.3` in a computer, and a robot that drove 0.3 m almost never drove exactly 0.3 m. Assertions have the same problem, and the same answer: the three-argument `assertEquals(expected, actual, delta)` passes when the two numbers are within `delta` of each other. It is `Math.abs(expected - actual) <= delta`, the "close enough" check from Chapter 12, with a failure message built in.

How big should `delta` be? It depends on what you are checking:

- When the code does **exact arithmetic** (adding two numbers, multiplying by a gain), anything that is not tiny is a bug. Use a very small delta, like `1e-6` (one millionth). That is scientific notation: `1e-6` means 1 times 10 to the -6, or `0.000001`.
- When the code drives a **simulated robot** to a target, use the same tolerance the code itself uses to decide it has arrived: `Drivetrain.DISTANCE_TOLERANCE_METERS`, `Drivetrain.HEADING_TOLERANCE_DEGREES`. If the command says "within 1 cm counts as there," the test should agree.

### Arrange, Act, Assert

Almost every good test has the same three parts, in the same order:

1. **Arrange:** set up the situation. Create the objects, set the pretend readings.
2. **Act:** do the one thing you are testing. Usually a single method call.
3. **Assert:** check the result.

Here is the shape, written out with comments, as you will see it in Section 22.5:

```java
@Test
void lostLineOnTheLeftSearchesLeft() {
    // Arrange: following, and the line was last seen under the left sensor.
    State state = State.FOLLOWING;
    double lastError = LINE_WAS_LEFT;

    // Act: the line disappears.
    State next = FollowLine.decideNextState(state, LINE_LOST, lastError, NOT_SEARCHING);

    // Assert: search to the left.
    assertEquals(State.SEARCHING_LEFT, next);
}
```

Small tests often squeeze the three parts into one or two lines, and that is fine. But when a test grows confusing, splitting it back into Arrange, Act, Assert almost always shows you what is wrong with it. And if a test has two **Act** steps, it is usually two tests.

### Test names are sentences

A test's name is the first thing you read when it fails, often months later, often in a hurry. So name each test after the **behavior** it checks, as a sentence: `lostLineOnTheLeftSearchesLeft`, `voltsAreLimitedToTheBattery`, `courseEndsAtTheEndOfTheLine`. Not `test1`, not `testDecide`. When `searchingRightGivesUpPastTheLimit() FAILED` appears in the terminal, you know what broke before you open a single file.

> **JUnit, in one sentence**
>
> A **test class** in `src/test/java` holds **test methods** marked `@Test`; JUnit finds and runs each one on a fresh object, after any `@BeforeEach` method and before any `@AfterEach` method, and a test **fails** the moment one of its **assertions** (`assertEquals`, `assertTrue`, ...) finds an answer that is not the one expected.

---

## 22.4 New Java: Testable Code

Your first test was easy because `isDone()` is easy: it needs nothing but the enum. Now try the test you actually want, the one from Section 22.1. "When the robot is following and the line disappears, and it was last seen on the left, the next state is searching left."

Look at `decideNextState()` as Chapter 21 left it:

```java
/** The transitions: given the state we are in and what the sensors say, where next? */
private State decideNextState() {
    return switch (state) {
        case FOLLOWING -> isLineSeen() ? State.FOLLOWING : stateForLostLine();
        case SEARCHING_LEFT, SEARCHING_RIGHT -> isLineSeen() ? State.FOLLOWING : stateForSearch();
        case END_OF_LINE, GAVE_UP -> state;   // finished: stay finished
    };
}
```

To ask it your question, a test would have to:

1. Make a `FollowLine`, which needs a `Drivetrain` and a `Sensors`. `Sensors` creates the real XRP reflectance sensors.
2. Get the follower into `FOLLOWING`, which only happens inside `initialize()`, which reads the sensors.
3. Make `lastSteeringError` positive, which only happens in `followSpeeds()`, which also drives the motors.
4. Make the sensors read white, which means changing what the hardware reports.
5. Then call `decideNextState()`, which is `private`, so the test cannot call it at all.

Every one of those steps is a wall between the test and a question that is, underneath, very simple. The state machine's **rule** only needs four facts: the current state, whether the line is seen, the last steering error, and how far a search has turned. But the method goes and **fetches** those facts itself, from fields, from sensors, and from the drivetrain. Code that fetches its own inputs from the world can only be tested by setting up the world.

Chapter 21 hinted at the way out, in Section 21.6: "Notice what `decideNextState()` does **not** do: it does not drive, log, or change any field. It only answers a question." It is already almost a pure question. It just needs its facts handed to it.

### Pure functions

A **pure function** is a method that:

1. gets everything it needs **through its parameters**, and reads nothing else (no fields, no sensors, no time), and
2. **only returns an answer**: it changes nothing, prints nothing, and moves nothing.

`Math.abs(-3)` is a pure function. So is `MathUtil.clamp`, and `Rotation2d.fromDegrees`. Ask a pure function the same question twice, and it gives the same answer twice, every time, on any computer. That makes it the easiest kind of code there is to test: call it with the inputs you choose, and check what comes back. No setup, no cleanup, no robot.

Most robot code cannot be pure, because a robot's whole job is to read sensors and move motors. But a surprising amount of a robot's **thinking** can be. The trick is to split each job in two, the same way Chapter 21 split `execute()` into "decide" and "act":

- a **pure part** that does the thinking, and takes its facts as parameters, and
- a **thin part** around it that gathers the facts from the robot, calls the pure part, and acts on the answer.

Test the pure part thoroughly. Keep the thin part so simple that there is little to get wrong.

### The refactor

Open `FollowLine.java`. You are going to change how `decideNextState()` gets its facts, without changing a single rule. Work through it in order, building at the end.

**Step 1: Two constants become visible to the tests.** Find these two lines, and delete the word `private` from each (and update the comment above them):

```java
// Losing the line, and finding it again. SIDE_ERROR and SEARCH_MAX_DEGREES are
// package-private (no access word) so the tests can use them (Chapter 22).
static final double SIDE_ERROR = 0.2;   // an error bigger than this: the line was off to one side
private static final double SEARCH_RADIANS_PER_SECOND = 1.5;
static final double SEARCH_MAX_DEGREES = 120.0;
```

Keep your own tuned values. The tests will use these constants **by name**, so when you tune them again (Chapter 23 makes that easy), the tests follow along.

**Step 2: Replace `decideNextState()`, `stateForLostLine()`, and `stateForSearch()`** with these four methods. They go in the same place, after `getState()`:

```java
/**
 * The start state: follow the line if it is there, and give up at once if it is not.
 *
 * @param lineSeen true if either reflectance sensor sees the line
 * @return the state to start in
 */
static State chooseStartState(boolean lineSeen) {
    return lineSeen ? State.FOLLOWING : State.GAVE_UP;
}

/**
 * The transitions (Section 21.5): given the state we are in and what the robot
 * knows, where next? Everything it needs comes in through its parameters, and it
 * changes nothing, so a test can ask it any question it likes.
 *
 * @param state the state the follower is in now
 * @param lineSeen true if either reflectance sensor sees the line
 * @param lastSteeringError the steering error the last time the line was seen
 * @param searchedDegrees how far the robot has turned since its search began
 * @return the state to be in next
 */
static State decideNextState(
        State state, boolean lineSeen, double lastSteeringError, double searchedDegrees) {
    return switch (state) {
        case FOLLOWING -> lineSeen ? State.FOLLOWING : stateForLostLine(lastSteeringError);
        case SEARCHING_LEFT, SEARCHING_RIGHT ->
            lineSeen ? State.FOLLOWING : stateForSearch(state, searchedDegrees);
        case END_OF_LINE, GAVE_UP -> state;   // finished: stay finished
    };
}

/** The line just disappeared. Where was it, the last time we saw it? */
private static State stateForLostLine(double lastSteeringError) {
    if (lastSteeringError > SIDE_ERROR) {
        return State.SEARCHING_LEFT;
    }
    if (lastSteeringError < -SIDE_ERROR) {
        return State.SEARCHING_RIGHT;
    }
    return State.END_OF_LINE;   // it was right under us, and then it was gone
}

/** Still searching. Keep going, or give up? */
private static State stateForSearch(State state, double searchedDegrees) {
    return searchedDegrees > SEARCH_MAX_DEGREES ? State.GAVE_UP : state;
}
```

**Step 3: Add one small getter** at the bottom of the class, just above `getTraveledMeters()`. It holds the one line that used to be inside `stateForSearch()`, the line that read the drivetrain:

```java
/** How far the robot has turned since its search began, either way, in degrees. */
private double getSearchedDegrees() {
    return Math.abs(drivetrain.getHeadingDegrees() - searchStartHeadingDegrees);
}
```

**Step 4: The thin part gathers the facts.** In `execute()`, the decide step now hands every fact to `decideNextState()`:

```java
// 1. Decide: does this loop's reading move us to a new state?
State next = decideNextState(state, isLineSeen(), lastSteeringError, getSearchedDegrees());
```

And in `initialize()`, the start state comes from the new method:

```java
state = chooseStartState(isLineSeen());   // the start state
```

Build. It should succeed, and the one test you wrote should still pass.

Now look at what changed, and what did not.

- **The rules did not change at all.** Every `case` line, every comparison, every return value is the one from Chapter 21. Only where the facts come from moved.
- **`decideNextState()` is now `static`.** It does not use any field of any `FollowLine` object, because every fact arrives as a parameter. The compiler enforces it: a `static` method cannot read `state` or `drivetrain` even by accident. (Chapter 7: `static` means "belongs to the class, not to an object.") So `static` here is more than a detail. It is a promise, checked by Java, that the method is pure.
- **The two helpers took their facts as parameters too,** and became `private static` for the same reason. They stay `private`: they are pieces of the rule, and the tests check them through `decideNextState()`.
- **`chooseStartState()` is new.** The start arrow ("on the line, follow; off the line, give up") was a ternary hiding inside `initialize()`. Now it is a pure function with a name, and it can be tested like every other arrow.
- **`execute()` and `initialize()` got simpler to read.** "Decide the next state from the state, whether the line is seen, the last error, and how far we have searched." Every fact the decision depends on is listed, in one line, where anyone can see it. Before, you had to read three methods to find out.

> **Testing changed the design, for the better**
>
> You refactored `FollowLine` so it could be tested, and the code got **clearer** along the way: the decision's inputs are now visible in one line instead of scattered across helpers. That is not a coincidence. Code that is hard to test is usually hard to test because it does too many things at once, or hides what it depends on, and those are exactly the things that make code hard to read and hard to change. When a test is painful to write, listen to the pain: it is often the code, not the test, that needs to change.

### Package-private: visible to the tests, and no further

`decideNextState()` and `chooseStartState()` have no access word at all. Chapter 19 named that access level **package-private**: visible to every class in the same package, and to nothing outside it.

That is exactly the right size of door. `FollowLineTest` is in `frc.robot.commands` (Section 22.2), so it can call them. `RobotContainer`, in `frc.robot`, cannot, and has no reason to. Compare the other choices:

| If the method were... | The test could call it? | Who else could? |
|---|---|---|
| `private` | No | Only `FollowLine` |
| package-private (no word) | **Yes** | Only classes in `frc.robot.commands` |
| `public` | Yes | Everyone, everywhere |

Package-private for testing is a common, deliberate choice, and it is why the test folders mirror the package folders. The same goes for `SIDE_ERROR` and `SEARCH_MAX_DEGREES`: the tests can read them, and they are still `final`, so nobody can change them.

### Check: the robot drives exactly as before

You changed working code, so prove you did not break it on the floor, once. Build, switch on the XRP, run with `USE_SIMULATED_ROBOT = false`, and repeat checks 2 and 6 from Section 21.9: follow a straight strip to its end with the left bumper (`FOLLOWING -> END_OF_LINE`), then a right-angle corner (`FOLLOWING -> SEARCHING_LEFT -> FOLLOWING`). If both behave as they did in Chapter 21, commit (see the Git exercise). From here on, the tests will do most of the checking for you.

> **If your `FollowLine` has `WAITING_FOR_CLEAR`**
>
> If your pair merged Chapter 21's Collab lab into `main`, your `FollowLine` has a sixth state and a `stateWhileFollowing()` helper that reads the rangefinder. That reading is one more fact, so it becomes one more parameter. Give `decideNextState()` a `boolean obstacleAhead` parameter right after `lineSeen`, pass `isObstacleAhead()` for it in `execute()`, and make `stateWhileFollowing(lineSeen, obstacleAhead, lastSteeringError)` a `private static` helper the same way. Its `WAITING_FOR_CLEAR` case becomes `obstacleAhead ? state : State.FOLLOWING`. In the tests in the next section, add a constant `private static final boolean NO_OBSTACLE = false;` and pass it as the third argument of every `decideNextState(...)` call. Practice 3 adds the tests for the new arrows.


---

## 22.5 Every Arrow in the Diagram

Now the test Chapter 21 promised. Put the state diagram from Section 21.5 next to you, and you will write **one test for every arrow**, plus a few for the edges where bugs like to hide.

Replace your whole `FollowLineTest.java` with this. Your first test is still in it, at the top. Type it, do not paste:

```java
package frc.robot.commands;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import frc.robot.commands.FollowLine.State;
import org.junit.jupiter.api.Test;

/**
 * Tests for FollowLine's state machine: one test for every arrow in the diagram in
 * Section 21.5, plus the edges where bugs like to hide. No robot, and no HAL: each
 * test asks the transition table one question and checks the answer.
 */
class FollowLineTest {

    // Pretend readings, named so that every test reads like the diagram.
    private static final boolean LINE_SEEN = true;
    private static final boolean LINE_LOST = false;
    private static final double LINE_WAS_CENTERED = 0.0;
    private static final double LINE_WAS_LEFT = FollowLine.SIDE_ERROR + 0.1;
    private static final double LINE_WAS_RIGHT = -(FollowLine.SIDE_ERROR + 0.1);
    private static final double NOT_SEARCHING = 0.0;     // degrees turned while searching
    private static final double SEARCHED_A_LITTLE = 30.0;
    private static final double SEARCHED_TOO_FAR = FollowLine.SEARCH_MAX_DEGREES + 1.0;

    // The finished states know they are finished.

    @Test
    void onlyTheEndingStatesAreDone() {
        assertTrue(State.END_OF_LINE.isDone());
        assertTrue(State.GAVE_UP.isDone());
        assertFalse(State.FOLLOWING.isDone());
        assertFalse(State.SEARCHING_LEFT.isDone());
        assertFalse(State.SEARCHING_RIGHT.isDone());
    }

    // The start

    @Test
    void startsFollowingWhenOnTheLine() {
        assertEquals(State.FOLLOWING, FollowLine.chooseStartState(LINE_SEEN));
    }

    @Test
    void givesUpAtOnceWhenStartedOffTheLine() {
        assertEquals(State.GAVE_UP, FollowLine.chooseStartState(LINE_LOST));
    }

    // From FOLLOWING

    @Test
    void keepsFollowingWhileTheLineIsSeen() {
        assertEquals(State.FOLLOWING, FollowLine.decideNextState(
            State.FOLLOWING, LINE_SEEN, LINE_WAS_LEFT, NOT_SEARCHING));
    }

    @Test
    void lostLineOnTheLeftSearchesLeft() {
        // Arrange: following, and the line was last seen under the left sensor.
        State state = State.FOLLOWING;
        double lastError = LINE_WAS_LEFT;

        // Act: the line disappears.
        State next = FollowLine.decideNextState(state, LINE_LOST, lastError, NOT_SEARCHING);

        // Assert: search to the left.
        assertEquals(State.SEARCHING_LEFT, next);
    }

    @Test
    void lostLineOnTheRightSearchesRight() {
        assertEquals(State.SEARCHING_RIGHT, FollowLine.decideNextState(
            State.FOLLOWING, LINE_LOST, LINE_WAS_RIGHT, NOT_SEARCHING));
    }

    @Test
    void lostLineWhileCenteredIsTheEnd() {
        assertEquals(State.END_OF_LINE, FollowLine.decideNextState(
            State.FOLLOWING, LINE_LOST, LINE_WAS_CENTERED, NOT_SEARCHING));
    }

    @Test
    void anErrorOfExactlySideErrorStillCountsAsCentered() {
        assertEquals(State.END_OF_LINE, FollowLine.decideNextState(
            State.FOLLOWING, LINE_LOST, FollowLine.SIDE_ERROR, NOT_SEARCHING));
        assertEquals(State.END_OF_LINE, FollowLine.decideNextState(
            State.FOLLOWING, LINE_LOST, -FollowLine.SIDE_ERROR, NOT_SEARCHING));
    }

    // From the two searches

    @Test
    void searchingLeftFindsTheLine() {
        assertEquals(State.FOLLOWING, FollowLine.decideNextState(
            State.SEARCHING_LEFT, LINE_SEEN, LINE_WAS_LEFT, SEARCHED_A_LITTLE));
    }

    @Test
    void searchingRightFindsTheLine() {
        assertEquals(State.FOLLOWING, FollowLine.decideNextState(
            State.SEARCHING_RIGHT, LINE_SEEN, LINE_WAS_RIGHT, SEARCHED_A_LITTLE));
    }

    @Test
    void keepsSearchingUpToTheLimit() {
        assertEquals(State.SEARCHING_LEFT, FollowLine.decideNextState(
            State.SEARCHING_LEFT, LINE_LOST, LINE_WAS_LEFT, SEARCHED_A_LITTLE));
        assertEquals(State.SEARCHING_LEFT, FollowLine.decideNextState(
            State.SEARCHING_LEFT, LINE_LOST, LINE_WAS_LEFT, FollowLine.SEARCH_MAX_DEGREES));
    }

    @Test
    void searchingLeftGivesUpPastTheLimit() {
        assertEquals(State.GAVE_UP, FollowLine.decideNextState(
            State.SEARCHING_LEFT, LINE_LOST, LINE_WAS_LEFT, SEARCHED_TOO_FAR));
    }

    @Test
    void searchingRightGivesUpPastTheLimit() {
        assertEquals(State.GAVE_UP, FollowLine.decideNextState(
            State.SEARCHING_RIGHT, LINE_LOST, LINE_WAS_RIGHT, SEARCHED_TOO_FAR));
    }

    // The finished states

    @Test
    void finishedStatesStayFinishedEvenIfTheLineComesBack() {
        assertEquals(State.END_OF_LINE, FollowLine.decideNextState(
            State.END_OF_LINE, LINE_SEEN, LINE_WAS_CENTERED, NOT_SEARCHING));
        assertEquals(State.GAVE_UP, FollowLine.decideNextState(
            State.GAVE_UP, LINE_SEEN, LINE_WAS_CENTERED, NOT_SEARCHING));
    }
}
```

That is fourteen tests. Walk through how it is built:

- **The constants at the top are pretend readings with names.** `LINE_LOST` is just `false`, and `NOT_SEARCHING` is just `0.0`, but `decideNextState(State.FOLLOWING, LINE_LOST, LINE_WAS_LEFT, NOT_SEARCHING)` reads like the arrow it tests, and `decideNextState(State.FOLLOWING, false, 0.3, 0.0)` reads like nothing. Named inputs are the test-code version of Chapter 8's "no magic numbers."
- **The pretend errors are built from `FollowLine.SIDE_ERROR`,** not typed as numbers. `LINE_WAS_LEFT` is "a little more than `SIDE_ERROR`," whatever you tuned it to. If you change `SIDE_ERROR` to `0.15` tomorrow, every test still asks the right question. A test that copies a tuned number breaks every time you tune, and soon nobody trusts it.
- **One test, one arrow.** Each test's name is the arrow's label from the diagram, as a sentence. Here is the diagram's list of arrows, and the test that checks each:

| Arrow in Section 21.5's diagram | Test |
|---|---|
| start, on the line: `FOLLOWING` | `startsFollowingWhenOnTheLine` |
| start, no line: `GAVE_UP` | `givesUpAtOnceWhenStartedOffTheLine` |
| `FOLLOWING`, line seen: stay | `keepsFollowingWhileTheLineIsSeen` |
| `FOLLOWING`, lost, last error > +0.2: `SEARCHING_LEFT` | `lostLineOnTheLeftSearchesLeft` |
| `FOLLOWING`, lost, last error < -0.2: `SEARCHING_RIGHT` | `lostLineOnTheRightSearchesRight` |
| `FOLLOWING`, lost, last error near 0: `END_OF_LINE` | `lostLineWhileCenteredIsTheEnd` |
| `SEARCHING_LEFT`, line seen: `FOLLOWING` | `searchingLeftFindsTheLine` |
| `SEARCHING_RIGHT`, line seen: `FOLLOWING` | `searchingRightFindsTheLine` |
| searching, not yet 120 degrees: stay | `keepsSearchingUpToTheLimit` |
| `SEARCHING_LEFT`, turned more than 120 degrees: `GAVE_UP` | `searchingLeftGivesUpPastTheLimit` |
| `SEARCHING_RIGHT`, turned more than 120 degrees: `GAVE_UP` | `searchingRightGivesUpPastTheLimit` |
| `END_OF_LINE` and `GAVE_UP`: no arrows out | `finishedStatesStayFinishedEvenIfTheLineComesBack` |

- **The edges get their own tests.** `anErrorOfExactlySideErrorStillCountsAsCentered` asks what happens when the last error is **exactly** `SIDE_ERROR`. The code says `>`, not `>=`, so exactly 0.2 is "centered," and the follower ends. `keepsSearchingUpToTheLimit` checks a search that has turned **exactly** `SEARCH_MAX_DEGREES`: it keeps going, because the code says "more than." Neither choice is more correct than the other. What matters is that you decided, on purpose, and the test now holds the decision in place.
- **`finishedStatesStayFinishedEvenIfTheLineComesBack`** checks the arrows that are **not** there. A finished state has no arrows out, so even if the line reappears under the sensors, `END_OF_LINE` stays `END_OF_LINE`. Testing that something does **not** happen is just as important as testing that something does.

Run **WPILib: Test Robot Code**. Then open the report: fourteen green tests in `FollowLineTest`, all of them together in well under a second.

> **Boundary values: where bugs live**
>
> If a rule says "more than 0.2," the most dangerous inputs are not 0.1 or 0.5. They are **0.2 itself**, and the numbers just either side of it. That is where `>` and `>=` give different answers, where a sign flip shows, and where an off-by-one hides. Testers call these **boundary values**, and checking them is the single best habit for finding bugs before the robot does. Whenever you write a test for a rule with a number in it, ask: "What happens exactly at the number?"

### Break it three ways

Now prove the tests are worth having. Make each change below on its own, **predict** which tests will fail, run the tests, and then undo the change before the next one.

1. **Swap the searches.** In `stateForLostLine()`, return `SEARCHING_RIGHT` for the positive error and `SEARCHING_LEFT` for the negative one (the Tuesday bug from Section 22.1, in a new form). Two tests fail:

   ```
   FollowLineTest > lostLineOnTheLeftSearchesLeft() FAILED
   FollowLineTest > lostLineOnTheRightSearchesRight() FAILED
   ```

   and the report says `expected: <SEARCHING_LEFT> but was: <SEARCHING_RIGHT>`. The names alone tell you which rule broke.

2. **Move the boundary.** Change `lastSteeringError > SIDE_ERROR` to `>=`. Exactly one test fails: `anErrorOfExactlySideErrorStillCountsAsCentered`, with `expected: <END_OF_LINE> but was: <SEARCHING_LEFT>`. On the floor, you might have needed hundreds of runs to land on exactly 0.2. The test lands on it every time.

3. **Let a finished state come back.** Change the last case of `decideNextState()` to `case END_OF_LINE, GAVE_UP -> lineSeen ? State.FOLLOWING : state;`. One test fails: `finishedStatesStayFinishedEvenIfTheLineComesBack`, with `expected: <END_OF_LINE> but was: <FOLLOWING>`. On the robot, this bug would show up as a follower that finishes, and then, if the tape happens to be under it, finishes **again** later, after the scheduler has already moved on. That one would have been very hard to find by hand.

Undo all three and run the tests once more: green.

> **Test the transitions, tune the actions**
>
> Notice what these tests do **not** check: how hard the robot steers, how fast it drives, whether 1.5 radians per second is a good search speed. Those are **actions** and **gains**, and they depend on your floor, your tape, and your batteries. The right place to judge them is the floor, and Chapter 23 gives you sliders to do it live. The tests check the **logic**: which state follows which, for every input. Logic is exactly what breaks silently when someone "cleans up" the code, and exactly what a computer can check perfectly.

---

## 22.6 Through the Seam: The Drivetrain on a Fake IO

`FollowLine`'s brain needed nothing from WPILib, so its tests needed nothing either. Most of the Explorer is not like that. `Drivetrain` turns chassis speeds into wheel speeds into volts, clamps them to the battery, tracks the pose, and zeroes its sensors in software. All of that is logic worth testing. But all of it sits on top of hardware.

Or does it? Chapter 17 split the drivetrain in two at a **seam**: `Drivetrain` holds the logic, and talks to the hardware only through the `DrivetrainIO` interface. `DrivetrainIOXRP` is the real robot, and `DrivetrainIOSim` is a simulated one. Section 17.5 said one more thing about that seam that is about to pay off: any class that implements `DrivetrainIO` can stand in for the hardware. That includes a class written **just for tests**.

### A fake IO

In `src/test/java/frc/robot`, create a folder `subsystems`, and in it create `FakeDrivetrainIO.java`:

```java
package frc.robot.subsystems;

/**
 * A pretend drivetrain for tests. The test decides what the sensors read, and checks
 * which volts the drivetrain asked for. No motors, no sensors, no physics.
 */
class FakeDrivetrainIO implements DrivetrainIO {

    // What the "sensors" read. A test sets these, then calls drivetrain.periodic().
    double leftDistanceMeters = 0.0;
    double rightDistanceMeters = 0.0;
    double headingDegrees = 0.0;

    // What the drivetrain asked for, most recently. A test checks these.
    double leftVolts = 0.0;
    double rightVolts = 0.0;

    @Override
    public void updateInputs(DrivetrainIOInputs inputs) {
        inputs.leftDistanceMeters = leftDistanceMeters;
        inputs.rightDistanceMeters = rightDistanceMeters;
        inputs.headingDegrees = headingDegrees;
        inputs.leftAppliedVolts = leftVolts;
        inputs.rightAppliedVolts = rightVolts;
    }

    @Override
    public void setVolts(double leftVolts, double rightVolts) {
        this.leftVolts = leftVolts;
        this.rightVolts = rightVolts;
    }
}
```

That is the whole pretend drivetrain. It has no motors, no encoders, and no physics. Its fields are package-private, so a test (in the same package) can reach in and set them directly:

- A test **sets** `leftDistanceMeters`, `rightDistanceMeters`, and `headingDegrees` to whatever it wants the "sensors" to read. `updateInputs` copies them into the inputs, exactly where `DrivetrainIOXRP` copies real encoder readings.
- A test **reads** `leftVolts` and `rightVolts` to see what the drivetrain asked the motors to do. `setVolts` just remembers them.

It lives in `src/test`, so it is never part of the robot program. And it implements the same interface as the real thing, with an `@Override` on each method, so the compiler checks that it really keeps the `DrivetrainIO` promise.

> **Fakes, stubs, mocks, and sims**
>
> A stand-in for a real part, used only for testing, is called a **test double**, after the stunt doubles in films. There are a few kinds. A **fake** is a simple working version, like `FakeDrivetrainIO`: it does something sensible, with no hardware. A **stub** only returns fixed answers. A **mock** is made by a library and checks that certain methods were called in a certain order. And a **simulation**, like `DrivetrainIOSim`, is a fake with physics inside. You will meet all four names on robotics teams. This book uses fakes and the simulation: they are plain Java, and you can read every line.

### Dependency injection

Why could a fake slip in so easily? Look at `Drivetrain`'s constructor from Chapter 17:

```java
public Drivetrain(DrivetrainIO io) {
```

`Drivetrain` does not create its own hardware. Whoever creates the drivetrain **hands it** the hardware, through the constructor. `RobotContainer` hands it a `DrivetrainIOXRP` or a `DrivetrainIOSim`; a test hands it a `FakeDrivetrainIO`. The drivetrain never knows the difference. That is polymorphism (Section 17.5) doing the job it is best at.

This pattern has a name you will hear on every software team: **dependency injection**. The things a class depends on (its **dependencies**) are passed in from outside (**injected**), instead of being created inside. You have been doing it since Chapter 18 without the name: every command takes its `Drivetrain` and `Sensors` as constructor parameters, instead of making its own. Dependency injection is what makes a class testable: whatever a class creates for itself, a test cannot replace.

Compare the class that **cannot** be tested this way. `Sensors` creates its own hardware, in its field initializers:

```java
private final XRPReflectanceSensor reflectance = new XRPReflectanceSensor();
```

Nothing can hand `Sensors` a pretend reflectance sensor. Section 22.8 shows what that costs, and Practice 6 fixes it.

### HALSim: the simulated hardware layer

`Drivetrain` is a subsystem, so creating one does more than run its own constructor. Section 19.4 showed that `SubsystemBase()` registers the subsystem with the command scheduler, and the scheduler, when it is created, reports itself to WPILib's **HAL**.

The **HAL**, the **Hardware Abstraction Layer**, is the bottom of WPILib: the code that actually talks to hardware. Every WPILib object that touches a motor, an input, or the Driver Station goes through it. On a roboRIO, the HAL talks to real circuits. When you run **Simulate Robot Code**, WPILib swaps in a simulated HAL, usually called **HALSim**, where every "pin" and "port" is just a number in memory. The XRP has always worked this way: Chapter 2 explained that your code runs on your laptop, and that the XRP extension passes those simulated numbers to the real robot over Wi-Fi.

Tests use HALSim too, without the XRP extension and without the Simulation GUI. Before a test creates any WPILib object that touches the HAL, it starts it with one line, as WPILib's own example tests do:

```java
HAL.initialize(500, 0);   // start WPILib's simulated hardware layer
```

The two numbers are a timeout (in milliseconds) and a mode. You will never need to change them. Calling it more than once is harmless, so every test class that needs the HAL calls it in its `@BeforeEach` method. `FollowLineTest` never touches the HAL, so it does not need it.

### The drivetrain tests

Create `DrivetrainTest.java`, next to the fake:

```java
package frc.robot.subsystems;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Tests for Drivetrain's own logic, on a fake IO: the math, the limits, and the zeroing. */
class DrivetrainTest {

    private static final double DELTA = 1e-6;   // close enough to call two doubles equal

    private FakeDrivetrainIO io;
    private Drivetrain drivetrain;

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);   // start WPILib's simulated hardware layer
        io = new FakeDrivetrainIO();
        drivetrain = new Drivetrain(io);
    }

    @AfterEach
    void tearDown() {
        // The drivetrain registered itself with the scheduler (Section 19.4). Forget it.
        CommandScheduler.getInstance().unregisterAllSubsystems();
    }

    @Test
    void stopSendsZeroVolts() {
        drivetrain.setVolts(3.0, 3.0);
        drivetrain.stop();
        assertEquals(0.0, io.leftVolts, DELTA);
        assertEquals(0.0, io.rightVolts, DELTA);
    }

    @Test
    void voltsAreLimitedToTheBattery() {
        drivetrain.setVolts(10.0, -10.0);
        assertEquals(Drivetrain.NOMINAL_BATTERY_VOLTS, io.leftVolts, DELTA);
        assertEquals(-Drivetrain.NOMINAL_BATTERY_VOLTS, io.rightVolts, DELTA);
    }

    @Test
    void drivingForwardUsesEachSidesFeedforward() {
        drivetrain.drive(0.10, 0.0);
        assertEquals(Drivetrain.LEFT_KS_VOLTS + Drivetrain.LEFT_KV_VOLT_SECONDS_PER_METER * 0.10,
            io.leftVolts, DELTA);
        assertEquals(Drivetrain.RIGHT_KS_VOLTS + Drivetrain.RIGHT_KV_VOLT_SECONDS_PER_METER * 0.10,
            io.rightVolts, DELTA);
    }

    @Test
    void turningLeftDrivesTheRightSideForward() {
        drivetrain.drive(0.0, 1.0);   // positive turn rate: counterclockwise, to the left
        assertTrue(io.rightVolts > 0.0, "right side should drive forward");
        assertTrue(io.leftVolts < 0.0, "left side should drive backward");
    }

    @Test
    void aTinySpeedSendsNoVolts() {
        drivetrain.drive(0.001, 0.0);   // 1 mm per second: far below STOPPED_SPEED
        assertEquals(0.0, io.leftVolts, DELTA);
        assertEquals(0.0, io.rightVolts, DELTA);
    }

    @Test
    void resetPoseStartsCountingFromHere() {
        // Arrange: the encoders already read 1.0 m, and the gyro 30 degrees.
        io.leftDistanceMeters = 1.0;
        io.rightDistanceMeters = 1.0;
        io.headingDegrees = 30.0;
        drivetrain.periodic();   // read the inputs, as the scheduler does every loop

        // Act: tell the drivetrain it is at the start, then roll 0.3 m straight ahead.
        drivetrain.resetPose(new Pose2d());
        io.leftDistanceMeters = 1.3;
        io.rightDistanceMeters = 1.3;
        drivetrain.periodic();

        // Assert: everything counts from the reset, not from the hardware's own zero.
        assertEquals(0.3, drivetrain.getAverageDistanceMeters(), DELTA);
        assertEquals(0.0, drivetrain.getHeadingDegrees(), DELTA);
        assertEquals(0.3, drivetrain.getPose().getX(), DELTA);
        assertEquals(0.0, drivetrain.getPose().getY(), DELTA);
    }
}
```

Walk through it:

- **`@BeforeEach setUp()`** runs before every test: start the HAL, make a fresh fake, and make a fresh `Drivetrain` on top of it. Each test gets its own brand-new drivetrain, so no test can be confused by another's leftovers.
- **`@AfterEach tearDown()`** runs after every test, even a failed one. Every `Drivetrain` registers itself with the scheduler, and the scheduler is a singleton (Chapter 18) that lives for the whole test run. `unregisterAllSubsystems()` tells it to forget them, so six tests do not leave six drivetrains behind.
- **`stopSendsZeroVolts` and `voltsAreLimitedToTheBattery`** check the two simplest promises: stop really means zero, and nothing over `NOMINAL_BATTERY_VOLTS` ever reaches the motors. The expected value is written as the constant, not as `6.0`.
- **`drivingForwardUsesEachSidesFeedforward`** checks Chapter 16's feedforward equation, one side at a time: for 0.10 m/s, the left side should get `LEFT_KS + LEFT_KV * 0.10` volts. If someone swaps the left and right gains, or forgets kS, this fails. The delta is tiny (`1e-6`), because this is exact arithmetic.
- **`turningLeftDrivesTheRightSideForward`** is the sign check from Chapter 8, made permanent: a positive turn rate is counterclockwise, so the right wheel goes forward and the left goes backward. Chapter 8 caught an earlier chapter with this sign backwards; a test like this one is how a team makes sure nobody gets it wrong again. The messages in the two `assertTrue`s say what was supposed to happen, because a bare `expected: <true>` would not.
- **`aTinySpeedSendsNoVolts`** checks Chapter 16's deadband: ask for 1 mm per second, and the drivetrain sends nothing, instead of a kS-sized shove that would make the robot buzz.
- **`resetPoseStartsCountingFromHere`** is the most interesting. Chapter 17 moved zeroing into software: the hardware's counters never reset, and `Drivetrain` remembers what they read at the last reset. The test pretends the encoders already read 1.0 m and the gyro 30 degrees, resets the pose, rolls 0.3 m, and checks that the drivetrain reports 0.3 m traveled, a heading of 0, and a pose 0.3 m along x. Notice the `drivetrain.periodic()` calls. On the robot, the scheduler calls `periodic()` every loop, and that is when the drivetrain reads its inputs (Section 19.3). With no scheduler running, the test calls it itself. Forget one, and the drivetrain is still looking at the old readings, exactly as it would be on the robot.

Run the tests. Twenty now, all green.

> **Why not test on the real XRP hardware classes?**
>
> You could try: give the test a `DrivetrainIOXRP`, and its `XRPMotor`s would be created in HALSim with no XRP attached. But each `XRPMotor` can only be created **once** per program. The second test to try it would crash with `XRPMotor 0 already allocated`, the same error Chapter 10 planted on purpose. Fakes have no such limit: make a hundred, one per test. The IO seam is what makes that possible, and it is one of the two big reasons it exists (the other is AdvantageKit's replay, in Chapter 24).

---

## 22.7 Simulation Tests: Commands on a Simulated Clock

The fake IO is perfect for checking the drivetrain's arithmetic. It cannot tell you whether `DriveDistance` actually **arrives**. That depends on the PID gains, the feedforward, and how the robot responds to volts: on physics. And Chapter 17 already gave you physics, built from your own SysId measurements: `DrivetrainIOSim`.

A test that runs real robot code against a simulated robot is a **simulation test**. It checks bigger things than a unit test ("does this command reach its target?") and runs slower (thousands of loops instead of one call). Still far faster than the floor.

### Two problems: the scheduler, and the clock

Running a command in a test raises two problems that never come up on the robot.

**The scheduler only runs commands while the robot is enabled.** Section 18.5: when the robot is disabled, the scheduler cancels every command that does not run while disabled. In a test, nobody has pressed Enable on the Driver Station. So the test tells the simulated Driver Station to enable, with HALSim's `DriverStationSim`:

```java
DriverStationSim.setEnabled(true);   // commands only run while the robot is enabled
DriverStationSim.notifyNewData();
```

The second line matters. WPILib only reads the Driver Station's state when new data arrives (on a robot, about every 20 ms). `notifyNewData()` says "new data has arrived," so the enable takes effect at once.

**Time.** Commands use time: `withTimeout`, the `Timer`, and the PID controllers, which assume 20 ms between loops. On the robot, the loop runs every 20 ms because `TimedRobot` waits. A test has no `TimedRobot`. It runs the loop as fast as the computer can, thousands of loops a second, while the real clock barely moves.

The answer is to take control of the clock. HALSim's `SimHooks` can **pause** WPILib's clock, and then **step** it forward by exactly as much as you say:

```java
SimHooks.pauseTiming();              // the clock moves only when the test says so
...
CommandScheduler.getInstance().run();   // one loop
SimHooks.stepTiming(0.02);              // 20 ms pass on the simulated clock
```

Every WPILib clock in the program (the `Timer`, `withTimeout`, the log timestamps) reads that simulated clock. So each turn of the test's loop is exactly 20 ms of robot time, however fast the laptop runs it. A 2-second drive takes 100 loops and a few milliseconds.

There is a second gift hidden in this. Because the simulated clock moves in exact 20 ms steps, and `DrivetrainIOSim` has no random noise, **the same test gives exactly the same result every time**, on every computer. Tests with that property are **deterministic**, and it is worth working hard for. A test that passes nine runs in ten is called **flaky**, and a flaky test is worse than none: people learn to ignore red, and then they ignore the real failure too.

### The command tests

Create `DriveCommandsTest.java` in `src/test/java/frc/robot/commands`, next to `FollowLineTest.java`:

```java
package frc.robot.commands;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj.simulation.SimHooks;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.DrivetrainIOSim;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The drive commands on the simulated Explorer: your SysId physics, on a simulated clock. */
class DriveCommandsTest {

    private static final double LOOP_SECONDS = 0.02;   // one robot loop
    private static final double TIME_LIMIT_SECONDS = 5.0;

    private Drivetrain drivetrain;

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);
        SimHooks.pauseTiming();              // the clock moves only when the test says so
        DriverStationSim.setEnabled(true);   // commands only run while the robot is enabled
        DriverStationSim.notifyNewData();
        drivetrain = new Drivetrain(new DrivetrainIOSim());
    }

    @AfterEach
    void tearDown() {
        CommandScheduler.getInstance().cancelAll();
        CommandScheduler.getInstance().unregisterAllSubsystems();
        DriverStationSim.resetData();        // disabled, no mode: as the Driver Station starts
        DriverStationSim.notifyNewData();
        SimHooks.resumeTiming();
    }

    @Test
    void driveDistanceStopsAtItsTarget() {
        double seconds = runUntilFinished(new DriveDistance(drivetrain, 0.30));

        assertTrue(seconds < TIME_LIMIT_SECONDS, "DriveDistance never finished");
        assertEquals(0.30, drivetrain.getAverageDistanceMeters(),
            Drivetrain.DISTANCE_TOLERANCE_METERS);
        assertEquals(0.0, drivetrain.getHeadingDegrees(), Drivetrain.HEADING_TOLERANCE_DEGREES);
    }

    @Test
    void driveDistanceBacksUpForANegativeDistance() {
        double seconds = runUntilFinished(new DriveDistance(drivetrain, -0.30));

        assertTrue(seconds < TIME_LIMIT_SECONDS, "DriveDistance never finished");
        assertEquals(-0.30, drivetrain.getAverageDistanceMeters(),
            Drivetrain.DISTANCE_TOLERANCE_METERS);
    }

    @Test
    void turnToHeadingFacesItsTarget() {
        double seconds = runUntilFinished(new TurnToHeading(drivetrain, 90.0));

        assertTrue(seconds < TIME_LIMIT_SECONDS, "TurnToHeading never finished");
        assertEquals(90.0, drivetrain.getHeadingDegrees(), Drivetrain.HEADING_TOLERANCE_DEGREES);
    }

    /**
     * Schedule a command, then run the robot loop on the simulated clock until the
     * command finishes, or until the time limit.
     *
     * @param command the command to run
     * @return how many simulated seconds it ran
     */
    private double runUntilFinished(Command command) {
        CommandScheduler.getInstance().schedule(command);
        double seconds = 0.0;
        while (command.isScheduled() && seconds < TIME_LIMIT_SECONDS) {
            CommandScheduler.getInstance().run();   // one loop: periodic(), then the command
            SimHooks.stepTiming(LOOP_SECONDS);      // 20 ms pass on the simulated clock
            seconds += LOOP_SECONDS;
        }
        return seconds;
    }
}
```

Walk through it:

- **`setUp()`** starts the HAL, pauses the clock, enables the pretend Driver Station, and builds a `Drivetrain` on a `DrivetrainIOSim`: the simulated Explorer from Chapter 17, with your SysId gains inside it.
- **`tearDown()`** cancels any command still running, forgets the subsystem, puts the pretend Driver Station back to disabled with `resetData()`, and lets the clock run again, so the next test class starts clean.
- **`runUntilFinished()`** is a **helper method**: not a test (no `@Test`), just code the tests share. It schedules the command, then runs the robot loop on the simulated clock until the command is no longer scheduled, or until `TIME_LIMIT_SECONDS`. It returns how many simulated seconds that took. Each turn of its loop is one loop of `robotPeriodic()`: the scheduler runs (subsystem `periodic()`, so `DrivetrainIOSim` moves its pretend robot 20 ms; then the command's `execute()` and `isFinished()`), and then the clock steps.
- **`driveDistanceStopsAtItsTarget`** drives 0.30 m. It checks three things: that the command finished before the time limit (with a message, because a bare `expected: <true>` would be a puzzle), that the robot is within `DISTANCE_TOLERANCE_METERS` of 0.30 m, and that it held its heading. Those are the very same tolerances `DriveDistance` uses to decide it is done.
- **`driveDistanceBacksUpForANegativeDistance`** checks the "negative drives backward" promise from `DriveDistance`'s Javadoc.
- **`turnToHeadingFacesItsTarget`** turns to 90 degrees and checks the heading against `HEADING_TOLERANCE_DEGREES`.

Run the tests. With the example gains, `DriveDistance` takes about 1.8 simulated seconds and `TurnToHeading` about 1.1, and the three tests together take a fraction of a second of real time. (To see the simulated seconds, add `System.out.println(seconds);` to a test, run it, and look under **Standard output** for that test in the HTML report. Gradle keeps test printouts out of the terminal.)

> **What a simulation test can and cannot prove**
>
> These tests prove that your commands, your PID gains, and your feedforward work together **on the model of your robot**. They cannot prove that the model is right. If your SysId data was poor, or a wheel slips on your floor, the simulated robot arrives and the real one does not. That is still worth a great deal: when a test fails, the problem is in the code or the gains, never in the batteries or the carpet. And when the test passes but the robot misses, you know to look at the robot. Chapter 32 makes the model much better, with SysId on the Mini Swerve's brushless motors.


---

## 22.8 The Whole Course, Without a Robot

Every test so far checks one piece. The obstacle course is all the pieces at once: `RobotContainer` building the sequence, the per-step timeouts, `DriveUntilLine` stopping on the crossbar, the `either` choosing leg 3, `FollowLine` following the pretend tape, the LED, and `Hold Still`. A test that checks many pieces working together is an **integration test**. This one is the biggest test in the project, and the most satisfying: it runs the whole autonomous routine, on the simulated Explorer and its simulated floor from Chapter 21, start to finish, every time you build.

### A container for the simulated robot

There is one problem first. `RobotContainer` decides real or simulated by reading `Constants.USE_SIMULATED_ROBOT`, and that constant is `false` in your committed code (Section 21.9 reminded you to set it back). A test needs the **simulated** robot every time, whatever the constant says. And it would be a bad test that passed or failed depending on whether someone forgot to flip a constant back.

So `RobotContainer` gets a second constructor, one that takes the choice as a parameter: dependency injection again, this time for a `boolean`. Open `RobotContainer.java`. Add a field after `obstacleCourse`:

```java
// Real XRP or simulated? Robot asks Constants; a test can ask for either (Chapter 22).
private final boolean useSimulatedRobot;
```

Then replace the first lines of the constructor, down to and including the `if`:

```java
/** Build the robot that Constants.USE_SIMULATED_ROBOT asks for. Robot.java uses this one. */
public RobotContainer() {
    this(Constants.USE_SIMULATED_ROBOT);
}

/**
 * Build the real robot or the simulated one. Package-private, so tests in
 * frc.robot can ask for the simulated robot whatever Constants says.
 *
 * @param useSimulatedRobot true for the simulated XRP and its pretend floor
 */
RobotContainer(boolean useSimulatedRobot) {
    this.useSimulatedRobot = useSimulatedRobot;

    // Real hardware or simulated: decide here, once. Nothing else needs to know.
    DrivetrainIO drivetrainIO;
    if (useSimulatedRobot) {
```

The rest of the constructor stays exactly as it was. Then, in `simulationPeriodic()`, change the first line to use the field:

```java
if (!useSimulatedRobot) {
    return;   // the real XRP has a real floor
}
```

Two pieces of Java are worth a closer look.

**Two constructors.** A class can have more than one constructor, as long as their parameter lists differ: constructor **overloading**, the same idea as overloading `arcadeDrive` in Chapter 11. `new RobotContainer()` runs the first; `new RobotContainer(true)` runs the second.

**`this(...)` calls the other constructor.** The no-parameter constructor's whole body is `this(Constants.USE_SIMULATED_ROBOT);`. Written as the **first line** of a constructor, `this(...)` means "run my other constructor, with these arguments." It is the twin of `super(...)` from Section 19.4, which runs the **parent's** constructor. The result: all the real building happens in one place, and the short constructor just supplies the usual choice. `Robot.java` still says `new RobotContainer()`, and does not change at all.

```
error: call to this must be first statement in constructor
```

That is what Java says if you put anything above the `this(...)` line. A constructor can call another constructor only before it has done anything else, so that the object is never half-built twice.

The new constructor is package-private, like `decideNextState()`: the test, in `frc.robot`, can use it, and nothing outside the package needs to know it exists. And `useSimulatedRobot` is `final`, set once in the constructor (Chapter 14), so nothing can flip the robot between real and simulated halfway through a run.

The test also needs to know where the robot ended up. Add one more small method to `RobotContainer`, just above the command factories:

```java
/**
 * Where the robot thinks it is. Package-private: only the tests need it (Chapter 22).
 *
 * @return the drivetrain's pose, from odometry
 */
Pose2d getPose() {
    return drivetrain.getPose();
}
```

Build. Then run the robot once in the simulator with `USE_SIMULATED_ROBOT = true`, and once on the XRP with it `false`, to check that both still start. (Nothing should have changed, and you just proved it.)

### The course test

Create `ObstacleCourseTest.java` in `src/test/java/frc/robot`, next to the `commands` and `subsystems` test folders:

```java
package frc.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.simulation.DIOSim;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj.simulation.SimHooks;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import frc.robot.Constants.CourseConstants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * The whole obstacle course, in autonomous, on the simulated Explorer and its
 * simulated floor. The one test in the project that builds the whole robot.
 */
class ObstacleCourseTest {

    private static final double LOOP_SECONDS = 0.02;
    private static final double TIME_LIMIT_SECONDS = 40.0;   // more than every timeout added up
    private static final int LED_CHANNEL = 1;                // XRPOnBoardIO's LED: digital output 1

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);
        SimHooks.pauseTiming();
        DriverStationSim.setAutonomous(true);   // as if the Driver Station chose Autonomous
        DriverStationSim.setEnabled(true);
        DriverStationSim.notifyNewData();
    }

    @AfterEach
    void tearDown() {
        CommandScheduler.getInstance().cancelAll();
        CommandScheduler.getInstance().unregisterAllSubsystems();
        CommandScheduler.getInstance().getDefaultButtonLoop().clear();   // forget the bindings
        DriverStationSim.resetData();        // disabled, no mode: as the Driver Station starts
        DriverStationSim.notifyNewData();
        SimHooks.resumeTiming();
    }

    @Test
    void courseEndsAtTheEndOfTheLine() {
        // Arrange: the whole robot, simulated, and a way to watch its LED.
        RobotContainer robotContainer = new RobotContainer(true);
        DIOSim led = new DIOSim(LED_CHANNEL);

        // Act: run autonomous, loop by loop, until the LED goes out (the course is over).
        CommandScheduler.getInstance().schedule(robotContainer.getAutonomousCommand());
        double seconds = 0.0;
        while (led.getValue() && seconds < TIME_LIMIT_SECONDS) {
            CommandScheduler.getInstance().run();    // what Robot.robotPeriodic() does
            robotContainer.simulationPeriodic();     // the pretend floor, as in the simulator
            SimHooks.stepTiming(LOOP_SECONDS);
            seconds += LOOP_SECONDS;
        }

        // Assert: the course finished, at the end of the line, facing up leg 3.
        assertFalse(led.getValue(), "the course never finished");
        Pose2d pose = robotContainer.getPose();
        assertEquals(CourseConstants.END_POSE.getX(), pose.getX(), 0.05);
        assertEquals(CourseConstants.END_POSE.getY(), pose.getY(), 0.10);
        assertEquals(CourseConstants.TURN_HEADING_DEGREES, pose.getRotation().getDegrees(), 10.0);
    }
}
```

Walk through it:

- **`setUp()`** is the same as the command tests, plus one line: `DriverStationSim.setAutonomous(true)`. Without it, an enabled robot is in **teleop**, and the teleop bindings would come alive: the line light, for one, would turn the LED on and off as the robot crossed the tape.
- **`tearDown()`** has one more line too: `getDefaultButtonLoop().clear()`. `RobotContainer` bound a dozen triggers to buttons and sensors (Chapter 20), and the scheduler keeps polling them every loop until it is told to forget them. Clearing the loop makes sure no later test is ever surprised by a leftover binding.
- **Arrange** builds the whole robot, simulated, with `new RobotContainer(true)`. Then it makes a `DIOSim` to watch the LED. The XRP's LED is digital output 1 (hold Ctrl and click `XRPOnBoardIO` in `RobotContainer` to see it in WPILib's source), and `DIOSim` reads what the program last set on that output, exactly as the Simulation GUI's DIO panel does.
- **Act** schedules the autonomous command, as `autonomousInit()` does, and runs the loop until the **LED goes out**. Chapter 20 made the LED part of the course: `deadlineFor(lightTheLed())` keeps it on for exactly as long as the course runs, and turns it off the moment the last leg ends and `Hold Still` takes over. So "until the LED goes out" means "until the course is over." Each loop does what the real robot does every 20 ms: `CommandScheduler.getInstance().run()` (Robot's `robotPeriodic()`), then `simulationPeriodic()` (the pretend floor sets each reflectance sensor from the robot's pose), then 20 ms on the clock. `TIME_LIMIT_SECONDS` is 40, more than all the course's timeouts added up, so a stuck robot cannot run the test forever.
- **Assert** checks that the LED went out (the course finished, with a message saying so if not), and then that the robot is where leg 3 should leave it: within 5 cm of the line sideways, within 10 cm of `END_POSE` along the line, and facing up leg 3 within 10 degrees.

Why these tolerances? The follower stops when its sensors, 5 cm ahead of the robot's center, run off the end of the tape, so the robot's center stops about 5 cm short of `END_POSE`. And the sideways check must allow for the pretend tape's 2 cm half-width. The tolerances say "the robot followed the line to its end," and nothing more precise than the course itself can promise.

Run the tests. With the example gains, the simulated Explorer drives leg 1 in about 2.8 s, turns in about 1.1 s, reaches the crossbar at about 5.7 s, follows the line, and finishes at about 11.8 s, roughly 4 cm short of `END_POSE`. All of it takes well under a second of real time. Open the HTML report, click `ObstacleCourseTest`, and look at **Standard output**: the whole course's log is there, from `Drivetrain: SIMULATED` through `FollowLine finished in END_OF_LINE`, exactly as you would see it in the terminal on the robot.

Now try the experiment that makes this test worth having. Open `Constants.java` and change `FOLLOW_LINE_LENGTH_METERS` from `0.60` to `0.30`, so the pretend tape is shorter than `END_POSE` expects. Run the tests:

```
ObstacleCourseTest > courseEndsAtTheEndOfTheLine() FAILED
```

and the report says the robot's y was about 0.66 m, not within 0.10 of 1.0. One number changed, and a test that knows nothing about tape lengths noticed the robot ended up somewhere else. Put it back.

> **Only one test may build the whole robot**
>
> `ObstacleCourseTest` has exactly one test method, on purpose. `new RobotContainer(true)` creates a `Sensors`, and `Sensors` creates the XRP's reflectance sensors and rangefinder, on analog inputs 0, 1, and 2. Like `XRPMotor` in Section 22.6, each input can only be created once per program, and Gradle runs **all** your test classes in one program. A second `new RobotContainer(...)` anywhere in your tests would fail with an `AllocationException` whose message begins `Analog Input 0 previously allocated`. WPILib's answer is to `close()` hardware objects after each test, but the XRP's sensor classes do not have a `close()` method. So the rule for the Explorer is simple: **one test builds the whole robot; every other test uses fakes and the simulation.** Practice 6 gives `Sensors` an IO layer, which removes the limit.

> **The test pyramid**
>
> You now have three sizes of test, and their numbers form a shape. At the bottom, many small, instant **unit tests** (`FollowLineTest`, `DrivetrainTest`): each checks one rule, and when one fails, it points straight at the line. In the middle, fewer **simulation tests** (`DriveCommandsTest`): slower, checking that pieces work together on the model. At the top, one **integration test** (`ObstacleCourseTest`): the whole robot, catching problems no smaller test can see, but when it fails it only says "something on the course went wrong." Software teams call this the **test pyramid**: lots of small tests at the bottom, a few big ones at the top. Wide at the bottom, because small tests are fast and precise. A point at the top, because nothing else proves the whole thing works.

---

## 22.9 A Robot That Checks Every Push: GitHub Actions

You have twenty-four tests, and they run every time **you** build. But your teammates build on their own laptops, maybe with their own tests failing, maybe without running the tests at all. Chapter 21's pair lab showed what happens next: a pull request that looks fine on GitHub, merges cleanly, and breaks `main`.

The fix is to have the tests run somewhere that **nobody can skip**: on GitHub itself, on every push and every pull request, with the result shown right on the pull request. That is called **continuous integration**, or **CI**: every change is built and tested as soon as it is pushed, before it is merged. GitHub's way of doing it is **GitHub Actions**.

### How it works

GitHub Actions runs **workflows**: lists of steps, written in a file in your repository. When something happens (a push, a new pull request), GitHub starts a fresh computer in the cloud, called a **runner**, copies your code onto it, runs the steps, and reports whether they all worked. The runner is thrown away afterward. Every run starts from nothing.

That last part matters more than it sounds. Your laptop has years of leftovers: files you forgot to commit, settings you changed once, a test that only passes because of something in your `build` folder. The runner has **only what is in Git**. If it builds there, it builds for anyone who clones your repository. The famous excuse "but it works on my machine" stops working.

Workflows on public repositories are free. Private repositories on a free account get a monthly allowance of runner minutes that is far more than one robot project needs.

### The workflow file

Workflows live in a folder with an exact name: `.github/workflows`, at the top of your project (next to `build.gradle`). The leading dot matters. In VS Code, right-click the empty space at the bottom of the file explorer (so the new folder lands at the top level), choose **New Folder...**, and type `.github/workflows`. Inside it, create `build.yml`:

```yaml
# Build the robot code and run every test, on every push and every pull request.
name: Build and test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Get the code
        uses: actions/checkout@v7

      - name: Install Java 17
        uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: '17'

      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v6

      - name: Let gradlew run
        run: chmod +x gradlew

      - name: Build and run the tests
        run: ./gradlew build
```

This file is not Java. It is **YAML**, a format for writing settings that people can read. Three rules cover everything here:

- **`key: value`** sets one setting: `name: Build and test`, `runs-on: ubuntu-latest`.
- **Indentation is meaning.** Lines indented under a key belong to it, the way code inside `{ }` belongs to a method. Use **spaces**, never tabs (YAML does not allow tabs), and keep each level lined up exactly. Most YAML mistakes are one space too many or too few.
- **A line starting with `- `** is one item in a list. `steps:` is a list of five steps.

Now read the file from the top:

- **`name: Build and test`** is what GitHub shows on the **Actions** tab and on pull requests.
- **`on: [push, pull_request]`** says when to run: on every push to any branch, and on every pull request.
- **`jobs:`** holds the work. There is one job, named `build`. **`runs-on: ubuntu-latest`** asks for a fresh Linux computer. WPILib's simulation and tests run on Linux, Windows, and macOS alike, and Linux runners are the fastest to start.
- **The steps** run in order, and if any one fails, the job stops and is marked failed:
  1. **`actions/checkout@v7`** copies your repository onto the runner. A step with **`uses:`** runs an **action**, a ready-made step that someone published on GitHub. The `@v7` picks the version: version 7 of GitHub's own checkout action.
  2. **`actions/setup-java@v6`** installs Java. WPILib 2026 uses Java 17, so the runner does too (`temurin` is a free build of Java).
  3. **`gradle/actions/setup-gradle@v6`** is Gradle's own action. It remembers downloaded files between runs, so after the first run, the runner does not download all of WPILib again.
  4. **`chmod +x gradlew`** is a Linux command that marks the `gradlew` script as a program allowed to run. A step with **`run:`** runs a command, just as if you typed it in a terminal. Projects created on Windows usually lose this mark when they reach GitHub, and without this line the next step fails with `Permission denied`.
  5. **`./gradlew build`** is exactly what **WPILib: Build Robot Code** runs on your laptop: compile everything, then run every test.

> **Why `./gradlew` and not `gradle`?**
>
> `gradlew` is the **Gradle wrapper**, the small script that came with your WPILib project. It downloads the exact Gradle version WPILib chose, the first time it runs. So the runner, your laptop, and your teammates' laptops all build with the same Gradle, without anyone installing it. VS Code's WPILib commands run the wrapper too: `.\gradlew` on Windows, `./gradlew` everywhere else.

### Push it, and watch

Commit the workflow along with your tests (see the Git exercise) and push. Then open your repository on GitHub and click the **Actions** tab. You will see a run named after your commit message, with a yellow dot while it runs. Click it, then click **build**, and you can watch each step's output scroll by: the checkout, Java, Gradle downloading WPILib (a few minutes the first time), and finally the build and your tests.

When it finishes, the dot becomes a **green check**. Go back to the **Code** tab: the same check now appears next to your latest commit. Every commit from now on gets one.

Now open a pull request (the Git exercise does). At the bottom of the pull request, above the **Merge** button, GitHub shows a **Checks** box listing the workflow, with its result. You may see it listed twice, once for the push and once for the pull request, because the workflow runs on both. While it runs, the box is yellow. When it is red, the pull request has broken something, and you know it **before** anyone presses **Merge**.

### See it go red

Make one more practice branch, and do what Section 22.5 did on your laptop, on GitHub instead: swap the two searches in `stateForLostLine()`. Commit, push, and open a pull request. Do **not** run the tests on your laptop first; pretend you are the teammate from Section 22.1 who could not test at home.

A few minutes later, the pull request shows a **red X**: "Some checks were not successful." Click **Details**, open the **Build and run the tests** step, and scroll near the end. The same lines you saw in your own terminal are there:

```
FollowLineTest > lostLineOnTheLeftSearchesLeft() FAILED
    org.opentest4j.AssertionFailedError at FollowLineTest.java:68
FollowLineTest > lostLineOnTheRightSearchesRight() FAILED
    org.opentest4j.AssertionFailedError at FollowLineTest.java:73
```

Nobody had to remember anything. The Tuesday bug would never have reached Thursday. Close the pull request without merging, and delete the branch.

> **Only what is committed gets tested**
>
> The most common surprise with CI is a red X for code that passes on your own laptop. Nine times in ten, the cause is a file that exists on your laptop but not in Git: a new test, or a new class, that you never ran `git add` on. The runner cannot see it, so the build fails with `cannot find symbol`. Run `git status` before you push, and look for files under **Untracked files**. CI just found a real problem: anyone who cloned your repository would have had the same failure.

### Optional: make a green check required

A red X warns you. It does not stop anyone from pressing **Merge** anyway. GitHub can do that too, with a **ruleset**: in your repository, open **Settings**, then **Rules** > **Rulesets** in the left sidebar, and choose **New ruleset** > **New branch ruleset**. Name it `main`, set **Enforcement status** to **Active**, add a target that includes the default branch, and turn on **Require status checks to pass before merging**, adding the check named `build`. Click **Create**. From then on, the **Merge** button stays locked until the checks are green.

GitHub only enforces rulesets on **public** repositories for free accounts. If your Explorer repository is private, the rule needs GitHub Pro, which students can get free through the GitHub Student Developer Pack. Either way, the red X and green check work on every repository, and they are what this chapter relies on.

---

## 22.10 What Tests Can and Cannot Tell You

You started this chapter with no tests and ended it with twenty-four, a pyramid of them, running on every build and every push. Before you go on, be clear about what they promise.

**Tests can tell you** that the code still does what it did when the tests were written. That every arrow in `FollowLine`'s diagram goes where the diagram says. That the drivetrain's signs, limits, and zeroing are right. That the commands reach their targets on the model of your robot, and that the course, assembled from all of them, ends at the end of the line. And they tell you within seconds of a change, instead of at a competition.

**Tests cannot tell you** that the robot will work on the floor. They know nothing about worn wheels, a low battery, the glare on a shiny gym floor, or a reflectance sensor knocked a millimeter out of place. They cannot tell you whether 3.0 is a good steering gain. And they can only check what someone thought to check: a test suite with no test for the Tuesday bug would not have caught it. Passing tests mean "nothing we thought of is broken," which is a lot, but not everything.

So you still test on the floor, as you always have. What changes is **what you spend the floor on**. Logic, signs, and arithmetic are checked by the computer, every time, for free. Your floor time goes to the things only a floor can tell you: tuning, feel, and the real world. That is a much better deal.

### When you find a bug, write the test first

The best moment to write a test is the moment you find a bug. Before you fix it:

1. **Write a test that fails because of the bug.** It proves you understand exactly what is wrong, and it shows red.
2. **Fix the code.** The new test goes green.
3. **Keep the test, forever.** That exact bug can never come back without turning something red.

A test written this way is called a **regression test**, and it is why mature teams' test counts keep growing: every bug they ever fixed is still being checked. Some programmers go further and write the test for a **new feature** first, before the feature exists, then write code until it passes. That is called **test-driven development**, and Practice 4 lets you try it.

> **Tests make `git bisect` automatic**
>
> In Chapter 10, `git bisect` found a bad commit by having you check each commit it picked, by hand. With a test that catches the bug, Git can check them for you: `git bisect run` takes a command, runs it on each commit, and treats "the command failed" as "bad." Chapter 10's Additional Resources link to the Pro Git chapter that shows it.

### Tests from here on

- **Chapter 23** makes `FollowLine`'s gains live-tunable from the dashboard. The tests use `SIDE_ERROR` and `SEARCH_MAX_DEGREES` by name, so they follow along with any value you choose.
- **Chapter 25**, the capstone, tags a release of the Explorer. A release with a red X is not a release.
- **Chapters 26 to 33** bring a new robot. Swerve math is much harder to get right than tank drive, and much harder to check on the floor: `SwerveModule` and the kinematics get unit tests from the first day, on fake IO layers, exactly like `DrivetrainTest`.
- **Chapter 39** makes a green CI run part of the competition-day release checklist.

---

## Chapter Summary

> **What you learned in Chapter 22**
>
> * Testing by hand is slow, easy to forget, and covers one path per run. A **test** is code that runs your code with chosen inputs and checks the answer, every time, automatically; it stops **regressions**, bugs that come back after a later change.
> * New Java: **JUnit** finds methods marked **`@Test`** in classes under `src/test/java` and runs each on a fresh object, after `@BeforeEach` and before `@AfterEach`. **Assertions** (`assertEquals(expected, actual)`, `assertEquals` with a **delta** for `double`s, `assertTrue`, `assertFalse`, each with an optional message) fail the test when an answer is wrong. Good tests follow **Arrange, Act, Assert**, have sentence names, and are seen **red** before they are trusted green.
> * New Java: **testable code**. A **pure function** takes every fact as a parameter and only returns an answer; `FollowLine.decideNextState()` became one (`static`, package-private) without changing a single rule, and fourteen tests now check every arrow and boundary of its diagram. **Dependency injection** (handing a class what it depends on, like `Drivetrain(DrivetrainIO io)`) lets a test hand it a **fake**.
> * Tests that touch WPILib start the simulated hardware layer (**HALSim**) with `HAL.initialize(500, 0)`. `DriverStationSim` enables the pretend robot, and `SimHooks.pauseTiming()` and `stepTiming(0.02)` put the test in charge of the clock, so **simulation tests** of commands on `DrivetrainIOSim` are fast and **deterministic**.
> * `RobotContainer` gained a package-private constructor that takes the real-or-simulated choice, reached from the old one with **`this(...)`**. One **integration test** runs the whole obstacle course in autonomous on the simulated floor. Unit tests at the bottom, a few big tests at the top: the **test pyramid**.
> * **Continuous integration**: a **GitHub Actions** workflow in `.github/workflows/build.yml` (YAML) builds and tests every push and pull request on a fresh runner, and shows a green check or a red X before anyone merges. Tests check logic; the floor still checks the robot.

---

## Exercises

### Practice

**1. Predict, then break.** In a practice branch, make each change below on its own. Before running the tests, write down in `reflections.md` which tests you expect to fail, and why. Then run them, compare, and undo the change.

- (a) In `Drivetrain.setVolts()`, swap `leftVolts` and `rightVolts` in the call to `io.setVolts`.
- (b) In `Drivetrain.calculateVolts()`, change `<` to `<=` in the stopped-speed check.
- (c) In `FollowLine.stateForSearch()`, change `>` to `>=`.
- (d) In `Constants.java`, change `TURN_HEADING_DEGREES` to `-90.0` (turn right instead of left).

For any change where **no** test failed, write one sentence: is that a missing test, or a change that really does not matter? If it is a missing test, write it.

**2. Make the first test fail three ways.** `onlyTheEndingStatesAreDone` has five assertions. Break `isDone()` for `GAVE_UP` instead of `END_OF_LINE`. Which line does the failure point at now? Now break both. Does JUnit report one failure or two? Explain what you see using this sentence from Section 22.3: "the test stops right there."

**3. The waiting state (if you have it).** If your `FollowLine` has `WAITING_FOR_CLEAR` from Chapter 21's Collab lab, you added an `obstacleAhead` parameter in Section 22.4. Draw its new arrows on your diagram, then add one test for each: following with an obstacle ahead waits, waiting with the obstacle still there keeps waiting, and waiting with the way clear goes back to following. Then answer: when the robot is waiting and the line is **not** seen, what does your code do? Is that what you want? Write a test that holds whichever answer you choose.

**4. Three strikes, test first.** Chapter 21's Practice 4 asked for a rule: give up after the third search in one run. This time, write the tests **before** the code. Add a parameter `int searchesSoFar` to `decideNextState()` (just the parameter: pass `0` from `execute()` for now), then write two tests: losing the line on the left with `searchesSoFar` of 2 still searches left, and with `searchesSoFar` of 3 gives up. Run them and see red. Now make them green: add the rule to `stateForLostLine()`, and in `FollowLine` add a `searchCount` field that `initialize()` resets and `changeState()` counts. Run every test. In `reflections.md`: did writing the tests first change how you designed the rule?

**5. Many questions, one test.** JUnit can run one test method many times with different inputs, called a **parameterized test**. Add these imports to `FollowLineTest`:

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
```

and this test:

```java
@ParameterizedTest
@CsvSource({
    "0.5,  SEARCHING_LEFT",
    "0.0,  END_OF_LINE",
    "-0.5, SEARCHING_RIGHT"})
void lostLineGoesWhereTheLastErrorPoints(double lastError, State expected) {
    assertEquals(expected, FollowLine.decideNextState(
        State.FOLLOWING, LINE_LOST, lastError, NOT_SEARCHING));
}
```

Each line in `@CsvSource` is one run; JUnit turns `"0.5"` into a `double` and `"SEARCHING_LEFT"` into the enum for you. Run it and find all three runs in the report. Add rows for `0.15`, `0.25`, `-0.15`, and `-0.25`. Then answer: this test types the numbers in, instead of building them from `SIDE_ERROR`. What happens to it the next time you tune `SIDE_ERROR`? When is that a good thing, and when a bad one? (The Collab lab comes back to this question.)

**6. Give `Sensors` an IO layer.** Section 22.8's callout says only one test may build the whole robot, because `Sensors` creates its own hardware. Fix that the Chapter 17 way: create `SensorsIO` (with an `@AutoLog` inputs class holding the left and right reflectance, the distance ahead, and the three accelerations), `SensorsIOXRP` (the three hardware objects, moved from `Sensors`), and give `Sensors` a constructor that takes a `SensorsIO` and a `periodic()`-style `update()` that `RobotContainer` calls every loop. (Chapter 17's Practice 6 started this; finish it.) Then write `SensorsTest` with a `FakeSensorsIO` that checks `isLeftOnLine()` just above and just below `LINE_THRESHOLD`, and `isObstacleWithin()` at the boundary. Can `RobotContainer` now be built twice in one test run? What else in it still creates hardware?

**7. A badge for your README.** GitHub can draw your workflow's latest result as a small picture. Add this line near the top of your `README.md` (from Chapter 3), with your own username and repository name:

```markdown
![Build and test](https://github.com/YOUR-USERNAME/XRPExplorer/actions/workflows/build.yml/badge.svg)
```

Commit, push, and look at your repository's front page. What does the badge show while a run is going, after a green run, and after a red one?

### Build (XRP Explorer)

Give the Explorer a test suite, and a robot at GitHub that runs it.

1. Make a branch (see the Git exercise).
2. Check that `build.gradle` has the JUnit lines from Section 22.2. Create `src/test/java/frc/robot/commands/FollowLineTest.java` with the first test. Run **WPILib: Test Robot Code** and open the HTML report. Break `END_OF_LINE`'s `done` value, see it fail, and fix it.
3. Refactor `FollowLine` (Section 22.4, Steps 1 to 4). Build. On the real XRP, repeat checks 2 and 6 from Section 21.9. Commit.
4. Replace `FollowLineTest` with the full listing (Section 22.5). Run it, then break it the three ways in "Break it three ways," predicting each result first. Undo them all.
5. Create `FakeDrivetrainIO` and `DrivetrainTest` (Section 22.6). Run the tests.
6. Create `DriveCommandsTest` (Section 22.7). Run the tests. Commit.
7. Give `RobotContainer` its second constructor, the `useSimulatedRobot` field, and `getPose()` (Section 22.8). Build, and check that the robot still starts both simulated and real.
8. Create `ObstacleCourseTest`. Run all the tests, and read the course's log under **Standard output** in the report. Try the `FOLLOW_LINE_LENGTH_METERS` experiment, then put it back. Commit.
9. Create `.github/workflows/build.yml` (Section 22.9). Commit, push, and watch the run on the **Actions** tab until it shows a green check.
10. Open a pull request into `main` and find the **Checks** box. Merge it once it is green.
11. Do the "See it go red" check from Section 22.9, on a separate branch. Close that pull request without merging.

If the HTML report shows **24 tests, 0 failures**, and your latest commit on GitHub has a green check, you are ready for Chapter 23.

Diagnose anything strange:

| What you see | Most likely cause |
|---|---|
| `package org.junit.jupiter.api does not exist` | The JUnit lines are missing from `build.gradle`, or the test file is in `src/main` instead of `src/test` |
| `decideNextState(...) is not public in FollowLine; cannot be accessed from outside package` | The test's `package` line does not match `FollowLine`'s, or the test is in the wrong folder |
| `non-static method ... cannot be referenced from a static context` | A method that `decideNextState()` calls still reads a field. Every fact must come in as a parameter |
| `BUILD SUCCESSFUL` but the report shows fewer tests than you wrote | A test method is missing `@Test`, or has parameters, or returns something other than `void` |
| `expected: <true> but was: <false>` with nothing else to go on | Give the `assertTrue` a message as its last argument |
| `DriveDistance never finished` | The pretend Driver Station is not enabled (`setEnabled(true)` and `notifyNewData()`), or `SimHooks.stepTiming` is missing from the loop |
| A command test passes alone but fails when every test runs | An `@AfterEach` is missing `cancelAll()` or `unregisterAllSubsystems()`, so an earlier test's drivetrain or command is still around |
| `Analog Input 0 previously allocated` | Two tests build a `RobotContainer` (or a `Sensors`). Only `ObstacleCourseTest` may (Section 22.8) |
| `the course never finished` | The robot never reached leg 3, or the LED never went out: check that `setAutonomous(true)` is in `setUp()`, and read the course log in the report |
| The course test fails on `getY()` by about 0.5 m | The robot stopped at the crossbar: the `either` took its "no line" branch. Check `simulationPeriodic()` and the `SIM_` tape constants |
| On GitHub: `Permission denied` on `./gradlew` | The `chmod +x gradlew` step is missing, or is after the build step |
| On GitHub: `cannot find symbol` for a class that exists on your laptop | The file was never committed. Check `git status` for untracked files |
| On GitHub: the workflow never runs | The file is not at exactly `.github/workflows/build.yml` (check the dot, and that `workflows` is plural), or it has a tab in it |

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. Before this chapter, `decideNextState()` read the sensors and the drivetrain itself. Explain, using the words **pure function**, why that made it hard to test, and why changing it to take parameters did not change how the robot behaves.
2. `FollowLineTest` builds its pretend errors from `FollowLine.SIDE_ERROR` instead of typing `0.3`. What would go wrong, over a season of tuning, if every test typed its numbers in? Is there ever a good reason to type a number into a test?
3. All twenty-four tests pass, but on the practice field the Explorer wiggles off the line on every bend. Is that a contradiction? Name two things the tests cannot check, and say what you would do next.
4. Why do the simulation tests pause the clock and step it 20 ms at a time? Describe what would happen to `withTimeout(STEP_TIMEOUT_SECONDS)` in `ObstacleCourseTest` if the clock ran at normal speed.
5. Your test passes on your laptop, and the same commit gets a red X on GitHub. Give two different causes, and explain why, in both cases, GitHub is the one telling the truth.

If any answer feels shaky, re-read Sections 22.4, 22.7, and 22.10.

### Git

Use the branch workflow from Chapter 11:

```bash
git checkout main
git pull
git checkout -b unit-tests
```

After Build step 3, with the refactored `FollowLine` checked on the robot:

```bash
git add .
git commit -m "Ch22: FollowLine decisions as pure functions, ready to test"
```

After Build step 6:

```bash
git add .
git commit -m "Ch22: Unit tests for FollowLine and Drivetrain, simulation tests for the drive commands"
```

After Build step 8, with `USE_SIMULATED_ROBOT = false`:

```bash
git add .
git commit -m "Ch22: Integration test runs the whole obstacle course on the simulated robot"
```

After Build step 9:

```bash
git status
git add .
git commit -m "Ch22: Build and test every push with GitHub Actions"
git push -u origin unit-tests
```

Run `git status` before that last `git add`, and check that `.github/workflows/build.yml` and all five files under `src/test` are listed. Then open a pull request into `main`, wait for the green check, merge, delete the branch, and `git checkout main` and `git pull`. From this commit on, every commit in your repository's history has a check mark or an X next to it. That is a record of the code's health, not just its changes.

### Collab: The Merge That Only a Test Can Catch

In Chapter 20's pair lab, Git merged two bindings onto one button, and nothing noticed until someone pressed it. In Chapter 21's, Git merged a new state into a switch that did not know about it, and the compiler noticed. This lab sets up a third kind of collision: the code compiles perfectly, and only a **test** knows it is wrong. And this time CI is watching.

As before, the **owner** is the person whose Explorer repository you use, and the **teammate** is the other partner. Both: finish this chapter's Build and merge it, so the owner's `main` has the tests and the workflow. The teammate pulls the owner's `main`.

**Part A: two reasonable changes.** Work at the same time. Nobody merges yet.

1. **Owner:** create a `sharper-corners` branch. The drive coach says the follower misses sharp corners on the practice field, and the tuning table in Section 21.9 says to lower `SIDE_ERROR`. In `FollowLine.java`, change it to `0.1`. Run the tests: all green, because every test in `FollowLineTest` builds its errors from `SIDE_ERROR`. Commit (`Lower SIDE_ERROR for sharp corners`), push, and open a pull request. Watch its check go green.

2. **Teammate:** create a `centered-spec` branch. The drive coach also said: "On our tape, an error of 0.15 means the robot was centered. If it loses the line then, the line ended, so stop." Write that down as a test. In `FollowLineTest.java`, add:

   ```java
   @Test
   void coachSaysPointOneFiveIsStillCentered() {
       // The drive coach's rule for our tape: 0.15 is centered, so losing the line there ends it.
       assertEquals(State.END_OF_LINE, FollowLine.decideNextState(
           State.FOLLOWING, LINE_LOST, 0.15, NOT_SEARCHING));
   }
   ```

   Run the tests: green, because `SIDE_ERROR` is still 0.2 on your branch. Commit (`Test the coach's centered rule`), push, and open a pull request. Its check goes green too.

**Part B: two green checks, one red main.**

1. **Owner:** merge the `sharper-corners` pull request on GitHub, and delete the branch.
2. **Both:** look at the teammate's `centered-spec` pull request. It still shows a green check, and GitHub says it can be merged with no conflicts. **Do not merge it.** Predict: if you did, would `main`'s next build be green or red?
3. **Teammate:** notice **when** that green check ran: before the owner's change was on `main`. A check is only as fresh as the code it ran on. Bring `main` into your branch, as in Section 11.8: `git checkout centered-spec`, `git fetch origin`, `git merge origin/main`. Git merges with no conflicts: you changed `FollowLineTest.java`, the owner changed `FollowLine.java`. It compiles. Push.
4. **Both:** watch the pull request's check run again, on the merged code. This time: a **red X**, and in the log,

   ```
   FollowLineTest > coachSaysPointOneFiveIsStillCentered() FAILED
   ```

   with `expected: <END_OF_LINE> but was: <SEARCHING_LEFT>` in the report. With `SIDE_ERROR` at 0.1, an error of 0.15 now counts as "the line was on the left." Each change was correct on its own. Together, they disagree. Git cannot see that, and the compiler cannot either. A test can, and CI ran it before anyone merged.
5. **Both:** now the real conversation. A failing test is a **question**, not an order: which is right, the coach's rule or the new tuning? You might decide 0.15 really is centered, and set `SIDE_ERROR` back to a value above it. You might decide the coach's rule was about the old tape, and change the test to say so (and rename it). Or you might decide the test should be built from `SIDE_ERROR` after all. Agree, make the change on `centered-spec`, run the tests, commit, and push. Wait for green.
6. **Owner:** review the pull request. Read the test **and** the decision. Merge, and delete the branch. **Both:** `git checkout main`, `git pull`, and run the tests.

**Part C: swap.** Repeat Parts A and B in the other partner's repository, with roles reversed, and this time turn on the ruleset from Section 22.9 first (if the repository is public, or you have GitHub Pro). In Part B step 2, try to merge the stale pull request after the owner's merge. Does GitHub let you? What does the **Merge** button say?

Afterward, each of you writes two sentences in `reflections.md`. First: in Chapters 20, 21, and 22, three merges went wrong without a Git conflict; what caught each one, and when? Second: the teammate's test typed in `0.15` on purpose. When does a number in a test describe a **requirement** that should be hard to change, and when is it just a copy of a tuning value?

### Explore

- Open WPILib's **Unit Testing** page (link below). Its example tests an intake with a solenoid, and its subsystem has a `close()` method. Compare its test class with `DrivetrainTest`. What does `close()` do, and why could the Explorer's `Sensors` not do the same?
- In VS Code, hold Ctrl and click `SimHooks` in `DriveCommandsTest`. Find `stepTiming`, and list the other methods `SimHooks` has. Then find `DriverStationSim` and list three more things a test could pretend the Driver Station said. Which would you use to test that teleop bindings only work in teleop?
- Find a top FRC team's robot code on GitHub (The Blue Alliance lists many teams' repositories). Look for a `src/test` folder and a `.github/workflows` folder. What do they test? What do their workflows run besides `./gradlew build`? Write down one idea you would steal.
- Read **The Practical Test Pyramid** (link below), at least as far as the pyramid picture. Where would each of your four test classes go on it? The article talks about websites, not robots: what would a robot team's "end-to-end test" be?

---

> **Additional Resources**
>
> * **Unit Testing (WPILib)**: [docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/unit-testing.html](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/unit-testing.html) WPILib's guide to JUnit tests with HALSim, the `close()` pattern, and the Test Robot Code command
> * **JUnit 5 User Guide (version 5.10.1)**: [docs.junit.org/5.10.1/user-guide](https://docs.junit.org/5.10.1/user-guide/) the version in the WPILib template: annotations, assertions, test lifecycle, and parameterized tests
> * **Building and testing Java with Gradle (GitHub Docs)**: [docs.github.com/en/actions/tutorials/build-and-test-code/java-with-gradle](https://docs.github.com/en/actions/tutorials/build-and-test-code/java-with-gradle) GitHub's own guide to the kind of workflow you wrote in Section 22.9
> * **Available rules for rulesets (GitHub Docs)**: [docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) how "Require status checks to pass before merging" works, and which plans can use it
> * **The Practical Test Pyramid**: [martinfowler.com/articles/practical-test-pyramid.html](https://martinfowler.com/articles/practical-test-pyramid.html) Ham Vocke's long, friendly tour of unit, integration, and end-to-end tests, and why most tests should be small

---

*Next up, Chapter 23: SmartDashboard, Shuffleboard, and Live Tuning. You will turn `FollowLine`'s gains and the PID values into dashboard controls, tune the course while it runs, and let your new tests stand guard while the numbers change.*
