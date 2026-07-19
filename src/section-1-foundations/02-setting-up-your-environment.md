# Chapter 2: Setting Up Your Environment

Before you write a single line of robot code, your computer and your XRP need to be able to talk to each other. That requires a few pieces of software, a firmware flash, and a Wi-Fi connection.

This chapter will walk you through all of it, step by step. Some of it is mechanical (install this, click that). Some of it requires a little patience (firmware flashing can be finicky). None of it requires any programming knowledge.

By the end of this chapter, you will have deployed your first robot program, an empty one, but a real one, to your XRP and confirmed that the connection works. That moment, when you see the status LED on the XRP go green for the first time, is more satisfying than it sounds.

---

## 2.1 What You're Installing and Why

Before you open any installer, let's understand what you're actually setting up and why each piece matters.

### WPILib

WPILib is the programming library that makes FRC robot programming possible. It contains the Java classes for motors, sensors, controllers, and everything else you'll use throughout this book. Every FRC team in the world uses WPILib, and it's updated every January with the new FRC season.

WPILib comes bundled with its own version of the Java Development Kit (JDK). This is intentional: FRC has specific version requirements, and the bundled JDK guarantees everyone on the team is using identical tooling. You don't need to install Java separately.

### VS Code (the WPILib edition)

VS Code is the code editor you'll use to write, build, and deploy your robot programs. The WPILib installer sets up a special version of VS Code pre-configured with the WPILib extension, which adds robot-specific build tools, a project generator, and a direct "Deploy to Robot" button.

If you already have VS Code installed, that's fine. The WPILib version installs alongside it and doesn't interfere.

### The WPILib Extension

The WPILib extension is a plugin inside VS Code that handles everything robot-specific: creating new projects from templates, building Java code into a deployable binary, connecting to the robot over Wi-Fi, and opening tools like SmartDashboard and Shuffleboard. You'll use it constantly.

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
| A laptop or desktop computer | Windows 10/11, macOS 12+, or Ubuntu 22.04+ |
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

Go to **[github.com/wpilibsuite/allwpilib/releases](https://github.com/wpilibsuite/allwpilib/releases)** and find the latest release for the current FRC season. Download the installer for your operating system:

- **Windows**: `WPILib_Windows-YEAR.X.X.iso`
- **macOS**: `WPILib_macOS-YEAR.X.X.dmg`
- **Linux**: `WPILib_Linux-YEAR.X.X.tar.gz`

> **Which year?**
>
> Download the version that matches the current FRC season. If you're not sure, check [docs.wpilib.org](https://docs.wpilib.org): the homepage always shows the current recommended version. Using the wrong year can cause subtle compatibility problems.

### Step 2: Run the Installer

**On Windows:**
1. Mount the ISO file (right-click "Mount") or open it in File Explorer
2. Run `WPILibInstaller.exe` inside the mounted drive
3. When the installer asks what to install, choose **"Everything"**
4. Accept the default installation path (`C:\Users\Public\wpilib\YEAR`)

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

After installation, look for **"WPILib VS Code YEAR"** in your Applications or Start Menu and open it, e.g. "WPILib VS Code 2026". You can confirm the WPILib extension is installed correctly by checking two things: a WPILib icon (a small red "W") appears in the top-right corner of the editor next to the tabs, and the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) shows WPILib-specific commands like **WPILib: Build Robot Code** and **WPILib: Deploy Robot Code** when you type "WPILib".

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

When you're sitting next to a friend whose XRP is also broadcasting `XRP-AAAA-BBBB`-something, it's surprisingly easy to deploy code to the wrong robot. Giving your XRP a distinctive SSID, like `XRP-Alice` or `XRP-Team3415`, removes that confusion entirely.

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

Now let's create a robot project in VS Code, build it, and deploy it to the XRP. The project won't do anything interesting yet: it's an empty template. But successfully deploying it proves that your entire toolchain works end to end.

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

> **Build errors vs. deploy errors**
>
> A build error means your Java code has a problem: the compiler couldn't translate it into runnable code. A deploy error means the code built fine but couldn't be sent to the robot, usually a network issue. These are completely separate problems with completely separate solutions.
>
> For now, focus on getting a clean `BUILD SUCCESSFUL` before worrying about deployment.

### Step 4: Deploy to the XRP

Make sure your laptop is connected to the XRP's Wi-Fi. Then:

1. Press `Ctrl+Shift+P` and type `WPILib: Deploy Robot Code`
2. Press Enter

The terminal will show the build output followed by deployment progress. A successful deployment ends with something like:

```
Deploying program to XRP
SUCCESS
```

The XRP will reboot automatically after deployment. Wait for the status LED to settle (a few seconds) before doing anything else.

> **The XRP reboots on every deploy**
>
> Every time you deploy new code, the XRP restarts to run the new program. This is normal. Don't power-cycle the XRP manually during a deployment: wait for the reboot to complete on its own.

---

## 2.8 Verifying Everything Works

Deploying an empty program isn't very exciting. Let's add one line of code to confirm that the program is actually running and that your laptop can communicate with it.

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

Build and deploy again.

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

Plug in your Xbox controller (via USB cable or wireless adapter). Open the **Driver Station** tool:

1. Press `Ctrl+Shift+P` and type `WPILib: Start Tool`
2. Choose `Driver Station`

In the Driver Station, go to the **USB Devices** tab. Your Xbox controller should appear in the device list. If it does, WPILib can read its inputs.

You won't use the controller yet: that's Chapter 8. But confirming it shows up now avoids surprises later.

---

## 2.9 The Deploy Workflow You'll Use Every Time

Every chapter from here on follows the same cycle. It's worth understanding it clearly now so it becomes automatic:

1. **Write code** in VS Code
2. **Build** (`WPILib: Build Robot Code`): catches syntax errors immediately
3. **Connect** to the XRP's Wi-Fi if you're not already
4. **Deploy** (`WPILib: Deploy Robot Code`): sends the program to the XRP
5. **Test**: enable the robot in Driver Station, observe behavior, check SmartDashboard
6. **Git commit**: save your progress with a meaningful message

> **Build before you deploy**
>
> Deployment will fail if the build has errors. Some students try to deploy directly and get confused by errors that are actually compiler errors, not network errors. Get in the habit of running "Build" first, confirming `BUILD SUCCESSFUL`, then running "Deploy".

The whole cycle takes about 20 to 30 seconds once you're practiced. At competitions, where you might be making quick fixes between matches, that speed matters.

---

## 2.10 What Just Happened (and Why It's the Same as a Real Robot)

Let's connect what you just did to Chapter 1's big picture.

When you clicked "Deploy Robot Code", here's what actually happened:

1. **Gradle compiled** your Java code into a `.jar` file (a packaged Java program)
2. **WPILib's deployment tool** connected to the XRP over Wi-Fi (using the IP address 192.168.42.1)
3. The `.jar` file was **transferred to the XRP** and stored in its memory
4. **The XRP rebooted** and started running your program

From that point on, every 20 milliseconds, the XRP runs through your robot program exactly once: calling `robotPeriodic()`, reading any inputs, and writing any outputs. The loop from Chapter 1.1 is running right now, even if your program doesn't do anything interesting yet.

On a competition robot, the process is almost identical. The `.jar` is deployed to a roboRIO instead of an XRP, the connection goes through the robot radio instead of a direct access point, and the roboRIO runs the same 50 Hz loop. The hardware is different. The toolchain is the same.

> **You've already done the hard part**
>
> Setting up a development environment is genuinely one of the more tedious parts of any programming project. The fact that WPILib has installer quirks, firmware steps, and Wi-Fi peculiarities is well-known: experienced FRC mentors budget time for it during kickoff every year.
>
> If something didn't work on the first try and you had to troubleshoot it, that was a real debugging experience. It counts.

---

## Chapter Summary

> **What you learned in Chapter 2**
>
> - The WPILib installer sets up VS Code, the WPILib extension, and a bundled JDK: everything you need to write and deploy robot code
> - XRP firmware is flashed once by entering bootloader mode (hold BOOTSEL, press the reset button) and dragging a `.uf2` file onto the RPI-RP2 drive
> - The XRP broadcasts its own Wi-Fi network with default SSID `XRP-AAAA-BBBB` and password `xrp-wpilib`; you can customize either from the Web UI at `http://192.168.42.1:5000`
> - A WPILib project is created from a template (TimedRobot with the XRP option checked) and deployed with `WPILib: Deploy Robot Code`
> - The deploy workflow (write, build, connect, deploy, test, commit) is the cycle you'll use for every chapter in this book
> - The XRP's deploy process is nearly identical to a competition roboRIO; the architecture is the same, just smaller

---

## Exercises

### Practice

Deploy the empty template to your XRP and confirm the status LED behavior. Then add the `SmartDashboard.putString("Status", "Robot is running!")` line from Section 2.8, rebuild, redeploy, and verify the widget appears in SmartDashboard.

Next, try changing the string to something else and redeploying. Observe how long the full write, build, deploy cycle takes. This is your baseline: you'll get faster at it, but it's useful to know the floor.

### Reflect

In your own words, explain the difference between:

1. A **build error** and a **deploy error**
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
git commit -m "Ch2: project created, firmware flashed, first deploy working"
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