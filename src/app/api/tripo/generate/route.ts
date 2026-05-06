import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { imageData, generateParts } = await req.json() as { imageData: string; generateParts?: boolean };
    if (!imageData) return NextResponse.json({ error: "missing_image" }, { status: 400 });
    const base64 = imageData.startsWith("data:") ? imageData.split(",")[1] : imageData;
    const taskBody: any = {
      type: "image_to_model",
      file: { type: "jpg", file_token: base64 },
    };
    if (generateParts) taskBody.generate_parts = true;
    const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(taskBody),
    });
    if (!taskRes.ok) {
      const detail = await taskRes.text();
      return NextResponse.json({ error: "task_failed", detail }, { status: 502 });
    }
    const taskData = await taskRes.json();
    const taskId = taskData?.data?.task_id;
    if (!taskId) return NextResponse.json({ error: "no_task_id", raw: JSON.stringify(taskData) }, { status: 502 });
    return NextResponse.json({ taskId, status: "pending" });
  } catch (e) {
    return NextResponse.json({ error: "server_error", detail: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "missing_taskId" }, { status: 400 });
  const res = await fetch("https://api.tripo3d.ai/v2/openapi/task/" + taskId, {
    headers: { "Authorization": "Bearer " + key },
  });
  if (!res.ok) return NextResponse.json({ error: "poll_failed" }, { status: 502 });
  const data = await res.json();
  const taskData = data?.data;
  const output = taskData?.output ?? null;
  const modelUrl = output?.model ?? output?.pbr_model ?? null;
  return NextResponse.json({ taskId, status: taskData?.status, progress: taskData?.progress ?? 0, modelUrl });
}
