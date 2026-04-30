import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { imageData } = await req.json();
    if (!imageData) return NextResponse.json({ error: "missing_image" }, { status: 400 });
    const base64 = imageData.startsWith("data:") ? imageData.split(",")[1] : imageData;
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const promptText = "Look at this object in the image. List the main visual parts of this specific object that could be separately styled. Return ONLY a JSON array of short Swedish part names (max 6 parts, 1-3 words each). Example for a car: [\"Kaross\",\"Hjul\",\"Fönster\",\"Grill\"]. Example for a chair: [\"Sits\",\"Ryggstöd\",\"Ben\"]. Return only the JSON array, nothing else.";
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: "image/jpeg" } },
      { text: promptText }
    ]);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const parts = JSON.parse(clean);
    if (!Array.isArray(parts)) throw new Error("not array");
    return NextResponse.json({ parts: parts.slice(0, 6) });
  } catch (e) {
    return NextResponse.json({ parts: ["Del 1", "Del 2", "Del 3"] });
  }
}
