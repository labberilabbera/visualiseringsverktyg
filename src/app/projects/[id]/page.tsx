"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const [userEmail, setUserEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.replace("/login"); return; }
        setUserEmail(data.email);
        const t = localStorage.getItem("theme") || "dark";
        setIsDark(t === "dark");
        const name = localStorage.getItem("project_name_" + projectId) || "Projekt";
        setProjectName(name);
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router, projectId]);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
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

  const card = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "12px" };
  const bp = { padding: "0.5rem 1.25rem", background: "#1a56db", color: "white", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" };
  const bg = { padding: "0.375rem 0.75rem", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "2rem", maxWidth: "600px", margin: "0 auto", width: "100%" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <button onClick={() => router.push("/projects")} style={{ ...bg, padding: "0.375rem 0.625rem" }}>←</button>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 500, margin: 0 }}>{projectName}</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            onClick={() => router.push("/projects/" + projectId + "/prompt")}
            style={{ ...card, padding: "1.25rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div>
              <p style={{ fontWeight: 500, fontSize: "0.9375rem", margin: "0 0 0.25rem" }}>Beskriv visualisering</p>
              <p style={{ color: "var(--text2)", fontSize: "0.8rem", margin: 0 }}>Ange prompt för AI-bildgenerering</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
        </div>
      </div>

      <div style={{ padding: "1rem 2rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1a56db22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 500, color: "#1a56db" }}>{initials}</div>
          <p style={{ color: "var(--text2)", fontSize: "0.8rem", margin: 0 }}>{userEmail}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text2)" }}>{isDark ? "Mörkt" : "Ljust"}</span>
            <button onClick={toggleTheme} style={{ width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer", position: "relative", background: isDark ? "#1a56db" : "#ccc", padding: 0 }}>
              <span style={{ position: "absolute", top: "2px", left: isDark ? "20px" : "2px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s", display: "block" }}/>
            </button>
          </div>
          <button onClick={logout} style={bg}>Logga ut</button>
        </div>
      </div>
    </main>
  );
}
