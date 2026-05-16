# Introduction

Before we dive into code, equations, and systems, it is important to understand the full picture of how a robot moves. At a high level, every robot follows a pipeline:

> Intent → Motion → Kinematics → Motors → Movement → Odometry → Position


This pipeline answers two fundamental questions:
1. How does the robot move
2. Where is the robot now

We can also think of this as a learning journey:

> What is motion → Why it matters → How to execute it → How to build it → How to track it

Each chapter in this section focuses on one part of that journey.

## Section Overview
### 1. Robot Motion Fundamentals
<b>What is motion</b>

This chapter builds the foundation. You will learn:
- How motion is represented using \\(v_x\\), \\(v_y\\), and \\(ω\\)
- How robots move in different directions
- How motion behaves over time
- What limits real-world robot movement

By the end, you will understand how to describe any robot movement precisely.

### 2. Two Core Problems
<b>Why motion matters</b>

Every robot must solve two problems:
- How do I move
- Where am I

This chapter explains:
- Why both problems are essential
- How they are connected
- The continuous loop that runs during robot operation

This sets the stage for everything that follows.

### 3. Kinematics
<b>How to execute motion</b>

Once we know what motion is, we must convert it into something the robot can do.

This chapter covers:
- Converting \\(v_x\\), \\(v_y\\), and \\(ω\\) into wheel commands
- Differential and holonomic drive equations
- The concept of inverse kinematics

This is where motion becomes actionable.

### 4. Building a Swerve Drive from Scratch
<b>How to build the system</b>

This chapter puts everything into practice.

You will build a complete swerve drivetrain step by step:
- Modules and subsystems
- Joystick input and motion control
- Field-oriented driving
- Logging, simulation, and system architecture

This is where theory becomes a working robot.

### 5. Odometry
<b>How to track motion</b>

Once the robot moves, it must understand where it ended up.

This chapter explains:
- How position is estimated over time
- How encoders and gyros are used
- Why drift happens and how to manage it

This answers the second core problem: “Where am I?”

### 6. Pose Estimation
<b>How to improve tracking</b>

Odometry alone is not perfect. Small errors accumulate over time. This chapter extends odometry using additional sensors.

You will learn:
- How vision systems provide external references
- How odometry and vision are combined
- How the robot corrects its position over time
- When to trust sensors and when to ignore them

This is how modern robots achieve reliable and accurate positioning.

## Putting It All Together
By the end of this section, you will understand the complete flow:
- A driver provides input
- The system converts input into motion
- Kinematics converts motion into motor commands
- The robot moves
- Sensors measure that movement
- Odometry estimates position
- Pose estimation refines that estimate

This loop runs continuously during both teleoperated and autonomous operation.

## Closing Thoughts
Robot motion is not just about making wheels spin.

It is about understanding how intent becomes movement, and how movement becomes knowledge.

Everything in this section builds toward that idea.