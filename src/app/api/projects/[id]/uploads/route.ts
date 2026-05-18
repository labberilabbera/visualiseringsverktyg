import { NextRequest, NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const pool = getPool();
  const projectId = parseInt(params.id);
  await pool.query("ALTER TABLE uploads ADD COLUMN IF NOT EXISTS seg_task_id TEXT");
  const result = await pool.query(
    "SELECT id, filename, mimetype, ai_image, model3d_url, tripo_task_id, segmented_model_url, seg_task_id FROM uploads WHERE project_id = $1 ORDER BY id",
    [projectId]
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const pool = getPool();
  const projectId = parseInt(params.id);
  try {
    const { filename, mimetype, data } = await req.json();
    if (!filename || !mimetype || !data) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const result = await pool.query(
      "INSERT INTO uploads (project_id, filename, mimetype, data) VALUES ($1, $2, $3, $4) RETURNING id",
      [projectId, filename, mimetype, data]
    );
    return NextResponse.json({ id: result.rows[0].id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
