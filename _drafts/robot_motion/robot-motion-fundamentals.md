# 1. Robot Motion Fundamentals

## 1.1. Why Motion Needs a Model
When a human says, “move forward,” the meaning is obvious.

When a robot receives that same instruction, it means nothing.

A robot does not understand direction. It does not understand intent. It only understands numbers and motor commands. Every movement must be described in a precise and consistent way before the robot can act on it.

Even a simple instruction like “drive forward” must eventually become:
- How fast should the wheels spin
- In which direction they should spin
- Whether the robot should rotate while moving

This is why we need a motion model.

A motion model is a way to describe movement using a small set of well-defined values. It acts as a bridge between human intent and machine execution.

From the previous section, you already know the two core problems:
- How do I move
- Where am I

This chapter focuses on the first one.

Before we can convert motion into wheel commands, we must answer a simpler question:
- How do we describe motion itself?

## 1.2. Degrees of Freedom in Robot Motion
To describe motion, we first need to understand what is possible.

A robot moving on a flat field operates in two dimensions. At any moment, it can move in specific independent ways. These are called degrees of freedom.

A typical FRC robot has three degrees of freedom:
- Move forward or backward
- Move sideways
- Rotate

These are independent of each other.

This means:
- A robot can move forward without rotating
- A robot can rotate without moving
- A robot can do both at the same time

These three freedoms fully describe how a robot can move on the field.

No matter how complex the motion looks, it can always be broken down into these components.

## 1.3. Breaking Motion into Components
In robotics, motion is represented using three values:
- \\(v_x\\): forward or backward velocity
- \\(v_y\\): sideways velocity
- \\(ω\\): rotational velocity

Think of them like this:
- \\(v_x\\) → go forward or backward
- \\(v_y\\) → slide left or right
- \\(ω\\) → turn

These three values form a complete description of motion at any moment. For example:
- \\(v_x\\) = 2, \\(v_y\\) = 0, \\(ω\\) = 0 → move straight forward
- \\(v_x\\) = 0, \\(v_y\\) = 2, \\(ω\\) = 0 → move sideways
- \\(v_x\\) = 0, \\(v_y\\) = 0, \\(ω\\) = 1 → rotate in place

More complex motion:
- \\(v_x\\) = 2, \\(ω\\) = 1 → move forward while turning
- \\(v_x\\) = 1, \\(v_y\\) = 1 → move diagonally

Every possible motion is just a combination of these three values.

## 1.4. Units and Representation
These values must use consistent units.

Standard units:
- \\(v_x\\), \\(v_y\\) → meters per second (m/s)
- \\(ω\\) → radians per second (rad/s)

Using consistent units is critical.

If one part of the system uses inches and another uses meters, the robot will behave incorrectly. Small inconsistencies often lead to large motion errors.

A well-designed system keeps everything in the same unit system.

## 1.5. Robot Coordinate System
To interpret \\(v_x\\) and \\(v_y\\), we define a coordinate system. 

Robot coordinate system:
- +X points forward
- +Y points to the left

Rotation is counterclockwise positive

This means:
- Positive \\(v_x\\) → robot moves forward
- Negative \\(v_x\\) → robot moves backward
- Positive \\(v_y\\) → robot moves left
- Negative \\(v_y\\) → robot moves right

This coordinate system is fixed relative to the robot.

If you get the axes wrong, everything breaks. The robot may move in the wrong direction or rotate incorrectly.

Most motion bugs come from coordinate system confusion.

## 1.6. Field vs Robot Perspective (Intro)
So far, motion has been described relative to the robot.

But drivers think differently.

A driver thinks: “Push forward → robot goes away from me”

This introduces two perspectives:
- Robot-relative motion
- Field-relative motion

Example: If the robot is rotated 90 degrees:
- Robot-relative → pushing forward moves sideways
- Field-relative → pushing forward still moves forward on the field

This difference becomes important later.

For now, remember: Motion can be described relative to different frames of reference.

## 1.7. Types of Robot Motion
Using \\(v_x\\), \\(v_y\\), and \\(ω\\), motion can be grouped into three types.

<b>Translation</b>

Movement without rotation
- Driving forward
- Strafing sideways

<b>Rotation</b>

Turning in place
- Spinning to face a target

<b>Combined Motion</b>

Translation and rotation at the same time
- Driving in an arc
- Circling around a point

Most real robot motion is a combination of these.

## 1.8. Drive Systems and Motion Capability
Not all robots can achieve all types of motion.

<b>Differential Drive</b>
- Controls \\(v_x\\) and \\(ω\\)
- Cannot control \\(v_y\\)
- Cannot move sideways

<b>Holonomic Drive (Swerve, Mecanum)</b>
- Controls \\(v_x\\), \\(v_y\\), and \\(ω\\)
- Can move in any direction

This is why holonomic drives provide more control.

## 1.9. From Motion to Control
At this point, we know how to describe motion.

We can define:
- Forward velocity
- Sideways velocity
- Rotation

But motors do not understand these values.

They only understand:
- Speed
- Direction
- Voltage

So the next step is:
- Convert motion into wheel commands.

This is what kinematics does.

## 1.10. Mental Model: The Motion Pipeline
Every robot follows a pipeline:
- Driver provides input (joystick)
- Input becomes motion (\\(v_x\\), \\(v_y\\), and \\(ω\\))
- Kinematics converts motion into wheel commands
- Motors execute those commands

This happens many times per second.

Think of it as:

> Intent → Motion → Actuation

## 1.11. Common Misconceptions
Forward is not always the same direction. It depends on the reference frame.

Rotation is independent of translation.

More motors does not mean more control. Degrees of freedom matter more.

Sideways motion is not always possible. Only holonomic drives support it.

## Reflection
1. If a robot cannot move sideways, which component is missing
2. Can a robot rotate without translating
3. What combination produces circular motion
4. Why must motion be broken into components before controlling motors
5. What happens if the coordinate system is defined incorrectly

## Closing Thought
Every robot movement can be reduced to three values:
- \\(v_x\\)
- \\(v_y\\)
- \\(ω\\)

If you understand these three, you understand motion.

Everything that follows builds on this foundation.