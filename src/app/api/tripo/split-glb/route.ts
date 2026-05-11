import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

function parseGLB(buf: Buffer): { names: string[] } {
  try {
    const magic = buf.readUInt32LE(0);

    if (magic !== 0x46546c67) {
      return { names: [] };
    }

    const chunkLen = buf.readUInt32LE(12);

    const jsonStr = buf
      .slice(20, 20 + chunkLen)
      .toString("utf8")
      .replace(/\0/g, "");

    const json = JSON.parse(jsonStr);

    const names: string[] = [];

    if (json.nodes) {
      for (const node of json.nodes) {
        if (node.mesh !== undefined && node.name) {
          names.push(node.name);
        }
      }
    }

    if (names.length === 0 && json.meshes) {
      for (const mesh of json.meshes) {
        if (mesh.name) {
          names.push(mesh.name);
        }
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

  if (!modelUrl) {
    return NextResponse.json(
      { error: "missing_modelUrl" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(modelUrl);

    if (!res.ok) {
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 502 }
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());

    const { names } = parseGLB(buf);

    return NextResponse.json({ names });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}

// POST: extrahera mesh + textures + importera till Tripo
export async function POST(req: NextRequest) {
  const key = process.env.TRIPO_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "no_key" },
      { status: 500 }
    );
  }

  try {
    const { modelUrl, meshName } = await req.json();

    if (!modelUrl || !meshName) {
      return NextResponse.json(
        { error: "missing_params" },
        { status: 400 }
      );
    }

    const res = await fetch(modelUrl);

    if (!res.ok) {
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 502 }
      );
    }

    const originalBuf = Buffer.from(await res.arrayBuffer());

    const headerLen = 12;
    const chunkHeaderLen = 8;

    const jsonChunkLen = originalBuf.readUInt32LE(12);

    const jsonStr = originalBuf
      .slice(20, 20 + jsonChunkLen)
      .toString("utf8")
      .replace(/\0/g, "");

    const gltf = JSON.parse(jsonStr);

    const nodeIdx = (gltf.nodes as any[])?.findIndex(
      (n: any) =>
        n.name === meshName &&
        n.mesh !== undefined
    );

    if (nodeIdx === undefined || nodeIdx === -1) {
      return NextResponse.json(
        {
          error: "mesh_not_found",
          meshName,
        },
        { status: 404 }
      );
    }

    const node = gltf.nodes[nodeIdx];

    const meshIdx: number = node.mesh;

    const mesh = gltf.meshes[meshIdx];

    // ACCESSORS
    const accIndices = new Set<number>();

    for (const prim of mesh.primitives as any[]) {
      if (typeof prim.indices === "number") {
        accIndices.add(prim.indices);
      }

      for (const v of Object.values(
        prim.attributes as Record<string, number>
      )) {
        accIndices.add(v);
      }
    }

    // MATERIALS
    const materialIndices = new Set<number>();

    for (const prim of mesh.primitives as any[]) {
      if (typeof prim.material === "number") {
        materialIndices.add(prim.material);
      }
    }

    // TEXTURES
    const textureIndices = new Set<number>();
    const imageIndices = new Set<number>();
    const samplerIndices = new Set<number>();

    for (const matIdx of Array.from(materialIndices)) {
      const mat = gltf.materials?.[matIdx];

      if (!mat) continue;

      const texSlots = [
        mat.pbrMetallicRoughness?.baseColorTexture,
        mat.pbrMetallicRoughness?.metallicRoughnessTexture,
        mat.normalTexture,
        mat.occlusionTexture,
        mat.emissiveTexture,
      ];

      for (const slot of texSlots) {
        if (slot?.index !== undefined) {
          textureIndices.add(slot.index);
        }
      }
    }

    // IMAGES + SAMPLERS
    for (const texIdx of Array.from(textureIndices)) {
      const tex = gltf.textures?.[texIdx];

      if (!tex) continue;

      if (tex.source !== undefined) {
        imageIndices.add(tex.source);
      }

      if (tex.sampler !== undefined) {
        samplerIndices.add(tex.sampler);
      }
    }

    // BUFFER VIEWS
    const binStart =
      headerLen +
      chunkHeaderLen +
      jsonChunkLen +
      chunkHeaderLen;

    const binData = originalBuf.slice(binStart);

    const bvIndices = new Set<number>();

    for (const aIdx of Array.from(accIndices)) {
      const acc = gltf.accessors?.[aIdx];

      if (acc?.bufferView !== undefined) {
        bvIndices.add(acc.bufferView as number);
      }
    }

    const bvArr = Array.from(bvIndices);

    const chunks: Buffer[] = [];

    const bvOffsets = new Map<number, number>();

    let offset = 0;

    for (const bvIdx of bvArr) {
      const bv = gltf.bufferViews[bvIdx];

      const start = bv.byteOffset || 0;

      const end = start + bv.byteLength;

      const chunk = binData.slice(start, end);

      chunks.push(chunk);

      bvOffsets.set(bvIdx, offset);

      offset += chunk.byteLength;
    }

    const newBin = Buffer.concat(chunks);

    const newBVList = bvArr.map((bvIdx) => {
      const bv = { ...gltf.bufferViews[bvIdx] };

      bv.byteOffset = bvOffsets.get(bvIdx);

      bv.buffer = 0;

      return bv;
    });

    // ACCESSOR REMAP
    const accArr = Array.from(accIndices);

    const newAccMap = new Map<number, number>();

    const newAccessors = accArr.map((aIdx, i) => {
      const acc = { ...gltf.accessors[aIdx] };

      if (acc.bufferView !== undefined) {
        acc.bufferView = bvArr.indexOf(
          acc.bufferView as number
        );
      }

      newAccMap.set(aIdx, i);

      return acc;
    });

    // TEXTURE REMAP
    const texArr = Array.from(textureIndices);

    const texMap = new Map<number, number>();

    const newTextures = texArr.map((tIdx, i) => {
      texMap.set(tIdx, i);

      const tex = { ...gltf.textures[tIdx] };

      if (tex.source !== undefined) {
        tex.source = Array.from(imageIndices).indexOf(
          tex.source
        );
      }

      if (tex.sampler !== undefined) {
        tex.sampler = Array.from(samplerIndices).indexOf(
          tex.sampler
        );
      }

      return tex;
    });

    // MATERIAL REMAP
    const matArr = Array.from(materialIndices);

    const matMap = new Map<number, number>();

    const newMaterials = matArr.map((mIdx, i) => {
      matMap.set(mIdx, i);

      const mat = structuredClone(
        gltf.materials[mIdx]
      );

      const remapTex = (slot: any) => {
        if (slot?.index !== undefined) {
          slot.index = texMap.get(slot.index);
        }
      };

      remapTex(
        mat.pbrMetallicRoughness?.baseColorTexture
      );

      remapTex(
        mat.pbrMetallicRoughness
          ?.metallicRoughnessTexture
      );

      remapTex(mat.normalTexture);

      remapTex(mat.occlusionTexture);

      remapTex(mat.emissiveTexture);

      return mat;
    });

    const newImages = Array.from(imageIndices).map(
      (i) => gltf.images[i]
    );

    const newSamplers = Array.from(
      samplerIndices
    ).map((i) => gltf.samplers[i]);

    // NEW MESH
    const newMesh = {
      name: mesh.name,

      primitives: (mesh.primitives as any[]).map(
        (prim: any) => {
          const p: any = {
            attributes: {},
            mode: prim.mode,
          };

          if (typeof prim.material === "number") {
            p.material = matMap.get(
              prim.material
            );
          }

          if (typeof prim.indices === "number") {
            p.indices = newAccMap.get(
              prim.indices
            );
          }

          for (const [k, v] of Object.entries(
            prim.attributes as Record<
              string,
              number
            >
          )) {
            p.attributes[k] = newAccMap.get(v);
          }

          return p;
        }
      ),
    };

    // FINAL GLTF
    const newGLTF: any = {
      asset: { version: "2.0" },

      scene: 0,

      scenes: [{ nodes: [0] }],

      nodes: [
        {
          ...node,
          mesh: 0,
        },
      ],

      meshes: [newMesh],

      accessors: newAccessors,

      bufferViews: newBVList,

      buffers: [
        {
          byteLength: newBin.byteLength,
        },
      ],

      materials: newMaterials,

      textures: newTextures,

      images: newImages,

      samplers: newSamplers,
    };

    // BUILD GLB
    const jsonOut = JSON.stringify(newGLTF);

    const pad4 = (n: number) =>
      Math.ceil(n / 4) * 4;

    const jsonPadLen = pad4(jsonOut.length);

    const binPadLen = pad4(newBin.byteLength);

    const total =
      12 +
      8 +
      jsonPadLen +
      8 +
      binPadLen;

    const out = Buffer.alloc(total, 0);

    out.writeUInt32LE(0x46546c67, 0);

    out.writeUInt32LE(2, 4);

    out.writeUInt32LE(total, 8);

    out.writeUInt32LE(jsonPadLen, 12);

    out.writeUInt32LE(0x4e4f534a, 16);

    Buffer.from(jsonOut).copy(out, 20);

    out.writeUInt32LE(
      binPadLen,
      20 + jsonPadLen
    );

    out.writeUInt32LE(
      0x004e4942,
      24 + jsonPadLen
    );

    newBin.copy(out, 28 + jsonPadLen);

    // UPLOAD TO TRIPO
    const fd = new FormData();

    fd.append(
      "file",
      new Blob([out], {
        type: "model/gltf-binary",
      }),
      meshName + ".glb"
    );

    const uploadRes = await fetch(
      "https://api.tripo3d.ai/v2/openapi/upload/sts",
      {
        method: "POST",

        headers: {
          Authorization: "Bearer " + key,
        },

        body: fd,
      }
    );

    if (!uploadRes.ok) {
      return NextResponse.json(
        {
          error: "upload_failed",
          detail: await uploadRes.text(),
        },
        { status: 502 }
      );
    }

    const uploadData = await uploadRes.json();

    const fileObj = uploadData?.data;

    if (!fileObj) {
      return NextResponse.json(
        { error: "no_file_obj" },
        { status: 502 }
      );
    }

    // IMPORT TASK
    const importRes = await fetch(
      "https://api.tripo3d.ai/v2/openapi/task",
      {
        method: "POST",

        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          type: "import_model",

          file: {
            object: {
              bucket: fileObj.bucket,
              key: fileObj.key,
            },
          },
        }),
      }
    );

    if (!importRes.ok) {
      return NextResponse.json(
        {
          error: "import_failed",
          detail: await importRes.text(),
        },
        { status: 502 }
      );
    }

    const importData = await importRes.json();

    const taskId = importData?.data?.task_id;

    if (!taskId) {
      return NextResponse.json(
        { error: "no_task_id" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      taskId,
      meshName,
      status: "pending",
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
