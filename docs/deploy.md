# Going live

The order matters. Telegram will not accept an `http://` webhook, so the app has
to be deployed before the bot can be wired, and the cron worker needs the
deployed URL before it can be deployed itself.

```
land day 5  →  Vercel  →  Google OAuth  →  Telegram  →  Cloudflare  →  Resend
```

Everything below is a one-time setup. Steps marked **you** need a browser login
or a credential that cannot be scripted.

---

## 0. Land day 5 first — this is a blocker

The reminder work (Telegram bot, cron route, `/settings`, the reminder schedule)
is written but **not committed**:

```
app/(app)/settings/            app/api/cron/       lib/reminders.ts
app/actions/reminders.ts       app/api/telegram/   lib/reminder-slots.ts
components/instrument/{reminder-schedule,telegram-link,timezone-sync}.tsx
```

Vercel builds from git. Deploy before this lands and the left rail's `⌗ Settings`
link 404s in production, `/api/cron` does not exist, and the bot has nowhere to
deliver. Commit it, then continue.

---

## 1. Vercel — **you**

```bash
npm i -g vercel
vercel login
vercel link          # create the project, keep the repo name
```

Set production environment variables. `DATABASE_URL` is the pooled Neon string
already in `.env.local` (project `rough-bar-78711368`, `aws-ap-southeast-1`):

```bash
for k in DATABASE_URL AUTH_SECRET AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET CRON_SECRET; do
  vercel env add "$k" production
done
```

Then two that differ from local — set both to the deployed origin, no trailing
slash:

```
AUTH_URL=https://<your-domain>
APP_URL=https://<your-domain>
```

**Do not set `AUTH_DEV_LOGIN`.** `/api/dev-login` returns 404 in a production
build regardless, but the variable has no business being there.

The schema is already applied to the Neon production branch — local development
points at the same branch — so there is no migration step. `drizzle-kit push`
needs a TTY and must never run in a build.

```bash
vercel --prod
```

Confirm: the domain loads `/signin`, and `/api/dev-login?email=…` returns 404.

## 2. Google OAuth — **you**

In the Cloud console, on the client you kept (`955609603147-rhqa1fskep88…`):

- **Authorised JavaScript origins** — add `https://<your-domain>`
- **Authorised redirect URIs** — add `https://<your-domain>/api/auth/callback/google`

Keep the `http://localhost:3000` entries; local development still needs them.
While you are in there, delete the spare client `955609603147-3vev0jicvhbf…` —
two clients for one app is a credential you will eventually leak by accident.

Confirm: sign in on the deployed domain with your own Google account, and check
that a second, non-allowlisted account is refused.

## 3. Telegram — **you**

Message [@BotFather](https://t.me/BotFather):

```
/newbot          →  name: Cairn        username: <something>_bot
/setdescription  →  Your placement trail. One stone per active day.
/setcommands     →  paste the block below
```

```
plan - today's blocks
done - mark a track's block done: /done dsa
skip - skip today's remaining nudges
badday - collapse today to the minimum chain
streak - where the cairn stands
```

BotFather hands back a token. Put it in **both** `.env.local` and Vercel:

```bash
# .env.local
TELEGRAM_BOT_TOKEN="<token from BotFather>"
TELEGRAM_BOT_USERNAME="<username without the @>"
# TELEGRAM_WEBHOOK_SECRET is already generated

vercel env add TELEGRAM_BOT_TOKEN production
vercel env add TELEGRAM_BOT_USERNAME production
vercel env add TELEGRAM_WEBHOOK_SECRET production
vercel --prod                     # redeploy so the new vars are live
```

Point the webhook at production. `APP_URL` in `.env.local` still says
`localhost`, so pass the real one for this command only:

```bash
APP_URL=https://<your-domain> npm run telegram -- setup
npm run telegram -- info          # webhook url, pending count, last error
```

Then open `/settings` on the deployed app and use the deep link to bind your
chat. Send `/plan` to the bot — a reply means the whole loop is live.

## 4. Cloudflare cron — **you**

```bash
cd workers/reminders
npm install
```

Set `APP_URL` in `wrangler.toml` to the deployed domain, then:

```bash
npx wrangler login
npx wrangler secret put CRON_SECRET      # same value as the app's
npm run deploy
```

Confirm by firing one tick by hand — `curl https://cairn-reminders.<subdomain>.workers.dev`
returns the tick's own report (`due`, `sent`, `skipped`). `npm run tail` watches
the five-minute ticks land. A tick is keyed by (user, kind, local date), so
firing it by hand costs nothing.

Before it can send anything you need `npm run telegram -- tick` to show a slot as
due — the schedule is 07:00 / 14:30 / 19:00 / 22:00 / 22:45 in your own timezone,
with a 20-minute grace window.

## 5. Resend — optional, the weekly digest

Free tier, 100 emails a day, one used per journey week. Sign up, verify a sending
domain (or use their sandbox sender), and set `RESEND_API_KEY` locally and in
Vercel. Skip it if you want; the digest is the only thing that reads it, and
Telegram already carries the daily signal.

---

## Then: use it

1. **`/start`** — self-placement. Tick everything you have genuinely already
   done. It banks that work at day 0: it counts toward the map and unlocks the
   exam, but puts no stone on the cairn and does not touch velocity.
2. **Install it.** Open the domain in Chrome on Android → *Add to home screen*.
   The manifest is already there, so it opens without browser chrome.
3. **Set your budget** in `/settings` — weekday and weekend minutes. The planner
   sizes every day against this, so a wrong number here makes the whole plan wrong.
4. **Day one is tomorrow morning.** Open `/today`, work the blocks, log every
   problem honestly (`editorial` schedules its own redo three active days out),
   and close the day. The stone only lands if you close it.

**One caution.** `npm run verify` is safe — it builds and tears down a synthetic
user (`e2e-test@cairn.local`). The four browser suites are not: they sign in as
*your* account through `/api/dev-login` and write real rows — closed days, issued
certificates, ticked checkpoints — into the Neon production branch that local
development shares. Once you have work in there, run them against a Neon branch
(`neon branch create test`, point `DATABASE_URL` at it) rather than production.
