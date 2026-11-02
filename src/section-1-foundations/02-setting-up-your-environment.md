# Chapter 2: Setting Up Your Environment

Before you write a single line of robot code, your computer and your XRP need to be able to talk to each other. That requires a few pieces of software, a firmware flash, and a Wi-Fi connection.

This chapter will walk you through all of it, step by step. Some of it is mechanical (install this, click that). Some of it requires a little patience (firmware flashing can be finicky). None of it requires any programming knowledge.

By the end of this chapter, you will have run your first robot program, an empty one, but a real one, on your XRP and confirmed that the connection works. That moment, when you see the status LED on the XRP go green for the first time, is more satisfying than it sounds.

---

## 2.1 What You're Installing and Why

Before you open any installer, let's understand what you're actually setting up and why each piece matters.

### WPILib

WPILib is the programming library that makes FRC robot programming possible. It contains the Java classes for motors, sensors, controllers, and everything else you'll use throughout this book. Every FRC team in the world uses WPILib, and it's updated every January with the new FRC season.

WPILib comes bundled with its own version of the Java Development Kit (JDK). This is intentional: FRC has specific version requirements, and the bundled JDK guarantees everyone on the team is using identical tooling. You don't need to install Java separately.

### VS Code (the WPILib edition)

VS Code is the code editor you'll use to write, build, and run your robot programs. The WPILib installer sets up a special version of VS Code pre-configured with the WPILib extension, which adds robot-specific build tools, a project generator, and a direct "Deploy to Robot" button.

If you already have VS Code installed, that's fine. The WPILib version installs alongside it and doesn't interfere.

### The WPILib Extension

The WPILib extension is a plugin inside VS Code that handles everything robot-specific: creating new projects from templates, building Java code into a program, running it and connecting it to the robot over Wi-Fi, and opening tools like SmartDashboard and Shuffleboard. You'll use it constantly.

### XRP Firmware

The XRP has a microcontroller (a Raspberry Pi RP2040) that needs firmware: software that runs directly on the hardware and handles low-level communication with WPILib. The firmware translates between your Java program and the actual motors and sensors on the board.

You only need to flash firmware once (or when WPILib releases an update). After that, the XRP just works.

> **Why firmware?**
>
> The XRP uses a two-layer architecture. Your Java code runs on your laptop and communicates over Wi-Fi with the XRP. The XRP firmware receives those commands and translates them into actual hardware signals: motor PWM, I2C sensor reads, LED control. This separation is what lets WPILib use the same Java APIs for both the XRP and a full competition roboRIO.

---

## 2.2 What You Need

Before you start, confirm you have the following:

| Item | Notes |
|------|-------|
| A laptop or desktop computer | 64-bit Windows 10/11, macOS 13.3+, or Ubuntu 22.04+ (what WPILib 2026.2.1 supports) |
| An XRP robot | No tools or soldering required; if yours is new, you will need to assemble it from the box before starting |
| A USB cable | For firmware flashing and Web UI configuration. Production (V1) XRPs use USB-C; older Beta XRPs use micro-USB. Either way, you need a data cable, not charge-only |
| Four AA batteries | Rechargeable batteries work best; alkaline AAs are fine to start |
| An Xbox controller | Any Xbox One or Xbox Series controller (wired or with USB adapter) |
| A Wi-Fi connection | For downloading installers; the XRP creates its own network later |

> **Disk space**
>
> The WPILib installer is large: roughly 2.0 GB to download and around 3 to 4 GB once installed. Make sure you have at least 5 GB free before you start.

> **If your XRP is still in the box**
>
> XRPs come to students two ways. If a mentor or teammate handed you one that's already built, you can skip this paragraph. If you opened a fresh XRP kit yourself, take 30 to 45 minutes now to put it together following the printed instructions in the kit (or the [WPILib XRP assembly guide](https://docs.wpilib.org/en/stable/docs/xrp-robot/hardware-and-imaging.html)). Assembly is snap-fits and a handful of small screws; the kit includes the screwdriver you need, and no soldering is required.

---

## 2.3 Installing WPILib and VS Code

### Step 1: Download the Installer

This book uses **WPILib 2026.2.1**. Go to the **[WPILib 2026.2.1 release page](https://github.com/wpilibsuite/allwpilib/releases/tag/v2026.2.1)**, scroll down to **Assets**, and download the installer for your computer:

- **Windows**: `WPILib_Windows-2026.2.1.iso`
- **macOS** (Apple silicon, M1 and newer): `WPILib_macOS-Arm64-2026.2.1.dmg`
- **macOS** (Intel): `WPILib_macOS-Intel-2026.2.1.dmg`
- **Linux**: `WPILib_Linux-2026.2.1.tar.gz`

> **Which year?**
>
> Always **2026.2.1**, for every chapter of this book. The releases page may show newer versions, including ones for a later year. Do not install those for this book: the code in every chapter is written and tested for WPILib 2026.2.1, and a different year can stop it from building. The table below lists every version the book uses.

> **Versions this book uses**
>
> | What | Version | Where you install it |
> |---|---|---|
> | FRC season | **2026** | |
> | WPILib (and GradleRIO in `build.gradle`) | **2026.2.1** | This chapter |
> | Java | **17**, bundled with WPILib | This chapter (automatic) |
> | AdvantageKit | **26.0.2** | Chapter 17 (XRP) and Chapter 26 (Mini Swerve) |
> | Phoenix 6 (CTRE) | **26.x**, the `frc2026` release | Chapter 27 |
> | PathPlannerLib | **2026** release | Chapter 31 |
>
> Every robot in this book, the XRP and the Mini Swerve, uses this 2026 software (Chapter 1). If VS Code, the Driver Station, or a vendor library ever offers to upgrade a project to a newer year, say no.

### Step 2: Run the Installer

**On Windows:**
1. Mount the ISO file (right-click "Mount") or open it in File Explorer
2. Run `WPILibInstaller.exe` inside the mounted drive
3. When the installer asks what to install, choose **"Everything"**
4. Accept the default installation path (`C:\Users\Public\wpilib\2026`)

**On macOS:**
1. Open the `.dmg` file
2. Drag the WPILib folder to Applications
3. Open it and run `WPILibInstaller`
4. You may need to allow the app in System Preferences under Security and Privacy

**On Linux:**
1. Extract the `.tar.gz` file
2. Run `./WPILibInstaller` from the extracted folder
3. Choose "Everything" when prompted

The installer will download additional components and set up VS Code. This usually takes 5 to 15 minutes depending on your internet speed.

### Step 3: Launch VS Code

After installation, look for **"WPILib VS Code 2026"** in your Applications or Start Menu and open it. You can confirm the WPILib extension is installed correctly by checking two things: a WPILib icon (a small red "W") appears in the top-right corner of the editor next to the tabs, and the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) shows WPILib-specific commands like **WPILib: Build Robot Code** and **WPILib: Deploy Robot Code** when you type "WPILib".

> **First launch takes a moment**
>
> The first time you open WPILib VS Code, it downloads a few additional components in the background. You might see a progress indicator in the bottom-right corner. Wait for it to finish before doing anything else.

---

## 2.4 Flashing the XRP Firmware

Now we need to update the software running on the XRP itself. This process takes about 3 minutes.

### Step 1: Download the XRP Firmware

Go to **[github.com/wpilibsuite/xrp-wpilib-firmware/releases](https://github.com/wpilibsuite/xrp-wpilib-firmware/releases)** and find the latest release at the top of the page. Click **Assets** to expand the file list and download the `.uf2` file.

The filename includes the version and a short commit hash, for example `xrp-wpilib-firmware-2.1.0-aa439f0.uf2`. Don't worry about the exact name; just save it somewhere you can find again (your Downloads folder is fine).

> **Beta XRP vs. production (V1) XRP**
>
> If you have a beta XRP (the older boards distributed before public release), look for the asset whose filename contains `beta`. Production V1 XRPs use the asset without `beta` in the name. If you're not sure which you have, the production V1 has a USB-C connector; the beta board has micro-USB.

### Step 2: Connect the XRP via USB

Plug the XRP into your laptop with the USB cable. USB alone provides enough power to flash firmware, so you don't need batteries installed for this step.

### Step 3: Put the XRP into Bootloader Mode

The XRP needs to be in a special mode to accept new firmware. The procedure uses two buttons on the board:

1. Find the **BOOTSEL** button (the small white button on the green Pico W board, near the USB connector)
2. Find the **reset** button (on the middle-left side of the main XRP board)
3. While holding **BOOTSEL** down, quickly press and release the **reset** button
4. Release **BOOTSEL**

If it worked, your computer will show a new drive called **"RPI-RP2"** (it shows up just like a USB thumb drive).

> **If you don't see RPI-RP2**
>
> Make sure you're using a data cable, not a charge-only cable. Some USB cables only carry power. Try a different cable if the drive doesn't appear. Also double-check that you pressed the reset button while holding BOOTSEL, not the other way around.

### Step 4: Copy the Firmware File

Drag and drop the firmware `.uf2` file onto the **RPI-RP2** drive. That's it. The file will copy over, the drive will disappear automatically, and the XRP will reboot with new firmware.

The XRP status LED should blink a few times and then settle into a steady pattern. You've flashed the firmware.

> **What's a .uf2 file?**
>
> UF2 (USB Flashing Format) is a file format designed specifically for flashing microcontrollers over USB. When you copy a `.uf2` file onto the RPI-RP2 drive, the bootloader on the Pico W automatically recognizes it, writes it to flash memory, and reboots. You don't need any special flashing software.

---

## 2.5 Connecting to the XRP

With firmware flashed, it's time to power up the XRP and connect your laptop to it. The XRP broadcasts its own Wi-Fi network straight out of the box. There's no router and no microSD card involved: your laptop connects directly to the robot.

### Step 1: Power the XRP

The XRP runs on four AA batteries that sit in a holder on the underside of the chassis. Insert fully-charged batteries and flip the power switch. The status LED should light up.

You can also power the XRP from its USB port, which is handy for desktop testing when you don't want to drain batteries. USB power may limit motor speed on some laptops, so use batteries for any real driving tests.

### Step 2: Connect to the XRP's Wi-Fi

Out of the box, every XRP creates a Wi-Fi network with these defaults:

| Setting | Default |
|---------|---------|
| SSID | `XRP-AAAA-BBBB` (where `AAAA-BBBB` are hex digits unique to your board) |
| Password | `xrp-wpilib` |
| IP address | `192.168.42.1` |

On your laptop:

1. Open your Wi-Fi settings
2. Look for a network whose name starts with `XRP-`
3. Connect using the password `xrp-wpilib`

Once connected, your laptop loses internet access. You're now on the XRP's local network, not your home or school router. This is expected.

> **No internet while connected**
>
> The XRP's Wi-Fi network doesn't have internet access. This is fine for robot programming, but it means you can't browse the web or access GitHub while connected. If you need to look something up or push a commit, disconnect from the XRP first, do your internet tasks, then reconnect.
>
> This is a minor friction point in day-to-day development. Many students keep a phone nearby for quick lookups.

### Step 3: Verify the Connection

Open a web browser and navigate to **[http://192.168.42.1:5000](http://192.168.42.1:5000)**. The `:5000` at the end is the port number; the XRP's configuration Web UI runs there.

If the XRP is running and your laptop is connected to its network, you should see the XRP's built-in Web UI showing the current network configuration, firmware version, and other status information.

If you see that page, your connection is working.

---

## 2.6 Customizing the XRP's Network (Optional)

You can skip this section on a first read. The defaults above will get you through every chapter in this book. Come back if you're in a classroom with several XRPs and want to give yours a memorable name.

### Why Customize

When you're sitting next to a friend whose XRP is also broadcasting `XRP-AAAA-BBBB`-something, it's surprisingly easy to join the wrong robot's Wi-Fi and drive your friend's XRP. Giving your XRP a distinctive SSID, like `XRP-Alice` or `XRP-Team3415`, removes that confusion entirely.

### How to Customize

The same Web UI you visited in Section 2.5 also lets you change settings. With your laptop connected to the XRP's Wi-Fi:

1. Open **[http://192.168.42.1:5000](http://192.168.42.1:5000)** in your browser
2. Find the **Access Point** section
3. Change the **SSID** and **passphrase** to whatever you want (write the password down somewhere safe; you'll need it again the next time you connect)
4. Click **Save** (the exact button name may vary slightly between firmware releases)
5. The XRP will restart its Wi-Fi with the new settings

Reconnect your laptop using the new SSID and password. Visit `http://192.168.42.1:5000` again to confirm the change stuck.

> **The Web UI also supports station mode**
>
> The Web UI has a `mode` setting that switches the XRP between **access point mode** (the default, where the XRP creates its own network) and **station mode** (where the XRP joins an existing Wi-Fi network). Leave it on access point mode for this book. Station mode is useful in some classroom and competition setups, but it adds enough networking complexity that we won't cover it here.

---

## 2.7 Creating Your First Robot Project

Now let's create a robot project in VS Code, build it, and run it on the XRP. The project won't do anything interesting yet: it's an empty template. But running it successfully proves that your entire toolchain works end to end.

### Step 1: Create a New Project

In VS Code:

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) to open the command palette
2. Type `WPILib: Create a new project` and press Enter
3. The WPILib Project Creator window opens

Fill it in as follows:

| Field | What to Choose |
|-------|---------------|
| Project Type | Template |
| Language | Java |
| Base | XRP - TimedRobot |
| Base Folder | Choose a location like `Documents/FRC` |
| Project Name | `XRPExplorer` |
| Create a new folder? |Check this box |
| Team Number | Your FRC team number (use `0` if you don't have one yet) |
| Desktop Support | Check this box |

Click **"Generate Project"**. VS Code will create a new folder with all the project files and open it automatically.

### Step 2: Look Around the Project

Before building anything, take a moment to look at the files VS Code created. In the Explorer panel on the left, expand the `src/main/java/frc/robot` folder. You'll see:

- **`Main.java`**: the entry point; you'll never edit this
- **`Robot.java`**: the main robot class; this is where most of your code will live for now

Open `Robot.java`. The file the generator creates is longer than what we show here (it includes a small autonomous mode chooser as an example), but the skeleton looks like this:

```java
package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;

public class Robot extends TimedRobot {

    public Robot() {
        // Called once when the robot program starts
    }

    @Override
    public void robotPeriodic() {
        // Called every 20ms regardless of mode
    }

    @Override
    public void autonomousInit() {
        // Called once when autonomous starts
    }

    @Override
    public void autonomousPeriodic() {
        // Called every 20ms during autonomous
    }

    @Override
    public void teleopInit() {
        // Called once when teleop starts
    }

    @Override
    public void teleopPeriodic() {
        // Called every 20ms during teleop
    }

    @Override
    public void disabledInit() {
        // Called once when the robot is disabled
    }

    @Override
    public void disabledPeriodic() {
        // Called every 20ms while disabled
    }

    @Override
    public void testInit() {
        // Called once when test mode starts
    }

    @Override
    public void testPeriodic() {
        // Called every 20ms during test mode
    }
}
```

This is the TimedRobot template, the foundation every robot program in this book starts from. You'll spend all of Chapter 5 understanding exactly what this code means. For now, just notice the structure: there are methods for each robot mode, and each method is called either once (at the start of a mode) or repeatedly (every loop cycle). The `Robot()` constructor at the top runs once when the program starts; it's where you set up anything that needs to exist before any mode begins.

### Step 3: Build the Project

Building compiles your Java code into a binary that can run on the XRP. In VS Code:

1. Press `Ctrl+Shift+P` and type `WPILib: Build Robot Code`
2. Press Enter

Watch the terminal at the bottom of VS Code. You'll see a lot of output: Gradle (the build tool) is downloading dependencies and compiling your code. The first build takes longer because Gradle downloads WPILib itself. Subsequent builds are much faster.

A successful build ends with:

```
BUILD SUCCESSFUL in Xs
```

> **Build errors vs. connection errors**
>
> A build error means your Java code has a problem: the compiler couldn't translate it into runnable code. A connection error means the code built fine but your program can't reach the robot, usually a Wi-Fi issue. These are completely separate problems with completely separate solutions.
>
> For now, focus on getting a clean `BUILD SUCCESSFUL` before worrying about the connection.

### Step 4: Run It on the XRP

Here is something that surprises almost everyone: your program does not go onto the XRP. It runs on your **laptop**, and talks to the XRP over Wi-Fi fifty times a second. The firmware you flashed in Section 2.4 does whatever your program says: spin this motor, read that sensor. WPILib runs XRP programs with its **simulation** tools, the same machinery that can run a robot program with no robot at all, plus an extension that connects it to a real XRP.

Make sure the XRP is powered on and your laptop is connected to the XRP's Wi-Fi. Then:

1. Press `Ctrl+Shift+P` and type `WPILib: Simulate Robot Code` (or press **F5**)
2. Press Enter
3. If VS Code asks which simulation extensions to use, leave **Sim GUI** and **XRP Client** checked, and click **OK**

Gradle builds your code, and then the **Simulation GUI** window opens. That window is your program, running. Tilt or turn the XRP: if the gyro and accelerometer values in the window change, your laptop is talking to the robot.

The Simulation GUI is also how you **enable** the XRP. Its **Robot State** panel has buttons for **Disabled**, **Autonomous**, **Teleoperated**, and **Test**. Click a mode to enable the robot in it, and click **Disabled** to stop it. The robot starts out disabled, so nothing moves until you choose a mode.

> **Your laptop is the robot's brain, for now**
>
> Because the program runs on your laptop, stopping it stops the robot. Close the Simulation GUI window, or click the red **Stop** square in VS Code's debug toolbar. To try new code, stop the program, then run `WPILib: Simulate Robot Code` again. If the robot doesn't respond, check the two links between them: the XRP is on, and your laptop is on the XRP's Wi-Fi (not your school's). If you changed your XRP's IP address, update the `HALSIMXRP_HOST` line in `build.gradle` to match.
>
> In Chapter 26 your program moves onto a real robot computer, the roboRIO. That's when you'll **deploy** it for the first time: copy it onto the robot so it runs there.

---

## 2.8 Verifying Everything Works

Running an empty program isn't very exciting. Let's add one line of code to confirm that the program is actually running and that your laptop can communicate with it.

### Add a Dashboard Print

Open `Robot.java` and find the `robotPeriodic()` method. Add this line inside it:

```java
@Override
public void robotPeriodic() {
    SmartDashboard.putString("Status", "Robot is running!");
}
```

You'll also need to add an import at the top of the file (VS Code will often suggest this automatically: look for the lightbulb icon):

```java
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
```

Stop the running program, then build and run it again (`WPILib: Simulate Robot Code`).

### Open SmartDashboard

SmartDashboard is a dashboard tool that displays data sent from your robot program. To open it:

1. Press `Ctrl+Shift+P` and type `WPILib: Start Tool`
2. Choose `SmartDashboard` from the list

SmartDashboard will open. If your XRP is running and your laptop is on the XRP's Wi-Fi, you should see a widget appear labeled **"Status"** with the value **"Robot is running!"**.

If you see that widget, congratulations: your toolchain works end to end. Your laptop can talk to your XRP.

> **SmartDashboard vs. Shuffleboard**
>
> WPILib ships with two dashboard tools: SmartDashboard and Shuffleboard. SmartDashboard is simpler: widgets appear automatically, and you can't customize the layout much. Shuffleboard is more powerful: you can arrange widgets, create tabs, and add graphs.
>
> You'll start with SmartDashboard because it requires less setup. Chapter 23 covers Shuffleboard in depth.

### Connect the Xbox Controller

Plug in your Xbox controller (via USB cable or wireless adapter). With your program running, look in the Simulation GUI for the **System Joysticks** window. Your Xbox controller should appear in that list. If it does, WPILib can see it. Drag it into slot **0** of the **Joysticks** window next to it, and turn on **Map gamepad** in the Joysticks menu so the sticks behave the way they would on a competition robot.

You won't use the controller yet: that's Chapter 8. But confirming it shows up now avoids surprises later.

---

## 2.9 The Workflow You'll Use Every Time

Every chapter from here on follows the same cycle. It's worth understanding it clearly now so it becomes automatic:

1. **Write code** in VS Code
2. **Build** (`WPILib: Build Robot Code`): catches syntax errors immediately
3. **Connect** to the XRP's Wi-Fi if you're not already
4. **Run** (`WPILib: Simulate Robot Code`, or **F5**): starts the program on your laptop, connected to the XRP
5. **Test**: enable the robot in the Simulation GUI's Robot State panel, observe behavior, check SmartDashboard
6. **Git commit**: save your progress with a meaningful message

> **Build before you run**
>
> A program with build errors won't start. Some students run it directly and get confused by errors that are actually compiler errors, not connection errors. Get in the habit of running "Build" first, confirming `BUILD SUCCESSFUL`, then running "Simulate Robot Code".

The whole cycle takes about 20 to 30 seconds once you're practiced. At competitions, where you might be making quick fixes between matches, that speed matters.

---

## 2.10 What Just Happened (and Why It's the Same as a Real Robot)

Let's connect what you just did to Chapter 1's big picture.

When you ran "Simulate Robot Code", here's what actually happened:

1. **Gradle compiled** your Java code into a `.jar` file (a packaged Java program)
2. **Your laptop started the program**, along with the Simulation GUI and the XRP extension
3. **The XRP extension connected to the XRP** over Wi-Fi (using the IP address 192.168.42.1)
4. From then on, your program and the XRP's firmware **trade messages** many times a second: sensor readings come in, motor commands go out

Every 20 milliseconds, your program runs through its loop exactly once: calling `robotPeriodic()`, reading any inputs, and writing any outputs. The loop from Chapter 1.1 is running right now, on your laptop, even if your program doesn't do anything interesting yet.

On a competition robot, the code is the same, but it runs in a different place. The `.jar` is **deployed**, copied onto the roboRIO, the computer inside the robot, and runs there; the Driver Station laptop only sends commands to it. The roboRIO runs the same 50 Hz loop. The robot is different. Your code, and the way you write it, are the same. Chapter 26 makes that move.

> **You've already done the hard part**
>
> Setting up a development environment is genuinely one of the more tedious parts of any programming project. The fact that WPILib has installer quirks, firmware steps, and Wi-Fi peculiarities is well-known: experienced FRC mentors budget time for it during kickoff every year.
>
> If something didn't work on the first try and you had to troubleshoot it, that was a real debugging experience. It counts.

---

## Chapter Summary

> **What you learned in Chapter 2**
>
> - The WPILib installer sets up VS Code, the WPILib extension, and a bundled JDK: everything you need to write and run robot code
> - XRP firmware is flashed once by entering bootloader mode (hold BOOTSEL, press the reset button) and dragging a `.uf2` file onto the RPI-RP2 drive
> - The XRP broadcasts its own Wi-Fi network with default SSID `XRP-AAAA-BBBB` and password `xrp-wpilib`; you can customize either from the Web UI at `http://192.168.42.1:5000`
> - A WPILib project is created from a template (TimedRobot with the XRP option checked) and run with `WPILib: Simulate Robot Code`. XRP programs run on your **laptop** and talk to the XRP over Wi-Fi; nothing is copied onto the robot
> - The workflow (write, build, connect, run, test, commit) is the cycle you'll use for every chapter in this book, and the Simulation GUI's Robot State panel enables and disables the XRP
> - A competition robot runs the same code, but it is **deployed** onto the robot's roboRIO and runs there (Chapter 26)

---

## Exercises

### Practice

Run the empty template on your XRP and confirm that the gyro values in the Simulation GUI change when you turn the robot. Then add the `SmartDashboard.putString("Status", "Robot is running!")` line from Section 2.8, stop the program, run it again, and verify the widget appears in SmartDashboard.

Next, try changing the string to something else and running it again. Observe how long the full write, build, run cycle takes. This is your baseline: you'll get faster at it, but it's useful to know the floor.

### Build (XRP Explorer)

This is the first checkpoint for the running project you'll grow all the way through Chapter 25. Get its foundation solid and leave it that way:

1. Confirm your project is named `XRPExplorer`, created from the **XRP - TimedRobot** template with **Desktop Support** enabled (Section 2.7).
2. Run `WPILib: Build Robot Code` and confirm `BUILD SUCCESSFUL`.
3. Run `WPILib: Simulate Robot Code` with the XRP on. Confirm the Simulation GUI opens, the gyro values follow the robot when you turn it, and the Robot State panel can switch the XRP between **Disabled** and **Teleoperated**.

Leave the project building and running cleanly. Every chapter from here adds to this same project, so a clean, working starting point is worth getting right once.

### Reflect

In your own words, explain the difference between:

1. A **build error** and a **connection error**
2. **Firmware** and your **robot program**
3. The **XRP's Wi-Fi network** and your home or school Wi-Fi

Write 2 to 3 sentences on each. If you're not sure about any of them, re-read Sections 2.4 and 2.9.

### Git

Initialize your XRP Explorer repository now, even though the project is nearly empty. Starting version control on day one is a habit, not an afterthought.

In VS Code's integrated terminal (`` Ctrl+` ``):

```bash
cd path/to/XRPExplorer
git init
git add .
git commit -m "Ch2: project created, firmware flashed, first run working"
```

You'll learn Git in detail in Chapter 3, including how to push this project to GitHub. For now, you just need to know that this saves a snapshot of your project that you can return to.

---

> **Additional Resources**
>
> - **WPILib installation guide**: [docs.wpilib.org/en/stable/docs/zero-to-robot/step-2/wpilib-setup.html](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-2/wpilib-setup.html) the official installation walkthrough with screenshots
> - **XRP hardware documentation**: [docs.wpilib.org/en/stable/docs/xrp-robot](https://docs.wpilib.org/en/stable/docs/xrp-robot/index.html) hardware specs, firmware update instructions, and troubleshooting
> - **XRP firmware releases**: [github.com/wpilibsuite/xrp-wpilib-firmware/releases](https://github.com/wpilibsuite/xrp-wpilib-firmware/releases) always use the firmware version that matches your WPILib installation year
> - **SmartDashboard documentation**: [docs.wpilib.org/en/stable/docs/software/dashboards/smartdashboard](https://docs.wpilib.org/en/stable/docs/software/dashboards/smartdashboard/index.html) how to send and display values from your robot program
> - **WPILib troubleshooting**: [docs.wpilib.org/en/stable/docs/software/vscode-overview/troubleshooting-wpilib.html](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/troubleshooting-wpilib.html) if something broke during installation, start here

---

*Next up, Chapter 3, Git and GitHub: Your Coding Notebook. You'll learn why version control matters, how to use the basic Git commands you'll need throughout this book, and how to connect your project to GitHub.*