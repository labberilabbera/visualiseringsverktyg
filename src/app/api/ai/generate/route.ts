import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });

  try {
    const { prompt, images } = await req.json() as {
      prompt: string;
      images: { data: string; mimeType: string }[];
    };

    if (!prompt || !images?.length) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Resize images to max 1024px to speed up generation
    const resizedImages = await Promise.all(
      images.map(async (img) => {
        try {
          const buf = Buffer.from(img.data, "base64");
          const resized = await sharp(buf)
            .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
          return { data: resized.toString("base64"), mimeType: "image/jpeg" };
        } catch {
          return img;
        }
      })
    );

    const parts = [
      { text: prompt },
      ...resizedImages.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
    ];

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=" + key;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

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
        resultImages.push("data:" + part.inlineData.mimeType + ";base64," + part.inlineData.data);
      }
      if (part.text) resultText += part.text;
    }

    return NextResponse.json({ images: resultImages, text: resultText });
  } catch (e) {
    return NextResponse.json({ error: "server_error", detail: String(e) }, { status: 500 });
  }
}
