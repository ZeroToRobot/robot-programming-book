# Chapter 1: What is FRC Programming?

You're about to write code that controls a real robot.

Not a simulation. Not a tutorial toy. A robot with motors and wheels and sensors, one that moves through physical space and does things in the real world based entirely on instructions you write. That's a remarkable thing, and it's worth taking a moment to appreciate before we dive in.

This chapter won't ask you to write a single line of code. Instead, we're going to build a mental map of the territory: what FRC programming actually is, how all the pieces fit together, and what you'll be building over the course of this book. By the time you finish this chapter, you'll understand the big picture well enough that nothing in the chapters ahead will feel like it came out of nowhere.

---

## 1.1 What Happens When You Push a Button?

Let's start with one concrete moment. You're driving your robot during a match. You push the left joystick forward.

What actually happens?

Here's the chain of events, from your thumb to the robot's wheels:

1. **Your thumb pushes the joystick.** The Xbox controller reads the position of the stick as a number between -1.0 and 1.0.

2. **The Driver Station sends that number to the robot.** The Driver Station is a program running on your laptop. Fifty times per second, it packages up all the joystick values and sends them over Wi-Fi to the robot.

3. **The robot radio receives the signal.** The radio is a small Wi-Fi access point mounted on the robot. It receives the packet from your laptop and forwards it to the roboRIO over a wired connection.

4. **The roboRIO receives the data and runs your program.** The roboRIO is the robot's brain: a small computer that runs your Java program. Fifty times per second, it wakes up, reads the latest joystick data, runs through your code, and sends new commands to the motors.

5. **Your program reads the joystick value and tells the motors what to do.** A single line of your code says something like: "set the left motor to whatever the left joystick says." The roboRIO sends that command to the motor controller over a communications network called CAN bus.

6. **The motor controller drives the motor.** The motor controller (a Spark MAX, for example) takes the command (a number between -1 and 1) and converts it into electrical power. More power means a faster motor.

7. **The motor turns the wheel.** The wheel grips the carpet. The robot moves forward.

All of that (steps 1 through 7) happens fifty times every second. The entire time the robot is running, this cycle repeats: read inputs, run your code, write outputs, repeat.


> **The most important idea in this book**
>
> A robot program is a loop that runs 50 times per second. Each iteration reads inputs (joystick positions, sensor values) and writes outputs (motor commands, lights, indicators). Everything else in this book, sensors, PID control, autonomous routines, swerve drive, is built on top of this one simple loop.
> 
> Keep this picture in your head. When something breaks, coming back to it almost always helps.

---

## 1.2 The FRC Ecosystem: A Map of the Pieces

Before you can program a robot, you need to know what you're programming. Here's every major component you'll encounter in FRC, with a plain-English description of what it does and why it exists.

### The roboRIO

The roboRIO is the robot's brain. It's a small computer made by National Instruments that runs your Java program. It has USB ports, Ethernet, and a CAN interface, and it connects to almost everything else on the robot. Every FRC robot is required to use one.

When you hear "deploy your code," it means you're copying your compiled Java program from your laptop to the roboRIO over Wi-Fi.

### The SystemCore

Starting in the 2026-27 season, FRC is rolling out a new robot controller called the **SystemCore**, manufactured by Limelight Vision. It is the official successor to the roboRIO. The hardware is more capable: a Raspberry Pi Compute Module 5 brain, an onboard IMU and display, and more reconfigurable I/O than the roboRIO. From your program's perspective, though, the WPILib APIs are largely the same. Subsystems, commands, the 50 Hz loop, and everything else you learn in this book carry over.

> **A note on SystemCore**
>
> SystemCore is brand new at the time of writing. We will revise the relevant chapters in 2027 once teams (and this book's author) have a full season of real experience with it. For now, the book is written against the roboRIO, and most of what you learn transfers directly to SystemCore.

### The Robot Radio

The radio is a small Wi-Fi device that lives on the robot. At competitions, it connects to the field's network infrastructure. At home or in the shop, it broadcasts its own Wi-Fi network that your laptop connects to directly. Either way, it's the wireless bridge between your Driver Station laptop and the roboRIO.

### The Driver Station

The Driver Station is software that runs on your laptop during matches. It handles a few important jobs: it manages the robot's enable/disable state (a safety feature, meaning the robot cannot move unless the Driver Station says it can), it reads your joystick and controller inputs, and it sends all of that to the robot fifty times per second.

You'll interact with the Driver Station constantly during testing. Learning to read its status lights and log output is a real debugging skill.

### Motor Controllers

Motors need a lot of electrical current, more than a microcontroller can provide directly. Motor controllers sit between the battery and the motors. They receive a command from your program (a number, typically -1 to 1) and translate it into the right amount of power.

The most common motor controllers in FRC are the **REV Spark MAX** (used with NEO motors), the **CTR Electronics Talon FX** (used with Falcon motors), and older devices like the Victor SP. Each has its own Java class in WPILib, but they all work the same way from your program's perspective.

### Actuators

Actuators are the things that actually move. Motors, servos, pneumatic pistons. If it creates motion, it's an actuator. Your program controls actuators by sending commands to their motor controllers or directly to the roboRIO's PWM (Pulse Width Modulation) or CAN (Controller Area Network) outputs.

### Sensors

Sensors are how the robot knows what's happening in the world. Without sensors, autonomous routines would be impossible and even teleop would be unreliable. You'll use many different sensors in this book:

- **Encoders:** measure how far a wheel or motor shaft has rotated, which lets you calculate distance traveled
- **Gyroscopes:** measure the robot's rotation angle; essential for driving straight and field-oriented control
- **Rangefinders / Ultrasonic sensors:** measure distance to nearby objects
- **Cameras:** detect visual targets like AprilTags for precise positioning
- **Limit switches:** detect when a mechanism has reached its physical limit

### The Power Distribution Hub

The Power Distribution Hub (PDH) routes battery power to every component on the robot. Each motor controller, the roboRIO, the radio: they're all powered through the PDH. It also measures current draw per channel, which you can read from your program for diagnostics.

### WPILib

WPILib is the programming toolkit that makes all of the above accessible from Java. Instead of writing low-level code to talk to hardware, you use WPILib classes like `XboxController`, `SparkMax`, and `DifferentialDrive`. WPILib is maintained by Worcester Polytechnic Institute (WPI) and is updated every year with the new FRC season.

This entire book is about learning to use WPILib well.

### The XRP

The XRP is a small educational robot designed by WPI specifically for learning FRC programming. It has two drive motors, wheel encoders, a gyroscope, a rangefinder, a reflectance sensor, and an LED. Those are all the essential hardware components you need to learn real robot programming concepts.

Here's why the XRP matters: it uses the same WPILib APIs as a full competition robot. The code you write for the XRP is not "beginner code" that you'll throw away later. It's the same architecture, the same classes, and the same patterns used by championship-winning FRC teams. The only difference is the scale.

In Phase 1 of this book (Chapters 1-25), the XRP is your primary hardware. You can deploy to it from your own laptop, in your own home, without needing access to a shop or a team robot.

> **Draw this from memory**
> 
> After reading this section, minimize the book and try to draw the FRC ecosystem on a piece of paper. Put the roboRIO in the center, then add the radio, Driver Station, motor controllers, sensors, and WPILib. Label each one with a single sentence. This is a genuinely useful exercise, not busywork. The students who understand the physical system best are always the ones who debug the fastest.

---

## 1.3 Teleop and Autonomous: The Two Jobs of a Robot Program

Every FRC match has two distinct phases:

**Autonomous (Auto):** the first 20 seconds of the match. The Driver Station connection is still active, but driver inputs are ignored. The robot must act entirely on its own, using pre-written logic and sensor feedback to complete tasks on the field. Autonomous is often worth a significant point bonus and can set up the rest of the match.

**Teleop:** the remaining 2 minutes and 20 seconds. The drivers take over. Your program reads joystick inputs and translates them into robot movement and mechanism control.

Because these two phases are so different, every FRC robot program has two completely separate behaviors. In the TimedRobot template you'll use throughout this book, there are separate methods for each mode:

```java
@Override
public void autonomousPeriodic() {
    // This runs 50 times per second during autonomous
}

@Override
public void teleopPeriodic() {
    // This runs 50 times per second during teleop
}
```

The robot is the same physical machine in both modes. What changes is which code is running.

### The Challenge of Autonomous

Autonomous is one of the most interesting problems in FRC programming, and it's worth being honest about why it's hard.

A human driver watching the robot can see the field, react to what's happening, and correct mistakes in real time. The robot in autonomous mode has none of that. It has only its sensors and the logic you programmed ahead of time. If the robot drifts two inches off course because of a carpet seam, your program has to detect that and correct it, or it doesn't get corrected at all.

This is why you'll spend a significant portion of this book learning about sensors, control theory, odometry, and path following. Those aren't abstract academic topics. They're the tools that make autonomous routines actually work on a real field under real conditions.

> **The XRP teaches both**
>
> Even though the XRP is small enough to fit in a backpack, you'll write both teleop and autonomous code for it. The patterns are identical to what you'll use on a competition robot. By the time you get to Phase 2, running a full autonomous routine on a real robot will feel familiar.

---

## 1.4 The Programmer's Role on an FRC Team

If you haven't been on an FRC team before, you might not realize how central programming is to a team's success. Let's be specific about what the programming role actually involves.

### During Build Season

Build season is eight weeks of intense work between the game reveal in January and the first regional competition. For programmers, a typical build season looks roughly like this:

- Understand the game. What does the robot need to do? What sensors will it need? Start setting up the code repository and base structure.
- Write basic teleop code as the mechanical and electrical teams build the robot. Test with a practice chassis if one exists.
- Integrate mechanisms as they come off the build table. Write and tune autonomous routines. This is where the real work happens.
- Integration testing, driver practice, tuning, fixing bugs under pressure.

### Cross-Functional Responsibility

Programming intersects with every other part of the team:

- **Mechanical:** What are the physical limits of each mechanism? Where are the hard stops? What's the range of motion?
- **Electrical:** What are the CAN IDs? Which motors are inverted? Which sensors are wired to which ports?
- **Drive team:** What controls feel natural under match pressure? Should the elevator be position-controlled or speed-controlled?

A good programmer asks these questions proactively. A great programmer documents the answers in `Constants.java` so nobody has to ask twice.

### Competition Day

Here's something no one tells new programmers: at competitions, you are often the last person to work on the robot before it goes on the field. The drive team is psyching up. The mechanical team has stepped back. The programmer is deploying a last-minute fix, checking the Driver Station logs, and trying to remember whether the autonomous chooser is set correctly.

This is not a comfortable feeling the first time. It gets better with practice, process, and good tooling, all of which this book will teach you.

### Beyond FRC

The skills in this book map directly to professional software engineering:

- **Java** is one of the most widely-used languages in industry
- **Git and GitHub** are the standard tools for collaborative software development everywhere
- **Control theory and state machines** appear in robotics, embedded systems, and game development
- **Testing, logging, and debugging** are universal engineering disciplines

FRC programming is real engineering. The stakes are low enough that you can make mistakes and learn from them, but the skills are the real thing.

---

## 1.5 Your Learning Platform: The XRP

Let's look more closely at the hardware you'll be using for the first 25 chapters.

The XRP (Experiential Robotics Platform) was designed by WPI specifically to teach FRC-style programming without requiring access to a full competition robot. Here's what it has:

| Component | What It Does |
|-----------|--------------|
| Two drive motors with encoders | Drive the robot; encoders measure distance traveled |
| IMU (gyroscope + accelerometer) | Measures rotation angle and acceleration |
| Ultrasonic rangefinder | Measures distance to objects in front of the robot |
| Reflectance sensor | Detects the difference between light and dark surfaces (line following) |
| Onboard green LED | Useful for status indication and debugging |
| Wi-Fi | Connects to your laptop for deployment and Driver Station |

The XRP runs WPILib's WebSockets-based hardware abstraction layer, which means your Java code looks almost identical to competition robot code. The class names are slightly different (`XRPMotor` instead of `SparkMax`), but the patterns (subsystems, commands, PID controllers, odometry) are exactly the same.

### The Three-Phase Progression

This book follows a deliberate hardware progression:

**Phase 1: XRP (Chapters 1-25)**
Personal hardware. Deploy from your desk. Crash it without worrying about a $10,000 mechanism. This is where you learn everything: Java, robot structure, sensors, control theory, command-based architecture, simulation, and testing.

**Phase 2: Mini Swerve Bot (Chapters 26-33)**
A shared team robot with real competition hardware: roboRIO, Spark MAX motor controllers, navX gyro, and a camera. This is where you graduate to the full FRC hardware stack, learn swerve drive kinematics, and add vision-based pose estimation.

**Phase 3: Competition Robot (Chapters 34-39)**
Your actual competition robot. The skills from Phases 1 and 2 transfer directly. Phase 3 adds mechanisms, full autonomous routines, pneumatics, and competition-day process.

> **The XRP is not a toy**
> 
> Some students are surprised to find themselves spending 25 chapters on a small robot, the size of a paperback book. Here's the reasoning: 
> 
> The XRP lets you make mistakes cheaply and often. You'll crash it into walls. You'll deploy broken code and watch it spin in circles. You'll tune PID gains until something clicks. All of that learning happens before you're anywhere near a $20,000 competition robot. By the time you get to Phase 2, you'll have real confidence, because you'll have actually debugged real problems.

---

## 1.6 A Peek at What You'll Build

Here's where you're headed.

This book is built around **three projects**, and you build them piece by piece across the chapters. Most chapters end with an exercise that adds one new working feature to whichever project that chapter belongs to.

Two things matter about that structure:

1. **Every exercise is complete on its own.** When you finish a chapter's exercise, the project still compiles, still deploys, and still does something you can see on the robot. You are never left with half-broken code sitting around between chapters.
2. **The exercises compound.** Chapter 6's exercise builds on Chapter 5's work. Chapter 7 builds on Chapter 6. By the end of each section, what started as a program that just drives forward and stops has grown into something genuinely impressive, one chapter-sized step at a time.

Think of it as building a house one room at a time, where every room is fully livable before you start on the next one. You always have a working robot. It just does more things each week.

### XRP Explorer (Chapters 5-25)

Your first complete robot program. The XRP Explorer navigates an obstacle course autonomously: driving to specific distances, turning to specific headings, following a line, and stopping at a target. Along the way, you'll add teleop control, sensor feedback, PID tuning, a state machine, unit tests, and simulation support.

By Chapter 25, the Explorer will be a full command-based robot program with AdvantageKit IO layers, the same architecture used by top FRC teams.

### Mini Swerve Bot (Chapters 26-33)

Swerve drive is the gold standard for FRC mobility: each wheel can rotate independently, letting the robot strafe sideways, spin in place, and follow precise field-relative paths. In Section VI, you'll program a full swerve drivetrain from scratch, add PathPlanner for autonomous path following, characterize the motors with SysId, and fuse AprilTag vision measurements into the pose estimator.

### Competition Bot (Chapters 34-39)

The final phase brings everything together on your team's actual competition robot. You'll add mechanism subsystems, full field autonomous routines with event markers, pneumatics control, and the competition-day deployment process that real teams use at regionals and championships.

### One Glimpse of Real Code

Here's a five-line snippet of WPILib Java, the kind of code you'll be writing by Chapter 20. Don't worry about understanding it yet. Just notice that it's readable:

```java
// When the driver holds A, drive forward at half speed
new JoystickButton(controller, XboxController.Button.kA.value)
    .whileTrue(new DriveForwardCommand(drivetrain, 0.5));
```

And here's a slightly larger piece, a complete command that drives the XRP forward for a set distance:

```java
public class DriveForwardCommand extends Command {
    private final Drivetrain drivetrain;
    private final double targetDistance;

    public DriveForwardCommand(Drivetrain drivetrain, double targetDistance) {
        this.drivetrain = drivetrain;
        this.targetDistance = targetDistance;
        addRequirements(drivetrain);
    }

    @Override
    public void initialize() {
        drivetrain.resetEncoders();
    }

    @Override
    public void execute() {
        drivetrain.drive(0.4, 0);
    }

    @Override
    public boolean isFinished() {
        return drivetrain.getAverageDistanceMeter() >= targetDistance;
    }

    @Override
    public void end(boolean interrupted) {
        drivetrain.stop();
    }
}
```

You don't need to understand any of this right now. But notice: it reads almost like English. `initialize` runs once at the start. `execute` runs every loop. `isFinished` says when to stop. `end` cleans up.

By Chapter 19, you'll understand every line of this. By Chapter 25, you'll be writing code more sophisticated than this from memory.

Let's get started.

---

## Chapter Summary

> **What you learned in Chapter 1**
>  - A robot program is a **50 Hz loop** that reads inputs and writes outputs on every tick. This is the mental model everything else builds on
> - The FRC hardware ecosystem has a fixed set of components (roboRIO, radio, Driver Station, motor controllers, sensors) that your code talks to through **WPILib**
> - Every FRC robot program has two modes: **autonomous** (robot acts alone) and **teleop** (driver controls the robot)
> - The **XRP** is your personal learning platform for the first 25 chapters, it uses the same WPILib APIs as a competition robot, just at a smaller scale
> - You'll build **three complete robot programs** over the course of this book: XRP Explorer, Mini Swerve Bot, and Competition Bot

---

## Exercises

### Reflect

Read the two code snippets at the end of Section 1.6. For each one, write down:
- Every word or phrase you recognize and what you think it might mean
- Every word or phrase you don't recognize at all

Save this list. After Chapter 19, read it again and see how much has changed.

### Practice

Close the book (or this tab) and draw the FRC ecosystem from memory. Put the roboRIO in the center. Add the radio, Driver Station, motor controllers, sensors, and WPILib. Draw arrows showing how data flows between components. Label each component with one sentence describing its job.

Compare your drawing to the description in Section 1.2. What did you miss? What did you remember?

### Explore

Find and watch one match video from a recent FRC season. Search for "FRC match 2026" or "FRC championship 2026" on YouTube and pick any match. While watching, write down:

1. What does the robot do during the 20 second autonomous period?
2. What does it do in teleop, what mechanisms does it operate?
3. What sensors do you think it might be using to accomplish those things?

There are no wrong answers here. You're practicing the skill of looking at a robot and reasoning about the software behind it. You'll get much better at this over the course of the book.

---

> **Additional Resources**
> - **WPILib documentation**: [docs.wpilib.org](https://docs.wpilib.org) is the authoritative reference for everything WPILib. You'll use this constantly.
> - **XRP documentation**: [docs.wpilib.org/en/stable/docs/xrp-robot](https://docs.wpilib.org/en/stable/docs/xrp-robot/index.html) - hardware specs, setup guide, and API reference for the XRP.
> - **The Blue Alliance**: [thebluealliance.com](https://www.thebluealliance.com) - match videos, team history, and competition results for every FRC event.
> - **Chief Delphi**: [chiefdelphi.com](https://www.chiefdelphi.com) is the FRC community forum. When you have a question that Google can't answer, Chief Delphi usually can.

---

*Next up, Chapter 2: Setting Up Your Environment. You'll install WPILib and VS Code, flash your XRP firmware, and deploy your first (empty) robot program.*