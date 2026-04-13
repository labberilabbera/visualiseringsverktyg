import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function GET() {
  try {
    // Skapa tabellen om den inte finns, med korrekt UNIQUE constraint
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `);
    // Ta bort befintlig admin och skapa ny med korrekt bcrypt-hash
    const hash = await bcrypt.hash("demo1234", 10);
    await pool.query("DELETE FROM users WHERE email = $1", ["tor@flodet.se"]);
    await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)",
      ["tor@flodet.se", hash, "admin"]
    );
    return NextResponse.json({ ok: true, message: "Admin skapad med hash" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
