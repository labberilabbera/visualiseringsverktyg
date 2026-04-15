import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const uploads = db.prepare(
    "SELECT id, filename, mimetype, uploaded_at FROM uploads WHERE project_id = ? ORDER BY uploaded_at ASC"
  ).all(params.id);
  return NextResponse.json(uploads);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { filename, mimetype, data } = await req.json();
    if (!filename || !mimetype || !data) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const result = db.prepare(
      "INSERT INTO uploads (project_id, filename, mimetype, data) VALUES (?, ?, ?, ?)"
    ).run(params.id, filename, mimetype, data);
    db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(params.id);
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
