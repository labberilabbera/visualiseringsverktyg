"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "tor@flodet.se";
type Project = { id: string; name: string; count: number; updated: string };

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const loggedIn = sessionStorage.getItem("loggedIn");
    if (!loggedIn) { router.replace("/login"); return; }
    setUserEmail(sessionStorage.getItem("userEmail") || "");
    const savedTheme = localStorage.getItem("theme") || "dark";
    setIsDark(savedTheme === "dark");
    setReady(true);
  }, [router]);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function logout() {
    sessionStorage.removeItem("loggedIn");
    sessionStorage.removeItem("userEmail");
    router.replace("/login");
  }

  function createProject() {
    if (!newName.trim()) return;
    const proj: Project = { id: Date.now().toString(), name: newName.trim(), count: 0, updated: "Just nu" };
    setProjects([proj, ...projects]);
    setNewName(""); setShowNew(false);
    router.push("/projects/" + proj.id);
  }

  function deleteProject() {
    if (!confirmDelete) return;
    setProjects(projects.filter((p) => p.id !== confirmDelete.id));
    setConfirmDelete(null);
  }

  if (!ready) return null;

  const isAdmin = userEmail === ADMIN_EMAIL;

  const s = {
    main: { minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif", color: "var(--text)", display: "flex", flexDirection: "column" as const },
    card: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "12px" },
    input: { width: "100%", padding: "0.625rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "8px", color: "var(--text)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" as const },
    btnPrimary: { padding: "0.5rem 1rem", background: "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" },
    btnGhost: { padding: "0.375rem 0.75rem", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" },
  };

  return (
    <main style={s.main}>
      <div style={{ flex: 1, padding: "2rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="2" fill="white"/>
                <rect x="13" y="3" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                <rect x="3" y="13" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.3"/>
              </svg>
            </div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 500, margin: 0 }}>Mina projekt</h1>
          </div>
          <button onClick={() => setShowNew(true)} style={s.btnPrimary}>+ Nytt projekt</button>
        </div>

        {showNew && (
          <div style={{ ...s.card, padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--text2)", marginBottom: "0.75rem" }}>Projektnamn</p>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createProject()} placeholder="T.ex. Trähantverk" style={{ ...s.input, marginBottom: "0.75rem" }}/>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowNew(false); setNewName(""); }} style={s.btnGhost}>Avbryt</button>
              <button onClick={createProject} style={s.btnPrimary}>Skapa</button>
            </div>
          </div>
        )}

        {projects.length === 0 && !showNew && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text3)" }}>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Inga projekt ännu</p>
            <p style={{ fontSize: "0.8rem" }}>Klicka på &quot;+ Nytt projekt&quot; för att komma igång</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {projects.map((proj) => (
            <div key={proj.id} style={{ ...s.card, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => router.push("/projects/" + proj.id)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1, padding: 0, color: "var(--text)" }}>
                <p style={{ fontWeight: 500, fontSize: "0.9375rem", margin: "0 0 0.25rem" }}>{proj.name}</p>
                <p style={{ color: "var(--text2)", fontSize: "0.8rem", margin: 0 }}>{proj.count} objekt · {proj.updated}</p>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ cursor: "pointer" }} onClick={() => router.push("/projects/" + proj.id)}>
                  <path d="M6 4l4 4-4 4" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <button onClick={() => setConfirmDelete(proj)} title="Radera" style={{ background: "transparent", border: "1px solid #5a2020", borderRadius: "6px", padding: "0.25rem 0.5rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
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
          <div style={{ ...s.card, padding: "1.5rem", maxWidth: "340px", width: "100%" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 500, margin: "0 0 0.5rem" }}>Radera projekt?</h2>
            <p style={{ color: "var(--text2)", fontSize: "0.875rem", margin: "0 0 1.25rem" }}>
              Är du säker på att du vill radera <strong style={{ color: "var(--text)" }}>{confirmDelete.name}</strong>? Det går inte att ångra.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={s.btnGhost}>Avbryt</button>
              <button onClick={deleteProject} style={{ ...s.btnPrimary, background: "#c0392b" }}>Ja, radera</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "1rem 2rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" as const }}>
        <p style={{ color: "var(--text2)", fontSize: "0.8rem", margin: 0 }}>Inloggad som {userEmail}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {isAdmin && (
            <button onClick={() => router.push("/admin")} style={{ ...s.btnGhost, fontSize: "0.75rem", padding: "0.3rem 0.7rem", borderColor: "#1a56db", color: "#6ea8fe" }}>
              Admin
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text2)" }}>{isDark ? "Mörkt" : "Ljust"}</span>
            <button onClick={toggleTheme} style={{ width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer", position: "relative", background: isDark ? "#1a56db" : "#ccc", padding: 0 }}>
              <span style={{ position: "absolute", top: "2px", left: isDark ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}/>
            </button>
          </div>
          <button onClick={logout} style={s.btnGhost}>Logga ut</button>
        </div>
      </div>
    </main>
  );
}
