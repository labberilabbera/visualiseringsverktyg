import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { imageData, partCount } = await req.json();
    const n = Math.max(1, Math.min(partCount || 16, 32));
    const keys = Array.from({length:n}, (_:any,i:number)=>"tripo_part_"+i);
    const example = '{"tripo_part_0":"Kaross","tripo_part_1":"Framhjul"}';
    const prompt = "This 3D model has " + n + " mesh parts named " + keys.join(", ") + ". Based on the image, assign a short Swedish name to each part. Return ONLY valid JSON like: " + example + " for all " + n + " parts. No other text.";
    const body: any = {
      contents: [{ parts: [
        { text: prompt },
        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData.includes(",") ? imageData.split(",")[1] : imageData } }] : [])
      ]}],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
    };
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + key,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!res.ok) return NextResponse.json({ names: {} });
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}").replace(/[\u0060]{3}(json)?/g,"").trim();
    let names: Record<string,string> = {};
    try { names = JSON.parse(text); } catch { names = {}; }
    if(Object.keys(names).length === 0){
      keys.forEach((k:string,i:number)=>{ names[k] = "Del "+(i+1); });
    }
    return NextResponse.json({ names });
  } catch (e) {
    return NextResponse.json({ names: {} });
  }
}
