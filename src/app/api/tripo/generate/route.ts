import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });

  try {
    const { imageData } = await req.json() as { imageData: string };
    if (!imageData) return NextResponse.json({ error: "missing_image" }, { status: 400 });

    // Strip data URL prefix if present
    const base64 = imageData.startsWith("data:") ? imageData.split(",")[1] : imageData;

    // Step 1: Upload image to Tripo
    const uploadRes = await fetch("https://api.tripo3d.ai/v2/openapi/upload", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: base64, type: "jpg" }),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: "upload_failed", detail: err }, { status: 502 });
    }

    const uploadData = await uploadRes.json();
    const imageToken = uploadData?.data?.image_token;
    if (!imageToken) return NextResponse.json({ error: "no_image_token" }, { status: 502 });

    // Step 2: Create 3D task
    const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "image_to_model",
        file: { type: "jpg", file_token: imageToken },
      }),
    });

    if (!taskRes.ok) {
      const err = await taskRes.text();
      return NextResponse.json({ error: "task_failed", detail: err }, { status: 502 });
    }

    const taskData = await taskRes.json();
    const taskId = taskData?.data?.task_id;
    if (!taskId) return NextResponse.json({ error: "no_task_id" }, { status: 502 });

    // Step 3: Poll for result (max 120s)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const pollRes = await fetch("https://api.tripo3d.ai/v2/openapi/task/" + taskId, {
        headers: { "Authorization": "Bearer " + key },
      });

      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();
      const status = pollData?.data?.status;

      if (status === "success") {
        const modelUrl = pollData?.data?.output?.model;
        return NextResponse.json({ taskId, modelUrl, status: "success" });
      }
      if (status === "failed" || status === "cancelled") {
        return NextResponse.json({ error: "task_" + status, taskId }, { status: 502 });
      }
    }

    // Return taskId so frontend can poll itself
    return NextResponse.json({ taskId, status: "pending" });
  } catch (e) {
    return NextResponse.json({ error: "server_error", detail: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "missing_taskId" }, { status: 400 });

  const res = await fetch("https://api.tripo3d.ai/v2/openapi/task/" + taskId, {
    headers: { "Authorization": "Bearer " + key },
  });

  if (!res.ok) return NextResponse.json({ error: "poll_failed" }, { status: 502 });
  const data = await res.json();
  const status = data?.data?.status;
  const modelUrl = data?.data?.output?.model;
  const progress = data?.data?.progress ?? 0;

  return NextResponse.json({ taskId, status, modelUrl, progress });
}
