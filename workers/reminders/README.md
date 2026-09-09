# cairn-reminders

The cron trigger behind Telegram reminders. It holds no logic — it POSTs
`/api/cron` on the app every five minutes with the shared secret, and the app
decides everything else.

```bash
cd workers/reminders
npm install
npx wrangler secret put CRON_SECRET     # same value as the app's CRON_SECRET
# set APP_URL in wrangler.toml to the deployed app
npm run deploy
npm run tail                            # watch ticks land
```

Hitting the worker's URL in a browser fires one tick by hand, which is the
fastest way to confirm the secret matches.

**Why a worker and not `vercel.json` crons?** Cairn's slots are per-user local
times with a 20-minute grace window, so the tick has to run every five minutes
regardless of where the app is hosted — and it must keep running if the app
moves off Vercel. The clock staying outside the app is the point.
