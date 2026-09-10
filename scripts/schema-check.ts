import { sql } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Does the database actually have the columns the code selects?
 *
 * Vercel builds from git and never touches Postgres, so a merged schema change
 * ships as code that queries columns which do not exist. That failure has no
 * build-time symptom at all: the deploy is green and every page that reads the
 * table 500s at runtime. `drizzle-kit push` is not the answer here — it needs a
 * TTY, and it still wants to drop and recreate the primary keys on `accounts`
 * and `verification_tokens` (drift that predates this script).
 *
 * So this compares what `db/schema.ts` declares against `information_schema`
 * and fails loudly. Run it before a deploy; a clean run means the code and the
 * database agree.
 */

function isPgTable(v: unknown): v is PgTable {
  return typeof v === "object" && v !== null && Symbol.for("drizzle:Name") in v;
}

async function main() {
  // A preview or a local build may have no database wired at all. "Cannot reach
  // it" is not the same failure as "it is behind", and blocking a build for the
  // first would make this check something people route around.
  if (!process.env.DATABASE_URL) {
    console.log("no DATABASE_URL — skipping the schema check");
    process.exit(0);
  }

  const live = await db.execute<{ table_name: string; column_name: string }>(sql`
    select table_name, column_name from information_schema.columns
    where table_schema = 'public'
  `);

  const have = new Map<string, Set<string>>();
  for (const r of live.rows) {
    if (!have.has(r.table_name)) have.set(r.table_name, new Set());
    have.get(r.table_name)!.add(r.column_name);
  }

  const missingTables: string[] = [];
  const missingCols: string[] = [];
  let tables = 0;
  let columns = 0;

  for (const value of Object.values(schema)) {
    if (!isPgTable(value)) continue;
    const cfg = getTableConfig(value);
    tables++;
    const cols = have.get(cfg.name);
    if (!cols) {
      missingTables.push(cfg.name);
      continue;
    }
    for (const c of cfg.columns) {
      columns++;
      if (!cols.has(c.name)) missingCols.push(`${cfg.name}.${c.name}`);
    }
  }

  console.log(`checked ${tables} tables, ${columns} columns`);

  if (missingTables.length === 0 && missingCols.length === 0) {
    console.log("schema matches the database");
    process.exit(0);
  }

  console.error("\nthe database is behind db/schema.ts:");
  for (const t of missingTables) console.error(`  missing table   ${t}`);
  for (const c of missingCols) console.error(`  missing column  ${c}`);
  console.error("\nEvery page that reads these will 500 at runtime, while the build stays green.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
