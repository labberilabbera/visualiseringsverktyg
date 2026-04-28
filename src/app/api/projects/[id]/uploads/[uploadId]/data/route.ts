import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string; uploadId: string } }) {
  await initDb();
  const db = getPool();
  const res = await db.query(
    "SELECT data, mimetype, ai_image, model3d_url, tripo_task_id, segmented_model_url FROM uploads WHERE id = $1 AND project_id = $2",
    [params.uploadId, params.id]
  );
  if (!res.rows[0]) return NextResponse.json({ error: "Inte hittad" }, { status: 404 });
  return NextResponse.json({ data: res.rows[0].data, mimetype: res.rows[0].mimetype, aiImage: res.rows[0].ai_image, model3dUrl: res.rows[0].model3d_url, tripoTaskId: res.rows[0].tripo_task_id, segmentedModelUrl: res.rows[0].segmented_model_url });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; uploadId: string } }) {
  await initDb();
  const db = getPool();
  const { aiImage, model3dUrl, tripoTaskId, segmentedModelUrl } = await req.json();
  if (aiImage !== undefined) {
    await db.query("UPDATE uploads SET ai_image = $1 WHERE id = $2 AND project_id = $3", [aiImage, params.uploadId, params.id]);
  }
  if (model3dUrl !== undefined) {
    await db.query("UPDATE uploads SET model3d_url = $1 WHERE id = $2 AND project_id = $3", [model3dUrl, params.uploadId, params.id]);
  }
  if (tripoTaskId !== undefined) {
    await db.query("UPDATE uploads SET tripo_task_id = $1 WHERE id = $2 AND project_id = $3", [tripoTaskId, params.uploadId, params.id]);
  }
  if (segmentedModelUrl !== undefined) {
    await db.query("UPDATE uploads SET segmented_model_url = $1 WHERE id = $2 AND project_id = $3", [segmentedModelUrl, params.uploadId, params.id]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; uploadId: string } }) {
  await initDb();
  const db = getPool();
  await db.query("DELETE FROM uploads WHERE id = $1 AND project_id = $2", [params.uploadId, params.id]);
  return NextResponse.json({ ok: true });
}
