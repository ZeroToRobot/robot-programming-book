# Chapter 3: Git and GitHub: Your Coding Notebook

Imagine you've spent three hours getting your XRP to follow a line. The code finally works. The reflectance sensor reads cleanly, the turn correction feels natural, the robot tracks the tape with satisfying precision. You commit nothing, save the file, and shut your laptop.

The next afternoon, you open the project, change one number to "improve" the turn rate, and break everything. You can't get back to the version that worked. You don't remember exactly what you changed. You spend the rest of practice trying to undo what you've done.

This is the problem Git solves. Not in some abstract software-engineering sense, but in a very concrete, "I just lost three hours of work" sense.

This chapter is about giving your code a memory. By the end of it, you'll have a Git repository for your XRP Explorer project, a connected GitHub remote, and the basic workflow you'll use for every chapter from here on. You'll also see a brief preview of merge conflicts, which Chapter 11 covers in depth.

---

## 3.1 Why Version Control Matters

Programming is editing. You write a file, change it, change it again, change a different file, run the code, find a bug, change something else. Without a tool to track those changes, you're left with a single current version of every file and no record of how it got there.

Version control fixes that by giving every meaningful state of your project a name and a timestamp. You can:

- Go back to any previous version of any file at any time
- See exactly what changed between two points in time
- Work on an experimental idea without breaking the working version
- Combine your work with a teammate's work safely

Git is the version control tool. GitHub is a website that hosts Git repositories online so you and your teammates can share them. Together, they're the standard tools used by essentially every professional software team in the world, and by every successful FRC team's programming subgroup.

> **Why this is in Chapter 3, not Chapter 23**
>
> Some textbooks treat version control as an "advanced topic" you learn after you can already program. This book disagrees. Without version control, you spend hours re-creating work you've already done, and you lose the ability to confidently experiment.
>
> You'll use Git in every single chapter from here on. By Chapter 25, it will be as automatic as saving a file.

---

## 3.2 Repositories, Commits, and the Big Picture

Before any commands, here's the mental model.

### A Repository

A **repository** (often shortened to "repo") is a project that Git is tracking. Concretely, it's a folder on your computer with a hidden `.git` subfolder inside it. Everything in `.git` is Git's internal record-keeping: the history, the branches, the configuration. Don't open it. Don't edit it. Just know it's there.

Your XRP Explorer project from Chapter 2 is going to become a repository in Section 3.6.

### A Commit

A **commit** is a snapshot of your project at one moment in time. When you commit, Git records:

- The exact contents of every file in the project
- A short message you write describing what changed
- Your name and the timestamp
- A pointer to the commit that came before

Each commit gets a unique ID (a long string of letters and numbers like `a3f8c12...`). You can return to any commit at any time, even if you've made dozens of changes since.

Think of a commit like a save point in a video game. You make progress, save, make more progress, save again. If you walk into a trap, you reload from the last save.

### A Branch

A **branch** is a named line of commits. By default, your project has one branch called `main`. When you want to try something risky (a major refactor, an experimental feature), you create a new branch. Work on that branch doesn't affect `main` until you decide to **merge** it back in.

Chapter 11 goes deep on branching strategy. For Chapter 3, you'll mostly work on `main` and learn the basics of branching at the end.

### A Remote

A **remote** is a copy of your repository hosted somewhere else, usually on GitHub. You **push** your commits to the remote to back them up and share them with teammates. You **pull** to get your teammates' commits onto your computer.

Your laptop has the working copy. GitHub has the shared copy. Git keeps them in sync.

> **Picture the flow**
>
> Working folder → `git add` → Staging area → `git commit` → Local history → `git push` → GitHub
>
> Each arrow is a command. You'll learn each one in this chapter.

---

## 3.3 Installing Git

If you completed Chapter 2, you may already have Git: VS Code's WPILib edition usually installs alongside it. Let's verify.

Open the VS Code integrated terminal (`` Ctrl+` `` on Windows/Linux, or `` Cmd+` `` on macOS) and run:

```bash
git --version
```

If you see something like `git version 2.43.0`, you're set. Skip ahead to Section 3.4.

If you get a "command not found" error, install Git:

- **Windows**: download from [git-scm.com/download/win](https://git-scm.com/download/win) and run the installer with all default options
- **macOS**: open Terminal and run `xcode-select --install`, or download from [git-scm.com/download/mac](https://git-scm.com/download/mac)
- **Linux**: run `sudo apt install git` (Ubuntu/Debian) or `sudo dnf install git` (Fedora)

Restart VS Code after installing, then re-run `git --version` to confirm.

### One-Time Configuration

Git needs to know who you are so it can label every commit with your name. Run these two commands, replacing the values with your own:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Use the same email address you'll use for your GitHub account. If you're on a school-managed laptop, use a personal email you'll keep using after graduation: your commit history is part of your engineering record.

While you're at it, set the default branch name to `main` (this matches GitHub and the rest of this book):

```bash
git config --global init.defaultBranch main
```

You only need to run these three commands once per computer.

---

## 3.4 Creating a GitHub Account

If you don't already have one, go to [github.com](https://github.com) and sign up. A few notes:

- Use a username you'd be comfortable showing on a résumé. `qwerty12345` is funny now, less so later.
- Use the same email you configured Git with.
- Enable two-factor authentication when prompted: GitHub will eventually require it, and it's a good security habit.

After signing up, you'll need to authenticate your laptop with GitHub so Git can push to it. The easiest way is to install the **GitHub CLI**:

- **Windows**: [cli.github.com](https://cli.github.com), download and run the installer
- **macOS**: `brew install gh` (if you have Homebrew) or download from the same site
- **Linux**: see [github.com/cli/cli#installation](https://github.com/cli/cli#installation)

Then run:

```bash
gh auth login
```

Follow the prompts. Choose **GitHub.com**, **HTTPS**, **Login with a web browser**, and paste the code it gives you into the browser window that opens. Once you see "Logged in as `<yourusername>`", you're authenticated.

> **Why HTTPS instead of SSH?**
>
> Git can authenticate to GitHub two ways: HTTPS (with a token managed by `gh auth`) or SSH (with a key pair you generate yourself). HTTPS is easier to set up, works through most corporate firewalls, and is what GitHub recommends for new users. SSH is slightly more elegant but adds setup steps that aren't worth it at this stage.
>
> You can switch later if you ever feel limited. Most professional developers use HTTPS for years before considering it.

---

## 3.5 Your First Three Commands

Before doing anything to your real project, let's practice on a throwaway folder. This way, if something goes wrong, you haven't damaged your XRP Explorer code.

In the terminal:

```bash
cd ~                          # go to your home folder
mkdir git-practice            # make a new folder
cd git-practice               # enter it
```

Now turn this folder into a Git repository:

```bash
git init
```

You should see something like `Initialized empty Git repository in /Users/you/git-practice/.git/`. That's the hidden `.git` folder being created.

Create a file:

```bash
echo "Hello, Git." > notes.txt
```

Check what Git sees:

```bash
git status
```

You'll see output like this:

```
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        notes.txt

nothing added to commit but untracked files present
```

Git noticed `notes.txt`, but it's marked **untracked**: Git knows the file exists but isn't recording its contents yet. To start tracking it, you **add** it:

```bash
git add notes.txt
```

Run `git status` again. Now `notes.txt` is in green, under "Changes to be committed". The file is **staged**, ready to be saved into a commit. Make the commit:

```bash
git commit -m "First commit: notes file"
```

The `-m` flag lets you write the commit message inline. You should see something like:

```
[main (root-commit) 3a8f1c2] First commit: notes file
 1 file changed, 1 insertion(+)
 create mode 100644 notes.txt
```

That's it. You've made your first commit.

### The Three-Step Cycle

Almost every change you make to a Git repo follows the same three-step cycle:

1. **Edit files** in your editor
2. **Stage** the files you want to commit: `git add <files>`
3. **Commit** the staged changes: `git commit -m "message"`

Try the cycle again. Edit `notes.txt`:

```bash
echo "Second line." >> notes.txt
```

Stage and commit:

```bash
git add notes.txt
git commit -m "Add second line"
```

Now look at your history:

```bash
git log
```

You'll see both commits, newest first, with their IDs, your name, and your messages. This is the history of your project. Press `q` to exit the log view.

> **`git add .` is your friend**
>
> Once you trust your changes, you can stage every modified file at once with `git add .` (the dot means "everything in the current folder"). Most of the time, that's what you want. Only use specific filenames when you have changes you intentionally want to leave out of a commit.

---

## 3.6 Initializing Your XRP Explorer Repository

Now do the real thing. In Chapter 2, you committed your XRPExplorer project once at the very end. Let's go back to that project and make sure it's properly set up.

Open the XRPExplorer folder in VS Code if it isn't already. Open the integrated terminal and confirm you're in the project root:

```bash
pwd
```

You should see something ending in `/XRPExplorer`. If not, `cd` there.

Check status:

```bash
git status
```

If you followed Chapter 2's Git exercise, you'll see "nothing to commit, working tree clean" and your earlier commit will exist. If for any reason the repo wasn't initialized, run `git init` now.

### The .gitignore File

Some files should never be committed: build outputs, editor settings, OS junk files. The WPILib project template includes a `.gitignore` file that lists these for you. Look at it:

```bash
cat .gitignore
```

You'll see entries like `build/`, `.vscode/settings.json`, and `.DS_Store`. Git will ignore anything matching these patterns.

> **Why ignore `build/`?**
>
> Every time you run `WPILib: Build Robot Code`, Gradle generates a large number of compiled files in the `build/` folder. These are derived from your source code: they can be regenerated at any time, and they change constantly. Committing them would clutter your history with millions of lines of meaningless diff. The same logic applies to `.gradle/`, `bin/`, and similar tool output.

If you ever notice unwanted files showing up in `git status`, the fix is usually adding a line to `.gitignore`.

### Make a Real Commit

Open `Robot.java` and update the `robotInit()` method to print a startup message:

```java
@Override
public void robotInit() {
    System.out.println("XRP Explorer starting up.");
}
```

Save the file. In the terminal:

```bash
git status
```

You'll see `Robot.java` listed under "Changes not staged for commit". Look at the actual change:

```bash
git diff
```

This shows you, line by line, what's different between your working files and the last commit. Lines starting with `-` were removed; lines starting with `+` were added. Get used to running `git diff` before you commit: it's the easiest way to catch mistakes.

Stage and commit:

```bash
git add Robot.java
git commit -m "Ch3: add startup print to robotInit"
```

You've now made a commit that captures one specific, small change with a clear message. This is the unit of progress you'll work in for the rest of the book.

---

## 3.7 Pushing to GitHub

Local commits are good, but they only exist on your laptop. If your hard drive dies or your laptop is stolen, your commit history goes with them. You want a copy on GitHub.

### Creating the Remote Repository

The fastest way is the GitHub CLI:

```bash
gh repo create XRPExplorer --public --source=. --remote=origin --push
```

Walk through what just happened:

- `gh repo create XRPExplorer` creates a new repository named XRPExplorer on your GitHub account
- `--public` makes it visible to anyone (use `--private` if you'd rather keep it private; both work the same way for our purposes)
- `--source=.` says "use the Git repo in the current folder"
- `--remote=origin` adds GitHub as a remote named `origin` (the conventional name)
- `--push` pushes your existing commits up immediately

You'll see a URL like `https://github.com/yourname/XRPExplorer`. Open it in your browser. Your code is there, with your commit history visible.

### Or, the Manual Way

If you'd rather not use the CLI, do it through the website:

1. On [github.com](https://github.com), click the **+** icon in the top-right and choose **"New repository"**
2. Name it `XRPExplorer`, leave the rest of the defaults, and click **Create repository**
3. GitHub shows a setup page; copy the line under "…or push an existing repository from the command line", which looks like:

```bash
git remote add origin https://github.com/yourname/XRPExplorer.git
git branch -M main
git push -u origin main
```

Run those three commands in your XRPExplorer terminal. Refresh the GitHub page: your code is there.

### The Push/Pull Cycle

Once your remote is set up, the workflow extends to four steps:

1. Edit files
2. `git add .`
3. `git commit -m "message"`
4. `git push`

`git push` sends your local commits to GitHub. If you're working on more than one computer (a desktop at home and a laptop at school), you'd run `git pull` on the second computer to download the latest commits before starting work.

> **Push frequently**
>
> A good rule of thumb: push at least once at the end of every coding session. Your laptop battery dying mid-build is a normal occurrence; losing two hours of uncommitted work is avoidable.

---

## 3.8 Branches: A Brief Preview

You'll spend most of Section II working on your `main` branch. But there's one branching concept worth introducing now, because you'll see it referenced throughout the book.

A branch is a parallel line of commits. Imagine your `main` branch is a path through a forest. At any point, you can step off the path, walk in a different direction (a new branch), explore something, and either come back to the main path or merge your detour into it.

### Creating and Switching Branches

To create a new branch and switch to it:

```bash
git checkout -b experiment-faster-turn
```

You're now on a branch called `experiment-faster-turn`. Any commits you make here go to this branch, not `main`.

To switch back to `main`:

```bash
git checkout main
```

Your `experiment-faster-turn` branch still exists with all its commits. You can switch back to it any time.

### Merging

When you're happy with the work on your branch, you merge it into `main`:

```bash
git checkout main
git merge experiment-faster-turn
```

If the changes don't conflict with anything on `main`, the merge happens cleanly. Your branch's commits are now part of `main`'s history.

> **What if there's a conflict?**
>
> If you and a teammate both edited the same line in the same file, Git can't tell which version is correct. It marks the file as "conflicted" and asks you to resolve it manually.
>
> This is a normal part of working in a team and one of the most useful skills in this book. Chapter 11 has a dedicated lab where you and a partner deliberately create a merge conflict, then resolve it together. For Chapter 3, all you need to know is that conflicts exist and that they're solvable.

### Deleting a Branch

After merging, the branch has done its job. Delete it:

```bash
git branch -d experiment-faster-turn
```

Your history is cleaner that way.

---

## 3.9 Writing Good Commit Messages

Almost every developer writes a bad commit message at some point. Then, three weeks later, they're trying to figure out what `git log` is telling them and they regret it.

A good commit message describes **what** changed and **why**, in just enough words to be useful when you read it later. Compare:

```
Bad:   "fix"
Bad:   "stuff"
Bad:   "asdfasdf"
Bad:   "minor changes"
Good:  "Ch4: add LED blink in autonomousPeriodic"
Good:  "Fix encoder distance conversion: ticks per rev was 1440, not 360"
Good:  "Increase teleop deadband from 0.05 to 0.1 to ignore stick drift"
```

Notice the good messages tell you what file or feature was affected and why the change was made. The bad ones tell you nothing.

A pattern that works well for this book:

```
Ch<chapter>: <short description>
```

Examples:

- `Ch3: initial commit, project from WPILib template`
- `Ch6: extract driveForward into utility method`
- `Ch9: add reflectance sensor reading to dashboard`

When you're debugging in Chapter 10 and using `git log` to find when a bug appeared, you'll thank yourself for these messages.

> **Commit messages are notes to your future self**
>
> Every commit message is a small letter from past-you to future-you. Future-you is tired, stressed, three hours into a debugging session at 11pm before competition. Past-you should have been kind enough to leave a clear note.

---

## 3.10 The Workflow You'll Use Every Chapter

Putting Chapters 2 and 3 together, here's the cycle you'll repeat for the rest of this book:

1. **Edit** code in VS Code
2. **Build** (`WPILib: Build Robot Code`)
3. **Connect** to the XRP's Wi-Fi
4. **Deploy** (`WPILib: Deploy Robot Code`)
5. **Test** the robot, watch SmartDashboard
6. **Stage and commit**: `git add .` then `git commit -m "Ch_: <change>"`
7. **Push**: `git push`

The first few times, you'll have to think about each step. After a chapter or two, it'll be automatic. After Chapter 10, you won't even consciously notice you're doing it.

> **Commit small, commit often**
>
> Aim for commits that capture one small, working change. "Add reflectance sensor reading" is a good commit. "Add reflectance sensor, fix turn PID, rename three classes, and add comments" is too much for one commit, both because it's hard to describe in one message and because if any one of those changes breaks something, you can't easily roll back just that change.
>
> Small commits are also much easier to review when a teammate is reading your code.

---

## Chapter Summary

> **What you learned in Chapter 3**
>
> - **Version control** gives your code a memory: every meaningful state of your project gets a name and a timestamp
> - A **commit** is a snapshot; a **branch** is a parallel line of commits; a **remote** is a hosted copy on GitHub
> - The basic cycle is **edit → add → commit → push**, repeated for every meaningful change
> - **`git status`** and **`git diff`** are your two most useful inspection commands; run them constantly
> - **`.gitignore`** keeps build outputs and tool junk out of your history; the WPILib template provides a sensible default
> - **Good commit messages** describe what changed and why; the `Ch<n>: <description>` pattern works well for this book
> - **Branches and merge conflicts** exist and are normal; you'll do a structured merge conflict lab in Chapter 11

---

## Exercises

### Practice

In your XRPExplorer repository, make three small commits in sequence, each with a meaningful message:

1. Add a comment at the top of `Robot.java` describing what the file does (one sentence is fine)
2. Add a `System.out.println("Teleop started")` to `teleopInit()`
3. Change the message in `robotInit()` to include your name

After each change, run `git status` and `git diff` before committing. Get comfortable seeing exactly what Git sees.

When you're done, run `git log --oneline` and verify your three commits are listed with clear messages. Then push to GitHub and confirm the commits appear there too.

### Reflect

In your own words, write 2 to 3 sentences on each of the following:

1. What's the difference between a **commit** and a **push**? Why are they two separate operations?
2. Why does **`.gitignore`** exist? What would go wrong if you committed everything in your project folder?
3. The chapter says "small commits are easier to review than big commits." Why? Imagine you're reviewing a teammate's code: would you rather see one commit with 400 changed lines or eight commits with about 50 lines each? Why?

### Git

Set up your XRP Explorer repository on GitHub if you haven't already. Then:

1. Create a `README.md` file at the project root with these contents:

```markdown
# XRP Explorer

The XRP Explorer project for Devang Doshi's *Robot Programming Book*.

- **Author**: Your Name
- **XRP Serial**: <your XRP's SSID, e.g. XRP-FA12>
- **Course**: <your team or class name>

## How to Run

1. Connect to the XRP Wi-Fi network
2. Open this folder in WPILib VS Code
3. Run `WPILib: Deploy Robot Code`

See [zerotorobot.org/robot-programming-book](https://zerotorobot.org/robot-programming-book) for the full book.
```

2. Commit it: `git add README.md && git commit -m "Ch3: add README"`
3. Push: `git push`
4. Open the GitHub page for your repo in a browser. The README should now render at the top of the page.

### Reflect (Branching Preview)

Create and switch to a new branch:

```bash
git checkout -b ch3-experiment
```

Make a small change to `Robot.java` (any change at all). Commit it on this branch:

```bash
git add Robot.java
git commit -m "Ch3: branch experiment"
```

Now switch back to `main`:

```bash
git checkout main
```

Open `Robot.java` in VS Code. Notice your change is gone: it's still safe on the `ch3-experiment` branch, but `main` is unchanged. Switch back and forth a few times and watch the file's contents change.

When you're done playing, you can either merge the branch (`git merge ch3-experiment`) or delete it (`git branch -D ch3-experiment`). Either way, write 2 to 3 sentences explaining what just happened: what is a branch actually doing, in your own words?

---

> **Additional Resources**
>
> - **Pro Git book** (free): [git-scm.com/book](https://git-scm.com/book/en/v2) the canonical reference for Git, by Scott Chacon and Ben Straub. You don't need to read it cover to cover, but Chapters 1-3 are excellent and free
> - **GitHub Docs Quickstart**: [docs.github.com/en/get-started/quickstart](https://docs.github.com/en/get-started/quickstart) GitHub's official walkthrough of the basics
> - **Oh My Git!** (free game): [ohmygit.org](https://ohmygit.org) an interactive game that teaches Git concepts visually; especially helpful if commits and branches still feel abstract
> - **Git visual cheat sheet**: [ndpsoftware.com/git-cheatsheet.html](https://ndpsoftware.com/git-cheatsheet.html) shows where each command moves data between working tree, staging area, local repo, and remote
> - **GitHub CLI manual**: [cli.github.com/manual](https://cli.github.com/manual) full reference for the `gh` command if you want to do more from the terminal
> - **WPILib Git documentation**: [docs.wpilib.org/en/stable/docs/software/basic-programming/git-getting-started.html](https://docs.wpilib.org/en/stable/docs/software/basic-programming/git-getting-started.html) FRC-specific Git advice from the WPILib team

---

*Next up, Chapter 4: Your First Java Program. You'll learn variables, data types, and print statements by blinking the XRP's LED and watching values change live in SmartDashboard.*