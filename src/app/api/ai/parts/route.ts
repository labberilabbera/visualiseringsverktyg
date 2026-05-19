import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { imageData, partCount } = await req.json();
    const n = Math.max(1, Math.min(partCount || 16, 32));

    // Enkel prompt: lista N svenska namn for delarna i bilden
    const prompt = "Look at this object in the image. It has been 3D-scanned and split into " + n + " separate mesh parts. List exactly " + n + " short Swedish names for the parts of this object (like Kaross, Framhjul, Bakhjul, Fonsterglas, Motorhuv, Stankskarm, etc). Return ONLY a JSON array with exactly " + n + " strings. Example: ["Kaross","Framhjul","Bakhjul","Fonsterglas","Motorhuv","Stankskarm"]";

    const parts: any[] = [{ text: prompt }];
    if (imageData) {
      const b64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;
      parts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
    }

    const body = {
      contents: [{ parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
    };

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + key,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const fallback: Record<string,string> = {};
      for(let i=0;i<n;i++) fallback["tripo_part_"+i] = "Del "+(i+1);
      return NextResponse.json({ names: fallback });
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Extrahera JSON array ur svaret
    const match = raw.match(/\[.*?\]/s);
    let arr: string[] = [];
    if (match) {
      try { arr = JSON.parse(match[0]); } catch {}
    }

    // Bygg names-objekt
    const names: Record<string,string> = {};
    for (let i=0; i<n; i++) {
      names["tripo_part_"+i] = (arr[i] && typeof arr[i]==="string") ? arr[i] : "Del "+(i+1);
    }
    return NextResponse.json({ names });
  } catch (e) {
    return NextResponse.json({ names: {} });
  }
}
