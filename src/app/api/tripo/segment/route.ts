import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST: starta mesh_segmentation baserat pa ett befintligt tripo_task_id
export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { tripoTaskId } = await req.json() as { tripoTaskId: string };
    if (!tripoTaskId) return NextResponse.json({ error: "missing_tripoTaskId" }, { status: 400 });
    const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "mesh_segmentation",
        original_model_task_id: tripoTaskId,
      }),
    });
    if (!taskRes.ok) return NextResponse.json({ error: "segment_task_failed", detail: await taskRes.text() }, { status: 502 });
    const taskData = await taskRes.json();
    const segTaskId = taskData?.data?.task_id;
    if (!segTaskId) return NextResponse.json({ error: "no_task_id" }, { status: 502 });
    return NextResponse.json({ segTaskId, status: "pending" });
  } catch (e) {
    return NextResponse.json({ error: "server_error", detail: String(e) }, { status: 500 });
  }
}

// GET: polla segmenteringstask och returnera modell-url + part-namn nar klart
export async function GET(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  const segTaskId = new URL(req.url).searchParams.get("segTaskId");
  if (!segTaskId) return NextResponse.json({ error: "missing_segTaskId" }, { status: 400 });
  const res = await fetch("https://api.tripo3d.ai/v2/openapi/task/" + segTaskId, {
    headers: { "Authorization": "Bearer " + key },
  });
  if (!res.ok) return NextResponse.json({ error: "poll_failed" }, { status: 502 });
  const data = await res.json();
  const taskData = data?.data;
  const status = taskData?.status;
  const progress = taskData?.progress ?? 0;
  const output = taskData?.output ?? null;
  const modelUrl = output?.model ?? output?.pbr_model ?? null;
  return NextResponse.json({ segTaskId, status, progress, modelUrl });
}
