import type { Question } from "./types";

/**
 * Phase 2 SDE checkpoints: system design, scaling, testing and C++ depth.
 * Each wrong answer is one a candidate gives with confidence. Answer
 * positions are balanced per module.
 */
export const sdeDepthQuestions: Question[] = [
  // --- System design -------------------------------------------------------
  {
    id: "sd-1",
    moduleSlug: "sde-system-design",
    prompt: "The interviewer says \"design a URL shortener\". What should the first five minutes be?",
    options: [
      "Drawing the architecture, so there is something concrete for the interviewer to react to",
      "Choosing the database, since the data model and every later decision depend on it",
      "Explaining the key-generation algorithm, since that is the part interviewers score most",
      "Agreeing on functional and non-functional requirements, including scale and read/write ratio",
    ],
    answer: 3,
    why: "Designing before scoping is the most common failure. The requirements and scale decide whether you need a cache, replicas or nothing special — so they come first.",
  },
  {
    id: "sd-2",
    moduleSlug: "sde-system-design",
    prompt: "A service receives 50 million requests a day. Roughly what is its average load?",
    options: [
      "About 50 requests per second",
      "About 600 requests per second",
      "About 6,000 requests per second",
      "About 35,000 requests per second",
    ],
    answer: 1,
    why: "A day is about 10⁵ seconds: 5 × 10⁷ / 10⁵ = 500, so roughly 600 (86,400 s gives ~580). Design for 2–3× that at peak.",
  },
  {
    id: "sd-3",
    moduleSlug: "sde-system-design",
    prompt: "Your URL shortener wants click analytics. Which redirect status should it return?",
    options: [
      "302, so every click reaches your servers instead of being served from the browser's cache",
      "301, because permanent redirects are faster for users on repeat visits",
      "200 with a meta-refresh tag, so the page can record the click in JavaScript",
      "307, because it is the only status that preserves the long URL exactly",
    ],
    answer: 0,
    why: "Browsers cache 301s, so repeat clicks never reach you and go uncounted. 302 costs more traffic but sees every click — the usual choice when analytics matter.",
  },
  {
    id: "sd-4",
    moduleSlug: "sde-system-design",
    prompt: "What is the weakness of a fixed-window rate limiter allowing 100 requests per minute?",
    options: [
      "It needs a timestamp stored for every request, so memory grows with traffic",
      "It cannot be shared between several servers, even with Redis",
      "A client can send 100 at 00:59 and 100 at 01:00 — 200 in about a second",
      "It rejects the first request of every new window",
    ],
    answer: 2,
    why: "The counter resets at the boundary, so bursts on either side add up. A sliding window or token bucket smooths this. Storing a timestamp per request is the sliding-window log's cost.",
  },
  {
    id: "sd-5",
    moduleSlug: "sde-system-design",
    prompt: "Several app servers share a token-bucket rate limiter in Redis. Why must the check-and-decrement be atomic?",
    options: [
      "Redis only accepts writes inside a transaction or Lua script",
      "Otherwise two servers can read the same token count and both allow a request",
      "Non-atomic writes are replicated more slowly to Redis replicas",
      "Atomic operations make the bucket refill at a steadier rate",
    ],
    answer: 1,
    why: "Read, decide, write from two servers at once is a race: both see one token left and both let a request through. A Lua script (or INCR-based logic) makes it one step.",
  },

  // --- Scaling -------------------------------------------------------------
  {
    id: "sc-1",
    moduleSlug: "sde-scaling",
    prompt: "After adding a second API instance behind the load balancer, users are logged out at random. What is the likely cause?",
    options: [
      "Sessions are stored in each instance's memory, so the other instance does not know them",
      "The load balancer is stripping cookies from every other request",
      "The two instances are using different TLS certificates",
      "JWTs cannot be verified by more than one server",
    ],
    answer: 0,
    why: "The service is not stateless. Move sessions to a shared store (or use signed tokens) and any instance can serve any request. Sticky sessions would hide the problem, not fix it.",
  },
  {
    id: "sc-2",
    moduleSlug: "sde-scaling",
    prompt: "With cache-aside, what should a write do to the cache?",
    options: [
      "Update the cached value first, then write the database",
      "Nothing — the TTL will expire the old value eventually",
      "Write the database, then delete the cache key",
      "Write the database, then update the cached value with the new data",
    ],
    answer: 2,
    why: "Deleting is safe under concurrency: the next read refills from the database. Two concurrent writers updating the cache can leave the older value there. The TTL remains as a safety net.",
  },
  {
    id: "sc-3",
    moduleSlug: "sde-scaling",
    prompt: "A user updates their profile and the next page load shows the old data. Reads go to an asynchronous replica. What fixes it?",
    options: [
      "Switching the replica to a larger instance type so it applies changes faster",
      "Adding a cache in front of the replica",
      "Sharding the users table so each replica holds less data",
      "Reading that user's data from the primary for a short time after they write",
    ],
    answer: 3,
    why: "That is replica lag. Read-your-writes consistency — routing a user's reads to the primary briefly after a write — solves it without giving up replicas. A cache would make it worse.",
  },
  {
    id: "sc-4",
    moduleSlug: "sde-scaling",
    prompt: "The database is slow under load. Which step usually comes last?",
    options: [
      "Adding indexes for the slow queries",
      "Sharding the data across several databases",
      "Adding a connection pooler",
      "Caching the most-read data",
    ],
    answer: 1,
    why: "Sharding makes joins, transactions and uniqueness application problems. Indexes, caching, pooling and replicas come first; many systems never need to shard.",
  },
  {
    id: "sc-5",
    moduleSlug: "sde-scaling",
    prompt: "A queue delivers at-least-once. How should the email-sending consumer avoid sending the same email twice?",
    options: [
      "Record each message ID when processing it, in the same transaction as the work, and skip IDs already recorded",
      "Acknowledge each message as soon as it is received, before sending, so the queue never redelivers it",
      "Set a visibility timeout longer than any send could take, so messages are never redelivered",
      "Nothing — at-least-once delivery means each message arrives once unless the queue itself fails",
    ],
    answer: 0,
    why: "Duplicates are part of the contract, so the consumer must be idempotent. Acking early turns a crash into a lost email; a longer timeout reduces duplicates but cannot rule them out.",
  },
  {
    id: "sc-6",
    moduleSlug: "sde-scaling",
    prompt: "A popular cache key expires and hundreds of requests hit the database at once. What is this, and one fix?",
    options: [
      "Cache pollution — lower the cache's memory limit",
      "Replica lag — route the reads to the primary",
      "A cache stampede — let one request rebuild the value while others wait, and add jitter to TTLs",
      "A hot shard — move the key to a different Redis node",
    ],
    answer: 2,
    why: "Every request misses together and rebuilds together. A lock or request coalescing lets one rebuild; jittered TTLs stop many hot keys expiring in the same instant.",
  },

  // --- Testing -------------------------------------------------------------
  {
    id: "tst-1",
    moduleSlug: "sde-testing",
    prompt: "Your suite is 80% end-to-end tests, takes 25 minutes and fails randomly. What does the test pyramid suggest?",
    options: [
      "Run the end-to-end tests in parallel across more machines, so the suite finishes faster",
      "Delete the flaky tests and rely on code review and manual QA for those paths",
      "Move most checks down to unit and integration tests, keeping a few end-to-end tests for key paths",
      "Retry each failing test three times before reporting it, to filter out the random failures",
    ],
    answer: 2,
    why: "Lower-level tests are faster, more stable and pinpoint failures. Parallelising or retrying treats the symptoms of an upside-down suite.",
  },
  {
    id: "tst-2",
    moduleSlug: "sde-testing",
    prompt: "Code coverage is 95%. What does that tell you?",
    options: [
      "That 5% of the code is not executed by any test — not that the rest is well tested",
      "That at most 5% of the code can still contain bugs, since the rest has been exercised",
      "That 95% of the tests pass, and the failing 5% point at the untested code",
      "That 95% of the requirements have a test, which is above the usual 80% target",
    ],
    answer: 0,
    why: "Coverage measures execution, not checking. A test can run a line and assert nothing. Use it to find untested code, not as a quality score.",
  },
  {
    id: "tst-3",
    moduleSlug: "sde-testing",
    prompt: "`atlas/links.py` does `from atlas.email import send_email`. To stop tests sending email, what do you patch?",
    options: [
      "atlas.email.send_email, where the function is defined",
      "atlas.links.send_email, the name the code under test looks up",
      "smtplib.SMTP, so no function needs patching",
      "Either one — patch replaces the function object everywhere",
    ],
    answer: 1,
    why: "patch replaces a name in a namespace. links.py has its own reference bound at import, so patching atlas.email leaves that reference pointing at the real function.",
  },
  {
    id: "tst-4",
    moduleSlug: "sde-testing",
    prompt: "Why run atlas's integration tests against Postgres rather than SQLite?",
    options: [
      "SQLite cannot run inside GitHub Actions runners, which only provide service containers",
      "SQLite is slower than Postgres on small datasets, so the suite would take longer",
      "pytest fixtures only support network databases, and SQLite is a file on disk",
      "SQLite differs in types, constraints, ON CONFLICT and locking, so tests could pass while production SQL fails",
    ],
    answer: 3,
    why: "Tests only prove what they exercise. The whole point of an integration test is the real database's behaviour — a different engine tests something else.",
  },
  {
    id: "tst-5",
    moduleSlug: "sde-testing",
    prompt: "In a pytest fixture, what runs the code after `yield`?",
    options: [
      "pytest, after the test finishes — whether it passed or failed",
      "Nothing, unless the test calls the fixture's cleanup method",
      "pytest, but only when the test passed",
      "The next test that uses the same fixture",
    ],
    answer: 0,
    why: "Code after yield is teardown and always runs, so resources are released even when an assertion fails.",
  },

  // --- C++ depth -----------------------------------------------------------
  {
    id: "cppd-1",
    moduleSlug: "sde-cpp-depth",
    prompt: "On a typical 64-bit platform, what is sizeof(struct { char a; double d; char b; })?",
    options: [
      "10 — the sum of the members",
      "24 — padding after a to align d, and trailing padding to a multiple of 8",
      "16 — the compiler reorders the chars next to each other",
      "17 — one padding byte per member",
    ],
    answer: 1,
    why: "a at 0, 7 bytes of padding, d at 8, b at 16, then 7 bytes so the size is a multiple of 8. C++ keeps declaration order; putting d first gives 16.",
  },
  {
    id: "cppd-2",
    moduleSlug: "sde-cpp-depth",
    prompt: "Code that reads a float's bits through `*reinterpret_cast<uint32_t*>(&f)` works at -O0 and breaks at -O2. Why?",
    options: [
      "-O2 changes the size and alignment of float on some platforms, so the cast reads the wrong bytes",
      "reinterpret_cast is compiled to a no-op under optimisation, so the pointer is never converted",
      "The value is kept in a register at -O2, and a register has no address for the cast to use",
      "It violates strict aliasing, so the optimiser may assume the two pointers never refer to the same object",
    ],
    answer: 3,
    why: "Reading a float through a uint32_t* is undefined behaviour, and optimisers exploit it by reordering or dropping loads. std::memcpy or std::bit_cast is the defined way.",
  },
  {
    id: "cppd-3",
    moduleSlug: "sde-cpp-depth",
    prompt: "A class holds a raw owning pointer, frees it in its destructor, and has no copy constructor. What happens when an object is copied?",
    options: [
      "The compiler refuses to copy it, because a user-declared destructor deletes the copy constructor",
      "The default copy deep-copies the pointed-to data, since the class owns it",
      "Both objects hold the same pointer, and the second destructor frees it again — a double free",
      "The copy's pointer is set to nullptr automatically, so only the original frees the memory",
    ],
    answer: 2,
    why: "That is the rule of three: a class that needs a destructor needs copy operations too. Better, the rule of zero — hold a unique_ptr and let the compiler generate correct behaviour.",
  },
  {
    id: "cppd-4",
    moduleSlug: "sde-cpp-depth",
    prompt: "Which tool finds a heap-buffer-overflow and prints where the memory was allocated, at about 2× slowdown?",
    options: [
      "AddressSanitizer (-fsanitize=address)",
      "gdb with a watchpoint on the buffer",
      "Valgrind, which needs no recompilation",
      "-Wall -Wextra compiler warnings",
    ],
    answer: 0,
    why: "ASan instruments the build and reports the bad access plus the allocation and free stacks. Valgrind finds similar bugs without recompiling but is 20–50× slower; warnings cannot see runtime overflows.",
  },
  {
    id: "cppd-5",
    moduleSlug: "sde-cpp-depth",
    prompt: "Two threads increment separate counters stored next to each other in an array, and the program scales badly. What is the likely cause?",
    options: [
      "The counters must be atomic even though each thread has its own, or increments are lost",
      "The array is on the main thread's stack, so other threads access it through a slow path",
      "The CPU serialises integer increments to one core at a time to keep memory consistent",
      "False sharing — both counters sit on one cache line that bounces between the cores",
    ],
    answer: 3,
    why: "Each write invalidates the other core's copy of the line. Aligning each counter to its own 64-byte line (alignas(64)) removes the contention.",
  },
];
