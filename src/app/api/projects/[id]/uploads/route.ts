import { NextRequest, NextResponse } from "next/server";
import { initDb, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// Hämtar färsk URL från Tripo via task_id
async function refreshUrl(taskId: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.tripo3d.ai/v2/openapi/task/" + taskId, {
      headers: { "Authorization": "Bearer " + apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const output = data?.data?.output ?? null;
    return output?.model ?? output?.pbr_model ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const pool = getPool();
  const projectId = parseInt(params.id);
  const key = process.env.TRIPO_API_KEY;
  await pool.query("ALTER TABLE uploads ADD COLUMN IF NOT EXISTS seg_task_id TEXT");
  const result = await pool.query(
    "SELECT id, filename, mimetype, ai_image, model3d_url, tripo_task_id, segmented_model_url, seg_task_id FROM uploads WHERE project_id = $1 ORDER BY id",
    [projectId]
  );
  const rows = result.rows;
  // Uppdatera utgångna URLs parallellt
  if (key) {
    await Promise.all(rows.map(async (row: any) => {
      // Kolla om model3d_url är utgången
      if (row.tripo_task_id && row.model3d_url) {
        try {
          const check = await fetch(row.model3d_url, { method: "HEAD" });
          if (!check.ok) {
            const fresh = await refreshUrl(row.tripo_task_id, key);
            if (fresh) {
              row.model3d_url = fresh;
              await pool.query("UPDATE uploads SET model3d_url = $1 WHERE id = $2", [fresh, row.id]);
            }
          }
        } catch {
          // nätverksfel — fortsätt ändå
        }
      }
      // Kolla seg_task_id / segmented_model_url
      if (row.seg_task_id && row.segmented_model_url) {
        try {
          const check = await fetch(row.segmented_model_url, { method: "HEAD" });
          if (!check.ok) {
            const fresh = await refreshUrl(row.seg_task_id, key);
            if (fresh) {
              row.segmented_model_url = fresh;
              await pool.query("UPDATE uploads SET segmented_model_url = $1 WHERE id = $2", [fresh, row.id]);
            }
          }
        } catch {
          // fortsätt
        }
      }
    }));
  }
  return NextResponse.json(rows);
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
