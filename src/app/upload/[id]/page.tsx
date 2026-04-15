"use client";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";

type UploadState = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; state: UploadState }[]>([]);
  const [totalDone, setTotalDone] = useState(0);

  async function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const arr = Array.from(selected);
    setFiles(arr.map(f => ({ name: f.name, state: "uploading" as UploadState })));
    let done = 0;
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      try {
        const data = await toBase64(file);
        const res = await fetch(`/api/projects/${projectId}/uploads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, mimetype: file.type, data }),
        });
        const state: UploadState = res.ok ? "done" : "error";
        if (res.ok) done++;
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, state } : f));
      } catch {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, state: "error" } : f));
      }
    }
    setTotalDone(prev => prev + done);
  }

  function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = () => rej(new Error("läsfel"));
      r.readAsDataURL(file);
    });
  }

  function reset() {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  const allDone = files.length > 0 && files.every(f => f.state === "done" || f.state === "error");
  const anyUploading = files.some(f => f.state === "uploading");

  return (
    <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "#fff", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#1a56db", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 16V8m0 0L9 11m3-3l3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="18" rx="4" stroke="white" strokeWidth="1.5"/></svg>
          </div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 500, margin: "0 0 6px" }}>Ladda upp skiss</h1>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Foto, skiss eller modell</p>
        </div>

        {files.length === 0 ? (
          <div
            onClick={() => inputRef.current?.click()}
            style={{ width: "100%", border: "2px dashed #333", borderRadius: "16px", padding: "2.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", cursor: "pointer" }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 22V10m0 0L11 15m5-5l5 5" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="16" cy="16" r="14" stroke="#444" strokeWidth="1.5"/></svg>
            <p style={{ fontSize: "14px", color: "#888", margin: 0, textAlign: "center" }}>Tryck för att välja bilder</p>
            <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>JPG, PNG, HEIC</p>
          </div>
        ) : (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            {files.map((f, i) => (
              <div key={i} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p style={{ fontSize: "13px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</p>
                </div>
                <div style={{ flexShrink: 0, fontSize: "16px" }}>
                  {f.state === "uploading" && <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid #1a56db", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>}
                  {f.state === "done" && <span style={{ color: "#22c55e" }}>&#10003;</span>}
                  {f.state === "error" && <span style={{ color: "#ef4444" }}>&#10007;</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {allDone && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "15px", color: "#22c55e", margin: "0 0 12px", fontWeight: 500 }}>
              {totalDone} {totalDone === 1 ? "fil" : "filer"} uppladdad{totalDone !== 1 ? "e" : ""}!
            </p>
            <button onClick={reset} style={{ padding: "10px 24px", background: "#1a56db", border: "none", borderRadius: "10px", color: "white", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
              Ladda upp fler
            </button>
          </div>
        )}

        {!anyUploading && files.length === 0 && (
          <p style={{ fontSize: "12px", color: "#444", textAlign: "center" }}>Du kan ladda upp flera bilder på en gång</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        style={{ display: "none" }}
        onChange={e => handleFiles(e.target.files)}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}
