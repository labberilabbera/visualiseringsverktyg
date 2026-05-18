import { NextRequest, NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// Publik endpoint for Unreal Engine / kollegor
// GET /api/projects/14/model          -> lista alla modeller i projektet
// GET /api/projects/14/model?upload=18 -> streama specifik GLB-fil direkt
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const pool = getPool();
  const projectId = parseInt(params.id);
  const uploadId = new URL(req.url).searchParams.get("upload");

  // Om upload-ID anges: streama GLB-filen direkt
  if (uploadId) {
    const result = await pool.query(
      "SELECT id, model3d_url, segmented_model_url FROM uploads WHERE id = $1 AND project_id = $2",
      [parseInt(uploadId), projectId]
    );
    if (!result.rows[0]) {
      return new NextResponse("Upload " + uploadId + " hittades inte i projekt " + projectId, { status: 404 });
    }
    const row = result.rows[0];
    const modelUrl = row.segmented_model_url || row.model3d_url;
    if (!modelUrl) {
      return new NextResponse("Ingen 3D-modell for upload " + uploadId + " an", { status: 404 });
    }
    const res = await fetch(modelUrl);
    if (!res.ok) return new NextResponse("Kunde inte hamta modellen", { status: 502 });
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Disposition": "inline; filename=model-" + uploadId + ".glb",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      },
    });
  }

  // Annars: returnera lista med alla modeller
  const result = await pool.query(
    "SELECT id, model3d_url, segmented_model_url FROM uploads WHERE project_id = $1 AND model3d_url IS NOT NULL ORDER BY id",
    [projectId]
  );
  if (!result.rows.length) {
    return NextResponse.json({ error: "Inga modeller hittades for projekt " + projectId }, { status: 404 });
  }
  const baseUrl = "https://visualiseringsverktyg-production.up.railway.app";
  const models = result.rows.map((row: any) => ({
    upload_id: row.id,
    typ: row.segmented_model_url ? "segmenterad" : "standard",
    glb_url: baseUrl + "/api/projects/" + projectId + "/model?upload=" + row.id,
  }));
  return NextResponse.json({ projekt: projectId, modeller: models });
}
