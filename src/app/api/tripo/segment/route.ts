import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const body = await req.json();
    const taskId = body.taskId || body.tripoTaskId;
    if (!taskId) return NextResponse.json({ error: "missing_taskId" }, { status: 400 });
    const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mesh_segmentation", original_model_task_id: taskId }),
    });
    if (!taskRes.ok) return NextResponse.json({ error: "segment_task_failed", detail: await taskRes.text() }, { status: 502 });
    const taskData = await taskRes.json();
    const segTaskId = taskData?.data?.task_id;
    if (!segTaskId) return NextResponse.json({ error: "no_task_id", raw: JSON.stringify(taskData) }, { status: 502 });
    return NextResponse.json({ taskId: segTaskId, status: "pending" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  const params = new URL(req.url).searchParams;
  const taskId = params.get("taskId") || params.get("segTaskId");
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
