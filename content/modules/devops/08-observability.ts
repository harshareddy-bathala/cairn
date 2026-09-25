import type { Module } from "@/content/types";

const PROM = "https://prometheus.io/docs";

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
          title: "Google SRE book — monitoring distributed systems",
          url: "https://sre.google/sre-book/monitoring-distributed-systems/",
          kind: "read",
          minutes: 35,
          whyThisOne: "The four golden signals and symptoms-versus-causes, from the chapter that named them.",
          isPrimary: true,
        },
        {
          title: "OpenTelemetry — signals",
          url: "https://opentelemetry.io/docs/concepts/signals/",
          kind: "docs",
          minutes: 15,
          whyThisOne: "Metrics, logs and traces as the vendor-neutral standard defines them.",
        },
        {
          title: "Brendan Gregg — the USE method",
          url: "https://www.brendangregg.com/usemethod.html",
          kind: "read",
          minutes: 15,
          whyThisOne: "The resource-side checklist, from the person who wrote it.",
        },
      ],
    },
    {
      slug: "devops-obs-prometheus",
      title: "The Prometheus model & metric types",
      objective:
        "Explain pull-based scraping, exporters and the data model, and choose correctly between counter, gauge, histogram and summary.",
      estMinutes: 70,
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
          title: "Prometheus — metric types",
          url: `${PROM}/concepts/metric_types/`,
          kind: "docs",
          minutes: 15,
          whyThisOne: "The four types, precisely, from the source.",
          isPrimary: true,
        },
        {
          title: "Prometheus — histograms and summaries",
          url: `${PROM}/practices/histograms/`,
          kind: "docs",
          minutes: 25,
          whyThisOne: "The aggregation argument and how to choose buckets around an SLO.",
        },
        {
          title: "Prometheus — monitoring Linux with node_exporter",
          url: `${PROM}/guides/node-exporter/`,
          kind: "lab",
          minutes: 30,
          whyThisOne: "Run Prometheus and an exporter, and see scraping and `up` for yourself.",
        },
      ],
    },
    {
      slug: "devops-obs-promql",
      title: "PromQL",
      objective:
        "Write PromQL for request rate, error ratio and p95 latency, and use recording rules for queries you run constantly.",
      estMinutes: 75,
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
          title: "Prometheus — querying basics",
          url: `${PROM}/prometheus/latest/querying/basics/`,
          kind: "docs",
          minutes: 25,
          whyThisOne: "Instant and range vectors, selectors and matchers — the grammar everything else uses.",
          isPrimary: true,
        },
        {
          title: "PromLabs — PromQL cheat sheet",
          url: "https://promlabs.com/promql-cheat-sheet/",
          kind: "docs",
          minutes: 15,
          whyThisOne: "Every common pattern on one page, by the people who maintain PromQL.",
        },
        {
          title: "Prometheus — recording rules",
          url: `${PROM}/prometheus/latest/configuration/recording_rules/`,
          kind: "docs",
          minutes: 10,
          whyThisOne: "The rule file format and the level:metric:operations naming convention.",
        },
      ],
    },
    {
      slug: "devops-obs-alerting",
      title: "Alerting & Alertmanager",
      objective:
        "Write alerting rules that page on symptoms with a `for` duration and a runbook link, and configure Alertmanager routing, grouping, inhibition and silences.",
      estMinutes: 70,
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
          title: "Prometheus — alerting best practices",
          url: `${PROM}/practices/alerting/`,
          kind: "docs",
          minutes: 15,
          whyThisOne: "Short and opinionated: alert on symptoms, keep pages actionable.",
          isPrimary: true,
        },
        {
          title: "Prometheus — alerting rules",
          url: `${PROM}/prometheus/latest/configuration/alerting_rules/`,
          kind: "docs",
          minutes: 15,
          whyThisOne: "The rule format, `for`, labels and annotations with templating.",
        },
        {
          title: "Prometheus — Alertmanager",
          url: `${PROM}/alerting/latest/alertmanager/`,
          kind: "docs",
          minutes: 20,
          whyThisOne: "Grouping, inhibition, silences and routing.",
        },
      ],
    },
    {
      slug: "devops-obs-dashboards-logs",
      title: "Dashboards & logs",
      objective:
        "Build a Grafana dashboard that answers an incident question, and emit structured logs with request IDs that you can search in Loki or ELK.",
      estMinutes: 70,
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
          title: "Grafana — dashboard best practices",
          url: "https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/",
          kind: "docs",
          minutes: 20,
          whyThisOne: "RED and USE dashboards, and how to keep dashboards from sprawling.",
          isPrimary: true,
        },
        {
          title: "Grafana Loki — overview",
          url: "https://grafana.com/docs/loki/latest/get-started/overview/",
          kind: "docs",
          minutes: 15,
          whyThisOne: "The label-only index and why it is cheaper than full-text indexing.",
        },
      ],
    },
  ],
};
