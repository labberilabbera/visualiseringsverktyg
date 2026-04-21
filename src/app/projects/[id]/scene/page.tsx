"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

type Upload = { id: number; filename: string; aiImage?: string; model3d?: string; tripoState?: string; taskId?: string };
type SceneItem = { uploadId: number; aiImage: string; x: number; y: number };

export default function ScenePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const [tab, setTab] = useState<"ai"|"skiss"|"3d">("ai");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [sceneItems, setSceneItems] = useState<SceneItem[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [vrCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.error) { router.replace("/login"); return; }
      setUserEmail(d.email);
      setReady(true);
    });
    loadUploads();
  }, [projectId, router]);

  async function loadUploads() {
    const res = await fetch("/api/projects/" + projectId + "/uploads");
    if (!res.ok) return;
    const data = await res.json();
    // Load AI images from localStorage
    const enriched = data.map((u: Upload) => ({
      ...u,
      aiImage: localStorage.getItem("ai_" + projectId + "_" + u.id) || undefined,
      model3d: localStorage.getItem("model3d_" + projectId + "_" + u.id) || undefined,
    }));
    setUploads(enriched);
  }

  async function runTripo(u: Upload) {
    if (!u.aiImage) return;
    setUploads(prev => prev.map(x => x.id === u.id ? { ...x, tripoState: "loading" } : x));
    const res = await fetch("/api/tripo/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData: u.aiImage }),
    });
    const json = await res.json();
    if (json.status === "success" && json.modelUrl) {
      localStorage.setItem("model3d_" + projectId + "_" + u.id, json.modelUrl);
      setUploads(prev => prev.map(x => x.id === u.id ? { ...x, tripoState: "done", model3d: json.modelUrl } : x));
    } else if (json.taskId && json.status === "pending") {
      setUploads(prev => prev.map(x => x.id === u.id ? { ...x, tripoState: "pending", taskId: json.taskId } : x));
      pollTripo(u.id, json.taskId);
    } else {
      setUploads(prev => prev.map(x => x.id === u.id ? { ...x, tripoState: "error" } : x));
    }
  }

  async function pollTripo(uploadId: number, taskId: string) {
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const res = await fetch("/api/tripo/generate?taskId=" + taskId);
      const json = await res.json();
      if (json.status === "success" && json.modelUrl) {
        localStorage.setItem("model3d_" + projectId + "_" + uploadId, json.modelUrl);
        setUploads(prev => prev.map(x => x.id === uploadId ? { ...x, tripoState: "done", model3d: json.modelUrl } : x));
        return;
      }
      if (json.status === "failed") {
        setUploads(prev => prev.map(x => x.id === uploadId ? { ...x, tripoState: "error" } : x));
        return;
      }
      setUploads(prev => prev.map(x => x.id === uploadId ? { ...x, tripoState: "pending_" + (json.progress || 0) } : x));
    }
  }

  function handleDragStart(e: React.DragEvent, u: Upload) {
    e.dataTransfer.setData("uploadId", String(u.id));
    e.dataTransfer.setData("aiImage", u.aiImage || "");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const uploadId = parseInt(e.dataTransfer.getData("uploadId"));
    const aiImage = e.dataTransfer.getData("aiImage");
    if (!aiImage) return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSceneItems(prev => [...prev.filter(s => s.uploadId !== uploadId), { uploadId, aiImage, x, y }]);
  }

  function removeFromScene(uploadId: number) {
    setSceneItems(prev => prev.filter(s => s.uploadId !== uploadId));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const initials = userEmail ? userEmail.split("@")[0].slice(0, 2).toUpperCase() : "??";

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: "24px", height: "24px", border: "2px solid #1a56db", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const visibleUploads = uploads.filter(u => tab === "ai" ? u.aiImage : tab === "3d" ? u.model3d : true);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif", color: "var(--text)", display: "flex" }}>

      {/* Vänster panel */}
      <aside style={{ width: "180px", minWidth: "180px", borderRight: "1px solid var(--border)", background: "var(--bg2)", display: "flex", flexDirection: "column" }}>

        {/* Flikar */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {(["ai","skiss","3d"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "7px 0", background: tab === t ? "#1a56db" : "transparent",
              border: "none", color: tab === t ? "white" : "var(--text2)",
              fontSize: "10px", fontWeight: 500, cursor: "pointer", fontFamily: "system-ui",
              textTransform: "uppercase", letterSpacing: "0.04em"
            }}>
              {t === "ai" ? "AI bild" : t === "skiss" ? "Skiss" : "3D"}
            </button>
          ))}
        </div>

        {/* Thumbnails */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {uploads.map(u => (
            <div key={u.id} style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg)" }}>
              {/* Thumbnail bild */}
              <div
                draggable={!!u.aiImage}
                onDragStart={e => handleDragStart(e, u)}
                style={{ height: "80px", background: "#111", overflow: "hidden", cursor: u.aiImage ? "grab" : "default", position: "relative" }}
              >
                {u.aiImage ? (
                  <img src={u.aiImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ fontSize: "9px", color: "#555", textAlign: "center", padding: "4px" }}>Generera AI-bild först</p>
                  </div>
                )}
              </div>

              {/* Knappar */}
              <div style={{ padding: "5px 6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {u.aiImage && (
                  <button
                    draggable
                    onDragStart={e => handleDragStart(e, u)}
                    style={{ flex: 1, padding: "3px 0", background: "#22c55e22", border: "none", borderRadius: "4px", fontSize: "9px", color: "#22c55e", cursor: "grab" }}
                  >
                    dra in
                  </button>
                )}
                {u.aiImage && !u.model3d && (
                  <button
                    onClick={() => runTripo(u)}
                    disabled={u.tripoState === "loading" || u.tripoState?.startsWith("pending")}
                    style={{ flex: 1, padding: "3px 0", background: "#7c3aed22", border: "none", borderRadius: "4px", fontSize: "9px", color: u.tripoState === "loading" || u.tripoState?.startsWith("pending") ? "#888" : "#a78bfa", cursor: "pointer" }}
                  >
                    {u.tripoState === "loading" ? "..." : u.tripoState?.startsWith("pending") ? u.tripoState.split("_")[1] + "%" : "→3D"}
                  </button>
                )}
                {u.model3d && (
                  <button
                    onClick={() => window.open(u.model3d, "_blank")}
                    style={{ flex: 1, padding: "3px 0", background: "#1a56db22", border: "none", borderRadius: "4px", fontSize: "9px", color: "#6ea8fe", cursor: "pointer" }}
                  >
                    visa 3D
                  </button>
                )}
              </div>
            </div>
          ))}

          {uploads.length === 0 && (
            <p style={{ fontSize: "11px", color: "var(--text2)", textAlign: "center", padding: "1rem 0" }}>Inga bilder</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <button onClick={() => router.push("/projects/" + projectId + "/generate")} style={{ width: "100%", padding: "5px 0", background: "transparent", border: "1px solid var(--border2)", borderRadius: "6px", fontSize: "10px", color: "var(--text2)", cursor: "pointer" }}>
            ← Generera
          </button>
          <button onClick={logout} style={{ width: "100%", padding: "5px 0", background: "transparent", border: "1px solid var(--border2)", borderRadius: "6px", fontSize: "10px", color: "var(--text2)", cursor: "pointer" }}>
            Logga ut
          </button>
        </div>
      </aside>

      {/* Höger — scen */}
      <div style={{ flex: 1, background: "#fadcd9", display: "flex", flexDirection: "column", position: "relative" }}>

        {/* VR-kod uppe till höger */}
        <div style={{ position: "absolute", top: "12px", right: "16px", textAlign: "right", zIndex: 10 }}>
          <p style={{ fontSize: "10px", color: "#c0786a", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 3px" }}>kod till vr app</p>
          <div style={{ background: "white", border: "2px solid #c0786a", borderRadius: "8px", padding: "6px 14px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#c0786a", letterSpacing: "0.1em" }}>{vrCode}</span>
          </div>
        </div>

        {/* Scen-canvas */}
        <div
          ref={sceneRef}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            flex: 1, position: "relative", margin: "16px",
            border: dragOver ? "2px dashed #c0786a" : "2px dashed #e8b8b0",
            borderRadius: "12px", transition: "border-color 0.2s",
            minHeight: "400px"
          }}
        >
          {/* Scen-label */}
          {sceneItems.length === 0 && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
              <p style={{ fontSize: "18px", fontWeight: 500, color: "#c0a09a", margin: "0 0 6px" }}>SCEN</p>
              <p style={{ fontSize: "13px", color: "#c0a09a" }}>dra in objekt</p>
            </div>
          )}

          {/* Dragna objekt */}
          {sceneItems.map(item => (
            <div
              key={item.uploadId}
              onClick={() => setSelected(selected === item.uploadId ? null : item.uploadId)}
              style={{
                position: "absolute",
                left: item.x - 75,
                top: item.y - 75,
                width: "150px",
                cursor: "pointer",
                outline: selected === item.uploadId ? "2px solid #c0786a" : "none",
                borderRadius: "8px",
                overflow: "hidden"
              }}
            >
              <img src={item.aiImage} style={{ width: "100%", height: "auto", display: "block" }} alt="" />
              {selected === item.uploadId && (
                <button
                  onClick={e => { e.stopPropagation(); removeFromScene(item.uploadId); }}
                  style={{ position: "absolute", top: "4px", right: "4px", background: "#c0392b", border: "none", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", color: "white", cursor: "pointer" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Skapa scen-knapp */}
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "flex-end" }}>
          <button
            disabled={sceneItems.length === 0}
            style={{
              padding: "10px 24px", background: sceneItems.length > 0 ? "#22c55e" : "#aaa",
              border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 500,
              color: "white", cursor: sceneItems.length > 0 ? "pointer" : "not-allowed"
            }}
          >
            skapa scen
          </button>
        </div>
      </div>
    </main>
  );
}
