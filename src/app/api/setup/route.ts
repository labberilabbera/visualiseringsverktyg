import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDb();
    const db = getPool();
    // Upsert admin user with fresh hash
    const hash = bcrypt.hashSync("demo1234", 10);
    await db.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = $3`,
      ["tor@flodet.se", hash, "admin"]
    );
    const res = await db.query("SELECT id, email, role FROM users");
    return NextResponse.json({ ok: true, users: res.rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
