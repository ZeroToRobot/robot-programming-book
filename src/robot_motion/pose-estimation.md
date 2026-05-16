# 6. Pose Estimation

## 6.1. Why Odometry Is Not Enough

In the previous chapter, we used odometry to estimate the robot’s position:

$$
\text{Pose}_{t+1} = \text{Pose}_t + \Delta \text{Movement}
$$

This works well over short periods. But over time, small errors begin to accumulate.
- Wheels slip  
- Sensors have noise  
- Measurements are not perfect  

As a result, the robot’s estimate slowly drifts away from reality.

Odometry answers: Where do I *think* I am?

But in real systems, we need something better: Where am I *actually*?

This is where pose estimation comes in.

## 6.2. What Is Pose Estimation

Pose estimation improves the robot’s position by combining multiple sources of information.

Instead of relying only on internal measurements, the robot also uses external references.

The idea is simple:

$$
\text{Better Pose} = \text{Internal Estimate} + \text{External Correction}
$$

Where:
- Internal estimate is odometry  
- External correction is vision or other sensors  

Pose estimation continuously adjusts the robot’s belief to stay closer to reality.

## 6.3. Two Types of Information

Pose estimation works because different sensors have different strengths.

### Internal Sensors (Odometry)

- Encoders  
- Gyroscope  

Strengths:
- Smooth and continuous  
- High update rate  

Weakness:
- Drift over time  

### External Sensors (Vision)

- Cameras  
- AprilTag detection  

Strengths:
- Absolute reference to the field  
- No long-term drift  

Weakness:
- Noisy measurements  
- Lower update rate  
- May not always be available  

## 6.4. The Core Idea

Pose estimation combines these two:

- Use odometry for continuous tracking  
- Use vision to correct drift  

At each step:

$$
\text{Pose}_{\text{estimate}} = \text{Odometry} + \text{Correction}
$$

This correction is not a full reset. It is a small adjustment.

The robot balances:
- Trust in its movement  
- Trust in external measurements  

## 6.5. Understanding Correction

Suppose:
- Odometry says robot is at \\((x_1, y_1)\\)
- Vision says robot is at \\((x_2, y_2)\\)  

Instead of jumping directly, the robot blends them:

$$
\text{Pose}_{\text{new}} = (1 - \alpha)\cdot \text{Odometry} + \alpha \cdot \text{Vision}
$$

Where:
- \\(\alpha\\) controls how much we trust vision  
- Small \\(\alpha\\) means trust odometry more  
- Large \\(\alpha\\) means trust vision more  
This prevents sudden jumps and keeps motion stable.

## 6.6. Why Not Fully Trust Vision

It might seem like vision is perfect. It is not.

Vision systems can have:
- Detection errors  
- Latency  
- Partial visibility  

For example:
- Camera detects a tag late
- Robot has already moved
- Measurement is outdated  

If we fully trust vision, the robot may:
- Jump suddenly
- Move erratically

This is why pose estimation blends information instead of replacing it.

## 6.7. Time Matters

Vision measurements are not always current. They often represent the robot’s position in the past. If a frame was captured at time \\(t - \Delta t\\), then:

$$
\text{Vision Pose} = \text{Pose at } (t - \Delta t)
$$

A good system accounts for this delay before applying corrections.

## 6.8. Pose Estimation in WPILib

WPILib provides built-in tools for pose estimation.

For swerve drive: `SwerveDrivePoseEstimator`

Example usage:

```java
poseEstimator.update(gyroRotation, modulePositions);

poseEstimator.addVisionMeasurement(
    visionPose,
    timestamp
);
```

What this does:
- Updates pose using odometry  
- Applies vision correction when available  

## 6.9. The Continuous Loop

Pose estimation runs inside the robot loop.

Each cycle:

1. Update odometry: \\(\text{Pose}_{\text{odometry}}\\)
2. Check for vision measurement  
3. If available, apply correction \\(\text{Pose}_{\text{corrected}}\\)
4. Use updated pose for decisions  

## 6.10. When to Trust Which Sensor

The robot must decide how much to trust each source.

### Trust Odometry More When:
- Robot is moving fast  
- Vision data is noisy  
- No targets are visible  

### Trust Vision More When:
- Robot is stationary  
- Clear markers are visible  
- Drift has accumulated  

## 6.11. Practical Considerations

### Sensor Placement
- Camera must have clear field of view  
- Mounting angle affects accuracy  

### Calibration
- Camera must be calibrated  
- Incorrect calibration leads to incorrect pose  

### Field Layout
- Known markers improve accuracy  
- More references lead to better correction  

## 6.12. From Estimation to Autonomous Behavior

Pose estimation enables:
- Accurate autonomous paths  
- Target alignment  
- Reliable navigation  

Without it:
- Robot drifts  
- Decisions degrade  

With it:
- Robot corrects itself in real time  

## Reflection
- Why does odometry drift  
- Why can’t we fully trust vision  
- What happens if vision data is delayed  
- How does blending improve stability  
- When should the robot trust one sensor over another  

## Closing Thought

Odometry gives the robot a belief. Vision gives the robot a reference. Pose estimation combines both:

$$
\text{Best Estimate} = \text{What I think} + \text{What I see}
$$

This is how robots stay accurate in an imperfect world.