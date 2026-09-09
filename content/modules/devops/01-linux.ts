import type { Module } from "@/content/types";

export const linuxFoundations: Module = {
  slug: "devops-linux-foundations",
  trackSlug: "devops",
  phaseSlug: "foundations",
  order: 1,
  title: "Linux, seriously deep",
  summary:
    "Your WSA/LSA subject is the floor, not the ceiling. This is the module that makes the rest of the DevOps track possible — and Bandit is the assignment, not the optional extra.",
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
      resources: [
        {
          title: "Linux Journey — Permissions",
          url: "https://linuxjourney.com/lesson/file-permissions",
          kind: "read",
          minutes: 25,
          whyThisOne: "Short, interactive, and covers the special bits most tutorials skip.",
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
      resources: [
        {
          title: "Linux Journey — Processes",
          url: "https://linuxjourney.com/lesson/monitor-processes-ps-command",
          kind: "read",
          minutes: 30,
          whyThisOne: "Covers states, ps, and signals at exactly the depth an SRE screen asks for.",
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

**Quote every variable expansion.** \`"$var"\`, not \`$var\`. Unquoted expansion word-splits on spaces and is the single most common bash bug.

\`trap 'rm -f "$tmp"' EXIT\` guarantees cleanup on any exit path. Exit codes matter: 0 is success, anything else is failure, and \`$?\` holds the last one.`,
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
