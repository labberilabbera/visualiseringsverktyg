import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret");

async function getUser(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: number; email: string; role: string };
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Ej behorig" }, { status: 403 });
  await initDb();
  const db = getPool();
  const res = await db.query("SELECT id, email, role FROM users ORDER BY id ASC");
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Ej behorig" }, { status: 403 });
  const { email, password, role } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "E-post och losenord kravs" }, { status: 400 });
  const hash = bcrypt.hashSync(password, 10);
  try {
    await initDb();
    const db = getPool();
    const res = await db.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role",
      [email.toLowerCase().trim(), hash, role || "user"]
    );
    return NextResponse.json(res.rows[0]);
  } catch {
    return NextResponse.json({ error: "E-post finns redan" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Ej behorig" }, { status: 403 });
  const { id } = await req.json();
  if (Number(user.id) === Number(id)) return NextResponse.json({ error: "Kan inte radera dig sjalv" }, { status: 400 });
  await initDb();
  const db = getPool();
  await db.query("DELETE FROM users WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Ej behorig" }, { status: 403 });
  const { id, password } = await req.json();
  if (!password) return NextResponse.json({ error: "Losenord kravs" }, { status: 400 });
  const hash = bcrypt.hashSync(password, 10);
  await initDb();
  const db = getPool();
  await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, id]);
  return NextResponse.json({ ok: true });
}
