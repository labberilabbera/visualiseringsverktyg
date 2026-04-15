import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, reason: "no_key" });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { method: "GET" }
    );
    if (res.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, reason: "api_error", status: res.status });
  } catch {
    return NextResponse.json({ ok: false, reason: "network_error" });
  }
}
