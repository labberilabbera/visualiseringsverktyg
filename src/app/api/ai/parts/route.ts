import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { imageData } = await req.json();
    if (!imageData) return NextResponse.json({ error: "missing_image" }, { status: 400 });
    const base64 = imageData.startsWith("data:") ? imageData.split(",")[1] : imageData;
    const promptText = "Look at this object in the image. List the main visual parts of this specific object that could be separately styled or textured. Return ONLY a JSON array of short Swedish part names (max 6 parts, 1-3 words each). Example for a car: [\"Kaross\",\"Hjul\",\"Fönster\",\"Grill\"]. Example for a sofa: [\"Sits\",\"Ryggstöd\",\"Ben\",\"Armstöd\"]. Return only the JSON array, nothing else.";
    const body = {
      contents: [{
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: base64 } },
          { text: promptText }
        ]
      }]
    };
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + key;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ parts: ["Del 1", "Del 2", "Del 3"] });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
    const clean = text.replace(/[`]{3}(json)?/g, "").trim();
    const parts = JSON.parse(clean);
    if (!Array.isArray(parts)) throw new Error("not array");
    return NextResponse.json({ parts: parts.slice(0, 6) });
  } catch (e) {
    return NextResponse.json({ parts: ["Del 1", "Del 2", "Del 3"] });
  }
}
