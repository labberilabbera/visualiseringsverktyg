import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { rows } = await pool.query(
    "SELECT id, filename, mimetype, uploaded_at FROM uploads WHERE project_id = $1 ORDER BY uploaded_at ASC",
    [params.id]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { filename, mimetype, data } = await req.json();
    if (!filename || !mimetype || !data) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const { rows } = await pool.query(
      "INSERT INTO uploads (project_id, filename, mimetype, data) VALUES ($1, $2, $3, $4) RETURNING id",
      [params.id, filename, mimetype, data]
    );
    await pool.query("UPDATE projects SET updated_at = NOW() WHERE id = $1", [params.id]);
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
