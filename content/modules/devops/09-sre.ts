import type { Module } from "@/content/types";

export const sre: Module = {
  slug: "devops-sre",
  trackSlug: "devops",
  phaseSlug: "depth",
  order: 5,
  title: "SRE principles",
  summary:
    "The vocabulary and the habits that turn \"the DevOps person\" into an SRE candidate: measure reliability as users feel it, decide in advance how much unreliability is acceptable, spend that budget deliberately, respond to incidents in a practised way, learn from them without blame, and build systems that fail gracefully. Every idea here should end in something real on atlas.",
  prereqSlugs: ["devops-observability"],
  units: [
    {
      slug: "devops-sre-slis",
      title: "Golden signals & SLIs",
      objective:
        "Define an SLI as good events over valid events, choose where to measure it, and write atlas's latency and availability SLIs.",
      estMinutes: 60,
      primer: `**SRE** (Site Reliability Engineering) treats reliability as something you measure and manage, not a feeling.

It starts with an **SLI** — a Service Level *Indicator* — a number that captures what users experience, written as a ratio: **good events ÷ valid events**. For example: *the share of requests that succeeded*, or *the share of requests answered in under 300 ms*.

Where you measure matters. Measuring at the load balancer counts failures the app never saw; measuring inside the app misses requests that never reached it. The closer to the user, the more honest the number.

The next unit turns SLIs into targets.

**You need already:** the observability module — SLIs are PromQL queries in practice.`,
      conceptMd: `The **four golden signals** are what to watch on any user-facing service:

- **Latency** — how long requests take. Track successful and failed requests separately: a fast error is not good latency.
- **Traffic** — demand: requests per second.
- **Errors** — the rate of failed requests, including "successful" responses with the wrong content.
- **Saturation** — how full the most constrained resource is (CPU, memory, connection pool, queue), and the leading indicator of trouble.

An **SLI** (service level indicator) turns one of these into a number between 0 and 100%:

> **SLI = good events ÷ valid events**

For atlas:

- **Availability SLI**: the share of requests that did not return a 5xx.
- **Latency SLI**: the share of requests served in under **300 ms**.

Two decisions make an SLI honest:

1. **Use a threshold, not an average.** "Mean latency 120 ms" hides the 5% of users waiting three seconds. "97% of requests under 300 ms" does not.
2. **Measure as close to the user as you can.** At the load balancer or reverse proxy you see requests that never reached the app (it was down); in the app you only see requests that got there. Client-side measurement is truer still but harder.

Decide which events are *valid* too — health checks and bots usually are not, and they flatter the number.`,
      interviewAngle:
        "\"How would you measure the reliability of this service?\" — answer with an SLI as a " +
        "ratio of good to valid events, a latency threshold rather than an average, and where you " +
        "would measure it.",
      pitfalls: [
        "Using average latency as an SLI, which hides the slow tail.",
        "Measuring only inside the app, so requests that never arrived are invisible.",
        "Counting health checks as valid events, inflating availability.",
        "Treating saturation as a curiosity rather than the early warning it is.",
      ],
      recall: [
        {
          front: "Write the general formula for an SLI.",
          back: "Good events divided by valid events, expressed as a percentage.",
        },
        {
          front: "Why is \"p95 under 300 ms\" or \"share under 300 ms\" better than mean latency as an SLI?",
          back: "An average hides the slow tail that real users experience; a threshold counts every slow request.",
        },
        {
          front: "Why measure an availability SLI at the load balancer rather than in the application?",
          back: "The load balancer also sees requests that failed because the app was down or unreachable; the app cannot count those.",
        },
      ],
      resources: [
        {
          title: "Google SRE book — Service level objectives",
          url: "https://sre.google/sre-book/service-level-objectives/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "SLI, SLO and SLA defined properly — the highest-leverage reading this month.",
          steps: [
            "Read the chapter; write each of SLI, SLO and SLA in one sentence of your own.",
            "Write atlas's availability SLI and latency SLI as good ÷ valid.",
            "Read the workbook chapter (next link) for where to measure them.",
          ],
          isPrimary: true,
        },
        {
          title: "Google SRE workbook — Implementing SLOs",
          url: "https://sre.google/workbook/implementing-slos/",
          kind: "read",
          whyThisOne:
            "Worked examples of choosing SLIs and deciding where to measure them.",
        },
      ],
    },
    {
      slug: "devops-sre-slos",
      title: "SLOs, error budgets & burn rate",
      objective:
        "Turn an SLI into an SLO and an error budget, write an error budget policy, and alert on burn rate instead of raw errors.",
      estMinutes: 80,
      primer: `An **SLO** (Service Level Objective) is a target for an SLI over a time window: "99.9% of requests succeed, measured over 30 days".

Nothing is 100% reliable, and trying for it makes you stop shipping. The gap between the SLO and 100% is the **error budget** — here 0.1%, or about 43 minutes of full outage a month. While budget remains, you ship features freely; when it is spent, reliability work comes first. An **error budget policy** writes that rule down in advance.

Alerting on every error is noisy. Instead, alert on the **burn rate** — how fast you are spending the budget. Burning it 14 times faster than planned means it will be gone in about two days: page someone. A slow burn becomes a ticket instead.

**You need already:** the SLI unit.`,
      conceptMd: `An **SLO** is a target for an SLI over a window: *99.5% of requests succeed, measured over 30 days.* An **SLA** is a contract with consequences (refunds) and is set looser than the SLO, so you notice trouble before it costs money.

**100% is the wrong target.** Users cannot tell 99.99% from 100% through their own flaky Wi-Fi, and each extra nine costs far more than the last while slowing every change.

**The error budget** is what the SLO leaves over: 99.5% allows **0.5%** of requests to fail. Over 30 days that is about **3.6 hours** of full downtime (30 × 24 × 0.005), or proportionally more partial failure.

The budget turns reliability arguments into arithmetic:

- Budget left → ship features, run experiments, deploy on Friday.
- Budget spent → the **error budget policy** applies: freeze risky releases, put the next sprint into reliability work, until the window recovers.

Write the policy down *before* you need it; agreeing on it mid-incident does not work.

**Burn rate** is how fast the budget is being used relative to spending it evenly across the window. A burn rate of **1** uses exactly the whole budget in 30 days; **14.4** uses 2% of it in one hour — at that pace it is gone in about two days.

Alerting on burn rate instead of "error rate above X" pages for problems in proportion to what they cost. The SRE workbook's standard setup:

| Budget consumed | In | Burn rate | Action |
|---|---|---|---|
| 2% | 1 hour | 14.4 | page |
| 5% | 6 hours | 6 | page |
| 10% | 3 days | 1 | ticket |

Each alert also checks a **short window** (for example 5 minutes for the 1-hour alert) so it stops firing soon after the problem is fixed.`,
      interviewAngle:
        "\"What is an error budget and what do you do when it runs out?\" is the signature SRE " +
        "question. The arithmetic (99.5% → about 3.6 hours a month) plus a written policy is a " +
        "complete answer; burn-rate alerting is the follow-up that impresses.",
      pitfalls: [
        "Setting an SLO of 100%, or higher than the dependencies can deliver.",
        "Confusing SLO and SLA, or setting the SLA tighter than the SLO.",
        "Having an error budget but no policy for what happens when it is spent.",
        "Alerting on any error spike instead of on the rate the budget is burning.",
      ],
      recall: [
        {
          front: "How much downtime does a 99.5% monthly availability SLO allow?",
          back: "0.5% of 30 days — about 3.6 hours.",
        },
        {
          front: "What does a burn rate of 1 mean, and what does 14.4 mean?",
          back:
            "1 spends exactly the whole error budget over the SLO window. 14.4 spends 2% of a " +
            "30-day budget in an hour, exhausting it in about two days.",
        },
        {
          front: "What is an error budget policy for?",
          back:
            "It decides in advance what happens when the budget is spent — typically freezing " +
            "risky releases and prioritising reliability work — so it is not argued mid-crisis.",
        },
        {
          front: "Why is an SLA set looser than the SLO?",
          back: "So you breach your internal target and react before you breach the contract that costs money.",
        },
      ],
      resources: [
        {
          title: "Google SRE book — Embracing risk",
          url: "https://sre.google/sre-book/embracing-risk/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Why 100% is the wrong target, and where the error budget idea comes from.",
          steps: [
            "Read the chapter and work out atlas's monthly error budget for a 99.5% SLO, in minutes.",
            "Read the workbook's *Alerting on SLOs* (next link) up to the multiwindow, multi-burn-rate table.",
            "Adapt the example error budget policy (last link) for atlas.",
          ],
          isPrimary: true,
        },
        {
          title: "Google SRE workbook — Alerting on SLOs",
          url: "https://sre.google/workbook/alerting-on-slos/",
          kind: "read",
          whyThisOne:
            "Builds burn-rate alerting step by step, including the multiwindow table.",
        },
        {
          title: "Google SRE workbook — Error budget policy",
          url: "https://sre.google/workbook/error-budget-policy/",
          kind: "read",
          whyThisOne:
            "A real policy document to adapt.",
        },
      ],
    },
    {
      slug: "devops-sre-incidents",
      title: "Incident response & on-call",
      objective:
        "Run an incident with clear roles, mitigate before diagnosing, communicate on a schedule, and describe what makes an on-call rotation sustainable.",
      estMinutes: 60,
      primer: `An **incident** is anything that hurts users enough to need a coordinated response. The single most important rule: **mitigate first, diagnose later**. Roll back, fail over, turn the feature off — stop the harm, *then* work out why.

Incidents go better with clear roles:

- an **incident commander** coordinates and makes decisions, and does not debug;
- **responders** do the hands-on work;
- a **communications lead** posts regular updates, so nobody has to interrupt the responders to ask.

A **severity level** decides how loud the response is. **On-call** is the rota of who responds; it stays sustainable only when pages are rare and every one is actionable.

**You need already:** alerting from the observability module.`,
      conceptMd: `An incident is a coordination problem as much as a technical one. The practices that work:

**Declare it early.** Opening an incident that turns out small costs little; a quiet one that grows with no one in charge costs a lot.

**Severity levels** set the response. A typical scale: **SEV1** — the service is down or data is at risk for many users, all hands; **SEV2** — major degradation or a key feature broken; **SEV3** — minor, handle in hours.

**Roles** (from the Incident Command System):

- **Incident commander** — coordinates, decides, delegates. Does *not* debug.
- **Operations lead** — the people making changes to the system.
- **Communications lead** — regular status updates to stakeholders and users.
- **Scribe** — a timeline of what was seen and done, with timestamps. This becomes the postmortem.

**Mitigate first, diagnose later.** Roll back the last deploy, fail over, shed load, turn off the feature flag — restore service, *then* find the root cause. The most common mistake is debugging a live outage for an hour when a rollback would have ended it in five minutes.

**Communicate on a schedule** ("next update in 30 minutes") even when there is nothing new; silence is what makes stakeholders escalate.

**On-call that lasts:** pages are rare and actionable; every alert has a runbook; the rotation has a secondary; time spent on call is compensated; and each page leads to a fix so it does not page again. Google's guidance caps it at a couple of incidents per shift.`,
      interviewAngle:
        "\"You are paged at 2 a.m. and the site is down — what do you do?\" Mitigate first (the " +
        "last deploy is the prime suspect), communicate, then diagnose. Naming the incident " +
        "commander role shows you know how teams actually run incidents.",
      pitfalls: [
        "Diagnosing the root cause while users are down, when a rollback would restore service now.",
        "The incident commander also debugging, so nobody coordinates.",
        "No status updates, so stakeholders interrupt the responders to ask.",
        "No timeline kept during the incident, so the postmortem is reconstructed from memory.",
      ],
      recall: [
        {
          front: "In an outage, why mitigate before finding the root cause?",
          back:
            "Users are hurt for as long as the diagnosis takes. Rolling back or failing over " +
            "restores service now; the cause can be found afterwards, calmly.",
        },
        {
          front: "What does the incident commander do, and what do they deliberately not do?",
          back: "Coordinate, decide and delegate. They do not debug hands-on, so someone always has the whole picture.",
        },
        {
          front: "What makes an on-call rotation sustainable?",
          back:
            "Rare, actionable pages with runbooks; a secondary; compensation; and fixing the cause " +
            "of each page so it does not recur.",
        },
      ],
      resources: [
        {
          title: "Google SRE book — Managing incidents",
          url: "https://sre.google/sre-book/managing-incidents/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "A badly handled incident and the same one handled well, side by side.",
          steps: [
            "Read both versions of the incident and list what changed between them.",
            "Read PagerDuty's severity levels (next link) and define three for atlas.",
            "Read the chapter on being on-call (last link).",
          ],
          isPrimary: true,
        },
        {
          title: "PagerDuty — Severity levels",
          url: "https://response.pagerduty.com/before/severity_levels/",
          kind: "read",
          whyThisOne:
            "Concrete severity definitions from a company that runs incident response daily.",
        },
        {
          title: "Google SRE book — Being on-call",
          url: "https://sre.google/sre-book/being-on-call/",
          kind: "read",
          whyThisOne:
            "What a healthy rotation looks like, in numbers.",
        },
      ],
    },
    {
      slug: "devops-sre-postmortems-toil",
      title: "Blameless postmortems & toil",
      objective:
        "Write a blameless postmortem for a real atlas failure, and identify and eliminate a piece of toil.",
      estMinutes: 90,
      primer: `After an incident comes the **postmortem**: a written account of what happened, why, and what will change so it does not happen again. It is **blameless** — it asks "how did our system let a reasonable person make this mistake?", not "who messed up?". People who fear blame hide the details that fixes depend on.

A postmortem has a timeline, the impact, the root causes, what went well, and **action items** with owners and dates.

**Toil** is manual, repetitive operational work that could be automated and grows with the service — restarting a stuck process by hand every week, for example. SRE teams cap toil (Google says under 50% of their time) and treat eliminating it as real engineering work.

**You need already:** the incidents unit.`,
      conceptMd: `**A blameless postmortem** assumes everyone acted reasonably given what they knew at the time, and asks *what about the system* allowed the failure. Blame makes people hide mistakes, and hidden mistakes repeat.

The structure, and what to write in \`POSTMORTEM.md\` for atlas:

1. **Summary** — two sentences: what broke, for how long, how many users.
2. **Impact** — in user terms and in SLO terms: how much error budget it burned.
3. **Timeline** — timestamps from first symptom to resolution, including when it was *detected* (the gap between the two is a finding in itself).
4. **Root cause and trigger** — the latent weakness and the event that exposed it. Often several contributing causes; ask "why" until you reach something you can change.
5. **What went well, what went badly, where we got lucky.**
6. **Action items** — each with an **owner** and a **due date**, split into prevent, detect sooner, and mitigate faster. "Be more careful" is not an action item.

Write one for a real failure in atlas. If nothing has broken yet, break something in staging on purpose and write that up — it counts, and "I wrote a postmortem" is a rare line on a fresher's resume.

**Toil** is operational work that is **manual, repetitive, automatable, tactical, without enduring value, and grows linearly with the service**. Restarting a stuck worker by hand every morning is toil; designing the fix is not. Google caps toil at **50%** of an SRE's time so that the rest goes into engineering that removes it.

Have one concrete example ready: a manual step you automated (a script, a cron job, a CI step, the reminder worker in this very app), what it cost before, and what it costs now.`,
      interviewAngle:
        "\"Tell me about a time something broke\" is a behavioural question that a real " +
        "postmortem answers perfectly — timeline, cause, action items. \"What is toil?\" wants the " +
        "definition and an example you eliminated yourself.",
      pitfalls: [
        "Writing \"human error\" as the root cause — it is where the investigation should start, not end.",
        "Action items with no owner or date, which never get done.",
        "Leaving out detection time, which is often the most improvable part.",
        "Calling all operational work toil; incident response and design work are not.",
      ],
      recall: [
        {
          front: "Why are postmortems blameless?",
          back:
            "Blame makes people hide mistakes and information. Assuming reasonable actions and " +
            "asking what in the system allowed the failure leads to fixes that stick.",
        },
        {
          front: "What makes a postmortem action item real?",
          back: "A specific change, an owner and a due date — not \"be more careful\".",
        },
        {
          front: "Name the properties that make operational work toil.",
          back:
            "Manual, repetitive, automatable, tactical, with no enduring value, and growing " +
            "linearly with the service.",
        },
      ],
      resources: [
        {
          title: "Google SRE book — Postmortem culture",
          url: "https://sre.google/sre-book/postmortem-culture/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "What blameless means in practice, and when a postmortem is required.",
          steps: [
            "Read the chapter.",
            "Read the example postmortem (next link) and copy its headings into `POSTMORTEM.md` for atlas.",
            "Write a postmortem for one real failure you had.",
            "Read *Eliminating toil* (last link) and list one piece of toil you will automate.",
          ],
          isPrimary: true,
        },
        {
          title: "Google SRE book — Example postmortem",
          url: "https://sre.google/sre-book/example-postmortem/",
          kind: "read",
          whyThisOne:
            "A complete postmortem to model yours on.",
        },
        {
          title: "Google SRE book — Eliminating toil",
          url: "https://sre.google/sre-book/eliminating-toil/",
          kind: "read",
          whyThisOne:
            "The definition, the 50% cap, and why toil wears teams down.",
        },
      ],
    },
    {
      slug: "devops-sre-patterns",
      title: "Reliability patterns",
      objective:
        "Apply timeouts, retries with backoff and jitter, idempotency, circuit breakers, load shedding and health versus readiness checks — and explain the failure each prevents.",
      estMinutes: 75,
      primer: `Services fail — networks drop, dependencies slow down. Reliable systems are built to expect it. The standard patterns, each preventing a specific failure:

- **Timeouts** — never wait forever for another service.
- **Retries with exponential backoff and jitter** — try again, waiting longer each time plus a random amount, so thousands of clients do not retry in lockstep.
- **Idempotency** — make repeated requests safe (an idempotency key stops a retried payment from charging twice).
- **Circuit breaker** — after repeated failures, stop calling a dependency for a while and fail fast.
- **Load shedding** — when overloaded, reject some requests quickly instead of serving all of them slowly.
- **Health vs readiness checks** — "the process is alive" is different from "ready to receive traffic".

**You need already:** HTTP, and the incidents unit.`,
      conceptMd: `Each pattern exists because of a specific way distributed systems fail.

**Timeouts.** Without one, a slow dependency holds your threads or connections until you run out and fail too. Every network call needs a timeout, set from the dependency's real latency (a little above its p99), not a default of 30 seconds or infinity.

**Retries — with exponential backoff and jitter.** Retrying immediately turns a struggling dependency into a dead one. Back off exponentially (100 ms, 200 ms, 400 ms …), cap the attempts, and add **jitter** (a random delay) so thousands of clients do not retry in synchronised waves. Retry only errors that can succeed next time (timeouts, 503), never a 400.

**Idempotency.** A retry is only safe if doing the operation twice has the same effect as once. Reads are; "charge the card" is not — unless the client sends an **idempotency key** and the server stores the result for that key and returns it on a repeat.

**Circuit breaker.** After enough failures to a dependency, stop calling it for a while (**open**) and fail fast; then let a trial request through (**half-open**); close again on success. It protects both you (no threads stuck waiting) and the dependency (room to recover).

**Graceful degradation and load shedding.** When overloaded, drop the least important work first — serve a cached page, disable recommendations, reject low-priority requests with a 503 — rather than slowing down for everyone. **Rate limiting** enforces fair shares before overload happens.

**Health vs readiness.** A **liveness** check asks "is the process stuck? restart it". A **readiness** check asks "should it receive traffic right now?" — false during start-up or while its database is unreachable. Mixing them up causes restart loops: a liveness check that tests the database restarts every instance when the database blips, making things worse.

These combine into the **cascading failure** story: one slow dependency, no timeouts, aggressive retries — and a small problem takes down everything upstream.`,
      interviewAngle:
        "\"The payment service is slow and now everything is down — why, and how do you stop it " +
        "happening again?\" is answered with timeouts, backoff with jitter, circuit breakers and " +
        "idempotent retries. Explaining jitter and the liveness/readiness distinction marks real " +
        "experience.",
      pitfalls: [
        "Retrying immediately and without limit, amplifying the load on a failing dependency.",
        "Retrying non-idempotent operations, so a timeout causes a double charge.",
        "Exponential backoff without jitter, so clients retry in synchronised waves.",
        "A liveness probe that checks the database, causing restart loops when the database blips.",
      ],
      recall: [
        {
          front: "What does jitter add to exponential backoff, and why?",
          back:
            "A random delay on each retry, so many clients that failed together do not retry " +
            "together in synchronised waves.",
        },
        {
          front: "What are the three states of a circuit breaker?",
          back: "Closed (calls flow), open (fail fast without calling), half-open (let a trial call through to test recovery).",
        },
        {
          front: "Liveness versus readiness check — what does each decide?",
          back: "Liveness: is the process stuck and should it be restarted. Readiness: should it receive traffic right now.",
        },
        {
          front: "How does an idempotency key make retrying a payment safe?",
          back:
            "The server stores the result under the key; a retry with the same key returns that " +
            "result instead of charging again.",
        },
      ],
      resources: [
        {
          title: "AWS Architecture Blog — Exponential backoff and jitter",
          url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "A simulation that shows why jitter matters, with the three jitter variants.",
          steps: [
            "Read the article and its graphs.",
            "Implement retry with full jitter for one outgoing call in atlas, with a timeout.",
            "Read Fowler's circuit breaker (last link) and draw its three states.",
            "Read the cascading failures chapter (next link) to see how the patterns combine.",
          ],
          isPrimary: true,
        },
        {
          title: "Google SRE book — Addressing cascading failures",
          url: "https://sre.google/sre-book/addressing-cascading-failures/",
          kind: "read",
          whyThisOne:
            "How the patterns work together, and how systems fall over without them.",
        },
        {
          title: "Martin Fowler — Circuit breaker",
          url: "https://martinfowler.com/bliki/CircuitBreaker.html",
          kind: "read",
          whyThisOne:
            "The state machine, clearly drawn.",
        },
      ],
    },
  ],
};
