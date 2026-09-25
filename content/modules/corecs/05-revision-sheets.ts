import type { Module } from "@/content/types";

export const revisionSheets: Module = {
  slug: "corecs-revision-sheets",
  trackSlug: "corecs",
  phaseSlug: "depth",
  order: 2,
  title: "One-page revision sheets",
  summary:
    "The second pass on OS, DBMS, networks and OOP — this time producing the sheets you will read the night before a November interview. Each unit is a model sheet of the highest-yield facts; the work is writing your own version from memory, checking it against this one, and fixing the gaps. A sheet you wrote is worth ten you downloaded.",
  prereqSlugs: ["corecs-os", "corecs-dbms", "corecs-cn"],
  units: [
    {
      slug: "corecs-rev-os",
      title: "Operating systems on one page",
      objective:
        "Write a one-page OS sheet from memory — processes, scheduling, synchronisation, deadlock, memory — then check it against this model and fill the gaps.",
      estMinutes: 75,
      primer: `This unit is not new material. It is how you make the OS module stick until November.

The method: **write a one-page OS sheet from memory first**, with no notes open — processes and threads, scheduling, synchronisation, deadlock, memory. Then compare it with the model sheet in this unit's notes, and with GfG's last-minute notes. Every gap you find is something you would have lost in an interview; add it in your own words.

Writing it yourself is the point. Recalling is what builds memory; a sheet you downloaded is one you have only read.

Keep the finished sheet — it is what you read the night before an interview.

**You need already:** the Phase 1 OS module.`,
      conceptMd: `**Processes & threads**

- Process = own address space; threads share it (plus heap, files) and have their own stack and registers.
- \`fork()\` returns **0 in the child** and the **child's PID in the parent** (−1 on failure); \`exec()\` replaces the process image; \`wait()\` reaps a child.
- **Zombie**: finished, but the parent has not called \`wait()\` — an entry stays in the process table. **Orphan**: the parent died first — adopted by init (PID 1), which reaps it.
- States: new → ready ⇄ running → waiting → ready … → terminated.

**Scheduling**

| Algorithm | Note |
|---|---|
| FCFS | simple; convoy effect |
| SJF / SRTF | optimal average waiting time; needs burst prediction; starves long jobs |
| Round Robin | fair, good response; quantum too small → switching overhead, too large → FCFS |
| Priority | starvation → fix with **aging** |

**Synchronisation**

- Critical section needs mutual exclusion, progress, bounded waiting.
- Mutex = ownership (the locker unlocks). Semaphore = a counter for signalling or counting resources.
- Classic problems: producer–consumer, readers–writers, dining philosophers.

**Deadlock** — needs all four: mutual exclusion, hold and wait, no preemption, circular wait. Handle by prevention (break one — usually lock ordering), avoidance (Banker's algorithm, safe state), or detection and recovery.

**Memory**

- Paging: fixed-size pages → frames; no external fragmentation, some internal. Segmentation: variable-size logical segments; external fragmentation.
- Page table maps pages to frames; the **TLB** caches those translations.
- **Page fault** → OS loads the page from disk. Too many → **thrashing**.
- Replacement: FIFO (Belady's anomaly), LRU, Optimal (a benchmark, needs the future).
- Virtual memory: each process sees a large private address space; only the used pages need to be in RAM.`,
      interviewAngle:
        "OS questions in campus and off-campus rounds are mostly this sheet: fork's return values, " +
        "zombie versus orphan, the four deadlock conditions, paging versus segmentation. Fluency " +
        "matters more than depth here.",
      pitfalls: [
        "Reading this sheet instead of writing your own first — recognition feels like recall and is not.",
        "Mixing up zombie and orphan processes.",
        "Saying fork returns the parent's PID in the child.",
        "Listing deadlock conditions without saying which one real code breaks (circular wait, by lock ordering).",
      ],
      recall: [
        {
          front: "What does fork() return in the parent and in the child?",
          back: "The child's PID in the parent, 0 in the child, −1 on failure.",
        },
        {
          front: "Zombie process versus orphan process?",
          back:
            "A zombie has exited but its parent has not reaped it with wait(). An orphan's parent " +
            "died first; init adopts and reaps it.",
        },
        {
          front: "Paging versus segmentation — which fragmentation does each suffer?",
          back: "Paging: fixed-size pages, internal fragmentation only. Segmentation: variable-size segments, external fragmentation.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Last-minute notes: operating systems",
          url: "https://www.geeksforgeeks.org/operating-systems/last-minute-notes-operating-systems/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "The campus-exam view of the whole syllabus on one page — a checklist for gaps.",
          steps: [
            "Write your own one-page sheet first, from memory, with the page closed.",
            "Then read these notes section by section and mark every topic missing from your sheet.",
            "Add the missing topics in your own words, and check any doubtful line against the notes in this unit.",
          ],
          isPrimary: true,
        },
        {
          title: "OSTEP ch. 32 — Common concurrency problems (PDF)",
          url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
          kind: "read",
          whyThisOne:
            "For the deadlock and concurrency lines: the textbook chapter to check them against.",
        },
      ],
    },
    {
      slug: "corecs-rev-dbms",
      title: "DBMS on one page",
      objective:
        "Write a one-page DBMS sheet from memory — keys, normal forms, SQL order of execution, transactions, indexes — then check and fix it.",
      estMinutes: 75,
      primer: `The same method as the OS sheet, for databases.

**Write one page from memory first**: keys, normal forms, the order SQL clauses run in (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY), joins, ACID, isolation levels and their anomalies, and when indexes help or hurt. Then compare against the model in this unit's notes and GfG's last-minute notes, and fill every gap in your own words.

The SQL execution order deserves a line of its own: it explains why you cannot use a \`SELECT\` alias in \`WHERE\`, but can in \`ORDER BY\`.

**You need already:** the Phase 1 DBMS module and Databases in depth.`,
      conceptMd: `**Keys**: super key ⊇ candidate key (minimal) → one chosen as primary; the rest are alternate keys. Foreign key references another table's key.

**Normal forms**

| Form | Rule |
|---|---|
| 1NF | atomic values, no repeating groups |
| 2NF | 1NF + no non-key attribute depends on **part** of a composite key |
| 3NF | 2NF + no non-key attribute depends on another non-key attribute (no transitive dependency) |
| BCNF | for every dependency X → Y, X is a super key (stricter than 3NF) |

**SQL logical order of execution** — why aliases and aggregates work where they do:

\`\`\`text
FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
\`\`\`

So \`WHERE\` cannot use an aggregate (use \`HAVING\`), and a \`SELECT\` alias is visible in \`ORDER BY\` but not in \`WHERE\`.

**Joins**: inner (matches only), left (all left rows + matches), right, full outer, cross (every pair), self join.

**DELETE vs TRUNCATE vs DROP**: DELETE removes chosen rows, logged per row, fires triggers, can be filtered. TRUNCATE removes all rows fast, resets storage. DROP removes the table itself.

**Transactions — ACID**: atomicity (all or nothing), consistency (constraints hold), isolation (concurrent transactions do not interfere, per the level), durability (committed survives a crash — the write-ahead log).

**Isolation levels**: Read Uncommitted → Read Committed → Repeatable Read → Serializable; anomalies: dirty read, non-repeatable read, phantom, lost update, write skew.

**Indexes**: B+ tree (range queries, ordering) is the default; hash (equality only). Clustered index = table stored in index order (one per table); non-clustered = separate structure pointing at rows.

**Views**: a stored query; a **materialised view** stores the result and must be refreshed.`,
      interviewAngle:
        "DBMS rounds cycle through the same questions: normal forms with an example, the SQL order " +
        "of execution, ACID, DELETE versus TRUNCATE, clustered versus non-clustered. Each needs a " +
        "one-sentence answer ready.",
      pitfalls: [
        "Defining 2NF and 3NF without the words \"part of a key\" and \"transitive\".",
        "Using a SELECT alias in WHERE and not knowing why it fails.",
        "Confusing TRUNCATE with DELETE without a WHERE clause.",
        "Writing the sheet as prose instead of tables and one-liners you can scan in five minutes.",
      ],
      recall: [
        {
          front: "Give the logical order in which a SQL SELECT's clauses are evaluated.",
          back: "FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT.",
        },
        {
          front: "How is BCNF stricter than 3NF?",
          back:
            "BCNF requires the left side of every functional dependency to be a super key; 3NF " +
            "allows an exception when the right side is part of a candidate key.",
        },
        {
          front: "DELETE, TRUNCATE, DROP — one line each.",
          back:
            "DELETE removes selected rows, logged row by row with triggers; TRUNCATE empties the " +
            "whole table quickly; DROP removes the table itself.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Last-minute notes: DBMS",
          url: "https://www.geeksforgeeks.org/dbms/last-minute-notes-dbms/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "The syllabus view on one page — use it to spot topics missing from your sheet.",
          steps: [
            "Write your sheet from memory first.",
            "Read these notes and mark what your sheet is missing.",
            "Fill the gaps in your own words; check index lines against the next link.",
          ],
          isPrimary: true,
        },
        {
          title: "Use The Index, Luke — Anatomy of an SQL index",
          url: "https://use-the-index-luke.com/sql/anatomy",
          kind: "read",
          whyThisOne:
            "For the index lines on your sheet: B-trees, leaf nodes and why lookups can still be slow.",
        },
      ],
    },
    {
      slug: "corecs-rev-cn",
      title: "Computer networks on one page",
      objective:
        "Write a one-page networks sheet from memory — layers, TCP and UDP, addressing, the core protocols and the URL walkthrough — then check and fix it.",
      estMinutes: 75,
      primer: `The same method again, for networks.

**Write one page from memory**: the OSI and TCP/IP layers with a protocol at each, TCP versus UDP, the three-way handshake, IPv4 addressing and a subnetting example, DNS resolution, HTTP status families and the TLS handshake — and the "what happens when you type a URL" walk-through in six lines. Then compare against this unit's notes and GfG's last-minute notes, and fill the gaps in your own words.

The URL walk-through is the line to rehearse out loud: it ties every other line on the sheet together, and it is asked constantly.

**You need already:** the CN module and the SRE networking module.`,
      conceptMd: `**Layers**

| OSI | TCP/IP | Examples | Device |
|---|---|---|---|
| 7 Application, 6 Presentation, 5 Session | Application | HTTP, DNS, SMTP (TLS sits between these and transport) | — |
| 4 Transport | Transport | TCP, UDP | — |
| 3 Network | Internet | IP, ICMP | router |
| 2 Data link | Link | Ethernet, ARP, MAC | switch |
| 1 Physical | Link | cables, signals | hub |

**TCP vs UDP**: TCP is connection-oriented, reliable, ordered, with flow and congestion control. UDP is connectionless, no guarantees, lower latency — DNS queries, video, games, QUIC.

**TCP lifecycle**

- Open: **SYN → SYN-ACK → ACK** (three-way handshake).
- Close: FIN → ACK, FIN → ACK (four steps); the side that closes first waits in **TIME_WAIT** (2 × MSL) so stray packets die out.
- **Flow control** protects the receiver (the receive window). **Congestion control** protects the network (slow start, congestion avoidance).

**Addressing**: IPv4 32 bits, IPv6 128 bits. A /24 has 256 addresses, 254 usable hosts; hosts = 2^(32 − prefix) − 2. Private ranges: 10/8, 172.16/12, 192.168/16. **NAT** maps private addresses to one public one. **ARP** resolves IP → MAC on the local network.

**DHCP** (how a device gets an IP): **D**iscover → **O**ffer → **R**equest → **A**cknowledge.

**Ports**: 20/21 FTP, 22 SSH, 25 SMTP, 53 DNS, 80 HTTP, 443 HTTPS, 3306 MySQL, 5432 Postgres.

**What happens when you type a URL** — the answer in order:

1. DNS resolution (browser cache → OS → resolver → root → TLD → authoritative).
2. TCP three-way handshake to the IP on port 443.
3. TLS handshake: certificate verified, keys agreed.
4. HTTP request; the server (often via a load balancer) responds.
5. The browser parses HTML, fetches CSS/JS/images (more requests), renders.`,
      interviewAngle:
        "\"What happens when you type google.com and press Enter?\" is the single most common " +
        "networking question. Being able to give it in order, then go deeper on whichever step the " +
        "interviewer picks, is the goal of this sheet.",
      pitfalls: [
        "Skipping DNS or TLS in the URL walkthrough.",
        "Confusing flow control (the receiver) with congestion control (the network).",
        "Forgetting the −2 for network and broadcast addresses when counting hosts.",
        "Putting ARP at the network layer without noting it links layer 3 to layer 2.",
      ],
      recall: [
        {
          front: "What are the four steps of DHCP, in order?",
          back: "Discover, Offer, Request, Acknowledge (DORA).",
        },
        {
          front: "Why does a TCP connection sit in TIME_WAIT after closing?",
          back:
            "So delayed packets from the old connection expire (2 × MSL) and cannot be mistaken for " +
            "part of a new connection on the same ports, and so the final ACK can be resent.",
        },
        {
          front: "Flow control versus congestion control in TCP?",
          back: "Flow control stops the sender overwhelming the receiver; congestion control stops it overwhelming the network.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Last-minute notes: computer networks",
          url: "https://www.geeksforgeeks.org/computer-networks/last-minute-notes-computer-network/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "The syllabus view on one page — use it to find gaps in your own sheet.",
          steps: [
            "Write your sheet from memory first.",
            "Read these notes and mark what your sheet is missing.",
            "Fill the gaps, then say the URL walk-through out loud in under two minutes.",
          ],
          isPrimary: true,
        },
        {
          title: "High Performance Browser Networking — ch. 2, Building blocks of TCP",
          url: "https://hpbn.co/building-blocks-of-tcp/",
          kind: "read",
          whyThisOne:
            "For the handshake and congestion lines on your sheet.",
        },
      ],
    },
    {
      slug: "corecs-rev-oop",
      title: "OOP on one page",
      objective:
        "Write a one-page OOP sheet from memory — pillars, polymorphism kinds, abstract classes and interfaces, SOLID, and a few patterns — then check and fix it.",
      estMinutes: 60,
      primer: `The last sheet: object-oriented design.

**Write one page from memory**: the four pillars with one example of your own each; compile-time versus run-time polymorphism (overloading versus virtual functions); abstract classes versus interfaces; composition versus inheritance; the five SOLID principles in one line each; and four design patterns with when *not* to use them. Then compare against this unit's notes and fill the gaps.

Interviewers rarely want definitions alone. For every line on the sheet, have an example from code you wrote ready to say out loud.

**You need already:** the OOP module and C++ internals.`,
      conceptMd: `**Four pillars**: encapsulation (hide state behind methods), abstraction (expose what, hide how), inheritance (reuse and "is-a"), polymorphism (one interface, many behaviours).

**Polymorphism, two kinds**

| | Compile-time (static) | Run-time (dynamic) |
|---|---|---|
| Mechanism | **overloading** — same name, different parameters; templates | **overriding** — a derived class redefines a virtual method |
| Resolved | by the compiler | through the vtable at the call |

**Abstract class vs interface**: an abstract class can hold state and implemented methods, and a class has one base; an interface (in C++, a class of pure virtual functions) is a pure contract, and a class can implement many. Use an interface for a capability, an abstract class for shared implementation.

**C++ specifics that get asked**

- Access: \`public\`, \`protected\` (derived classes), \`private\`.
- A base class used polymorphically needs a **virtual destructor**, or deleting through a base pointer skips the derived destructor.
- **Diamond problem**: D inherits from B and C, both from A — D has two A subobjects. **Virtual inheritance** (\`class B : virtual public A\`) shares one.
- Constructors are not virtual; don't call virtual functions from them expecting the derived version.
- Shallow vs deep copy: the default copy copies pointers, not what they point to.

**Composition over inheritance**: prefer "has-a" to "is-a" unless the subtype is truly substitutable (Liskov).

**SOLID** — one line each: Single responsibility (one reason to change); Open/closed (extend without modifying); Liskov (subtypes substitutable); Interface segregation (small, focused interfaces); Dependency inversion (depend on abstractions).

**Patterns to name**: Singleton (one instance; global state, hard to test), Factory (decide which class to create), Strategy (swap an algorithm), Observer (notify subscribers of changes).`,
      interviewAngle:
        "OOP questions are usually definitions with a twist: overloading versus overriding, abstract " +
        "class versus interface, the diamond problem. An example from your own code for each pillar " +
        "is what lifts a textbook answer.",
      pitfalls: [
        "Calling overloading run-time polymorphism.",
        "Forgetting the virtual destructor in a polymorphic base class.",
        "Defining the diamond problem without the fix (virtual inheritance).",
        "Pillar definitions with no example from your own projects.",
      ],
      recall: [
        {
          front: "Overloading versus overriding — which is compile-time and which is run-time?",
          back:
            "Overloading (same name, different parameters) is resolved at compile time; overriding " +
            "a virtual method is resolved at run time through the vtable.",
        },
        {
          front: "What is the diamond problem in C++, and how is it fixed?",
          back:
            "A class inheriting from two classes with a common base gets two copies of that base; " +
            "virtual inheritance makes them share one.",
        },
        {
          front: "Abstract class or interface — when do you choose each?",
          back:
            "An interface for a pure capability a class may have several of; an abstract class " +
            "when subclasses share state or implementation.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Object oriented programming in C++",
          url: "https://www.geeksforgeeks.org/cpp/object-oriented-programming-in-cpp/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "The pillars with C++ examples on one page — a checklist for your sheet.",
          steps: [
            "Write your sheet from memory first.",
            "Read this page and check each pillar line on your sheet against it.",
            "Check your SOLID lines against the DigitalOcean article (next link).",
            "Add an example from your own code beside every line.",
          ],
          isPrimary: true,
        },
        {
          title: "DigitalOcean — SOLID: the first five principles",
          url: "https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design",
          kind: "read",
          whyThisOne:
            "For the SOLID lines: each principle with a before-and-after example.",
        },
      ],
    },
  ],
};
