import type { Module } from "@/content/types";

export const observability: Module = {
  slug: "devops-observability",
  trackSlug: "devops",
  phaseSlug: "depth",
  order: 4,
  title: "Observability: Prometheus, alerts & dashboards",
  summary:
    "Knowing what your system is doing without logging into it. Metrics tell you something is wrong, logs tell you what happened, traces tell you where the time went. By the end, atlas exports the four golden signals, Prometheus scrapes them, one alert has actually fired, and a dashboard answers a question someone would ask during an incident.",
  prereqSlugs: ["devops-docker"],
  units: [
    {
      slug: "devops-obs-pillars",
      title: "Metrics, logs & traces — what each is for",
      objective:
        "Say what question each pillar answers, what it costs, and when to reach for which — and explain cardinality.",
      estMinutes: 50,
      primer: `**Observability** is being able to tell what your system is doing from the outside, without logging in and poking around. It rests on three kinds of data:

- **Metrics** — numbers over time: requests per second, error rate, memory used. Cheap to store, good for dashboards and alerts — they tell you *that* something is wrong.
- **Logs** — a line of text (ideally JSON) for each event. They tell you *what* happened to one particular request.
- **Traces** — the path of one request through every service it touched, with timings. They tell you *where* the time went.

For any service that serves users, watch the **four golden signals**: latency, traffic, errors and saturation (how full it is).

**You need already:** the networking module; a service of your own (atlas) to instrument.`,
      conceptMd: `The three pillars are not three ways of storing the same thing. Each answers a different question:

| Pillar | Answers | Shape | Cost |
|---|---|---|---|
| **Metrics** | *Is something wrong, and how much?* | numbers over time, aggregated: requests/s, p95 latency, error ratio | cheap and fixed per series — ideal for alerting and dashboards |
| **Logs** | *What exactly happened?* | one record per event, with detail | grows with traffic; expensive to keep and search |
| **Traces** | *Where did the time go in this request?* | a tree of spans across services, each with a duration | usually sampled; indispensable once there are several services |

The usual flow in an incident: an **alert on a metric** fires → a dashboard narrows it to a route or host → **logs** (filtered by that route and time) show the error → a **trace** shows which downstream call was slow.

**Cardinality** is the number of distinct label combinations a metric has, and every combination is a separate time series stored in memory. \`http_requests_total{route, method, status}\` might have a few hundred series. Add a \`user_id\` label and it has one per user — which is how Prometheus servers run out of memory. **Unbounded values (user IDs, emails, full URLs, request IDs) belong in logs and traces, never in metric labels.**

Three checklists name what to measure:

- **Four golden signals** (Google SRE): latency, traffic, errors, saturation — for any user-facing service.
- **RED** (rate, errors, duration) — the same idea per service or endpoint.
- **USE** (utilisation, saturation, errors) — per *resource*: CPU, disk, memory, a connection pool.`,
      interviewAngle:
        "\"What is the difference between monitoring and observability?\" and \"metrics or logs?\" " +
        "are common openers. Answer with what each is *for*, then give the incident flow from " +
        "alert to root cause.",
      pitfalls: [
        "Describing the pillars by storage format instead of by the question each answers.",
        "Putting user IDs or full URLs in metric labels and exploding cardinality.",
        "Alerting on logs by grepping for 'ERROR' when a metric would be cheaper and more reliable.",
        "Treating traces as optional in a multi-service system, then guessing where latency comes from.",
      ],
      recall: [
        {
          front: "Which question does each observability pillar answer — metrics, logs, traces?",
          back:
            "Metrics: is something wrong and how much. Logs: what exactly happened. Traces: where " +
            "the time went across services for one request.",
        },
        {
          front: "Why must a user ID never be a Prometheus metric label?",
          back:
            "Each distinct label combination is a separate time series held in memory; an " +
            "unbounded label creates one per user and can exhaust the server.",
        },
        {
          front: "RED versus USE — what is each applied to?",
          back: "RED (rate, errors, duration) to services and endpoints; USE (utilisation, saturation, errors) to resources like CPU or disks.",
        },
      ],
      resources: [
        {
          title: "Google SRE book — Monitoring distributed systems",
          url: "https://sre.google/sre-book/monitoring-distributed-systems/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "The chapter that named the four golden signals, and symptoms versus causes.",
          steps: [
            "Read up to and including **The Four Golden Signals**.",
            "Write down what latency, traffic, errors and saturation would each mean for atlas.",
            "Read the part on symptoms versus causes.",
            "Skim the OpenTelemetry signals page (next link) for the three data types.",
          ],
          isPrimary: true,
        },
        {
          title: "OpenTelemetry — Signals",
          url: "https://opentelemetry.io/docs/concepts/signals/",
          kind: "docs",
          whyThisOne:
            "Metrics, logs and traces as the vendor-neutral standard defines them.",
        },
        {
          title: "Brendan Gregg — The USE method",
          url: "https://www.brendangregg.com/usemethod.html",
          kind: "read",
          whyThisOne:
            "The checklist for machines rather than requests: utilisation, saturation, errors.",
        },
      ],
    },
    {
      slug: "devops-obs-prometheus",
      title: "The Prometheus model & metric types",
      objective:
        "Explain pull-based scraping, exporters and the data model, and choose correctly between counter, gauge, histogram and summary.",
      estMinutes: 70,
      primer: `**Prometheus** is the most common open-source metrics system. It works by **pulling**: every few seconds it visits a \`/metrics\` URL on each of your services and reads the current numbers. A program that exposes metrics for something else (Linux, a database) is called an **exporter**.

Each metric has a name and **labels**, like \`http_requests_total{route="/login", status="500"}\`. There are four types:

- **counter** — only goes up (requests served); you look at its rate;
- **gauge** — goes up and down (memory in use, queue length);
- **histogram** — counts values into buckets (request durations), so you can compute percentiles like p95;
- **summary** — percentiles computed in the app itself (rarely the right choice).

**You need already:** the pillars unit, and Docker to run Prometheus locally.`,
      conceptMd: `**Pull, not push.** Prometheus **scrapes** an HTTP endpoint (\`/metrics\`) on each target every 15–60 seconds. Targets come from static config or service discovery. The upside: Prometheus knows when a target is down (\`up == 0\`), and apps do not need to know where the monitoring lives. Short-lived batch jobs, which may finish before a scrape, push to a **Pushgateway** instead.

**Exporters** translate things that do not speak Prometheus: \`node_exporter\` for host CPU, memory and disk; \`postgres_exporter\`; \`blackbox_exporter\` to probe URLs from the outside. Your own app exposes metrics with a client library.

**Data model:** a time series is a metric name plus a set of labels — \`http_requests_total{route="/links", status="500"}\` — with a stream of (timestamp, float) samples.

**The four metric types:**

| Type | Behaviour | Use for | Query with |
|---|---|---|---|
| **Counter** | only goes up (resets to 0 on restart) | requests, errors, bytes sent | \`rate()\` — never the raw value |
| **Gauge** | goes up and down | memory in use, queue length, temperature | the value, \`avg_over_time\` |
| **Histogram** | counts observations into cumulative **buckets** (\`_bucket{le="0.3"}\`), plus \`_sum\` and \`_count\` | latency, request size | \`histogram_quantile()\` |
| **Summary** | computes quantiles **in the client** | latency when you cannot choose buckets | the pre-computed quantile |

**Histogram vs summary** is the classic question. Histogram buckets can be **aggregated across instances** (sum the buckets, then compute the quantile); summary quantiles cannot — averaging five instances' p95s does not give the fleet's p95. Prefer histograms, and choose bucket boundaries around your SLO threshold (for atlas, make sure 0.3 s is a boundary).

Naming conventions: \`snake_case\`, base units (\`_seconds\`, \`_bytes\`), counters end in \`_total\`.`,
      interviewAngle:
        "\"Push or pull?\", \"counter or gauge?\" and \"histogram or summary?\" come up in almost " +
        "every Prometheus conversation. The aggregation argument for histograms is the one that " +
        "shows you have used them.",
      pitfalls: [
        "Graphing a counter's raw value — it only ever rises; you want its rate.",
        "Using a gauge for a request count, so restarts and scrapes lose increments.",
        "Averaging per-instance summary quantiles and calling it the fleet percentile.",
        "Histogram buckets that do not include the SLO threshold, so the SLI cannot be computed exactly.",
      ],
      recall: [
        {
          front: "Why can histogram buckets be aggregated across instances but summary quantiles cannot?",
          back:
            "Buckets are counts, which add; the quantile is computed after summing. A summary's " +
            "quantiles are already computed per instance, and percentiles do not average.",
        },
        {
          front: "How does Prometheus know a target is down, and what makes that possible?",
          back: "It scrapes (pulls) each target; a failed scrape sets `up` to 0 for that target.",
        },
        {
          front: "Counter or gauge: requests served, memory in use, queue length?",
          back: "Requests served is a counter; memory in use and queue length are gauges.",
        },
      ],
      resources: [
        {
          title: "Prometheus — Getting started",
          url: "https://prometheus.io/docs/prometheus/latest/getting_started/",
          kind: "lab",
          minutes: 30,
          whyThisOne:
            "Run Prometheus, let it scrape itself, and query your first metrics.",
          steps: [
            "Download and run Prometheus exactly as the page shows.",
            "Open the expression browser and query `up` and `prometheus_http_requests_total`.",
            "Then read *Metric types* (next link) and label each metric you saw with its type.",
            "Add node_exporter using the last link.",
          ],
          isPrimary: true,
        },
        {
          title: "Prometheus — Metric types",
          url: "https://prometheus.io/docs/concepts/metric_types/",
          kind: "docs",
          whyThisOne:
            "The four types, precisely, from the source.",
        },
        {
          title: "Prometheus — Monitoring Linux with node_exporter",
          url: "https://prometheus.io/docs/guides/node-exporter/",
          kind: "lab",
          whyThisOne:
            "Run an exporter and see scraping and `up` for a real machine.",
        },
      ],
    },
    {
      slug: "devops-obs-promql",
      title: "PromQL",
      objective:
        "Write PromQL for request rate, error ratio and p95 latency, and use recording rules for queries you run constantly.",
      estMinutes: 75,
      primer: `**PromQL** is Prometheus's query language. Three patterns cover most dashboards and alerts:

- **Rate** — how many per second over the last 5 minutes: \`rate(http_requests_total[5m])\`.
- **Error ratio** — errors divided by all requests: the rate of requests with status 5xx, divided by the rate of all requests.
- **Latency percentile** — the 95th percentile from a histogram: \`histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))\`.

\`[5m]\` means "over the last five minutes of samples"; \`sum by (route)\` adds series together while keeping a label. A **recording rule** saves the result of an expensive query as a new metric so dashboards stay fast.

**You need already:** the Prometheus unit, with Prometheus running.`,
      conceptMd: `PromQL has two kinds of vector. An **instant vector** is one sample per series at a moment (\`http_requests_total\`). A **range vector** is a window of samples per series (\`http_requests_total[5m]\`), which functions like \`rate()\` turn back into an instant vector.

**The five queries that cover most dashboards and alerts:**

\`\`\`promql
# 1. traffic: requests per second, per route
sum by (route) (rate(http_requests_total[5m]))

# 2. errors: share of requests that are 5xx
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# 3. latency: p95 across all instances
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# 4. the SLI: share of requests faster than 300 ms
sum(rate(http_request_duration_seconds_bucket{le="0.3"}[5m]))
  / sum(rate(http_request_duration_seconds_count[5m]))

# 5. saturation: is anything down, is the disk filling
up == 0
predict_linear(node_filesystem_avail_bytes[6h], 24 * 3600) < 0
\`\`\`

The rules behind them:

- **\`rate()\` first, then \`sum\`.** \`rate\` handles counter resets per series; summing raw counters first hides the resets.
- \`rate\` is the per-second average over the window; \`irate\` uses only the last two samples (spiky, for graphs only); \`increase\` is \`rate\` × window.
- The window should be at least **4× the scrape interval**, or \`rate\` has too few samples.
- For histograms, keep \`le\` in the \`by\` clause, or \`histogram_quantile\` has no buckets to work with.

**Recording rules** precompute expensive queries on a schedule and store the result as a new series (\`job:http_requests:rate5m\`). Dashboards and alerts then read one cheap series instead of recomputing the aggregation on every refresh.`,
      interviewAngle:
        "Being asked to write the error-rate or p95 query on a whiteboard is common in SRE " +
        "interviews. rate-then-sum and keeping `le` are the two details that separate people who " +
        "have written PromQL from those who have read it.",
      pitfalls: [
        "Summing counters before applying rate(), which breaks on counter resets.",
        "Dropping `le` from the aggregation before histogram_quantile.",
        "A rate window shorter than a few scrape intervals, giving empty or jumpy results.",
        "Using irate() in an alert, so a single spike fires it.",
      ],
      recall: [
        {
          front: "Write the PromQL for the share of requests returning 5xx.",
          back:
            "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))",
        },
        {
          front: "Why apply rate() before sum() on counters?",
          back:
            "rate() detects and corrects counter resets per series; summing first mixes series " +
            "and a reset in one looks like a drop in the total.",
        },
        {
          front: "What must stay in the `by` clause when computing a percentile with histogram_quantile?",
          back: "The `le` label — the bucket boundaries the quantile is interpolated from.",
        },
      ],
      resources: [
        {
          title: "Prometheus — Querying basics",
          url: "https://prometheus.io/docs/prometheus/latest/querying/basics/",
          kind: "docs",
          minutes: 30,
          whyThisOne:
            "Instant and range vectors, selectors and matchers — the grammar everything else uses.",
          steps: [
            "Read the page, running each example in your own Prometheus.",
            "Write rate, error ratio and p95 latency queries for atlas — or for Prometheus's own HTTP metrics.",
            "Check your queries against the PromLabs cheat sheet (next link).",
            "Save one as a recording rule (last link).",
          ],
          isPrimary: true,
        },
        {
          title: "PromLabs — PromQL cheat sheet",
          url: "https://promlabs.com/promql-cheat-sheet/",
          kind: "docs",
          whyThisOne:
            "Every common pattern on one page, by people who maintain PromQL.",
        },
        {
          title: "Prometheus — Recording rules",
          url: "https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/",
          kind: "docs",
          whyThisOne:
            "The rule file format and the `level:metric:operations` naming convention.",
        },
      ],
    },
    {
      slug: "devops-obs-alerting",
      title: "Alerting & Alertmanager",
      objective:
        "Write alerting rules that page on symptoms with a `for` duration and a runbook link, and configure Alertmanager routing, grouping, inhibition and silences.",
      estMinutes: 70,
      primer: `An **alert** is a query that, when true for long enough, notifies a person. The hard part is not writing one but writing ones worth waking up for.

Good alerts:

- fire on **symptoms users feel** (errors, slowness), not on causes that might not matter (CPU at 90%);
- wait a little before firing (\`for: 5m\`), so a brief spike does not page anyone;
- link to a **runbook** saying what to check first.

In Prometheus, alerting rules live in the Prometheus config, and **Alertmanager** decides where each alert goes: it **groups** related alerts into one notification, **routes** them to the right person or channel, **inhibits** noisy follow-on alerts, and lets you **silence** alerts during planned work.

**You need already:** PromQL.`,
      conceptMd: `**Prometheus evaluates alert rules; Alertmanager decides who hears about them.**

\`\`\`yaml
groups:
  - name: atlas
    rules:
      - alert: AtlasHighErrorRate
        expr: |
          sum(rate(http_requests_total{job="atlas",status=~"5.."}[5m]))
            / sum(rate(http_requests_total{job="atlas"}[5m])) > 0.05
        for: 5m                      # must stay true for 5 minutes before firing
        labels:   { severity: page }
        annotations:
          summary: "atlas 5xx ratio above 5% for 5 minutes"
          runbook: "https://github.com/you/atlas/blob/main/RUNBOOK.md#high-error-rate"
\`\`\`

An alert is **inactive**, then **pending** while the expression is true but \`for\` has not elapsed, then **firing**. \`for\` filters out blips.

**Alertmanager** takes firing alerts and:

- **routes** them by label (severity \`page\` → phone/Telegram; \`ticket\` → email);
- **groups** related alerts into one notification (twenty instances down is one message, not twenty);
- **inhibits** — suppresses dependent alerts while a bigger one fires (the whole node is down, so do not also page for each service on it);
- applies **silences** during planned maintenance.

**What deserves a page:**

- **Alert on symptoms users feel** — error rate, latency, the SLO burning — not on causes like "CPU at 80%". High CPU with happy users is not an emergency; low CPU with a broken site is.
- **Every page must be actionable**, and link a runbook saying what to do.
- A page that is routinely ignored trains people to ignore pages. Delete it or turn it into a ticket.

For atlas: one alert, routed to you, that you have **seen fire** — break something on purpose, watch it go pending then firing, then fix it.`,
      interviewAngle:
        "\"What would you alert on for this service?\" — answering with user-facing symptoms and " +
        "an SLO, and explaining why CPU alone is not a page, is a strong SRE answer. Having had an " +
        "alert fire on your own system is better still.",
      pitfalls: [
        "Paging on causes like CPU or memory usage rather than on user-facing symptoms.",
        "Alert rules with no `for`, so a one-scrape blip wakes someone up.",
        "Alerts without a runbook link, so whoever is paged starts from nothing.",
        "Never testing the alert path end to end, so the first real page never arrives.",
      ],
      recall: [
        {
          front: "What does the `for` clause in a Prometheus alerting rule do?",
          back: "The expression must stay true for that long; until then the alert is pending, not firing.",
        },
        {
          front: "Why alert on symptoms rather than causes?",
          back:
            "Symptoms (errors, latency) are what users feel and always matter; a cause like high " +
            "CPU may be harmless, and many real failures never show that cause.",
        },
        {
          front: "What are grouping and inhibition in Alertmanager?",
          back:
            "Grouping batches related alerts into one notification; inhibition suppresses " +
            "dependent alerts while a more fundamental one is firing.",
        },
      ],
      resources: [
        {
          title: "Prometheus — Alerting best practices",
          url: "https://prometheus.io/docs/practices/alerting/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "Short and opinionated: alert on symptoms, keep every page actionable.",
          steps: [
            "Read the whole page and write down the three rules you will follow.",
            "Write one alerting rule for atlas's error ratio with a `for` duration and a runbook annotation (next link).",
            "Run Alertmanager and route that alert to email or Telegram (last link).",
            "Make it fire on purpose.",
          ],
          isPrimary: true,
        },
        {
          title: "Prometheus — Alerting rules",
          url: "https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/",
          kind: "docs",
          whyThisOne:
            "The rule format, `for`, labels, and annotations with templates.",
        },
        {
          title: "Prometheus — Alertmanager",
          url: "https://prometheus.io/docs/alerting/latest/alertmanager/",
          kind: "docs",
          whyThisOne:
            "Grouping, inhibition, silences and routing.",
        },
      ],
    },
    {
      slug: "devops-obs-dashboards-logs",
      title: "Dashboards & logs",
      objective:
        "Build a Grafana dashboard that answers an incident question, and emit structured logs with request IDs that you can search in Loki or ELK.",
      estMinutes: 70,
      primer: `A **dashboard** is only useful if it answers a question someone asks during an incident — "is it us or the database?", "when did errors start?". Build dashboards around questions, not around every metric you have.

**Grafana** draws dashboards from Prometheus (and many other sources). The standard layout for a service is **RED**: its **R**ate of requests, **E**rrors and **D**uration — one row of panels each.

For logs, write **structured** lines — one JSON object per event, with a request ID — so they can be searched precisely. **Loki** (from Grafana) and **ELK** (Elasticsearch) are the common log stores; Loki indexes only a few labels, which makes it much cheaper to run.

**You need already:** Prometheus and PromQL; structured logging from the REST production unit.`,
      conceptMd: `**A dashboard should answer a question**, and the first question in an incident is *"is it broken, and for whom?"*. Lay atlas's dashboard out in that order:

1. **Top row — the golden signals**: request rate, error ratio, p95 latency, and the SLO with the remaining error budget.
2. **Per-route breakdown** of the same, to see *which* part is broken.
3. **Resources** (USE): CPU, memory, disk, database connections — to see *why*.

Keep it to one screen. Put units on every axis, and draw the SLO threshold as a line on the latency panel. A dashboard nobody opens during an incident is decoration — delete panels no one uses.

**Logs worth having are structured.** One JSON object per line, not free text:

\`\`\`json
{"ts":"2026-10-02T10:14:03Z","level":"error","request_id":"7f3a…","route":"/links","status":500,"duration_ms":1840,"msg":"db timeout"}
\`\`\`

- Machine-parseable fields let you filter by route, status or duration without regexes.
- A **request ID** generated at the edge and passed through every service (and returned in a response header) ties all the log lines of one request together — and links logs to traces.
- **Levels** mean something: \`error\` is something someone should look at; \`info\` is the normal story; \`debug\` is off in production.
- Never log passwords, tokens or full card numbers.

**Loki vs ELK.** Elasticsearch **indexes the full text** of every log line: powerful search, expensive storage. **Loki indexes only labels** (service, level, environment) and stores the log text compressed; queries filter by labels, then scan the text. Much cheaper, and it fits naturally beside Prometheus and Grafana — which is why it suits atlas.`,
      interviewAngle:
        "\"Show me your dashboard\" — being able to explain why each panel is where it is, and " +
        "follow one failing request through its logs by request ID, is concrete evidence of " +
        "operating a system.",
      pitfalls: [
        "Dashboards with forty panels and no clear first question.",
        "Free-text logs that need a regex for every search.",
        "No request ID, so one request's log lines cannot be tied together across services.",
        "Logging secrets or personal data, which then live in the log store.",
      ],
      recall: [
        {
          front: "What goes in the top row of a service dashboard, and why?",
          back:
            "The golden signals and the SLO — they answer \"is it broken, and for whom?\", which " +
            "is the first question in any incident.",
        },
        {
          front: "What does a request ID in every log line make possible?",
          back: "Following one request through every service's logs, and linking those logs to its trace.",
        },
        {
          front: "How does Loki keep log storage cheaper than Elasticsearch?",
          back: "It indexes only a few labels and stores the log text compressed, instead of indexing every word.",
        },
      ],
      resources: [
        {
          title: "Grafana — Build your first dashboard",
          url: "https://grafana.com/docs/grafana/latest/fundamentals/getting-started/first-dashboards/",
          kind: "lab",
          minutes: 30,
          whyThisOne:
            "Install to first panel, step by step.",
          steps: [
            "Follow the page to run Grafana and add Prometheus as a data source.",
            "Build a RED dashboard for atlas: request rate, error ratio, p95 latency.",
            "Read the best-practices page (next link) and remove any panel that answers no question.",
            "Read the Loki overview (last link).",
          ],
          isPrimary: true,
        },
        {
          title: "Grafana — Dashboard best practices",
          url: "https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/",
          kind: "docs",
          whyThisOne:
            "RED and USE dashboards, and how to stop dashboards sprawling.",
        },
        {
          title: "Grafana Loki — Overview",
          url: "https://grafana.com/docs/loki/latest/get-started/overview/",
          kind: "docs",
          whyThisOne:
            "The label-only index, and why it is cheaper than indexing every word.",
        },
      ],
    },
  ],
};
