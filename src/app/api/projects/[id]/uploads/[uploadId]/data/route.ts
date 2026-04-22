import { NextRequest, NextResponse } from "next/server";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string; uploadId: string } }) {
  await initDb();
  const db = getPool();
  const res = await db.query(
    "SELECT data, mimetype FROM uploads WHERE id = $1 AND project_id = $2",
    [params.uploadId, params.id]
  );
  if (!res.rows[0]) return NextResponse.json({ error: "Inte hittad" }, { status: 404 });
  return NextResponse.json({ data: res.rows[0].data, mimetype: res.rows[0].mimetype });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; uploadId: string } }) {
  await initDb();
  const db = getPool();
  await db.query("DELETE FROM uploads WHERE id = $1 AND project_id = $2", [params.uploadId, params.id]);
  return NextResponse.json({ ok: true });
}
