import { db } from "@/db";
import { allowedEmails } from "@/db/schema";

/**
 * Cairn is invite-only. Add an email to the allowlist:
 *   npm run invite -- friend@example.com "batchmate"
 * List everyone currently invited:
 *   npm run invite
 */
async function main() {
  const [email, note] = process.argv.slice(2);

  if (!email) {
    const rows = await db.select().from(allowedEmails);
    console.log(`${rows.length} invited:`);
    for (const r of rows) console.log(`  ${r.email}${r.note ? `  — ${r.note}` : ""}`);
    process.exit(0);
  }

  const clean = email.toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    console.error(`not an email address: ${clean}`);
    process.exit(1);
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
