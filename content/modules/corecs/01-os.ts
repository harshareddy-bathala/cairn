import type { Module } from "@/content/types";

export const os: Module = {
  slug: "corecs-os",
  trackSlug: "corecs",
  phaseSlug: "foundations",
  order: 1,
  title: "Operating systems",
  summary:
    "Heavily tested in both tracks, and it is the theory underneath everything in the DevOps module. Every concept here has a Linux command that makes it concrete — use them.",
  units: [
    {
      slug: "corecs-os-processes",
      title: "Processes, threads & context switching",
      objective:
        "Distinguish process from thread precisely, and explain what a context switch costs.",
      estMinutes: 60,
      conceptMd: `A **process** has its own address space. A **thread** is a unit of scheduling *within* a process, sharing the address space with its siblings.

The consequences follow: threads communicate through shared memory (fast, but needs synchronisation), processes need IPC (slower, but isolated); a crashing thread takes the whole process with it, a crashing process does not affect others; and switching between threads of one process is cheaper than switching processes because the memory mappings do not change.

**Context switching** costs: save registers, save the program counter, switch the stack, and — for a process switch — swap page tables, which flushes much of the TLB. That last part is why process switches are meaningfully more expensive.

The **PCB** holds this per-process state: PID, state, program counter, registers, memory limits, open file table.

Process states: **new → ready → running → waiting → terminated.** Map them onto what \`ps\` shows you: R (running/runnable), S (interruptible sleep), D (uninterruptible sleep, usually blocked on IO — and notably you cannot kill a D-state process), Z (zombie), T (stopped).`,
      resources: [
        {
          title: "OSTEP — Processes & the Process API (ch. 4–5)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
          kind: "read",
          minutes: 50,
          whyThisOne: "The best free OS textbook, and it is written to be read rather than referenced.",
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — OS last-minute notes",
          url: "https://www.geeksforgeeks.org/last-minute-notes-operating-systems/",
          kind: "read",
          minutes: 25,
          whyThisOne: "Your revision pass. Use it to check recall, not to learn from the first time.",
        },
      ],
    },
    {
      slug: "corecs-os-scheduling",
      title: "CPU scheduling",
      objective:
        "Solve Gantt-chart problems by hand for FCFS, SJF, SRTF, Round Robin and priority.",
      estMinutes: 75,
      conceptMd: `Written tests give you a process table and want average waiting and turnaround time. Practise until this is mechanical — it is free marks.

**FCFS** — simple, and suffers the **convoy effect** where one long job delays everything behind it.
**SJF** — provably optimal average waiting time, but it needs knowledge of burst lengths (so it is estimated in practice) and can starve long jobs.
**SRTF** — preemptive SJF.
**Round Robin** — each process gets a time quantum. Fair and responsive; too small a quantum wastes time on context switches, too large and it degenerates to FCFS.
**Priority** — can starve low-priority processes, which is fixed by **ageing** (raising priority over time).

The definitions to keep straight: **turnaround = completion − arrival**, **waiting = turnaround − burst**, **response = first CPU − arrival**. Interactive systems optimise response time; batch systems optimise throughput.

Linux's CFS is a useful modern counterpoint: it tracks virtual runtime and always runs the process that has had the least, which approximates fair sharing without fixed quanta. Mentioning it shows you connect theory to the system you actually use.`,
      resources: [
        {
          title: "OSTEP — Scheduling (ch. 7–9)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
          kind: "read",
          minutes: 45,
          whyThisOne: "Derives each policy from what it is trying to optimise, so the trade-offs stay memorable.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "corecs-os-concurrency",
      title: "Concurrency: race conditions, mutexes & semaphores",
      objective:
        "Identify a race condition, and choose correctly between a mutex and a semaphore.",
      estMinutes: 75,
      conceptMd: `A **race condition** is when the result depends on thread timing. The canonical example is \`count++\` — three machine operations (load, add, store), so two threads can interleave and lose an increment. A **critical section** is the code that must not be entered concurrently.

Correct mutual exclusion needs three properties: **mutual exclusion** (one at a time), **progress** (if nobody is inside, someone gets in), and **bounded waiting** (no indefinite starvation).

**Mutex** — binary, and it has an *owner*: the thread that locked it must unlock it. Use it for mutual exclusion.
**Semaphore** — a counter with wait/signal, no ownership, so it can be signalled by a different thread. Use it for **signalling** and for limiting access to N identical resources.

That ownership distinction is the answer to "what is the difference?", and it is a better answer than "a mutex is a semaphore with count 1".

**Producer–consumer** is the standard exercise: a mutex for the buffer plus two counting semaphores (empty slots, full slots). Write it once.

Also know **spinlock** (busy-waits — right only for very short critical sections on multicore) and **condition variable** (wait until a predicate holds, always paired with a mutex).`,
      resources: [
        {
          title: "OSTEP — Concurrency (ch. 26–31)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
          kind: "read",
          minutes: 60,
          whyThisOne: "The clearest treatment of locks, semaphores and condition variables anywhere, and free.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "corecs-os-deadlock",
      title: "Deadlock",
      objective:
        "State the four necessary conditions and explain prevention, avoidance and detection.",
      estMinutes: 60,
      conceptMd: `**Four conditions, all required simultaneously** — break any one and deadlock is impossible:

1. **Mutual exclusion** — resources are non-shareable.
2. **Hold and wait** — a process holds one resource while requesting another.
3. **No preemption** — resources cannot be forcibly taken.
4. **Circular wait** — a cycle in the wait-for graph.

**Prevention** attacks a condition structurally. The practical one is breaking circular wait by imposing a **global lock ordering** — always acquire locks in the same order. That single rule prevents most real deadlocks in real code.

**Avoidance** uses advance knowledge of maximum needs — the **Banker's algorithm**, which grants a request only if the resulting state is safe. Know how to run it by hand for exams; know that it is essentially unused in practice because the maximum-claims requirement is unrealistic.

**Detection and recovery** lets deadlock happen, finds cycles in the wait-for graph, and recovers by killing or rolling back a process. This is what databases actually do — Postgres detects deadlocks and aborts one transaction with a specific error, which connects straight to the isolation-levels unit in DBMS.`,
      resources: [
        {
          title: "GeeksforGeeks — deadlock and Banker's algorithm",
          url: "https://www.geeksforgeeks.org/deadlock-in-operating-system/",
          kind: "read",
          minutes: 35,
          whyThisOne: "Worked Banker's examples in the exam format you will actually be tested in.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "corecs-os-memory",
      title: "Memory management, paging & virtual memory",
      objective:
        "Explain virtual to physical translation, solve page-replacement problems, and define thrashing.",
      estMinutes: 75,
      conceptMd: `**Virtual memory** gives every process the illusion of a large private address space. Addresses are split into a page number and an offset; the page table maps the page number to a physical frame. The **TLB** caches recent translations, because otherwise every memory access would need an extra memory access to read the page table.

A **page fault** occurs when the page is not resident: the OS traps, fetches from disk, updates the table, and resumes the instruction. It is *slow* — microseconds versus nanoseconds — which is why locality of reference dominates real performance.

**Page replacement** algorithms for exam problems: **FIFO** (and note **Belady's anomaly** — more frames can mean more faults, which is the trick question), **Optimal** (evict the page used furthest in the future — unimplementable, used as a benchmark), and **LRU** (evict least recently used; the practical choice, approximated in real kernels with a reference bit because true LRU is too expensive).

**Thrashing** is when a process has too few frames, so it spends more time paging than executing. CPU utilisation collapses, and a naive scheduler responds by admitting *more* processes, making it worse. The fix is the working-set model: give each process enough frames for its active set, or swap some processes out entirely.

Internal fragmentation is wasted space inside a page; external fragmentation is what segmentation suffers and paging avoids.`,
      resources: [
        {
          title: "OSTEP — Virtualizing Memory (ch. 13–22)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
          kind: "read",
          minutes: 60,
          whyThisOne: "Builds from base-and-bounds up to full paging, so translation stops being memorised.",
          isPrimary: true,
        },
      ],
    },
  ],
};
