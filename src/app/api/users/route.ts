import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import db from "@/lib/db";

export const dynamic = "force-dynamic";


const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret");


async function getUser(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: number; email: string; role: string };
  } catch { return null; }
}


export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Ej behorig" }, { status: 403 });
  const users = db.prepare("SELECT id, email, role FROM users ORDER BY id ASC").all();
  return NextResponse.json(users);
}


export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Ej behorig" }, { status: 403 });
  const { email, password, role } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "E-post och losenord kravs" }, { status: 400 });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)").run(email.toLowerCase().trim(), hash, role || "user");
    return NextResponse.json({ id: result.lastInsertRowid, email, role: role || "user" });
  } catch {
    return NextResponse.json({ error: "E-post finns redan" }, { status: 409 });
  }
}
