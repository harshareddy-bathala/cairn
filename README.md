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
| Motion | `motion` for interaction; the boot is CSS, so a page renders without JS |
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

**Two grounds.** Dark is the default and the identity. **Daylight** exists because a phone
gets used outdoors, where an all-black surface stops being a design choice and becomes a
mirror. It is a re-grounding rather than an inversion — all three rules survive, including
phosphor-for-state, which is why every signal colour is re-derived for a light ground
instead of reused (the dark phosphor reads ~1.5:1 on paper). Chosen in Settings, stored on
the device rather than the user, so your phone and your desk may disagree.

**Two shells.** Below `sm` the fixed rail is replaced, not shrunk: a bottom tab bar with
the four destinations a day passes through, the rest behind a sheet that sits *on top of*
the bar so the primary tabs stay live. `lib/nav.ts` is the one list both render from —
they cannot disagree about what exists, which is how `/review` once shipped as a 404.

**The boot animation is CSS.** It was a motion variant with `initial: opacity 0`, which
made JavaScript load-bearing for the page being *visible* — any failure between HTML and
hydration left a blank screen rather than a degraded one. Wrong failure mode for the
surface you open every morning.

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
| `npm run e2e:tracks` | drive aptitude, projects, applications and the STAR bank |
| `npm run e2e:cert` | drive self-placement, checkpoints, the exam and a certificate |
| `npm run latency` | measure database round-trip cost |
| `npm run reset-me` | wipe your own progress rows, keeping the curriculum |
| `npm run reminders` | 19 invariants: the schedule, the copy, the due window |
| `npm run review` | 43 invariants: the scheduler, the deck, misses, the week review |
| `npm run telegram` | bot plumbing — `setup`, `info`, `tick`, `preview` |
| `npm run shots` | every page at 390px and 1280px; fails on sideways scroll or console errors |

## Layout

```
content/     curriculum source of truth — modules, units, resources, problems,
             projects and their deliverables, the weekly cadence, the DSA curve,
             and the checkpoint question banks
db/          drizzle schema + client
lib/         planner.ts (the daily plan), journey.ts (day math + streak),
             recall.ts (spaced repetition, in active days), week-review.ts,
             misses.ts (checkpoint questions you still get wrong),
             reminders.ts (what a nudge says), reminder-slots.ts (the schedule),
             telegram.ts, motion.ts (the motion budget), nav.ts (both shells),
             theme.ts, format.ts, cn.ts
components/instrument/   Panel, Readout, Sparkline, Cairn, BurnGauge, Rail,
             TabBar, Boot, RecallDeck, SelfCheck
app/(app)/   authenticated surfaces: today, roadmap, review, metrics, projects,
             career, certification, checkpoint, exam, cohort, start
app/c/ app/u/  public: certificates and profiles, no sign-in, settings
app/api/     cron (the reminder tick), telegram (the bot webhook)
workers/reminders/   the Cloudflare Worker cron trigger — a clock, no logic
docs/roadmap/  personal source material (git-ignored, local only)
```

## Status

Phase 1 is authored in full — 17 modules, 75 units, 108 curated resources, 98 problems,
262 recall cards, 244 pitfalls, 85 checkpoint questions — and the whole loop works:

- **The day.** `lib/planner.ts` generates 4–6 sized blocks against your budget.
  Catch-up at 1.5×/2× pulls the next unit in each track forward; the bad-day
  button collapses to one problem and the log; closing the day drops a stone.
- **The work.** Problem outcomes, a self-scheduling redo queue, unit completion.
- **The review.** A spaced-repetition deck seeded from the units you finish, the
  redo queue in full, checkpoint questions you still get wrong with their
  explanations, and a journey-week review every 7 active days.
- **The side tracks.** Aptitude log, three projects with 17 deliverables, mock
  cadence, STAR bank, applications counter.
- **The certification.** Module checkpoints → a timed phase exam → a defense
  recording → a certificate at a public `/c/<id>`, with a profile at `/u/<handle>`.

**How a day is built.** Redo first — problems you already believed were done.
Then DSA, the timed aptitude drill, the domain lane (DevOps four days in five,
SDE the fifth), rotating Core CS, the project block on weekends, and any of the
journey week's quotas that are running out of week. If that overruns the budget
the generator sheds DSA *problems* before it drops a whole block, and it will
never drop DSA, aptitude or the close — that is the roadmap's own "never cut"
list, encoded. The plan is written into `journey_days.plan` the first time you
open the app, so finishing a unit does not reshuffle the rest of your morning.

**How a unit teaches.** A concept note, then *where this goes wrong* — the mistakes
someone makes having just read it and believing they understood — then how it shows up
in the room, then a self-check that asks the unit's own questions back before you tick
it done. Nothing there is scored: an assessment attached to marking a unit done is a
reason not to mark units done. But answering three questions cold changes what the tick
means, and ticking it is what puts those questions in your deck.

**Why the deck counts active days.** Every other spaced-repetition tool schedules on the
calendar, so a week away greets you with a week of debt — reproducing, inside the review
page, the exact failure this app exists to fix. An interval of 6 here means six days you
actually showed up. Skip three weeks and nothing is overdue; the deck waits. It is
scheduled above new material in the day's plan, protected from the budget trimmer, and it
survives a bad day at five minutes, because it is the only block that protects work you
have already paid for.

**Why the side tracks are counted.** Aptitude has no repo and five applications
leave no commit, so they are the lanes that vanish first and are only missed in
November. `/metrics` exists to make them visible: the DSA count against the
95/165/230 curve, the redo queue's size, the aptitude trend, minutes logged, and
applications flagged red at zero once that lane opens.

**Which way the gates point.** A phase exam opens at 80% of that phase's units;
the certificate needs the exam, 80% of the phase's checkpoints, and an out-loud
defense recording. Nothing in the certification spine can gate the curriculum —
a bad week on a quiz costs you a certificate, never your place on the trail.
Self-placement banks work you had already done at day 0, so it counts toward the
map and the exam but puts no stone on the cairn and never inflates velocity.

**A note on latency.** The database (Neon, `aws-ap-southeast-1`) is ~90ms away, so
every server action is written to resolve in exactly **one** round trip — `openToday`
is inlined as a CTE rather than called separately. Running two queries in parallel is
worse than running them in sequence here, because the second one pays for its own TLS
handshake. `npm run latency` measures it.
