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

  /** Manual fire, for checking the wiring: `curl https://<worker>/` */
  async fetch(_req: Request, env: Env): Promise<Response> {
    const res = await tick(env);
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;
