import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function isLocal(url?: string) {
  if (!url) return true;
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "db";
  } catch {
    return false;
  }
}

/**
 * Neon supplies `?sslmode=require`, which pg currently treats as verify-full and
 * warns is about to change meaning. We strip it and state the intent directly:
 * full verification against the system CA store, which is what Neon supports.
 */
function connectionString(raw?: string) {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return raw;
  }
}

const globalForDb = globalThis as unknown as { pool?: Pool };

const url = connectionString(process.env.DATABASE_URL);

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: url,
    ssl: isLocal(url) ? false : { rejectUnauthorized: true },
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
