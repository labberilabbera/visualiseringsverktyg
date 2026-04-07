"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PROJECTS = [
  { id: "1", name: "Stolar och sitsar", count: 12, updated: "Igår" },
  { id: "2", name: "Keramik och lera", count: 8, updated: "3 dagar sedan" },
  { id: "3", name: "Vävnader och textil", count: 5, updated: "1 vecka sedan" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState(PROJECTS);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  function createProject() {
    if (!newName.trim()) return;
    const proj = { id: Date.now().toString(), name: newName.trim(), count: 0, updated: "Just nu" };
    setProjects([proj, ...projects]);
    setNewName("");
    setShowNew(false);
    router.push("/projects/" + proj.id);
  }

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
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="T.ex. Trähantverk"
              style={{ width: "100%", padding: "0.625rem 0.75rem", background: "#111", border: "1px solid #333", borderRadius: "8px", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", marginBottom: "0.75rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowNew(false)} style={{ padding: "0.5rem 0.875rem", background: "transparent", color: "#888", border: "1px solid #333", borderRadius: "8px", fontSize: "0.8rem", cursor: "pointer" }}>Avbryt</button>
              <button onClick={createProject} style={{ padding: "0.5rem 0.875rem", background: "#1a56db", color: "white", border: "none", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}>Skapa</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => router.push("/projects/" + proj.id)}
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", width: "100%", textAlign: "left" }}
            >
              <div>
                <p style={{ color: "white", fontWeight: 500, fontSize: "0.9375rem", margin: "0 0 0.25rem" }}>{proj.name}</p>
                <p style={{ color: "#555", fontSize: "0.8rem", margin: 0 }}>{proj.count} objekt · {proj.updated}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "1rem 2rem", borderTop: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ color: "#444", fontSize: "0.8rem", margin: 0 }}>Inloggad som tor@flodet.se</p>
        <button onClick={() => router.push("/login")} style={{ background: "transparent", border: "none", color: "#555", fontSize: "0.8rem", cursor: "pointer" }}>Logga ut</button>
      </div>
    </main>
  );
}
