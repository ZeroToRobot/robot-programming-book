# 2. Two Core Problems
At the heart of every robot, no matter how simple or complex, lie two fundamental problems. They sound simple. They are not.

## 2.1. Problem 1: How do I move?
A robot must be able to take a command and turn it into motion. This is not trivial. Even a basic instruction like, “Move forward” must be translated into:
- How fast each wheel should spin
- How motors should be controlled
- How to maintain stability and direction

This problem is solved by kinematics.

Kinematics provides the mathematical framework that converts desired motion into actionable commands for the robot’s actuators. It answers the question:

> “What should each part of the robot do to achieve this movement?”

## 2.2. Problem 2: Where am I?
Once the robot starts moving, a second problem immediately appears. “Where am I now?”

Movement alone is not enough. A robot must understand its position relative to the world. Without this awareness:
- Autonomous navigation is impossible
- Path following breaks down
- Precision tasks fail

This problem is solved by two closely related systems:
- Odometry, which estimates position based on movement
- Pose estimation, which improves that estimate using additional sensors

Together, they allow the robot to build and maintain an internal representation of its location.

## 2.3. Why These Problems Matter Together
These two problems are deeply connected. A robot does not solve them once. It solves them continuously, many times per second. The cycle looks like this:
1. Decide how to move
2. Execute the movement
3. Measure what happened
4. Update position
5. Adjust the next movement

This loop runs constantly during both teleoperated control and autonomous operation.

If either part fails:
- Bad kinematics leads to incorrect movement
- Bad position tracking leads to poor decisions
- Strong robotics systems require both to work together seamlessly.

## Closing Thoughts
If you remember just one idea from this section, let it be this: every robot must answer two questions, over and over again:
- How do I move?
- Where am I?

Everything else in this chapter builds on these two foundations.