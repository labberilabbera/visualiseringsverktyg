import { NextRequest, NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// Publik endpoint for Unreal Engine / kollegor
// Användning: GET /api/projects/14/model
// Byt bara projekt-ID i URL:en
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const pool = getPool();
  const projectId = parseInt(params.id);
  const result = await pool.query(
    "SELECT id, model3d_url, segmented_model_url FROM uploads WHERE project_id = $1 AND model3d_url IS NOT NULL ORDER BY id DESC LIMIT 1",
    [projectId]
  );
  if (!result.rows[0]) {
    return NextResponse.json({ error: "Ingen 3D-modell hittades för projekt " + projectId }, { status: 404 });
  }
  const row = result.rows[0];
  const modelUrl = row.segmented_model_url || row.model3d_url;
  const baseUrl = req.headers.get("x-forwarded-host")
    ? "https://" + req.headers.get("x-forwarded-host")
    : new URL(req.url).origin;
  const glbUrl = baseUrl + "/api/proxy?url=" + encodeURIComponent(modelUrl);
  return NextResponse.json({
    projekt: projectId,
    glb_url: glbUrl,
  });
}
