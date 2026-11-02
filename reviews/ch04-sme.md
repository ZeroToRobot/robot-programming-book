<!-- counts: blocker=1 major=2 minor=8 build=pass -->

# Chapter 4 SME Review (Phase B, lightweight)

**Chapter:** `src/section-1-foundations/04-your-first-java-program.md` at git HEAD (561 lines)
**Inputs:** `PHASE-B-LIGHT.md`, `00-book-wide.md` (D1 to D5, D4a, B1 to B3, M1 to M5), `robot-programming-book-exercises/ch04-your-first-java-program/VERIFY.md` and `answer-key.md`
**Review date:** 2026-11-01

Not re-reported: the SmartDashboard app (M2, D4), deploy and RioLog (B3), and everything in VERIFY.md.

---

## New findings (Phase B)

### M1: "Refer to it by name from anywhere in your code" sets up the first `cannot find symbol` trap

**Where:** §4.1, line 40 ("you can refer to it by name from anywhere in your code"). The trap is then built by §4.5 Step 2 (lines 258 to 271, locals in the constructor), §4.6 (line 332, the `onBoardIO` field "outside any method" with no reason given), and §4.7 (lines 419 to 430, a separate `robotPeriodic()`).

**Problem:** The claim is wrong for every variable the chapter has the reader write by hand: they are locals, and they exist only inside the constructor's braces. The very next thing a curious student tries ("print `teamNumber` on the dashboard too") is `SmartDashboard.putNumber("Team", teamNumber)` in `robotPeriodic()`, which fails with `cannot find symbol`. The chapter has just told them that can't happen, so they have no way to recover. The same chapter quietly puts `onBoardIO` outside any method so that both methods can use it, without saying that this is the reason. Scope is formally taught in Ch 15, but the one-sentence version is needed here, because Ch 4, 5 and 6 all depend on it (Ch 6's helper methods read fields, and the Ch 6 review's M1 needs a remembered counter field).

**Fix:** Replace the end of line 40 with:

> That's the whole idea. A variable is a labeled box. You can look inside, and you can put something new in.
>
> One catch: a variable only exists inside the curly braces `{ }` where you declared it. A variable you declare inside the `Robot()` constructor is gone once the constructor finishes, so another method can't see it. If you try, the build fails with `cannot find symbol`. Chapter 15 explains this fully.

And after line 346 ("Don't worry about `private final` ..."), add:

> Notice where this line goes: inside the class, but **outside** every method. That's what lets the constructor and `robotPeriodic()` both use `onBoardIO`. A variable declared inside one method can't be seen by another.

**Source:** [Java tutorial: variables](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/variables.html) (local variables vs fields)

---

### m1: Comments and arithmetic are used but never named

**Where:** `//` comments first appear at line 30 (`// prints 85`) and run through every listing; Ch 5 line 358 then asks the reader to "write the explanation as a code comment". Arithmetic: line 172 (`+ 1`) is the only operator shown, but Ch 6 uses `-`, `Math.abs`, and `leftStick - rightStick` with no introduction.

**Problem:** A zero-experience reader doesn't know that `//` text is ignored by the compiler. Some will type `// prints 85` thinking it matters, and some will delete comments thinking they are part of the code. The Java progression lists "variables, primitive types, `String`, `boolean`, printing, assignment", so arithmetic belongs here. Without it, Ch 6's arcade mix arrives with no footing.

**Fix:** After the first listing in §4.1 (line 31), add:

> **Comments.** Anything after `//` on a line is a **comment**: a note for humans. Java ignores it completely. This book uses comments to tell you what a line does, and you'll write your own from Chapter 5 on.

In §4.3, before "Changing a Variable's Value", add a four-row table: `+` add, `-` subtract, `*` multiply, `/` divide, with `double half = motorSpeed / 2;` as the example, and one line: "Dividing two `int`s has a surprise in it. Chapter 9 explains it."

---

### m2: Two different claims about where the missing-semicolon error points

**Where:** §4.3 line 139 ("The compiler will tell you exactly which line is missing one") and §4.5 Step 3 line 281 ("the compiler will point at the next line and complain").

**Problem:** These contradict each other. For Java, line 139 is right: `javac` reports `';' expected` on the line that's missing it, and VS Code underlines the end of that line. "Points at the next line" is a habit from other languages, and it sends a beginner to fix a correct line.

**Fix:** Line 281: "**Missing semicolon**: the error says `';' expected` and points at the end of the line that needs one."

**Source:** [javac error messages (Oracle troubleshooting)](https://docs.oracle.com/en/java/javase/17/troubleshoot/general-java-troubleshooting.html) [verify the exact VS Code wording]

---

### m3: "Updating 50 times per second" overstates what the dashboard sees

**Where:** §4.7 line 442 ("updating 50 times per second, with no print spam").

**Problem:** The code calls `put...` 50 times a second, but NetworkTables sends changes over the network at its default `periodic` rate of 0.1 s, so a dashboard sees about 10 updates a second. It doesn't matter for this chapter, but in Ch 15 and Ch 24 students look at fast signals and wonder why the dashboard is choppier than the log. That's the moment the book wants them to reach for AdvantageScope and the log, not the dashboard.

**Fix:** "Your code sends the values every loop, 50 times a second, and the dashboard redraws them several times a second. That's plenty for watching. (For every single loop, you'll use logs in Chapter 17.)"

**Source:** [WPILib: NetworkTables publish and subscribe](https://docs.wpilib.org/en/stable/docs/software/networktables/publish-and-subscribe.html) ("The default is 0.1 seconds") [verify whether `TimedRobot` flushes NetworkTables to the network every loop in 2026]

---

### m4: §4.8 misdescribes untyped languages and points at the wrong "custom types" example

**Where:** §4.8 line 452 ("Other languages (Python, JavaScript) don't require this"), line 465 ("In a language without types"), and the callout at line 471 (unit mismatches, `Rotation2d` in Chapter 14).

**Problem:** Python and JavaScript have types. They check them while the program runs, not before. A student who later learns Python will find "a language without types" wrong. The callout's best example of types catching unit bugs is the book's own Ch 16, where `Meters.of(0.5)` makes a unit mismatch a compile error, and it isn't mentioned.

**Fix:** Line 465: "In a language that checks types only while the program runs (like Python), that same mistake ..." In the callout, after the `Rotation2d` sentence: "In Chapter 16 you'll meet WPILib's units library, where mixing meters and inches is a build error, not a match-day surprise."

**Source:** [WPILib: Java units library](https://docs.wpilib.org/en/stable/docs/software/basic-programming/java-units.html)

---

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | §4.5 and §4.6 listings show the whole constructor; "Change your code to" deletes the earlier prints and the template's chooser lines (NPE in Autonomous) | |
| 2 | **BLOCKER** (VERIFY: MAJOR) | Deploy and RioLog: the XRP runs through Simulate Robot Code, and deploy sends nothing | B3. Raised to match Phase A's B3: as written, Step 4 never runs the student's code, and they see "success" |
| 3 | MINOR | §4.7 `robotPeriodic()` listing silently drops the Ch 2 `Status` line | |
| 4 | MINOR | `Match Time` key holds `Timer.getFPGATimestamp()`, not the match clock; Ch 5 calls it `Time` | |
| 5 | MINOR | "Blinking the LED": nothing blinks in this chapter | |
| 6 | MINOR | "(you added this in Chapter 2)": the template already imports `SmartDashboard` | |

---

## Verdict

A solid first-code chapter: the motivation comes before the syntax, the types are tied to robot values, and the "print for setup, dashboard for runtime" rule is a habit strong teams keep. The best-practice content is sound for a Ch 4. The problems are all in the first-hour experience: steps that don't run on the XRP (B3), listings that replace code the reader needs, and a false "anywhere in your code" claim that guarantees a confusing first `cannot find symbol`. Top three changes for Phase C:

1. Fix the run step (B3, VERIFY 2): Simulate Robot Code with the XRP Client, and prints in the terminal.
2. Show only the lines to add in §4.5 and §4.6, keeping the chooser lines (VERIFY 1).
3. Teach the one-sentence version of scope, and say why `onBoardIO` sits outside the methods (M1).
