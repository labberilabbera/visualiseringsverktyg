import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret");

async function getEmail(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.email as string;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const email = await getEmail(req);
  if (!email) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  await initDb();
  const db = getPool();
  const res = await db.query("SELECT id, name, prompt, created_at, updated_at FROM projects WHERE owner_email = $1 ORDER BY updated_at DESC", [email]);
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const email = await getEmail(req);
  if (!email) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Namn kravs" }, { status: 400 });
  await initDb();
  const db = getPool();
  const res = await db.query("INSERT INTO projects (name, owner_email) VALUES ($1, $2) RETURNING *", [name.trim(), email]);
  return NextResponse.json(res.rows[0], { status: 201 });
}
