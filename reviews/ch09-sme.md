<!-- counts: blocker=0 major=0 minor=8 build=pass -->

# Chapter 9 SME Review (Phase B, lightweight)

**Chapter:** `src/section-2-driving-sensing/09-all-the-xrp-sensors.md` at HEAD (869 lines)
**Inputs:** `robot-programming-book-exercises/ch09-all-the-xrp-sensors/VERIFY.md` and `answer-key.md`, `reviews/00-book-wide.md`
**Scope:** best practice, pedagogy, and prose claims not covered by VERIFY.md.

This chapter teaches sensors the way experienced mentors do: every sensor is "a measuring instrument that is a little bit wrong", each gets a hands-on test while disabled, and §9.9's "which sensor for which job" table makes a solid case for sensor fusion. The "encoders and gyro live in `Drivetrain`, world sensors live in `Sensors`" rule is the split the book keeps through Ch 24's `SensorsIO`, and "put the unit in the name" is a habit every strong team enforces. At 869 lines, with five sensors, two Java topics and two new classes, it is the longest chapter in Section II, but each section is short and hands-on, so the load is acceptable.

**Prose claims checked against the WPILib XRP hardware page** (VERIFY.md listed these as not verifiable without hardware): 12 CPR and 48.75:1 giving 585 counts per wheel turn, the 60 mm wheel, the **155 mm trackwidth** (§9.9), "by default, the encoders count up when the XRP moves forward" (§9.2 line 89), IMU calibration for 3 to 5 seconds with "the green LED blinking rapidly" (§9.4 line 211), a 3-axis accelerometer on board, a rangefinder range of 20 mm to 4000 mm (§9.6 line 446), and reflectance from pure white to pure black (§9.7). All match. Source: [Getting to know your XRP](https://docs.wpilib.org/en/stable/docs/xrp-robot/getting-to-know-xrp.html).

## New findings (Phase B)

### m1: Two forward pointers name the wrong chapter

- **Where:** §9.2 gear-ratio callout, line 51 ("on the Mini Swerve's brushless motors in Chapter 27"), and §9.4 "Every sensor lies a little" callout, line 233 ("in Chapter 30 you will add camera measurements").
- **Problem:** Ch 27 reads its motors in motor units on purpose. Gear ratios arrive in Ch 28 (`DRIVE_GEAR_RATIO`, `SensorToMechanismRatio`). Camera measurements are fused in Ch 33 (vision); Ch 30 is the pose estimator with wheels and gyro. A student who jumps ahead to check finds nothing there.
- **Fix:** Line 51: "on the Mini Swerve's drive and steering gears in Chapter 28". Line 233: "in Chapter 30 you will build a pose estimator, and in Chapter 33 you will feed it camera measurements that correct the slow errors of both."
- **Source:** CLAUDE.md Build progression (Ch 27, Ch 28, Ch 30, Ch 33)

### m2: "Bury RioLog" is wrong for the XRP

- **Where:** §9.8 "Print for setup, dashboard for runtime" callout, line 718.
- **Problem:** The XRP program runs on the laptop, so prints go to the VS Code terminal, not RioLog. Ch 10 line 233 says exactly this, so the student is told one thing in Ch 9 and corrected in Ch 10. It's the same root as B3, but this line isn't in B3's list.
- **Fix:** "Printing twenty values fifty times a second would bury the VS Code terminal in a thousand lines a second."
- **Source:** [WPILib: Programming the XRP](https://docs.wpilib.org/en/stable/docs/xrp-robot/programming-xrp.html) ("an XRP project runs on your development computer"); Ch 10 at HEAD, line 233

### m3: "Integrate that rate ... fifty times a second" suggests your code does the integrating

- **Where:** §9.4, line 189.
- **Problem:** The integration happens in the XRP's firmware, on the IMU's own schedule, and `getAngle()` returns the running total. Read as written, a beginner pictures `robotPeriodic()` adding up turns, and later wonders why the heading keeps changing while their code is stopped at a breakpoint. The idea (rate added up over time gives heading) is right and is a good preview of odometry.
- **Fix:** "Add up that rate over time, many tiny turns every second, and you get the robot's **heading** ... The XRP does that adding for you, inside its own firmware, and `getAngle()` hands you the total."
- **Source:** [`XRPGyro` Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj/xrp/XRPGyro.html) (angle values come from the XRP over the simulation link)

### m4: The wall stop chatters at the threshold, and the chapter's own noise callout sets up a hysteresis sprinkle it doesn't take

- **Where:** §9.6 "Noise and filtering" callout (line 458) and the wall stop at line 690.
- **Problem:** With one threshold and a noisy rangefinder, a robot creeping up on the 20 cm line flickers between blocked and not blocked from loop to loop: the `Blocked` widget flashes and the robot stutters. A student who sees this will think the code is broken. Ch 21 teaches chatter, debounce and hysteresis in full, so this is a perfect spot for a two-sentence preview, as CLAUDE.md's "sprinkle" thread asks.
- **Fix:** Add to the end of the "Noise and filtering" callout: "Near the 20 cm line, you may see `Blocked` flicker as the reading wobbles across the threshold. Engineers call that **chatter**. One fix is two thresholds (stop at 20 cm, but only let go again at 25 cm), called **hysteresis**, and you will build it in Chapter 21."
- **Source:** CLAUDE.md, Ch 21 concepts (chatter, debounce, hysteresis)

### m5: The wall stop is framed as keeping the robot "safe", which overclaims what one ultrasonic sensor can do

- **Where:** "The robot just got a reflex" callout, line 714 ("the robot's sensors keep it safe"), next to §9.6's list of ways the rangefinder misses things (soft, angled, off to the side, too close).
- **Problem:** The interlock idea is right, and real robots use them. But a beginner should leave knowing that a single sensor interlock is a convenience that fails in known ways, and that the safety system is still the driver and Disable. That's the habit teams want before a student writes soft limits on an arm in Ch 34.
- **Fix:** Add one sentence to the callout: "A reflex like this helps the driver, but it is not a safety system: you just saw four ways the rangefinder can miss a wall. The real safety system is still a person with a finger on Disable."
- **Source:** none needed (it follows from §9.6)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MINOR | Build step 1 and §9.5 say to remove only the temporary encoder **fields**, but the two `Count` lines in `robotPeriodic()` also have to go, or "Build and confirm `BUILD SUCCESSFUL`" fails with `cannot find symbol` | none |
| 2 | MINOR | "Correction to Chapter 6" callout patches Ch 6 (`getDistanceMeters() < 0.20`) instead of fixing Ch 6 | none |
| 3 | MINOR | The listing quietly drops Ch 8's `Forward Cmd`/`Rotation Cmd` widgets, and the "what changed" list doesn't say so | none |
| (not counted) | | "open SmartDashboard ... View > Editable ... File > Save" (line 722) and Build step 4 (line 806): build and save the sensor layout in Elastic | D4, M2 |

Also note: `SmartDashboard.putBoolean("Slow Mode", speedScale == SLOW_MODE_SCALE)` at line 696 repeats the Ch 8 pattern; see `ch08-sme.md` m2. It is not counted again here.

## Verdict

Chapter 9 is technically sound. Every hardware number it gives matches the official XRP page, and the listings build. The design (getters with units in the names, drivetrain sensors vs world sensors, raw and converted values side by side) is what you would want a rookie to copy for years. What's left is consistency: wrong chapter pointers, a RioLog mention for a program that has no RioLog, and the edit steps that make a non-typist's build fail. Top three changes for Phase C:

1. Fix Build step 1 so the reader also removes the two `Count` lines (VERIFY 1), since it's the one place a careful student gets a failed build.
2. Move the sensor dashboard to Elastic and have students save the layout here (D4, M2), so the Ch 10 "saved layout" reference works.
3. Fix the forward pointers and the RioLog line (m1, m2), and add the chatter and hysteresis sprinkle (m4).
