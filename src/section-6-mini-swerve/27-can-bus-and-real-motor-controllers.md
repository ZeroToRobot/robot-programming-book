# Chapter 27: CAN Bus and Real Motor Controllers

In Chapter 26, your team moved its program onto the Mini Swerve. The roboRIO runs it, RioLog shows its prints, a USB stick holds its logs, and a small `RoboRio` subsystem watches a real battery. You did all of that without spinning a single motor, on purpose.

Today the motors turn. Not all at once, and not with the robot on the floor: one motor at a time, wheels in the air, while you watch. The Mini Swerve has eight motors, two on each of its four swerve modules, plus four sensors that tell the code which way each wheel points. That is twelve devices, and every one of them talks to the roboRIO over the same two thin wires: the **CAN bus**. Before any of them can do anything useful, each one needs an address, the right firmware, the right settings, and a test that proves the code is talking to the device you think it is.

That last part matters more than it sounds. The classic first-day bug on a swerve robot is not a crash. It is a robot where the code says "front left" and the back right wheel moves, or where one wheel spins backward while the other three spin forward. The robot runs, the code compiles, and everything is quietly wrong. This chapter is how you make sure that never happens to you.

By the end of this chapter, your team will have:

- a **CAN map** on the fact sheet: every device on the bus, its ID, and where it sits on the chain,
- every device with its own **CAN ID** and up-to-date firmware, set with **Phoenix Tuner X**,
- **Phoenix 6**, CTRE's library, installed, and a new `Drive` subsystem with an IO layer for all four swerve modules,
- an **alert** that names any device that stops answering, by its CAN ID,
- a **motor check** that spins each of the eight motors alone, in order, and stops the instant you let go of the button,
- every motor's direction checked by eye and written down,
- eleven tests, green on every push.

On the Java side, you will learn **arrays**, the way Java keeps a numbered row of things (like four swerve modules) in one variable, and you will meet a pattern you have been using without a name since Chapter 20: **methods that return `this`**.

You need the Mini Swerve on blocks, a charged battery, a USB stick, your laptop with WPILib 2026 and the FRC Game Tools, and **Phoenix Tuner X** (Section 27.4 installs it). Work in your Mini Swerve team. One person drives the laptop; everyone else watches the wheels.

---

## 27.1 Eight Motors and One Pair of Wires

Think about how the Explorer's motors got their orders. Each XRP motor had its own **channel**: `new XRPMotor(0)` was the left motor and `new XRPMotor(1)` was the right, because each was plugged into its own numbered port. That is how most small robots work, and it is how FRC robots worked for years too: one wire (called **PWM**) from the roboRIO to each motor controller, carrying a single message, "this much power," over and over. One wire, one motor, one direction of talk.

Now picture the Mini Swerve wired that way. Eight motors means eight separate signal wires running back to the roboRIO. And the motors could only listen. A PWM motor controller cannot tell the roboRIO how fast its motor is spinning, how much current it is pulling, or how hot it is, because the wire only carries orders one way. Every sensor would need wires of its own too.

**CAN** (short for **Controller Area Network**, invented for cars) solves both problems. Instead of a wire to each device, there is one pair of wires that runs from device to device around the robot, like a string of holiday lights. Every device on it hears every message. Each message starts with an **address**, so a device knows which messages are meant for it and ignores the rest. And any device can **send** messages too: motor controllers report their speed, current, voltage, and temperature many times a second, and sensors report what they measure.

> **CAN, in one picture**
>
> A PWM wire is a phone line to one person: you can only tell them things, and only them. The CAN bus is a group chat where every message starts with a name: "Device 3, spin at 2 volts." "Device 3 here: I am at 1,840 rotations per minute and 31 degrees." Everyone sees every message, and everyone ignores the ones not addressed to them.

Your robot's control system leans on CAN everywhere:

- The **roboRIO** is on the bus. It sends the orders your code gives, and it receives every report.
- The **power distribution** board (a PDH or PDP) is on the bus. It reports the current on every channel, which is how you will see each motor's power draw in Section 27.9.
- Every **Kraken X60** motor is on the bus. A Kraken is a brushless motor with a **Talon FX** motor controller built right into it, so the motor and its controller are one device with CAN wires coming out of it.
- Every **CANcoder** is on the bus. A CANcoder is a small sensor that measures the angle of a magnet, and on each swerve module it measures which way the wheel points. Chapter 28 is where they earn their keep; today you only check that they answer.
- The **Pigeon 2** gyro is on the bus. It measures the robot's heading. Chapter 29 reads it.

> **The safety rule from Chapter 26, built into the wire**
>
> Every 20 milliseconds, the roboRIO sends a special message to every motor controller on the bus, called the **heartbeat**, that says whether the robot is enabled. If a motor controller goes 100 milliseconds without hearing an "enabled" heartbeat, it stops its motor by itself. That is how "no Driver Station, no motion" (Section 26.1) actually reaches the motors: disable the robot, or lose the connection, and within a tenth of a second every motor on the bus has stopped, no matter what your code was asking for.

---

## 27.2 The CAN Bus Up Close

Switch off the main breaker, and go look at the robot. Somewhere on it is the roboRIO, with a small connector labeled **CAN**. From it, two thin wires come out, twisted around each other: one **yellow** and one **green**.

- **Yellow** is **CAN High**.
- **Green** is **CAN Low**.

Every CAN device has a yellow and a green connection **in** and a yellow and a green connection **out**. On a Kraken they are small screw terminals on the back of the motor, with a short twisted yellow and green pair attached. Other devices have short wire leads or their own small connectors; your mentors will know which. The bus runs in a single line, a **daisy chain**: from the roboRIO, yellow-to-yellow and green-to-green into the first device, out of it into the next, and so on, until the last device on the chain. On most robots, including the Mini Swerve, that last device is the power distribution board.

```
roboRIO ==== Kraken ==== Kraken ==== CANcoder ==== ... ==== Pigeon 2 ==== PDH
  (end)                                                                 (end)
```

The chain must not branch. No T-junctions, no Y-splits: a single line with exactly two ends.

### The ends of the line

Each **end** of the chain needs a **terminating resistor**: a 120-ohm resistor between yellow and green. Without them, the electrical signals bounce back off the open ends of the wires, like waves off a pool wall, and the messages get scrambled. You almost never add one yourself on an FRC robot, because the two devices at the ends have them built in:

- The **roboRIO** has its resistor built in, always on. That is why it must be at one end.
- A REV **PDH** has a small switch labeled **TERM** next to its CAN terminals. At the end of the chain, it must be **ON**. A CTRE **PDP** has a jumper that does the same job.

> **What a bad CAN bus looks like**
>
> A loose connector, a pulled wire, or a missing terminator does not usually make the robot stop. It makes devices drop off the bus, or come and go, and it makes errors pile up. The Driver Station's **CAN/Power** tab (with the robot connected) shows a **CAN Bus Utilization** percentage and counts of CAN faults. A healthy bus shows a steady utilization and fault counts that do not climb. If the counts keep growing, or devices vanish when someone bumps the robot, the problem is almost always a connector, not your code. Get a mentor, and check every joint on the chain, starting from the roboRIO.

### Walk the chain

Before you touch any code, trace the chain with your finger, from the roboRIO to the end, and draw it in your notebook: every device, in order. This drawing goes on your fact sheet in Section 27.3. When a device disappears in the middle of a match next season, the drawing tells you which connectors to check: a break between two devices usually takes out everything past it.

> **Power off before you touch CAN wiring**
>
> Section 26.3's rule applies twice over here. The CAN connectors are small and easy to pull loose. Switch off the main breaker before you unplug, plug, or wiggle any CAN connector, and never pull a CAN wire on a powered robot "to see what happens." Section 27.10 shows you how to see what happens without touching a wire.

### How busy is the bus?

The CAN bus on the roboRIO carries a fixed number of messages per second, and every device's reports use some of them. Twelve devices each reporting several readings fifty or a hundred times a second adds up. The Driver Station's utilization number, and the `SystemStats` > `CANBus` > `Utilization` value AdvantageKit already records in every log, tell you how full it is. Somewhere under about 70 to 80 percent is comfortable; a bus near 100 percent starts dropping messages. You will check yours in Section 27.9. (Teams with many devices often add a second, faster CAN bus with a CTRE device called a **CANivore**. The Mini Swerve does not need one, and this book does not use one.)

---

## 27.3 Addresses: CAN IDs

A message on the bus is addressed to a device, so every device needs an address. That address is its **CAN ID**: a number from 0 to 62 that you choose and store on the device itself.

Here is the part that surprises people. Every CAN device comes from the factory with ID **0**. So a brand-new robot has eight Krakens, four CANcoders, and a Pigeon 2 that all answer to "device 0." Before the code can tell them apart, every one of them needs its own number. You will set them in Section 27.4.

### Unique, but only among their own kind

The full address of a message has three parts, not one: the **kind** of device (motor controller, encoder, gyro, power distribution, and so on), the **maker** (CTRE, REV, and others), and the **ID** number. Two devices only clash if all three match. So:

- Two Talon FX motor controllers (two Krakens) must never share an ID.
- A Talon FX with ID 1 and a CANcoder with ID 1 can live on the same bus happily. They are different kinds of device.

The Mini Swerve uses that on purpose. Each module's CANcoder has the same number as the module (1 to 4), and its two motors have their own numbers:

| Device | What it does | CAN ID |
|---|---|---|
| Front left drive Kraken | Spins the front left wheel | 1 |
| Front left steer Kraken | Points the front left wheel | 2 |
| Front right drive Kraken | | 3 |
| Front right steer Kraken | | 4 |
| Back right drive Kraken | | 5 |
| Back right steer Kraken | | 6 |
| Back left drive Kraken | | 7 |
| Back left steer Kraken | | 8 |
| Front left CANcoder | Measures where the front left wheel points | 1 |
| Front right CANcoder | | 2 |
| Back right CANcoder | | 3 |
| Back left CANcoder | | 4 |
| Pigeon 2 | The robot's heading (Chapter 29) | 0 |
| Power distribution | Power, and current on every channel | 1 (a PDH) or 0 (a PDP) |

Look closely: the back right module is 5 and 6, and the back left is 7 and 8. That is how the Mini Swerve's builders numbered the corners, going around the robot, and the CANcoders follow the same order. It does not matter which scheme a team picks. It matters enormously that the code, the devices, and the fact sheet all agree, and that you **check** it rather than trust it. Your robot may use different numbers. **Your fact sheet wins**: use the IDs your team wrote down, and change the code to match.

> **Leave the power distribution board alone**
>
> WPILib and AdvantageKit both look for the power distribution board at its factory ID: 1 for a REV PDH, 0 for a CTRE PDP. At that ID, AdvantageKit already records the current on every channel in every log, without a line of code from you (you will see it in Section 27.9). Change it, and that free logging stops. Leave it where it is.

### The order of the modules

One more convention, and it will matter for the rest of Section VI. Whenever this book lists the four modules, it lists them in the same order: **front left, front right, back left, back right**. WPILib's swerve classes (Chapter 28) use that order, AdvantageKit's templates use it, and so does every array of modules you write in this chapter. Front and back, left and right, are as seen by someone standing **behind** the robot, facing the way it drives forward. Mark the front of the robot with tape if it is not obvious.

### The CAN map on the fact sheet

Add a section to your notebook fact sheet (it becomes part of `docs/robot.md` through a pull request, as in Chapter 26's Collab):

```markdown
## CAN map

Chain order, from the roboRIO: roboRIO, (fill in every device in order), PDH (TERM switch ON)

| Device | CAN ID | Firmware | How we know |
|---|---|---|---|
| Front left drive Kraken | 1 | | Tuner X, Blink |
| Front left steer Kraken | 2 | | Tuner X, Blink |
| ... | | | |
| Pigeon 2 | 0 | | Tuner X |
| PDH | 1 | | Tuner X or REV Hardware Client |

## Motor directions (Section 27.9)

| Motor | Positive volts turn it... | Inverted in code? |
|---|---|---|
| Front left drive | | |
| ... | | |
```

The "how we know" column is Chapter 26's habit, and it earns its keep here. "Tuner X, Blink" means someone made the device blink its light and **saw** which one it was. That is the only kind of "know" that counts for a CAN ID.

---

## 27.4 Phoenix Tuner X: Meeting Your Devices

You cannot set a CAN ID from robot code. You set it with a tool that talks to the devices directly, and for CTRE devices (Krakens, CANcoders, the Pigeon 2) that tool is **Phoenix Tuner X**. It is the CAN bus's equivalent of the Driver Station: a window onto every CTRE device on the robot, where you can see them, name them, update them, and test them one at a time.

### Step 1: Install it

Tuner X comes from the **Microsoft Store** on Windows (search for "Phoenix Tuner X"). There are also versions for macOS, Android, and iOS, from their app stores. Any of them works with the robot; the Windows one is what this section describes.

### Step 2: Connect to the robot

Tuner X does not talk to the CAN bus by itself. It talks to a small program on the roboRIO called the **Phoenix diagnostic server**, and that server talks to the bus. The server starts by itself whenever a robot program that uses Phoenix 6 is running. Your program does not use Phoenix yet, so for today there is a button for that:

1. Robot on blocks, battery in, main breaker on, USB cable from your laptop to the roboRIO (Section 26.4).
2. Open Tuner X. In the connection box at the top left, pick **roboRIO USB** (the `172.22.11.2` address from Chapter 26). Over the radio, you would pick **Driver Station** instead, which asks the Driver Station where the robot is, like Elastic does.
3. Tuner X will say it cannot reach a diagnostic server. Click **Run Temporary Diagnostic Server**. It starts the server on the roboRIO until the next reboot.

Once your code uses Phoenix 6 (Section 27.6), you will never need that button again: deploy your code, and the server runs whenever your program does. RioLog shows a line from `[phoenix]` when it starts.

### Step 3: The devices page

Open the **Devices** page. Every CTRE device on the bus shows up as a card with its type, its ID, its name, and its firmware version. On a brand-new robot, you will see eight Talon FXs, four CANcoders, and a Pigeon 2, all with ID 0, and some cards colored **red**: Tuner X's warning that two devices of the same kind share an ID. Count the cards. If there are fewer than thirteen, a device is not on the bus at all, and that is a wiring problem (Section 27.2) to solve before anything else.

The card colors are worth knowing:

| Card color | Means |
|---|---|
| Green | Firmware is up to date |
| Yellow | A firmware update is available |
| Red | Another device of the same kind has the same ID |
| Purple | Unexpected firmware (a beta, or an old year) |

### Step 4: Update the firmware

Every CTRE device runs its own small program, its **firmware**, and the firmware must match the year of Phoenix 6 your code uses. Do this first, before you set IDs, so every device is on the same version:

1. On the Devices page, check the box on every card (the check icon at the top right selects all devices of one model).
2. Open the batch firmware upgrade, pick **2026** as the year, and update to the latest.

Each device flashes for a little while, and its light changes while it does. As with a deploy (Section 26.7), **never switch the robot off during a firmware update**. When it is done, every card should be green. Write each device type's firmware version in the CAN map.

### Step 5: Give every device its ID and name

Now the careful part. With every device at ID 0, you cannot tell which card is which physical device. So you find out by asking each one to **blink**:

1. Click a Talon FX card to open its details page.
2. Click **Blink**. One Kraken on the robot flashes its lights. Find it with your eyes. Everyone points.
3. Now you know which motor this card is. Look up its ID in the CAN map (Section 27.3), type it in the **ID** box, type a name in the **Name** box (like `FL Drive`), and click **Set**. IDs must be from 0 to 62.
4. Go back to the Devices page. That card now shows its new ID and name. Click **Blink** again from its new page, and check the same motor flashes. Then write "Tuner X, Blink" in the fact sheet's "how we know" column.

Do that for all eight Krakens, then all four CANcoders, then check the Pigeon 2 is at ID 0. Do one device at a time, and finish each one before you start the next. When you are done, there are no red cards.

> **Names are for people, IDs are for code**
>
> Your code finds devices by ID only. The name you type in Tuner X is just for humans: it shows on the card, so the next person who opens Tuner X sees `BL Steer` instead of "Talon FX 8." It costs ten seconds and saves a lot of squinting at a robot later. Use the same names as the fact sheet.

### Step 6: Spin one motor from Tuner X (optional, with a mentor)

A Talon FX's details page has a **Control** tab, where you can run that one motor directly, with no robot code at all. It is a good way to answer "is this motor alive?" before you write any code. Two things to know:

- **The robot must be enabled from the Driver Station** for the motor to move. Once a CTRE device has been on an FRC robot, it will only drive while the roboRIO says the robot is enabled (Section 27.1's heartbeat). So Section 26.3's rules all apply: robot on blocks, say the word, enable, hand near the space bar.
- In Tuner X, the control panel starts **disabled**. Click it to enable, then move the slider gently, a few percent, and back to zero.

Spin it a little forward and back, then disable. You will do the real, careful version of this, from your own code, for all eight motors in Section 27.9.

> **Read the lights**
>
> Every CTRE device has lights that tell you its state before you open any tool. A few patterns worth knowing on a Kraken (Talon FX):
>
> | Lights | Means |
> |---|---|
> | Alternating red | No CAN signal: check its yellow and green wiring |
> | Alternating orange | CAN is fine, but no robot program using Phoenix is running |
> | Both orange, together | Everything is fine, and the robot is disabled |
> | Solid orange | Enabled, but not being asked to move |
> | Blinking green, together | Driving forward (faster blinking for more output) |
> | Blinking red, together | Driving in reverse |
>
> A CANcoder blinks red slowly when it has no CAN signal, and blinks fast in green when CAN is good and its magnet is in range. CTRE's hardware pages (in Additional Resources) have every pattern, for every device.

### Step 7: The Self Test Snapshot

Each device's details page also has a **Self Test** button. It shows a snapshot of everything the device knows about itself at that moment: its firmware, its faults, its temperature, its supply voltage, and its sensor readings. When a device acts strangely, a self-test snapshot is the first thing to look at, and the first thing a mentor will ask for. Try it on one Kraken now, then turn the motor by hand (robot disabled) and refresh it: its position changes.

> **Tuner X and robot code at the same time**
>
> Tuner X and your robot program can both talk to the devices at once, and that is usually fine for looking. Be careful with **changing** settings in Tuner X while your code is running, though. Section 27.6 sets every motor's settings from code each time the program starts, so anything you change in Tuner X's **Configs** tab will be overwritten at the next deploy. That is on purpose: the code is the one true record of how each device is set up. If a setting matters, it goes in the code.

---

## 27.5 New Java: Arrays

Before you write the code for twelve devices, think about how you would write it with what you know so far. One swerve module needs a drive motor, a steer motor, and a CANcoder, and code to read them and to set them. The Mini Swerve has four modules, so you would write:

```java
private final Module frontLeft;
private final Module frontRight;
private final Module backLeft;
private final Module backRight;
```

So far, fine. Now every place that does something to "all the modules" needs four lines:

```java
frontLeft.periodic();
frontRight.periodic();
backLeft.periodic();
backRight.periodic();
```

And stopping them takes four more lines, and the motor check takes sixteen, and the swerve math in Chapter 28 needs four of everything. Each copy is a chance to type `frontLeft` where you meant `frontRight`, which is exactly the "wrong wheel" bug this chapter is trying to stamp out. You saw this shape in Chapter 6: when you find yourself writing the same line again with a different number, you want a loop. But a loop needs something to loop **over**. Four separate variables cannot be looped over.

### A numbered row of boxes

An **array** is one variable that holds a fixed-size, numbered row of values, all of the same type. Start with something simple, away from the robot: the voltages of the team's four batteries, measured this morning.

```java
double[] batteryVolts = {12.9, 12.6, 12.4, 12.8};
```

Read it aloud: "`batteryVolts` is an array of `double`s, holding 12.9, 12.6, 12.4, and 12.8."

- The square brackets in **`double[]`** are what make it an array type: "a row of `double`s," not one `double`.
- The values in **curly braces** fill the row, in order. This shortcut only works on the line where the array is declared.
- An array's size is fixed when it is made. This one has room for exactly four values, forever.

Each value sits in a numbered slot, and the numbers start at **zero**:

| Index | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| `batteryVolts[index]` | 12.9 | 12.6 | 12.4 | 12.8 |

You read and write a slot with its **index** in square brackets:

```java
System.out.println(batteryVolts[0]);   // prints 12.9: the FIRST battery
System.out.println(batteryVolts[3]);   // prints 12.8: the LAST battery
batteryVolts[2] = 12.7;                 // battery 2 came back from the charger
System.out.println(batteryVolts.length);   // prints 4
```

`batteryVolts.length` is how many slots the array has. (No parentheses: `length` on an array is a field, not a method. `String` has a `length()` method with parentheses, and mixing the two up is a classic beginner compile error. Everyone does it once.)

> **Why start at zero?**
>
> The index is not "which one," it is "how many steps from the start." The first slot is zero steps from the start. It feels strange for about a week, and then it feels normal forever. The one thing to remember: in an array of length 4, the indexes are 0, 1, 2, and 3. There is no slot 4.

### Looping over an array

Now the payoff. Find the lowest battery with the `for` loop from Chapter 6:

```java
double lowest = batteryVolts[0];
for (int i = 0; i < batteryVolts.length; i++) {
    if (batteryVolts[i] < lowest) {
        lowest = batteryVolts[i];
    }
}
System.out.println("Lowest battery: " + lowest);   // prints 12.6 (after battery 2 was charged)
```

`i` walks through 0, 1, 2, 3, and stops before 4, because the condition is `i < batteryVolts.length`, not `<=`. That loop works for an array of any size: add a fifth battery to the braces, and the loop visits it without a single change.

When you need every value but not its index, Java has a shorter loop, the **for-each** loop. You glimpsed it in Chapter 21's Practice, looping over an enum's `values()` (which, it turns out, gives you an array):

```java
for (double volts : batteryVolts) {
    System.out.println(volts);
}
```

Read the colon as "in": "for each `double volts` **in** `batteryVolts`, print it." Java does the counting for you, and there is no index to get wrong. Use for-each when you just want every item; use the counting loop when you need to know **which** item, or to change slots.

### Going past the end

Ask for a slot that does not exist, and Java throws an exception (Chapter 26's word) the moment the line runs:

```java
System.out.println(batteryVolts[4]);
```

```
Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 4 out of bounds for length 4
```

The message tells you exactly what happened: you asked for index 4 of an array whose length is 4. The usual cause is a loop with `<=` where it needed `<`. It is an **unchecked** exception, which by Section 26.10's rule means "a bug: fix the code, do not catch it."

### Arrays of objects

An array can hold any type, including objects. `new` with square brackets makes an empty array of a given size:

```java
Module[] modules = new Module[4];
```

That is a row of four slots, each able to hold a `Module`. But **empty** is the word to notice: every slot starts out as `null` (Chapter 10), because no `Module` objects have been made yet, only room for them. Call `modules[0].periodic()` now, and you get Chapter 10's old friend, a `NullPointerException`. You must fill each slot:

```java
modules[0] = new Module(frontLeftIO, DriveConstants.FRONT_LEFT);
```

Or make and fill the array in one step, the way `Drive` will in Section 27.8:

```java
Module[] modules = new Module[] {
    new Module(frontLeftIO, DriveConstants.FRONT_LEFT),
    new Module(frontRightIO, DriveConstants.FRONT_RIGHT),
    new Module(backLeftIO, DriveConstants.BACK_LEFT),
    new Module(backRightIO, DriveConstants.BACK_RIGHT)
};
```

And now "do something to every module" is three lines, however many modules there are:

```java
for (Module module : modules) {
    module.periodic();
}
```

> **A `final` array can still change**
>
> `private final Module[] modules` means the variable `modules` will always point at the **same** array. It does not stop anyone from putting something else **into** a slot: `modules[0] = null;` compiles fine. It is the same idea as Chapter 23's `static final` reference to an object whose insides can change. That is one reason `Drive` keeps its array `private`: only `Drive` can reach into it.

### You have been using arrays all along

Two places in code you already know were arrays in disguise:

- `public static void main(String[] args)` in Chapter 4's first program. `args` is an array of `String`s: the words typed after the program's name when it is started from a terminal.
- Every method with `...` in its parameter list, like `Commands.sequence(Command... commands)` from Chapter 20. The three dots make a **varargs** parameter: you can pass any number of commands separated by commas, and Java packs them into an array for you. Inside `sequence`, `commands` is a plain `Command[]`. That also means you can hand it a whole array you built yourself, which is exactly what the motor check does in Section 27.8.

---

## 27.6 Phoenix 6: Talking to Krakens From Code

WPILib knows how to talk to the roboRIO's own pins and to the XRP, but not to every company's CAN devices. Each maker supplies its own library, a **vendor library**, the way AdvantageKit came from its own makers in Chapter 17. CTRE's library for the Kraken's Talon FX, the CANcoder, and the Pigeon 2 is **Phoenix 6**.

### Install the library

In the `MiniSwerve` project, open the command palette and run **WPILib: Manage Vendor Libraries**. In the list of available libraries, find **CTRE-Phoenix (v6)** and install it. (If the list does not show it, choose **Install new libraries (online)** and paste `https://maven.ctr-electronics.com/release/com/ctre/phoenix6/latest/Phoenix6-frc2026-latest.json`.) You get a new file, `vendordeps/Phoenix6-frc2026-latest.json`, and the next build downloads the library. Build: `BUILD SUCCESSFUL`.

> **Two Phoenix libraries you do not want**
>
> The list also shows **CTRE-Phoenix (v5)**, the older library for older CTRE devices, and **CTRE-Phoenix Replay (v6)**, a special version for a different style of log replay. The Mini Swerve needs neither. Install only **CTRE-Phoenix (v6)**: two Phoenix 6 libraries in one project fight each other.

### A device is an object

In code, each device is an object, made once with its CAN ID, like every piece of hardware since Chapter 7:

```java
TalonFX frontLeftDrive = new TalonFX(1);     // the Kraken with CAN ID 1
CANcoder frontLeftEncoder = new CANcoder(1);  // the CANcoder with CAN ID 1: a different kind of device, so no clash
```

That is the whole connection. The constructor does not check that a device with that ID is really there; a missing device shows up later, when nobody answers (Section 27.10).

### Settings, as one object

A Kraken has dozens of settings. Phoenix 6 keeps all of them in one object, a **`TalonFXConfiguration`**. A fresh one holds the factory default for every setting. You change the ones you care about, through its **public fields**, grouped by topic (Chapter 13 said public fields are fine on plain data classes, and this is one):

```java
TalonFXConfiguration config = new TalonFXConfiguration();
config.MotorOutput.Inverted = InvertedValue.CounterClockwise_Positive;
config.MotorOutput.NeutralMode = NeutralModeValue.Brake;
config.CurrentLimits.StatorCurrentLimit = 80.0;
config.CurrentLimits.StatorCurrentLimitEnable = true;
```

(The capitalized field names, `MotorOutput` and `Inverted`, are CTRE's style, not the book's. When you use someone else's library, you use their names.) Then you send the whole thing to the motor:

```java
StatusCode result = frontLeftDrive.getConfigurator().apply(config);
```

Three settings matter today.

**Which way is positive.** `Inverted` is an enum with two values. `CounterClockwise_Positive`, the default, means positive volts spin the shaft counterclockwise, as seen looking at the **front** of the motor, the face the shaft comes out of. `Clockwise_Positive` flips it. On a swerve module, the motors are mounted however the module's designers liked, with gears in between, so the only way to know which setting makes the **wheel** go the right way is to try it and watch (Section 27.9).

> **Invert with the setting, not with a minus sign**
>
> You could fix a backward motor by putting a minus sign in front of every volts value in your code. Do not. The `Inverted` setting flips the motor **and** its built-in encoder together, inside the motor controller, so "positive" means the same thing for what you ask and what you read back. A minus sign in your code fixes only the asking, and leaves the reading backward: the robot's odometry (Chapter 30) would then think a wheel rolling forward is rolling backward.

**What happens at zero.** `NeutralMode` is what the motor does when it is asked for nothing: **Coast** lets it spin freely, and **Brake** shorts the motor's windings together so it resists turning. The factory default is Coast. For a drivetrain, Brake is the usual choice: when the driver lets go, the robot stops instead of rolling, and the steering holds its angle.

**How hard it may push.** A motor's **current** is how much electricity flows through it, and a stalled or hard-accelerating motor can pull an enormous amount: a Kraken X60 at a dead stop with 12 volts on it would pull over 350 amps. Too much current heats the motor's windings, trips breakers, and pulls the battery voltage down until the roboRIO browns out (Section 26.8). A Talon FX has two kinds of limit:

- The **stator** current limit caps the current **in the motor** itself. That limits its torque, and protects the motor and the wheels' grip on the carpet. The factory default is 120 amps.
- The **supply** current limit caps the current **from the battery**. That protects the breaker and the battery. The factory default allows 70 amps, then drops to 40 if the limit has been working for a full second.

`DriveConstants` sets stator limits of **80 amps** for the drive motors and **40 amps** for the steer motors, and leaves the supply limits at their factory defaults. CTRE's own swerve example uses 120 and 60 on a full-size competition robot; the Mini Swerve is small and light, and starting lower costs nothing while you are learning. Chapter 32 measures this robot properly, and Chapter 38 tunes the competition robot's limits for real.

> **The power budget from Chapter 26, answered**
>
> Chapter 26's Explore asked what four drive motors pulling 40 amps each would do to a battery, and promised an answer called a current limit. Here it is: with every motor capped, the most the drive can pull is bounded, so the worst-case sag is bounded too. You will **see** sag for the first time in Section 27.9, on `RoboRio/BatteryVolts`, while a motor spins.

### Every setting, every time

Look again at that `apply` call. It sends a **whole** `TalonFXConfiguration`, and every setting you did not touch goes to the motor as its factory default. CTRE recommends exactly this. Settings are stored **on the device** and survive a power cycle, so a motor remembers whatever it was last told, by anyone: last year's code, a Tuner X experiment, the team that owned it before you. Applying a full configuration from your code every time the program starts wipes all of that away, and puts every motor into a state you wrote down. Swap a motor from the spare-parts box at a competition, deploy, and it is set up exactly like the one it replaced.

`apply` waits for the motor to answer, so it takes a moment. Do it once, in the constructor, and never in a periodic method.

### "It worked" is a return value

`apply` does not throw an exception if the motor does not answer. It returns a **`StatusCode`**, an enum that is `OK` if it worked and something else, like `RxTimeout` ("no answer in time"), if it did not. That is a different way to report trouble from Chapter 26's exceptions, and it fits this job: a motor that is missing at start-up is a problem a person must fix, not a bug that should crash the robot. So `ModuleIOTalonFX` checks the result and, if it is not `OK`, reports it to the Driver Station and carries on, the same choice AdvantageKit makes about a missing USB stick (Section 26.10). Section 27.10 makes sure nobody misses it.

### Reading a Kraken

A Talon FX reports back constantly. Phoenix 6 calls each reading a **status signal**, and you ask for each one once, in the constructor:

```java
StatusSignal<Angle> drivePosition = frontLeftDrive.getPosition();
StatusSignal<AngularVelocity> driveVelocity = frontLeftDrive.getVelocity();
```

`StatusSignal<Angle>` is Chapter 23's generics again: a status signal whose value is an `Angle`, from Chapter 16's units library. These are the readings the Mini Swerve logs for every motor:

| Signal | What it is | Unit |
|---|---|---|
| `getPosition()` | How far the motor's shaft has turned since power-on | Rotations of the **motor**, not the wheel |
| `getVelocity()` | How fast the shaft is turning | Rotations **per second** (not per minute) |
| `getMotorVoltage()` | The volts the motor controller is actually giving the motor | Volts |
| `getStatorCurrent()` | The current in the motor | Amps |
| `getDeviceTemp()` | The motor controller's temperature | Degrees Celsius |

And from each CANcoder, one reading today: `getAbsolutePosition()`, which way its magnet points, in rotations from -0.5 to just under 0.5. Unlike the motor's position, it is right the instant the robot powers on, which is what makes it **absolute**. Chapter 28 turns it into the wheel's angle.

Each loop, you refresh the signals, then read their values as plain `double`s:

```java
StatusCode status = BaseStatusSignal.refreshAll(drivePosition, driveVelocity);
double rotations = drivePosition.getValueAsDouble();
```

`refreshAll` takes any number of signals (Section 27.5's varargs) and fetches fresh values for all of them in one go. It also returns a `StatusCode`, and that is how the code knows each loop whether the device is still answering.

> **Encoder feedback, the robotics side**
>
> A Kraken's built-in encoder counts the motor shaft's turns. But the wheel is not on the shaft: there is a gearbox in between, so the motor turns several times for each turn of the wheel (Chapter 13's gear ratios). Until Chapter 28 brings in the module's real gear ratios from the fact sheet, the Mini Swerve's readings are honest **motor** numbers, and their names say so: `driveMotorRotations`, not `driveWheelRotations`. A number whose name lies about its unit is worse than no number at all.

### Asking for volts

To make a Kraken move, you send it a **control request**: an object that says what you want. The one this chapter uses is **`VoltageOut`**, "give the motor this many volts":

```java
private final VoltageOut driveRequest = new VoltageOut(0.0);
...
driveMotor.setControl(driveRequest.withOutput(volts));
```

This is the payoff of Chapter 26's "ask for volts, not power": the Talon FX measures its own supply voltage and works out the power to give the motor exactly the volts you asked for, whatever the battery is doing. Why the request is made once as a field, and what `withOutput` hands back, is the next section's Java.

> **What about the "FOC" setting?**
>
> `VoltageOut` has a setting called `EnableFOC`, and it is on by default. FOC is a smarter way of driving the motor that gets more out of a Kraken, and it needs a paid CTRE license called **Phoenix Pro**. Without the license, the Talon FX simply ignores the setting and drives the motor the normal way, so `VoltageOut` works on every Kraken, licensed or not. Some other control requests only work with a license, and a Kraken asked to use one without it stops and blinks red and green. This book never uses them.

---

## 27.7 New Java: Methods That Return `this`

Section 27.6 ended with a line that looks a little odd:

```java
driveMotor.setControl(driveRequest.withOutput(volts));
```

`withOutput(volts)` sets the request's voltage, and then it is passed straight into `setControl` as if it were the request itself. That is because it **is** the request itself. Here is the idea, in a toy class you can type into a scratch file:

```java
public class Order {
    private String item = "nothing";
    private int count = 0;

    public Order withItem(String newItem) {
        item = newItem;
        return this;    // hand back the very same object
    }

    public Order withCount(int newCount) {
        count = newCount;
        return this;
    }

    public String describe() {
        return count + " x " + item;
    }
}
```

Each `with` method changes a field, then **returns `this`**: the object whose method was called (Chapter 7's `this`). Because the method returns an `Order`, you can call another `Order` method on the result, right away:

```java
Order order = new Order();
System.out.println(order.withItem("bumper fabric").withCount(3).describe());   // prints 3 x bumper fabric
```

Read the middle line left to right: "take `order`, set its item (and get `order` back), set its count (and get `order` back), describe it." There is only ever **one** `Order` object. Each method hands it back so the next method has something to be called on. This style has a name, a **fluent** interface, because a chain of calls reads almost like a sentence.

You have seen it before without the name:

- In Chapter 20, `controller.a().onTrue(x).onFalse(y)` works because every binding method on a `Trigger` ends with `return this;`.
- Command decorators like `.withTimeout(1.5).withName("Spin")` look the same, but are **different** inside. Chapter 20 showed that each decorator wraps your command in a **new** command object. Same chain shape, different promise: a decorator returns a new object, a fluent `with` method returns the same one.

That difference is exactly what matters for the voltage request. Here is the bad version:

```java
@Override
public void setDriveVolts(double volts) {
    driveMotor.setControl(new VoltageOut(volts));   // works, but makes a new object every loop
}
```

It works. But `setDriveVolts` runs fifty times a second, for eight motors, so this line makes four hundred throwaway objects every second for Java's garbage collector to clean up. Chapter 13's rule of thumb said small data objects may be made every loop; on a roboRIO, with eight motors, it is worth doing better, and CTRE's own examples do it the better way. The good version makes the request **once**, as a field, and reuses it:

```java
private final VoltageOut driveRequest = new VoltageOut(0.0);

@Override
public void setDriveVolts(double volts) {
    driveMotor.setControl(driveRequest.withOutput(volts));   // same object, new number
}
```

`withOutput` changes the number inside the one `VoltageOut` and returns that same object, ready to hand to `setControl`. One object, made once, for the whole life of the program. Chapter 7's "create once, use in periodic" rule, applied to a message instead of a motor.

> **Fluent, in one sentence**
>
> A method that changes its object and then returns `this` lets you chain calls on one object; a method that returns a **new** object (a command decorator, `Pose2d.transformBy` from Chapter 21) lets you chain calls too, but each link is a different object. Read the method's Javadoc to know which one you have.

---

## 27.8 Build: A Drive Subsystem for Twelve Devices

Time to write it. The plan has the same shape as `RoboRio` in Chapter 26, with one new layer, because a swerve drive is four copies of the same module:

| File | Job |
|---|---|
| `DriveConstants` | The facts: every CAN ID, every direction, the motors, the current limits |
| `ModuleIO` | The interface for **one** module: inputs from three devices, two outputs (drive volts, steer volts) |
| `ModuleIOTalonFX` | One real module: two Krakens and a CANcoder, through Phoenix 6 |
| `ModuleIOSim` | One pretend module, for simulation |
| `Module` | One module's logic: reads its inputs, logs them, raises alerts. A plain class, **not** a subsystem |
| `Drive` | The subsystem: owns an array of four `Module`s, and makes the motor check command |

Why is `Module` not a subsystem? Because nothing should ever command one module on its own while another command drives the other three. The robot drives as one thing, so `Drive` is the one subsystem that commands require, and the modules are parts inside it. It is Chapter 14's **composition**: a `Drive` **has** four `Module`s, and each `Module` **has** a `ModuleIO`. AdvantageKit's own swerve templates are built exactly this way, which means the code you write here will look familiar when you read them (Explore, at the end of the chapter).

Work on a new branch:

```bash
git checkout main
git pull
git checkout -b can-motors
```

### Step 1: Give every subsystem its own folder

The Mini Swerve is about to have its second subsystem, with six files of its own. If they all land in `subsystems` next to `RoboRio`'s four, the folder turns into a junk drawer, the problem Chapter 19 solved with packages. So, from now on, **each subsystem gets its own package**.

In VS Code, create two folders inside `src/main/java/frc/robot/subsystems`: `roborio` and `drive`. Drag `RoboRio.java`, `RoboRioIO.java`, `RoboRioIOReal.java`, and `RoboRioIOSim.java` into `roborio`. If VS Code offers to update the references, say yes. Then check each moved file's first line, as Chapter 19 taught you:

```java
package frc.robot.subsystems.roborio;
```

Do the same in the test folder: create `src/test/java/frc/robot/subsystems/roborio`, move `RoboRioTest.java` into it, and fix its `package` line. (It has to move too: it calls `RoboRio`'s package-private test methods, so it must live in the same package.) In `RobotContainer.java`, the four imports change from `frc.robot.subsystems.RoboRio...` to `frc.robot.subsystems.roborio.RoboRio...`. Build: `BUILD SUCCESSFUL`, and run the tests: still **6 tests, all green**. Commit the move by itself, so the history shows it as a move and nothing else:

```bash
git add .
git commit -m "Ch27: Move the RoboRio subsystem into its own package"
```

> **Why commit a move alone?**
>
> Git notices when a file is moved with almost no changes, and shows it as a rename. If you move six files **and** change them in the same commit, Git may show them as six deleted files and six brand-new ones, and the reviewer cannot see what actually changed inside. One commit for the move, then one for the changes, keeps every pull request readable. It is the same reason Chapter 11 said one commit per idea.

### Step 2: `DriveConstants`

In the `drive` folder, create `DriveConstants.java`:

```java
package frc.robot.subsystems.drive;

import edu.wpi.first.math.system.plant.DCMotor;

/** Facts about the Mini Swerve's drive: CAN IDs, motor directions, motors, and limits (Chapter 27). */
public final class DriveConstants {
    private DriveConstants() {}

    /**
     * Everything the code needs to know about one swerve module's devices on the CAN bus.
     *
     * @param name the module's name in logs and alerts, like "FrontLeft"
     * @param driveCanId the CAN ID of the Kraken that spins the wheel
     * @param steerCanId the CAN ID of the Kraken that points the wheel
     * @param encoderCanId the CAN ID of the CANcoder that measures where the wheel points
     * @param driveInverted true if positive volts spin the drive motor the wrong way
     * @param steerInverted true if positive volts spin the steer motor the wrong way
     */
    public record ModuleConstants(
        String name,
        int driveCanId,
        int steerCanId,
        int encoderCanId,
        boolean driveInverted,
        boolean steerInverted) {}

    // CAN IDs from the fact sheet (Section 27.3). The directions start false: the motor check
    // (Section 27.9) finds the real ones.
    public static final ModuleConstants FRONT_LEFT = new ModuleConstants("FrontLeft", 1, 2, 1, false, false);
    public static final ModuleConstants FRONT_RIGHT = new ModuleConstants("FrontRight", 3, 4, 2, false, false);
    public static final ModuleConstants BACK_LEFT = new ModuleConstants("BackLeft", 7, 8, 4, false, false);
    public static final ModuleConstants BACK_RIGHT = new ModuleConstants("BackRight", 5, 6, 3, false, false);

    // All eight motors are Kraken X60s (fact sheet). The simulator needs to know.
    public static final DCMotor DRIVE_MOTOR = DCMotor.getKrakenX60(1);
    public static final DCMotor STEER_MOTOR = DCMotor.getKrakenX60(1);

    // Stator current limits (Section 27.6): starting points for a small, light robot.
    public static final double DRIVE_STATOR_LIMIT_AMPS = 80.0;
    public static final double STEER_STATOR_LIMIT_AMPS = 40.0;

    // The motor check (Section 27.9): gentle volts, a short spin, a short rest between motors.
    public static final double MOTOR_CHECK_VOLTS = 1.5;
    public static final double MOTOR_CHECK_SECONDS = 1.5;
    public static final double MOTOR_CHECK_PAUSE_SECONDS = 0.5;
}
```

Walk through it:

- **`ModuleConstants` is a record** (Chapter 25): six facts about one module, bundled together, unchangeable. Records are perfect for constants, because nobody can change a record's fields after it is made.
- **Four record constants**, one per module, with the CAN IDs from the fact sheet. Because a record cannot change, these can be `public static final` and named in `UPPER_SNAKE_CASE` (Chapter 23's rule is about objects that **can** change). Change the numbers to match **your** fact sheet now.
- **Every direction starts `false`.** Nobody knows the right answers yet. The motor check in Section 27.9 finds them, and you will come back here to fill them in.
- **`DCMotor.getKrakenX60(1)`** is WPILib's description of one Kraken X60: its free speed, stall torque, and so on, from the data sheet. Only the simulator uses it.
- **The current limits** are Section 27.6's numbers.
- **There is no array here.** It would be tempting to write `public static final ModuleConstants[] MODULES = {...}`, but a `final` array can still have its slots changed (Section 27.5), so it would be a "constant" anyone could quietly break. The one array of modules lives inside `Drive`, private.

### Step 3: The IO interface

`ModuleIO.java`:

```java
package frc.robot.subsystems.drive;

import org.littletonrobotics.junction.AutoLog;

/** One swerve module's devices: a drive motor, a steer motor, and a CANcoder (Chapter 27). */
public interface ModuleIO {

    /** What the module's three CAN devices report, read once per loop. AdvantageKit logs every field. */
    @AutoLog
    public static class ModuleIOInputs {
        public boolean driveConnected = false;
        public double driveMotorRotations = 0.0;
        public double driveMotorRotationsPerSecond = 0.0;
        public double driveAppliedVolts = 0.0;
        public double driveCurrentAmps = 0.0;
        public double driveTemperatureCelsius = 0.0;

        public boolean steerConnected = false;
        public double steerMotorRotations = 0.0;
        public double steerMotorRotationsPerSecond = 0.0;
        public double steerAppliedVolts = 0.0;
        public double steerCurrentAmps = 0.0;
        public double steerTemperatureCelsius = 0.0;

        public boolean encoderConnected = false;
        public double encoderAbsoluteRotations = 0.0;
    }

    /** Read the module's devices into {@code inputs}. */
    public default void updateInputs(ModuleIOInputs inputs) {}

    /** Ask the drive motor for this many volts. Positive should roll the wheel forward. */
    public default void setDriveVolts(double volts) {}

    /** Ask the steer motor for this many volts. Positive should turn the wheel counterclockwise, seen from above. */
    public default void setSteerVolts(double volts) {}
}
```

Compare it with `RoboRioIO`: the same nested `@AutoLog` inputs class, the same `default` methods that do nothing, so a replay module can be an empty anonymous class (Chapter 24). There are three groups of inputs, one per device, and each motor group has the same five readings Section 27.6 promised, plus a `Connected` flag. The units are in every name: **motor** rotations, not wheel rotations, and rotations **per second**, the way Phoenix reports them. Chapter 28 changes these to wheel meters and module angles, once the gear ratios come in, and the names will change with them, so nobody can mix them up.

> **Positive means something, in writing**
>
> The Javadoc on `setDriveVolts` and `setSteerVolts` says what positive should do: roll the wheel forward, and turn the wheel counterclockwise as seen from above. That second one is WPILib's convention for every angle (Chapter 13's counterclockwise-positive rotation), and Chapter 28's swerve math assumes it. Writing the promise in the interface makes it a contract (Chapter 11): every IO class must keep it, and Section 27.9's motor check is how you find out whether the real robot does.

### Step 4: The real module

`ModuleIOTalonFX.java`. This is the longest file in the chapter, and almost every line is something Section 27.6 or 27.7 already explained. Type it in:

```java
package frc.robot.subsystems.drive;

import com.ctre.phoenix6.BaseStatusSignal;
import com.ctre.phoenix6.StatusCode;
import com.ctre.phoenix6.StatusSignal;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.VoltageOut;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.InvertedValue;
import com.ctre.phoenix6.signals.NeutralModeValue;
import edu.wpi.first.math.filter.Debouncer;
import edu.wpi.first.math.filter.Debouncer.DebounceType;
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.Current;
import edu.wpi.first.units.measure.Temperature;
import edu.wpi.first.units.measure.Voltage;
import edu.wpi.first.wpilibj.DriverStation;
import frc.robot.subsystems.drive.DriveConstants.ModuleConstants;

/** A real swerve module: two Krakens (each with a Talon FX inside) and a CANcoder, on the CAN bus. */
public class ModuleIOTalonFX implements ModuleIO {
    private final TalonFX driveMotor;
    private final TalonFX steerMotor;
    private final CANcoder encoder;

    // One request per motor, made once and reused every loop (Section 27.7).
    private final VoltageOut driveRequest = new VoltageOut(0.0);
    private final VoltageOut steerRequest = new VoltageOut(0.0);

    // The readings we want from each device. Each one is a signal that refreshes over CAN.
    private final StatusSignal<Angle> drivePosition;
    private final StatusSignal<AngularVelocity> driveVelocity;
    private final StatusSignal<Voltage> driveVolts;
    private final StatusSignal<Current> driveCurrent;
    private final StatusSignal<Temperature> driveTemperature;

    private final StatusSignal<Angle> steerPosition;
    private final StatusSignal<AngularVelocity> steerVelocity;
    private final StatusSignal<Voltage> steerVolts;
    private final StatusSignal<Current> steerCurrent;
    private final StatusSignal<Temperature> steerTemperature;

    private final StatusSignal<Angle> encoderPosition;

    // One late answer is not a lost device. Half a second of silence is (Chapter 20's debounce).
    private final Debouncer driveConnectedDebouncer = new Debouncer(0.5, DebounceType.kFalling);
    private final Debouncer steerConnectedDebouncer = new Debouncer(0.5, DebounceType.kFalling);
    private final Debouncer encoderConnectedDebouncer = new Debouncer(0.5, DebounceType.kFalling);

    public ModuleIOTalonFX(ModuleConstants module) {
        driveMotor = new TalonFX(module.driveCanId());
        steerMotor = new TalonFX(module.steerCanId());
        encoder = new CANcoder(module.encoderCanId());

        TalonFXConfiguration driveConfig = new TalonFXConfiguration();
        driveConfig.MotorOutput.Inverted = direction(module.driveInverted());
        driveConfig.MotorOutput.NeutralMode = NeutralModeValue.Brake;
        driveConfig.CurrentLimits.StatorCurrentLimit = DriveConstants.DRIVE_STATOR_LIMIT_AMPS;
        driveConfig.CurrentLimits.StatorCurrentLimitEnable = true;
        applyConfig(driveMotor, driveConfig, module.name() + " drive");

        TalonFXConfiguration steerConfig = new TalonFXConfiguration();
        steerConfig.MotorOutput.Inverted = direction(module.steerInverted());
        steerConfig.MotorOutput.NeutralMode = NeutralModeValue.Brake;
        steerConfig.CurrentLimits.StatorCurrentLimit = DriveConstants.STEER_STATOR_LIMIT_AMPS;
        steerConfig.CurrentLimits.StatorCurrentLimitEnable = true;
        applyConfig(steerMotor, steerConfig, module.name() + " steer");

        drivePosition = driveMotor.getPosition();
        driveVelocity = driveMotor.getVelocity();
        driveVolts = driveMotor.getMotorVoltage();
        driveCurrent = driveMotor.getStatorCurrent();
        driveTemperature = driveMotor.getDeviceTemp();

        steerPosition = steerMotor.getPosition();
        steerVelocity = steerMotor.getVelocity();
        steerVolts = steerMotor.getMotorVoltage();
        steerCurrent = steerMotor.getStatorCurrent();
        steerTemperature = steerMotor.getDeviceTemp();

        encoderPosition = encoder.getAbsolutePosition();
    }

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        // Ask for fresh values. If a device never answers, its status is not OK.
        StatusCode driveStatus = BaseStatusSignal.refreshAll(
            drivePosition, driveVelocity, driveVolts, driveCurrent, driveTemperature);
        StatusCode steerStatus = BaseStatusSignal.refreshAll(
            steerPosition, steerVelocity, steerVolts, steerCurrent, steerTemperature);
        StatusCode encoderStatus = BaseStatusSignal.refreshAll(encoderPosition);

        inputs.driveConnected = driveConnectedDebouncer.calculate(driveStatus.isOK());
        inputs.driveMotorRotations = drivePosition.getValueAsDouble();
        inputs.driveMotorRotationsPerSecond = driveVelocity.getValueAsDouble();
        inputs.driveAppliedVolts = driveVolts.getValueAsDouble();
        inputs.driveCurrentAmps = driveCurrent.getValueAsDouble();
        inputs.driveTemperatureCelsius = driveTemperature.getValueAsDouble();

        inputs.steerConnected = steerConnectedDebouncer.calculate(steerStatus.isOK());
        inputs.steerMotorRotations = steerPosition.getValueAsDouble();
        inputs.steerMotorRotationsPerSecond = steerVelocity.getValueAsDouble();
        inputs.steerAppliedVolts = steerVolts.getValueAsDouble();
        inputs.steerCurrentAmps = steerCurrent.getValueAsDouble();
        inputs.steerTemperatureCelsius = steerTemperature.getValueAsDouble();

        inputs.encoderConnected = encoderConnectedDebouncer.calculate(encoderStatus.isOK());
        inputs.encoderAbsoluteRotations = encoderPosition.getValueAsDouble();
    }

    @Override
    public void setDriveVolts(double volts) {
        driveMotor.setControl(driveRequest.withOutput(volts));
    }

    @Override
    public void setSteerVolts(double volts) {
        steerMotor.setControl(steerRequest.withOutput(volts));
    }

    /** Which way is positive? Counterclockwise unless the fact sheet says this motor is inverted. */
    private static InvertedValue direction(boolean inverted) {
        return inverted ? InvertedValue.Clockwise_Positive : InvertedValue.CounterClockwise_Positive;
    }

    /** Send a whole configuration to one motor, and say so if it does not answer. */
    private static void applyConfig(TalonFX motor, TalonFXConfiguration config, String description) {
        StatusCode result = motor.getConfigurator().apply(config);
        if (!result.isOK()) {
            DriverStation.reportError(
                description + " motor (CAN " + motor.getDeviceID() + ") did not take its settings: " + result,
                false);
        }
    }
}
```

Walk through it, top to bottom:

- **Three device objects**, made once in the constructor, each with its CAN ID from the record. This is the only file in the project that knows the word `TalonFX`.
- **Two `VoltageOut` requests**, one per motor, made once and reused (Section 27.7).
- **Eleven status signals**, fetched once in the constructor. The angle brackets are Chapter 23's generics: a `StatusSignal<Angle>` is a signal whose value is an angle.
- **The configuration**, filled in field by field, then sent with `applyConfig`. `direction()` turns the record's `true`/`false` into Phoenix's two-value enum, with Chapter 8's ternary operator.
- **`updateInputs`** refreshes each device's signals in one call, using varargs (Section 27.5), then turns each status into a debounced `Connected` flag and copies each value into the inputs.
- **The two setters** are one line each.
- **`applyConfig`** reports a failed configuration to the Driver Station with `DriverStation.reportError`, the same thing AdvantageKit does when it cannot open a log file (Section 26.10), and carries on. The `Connected` alert will keep reminding everyone, every loop.

> **Why the debouncer?**
>
> On a busy bus, an answer can occasionally arrive a little late. Without the debouncer, one late answer would flash a "not answering" alert for one loop, and an alert that flickers teaches everyone to ignore alerts (Section 26.8's lesson). Chapter 20 used a `Debouncer` so a line sensor had to see tape for a moment before it counted. Here it is the other way around, with `kFalling`: the device has to be silent for **half a second** before it counts as gone, but it counts as back the instant it answers.

### Step 5: The pretend module

`ModuleIOSim.java`:

```java
package frc.robot.subsystems.drive;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;

/** A pretend swerve module: two simulated motors with a light load, no gearbox, and no CANcoder yet (Chapter 27). */
public class ModuleIOSim implements ModuleIO {
    // A made-up light load on each motor shaft, in kg m^2. Chapter 28 adds the real gear ratios.
    private static final double LOAD_KG_METERS_SQUARED = 0.001;
    private static final double LOOP_SECONDS = 0.02;
    // A motor controller cannot give a motor more than the battery has.
    private static final double MAX_VOLTS = 12.0;
    // Pretend motors never warm up.
    private static final double ROOM_TEMPERATURE_CELSIUS = 22.0;

    private final DCMotorSim driveSim = makeMotorSim(DriveConstants.DRIVE_MOTOR);
    private final DCMotorSim steerSim = makeMotorSim(DriveConstants.STEER_MOTOR);
    private double driveVolts = 0.0;
    private double steerVolts = 0.0;

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        // Let one loop of pretend time go by, at whatever volts the code asked for.
        driveSim.setInputVoltage(driveVolts);
        steerSim.setInputVoltage(steerVolts);
        driveSim.update(LOOP_SECONDS);
        steerSim.update(LOOP_SECONDS);

        inputs.driveConnected = true;
        inputs.driveMotorRotations = driveSim.getAngularPositionRotations();
        inputs.driveMotorRotationsPerSecond = Units.radiansToRotations(driveSim.getAngularVelocityRadPerSec());
        inputs.driveAppliedVolts = driveVolts;
        inputs.driveCurrentAmps = Math.abs(driveSim.getCurrentDrawAmps());
        inputs.driveTemperatureCelsius = ROOM_TEMPERATURE_CELSIUS;

        inputs.steerConnected = true;
        inputs.steerMotorRotations = steerSim.getAngularPositionRotations();
        inputs.steerMotorRotationsPerSecond = Units.radiansToRotations(steerSim.getAngularVelocityRadPerSec());
        inputs.steerAppliedVolts = steerVolts;
        inputs.steerCurrentAmps = Math.abs(steerSim.getCurrentDrawAmps());
        inputs.steerTemperatureCelsius = ROOM_TEMPERATURE_CELSIUS;

        // No pretend CANcoder until Chapter 28 gives the steer motor its gear ratio.
        inputs.encoderConnected = true;
        inputs.encoderAbsoluteRotations = 0.0;
    }

    @Override
    public void setDriveVolts(double volts) {
        driveVolts = MathUtil.clamp(volts, -MAX_VOLTS, MAX_VOLTS);
    }

    @Override
    public void setSteerVolts(double volts) {
        steerVolts = MathUtil.clamp(volts, -MAX_VOLTS, MAX_VOLTS);
    }

    /** A simulated motor turning a light load directly, with no gearbox (gearing 1.0). */
    private static DCMotorSim makeMotorSim(DCMotor motor) {
        return new DCMotorSim(
            LinearSystemId.createDCMotorSystem(motor, LOAD_KG_METERS_SQUARED, 1.0), motor);
    }
}
```

This is Chapter 17's `DrivetrainIOSim` idea again, for one module. WPILib's `DCMotorSim` simulates a motor turning a load: give it volts, call `update` with the loop time, and read back position, speed, and current. Each pretend motor gets a light, made-up load and a gearing of `1.0`, because this chapter's readings are about the **motor shaft**, not the wheel. Chapter 28 adds the real gear ratios from the fact sheet, and the real load with them. The volts are clamped to plus or minus 12, because a motor controller cannot give a motor more than the battery has. And there is no pretend CANcoder yet: it reports "connected" and an angle of zero until Chapter 28 has a steer gear ratio to turn a pretend motor angle into a pretend wheel angle.

> **Why not Phoenix's own simulation?**
>
> Phoenix 6 can simulate a Talon FX too: every `TalonFX` object has a sim state you can feed with a physics model. AdvantageKit's documentation and templates take a simpler road, and so does this book: the simulation lives in its own IO class, with WPILib's `DCMotorSim`, and never creates a `TalonFX` at all. That keeps the simulator and the tests free of any vendor library, and it is the same pattern as every IO class since Chapter 17.

### Step 6: One module, and four of them

`Module.java`:

```java
package frc.robot.subsystems.drive;

import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.Alert.AlertType;
import frc.robot.subsystems.drive.DriveConstants.ModuleConstants;
import org.littletonrobotics.junction.Logger;

/** One swerve module: its IO, its logged inputs, and its alerts. Not a subsystem: Drive owns all four (Chapter 27). */
public class Module {
    private final ModuleIO io;
    private final ModuleIOInputsAutoLogged inputs = new ModuleIOInputsAutoLogged();
    private final String name;

    private final Alert driveSilentAlert;
    private final Alert steerSilentAlert;
    private final Alert encoderSilentAlert;

    public Module(ModuleIO io, ModuleConstants constants) {
        this.io = io;
        name = constants.name();
        driveSilentAlert = new Alert(
            name + " drive motor (CAN " + constants.driveCanId() + ") is not answering.", AlertType.kError);
        steerSilentAlert = new Alert(
            name + " steer motor (CAN " + constants.steerCanId() + ") is not answering.", AlertType.kError);
        encoderSilentAlert = new Alert(
            name + " CANcoder (CAN " + constants.encoderCanId() + ") is not answering.", AlertType.kError);
    }

    /** Read this module's inputs and update its alerts. Drive calls this once per loop. */
    public void periodic() {
        io.updateInputs(inputs);
        Logger.processInputs("Drive/" + name, inputs);

        driveSilentAlert.set(!inputs.driveConnected);
        steerSilentAlert.set(!inputs.steerConnected);
        encoderSilentAlert.set(!inputs.encoderConnected);
    }

    /** Ask each motor for volts: real volts, at last (Chapter 16). */
    public void setVolts(double driveVolts, double steerVolts) {
        io.setDriveVolts(driveVolts);
        io.setSteerVolts(steerVolts);
        Logger.recordOutput("Drive/" + name + "/DriveRequestedVolts", driveVolts);
        Logger.recordOutput("Drive/" + name + "/SteerRequestedVolts", steerVolts);
    }

    /** Zero volts on both motors. Brake mode does the rest. */
    public void stop() {
        setVolts(0.0, 0.0);
    }

    /** The module's name, like "FrontLeft". */
    public String getName() {
        return name;
    }

    /** How fast the drive motor's shaft is turning, in rotations per second. */
    public double getDriveMotorRotationsPerSecond() {
        return inputs.driveMotorRotationsPerSecond;
    }

    /** How fast the steer motor's shaft is turning, in rotations per second. */
    public double getSteerMotorRotationsPerSecond() {
        return inputs.steerMotorRotationsPerSecond;
    }

    /** For tests: is the drive motor's "not answering" alert showing? */
    boolean isDriveSilentAlertOn() {
        return driveSilentAlert.get();
    }

    /** For tests: is the steer motor's "not answering" alert showing? */
    boolean isSteerSilentAlertOn() {
        return steerSilentAlert.get();
    }
}
```

It is `RoboRio`'s shape (Chapter 26), for one module: `periodic()` updates the inputs, hands them to AdvantageKit, then updates the alerts. Three alerts per module, so twelve in all, and each one names its device **by CAN ID**: "FrontLeft steer motor (CAN 2) is not answering." When that shows up in Elastic, nobody has to look anything up. The setters record the requested volts as outputs (Chapter 24), so the log shows what the code **asked** for next to what the motor **did**.

And `Drive.java`, the subsystem:

```java
package frc.robot.subsystems.drive;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import org.littletonrobotics.junction.Logger;

/** The Mini Swerve's drive: four modules, eight motors. The swerve math arrives in Chapter 28. */
public class Drive extends SubsystemBase {
    // Always in this order: front left, front right, back left, back right (Section 27.5).
    private final Module[] modules;

    public Drive(ModuleIO frontLeftIO, ModuleIO frontRightIO, ModuleIO backLeftIO, ModuleIO backRightIO) {
        modules = new Module[] {
            new Module(frontLeftIO, DriveConstants.FRONT_LEFT),
            new Module(frontRightIO, DriveConstants.FRONT_RIGHT),
            new Module(backLeftIO, DriveConstants.BACK_LEFT),
            new Module(backRightIO, DriveConstants.BACK_RIGHT)
        };
    }

    @Override
    public void periodic() {
        for (Module module : modules) {
            module.periodic();
        }
    }

    /** Zero volts on all eight motors. */
    public void stop() {
        for (Module module : modules) {
            module.stop();
        }
    }

    /**
     * Spin every motor alone, one after another: each module's drive motor, then its steer motor,
     * front left first. Bind it with whileTrue, so letting go of the button stops everything.
     */
    public Command motorCheck() {
        Command[] steps = new Command[modules.length * 2];
        for (int i = 0; i < modules.length; i++) {
            steps[2 * i] = spinAlone(modules[i], "drive", DriveConstants.MOTOR_CHECK_VOLTS, 0.0);
            steps[2 * i + 1] = spinAlone(modules[i], "steer", 0.0, DriveConstants.MOTOR_CHECK_VOLTS);
        }
        return Commands.sequence(steps)
            .finallyDo(() -> Logger.recordOutput("Drive/MotorCheck", "None"))
            .withName("Motor Check");
    }

    /** Spin one motor of one module for a moment, log which one, then rest. */
    private Command spinAlone(Module module, String motor, double driveVolts, double steerVolts) {
        String label = module.getName() + " " + motor;
        return runEnd(
                () -> {
                    module.setVolts(driveVolts, steerVolts);
                    Logger.recordOutput("Drive/MotorCheck", label);
                },
                module::stop)
            .withTimeout(DriveConstants.MOTOR_CHECK_SECONDS)
            .andThen(Commands.waitSeconds(DriveConstants.MOTOR_CHECK_PAUSE_SECONDS));
    }
}
```

Walk through it:

- **`modules`** is the array from Section 27.5, made and filled in one step in the constructor, in the book's order: front left, front right, back left, back right.
- **`periodic()` and `stop()`** are for-each loops. Four modules or forty, it is the same three lines.
- **`motorCheck()`** builds an array of eight steps with the counting loop, because it needs the index: module `i`'s drive motor goes in slot `2 * i`, and its steer motor in slot `2 * i + 1`. Work it out for `i = 0` (slots 0 and 1) and `i = 3` (slots 6 and 7): every slot from 0 to 7 is filled exactly once. Then the whole array goes into `Commands.sequence(steps)`, the varargs method from Section 27.5.
- **`spinAlone`** builds one step: a `runEnd` command (Chapter 19, the cousin of Chapter 26's `startEnd`) that asks one motor for gentle volts every loop and logs which motor it is, stops the module when it ends, times out after 1.5 seconds, and then rests half a second. `runEnd` comes from `Drive` itself, so every step **requires** `Drive`.
- **`finallyDo`** runs once when the whole check ends, finished or interrupted, and logs `None`, so the log never claims a motor is still being checked.

> **The dead-man's switch**
>
> Section 27.9 binds `motorCheck()` with `whileTrue`, so the check runs only while someone **holds** the button. Let go, and the command is cancelled, the current step's `end` stops its module, and the robot is still. Real machines in factories use the same idea, called a **dead-man's switch**: the machine only runs while a person keeps a hand on the control. For any command that spins motors on a robot nobody has driven yet, it is the right binding.

### Step 7: `RobotContainer`

Three changes in `RobotContainer.java`. Here is the whole file, so you can match yours:

```java
package frc.robot;

import edu.wpi.first.wpilibj.RobotController.RadioLEDState;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import frc.robot.Constants.OperatorConstants;
import frc.robot.Constants.RobotMode;
import frc.robot.subsystems.drive.Drive;
import frc.robot.subsystems.drive.DriveConstants;
import frc.robot.subsystems.drive.DriveConstants.ModuleConstants;
import frc.robot.subsystems.drive.ModuleIO;
import frc.robot.subsystems.drive.ModuleIOSim;
import frc.robot.subsystems.drive.ModuleIOTalonFX;
import frc.robot.subsystems.roborio.RoboRio;
import frc.robot.subsystems.roborio.RoboRioIO;
import frc.robot.subsystems.roborio.RoboRioIOReal;
import frc.robot.subsystems.roborio.RoboRioIOSim;

/** Builds the Mini Swerve's subsystems and commands, and ties them to the controller (Chapter 20). */
public class RobotContainer {
    private final RoboRio roboRio;
    private final Drive drive;

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

        drive = new Drive(
            moduleIO(mode, DriveConstants.FRONT_LEFT),
            moduleIO(mode, DriveConstants.FRONT_RIGHT),
            moduleIO(mode, DriveConstants.BACK_LEFT),
            moduleIO(mode, DriveConstants.BACK_RIGHT));
        System.out.println("Robot mode: " + mode);

        autoLight = roboRio.showColor(RadioLEDState.kGreen).withName("Auto Light");

        configureBindings();
    }

    /** Which hardware for one swerve module? The same three-way choice as every IO (Chapter 24). */
    private static ModuleIO moduleIO(RobotMode mode, ModuleConstants module) {
        return switch (mode) {
            case REAL -> new ModuleIOTalonFX(module);
            case SIM -> new ModuleIOSim();
            case REPLAY -> new ModuleIO() {};
        };
    }

    /**
     * Tie the controller's buttons to commands. The driver's controls:
     *
     * <pre>
     * Teleop     A              RADIO light orange (hold)
     * Test       A              Motor check: every motor alone, in order (hold; let go to stop)
     * </pre>
     */
    private void configureBindings() {
        // Teleop: hold A to light the RADIO light orange. Proof that the controller reaches the roboRIO.
        controller.a().and(RobotModeTriggers.teleop())
            .whileTrue(roboRio.showColor(RadioLEDState.kOrange).withName("Hello Light"));

        // Test: hold A to spin every motor alone, wheels in the air. Let go, and everything stops.
        controller.a().and(RobotModeTriggers.test()).whileTrue(drive.motorCheck());
    }

    /** The command to run in autonomous. */
    public Command getAutonomousCommand() {
        return autoLight;
    }
}
```

- **`moduleIO`** is a small `static` helper with the same three-way switch expression as `RoboRio`'s (Chapter 24), for one module. It is `static` because it uses nothing from the `RobotContainer` object, only its parameters.
- **`drive`** is built from four calls to it, one per module, in the book's order.
- **A test-mode binding**: hold A in **Test** mode to run the motor check. A is still the Hello Light in **Teleop**; `RobotModeTriggers` keeps the two apart (Chapter 20). The Javadoc table at the top of `configureBindings` gets the new row.

### Step 8: Simulate first

Build, and run **WPILib: Simulate Robot Code** (Sim GUI only). In AdvantageScope, **File** > **Connect to Simulator**, and open the `Drive` table: four modules, each with its inputs, all `Connected`. Graph `Drive` > `FrontLeft` > `DriveMotorRotationsPerSecond`.

In the Simulation GUI, click **Test**, and if you have a controller set up (Section 8.2), hold A. Watch `RealOutputs` > `Drive` > `MotorCheck` step through `FrontLeft drive`, `FrontLeft steer`, `FrontRight drive`, and on around the robot, and watch each module's rotations-per-second line rise and fall in turn. Let go of A partway through: everything drops to zero, and `MotorCheck` says `None`.

At 1.5 volts, each pretend motor settles at about 12.5 rotations per second. Check that against Chapter 16's **kV**: a Kraken X60's data sheet says it spins at about 6,000 RPM, which is 100 rotations per second, at 12 volts with nothing attached. That is about 8.3 rotations per second for every volt, and 8.3 times 1.5 is about 12.5. The simulator is doing kV arithmetic, nothing more. The real robot will be slower at the same volts, because a real module has gears and bearings that rub: that is Chapter 16's **kS**, and Chapter 32 measures it on these motors.

Commit:

```bash
git add .
git commit -m "Ch27: Drive subsystem with an IO layer for four swerve modules, and the motor check"
```

---

## 27.9 One Motor at a Time: The Motor Check

This is the moment the chapter has been building to. The code in `DriveConstants` makes eight promises ("CAN ID 1 is the front left drive motor," and so on) and eight guesses (every direction is `false`). The motor check tests every one of them, with your eyes.

### Get ready

1. **Switch the robot off.** Turn each wheel by hand so it points **straight ahead**, along the robot's length. Swerve wheels have a **bevel gear** on one side; turn all four so their bevel gears face the **same side** of the robot (the left, say), and write which side on the fact sheet. Chapter 28 uses the same choice when it teaches the CANcoders where "straight ahead" is.
2. **Put the robot on blocks**, wheels clear of everything. Battery in, USB stick in, laptop on the USB cable.
3. **Switch on, and deploy** the `can-motors` branch. In RioLog: `Robot mode: REAL`, with no errors from `[phoenix]` or from your own `applyConfig`. In Elastic (or AdvantageScope), check there are **no** "not answering" alerts. If there are, stop here, and go to Section 27.10.
4. In AdvantageScope, connect to the robot and graph each module's `DriveMotorRotationsPerSecond` and `SteerMotorRotationsPerSecond`, plus `RealOutputs` > `Drive` > `MotorCheck`.

### What "right" looks like

Before you run it, agree out loud on what each motor **should** do for positive volts:

- A **drive** motor should roll its wheel **forward**: the top of the wheel moves toward the front of the robot.
- A **steer** motor should turn its module **counterclockwise, as seen from above**. That is WPILib's positive direction for every angle (Chapter 13), and the promise in `ModuleIO`'s Javadoc.

The check does each module's drive motor first, while the wheel still points straight ahead, and then its steer motor. That order is on purpose: once a module has steered, its wheel no longer points forward, and "forward" would mean nothing for its drive motor.

### Run it

Say "Enabling!" Pick **Test** in the Driver Station, enable, and **hold A**. For the next sixteen seconds, one motor at a time turns for a second and a half, gently, at 1.5 volts. One person calls out the name in `MotorCheck` ("FrontLeft drive!"), and everyone else watches the robot and says what they see. Let go of A at the first sign of anything wrong: everything stops.

Fill in the direction table on the fact sheet as you go, one row per motor:

| Motor | `MotorCheck` said | What moved | Which way | Right? |
|---|---|---|---|---|
| 1 | FrontLeft drive | Front left wheel | Rolled backward | No: invert |
| 2 | FrontLeft steer | Front left module | Counterclockwise | Yes |
| ... | | | | |

Three different things can be wrong, and the table catches all of them:

- **The wrong part moved.** `MotorCheck` said "FrontLeft drive" and the back right wheel spun, or the front left module **steered** instead. The CAN ID on the device does not match the code. Do not fix this by changing directions! Go back to Tuner X, Blink the device, and fix the ID or the fact sheet, whichever is wrong.
- **The right part moved the wrong way.** That is an inversion. Fix it in code, next.
- **Nothing moved.** See the table below.

### Fix the directions

For every motor marked "No: invert," change its `false` to `true` in `DriveConstants`. For example, if the front left drive motor rolled backward:

```java
public static final ModuleConstants FRONT_LEFT = new ModuleConstants("FrontLeft", 1, 2, 1, true, false);
```

Deploy, and run the whole check again, from the start, with the wheels pointed straight ahead again. Every row must now say "Yes." Then commit only those changes, by themselves (the Git exercise explains why):

```bash
git add src/main/java/frc/robot/subsystems/drive/DriveConstants.java
git commit -m "Ch27: Set motor directions from the motor check"
```

And copy every direction into the fact sheet, so the next team to build a Mini Swerve program does not have to measure them again.

> **Do not be surprised by a pattern**
>
> On many swerve modules, the motors on the left side of the robot need the opposite setting from the motors on the right, because the modules are mirror images. On others, all four match. Whatever your table says is the answer for your robot. Do not "fix" a result because it looks lopsided.

### Watch the CANcoders too

While each steer motor turns its module, its CANcoder is measuring the same turn. Graph `Drive` > `FrontLeft` > `EncoderAbsoluteRotations` (and the other three) during the check, and write in the fact sheet whether each one **rises** or **falls** as its module turns counterclockwise. (It runs from -0.5 to just under 0.5, then jumps back to -0.5 and carries on, like a clock going past twelve.) You will not change anything for the CANcoders today. Chapter 28 needs to know which way they count, and now you do.

### What the robot told you

Now open the log of that run in AdvantageScope (**File** > **Download Logs...**), and look at what the motors reported:

- **Volts.** `DriveAppliedVolts` should sit right at 1.5 while each drive motor spins, whatever the battery was doing. That is real volts at work (Section 26.8).
- **Current.** `DriveCurrentAmps` jumps for a moment as each motor starts, then settles low: starting a motor takes more current than keeping it turning.
- **The battery.** Graph `RoboRio` > `BatteryVolts` under the current. Each start makes a small dip: **sag**, measured for real, the thing Chapter 16's pretend volts could never show you. At 1.5 volts it is small. At full speed, it will not be.
- **The power distribution board.** Under `PowerDistribution` > `ChannelCurrent`, AdvantageKit recorded the current on every channel of the PDH, for free (Section 27.3). Find the channel that rises each time a particular motor spins, and add the PDH channel numbers to the CAN map. When a breaker trips at a competition, you will know exactly which motor it feeds.
- **The bus.** `SystemStats` > `CANBus` > `Utilization` shows how busy the bus was. Write the number in your notebook; it is your baseline for every device you add later.

### When the check goes wrong

| What you see | What it usually means |
|---|---|
| Nothing moves at all, and no alerts | The robot is not in **Test**, or not enabled, or A is not reaching the robot (check the **Joysticks** light and slot 0, Section 8.2) |
| Nothing moves, and a "not answering" alert for that motor | Its CAN ID in code does not match the device, or it is not on the bus (Section 27.10) |
| A motor hums or twitches but does not turn | 1.5 volts is not enough to beat that module's friction. Raise `MOTOR_CHECK_VOLTS` to 2.0 and try again, not higher |
| The wrong motor moves | The CAN ID on the device does not match the code or the fact sheet. Fix it with Tuner X and Blink |
| Two motors move at once | Two devices of the same kind share an ID. Tuner X shows red cards. Fix it before anything else |
| Everything stops in the middle | Someone let go of A, or the robot was disabled, or it browned out (check the `RoboRio` alerts) |

---

## 27.10 When a Device Goes Quiet

Some day, at the worst possible moment, a device on your robot will stop answering. A connector works loose, a CAN wire gets pinched, a motor gets replaced and nobody sets its ID. You want to recognize that moment the first time you see it, so make it happen now, on purpose, safely, without touching a single wire.

### The wrong-ID drill

On a throwaway branch (this must never be merged):

```bash
git checkout -b wrong-id-drill
```

In `DriveConstants`, change the front left **steer** motor's ID from `2` to `9`, an ID no device on the robot has:

```java
// WRONG-ID DRILL (Chapter 27). Never merge this.
public static final ModuleConstants FRONT_LEFT = new ModuleConstants("FrontLeft", 1, 9, 1, false, false);
```

Robot on blocks. Deploy, and watch three places.

1. **RioLog and the Driver Station's messages.** At start-up, your `applyConfig` reports that `FrontLeft steer motor (CAN 9) did not take its settings`, with a status code saying no answer came. Phoenix itself adds its own messages from `[phoenix]`, saying a CAN frame was "not received" or was "too stale," and naming a Talon FX with ID 9. (The robot also takes a moment longer to start: Phoenix waits a little for each answer that never comes.)
2. **Elastic.** Half a second after the program starts, a red alert appears: **FrontLeft steer motor (CAN 9) is not answering.** It names the module, the motor, and the ID the code is looking for. It stays up for as long as the problem lasts.
3. **AdvantageScope.** `Drive` > `FrontLeft` > `SteerConnected` is `false`, and that module's steer readings sit at zero.

Now run the motor check. Everything works except one step: when `MotorCheck` says "FrontLeft steer," nothing moves. The code sends its volts to device 9, and nobody is listening.

Notice what did **not** happen. The code compiled. The tests passed. The robot did not crash. Nothing about this bug is visible until the program runs on the real robot, which is exactly why the alert exists: it turns a silent problem into a loud one, in words anyone can act on.

Put it back, and delete the branch:

```bash
git checkout can-motors
git branch -D wrong-id-drill
```

Deploy `can-motors` again, and check that the alert is gone.

> **A missing device is not an exception**
>
> In Chapter 26, a bug threw an exception, and the robot program stopped. A missing CAN device does not throw anything: Phoenix reports it with status codes and messages, and the rest of the robot carries on. That is the right design for a robot on a field. A loose CAN connector on one steering motor should cost you one wheel's steering, not the whole robot for the rest of the match. But it only works if somebody **notices**, so every device the code depends on gets an alert, and every alert names the device.

### When a real device goes quiet

When an alert like that shows up for real, work through it in this order:

1. **Look at the device's lights** (Section 27.4). Alternating red on a Kraken means it has no CAN signal at all.
2. **Open Tuner X.** Is the device on the Devices page? With which ID? A device that is there but with ID 0 is a replacement nobody set up. A device that is missing is on the wrong side of a wiring problem.
3. **Check the chain** (Section 27.2), with the robot **off**, starting at the last device that still answers and moving along the chain.
4. **Check the CAN map.** If someone changed an ID on purpose, the code and the fact sheet need to change with it, through a pull request.

---

## 27.11 Tests for Code That Talks to Twelve Devices

None of the new tests needs a robot, a Kraken, or Phoenix 6. That is the IO layer paying off again: everything above `ModuleIO` can be tested with a pretend module, and `ModuleIOTalonFX` is the one file the robot itself tests, with the motor check.

### A fake module

Create `src/test/java/frc/robot/subsystems/drive/FakeModuleIO.java`, like Chapter 22's `FakeDrivetrainIO`:

```java
package frc.robot.subsystems.drive;

/** A pretend module for tests: it remembers the last volts it was asked for (Chapter 27). */
class FakeModuleIO implements ModuleIO {
    double driveVolts = 0.0;
    double steerVolts = 0.0;

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        inputs.driveConnected = true;
        inputs.steerConnected = true;
        inputs.encoderConnected = true;
    }

    @Override
    public void setDriveVolts(double volts) {
        driveVolts = volts;
    }

    @Override
    public void setSteerVolts(double volts) {
        steerVolts = volts;
    }
}
```

It does one job: it remembers the last volts each motor was asked for, so a test can ask "which motors are spinning right now?"

### The module's tests

`ModuleTest.java`, in the same folder:

```java
package frc.robot.subsystems.drive;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.math.util.Units;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ModuleTest {

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);
    }

    @Test
    void sixVoltsSpinsThePretendDriveMotorAtAboutHalfSpeed() {
        Module module = new Module(new ModuleIOSim(), DriveConstants.FRONT_LEFT);

        module.setVolts(6.0, 0.0);
        for (int loop = 0; loop < 50; loop++) {   // one second of loops
            module.periodic();
        }

        // Chapter 16's kV, from the motor's data sheet: speed per volt, with nothing slowing it down.
        double expected = Units.radiansToRotations(6.0 * DriveConstants.DRIVE_MOTOR.KvRadPerSecPerVolt);
        assertEquals(expected, module.getDriveMotorRotationsPerSecond(), expected * 0.05);
        assertEquals(0.0, module.getSteerMotorRotationsPerSecond(), 1e-9);
    }

    @Test
    void stopSendsZeroVoltsToBothMotors() {
        FakeModuleIO io = new FakeModuleIO();
        Module module = new Module(io, DriveConstants.FRONT_LEFT);
        module.setVolts(3.0, -2.0);

        module.stop();

        assertEquals(0.0, io.driveVolts, 1e-9);
        assertEquals(0.0, io.steerVolts, 1e-9);
    }

    @Test
    void aSilentSteerMotorRaisesItsAlert() {
        ModuleIO silentSteer = new ModuleIO() {
            @Override
            public void updateInputs(ModuleIOInputs inputs) {
                inputs.driveConnected = true;
                inputs.steerConnected = false;   // as if its CAN ID were wrong
                inputs.encoderConnected = true;
            }
        };
        Module module = new Module(silentSteer, DriveConstants.FRONT_LEFT);

        module.periodic();

        assertFalse(module.isDriveSilentAlertOn());
        assertTrue(module.isSteerSilentAlertOn());
    }
}
```

- **The first test** runs the pretend module for one second at 6 volts and checks the speed against kV, the arithmetic from Section 27.8's simulation step. It is a test of `ModuleIOSim` as much as of `Module`, and it will catch the day someone breaks the simulator by accident.
- **The second** checks that `stop()` really sends zero to both motors.
- **The third** builds a module whose steer motor never answers, with an anonymous class (Chapter 24), and checks that the right alert goes up and the wrong one does not. That is Section 27.10's wrong-ID drill, without a robot.

### The motor check's tests

`MotorCheckTest.java`:

```java
package frc.robot.subsystems.drive;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj.simulation.SimHooks;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MotorCheckTest {
    private FakeModuleIO[] ios;
    private Drive drive;

    @BeforeEach
    void setUp() {
        HAL.initialize(500, 0);
        SimHooks.pauseTiming();   // time moves only when the test says so (Chapter 22)
        DriverStationSim.setTest(true);
        DriverStationSim.setEnabled(true);
        DriverStationSim.notifyNewData();

        ios = new FakeModuleIO[] {
            new FakeModuleIO(), new FakeModuleIO(), new FakeModuleIO(), new FakeModuleIO()
        };
        drive = new Drive(ios[0], ios[1], ios[2], ios[3]);
    }

    @AfterEach
    void tearDown() {
        CommandScheduler.getInstance().cancelAll();
        CommandScheduler.getInstance().unregisterAllSubsystems();
        DriverStationSim.resetData();
        DriverStationSim.notifyNewData();
        SimHooks.resumeTiming();
    }

    /** Let {@code seconds} of robot time go by, one 20 ms loop at a time. */
    private void runFor(double seconds) {
        int loops = (int) Math.round(seconds / 0.02);
        for (int loop = 0; loop < loops; loop++) {
            CommandScheduler.getInstance().run();
            SimHooks.stepTiming(0.02);
        }
    }

    /** How many of the eight motors are being asked for volts right now? */
    private int spinningMotors() {
        int count = 0;
        for (FakeModuleIO io : ios) {
            if (io.driveVolts != 0.0) {
                count++;
            }
            if (io.steerVolts != 0.0) {
                count++;
            }
        }
        return count;
    }

    @Test
    void theCheckSpinsOneMotorAtATimeInOrder() {
        Command check = drive.motorCheck();
        CommandScheduler.getInstance().schedule(check);

        runFor(0.5);    // halfway through the first spin
        assertEquals(1, spinningMotors());
        assertTrue(ios[0].driveVolts > 0.0, "front left drive goes first");

        runFor(2.0);    // halfway through the second spin
        assertEquals(1, spinningMotors());
        assertTrue(ios[0].steerVolts > 0.0, "then front left steer");

        runFor(12.0);   // halfway through the eighth spin
        assertEquals(1, spinningMotors());
        assertTrue(ios[3].steerVolts > 0.0, "back right steer goes last");

        runFor(2.0);    // past the end
        assertEquals(0, spinningMotors());
        assertFalse(check.isScheduled());
    }

    @Test
    void lettingGoStopsEveryMotor() {
        Command check = drive.motorCheck();
        CommandScheduler.getInstance().schedule(check);
        runFor(0.5);
        assertEquals(1, spinningMotors());

        check.cancel();   // what letting go of A does

        assertEquals(0, spinningMotors());
    }
}
```

This is Chapter 22's pattern for a command that takes time: pause the clock with `SimHooks.pauseTiming()`, enable the pretend robot, and let time pass one loop at a time with `runFor`. Then check at moments chosen to be in the **middle** of a step, never at its edge, so a loop's difference in timing cannot make the test flaky.

- **The first test** walks through the whole check: one motor at a time, front left drive first, back right steer last, and nothing left spinning or scheduled at the end. Work out the times yourself: each step is 1.5 seconds of spin plus 0.5 seconds of rest, so step `k` spins from `2k` to `2k + 1.5` seconds. At 14.5 seconds, step 7, the eighth motor, is spinning.
- **The second test** is the dead-man's switch: cancel the check in the middle of a spin, and every motor must be at zero at once.
- **`spinningMotors()`** is a for-each loop over the array of fakes. Even the tests got shorter because of arrays.

Run the tests: **11 tests, all green** (the six from Chapter 26, three in `ModuleTest`, two in `MotorCheckTest`). Then break one on purpose, as always. In `Drive.motorCheck()`, swap the two indexes inside the loop, so the drive step goes into `steps[2 * i + 1]` and the steer step into `steps[2 * i]`, and run the tests. `theCheckSpinsOneMotorAtATimeInOrder` fails with the message `front left drive goes first`: the check now steers each wheel before it drives it, which Section 27.9 explained is the wrong order. Put it back.

> **The one-container rule, still away**
>
> Chapter 26 warned that the old rule (only one test may build the whole `RobotContainer`) comes back the moment a simulation IO class creates something WPILib allows only once. `ModuleIOSim` creates only `DCMotorSim`s, which are plain math objects, not hardware, so `AutoLightTest` can still build `RobotContainer(RobotMode.SIM)` freely. `ModuleIOTalonFX` would be a different story, which is one more reason tests never use it.

Commit and push:

```bash
git add .
git commit -m "Ch27: Tests for the modules and the motor check"
git push -u origin can-motors
```

Open a pull request into `main`. The reviewer's checklist for this one is short and strict: every CAN ID in `DriveConstants` matches `docs/robot.md`; every inversion in the code matches the direction table; the check on GitHub is green.

---

## 27.12 What You Built

- **A CAN map** of the Mini Swerve: every device, its ID, its firmware, and its place on the chain, on the fact sheet, with "how we know" for each row.
- **Every device on the bus set up and checked** with Phoenix Tuner X: IDs, names, and firmware, each one confirmed with Blink.
- **Phoenix 6 in the project**, and a `Drive` subsystem built the AdvantageKit way: `ModuleIO`, `ModuleIOTalonFX` for the real robot, `ModuleIOSim` for the simulator, an empty replay IO, a `Module` class for each corner, and one `Drive` that owns an array of four.
- **Real settings on real motors**: brake mode, stator current limits, and an inversion for every motor, all sent in full from code on every start.
- **Twelve alerts** that name any silent device by its CAN ID.
- **A motor check** on a dead-man's switch, that proved every motor, alone, turns the way the code says it does.
- **Eleven tests**, green on GitHub.

> **What comes next**
>
> Every motor turns the right way, and every wheel is still pointing wherever it happened to stop. In Chapter 28, the readings in this chapter get their gear ratios and become wheel meters and module angles, the CANcoders get their offsets so that "zero" means "straight ahead," and you will meet the math that turns "drive this way, spinning this fast" into an angle and a speed for each of four wheels: **swerve kinematics**, Chapter 13's idea in two directions.

---

## Chapter Summary

> **What you learned in Chapter 27**
>
> * The **CAN bus** is one pair of wires (yellow CAN High, green CAN Low) that runs as a single **daisy chain** from the roboRIO to every device and ends at the power distribution board, with a 120-ohm **terminating resistor** at each end (built into the roboRIO; the PDH's **TERM** switch). Every device hears every message, messages are addressed, and devices report back. The roboRIO's **heartbeat** disables every motor controller within 100 ms of losing an enabled robot.
> * Every device has a **CAN ID** that you set. Devices ship as ID 0, so every one needs its own number. IDs must be unique only among devices of the same kind and maker, so a Kraken and a CANcoder can both be 1. The **fact sheet** holds the CAN map, and the code must match it.
> * **Phoenix Tuner X** finds the devices on the bus and sets their IDs, names, and firmware. **Blink** is how you prove which physical device has which ID.
> * New Java: an **array** holds a fixed-size, numbered row of values of one type; indexes start at **0**, `length` is its size, and `ArrayIndexOutOfBoundsException` means you asked for a slot that is not there. Arrays of objects start full of `null`. The **for-each** loop visits every item; **varargs** (`...`) parameters are arrays in disguise.
> * **Phoenix 6** configures a Talon FX with a `TalonFXConfiguration`: inversion, **brake or coast**, and **current limits** that protect motors, breakers, and the battery. A full configuration is applied from code on every start, so every motor is in a known state. Readings come as **status signals** (rotor rotations, rotations per second, volts, amps, degrees), refreshed with `BaseStatusSignal.refreshAll`, whose **status code** says whether the device answered.
> * New Java: a method that changes its object and **returns `this`** makes a **fluent** interface you can chain on one object, like `VoltageOut.withOutput`. Make the request once and reuse it every loop.
> * The `Drive` subsystem owns an **array of four `Module`s**, each with a `ModuleIO`. Alerts name a silent device by its CAN ID. The **motor check** spins every motor alone, bound with `whileTrue` as a **dead-man's switch**, to prove each motor is the one the code thinks and turns the way it should. Inversions are fixed in code, and written down.

---

## Exercises

### Practice

**1. Predict, then run.** Without running it, write down what this prints. Then run it in a scratch file and compare:

```java
public class Predict {
    public static void main(String[] args) {
        int[] canIds = {1, 2, 3, 4, 5, 6, 7, 8};
        int total = 0;
        for (int i = 0; i < canIds.length; i += 2) {
            total += canIds[i];
            System.out.println("drive motor at index " + i + " has ID " + canIds[i]);
        }
        System.out.println("total " + total);
        System.out.println(canIds[canIds.length - 1]);
    }
}
```

Now change the loop's condition to `i <= canIds.length`. Predict what happens, then run it. (Hint: the loop counts by twos. Does it ever reach index 8?) Then change the starting value to `i = 1` and leave `<=`. What happens now, and why?

**2. Find the duplicate.** Write a method `static boolean hasDuplicate(int[] ids)` that returns `true` if any ID appears twice. You need two counting loops, one inside the other, and you must not compare a slot with itself. Test it on `{1, 2, 3, 4, 5, 6, 7, 8}` (false) and `{1, 2, 3, 4, 5, 6, 7, 1}` (true). Then write one sentence in `reflections.md`: why does a duplicate CAN ID among Talon FXs not cause a compile error, a test failure, or even a clear error message on the robot?

**3. Your own fluent class.** Write a class `MotorSettings` with fields `boolean brake`, `double currentLimitAmps`, and `boolean inverted`, and three `with` methods that each return `this`. Build one in a single chained line and print it with a `toString()` method you write. Then add a method `copy()` that returns a **new** `MotorSettings` with the same values. Explain in `reflections.md`, in two sentences, the difference between `settings.withBrake(true)` and `settings.copy().withBrake(true)`.

**4. Watch the current limit work, in simulation.** In a practice branch, temporarily change `MOTOR_CHECK_VOLTS` to `12.0` and run the motor check in the simulator, graphing `DriveCurrentAmps` for the front left module. What is the peak current at the moment the motor starts, and what does it settle to? Now remember that `ModuleIOSim` has no current limit at all. What would the real Kraken's stator limit of 80 A have done to that peak, and what would it have done to how fast the motor sped up? Delete the branch. (Never run the check at 12 volts on the real robot.)

**5. Coast for a moment.** On a practice branch, change the drive motors' `NeutralMode` to `Coast`, deploy, and with the robot **disabled**, spin a wheel by hand. Then put it back to `Brake`, deploy, and try again. Write in `reflections.md` one situation where a team would want coast (hint: pushing a robot off the field after a match) and one where it would be dangerous. Do not merge the branch.

### Build (Mini Swerve)

Wire the code to every motor, prove each one, and fix their directions.

1. With the robot off, walk the CAN chain and draw it (Section 27.2). Check the PDH's TERM switch is ON.
2. Install Phoenix Tuner X. Connect it to the robot, update every device to the current firmware, give each its CAN ID and a name from the CAN map, and confirm each one with Blink (Section 27.4). Fill in the CAN map on your notebook fact sheet.
3. Install Phoenix 6 in the project with **WPILib: Manage Vendor Libraries** (Section 27.6).
4. On branch `can-motors`, move the `RoboRio` files into `subsystems/roborio`, build, test, and commit the move alone (Section 27.8, Step 1).
5. Write `DriveConstants` with your fact sheet's IDs, `ModuleIO`, `ModuleIOTalonFX`, `ModuleIOSim`, `Module`, and `Drive`, and update `RobotContainer` (Section 27.8). Run the motor check in the simulator first.
6. Robot on blocks. Deploy. Check that Elastic shows no "not answering" alerts and the Driver Station shows no Phoenix errors.
7. Run the motor check in Test mode, and fill in the direction table: which way each of the eight motors turns for positive volts, and whether each CANcoder's reading rises or falls when its steer motor turns (Section 27.9).
8. Set each `driveInverted` and `steerInverted` from the table, deploy, and run the check again until every drive wheel rolls forward and every module turns counterclockwise.
9. Do the wrong-ID drill (Section 27.10), and put the ID back.
10. Write `FakeModuleIO`, `ModuleTest`, and `MotorCheckTest`: **11 tests, all green**. Break one on purpose, then fix it (Section 27.11).
11. Push, open the pull request, have a teammate check every ID and direction against the fact sheet, wait for green, and merge.

If every device answers, the motor check moves the motor it names in the direction it should, the alerts are quiet, and GitHub shows eleven green tests, your Mini Swerve is ready for Chapter 28.

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. The Explorer used a separate channel for each motor. The Mini Swerve puts twelve devices on one pair of wires. Name two things CAN gives you that separate PWM wires could not, and one new way things can go wrong because of it.
2. A Talon FX and a CANcoder on the Mini Swerve both have ID 1, and nothing goes wrong. Two Talon FXs with ID 1 would be a disaster. Explain why, using the three parts of a CAN address.
3. `ModuleIOTalonFX` applies a whole `TalonFXConfiguration` to every motor every time the robot starts, instead of trusting the settings already saved on the device. What problem does that prevent? Think about a motor swapped in from the spare-parts box at a competition.
4. The motor check is bound with `whileTrue`, not `onTrue`. Describe what could happen on a robot nobody has driven before if it were `onTrue`, and why the dead-man's switch is the right default for this command.
5. A motor that spins the wrong way can be fixed by flipping a wire, by negating the volts everywhere in code, or with the `Inverted` setting. Why is the setting the best of the three? (Hint: what happens to the motor's encoder reading in each case?)
6. In the wrong-ID drill, the code compiled, deployed, and ran, and the robot did not crash. Is that good or bad? Use the words **compile time**, **runtime**, and **alert** in your answer, and compare it with how Chapter 26 handled exceptions.

If any answer feels shaky, re-read Sections 27.1, 27.3, 27.6, and 27.9.

### Git

On the `can-motors` branch, one commit per idea:

```bash
git checkout -b can-motors
git add .
git commit -m "Ch27: Move the RoboRio subsystem into its own package"
git add .
git commit -m "Ch27: Drive subsystem with an IO layer for four swerve modules, and the motor check"
git add .
git commit -m "Ch27: Set motor directions from the motor check"
git add .
git commit -m "Ch27: Tests for the modules and the motor check"
git push -u origin can-motors
```

The third commit holds only the `driveInverted` and `steerInverted` changes from Section 27.9. Look at it with `git show` before you push: a reviewer should see eight `true`/`false` values change and nothing else. That one small commit is the record of what your team **measured**, which is why it deserves to be on its own.

The wrong-ID drill (Section 27.10) is never committed. Before every commit, run `git diff src/main/java/frc/robot/subsystems/drive/DriveConstants.java` and check every CAN ID against the fact sheet.

### Collab: One Module Each

Split the four modules among your team (two each for a team of two). For each module, its owner:

1. Makes a branch, like `module-front-left`.
2. Runs the motor check with the rest of the team watching, and records that module's two directions and CANcoder direction.
3. Changes only that module's line in `DriveConstants` and its rows in `docs/robot.md`, commits, pushes, and opens a pull request.

A **different** teammate reviews each pull request, and checks it on the robot: run the check, and watch that module. Because the four `ModuleConstants` lines sit right next to each other, the second and later pull requests may hit a **merge conflict** after the first is merged. Resolve it the Chapter 11 way: keep **both** changes, since each one touched a different module's line, build, run the tests, and finish the merge. Afterward, write two sentences in `reflections.md`: did your conflict happen, and why does Git count two neighboring lines as a conflict when they belong to different modules?

### Explore

- Open AdvantageKit's **TalonFX Swerve** template on GitHub, and find its `ModuleIOTalonFX.java`. Compare it with yours. Name two things it reads or sets that yours does not yet, and guess which later chapter needs each one.
- Phoenix Tuner X can **generate** a whole swerve project for you, with every CAN ID and gear ratio filled in. Read CTRE's page about the swerve project generator. Why might a team use it, and why does this book build the swerve code by hand first?
- Read WPILib's page on **CAN addressing**. How many bits of a CAN message's address are the device number, and why does that make the largest ID 63? Which ID does WPILib reserve, and for what?
- With the robot running the motor check, open the Driver Station's **CAN/Power** tab and AdvantageScope's `SystemStats` > `CANBus` > `Utilization`. What does your bus utilization read? Estimate what it might be with three times as many devices, and look up what a **CANivore** would change.

---

> **Additional Resources**
>
> * **CTRE Phoenix 6 documentation**: [v6.docs.ctr-electronics.com](https://v6.docs.ctr-electronics.com/en/stable/) the official guide to Phoenix 6, Tuner X, configuration, status signals, and control requests
> * **CTRE hardware reference**: [Talon FX, CANcoder, and Pigeon 2](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/index.html) wiring, LED patterns, and specifications for every CTRE device in this chapter
> * **WPILib CAN wiring basics**: [docs.wpilib.org](https://docs.wpilib.org/en/stable/docs/hardware/hardware-basics/can-wiring-basics.html) daisy chains, termination, and how to wire a CAN bus
> * **WPILib FRC CAN Device Specifications**: [docs.wpilib.org](https://docs.wpilib.org/en/stable/docs/software/can-devices/can-addressing.html) how device type, manufacturer, and ID make up a CAN address
> * **AdvantageKit TalonFX Swerve template**: [docs.advantagekit.org](https://docs.advantagekit.org/getting-started/template-projects/talonfx-swerve-template) the swerve template whose structure this chapter's `Drive`, `Module`, and `ModuleIO` follow
> * **Arrays (The Java Tutorials)**: [docs.oracle.com](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/arrays.html) Oracle's own introduction to arrays

---

*Next up, Chapter 28: Swerve Kinematics. Every motor turns the right way; now you teach the robot which way its wheels point, and work out, by hand and then in code, how four wheels at four angles can move a robot in any direction while it spins.*
