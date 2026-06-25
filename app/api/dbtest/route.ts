import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

// TEMPORARY password tester — probes a candidate password directly against the
// pooler, bypassing DATABASE_URL. Token-gated. DELETE after login works.
const TOKEN = "k3diag2026";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const pw = searchParams.get("pw") ?? "";

  const sql = postgres({
    host: "aws-1-us-west-2.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    username: "postgres.dwzoamvzyvonnmsjgmlq",
    password: pw,
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    const r = await sql`select 1 as ok`;
    await sql.end({ timeout: 5 });
    return NextResponse.json({ accepted: true, pwLen: pw.length, result: r[0] });
  } catch (e) {
    try {
      await sql.end({ timeout: 5 });
    } catch {}
    return NextResponse.json({
      accepted: false,
      pwLen: pw.length,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
