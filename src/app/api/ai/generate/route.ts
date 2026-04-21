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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );

