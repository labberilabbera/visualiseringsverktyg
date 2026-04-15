import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret");

async function getEmail(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.email as string;
  } catch { return null; }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(params.id);
  if (!project) return NextResponse.json({ error: "Inte hittad" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getEmail(req);
  if (!email) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  const { prompt } = await req.json();
  db.prepare("UPDATE projects SET prompt = ?, updated_at = datetime('now') WHERE id = ? AND owner_email = ?")
    .run(prompt, params.id, email);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getEmail(req);
  if (!email) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  db.prepare("DELETE FROM projects WHERE id = ? AND owner_email = ?").run(params.id, email);
  return NextResponse.json({ ok: true });
}
