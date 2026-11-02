<!-- counts: blocker=0 major=3 minor=6 build=pass -->

# Chapter 7 SME Review (Phase B, lightweight)

**Chapter:** `src/section-2-driving-sensing/07-classes-objects-and-the-xrp-hardware-layer.md` at HEAD (505 lines)
**Inputs:** `robot-programming-book-exercises/ch07-classes-objects-and-the-xrp-hardware-layer/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md. Build, API and listing checks were already done there.

The chapter is well paced for a zero-experience reader. The CAD-drawing analogy, the `ScoreKeeper` and `Wheel` toy classes, and the "encapsulation turns a fifty-file edit into a one-file edit" callout are exactly right, and the `Drivetrain` hardware layer is the correct shape to grow into a subsystem and an AdvantageKit IO layer later. The new findings are small. The biggest one is a safety habit that the book never teaches before the first time the robot moves under code.

## New findings (Phase B)

### M1: The robot moves for the first time, and nobody has told the student how to stop it

- **Where:** Build exercise, step 3 (line 458), and the "Spins in place" diagnosis (line 463). A grep of Ch 1 to 9 at HEAD finds no instruction on how to disable quickly; the first safety rules are in Ch 26.
- **Problem:** This is the first program in the book that enables motors. The diagnosis list expects a robot that may spin in place or drive backward off the table. A beginner who has never been told where Disable is will grab the robot or chase it. Strong teams drill "know your stop before you enable" from the very first enabled test, and the habit has to exist long before Ch 26 puts a 50 kg swerve in front of the same student. Ch 8 then hands the robot to a human driver with the same gap.
- **Fix:** Add a callout before step 3, in the book's voice:
  > **Know how to stop before you start**
  >
  > Before you click Enable, put your finger on the stop. In the Simulation GUI, that is the **Disabled** button in the Robot State panel. In the Driver Station, press **Enter** to disable, or **Space** for an emergency stop (after an emergency stop, restart the robot program). Keep the XRP on the floor, never on a table edge, and if all else fails, flip its power switch. Every time you enable a robot, from this XRP to a competition robot, you should already know how you will stop it.
  Repeat a one-line reminder in Ch 8 Build step 4 ("Finger on Disable, then enable").
- **Source:** [WPILib: FRC Driver Station](https://docs.wpilib.org/en/stable/docs/software/driverstation/driver-station.html) (keyboard shortcuts: Enter disables, Space e-stops); [WPILib: Simulation GUI](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/simulation-gui.html) (Robot State panel)

### m1: §7.3 says the dot puts an object on the left, then cites a static call as the example

- **Where:** §7.3, line 125: "The object goes on the left of the dot ... You have used this since Chapter 4, every time you wrote `SmartDashboard.putNumber(...)`."
- **Problem:** `SmartDashboard.putNumber` is the chapter's own example of a **static** call on a class (§7.9, line 396). A careful student reads line 125, then reads §7.9, and finds the book contradicting itself on the very distinction it is teaching.
- **Fix:** "The object goes on the left of the dot; the thing you want it to do goes on the right. You have been using dots since Chapter 4, in lines like `SmartDashboard.putNumber(...)`. That one has a class, not an object, on the left, and Section 7.9 explains the difference."
- **Source:** none needed (internal consistency)

### m2: "Wasteful and buggy" undersells what actually happens when `new Drivetrain()` sits in a periodic method

- **Where:** §7.8, line 374: "you would build a brand new drivetrain fifty times a second, which is both wasteful and buggy."
- **Problem:** It doesn't just waste time. The second `new XRPMotor(0)` throws `IllegalArgumentException: XRPMotor 0 already allocated` and the program stops (VERIFY API checks; the answer key's "Check yourself" shows the stack trace). Naming the real error gives the student something to recognize when it happens, and it is a better reason than "wasteful" for the "create once" rule.
- **Fix:** "...you would try to build a brand new drivetrain fifty times a second. It will not even get to the second one: WPILib allows only one `XRPMotor` object per channel, so the second `new XRPMotor(0)` stops the program with `XRPMotor 0 already allocated`. Hardware is created once."
- **Source:** VERIFY.md API checks (`XRPMotor.checkDeviceAllocation`)

### m3: `static` vs instance is on the Ch 7 syllabus, but the student never writes or tests it

- **Where:** §7.9, lines 394 to 399 (one paragraph); the Practice (lines 471 to 478). The CLAUDE.md Java skills progression lists "`static` vs instance" for Ch 7, and Ch 8 §8.5 builds `static final` on it.
- **Problem:** The only `static` content is a rule of thumb about capital letters. No exercise asks the student to make something `static`, so the answer key's most likely bug ("`private static double voltage;` shares one copy between batteries") is something the student has never seen. Ch 8 then says "Back in Chapter 7, every `ScoreKeeper` got its own copy" and leans on an idea the student has only read about.
- **Fix:** Add one optional step to the Practice: "Add a `private static int batteriesMade = 0;` field, add one to it in the constructor, and print it after creating both batteries. Then remove `static` and run again. Explain why the first version prints `2` and the second prints `1` for each battery." That is five lines and makes §7.9 and §8.5 concrete.
- **Source:** CLAUDE.md, Java skills progression (Ch 7)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | §7.8 says "starting from your Chapter 5 skeleton" and the whole-file listing silently drops the Ch 5 and Ch 6 work; merging it into the Ch 6 file keeps Ch 6's motor fields and crashes with "XRPMotor 0 already allocated" | none |
| 2 | MAJOR | §7.6 line 250 says `rotation` "positive turns right"; WPILib says counterclockwise (left) is positive. Ch 8 patches it with a correction callout instead | none |
| 3 | MINOR | Build diagnosis: inverting the left motor "instead" still spins; only removing the inversion fixes a spin, and "invert both" for backward is ambiguous | none |
| 4 | MINOR | `arcadeDrive(0.6, 0.0)` squares to about 0.36 power, hidden until Ch 8 | none |
| 5 | MINOR | The template's `XRPDrivetrain.java` is still in the project and never mentioned, so Reflect question 1 is false while it sits there | none |
| (not counted) | | "Build, deploy ... Driver Station" in Build step 3 and "redeploy" | B3 |

## Verdict

Chapter 7 teaches the most important organizing idea in the book with the right pace and the right robot motivation, and its `Drivetrain` is a sound hardware layer that later chapters can grow. Nothing here is wrong in a way that blocks a reader, but the chapter has three real gaps. Top three changes for Phase C:

1. Fix the §7.8 listing hand-off (VERIFY 1): start from the Ch 6 file, and say plainly that the motor fields and helpers go away and why.
2. Correct the rotation sign at the source (VERIFY 2), then delete Ch 8's "Correction to Chapter 7" callout.
3. Add the "Know how to stop before you start" callout before the first enabled motion (M1).
