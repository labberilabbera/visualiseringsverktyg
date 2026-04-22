import { NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDb();
    const db = getPool();
    const res = await db.query("SELECT id, email, role FROM users");
    return NextResponse.json({ ok: true, users: res.rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
