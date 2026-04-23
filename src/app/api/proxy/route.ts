import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

  // Only allow tripo3d URLs for security
  if (!url.includes("tripo3d") && !url.includes("amazonaws.com")) {
    return NextResponse.json({ error: "disallowed url" }, { status: 403 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "upstream error" }, { status: res.status });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
