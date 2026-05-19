import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { imageData, partCount } = await req.json();
    const n = Math.max(1, Math.min(partCount || 16, 32));
    const b64 = imageData ? (imageData.includes(",") ? imageData.split(",")[1] : imageData) : null;
    const prompt = "Titta pa objektet i bilden. Det har delats upp i " + n + " delar. Lista exakt " + n + " korta svenska namn pa delarna (t.ex. Kaross, Framhjul, Bakhjul, Fonsterglas, Motorhuv). Svara ENDAST med en JSON-array med exakt " + n + " strangar.";

    const parts: any[] = [];
    if (b64) parts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
    parts.push({ text: prompt });

    const body = {
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
    };

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + key,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    const names: Record<string, string> = {};
    let rawText = "";
    if (res.ok) {
      const data = await res.json();
      rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      const clean = rawText.replace(/```json/g,"").replace(/```/g,"").trim();
      const match = clean.match(/[[sS]*]/);
      if (match) {
        try {
          const arr: string[] = JSON.parse(match[0]);
          for (let i = 0; i < n; i++) {
            if (arr[i] && typeof arr[i] === "string" && arr[i].trim()) {
              names["tripo_part_" + i] = arr[i].trim();
            }
          }
        } catch (e) {}
      }
    }
    for (let i = 0; i < n; i++) {
      if (!names["tripo_part_" + i]) names["tripo_part_" + i] = "Del " + (i + 1);
    }
    return NextResponse.json({ names, rawText });
  } catch (e) {
    return NextResponse.json({ names: {}, error: String(e) });
  }
}
