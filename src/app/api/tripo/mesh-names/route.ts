import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

// Enkel GLB-parser som bara läser node-namnen utan att ladda hela Three.js
function parseMeshNamesFromGLB(buffer: Buffer): string[] {
  try {
    // GLB header: magic(4) + version(4) + length(4) = 12 bytes
    // Chunk 0: chunkLength(4) + chunkType(4) + chunkData = JSON chunk
    const chunkLength = buffer.readUInt32LE(12);
    const jsonStr = buffer.slice(20, 20 + chunkLength).toString("utf8");
    const json = JSON.parse(jsonStr);
    const names: string[] = [];
    if (json.nodes) {
      for (const node of json.nodes) {
        if (node.mesh !== undefined && node.name) {
          names.push(node.name);
        }
      }
    }
    if (json.meshes && names.length === 0) {
      for (const mesh of json.meshes) {
        if (mesh.name) names.push(mesh.name);
      }
    }
    return names.filter(Boolean);
  } catch (e) {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { modelUrl } = await req.json();
    if (!modelUrl) return NextResponse.json({ error: "missing_modelUrl" }, { status: 400 });
    const res = await fetch(modelUrl);
    if (!res.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const names = parseMeshNamesFromGLB(buffer);
    return NextResponse.json({ names });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
