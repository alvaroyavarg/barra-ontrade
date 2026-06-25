import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

// Temporary diagnostic endpoint — confirms Vercel can reach the database.
// Remove once login is validated.
export async function GET() {
  if (!db) {
    return NextResponse.json({ ok: false, reason: "DATABASE_URL no está definido" }, { status: 500 });
  }
  try {
    const rows = await db.select({ n: sql<number>`count(*)` }).from(users);
    return NextResponse.json({ ok: true, db: "conectada", users: Number(rows[0]?.n ?? 0) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
