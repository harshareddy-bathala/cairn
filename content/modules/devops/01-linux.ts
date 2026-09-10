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
          title: "OverTheWire — Bandit levels 0–8",
          url: "https://overthewire.org/wargames/bandit/",
          kind: "lab",
          minutes: 90,
          whyThisOne:
            "The assignment, not a suggestion. It teaches file navigation by making you actually need it.",
          isPrimary: true,
        },
        {
          title: "The Linux Command Line — ch. 2–4 (Shotts, free PDF)",
          url: "https://linuxcommand.org/tlcl.php",
          kind: "read",
          minutes: 45,
          whyThisOne: "The clearest written treatment of the hierarchy, and it is free.",
        },
      ],
    },
    {
      slug: "devops-linux-permissions",
      title: "Permissions, ownership & the special bits",
      objective:
        "Convert between rwx and octal instantly, and explain what SUID actually does to a running process.",
      estMinutes: 60,
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
          title: "Red Hat — Linux file permissions explained",
          url: "https://www.redhat.com/en/blog/linux-file-permissions-explained",
          kind: "read",
          minutes: 25,
          whyThisOne: "Covers SUID, SGID and the sticky bit, which most permissions tutorials leave out.",
          isPrimary: true,
        },
        {
          title: "OverTheWire — Bandit levels 9–15",
          url: "https://overthewire.org/wargames/bandit/",
          kind: "lab",
          minutes: 90,
          whyThisOne: "Where permissions and SSH keys stop being theory.",
        },
      ],
    },
    {
      slug: "devops-linux-text",
      title: "Text processing: grep, sed, awk, pipes",
      objective:
        "Answer a question about a log file with one pipeline, without reaching for a script.",
      estMinutes: 90,
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
          title: "The Linux Command Line — ch. 6–7, 19–20 (Shotts)",
          url: "https://linuxcommand.org/tlcl.php",
          kind: "read",
          minutes: 60,
          whyThisOne: "Redirection and expansion explained properly, once, so you stop guessing.",
          isPrimary: true,
        },
        {
          title: "GNU grep manual — regular expressions",
          url: "https://www.gnu.org/software/grep/manual/grep.html#Regular-Expressions",
          kind: "docs",
          whyThisOne: "The basic-vs-extended regex distinction is the source of most grep confusion.",
        },
      ],
    },
    {
      slug: "devops-linux-processes",
      title: "Processes, signals & the /proc window",
      objective:
        "Explain SIGTERM versus SIGKILL convincingly, and identify a zombie versus an orphan.",
      estMinutes: 90,
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
          title: "Linux Journey — Processes",
          url: "https://linuxjourney.com/lesson/monitor-processes-ps-command",
          kind: "read",
          minutes: 30,
          whyThisOne: "Walks through reading process state with ps; the signal half of this unit is covered by man 7 signal below.",
          isPrimary: true,
        },
        {
          title: "man 7 signal",
          url: "https://man7.org/linux/man-pages/man7/signal.7.html",
          kind: "docs",
          whyThisOne: "The authoritative table. Read the default-action column.",
        },
      ],
    },
    {
      slug: "devops-linux-systemd",
      title: "systemd: write your own service",
      objective:
        "Write, enable and debug a .service unit of your own, and read its logs with journalctl.",
      estMinutes: 90,
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
          title: "systemd.service — man page",
          url: "https://www.freedesktop.org/software/systemd/man/systemd.service.html",
          kind: "docs",
          minutes: 30,
          whyThisOne: "The Type= section alone resolves most first-service confusion.",
          isPrimary: true,
        },
        {
          title: "Arch Wiki — systemd",
          url: "https://wiki.archlinux.org/title/Systemd",
          kind: "read",
          minutes: 30,
          whyThisOne: "The best practical writeup anywhere, and you are already on Arch.",
        },
      ],
    },
    {
      slug: "devops-linux-bash",
      title: "Bash scripting that does not betray you",
      objective:
        "Write a script with strict mode, argument parsing, exit codes and a trap — and explain each.",
      estMinutes: 90,
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
          title: "Google Shell Style Guide",
          url: "https://google.github.io/styleguide/shellguide.html",
          kind: "read",
          minutes: 35,
          whyThisOne:
            "Opinionated and short. Following it makes your sentinel scripts look professionally written.",
          isPrimary: true,
        },
        {
          title: "ShellCheck",
          url: "https://www.shellcheck.net/",
          kind: "do",
          whyThisOne:
            "Run every script through it. It catches the quoting bugs you cannot yet see, and teaches while it does.",
        },
      ],
    },
  ],
};
