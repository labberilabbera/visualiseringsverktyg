import { NextRequest, NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// Publik endpoint - ingen auth krävs
// Returnerar GLB-filen direkt via redirect
// Kollegan byter bara projekt-ID: /api/projects/14/model
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const pool = getPool();
  const projectId = parseInt(params.id);
  const result = await pool.query(
    "SELECT id, model3d_url, segmented_model_url FROM uploads WHERE project_id = $1 AND model3d_url IS NOT NULL ORDER BY id DESC LIMIT 1",
    [projectId]
  );
  if (!result.rows[0]) {
    return new NextResponse("Ingen 3D-modell hittades for projekt " + projectId, { status: 404 });
  }
  const row = result.rows[0];
  const modelUrl = row.segmented_model_url || row.model3d_url;
  // Hämta filen och streama den direkt - undviker lång URL
  const res = await fetch(modelUrl);
  if (!res.ok) {
    return new NextResponse("Kunde inte hamta modellen", { status: 502 });
  }
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Content-Disposition": "inline; filename=model.glb",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}
