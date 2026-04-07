"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Project = { id: string; name: string; count: number; updated: string };

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loggedIn = sessionStorage.getItem("loggedIn");
    if (!loggedIn) {
      router.replace("/login");
      return;
    }
    setUserEmail(sessionStorage.getItem("userEmail") || "");
    setReady(true);
  }, [router]);

  function logout() {
    sessionStorage.removeItem("loggedIn");
    sessionStorage.removeItem("userEmail");
    router.replace("/login");
  }

  function createProject() {
    if (!newName.trim()) return;
    const proj: Project = { id: Date.now().toString(), name: newName.trim(), count: 0, updated: "Just nu" };
    setProjects([proj, ...projects]);
    setNewName("");
    setShowNew(false);
    router.push("/projects/" + proj.id);
  }

  function deleteProject() {
    if (!confirmDelete) return;
    setProjects(projects.filter((p) => p.id !== confirmDelete.id));
    setConfirmDelete(null);
  }

  if (!ready) return null;

  return (
    <main style={{ minHeight: "100vh", background: "#0f0f0f", fontFamily: "system-ui, sans-serif", color: "white", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "2rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#1a56db", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="2" fill="white"/>
                <rect x="13" y="3" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                <rect x="3" y="13" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.3"/>
              </svg>
            </div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 500, margin: 0 }}>Mina projekt</h1>
          </div>
          <button onClick={() => setShowNew(true)} style={{ padding: "0.5rem 1rem", background: "#1a56db", color: "white", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>
            + Nytt projekt
          </button>
        </div>

        {showNew && (
          <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.875rem", color: "#aaa", marginBottom: "0.75rem" }}>Projektnamn</p>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createProject()} placeholder="T.ex. Trähantverk" style={{ width: "100%", padding: "0.625rem 0.75rem", background: "#111", border: "1px solid #333", borderRadius: "8px", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", marginBottom: "0.75rem" }}/>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowNew(false); setNewName(""); }} style={{ padding: "0.5rem 0.875rem", background: "transparent", color: "#aaa", border: "1px solid #444", borderRadius: "8px", fontSize: "0.8rem", cursor: "pointer" }}>Avbryt</button>
              <button onClick={createProject} style={{ padding: "0.5rem 0.875rem", background: "#1a56db", color: "white", border: "none", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}>Skapa</button>
            </div>
          </div>
        )}

        {projects.length === 0 && !showNew && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#555" }}>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Inga projekt ännu</p>
            <p style={{ fontSize: "0.8rem" }}>Klicka på &quot;+ Nytt projekt&quot; för att komma igång</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {projects.map((proj) => (
            <div key={proj.id} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => router.push("/projects/" + proj.id)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1, padding: 0 }}>
                <p style={{ color: "white", fontWeight: 500, fontSize: "0.9375rem", margin: "0 0 0.25rem" }}>{proj.name}</p>
                <p style={{ color: "#888", fontSize: "0.8rem", margin: 0 }}>{proj.count} objekt · {proj.updated}</p>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ cursor: "pointer" }} onClick={() => router.push("/projects/" + proj.id)}>
                  <path d="M6 4l4 4-4 4" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <button onClick={() => setConfirmDelete(proj)} title="Radera projekt" style={{ background: "transparent", border: "1px solid #3a2020", borderRadius: "6px", padding: "0.25rem 0.5rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3.5h10M5.5 3.5V2.5h3v1M4.5 3.5l.5 8h4l.5-8" stroke="#c44" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }}>
          <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "14px", padding: "1.5rem", maxWidth: "340px", width: "100%" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 500, margin: "0 0 0.5rem" }}>Radera projekt?</h2>
            <p style={{ color: "#888", fontSize: "0.875rem", margin: "0 0 1.25rem" }}>
              Är du säker på att du vill radera <strong style={{ color: "#ccc" }}>{confirmDelete.name}</strong>? Det går inte att ångra.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "0.5rem 1rem", background: "transparent", color: "#aaa", border: "1px solid #444", borderRadius: "8px", fontSize: "0.875rem", cursor: "pointer" }}>Avbryt</button>
              <button onClick={deleteProject} style={{ padding: "0.5rem 1rem", background: "#c0392b", color: "white", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>Ja, radera</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "1rem 2rem", borderTop: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ color: "#999", fontSize: "0.8rem", margin: 0 }}>Inloggad som {userEmail}</p>
        <button onClick={logout} style={{ background: "transparent", border: "1px solid #444", color: "#ccc", fontSize: "0.8rem", cursor: "pointer", padding: "0.375rem 0.75rem", borderRadius: "6px" }}>
          Logga ut
        </button>
      </div>
    </main>
  );
}
