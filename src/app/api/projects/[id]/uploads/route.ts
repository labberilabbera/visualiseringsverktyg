import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const db = getPool();
  const res = await db.query(
    "SELECT id, filename, mimetype, uploaded_at, ai_image, model3d_url FROM uploads WHERE project_id = $1 ORDER BY uploaded_at ASC",
    [params.id]
  );
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { filename, mimetype, data } = await req.json();
    if (!filename || !mimetype || !data) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    await initDb();
    const db = getPool();
    const res = await db.query(
      "INSERT INTO uploads (project_id, filename, mimetype, data) VALUES ($1, $2, $3, $4) RETURNING id",
      [params.id, filename, mimetype, data]
    );
    await db.query("UPDATE projects SET updated_at = NOW() WHERE id = $1", [params.id]);
    return NextResponse.json({ id: res.rows[0].id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
