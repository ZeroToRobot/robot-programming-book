<!-- counts: blocker=2 major=1 minor=6 build=pass -->

# Chapter 2 SME Review (Phase B, lightweight)

**Chapter:** `src/section-1-foundations/02-setting-up-your-environment.md` at HEAD (541 lines)
**VERIFY file:** `robot-programming-book-exercises/ch02-setting-up-your-environment/VERIFY.md` (build=pass, 4 issues)
**Phase A items re-checked:** B2 (pinned 2026.2.1 link, installer names, "Which year?" rule, versions table) and the §2.2 OS line are applied correctly. B3 (deploy) and M2 (SmartDashboard app) are still open at HEAD, as expected.

## New findings (Phase B)

### B1: The Driver Station is not a WPILib tool, and macOS and Linux have none

**Where:** §2.8 "Connect the Xbox Controller", lines 421 to 426 (`WPILib: Start Tool` > `Driver Station`); §2.9 step 5, line 440 ("enable the robot in Driver Station"); Build step 3, line 501 ("confirm the Driver Station shows green for Communications and Robot Code").

**Problem:** `WPILib: Start Tool` lists the WPILib tools (Elastic, AdvantageScope, Glass, SysId, and so on); the FRC Driver Station isn't one of them. It is NI's program, installed separately with the **FRC Game Tools**, and it runs only on Windows 10 and 11. So every reader fails this step, and a Mac or Linux reader has no way to finish the Build exercise at all. For the XRP, the control window is the **Simulation GUI** that opens with **WPILib: Simulate Robot Code** (B3): its **Robot State** panel enables and disables, and its **System Joysticks** panel shows the controller. On Windows the real Driver Station can also connect to it through the "Sim DS Socket" extension (the template's `build.gradle` already has `wpi.sim.addDriverstation()`), but that is optional.

**Fix:** Rewrite §2.8's controller step, in the same Phase C pass as B3:

"Plug in your Xbox controller. In the **Simulation GUI** window that opened when you ran your program, find the **System Joysticks** panel: your controller should be listed there. You won't use it until Chapter 8, but checking now avoids surprises later.

> **What about the FRC Driver Station?**
>
> On a competition robot you'll use NI's **FRC Driver Station** (Windows only, installed with the FRC Game Tools). The XRP doesn't need it: the Simulation GUI does the same jobs. Chapter 26 installs it."

Build step 3 becomes: "Run it (`WPILib: Simulate Robot Code`, with **XRP Client** and **Sim GUI** checked) and confirm that the Simulation GUI opens and the **Status** value appears." §2.9 step 5: "enable the robot in the Simulation GUI's Robot State panel".

**Source:** [WPILib: Installing the FRC Game Tools](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-2/frc-game-tools.html) (Driver Station is part of Game Tools; requires Windows 10 or higher); [WPILib: Programming the XRP](https://docs.wpilib.org/en/stable/docs/xrp-robot/programming-xrp.html)

### M1: The Git exercise runs Git before Chapter 3 installs and configures it

**Where:** Exercises, Git, lines 517 to 528.

**Problem:** The WPILib installer doesn't install Git, and `user.name`, `user.email` and `init.defaultBranch` are set only in Ch 3 §3.3. On a fresh Windows laptop, `git init` fails with "'git' is not recognized". Where Git is present but unconfigured, `git commit` stops with "Author identity unknown ... Please tell me who you are", so the commit never happens, and the branch is often `master`. Ch 3 §3.6 already has to patch around this ("If for any reason the repo wasn't initialized", `git branch -M main`). The CLAUDE.md build plan also puts the repo's first init in Ch 3. A beginner's first terminal experience is an error the book hasn't explained.

**Fix:** Move the exercise to Ch 3 §3.6 and replace it here with:

"### Git

Nothing to do yet. In Chapter 3 you'll install Git, turn this project into a repository, and put it on GitHub. Leave the project as it is."

Then Ch 3 §3.6 starts with `git init` and the first commit (message `Ch3: project from the WPILib XRP template`), and its "If you followed Chapter 2's Git exercise" paragraph and the `git branch -M main` step can go.

### m1: The "SmartDashboard vs. Shuffleboard" callout promises a chapter that doesn't exist

**Where:** §2.8 callout, lines 413 to 417 ("Chapter 23 covers Shuffleboard in depth"), and §2.1 line 29 ("opening tools like SmartDashboard and Shuffleboard").

**Problem:** Ch 23 says both apps are deprecated and never uses Shuffleboard. Under D4 the book never opens either app. M2's change table lists §2.8's "Open SmartDashboard" step and the Exercises, but not this callout or line 29, so Phase C could miss them.

**Fix:** Delete the callout and replace it with:

"> **Why it's called SmartDashboard**
>
> The Java class is named `SmartDashboard` for history. Every modern dashboard, including Elastic, reads what it publishes."

Line 29: "opening tools like Elastic and AdvantageScope".

**Source:** M2, D4 in `reviews/00-book-wide.md`

### m2: The firmware download is "latest", the one install the book doesn't pin

**Where:** §2.4 Step 1, line 131 ("find the latest release at the top of the page"), and the Resources line 536 ("always use the firmware version that matches your WPILib installation year").

**Problem:** The two lines disagree, and neither can be followed exactly: firmware releases are numbered v2.1.0, v2.0.1 and so on, not by year. B2 pinned everything else for the same reason. A firmware release made for WPILib 2027 could change the protocol [verify]. The current release, v2.1.0 (17 Oct 2025), matches the example filename on line 133.

**Fix:** Line 131: "Go to the **[XRP firmware v2.1.0 release](https://github.com/wpilibsuite/xrp-wpilib-firmware/releases/tag/v2.1.0)**, the firmware for WPILib 2026, and download `xrp-wpilib-firmware-2.1.0-aa439f0.uf2` (or the `beta` file, see below)." Add a row to the versions table: `| XRP firmware | **2.1.0** | This chapter |`. Line 536: "use the firmware version in the versions table".

**Source:** [xrp-wpilib-firmware releases](https://github.com/wpilibsuite/xrp-wpilib-firmware/releases)

### m3: The reader enables a robot before learning how to stop one

**Where:** §2.9 step 5, line 440, and the Build exercise.

**Problem:** The template doesn't drive the motors, so nothing moves in Ch 2. But this is where the "enable" habit starts, and no section of Ch 2 to 8 says how to disable before the robot first drives (Ch 26 is the first chapter to teach Enter and Space). Strong teams drill "know how to stop it before you start it" from day one.

**Fix:** Add a short callout after the enable step:

"> **Know how to stop it first**
> Before you enable any robot, know how to disable it. In the Simulation GUI, click **Disabled** in the Robot State panel. With the FRC Driver Station, **Enter** disables and the **space bar** is an emergency stop. Make it a habit now, before your code can move anything."

**Source:** [WPILib: Driver Station keyboard shortcuts](https://docs.wpilib.org/en/stable/docs/software/driverstation/driver-station.html)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 0 | BLOCKER | §2.7 Step 4, §2.9, Summary, Build: "Deploy to the XRP". XRP code runs through Simulate Robot Code with the XRP Client; the "XRP reboots on every deploy" callout, §2.10's jar-on-the-XRP story, line 7 and the Reflect question "build error vs deploy error" all go with it (the Reflect question becomes "a build error vs a connection error") | B3 |
| 1 | MINOR | §2.7 Step 2 omits `XRPDrivetrain.java`, which the 2026 template includes | |
| 2 | MINOR | §2.8 says to add the `SmartDashboard` import; the template already has it | |
| 3 | MINOR | §2.8 "Open SmartDashboard" becomes the first Elastic launch | M2 (D4) |

## Verdict

The install sections (§2.2 to §2.6) are careful and accurate: the pinned installer, the versions table, the beta vs V1 firmware callout and the Wi-Fi defaults all match the 2026 docs, and the length is right for a setup chapter. The problems are all in the "run it" half, which is the moment a beginner most needs to succeed: the chapter deploys to a robot that has no deploy target (B3) and checks the result in a Driver Station that isn't installed and doesn't exist on two of three operating systems (B1). Top three changes for Phase C: (1) rewrite §2.7 Step 4 to §2.10 and the Build exercise around Simulate Robot Code and the Simulation GUI, fixing B3 and B1 together, with the "know how to stop it" callout (m3); (2) move the Git exercise into Chapter 3 (M1); (3) make §2.8 the first Elastic launch and remove the Shuffleboard callout (M2, m1).
