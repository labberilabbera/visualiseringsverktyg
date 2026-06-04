import { NextRequest, NextResponse } from "next/server";
import AWS from "@aws-sdk/client-s3";

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
      for (const mesh of json.meshes) { if (mesh.name) names.push(mesh.name); }
    }
    return { names };
  } catch { return { names: [] }; }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const modelUrl = url.searchParams.get("modelUrl");
  const isolate = url.searchParams.get("isolate");
  if (!modelUrl) return NextResponse.json({ error: "missing_modelUrl" }, { status: 400 });
  try {
    const res = await fetch(modelUrl);
    if (!res.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    const buf = Buffer.from(await res.arrayBuffer());

    // Isolerings-lage: returnera EN del som GLB-fil for forhandsvisning
    if (isolate) {
      const part = extractMeshToGLB(buf, isolate);
      if (!part) return NextResponse.json({ error: "mesh_not_found" }, { status: 404 });
      return new NextResponse(new Uint8Array(part), {
        headers: {
          "Content-Type": "model/gltf-binary",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const { names } = parseGLB(buf);
    return NextResponse.json({ names });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { modelUrl, meshName } = await req.json();
    if (!modelUrl || !meshName) return NextResponse.json({ error: "missing_params" }, { status: 400 });

    const res = await fetch(modelUrl);
    if (!res.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    const originalBuf = Buffer.from(await res.arrayBuffer());

    const partGLB = extractMeshToGLB(originalBuf, meshName);
    if (!partGLB) return NextResponse.json({ error: "mesh_not_found", meshName }, { status: 404 });

    const stsRes = await fetch("https://api.tripo3d.ai/v2/openapi/upload/sts/token", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ format: "glb" }),
    });
    if (!stsRes.ok) return NextResponse.json({ error: "sts_failed", detail: await stsRes.text() }, { status: 502 });
    const stsData = await stsRes.json();
    const sts = stsData?.data;
    if (!sts) return NextResponse.json({ error: "no_sts_data" }, { status: 502 });

    const s3 = new AWS.S3Client({
      region: "us-west-2",
      credentials: { accessKeyId: sts.sts_ak, secretAccessKey: sts.sts_sk, sessionToken: sts.session_token },
      useAccelerateEndpoint: true,
    });
    await s3.send(new AWS.PutObjectCommand({
      Bucket: sts.resource_bucket, Key: sts.resource_uri,
      Body: new Uint8Array(partGLB), ContentType: "application/octet-stream",
    }));

    const importRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "import_model", file: { object: { bucket: sts.resource_bucket, key: sts.resource_uri } } }),
    });
    if (!importRes.ok) return NextResponse.json({ error: "import_failed", detail: await importRes.text() }, { status: 502 });
    const importData = await importRes.json();
    const taskId = importData?.data?.task_id;
    if (!taskId) return NextResponse.json({ error: "no_task_id" }, { status: 502 });
    return NextResponse.json({ taskId, meshName, status: "pending" });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// Extraherar EN mesh till en ny giltig GLB. Varje bufferView 4-byte-paddad.
function extractMeshToGLB(originalBuf: Buffer, meshName: string): Buffer | null {
  try {
    const jsonChunkLen = originalBuf.readUInt32LE(12);
    const jsonStr = originalBuf.slice(20, 20 + jsonChunkLen).toString("utf8").replace(/\0/g, "");
    const gltf = JSON.parse(jsonStr);

    const nodeIdx = (gltf.nodes as any[])?.findIndex((n: any) => n.name === meshName && n.mesh !== undefined);
    if (nodeIdx === undefined || nodeIdx === -1) return null;
    const node = gltf.nodes[nodeIdx];
    const mesh = gltf.meshes[node.mesh];

    // BIN-chunk start
    const binStart = 12 + 8 + jsonChunkLen + 8;
    const binData = originalBuf.slice(binStart);

    // Samla accessors som meshen anvander
    const accIndices: number[] = [];
    for (const prim of mesh.primitives as any[]) {
      if (typeof prim.indices === "number") accIndices.push(prim.indices);
      for (const v of Object.values(prim.attributes as Record<string, number>)) accIndices.push(v as number);
    }
    const uniqueAcc = Array.from(new Set(accIndices));

    // Bygg nya accessors + bufferViews. En ny bufferView per accessor (enklast, alltid giltigt).
    const newAccessors: any[] = [];
    const newBufferViews: any[] = [];
    const accMap = new Map<number, number>();
    const binChunks: Buffer[] = [];
    let binOffset = 0;

    const pad4 = (n: number) => (4 - (n % 4)) % 4;

    for (const aIdx of uniqueAcc) {
      const acc = gltf.accessors[aIdx];
      const bv = gltf.bufferViews[acc.bufferView];
      const compSize = componentByteSize(acc.componentType);
      const numComp = numComponents(acc.type);
      const elemSize = compSize * numComp;
      const count = acc.count;
      const stride = bv.byteStride && bv.byteStride > 0 ? bv.byteStride : elemSize;

      // Kopiera ut datan tightly-packed (ta bort ev. stride)
      const srcBase = (bv.byteOffset || 0) + (acc.byteOffset || 0);
      const out = Buffer.alloc(count * elemSize);
      for (let i = 0; i < count; i++) {
        binData.copy(out, i * elemSize, srcBase + i * stride, srcBase + i * stride + elemSize);
      }

      const bvIndex = newBufferViews.length;
      newBufferViews.push({
        buffer: 0,
        byteOffset: binOffset,
        byteLength: out.byteLength,
        target: acc.type === "SCALAR" && acc.componentType >= 5121 && acc.componentType <= 5125 ? 34963 : 34962,
      });
      binChunks.push(out);
      binOffset += out.byteLength;
      // padding till 4 byte
      const p = pad4(binOffset);
      if (p) { binChunks.push(Buffer.alloc(p)); binOffset += p; }

      const newAccIndex = newAccessors.length;
      const newAcc: any = {
        bufferView: bvIndex,
        byteOffset: 0,
        componentType: acc.componentType,
        count: acc.count,
        type: acc.type,
      };
      if (acc.min) newAcc.min = acc.min;
      if (acc.max) newAcc.max = acc.max;
      if (acc.normalized) newAcc.normalized = acc.normalized;
      newAccessors.push(newAcc);
      accMap.set(aIdx, newAccIndex);
    }

    const newPrimitives = (mesh.primitives as any[]).map((prim: any) => {
      const p: any = { attributes: {} };
      for (const [k, v] of Object.entries(prim.attributes as Record<string, number>)) {
        p.attributes[k] = accMap.get(v as number);
      }
      if (typeof prim.indices === "number") p.indices = accMap.get(prim.indices);
      if (typeof prim.mode === "number") p.mode = prim.mode;
      return p;
    });

    const newBin = Buffer.concat(binChunks);
    const newGLTF: any = {
      asset: { version: "2.0", generator: "flodet-split" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ name: meshName, mesh: 0 }],
      meshes: [{ name: meshName, primitives: newPrimitives }],
      accessors: newAccessors,
      bufferViews: newBufferViews,
      buffers: [{ byteLength: newBin.byteLength }],
    };

    let jsonOut = Buffer.from(JSON.stringify(newGLTF), "utf8");
    const jsonPad = pad4(jsonOut.byteLength);
    if (jsonPad) jsonOut = Buffer.concat([jsonOut, Buffer.alloc(jsonPad, 0x20)]); // space-padding
    let binOut = newBin;
    const binPad = pad4(binOut.byteLength);
    if (binPad) binOut = Buffer.concat([binOut, Buffer.alloc(binPad)]);

    const total = 12 + 8 + jsonOut.byteLength + 8 + binOut.byteLength;
    const out = Buffer.alloc(total);
    out.writeUInt32LE(0x46546C67, 0);
    out.writeUInt32LE(2, 4);
    out.writeUInt32LE(total, 8);
    out.writeUInt32LE(jsonOut.byteLength, 12);
    out.writeUInt32LE(0x4E4F534A, 16);
    jsonOut.copy(out, 20);
    const binHeaderPos = 20 + jsonOut.byteLength;
    out.writeUInt32LE(binOut.byteLength, binHeaderPos);
    out.writeUInt32LE(0x004E4942, binHeaderPos + 4);
    binOut.copy(out, binHeaderPos + 8);
    return out;
  } catch { return null; }
}

function componentByteSize(ct: number): number {
  switch (ct) {
    case 5120: case 5121: return 1;
    case 5122: case 5123: return 2;
    case 5125: case 5126: return 4;
    default: return 4;
  }
}
function numComponents(type: string): number {
  switch (type) {
    case "SCALAR": return 1;
    case "VEC2": return 2;
    case "VEC3": return 3;
    case "VEC4": return 4;
    case "MAT2": return 4;
    case "MAT3": return 9;
    case "MAT4": return 16;
    default: return 1;
  }
      }
