import type { Module } from "@/content/types";

export const scaling: Module = {
  slug: "sde-scaling",
  trackSlug: "sde",
  phaseSlug: "depth",
  order: 2,
  title: "Scaling concepts",
  summary:
    "The building blocks every design answer is assembled from: stateless services behind a load balancer, caches and CDNs, database replicas, pooling and sharding, and queues with consumers that tolerate duplicates. Each one solves a specific bottleneck and brings a specific new problem — knowing both halves is what an interviewer is checking.",
  prereqSlugs: ["sde-system-design"],
  units: [
    {
      slug: "sde-sc-stateless-lb",
      title: "Stateless services & load balancing",
      objective:
        "Explain vertical versus horizontal scaling, make a service stateless so it can scale out, and choose a load-balancing layer and algorithm.",
      estMinutes: 60,
      conceptMd: `**Vertical scaling** — a bigger machine — is simple and has a ceiling (and a single point of failure). **Horizontal scaling** — more machines — has no hard ceiling, but only works if any instance can serve any request.

That requires **stateless** services: nothing a later request needs is kept in one instance's memory or disk.

| State | Where it goes instead |
|---|---|
| login sessions | a shared store (Redis) or a signed token (JWT) |
| uploaded files | object storage (S3) |
| caches | a shared cache, or accept per-instance caches as disposable |
| scheduled jobs | one scheduler or a queue, not every instance |

Twelve-factor calls this "processes are stateless and share-nothing". Once it holds, scaling out is adding instances, and an instance dying loses nothing.

**Load balancers** spread requests across instances and stop sending to unhealthy ones (**health checks**).

- **Layer 4** (TCP): forwards connections without reading them — fast, protocol-agnostic.
- **Layer 7** (HTTP): reads the request, so it can route by path or header, terminate TLS, and add headers. Nginx, AWS ALB.

Algorithms: **round robin** (fine when requests cost about the same), **least connections** (better when some requests are slow), **consistent hashing** (the same key goes to the same backend — useful for caches).

**Sticky sessions** pin a user to one instance. They are a workaround for state you did not move out, and they break even load distribution and failover — fix the state instead.`,
      interviewAngle:
        "\"How would you scale this API to 10× traffic?\" starts here: make it stateless, put it " +
        "behind a load balancer, add instances. Knowing why sticky sessions are a smell is a good " +
        "sign of depth.",
      pitfalls: [
        "Scaling out a service that keeps sessions in memory, so users are logged out at random.",
        "Relying on sticky sessions instead of moving state to a shared store.",
        "Load balancer health checks that only test that the port is open.",
        "Running a scheduled job on every instance, so it runs N times.",
      ],
      recall: [
        {
          front: "What must be true of a service before you can scale it horizontally?",
          back:
            "It must be stateless: sessions, files and jobs live in shared stores, so any instance " +
            "can serve any request and any instance can die.",
        },
        {
          front: "Layer 4 versus layer 7 load balancing — what can each see and do?",
          back:
            "L4 forwards TCP connections without reading them. L7 reads HTTP, so it can route by " +
            "path or header and terminate TLS.",
        },
        {
          front: "Why are sticky sessions considered a workaround?",
          back:
            "They exist because state was left in instance memory; they unbalance load and lose " +
            "sessions when that instance dies.",
        },
      ],
      resources: [
        {
          title: "System Design Primer — load balancer and horizontal scaling",
          url: "https://github.com/donnemartin/system-design-primer",
          kind: "read",
          minutes: 25,
          whyThisOne: "Read the load balancer and application layer sections for the trade-offs in one place.",
          isPrimary: true,
        },
        {
          title: "The Twelve-Factor App — processes",
          url: "https://12factor.net/processes",
          kind: "read",
          minutes: 10,
          whyThisOne: "The stateless, share-nothing rule in one short page.",
        },
      ],
    },
    {
      slug: "sde-sc-caching",
      title: "Caching & CDNs",
      objective:
        "Choose cache-aside or write-through, set TTLs, handle invalidation and stampedes, and explain what a CDN caches and how you control it.",
      estMinutes: 70,
      conceptMd: `A cache trades **freshness for speed**. Every caching decision is a decision about how stale data may be.

**Patterns:**

- **Cache-aside (lazy loading)** — the default. Read: check the cache; on a miss, read the database and put the result in the cache with a TTL. Write: update the database, then **delete** the cache key.
- **Write-through** — writes go to the cache and the database together. Reads are always warm; writes are slower, and data nobody reads is cached anyway.
- **Write-behind** — write to the cache, flush to the database later. Fast, and loses data if the cache dies first.

**Invalidation.** On a write, **delete** the key rather than updating it — two concurrent writers updating the cache can leave the older value there. Always set a **TTL** as a safety net, so any bug in invalidation heals itself.

**Cache stampede (thundering herd).** A popular key expires and a thousand requests miss at once, all hitting the database. Fixes: let one request rebuild while the others wait or get the stale value (a lock or request coalescing); add random **jitter** to TTLs so keys do not expire together.

**What to cache:** data read far more than it is written, where brief staleness is acceptable — a product page, a user's profile, a URL-shortener lookup. Not: account balances, or anything where stale means wrong.

**Eviction.** When memory fills, Redis evicts by policy — usually **LRU** (least recently used). A cache is not a database: anything in it can vanish.

**CDNs** cache content at edge locations near users: static assets, images, and cacheable API responses. You control them with HTTP headers — \`Cache-Control: public, max-age=31536000, immutable\` for fingerprinted assets (\`app.3f9a.js\`), short \`max-age\` or \`no-store\` for dynamic pages — and with purges when something must change now.`,
      interviewAngle:
        "\"Add a cache\" is the most common scaling answer and the follow-ups are predictable: " +
        "what pattern, what TTL, how is it invalidated, what happens when a hot key expires. Have " +
        "an answer for each.",
      pitfalls: [
        "Updating the cache on write instead of deleting the key, so a race leaves stale data.",
        "Caches with no TTL, so an invalidation bug serves stale data forever.",
        "Caching data where staleness is incorrect, such as balances or stock levels at checkout.",
        "Identical TTLs on many hot keys, so they expire together and stampede the database.",
      ],
      recall: [
        {
          front: "Describe cache-aside reads and writes in one sentence each.",
          back:
            "Read: check the cache, on a miss read the DB and fill the cache with a TTL. Write: " +
            "update the DB, then delete the cache key.",
        },
        {
          front: "What is a cache stampede, and two ways to prevent it?",
          back:
            "Many requests miss on one expired hot key and all hit the database. Prevent it with " +
            "a rebuild lock or request coalescing, and jittered TTLs.",
        },
        {
          front: "Why can fingerprinted static assets be cached by a CDN for a year?",
          back: "The filename changes whenever the content does, so a cached copy can never be stale.",
        },
      ],
      resources: [
        {
          title: "AWS — caching best practices",
          url: "https://aws.amazon.com/caching/best-practices/",
          kind: "read",
          minutes: 20,
          whyThisOne: "Cache-aside, write-through, TTLs and the thundering herd, concisely.",
          isPrimary: true,
        },
        {
          title: "AWS ElastiCache — caching strategies",
          url: "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html",
          kind: "docs",
          minutes: 15,
          whyThisOne: "Lazy loading and write-through side by side, with the code for each.",
        },
      ],
    },
    {
      slug: "sde-sc-databases",
      title: "Replicas, pooling & sharding",
      objective:
        "Scale a relational database in the right order — indexes and caching, then connection pooling, read replicas, and only then sharding — and name the new problem each step brings.",
      estMinutes: 75,
      conceptMd: `Scale a database in this order, stopping as soon as the numbers are satisfied:

**1. Indexes and queries** (Core CS depth module) and **a cache** — usually the biggest win.

**2. Connection pooling.** Postgres starts a process per connection; a few hundred connections cost real memory and context switching. Many app instances × a pool each can exceed \`max_connections\`. A pooler like **PgBouncer** in **transaction mode** lets thousands of client connections share a few dozen server connections — at the cost of session features: SQL-level \`PREPARE\`, \`SET\`, temporary tables and advisory locks held across transactions.

**3. Read replicas.** The primary streams its write-ahead log to replicas; reads go to replicas, writes to the primary. Replication is usually **asynchronous**, so replicas **lag** — a user who saves a profile and immediately reloads it from a replica may see the old version. Fix with **read-your-writes**: send a user's reads to the primary for a short time after they write, or for that page.

**4. Sharding** — split the data across several databases by a **shard key**:

| Strategy | How | Risk |
|---|---|---|
| Hash | shard = hash(key) mod N | resharding moves most data (consistent hashing reduces it) |
| Range | shard by key ranges (A–F, G–M…) | hot spots if the range is popular |
| Directory | a lookup service maps key → shard | one more component to run |

Choose a shard key that spreads load **and** keeps most queries on one shard (often \`user_id\`). The costs: cross-shard joins and transactions become application problems, unique constraints are per shard, and rebalancing is hard. Which is why sharding comes last — most systems never need it.

**Vertical partitioning** — moving some tables to their own database — is a simpler step before sharding.`,
      interviewAngle:
        "\"The database is the bottleneck — what do you do?\" Walking the order (queries, cache, " +
        "pooling, replicas, sharding) and naming replica lag and shard-key choice shows judgement, " +
        "not just vocabulary.",
      pitfalls: [
        "Jumping to sharding before indexes, caching, pooling and replicas.",
        "Reading from a replica right after a write and showing the user stale data.",
        "Choosing a shard key that puts one huge customer or one hot range on a single shard.",
        "Using session-level features through a transaction-mode pooler.",
      ],
      recall: [
        {
          front: "What is replica lag, and how does read-your-writes work around it?",
          back:
            "Asynchronous replicas trail the primary, so a fresh write may be missing. Route a " +
            "user's reads to the primary briefly after they write.",
        },
        {
          front: "Why does Postgres need a connection pooler like PgBouncer at scale?",
          back:
            "Each connection is a server process with real memory cost; a pooler lets many client " +
            "connections share a few server connections.",
        },
        {
          front: "What makes a good shard key?",
          back:
            "It spreads data and load evenly and keeps most queries on a single shard — for many " +
            "apps, the user or tenant ID.",
        },
      ],
      resources: [
        {
          title: "DigitalOcean — understanding database sharding",
          url: "https://www.digitalocean.com/community/tutorials/understanding-database-sharding",
          kind: "read",
          minutes: 20,
          whyThisOne: "Hash, range and directory sharding with their trade-offs, clearly drawn.",
          isPrimary: true,
        },
        {
          title: "PgBouncer — features",
          url: "https://www.pgbouncer.org/features.html",
          kind: "docs",
          minutes: 10,
          whyThisOne: "The pooling modes and exactly which features transaction mode breaks.",
        },
        {
          title: "PostgreSQL — high availability, load balancing and replication",
          url: "https://www.postgresql.org/docs/current/high-availability.html",
          kind: "docs",
          minutes: 20,
          whyThisOne: "Streaming replication, synchronous versus asynchronous, from the source.",
        },
      ],
    },
    {
      slug: "sde-sc-queues",
      title: "Queues & idempotent consumers",
      objective:
        "Use a message queue to decouple and absorb load, and write consumers that are correct under at-least-once delivery.",
      estMinutes: 70,
      conceptMd: `A **message queue** sits between a producer and a consumer. It buys three things:

- **Decoupling** — the API accepts an order and returns; sending the email, generating the invoice and updating analytics happen later, in separate workers that can fail independently.
- **Load levelling** — a spike of 10,000 jobs waits in the queue instead of overwhelming the workers.
- **Retries** — a failed job is redelivered instead of lost.

**Delivery guarantees.** Most queues (SQS standard, RabbitMQ with acks, Kafka consumers) give **at-least-once** delivery: a message is redelivered if the consumer does not acknowledge it in time — including when the consumer finished the work but crashed before acknowledging. **Duplicates will happen.** "Exactly-once" end to end is only achievable by making the effect idempotent.

**Idempotent consumers:**

- Give every message a unique ID. Record processed IDs in a table **in the same transaction** as the work; skip a message whose ID is already there.
- Or make the operation naturally idempotent: an upsert, "set status = shipped" rather than "increment count".

**The moving parts to name:**

- **Ack after the work**, not before — acking first turns a crash into a lost message.
- **Visibility timeout** (SQS) — how long a received message is hidden before redelivery. Longer than the job takes.
- **Dead-letter queue** — after N failed attempts, park the message for inspection instead of retrying forever.
- **Ordering** — standard queues may reorder; FIFO queues and Kafka partitions keep order per key, at lower throughput.

**The dual-write problem.** Writing to the database and then publishing to the queue can fail between the two. The **outbox pattern** writes the message to an \`outbox\` table in the same transaction, and a relay publishes it — so both happen or neither does.`,
      interviewAngle:
        "\"What if the worker processes a message twice?\" is the standard follow-up whenever you " +
        "add a queue. At-least-once delivery plus an idempotent consumer — with the processed-IDs " +
        "table in the same transaction — is the answer.",
      pitfalls: [
        "Assuming the queue delivers exactly once and writing a non-idempotent consumer.",
        "Acknowledging a message before the work is done.",
        "A visibility timeout shorter than the job, so a slow job is picked up twice.",
        "Retrying a poison message forever instead of sending it to a dead-letter queue.",
      ],
      recall: [
        {
          front: "Why do at-least-once queues deliver duplicates even when nothing is misconfigured?",
          back:
            "A consumer can finish the work and crash before acknowledging; the message is then " +
            "redelivered and processed again.",
        },
        {
          front: "How does a consumer become idempotent with a processed-messages table?",
          back:
            "It records each message ID in the same transaction as the work and skips any ID " +
            "already recorded.",
        },
        {
          front: "What problem does the outbox pattern solve?",
          back:
            "The dual write: saving to the database and publishing to a queue can half-fail. The " +
            "message is written to an outbox table in the same transaction and relayed later.",
        },
      ],
      resources: [
        {
          title: "microservices.io — idempotent consumer",
          url: "https://microservices.io/patterns/communication-style/idempotent-consumer.html",
          kind: "read",
          minutes: 10,
          whyThisOne: "The pattern, the processed-messages table and why it must share the transaction.",
          isPrimary: true,
        },
        {
          title: "AWS SQS — at-least-once delivery",
          url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html",
          kind: "docs",
          minutes: 10,
          whyThisOne: "The vendor stating plainly that duplicates happen and consumers must cope.",
        },
        {
          title: "RabbitMQ — work queues tutorial",
          url: "https://www.rabbitmq.com/tutorials/tutorial-two-python",
          kind: "lab",
          minutes: 30,
          whyThisOne: "Run a producer and two workers in Python; see acks and redelivery happen.",
        },
      ],
    },
  ],
};
