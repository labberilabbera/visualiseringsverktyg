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
