import { eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { progressTables } from "@/lib/progress-tables";

/**
 * Wipes one account's progress from the command line, keeping the curriculum.
 *
 *   npm run reset-me                          the owner's account
 *   npm run reset-me -- --email x@cairn.local another one (the e2e account)
 *
 * The table list comes from `lib/progress-tables`, shared with the reset button
 * in Settings so the two cannot disagree about what "progress" means.
 */
function emailArg() {
  const i = process.argv.indexOf("--email");
  return (i >= 0 ? process.argv[i + 1] : undefined) ?? "harshareddy.bathala@gmail.com";
}

async function main() {
  const email = emailArg().toLowerCase();
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u) {
    // an account that has never signed in has nothing to reset
    console.log(`reset: ${email} has not signed in yet — nothing to reset`);
    process.exit(0);
  }

  const tables = progressTables();
  for (const t of tables) {
    const cols = getTableColumns(t) as Record<string, never>;
    await db.delete(t).where(eq(cols.userId, u.id));
  }

  // the handle and the pace settings are profile, not progress, but a test run
  // that claims a handle should not leave it claimed
  await db.update(users).set({ handle: null, onboardedAt: null }).where(eq(users.id, u.id));

  console.log(`reset ${email} (${tables.length} tables)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
