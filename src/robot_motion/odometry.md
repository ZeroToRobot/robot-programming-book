# 5. Odometry

## 5.1. What Is Odometry

Once a robot starts moving, a new problem immediately appears:

**Where am I now?**

Movement alone is not enough. A robot must track its position over time. Odometry is the process of estimating the robot’s position using its own motion.

It answers:
- Where is the robot on the field  
- Which direction is it facing  

The robot’s position is typically represented as:

$$
\text{Pose} = \begin{bmatrix}
x \\\\
y \\\\
\theta
\end{bmatrix}
$$

- \\( x \\): position along the forward axis  
- \\( y \\): position along the sideways axis  
- \\( \theta \\): heading (rotation)  

Together, these form the robot’s **pose**.

## 5.2. The Core Idea

At its core, odometry is simple:

$$
\text{New Pose} = \text{Previous Pose} + \Delta \text{Movement}
$$

Each cycle:
1. The robot measures how much it moved  
2. It adds that movement to its previous position  
3. It updates its current pose  

This happens continuously, many times per second. Odometry does not know where the robot is globally. It only tracks how the robot has moved relative to where it started.

## 5.3. Sources of Motion Data

Odometry relies on sensors to measure movement.

### Encoders

Encoders measure how much a wheel has rotated.

Distance traveled can be computed as:

$$
\text{Distance} = \text{Wheel Rotations} \times \text{Circumference}
$$

$$
\text{Circumference} = \pi \times D
$$

From this, we get:
- Distance traveled  
- Wheel speed  

### Gyroscope

A gyro measures the robot’s heading:

$$
\theta = \theta_{\text{previous}} + \Delta \theta
$$

It tells us:
- How much the robot has rotated  
- Which direction it is facing  

This is critical because motion depends on orientation.

### Swerve Module States

For swerve drive, each module provides:
- Wheel speed  
- Wheel angle  

Motion is represented as:

$$
\mathbf{v} =
\begin{bmatrix}
v_x \\\\
v_y \\\\
\omega
\end{bmatrix}
$$

This allows full 2D motion tracking.

## 5.4. Differential Drive Odometry

A differential drive robot has two wheels:
- Left wheel  
- Right wheel  

Let:
- \\( d_L \\): distance traveled by left wheel  
- \\( d_R \\): distance traveled by right wheel  
- \\( L \\): distance between wheels  

### Forward Movement

$$
\Delta x = \frac{d_L + d_R}{2}
$$

### Rotation

$$
\Delta \theta = \frac{d_R - d_L}{L}
$$

### Pose Update

$$
x_{\text{new}} = x_{\text{old}} + \Delta x \cdot \cos(\theta)
$$

$$
y_{\text{new}} = y_{\text{old}} + \Delta x \cdot \sin(\theta)
$$

$$
\theta_{\text{new}} = \theta_{\text{old}} + \Delta \theta
$$

## 5.5. Holonomic and Swerve Odometry

Holonomic drives can move in any direction.

Motion is defined as:

$$
\mathbf{v} =
\begin{bmatrix}
v_x \\\\
v_y \\\\
\omega
\end{bmatrix}
$$

Over a small time step \( \Delta t \):

$$
\Delta x = v_x \cdot \Delta t
$$

$$
\Delta y = v_y \cdot \Delta t
$$

$$
\Delta \theta = \omega \cdot \Delta t
$$

Pose update becomes:

$$
x_{\text{new}} = x_{\text{old}} + \Delta x
$$

$$
y_{\text{new}} = y_{\text{old}} + \Delta y
$$

$$
\theta_{\text{new}} = \theta_{\text{old}} + \Delta \theta
$$

In practice, swerve uses module states + gyro to compute these values.

WPILib provides: `SwerveDriveOdometry`

## 5.6. The Update Loop

Odometry runs continuously inside the robot loop.

Each cycle (~20 ms):

1. Read sensors  
   - Encoder positions  
   - Gyro heading  

2. Compute movement  

$$
\Delta x, \Delta y, \Delta \theta
$$

3. Update pose  

$$
\text{Pose}_{t+1} = \text{Pose}_t + \Delta \text{Movement}
$$

This loop runs continuously during both teleop and autonomous.

## 5.7. Error and Drift

Odometry is not perfect. Small errors accumulate over time. This is called **drift**.

### Causes of Drift

- Wheel slip  
- Uneven surfaces  
- Sensor noise  
- Incorrect calibration  

### Error Accumulation

If each step has small error \\( \epsilon \\) :

$$
\text{Total Error} \approx n \cdot \epsilon
$$

Where:
- \\( n \\) = number of updates  

Over time, this becomes significant.

## 5.8. Managing Drift

Drift cannot be eliminated, but it can be reduced.

### Best Practices

- Use gyro for accurate heading  
- Calibrate encoders  
- Minimize sudden acceleration  
- Maintain consistent units  

### Resetting Pose

Resetting pose:

$$
\text{Pose} =
\begin{bmatrix}
x_0 \\
y_0 \\
\theta_0
\end{bmatrix}
$$

Used at:
- Start of match  
- Known field positions  

## 5.9. When to Trust Odometry

Odometry works best:
- Over short durations  
- With smooth motion  

It becomes unreliable:
- Over long periods  
- During aggressive driving  

## 5.10. From Odometry to Pose Estimation

Odometry provides an estimate:

$$
\text{Pose}_{\text{estimated}}
$$

But this estimate drifts.

To improve it, robots combine:

$$
\text{Pose}_{\text{final}} = \text{Odometry} + \text{Vision Correction}
$$

This leads to **Pose Estimation**, where multiple sensors are fused.

## Reflection

- What does an encoder measure  
- Why is heading required for position tracking  
- What causes odometry drift  
- Why does error increase over time  
- When should pose be reset  

## Closing Thought

Odometry does not tell the robot exactly where it is.

It tells the robot where it *believes* it is:

$$
\text{Belief} = \text{Previous Belief} + \text{Measured Movement}
$$

Understanding that difference is key to building reliable robot systems.