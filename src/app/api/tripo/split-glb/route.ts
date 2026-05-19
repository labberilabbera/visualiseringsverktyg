import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

function parseGLB(buf: Buffer): { names: string[] } {
  try {
    const chunkLen = buf.readUInt32LE(12);
    const jsonStr = buf.slice(20, 20 + chunkLen).toString("utf8").replace(/\0/g, "");
    const json = JSON.parse(jsonStr);
    const names: string[] = [];
    if (json.nodes) {
      for (const node of json.nodes) {
        if (node.mesh !== undefined && node.name) names.push(node.name);
      }
    }
    if (names.length === 0 && json.meshes) {
      for (const mesh of json.meshes) {
        if (mesh.name) names.push(mesh.name);
      }
    }
    return { names };
  } catch {
    return { names: [] };
  }
}

// GET: hämta mesh-namn
export async function GET(req: NextRequest) {
  const modelUrl = new URL(req.url).searchParams.get("modelUrl");
  if (!modelUrl) return NextResponse.json({ error: "missing_modelUrl" }, { status: 400 });
  try {
    const res = await fetch(modelUrl);
    if (!res.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    const buf = Buffer.from(await res.arrayBuffer());
    const { names } = parseGLB(buf);
    return NextResponse.json({ names });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: extrahera mesh, ladda upp till S3 via STS token, importera till Tripo
export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { modelUrl, meshName } = await req.json();
    if (!modelUrl || !meshName) return NextResponse.json({ error: "missing_params" }, { status: 400 });

    // Ladda ner original GLB
    const res = await fetch(modelUrl);
    if (!res.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    const originalBuf = Buffer.from(await res.arrayBuffer());

    // Extrahera mesh
    const partGLB = extractMeshToGLB(originalBuf, meshName);
    if (!partGLB) return NextResponse.json({ error: "mesh_not_found", meshName }, { status: 404 });

    // Steg 1: Hämta STS token för GLB-uppladdning
    const stsRes = await fetch("https://api.tripo3d.ai/v2/openapi/upload/sts/token", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ format: "glb" }),
    });
    if (!stsRes.ok) return NextResponse.json({ error: "sts_failed", detail: await stsRes.text() }, { status: 502 });
    const stsData = await stsRes.json();
    const sts = stsData?.data;
    if (!sts) return NextResponse.json({ error: "no_sts_data" }, { status: 502 });

    // Steg 2: Ladda upp GLB till S3 via fetch med AWS Signature
    // Enklare: använd S3 presigned URL via direktuppladdning med STS credentials
    const s3Url = "https://" + sts.s3_host + "/" + sts.resource_bucket + "/" + sts.resource_uri;
    const uploadRes = await fetch(s3Url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-amz-security-token": sts.session_token,
        "Authorization": "AWS " + sts.sts_ak + ":" + sts.sts_sk,
      },
      body: new Uint8Array(partGLB),
    });

    // S3 PUT kan returnera 403 utan signering - anvand accelerate endpoint
    // Fallback: prova med multipart form upload via fetch
    if (!uploadRes.ok) {
      // Prova accelerate endpoint
      const accelUrl = "https://tripo-data.s3-accelerate.amazonaws.com/" + sts.resource_uri;
      const accelRes = await fetch(accelUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-amz-security-token": sts.session_token,
        },
        body: new Uint8Array(partGLB),
      });
      if (!accelRes.ok) {
        return NextResponse.json({ error: "s3_upload_failed", status: accelRes.status, url: accelUrl }, { status: 502 });
      }
    }

    // Steg 3: Importera till Tripo
    const importRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "import_model",
        file: { object: { bucket: sts.resource_bucket, key: sts.resource_uri } },
      }),
    });
    if (!importRes.ok) return NextResponse.json({ error: "import_failed", detail: await importRes.text() }, { status: 502 });
    const importData = await importRes.json();
    const taskId = importData?.data?.task_id;
    if (!taskId) return NextResponse.json({ error: "no_task_id" }, { status: 502 });
    return NextResponse.json({ taskId, meshName, status: "pending" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function extractMeshToGLB(originalBuf: Buffer, meshName: string): Buffer | null {
  try {
    const jsonChunkLen = originalBuf.readUInt32LE(12);
    const jsonStr = originalBuf.slice(20, 20 + jsonChunkLen).toString("utf8").replace(/\0/g, "");
    const gltf = JSON.parse(jsonStr);
    const nodeIdx = (gltf.nodes as any[])?.findIndex((n: any) => n.name === meshName && n.mesh !== undefined);
    if (nodeIdx === undefined || nodeIdx === -1) return null;
    const node = gltf.nodes[nodeIdx];
    const meshIdx: number = node.mesh;
    const mesh = gltf.meshes[meshIdx];
    const accIndices = new Set<number>();
    for (const prim of mesh.primitives as any[]) {
      if (typeof prim.indices === "number") accIndices.add(prim.indices);
      for (const v of Object.values(prim.attributes as Record<string, number>)) accIndices.add(v);
    }
    const binStart = 12 + 8 + jsonChunkLen + 8;
    const binData = originalBuf.slice(binStart);
    const bvIndices = new Set<number>();
    for (const aIdx of Array.from(accIndices)) {
      const acc = gltf.accessors?.[aIdx];
      if (acc?.bufferView !== undefined) bvIndices.add(acc.bufferView as number);
    }
    const bvArr = Array.from(bvIndices);
    const chunks: Buffer[] = [];
    const bvOffsets = new Map<number, number>();
    let offset = 0;
    for (const bvIdx of bvArr) {
      const bv = gltf.bufferViews[bvIdx];
      const chunk = binData.slice(bv.byteOffset as number, (bv.byteOffset as number) + (bv.byteLength as number));
      chunks.push(chunk);
      bvOffsets.set(bvIdx, offset);
      offset += chunk.byteLength;
    }
    const newBin = Buffer.concat(chunks);
    const newBVList = bvArr.map(bvIdx => { const bv = { ...gltf.bufferViews[bvIdx] }; bv.byteOffset = bvOffsets.get(bvIdx); bv.buffer = 0; return bv; });
    const accArr = Array.from(accIndices);
    const newAccMap = new Map<number, number>();
    const newAccessors = accArr.map((aIdx, i) => { const acc = { ...gltf.accessors[aIdx] }; if (acc.bufferView !== undefined) acc.bufferView = bvArr.indexOf(acc.bufferView as number); newAccMap.set(aIdx, i); return acc; });
    const newMesh = { name: mesh.name, primitives: (mesh.primitives as any[]).map((prim: any) => { const p: any = { attributes: {} }; if (typeof prim.indices === "number") p.indices = newAccMap.get(prim.indices); for (const [k, v] of Object.entries(prim.attributes as Record<string, number>)) p.attributes[k] = newAccMap.get(v); return p; }) };
    const newGLTF: any = { asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: meshName, mesh: 0 }], meshes: [newMesh], accessors: newAccessors, bufferViews: newBVList, buffers: [{ byteLength: newBin.byteLength }] };
    const jsonOut = JSON.stringify(newGLTF);
    const pad4 = (n: number) => Math.ceil(n / 4) * 4;
    const jsonPadLen = pad4(jsonOut.length);
    const binPadLen = pad4(newBin.byteLength);
    const total = 12 + 8 + jsonPadLen + 8 + binPadLen;
    const out = Buffer.alloc(total, 0);
    out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
    out.writeUInt32LE(jsonPadLen, 12); out.writeUInt32LE(0x4E4F534A, 16);
    Buffer.from(jsonOut).copy(out, 20);
    out.writeUInt32LE(binPadLen, 20 + jsonPadLen); out.writeUInt32LE(0x004E4942, 24 + jsonPadLen);
    newBin.copy(out, 28 + jsonPadLen);
    return out;
  } catch { return null; }
}
