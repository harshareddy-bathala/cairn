import { eq, getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { users } from "@/db/schema";

/**
 * Wipes your own progress, keeping the curriculum.
 *
 * The table list is derived, not written down: every table with a user_id
 * column except `users` itself is progress. A hand-maintained list went stale
 * twice — once leaving projects and applications behind, once leaving a
 * certificate that made the next test run start from someone else's state.
 */
/** identity, not progress — wiping these would sign you out and unlink Google */
const AUTH_TABLES = new Set(["accounts", "sessions", "authenticators"]);

function progressTables() {
  const tables: PgTable[] = [];
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const t = value as PgTable;
    if (t === (users as unknown as PgTable)) continue;
    const cols = getTableColumns(t) as Record<string, { name: string }>;
    if (!("userId" in cols)) continue;
    if (AUTH_TABLES.has(getTableName(t))) continue;
    tables.push(t);
  }
  return tables;
}

async function main() {
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.email, "harshareddy.bathala@gmail.com"));
  if (!u) {
    console.error("no such user");
    process.exit(1);
  }

  const tables = progressTables();
  for (const t of tables) {
    const cols = getTableColumns(t) as Record<string, never>;
    await db.delete(t).where(eq(cols.userId, u.id));
  }

  // the handle and the pace settings are profile, not progress, but a test run
  // that claims a handle should not leave it claimed
  await db.update(users).set({ handle: null, onboardedAt: null }).where(eq(users.id, u.id));

  console.log(`reset (${tables.length} tables)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
