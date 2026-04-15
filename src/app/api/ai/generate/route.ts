import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });

  try {
    const body = await req.json();
    const { prompt, images } = body as {
      prompt: string;
      images: { data: string; mimeType: string }[];
    };

    if (!prompt || !images?.length) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const parts: object[] = [
      { text: prompt },
      ...images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      })),
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return NextResponse.json({ error: "gemini_error", detail: err }, { status: 502 });
    }

    const data = await geminiRes.json();
    const resultParts = data?.candidates?.[0]?.content?.parts ?? [];

    const resultImages: string[] = [];
    let resultText = "";

    for (const part of resultParts) {
      if (part.inlineData?.data) {
        resultImages.push(
          `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        );
      }
      if (part.text) resultText += part.text;
    }

    return NextResponse.json({ images: resultImages, text: resultText });
  } catch (e) {
    return NextResponse.json({ error: "server_error", detail: String(e) }, { status: 500 });
  }
}
