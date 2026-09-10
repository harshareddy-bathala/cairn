import { eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { progressTables } from "@/lib/progress-tables";

/**
 * Wipes your own progress from the command line, keeping the curriculum.
 *
 * The table list comes from `lib/progress-tables`, shared with the reset button
 * in Settings so the two cannot disagree about what "progress" means.
 */
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
