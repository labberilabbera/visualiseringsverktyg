"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import QRCode from "qrcode";

export default function QRPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [projectName, setProjectName] = useState("");
  const [uploads, setUploads] = useState<{id:number;filename:string}[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");

  useEffect(() => {
    setUploadUrl(window.location.origin + "/upload/" + projectId);

    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.error) { router.replace("/login"); return; }
      setUserEmail(data.email);
      setReady(true);
    }).catch(() => router.replace("/login"));

    fetch("/api/projects/" + projectId).then(r => r.json()).then(d => setProjectName(d.name || ""));
    loadUploads();
    const interval = setInterval(loadUploads, 3000);
    return () => clearInterval(interval);
  }, [projectId, router]);

  async function loadUploads() {
    const res = await fetch("/api/projects/" + projectId + "/uploads");
    if (res.ok) setUploads(await res.json());
  }

  useEffect(() => {
    if (canvasRef.current && uploadUrl) {
      QRCode.toCanvas(canvasRef.current, uploadUrl, { width: 240, margin: 2 });
    }
  }, [uploadUrl]);

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

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif", color: "var(--text)", display: "flex" }}>
      <aside style={{ width: "200px", minWidth: "200px", borderRight: "1px solid var(--border)", background: "var(--bg2)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#1a56db22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 500, color: "#1a56db", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{userEmail}</p>
              <p style={{ fontSize: "10px", color: "var(--text2)", margin: 0 }}>Inloggad</p>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: "10px", fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "7px" }}>Uppladdningar</p>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: uploads.length > 0 ? "#22c55e" : "#888", flexShrink: 0 }}/>
            <p style={{ fontSize: "12px", color: "var(--text2)", margin: 0 }}>{uploads.length} filer</p>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
          <button onClick={logout} style={{ width: "100%", padding: "6px 0", background: "transparent", border: "1px solid var(--border2)", borderRadius: "6px", fontSize: "12px", color: "var(--text2)", cursor: "pointer", fontFamily: "system-ui" }}>
            Logga ut
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", gap: "1.5rem" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "var(--text2)", margin: "0 0 4px" }}>{projectName}</p>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 500, margin: 0 }}>Skanna för att ladda upp</h1>
        </div>

        <div style={{ background: "white", padding: "16px", borderRadius: "12px" }}>
          <canvas ref={canvasRef} />
        </div>

        <p style={{ fontSize: "12px", color: "var(--text2)", textAlign: "center", maxWidth: "260px", lineHeight: 1.5 }}>
          Deltagarna skannar QR-koden och fotar sina skisser direkt från mobilen
        </p>

        {uploads.length > 0 && (
          <div style={{ width: "100%", maxWidth: "400px" }}>
            <p style={{ fontSize: "11px", color: "var(--text2)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>Inkomna filer</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
              {uploads.map(u => (
                <div key={u.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 12px", display: "flex", justifyContent: "space-between" }}>
                  <p style={{ fontSize: "13px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.filename}</p>
                  <span style={{ color: "#22c55e", marginLeft: "8px" }}>&#10003;</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => router.push("/projects/" + projectId + "/prompt")} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border2)", borderRadius: "8px", fontSize: "13px", color: "var(--text2)", cursor: "pointer" }}>
            Tillbaka
          </button>
          <button
            onClick={() => router.push("/projects/" + projectId + "/generate")}
            disabled={uploads.length === 0}
            style={{ padding: "8px 20px", background: uploads.length > 0 ? "#1a56db" : "#333", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500, color: uploads.length > 0 ? "white" : "#666", cursor: uploads.length > 0 ? "pointer" : "not-allowed" }}
          >
            Generera bilder
          </button>
        </div>
      </div>
    </main>
  );
}
