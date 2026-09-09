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
| Reminders | Telegram bot, driven by a Cloudflare Worker cron trigger *(day 5)* |

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
docker compose up -d          # postgres on :5433
cp .env.example .env.local    # then fill in AUTH_SECRET
npm install
npm run db:push               # schema -> database
npm run seed                  # content/ -> database
npm run dev
```

Add yourself to the allowlist, then sign in:

```bash
psql "$DATABASE_URL" -c "insert into allowed_emails (email) values ('you@example.com');"
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
| `npm run shots` | screenshot key pages into `shots/` for design QA |

## Layout

```
content/     curriculum source of truth — modules, units, resources, problems
db/          drizzle schema + client
lib/         journey.ts (day math), motion.ts (the motion budget), cn.ts
components/instrument/   Panel, Readout, Sparkline, Cairn, BurnGauge, Rail, Boot
app/(app)/   authenticated surfaces: today, roadmap
docs/roadmap/  personal source material (git-ignored, local only)
```

## Status

Day 1 of 7 — schema, content pipeline, auth, design system, and the app shell.
The daily plan generator lands day 4; Telegram reminders day 5; certificates day 7.
