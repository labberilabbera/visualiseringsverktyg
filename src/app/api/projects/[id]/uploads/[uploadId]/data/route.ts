import { NextRequest, NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string; uploadId: string } }) {
  await initDb();
  const pool = getPool();
  const uploadId = parseInt(params.uploadId);
  const result = await pool.query("SELECT data, mimetype FROM uploads WHERE id = $1", [uploadId]);
  if (!result.rows[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; uploadId: string } }) {
  await initDb();
  const pool = getPool();
  const uploadId = parseInt(params.uploadId);
  const body = await req.json();
  if (body.aiImage !== undefined) {
    await pool.query("UPDATE uploads SET ai_image = $1 WHERE id = $2", [body.aiImage, uploadId]);
  }
  if (body.model3dUrl !== undefined) {
    await pool.query("UPDATE uploads SET model3d_url = $1 WHERE id = $2", [body.model3dUrl, uploadId]);
  }
  if (body.tripoTaskId !== undefined) {
    await pool.query("UPDATE uploads SET tripo_task_id = $1 WHERE id = $2", [body.tripoTaskId, uploadId]);
  }
  if (body.segmentedModelUrl !== undefined) {
    await pool.query("UPDATE uploads SET segmented_model_url = $1 WHERE id = $2", [body.segmentedModelUrl, uploadId]);
  }
  if (body.segTaskId !== undefined) {
    await pool.query("ALTER TABLE uploads ADD COLUMN IF NOT EXISTS seg_task_id TEXT");
    await pool.query("UPDATE uploads SET seg_task_id = $1 WHERE id = $2", [body.segTaskId, uploadId]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; uploadId: string } }) {
  await initDb();
  const pool = getPool();
  const uploadId = parseInt(params.uploadId);
  await pool.query("DELETE FROM uploads WHERE id = $1", [uploadId]);
  return NextResponse.json({ ok: true });
}
