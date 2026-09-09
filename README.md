# Cairn

A self-paced placement-prep trail. **One stone per active day — no calendar, nothing ever overdue.**

Built because a good 13-week roadmap with hard dates failed twice: no reminders, no
accountability, no curated resources, and a plan that turned red the moment a day slipped.
Cairn is that same roadmap with the delivery mechanism fixed.

## The core idea

Progress is indexed by `day_index` — days you actually closed a log — not by the wall clock.
A **journey week** is 7 active days, so every cadence quota self-corrects. Skipping three days
costs you a streak and nothing else. A `1× / 1.5× / 2×` catch-up toggle lets one strong day
absorb two skipped ones, and a bad-day button collapses the plan to the minimum chain
(one DSA problem + the log) so the streak survives.

## Stack

| | |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Data | Drizzle ORM → Postgres (local Docker; Neon in production) |
| Auth | Auth.js v5, Google, gated by an `allowed_emails` allowlist |
| Motion | `motion` — nine named moments, nothing else animates |
| Reminders | Telegram bot, driven by a Cloudflare Worker cron trigger |

Curriculum content lives in `content/` as typed TypeScript and is pushed into Postgres by
`scripts/seed.ts`. **The database is a cache; git is the source of truth.** Re-seeding is
idempotent and never touches progress tables.

## Design system — "Instrument"

Reads like a tool an SRE built for themselves. Three rules carry it:

1. Hairline panels with notched legends, never shadowed cards.
2. Every numeral is tabular mono (IBM Plex Mono). Prose gets a real text face (IBM Plex Sans).
3. **Phosphor green is reserved for state** — solved-clean, on-pace — never for body text.

Explicitly avoided: CRT flicker, scanlines, typewriter effects, green-on-black prose,
glassmorphism, emoji. Terminal cosplay is as generic as the SaaS look it reacts to.

## Running it

```bash
npm install
cp .env.example .env.local    # then fill in AUTH_SECRET and the Google OAuth pair
npm run db:push               # schema -> database
npm run seed                  # content/ -> database
npm run dev
```

**Database.** `DATABASE_URL` points at Neon; `neon link` writes it into `.env.local`
for you and `neon deploy` re-pulls it. To work offline instead, run
`docker compose up -d` and point `DATABASE_URL` at
`postgres://cairn:cairn@127.0.0.1:5433/cairn` — the client detects local hosts and
disables TLS automatically.

Cairn is invite-only. Add people to the allowlist:

```bash
npm run invite -- friend@example.com "batchmate"
npm run invite                       # list everyone invited
```

Without Google OAuth credentials, set `AUTH_DEV_LOGIN=1` in `.env.local` and visit
`/api/dev-login?email=you@example.com`. That route 404s in production builds and still
enforces the allowlist.

## Scripts

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run db:push` | apply `db/schema.ts` to the database |
| `npm run seed` | validate and load `content/` (idempotent) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run invite` | add an email to the allowlist, or list the allowlist |
| `npm run verify` | 22 invariants: journey days, redo queue, planner, streak |
| `npm run e2e` | drive the problem/unit loop in a real browser (needs `npm run dev`) |
| `npm run e2e:day` | drive the plan, catch-up, bad day and day close in a browser |
| `npm run latency` | measure database round-trip cost |
| `npm run reset-me` | wipe your own progress rows, keeping the curriculum |
| `npm run reminders` | 19 invariants: the schedule, the copy, the due window |
| `npm run telegram` | bot plumbing — `setup`, `info`, `tick`, `preview` |
| `npm run shots` | screenshot key pages into `shots/` for design QA |

## Layout

```
content/     curriculum source of truth — modules, units, resources, problems
db/          drizzle schema + client
lib/         planner.ts (the daily plan), journey.ts (day math + streak),
             reminders.ts (what a nudge says), reminder-slots.ts (the schedule),
             telegram.ts, motion.ts (the motion budget), format.ts, cn.ts
components/instrument/   Panel, Readout, Sparkline, Cairn, BurnGauge, Rail, Boot
app/(app)/   authenticated surfaces: today, roadmap, settings
app/api/     cron (the reminder tick), telegram (the bot webhook)
workers/reminders/   the Cloudflare Worker cron trigger — a clock, no logic
docs/roadmap/  personal source material (git-ignored, local only)
```

## Status

Day 5 of 7. Phase 1 is authored in full (17 modules, 75 units, 108 curated
resources, 98 problems), the progress loop is live (problem outcomes, the
self-scheduling redo queue, unit completion), the engine runs the day
(`lib/planner.ts` sizes 4–6 blocks against your budget, catch-up at 1.5× / 2×,
the bad-day collapse, closing the day drops a stone), and the reminders that
the original roadmap never had now arrive in Telegram. Certificates land day 7.

**How a day is built.** Redo first — problems you already believed were done.
Then DSA, then the timed aptitude drill, then the domain lane (DevOps four days
in five, SDE the fifth), then rotating Core CS. If that overruns the budget the
generator sheds DSA *problems* before it drops a whole block, and it will never
drop DSA, aptitude or the close — that is the roadmap's own "never cut" list,
encoded. The plan is written into `journey_days.plan` the first time you open
the app, so finishing a unit does not reshuffle the rest of your morning.

**How a reminder works.** Five slots — morning plan, aptitude, evening block,
close, streak risk — each at a local time you choose, stored per user. A
Cloudflare Worker POSTs `/api/cron` every five minutes with a shared secret;
the app resolves every user's local clock *in Postgres*, picks the slots inside
a 20-minute grace window, and composes each message from the real state of that
day. A `(user, kind, local date)` key makes the whole thing idempotent, so an
overlapping tick, a worker retry and a manual curl all collapse to one message.

The tick is **read-only against `journey_days`**, and that is the load-bearing
rule: `day_index` advances on showing up, so a cron firing at 07:00 must never
be the thing that opens your day. A reminder reports the trail; it does not walk
it. The same rule shapes the copy — nothing a message says can mark you late,
because nothing here is late. The one exception is the streak-risk slot, which
is the only thing you can actually lose, and it stays silent when there is no
streak to lose.

**A note on latency.** The database (Neon, `aws-ap-southeast-1`) is ~90ms away, so
every server action is written to resolve in exactly **one** round trip — `openToday`
is inlined as a CTE rather than called separately. Running two queries in parallel is worse than
running them in sequence here, because the second one pays for its own TLS
handshake. `npm run latency` measures it.
