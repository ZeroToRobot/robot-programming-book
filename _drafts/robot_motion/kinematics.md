# 3. Kinematics

## 3.1. What Is Kinematics?
Kinematics is the process of converting desired robot motion into individual actuator commands. In simple terms, kinematics answers this question:

> “How do we turn a movement instruction into something the robot can actually do?”

### Understanding the Problem
Consider what happens when a driver uses a controller. The driver pushes the joystick forward and expects the robot to move forward. However, the robot does not understand the idea of “forward.” It only understands how to control its motors. So, the robot must convert that joystick input into:
- Wheel speeds
- Motor outputs
- Module angles (in the case of swerve drive)

This conversion process is handled by kinematics.

### Step-by-Step Flow
Here is what happens inside the robot:
1. The driver provides input (joystick)
2. The system interprets the desired motion
3. Kinematics converts motion into wheel commands
4. Motors receive those commands

Without these steps, the robot would not know how to respond to driver input.

## 3.2. The Core Equation of Motion
In WPILib and many robotics systems, robot motion is described as a vector with three components:

$$
V = \begin{bmatrix}
v_x \\\\
v_y \\\\
\omega
\end{bmatrix}
$$

These values represent how the robot moves in a two-dimensional space.
- \\(v_x\\) = forward or backward velocity (meters per second)
- \\(v_y\\) = sideways velocity (meters per second). Only relevant for holonomic drives (like swerve or mecanum)
- \\(ω\\) = Angular velocity or rotation speed (radians per second)

Together, these three values fully describe the robot’s motion at any moment.

Think of it like this:
- \\(v_x\\) = “Go forward or backward”
- \\(v_y\\) = “Slide sideways”
- \\(ω\\) = “Turn”
 
## 3.3. From Motion to Wheels
Once we know the desired motion, we must convert it into wheel speeds. This is where kinematics performs its main function.

### Differential Drive Example
A differential drive robot has two wheels: Left wheel and Right wheel. To achieve both forward movement and rotation, the wheel speeds must be adjusted.

The equations used are:
$$
\text{Left wheel speed} = v_x - (\omega . \frac{L}{2}) \\\\
\text{Right wheel speed} = v_x + (\omega . \frac{L}{2}) \\\\
$$

Understanding the equation,
- \\(v_x\\) = forward velocity
- \\(ω\\) = angular velocity
- \\(L\\) = distance between the wheels
- If \\(ω = 0\\), both wheels move at the same speed → robot moves straight
- If \\(ω > 0\\), one wheel moves faster → robot turns
- <span style="color:#666666">Remember \\(v_y\\) is not applicable for differential drives and is only relevant for holonomic drives</span>

This allows the robot to combine forward motion and rotation smoothly.

### Holonomic Drive Example
A holonomic drive robot (such as a swerve or mecanum drive) can move in multiple directions independently: forward / backward motion, sideways (lateral) motion, and rotation. To achieve full motion, each wheel must be controlled with both speed and direction.

The equations used are:

$$
\text{Wheel velocity vector} = v_x+v_y+(ω×r)
$$

For a typical 4-wheel holonomic robot, each wheel velocity is computed as:
$$
\text{Front Left wheel} = v_x - v_y - ω. \frac{(L+W)}{2} \\\\
\text{Front Right wheel} = v_x + v_y + ω. \frac{(L+W)}{2} \\\\
\text{Rear Left wheel} = v_x + v_y - ω. \frac{(L+W)}{2} \\\\
\text{Rear Right wheel} = v_x - v_y + ω. \frac{(L+W)}{2} \\\\
$$

Understanding the equation,
- \\(v_x\\) = forward velocity
- \\(v_y\\) = sideways velocity
- \\(ω\\) = angular velocity
- \\(L\\) = robot length
- \\(W\\) = robot width
- \\(r\\) = position vector from robot center to the wheel

Unlike differential drives, holonomic drives can combine forward, sideways, and rotational motion simultaneously, giving full 2D control of the robot.

### Inverse Kinematics
We start with desired motion (what we want) and compute wheel speeds (what to do). This is called Inverse Kinematics.

WPILib provides built-in tools to handle kinematics. Here is an example:
```java
ChassisSpeeds speeds = new ChassisSpeeds(2.0, 0.0, 1.0);

DifferentialDriveWheelSpeeds wheelSpeeds =
    kinematics.toWheelSpeeds(speeds);

double left = wheelSpeeds.leftMetersPerSecond;
double right = wheelSpeeds.rightMetersPerSecond;
```
What this does:
- Creates a motion command using , , and    
- Convert that motion into left and right wheel speeds
- Output values that can be sent to motors

This is a direct implementation of kinematics.