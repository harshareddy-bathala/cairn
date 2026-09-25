import type { Module } from "@/content/types";

export const linuxFoundations: Module = {
  slug: "devops-linux-foundations",
  trackSlug: "devops",
  phaseSlug: "foundations",
  order: 1,
  title: "Linux, seriously deep",
  summary:
    "A university operating-systems course teaches the concepts; this teaches the shell you will actually sit in front of. Everything later in the track — containers, networking, CI — assumes these commands are automatic. Bandit is the assignment, not the optional extra.",
  units: [
    {
      slug: "devops-linux-fs",
      title: "Filesystem, inodes & links",
      objective:
        "Read `ls -la` output field by field, and explain a hard link versus a symlink at the inode level.",
      estMinutes: 60,
      primer: `On Linux everything lives in **one tree of folders** starting at \`/\` (the "root"). There is no \`C:\` drive: disks, USB sticks and even information about the running system appear somewhere inside that one tree.

A few folders to know by name: \`/home/you\` is your stuff, \`/etc\` holds configuration files, \`/var/log\` holds logs, \`/tmp\` is scratch space, and \`/proc\` is not on disk at all — it is the kernel showing you live information as if it were files.

You move around with \`pwd\` (where am I?), \`ls\` (what is here?) and \`cd\` (go there). \`ls -l\` shows details for each file: its permissions, owner, size and date.

Under the hood a file's name and its contents are stored separately. That split is why Linux has two kinds of link: a **hard link** is a second name for the same data, a **symbolic link** is a signpost pointing at another name.

**You need already:** a terminal open on your machine. Nothing else.`,
      conceptMd: `The filesystem hierarchy is not arbitrary: \`/etc\` is configuration, \`/var\` is state that changes, \`/proc\` is a window into the kernel, \`/usr\` is read-only program data.

An **inode** holds a file's metadata and block pointers — everything except its name. A directory entry maps a name to an inode number. That single fact explains both link types: a **hard link** is a second directory entry pointing at the same inode (so the file survives deleting either name, and the link count in \`ls -l\` is what tracks it), while a **symlink** is a tiny file containing a *path*, which is why it breaks when the target moves.

Be able to read every field of \`ls -la\`: type character, permission triads, link count, owner, group, size, mtime.`,
      interviewAngle:
        "`What is the difference between a hard link and a symlink?` is a standard opener for " +
        "any ops role. Answering at the inode level rather than by behaviour is what makes it a " +
        "good answer.",
      pitfalls: [
        "Explaining links by what they do rather than what they are. The inode is the " +
          "explanation; the behaviour follows from it.",
        "Assuming a symlink survives the target moving. It stores a path, so it does not.",
        "Misreading the second field of `ls -l` as file size. It is the link count.",
      ],
      recall: [
        {
          front: "What does an inode hold, and what does it conspicuously not hold?",
          back:
            "All of a file's metadata and its block pointers — everything except the name. The " +
            "name lives in a directory entry that maps it to an inode number.",
        },
        {
          front: "Hard link versus symlink, at the inode level.",
          back:
            "A hard link is a second directory entry pointing at the same inode, so the data " +
            "survives deleting either name and the link count tracks how many names exist. A " +
            "symlink is a small file containing a path, so it breaks when the target moves.",
        },
        {
          front: "What lives in `/etc`, `/var` and `/proc`?",
          back:
            "`/etc` is configuration, `/var` is state that changes at runtime, and `/proc` is a " +
            "virtual filesystem that is a window into the kernel rather than files on disk.",
        },
      ],
      resources: [
        {
          title: "LinuxCommand — Lesson 2: Navigation",
          url: "https://linuxcommand.org/lc3_lts0020.php",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Short, gentle and hands-on: the tree, where you are in it, and how to move — typed at a real prompt.",
          steps: [
            "Read **File System Organization**, then type every `pwd`, `cd` and `ls` example in your own terminal.",
            "Read **A Few Shortcuts** and **Important facts about file names**.",
            "Continue straight into Lesson 4, *A Guided Tour* (next link).",
          ],
          isPrimary: true,
        },
        {
          title: "LinuxCommand — Lesson 4: A Guided Tour",
          url: "https://linuxcommand.org/lc3_lts0040.php",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Walks the standard folders one by one, and ends on symbolic links — *A weird kind of file…*.",
        },
        {
          title: "OverTheWire — Bandit, level 0",
          url: "https://overthewire.org/wargames/bandit/bandit0.html",
          kind: "lab",
          minutes: 60,
          whyThisOne:
            "The assignment: a game you play over SSH where every level needs the commands from this unit. Clear levels 0 to 8.",
          steps: [
            "Follow the level page to log in over SSH; each level's page says where the next password is.",
          ],
        },
      ],
    },
    {
      slug: "devops-linux-permissions",
      title: "Permissions, ownership & the special bits",
      objective:
        "Convert between rwx and octal instantly, and explain what SUID actually does to a running process.",
      estMinutes: 60,
      primer: `Linux is built for many users sharing one machine, so every file records **who owns it** and **who may do what** with it.

There are three kinds of access — **r**ead, **w**rite, e**x**ecute — given separately to three groups of people: the file's **owner**, its **group**, and **everyone else**. \`ls -l\` shows this as \`rwxr-xr--\`: owner can do all three, group can read and run, others can only read.

The same thing is often written as three digits, where r = 4, w = 2, x = 1 are added up per group: \`rwxr-xr--\` is \`754\`. \`chmod\` changes permissions; \`chown\` changes the owner; \`sudo\` runs one command as the all-powerful \`root\` user.

**You need already:** moving around with \`cd\` and \`ls -l\` from the last unit.`,
      conceptMd: `Three triads — owner, group, other — each \`rwx\`, each a bit: r=4, w=2, x=1. So \`755\` is \`rwxr-xr-x\`.

On a **directory** the bits mean something different and this is the part people get wrong: \`x\` means you may traverse into it, \`r\` means you may list its contents. A directory with \`x\` but no \`r\` lets you open a file whose name you already know but not discover it.

\`umask\` subtracts from the default creation mode. The special bits: **SUID** runs the file with the *owner's* privileges (this is how \`passwd\` writes to \`/etc/shadow\`), **SGID** on a directory makes new files inherit its group, and the **sticky bit** on \`/tmp\` stops you deleting other people's files.`,
      interviewAngle:
        "The directory question is the one that separates memorisation from understanding: what " +
        "do r and x mean on a directory, as opposed to a file?",
      pitfalls: [
        "Carrying the file meaning of `r` and `x` over to directories. On a directory `x` is " +
          "traverse and `r` is list — they are not the same permission.",
        "Thinking `umask` adds permissions. It subtracts from the default creation mode.",
        "Describing SUID as `runs as root`. It runs as the file's *owner*, which is often but " +
          "not always root.",
      ],
      recall: [
        {
          front: "On a directory, what do `r` and `x` each permit?",
          back:
            "`x` permits traversing into it — opening a file whose name you already know. `r` " +
            "permits listing its contents. A directory with `x` but not `r` allows the first " +
            "and forbids the second.",
        },
        {
          front:
            "What does SUID actually do to a running process, and give the canonical example.",
          back:
            "It runs the executable with the privileges of the file's owner rather than the " +
            "invoking user. `passwd` is SUID root, which is how an unprivileged user can write " +
            "to `/etc/shadow`.",
        },
        {
          front: "What is `755` in rwx notation, and how do you get there?",
          back: "`rwxr-xr-x`. Each triad is r=4, w=2, x=1, so 7 is rwx and 5 is r-x.",
        },
        {
          front: "What does the sticky bit on `/tmp` accomplish?",
          back:
            "It restricts deletion within the directory to the file's owner, so a " +
            "world-writable directory does not let anyone delete anyone else's files.",
        },
      ],
      resources: [
        {
          title: "LinuxCommand — Lesson 9: Permissions",
          url: "https://linuxcommand.org/lc3_lts0090.php",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Permissions from zero, with chmod in both the letter and the number form.",
          steps: [
            "Read **File Permissions** and decode three lines of your own `ls -l` output.",
            "Read **chmod**; make a script file, try to run it, `chmod 755` it, and run it again.",
            "Read **Directory Permissions** — `x` on a folder means *you may enter it*.",
            "Read **Becoming the Superuser** and **Changing File Ownership**.",
          ],
          isPrimary: true,
        },
        {
          title: "Red Hat — Linux file permissions explained",
          url: "https://www.redhat.com/en/blog/linux-file-permissions-explained",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "Adds the three special bits — SUID, SGID and sticky — that most tutorials leave out.",
        },
        {
          title: "OverTheWire — Bandit, level 10",
          url: "https://overthewire.org/wargames/bandit/bandit10.html",
          kind: "lab",
          minutes: 60,
          whyThisOne:
            "Levels 9 to 15, where permissions and SSH keys stop being theory.",
        },
      ],
    },
    {
      slug: "devops-linux-text",
      title: "Text processing: grep, sed, awk, pipes",
      objective:
        "Answer a question about a log file with one pipeline, without reaching for a script.",
      estMinutes: 90,
      primer: `Most of operations work is **reading text**: logs, config files, command output. Linux has small tools that each do one job, and you join them into a **pipeline** with \`|\`, which feeds one command's output into the next command's input.

- \`grep\` keeps only the lines that match a pattern: \`grep error app.log\`.
- \`sort\` and \`uniq -c\` group and count identical lines.
- \`cut\` and \`awk\` pull out one column; \`sed\` finds and replaces text.
- \`>\` saves output to a file; \`<\` reads input from one.

So "which 5 IP addresses hit the server most?" is one line: pull out the IP column, sort, count, sort by count, show the top 5. Build such a line one stage at a time, checking the output after each \`|\`.

**You need already:** moving around the filesystem.`,
      conceptMd: `This is the daily work of operations. Build the pipeline left to right, checking the output at each stage before adding the next.

\`grep -rniE\` covers most searching: recursive, case-insensitive, with line numbers, extended regex. \`cut\` splits fixed-delimiter fields; \`awk '{print $2}'\` handles whitespace columns and does arithmetic. \`sed 's/a/b/g'\` substitutes.

The canonical SRE one-liner is worth memorising as a shape — *top talkers in a log*:

\`\`\`
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head
\`\`\`

Also get redirection exactly right: \`>\` truncates, \`>>\` appends, \`2>&1\` sends stderr to wherever stdout currently points — **and order matters**, because \`cmd > f 2>&1\` and \`cmd 2>&1 > f\` do different things.`,
      interviewAngle:
        "You will be handed a log file and asked a question about it. Building the pipeline out " +
        "loud, stage by stage, is the demonstration — not knowing awk syntax by heart.",
      pitfalls: [
        "Getting redirection order wrong. `cmd > f 2>&1` sends both streams to the file; `cmd " +
          "2>&1 > f` sends stderr to the *old* stdout and only stdout to the file.",
        "Using `>` when you meant `>>`. The first truncates the file before the command even " +
          "runs.",
        "Confusing basic and extended regex. `grep` needs `-E` (or backslashed " +
          "metacharacters) for `+`, `?` and `|`.",
        "Writing a script when one pipeline would do. Build it left to right and check the " +
          "output at every stage.",
      ],
      recall: [
        {
          front: "Write the top-talkers pipeline for a log file, and say what each stage does.",
          back:
            "`awk '{print $1}' access.log | sort | uniq -c | sort -rn | head` — extract the " +
            "first field, sort so equal values are adjacent, count runs, sort by count " +
            "descending, take the top.",
        },
        {
          front: "Why does `uniq -c` need a `sort` before it?",
          back:
            "`uniq` only collapses *adjacent* duplicate lines, so unsorted input leaves the " +
            "same value counted in several separate runs.",
        },
        {
          front: "What is the difference between `cmd > f 2>&1` and `cmd 2>&1 > f`?",
          back:
            "The first sends stdout to the file and then points stderr at the same place, so " +
            "both land in f. The second points stderr at the terminal (where stdout still is), " +
            "then redirects only stdout to f.",
        },
      ],
      resources: [
        {
          title: "LinuxCommand — Lesson 7: I/O Redirection",
          url: "https://linuxcommand.org/lc3_lts0070.php",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Redirection and pipelines from the start, then the filter commands that go in them.",
          steps: [
            "Read **Standard Output** and **Standard Input**; try `>`, `>>` and `<` yourself.",
            "Read **Pipelines** and **Filters**.",
            "Work **Performing tasks with pipelines**, typing each example.",
            "Then build the top-5-IP pipeline from the notes on any log file you have.",
          ],
          isPrimary: true,
        },
        {
          title: "DigitalOcean — Using grep and regular expressions",
          url: "https://www.digitalocean.com/community/tutorials/using-grep-regular-expressions-to-search-for-text-patterns-in-linux",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "grep's everyday options, then regular expressions one idea at a time.",
        },
        {
          title: "DigitalOcean — How to use AWK",
          url: "https://www.digitalocean.com/community/tutorials/how-to-use-the-awk-language-to-manipulate-text-in-linux",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "awk for pulling out and adding up columns — the part of awk you will actually use.",
        },
      ],
    },
    {
      slug: "devops-linux-processes",
      title: "Processes, signals & the /proc window",
      objective:
        "Explain SIGTERM versus SIGKILL convincingly, and identify a zombie versus an orphan.",
      estMinutes: 90,
      primer: `A **process** is a program that is running. Each has a number, its **PID**, and a parent — the process that started it. \`ps aux\` lists them all; \`top\` shows them live.

You talk to a running process by sending it a **signal**, a small numbered message. The two that matter most:

- **SIGTERM** (15, what plain \`kill PID\` sends): "please shut down". The program can catch it, save its work and exit cleanly.
- **SIGKILL** (9, \`kill -9 PID\`): the kernel stops the process immediately. It cannot be caught, so nothing gets cleaned up.

Always try SIGTERM first. A **zombie** is a process that has finished but whose parent has not yet collected its exit status; an **orphan** is one whose parent died first.

**You need already:** using the terminal comfortably.`,
      conceptMd: `A process is created by **fork** (a copy of the parent) followed by **exec** (replacing its image). That model explains PID, PPID, and why a shell can set up redirection before the program starts.

**SIGTERM (15)** politely asks a process to shut down — it can be caught, so the process flushes buffers, closes connections, and exits cleanly. **SIGKILL (9)** cannot be caught or ignored; the kernel destroys the process immediately, with no cleanup. Reaching for \`kill -9\` first is a genuine interview tell. This is also exactly why a container gets SIGTERM and a grace period before SIGKILL.

A **zombie** has exited but its parent has not reaped its exit status — it holds a PID and nothing else, and the fix is to fix the parent. An **orphan** lost its parent and was re-parented to init/systemd, which reaps it correctly. Zombies are a bug; orphans are normal.`,
      interviewAngle:
        "`SIGTERM versus SIGKILL` is asked constantly, and reaching for `kill -9` first is a " +
        "real tell. The container grace-period connection is the answer that shows you have " +
        "operated something.",
      pitfalls: [
        "Trying to kill a zombie. It has already exited — the fix is to fix (or restart) the " +
          "parent that is not reaping it.",
        "Treating orphans as a problem. They are re-parented to init and reaped correctly; " +
          "that is normal.",
        "Reaching for `kill -9` before `kill`. SIGKILL skips every cleanup path — no flushed " +
          "buffers, no closed connections.",
      ],
      recall: [
        {
          front: "SIGTERM versus SIGKILL — what is the operational difference?",
          back:
            "SIGTERM (15) can be caught, so the process flushes buffers, closes connections and " +
            "exits cleanly. SIGKILL (9) cannot be caught or ignored; the kernel destroys the " +
            "process with no cleanup at all.",
        },
        {
          front: "Zombie versus orphan: which is a bug, and why?",
          back:
            "A zombie has exited but its parent has not reaped its exit status, so it holds a " +
            "PID forever — that is a bug in the parent. An orphan simply lost its parent and " +
            "was re-parented to init, which reaps it correctly; that is normal.",
        },
        {
          front: "What do fork and exec each do, and why does the split matter?",
          back:
            "`fork` copies the parent process; `exec` replaces the process image with a new " +
            "program. The gap between them is where a shell sets up redirection and file " +
            "descriptors before the program starts.",
        },
        {
          front: "Why does a container runtime send SIGTERM and wait before sending SIGKILL?",
          back:
            "It is the same contract: the grace period gives the process a chance to shut down " +
            "cleanly, and SIGKILL is the guarantee that it stops regardless.",
        },
      ],
      resources: [
        {
          title: "LinuxCommand — Lesson 10: Job Control",
          url: "https://linuxcommand.org/lc3_lts0100.php",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Running, listing and stopping processes at a real prompt, with kill and its signals introduced gently.",
          steps: [
            "Work through **A Practical Example** and **Putting a Program into the Background**.",
            "Read **Listing Running Processes**; run `ps` and `ps aux | head` yourself.",
            "Read **Killing a Process** and **A Little More About kill**.",
            "Start `sleep 300 &`, then stop it with SIGTERM and check it is gone.",
          ],
          isPrimary: true,
        },
        {
          title: "man 7 signal",
          url: "https://man7.org/linux/man-pages/man7/signal.7.html",
          kind: "docs",
          whyThisOne:
            "The official table of signals. Read the *Standard signals* table and its default-action column.",
        },
      ],
    },
    {
      slug: "devops-linux-systemd",
      title: "systemd: write your own service",
      objective:
        "Write, enable and debug a .service unit of your own, and read its logs with journalctl.",
      estMinutes: 90,
      primer: `Servers need programs that start by themselves at boot, restart if they crash, and keep logs. On most Linux systems that job belongs to **systemd**.

You describe a program to systemd in a small text file called a **unit**, usually \`something.service\`: what command to run, and when. Then:

- \`systemctl start name\` runs it now; \`systemctl stop name\` stops it.
- \`systemctl enable name\` makes it start at every boot (separate from starting it now).
- \`systemctl status name\` shows whether it is running and its last few log lines.
- \`journalctl -u name\` shows its full log.

In this unit you write a \`.service\` file for a small script of your own and watch systemd run it.

**You need already:** processes and signals from the last unit, and editing a file with \`sudo\`.`,
      conceptMd: `A **unit** is a declarative description of something systemd manages. \`.service\` runs a process, \`.timer\` schedules one, \`.socket\` activates on connection.

The distinction that gets asked: \`systemctl start\` runs it **now**; \`systemctl enable\` makes it run **at boot**. They are independent — \`enable --now\` does both.

Minimal service:

\`\`\`ini
[Unit]
Description=Sentinel metrics collector
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/sentinel collect
User=sentinel

[Install]
WantedBy=multi-user.target
\`\`\`

\`journalctl -u sentinel -f\` follows its logs. Prefer a **systemd timer** over cron for anything new: timers get logging, dependency ordering, and catch-up after downtime for free.

This unit is a direct prerequisite for shipping \`sentinel\` — you will write this file for real.`,
      interviewAngle:
        "`What is the difference between start and enable?` is the systemd question that gets " +
        "asked, because it separates people who have run a service from people who have read " +
        "about one.",
      pitfalls: [
        "Assuming `systemctl start` survives a reboot. It does not — that is `enable`. " +
          "`enable --now` does both.",
        "Reaching for cron for anything new. A timer gets logging, dependency ordering and " +
          "catch-up after downtime for free.",
        "Forgetting `[Install] WantedBy=`. Without it `enable` has nothing to hook the unit " +
          "into.",
      ],
      recall: [
        {
          front: "`systemctl start` versus `systemctl enable` — what does each do?",
          back:
            "`start` runs the unit now; `enable` makes it run at boot. They are independent, " +
            "and `enable --now` does both.",
        },
        {
          front:
            "Which three sections does a minimal `.service` file have, and what does each " +
            "carry?",
          back:
            "`[Unit]` for description and ordering (`After=`), `[Service]` for how to run it " +
            "(`Type=`, `ExecStart=`, `User=`), and `[Install]` for what enabling hooks it into " +
            "(`WantedBy=multi-user.target`).",
        },
        {
          front: "Why prefer a systemd timer over a cron job for new work?",
          back:
            "Timers get journal logging, dependency ordering against other units, and catch-up " +
            "runs after downtime — none of which cron provides.",
        },
        {
          front: "How do you follow a unit's logs?",
          back: "`journalctl -u <unit> -f`.",
        },
      ],
      resources: [
        {
          title: "DigitalOcean — Managing services with systemctl",
          url: "https://www.digitalocean.com/community/tutorials/how-to-use-systemctl-to-manage-systemd-services-and-units",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "The everyday commands, each explained and shown with its output — start, stop, enable, status.",
          steps: [
            "Read the service-management parts: starting and stopping, restarting, enabling and disabling, and checking status.",
            "Try each command on a real service, such as `sshd` or `NetworkManager`.",
            "Read how to view a unit file with `systemctl cat`.",
            "Then write your own unit using the example in the notes.",
          ],
          isPrimary: true,
        },
        {
          title: "DigitalOcean — Understanding systemd units and unit files",
          url: "https://www.digitalocean.com/community/tutorials/understanding-systemd-units-and-unit-files",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "What goes in the `[Unit]`, `[Service]` and `[Install]` sections, so your own file makes sense line by line.",
        },
        {
          title: "DigitalOcean — Using journalctl",
          url: "https://www.digitalocean.com/community/tutorials/how-to-use-journalctl-to-view-and-manipulate-systemd-logs",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "Reading a service's logs: `-u`, `-f` and time filters — how you debug a unit that will not start.",
        },
      ],
    },
    {
      slug: "devops-linux-bash",
      title: "Bash scripting that does not betray you",
      objective:
        "Write a script with strict mode, argument parsing, exit codes and a trap — and explain each.",
      estMinutes: 90,
      primer: `A **shell script** is a text file of commands that run one after another, like typing them yourself. It starts with \`#!/usr/bin/env bash\`, you make it runnable with \`chmod +x\`, and you run it with \`./script.sh\`.

Scripts get variables (\`name="x"\`, used as \`"$name"\`), arguments (\`$1\`, \`$2\`), \`if\` tests and loops — a small programming language.

The danger: by default bash **keeps going after a command fails**, so a script can half-work and report success. Three settings at the top — \`set -euo pipefail\` — make it stop at the first error instead. That line, plus always writing variables in double quotes, prevents most script disasters.

**You need already:** the commands from the earlier Linux units.`,
      conceptMd: `Start every script with the line that separates working scripts from hopeful ones:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
\`\`\`

\`-e\` exits on any failing command, \`-u\` on an undefined variable, \`-o pipefail\` makes a pipeline fail if *any* stage fails rather than only the last. Without pipefail, \`false | true\` succeeds — which is how silent data loss happens in a backup script.

**Quote every variable expansion.** \`"$var"\`, not \`$var\`. Unquoted expansion word-splits on spaces, so a script works until a filename contains one.

\`trap 'rm -f "$tmp"' EXIT\` guarantees cleanup on any exit path. Exit codes matter: 0 is success, anything else is failure, and \`$?\` holds the last one.`,
      interviewAngle:
        "Handed a script to review, the things to name are the missing strict mode and the " +
        "unquoted expansions. Both are one-line fixes and both cause real incidents.",
      pitfalls: [
        "Omitting `-o pipefail`. Without it `false | true` succeeds, which is exactly how a " +
          "backup script silently loses data.",
        "Leaving a variable expansion unquoted. It word-splits, so the script works until a " +
          "filename contains a space.",
        "Cleaning up on the happy path only. `trap ... EXIT` is what makes cleanup run on " +
          "every exit path.",
        "Using `set -e` and assuming it catches everything. It does not fire inside " +
          "conditions, in `||` chains, or for a command whose failure is tested.",
      ],
      recall: [
        {
          front: "What do the three flags in `set -euo pipefail` each do?",
          back:
            "`-e` exits on any failing command, `-u` errors on an undefined variable, and `-o " +
            "pipefail` makes a pipeline fail if any stage fails rather than only the last.",
        },
        {
          front: "Why does `set -e` alone let a broken pipeline succeed?",
          back:
            "Without `pipefail` a pipeline's exit status is only that of its last command, so " +
            "`false | true` returns 0 and `-e` sees nothing wrong.",
        },
        {
          front: "Why must every variable expansion be quoted?",
          back:
            "Unquoted expansion is word-split and glob-expanded, so `$file` breaks the moment a " +
            "filename contains a space — quietly, and usually in production.",
        },
        {
          front: "How do you guarantee a temporary file is cleaned up on every exit path?",
          back:
            "`trap 'rm -f \"$tmp\"' EXIT` — it runs on normal exit, on error, and on the signals " +
            "that terminate the script.",
        },
      ],
      resources: [
        {
          title: "LinuxCommand — Writing your first script",
          url: "https://linuxcommand.org/lc3_wss0010.php",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "A first script, from the empty file to running it, with each step explained.",
          steps: [
            "Write and run the script exactly as the lesson shows.",
            "Add `set -euo pipefail` after the first line, then read the next link on what it changes.",
            "Paste your script into ShellCheck (last link) and fix whatever it flags.",
          ],
          isPrimary: true,
        },
        {
          title: "Bash strict mode",
          url: "http://redsymbol.net/articles/unofficial-bash-strict-mode/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "What each part of `set -euo pipefail` does, with the failure it prevents.",
        },
        {
          title: "ShellCheck",
          url: "https://www.shellcheck.net/",
          kind: "do",
          whyThisOne:
            "Paste any script in and it points out the quoting and logic bugs you cannot yet see, with an explanation for each.",
        },
      ],
    },
  ],
};
