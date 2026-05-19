import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Gemini analyserar AI-bilden och returnerar ett objekt med
// tripo_part_0..N mappade till svenska namn t.ex. {tripo_part_0:"Kaross", tripo_part_1:"Framhjul", ...}
export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { imageData, partCount } = await req.json();
    const n = Math.max(1, Math.min(partCount || 16, 32));
    const keys = Array.from({length:n}, (_,i)=>"tripo_part_"+i);
    const prompt = "This 3D model has been auto-segmented into " + n + " mesh parts named " + keys.join(", ") + ". Based on the image, assign a short descriptive Swedish name to each part (e.g. Kaross, Framhjul, Fonsterglas, Stankskarm, Motorhuv, etc). Return ONLY valid JSON like: {"tripo_part_0":"Kaross","tripo_part_1":"Framhjul",...} for all " + n + " parts. No other text.";
    const body: any = {
      contents: [{ parts: [
        { text: prompt },
        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData.includes(",") ? imageData.split(",")[1] : imageData } }] : [])
      ]}],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
    };
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + key,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!res.ok) return NextResponse.json({ names: {} });
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}").replace(/```json|```/g,"").trim();
    let names: Record<string,string> = {};
    try { names = JSON.parse(text); } catch { names = {}; }
    // Fallback: om JSON ar tomt, ge generiska svenska namn
    if(Object.keys(names).length === 0){
      keys.forEach((k,i)=>{ names[k] = "Del "+(i+1); });
    }
    return NextResponse.json({ names });
  } catch (e) {
    return NextResponse.json({ names: {} });
  }
}
