import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import db from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret");

async function getEmail(req: NextRequest): Promise<string | null> {
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
  const projects = db.prepare("SELECT id, name, prompt, created_at, updated_at FROM projects WHERE owner_email = ? ORDER BY updated_at DESC").all(email);
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const email = await getEmail(req);
  if (!email) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Namn krävs" }, { status: 400 });
  const result = db.prepare("INSERT INTO projects (name, owner_email) VALUES (?, ?)").run(name.trim(), email);
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(project, { status: 201 });
}
