import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const users = db.prepare("SELECT id, email, role FROM users").all();
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
