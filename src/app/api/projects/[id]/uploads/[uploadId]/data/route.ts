import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; uploadId: string } }
) {
  const upload = db.prepare(
    "SELECT data, mimetype FROM uploads WHERE id = ? AND project_id = ?"
  ).get(params.uploadId, params.id) as { data: string; mimetype: string } | undefined;

  if (!upload) return NextResponse.json({ error: "Inte hittad" }, { status: 404 });
  return NextResponse.json({ data: upload.data, mimetype: upload.mimetype });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; uploadId: string } }
) {
  db.prepare("DELETE FROM uploads WHERE id = ? AND project_id = ?")
    .run(params.uploadId, params.id);
  return NextResponse.json({ ok: true });
}
