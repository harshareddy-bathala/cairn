import { getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { users } from "@/db/schema";

/**
 * Every table that holds your progress rather than your identity.
 *
 * Derived, not written down: any table with a `user_id` column is progress,
 * except `users` itself and the Auth.js tables. A hand-maintained list went
 * stale twice — once leaving projects and applications behind, once leaving a
 * certificate that made the next run start from someone else's state. The list
 * now grows itself as the schema does.
 *
 * Shared by `scripts/reset-me.ts` and the reset button in Settings, because two
 * copies of this rule would drift the moment a table was added.
 */

/** identity, not progress — wiping these would sign you out and unlink Google */
const AUTH_TABLES = new Set(["accounts", "sessions", "authenticators"]);

export function progressTables(): PgTable[] {
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
