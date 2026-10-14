# Chapter 11: Collaboration and Merge Conflicts

In Chapter 9 you gave the Explorer its senses. In Chapter 10 you learned to hunt down bugs, including bugs buried somewhere in your own Git history. Through all of it, one thing has stayed the same: every line of your robot's code was written by you, on your laptop, one commit after another.

Real robots are not built that way. A competition robot's code is written by a team: four, six, sometimes ten programmers, all changing the same project during the same six weeks of build season. One person is tuning the drivetrain while another adds an autonomous routine and a third rewires the controller buttons for the drive team. Sooner or later, two of them change the same line of the same file. When they try to combine their work, Git stops and says, in effect, "I cannot decide this one. A human has to."

That moment is called a **merge conflict**, and this chapter is about walking straight into one on purpose. You will learn the workflow real teams use to share one codebase without stepping on each other: **feature branches**, **pull requests**, and **code review**. Then you and a partner will each change the same lines of the Explorer's code, try to merge, get a conflict, and resolve it together. By the end, your Explorer will contain a feature your partner wrote, merged cleanly into your own.

On the Java side, you will learn to write code for other people to read. You will meet **Javadoc comments**, the special comments that turn into the documentation you have been reading on the WPILib website, and **method overloading**, a way to give a method new abilities without breaking any teammate's code that already calls it.

This chapter needs no robot. Everything happens in VS Code and on GitHub, so you can do it at home with a partner, even if your partner is across town. If you do have your XRP nearby, you will get to test the merged code at the end. One honest warning: the first conflict feels scary. The screen fills with strange arrows and equals signs, and it looks like Git broke your file. It did not. By the end of the chapter, a conflict will look like what it is: a short question from Git, with a clear answer.

---

## 11.1 Two Programmers, One Robot

Picture the Tuesday of week three of build season. Maya is making the robot's turning gentler, because the drivers keep overshooting when they aim. Jordan is adding a speed limit for driving backward, because the robot just backed into the field wall at full speed. Both changes go in `Robot.java`. Both are good ideas. Both need to be on the robot by Thursday.

How do they share the work? Here are some ways teams have actually tried, and how each goes wrong:

- **One laptop, take turns.** Only one person can program at a time. Everyone else waits. Six weeks is not long enough for that.
- **Email files or pass a USB stick.** Maya emails Jordan a copy of `Robot.java`. Jordan copies it over the version on the robot laptop and loses the reverse limit without noticing. Nobody knows which copy is the "real" one. At the competition, the code on the robot matches nobody's laptop.
- **Everyone edits `main` directly and pushes.** This works until someone pushes half-finished code at 9 PM and the robot will not drive at the 6 PM practice the next day, and nobody knows whose change broke it.

Every one of these problems comes from the same root cause: there is no safe, organized way to combine two people's work. Git and GitHub give you one. The pieces are:

1. Each person does their work on their own **branch**, so half-finished code never touches the code the robot runs.
2. When a feature is done, its author opens a **pull request**: a request, on GitHub, to merge their branch into `main`.
3. A teammate **reviews** the pull request, reads every changed line, and either approves it or asks for changes.
4. The pull request is **merged**, and Git combines the two lines of work automatically, line by line.
5. If two people changed the same lines, Git cannot combine them automatically. That is a **merge conflict**, and one of the authors resolves it by deciding what the combined code should be.

The rest of this chapter takes these steps one at a time. You already know the commands for most of them from Chapter 3. What is new is using them with other people.

> **Conflicts are a sign of a healthy team, not a broken one**
>
> A merge conflict does not mean anyone made a mistake. It means two people were working on related things at the same time, which is exactly what a productive team does. Experienced programmers resolve conflicts every week. The goal of this chapter is not to avoid conflicts forever; it is to make resolving one feel routine.

---

## 11.2 Feature Branches: Every Change Gets Its Own Line

In Chapter 3 you created a branch, made a change on it, and switched back to `main` to watch the change disappear. In Chapter 10 you made a `bug-hunt` branch so you could plant bugs without hurting your real code. Both times, the branch was a safe place to experiment. On a team, branches become the normal place to do **all** work.

The rule that makes this work is simple:

> **`main` always works.**

The code on `main` is the code that goes on the robot. It builds, it runs, and it does what the team expects. Nobody commits directly to `main`. Instead, every new feature or fix gets its own **feature branch**. You do your work there, commit as often as you like (including broken, half-finished commits), and only when the feature is finished and reviewed does it merge into `main`.

GitHub calls this workflow **GitHub flow**, and it is what most FRC teams use:

1. Start from an up-to-date `main`.
2. Create a branch for one feature.
3. Commit and push your work on that branch.
4. Open a pull request.
5. Get a review and make any requested changes.
6. Merge the pull request into `main`.
7. Delete the branch.

### Starting a feature branch the right way

Before you create a branch, make sure your `main` has your team's latest work. Otherwise you are building on top of old code, and you are setting yourself up for conflicts later:

```bash
git checkout main
git pull
git checkout -b gentle-turns
```

Read it aloud: "Go to `main`. Download whatever my teammates merged since I last looked. Then start a new branch called `gentle-turns` from here."

The new branch only exists on your laptop until you push it. The first time you push a new branch, tell Git where it should go, the same way you did for `main` in Chapter 3:

```bash
git push -u origin gentle-turns
```

The `-u` links your local branch to a branch of the same name on GitHub, so after this you can just type `git push`.

### Naming branches

A branch name should tell a teammate what the branch is for, at a glance, in a list of twenty other branches:

```
Bad:   test, my-branch, ava, stuff2, fix
Good:  gentle-turns, careful-reverse, fix-encoder-direction, auto-drive-to-line
```

Use lowercase words joined by hyphens. Some teams add a prefix for the kind of work (`feature/gentle-turns`, `fix/encoder-direction`). Either is fine, as long as the whole team does the same thing.

### One feature per branch, and keep it short

A branch should hold one feature, and it should not live long. The longer a branch lives, the further `main` moves away from it while you work, and the bigger the conflicts are when you finally merge. A branch that lasts an afternoon rarely has a painful conflict. A branch that lasts three weeks almost always does.

> **Small branches, like small commits**
>
> In Chapter 3 you learned "commit small, commit often," and in Chapter 10 you saw why: small commits make `git bisect` precise. The same idea applies one level up. A small branch is easy to review, quick to merge, and unlikely to conflict. If your feature is big, split it into a series of small branches that each leave `main` working: "add the getter," then "add the dashboard widget," then "use it in teleop."

---

## 11.3 Pull Requests: Asking to Merge

A **pull request** (often shortened to **PR**) is a page on GitHub that says: "I have finished the work on this branch. Please look at it, and if it is good, merge it into `main`." The name comes from asking the project to **pull** your changes in.

A pull request is not a Git command. It is a GitHub feature, built on top of Git, and it is where most team conversation about code happens. Every PR has:

- A **title** and a **description**, written by the author, saying what the change does and why.
- The list of **commits** on the branch.
- A **Files changed** tab, showing the diff of every line the branch changes, the same red and green view as `git diff`.
- A **conversation**, where teammates comment, ask questions, and approve.
- A **merge button**, which combines the branch into `main` when the team is ready.

### Opening a pull request

After you push a branch, open your repository on GitHub. You will usually see a yellow banner near the top saying your branch had recent pushes, with a **Compare & pull request** button. Click it. (If the banner is gone, choose your branch from the **Branch** menu and the button appears above the file list.)

On the next page, check the two dropdowns at the top:

- **base** is the branch you want to merge **into**. This is almost always `main`.
- **compare** is the branch with your changes, such as `gentle-turns`.

Then write a title and a description, and click **Create pull request**.

### Writing a description a reviewer will thank you for

A reviewer reads your description before reading your code. Tell them what to expect:

```markdown
## What this does
Scales down teleop turning to 70% so the drivers can aim more precisely.

## Why
Drivers kept overshooting when lining up at practice.

## How I tested it
Built successfully. Drove the course on my XRP: turns are noticeably
gentler, forward speed unchanged.
```

Three short sections: what, why, and how you know it works. That last one matters. "I built it" is honest. "I built it and drove it" is better. "It should work" is a warning sign.

If your code is not finished but you want early feedback, GitHub also lets you open a **draft pull request** (in the dropdown next to **Create pull request**). A draft says "look, but do not merge yet."

### Updating a pull request

A pull request is not frozen once you open it. If a reviewer asks for a change, make it on the same branch, commit, and push. The PR updates automatically with the new commit. You never need to close a PR and open a new one just to fix something.

### Merging, and cleaning up

When the PR is approved, someone clicks **Merge pull request**, then **Confirm merge**. GitHub offers a few merge styles in the dropdown on that button. Use the default, **Create a merge commit**, for now; it keeps every commit on the branch exactly as it was, which keeps `git bisect` and `git blame` precise. After merging, GitHub offers a **Delete branch** button. Click it: the branch's work now lives in `main`, and the PR page keeps a permanent record of everything that happened.

Then bring your laptop up to date, and delete your local copy of the branch:

```bash
git checkout main
git pull
git branch -d gentle-turns
```

> **Merging on GitHub does not change your laptop**
>
> When a PR is merged, the merge happens on GitHub's copy of the repository. Your laptop still has the old `main` until you run `git pull`. Forgetting this is the most common reason for "but my code does not have your change!" Make `git checkout main` and `git pull` the first thing you do every time you sit down to program with a team.

---

## 11.4 Code Review: A Second Pair of Eyes

In Chapter 10, the planted bug's commit was called `Tidy up encoder setup`. It swapped two numbers in `new Encoder(4, 5)`. One reflection question asked whether an honest message would have helped the bug get caught "in review." This is what that meant.

**Code review** means that before code merges into `main`, at least one other person reads every changed line. It is the single best bug-catching tool a team has, and it costs almost nothing: ten minutes of a teammate's attention, before the bug ever reaches the robot. Professional software companies require it for every change. Strong FRC teams do too.

Review has a second job that is just as important: it spreads knowledge. If only one person has ever read the autonomous code, the team is in trouble the day that person is sick at a competition. Every review is a teammate learning how another part of the robot works.

### How to review a pull request on GitHub

1. Open the PR and click the **Files changed** tab.
2. Read the diff carefully. To comment on a specific line, hover over it and click the blue comment icon next to the line number. Type your comment and click **Start a review** (or **Add review comment** if you already started one). Your comments stay private, as pending comments, until you submit.
3. When you have read everything, click **Review changes** above the changed code, write a short summary, and choose one:
   - **Comment**: feedback, without approving or blocking.
   - **Approve**: you have read it, and it is ready to merge.
   - **Request changes**: something must be fixed before this merges.
4. Click **Submit review**.

GitHub does not let you approve your own pull request. That is the whole point: review means a **second** person.

### What to look for

You do not have to be an expert to review well. Beginners catch real bugs constantly, because they read slowly and ask "why?" Work through this list:

| Question | Example of a problem it catches |
|---|---|
| Does the code do what the description says? | The PR says "slow mode at 50%" but the constant is `0.05` |
| Are the units right, and in the names? | `WALL_STOP_DISTANCE = 20` when the rangefinder reports meters |
| Are the signs and comparisons right? | `<` where it should be `>`, or a missing minus sign on a joystick axis |
| Any copy-paste mistakes? | `getLeftCount() + getLeftCount()` in an average |
| Any magic numbers? | `0.7` written in the middle of `teleopPeriodic()` instead of a named constant (Chapter 8) |
| Is every new object created once, in the constructor or a field? | `new Drivetrain()` inside a periodic method (Chapter 10) |
| Would a teammate understand it in a month? | A method named `doThing()`, or a confusing block with no comment |
| Does it build? | You can check: fetch the branch, check it out, and run `WPILib: Build Robot Code` |

### How to comment kindly

A review is a conversation between teammates, not a grade. A few habits keep it that way:

- **Comment on the code, not the person.** "This comparison looks reversed" instead of "you got this wrong."
- **Ask, do not accuse.** "Should this be `<` instead of `>`? I think the robot would stop when it is far from the wall." Half the time, the author had a reason you did not see.
- **Say what is good, too.** "Nice, this is much easier to read than before" costs nothing and means a lot.
- **Be specific.** "This is confusing" does not help. "I did not understand why we square this here; could you add a comment?" does.

> **Review your own PR first**
>
> Before you ask anyone to review your pull request, open its **Files changed** tab and read it yourself, as if a stranger wrote it. You will be amazed how often you find a leftover `DBG` widget from Chapter 10, a commented-out line, or a file you did not mean to change. Every mistake you catch yourself is one your reviewer does not have to.

---

## 11.5 Writing Code for Other People: Javadoc Comments

Once other people read your code, comments stop being notes to yourself and become instructions for your teammates. Java has a special kind of comment just for this job.

You have been typing these since Chapter 7 without a full explanation:

```java
/** Drive the robot. forward and rotation are each -1.0 to 1.0. */
public void arcadeDrive(double forward, double rotation) {
```

A comment that starts with `/**` (two stars) instead of `/*` or `//` is a **Javadoc comment**, also called a **doc comment**. It goes directly above a class, method, or field, and it describes how to **use** that thing, for someone who does not want to read its insides.

Java treats doc comments specially in two ways:

1. **VS Code shows them when you hover.** Hover your mouse over any call to `drivetrain.arcadeDrive(...)` in `Robot.java`. A popup shows the comment you wrote. Your teammate gets your instructions right where they are typing, without opening `Drivetrain.java`.
2. **The `javadoc` tool turns them into web pages.** Every page of the WPILib documentation you have opened since Chapter 7, like the `XboxController` and `XRPGyro` pages, was generated from doc comments written above WPILib's own methods. When you hover over `controller.getLeftY()`, you are reading the comment a WPILib developer wrote.

### Tags: `@param` and `@return`

For methods that take parameters or return a value, a doc comment can use **tags**, lines starting with `@`, to describe each one:

```java
/**
 * How far the center of the robot has moved, on average.
 *
 * @return the average of the left and right distances, in meters
 */
public double getAverageDistanceMeters() {
    return (getLeftDistanceMeters() + getRightDistanceMeters()) / 2.0;
}
```

```java
/**
 * Checks whether something is in front of the robot.
 *
 * @param meters how close counts as "close", in meters
 * @return true if the rangefinder sees something closer than {@code meters}
 */
public boolean isObstacleWithin(double meters) {
    return getDistanceAheadMeters() < meters;
}
```

Walk through it:

- The **first sentence** is a summary. Tools show it in lists, so make it complete on its own.
- A **blank line** (just ` *`) separates the summary from the tags.
- **`@param meters ...`** names the parameter, then describes it. One `@param` line per parameter, in order.
- **`@return ...`** describes what comes back. Methods that return `void` have no `@return`.
- **`{@code meters}`** formats a word as code in the generated web page, like backticks in this book.

### What belongs in a doc comment

A doc comment answers the questions a teammate has **before** they call your method:

- **Units.** Meters or centimeters? Degrees or radians? This one prevents more bugs than any other.
- **Ranges.** Is `forward` from `-1.0` to `1.0`, or from `0` to `100`?
- **Directions.** Is positive rotation left or right? (WPILib: counterclockwise, which is left.)
- **Surprises.** Does the method do anything a caller would not expect, like squaring its inputs?

It does **not** need to explain how the method works inside. That is what the code, and ordinary `//` comments inside the method, are for.

> **Comments go stale, so keep them close**
>
> A comment that says the wrong thing is worse than no comment, because people believe it. If you change what a method does, update its doc comment in the same commit. Reviewers should check this too: a PR that changes a method's units but not its comment has a bug waiting to happen.

---

## 11.6 Method Signatures and Overloading: Changing Code Without Breaking Teammates

When you write a public method in `Drivetrain`, you are making a promise. Every teammate who writes `drivetrain.arcadeDrive(forward, rotation)` is counting on that method continuing to exist, with that name, taking those two numbers. On a team, a public method is a **contract** between the person who wrote it and everyone who calls it.

### The method signature

Java identifies a method by its **signature**: the method's **name** plus the **types of its parameters**, in order. The signature of your drive method is:

```
arcadeDrive(double, double)
```

The parameter **names** (`forward`, `rotation`) are not part of the signature, and neither is the return type. What matters to Java is "a method called `arcadeDrive` that takes two `double`s."

If you change a signature (rename the method, add a parameter, change a parameter's type), every call that uses the old signature stops compiling. On your own, you just fix the calls. On a team, those calls might be on your teammates' branches, in code you have never seen. You will see exactly how that goes wrong in Section 11.9.

### Overloading: same name, different parameters

Suppose autonomous code needs to drive with a **linear** response. In Chapter 8 you learned that `arcadeDrive` squares its inputs, which feels good in a driver's hands but makes autonomous power hard to reason about: asking for `0.5` power actually gives `0.25`. WPILib's `DifferentialDrive` has a second version that takes a third parameter to turn squaring off:

```java
diffDrive.arcadeDrive(forward, rotation);          // squares the inputs
diffDrive.arcadeDrive(forward, rotation, false);   // linear: 0.5 means 0.5
```

Two methods, both named `arcadeDrive`, in the same class. This is legal because their signatures are different: `arcadeDrive(double, double)` and `arcadeDrive(double, double, boolean)`. Having more than one method with the same name but different parameter lists is called **method overloading**. When you call `arcadeDrive`, Java looks at the arguments you passed (two `double`s, or two `double`s and a `boolean`) and picks the matching version.

You have used overloads before without knowing it. `System.out.println` has one version for `String`, one for `int`, one for `double`, and so on, which is why `println("hi")` and `println(42)` both work.

Here is the payoff for teams: **overloading lets you add an ability without breaking anyone.** You can give `Drivetrain` a linear option by adding a second `arcadeDrive`, and every existing call to the two-number version keeps working, unchanged:

```java
/**
 * Drive the robot with arcade controls. The inputs are squared, which gives
 * finer control at low speed: half stick (0.5) becomes quarter power (0.25).
 *
 * @param forward forward speed, -1.0 (full reverse) to 1.0 (full forward)
 * @param rotation turn speed, -1.0 to 1.0; positive turns left (counterclockwise)
 */
public void arcadeDrive(double forward, double rotation) {
    arcadeDrive(forward, rotation, true);
}

/**
 * Drive the robot with arcade controls, choosing whether to square the inputs.
 *
 * @param forward forward speed, -1.0 (full reverse) to 1.0 (full forward)
 * @param rotation turn speed, -1.0 to 1.0; positive turns left (counterclockwise)
 * @param squareInputs true to square the inputs (gentle near center),
 *     false for a linear response (0.5 means 0.5)
 */
public void arcadeDrive(double forward, double rotation, boolean squareInputs) {
    diffDrive.arcadeDrive(forward, rotation, squareInputs);
}
```

Read the first method aloud: "To drive with two numbers, drive with those two numbers and squaring turned on." The two-number version does not repeat the work; it **calls** the three-number version with `true` for the third argument. Now there is exactly one place that talks to `diffDrive`. If that line ever needs to change, it changes once. This is the same "write it once" idea as the helper methods in Chapter 6.

Java does not let you write two methods with the same signature, even if they return different types, because then it could not tell which one you meant. Overloads must differ in the number or the types of their parameters.

> **How WPILib changes a method without breaking your code**
>
> In 2025, WPILib renamed `XboxController.getLeftBumper()` to `getLeftBumperButton()`. They did not just delete the old name, which would have broken thousands of teams' code overnight. They added the new method, kept the old one working, and marked it **deprecated**, which makes VS Code draw a line through it with a warning saying "use `getLeftBumperButton()` instead." Teams get a season to update before the old name is removed. That is a contract being changed politely, and it is the professional way to rename anything other people call.

---

## 11.7 What Is a Merge, Really?

You have typed `git merge` a few times now. Before you meet a conflict, it helps to know what Git is actually doing when it merges, because a conflict is just the one part of that job Git cannot finish.

### The three versions

When you merge two branches, Git does not just compare the two final versions of a file. It finds the commit where the two branches **split apart**, called the **merge base**, and looks at three versions of each file:

```
            Maya's branch:   base + Maya's changes
           /
  base ---<
           \
            Jordan's branch: base + Jordan's changes
```

For each part of the file, Git asks: compared to the base, who changed it?

| Compared to the base... | Git's decision |
|---|---|
| Nobody changed it | Keep it as it is |
| Only Maya changed it | Take Maya's version |
| Only Jordan changed it | Take Jordan's version |
| Both changed it, in the same way | Take that version |
| **Both changed it, differently** | **Conflict: ask a human** |

This is called a **three-way merge**, and it is why Git is so good at combining work. If Maya edits the top of `Robot.java` and Jordan edits `teleopPeriodic()` near the bottom, Git combines both automatically, even though they changed the same file. Conflicts only happen when two people change the **same lines**, or lines right next to each other, in different ways.

### Fast-forward: the merge that is not really a merge

Sometimes one side has no new commits at all. If you made commits on `gentle-turns` but nobody touched `main` since you branched, then merging into `main` just means sliding `main` forward to point at your latest commit. Git calls this a **fast-forward**, and it says so:

```
Updating a30f655..82a09ec
Fast-forward
 src/main/java/frc/robot/Robot.java | 5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)
```

When both branches have new commits, Git combines them and records a **merge commit**, a commit with two parents, one from each branch. In `git log --oneline --graph`, it is where two lines of history join back together:

```
*   3f2bc6f Merge remote-tracking branch 'origin/main' into careful-reverse
|\
| * 82a09ec Scale down teleop turning for easier aiming
* | 16f190f Limit reverse speed in teleop
|/
* a30f655 Ch10: add data logging for events and dashboard values
```

### `git pull` is two commands in one

You have been using `git pull` since Chapter 3. It is actually two steps:

1. **`git fetch`** downloads new commits from GitHub. It does not change any of your files. It updates your laptop's record of what GitHub has, under names like **`origin/main`** ("GitHub's `main`, as of the last time I checked").
2. **`git merge origin/main`** merges those commits into the branch you are on.

On a team, it is often clearer to run the two steps yourself. It lets you see what is about to come in before you merge it. You will do exactly that in the pair lab.

> **If `git pull` says "divergent branches"**
>
> If your branch and GitHub's both have new commits, a plain `git pull` on some Git installations stops with `fatal: Need to specify how to reconcile divergent branches.` Git is asking how you want to combine them: by merging, or by a different method called rebasing. This book always merges. Tell Git so, once per computer:
>
> ```bash
> git config --global pull.rebase false
> ```
>
> After that, `git pull` merges, the way this chapter describes. (Rebasing is a powerful tool that rewrites history, and it is easy to get tangled in it. You will not need it in this book.)

---

## 11.8 Anatomy of a Merge Conflict

Here is the situation from Section 11.1, as real code. Both Maya and Jordan start from the Chapter 10 `Robot.java`, where `teleopPeriodic()` ends like this:

```java
        // Write.
        drivetrain.arcadeDrive(safeForward * speedScale, rotation * speedScale);
```

Maya, on the `gentle-turns` branch, adds a constant below the other constants and scales the rotation:

```java
    private static final double TURN_SCALE = 0.7;
```

```java
        // Write. Turns are scaled down so aiming is easier.
        drivetrain.arcadeDrive(safeForward * speedScale, rotation * speedScale * TURN_SCALE);
```

Jordan, on the `careful-reverse` branch, adds a different constant in the same spot and limits how fast the robot can back up, because nothing on the Explorer watches behind it:

```java
    private static final double MAX_REVERSE_SPEED = 0.5;
```

```java
        // Write. Reverse is limited because nothing watches behind the robot.
        double limitedForward = Math.max(safeForward, -MAX_REVERSE_SPEED);
        drivetrain.arcadeDrive(limitedForward * speedScale, rotation * speedScale);
```

`Math.max` is a `static` utility method, like `MathUtil.applyDeadband` from Chapter 8. It returns whichever of its two numbers is bigger. Driving backward at full stick makes `safeForward` equal to `-1.0`, and `Math.max(-1.0, -0.5)` is `-0.5`, so reverse is capped at half. Driving forward, `safeForward` is positive and always bigger than `-0.5`, so it passes through untouched.

Maya's pull request is reviewed and merged first. Now Jordan's PR shows a gray box on GitHub: **This branch has conflicts that must be resolved.** Jordan resolves it on Jordan's own laptop.

### Step 1: Bring `main` into your branch

```bash
git checkout careful-reverse
git fetch origin
git merge origin/main
```

```
Auto-merging src/main/java/frc/robot/Robot.java
CONFLICT (content): Merge conflict in src/main/java/frc/robot/Robot.java
Automatic merge failed; fix conflicts and then commit the result.
```

Read it aloud: "I tried to merge `Robot.java` automatically. There is a conflict in its contents. I stopped, so you can fix it and then commit."

Nothing is broken, and nothing is lost. Git is now in the middle of a merge, waiting for you. `git status` confirms it:

```
On branch careful-reverse
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   src/main/java/frc/robot/Robot.java
```

`both modified` is Git's name for "both branches changed this file in ways I could not combine."

### Step 2: Read the conflict markers

Open `Robot.java`. Most of the file is merged already. In two places, Git has written **both** versions into the file, wrapped in **conflict markers**. The first is in the constants:

```
    private static final double WALL_STOP_DISTANCE_METERS = 0.20;
<<<<<<< HEAD
    private static final double MAX_REVERSE_SPEED = 0.5;
=======
    private static final double TURN_SCALE = 0.7;
>>>>>>> origin/main
```

The second is at the end of `teleopPeriodic()`:

```
<<<<<<< HEAD
        // Write. Reverse is limited because nothing watches behind the robot.
        double limitedForward = Math.max(safeForward, -MAX_REVERSE_SPEED);
        drivetrain.arcadeDrive(limitedForward * speedScale, rotation * speedScale);
=======
        // Write. Turns are scaled down so aiming is easier.
        drivetrain.arcadeDrive(safeForward * speedScale, rotation * speedScale * TURN_SCALE);
>>>>>>> origin/main
```

Here is how to read every conflict you will ever see:

| Marker | Meaning |
|---|---|
| `<<<<<<< HEAD` | Start of the conflict. Below it is **your** version: the branch you are on (`HEAD`, from Chapter 10). |
| `=======` | The divider. Below it is **their** version. |
| `>>>>>>> origin/main` | End of the conflict. The name tells you whose version was below the divider: the branch you merged in. |

So each conflict is Git saying: "Here is what you wrote. Here is what they wrote. They touch the same lines. What should the code be?"

> **The file will not build right now, and that is fine**
>
> Conflict markers are not Java. While they are in the file, VS Code will underline them in red and the build will fail. That is a useful safety net: you cannot accidentally run a half-resolved file. Your job is to replace each marked block with the correct code and delete every marker.

### Step 3: Decide what the code should be

This is the step that matters, and it is not a Git question. It is a **robot** question: what were both people trying to do, and what code does both?

There are three kinds of answers, and you will meet all three:

1. **Keep both.** The constants conflict only because both were added on the same line of the file. Nobody disagrees; there are simply two new constants. Keep both.
2. **Combine them.** The `arcadeDrive` lines conflict because both people changed the same line for different reasons. Taking either version alone would delete the other person's feature. The right answer is new code that does both.
3. **Choose one.** Sometimes two people really do disagree, like setting the same threshold to two different numbers. Then you pick one, ideally based on evidence (Chapter 9: measure!), and you tell the other person why.

Here is the resolved code for the constants:

```java
    private static final double WALL_STOP_DISTANCE_METERS = 0.20;
    private static final double TURN_SCALE = 0.7;
    private static final double MAX_REVERSE_SPEED = 0.5;
```

And for the end of `teleopPeriodic()`:

```java
        // Write. Turns are scaled down so aiming is easier.
        // Reverse is limited because nothing watches behind the robot.
        double limitedForward = Math.max(safeForward, -MAX_REVERSE_SPEED);
        drivetrain.arcadeDrive(limitedForward * speedScale, rotation * speedScale * TURN_SCALE);
```

Look at that last line closely. It uses Jordan's `limitedForward` **and** Maya's `TURN_SCALE`. Neither person wrote this exact line. The person resolving the conflict did, by understanding both changes. The comments got merged too, so the next reader knows why both features exist.

Notice what would have happened with a lazy resolution. Clicking "keep mine" would have silently deleted Maya's turn scaling. The code would build, the PR would merge, and Maya would find out at practice that the turn scaling was gone. **A conflict is resolved correctly only when both people's intent survives.**

> **What `TURN_SCALE` does to the robot's path**
>
> Scaling rotation does not just make turns "slower." It makes them **wider**. In Chapter 8 you saw that arcade drive turns forward and rotation into wheel speeds: forward `0.5` with rotation `0.2` gives left `0.3` and right `0.7`. The robot curves around a point beside it, and how far away that point is depends on how different the two wheel speeds are compared to their total. On the Explorer, whose wheels are 155 mm apart, `0.3` and `0.7` curve around a circle about 19 cm in radius. Shrink that rotation to `0.14` and the wheels become `0.36` and `0.64`, and the circle grows to about 28 cm. Same stick, wider arc. (Because `arcadeDrive` squares its inputs, multiplying the stick by `0.7` actually shrinks the turn even more than this, to about half.) Chapter 13 turns this into exact formulas with `DifferentialDriveKinematics`, and Chapter 28 does the same for a swerve drive.

### Step 4: Resolve it in VS Code

You can edit the markers out by hand, and it is good to do that at least once so you understand them. VS Code also makes it easier. Above each conflict, it shows a row of clickable actions:

- **Accept Current Change**: keep your version (above `=======`).
- **Accept Incoming Change**: keep their version (below `=======`).
- **Accept Both Changes**: keep both, one after the other.
- **Compare Changes**: show the two side by side.

VS Code colors the two halves too: your **current** change on top, their **incoming** change below.

For the constants, **Accept Both Changes** gives you both lines. Then tidy the order if you like. For the `arcadeDrive` block, none of the buttons gives the right answer by itself, because the right answer is a line nobody has written yet. A good approach: click **Accept Both Changes**, then edit the result into the combined version, deleting the duplicate lines.

For bigger conflicts, VS Code also has a **merge editor**. Click **Resolve in Merge Editor** at the bottom right of a conflicted file. It shows **Incoming** and **Current** side by side, with the **Result** below, and you check boxes to build the result. Click **Complete Merge** when the result is right.

> **Search for leftover markers**
>
> Before you go on, search the whole project for `<<<<<<<` (`Ctrl+Shift+F` in VS Code). One forgotten marker means a build failure for whoever pulls your code next. Git also has a check: `git diff --check` lists any leftover conflict markers.

### Step 5: Build, then finish the merge

Never commit a resolution you have not built. Run **`WPILib: Build Robot Code`** and wait for `BUILD SUCCESSFUL`. If you have your XRP, run the program and drive: turns should be gentler, and backing up should be capped at half speed.

Then tell Git the conflict is resolved, and finish the merge:

```bash
git add src/main/java/frc/robot/Robot.java
git commit --no-edit
```

```
[careful-reverse 3f2bc6f] Merge remote-tracking branch 'origin/main' into careful-reverse
```

In a merge, `git add` means "this file is resolved," not just "stage this." The `--no-edit` tells Git to use the message it already prepared, `Merge remote-tracking branch 'origin/main' into careful-reverse`, instead of opening a text editor.

Finally, push:

```bash
git push
```

Refresh the pull request on GitHub. The conflict warning is gone, replaced by a green **This branch has no conflicts with the base branch**. The new merge commit appears in the PR, and a reviewer can look at exactly how you resolved it.

### The escape hatch: `git merge --abort`

If a merge goes badly, you are confused, or you realize you merged the wrong thing, you can always back out:

```bash
git merge --abort
```

That puts every file back exactly as it was before you typed `git merge`, as if the merge never happened. Take a breath, ask your partner what their change was supposed to do, and try again. It is impossible to make things worse by aborting.

> **Resolving on GitHub's website**
>
> For simple conflicts like this one, the PR page has a **Resolve conflicts** button that opens an editor in your browser. You edit out the markers, click **Mark as resolved**, then **Commit merge**. It works, but it has a big weakness: you cannot build the result before committing it. This book resolves conflicts in VS Code, where you can build first. Use the web editor only for conflicts in non-code files like `README.md`.

---

## 11.9 Clean Merges That Still Break

Git's three-way merge works line by line. It knows nothing about Java. That means a merge can finish with no conflicts at all and still produce code that does not build, or worse, builds and does the wrong thing. This is called a **semantic conflict**: the two changes do not overlap in the text, but they clash in **meaning**.

Here is one that happens on real teams. Maya decides `isObstacleWithin` is a confusing name. On a `rename-obstacle-check` branch, Maya renames it in `Sensors.java` to `isObstacleCloserThan`, and updates the one call to it in `teleopPeriodic()`. The branch builds. The PR merges.

Meanwhile, Jordan is on an `auto-wall-stop` branch, making autonomous stop early if it sees a wall, and adds a new call, in `autonomousPeriodic()`:

```java
        if (autoTimer.get() < 1.0 && !sensors.isObstacleWithin(WALL_STOP_DISTANCE_METERS)) {
```

Jordan's branch builds too, because on that branch the old name still exists. Then Jordan merges `main` into the branch:

```
Auto-merging src/main/java/frc/robot/Robot.java
Merge made by the 'ort' strategy.
```

No conflict. Maya changed `Sensors.java` and one line of `teleopPeriodic()`. Jordan changed one line of `autonomousPeriodic()`. Different lines, so Git combined them without a question. And now the build fails:

```
Robot.java:120: error: cannot find symbol
        if (autoTimer.get() < 1.0 && !sensors.isObstacleWithin(WALL_STOP_DISTANCE_METERS)) {
                                             ^
  symbol:   method isObstacleWithin(double)
  location: variable sensors of type Sensors
```

You know this error from Chapter 10. The method Jordan calls no longer exists, because Maya renamed it on a branch Jordan never saw. Neither of them did anything wrong alone. The bug only exists in the **combination**.

Three habits protect you:

1. **Build after every merge, before you push.** Even a merge with no conflicts. This catches every semantic conflict that breaks the build, like this one, in seconds.
2. **Treat public methods as contracts** (Section 11.6). Renaming a method teammates call is a bigger change than it looks. Tell the team first, or add the new name and keep the old one working for a while, the way WPILib did with `getLeftBumper()`.
3. **Test after a merge, not just before.** A semantic conflict that still builds, like two features both changing `SLOW_MODE_SCALE` for different reasons, only shows up when you drive. The smoke test from Chapter 10 is a perfect post-merge check.

> **Robots that check every merge for you**
>
> Remembering to build after every merge is a habit, and habits slip at 11 PM. In Chapter 22 you will set up **continuous integration** (CI) with GitHub Actions: every time anyone pushes to a pull request, a computer on GitHub automatically builds the code and runs your tests, and puts a green check or a red X on the PR. A semantic conflict like this one gets a red X before anyone can merge it. Until then, you are the CI.

---

## 11.10 Team Habits That Prevent Painful Conflicts

You cannot avoid every conflict, and you should not try. But a few habits keep them small, rare, and easy:

- **Pull before you start.** `git checkout main`, `git pull`, then branch. Starting from old code is the number one cause of big conflicts.
- **Keep branches short.** Merge within a day or two if you can. Split big features into small PRs.
- **Merge `main` into your branch often.** If your branch has to live longer, run `git fetch origin` and `git merge origin/main` every day. Five small conflicts spread over a week are much easier than one giant conflict at the end.
- **Say what you are working on.** "I am in `teleopPeriodic` this afternoon" in the team chat lets a teammate wait an hour or pick a different task. Many teams track this with a list of GitHub Issues, one per task, each with one person's name on it.
- **Do not reformat whole files.** If your editor re-indents or reorders every line of `Robot.java` as part of a small change, every line now counts as changed, and every teammate's branch conflicts with yours. Keep formatting changes in their own PR, agreed on by the team.
- **Put each kind of code in its own place.** Remember Chapter 9: encoders and the gyro live in `Drivetrain`, other sensors in `Sensors`, decisions in `Robot`. When each class has one job, two people working on two different jobs rarely touch the same file. In Chapter 18, command-based programming takes this even further.

### Where the team's code lives

Your XRP Explorer lives in your own GitHub account, because it is your personal project. A competition robot's code belongs to the **team**, so most FRC teams create a **GitHub organization**: a shared account, like a club, that owns the team's repositories. Mentors and student leads manage who belongs to it, and when a student graduates, the code stays with the team instead of leaving on that student's account. When you reach the Mini Swerve in Chapter 26, its code will live in your team's organization.

Organizations also make it easier to enforce the rules in this chapter. A team can **protect** its `main` branch with a rule that requires a pull request, and an approving review, before anything merges. Then "nobody commits directly to `main`" stops being a promise and becomes something GitHub enforces. (On GitHub's free plans, protected branches work on public repositories; private repositories need a paid plan. Ask your mentor how your team is set up.)

> **Write the rules down**
>
> Every team ends up with rules about branches and reviews. The good teams write them down, so new members do not have to learn them by breaking them. GitHub has a standard place for this: a file called `CONTRIBUTING.md` in the repository. When someone opens a pull request, GitHub shows them a link to it. In the Reflect exercise, you will write one for your Explorer.

---

## Chapter Summary

> **What you learned in Chapter 11**
>
> * On a team, **`main` always works**. Every change happens on its own short-lived **feature branch**, started from an up-to-date `main` with `git checkout main`, `git pull`, `git checkout -b <name>`. This is **GitHub flow**.
> * A **pull request** asks to merge a branch into `main`. It shows the diff, collects review comments, and updates when you push. Merging happens on GitHub; run `git pull` to bring it to your laptop.
> * **Code review** catches bugs before they reach the robot and spreads knowledge across the team. Check units, signs, copy-paste, magic numbers, and whether the code matches the description. Comment on the code, not the person.
> * **Javadoc comments** (`/** ... */`, with `@param` and `@return`) document how to use a class or method. VS Code shows them on hover, and they are how the WPILib documentation is made. Always include units, ranges, and directions.
> * A method's **signature** is its name plus its parameter types. Changing it breaks every caller. **Overloading** (same name, different parameters) adds an ability without breaking anyone, and **deprecating** renames a method politely.
> * Git merges by comparing both branches to their **merge base**. A **merge conflict** happens when both sides changed the same lines differently. Read the markers (`<<<<<<<` yours, `=======`, `>>>>>>>` theirs), then **keep both**, **combine**, or **choose one** so both people's intent survives. Build, `git add`, `git commit`. `git merge --abort` always backs out safely.
> * A merge with no conflicts can still break: a **semantic conflict**. Build and test after every merge. Continuous integration (Chapter 22) will automate the check.

---

## Exercises

These exercises need a partner, and the Collab exercise needs a group of three. You do not need to be in the same room: everything goes through GitHub. A video or voice call while you work makes it more fun and much faster, but it is not required. You do not need your XRP until the very last step of the Build, and that step is optional.

### Practice

**1. A conflict of your own, first.** Before you work with a partner, cause and resolve a conflict alone, where nobody is waiting on you. In your Explorer project, with `git status` clean:

```bash
git checkout -b threshold-a
```

In `Sensors.java`, change `LINE_THRESHOLD` to `0.50`. Commit it with the message `Raise line threshold to 0.50`. Then:

```bash
git checkout main
git checkout -b threshold-b
```

Change `LINE_THRESHOLD` to `0.55` and add `// measured on the practice field tape` to the end of the line. Commit it with the message `Set line threshold for practice field tape`. Now merge the first branch into this one:

```bash
git merge threshold-a
```

Before you open `Sensors.java`, predict: which lines will be between the markers? What will the `>>>>>>>` line say? Then open it and check. This is a **choose one** conflict: the two branches disagree about a number. Pick `0.55` (it came with a reason), delete the markers, build, `git add`, and `git commit --no-edit`.

Then clean up. This was practice, so do not merge it into `main`:

```bash
git checkout main
git branch -D threshold-a threshold-b
```

Do it a second time, but this time use `git merge --abort` instead of resolving. Run `git status` and open `Sensors.java` to confirm everything is back to how it was before the merge.

**2. Predict the merge.** For each pair of changes, both made from the same starting `Robot.java`, predict whether merging them gives a **clean merge**, a **merge conflict**, or a **clean merge that breaks the build**. Write one sentence explaining each.

1. Partner A adds a `SmartDashboard.putNumber` line in `updateDashboard()`. Partner B changes `STICK_DEADBAND` from `0.1` to `0.12`.
2. Both partners change `STICK_DEADBAND`, one to `0.12` and one to `0.15`.
3. Partner A deletes the `getAccelZ()` method from `Sensors.java` because "nobody uses it." Partner B adds a "Robot Tipped" dashboard widget that calls `sensors.getAccelZ()`.
4. Both partners add a new constant on the line right after `WALL_STOP_DISTANCE_METERS`.

**3. Document the `Sensors` class.** Add a Javadoc comment, with `@return` (and `@param` where needed), to every public method in `Sensors.java`. Include units and ranges. Then hover over a `sensors.` call in `Robot.java` and check that your comment appears.

### Build (XRP Explorer): The Pair Lab

In this lab, you and your partner each add a feature to the same `Robot.java`, on separate branches, in the same repository. The two features touch the same lines, so the second one to merge will conflict. You will do the lab **twice**: once in your repository and once in your partner's, swapping roles, so each of you resolves one conflict and each of your Explorers ends up with both features.

Below, the **owner** is the person whose Explorer repository you are working in. The **teammate** is the other partner.

**Part A: prepare your own repository (each partner, alone, before the lab).**

1. Update `Drivetrain.java` with the two `arcadeDrive` methods from Section 11.6, replacing the old one. Add Javadoc comments, with `@return`, to `getAverageDistanceMeters()`, `getHeadingDegrees()`, and at least two more getters.
2. Build and confirm `BUILD SUCCESSFUL`. Nothing in `Robot.java` changes: every existing call to `arcadeDrive(forward, rotation)` still works. That is overloading at work.
3. Commit and push to `main` (see the Git exercise), and make sure `git status` is clean.
4. If you have not already, run `git config --global pull.rebase false` (Section 11.7).

**Part B: share the repository.**

1. **Owner**: on GitHub, open your `XRPExplorer` repository, click **Settings**, then **Collaborators** (under "Access"), then **Add people**. Search for your teammate's GitHub username and add them. (If your team keeps lab repositories in its GitHub organization, your mentor may set up access there instead.)
2. **Teammate**: accept the invitation from the email GitHub sends (or from your GitHub notifications). Invitations expire after seven days.
3. **Teammate**: clone the owner's repository into a **new folder**, not inside your own Explorer. In a terminal:

   ```bash
   cd ~
   git clone https://github.com/<owner-username>/XRPExplorer.git XRPExplorer-<owner-username>
   ```

   Open that folder in VS Code (**File** > **Open Folder**) and run `WPILib: Build Robot Code` once to make sure it builds on your computer.

**Part C: two features, two branches.** Work at the same time. Neither of you merges anything yet.

1. **Both**: start from an up-to-date `main`:

   ```bash
   git checkout main
   git pull
   ```

2. **Owner**: create the `gentle-turns` branch and make Maya's change from Section 11.8: add `TURN_SCALE = 0.7` on the line right after `WALL_STOP_DISTANCE_METERS`, and change the `// Write.` comment and the `arcadeDrive` line at the end of `teleopPeriodic()`. Build. Commit with the message `Scale down teleop turning for easier aiming`.
3. **Teammate**: create the `careful-reverse` branch and make Jordan's change: add `MAX_REVERSE_SPEED = 0.5` on the line right after `WALL_STOP_DISTANCE_METERS`, and replace the `// Write.` comment and `arcadeDrive` line with the `limitedForward` version. Build. Commit with the message `Limit reverse speed in teleop`.
4. **Both**: push your branch with `git push -u origin <your-branch-name>`, and open a pull request into `main` with a what, why, and how-I-tested description (Section 11.3).

Make the changes exactly at those spots. If you put your constant somewhere else, you may not get a conflict, and the conflict is the point.

**Part D: review, merge, and conflict.**

1. **Both**: review each other's PR (Section 11.4). Leave at least one line comment, even if it is just a question or a compliment, then **Approve**.
2. **Teammate**: merge the owner's `gentle-turns` PR. Click **Merge pull request**, then **Confirm merge**, then **Delete branch**.
3. **Both**: open the `careful-reverse` PR. It now says **This branch has conflicts that must be resolved**. Before going on, talk it through: which lines conflict, and why?
4. **Teammate**: resolve it on your laptop, following Section 11.8: `git checkout careful-reverse`, `git fetch origin`, `git merge origin/main`. Resolve both conflicts so **both** features survive. Search for leftover `<<<<<<<` markers. Build. Then `git add`, `git commit --no-edit`, and `git push`.
5. **Owner**: look at the PR's **Files changed** tab and check the resolution. Is `TURN_SCALE` still there? Is `limitedForward` used? Would the robot do what both of you wanted? Approve it, then merge it and delete the branch.
6. **Both**: `git checkout main` and `git pull`. Open `Robot.java` and confirm the end of `teleopPeriodic()` matches the combined version in Section 11.8.
7. **Owner, optional, if you have your XRP**: run the program and drive. Full right stick should turn noticeably more gently than before. Full reverse should be capped at about half speed. Forward driving and the wall stop should be unchanged.

**Part E: swap.** Repeat Parts B through D in the **other** partner's repository, with the roles reversed. The new owner writes `gentle-turns`, the new teammate writes `careful-reverse` and resolves the conflict. When you finish, both of your Explorers contain both features, each of you has resolved a real conflict, and each repository has a merged pull request that shows a conflict being resolved. Send your mentor the links to both merged PRs.

Diagnose anything strange:

- **No conflict happened:** your constants or your `arcadeDrive` changes were not on the same lines. That is actually Git working well. Look at `main` afterward to make sure both features are there, then try again with the exact spots above if you want the practice.
- **`git push` says "rejected" or "fetch first":** someone pushed to that branch since you last pulled. Run `git pull`, then push again.
- **`fatal: Need to specify how to reconcile divergent branches`:** run `git config --global pull.rebase false`, then pull again (Section 11.7).
- **The teammate cannot push at all (`Permission denied` or `403`):** the collaborator invitation was not accepted yet, or you are pushing to the wrong repository. Check `git remote -v`.
- **The build fails after resolving:** a leftover conflict marker, a deleted line, or a missing semicolon in your combined line. Read the first compile error (Chapter 10).
- **One feature is missing after the merge:** the conflict was resolved with "keep mine" or "keep theirs." Fix forward: on a new branch, add the missing part back, and open a new PR.

In every chapter from here on, your code will grow with other people's ideas in it. In Chapter 20 you will do a pair lab again, this time in command-based code, and in Chapter 33 you will merge three people's vision work at once. The steps you just did will be the same every time.

### Collab: The Three-Person Review Lab

Code review only works if reviewers actually catch things. In this lab, one person sneaks a bug into a pull request, and the other two have to find it before it merges.

**Setup.** Your group of three needs one shared repository. Either your mentor creates one in your team's GitHub organization, or one of you uses their Explorer and adds the other two as collaborators (Part B of the Build). Everyone clones it.

**Each round:**

1. The **author** creates a branch and adds one small, real feature that builds without errors, with exactly **one** planted bug that also builds. Give the PR an honest title and a good description of the feature (not the bug!). Request both other members as reviewers (the **Reviewers** box on the right side of the PR).
2. The two **reviewers** review the PR on GitHub. You may fetch the branch and build it, but you may **not** run it on a robot: find the bug by reading. When you find it, leave a line comment on the exact line, saying what is wrong and what would happen on the robot, and submit your review with **Request changes**.
3. The **author** fixes the bug in a new commit on the same branch and pushes. The reviewers check the fix and **Approve**. Then the author merges.

Rotate so that everyone is the author once. Authors, here are some ideas, but the best bugs are your own invention:

- A new `Sensors.areBothOnLine()` getter and dashboard widget. (Bug idea: `||` instead of `&&`.)
- A "Near Wall" warning widget that turns on at 40 cm. (Bug idea: the constant is `40` when the rangefinder reports meters.)
- A `Drivetrain.getAverageSpeedMetersPerSecond()` getter. (Bug idea: a copy-paste mistake that averages the left speed with itself.)
- A "Distance Driven (cm)" widget. (Bug idea: multiplying meters by `10` instead of `100`.)
- A counter of how many times the wall stop has engaged. (Bug idea: it counts every loop while blocked, not each time blocking starts. Remember the `wasBlocked` pattern from Chapter 10.)

Afterward, discuss as a group: which bugs were caught, and how long did each take? Which questions from the review checklist in Section 11.4 found them? Did any reviewer approve a PR that still had the bug? (That is not a failure. It is the reason teams want **two** reviewers.)

### Reflect

Answer in 2 to 3 sentences each, and add your answers to `reflections.md`:

1. When you resolved the `arcadeDrive` conflict, the right answer was a line that neither partner wrote. Why is "accept mine" or "accept theirs" often the wrong way to resolve a conflict? What do you need to understand before you can resolve one correctly?
2. The rename in Section 11.9 merged with no conflicts and still broke the build. Why can Git not catch that kind of problem? What two habits would have caught it before it reached `main`?
3. Why does the two-number `arcadeDrive` call the three-number version, instead of calling `diffDrive.arcadeDrive` itself? What would go wrong later if both methods talked to `diffDrive` directly?

Then write your team's rules. Create a file called `CONTRIBUTING.md` in the root of your Explorer repository that answers these questions, in your own words, for a new programmer joining your team:

- When do you create a branch? What do you name it?
- How long should a branch live before it is merged?
- Who reviews a pull request, and what should they check?
- Who is allowed to merge, and when?
- What do you do right after a merge?

If any answer feels shaky, re-read Sections 11.2, 11.4, and 11.8.

### Git

First, commit your Part A work, before the pair lab starts:

```bash
git add .
git commit -m "Ch11: Javadoc comments and linear arcadeDrive overload"
git push
```

Then submit your `CONTRIBUTING.md` the way a team would: on a branch, through a pull request. With `main` up to date:

```bash
git checkout -b team-rules
git add CONTRIBUTING.md reflections.md
git commit -m "Ch11: add team branching rules"
git push -u origin team-rules
```

Open a pull request for `team-rules` on GitHub. Notice that GitHub now shows a link to your contributing guidelines on the PR page. Ask your lab partner to review it (they are still a collaborator on your repository), then merge it, delete the branch, and finish with `git checkout main` and `git pull`.

Run `git log --oneline --graph -10`. Somewhere in that picture is the place where your partner's work and yours joined together. Every team robot you ever program will have a history shaped like that.

---

> **Additional Resources**
>
> * **Pro Git: Basic Branching and Merging**: [git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging) the free Git book's walkthrough of branches, merges, and basic merge conflicts
> * **GitHub flow**: [docs.github.com/en/get-started/using-github/github-flow](https://docs.github.com/en/get-started/using-github/github-flow) GitHub's short official guide to the branch, pull request, review, merge workflow used in this chapter
> * **Merge conflicts in VS Code**: [code.visualstudio.com/docs/sourcecontrol/merge-conflicts](https://code.visualstudio.com/docs/sourcecontrol/merge-conflicts) the inline conflict actions and the three-way merge editor, with screenshots
> * **Google's code review guide**: [google.github.io/eng-practices/review](https://google.github.io/eng-practices/review/) how one of the world's largest engineering teams reviews code; the "What to look for" and "How to write comments" pages apply directly to robot code
> * **Defining Methods (The Java Tutorials)**: [docs.oracle.com/javase/tutorial/java/javaOO/methods.html](https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html) Java's own explanation of method signatures and overloading

---

*Next up, Chapter 12: Timer and Encoder Autonomous. The Explorer stops waiting for a driver: you will write your first real autonomous routine, first with a timer and then with the encoders from Chapter 9, and measure which one actually puts the robot where you meant.*
