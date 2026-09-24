/**
 * Cairn's clock.
 *
 * Cairn is a Next.js app with no long-running process, so something outside it
 * has to know that it is 07:00 somewhere. That is all this is: a cron trigger
 * that POSTs the tick endpoint. Every decision — whose slot is due, in which
 * timezone, what the message says, whether it was already sent — lives in
 * `app/api/cron/route.ts`, where it shares the app's types and database.
 *
 * Keep it that way. A worker that starts making decisions is a second copy of
 * the product with no types and its own bugs.
 */

export interface Env {
  /** the deployed app, no trailing slash */
  APP_URL: string;
  /** shared with the app's CRON_SECRET */
  CRON_SECRET: string;
}

async function tick(env: Env): Promise<Response> {
  return fetch(`${env.APP_URL}/api/cron`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CRON_SECRET}`,
      "content-type": "application/json",
    },
    body: "{}",
  });
}

/** constant-time compare, via digests so the lengths never differ */
async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const u = new Uint8Array(x);
  const v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i]! ^ v[i]!;
  return diff === 0;
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        try {
          const res = await tick(env);
          const body = await res.text();
          // Surfaces in `wrangler tail`. The tick reports its own fan-out.
          console.log(`[cairn] ${res.status} ${body.slice(0, 500)}`);
        } catch (e) {
          console.error("[cairn] tick failed", e);
        }
      })(),
    );
  },

  /**
   * Manual fire, for checking the wiring:
   *   curl -H "authorization: Bearer $CRON_SECRET" https://<worker>/
   *
   * It needs the same secret the app does. Open, it was a public button that
   * sent everyone's reminders on demand — the app's own check never saw the
   * caller, because the worker attached the secret for them.
   */
  async fetch(req: Request, env: Env): Promise<Response> {
    const offered = req.headers.get("authorization") ?? "";
    if (!env.CRON_SECRET || !(await sameSecret(offered, `Bearer ${env.CRON_SECRET}`))) {
      return new Response("not found", { status: 404 });
    }
    const res = await tick(env);
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;
