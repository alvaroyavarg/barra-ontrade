import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

// Un solo driver (node-postgres) para local y Neon: Neon habla protocolo
// Postgres estándar. En producción usar el connection string POOLED de Neon.
// Si algún día se necesita edge runtime, se cambia aquí por neon-http.

declare global {
  // eslint-disable-next-line no-var
  var __key3Pool: Pool | undefined;
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida");
  }
  // Reusar el pool entre hot-reloads en dev y entre invocaciones warm en serverless
  if (!global.__key3Pool) {
    global.__key3Pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }
  return global.__key3Pool;
}

export const db = drizzle(getPool(), { schema });
