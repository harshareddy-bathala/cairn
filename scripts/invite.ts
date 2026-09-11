import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getTableName } from "drizzle-orm";
import { allowedEmails, sessions, users } from "@/db/schema";
import { progressTables } from "@/lib/progress-tables";

/**
 * Cairn is invite-only. The allowlist is the gate: sign-in checks it, so
 * taking an address off it is what closes the door.
 *
 *   npm run invite                                  list everyone invited
 *   npm run invite -- friend@example.com "batchmate" invite (or re-note)
 *   npm run invite -- --remove friend@example.com    uninvite, keep their work
 *   npm run invite -- --remove friend@example.com --purge   ...and erase it
 *
 * `--remove` also drops their live sessions. Without that they keep browsing
 * on the cookie they already hold until it expires, which is not what anyone
 * means by removing someone.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function list() {
  const rows = await db
    .select({
      email: allowedEmails.email,
      note: allowedEmails.note,
      userId: users.id,
      handle: users.handle,
    })
    .from(allowedEmails)
    .leftJoin(users, eq(users.email, allowedEmails.email));

  console.log(`${rows.length} invited:`);
  for (const r of rows) {
    const state = r.userId ? `signed in${r.handle ? ` as @${r.handle}` : ""}` : "not yet arrived";
    console.log(`  ${r.email}${r.note ? `  — ${r.note}` : ""}  (${state})`);
  }
}

/** what they would lose, counted before anything is deleted */
async function progressCount(userId: string) {
  const tables = progressTables();
  const parts = tables.map(
    (t) => sql`(select count(*) from ${t} where user_id = ${userId})`,
  );
  const [row] = (
    await db.execute<{ n: number }>(
      sql`select (${sql.join(parts, sql` + `)})::int as n`,
    )
  ).rows;
  return { rows: row?.n ?? 0, tables: tables.map(getTableName) };
}

async function remove(email: string, purge: boolean) {
  const [invite] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email));
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!invite && !user) {
    console.error(`nobody here by that address: ${email}`);
    process.exit(1);
  }

  if (invite) {
    await db.delete(allowedEmails).where(eq(allowedEmails.email, email));
    console.log(`uninvited ${email} — they can no longer sign in`);
  } else {
    console.log(`${email} was not on the allowlist`);
  }

  if (!user) {
    console.log("they never signed in, so there is nothing else to remove");
    process.exit(0);
  }

  const killed = await db.delete(sessions).where(eq(sessions.userId, user.id)).returning();
  console.log(`signed them out of ${killed.length} session${killed.length === 1 ? "" : "s"}`);

  const { rows } = await progressCount(user.id);

  if (!purge) {
    console.log(
      `kept their account and ${rows} row${rows === 1 ? "" : "s"} of progress — ` +
        `re-inviting this address picks up exactly where they left off`,
    );
    console.log(`to erase it instead: npm run invite -- --remove ${email} --purge`);
    process.exit(0);
  }

  // Deleting the user cascades every table that references it, which is why
  // the count is taken first — afterwards there is nothing left to count.
  await db.delete(users).where(eq(users.id, user.id));
  console.log(`erased their account and ${rows} row${rows === 1 ? "" : "s"} of progress`);
}

async function main() {
  const argv = process.argv.slice(2);
  const purge = argv.includes("--purge");
  const rest = argv.filter((a) => a !== "--purge");
  const removing = rest[0] === "--remove";
  const [email, note] = removing ? rest.slice(1) : rest;

  if (!email) {
    if (removing) {
      console.error("which address? npm run invite -- --remove friend@example.com");
      process.exit(1);
    }
    await list();
    process.exit(0);
  }

  const clean = email.toLowerCase().trim();
  if (!EMAIL_RE.test(clean)) {
    console.error(`not an email address: ${clean}`);
    process.exit(1);
  }

  if (removing) {
    await remove(clean, purge);
    process.exit(0);
  }

  await db
    .insert(allowedEmails)
    .values({ email: clean, note: note ?? null })
    .onConflictDoUpdate({ target: allowedEmails.email, set: { note: note ?? null } });

  console.log(`invited ${clean}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
