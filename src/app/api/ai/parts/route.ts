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

    const parts: any[] = [{ text: prompt }];
    if (b64) parts.push({ inlineData: { mimeType: "image/jpeg", data: b64 } });

    const body = {
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
    };

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=" + key,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    const names: Record<string, string> = {};
    if (res.ok) {
      const data = await res.json();
      const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      // Prova direkt JSON.parse forst, sen med regex
      let arr: string[] = [];
      try {
        arr = JSON.parse(rawText);
      } catch {
        const idx1 = rawText.indexOf("[");
        const idx2 = rawText.lastIndexOf("]");
        if (idx1 !== -1 && idx2 !== -1 && idx2 > idx1) {
          try { arr = JSON.parse(rawText.substring(idx1, idx2 + 1)); } catch {}
        }
      }
      if (Array.isArray(arr)) {
        for (let i = 0; i < n; i++) {
          if (arr[i] && typeof arr[i] === "string" && arr[i].trim()) {
            names["tripo_part_" + i] = arr[i].trim();
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      if (!names["tripo_part_" + i]) names["tripo_part_" + i] = "Del " + (i + 1);
    }
    return NextResponse.json({ names });
  } catch (e) {
    return NextResponse.json({ names: {}, error: String(e) });
  }
}
