# 4. Building a Swerve Drive from Scratch
Swerve drive is the dominant drivetrain in competitive FRC robotics. Every module can point in any direction independently, so the robot can translate and rotate at the same time. It can strafe sideways without turning, spin in place, or drive in a circle while facing a target. That power comes with complexity: four modules, each with two motors and an encoder, all coordinated by a single piece of math called inverse kinematics.

This section builds a complete swerve drive, nine steps at a time. Each step is small enough to understand on its own and ends in a state that either compiles and runs or teaches something concrete. By the end you will have a robot that drives field-oriented, logs all its sensor data deterministically, and can be tested in simulation without any physical hardware.

Pause and reflect on each step, forming your own hypothesis about what the code does and reflecting on it is the fastest way to build real understanding.

## Step 1: A Project That Does Nothing
Every journey starts somewhere. The first step produces a project that compiles, deploys to the roboRIO, and does absolutely nothing.

### The command-based pattern
WPILib gives you two ways to structure a robot program. The simplest is to put everything directly in lifecycle methods like `teleopPeriodic()`. This works for simple robots but falls apart quickly: you end up with long methods full of flags and state machines, subsystems stepping on each other, and no clean way to coordinate actions that span multiple cycles.

The command-based pattern solves this. You divide the robot into subsystems: logical groupings of hardware that own their state, and commands: discrete actions that run on one or more subsystems. The framework's CommandScheduler runs every cycle, executing active commands and ensuring no two commands fight over the same subsystem.

### The skeleton files
`Robot.java` extends TimedRobot (later `LoggedRobot`) and has one job: forward lifecycle events to the `CommandScheduler`.
```java
public class Robot extends TimedRobot {
    private final RobotContainer robotContainer = new RobotContainer();

    @Override
    public void robotPeriodic() {
        CommandScheduler.getInstance().run();  // runs every 20 ms
    }
}
```
`RobotContainer.java` is the wiring room. It constructs subsystems, creates commands, and binds them together. At this stage it is empty, but it is the file that will grow the most.
```java
public class RobotContainer {
    public RobotContainer() {
        // nothing yet
    }

    public Command getAutonomousCommand() {
        return Commands.print("No autonomous command configured");
    }
}
```

### Reflection
1. What is `RobotContainer` responsible for? Why is wiring logic kept separate from the Robot class itself?
2. What happens if you deploy this and push the joystick?
3. `CommandScheduler.getInstance().run()` is called in `robotPeriodic()`, which fires every 20 ms. What would happen if you accidentally called it in `teleopPeriodic()` instead?

## Step 2: Constants
Before writing any hardware code, collect every physical measurement and conversion factor in one place. This is Constants.java. It never holds mutable state, every field is public static final.

### Why a constants file?
Magic numbers scattered through hardware code are a maintenance hazard. When you change wheel size or swap a gearbox, you want to edit one number in one file, not hunt through three classes. The constants file also serves as documentation: a reader can understand the robot's physical geometry without running the code.

### DriveConstants
```java
public static final class DriveConstants {
    public static final double PHYSICAL_MAX_SPEED_METERS_PER_SECOND = 5.0;
    public static final double TELEDRIVE_MAX_ACCELERATION_UNITS_PER_SECOND = 3.0;
    public static final double TELEDRIVE_MAX_ANGULAR_ACCELERATION_UNITS_PER_SECOND = 3.0;

    // Speed limiter: 0.0 to 1.0 (e.g. 0.1 = 10% power, 0.5 = 50%, 1.0 = full speed)
    public static final double SPEED_LIMITER = 0.2;

    public static final double TRACK_WIDTH_METERS = Units.inchesToMeters(15.5);
    public static final double WHEEL_BASE_METERS = Units.inchesToMeters(15.5);
    public static final SwerveDriveKinematics SWERVE_KINEMATICS = new SwerveDriveKinematics(
        new Translation2d(TRACK_WIDTH_METERS / 2.0, WHEEL_BASE_METERS / 2.0),   // Front Left
        new Translation2d(TRACK_WIDTH_METERS / 2.0, -WHEEL_BASE_METERS / 2.0),  // Front Right
        new Translation2d(-TRACK_WIDTH_METERS / 2.0, WHEEL_BASE_METERS / 2.0),  // Back Left
        new Translation2d(-TRACK_WIDTH_METERS / 2.0, -WHEEL_BASE_METERS / 2.0)  // Back Right
    );
}
```

`SwerveDriveKinematics` takes the positions of the four modules relative to the robot center. It uses these positions in two directions: inverse kinematics (given a desired chassis motion, what should each module do?) and forward kinematics (given what each module is doing, what is the chassis doing?).

The coordinate system follows the WPILib convention: +X points toward the front of the robot, +Y points to the left. That is why "front left" has a positive X and positive Y.

### SwerveModuleConstants and unit conversion
Raw encoder values are in motor rotations. The rest of the code works in meters and radians. The conversion is done once, here:
```java
public static final class SwerveModuleConstants {
    public static final double WHEEL_DIAMETER_METERS = Units.inchesToMeters(2);

    // Gear ratios: (input teeth / output teeth) for each stage
    public static final double DRIVE_MOTOR_GEAR_RATIO =
        (48.0/16.0) * (16.0/28.0) * (45.0/15.0);
    public static final double STEER_MOTOR_GEAR_RATIO =
        (16.0/10.0) * (32.0/15.0);

    // One motor rotation → this many meters of wheel travel
    public static final double DRIVE_ENCODER_ROTATIONS_TO_METERS =
        (Math.PI * WHEEL_DIAMETER_METERS) / DRIVE_MOTOR_GEAR_RATIO;

    // One encoder rotation → this many radians of module angle
    public static final double STEER_ENCODER_ROTATIONS_TO_RADIANS = 2.0 * Math.PI;

    // TalonFX getVelocity() returns rotations per second, so same factor applies
    public static final double DRIVE_ENCODER_RPS_TO_METERS_PER_SECOND =
        DRIVE_ENCODER_ROTATIONS_TO_METERS;
    public static final double STEER_ENCODER_RPS_TO_RADIANS_PER_SECOND =
        STEER_ENCODER_ROTATIONS_TO_RADIANS;

    public static final double STEER_KP = 0.3;
    public static final double STEER_KD = 0.005;
}
```

Work through the drive gear ratio by hand. The three stages multiply together: `(48/16) × (16/28) × (45/15) = 3.0 × 0.571 × 3.0 ≈ 5.14`. That means the motor spins about 5.14 times for every one full rotation of the wheel.

The circumference of the wheel is `π × diameter = π × 0.0508 m ≈ 0.1597 m`. One motor rotation therefore moves the wheel `0.1597 / 5.14 ≈ 0.031 m`. Multiply a TalonFX position reading in rotations by `DRIVE_ENCODER_ROTATIONS_TO_METERS` and you have wheel travel in meters, no further math needed anywhere else in the code.

`SPEED_LIMITER = 0.2` caps the robot at 20% of full speed. This is intentional for early development: a robot that has never been driven before should be tested slowly.

### Reflection
1. `TRACK_WIDTH_METERS` and `WHEEL_BASE_METERS` are equal on this robot. What does that tell you about its shape?
2. Why does `DRIVE_ENCODER_RPS_TO_METERS_PER_SECOND` equal `DRIVE_ENCODER_ROTATIONS_TO_METERS` rather than being derived differently?
3. What would break if you swapped the `FL` and `FR` positions in `SWERVE_KINEMATICS`?
4. The CANcoder measures absolute angle, so `STEER_ENCODER_ROTATIONS_TO_RADIANS = 2π`. Why is there no gear ratio in the steer conversion?

## Step 3: The Swerve Module
A swerve module is one corner of the robot. It has a drive motor (moves the robot) and a steer motor (points the wheel). The `SwerveModule` class controls one module using a PID loop for steering.

> Note: After the AdvantageKit IO refactor in Step 8, SwerveModule no longer talks to hardware directly. The version shown here reflects the final state of the code, which already uses the IO layer introduced in Step 8. Reading the Step 3 diff will show you the simpler, pre-IO version.

```java
public class SwerveModule {
    private final String moduleName;
    private final SwerveModuleIO io;
    private final SwerveModuleIOInputsAutoLogged inputs = new SwerveModuleIOInputsAutoLogged();
    private final PIDController steerPIDController;
    
    public SwerveModule(String moduleName, SwerveModuleIO io) {
        this.moduleName = moduleName;
        this.io = io;
    
        steerPIDController = new PIDController(
            SwerveModuleConstants.STEER_KP, 0.0, SwerveModuleConstants.STEER_KD);
        steerPIDController.enableContinuousInput(-Math.PI, Math.PI);
    }
```

### The continuous input PID trick
The steer angle wraps: 179° and −179° are only 2° apart, but without special handling the PID controller would try to drive 358° in the wrong direction to close that gap. `enableContinuousInput(-Math.PI, Math.PI)` tells the controller that the input space wraps around, so it always takes the shortest path.

### Setting a desired state
```java
public void setDesiredState(SwerveModuleState state) {
    // If the speed command is nearly zero, don't try to steer — just stop.
    // This prevents the wheels from snapping back to 0° every time you release
    // the joystick.
    if (Math.abs(state.speedMetersPerSecond) < 0.001) {
        stop();
        return;
    }

    // Optimization: if reaching the target angle would require rotating more
    // than 90°, flip the drive direction and use the closer angle instead.
    state.optimize(new Rotation2d(inputs.steerPositionRad));

    // Normalize drive speed to [-1, 1] as a fraction of max speed.
    double driveOutput =
        state.speedMetersPerSecond / DriveConstants.PHYSICAL_MAX_SPEED_METERS_PER_SECOND;

    // PID: compute steer motor output to close the angle error.
    double steerPIDOutput = steerPIDController.calculate(
        inputs.steerPositionRad, state.angle.getRadians());
    // Clamp to motor output range
    steerPIDOutput = Math.max(-1.0, Math.min(1.0, steerPIDOutput));

    io.setDriveOutput(driveOutput);
    io.setSteerOutput(steerPIDOutput);
}
```

<b>State optimization</b> is critical. Without it, a module commanded to point at 170° when it is currently at −170° would rotate 340° the long way around. Optimization flips the drive direction and targets −10° instead, a 160° rotation. But wait, that is still more than 90°. In fact, optimizing means: if the target angle is more than 90° away, flip the drive sign and add 180° to the target. Now the module only ever needs to rotate at most 90°, and the wheel spins backward to compensate. The net motion is identical.

### Reading state
```java
public void periodic() {
    io.updateInputs(inputs);
    Logger.processInputs("Drive/" + moduleName, inputs);
}

public SwerveModuleState getState() {
    return new SwerveModuleState(
        inputs.driveVelocityMetersPerSec,
        new Rotation2d(inputs.steerPositionRad));
}

public SwerveModulePosition getPosition() {
    return new SwerveModulePosition(
        inputs.drivePositionMeters,
        new Rotation2d(inputs.steerPositionRad));
}
```

`SwerveModuleState` captures the current speed and angle i.e. a snapshot of what the module is doing right now. `SwerveModulePosition` captures total distance traveled and current angle that is used by odometry to integrate position over time.

### Reflection
1. Draw a module at 170°. It receives a command to go to −170°. Trace through `optimize()`: what angle does the module actually steer to, and does the drive motor run forward or backward?
2. Why does `setDesiredState` clamp `steerPIDOutput` to `[-1, 1]` but not driveOutput? (Hint: what values can speedMetersPerSecond legally take in a `SwerveModuleState`?)
3. What would happen if `enableContinuousInput` were removed?

## Step 4: The Swerve Subsystem
Four modules are better than one. `SwerveSubsystem` owns all four and exposes a single method, `setModuleStates()`, that the rest of the code uses to drive.
```java
public class SwerveSubsystem extends SubsystemBase {
    private final SwerveModule frontLeft, frontRight, backLeft, backRight;
    private final GyroIO gyroIO;
    private final GyroIOInputsAutoLogged gyroInputs = new GyroIOInputsAutoLogged();
    private final SwerveDriveOdometry odometry;

    public SwerveSubsystem(
            GyroIO gyroIO,
            SwerveModuleIO flIO, SwerveModuleIO frIO,
            SwerveModuleIO blIO, SwerveModuleIO brIO) {

        this.gyroIO = gyroIO;
        frontLeft  = new SwerveModule("FL", flIO);
        frontRight = new SwerveModule("FR", frIO);
        backLeft   = new SwerveModule("BL", blIO);
        backRight  = new SwerveModule("BR", brIO);

        // Give the gyro 1 second to boot before zeroing it
        new Thread(() -> {
            try { Thread.sleep(1000); } catch (Exception e) {}
            zeroHeading();
        }).start();

        odometry = new SwerveDriveOdometry(
            DriveConstants.SWERVE_KINEMATICS,
            getRotation2d(),
            getModulePositions());
    }
```

### The periodic loop
Every 20 ms the scheduler calls `periodic()`. The ordering here is deliberate:
```java
@Override
public void periodic() {
    // 1. Read all hardware inputs first — one consistent snapshot of the world
    gyroIO.updateInputs(gyroInputs);
    Logger.processInputs("Drive/Gyro", gyroInputs);

    frontLeft.periodic();   // each calls io.updateInputs() internally
    frontRight.periodic();
    backLeft.periodic();
    backRight.periodic();

    // 2. Use that snapshot to advance odometry
    odometry.update(getRotation2d(), getModulePositions());

    // 3. Log derived outputs
    Logger.recordOutput("Odometry/Pose", getPose());
    Logger.recordOutput("Odometry/ModuleStates", getModuleStates());
}
```
Always read hardware first, then compute, then output. If you intersperse reads and writes you can end up using stale data from the previous cycle.

### Desaturating wheel speeds
```java
public void setModuleStates(SwerveModuleState[] desiredStates) {
    SwerveDriveKinematics.desaturateWheelSpeeds(desiredStates, DriveConstants.PHYSICAL_MAX_SPEED_METERS_PER_SECOND);
    frontLeft.setDesiredState(desiredStates[0]);
    frontRight.setDesiredState(desiredStates[1]);
    backLeft.setDesiredState(desiredStates[2]);
    backRight.setDesiredState(desiredStates[3]);
}
```
`desaturateWheelSpeeds` addresses a subtle problem. If the kinematics math produces a desired speed for one module that exceeds the physical maximum, you cannot just clamp it, clamping one module but not others would change the direction of motion. Instead, all four speeds are scaled down proportionally so the fastest module is exactly at the limit and the direction is preserved.

### SubsystemBase
Extending `SubsystemBase` does two things: it registers the subsystem with the scheduler (so `periodic()` is called automatically) and it enables the requirements system (commands declare which subsystems they use, and the scheduler prevents conflicts).

### Reflection
1. Why is the gyro zeroed in a background thread rather than directly in the constructor?
2. If `setModuleStates` did not call `desaturateWheelSpeeds`, what would happen when you commanded full speed while also rotating?
3. The robot still cannot be driven at this point. What is missing?

## Step 5: Teleop Command (The Robot Drives)
This is the step where the robot moves for the first time. `SwerveJoystickCommand` reads joystick axes and translates them into module states.

### The command lifecycle
A WPILib command has four lifecycle methods:
| Method | Called when |
|-|-|
| `initialize()` | Command is first scheduled |
| `execute()` | Every scheduler cycle while running |
| `isFinished()` | Checked each cycle; return true to end |
| `end(boolean)` | Command finishes or is interrupted |

`SwerveJoystickCommand` runs forever (`isFinished` returns `false`) and stops the modules only when interrupted.

### The full execute() pipeline
```java
@Override
public void execute() {
    // 1. Read joystick axes
    double xSpeed    = xSpeedFunction.get();
    double ySpeed    = ySpeedFunction.get();
    double rotation  = rotationFunction.get();

    // 2. Dead-band: ignore small values caused by joystick drift
    xSpeed   = Math.abs(xSpeed)   > OperatorInterfaceConstants.DEAD_BAND ? xSpeed   : 0.0;
    ySpeed   = Math.abs(ySpeed)   > OperatorInterfaceConstants.DEAD_BAND ? ySpeed   : 0.0;
    rotation = Math.abs(rotation) > OperatorInterfaceConstants.DEAD_BAND ? rotation : 0.0;

    // 3. Slew rate limiting: cap how fast the speed can change per cycle
    xSpeed   = xSpeedLimiter.calculate(xSpeed);
    ySpeed   = ySpeedLimiter.calculate(ySpeed);
    rotation = rotationLimiter.calculate(rotation);

    // 4. Scale to physical units
    double maxSpeed = DriveConstants.PHYSICAL_MAX_SPEED_METERS_PER_SECOND
                    * DriveConstants.SPEED_LIMITER;
    double maxAngularSpeed = maxSpeed / (DriveConstants.TRACK_WIDTH_METERS / 2.0);

    // 5. Build ChassisSpeeds (field-relative — requires heading)
    ChassisSpeeds chassisSpeeds = ChassisSpeeds.fromFieldRelativeSpeeds(
        xSpeed   * maxSpeed,
        ySpeed   * maxSpeed,
        rotation * maxAngularSpeed,
        headingFunction.get()
    );

    // 6. Log everything
    Logger.recordOutput("SwerveJoystickCommand/xSpeed", xSpeed);
    Logger.recordOutput("SwerveJoystickCommand/ySpeed", ySpeed);
    Logger.recordOutput("SwerveJoystickCommand/rotation", rotation);
    Logger.recordOutput("SwerveJoystickCommand/ChassisSpeeds/vx", chassisSpeeds.vxMetersPerSecond);
    Logger.recordOutput("SwerveJoystickCommand/ChassisSpeeds/vy", chassisSpeeds.vyMetersPerSecond);
    Logger.recordOutput("SwerveJoystickCommand/ChassisSpeeds/omega", chassisSpeeds.omegaRadiansPerSecond);

    // 7. Inverse kinematics: chassis motion → four module states
    SwerveModuleState[] moduleStates =
        DriveConstants.SWERVE_KINEMATICS.toSwerveModuleStates(chassisSpeeds);

    // 8. Send to hardware
    swerveSubsystem.setModuleStates(moduleStates);
}
```
### Suppliers, not values
The joystick values are passed as `Supplier<Double>`, not `double`. If they were passed as plain values at construction time, they would be read once and never change. A `Supplier` is a zero-argument function that is called every cycle, so each call to `execute()` gets the current joystick position.

```java
// In RobotContainer:
swerveSubsystem.setDefaultCommand(new SwerveJoystickCommand(
    swerveSubsystem,
    () -> -controller.getLeftY(),   // forward/backward
    () -> -controller.getLeftX(),   // left/right
    () -> -controller.getRightX(),  // rotation
    swerveSubsystem::getRotation2d  // current heading
));
```
The negation on the Y axes is because joystick Y is positive-down on most controllers, but WPILib's coordinate system is positive-forward.

### Dead-band
Physical joysticks have a resting position that drifts slightly from zero. Without dead-band, the robot would creep even when you are not touching the controller. The 0.1 dead-band means: if the raw axis value is between −0.1 and 0.1, treat it as exactly 0.

### Slew rate limiting
A `SlewRateLimiter` with rate `r` will not allow the output to change faster than `r` units per second. At 20 ms per cycle that is `r × 0.02` units per cycle. With `TELEDRIVE_MAX_ACCELERATION_UNITS_PER_SECOND = 3.0`, the output can change at most 0.06 per cycle — a smooth ramp-up rather than an instant jump to full speed. This protects wheels from slipping on rapid starts.

### ChassisSpeeds
`ChassisSpeeds` bundles the three degrees of freedom of robot motion:
- `vxMetersPerSecond`: forward/backward velocity
- `vyMetersPerSecond`: left/right velocity
- `omegaRadiansPerSecond`: rotational velocity

`toSwerveModuleStates()` applies inverse kinematics: given the desired chassis motion and the positions of the four modules (encoded in `SWERVE_KINEMATICS`), what speed and angle should each module have? The math produces four `SwerveModuleState` objects that are then sent to the subsystem.

### setDefaultCommand
Calling setDefaultCommand on the subsystem means: whenever no other command requires the drivetrain, run this command. For a teleop drivetrain, this is the permanent driving command.

### Reflection
1. Why is `Supplier<Double>` used instead of reading the joystick directly in `SwerveJoystickCommand`?
2. Trace a full cycle: driver pushes joystick to 0.5 forward. Walk the value through dead-band, slew rate, scaling, `ChassisSpeeds`, kinematics, and finally to a motor.
3. What does `addRequirements(swerveSubsystem)` do? What would happen without it?
4. Why is the Y axis negated when passed to the command?

## Step 6: Field-Oriented Driving
In robot-oriented mode, "forward" means the front of the robot. Push the joystick forward and the robot drives in whatever direction its nose is pointing. In field-oriented mode, "forward" always means the same direction on the field regardless of which way the robot is facing. For most drivers, field-oriented is far easier to control.

The change requires two additions: a gyroscope to measure the robot's heading, and a rotation of the joystick inputs by that heading.

### ChassisSpeeds.fromFieldRelativeSpeeds
The conversion is one function call:
```java
ChassisSpeeds chassisSpeeds = ChassisSpeeds.fromFieldRelativeSpeeds(
    xSpeed   * maxSpeed,
    ySpeed   * maxSpeed,
    rotation * maxAngularSpeed,
    headingFunction.get()          // current robot heading from gyro
);
```
Internally this rotates the (\\(v_x\\), \\(v_y\\)) vector by the negative heading angle. If the robot is facing 90° left and the driver pushes forward, the joystick produces \\((v_x=1)\\), \\((v_y=0)\\). After rotating by −90°, the chassis speeds become \\((v_x=0)\\), \\((v_y=1)\\). The robot moves right relative to itself, which is forward relative to the field.

### Odometry
`SwerveDriveOdometry` integrates module positions and gyro heading to estimate where the robot is on the field:
```java
odometry = new SwerveDriveOdometry(
    DriveConstants.SWERVE_KINEMATICS,
    getRotation2d(),
    getModulePositions());

// In periodic():
odometry.update(getRotation2d(), getModulePositions());
```
Each call to `update()` uses the change in each module's drive encoder and the current gyro heading to dead-reckon the robot's pose (x, y, heading) from its starting position. Odometry drifts over time, it has no absolute reference, but it is accurate enough for most in-match use cases and is the foundation for autonomous path following.

### The gyro startup delay
```java
new Thread(() -> {
    try { Thread.sleep(1000); } catch (Exception e) {}
    zeroHeading();
}).start();
```
The Pigeon 2 gyro needs a moment after power-on before its yaw reading is stable. Zeroing it too early can produce an incorrect initial heading. A background thread waits one second and then zeros the yaw. The robot code continues starting up during that second; the subsystem simply has a slightly incorrect heading until the zero completes.

### Reflection
1. If the robot is facing 45° to the left and the driver pushes straight forward, what are the \\(v_x\\) and \\(v_y\\) values of the resulting ChassisSpeeds?
2. What happens to field-oriented driving if the gyro is never zeroed?
3. Odometry has no absolute reference. Name two things that can cause it to drift.
4. Why is the gyro zero done in a background thread instead of calling `Thread.sleep` directly in the constructor?

## Step 7: AdvantageKit Logging
Debugging a robot during a match is hard. You cannot add print statements and watch the output in real time, and by the time you get the robot back in the pit the problem may be gone. The solution is deterministic logging: record every sensor input and every computed output to a file, then replay the log later to reproduce exactly what happened.

AdvantageKit is a logging framework built for WPILib robots. Its key property is <i>replay determinism</i>: you can feed a log file back into the code and get identical outputs, because all sensor values came from the log rather than hardware.

### LoggedRobot
Swapping `TimedRobot` for `LoggedRobot` is the only change to `Robot.java`'s class declaration. The logger is initialized in the constructor:
```java
public class Robot extends LoggedRobot {
    private final RobotContainer robotContainer;

    public Robot() {
        initLogger();               // must happen before RobotContainer
        robotContainer = new RobotContainer();
    }

    @Override
    public void robotPeriodic() {
        CommandScheduler.getInstance().run();
    }

    private void initLogger() {
        Logger.addDataReceiver(new WPILOGWriter());    // write to .wpilog file on roboRIO
        Logger.addDataReceiver(new NT4Publisher());    // stream live to AdvantageScope
        Logger.recordMetadata("ProjectName", "2026 Mini Swerve");
        Logger.recordMetadata("BuildMode", RobotBase.isReal() ? "REAL" : "SIM");
        Logger.start();
    }
}
```
`WPILOGWriter` writes to the roboRIO's file system. `NT4Publisher` streams live data over NetworkTables to AdvantageScope on a laptop connected to the robot's radio.

### Logger.recordOutput
Anywhere in the code you can record a named value:
```java
Logger.recordOutput("RobotState", "Teleop");
Logger.recordOutput("Odometry/Pose", getPose());
Logger.recordOutput("Odometry/ModuleStates", getModuleStates());
Logger.recordOutput("SwerveJoystickCommand/xSpeed", xSpeed);
```
The string keys form a hierarchy separated by `/`. AdvantageScope displays them as a tree. `Pose2d`, `SwerveModuleState[]`, and all primitive types are natively supported.

### What to log
As a rule: log everything that could help you answer "why did the robot do that?" during post-match review. For a swerve drive that means:
- All raw joystick inputs
- Derived `ChassisSpeeds` (\\(v_x\\), \\(vy\\), \\(ω\\))
- Per-module desired and actual states
- Robot pose from odometry
- Gyro heading
- Robot mode transitions (Disabled / Teleop / Autonomous)

The IO pattern in Step 8 will add automatic logging of all sensor inputs.

### Reflection
1. Why is logging to a file more useful than `System.out.println` during a match?
2. `initLogger()` is called before `new RobotContainer()`. Why does order matter?
3. `WPILOGWriter` writes to the roboRIO SD card. What happens when the card fills up?
4. AdvantageKit guarantees replay determinism. What assumption must the code satisfy for this to work? (Hint: think about where sensor values come from.)

## Step 8: The AdvantageKit IO Pattern
Step 7 added logging infrastructure. Step 8 adds the architectural pattern that makes deterministic replay possible: every hardware access is hidden behind an interface.

### The problem with direct hardware calls
If SwerveModule calls `driveMotor.getPosition()` directly, replay is impossible: the value comes from the real motor controller during a match, but there is no motor controller during replay. AdvantageKit's solution is to route all sensor reads through a single method, `updateInputs()`, and log every value it produces. During replay, `updateInputs()` reads from the log instead of hardware.

### SwerveModuleIO
```java
public interface SwerveModuleIO {

    @AutoLog
    class SwerveModuleIOInputs {
        public double drivePositionMeters     = 0.0;
        public double driveVelocityMetersPerSec = 0.0;
        public double steerPositionRad        = 0.0;
        public double steerVelocityRadPerSec  = 0.0;
        public double driveAppliedOutput      = 0.0;
        public double steerAppliedOutput      = 0.0;
    }

    default void updateInputs(SwerveModuleIOInputs inputs) {}
    default void setDriveOutput(double output) {}
    default void setSteerOutput(double output) {}
    default void stop() {}
    default void resetDriveEncoder() {}
}
```
`@AutoLog` is a compile-time annotation processor that generates `SwerveModuleIOInputsAutoLogged`. This subclass overrides every setter to call `Logger.recordInput()` automatically. You never have to manually log each field, just annotate the class and AdvantageKit handles it.
All methods are default (no-op) so that a minimal implementation can be created with `new SwerveModuleIO() {}`. It is useful for log replay where you want the interface but no hardware behavior.

### SwerveModuleIOTalonFX
The real hardware implementation:
```java
public class SwerveModuleIOTalonFX implements SwerveModuleIO {
    private final TalonFX driveMotor;
    private final TalonFX steerMotor;
    private final CANcoder canEncoder;
    private final boolean driveMotorInverted;
    private final boolean steerMotorInverted;

    public SwerveModuleIOTalonFX(
            int driveMotorID, int steerMotorID, int canEncoderID,
            boolean driveMotorInverted, boolean steerMotorInverted) {
        this.driveMotorInverted  = driveMotorInverted;
        this.steerMotorInverted  = steerMotorInverted;
        driveMotor  = new TalonFX(driveMotorID);
        steerMotor  = new TalonFX(steerMotorID);
        canEncoder  = new CANcoder(canEncoderID);
        driveMotor.setPosition(0);
    }

    @Override
    public void updateInputs(SwerveModuleIOInputs inputs) {
        inputs.drivePositionMeters =
            driveMotor.getPosition().getValueAsDouble()
                * SwerveModuleConstants.DRIVE_ENCODER_ROTATIONS_TO_METERS;

        inputs.driveVelocityMetersPerSec =
            driveMotor.getVelocity().getValueAsDouble()
                * SwerveModuleConstants.DRIVE_ENCODER_RPS_TO_METERS_PER_SECOND;

        // CANcoder returns absolute position in rotations; convert to radians
        // and normalize to [-π, π]
        double rawRad =
            canEncoder.getAbsolutePosition().getValueAsDouble()
                * SwerveModuleConstants.STEER_ENCODER_ROTATIONS_TO_RADIANS;
        inputs.steerPositionRad = Math.IEEEremainder(rawRad, 2.0 * Math.PI);

        inputs.steerVelocityRadPerSec =
            canEncoder.getVelocity().getValueAsDouble()
                * SwerveModuleConstants.STEER_ENCODER_RPS_TO_RADIANS_PER_SECOND;
    }

    @Override
    public void setDriveOutput(double output) {
        driveMotor.set(driveMotorInverted ? -output : output);
    }

    @Override
    public void setSteerOutput(double output) {
        steerMotor.set(steerMotorInverted ? -output : output);
    }

    @Override
    public void stop() {
        driveMotor.set(0);
        steerMotor.set(0);
    }

    @Override
    public void resetDriveEncoder() {
        driveMotor.setPosition(0);
    }
}
```
`Math.IEEEremainder(rawRad, 2π)` normalizes the angle to the range `[−π, π]`. This is the correct mathematical modulo for signed angles, unlike Java's `%` operator, it returns negative values for negative inputs.

### GyroIO and GyroIOPigeon2
The same pattern applies to the gyro:
```
public interface GyroIO {
    @AutoLog
    class GyroIOInputs {
        public double  yawDegrees = 0.0;
        public double  yawRateDegreesPerSec = 0.0;
        public boolean connected = false;
    }

    default void updateInputs(GyroIOInputs inputs) {}
    default void zeroYaw() {}
}
public class GyroIOPigeon2 implements GyroIO {
    private final Pigeon2 pigeon;

    public GyroIOPigeon2(int canID) {
        pigeon = new Pigeon2(canID);
    }

    @Override
    public void updateInputs(GyroIOInputs inputs) {
        inputs.yawDegrees = pigeon.getYaw().refresh().getValueAsDouble();
        inputs.yawRateDegreesPerSec =
            pigeon.getAngularVelocityZWorld().getValueAsDouble();
        inputs.connected = pigeon.getYaw().getStatus().isOK();
    }

    @Override
    public void zeroYaw() {
        pigeon.setYaw(0);
    }
}
```

### Dependency injection in RobotContainer
`RobotContainer` now decides which implementations to use based on whether the code is running on real hardware or in simulation:
```java
public RobotContainer() {
    if (RobotBase.isReal()) {
        swerveSubsystem = new SwerveSubsystem(
            new GyroIOPigeon2(0),
            new SwerveModuleIOTalonFX(1, 2, 1, true,  true),   // FL
            new SwerveModuleIOTalonFX(3, 4, 2, false, false),  // FR
            new SwerveModuleIOTalonFX(7, 8, 4, false, false),  // BL
            new SwerveModuleIOTalonFX(5, 6, 3, false, false)   // BR
        );
    } else {
        swerveSubsystem = new SwerveSubsystem(
            new GyroIO() {},            // no-op: sim gyro added in Step 9
            new SwerveModuleIOSim(),
            new SwerveModuleIOSim(),
            new SwerveModuleIOSim(),
            new SwerveModuleIOSim()
        );
    }
    // ...
}
```
`SwerveSubsystem` and `SwerveModule` contain no `if (isReal())` logic. They work identically regardless of which IO implementation they receive. This is dependency injection: the caller provides the dependencies; the callee does not know or care which implementation it got.

### Reflection
1. What is the key rule the IO pattern enforces about when hardware is read?
2. The `@AutoLog` annotation generates `SwerveModuleIOInputsAutoLogged`. What would you have to write manually if the annotation did not exist?
3. `GyroIO` has a connected field. Why is connection status worth logging?
4. If you add a temperature sensor to a module, which files need to change?
5. `new GyroIO() {}` is a valid Java expression. What is it, and why does it work?

## Step 9: Simulation
With the IO pattern in place, adding simulation is a single new class. `SwerveModuleIOSim` implements `SwerveModuleIO` using WPILib's physics simulation instead of real hardware.

### DCMotorSim
WPILib's `DCMotorSim` simulates a DC motor with a rotor (moment of inertia) connected to a load through a gearbox. Given a voltage input each cycle, it integrates the motor's equations of motion and reports position and velocity.
```java
public class SwerveModuleIOSim implements SwerveModuleIO {
    private final DCMotorSim driveSim;
    private final DCMotorSim steerSim;
    private double driveAppliedOutput = 0.0;
    private double steerAppliedOutput = 0.0;

    public SwerveModuleIOSim() {
        driveSim = new DCMotorSim(
            LinearSystemId.createDCMotorSystem(
                DCMotor.getKrakenX60(1),
                0.025, // rotor moment of inertia (kg·m²)
                SwerveModuleConstants.DRIVE_MOTOR_GEAR_RATIO),
            DCMotor.getKrakenX60(1));

        steerSim = new DCMotorSim(
            LinearSystemId.createDCMotorSystem(
                DCMotor.getKrakenX60(1),
                0.004,
                SwerveModuleConstants.STEER_MOTOR_GEAR_RATIO),
            DCMotor.getKrakenX60(1));
    }
```
`LinearSystemId.createDCMotorSystem` builds a state-space model of the motor from three parameters: the motor type (Kraken X60), the rotor inertia (a physical constant you look up or measure), and the gear ratio. The gear ratio matters because it changes how much the reflected inertia resists motor acceleration.

### The updateInputs cycle
```java
@Override
public void updateInputs(SwerveModuleIOInputs inputs) {
    // Advance sim physics by one 20 ms control loop cycle
    driveSim.update(0.02);
    steerSim.update(0.02);

    inputs.drivePositionMeters =
        driveSim.getAngularPositionRad()
            * (SwerveModuleConstants.WHEEL_DIAMETER_METERS / 2.0);

    inputs.driveVelocityMetersPerSec =
        driveSim.getAngularVelocityRadPerSec()
            * (SwerveModuleConstants.WHEEL_DIAMETER_METERS / 2.0);

    // Normalize steer angle to [-π, π]
    inputs.steerPositionRad =
        Math.IEEEremainder(steerSim.getAngularPositionRad(), 2.0 * Math.PI);

    inputs.steerVelocityRadPerSec = steerSim.getAngularVelocityRadPerSec();
    inputs.driveAppliedOutput = driveAppliedOutput;
    inputs.steerAppliedOutput = steerAppliedOutput;
}
```
`driveSim.update(0.02)` tells the simulation: 20 milliseconds have passed, apply the current voltage input and compute the new state. The `0.02` is hardcoded because WPILib's robot loop runs at exactly 50 Hz, the timestep is always 20 ms.

The sim reports angular position in radians. Converting to linear distance uses the arc-length formula: `distance = angle × radius`.

### setDriveOutput and setSteerOutput
```java
@Override
public void setDriveOutput(double output) {
    driveAppliedOutput = output;
    driveSim.setInputVoltage(output * 12.0);  // scale from [-1,1] to [-12V, 12V]
}

@Override
public void setSteerOutput(double output) {
    steerAppliedOutput = output;
    steerSim.setInputVoltage(output * 12.0);
}

@Override
public void stop() {
    setDriveOutput(0);
    setSteerOutput(0);
}

@Override
public void resetDriveEncoder() {
    driveSim.setState(0, 0);   // position=0, velocity=0
}
```
The motor output is `[-1, 1]`. The sim expects voltage in volts. Multiplying by `12.0` maps `1.0 → 12 V` (full battery voltage) and `-1.0 → −12 V` (full reverse).

### What the sim ignores
`DCMotorSim` models voltage-to-motion faithfully but omits many real-world effects:
- Wheel slip and traction limits
- Voltage sag under load (back-EMF is modeled, battery sag is not)
- Sensor noise and communication latency
- Mechanical compliance and backlash
- The Pigeon 2 gyro (the sim uses a no-op GyroIO, heading is always 0°)

The result is a robot that behaves plausibly in simulation, useful for testing command logic and control loops, but not a perfect substitute for driving on real hardware.

### Reflection
1. `driveSim.update(0.02)` is called every cycle with a fixed 0.02 s timestep. What would happen if you passed the actual elapsed time instead?
2. The steer sim uses a smaller inertia constant (`0.004` vs `0.025` for drive). Why might the steer mechanism have lower effective inertia?
3. The sim gyro is `new GyroIO() {}`, a no-op. What effect does this have on field-oriented driving in simulation?
4. What would you need to implement to make the simulated gyro track the robot's actual simulated rotation?

## Putting It All Together
```
Here is the complete data-flow for one 20 ms cycle during field-oriented teleop:
Driver pushes joystick forward (left-Y axis = 0.6)
  │
  ▼
SwerveJoystickCommand.execute()
  ├─ dead-band check: 0.6 > 0.1 → passes
  ├─ slew rate: 0.6 allowed (or limited if accelerating too fast)
  ├─ scale: 0.6 × (5.0 m/s × 0.2) = 0.6 m/s
  └─ ChassisSpeeds.fromFieldRelativeSpeeds(0.6, 0, 0, heading)
       └─ rotate by -heading → robot-relative vx, vy
            │
            ▼
       SWERVE_KINEMATICS.toSwerveModuleStates(chassisSpeeds)
            └─ inverse kinematics → [FL, FR, BL, BR] SwerveModuleState[]
                 │
                 ▼
       SwerveSubsystem.setModuleStates(states)
            └─ desaturateWheelSpeeds → all speeds in range
                 │
                 ├─ frontLeft.setDesiredState(state)
                 │    ├─ optimize: is rotation > 90°? if so, flip drive and adjust angle
                 │    ├─ driveOutput = speed / PHYSICAL_MAX_SPEED
                 │    ├─ steerPID.calculate(currentAngle, targetAngle) → steerOutput
                 │    └─ io.setDriveOutput(driveOutput), io.setSteerOutput(steerOutput)
                 │         └─ TalonFX: driveMotor.set(output)
                 │
                 └─ (same for FR, BL, BR)

Next cycle:
  SwerveSubsystem.periodic()
    ├─ gyroIO.updateInputs(gyroInputs) → reads Pigeon2 yaw
    ├─ frontLeft.periodic() → io.updateInputs(inputs) → reads TalonFX encoders
    ├─ odometry.update(rotation, positions) → dead-reckon robot pose
    └─ Logger.recordOutput("Odometry/Pose", pose) → written to .wpilog file
```
The separation of concerns runs throughout: SwerveJoystickCommand handles driver input, SwerveSubsystem handles module coordination and odometry, SwerveModule handles per-module control, and the IO layer handles hardware. Each layer can be understood, tested, and modified independently.

## Summary
The nine steps form a progression from empty project to professional-grade, testable, log-replayable swerve drive. Each step is small enough to understand in isolation, but the architecture that emerges is the same one used by most FRC teams.