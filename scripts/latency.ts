import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { problemAttempts, problems, users } from "@/db/schema";
import { openToday } from "@/lib/journey";

async function main() {
  await db.execute(sql`select 1`); // warm

  const t0 = Date.now();
  await db.execute(sql`select 1`);
  const rtt = Date.now() - t0;

  const [u] = await db.select().from(users).where(eq(users.email, "harshareddy.bathala@gmail.com"));

  const t1 = Date.now();
  const day = await openToday(u.id);
  const openMs = Date.now() - t1;

  const t2 = Date.now();
  await Promise.all([
    db.select({ slug: problems.slug }).from(problems).where(eq(problems.slug, "lc-sqrtx")),
    openToday(u.id),
  ]);
  const parallelMs = Date.now() - t2;

  const t3 = Date.now();
  await db.execute(sql`
    with cleared as (
      update problem_attempts set redo_cleared_at = now()
      where user_id = ${u.id} and problem_slug = 'lc-sqrtx' and redo_cleared_at is null returning 1
    )
    insert into problem_attempts (user_id, problem_slug, outcome, day_index, redo_due_day)
    values (${u.id}, 'lc-sqrtx', 'editorial', ${day}, ${day + 3})
  `);
  const writeMs = Date.now() - t3;

  await db.delete(problemAttempts).where(eq(problemAttempts.userId, u.id));

  console.log(`raw round trip:            ${rtt}ms`);
  console.log(`openToday (1 statement):   ${openMs}ms`);
  console.log(`lookup + openToday (par):  ${parallelMs}ms`);
  console.log(`clear + insert (1 stmt):   ${writeMs}ms`);
  console.log(`--- server action DB cost: ~${parallelMs + writeMs}ms  (was ~6 x ${rtt} = ${rtt * 6}ms)`);
  process.exit(0);
}
main();
