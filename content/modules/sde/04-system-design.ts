import type { Module } from "@/content/types";

const HI = "https://www.hellointerview.com/learn/system-design";
const PRIMER = "https://github.com/donnemartin/system-design-primer";

export const systemDesign: Module = {
  slug: "sde-system-design",
  trackSlug: "sde",
  phaseSlug: "depth",
  order: 1,
  title: "System design: the entry level",
  summary:
    "A fresher is not expected to design Twitter. You are expected to run a structured conversation — clarify, estimate, sketch, go deep on one part, name the trade-offs — and to do it out loud. This module gives you the framework, the arithmetic, and the three problems that appear most often at entry level: a URL shortener, a rate limiter and a pastebin.",
  prereqSlugs: ["sde-rest-fastapi"],
  units: [
    {
      slug: "sde-sd-framework",
      title: "The framework",
      objective:
        "Run a 45-minute design interview in stages — requirements, estimates, API, data model, high-level design, deep dive — and keep the interviewer with you.",
      estMinutes: 60,
      conceptMd: `A system design interview is scored on **how you think**, not on whether your design matches a reference answer. The structure is what makes your thinking visible:

| Stage | Minutes | What you produce |
|---|---|---|
| 1. **Requirements** | 5 | 3–5 functional requirements ("users can shorten a URL"), and the non-functional ones: scale, latency, availability vs consistency, read/write ratio |
| 2. **Estimates** | 3–5 | requests per second, storage over the retention period, read vs write load — only the numbers that change the design |
| 3. **API** | 3–5 | the endpoints, with request and response shapes |
| 4. **Data model** | 3–5 | the main entities, their keys, and where they live |
| 5. **High-level design** | 10 | boxes and arrows: clients, load balancer, services, databases, caches, queues — one request traced through it |
| 6. **Deep dive** | 10–15 | the hardest part, in depth: key generation, the hot path, a bottleneck, failure handling |
| 7. **Wrap-up** | 2–3 | trade-offs you made, what breaks first at 10× scale, what you would monitor |

The habits that score:

- **Clarify before drawing.** Ask about scale, users and features; write the answers down. Designing before scoping is the most common failure.
- **Say your trade-offs.** "I'll use Postgres because the data is relational and 1,200 reads a second fits one instance with a cache; if writes grew 100× I'd revisit" beats naming a trendy database.
- **Start simple, then scale.** One server and one database first; add a cache, replicas, queues when a number demands them.
- **Drive, but check in.** "I'd like to go deeper on key generation — or is there another area you'd prefer?"

For a fresher, the bar is a coherent design that works, with honest trade-offs — not every component in the book.`,
      interviewAngle:
        "Most entry-level candidates fail system design by jumping straight to boxes. Spending the " +
        "first five minutes on requirements, out loud, already puts you ahead.",
      pitfalls: [
        "Drawing the architecture before agreeing on requirements and scale.",
        "Adding Kafka, microservices and sharding to a design that needs one database.",
        "Naming technologies without a reason tied to a requirement or a number.",
        "Staying silent while thinking — the interviewer can only score what you say.",
      ],
      recall: [
        {
          front: "List the stages of a system design interview in order.",
          back:
            "Requirements, estimates, API, data model, high-level design, deep dive, wrap-up with " +
            "trade-offs.",
        },
        {
          front: "What are non-functional requirements in a design interview, with examples?",
          back:
            "Qualities rather than features: scale, latency targets, availability versus " +
            "consistency, durability, the read/write ratio.",
        },
        {
          front: "Why start a design with one server and one database?",
          back:
            "It is the simplest thing that works; each scaling component should be added only when " +
            "a number shows it is needed, and you can say which number.",
        },
      ],
      resources: [
        {
          title: "Hello Interview — the delivery framework",
          url: `${HI}/in-a-hurry/delivery`,
          kind: "read",
          minutes: 25,
          whyThisOne: "The stages with time budgets, written for exactly this interview.",
          isPrimary: true,
        },
        {
          title: "System Design Primer",
          url: PRIMER,
          kind: "read",
          minutes: 40,
          whyThisOne: "The standard free reference; read \"How to approach a system design interview question\".",
        },
      ],
    },
    {
      slug: "sde-sd-estimation",
      title: "Back-of-the-envelope estimation",
      objective:
        "Estimate QPS, storage and bandwidth from user numbers in under five minutes, and know the latency numbers that decide designs.",
      estMinutes: 60,
      conceptMd: `Estimation is not about precision. It answers one question: **does this fit on one machine, or not?**

**The shortcuts:**

- A day has 86,400 seconds — call it **10⁵**. So 1 million requests a day ≈ **12 per second**; 100 million a day ≈ 1,200 per second.
- **Peak ≈ 2–3× average.** Design for the peak.
- 1 KB × 1 million = 1 GB. 1 KB × 1 billion = 1 TB.
- Powers of two: 2¹⁰ ≈ 10³ (KB), 2²⁰ ≈ 10⁶ (MB), 2³⁰ ≈ 10⁹ (GB), 2⁴⁰ ≈ 10¹² (TB).

**A worked example** — a URL shortener with 1 million new links a day and 100 reads per write:

\`\`\`text
writes   1M / 10^5 s          ≈ 12 /s    (peak ~30 /s)
reads    12 × 100             ≈ 1,200 /s (peak ~3,000 /s)
storage  1M/day × 500 B × 365 × 5 years ≈ 0.9 TB
\`\`\`

Conclusion: writes are trivial, reads are the hot path (so cache), and the data fits comfortably in one well-indexed database. That conclusion is the point of the exercise.

**Latency numbers worth knowing** (orders of magnitude):

| Operation | Time |
|---|---|
| main memory reference | ~100 ns |
| SSD random read | ~tens of µs to ~100 µs |
| round trip within a datacenter | ~0.5 ms |
| disk seek (spinning) | ~2–10 ms |
| round trip India ↔ US | ~150–250 ms |

The lesson in the table: memory is ~1,000× faster than a network hop, and a cross-continent round trip costs more than almost anything you do locally — which is why caches and CDNs exist.`,
      interviewAngle:
        "Interviewers watch whether your numbers change your design. \"1,200 reads a second fits " +
        "one Postgres with a cache\" is worth more than three sharded clusters justified by nothing.",
      pitfalls: [
        "Computing numbers and then ignoring them in the design.",
        "Designing for average load instead of peak.",
        "Spending ten minutes on exact arithmetic — round aggressively.",
        "Forgetting retention: storage per day means little without how long you keep it.",
      ],
      recall: [
        {
          front: "Roughly how many requests per second is 1 million requests a day?",
          back: "About 12 (a day is ~10⁵ seconds). Peak is 2–3× that.",
        },
        {
          front: "What question is back-of-the-envelope estimation really answering?",
          back: "Whether the load and data fit on one machine or need distribution — and which part is the hot path.",
        },
        {
          front: "Order these by latency: SSD random read, memory reference, cross-continent round trip, in-datacenter round trip.",
          back: "Memory (~100 ns) < SSD random read (~tens of µs) < datacenter round trip (~0.5 ms) < cross-continent (~150+ ms).",
        },
      ],
      resources: [
        {
          title: "napkin-math",
          url: "https://github.com/sirupsen/napkin-math",
          kind: "read",
          minutes: 30,
          whyThisOne: "Measured numbers for modern hardware and the method for using them.",
          isPrimary: true,
        },
        {
          title: "Latency numbers every programmer should know",
          url: "https://gist.github.com/jboner/2841832",
          kind: "read",
          minutes: 10,
          whyThisOne: "The classic table — learn the orders of magnitude, not the digits.",
        },
      ],
    },
    {
      slug: "sde-sd-url-shortener",
      title: "Design a URL shortener",
      objective:
        "Design a URL shortener end to end, with a defensible key-generation scheme, a redirect path that handles the read load, and a reasoned 301-versus-302 choice.",
      estMinutes: 90,
      conceptMd: `**Requirements.** Shorten a long URL to a short code; redirect the short URL to the long one; optional custom aliases and expiry. Non-functional: redirects are fast (tens of ms) and highly available; codes are unique; reads far exceed writes (≈100:1).

**API.**

\`\`\`text
POST /links          { "url": "...", "alias"?: "...", "expires_at"?: "..." }  → 201 { "code": "aZ3x9Qk" }
GET  /{code}         → 302 Location: <long url>     (404 if unknown or expired)
\`\`\`

**Data model.** \`links(code PK, long_url, created_at, expires_at, owner_id)\`. The only query on the hot path is lookup by primary key.

**Key generation — the deep dive.** Seven base62 characters (a–z, A–Z, 0–9) give 62⁷ ≈ **3.5 trillion** codes. Options:

| Approach | How | Trade-off |
|---|---|---|
| Hash and truncate | first 7 chars of base62(SHA-256(url)) | collisions must be detected and retried; same URL → same code (sometimes wanted) |
| Counter + base62 | a global auto-increment ID, encoded | no collisions, short; codes are guessable and the counter is a single point of contention |
| Counter ranges | each app server leases a block of IDs (say 10,000) from the DB | no per-request coordination; gaps if a server dies (harmless) |
| Pre-generated keys | a key service fills a table of unused random codes | unguessable; one more component to run |

A strong answer: counter ranges (or random codes checked against a unique index), with the reasoning.

**The redirect path.** 1,200 reads a second at peak ~3,000: put a **cache** (Redis) in front of the database with cache-aside; popular links are few, so the hit rate is high. Add read replicas only if the cache is not enough.

**301 or 302?** A **301** (permanent) is cached by browsers, so repeat visits never reach you — cheaper, but you lose click analytics and cannot change the target. A **302** (temporary) sends every click through you. Most shorteners choose 302 for analytics; say which you chose and why.`,
      interviewAngle:
        "The URL shortener is the most common entry-level design question. Key generation and the " +
        "301/302 choice are the deep-dive questions — prepare both until you can explain them in " +
        "one breath.",
      pitfalls: [
        "Choosing hash-and-truncate without handling collisions.",
        "A single global counter on every request with no mention of the contention it causes.",
        "Not caching the redirect path when reads are 100× writes.",
        "Saying 301 without noticing it hides clicks from your analytics.",
      ],
      recall: [
        {
          front: "How many codes do 7 base62 characters give, roughly?",
          back: "62⁷ ≈ 3.5 trillion.",
        },
        {
          front: "301 versus 302 for a URL shortener's redirect — what is the trade-off?",
          back:
            "301 is cached by browsers, so repeat clicks skip your servers — cheaper, but no " +
            "analytics and no changing the target. 302 routes every click through you.",
        },
        {
          front: "How do counter ranges avoid a global counter bottleneck in key generation?",
          back:
            "Each server leases a block of IDs from the database and hands them out locally, " +
            "coordinating only once per block.",
        },
      ],
      resources: [
        {
          title: "Hello Interview — design a URL shortener",
          url: `${HI}/problem-breakdowns/bitly`,
          kind: "read",
          minutes: 40,
          whyThisOne: "A full walkthrough in the framework's order, with the key-generation options compared.",
          isPrimary: true,
        },
        {
          title: "System Design Primer — Pastebin / Bit.ly solution",
          url: `${PRIMER}/blob/master/solutions/system_design/pastebin/README.md`,
          kind: "read",
          minutes: 30,
          whyThisOne: "A second design of the same problem, with the estimation written out.",
        },
      ],
    },
    {
      slug: "sde-sd-rate-limiter-pastebin",
      title: "Design a rate limiter & a pastebin",
      objective:
        "Compare token bucket, fixed window and sliding window rate limiting, make one distributed with Redis, and adapt the URL-shortener design to a pastebin.",
      estMinutes: 90,
      conceptMd: `**Rate limiter.** Limit each client (API key, user or IP) to N requests per window; reject the rest with **429 Too Many Requests** and a \`Retry-After\` header.

| Algorithm | How | Strength | Weakness |
|---|---|---|---|
| **Token bucket** | a bucket of capacity B refills at r tokens/s; each request takes one | allows short bursts up to B, smooth average | two parameters to tune |
| Leaky bucket | requests queue and drain at a fixed rate | perfectly smooth output | bursts wait or are dropped |
| **Fixed window** | count per calendar minute | trivial: one counter | a burst at 00:59 and 01:00 lets through 2N in two seconds |
| Sliding window log | store each request's timestamp | exact | memory grows with the limit |
| **Sliding window counter** | weight the previous window's count by how much of it overlaps | near-exact, two counters | approximate |

**Distributed.** With several app servers, the counters must be shared — usually in **Redis**. A fixed window is \`INCR key\` plus \`EXPIRE\`; a token bucket or sliding window is a small **Lua script** so the read-and-update is atomic (otherwise two servers race and both allow the last request).

**Where it runs**: at the API gateway or as middleware, before any expensive work. And decide what happens if Redis is down: **fail open** (allow traffic, risk overload) or **fail closed** (reject, risk an outage). For most APIs, fail open.

**Pastebin** is the URL shortener with bigger values:

- The same key generation.
- **Content goes to object storage** (S3), not the database — pastes can be megabytes. The database keeps metadata: \`code, s3_key, created_at, expires_at, size\`.
- Serve popular pastes through a **CDN**.
- **Expiry**: a background job deletes expired rows and objects, or an S3 lifecycle rule does it; reads check \`expires_at\` anyway.`,
      interviewAngle:
        "\"Design a rate limiter\" tests algorithm trade-offs and distributed atomicity together. " +
        "Explaining the fixed-window boundary burst, and why the Redis update must be atomic, " +
        "covers the two things interviewers probe.",
      pitfalls: [
        "Proposing a fixed window without mentioning the burst at the window boundary.",
        "Read-then-write rate limiting in Redis without atomicity, so concurrent requests slip through.",
        "Storing multi-megabyte paste bodies in the relational database.",
        "Not deciding whether the limiter fails open or closed when its store is down.",
      ],
      recall: [
        {
          front: "What is the weakness of a fixed-window rate limiter?",
          back:
            "Bursts at a window boundary: N requests at the end of one window and N at the start " +
            "of the next let 2N through in a moment.",
        },
        {
          front: "Why does a distributed token bucket in Redis need a Lua script or similar?",
          back:
            "Reading the bucket and updating it must be atomic; otherwise two servers read the same " +
            "count and both allow a request.",
        },
        {
          front: "In a pastebin design, where does the paste content live, and why?",
          back: "In object storage such as S3 — pastes can be large; the database holds only metadata and the object key.",
        },
      ],
      resources: [
        {
          title: "Stripe — scaling your API with rate limiters",
          url: "https://stripe.com/blog/rate-limiters",
          kind: "read",
          minutes: 20,
          whyThisOne: "Four kinds of limiter in production at Stripe, with the token bucket in Redis.",
          isPrimary: true,
        },
        {
          title: "Cloudflare — rate limiting millions of domains",
          url: "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/",
          kind: "read",
          minutes: 20,
          whyThisOne: "The sliding window counter, with the maths and why they chose it.",
        },
      ],
    },
  ],
};
