import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

// Parsar GLB och returnerar mesh-namn
function parseGLB(buf: Buffer): { names: string[]; json: any } {
  const chunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.slice(20, 20 + chunkLen).toString("utf8").replace(/\0/g, "");
  const json = JSON.parse(jsonStr);
  const names: string[] = [];
  if (json.nodes) {
    for (const node of json.nodes) {
      if (node.mesh !== undefined && node.name) names.push(node.name);
    }
  }
  return { names, json };
}

// Skapar en minimal GLB med bara ett specifikt mesh
function extractMeshToGLB(originalBuf: Buffer, meshName: string): Buffer | null {
  try {
    const headerLen = 12;
    const chunkHeaderLen = 8;
    const jsonChunkLen = originalBuf.readUInt32LE(12);
    const jsonStr = originalBuf.slice(20, 20 + jsonChunkLen).toString("utf8").replace(/\0/g, "");
    const gltf = JSON.parse(jsonStr);

    // Hitta node med detta namn
    const nodeIdx = gltf.nodes?.findIndex((n: any) => n.name === meshName && n.mesh !== undefined);
    if (nodeIdx === -1 || nodeIdx === undefined) return null;
    const node = gltf.nodes[nodeIdx];
    const meshIdx = node.mesh;
    const mesh = gltf.meshes[meshIdx];

    // Samla alla accessors/bufferViews som används av detta mesh
    const usedAccessors = new Set<number>();
    for (const prim of mesh.primitives) {
      if (prim.indices !== undefined) usedAccessors.add(prim.indices);
      for (const v of Object.values(prim.attributes || {})) usedAccessors.add(v as number);
      if (prim.material !== undefined && gltf.materials?.[prim.material]) {
        const mat = gltf.materials[prim.material];
        if (mat.pbrMetallicRoughness?.baseColorTexture) {
          const texIdx = mat.pbrMetallicRoughness.baseColorTexture.index;
          const tex = gltf.textures?.[texIdx];
          if (tex?.source !== undefined) usedAccessors.add(-1000 - tex.source); // negativ = image
        }
      }
    }

    // Bygg ett nytt minimalt GLTF med bara detta mesh
    const binChunkStart = headerLen + chunkHeaderLen + jsonChunkLen + chunkHeaderLen;
    const binData = originalBuf.slice(binChunkStart);

    const usedBVIdx = new Set<number>();
    for (const aIdx of usedAccessors) {
      if (aIdx < 0) continue;
      const acc = gltf.accessors?.[aIdx];
      if (acc?.bufferView !== undefined) usedBVIdx.add(acc.bufferView);
    }

    // Bygg ny bufferView-lista och ny bindata
    const newBVMap = new Map<number, number>();
    const chunks: Buffer[] = [];
    let offset = 0;
    for (const bvIdx of usedBVIdx) {
      const bv = gltf.bufferViews[bvIdx];
      const chunk = binData.slice(bv.byteOffset, bv.byteOffset + bv.byteLength);
      chunks.push(chunk);
      newBVMap.set(bvIdx, offset);
      offset += chunk.byteLength;
    }
    const newBin = Buffer.concat(chunks);

    // Ny accessor-lista
    const newAccMap = new Map<number, number>();
    const newAccessors: any[] = [];
    for (const aIdx of usedAccessors) {
      if (aIdx < 0) continue;
      const acc = { ...gltf.accessors[aIdx] };
      if (acc.bufferView !== undefined) acc.bufferView = Array.from(newBVMap.keys()).indexOf(acc.bufferView);
      newAccMap.set(aIdx, newAccessors.length);
      newAccessors.push(acc);
    }

    const newBVList = Array.from(usedBVIdx).map(bvIdx => {
      const bv = { ...gltf.bufferViews[bvIdx] };
      bv.byteOffset = newBVMap.get(bvIdx)!;
      bv.buffer = 0;
      return bv;
    });

    // Bygg ny mesh med uppdaterade accessor-index
    const newMesh = {
      name: mesh.name,
      primitives: mesh.primitives.map((prim: any) => {
        const p: any = { attributes: {} };
        if (prim.indices !== undefined) p.indices = newAccMap.get(prim.indices);
        for (const [k, v] of Object.entries(prim.attributes || {})) {
          p.attributes[k] = newAccMap.get(v as number);
        }
        if (prim.material !== undefined) p.material = 0;
        return p;
      })
    };

    // Kopiera material om det finns
    const materials: any[] = [];
    const textures: any[] = [];
    const images: any[] = [];
    if (mesh.primitives[0]?.material !== undefined && gltf.materials) {
      const mat = gltf.materials[mesh.primitives[0].material];
      if (mat) materials.push(mat);
    }

    const newGLTF: any = {
      asset: { version: "2.0", generator: "visualiseringsverktyg" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ name: meshName, mesh: 0 }],
      meshes: [newMesh],
      accessors: newAccessors,
      bufferViews: newBVList,
      buffers: [{ byteLength: newBin.byteLength }],
    };
    if (materials.length) newGLTF.materials = materials;

    const jsonBuf = Buffer.from(JSON.stringify(newGLTF).padEnd(Math.ceil(JSON.stringify(newGLTF).length / 4) * 4, " "));
    const binPadded = newBin.byteLength % 4 === 0 ? newBin : Buffer.concat([newBin, Buffer.alloc(4 - (newBin.byteLength % 4))]);

    const totalLen = 12 + 8 + jsonBuf.length + 8 + binPadded.length;
    const out = Buffer.alloc(totalLen);
    out.writeUInt32LE(0x46546C67, 0); // magic glTF
    out.writeUInt32LE(2, 4); // version
    out.writeUInt32LE(totalLen, 8);
    out.writeUInt32LE(jsonBuf.length, 12);
    out.writeUInt32LE(0x4E4F534A, 16); // JSON
    jsonBuf.copy(out, 20);
    out.writeUInt32LE(binPadded.length, 20 + jsonBuf.length);
    out.writeUInt32LE(0x004E4942, 24 + jsonBuf.length); // BIN
    binPadded.copy(out, 28 + jsonBuf.length);
    return out;
  } catch(e) {
    return null;
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
  } catch(e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: extrahera en specifik del och importera till Tripo
export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  try {
    const { modelUrl, meshName } = await req.json();
    if (!modelUrl || !meshName) return NextResponse.json({ error: "missing_params" }, { status: 400 });

    // Ladda ner original GLB
    const res = await fetch(modelUrl);
    if (!res.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    const buf = Buffer.from(await res.arrayBuffer());

    // Extrahera mesh till ny GLB
    const partGLB = extractMeshToGLB(buf, meshName);
    if (!partGLB) return NextResponse.json({ error: "mesh_not_found", meshName }, { status: 404 });

    // Ladda upp till Tripo via STS
    const fd = new FormData();
    fd.append("file", new Blob([partGLB], { type: "model/gltf-binary" }), meshName + ".glb");
    const uploadRes = await fetch("https://api.tripo3d.ai/v2/openapi/upload/sts", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key },
      body: fd,
    });
    if (!uploadRes.ok) return NextResponse.json({ error: "upload_failed", detail: await uploadRes.text() }, { status: 502 });
    const uploadData = await uploadRes.json();
    const fileObj = uploadData?.data;
    if (!fileObj) return NextResponse.json({ error: "no_file_obj" }, { status: 502 });

    // Importera till Tripo
    const importRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "import_model",
        file: { object: { bucket: fileObj.bucket, key: fileObj.key } },
      }),
    });
    if (!importRes.ok) return NextResponse.json({ error: "import_failed", detail: await importRes.text() }, { status: 502 });
    const importData = await importRes.json();
    const taskId = importData?.data?.task_id;
    if (!taskId) return NextResponse.json({ error: "no_task_id", raw: JSON.stringify(importData) }, { status: 502 });
    return NextResponse.json({ taskId, meshName, status: "pending" });
  } catch(e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
