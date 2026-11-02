<!-- counts: blocker=0 major=2 minor=11 build=pass -->

# Chapter 18 SME Review (Phase B, lightweight)

**Chapter:** `src/section-4-command-based/18-why-command-based.md` at HEAD (822 lines)
**Inputs:** `robot-programming-book-exercises/ch18-why-command-based/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

A good "why" chapter. It earns command-based with a concrete feature request instead of asserting it, maps the five growing pains onto the student's own `Robot.java`, and shows that `autoStep`/`startStep()` and `changeSysIdTest()` were hand-built schedulers. The kitchen analogy matches the real rules (one ticket per station, bumping, everything comes down at close). The Java load is right for the chapter: lambdas, three functional interfaces, method references revisited, capture and "effectively final", with the "now or later?" bug taught on purpose. The habits are current: `CommandScheduler.getInstance().schedule(...)` instead of the deprecated `Command.schedule()`, `cancel()` in `teleopInit()` as the template does, "never block the loop", and an honest "what it costs" section. The Build is small and leaves the robot running, as a bridge chapter should.

**Prose claims checked** (VERIFY.md checked the code, the API and the scheduler order against the 2026.2.1 source):
- "A command can ask not to be interrupted, and then the newcomer is refused" (line 276): that is `InterruptionBehavior.kCancelIncoming`. Right.
- "The 'New' is historical: it replaced an older command library that has since been retired" (line 501): right; the old command framework was deprecated in 2020 and removed later.
- "AdvantageKit's own templates are command-based robots with IO layers" (line 628): right. Source: [AdvantageKit Template Projects](https://docs.advantagekit.org/getting-started/template-projects/).
- "Command-based is what WPILib's documentation, templates, and examples are built around, [and] what PathPlanner expects" (line 661): fair; PathPlannerLib's `AutoBuilder` produces commands. Source: [What Is Command-Based](https://docs.wpilib.org/en/stable/docs/software/commandbased/what-is-command-based.html).
- Every Additional Resources link resolves, including **Treating Functions as Data** (checked 2026-11-01).

## New findings (Phase B)

### m1: The LED is called a subsystem, but nothing in the book ever requires it

**Where:** §18.3 table, line 136 ("The onboard LED | Light while autonomous runs, blink a warning"); Collab card, line 791 ("Blink warning (requires LED; ...)"); §18.7 line 475 ("The Explorer does not have any subsystems yet").

**Problem:** The chapter sorts the LED as a noun and has students act out a "Blink warning" that requires it, so two LED commands are refused or interrupted by the scheduler. But `autoLight` requires nothing, and in Ch 20 `lightTheLed()` still requires nothing (CLAUDE.md Ch 20 entry), so the book never builds the LED subsystem it describes here. Two LED commands with no requirement can run at once and fight, which is exactly growing pain 3 from §18.2. Students who learn "the LED is a subsystem" from this chapter will be confused when the code never treats it as one, and teams that copy the pattern get flickering LEDs from two commands.

**Fix:** Either (a) in §18.3, move the LED to its own row: "The onboard LED: a tiny output that, on the Explorer, only one command ever uses at a time, so it does not need to be a subsystem. On a competition robot with several LED patterns, teams usually make the LEDs a subsystem so the scheduler stops two patterns from fighting," and change the Collab card to "Blink warning (requires nothing; ...)"; or (b) keep the table and have Ch 19 or Ch 20 make a small `Led` subsystem. Option (a) is the smaller edit.

**Source:** [WPILib: Subsystems](https://docs.wpilib.org/en/stable/docs/software/commandbased/subsystems.html)

### m2: The `TurnToHeading` preview hard-codes its gains

**Where:** §18.4, line 205 (`new PIDController(0.3, 0.5, 0.0)`) and lines 211 to 212 (`enableContinuousInput(-180.0, 180.0)`, `setTolerance(2.0, 10.0)`).

**Problem:** The book has taught "no magic numbers" since Ch 8, and the student's own `Robot.java` holds these as `HEADING_KP`, `HEADING_KI`, and the tolerance constants. The first command class the student ever sees breaks that rule. It is labeled "do not type", but students copy what they see first, and Ch 19's real class uses `Drivetrain.createHeadingController()`. (VERIFY issue 10 covers the missing I zone and clamp in the same listing; this is a separate habit point.)

**Fix:** Write the line as `private final PIDController headingController = Drivetrain.createHeadingController();   // Chapter 19 writes this: your gains, tolerances, and I zone` and drop the two configuration lines from the constructor, or keep them with the named constants (`HEADING_KP` and so on) and a comment that Ch 19 moves them.

**Source:** book Ch 8 and Ch 19 (CLAUDE.md Ch 19 entry)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | The align as printed (it also ends when A is released) cannot reproduce the "starts spinning after re-enable" bug that motivates the chapter, Reflect 1 and the Collab; make it "press A, end at the heading" | |
| 2 | MAJOR | "Disabling cancels every command" is false for `waitSeconds`, `waitUntil`, `print` (they run when disabled), so Practice 3 has no correct answer from the chapter | |
| 3 | MINOR [verify on hardware] | DIO 1 starts on in the simulator, so the first "LED on" moment cannot be seen | |
| 4 | MINOR | `robotPeriodic()` listing rewords the first comment without saying so | |
| 5 | MINOR | Decorator table says `withName` "is the same command"; it returns a new wrapper | |
| 6 | MINOR | "Each factory can also be given the subsystems" is true only for `runOnce`, `run`, `startEnd` (not the wait and print factories) | |
| 7 | MINOR | "That is eleven lines": it is a dozen, plus a `package` line and an import | |
| 8 | MINOR | The forward-reference callout calls Ch 14's `odometry` "the same reason"; it was a related, run-time reason | |
| 9 | MINOR | "Two PID controllers shared by three different jobs": two jobs before the align exists | |
| 10 | MINOR | `TurnToHeading` preview drops Ch 15's I zone and turn-rate clamp | |
| 11 | MINOR | Diagnose bullet blames scheduling order for "LED goes off at once"; the order does not matter, a reversed `until` condition does | |

Covered by Phase A, not counted: Step 7.1 and the Diagnose list use the Sim GUI's **NetworkTables > SmartDashboard > Scheduler**, and line 654 names "the Scheduler widget": M2/D4 (Elastic's Scheduler widget). The Sim GUI's DIO window (lines 612, 739) and Robot State stay, per M2. Also note for Phase C: Step 7.4 ("disable the robot in the middle of leg 1") on the **simulated** Explorer will show the LED go out while the dot keeps driving, until Ch 17 VERIFY 1 is fixed; fixing that issue in Ch 17 fixes this check too.

## Verdict

The right chapter at the right moment: the concepts are accurate, the habits are current for 2026, and the Java is paced well. Both majors are in the motivation, not the Build: the headline bug does not happen with the code as printed, and the disabled rule is stated more broadly than WPILib implements it. Both have one-paragraph fixes in VERIFY.md. Top three changes for Phase C:

1. **VERIFY 1:** change the align to "press A, end at the heading" so the spinning-after-re-enable bug really happens, and keep Reflect 1 and the Collab consistent with it.
2. **VERIFY 2:** qualify the disabled rule ("every command that could move the robot"; WPILib's wait and print commands keep running), which also makes Practice 3 answerable.
3. **m1:** settle whether the LED is a subsystem, and make §18.3's table and the Collab card match what Ch 19 and Ch 20 actually build.
