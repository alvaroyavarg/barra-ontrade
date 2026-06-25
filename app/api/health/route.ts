import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

// Temporary diagnostic endpoint — confirms Vercel can reach the database.
// Shows the SHAPE of DATABASE_URL (never the password). Remove after login works.
export async function GET() {
  const url = process.env.DATABASE_URL;
  let info: Record<string, unknown> = { hasDatabaseUrl: !!url };

  if (url) {
    try {
      const u = new URL(url);
      const pwd = u.password ? decodeURIComponent(u.password) : "";
      info = {
        hasDatabaseUrl: true,
        user: decodeURIComponent(u.username),
        host: u.hostname,
        port: u.port,
        database: u.pathname.replace(/^\//, ""),
        passwordLength: pwd.length,
      };
    } catch (e) {
      info.parseError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!db) {
    return NextResponse.json({ ok: false, reason: "DATABASE_URL no definido", info }, { status: 500 });
  }
  try {
    const rows = await db.select({ n: sql<number>`count(*)` }).from(users);
    return NextResponse.json({ ok: true, db: "conectada", users: Number(rows[0]?.n ?? 0), info });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), info },
      { status: 500 }
    );
  }
}
