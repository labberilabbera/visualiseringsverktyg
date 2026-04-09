import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function GET() {
  try {
    const hash = await bcrypt.hash("demo1234", 10);
    await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = $3",
      ["tor@flodet.se", hash, "admin"]
    );
    return NextResponse.json({ ok: true, message: "Admin skapad" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
