<!-- counts: blocker=0 major=0 minor=8 build=pass -->

# Chapter 13 SME Review (Phase B, lightweight)

**Chapter:** `src/section-3-autonomous-control/13-kinematics-how-movement-is-calculated.md` at HEAD (1067 lines)
**Inputs:** `robot-programming-book-exercises/ch13-kinematics-how-movement-is-calculated/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This is a strong chapter. The marching band derivation, the "add them, subtract them" route to forward kinematics, and the "check it with the units" habit are exactly how a good mentor teaches this at a whiteboard. Putting the kinematics and the speed-to-power step inside `Drivetrain`, with callers speaking only `ChassisSpeeds`, is the same shape strong teams use (a `drive(ChassisSpeeds)` / `runVelocity(ChassisSpeeds)` entry point, as in the AdvantageKit templates), and it pays off cleanly in Ch 15 and 16. The Java thread (objects as parameters and return values, mutate vs return-new, two references to one object) is motivated by a real need (a method that returns two numbers) and fits the 1-to-2 concept budget. Length is acceptable for a concept chapter.

**Prose claims checked** (not covered by VERIFY.md):
- "90 RPM with no load at 4.5 volts", 60 mm wheels, 155 mm trackwidth (§13.8, Resources): the XRP page says "a no-load output speed of 90 RPM at 4.5V", 60 mm wheels, 155 mm trackwidth. Correct. Source: [Getting to know your XRP](https://docs.wpilib.org/en/stable/docs/xrp-robot/getting-to-know-xrp.html)
- "WPILib's own documentation for its kinematics class says ... the empirical value may be larger than the physical one because of scrubbing" (§13.4, line 265): the `DifferentialDriveKinematics` constructor Javadoc says "the empirical value may be larger than the physical measured value due to scrubbing effects." Correct. `toTwist2d` "from the given left and right side distance deltas" (line 269): correct. Source: [`DifferentialDriveKinematics` Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/math/kinematics/DifferentialDriveKinematics.html)
- Ch 12 back-references (feedforward "has three parts" at line 543, `kS` named in Ch 12, Ch 10's "already allocated" for a second `XRPMotor` at line 371, the Ch 9 Y-button zero used by Practice 2): all present at HEAD.

## New findings (Phase B)

### m1: A Diagnose item tells the student to print a `private` method

- **Where:** Build, Diagnose, line 1009 ("Print `speedToPower(0.20)` or check the constant").
- **Problem:** `speedToPower` is `private` in `Drivetrain` (line 680, and the walk-through at line 763 stresses that it is a private helper). A student who adds `System.out.println(drivetrain.speedToPower(0.20))` to `Robot.java` gets `speedToPower(double) has private access in Drivetrain`, a second problem on top of the one they were diagnosing. A beginner may then "fix" it by making the method public, which undoes the encapsulation lesson.
- **Fix:** "**The robot does not move at all in autonomous:** `MAX_WHEEL_SPEED_METERS_PER_SECOND` may be much larger than it should be (a typo like `2.8`), making every power tiny. Check the constant. If it looks right, add a temporary `System.out.println(...)` **inside** `drive()` that prints the two powers it sends, and remove it when you are done."
- **Source:** the Section 13.8 listing (line 680)

### m2: The "how to tell them apart" rule is overstated, and Chapter 27 breaks it

- **Where:** §13.7, line 487 ("A `void` method that is called on an object almost always changes that object; there is nothing else for it to do. A method that returns the same class almost always leaves the original alone and hands you a new one.")
- **Problem:** Both halves are rules of thumb that fail on code the student meets soon. A `void` method often changes something else entirely (`drivetrain.stop()` changes the motors, `System.out.println` changes nothing in its object). And Ch 27 §27.7 teaches "methods that return `this`": Phoenix 6's `VoltageOut.withOutput(volts)` returns the same class **and** changes the original. A student who learned "returns the same class, so the original is untouched" will reason wrongly about the reused `driveRequest` field. The reliable answer is the Javadoc, which this paragraph also mentions.
- **Fix:** Replace the last two sentences with: "The return type is a strong hint. A `void` method cannot hand you anything, so if it does something to the object, it must change it in place. A method that returns the same class **usually** builds a new one, but not always (Chapter 27 shows a kind that changes the object **and** returns it). When it matters, read the method's Javadoc: it says which one it does."
- **Source:** Ch 27 §27.7 at HEAD ("Methods That Return `this`", lines 519 to 536: `withOutput` "**is** the request itself")

### m3: Practice 4 retypes the drivetrain's constants as bare numbers in `Robot.java`

- **Where:** Practice 4, lines 986 to 990 (`2.0 * 0.28 / 0.155`, `* 0.28`).
- **Problem:** The chapter just spent a callout on "name your units" and moved the top speed and trackwidth into `Drivetrain` so they live in one place. Practice 4 then copies both as magic numbers into teleop. A student who keeps the velocity teleop (the exercise invites it) now has two copies of the top speed, and the next re-measurement (which the chapter says to do with new batteries) will update only one. This is the habit Ch 8 introduced named constants to prevent.
- **Fix:** Give `Drivetrain` two small getters, or make the two constants `public` now (Ch 17 makes them `public static final` anyway): "In `Drivetrain`, change `MAX_WHEEL_SPEED_METERS_PER_SECOND` and `TRACKWIDTH_METERS` from `private` to `public`. Then use them by name: `double maxTurnRadiansPerSecond = 2.0 * Drivetrain.MAX_WHEEL_SPEED_METERS_PER_SECOND / Drivetrain.TRACKWIDTH_METERS;` and `limitedForward * speedScale * Drivetrain.MAX_WHEEL_SPEED_METERS_PER_SECOND`. A number that describes the drivetrain should be written down in exactly one place."
- **Source:** CLAUDE.md, Ch 8 ("no magic numbers") and Ch 17 Build (constants become `public static final`)

### m4: The feedforward callout calls `1 / topSpeed` a voltage, but the code works in power

- **Where:** §13.8 callout "You just wrote your first feedforward", line 543 ("a rough version of one of them, called **kV**: how much extra voltage each extra meter per second needs").
- **Problem:** The code divides by top speed to get a **power** (-1 to 1), not a voltage. In Ch 16 the student meets kV as about 18 V per m/s (pretend volts, power times 6.0), and will compare it with `1 / 0.28 = 3.6`. The units don't match, and a student who took "voltage" literally here will think one of the two numbers is wrong. The idea is right; the unit word is off by one chapter.
- **Fix:** "a rough version of one of them, called **kV**: how much extra push each extra meter per second needs. Here the push is a power (`1 / 0.28`, about 3.6 power per meter per second); in Chapter 16 you will measure it in volts, so the number will look different even though it means the same thing."
- **Source:** CLAUDE.md, Ch 16 Build (`NOMINAL_BATTERY_VOLTS = 6.0`, "pretend volts" = power x 6.0)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | §13.3 callout's "left 0.21, right 0.5" is right only with squaring off; Ch 8's two-argument (squared) `arcadeDrive` gives 0.18 and 0.25 | none |
| 2 | MINOR | `tankDrive` applies `DifferentialDrive`'s default 0.02 deadband (with rescaling), so "sends them more or less straight" hides an extra step; suggest `diffDrive.setDeadband(0.0)` once `drive()` exists | none |
| 3 | MINOR | Diagnose "top speed too small ... `tankDrive` caps power at 1.0, but the turn will be the wrong shape" is wrong: `desaturate` runs first, so powers are exactly 1.0 and the shape is kept | none |
| 4 | MINOR | "Only two parts of `Robot.java` change" and "Everything else stays" forget the import and the two `Measured` widgets from §13.8 | none |
| (not counted) | | Build step 3 "put `Measured Turn` next to ... on your dashboard and save the layout": do it in Elastic | D4, M2 |
| (not counted) | | `TRACKWIDTH_METERS` / "trackwidth" spelling vs Ch 28's `TRACK_WIDTH_METERS` | m1 (Phase A) |
| (not counted) | | Ch 12 top speed vs Ch 13's 0.28 m/s (counted in Ch 12 issue 1) | none |

## Verdict

Ready for Phase C with small edits. Nothing here is wrong in a way that would mislead a student about kinematics; the issues are a diagnose step that can't be followed as written, a rule of thumb that the book itself breaks in Ch 27, and a practice exercise that reintroduces magic numbers. Top three changes for Phase C:

1. Fix the two Diagnose items that don't work as written: printing the private `speedToPower` (m1) and the "turn will be the wrong shape" claim (VERIFY 3).
2. Soften the mutate-vs-new rule of thumb and point to the Javadoc, so Ch 27's `withOutput` does not contradict it (m2).
3. Decide the deadband question once for the drivetrain (VERIFY 2: `setDeadband(0.0)` in the constructor is the cleaner choice) and fix the §13.3 squared-inputs numbers (VERIFY 1), since both affect what students see on the dashboard.
