import { NextRequest, NextResponse } from "next/server";
import AWS from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { originalTaskId, prompt, partNames, previewImage } = await req.json();
    if (!originalTaskId) return NextResponse.json({ error: "missing_params" }, { status: 400 });

    const body: any = {
      type: "texture_model",
      original_model_task_id: originalTaskId,
      texture: true,
      pbr: true,
    };

    // Om vi har en forhandsbild: ladda upp den och texturera HELA modellen mot bilden
    // (da bevaras alla delar - ingen gra modell - och andringen syns)
    if (previewImage) {
      const b64 = previewImage.includes(",") ? previewImage.split(",")[1] : previewImage;
      const imgBuf = Buffer.from(b64, "base64");

      const stsRes = await fetch("https://api.tripo3d.ai/v2/openapi/upload/sts/token", {
        method: "POST",
        headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ format: "jpeg" }),
      });
      if (!stsRes.ok) return NextResponse.json({ error: "sts_failed", detail: await stsRes.text() }, { status: 502 });
      const sts = (await stsRes.json())?.data;
      if (!sts) return NextResponse.json({ error: "no_sts_data" }, { status: 502 });

      const s3 = new AWS.S3Client({
        region: "us-west-2",
        credentials: { accessKeyId: sts.sts_ak, secretAccessKey: sts.sts_sk, sessionToken: sts.session_token },
        useAccelerateEndpoint: true,
      });
      await s3.send(new AWS.PutObjectCommand({
        Bucket: sts.resource_bucket, Key: sts.resource_uri,
        Body: new Uint8Array(imgBuf), ContentType: "image/jpeg",
      }));

      body.texture_prompt = { image: { object: { bucket: sts.resource_bucket, key: sts.resource_uri } } };
      // INGA part_names -> hela modellen texturera mot bilden
    } else if (prompt) {
      // Textfallback: texturera valda delar (eller hela om inga angivna)
      body.texture_prompt = { text: prompt };
      if (partNames && Array.isArray(partNames) && partNames.length > 0) body.part_names = partNames;
    } else {
      return NextResponse.json({ error: "no_prompt_or_image" }, { status: 400 });
    }

    const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!taskRes.ok) return NextResponse.json({ error: "task_failed", detail: await taskRes.text() }, { status: 502 });
    const taskData = await taskRes.json();
    const taskId = taskData?.data?.task_id;
    if (!taskId) return NextResponse.json({ error: "no_task_id", raw: JSON.stringify(taskData) }, { status: 502 });
    return NextResponse.json({ taskId, status: "pending" });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
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
  return NextResponse.json({
    taskId,
    status: taskData?.status,
    progress: taskData?.progress ?? 0,
    modelUrl,
    errorCode: taskData?.error_code ?? null,
  });
}
