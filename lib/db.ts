import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

/**
 * Lazy singleton. We do NOT connect at import time so that builds / static
 * generation don't require a live database. `prepare: false` keeps things
 * compatible with Supabase's transaction pooler.
 */
const globalForDb = globalThis as unknown as {
  __key3_sql?: ReturnType<typeof postgres>;
};

const sql =
  connectionString !== undefined
    ? (globalForDb.__key3_sql ??= postgres(connectionString, { prepare: false }))
    : undefined;

export const db = sql ? drizzle(sql, { schema }) : (undefined as unknown as ReturnType<typeof drizzle>);

export { schema };
