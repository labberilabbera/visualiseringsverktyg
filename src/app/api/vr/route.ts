import { NextRequest, NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await initDb();
  const pool = getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS vr_codes (
    code TEXT PRIMARY KEY,
    model_url TEXT NOT NULL,
    upload_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
  )`);
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });
  const result = await pool.query(
    "SELECT model_url, upload_id FROM vr_codes WHERE code = $1 AND expires_at > NOW()",
    [code]
  );
  if (!result.rows[0]) return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });
  return NextResponse.json({ modelUrl: result.rows[0].model_url, uploadId: result.rows[0].upload_id });
}

export async function POST(req: NextRequest) {
  await initDb();
  const pool = getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS vr_codes (
    code TEXT PRIMARY KEY,
    model_url TEXT NOT NULL,
    upload_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
  )`);
  const { modelUrl, uploadId } = await req.json();
  if (!modelUrl) return NextResponse.json({ error: "missing_modelUrl" }, { status: 400 });
  await pool.query("DELETE FROM vr_codes WHERE expires_at < NOW()");
  // Generera unik 3-siffrig kod
  let code = "";
  for (let tries = 0; tries < 100; tries++) {
    code = String(Math.floor(100 + Math.random() * 900));
    const exists = await pool.query("SELECT 1 FROM vr_codes WHERE code = $1", [code]);
    if (!exists.rows.length) break;
  }
  await pool.query(
    "INSERT INTO vr_codes (code, model_url, upload_id) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET model_url = $2, upload_id = $3, expires_at = NOW() + INTERVAL '24 hours'",
    [code, modelUrl, uploadId || null]
  );
  return NextResponse.json({ code });
}
