<!-- counts: blocker=0 major=5 minor=8 build=pass -->

# Chapter 3 SME Review (Phase B, lightweight)

**Chapter:** `src/section-1-foundations/03-git-and-github.md` at HEAD (584 lines)
**VERIFY file:** `robot-programming-book-exercises/ch03-git-and-github/VERIFY.md` (build=pass, 7 issues, 1 deviation)
**Phase A items re-checked:** B3 applies here (§3.10 and the README); M2 covers the line 470 and 585 SmartDashboard mentions. Both are still open at HEAD, as expected.

## New findings (Phase B)

### M1: The "two computers" advice leads straight into an error the book fixes eight chapters later

**Where:** §3.7 "The Push/Pull Cycle", line 363 ("If you're working on more than one computer ... you'd run `git pull` on the second computer"), and §3.3 "One-Time Configuration", lines 97 to 114.

**Problem:** This is a common setup for students (school laptop plus home desktop). The first time they forget to pull, they commit on both computers and then get `! [rejected] main -> main (fetch first)` on push. The `git pull` the message suggests then stops with `fatal: Need to specify how to reconcile divergent branches`, because `pull.rebase` is only set in Ch 11 (line 417, and its troubleshooting list at line 808 names this exact error). If the two commits touched the same line, there's also a conflict. The chapter gives no recovery path, and a beginner on their own will often delete the folder and clone again, losing work. `pull.rebase false` is a once-per-computer setting, just like the three in §3.3.

**Fix:** In §3.3, add a fourth one-time command and change "these three commands" to "these four commands":

```bash
git config --global pull.rebase false
```

"This tells `git pull` how to combine your work with commits from GitHub. Chapter 11 explains it; for now, just set it."

After line 363, add a callout:

"> **If `git push` says "rejected"**
>
> It means GitHub has commits your laptop doesn't, usually from your other computer. Run `git pull`, then `git push` again. If Git says there's a **conflict**, don't panic and don't delete the folder: your work is safe in your commits. Chapter 11 shows you how to fix it, and the preview in Section 3.8 shows you what it looks like."

Ch 11 line 762 ("If you have not already...") then still works as a reminder.

**Source:** [git-pull documentation, `pull.rebase`](https://git-scm.com/docs/git-pull#Documentation/git-pull.txt---rebasefalsetruemergesinteractive)

### M2: The token advice for macOS and Linux is a weak security habit, and "Git remembers it" is false on Linux

**Where:** §3.4, lines 129 to 133.

**Problem:** The book has students create a **classic** Personal Access Token with the **repo** scope, which grants full read and write access to every repository the account can reach, and tells them to "copy the token somewhere safe" (in practice, a notes file). Then line 133 says "Once you authenticate, Git remembers it". On macOS, Apple's Git stores it in the keychain, but stock Git on Linux has no credential helper, so it asks for the token on every push, and students end up pasting it from that file every time. GitHub's own guidance is to prefer fine-grained tokens, and Git Credential Manager (the Windows path) also runs on macOS and Linux, so one browser sign-in can work everywhere.

**Fix:** Replace the macOS and Linux bullet with:

"- **macOS and Linux**: the easiest path is to run your first `git push` from **VS Code's terminal**: VS Code offers to sign you in to GitHub in your browser, the same way Windows does [verify: VS Code `git.terminalAuthentication`]. If that doesn't appear, install **[Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager)**, which works on all three systems, or use the GitHub CLI's `gh auth login`.

> **If you use a token**
>
> Make a **fine-grained** token, limit it to your `XRPExplorer` repository, give it **Contents: Read and write**, and set an expiration. Never paste a token into a file in your project or into a chat message: anyone who has it can push to your repository."

**Source:** [GitHub Docs: Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) ("GitHub recommends that you use fine-grained personal access tokens"); [Git: Credential Storage](https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage) (no caching by default); [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager)

### m1: The merge-conflict "preview" the chapter promises is only a description

**Where:** Intro line 9 ("You'll also see a brief preview of merge conflicts"); §3.8 callout, lines 406 to 410.

**Problem:** The book plan lists Ch 3 as the first step of deliberate conflict practice, but students never see conflict markers until the Ch 11 lab. A solo, five-minute conflict in the throwaway `git-practice` folder takes the fear out of the word and gives M1's "don't delete the folder" advice something concrete to point at.

**Fix:** Add a short "See a conflict (2 minutes)" step to §3.8, in `git-practice`: create branch `other`, change line 1 of `notes.txt` and commit; `git checkout main`, change line 1 differently and commit; `git merge other`. Show the `CONFLICT (content)` message and the `<<<<<<<`, `=======`, `>>>>>>>` markers, then: "Pick the line you want, delete the markers, `git add notes.txt`, `git commit`. Chapter 11 does this properly, with a partner and real code."

### m2: GitHub already requires two-factor authentication

**Where:** §3.4, line 124 ("GitHub will eventually require it").

**Problem:** Since March 2023 GitHub has required 2FA for users who contribute code, rolled out in groups. "Eventually" is out of date, and a student who skips it gets locked out of pushing when their enrollment deadline passes.

**Fix:** "Turn on two-factor authentication. GitHub requires it for accounts that contribute code, so set it up when GitHub asks. An authenticator app is the best choice."

**Source:** [GitHub Docs: About mandatory two-factor authentication](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-mandatory-two-factor-authentication)

### m3: `println` and `//` comments are used before Chapter 4, and the reader is never told where the output appears

**Where:** §3.6 "Make a Real Commit", lines 292 to 298, and Practice items 1 to 3 (lines 504 to 506).

**Problem:** The Java skills progression introduces printing in Ch 4, and nothing in Ch 1 to 3 explains a `//` comment. Practice 1 asks for "a comment at the top of `Robot.java`" with no syntax given. And no step tells the student to run the program and look for "XRP Explorer starting up." (it appears in VS Code's terminal when the program runs through Simulate Robot Code), so they commit code they've never seen work. "Commit only what you've checked" is the habit worth teaching here.

**Fix:** After the snippet in §3.6, add: "`System.out.println(...)` prints one line of text; Chapter 4 explains it properly. Run the program (Chapter 2) and look in VS Code's terminal: you should see `XRP Explorer starting up.` Only then commit." In Practice 1: "A comment is a line that starts with `//`; Java ignores it. For example: `// Robot.java: the XRP Explorer's main program.`"

### m4: The README's "XRP Serial" field doesn't match Chapter 2

**Where:** Exercises, Git, README listing, line 532 ("**XRP Serial**: <your XRP's SSID, e.g. XRP-FA12>").

**Problem:** The label says serial, the hint says SSID, and the example's format doesn't match the `XRP-AAAA-BBBB` SSID Chapter 2 describes (line 186). A beginner doesn't know which to look up.

**Fix:** "- **XRP Wi-Fi name**: <your XRP's network name, for example XRP-1A2B-3C4D>"

### m5: The HTTPS callout makes claims it can't support

**Where:** §3.4 callout, lines 137 to 139 ("what GitHub recommends for new users", "Most professional developers use HTTPS for years before considering it").

**Problem:** GitHub's docs present HTTPS and SSH as equal options; the "recommends" wording isn't in the current docs [verify], and the second sentence is an unsourced generalization. The point (HTTPS is less setup) stands on its own.

**Fix:** "Git can talk to GitHub over HTTPS (as above) or SSH (with a key pair you make yourself). Both are fine. HTTPS needs less setup, so this book uses it. You can switch later."

**Source:** [GitHub Docs: About remote repositories](https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories)

## Carried over from VERIFY.md

| VERIFY # | Severity | Summary | Phase A ref |
|---|---|---|---|
| 1 | MAJOR | §3.6 snippet shows the whole `Robot()` constructor with only the print; replacing it empties the auto chooser and autonomous throws a `NullPointerException` | |
| 2 | MAJOR | `git add Robot.java` from the project root fails (`pathspec did not match`); use the full path or `git add .` (§3.6 line 317, branching exercise line 559) | |
| 3 | MAJOR [verify] | §3.10 step 4 and the README "How to Run" say Deploy; XRP code runs through Simulate Robot Code | B3 |
| 4 | MINOR | `.gitignore` description is wrong: `/build/`, and `.vscode/settings.json` is kept, not ignored | |
| 5 | MINOR | §3.7 says the project already has a README; it doesn't yet | |
| 6 | MINOR [verify] | §3.3 says the WPILib edition of VS Code usually brings Git; it doesn't | |
| 7 | MINOR [verify] | Windows PowerShell 5.1: `echo >` writes UTF-16 and `&&` fails; split the README commands and suggest Git Bash | |

VERIFY issue 3 stays MAJOR here (not BLOCKER as in Ch 2) because the root cause and its blocker rating sit in Ch 2; in Ch 3 it is the repeated workflow list and README text.

## Verdict

Chapter 3 is a strong Git introduction for beginners: the practice folder before the real project, `git diff` before every commit, and the "notes to your future self" framing are exactly right, and the `Ch<n>:` message pattern pays off in Ch 10. Its gaps are the moments a student is alone with an error: a failing `git add`, a rejected push from a second computer, a token that won't stick. Top three changes for Phase C: (1) fix the §3.6 constructor snippet and the `git add` path, which together can break autonomous and leave nothing committed (VERIFY 1 and 2); (2) add `pull.rebase false` to the one-time setup and a "push rejected" recovery callout (M1); (3) replace the classic-token instructions with a browser or Credential Manager sign-in and fine-grained token guidance (M2). With Ch 2's M1, §3.6 should also become the place the repository is first created.
