# Chapter 26: From XRP to roboRIO

The Explorer is finished. It is tagged `v1.0.0`, its release page has a green check and a video, and it is still sitting on your desk, ready for the next idea you want to try. Over twenty-five chapters it taught you how a robot program is shaped, how to make a robot move accurately, how to test code without a robot, and how to work on code with other people.

This chapter starts Section VI and a new robot: the **Mini Swerve**. It is a real FRC control system on a small chassis: a **roboRIO** for a brain, **SPARK MAX** motor controllers on a **CAN bus**, brushless motors, a **navX** gyro, a camera, a radio, and a 12-volt battery that can push a lot of current. By the end of Section VI it will drive in any direction while spinning, follow paths drawn on a field, and find its place on the field by looking at AprilTags.

Not today, though. Today the Mini Swerve does not move at all, and that is on purpose. Before you spin a single motor, you will move your **program** onto the robot, and that is a bigger change than it sounds. On the Explorer, your code ran on your laptop. On the Mini Swerve, it runs on the robot, and almost everything you know about building, deploying, printing, logging, and crashing changes a little because of it.

By the end of this chapter, you and your team will have:

- a robot **fact sheet** for your Mini Swerve, written from the real robot,
- a brand-new command-based project in a shared team repository, with the Explorer's best habits copied in: AdvantageKit, Git metadata in every log, tests, and CI,
- a real **deploy** to a real roboRIO, with the output in **RioLog**,
- a first subsystem for the new robot, `RoboRio`, with an IO layer, that measures **real battery volts**, warns about a tired battery, and lights the roboRIO's **RADIO** light during autonomous,
- six tests, green on every push,
- a log of the run on a USB stick in the robot, opened in AdvantageScope.

On the Java side, you will learn two things the move makes urgent. First, **bytecode and the JVM**: why the very same compiled program can run on your laptop and on a roboRIO with a completely different kind of processor. Second, **catching exceptions** with `try` and `catch`: what happens when your code crashes on a real robot, and why the right number of `catch` blocks in robot code is usually smaller than you think.

This chapter needs the Mini Swerve, a charged robot battery, a USB stick, and a laptop with WPILib 2026 and the FRC Game Tools (for the Driver Station). It works best in your Mini Swerve team, with one person at the keyboard and everyone watching the robot.

---

## 26.1 Where Your Code Runs Now

Think back to how the Explorer worked. You pressed a button in VS Code, and your program started... on your laptop. Chapter 10 pointed this out (Section 10.4): an XRP program runs on the laptop, inside WPILib's simulator, and an extension called the XRP client sends motor commands to the XRP over Wi-Fi and brings its sensor readings back. The XRP itself never ran a line of your Java. That is why your prints showed up in VS Code's terminal, why your logs landed in your project's `logs` folder, and why `ROBOT_MODE` had to be set by hand: as far as WPILib could tell, it was always running in simulation.

> **A correction to Chapter 2**
>
> Chapter 2 described a deploy as "the `.jar` file was transferred to the XRP." For the XRP, that was not quite right: nothing was copied anywhere, and your program ran on your laptop the whole time. The steps Chapter 2 described are exactly what happens on a roboRIO, which is what you will do in Section 26.7. Chapter 2 was describing this chapter.

A roboRIO is different. It is a small computer, built for robots, with a processor, memory, an operating system (a version of Linux), and Java installed on it. When you **deploy** to a roboRIO, your program is packed into a single file, copied onto the roboRIO over a cable or Wi-Fi, and started **there**. Your laptop's job shrinks to two things: it runs the **Driver Station**, which enables and disables the robot and sends it your controller's buttons and sticks, and it runs whatever dashboards you want to watch.

Unplug the laptop from an XRP mid-run, and the program keeps running on the laptop with nothing to drive. Unplug the laptop from a roboRIO, and the program keeps running on the **robot**, but the Driver Station link is gone, so the robot disables itself within a fraction of a second. That is a safety rule built into every FRC robot: no Driver Station, no motion.

Almost everything else follows from that one move:

| | On the Explorer | On the Mini Swerve |
|---|---|---|
| Where your program runs | Your laptop (simulator plus XRP client) | The roboRIO, on the robot |
| What "deploy" does | Starts the program on your laptop | Copies a `.jar` to the roboRIO and starts it there |
| What enables the robot | The Simulation GUI, or the Driver Station | The Driver Station, only |
| Where `System.out.println` appears | VS Code's terminal | **RioLog** in VS Code, and the Driver Station's console |
| Where logs are written | `logs/` in your project | A USB stick in the roboRIO |
| What `RobotBase.isReal()` says | Always `false` | `true` on the robot, `false` in simulation |
| Where NetworkTables lives | Your laptop (`localhost`) | The roboRIO, reached by team number |
| What the battery is | Four AA cells your code cannot measure | A 12-volt battery the roboRIO measures fifty times a second |
| What a crash does | Your program stops on your laptop | The robot loses its code for a few seconds, wherever it is |

Read the last row twice. A crash on the Explorer was an annoyance. A crash on a competition robot happens in the middle of a match, with the robot on the field and your alliance counting on it. Section 26.10 is about exactly that.

> **RioLog, at last**
>
> Chapter 4 told you prints go to RioLog, and Chapter 10 told you that for the XRP, they actually went to the terminal. RioLog is a window in VS Code that connects to a roboRIO and shows everything the program on it prints. From this chapter on, it is real: deploy, and RioLog opens by itself.

---

## 26.2 Meet the Mini Swerve

Before you write any code for a robot, you should know exactly what is on it. On the Explorer, the XRP was the same for everyone, so the book could tell you its wheel size and its encoder counts. The Mini Swerve is built by your team, and teams build them differently. So the first job is to walk around the robot and write down what is really there.

Here is what every Mini Swerve has, and the chapter where your code first talks to it:

| Part | What it does | First code |
|---|---|---|
| **roboRIO** (1 or 2) | Runs your program. Has the CAN port, USB ports, Ethernet, a built-in accelerometer, status lights, and a few buttons | This chapter |
| **Battery** and **main breaker** | A 12-volt lead-acid battery, and a 120-amp breaker that is the robot's on/off switch | This chapter (measured by the roboRIO) |
| **Power distribution** (PDH or PDP) | Splits battery power into a channel per device, each with its own breaker or fuse, and can measure each channel's current | Chapter 27 |
| **Radio** | The robot's Wi-Fi, linking the roboRIO to the Driver Station laptop | This chapter (as a network) |
| **Four swerve modules** | Each has a **drive** motor that spins the wheel and a **steer** motor that points it, so each wheel can roll in any direction | Chapter 27 (spin), Chapter 28 (math) |
| **SPARK MAX** motor controllers | One per motor, eight in all, chained together on the **CAN bus** | Chapter 27 |
| **Absolute encoders** | One per module, telling the code which way each wheel points, even right after power-on | Chapter 28 |
| **navX** | A gyro and accelerometer board, usually plugged into the roboRIO's MXP port, for the robot's heading | Chapter 29 |
| **Camera** | Sees AprilTags on the field | Chapter 33 |

> **Swerve in one paragraph**
>
> The Explorer's wheels could only roll forward and back, so to go sideways it had to turn first. A swerve module can **point** its wheel, like a shopping-cart caster that you control. With four of them pointed the same way, the robot slides sideways without turning. With them pointed around a circle, it spins in place. Mix the two, and it can drive across the field while it turns to face anything it likes. The math that decides each wheel's angle and speed is kinematics, the same idea as Chapter 13, in two directions instead of one. Chapter 28 works it out.

### The robot fact sheet

Teams lose hours to facts nobody wrote down: which CAN ID is the front-left steer motor, which gear ratio the modules use, which way the navX is mounted. You will write them down now, in a Markdown file that lives in your repository next to the code, so it travels with the code and changes through pull requests like the code does.

Make a table like this one in a notebook today (you will turn it into `docs/robot.md` in Section 26.5), and fill in every row you can by **looking at the robot** and asking a mentor. Leave a row as "unknown" rather than guess. An honest "unknown" gets found out; a wrong guess hides for weeks.

```markdown
# The Mini Swerve: Robot Fact Sheet

Written from the real robot. Change it through a pull request, like code.

| Fact | Value | How we know |
|---|---|---|
| Team number | 3415 | Team roster |
| roboRIO version | roboRIO 2 | Label on the case |
| roboRIO image | (from the Driver Station, Section 26.7) | |
| Radio | VH-109 | Label |
| Power distribution | REV PDH | Label |
| Swerve module type | | Ask the builders |
| Drive gear ratio | | Module maker's page |
| Steer gear ratio | | Module maker's page |
| Wheel diameter | | Measured with calipers |
| Drive and steer motors | | Labels |
| Absolute encoders | | Labels |
| Gyro | navX | Label, and which port it uses |
| Camera | | Label |
| CAN IDs | (Chapter 27) | |
```

The first column will grow as the robot does. The rows the book needs next are the module type and gear ratios (Chapter 28) and the CAN IDs (Chapter 27).

> **Why "how we know"?**
>
> A fact sheet is only as good as its worst row. "Wheel diameter: 4 in" could mean someone measured it, or someone remembered it from last year's robot. When the robot drives 5% short in Chapter 30, the "how we know" column tells you which numbers to check first. It is the same reason a good tuning log (Chapter 23) records the conditions, not just the result.

---

## 26.3 Working Safely on a Robot That Can Hurt You

The Explorer weighs about as much as a textbook, and its motors could not pinch a finger. The Mini Swerve is heavier, its motors are many times more powerful, and its battery can deliver hundreds of amps for a moment. Treat it the way your team treats every real robot, from the first day.

These are the rules for every chapter in Section VI. Your team may have more; follow those too.

1. **Wheels off the ground until the code is trusted.** Put the robot on blocks (a sturdy box or a robot cart) so its wheels spin in the air. Every first test of new code happens on blocks. Chapter 27 will tell you when it is time to put it on the floor.
2. **Say it before you enable it.** Before you press Enable, say "Enabling!" loudly enough for everyone near the robot to hear, and wait for hands to come away from it. Your team may use another word; use the same one every time.
3. **Know your stop keys.** In the Driver Station, **Enter** disables the robot, and the **space bar** is an emergency stop that works even when the Driver Station window is not in front. After an emergency stop, the roboRIO must be rebooted before it can be enabled again, which is exactly why it is safe: nothing can quietly start the robot back up. Keep a hand near the space bar whenever the robot is enabled.
4. **One person drives the Driver Station.** On a shared robot, only one laptop is connected and enabling it at a time. Everyone else watches the robot, not the screen.
5. **Batteries are heavy and full of acid.** Carry them by the handle or the body, never by the wires. A battery that is cracked, leaking, or swollen goes to a mentor, not into a robot. Plug in a charged battery, and put the used one on the charger.
6. **Power off before you touch wiring.** Switch off the main breaker before you plug or unplug anything on the robot. Never power the robot off in the middle of a deploy (Section 26.7 says why).

> **The enable keys you should not learn**
>
> The Driver Station also has a keyboard shortcut to **enable** the robot: three keys pressed at once. WPILib's documentation lists it, and you will see students use it. It is easy to press by accident with a palm on the keyboard. Use the Enable button with your mouse, after you have said the word.

> **At a competition, the stop is different**
>
> When the Driver Station is connected to the field, its keyboard shortcuts are ignored, space bar included. Each driver station on the field has a big physical **E-Stop** button instead, and the drive team presses that. Practicing with the space bar now builds the right reflex: the instant something looks wrong, stop the robot first and figure out why second.

---

## 26.4 Getting the roboRIO Ready

A roboRIO needs three things before your code can run on it: an **image**, a **team number**, and a way for your laptop to reach it. On a team robot, a mentor or a lead usually sets these up once a season, and you will most likely find them done already. Read this section anyway, so you know what was done and can check it.

### The image

The **image** is the roboRIO's operating system and FRC software: Linux, Java, and the code that talks to the Driver Station. It changes every year, and WPILib's deploy tool refuses to deploy to a roboRIO whose image is from the wrong year. How you put an image on depends on which roboRIO you have:

| | roboRIO 1 | roboRIO 2 |
|---|---|---|
| How to tell | No microSD card slot | A microSD card slot on the side |
| Where the image lives | Inside the roboRIO | On the microSD card |
| How to image it | The **roboRIO Imaging Tool** (installed with the FRC Game Tools), over a USB cable, with **Format Target** | Write the image file onto the microSD card with a card-writing app (balenaEtcher or Raspberry Pi Imager), then put the card in the roboRIO |
| Then | The Imaging Tool sets the team number as it images | Set the team number afterward, with the Imaging Tool's **Edit Startup Settings** |

The image files come with the FRC Game Tools, and a roboRIO 2 image file is named `FRC_roboRIO2_2026_`, then a version number, then `.img.zip`. WPILib's "Imaging your roboRIO" pages (linked in Additional Resources) walk through both versions click by click.

> **The SD card is the roboRIO 2's disk**
>
> A roboRIO 2 boots from its microSD card, so the card holds everything: the operating system, your program, and its settings. Pull the card out while the robot is on, and the roboRIO freezes. A spare card with a fresh image in the team's toolbox turns a dead roboRIO 2 into a five-minute fix.

### The team number

A roboRIO's team number decides its **name** on the network. For team 3415, the roboRIO calls itself `roborio-3415-FRC.local`, and on the robot's radio network it lives at the address `10.34.15.2`: the team number split into two parts, `34` and `15`. WPILib calls this **TE.AM** notation. Your team's numbers go in the same places: team 254 is `10.2.54.2`, and team 5 is `10.0.5.2`.

Your laptop uses the same team number in three places, and all three must match the roboRIO: the Driver Station's **Setup** tab, your WPILib project (Section 26.5), and your dashboards (Section 26.11).

### The radio, and two cables

There are three ways to connect your laptop to a roboRIO:

- **USB cable.** A USB cable from your laptop to the roboRIO's USB **device** port (on a roboRIO 1, the square USB-B port, like a printer's; add the right cable for yours to the fact sheet). The roboRIO is always at `172.22.11.2` over USB. It is the simplest connection, and the one to use when something is not working.
- **Ethernet cable.** From your laptop to the radio, or straight to the roboRIO.
- **Wi-Fi, through the radio.** The robot's radio connects to your laptop over Wi-Fi. Today's FRC radio, the VH-109, works best with a second VH-109 set up as an **access point** that your laptop plugs into with an Ethernet cable. Radio setup is a mentor's job, done once, with a web page on the radio itself; WPILib's "Programming your Radio" page has the steps.

For this chapter, use a USB cable. The robot is on blocks and not going anywhere, and USB takes the radio out of the list of things that could be wrong. Wireless driving comes when the robot drives, in Chapter 29.

> **Why one robot, many names**
>
> The deploy tool tries several addresses for your roboRIO, in order: its network name (`roborio-3415-FRC.local`), its radio address (`10.34.15.2`), the USB address (`172.22.11.2`), and a few more for unusual networks. Whichever answers first wins. That is why the same Deploy button works over USB in the shop and over the radio on a practice field, without you changing anything.

---

## 26.5 A New Project for a New Robot

The Explorer's code drives two wheels with `XRPMotor`s. The Mini Swerve has eight brushless motors on CAN, four absolute encoders, and a different gyro. Very little of the Explorer's **hardware** code could survive the move, and the drivetrain math is new too. So the Mini Swerve gets a brand-new project, in a brand-new repository. What survives is the **shape** of the program and the habits around it, and you will copy those in on purpose, one at a time, so you know exactly what came along.

### One repository per team

The Mini Swerve is one robot shared by several students, and you will work on it in a small team of two or three, as you did with your capstone partner. Your team shares **one** repository, the same way the capstone did:

- One teammate, the **owner**, creates the project and the GitHub repository, and adds the others as collaborators (**Settings** > **Collaborators**, as in Chapter 11).
- Every change goes through a branch and a pull request, reviewed by a teammate before it is merged. `main` is always code you would be happy to deploy.
- Your team books **robot time** with the other teams, the way your class does. Code you write away from the robot gets tested in simulation first, so robot time is spent on what only the robot can tell you.

Your Explorer repository stays yours, and stays tagged `v1.0.0`. Nothing in this section changes it.

> **Stay on WPILib 2026 for this robot**
>
> FRC is moving to a new robot controller, SystemCore, and WPILib 2027 is built for it, not for the roboRIO. The Mini Swerve has a roboRIO, so its project stays on **WPILib 2026** for as long as you use it, even after 2027 tools come out. The WPILib installer puts each year in its own folder, side by side, so you can have both. If VS Code ever offers to **import** or **upgrade** the Mini Swerve project to a newer year, say no. Chapter 1 promised that most of what you learn carries over to SystemCore; the code in this section is written for the roboRIO you have.

### Step 1: Create the project

Only the owner does this step. Open **WPILib VS Code 2026**, open the command palette (`Ctrl+Shift+P`, or `Cmd+Shift+P` on a Mac), and run **WPILib: Create a new project**. Fill in the Project Creator:

| Field | What to choose |
|---|---|
| Project Type | Template |
| Language | Java |
| Base | **Command Robot** (not "XRP - Command Robot") |
| Base Folder | The folder that holds your Explorer, like `Documents/FRC` |
| Project Name | `MiniSwerve` |
| Create a new folder? | Check it |
| Team Number | Your team's number |
| Enable Desktop Support | Check it |

Click **Generate Project**, and open it in a new window.

Two choices on that form matter more than they look. **Command Robot** is the plain roboRIO template: the XRP templates add the XRP client and leave out everything about deploying to a roboRIO. And **Desktop Support** lets the same project run on your laptop, which is how the simulator and your tests will run. On the Explorer you never had to think about it, because an XRP program always runs on the laptop.

### Step 2: Look around

The template looks like a younger version of your Explorer at the end of Chapter 20:

- `Main.java`: starts the program. You still never edit it.
- `Robot.java`: the template shape you know, with a `RobotContainer` field and the scheduler running in `robotPeriodic()`.
- `RobotContainer.java`, `Constants.java`: where subsystems, bindings, and constants go.
- `subsystems/ExampleSubsystem.java`, `commands/ExampleCommand.java`, `commands/Autos.java`: examples. Read them once; you will delete them in Step 4.

Two files are new to you, and they are the ones that make this a roboRIO project. First, open `.wpilib/wpilib_preferences.json`:

```json
{
    "enableCppIntellisense": false,
    "currentLanguage": "java",
    "projectYear": "2026",
    "teamNumber": 3415
}
```

`teamNumber` is how the deploy tool finds your roboRIO (Section 26.4), and `projectYear` is the WPILib year this project belongs to. If you typed the wrong team number in the Project Creator, fix it here, or with **WPILib: Set Team Number** in the command palette.

Second, open `build.gradle` and find this block near the top. The Explorer's `build.gradle` did not have it:

```groovy
deploy {
    targets {
        roborio(getTargetTypeClass('RoboRIO')) {
            team = project.frc.getTeamNumber()
            debug = project.frc.getDebugOrDefault(false)

            artifacts {
                frcJava(getArtifactTypeClass('FRCJavaArtifact')) {
                }

                frcStaticFileDeploy(getArtifactTypeClass('FileTreeArtifact')) {
                    files = project.fileTree('src/main/deploy')
                    directory = '/home/lvuser/deploy'
                    deleteOldFiles = false
                }
            }
        }
    }
}
```

(The real block also has comments; they are left out here.) Read it like a shipping order. There is one **target**, the roboRIO, found by team number. Two things get shipped to it: `frcJava`, your program, and `frcStaticFileDeploy`, every file in your project's `src/main/deploy` folder, copied to a folder named `/home/lvuser/deploy` on the roboRIO. `lvuser` is the name of the user account your program runs as on the roboRIO, the way you have an account on your laptop. Remember that folder: later chapters put path files (Chapter 31) and dashboard layouts there, and WPILib's `Filesystem.getDeployDirectory()` finds it for you, on the robot or on your laptop.

### Step 3: Into Git, and onto GitHub

The owner turns the project into a repository and pushes it, exactly as Chapter 3 did for the Explorer. In the new project's terminal:

```bash
git init
git branch -M main
git add .
git commit -m "Ch26: New Command Robot project for the Mini Swerve"
```

Then create an empty repository on GitHub named `MiniSwerve` (no README, no `.gitignore`: the project has its own), and connect and push:

```bash
git remote add origin https://github.com/OWNER-NAME/MiniSwerve.git
git push -u origin main
```

Add your teammates as collaborators. Each teammate then clones it:

```bash
git clone https://github.com/OWNER-NAME/MiniSwerve.git
```

and opens the `MiniSwerve` folder in WPILib VS Code 2026. From here on, everyone works on branches. The first branch is `roborio-setup`, and the owner makes it now:

```bash
git checkout -b roborio-setup
```

### Step 4: Clear out the examples

Delete `ExampleSubsystem.java`, `ExampleCommand.java`, and `Autos.java`. Build. It fails, because `RobotContainer` still uses them. You will rewrite `RobotContainer.java`, `Robot.java`, and `Constants.java` completely in Section 26.8, so for now make the build pass the quickest way: in `RobotContainer`, delete the field, the two lines inside `configureBindings()`, and the imports that refer to the deleted files, and make `getAutonomousCommand()` return `Commands.none()` (import `edu.wpi.first.wpilibj2.command.Commands`). Build again: `BUILD SUCCESSFUL`. A project that builds after every step is a habit worth keeping on a new robot too.

### Step 5: What comes along from the Explorer

Here is every piece of the Explorer, and what happens to it. The rule of thumb: **habits and structure come along; hardware code and robot-specific numbers do not.**

| From the Explorer | On the Mini Swerve | When |
|---|---|---|
| The template shape: `Robot`, `RobotContainer`, `Constants` with nested groups | The same, written fresh | Section 26.8 |
| AdvantageKit: the vendordep, the `build.gradle` lines, `LoggedRobot`, the logger setup | The same, copied | Step 6 and Section 26.8 |
| `RobotMode` and the three-way IO switch | The same idea, but the roboRIO picks `REAL` by itself | Section 26.8 |
| gversion and the Git metadata in every log | The same, copied | Step 6 |
| `.github/workflows/build.yml` | Copied, unchanged | Step 6 |
| `CONTRIBUTING.md` (Chapter 11) | Copied, then updated for a shared robot | Exercises |
| `TunableNumber` (Chapter 23) | Copied when you first tune something on this robot | Later |
| `Drivetrain`, its IO classes, `Sensors`, the course commands | **Stay with the Explorer.** Swerve replaces them | Chapters 27 to 30 |
| The Explorer's tests | **Stay with the Explorer.** New code, new tests | Section 26.9 |
| `elastic-layout.json`, `advantagescope-layout.json` | Not yet: a new robot needs a new dashboard | Later |
| Gains: kS, kV, kA, PID, wheel sizes | **Never copied.** Every number belongs to the robot it was measured on | Chapter 32 |

The last row is the one people get wrong. A kV measured on a 60 mm XRP wheel with an AA battery means nothing for a brushless swerve module. Copying a number from another robot is worse than having no number, because it looks like an answer.

### Step 6: Copy in the tools

Work through these on the `roborio-setup` branch, building after each one.

1. **AdvantageKit.** Install it as in Section 17.6: **WPILib: Manage Vendor Libraries** > **Install new libraries (online)**, and paste the same URL (`https://github.com/Mechanical-Advantage/AdvantageKit/releases/latest/download/AdvantageKit.json`). Newer versions of the dialog may also offer AdvantageKit by name in a list; either gives you `vendordeps/AdvantageKit.json`. Then open the Explorer's `build.gradle` beside the new one, and copy the two `akitJson`/`annotationProcessor` lines into the end of the `dependencies` block and the `replayWatch` task to the end of the file.
2. **gversion.** Copy the `id "com.peterabeles.gversion" version "1.10"` line into the `plugins` block (leave the new project's GradleRIO line as it is), and the `gversion` block to the end of the file, from Section 25.9. Add the `BuildConstants.java` line to the end of `.gitignore`.
3. **CI.** Copy the whole `.github` folder from the Explorer into the Mini Swerve project, so it has `.github/workflows/build.yml`. Nothing in it is specific to the XRP: it checks out the code, installs Java 17, and runs `./gradlew build`, which compiles and runs the tests. It never deploys, so it never needs a robot.

Build. You should see `BUILD SUCCESSFUL`, and a new, ignored `src/main/java/frc/robot/BuildConstants.java`. Commit:

```bash
git add .
git commit -m "Ch26: AdvantageKit, gversion, and CI, copied from the Explorer"
```

> **Copy the lines, not the file**
>
> It is tempting to copy the Explorer's whole `build.gradle` over the new one. Do not. The Explorer's file is an XRP file: it has no `deploy` block, and it adds the XRP client to the simulator. Copying it would make a project that builds perfectly and can never be deployed to a roboRIO, and the error would not say why. When you move code between projects, copy the **pieces** you understand, and leave the rest.

---

## 26.6 New Java: Bytecode, the JVM, and Jar Files

Here is a puzzle. Your laptop has an Intel or AMD processor, or an Apple one. The roboRIO has an ARM processor, the same family as most phones. Processors from different families understand completely different machine instructions: a program built for one is gibberish to the other. Yet the Explorer's program ran on your laptop, and the Mini Swerve's program, built by the same Gradle on the same laptop, is about to run on the roboRIO. Nobody asked you which processor to build for. How?

### Two steps instead of one

When the Java compiler (`javac`) reads your `.java` files, it does **not** turn them into instructions for any real processor. It turns them into **bytecode**: instructions for an imaginary computer called the **Java Virtual Machine**, or **JVM**. Each class becomes a `.class` file of bytecode.

Then, on whatever computer runs the program, a real program called the JVM (part of every Java installation) reads that bytecode and runs it, translating it on the fly into instructions for the processor it is sitting on. Your laptop has a JVM for its processor. The roboRIO's image includes a JVM for ARM. Same bytecode, two JVMs, one program.

This is what Java's designers meant by "write once, run anywhere," and it is why a Java robot program is built once, on your laptop, with no idea which computer it will run on.

You can see bytecode for yourself. Take a tiny class:

```java
public class Battery {
    static double volts(double power, double batteryVolts) {
        return power * batteryVolts;
    }
}
```

Compile it, then ask the JDK's `javap` tool to print its bytecode (`javap -c Battery.class`). The method comes out like this:

```
  static double volts(double, double);
    Code:
       0: dload_0
       1: dload_2
       2: dmul
       3: dreturn
```

Read it aloud: "load the first `double`, load the second `double`, multiply them as doubles, return the answer." That is the whole method, in instructions no real processor understands and every JVM does. (`dload_2` and not `dload_1`, because a `double` takes up two slots in the JVM's list of local variables.) You will never write bytecode, but it is worth seeing once, so the word means something.

> **Where you have met the JVM already**
>
> Every stack trace since Chapter 10 was printed by the JVM. Lines like `at frc.robot.Robot.<init>(Robot.java:42)` are the JVM telling you which method's bytecode it was running and which line of your source that bytecode came from. And `lambda$new$0` from Chapter 18 is the name the compiler gave the bytecode for a lambda. The JVM was always there; now you know its name.

### The jar: one file to ship

A program is many `.class` files: yours, WPILib's, AdvantageKit's, and more. Copying hundreds of files to a robot one by one would be slow and fragile, so Java packs them into one **jar** file (short for **J**ava **AR**chive). A jar is a zip file with a list inside it saying which class to start.

Build the Mini Swerve project, and look in `build/libs/`: there is a jar named after your project. It is big, many megabytes, because the template's `build.gradle` makes a **fat jar**: your classes plus every library you use, all in one file, so the roboRIO needs nothing else. Make a copy of it somewhere outside your project, rename the copy to end in `.zip`, and open it. You will find:

- `frc/robot/Robot.class`, `frc/robot/RobotContainer.class`: your code, as bytecode.
- `edu/wpi/first/...`: all of WPILib, as bytecode.
- `org/littletonrobotics/...`: AdvantageKit.
- `META-INF/MANIFEST.MF`: a short text file whose `Main-Class` line names the class to start.
- `backup/src/...`: a copy of your **source code**. The template's `build.gradle` packs it in on purpose, so that if a robot's laptop is ever lost, the code that is on the robot can still be found.

Delete the copy when you are done looking.

### The part that is not portable

There is a catch, and it explains a word you have seen scroll past in every deploy. Some of WPILib is not Java at all. The **HAL** (Chapter 22) talks to real hardware, and that code is written in C++ and compiled into **native libraries**: files of real processor instructions, one version for each kind of computer. Java reaches them through a bridge called **JNI** (Java Native Interface). That is why `build.gradle` lists dependencies like `roborioRelease` and `nativeRelease`: one set of native libraries for the roboRIO's ARM processor, and one set for your laptop. The jar is the same everywhere; the native libraries are not, and the deploy copies the ARM ones onto the robot along with your jar.

This is also why the Explorer could only ever be "real" in a pretend way. On the laptop, the HAL's native library is the **simulator** version. On a roboRIO, it is the real one, which reads real pins and real voltages. Your Java does not change; the HAL underneath it does.

> **Why this matters to you**
>
> Three practical things follow. One: you never compile "for the robot"; Gradle builds one jar, and the deploy step handles the rest. Two: anything that works in simulation on your laptop runs the same Java on the robot, so your tests are testing the real code, not a copy. Three: when something works in simulation and fails on the robot, look first at the layer that **is** different: the HAL, the hardware, and the IO classes that talk to them. That is exactly where the IO layer (Chapter 17) draws its line.

---

## 26.7 Your First Deploy

Chapter 2 deployed an empty program first, to prove the tools worked before there was any code to blame. Do the same here. The project builds, it has AdvantageKit installed but not yet started, and it does nothing at all. That is perfect.

### Step 1: Get the robot ready

1. Put the robot on blocks, wheels in the air.
2. Plug a charged battery in, and plug a **USB stick** into one of the roboRIO's USB ports (the ones that look like a laptop's, not the device port). It should be formatted **FAT32** (Section 24.12). Write your team's name on it.
3. Switch on the main breaker. The roboRIO's **Power** light turns green, and after about half a minute of booting, its **Status** light goes out. A Status light that stays on or keeps blinking means the roboRIO has a problem: get a mentor.
4. Connect your laptop to the roboRIO with a USB cable.

### Step 2: The Driver Station

Open the **FRC Driver Station** (it came with the FRC Game Tools). On the **Setup** tab (the gear icon on the left), type your team number in the **Team Number** box and press Enter. Then go back to the **Operation** tab (the steering wheel icon) and look at the left side:

- **Communications** turns green when the Driver Station is talking to the roboRIO.
- **Robot Code** is green if a robot program is running on the roboRIO, and red if not. Right now it might be either: it shows whatever was deployed last, maybe by another team.
- **Joysticks** is green when a controller is plugged into the laptop.
- Above them, the **battery voltage** of the robot's battery, with a tiny graph. The XRP could never show you this number.

If Communications stays red, check the team number first, and the cable second. WPILib's Driver Station page (in Additional Resources) explains every tab; the one called **Diagnostics** is worth a look, because it shows the roboRIO's image version once it is connected. Add the image version to your fact sheet.

### Step 3: Deploy

In VS Code, run **WPILib: Deploy Robot Code** from the command palette (or the `...` menu at the top right of the editor). Watch the terminal. A deploy to a roboRIO does much more than "run the program," and you can see the steps go by:

1. **Build.** Gradle compiles your code and packs the fat jar (Section 26.6).
2. **Find the roboRIO.** The deploy tool tries its addresses (Section 26.4) until one answers.
3. **Check the image.** It reads the roboRIO's image version and stops if it is the wrong year.
4. **Stop the old program.** Whatever was running on the roboRIO is stopped.
5. **Copy.** The jar goes to `/home/lvuser`, the ARM native libraries go to their own folder, and the files in `src/main/deploy` go to `/home/lvuser/deploy`. The first deploy of a season may also copy Java itself, if the roboRIO's image did not include it, which takes a few extra minutes once.
6. **Write the start command.** A tiny file on the roboRIO, `/home/lvuser/robotCommand`, gets the exact line that starts your program: the roboRIO's Java, a few settings, and `-jar` with the path of your jar. That is the JVM from Section 26.6, being told which jar to run.
7. **Start it.**

The terminal ends with `BUILD SUCCESSFUL`, and a **RioLog** panel opens in VS Code by itself. In it, one of the first lines is WPILib's:

```
********** Robot program starting **********
```

Back in the Driver Station, **Robot Code** turns green. Your program is running on the robot.

> **Never switch off during a deploy**
>
> A deploy is writing files on the roboRIO. Cut the power in the middle, and a half-written file can damage the roboRIO's file system, badly enough that the only fix is to re-image it (Section 26.4). If a deploy seems stuck, wait for it to fail on its own; it times out. Then try again.

### Step 4: Enable it (nothing will move)

Say "Enabling!" (yes, even now: it is a habit, and habits are built when nothing is at stake). In the Driver Station, pick **TeleOperated**, and click **Enable**. The status text says **Teleoperated Enabled**, and the **RSL**, the orange Robot Signal Light on the robot, starts blinking: that is how everyone in the room can see an enabled robot, from across the shop. Nothing moves, because the program has nothing to move. Press **Enter** to disable. The RSL goes back to steady.

That is a complete round trip: code built on your laptop, shipped to the robot, started by the roboRIO, and enabled by the Driver Station. Everything in Section VI is that round trip, with more code in the middle.

### When a deploy fails

| What you see | What it usually means |
|---|---|
| The terminal says it cannot find or connect to the roboRIO | The roboRIO is still booting, the cable is loose, or the team number in `.wpilib/wpilib_preferences.json` is wrong. Over USB, the FRC Game Tools' driver must be installed |
| `Invalid RoboRIO Image Version!`, with the current and allowed versions | The roboRIO's image is from another year. A mentor re-images it (Section 26.4). Do not change your WPILib version to match |
| A compiler or test error, before any deploying starts | Not a deploy problem at all. Read it like any build error (Chapter 2's "build errors vs. deploy errors") |
| `BUILD SUCCESSFUL`, but **Robot Code** stays red | The program started and crashed. RioLog has the stack trace. Section 26.10 is about this |
| Communications red in the Driver Station | The Driver Station's team number does not match the roboRIO, or another network adapter (often Wi-Fi) is confusing the laptop. Try turning the laptop's Wi-Fi off while using USB |

> **Restart the code, not the robot**
>
> On the XRP, every new run started from scratch. On a roboRIO, the operating system keeps running, and only your **program** starts and stops. A deploy restarts the program, not the roboRIO. The Driver Station's **Diagnostics** tab has two buttons that show the difference: **Restart Robot Code** starts your program again, in a few seconds; **Reboot roboRIO** restarts the whole computer, which takes much longer. Reach for the first one first.

Commit nothing yet: nothing has changed since your last commit. The next section writes the robot's first real code.

---

## 26.8 Real Volts: A Subsystem for the roboRIO Itself

In Chapter 16, you met **pretend volts**. The XRP could not measure its own battery, so the Explorer multiplied power by a fixed `6.0` and called the result volts. Because the same number was used both ways, it cancelled out. Section 16.2 warned about the catch: as batteries drain, the same power gives less real voltage, so the robot slows down, and a model measured on fresh batteries over-promises. It promised that a roboRIO could measure its battery. Here is that promise.

### What a real battery does

A robot battery says 12 volts on the label, and almost never reads 12 volts. WPILib's battery guide gives the numbers:

- **Fully charged, at rest**, a battery reads somewhere between **12.7 and 13.5 volts**.
- Connected to a robot that is switched on but idle, it reads a little lower: maybe 12.9.
- When motors pull current, the voltage **drops**, more for more current. Four drive motors starting hard at once can pull a battery down by several volts for a moment, and it springs back when they ease off. This drop is called **sag**.
- A battery reading **12.5 volts on an idle robot** should be swapped and charged before a match.

Now remember what a motor controller does with "power." `set(0.5)` means "switch the battery on half the time" (Section 16.2), so the motor feels about half of **whatever the battery has right now**:

| Battery right now | `set(0.5)` gives the motor about |
|---|---|
| 12.6 V (fresh, at rest) | 6.3 V |
| 11.0 V (sagging while driving) | 5.5 V |
| 10.0 V (a tired battery, driving hard) | 5.0 V |

The same line of code, three different speeds. An autonomous routine tuned on a fresh battery comes up short on a tired one, every time. The cure is to stop asking for power and ask for **volts**: "give this motor 6 volts," and let the motor controller work out the power from the battery voltage it measures, every few milliseconds. Your Explorer's code already asks for volts (`setVolts`, since Chapter 16); on the Explorer they were pretend, and on the Mini Swerve the motor controllers will make them real. Chapter 27 sets that up on the SPARK MAXes, and Chapter 32 measures kS, kV, and kA in real volts.

> **Pretend volts, retired**
>
> The Mini Swerve has no `NOMINAL_BATTERY_VOLTS`. When its code asks a motor for 6 volts, the motor gets about 6 volts, whether the battery reads 12.8 or 11.2, because the motor controller measures the battery and adjusts. That is why kS, kV, and kA from SysId on the Mini Swerve will be real numbers you can compare with other teams' robots, and why you cannot copy the Explorer's.

### When the battery drops too far: brownout

If the voltage falls far enough, the electronics themselves are in danger: the roboRIO and the radio need a few volts to keep running, and if they reset in the middle of a match, the robot is dead for much longer than any motor stall. So the roboRIO protects itself in stages:

1. **Below about 6.8 volts**, the 6-volt power on its PWM pins starts to drop.
2. At the **brownout** level, it cuts the motors off: CAN motor controllers are told to disable, PWM outputs stop, and the roboRIO's own sensor power rails switch off. The roboRIO's Power light turns amber, and the Driver Station shows **Voltage Brownout** with a red battery number. On a roboRIO 1, the level is fixed at **6.3 volts**. On a roboRIO 2, it is **6.75 volts** by default, and your code can change it.
3. It stays that way until the voltage climbs back **above 7.5 volts**.
4. **Below about 4.5 volts**, the roboRIO may black out completely and reboot.

A robot that browns out stops dead for a moment and then lurches on. A driver who has never seen it thinks the code froze. Now you know what it is, and your code can say so.

### Why the roboRIO needs an IO layer

Reading the battery takes one line of WPILib: `RobotController.getBatteryVoltage()`. And AdvantageKit already logs it, along with dozens of other roboRIO numbers, under `SystemStats` in every log, without you writing anything. So why build a subsystem?

Because of **replay** (Section 24.6). AdvantageKit's documentation is careful about this: `SystemStats` is recorded as an **output**. It is in the log for you to look at, but in a replay, `RobotController.getBatteryVoltage()` does not return the logged value. If your code ever **decides** something from the battery, like a warning, and reads it straight from `RobotController`, a replay of that decision would read your laptop's pretend battery instead, and quietly lie. That is the same trap as Section 24.9's sensor that was read outside its IO layer.

The rule from Chapter 24 still holds on a new robot: **every input your code decides from comes through an IO layer.** The roboRIO is hardware, so it gets one, like every other piece of hardware on the Mini Swerve will. It is small, which makes it a good first one.

Here is the plan, in the shape you know from the Explorer:

| File | Job |
|---|---|
| `RoboRioIO` | The interface: inputs (battery volts, brownout) and one output (the RADIO light) |
| `RoboRioIOReal` | The real roboRIO, through `RobotController` |
| `RoboRioIOSim` | A pretend roboRIO with a pretend battery, for simulation and tests |
| `RoboRio` | The subsystem: reads the inputs every loop, raises **alerts**, and offers a command to light the RADIO light |

> **The RADIO light**
>
> The roboRIO's front panel has a row of status lights, and one of them is labeled **RADIO**. It came from a time when the roboRIO had its own Wi-Fi, which FRC never used, and WPILib now lets your code set its color: off, green, red, or orange. It is the closest thing the Mini Swerve has to the Explorer's LED from Chapter 4, so it gets the Explorer's oldest job: shining during autonomous (Chapter 18's Auto Light).

### Step 1: `Constants`

Replace the whole of `Constants.java`:

```java
package frc.robot;

import edu.wpi.first.wpilibj.RobotBase;

/** Settings the whole Mini Swerve program shares (Chapter 20, moved to a new robot in Chapter 26). */
public final class Constants {
    private Constants() {}

    /** The three robots this program can drive (Chapter 24). */
    public enum RobotMode {
        REAL,     // the real Mini Swerve: this program is running on its roboRIO
        SIM,      // the simulated Mini Swerve, on your laptop
        REPLAY    // no robot at all: every input comes from a log file
    }

    // What to be when the program is NOT on a roboRIO: SIM, or REPLAY to replay a log (Chapter 26).
    public static final RobotMode SIM_MODE = RobotMode.SIM;

    // A roboRIO knows it is real, so this picks itself (Chapter 26).
    public static final RobotMode ROBOT_MODE = RobotBase.isReal() ? RobotMode.REAL : SIM_MODE;

    /** Driver controls (Chapter 20). */
    public static final class OperatorConstants {
        private OperatorConstants() {}

        public static final int DRIVER_CONTROLLER_PORT = 0;
    }
}
```

The enum is Chapter 24's, word for word. The difference is the last two constants. `RobotBase.isReal()` is `true` when the program is running on a roboRIO and `false` anywhere else. On the Explorer it was always `false` (the program never ran on a roboRIO), which is why `ROBOT_MODE` had to be set by hand. Here, the ternary from Chapter 8 picks `REAL` on the robot, and `SIM_MODE` on a laptop. `SIM_MODE` is the only thing you ever change by hand, and only to choose between simulating and replaying.

> **A rule from Chapter 24 gets easier**
>
> On the Explorer, committing `ROBOT_MODE = SIM` by mistake made your teammate's real XRP sit still. Here, that mistake is impossible: on the robot, `isReal()` wins, whatever `SIM_MODE` says. A `REPLAY` left in by mistake only changes what a teammate's **simulator** does. Commit `SIM_MODE` as `SIM` anyway, out of politeness. This is the same pattern AdvantageKit's own template projects use.

### Step 2: The IO interface

Create a `subsystems` folder in `src/main/java/frc/robot` (if the template's went away with `ExampleSubsystem`), and in it, `RoboRioIO.java`:

```java
package frc.robot.subsystems;

import edu.wpi.first.wpilibj.RobotController.RadioLEDState;
import org.littletonrobotics.junction.AutoLog;

/** The roboRIO's own hardware: its battery reading and its RADIO light (Chapter 26). */
public interface RoboRioIO {

    /** What the roboRIO reports, read once per loop. AdvantageKit logs every field. */
    @AutoLog
    public static class RoboRioIOInputs {
        public double batteryVolts = 0.0;
        public boolean brownedOut = false;
    }

    /** Read the roboRIO's sensors into {@code inputs}. */
    public default void updateInputs(RoboRioIOInputs inputs) {}

    /** Set the RADIO light on the roboRIO's front panel. */
    public default void setRadioLed(RadioLEDState state) {}
}
```

Compare it with `DrivetrainIO` from Chapter 17, line by line. Same nested `@AutoLog` inputs class, same `default` methods that do nothing, so a replay robot can be built from an empty anonymous class (Chapter 24). `RadioLEDState` is an enum inside WPILib's `RobotController` class, with the values `kOff`, `kGreen`, `kRed`, and `kOrange` (WPILib's `k` names, Section 21.3).

### Step 3: The real roboRIO, and a pretend one

`RoboRioIOReal.java`, in the same folder:

```java
package frc.robot.subsystems;

import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.RobotController.RadioLEDState;

/** The real roboRIO, read and written through WPILib's RobotController (Chapter 26). */
public class RoboRioIOReal implements RoboRioIO {

    @Override
    public void updateInputs(RoboRioIOInputs inputs) {
        inputs.batteryVolts = RobotController.getBatteryVoltage();
        inputs.brownedOut = RobotController.isBrownedOut();
    }

    @Override
    public void setRadioLed(RadioLEDState state) {
        RobotController.setRadioLEDState(state);
    }
}
```

Three calls to `RobotController`, a WPILib class full of `static` methods about the roboRIO itself (Chapter 7's `static`: there is only one roboRIO, so there is no object to make). This is the only file in the project that may call them.

And `RoboRioIOSim.java`:

```java
package frc.robot.subsystems;

import edu.wpi.first.wpilibj.RobotController.RadioLEDState;
import edu.wpi.first.wpilibj.simulation.RoboRioSim;

/** A pretend roboRIO, with a pretend battery, for the simulator and for tests (Chapter 26). */
public class RoboRioIOSim implements RoboRioIO {
    // A fully charged battery at rest reads 12.7 to 13.5 volts (WPILib's battery guide).
    public static final double FRESH_BATTERY_VOLTS = 12.8;

    // A roboRIO 2 browns out below this by default; a roboRIO 1, below 6.3 (Section 26.8).
    public static final double BROWNOUT_VOLTS = 6.75;

    private double batteryVolts = FRESH_BATTERY_VOLTS;

    @Override
    public void updateInputs(RoboRioIOInputs inputs) {
        inputs.batteryVolts = batteryVolts;
        inputs.brownedOut = batteryVolts < BROWNOUT_VOLTS;
    }

    @Override
    public void setRadioLed(RadioLEDState state) {
        RoboRioSim.setRadioLEDState(state);   // WPILib's simulator keeps a pretend RADIO light
    }

    /** Make the pretend battery read this many volts. Tests use it; nothing else does yet. */
    public void setBatteryVolts(double volts) {
        batteryVolts = volts;
    }
}
```

The pretend battery is a single number that starts fresh and stays fresh, unless a test changes it. That is enough for now, because nothing on the simulated Mini Swerve draws current yet. When simulated motors arrive, this is where a battery that sags under load would go; WPILib has a `BatterySim` class for exactly that.

> **Why not let WPILib's simulator answer?**
>
> WPILib's simulator has a pretend roboRIO of its own (`RoboRioSim`), and `RobotController.getBatteryVoltage()` works on a laptop: it reads that pretend roboRIO, which says 12 volts. You could use `RoboRioIOReal` for `SIM` too. But 12.0 volts is below the 12.5 that the subsystem warns about, so the simulator would always nag about a battery that does not exist. A simulation IO class is where you decide what the pretend world looks like, the same way `SensorsIOSim` decided where the Explorer's pretend tape and wall were (Chapters 24 and 25).

### Step 4: The `RoboRio` subsystem, and alerts

The subsystem reads its inputs every loop, and **alerts** people when something is wrong. WPILib's `Alert` class (new in 2025) is made for this. An `Alert` is a message with a level: `kError` (red), `kWarning` (yellow), or `kInfo`. You create it **once**, then call `set(true)` or `set(false)` as often as you like. While it is set, dashboards like Elastic show it in an **Alerts** widget, newest and most serious first, and AdvantageKit records it in the log. It is the robot's way of tapping you on the shoulder, instead of a print scrolling by in RioLog.

`RoboRio.java`:

```java
package frc.robot.subsystems;

import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.Alert.AlertType;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.RobotController.RadioLEDState;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import org.littletonrobotics.junction.Logger;

/** The roboRIO itself: its battery, its brownouts, and its RADIO light (Chapter 26). */
public class RoboRio extends SubsystemBase {
    // Swap the battery if it reads below this with the robot idle (WPILib's battery guide).
    public static final double LOW_BATTERY_VOLTS = 12.5;

    private final RoboRioIO io;
    private final RoboRioIOInputsAutoLogged inputs = new RoboRioIOInputsAutoLogged();

    private final Alert lowBatteryAlert =
        new Alert("Battery low. Swap it before you drive.", AlertType.kWarning);
    private final Alert brownoutAlert =
        new Alert("Brownout this run: the roboRIO cut power to the motors.", AlertType.kError);

    // What the RADIO light is showing, so the log can show it too.
    private RadioLEDState radioLed = RadioLEDState.kOff;

    public RoboRio(RoboRioIO io) {
        this.io = io;
    }

    @Override
    public void periodic() {
        io.updateInputs(inputs);
        Logger.processInputs("RoboRio", inputs);

        // Judge the battery only at rest: driving pulls the voltage down for a moment, and that is normal.
        lowBatteryAlert.set(DriverStation.isDisabled() && inputs.batteryVolts < LOW_BATTERY_VOLTS);

        // A brownout lasts a moment, but the alert stays up until the program restarts.
        if (inputs.brownedOut) {
            brownoutAlert.set(true);
        }

        Logger.recordOutput("RoboRio/RadioLed", radioLed);
    }

    /** The battery voltage the roboRIO measured this loop. */
    public double getBatteryVolts() {
        return inputs.batteryVolts;
    }

    /** Whether the roboRIO is in brownout protection this loop (Section 26.8). */
    public boolean isBrownedOut() {
        return inputs.brownedOut;
    }

    /** For tests: is the low battery warning showing? */
    boolean isLowBatteryAlertOn() {
        return lowBatteryAlert.get();
    }

    /** For tests: is the brownout error showing? */
    boolean isBrownoutAlertOn() {
        return brownoutAlert.get();
    }

    /** A command that shows {@code color} on the RADIO light while it runs, and turns it off after. */
    public Command showColor(RadioLEDState color) {
        return startEnd(() -> setRadioLed(color), () -> setRadioLed(RadioLEDState.kOff));
    }

    /** Light the RADIO light, and remember the color for the log. */
    private void setRadioLed(RadioLEDState state) {
        radioLed = state;
        io.setRadioLed(state);
    }
}
```

Walk through it:

- **`periodic()`** has the shape of every subsystem from Chapter 17 on: update the inputs from the IO layer, hand them to AdvantageKit with `processInputs`, then use them. Everything after `processInputs` reads `inputs`, never `RobotController`.
- **The low battery alert** is set every loop to a fresh answer, so it comes and goes with the battery. It only looks while the robot is **disabled**, because sag while driving is normal (the table above) and a warning that flickers every time the robot accelerates teaches everyone to ignore warnings.
- **The brownout alert** is different on purpose: it is only ever set to `true`. A brownout might last a tenth of a second, far too short for anyone to notice a light. Leaving the alert up until the program restarts means that whoever looks at the dashboard after the run finds out it happened. Chapter 10's "did it just change?" pattern would catch the moment; this one remembers it.
- **`showColor(color)`** is a command factory, like Chapter 20's `lightTheLed()`. `startEnd` is a method every subsystem inherits (Chapter 19): it builds a command that runs one lambda when it starts and another when it ends, and that **requires** this subsystem, so two light commands cannot fight over the light (Section 18.5's one-command-per-subsystem rule).
- **The RADIO light is an output**, so the color is recorded with `recordOutput` (Chapter 24) every loop. In a replay, `io.setRadioLed` does nothing, but the log still shows what the code asked for.
- **Two package-private getters** exist only for tests (Chapter 22's table of who can see what): tests in `frc.robot.subsystems` can ask whether an alert is showing, and nothing else can.

> **Alerts versus prints**
>
> A print says something once, at one moment, in a window that scrolls. An alert says something for as long as it is true, in a place a driver can glance at. A good rule for a team robot: if a person needs to **act** on it (swap the battery, check the wiring, re-deploy), make it an alert. If it is only for whoever is debugging later, it belongs in the log as an output. Prints are for the moment you are watching RioLog.

### Step 5: `RobotContainer`

Replace the whole of `RobotContainer.java`:

```java
package frc.robot;

import edu.wpi.first.wpilibj.RobotController.RadioLEDState;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import frc.robot.Constants.OperatorConstants;
import frc.robot.Constants.RobotMode;
import frc.robot.subsystems.RoboRio;
import frc.robot.subsystems.RoboRioIO;
import frc.robot.subsystems.RoboRioIOReal;
import frc.robot.subsystems.RoboRioIOSim;

/** Builds the Mini Swerve's subsystems and commands, and ties them to the controller (Chapter 20). */
public class RobotContainer {
    private final RoboRio roboRio;

    private final CommandXboxController controller =
        new CommandXboxController(OperatorConstants.DRIVER_CONTROLLER_PORT);

    // The autonomous routine, for now: the RADIO light shows green all through autonomous.
    private final Command autoLight;

    /** Build the robot that Constants.ROBOT_MODE asks for. Robot.java uses this one. */
    public RobotContainer() {
        this(Constants.ROBOT_MODE);
    }

    /**
     * Build the real robot, the simulated one, or a robot for replaying a log.
     * Package-private, so tests in frc.robot can ask for any of them.
     *
     * @param mode which robot to build
     */
    RobotContainer(RobotMode mode) {
        // Which hardware? Decide here, once. Nothing else needs to know (Chapter 24).
        RoboRioIO roboRioIO = switch (mode) {
            case REAL -> new RoboRioIOReal();
            case SIM -> new RoboRioIOSim();
            case REPLAY -> new RoboRioIO() {};   // no hardware: the log fills in the inputs
        };
        roboRio = new RoboRio(roboRioIO);
        System.out.println("Robot mode: " + mode);

        autoLight = roboRio.showColor(RadioLEDState.kGreen).withName("Auto Light");

        configureBindings();
    }

    /**
     * Tie the controller's buttons to commands. The driver's controls:
     *
     * <pre>
     * Teleop     A              RADIO light orange (hold)
     * </pre>
     */
    private void configureBindings() {
        // Teleop: hold A to light the RADIO light orange. Proof that the controller reaches the roboRIO.
        controller.a().and(RobotModeTriggers.teleop())
            .whileTrue(roboRio.showColor(RadioLEDState.kOrange).withName("Hello Light"));
    }

    /** The command to run in autonomous. */
    public Command getAutonomousCommand() {
        return autoLight;
    }
}
```

If you put the Explorer's final `RobotContainer` beside this one, you will see the same bones: the two constructors chained with `this(...)` (Chapter 22), the switch expression that picks each IO (Chapter 24), the Javadoc controls table and `RobotModeTriggers` (Chapter 20), a named command factory, and `getAutonomousCommand()`. A small robot program with a big program's shape. As the Mini Swerve grows, each chapter adds a subsystem and its IO to that switch, and bindings to that table.

### Step 6: `Robot`

Replace the whole of `Robot.java`:

```java
package frc.robot;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.Constants.RobotMode;
import org.littletonrobotics.junction.LogFileUtil;
import org.littletonrobotics.junction.LoggedRobot;
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.NT4Publisher;
import org.littletonrobotics.junction.wpilog.WPILOGReader;
import org.littletonrobotics.junction.wpilog.WPILOGWriter;

/** The Mini Swerve's robot program. Template shape (Chapter 20), AdvantageKit first (Chapter 17). */
public class Robot extends LoggedRobot {
    private final RobotContainer robotContainer;
    private Command autonomousCommand = Commands.none();

    public Robot() {
        // AdvantageKit first, before anything else is created (Section 17.6).
        Logger.recordMetadata("ProjectName", "Mini Swerve");
        Logger.recordMetadata("RobotMode", Constants.ROBOT_MODE.name());

        // Which code made this log (Chapter 25): the commit, and whether it had uncommitted changes.
        Logger.recordMetadata("GitSHA", BuildConstants.GIT_SHA);
        Logger.recordMetadata("GitBranch", BuildConstants.GIT_BRANCH);
        Logger.recordMetadata("GitDirty", switch (BuildConstants.DIRTY) {
            case 0 -> "All changes committed";
            case 1 -> "Uncommitted changes";
            default -> "Unknown";
        });
        Logger.recordMetadata("BuildDate", BuildConstants.BUILD_DATE);

        if (Constants.ROBOT_MODE == RobotMode.REPLAY) {
            // Replay (Chapter 24): take every input from a log, as fast as the laptop can.
            setUseTiming(false);
            String logPath = LogFileUtil.findReplayLog();
            Logger.setReplaySource(new WPILOGReader(logPath));
            Logger.addDataReceiver(new WPILOGWriter(LogFileUtil.addPathSuffix(logPath, "_replay")));
        } else {
            Logger.addDataReceiver(new WPILOGWriter());   // the USB stick on a roboRIO, logs/ on a laptop
            Logger.addDataReceiver(new NT4Publisher());   // publish live, for AdvantageScope
        }
        Logger.start();

        robotContainer = new RobotContainer();
    }

    @Override
    public void robotPeriodic() {
        CommandScheduler.getInstance().run();
    }

    @Override
    public void autonomousInit() {
        autonomousCommand = robotContainer.getAutonomousCommand();
        CommandScheduler.getInstance().schedule(autonomousCommand);
    }

    @Override
    public void teleopInit() {
        autonomousCommand.cancel();
    }

    @Override
    public void testInit() {
        CommandScheduler.getInstance().cancelAll();
    }
}
```

Most of this is copied, and that is the point. The metadata lines are Chapter 25's. The replay branch is Chapter 24's, unchanged. And the `else` branch is Chapter 17's two lines, **unchanged**, even though this program writes its log somewhere completely different. How? Because `WPILOGWriter` checks where it is running. Inside AdvantageKit's source, the no-argument constructor picks its folder like this:

```java
this(RobotBase.isSimulation() ? defaultPathSim : defaultPathRio, ...);
```

`defaultPathRio` is `"/U/logs"`, the USB stick, and `defaultPathSim` is `"logs"`, your project folder. The library made the decision for you, with the same question your `Constants` asks. That is what good library code looks like: the code that uses it does not have to change when it moves to a new robot.

The template's other methods (`disabledInit`, `teleopPeriodic`, and the rest) can be deleted; `LoggedRobot` gives every one of them an empty body (Chapter 19's inherited methods). Keep the ones you use.

### Step 7: Simulate first

Before you take this to the robot, run it where mistakes are free. Build, and run **WPILib: Simulate Robot Code**. If VS Code asks which extensions to use, choose **Sim GUI** only. There is no XRP client in this project, and there never will be.

The terminal (not RioLog: this program is on your laptop) shows `Robot mode: SIM`. In AdvantageScope, **File** > **Connect to Simulator**, and find `RoboRio` > `BatteryVolts` reading `12.8`, and `RealOutputs` > `RoboRio` > `RadioLed` reading `kOff`. In the Simulation GUI, click **Autonomous**: `RadioLed` turns to `kGreen`. Click **Disabled**: back to `kOff`. Click **Teleoperated**, and if you have a controller set up in the Simulation GUI (Section 8.2), hold A: `kOrange`.

### Step 8: Deploy, and watch a real battery

Back to the robot, on blocks, with the USB stick in. Deploy. RioLog shows the program starting, then AdvantageKit's line naming its log file on the USB stick, then your own `Robot mode: REAL`. If the line about the log file is missing and the Driver Station shows an AdvantageKit error about the log file, the USB stick is missing, unreadable, or not FAT32 (Section 26.11).

Now three tests on the real robot:

1. **Autonomous.** Say "Enabling!", pick **Autonomous** in the Driver Station, and enable. The RADIO light on the roboRIO turns **green**. Disable: it goes off.
2. **Teleop.** Plug in your controller (check **Joysticks** is green and the controller is in slot 0 on the **USB Devices** tab, Section 8.2). Enable in **TeleOperated**, hold A: **orange**. Let go: off.
3. **The battery.** With the robot disabled, compare three numbers: the voltage in the Driver Station, `RoboRio/BatteryVolts` in AdvantageScope (**File** > **Connect to Robot**; Section 26.11 sets the address), and, if your team has one, a voltmeter or battery tester on the battery itself. The first two should agree to a few hundredths of a volt; the third will read a little higher, because it is measuring the battery with less load on it. Write all three in your notebook.

If your battery happens to be tired, the Elastic dashboard (Section 26.11) or AdvantageScope will show the yellow **Battery low** alert. Swap the battery and watch the alert go away.

Commit:

```bash
git add .
git commit -m "Ch26: RoboRio subsystem with an IO layer, battery alerts, and the RADIO light"
```

> **The first real subsystem is the smallest**
>
> `RoboRio` is tiny, and that is deliberate. It is the whole Chapter 17 pattern (interface, real IO, sim IO, replay IO, subsystem, outputs, alerts) on hardware that cannot hurt anyone and cannot be wired backwards. In Chapter 27 you will build the same pattern around eight motor controllers on CAN, and every piece will already be familiar. Only the hardware will be new.

---

## 26.9 Tests and CI Come Along

The Explorer had 38 tests. They stay with the Explorer, because the code they test does. The Mini Swerve starts its own collection today, with the same tools and the same habits from Chapter 22: JUnit, HALSim, Arrange/Act/Assert, sentence-style names, and red first.

### The subsystem's tests

Create `src/test/java/frc/robot/subsystems/RoboRioTest.java`. Every test builds a `RoboRio` on a `RoboRioIOSim`, so it can set the pretend battery to whatever the test needs:

```java
package frc.robot.subsystems;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.RobotController.RadioLEDState;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj.simulation.RoboRioSim;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RoboRioTest {
    private RoboRioIOSim io;
    private RoboRio roboRio;

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);
        io = new RoboRioIOSim();
        roboRio = new RoboRio(io);
    }

    @AfterEach
    void tearDown() {
        CommandScheduler.getInstance().unregisterAllSubsystems();
        DriverStationSim.resetData();   // disabled, no mode: as the Driver Station starts
        DriverStationSim.notifyNewData();
        RoboRioSim.resetData();
    }

    @Test
    void aFreshBatteryRaisesNoWarning() {
        roboRio.periodic();

        assertEquals(RoboRioIOSim.FRESH_BATTERY_VOLTS, roboRio.getBatteryVolts(), 1e-9);
        assertFalse(roboRio.isLowBatteryAlertOn());
    }

    @Test
    void aLowBatteryAtRestRaisesTheWarning() {
        io.setBatteryVolts(12.2);

        roboRio.periodic();

        assertTrue(roboRio.isLowBatteryAlertOn());
    }

    @Test
    void aDipWhileEnabledIsNotAWarning() {
        DriverStationSim.setEnabled(true);
        DriverStationSim.notifyNewData();
        io.setBatteryVolts(11.0);   // the robot is pulling hard; this is normal

        roboRio.periodic();

        assertFalse(roboRio.isLowBatteryAlertOn());
    }

    @Test
    void aBrownoutStaysOnTheListAfterTheBatteryRecovers() {
        io.setBatteryVolts(6.0);
        roboRio.periodic();
        assertTrue(roboRio.isBrownedOut());

        io.setBatteryVolts(12.0);
        roboRio.periodic();

        assertFalse(roboRio.isBrownedOut());
        assertTrue(roboRio.isBrownoutAlertOn(), "the alert should outlast the brownout");
    }

    @Test
    void showColorLightsTheRadioLedThenTurnsItOff() {
        Command green = roboRio.showColor(RadioLEDState.kGreen);

        green.initialize();
        assertEquals(RadioLEDState.kGreen, RoboRioSim.getRadioLEDState());

        green.end(false);
        assertEquals(RadioLEDState.kOff, RoboRioSim.getRadioLEDState());
    }
}
```

Most of this is Chapter 22 again: `HAL.initialize` before anything touches WPILib, `unregisterAllSubsystems()` after each test so the next test starts with a clean scheduler, and `DriverStationSim` to pretend the robot is enabled. Two things are new:

- **The tests call `periodic()` themselves.** A subsystem's `periodic()` is a public method like any other; the scheduler is just its usual caller. Calling it directly, once, is the simplest way to say "one loop goes by."
- **The last test calls `initialize()` and `end(false)` on a command directly**, instead of scheduling it. For a command this simple (one thing at the start, one at the end), that tests exactly what matters without a scheduler, an enabled Driver Station, or a clock. `RoboRioSim.getRadioLEDState()` asks WPILib's pretend roboRIO what color its RADIO light is, the same way Chapter 22's course test asked the pretend LED.

### The autonomous test

Create `src/test/java/frc/robot/AutoLightTest.java`. This one builds the whole `RobotContainer`, the way Chapter 22's course test did, and checks that autonomous shows green:

```java
package frc.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.RobotController.RadioLEDState;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj.simulation.RoboRioSim;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import frc.robot.Constants.RobotMode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AutoLightTest {

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);
        DriverStationSim.setAutonomous(true);
        DriverStationSim.setEnabled(true);   // commands only run while the robot is enabled
        DriverStationSim.notifyNewData();
    }

    @AfterEach
    void tearDown() {
        CommandScheduler.getInstance().cancelAll();
        CommandScheduler.getInstance().unregisterAllSubsystems();
        DriverStationSim.resetData();
        DriverStationSim.notifyNewData();
        RoboRioSim.resetData();
    }

    @Test
    void autonomousShowsGreenUntilItIsCancelled() {
        RobotContainer robotContainer = new RobotContainer(RobotMode.SIM);
        Command auto = robotContainer.getAutonomousCommand();

        CommandScheduler.getInstance().schedule(auto);
        CommandScheduler.getInstance().run();
        assertEquals(RadioLEDState.kGreen, RoboRioSim.getRadioLEDState());

        auto.cancel();   // what teleopInit() does
        assertEquals(RadioLEDState.kOff, RoboRioSim.getRadioLEDState());
    }
}
```

Run the tests (**WPILib: Test Robot Code**, or just build): **6 tests, all green**. Then do what Chapter 22 taught you never to skip: make one fail on purpose. Change `LOW_BATTERY_VOLTS` to `12.0`, run the tests, and read the failure: `aLowBatteryAtRestRaisesTheWarning` fails, because 12.2 volts is no longer "low." Put it back to `12.5`, and they are green again.

> **Where the one-container rule went**
>
> In Chapter 22, only one test could build the Explorer's whole `RobotContainer`, because the XRP's motors and sensors could only be created once per test run. `RoboRioIOSim` creates no hardware objects at all, so `AutoLightTest` can build `RobotContainer(RobotMode.SIM)` freely, and so could other tests. Keep an eye on that as the Mini Swerve grows. The moment a simulation IO class creates something WPILib only allows once, the old rule comes back, and the error will look like Chapter 10's `already allocated`.

### CI, unchanged

Push your branch:

```bash
git add .
git commit -m "Ch26: Tests for the RoboRio subsystem and the autonomous light"
git push -u origin roborio-setup
```

On GitHub, open the **Actions** tab. The workflow you copied from the Explorer runs, builds, and runs all six tests on GitHub's computer, and comes back green. It never needed a robot, and it never will: CI tests the code, and the robot tests the robot. Open a pull request into `main`, have a teammate review it, and merge it when the check is green. (The Exercises have the review checklist.)

---

## 26.10 New Java: When Code Throws on a Real Robot

In Chapter 10, you learned to read **exceptions**: the JVM's way of saying "I cannot do this line," with a type, a message, and a stack trace pointing at the line. On the Explorer, an exception stopped a program on your laptop, and you fixed it and ran again. Time to find out what one does to a real robot, while it is safely on blocks.

### Step 1: A crash, on purpose

Make a throwaway branch. This code must never be merged:

```bash
git checkout -b crash-drill
```

In `RobotContainer.configureBindings()`, add a binding that throws an exception when you press B. You need one import, `edu.wpi.first.wpilibj2.command.Commands`:

```java
// CRASH DRILL (Chapter 26). Never merge this.
controller.b().and(RobotModeTriggers.teleop()).onTrue(Commands.runOnce(() -> {
    throw new IllegalStateException("Crash drill: this one is on purpose (Chapter 26)");
}));
```

`throw` is the keyword that starts an exception yourself. `new IllegalStateException("...")` makes an exception object with your message (an exception is an object, like everything else in Java), and `throw` sends it flying up the call stack. You have been on the receiving end of thrown exceptions since Chapter 10; now you know how they start.

Deploy. Robot on blocks, say the word, enable TeleOperated, and press B. Watch the Driver Station and RioLog:

1. **Robot Code** goes red, and the status says **No Robot Code**. The RSL stops blinking.
2. RioLog (and the Driver Station's message box) shows something like this:

```
Unhandled exception: java.lang.IllegalStateException: Crash drill: this one is on purpose (Chapter 26)
	at frc.robot.RobotContainer.lambda$configureBindings$0(RobotContainer.java:58)
	at edu.wpi.first.wpilibj2.command. ... (several lines from WPILib's scheduler)
	...
The robot program quit unexpectedly. This is usually due to a code error.
  The above stacktrace can help determine where the error occurred.
  See https://wpilib.org/stacktrace for more information.
The startCompetition() method (or methods called by it) should have handled the exception above.
```

3. A few seconds later, the roboRIO starts your program again by itself. RioLog shows `********** Robot program starting **********`, then `Robot mode: REAL`, and **Robot Code** turns green. The robot is **disabled**, and stays that way until someone enables it.

Read the stack trace the Chapter 10 way: the exception type and message, then the first line that names `frc.robot`. That is your lambda (`lambda$configureBindings$0`, Chapter 18), at the line of the `throw`. The rest is WPILib's scheduler, which called it.

Now picture it in a match. The robot is halfway across the field in autonomous, a bug throws, and the robot goes dead. By the time the program is back, a 15-second autonomous could be over, and your robot has to be enabled again before teleop can use it. Nothing about the robot was broken. One line of code was.

Delete the branch when you are done (`git checkout main`, then `git branch -D crash-drill`), and deploy `main` again.

> **Who printed that last message?**
>
> WPILib's `RobotBase` starts your robot, and it wraps everything in one last safety net. When your exception escaped every method, it landed there, and `RobotBase` printed "should have handled the exception above," and let the program end so the roboRIO could restart it. AdvantageKit's `LoggedRobot` also caught it on the way out, for one reason: to write the stack trace into the log's Console and close the log file properly, so the crash is in the log. Then it **threw it again**. Neither of them tried to keep the robot running. You will see why in a moment.

### Step 2: Catching an exception

The tool for handling an exception is **`try` and `catch`**. Start away from the robot, with something you can predict. `Integer.parseInt` turns text into a whole number, and throws a `NumberFormatException` if the text is not one:

```java
public class TeamNumber {
    /** Turn typed text into a team number, or 0 if the text is not a number. */
    static int parseTeamNumber(String text) {
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException e) {
            System.out.println("Not a team number: \"" + text + "\". Using 0.");
            return 0;
        }
    }

    public static void main(String[] args) {
        System.out.println(parseTeamNumber("3415"));
        System.out.println(parseTeamNumber("34l5"));   // a lowercase L, not a 1
    }
}
```

Output:

```
3415
Not a team number: "34l5". Using 0.
0
```

Read it aloud: "**Try** to parse the text. If that throws a `NumberFormatException`, **catch** it: print a message and return 0 instead."

- The **`try` block** holds the code that might throw.
- The **`catch` block** says which type of exception it handles, in parentheses, with a name for it (`e`), like a method parameter. If anything in the `try` block throws that type, Java jumps straight to the `catch` block, skipping the rest of the `try`. If nothing throws, the `catch` block never runs.
- An exception type the `catch` does not name is **not** caught: it keeps flying up the call stack, exactly as if the `try` were not there.
- `e` is the exception object. `e.getMessage()` is its message, and `e.printStackTrace()` prints the stack trace you would have seen if it had not been caught.

There is one more piece. A **`finally` block** after the `catch` runs **no matter what**: after the `try` finishes normally, after a `catch` handles an exception, even after a `return`:

```java
try {
    System.out.println("trying " + text);
    return Integer.parseInt(text);
} catch (NumberFormatException e) {
    System.out.println("caught: " + e.getMessage());
    return 0;
} finally {
    System.out.println("finally runs either way");
}
```

With `"twelve"`, that prints `trying twelve`, then `caught: For input string: "twelve"`, then `finally runs either way`, then returns 0. `finally` is for cleanup that must always happen, like closing a file. WPILib's `RobotBase` uses one to print its "quit unexpectedly" message however the program ends.

### Step 3: Checked and unchecked

Try this in a scratch file. `Files.readString` reads a whole text file, and `Path.of` names it:

```java
import java.nio.file.Files;
import java.nio.file.Path;

public class Notes {
    public static void main(String[] args) {
        String text = Files.readString(Path.of("robot-notes.txt"));
        System.out.println(text);
    }
}
```

It does not compile:

```
Notes.java:6: error: unreported exception IOException; must be caught or declared to be thrown
        String text = Files.readString(Path.of("robot-notes.txt"));
                                      ^
```

Java sorts exceptions into two kinds:

- **Unchecked exceptions** usually mean a **bug** in the program: `NullPointerException` (Chapter 10), `IllegalArgumentException` (the XRP's "already allocated"), `IllegalStateException`, `NumberFormatException`, `ArithmeticException`. The compiler does not make you handle them, because the fix is to correct the code, not to catch them.
- **Checked exceptions** mean something **outside** the program can go wrong, however perfect the code is: a file that is missing, a USB stick that was pulled out, a network that dropped. `IOException` is the most common. The compiler **insists** that every checked exception is either caught, or passed on with `throws` in the method's signature, like `static String readNotes() throws IOException`. That is the message above: "must be caught or declared to be thrown."

That split is the whole philosophy in two lines. Checked: the world might fail you, so plan for it. Unchecked: you made a mistake, so fix it.

### Step 4: A real catch, in code you already run

You have been running a good `catch` since Chapter 17. Here is the part of AdvantageKit's `WPILOGWriter` that opens the log file when the robot starts:

```java
String logPath = Path.of(folder, filename).toString();
System.out.println("[AdvantageKit] Logging to \"" + logPath + "\"");
try {
    log = new DataLogWriter(logPath, WPILOGConstants.extraHeader);
} catch (IOException e) {
    DriverStation.reportError("[AdvantageKit] Failed to open output log file.", true);
    return;
}
isOpen = true;
```

Opening a file can throw an `IOException`, a checked exception, and on a roboRIO the most likely reason is the one Section 24.12 warned about: no USB stick. AdvantageKit's authors decided what the robot should do then, and it is a good decision: **report it** to the Driver Station, where a person will see it, then **carry on without a log**. A robot that cannot write its log can still play the match. A robot that crashed because it could not write its log cannot. That is a failure from **outside** the program, handled in the way that keeps the robot safe and tells a person.

### Step 5: When not to catch

So why did nobody catch your crash drill and keep the robot running? Why not wrap every command in a `try`, and catch everything?

Because of what that catch would be hiding. Your crash drill was a **bug**: code that should not have been written. Picture a `catch` around the whole robot that swallows every exception and keeps going. The bug is still there. Now it happens silently, every time, in every match, and the robot does something half-finished instead of something obvious. Chapter 10's lesson was to move bugs to where they are **easiest to find**: the compiler first, then a loud crash on the bench, then a test. A `catch` that swallows bugs moves them the other way, from the bench to the competition field, where they are hardest to find of all.

The rules this book follows:

1. **Catch only what you can handle.** "Handle" means you can do something sensible: use a default, try again, carry on without a feature. If you cannot say what the robot should do instead, do not catch it.
2. **Never catch to hide.** An empty `catch` block (`catch (Exception e) {}`) is almost always a bug waiting to happen. At the very least, report what happened, the way AdvantageKit does, so a person finds out.
3. **Catch checked exceptions near where they happen.** Opening a file, reading a network: wrap that one call, not the whole method.
4. **Let bugs crash on the bench.** Find them with tests (Chapter 22) and simulation, so they never reach a match. That is the real defense against a crash at a competition, and it is the one you have been building since Chapter 22.
5. **When something must keep the robot safe, make the fallback safe.** If you ever do catch an exception around hardware, the "instead" must be the safe thing: motors stopped, not motors left running.

Today, the Mini Swerve has **zero** `try` blocks, and that is correct: it has nothing that talks to the world outside the program except through WPILib and AdvantageKit, which already catch what they should. The first one you write will be in Chapter 31, where PathPlanner reads your robot's settings from a file with a method declared `throws IOException, ParseException`. The compiler will insist on a `try`, and now you will know what to put in the `catch`.

> **Exceptions, in one sentence**
>
> An exception is how Java says "I cannot do this," a `catch` is where you decide what to do instead, and on a robot, the best answer is usually to fix the code so it never throws, and to catch only what the outside world might do to you.

---

## 26.11 Logs Live on the Robot Now

Section 24.12 previewed this, and now it is real: the Mini Swerve's program writes its log on the robot, on the USB stick.

### The USB stick

Every run with a USB stick in the roboRIO writes an `akit_` file to a `logs` folder on the stick. When a run starts, RioLog shows AdvantageKit's line `[AdvantageKit] Logging to "/U/logs/..."` with the file name. `/U` is the roboRIO's name for the USB stick, the way `C:` is a drive name on Windows.

If there is no stick, or it is not formatted FAT32, the robot still runs, and the Driver Station shows AdvantageKit's error, `[AdvantageKit] Failed to open output log file.`: the `catch` from Section 26.10, doing its job. The run is not logged. Make "is the stick in?" part of your team's routine every time the robot is powered on, along with "is the battery charged?" Chapter 39's competition checklist will make it formal.

> **Do not pull the stick while the robot is on**
>
> AdvantageKit writes to the log many times a second. Pull the stick in the middle, and the file can be cut off or damaged, and you lose the run you wanted. Turn the robot off (or at least disable it and wait a few seconds) before taking the stick out. Better yet, leave it in, and copy logs off over the network.

### Getting logs off the robot

In AdvantageScope, first tell it where your robot is: open the preferences (**App** > **Show Preferences...** on Windows, **AdvantageScope** > **Settings...** on a Mac), and set **Robot Address** to your roboRIO's `10.TE.AM.2` address (for team 3415, `10.34.15.2`). While you are on a USB cable, also click **File** > **Use USB roboRIO Address**, which switches AdvantageScope to `172.22.11.2` until you close it. Then:

- **File** > **Download Logs...** connects to the roboRIO and lists its logs, newest first. Select the ones you want, and save them to your laptop. Open one like any log from Chapter 24.
- **File** > **Connect to Robot** > **Default** shows the robot's data **live**, the same way **Connect to Simulator** did for the Explorer.

Open the log from Section 26.8's tests. On the timeline, find the green autonomous stretch and the blue teleop stretch. Graph `RoboRio` > `BatteryVolts`. Then find the Explorer's old friends: `RealOutputs` > `RoboRio` > `RadioLed` going `kGreen` in autonomous and `kOrange` while you held A; the metadata tab with `GitSHA`, `GitDirty`, and `RobotMode` saying `REAL`. And one table the Explorer's logs never had: `SystemStats`, with the roboRIO's own reading of `BatteryVoltage`, `BrownedOut`, its CPU temperature, and the CAN bus. That table is all **outputs**, recorded by AdvantageKit for you to look at. Your `RoboRio/BatteryVolts` is an **input**, recorded for replay. They should show the same battery. Now you know why both exist.

If you did the crash drill with a stick in, find that log too, and open its **Console**: the stack trace is there, written by `LoggedRobot` on the way out.

### The dashboard, on a new robot

Chapter 23 promised that the dashboard would come along with one change, and here it is. Open Elastic, click the gear, and set **IP Address Mode** to **Driver Station**: Elastic asks the Driver Station where the robot is, so it follows whatever connection the Driver Station is using. (On the Explorer, it was **localhost**, because the program ran on your laptop.) The bottom of the window turns green.

The Mini Swerve has almost nothing to show yet, which makes it a good time to start its dashboard properly. Make a **Driver** tab with two widgets: the **Alerts** (find `SmartDashboard` > `Alerts` and show it as an Alerts widget), and the battery voltage. Then do Section 23.4's last steps: save, and export the layout to `src/main/deploy/elastic-layout.json`. Remember Section 26.5's `deploy` block: that file now gets copied to the robot on every deploy, and from there, Elastic's **Load Layout From Robot** can fetch it (Chapter 23's Practice showed how). Commit the layout on a branch, through a pull request.

> **The Driver Station keeps its own log**
>
> Separately from your code, the Driver Station records every match on the laptop: battery voltage, the roboRIO's CPU, every mode change, and every brownout, drawn as orange lines. Open it with the **FRC Driver Station Log File Viewer** that comes with the Game Tools. When the Mini Swerve does something strange in Chapter 27, check both: your AdvantageKit log tells you what your code thought, and the Driver Station log tells you what the robot and the network did.

---

## 26.12 What Survived the Move

### What you built

- **A fact sheet** for your Mini Swerve, written from the real robot, with "how we know" for every row.
- **A new project, done the Explorer's way.** A Command Robot project on WPILib 2026, in a team repository with branches and reviews, with AdvantageKit, gversion metadata, and CI copied in piece by piece.
- **A real deploy.** Your program built once on your laptop, shipped to the roboRIO as a jar, and started there by the roboRIO's own JVM.
- **The first subsystem on the new robot.** `RoboRio`, with `RoboRioIO`, `RoboRioIOReal`, `RoboRioIOSim`, and an empty replay IO, measuring real battery volts, raising a low battery warning and a brownout error as **alerts**, and lighting the RADIO light green in autonomous and orange when you hold A.
- **Six tests**, green on GitHub on every push.
- **A log on a USB stick**, opened in AdvantageScope, with the same shape as every Explorer log, plus the roboRIO's own `SystemStats`.

### What changed, and what did not

| Changed | Did not change |
|---|---|
| Where the program runs, and what "deploy" means | The template shape: `Robot`, `RobotContainer`, `Constants` |
| Where prints go (RioLog) and where logs go (USB stick) | AdvantageKit's setup, word for word |
| `ROBOT_MODE` picks itself with `RobotBase.isReal()` | `RobotMode`, the IO switch, the replay branch |
| Volts are real, and the battery matters | The IO pattern: interface, real, sim, replay |
| A crash stops a robot, not a laptop window | Tests, CI, branches, reviews, and releases |

Most of the right column is the hard part of robot programming, and you already know it. That is why this chapter could move a whole program to a new computer in one chapter without driving a single wheel.

> **What comes next**
>
> The Mini Swerve has eight motors, and none of them has turned yet. Chapter 27 opens the **CAN bus**: the pair of yellow and green wires that links the roboRIO to every SPARK MAX, how each device gets an ID, and how to check that the right motor spins the right way, one at a time, wheels in the air. Your `RoboRio` subsystem will be watching the battery while they do. The first time a drive motor spins up, look at `RoboRio/BatteryVolts`: that dip is sag, measured for real, the thing pretend volts could never show you.

---

## Chapter Summary

> **What you learned in Chapter 26**
>
> * On the Explorer, your program ran on your **laptop**. On the Mini Swerve, it runs on the **roboRIO**: a **deploy** builds one jar, copies it (and the ARM native libraries, and `src/main/deploy`) to the roboRIO, and starts it there. Prints go to **RioLog**, logs go to a **USB stick**, NetworkTables lives on the robot, and the Driver Station is the only way to enable it.
> * A real robot needs real habits: wheels in the air for new code, a word before you enable, **Enter** to disable and the **space bar** to emergency stop, one person at the Driver Station, and careful battery handling. A roboRIO needs an **image** for this year (imaged over USB on a roboRIO 1, onto a microSD card on a roboRIO 2) and a **team number**, which also gives its addresses: `roborio-TEAM-FRC.local`, `10.TE.AM.2`, and `172.22.11.2` over USB.
> * A new robot gets a **new project** (Command Robot, Desktop Support on, WPILib 2026) in a **team repository**. Structure and habits come along from the Explorer (AdvantageKit, gversion, CI, the template shape, the IO pattern); hardware code and measured numbers do not. A **robot fact sheet** records what is really on the robot, and how you know.
> * New Java: the compiler turns Java into **bytecode** for the **JVM**, and each computer's JVM runs it, so one **jar** runs on a laptop and on a roboRIO. The parts that are not portable are **native libraries**, like the HAL, reached through **JNI**: that is the layer where real and simulated robots differ.
> * Real batteries read 12.7 to 13.5 volts at rest and **sag** under load, so the same power gives different speeds: ask for **volts**, not power. Below the **brownout** level (6.3 V on a roboRIO 1, 6.75 V by default on a roboRIO 2), the roboRIO cuts the motors to protect itself.
> * The `RoboRio` subsystem brings the roboRIO's battery and brownout readings through an **IO layer**, because AdvantageKit's `SystemStats` are outputs that replay cannot use. WPILib's **`Alert`** class warns about a low battery at rest and remembers a brownout. `RobotBase.isReal()` lets `ROBOT_MODE` pick itself. Six tests run on every push.
> * New Java: **`throw`** starts an exception; **`try`/`catch`/`finally`** handles one. **Checked** exceptions (like `IOException`) come from the world outside the program and must be caught or declared with `throws`; **unchecked** ones usually mean a bug. On a real robot, an uncaught exception kills the program for seconds, so catch only what you can handle (like AdvantageKit's missing log file), never catch to hide a bug, and find bugs on the bench with tests.

---

## Exercises

### Practice

**1. Predict, then run.** Without running it, write down exactly what this prints, line by line. Then run it in a scratch file and compare:

```java
public class Predict {
    static int half(String text) {
        try {
            int number = Integer.parseInt(text);
            System.out.println("parsed " + number);
            return number / 2;
        } catch (NumberFormatException e) {
            System.out.println("not a number");
            return -1;
        } finally {
            System.out.println("done with " + text);
        }
    }

    public static void main(String[] args) {
        System.out.println(half("10"));
        System.out.println(half("ten"));
        System.out.println(half("7"));
    }
}
```

Now change `"7"` to `null`. What happens, and why does the `catch` not help? (Hint: read the exception's type.)

**2. Checked or unchecked?** For each of these, decide whether it is checked or unchecked, then look it up in the Java documentation to check: `NullPointerException`, `IOException`, `IllegalArgumentException`, `ArithmeticException` (try `5 / 0` with `int`s), `FileNotFoundException`, `InterruptedException`. For each, write one sentence in `reflections.md`: if robot code met this exception, should it be caught, and what should the robot do instead?

**3. Read some bytecode.** Type the `Battery` class from Section 26.6 into a scratch folder. Compile it, and print its bytecode with the JDK that WPILib installed for you. On Windows, in a terminal in that folder:

```bash
& "C:\Users\Public\wpilib\2026\jdk\bin\javac.exe" Battery.java
& "C:\Users\Public\wpilib\2026\jdk\bin\javap.exe" -c Battery.class
```

(On a Mac or Linux, the JDK is in `~/wpilib/2026/jdk/bin/`.) Now add a method `static double power(double volts, double batteryVolts)` that returns `volts / batteryVolts`, and predict its bytecode before you print it. Which instruction changed?

**4. Look inside the jar.** Copy the Mini Swerve's jar out of `build/libs/`, rename the copy to `.zip`, and open it. Find `META-INF/MANIFEST.MF` and read its `Main-Class` line: which class does the JVM start, and where have you seen that class? Find `backup/src` and open your own `RoboRio.java` inside it. Write two sentences in `reflections.md`: why might a team be glad, one day, that the source code is inside the jar on the robot? And why is it still not a replacement for Git?

**5. One more input.** A roboRIO 2 lets code change its brownout level, and both roboRIOs can report it. In a practice branch, add `public double brownoutVolts = 0.0;` to `RoboRioIOInputs`, fill it from `RobotController.getBrownoutVoltage()` in `RoboRioIOReal`, and from `BROWNOUT_VOLTS` in `RoboRioIOSim`. Deploy, and find it in AdvantageScope. What does your roboRIO say? Compare it with `SystemStats` > `BrownoutVoltage`. Do **not** call `setBrownoutVoltage`: raising it makes the robot brown out sooner, and lowering it puts the electronics at risk. Delete the branch, or keep it through a pull request if your team likes it.

**6. A battery that drains.** The pretend battery never gets tired. In a practice branch, make `RoboRioIOSim.updateInputs` lower `batteryVolts` by `0.001` every loop while `DriverStation.isEnabled()` is true. Write a test: start fresh, enable, call `periodic()` enough times to drain below 12.5, disable, call `periodic()` once more, and assert the low battery alert is on. How many loops did it take, and how many seconds is that at 50 loops per second? Is that a realistic battery? (It is not; real sag depends on current. That is what WPILib's `BatterySim` is for, once there are simulated motors.)

### Build (Mini Swerve)

Move your team's code onto the Mini Swerve, without moving the robot.

1. Walk around the robot with your team and a mentor, and fill in the fact sheet table (Section 26.2), with "unknown" where you do not know yet.
2. Check the roboRIO has a 2026 image and your team number, and the radio is set up (Section 26.4). If not, ask a mentor; do not image a shared robot on your own.
3. The owner creates the `MiniSwerve` project (Command Robot, your team number, Desktop Support on), commits, creates the GitHub repository, pushes, and adds teammates as collaborators. Teammates clone it (Section 26.5, Steps 1 to 3).
4. On branch `roborio-setup`, delete the examples, copy in AdvantageKit, gversion, and the CI workflow, and build after each step (Section 26.5, Steps 4 to 6).
5. Robot on blocks, battery in, USB stick in, USB cable connected. Set the Driver Station's team number, deploy the near-empty project, and see `Robot program starting` in RioLog and **Robot Code** green. Enable TeleOperated, watch the RSL blink, disable (Section 26.7).
6. Write `Constants`, `RoboRioIO`, `RoboRioIOReal`, `RoboRioIOSim`, `RoboRio`, `RobotContainer`, and `Robot` (Section 26.8). Run them in simulation first, and check `BatteryVolts` and `RadioLed` in AdvantageScope.
7. Deploy to the robot. Check: `Robot mode: REAL` in RioLog, green RADIO light in autonomous, orange while you hold A in teleop, and the battery in three places.
8. Write `RoboRioTest` and `AutoLightTest`: **6 tests, all green**. Make one fail on purpose, then put it back (Section 26.9).
9. Push, open the pull request, have a teammate review it, wait for the green check, and merge.
10. Do the crash drill on a throwaway branch, read the crash in RioLog and in the log's Console, and delete the branch (Section 26.10).
11. Set up AdvantageScope's robot address, download your logs, and open one. Set up Elastic with **Driver Station** mode, a Driver tab with the Alerts and the battery, and export it to `src/main/deploy/elastic-layout.json` (Section 26.11).
12. Turn your notebook fact sheet into `docs/robot.md`, through a pull request (Collab, below).

If RioLog says `Robot mode: REAL`, the RADIO light turns green in autonomous, the Actions tab shows six green tests, and AdvantageScope can open a log from the robot's USB stick, the Mini Swerve has your code on it, and you are ready for Chapter 27.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. On the Explorer, unplugging the laptop left the program running with nothing to drive. On the Mini Swerve, unplugging it leaves the program running on the robot. Why does the robot still stop moving, and why is that the right design?
2. Your Explorer's tests ran on your laptop and tested code that ran on your laptop. The Mini Swerve's tests run on your laptop and test code that runs on an ARM roboRIO. Using the words **bytecode** and **native library**, explain why the tests still mean something, and name the one layer they cannot check.
3. The battery voltage is already in every log under `SystemStats`. Explain why `RoboRio` reads it through an IO layer anyway, using the words **input**, **output**, and **replay**.
4. The low battery alert only looks while the robot is disabled, and the brownout alert never turns itself off. Explain why each choice is right, and what would go wrong if they were swapped.
5. AdvantageKit catches the `IOException` from a missing USB stick and keeps the robot running. Nobody catches the crash drill's `IllegalStateException`. Explain the difference, using the words **checked**, **unchecked**, and **bug**.
6. Look at the "What comes along" table in Section 26.5. Pick one row that says "never copied" or "stays with the Explorer," and explain what could go wrong on the Mini Swerve if someone copied it anyway.

If any answer feels shaky, re-read Sections 26.1, 26.6, 26.8, and 26.10.

### Git

The owner starts the repository on `main` (Section 26.5):

```bash
git init
git branch -M main
git add .
git commit -m "Ch26: New Command Robot project for the Mini Swerve"
git remote add origin https://github.com/OWNER-NAME/MiniSwerve.git
git push -u origin main
```

The setup branch, with one commit per idea:

```bash
git checkout -b roborio-setup
git add .
git commit -m "Ch26: AdvantageKit, gversion, and CI, copied from the Explorer"
git add .
git commit -m "Ch26: RoboRio subsystem with an IO layer, battery alerts, and the RADIO light"
git add .
git commit -m "Ch26: Tests for the RoboRio subsystem and the autonomous light"
git push -u origin roborio-setup
```

If two teammates wrote the code together at one keyboard, add the `Co-authored-by:` trailer from Chapter 25 to the commits. The crash drill branch is never pushed:

```bash
git checkout -b crash-drill
# ... the drill ...
git checkout main
git branch -D crash-drill
```

`-D` (capital) deletes a branch even though it was never merged, which is exactly what you want for a branch that must never be merged. Git asks you to be sure by making you type the capital letter.

Before every commit, check `git status` for `BuildConstants.java` (it must not be listed) and check `git diff` that `SIM_MODE` is `SIM`. After each pull request is merged, delete its branch on GitHub, and everyone runs `git checkout main` and `git pull`.

### Collab: Three First Pull Requests

A team repository works when everyone on the team has used it, not just the owner. Before Chapter 27, each teammate opens one pull request, and a **different** teammate reviews it:

- **The fact sheet.** Turn the notebook table into `docs/robot.md`, with every row you know and "unknown" for the rest. The reviewer checks at least three rows against the real robot.
- **The robot rules.** Copy the Explorer's `CONTRIBUTING.md` (Chapter 11) and add a section for the shared robot: how your team books robot time, your enable word, the safety rules from Section 26.3, "USB stick in, battery charged" before every session, and "never merge red." The reviewer checks it against what your mentors actually expect.
- **The dashboard.** The Elastic layout from Section 26.11, exported to `src/main/deploy/elastic-layout.json`. The reviewer deploys it, opens Elastic on their own laptop, and loads the layout from the robot.

If there are only two of you, split the third one. Afterward, write two sentences in `reflections.md`: which review found something the author missed, and what was it?

### Explore

- Read WPILib's **roboRIO Brownout** page (link below). It suggests making a **power budget** for a robot. Estimate one for the Mini Swerve: if each of four drive motors can pull 40 amps while accelerating hard, what does that add up to, and what would it do to the battery's voltage? What could code do about it? (Chapter 27 has an answer called a current limit.)
- Open the **FRC Driver Station Log File Viewer** and find the log from your crash drill. Can you see the moment the robot code was lost, and how long it took to come back?
- Read AdvantageKit's **template projects** page, and open the **Spark Swerve** template's `Robot.java` on GitHub. Compare it with yours, line by line. What is the same? What does it do that yours does not yet?
- WPILib 2027 is built for **SystemCore**. Find WPILib's page about what changed from the roboRIO to SystemCore, and list two things in this chapter that would be different on a SystemCore robot.

---

> **Additional Resources**
>
> * **Imaging your roboRIO 1 (WPILib)**: [docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/imaging-your-roborio.html](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/imaging-your-roborio.html) the Imaging Tool, step by step, with troubleshooting
> * **Imaging your roboRIO 2 (WPILib)**: [docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/roborio2-imaging.html](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/roborio2-imaging.html) writing the microSD card, and setting the team number
> * **FRC Driver Station (WPILib)**: [docs.wpilib.org/en/stable/docs/software/driverstation/driver-station.html](https://docs.wpilib.org/en/stable/docs/software/driverstation/driver-station.html) every tab, every indicator, and the keyboard shortcuts
> * **Viewing Console Output (WPILib)**: [docs.wpilib.org/en/stable/docs/software/vscode-overview/viewing-console-output.html](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/viewing-console-output.html) RioLog and the Driver Station's console
> * **roboRIO Brownout and Understanding Current Draw (WPILib)**: [docs.wpilib.org/en/stable/docs/software/roborio-info/roborio-brownouts.html](https://docs.wpilib.org/en/stable/docs/software/roborio-info/roborio-brownouts.html) the brownout stages, and power budgets
> * **Robot Battery Basics (WPILib)**: [docs.wpilib.org/en/stable/docs/hardware/hardware-basics/robot-battery.html](https://docs.wpilib.org/en/stable/docs/hardware/hardware-basics/robot-battery.html) what the voltages mean, and how to care for batteries
> * **Recording Faults with Persistent Alerts (WPILib)**: [docs.wpilib.org/en/stable/docs/software/telemetry/persistent-alerts.html](https://docs.wpilib.org/en/stable/docs/software/telemetry/persistent-alerts.html) the `Alert` class
> * **Built-In Logging (AdvantageKit)**: [docs.advantagekit.org/data-flow/built-in-logging](https://docs.advantagekit.org/data-flow/built-in-logging) what AdvantageKit records on its own, and which of it replays
> * **Exceptions (The Java Tutorials, Oracle)**: [docs.oracle.com/javase/tutorial/essential/exceptions](https://docs.oracle.com/javase/tutorial/essential/exceptions/index.html) `try`, `catch`, `finally`, `throw`, and checked versus unchecked

---

*Next up, Chapter 27: CAN Bus and Real Motor Controllers. The Mini Swerve's code is on the robot; now you wire it to the motors, give every SPARK MAX an ID, and spin each one, alone, wheels in the air, until you trust which way it turns.*
