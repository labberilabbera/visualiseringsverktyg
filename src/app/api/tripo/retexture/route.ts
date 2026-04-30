import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { originalTaskId, prompt } = await req.json();
    if (!originalTaskId || !prompt) return NextResponse.json({ error: "missing_params" }, { status: 400 });
    const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "texture_model", original_model_task_id: originalTaskId, prompt }),
    });
    if (!taskRes.ok) return NextResponse.json({ error: "task_failed", detail: await taskRes.text() }, { status: 502 });
    const taskData = await taskRes.json();
    const taskId = taskData?.data?.task_id;
    if (!taskId) return NextResponse.json({ error: "no_task_id", raw: JSON.stringify(taskData) }, { status: 502 });
    return NextResponse.json({ taskId, status: "pending" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
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
