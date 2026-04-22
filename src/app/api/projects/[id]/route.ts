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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const db = getPool();
  const res = await db.query("SELECT * FROM projects WHERE id = $1", [params.id]);
  if (!res.rows[0]) return NextResponse.json({ error: "Inte hittad" }, { status: 404 });
  return NextResponse.json(res.rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getEmail(req);
  if (!email) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  const { prompt } = await req.json();
  await initDb();
  const db = getPool();
  await db.query("UPDATE projects SET prompt = $1, updated_at = NOW() WHERE id = $2 AND owner_email = $3", [prompt, params.id, email]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getEmail(req);
  if (!email) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  await initDb();
  const db = getPool();
  await db.query("DELETE FROM projects WHERE id = $1 AND owner_email = $2", [params.id, email]);
  return NextResponse.json({ ok: true });
}
