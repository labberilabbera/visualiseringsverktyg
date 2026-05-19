import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { imageData, partCount } = await req.json();
    const n = Math.max(1, Math.min(partCount || 16, 32));
    const prompt = "Look at this object. It has been split into " + n + " parts. List exactly " + n + " short Swedish names for the parts (e.g. Kaross, Framhjul, Bakhjul, Fonsterglas). Return ONLY a JSON array of " + n + " strings.";

    const contentParts: any[] = [{ text: prompt }];
    if (imageData) {
      const b64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;
      contentParts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
    }

    const body = {
      contents: [{ parts: contentParts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
    };

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + key,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    const names: Record<string, string> = {};
    if (res.ok) {
      const data = await res.json();
      const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      const match = raw.match(/[[sS]*]/);
      if (match) {
        try {
          const arr: string[] = JSON.parse(match[0]);
          for (let i = 0; i < n; i++) {
            names["tripo_part_" + i] = (arr[i] && typeof arr[i] === "string") ? arr[i] : "Del " + (i + 1);
          }
        } catch {}
      }
    }
    if (Object.keys(names).length === 0) {
      for (let i = 0; i < n; i++) names["tripo_part_" + i] = "Del " + (i + 1);
    }
    return NextResponse.json({ names });
  } catch (e) {
    return NextResponse.json({ names: {} });
  }
}
