import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });

  try {
    const { imageData } = await req.json() as { imageData: string };
    if (!imageData) return NextResponse.json({ error: "missing_image" }, { status: 400 });

    // Strip data URL prefix
    const base64 = imageData.startsWith("data:") ? imageData.split(",")[1] : imageData;
    const binary = Buffer.from(base64, "base64");

    // Upload via STS endpoint (correct Tripo endpoint)
    const formData = new FormData();
    const blob = new Blob([binary], { type: "image/jpeg" });
    formData.append("file", blob, "image.jpg");

    const uploadRes = await fetch("https://api.tripo3d.ai/v2/openapi/upload/sts", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key },
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: "upload_failed", detail: err }, { status: 502 });
    }

    const uploadData = await uploadRes.json();
    // STS returns object info, not file_token
    const fileObject = uploadData?.data;
    if (!fileObject) {
      return NextResponse.json({ error: "no_file_object", detail: JSON.stringify(uploadData) }, { status: 502 });
    }

    // Create image_to_model task using object (recommended)
    const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "image_to_model",
        file: {
          type: "jpg",
          file_token: fileObject.image_token ?? fileObject.file_token,
        },
      }),
    });

    if (!taskRes.ok) {
      const err = await taskRes.text();
      return NextResponse.json({ error: "task_failed", detail: err }, { status: 502 });
    }

    const taskData = await taskRes.json();
    const taskId = taskData?.data?.task_id;
    if (!taskId) {
      return NextResponse.json({ error: "no_task_id", detail: JSON.stringify(taskData) }, { status: 502 });
    }

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
