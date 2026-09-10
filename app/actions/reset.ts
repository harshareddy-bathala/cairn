"use server";

import { revalidatePath } from "next/cache";
import { eq, getTableColumns, getTableName, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { progressTables } from "@/lib/progress-tables";
import { RESET_PHRASE } from "@/lib/reset-phrase";

/**
 * Wiping your own progress, from the app.
 *
 * There is no undo. The phrase has to be typed exactly, and it is checked here
 * rather than only in the browser — a confirmation that lives only in the
 * client is a confirmation an accidental second click can skip.
 *
 * What survives is everything that is not progress: the account and its Google
 * link, the handle, the timezone, the Telegram binding, the pace budget and the
 * reminder schedule. Setting those up again is not part of starting over.
 */

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

/** What a reset would remove, so the confirmation can be an informed one. */
export async function progressSummary() {
  const userId = await requireUser();
  const res = await db.execute<{
    days: number; units: number; problems: number; certificates: number; other: number;
  }>(sql`
    select
      (select count(*)::int from journey_days where user_id = ${userId}) as days,
      (select count(*)::int from unit_progress where user_id = ${userId} and state = 'done') as units,
      (select count(*)::int from problem_attempts where user_id = ${userId}) as problems,
      (select count(*)::int from certificates where user_id = ${userId}) as certificates,
      (select count(*)::int from applications where user_id = ${userId})
        + (select count(*)::int from deliverable_done where user_id = ${userId})
        + (select count(*)::int from aptitude_scores where user_id = ${userId})
        + (select count(*)::int from mock_sessions where user_id = ${userId}) as other
  `);
  return res.rows[0]!;
}

export async function resetProgress(confirmation: string) {
  const userId = await requireUser();

  if (confirmation.trim().toLowerCase() !== RESET_PHRASE) {
    return { ok: false as const, error: `type "${RESET_PHRASE}" exactly` };
  }

  // the table list is derived from the schema, so a table added later is not
  // silently left behind holding half a journey
  const tables = progressTables();
  for (const t of tables) {
    const cols = getTableColumns(t) as Record<string, never>;
    await db.delete(t).where(eq(cols.userId, userId));
  }

  // the journey itself restarts; the handle, timezone, Telegram link, budget and
  // reminder schedule are settings, and survive
  await db
    .update(users)
    .set({ startedAt: null, onboardedAt: null, catchupMode: 1 })
    .where(eq(users.id, userId));

  for (const p of ["/today", "/roadmap", "/review", "/metrics", "/projects", "/career", "/certification", "/settings", "/start"]) {
    revalidatePath(p);
  }

  return { ok: true as const, tables: tables.map(getTableName).length };
}
