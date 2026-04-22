import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDb();
    const db = getPool();
    const hash = bcrypt.hashSync("demo1234", 10);
    // Use UPDATE — no constraint needed
    await db.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, "tor@flodet.se"]);
    const res = await db.query("SELECT id, email, role FROM users");
    return NextResponse.json({ ok: true, users: res.rows, hash });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
