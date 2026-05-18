import { NextRequest, NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// Publik endpoint - ingen auth krävs
// GET /api/projects/14/model -> returnerar GLB-URL för senaste 3D-modellen
// Kollegan byter bara projekt-ID i URL:en
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const pool = getPool();
  const projectId = parseInt(params.id);
  const result = await pool.query(
    "SELECT id, model3d_url, segmented_model_url, tripo_task_id FROM uploads WHERE project_id = $1 AND model3d_url IS NOT NULL ORDER BY id DESC LIMIT 1",
    [projectId]
  );
  if (!result.rows[0]) {
    return NextResponse.json({ error: "no_model_found" }, { status: 404 });
  }
  const row = result.rows[0];
  // Segmenterad modell prioriteras om den finns
  const modelUrl = row.segmented_model_url || row.model3d_url;
  const proxyUrl = new URL(req.url).origin + "/api/proxy?url=" + encodeURIComponent(modelUrl);
  return NextResponse.json({
    uploadId: row.id,
    modelUrl,
    proxyUrl,
  });
}
