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
      primer: `The **operating system** (OS) is the program that shares one computer between many programs, so that each one believes it has the machine to itself.

A **process** is a running program: its code, its memory, the files it has open, and where it is in its execution. Your browser and your terminal are separate processes, and one cannot read the other's memory.

A **thread** is one line of execution *inside* a process. A process can have several threads that share its memory — handy for doing things in parallel, dangerous because they can trip over each other's data.

With one CPU core only one thread runs at a time. The OS switches between them hundreds of times a second — a **context switch** — saving one's registers and loading the next's. That switching is what makes everything look simultaneous.

**You need already:** nothing. If you did the Linux processes unit, this is the theory behind \`ps\`.`,
      conceptMd: `A **process** has its own address space. A **thread** is a unit of scheduling *within* a process, sharing the address space with its siblings.

The consequences follow: threads communicate through shared memory (fast, but needs synchronisation), processes need IPC (slower, but isolated); a crashing thread takes the whole process with it, a crashing process does not affect others; and switching between threads of one process is cheaper than switching processes because the memory mappings do not change.

**Context switching** costs: save registers, save the program counter, switch the stack, and — for a process switch — swap page tables, which flushes much of the TLB. That last part is why process switches are meaningfully more expensive.

The **PCB** holds this per-process state: PID, state, program counter, registers, memory limits, open file table.

Process states: **new → ready → running → waiting → terminated.** Map them onto what \`ps\` shows you: R (running/runnable), S (interruptible sleep), D (uninterruptible sleep, usually blocked on IO — and notably you cannot kill a D-state process), Z (zombie), T (stopped).`,
      interviewAngle:
        "`Process versus thread` opens a large share of Core CS rounds. The answer that lands " +
        "names the address space first and lets every other difference follow from it.",
      pitfalls: [
        "Listing differences without naming the cause. One owns an address space and the " +
          "other shares one — everything else follows.",
        "Forgetting why a process switch costs more. Swapping page tables flushes much of the " +
          "TLB; a thread switch does not.",
        "Trying to kill a D-state process. Uninterruptible sleep does not take signals — find " +
          "what IO it is blocked on.",
      ],
      recall: [
        {
          front: "Process versus thread — state the one difference the rest follow from.",
          back:
            "A process owns its address space; a thread is a unit of scheduling that shares one " +
            "with its siblings. Hence threads communicate through shared memory and need " +
            "synchronisation, a crashing thread takes the process down, and thread switches are " +
            "cheaper.",
        },
        {
          front: "Why is a process context switch more expensive than a thread switch?",
          back:
            "Both save registers, program counter and stack. A process switch additionally " +
            "swaps page tables, which flushes much of the TLB, so the next memory accesses all " +
            "miss.",
        },
        {
          front: "Map the `ps` state letters to what they mean.",
          back:
            "R running or runnable, S interruptible sleep, D uninterruptible sleep (usually " +
            "blocked on IO, and not killable), Z zombie, T stopped.",
        },
        {
          front: "What does the PCB hold?",
          back:
            "Per-process state: PID, process state, program counter, register contents, memory " +
            "limits, and the open file table.",
        },
      ],
      resources: [
        {
          title: "OSTEP ch. 4 — The Abstraction: The Process (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "The best free OS textbook, written to be read cover to cover rather than looked up.",
          steps: [
            "Read the chapter from the start through the part on **process states** (running, ready, blocked).",
            "Draw the process state diagram from memory and label each arrow.",
            "Skim the data-structures part; do the homework simulation if you have time.",
            "Then read GfG's process-vs-thread comparison (next link).",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — Process vs thread",
          url: "https://www.geeksforgeeks.org/operating-systems/difference-between-process-and-thread/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The comparison table exam and interview questions are built from.",
        },
        {
          title: "OSTEP ch. 5 — The Process API (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "fork, exec and wait with small C programs — how a shell actually starts your command.",
        },
      ],
    },
    {
      slug: "corecs-os-scheduling",
      title: "CPU scheduling",
      objective:
        "Solve Gantt-chart problems by hand for FCFS, SJF, SRTF, Round Robin and priority.",
      estMinutes: 75,
      primer: `When several processes are ready to run, the OS must choose which goes next. That choice is **CPU scheduling**, and different rules favour different goals.

- **FCFS** (first come, first served) — simple, but one long job makes everyone behind it wait.
- **SJF** (shortest job first) — the shortest job runs next; the lowest average waiting time, but long jobs can wait forever.
- **Round Robin** — each process gets a short time slice, then goes to the back of the queue; fair and responsive.
- **Priority** — the most important runs first.

Exams give you a table of processes with arrival and burst times and ask you to draw a **Gantt chart** (a timeline of who runs when) and compute average **waiting time** and **turnaround time**. It is mechanical once practised — free marks.

**You need already:** the processes unit.`,
      conceptMd: `Written tests give you a process table and want average waiting and turnaround time. Practise until this is mechanical — it is free marks.

**FCFS** — simple, and suffers the **convoy effect** where one long job delays everything behind it.
**SJF** — provably optimal average waiting time, but it needs knowledge of burst lengths (so it is estimated in practice) and can starve long jobs.
**SRTF** — preemptive SJF.
**Round Robin** — each process gets a time quantum. Fair and responsive; too small a quantum wastes time on context switches, too large and it degenerates to FCFS.
**Priority** — can starve low-priority processes, which is fixed by **ageing** (raising priority over time).

The definitions to keep straight: **turnaround = completion − arrival**, **waiting = turnaround − burst**, **response = first CPU − arrival**. Interactive systems optimise response time; batch systems optimise throughput.

Linux's CFS is a useful modern counterpoint: it tracks virtual runtime and always runs the process that has had the least, which approximates fair sharing without fixed quanta. Mentioning it shows you connect theory to the system you actually use.`,
      interviewAngle:
        "Written tests hand you a process table and want a Gantt chart. It is free marks, so " +
        "the only failure mode is arithmetic under time pressure.",
      pitfalls: [
        "Mixing up the three time definitions. Turnaround = completion − arrival, waiting = " +
          "turnaround − burst, response = first CPU − arrival.",
        "Claiming SJF is usable as-is. It needs burst lengths you do not have, so it is " +
          "estimated — and it can starve long jobs.",
        "Forgetting that Round Robin degenerates. Too small a quantum burns time on context " +
          "switches; too large and it is FCFS.",
      ],
      recall: [
        {
          front: "Define turnaround, waiting and response time.",
          back:
            "Turnaround = completion − arrival. Waiting = turnaround − burst. Response = first " +
            "time on CPU − arrival. Interactive systems optimise response; batch systems " +
            "optimise throughput.",
        },
        {
          front: "What is the convoy effect, and which algorithm suffers it?",
          back:
            "One long job at the head of the queue delays every short job behind it, inflating " +
            "average waiting time. It is FCFS's characteristic weakness.",
        },
        {
          front: "SJF is provably optimal for average waiting time. Why is it not simply used?",
          back:
            "It requires knowing each job's burst length in advance, which you do not, so it " +
            "has to be estimated — and it starves long jobs indefinitely when short ones keep " +
            "arriving.",
        },
        {
          front: "How does Linux's CFS differ from a fixed-quantum scheduler?",
          back:
            "It tracks each task's virtual runtime and always runs the one with the least, " +
            "approximating fair sharing without fixed quanta.",
        },
      ],
      resources: [
        {
          title: "OSTEP ch. 7 — Scheduling: Introduction (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Derives each policy from what it is trying to optimise, so the trade-offs stay memorable.",
          steps: [
            "Read the chapter in order: FIFO, then SJF, then STCF, then Round Robin.",
            "Redo each of its small examples on paper as a Gantt chart before looking at the figure.",
            "Then work GfG's examples (next link), which use the exam's table format.",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — CPU scheduling in operating systems",
          url: "https://www.geeksforgeeks.org/operating-systems/cpu-scheduling-in-operating-systems/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Every algorithm with a worked table of waiting and turnaround times — the format written tests use.",
        },
      ],
    },
    {
      slug: "corecs-os-concurrency",
      title: "Concurrency: race conditions, mutexes & semaphores",
      objective:
        "Identify a race condition, and choose correctly between a mutex and a semaphore.",
      estMinutes: 75,
      primer: `When two threads change the same data at the same time, the result can depend on which one happens to run first. That is a **race condition**.

The classic example is \`count++\`. It looks like one step but is three: read \`count\`, add 1, write it back. Two threads can both read 5, both write 6 — and one increment is lost.

The part of the code that touches shared data is the **critical section**, and only one thread may be inside it at a time. The tools that enforce this:

- a **mutex** (lock): a thread locks it before the critical section and unlocks after; anyone else who tries waits.
- a **semaphore**: a counter that lets up to N threads in — useful for limiting access to N identical resources.

**You need already:** processes and threads.`,
      conceptMd: `A **race condition** is when the result depends on thread timing. The canonical example is \`count++\` — three machine operations (load, add, store), so two threads can interleave and lose an increment. A **critical section** is the code that must not be entered concurrently.

Correct mutual exclusion needs three properties: **mutual exclusion** (one at a time), **progress** (if nobody is inside, someone gets in), and **bounded waiting** (no indefinite starvation).

**Mutex** — binary, and it has an *owner*: the thread that locked it must unlock it. Use it for mutual exclusion.
**Semaphore** — a counter with wait/signal, no ownership, so it can be signalled by a different thread. Use it for **signalling** and for limiting access to N identical resources.

That ownership distinction is the answer to "what is the difference?", and it is a better answer than "a mutex is a semaphore with count 1".

**Producer–consumer** is the standard exercise: a mutex for the buffer plus two counting semaphores (empty slots, full slots). Write it once.

Also know **spinlock** (busy-waits — right only for very short critical sections on multicore) and **condition variable** (wait until a predicate holds, always paired with a mutex).`,
      interviewAngle:
        "`Mutex or semaphore?` — the answer is ownership, not count. `A mutex is a semaphore " +
        "with count 1` is the answer that marks you as having read rather than used them.",
      pitfalls: [
        "Answering `a mutex is a binary semaphore`. The real distinction is ownership: a " +
          "mutex must be unlocked by the thread that locked it.",
        "Using a spinlock for a long critical section. Busy-waiting only pays off when the " +
          "wait is shorter than a context switch, on multicore.",
        "Using a condition variable without a mutex, or without rechecking the predicate in a " +
          "loop after waking.",
      ],
      recall: [
        {
          front: "Why is `count++` a race condition?",
          back:
            "It is three machine operations — load, add, store. Two threads can interleave so " +
            "that both load the same value and one increment is lost.",
        },
        {
          front: "Mutex versus semaphore — what is the real distinction?",
          back:
            "Ownership. A mutex has an owner: the thread that locked it must unlock it, so it " +
            "is for mutual exclusion. A semaphore is an unowned counter that any thread can " +
            "signal, so it is for signalling and for limiting access to N identical resources.",
        },
        {
          front: "Name the three properties correct mutual exclusion must have.",
          back:
            "Mutual exclusion (one thread inside at a time), progress (if nobody is inside, " +
            "someone gets in), and bounded waiting (no indefinite starvation).",
        },
        {
          front: "What synchronisation does producer-consumer need?",
          back:
            "A mutex protecting the buffer, plus two counting semaphores — one counting empty " +
            "slots and one counting full slots.",
        },
      ],
      resources: [
        {
          title: "OSTEP ch. 26 — Concurrency: An Introduction (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Shows a real race on a shared counter, then explains exactly why the result is wrong.",
          steps: [
            "Read the chapter; follow the counter example and its trace of interleaved instructions.",
            "Write the same two-thread counter in C++ with `std::thread` and watch the total come out wrong.",
            "Then read ch. 28 on locks (next link) and fix it with a mutex.",
          ],
          isPrimary: true,
        },
        {
          title: "OSTEP ch. 28 — Locks (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "What a lock must guarantee, and how it is built from hardware instructions.",
        },
        {
          title: "GeeksforGeeks — Semaphores in process synchronization",
          url: "https://www.geeksforgeeks.org/operating-systems/semaphores-in-process-synchronization/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Semaphores in the notation exam questions use, including binary vs counting semaphores.",
        },
      ],
    },
    {
      slug: "corecs-os-deadlock",
      title: "Deadlock",
      objective:
        "State the four necessary conditions and explain prevention, avoidance and detection.",
      estMinutes: 60,
      primer: `A **deadlock** is when a group of processes are all waiting for each other, so none can ever continue.

Picture two people and two keys: A holds key 1 and needs key 2; B holds key 2 and needs key 1. Neither will let go, so both wait forever.

Deadlock can only happen when **four conditions** hold at once: resources cannot be shared (*mutual exclusion*), a process holds one resource while waiting for another (*hold and wait*), resources cannot be taken away (*no preemption*), and there is a cycle of waiting (*circular wait*). Break any one and deadlock cannot happen — the usual practical fix is to always take locks in the same order, which breaks circular wait.

**Banker's algorithm** is the exam version: before granting a request, check that the system can still finish every process in some order.

**You need already:** locks from the concurrency unit.`,
      conceptMd: `**Four conditions, all required simultaneously** — break any one and deadlock is impossible:

1. **Mutual exclusion** — resources are non-shareable.
2. **Hold and wait** — a process holds one resource while requesting another.
3. **No preemption** — resources cannot be forcibly taken.
4. **Circular wait** — a cycle in the wait-for graph.

**Prevention** attacks a condition structurally. The practical one is breaking circular wait by imposing a **global lock ordering** — always acquire locks in the same order. That single rule prevents most real deadlocks in real code.

**Avoidance** uses advance knowledge of maximum needs — the **Banker's algorithm**, which grants a request only if the resulting state is safe. Know how to run it by hand for exams; know that it is essentially unused in practice because the maximum-claims requirement is unrealistic.

**Detection and recovery** lets deadlock happen, finds cycles in the wait-for graph, and recovers by killing or rolling back a process. This is what databases actually do — Postgres detects deadlocks and aborts one transaction with a specific error, which connects straight to the isolation-levels unit in DBMS.`,
      interviewAngle:
        "The four conditions get asked verbatim. The follow-up worth preparing is which one you " +
        "would break in real code — and the answer is circular wait, via a global lock " +
        "ordering.",
      pitfalls: [
        "Reciting the four conditions without noting they must hold *simultaneously*. " +
          "Breaking any one makes deadlock impossible.",
        "Presenting Banker's algorithm as practical. It requires maximum claims declared in " +
          "advance, so it is essentially unused outside exams.",
        "Forgetting that databases choose detection, not prevention — and that your " +
          "application must therefore retry.",
      ],
      recall: [
        {
          front: "Name the four necessary conditions for deadlock.",
          back:
            "Mutual exclusion, hold and wait, no preemption, and circular wait — and all four " +
            "must hold at once, so breaking any single one prevents deadlock.",
        },
        {
          front: "Which condition do you break in real code, and how?",
          back:
            "Circular wait, by imposing a global lock ordering — always acquire locks in the " +
            "same order. That one rule prevents most real deadlocks.",
        },
        {
          front: "Prevention, avoidance and detection — what does each actually do?",
          back:
            "Prevention structurally rules out one of the four conditions. Avoidance (Banker's " +
            "algorithm) grants a request only if the resulting state is safe, using advance " +
            "knowledge of maximum needs. Detection lets deadlock happen, finds a cycle in the " +
            "wait-for graph, and recovers by killing or rolling back.",
        },
        {
          front:
            "Which strategy do databases use, and what does that require of your application?",
          back:
            "Detection and recovery — Postgres finds the cycle in its lock waits and aborts one " +
            "transaction with a deadlock error (SQLSTATE `40P01`). Your application has to catch " +
            "that and retry.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Introduction to deadlock",
          url: "https://www.geeksforgeeks.org/operating-systems/introduction-of-deadlock-in-operating-system/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "The four conditions and the three ways of handling deadlock, in the form exams ask about.",
          steps: [
            "Read the definition and the four necessary conditions; write one real example for each.",
            "Read the methods for handling deadlock: prevention, avoidance, detection and recovery.",
            "Then work the Banker's algorithm example (next link) on paper.",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — Banker's algorithm",
          url: "https://www.geeksforgeeks.org/operating-systems/bankers-algorithm-in-operating-system-2/",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "A worked safe-sequence example step by step — redo it by hand until it is mechanical.",
        },
        {
          title: "OSTEP ch. 32 — Common Concurrency Problems (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Deadlock as it appears in real code, and lock ordering as the practical cure.",
        },
      ],
    },
    {
      slug: "corecs-os-memory",
      title: "Memory management, paging & virtual memory",
      objective:
        "Explain virtual to physical translation, solve page-replacement problems, and define thrashing.",
      estMinutes: 75,
      primer: `Every process believes it has a large, private block of memory starting at address 0. That is an illusion called **virtual memory**; the OS and hardware translate each **virtual address** into a real **physical address** in RAM.

Memory is managed in fixed-size pieces called **pages** (usually 4 KB). A per-process **page table** records which physical frame holds each page. Because looking up the table on every access would be slow, the CPU keeps recent translations in a small fast cache, the **TLB**.

When RAM is full, some pages are moved out to disk. When a program touches one of those, a **page fault** brings it back — and the OS must choose which page to evict. **FIFO**, **LRU** and **Optimal** are the policies exams ask about. If the system spends more time swapping pages than doing work, that is **thrashing**.

**You need already:** the processes unit.`,
      conceptMd: `**Virtual memory** gives every process the illusion of a large private address space. Addresses are split into a page number and an offset; the page table maps the page number to a physical frame. The **TLB** caches recent translations, because otherwise every memory access would need an extra memory access to read the page table.

A **page fault** occurs when the page is not resident: the OS traps, fetches from disk, updates the table, and resumes the instruction. It is *slow* — microseconds versus nanoseconds — which is why locality of reference dominates real performance.

**Page replacement** algorithms for exam problems: **FIFO** (and note **Belady's anomaly** — more frames can mean more faults, which is the trick question), **Optimal** (evict the page used furthest in the future — unimplementable, used as a benchmark), and **LRU** (evict least recently used; the practical choice, approximated in real kernels with a reference bit because true LRU is too expensive).

**Thrashing** is when a process has too few frames, so it spends more time paging than executing. CPU utilisation collapses, and a naive scheduler responds by admitting *more* processes, making it worse. The fix is the working-set model: give each process enough frames for its active set, or swap some processes out entirely.

Internal fragmentation is wasted space inside a page; external fragmentation is what segmentation suffers and paging avoids.`,
      interviewAngle:
        "Belady's anomaly is the trick question in page replacement. Thrashing is the one worth " +
        "being able to explain as a feedback loop rather than a definition.",
      pitfalls: [
        "Assuming more frames always means fewer faults. FIFO can do the opposite — that is " +
          "Belady's anomaly, and it is the exam trick.",
        "Offering Optimal as a solution. It requires knowing the future; it exists as a " +
          "benchmark.",
        "Defining thrashing without the feedback loop. Falling CPU utilisation makes a naive " +
          "scheduler admit *more* processes, which makes it worse.",
      ],
      recall: [
        {
          front: "What is the TLB for, and what happens without it?",
          back:
            "It caches recent virtual-to-physical translations. Without it every memory access " +
            "would need an extra memory access first, to read the page table.",
        },
        {
          front: "What is Belady's anomaly and which algorithm exhibits it?",
          back:
            "Increasing the number of frames can *increase* the number of page faults. FIFO " +
            "exhibits it; LRU and Optimal do not.",
        },
        {
          front: "Explain thrashing as a feedback loop.",
          back:
            "A process has too few frames, so it spends more time paging than executing. CPU " +
            "utilisation collapses, and a naive scheduler reads that as idle capacity and " +
            "admits more processes — which cuts frames further. The fix is the working-set " +
            "model: give each process enough frames for its active set, or swap some out " +
            "entirely.",
        },
        {
          front: "Internal versus external fragmentation.",
          back:
            "Internal is wasted space *inside* an allocated page. External is free space broken " +
            "into unusable non-contiguous pieces — what segmentation suffers and paging avoids.",
        },
      ],
      resources: [
        {
          title: "OSTEP ch. 18 — Paging: Introduction (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf",
          kind: "read",
          minutes: 35,
          whyThisOne:
            "Builds address translation up from a tiny example, so the page table stops being memorised.",
          steps: [
            "Read the chapter and translate the small example addresses yourself before reading the answers.",
            "Then read ch. 22 on replacement policies (next link) — FIFO, LRU and Optimal.",
            "Work one page-replacement string by hand for all three policies and count the faults.",
          ],
          isPrimary: true,
        },
        {
          title: "OSTEP ch. 22 — Swapping: Policies (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Page replacement policies compared on the same access sequence, with thrashing at the end.",
        },
        {
          title: "GeeksforGeeks — Page replacement algorithms",
          url: "https://www.geeksforgeeks.org/operating-systems/page-replacement-algorithms-in-operating-systems/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Worked examples in exam format, including Belady's anomaly.",
        },
      ],
    },
  ],
};
