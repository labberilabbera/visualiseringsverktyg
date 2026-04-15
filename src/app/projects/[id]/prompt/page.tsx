"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function PromptPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const [userEmail, setUserEmail] = useState("");
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState("");
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
        setReady(true);
      })
      .catch(() => router.replace("/login"));

    fetch("/api/ai/status")
      .then(r => r.json())
      .then(d => setApiOk(d.ok === true))
      .catch(() => setApiOk(false));
  }, [router]);

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

  async function handleContinue() {
    if (!prompt.trim()) return;
    await fetch("/api/projects/" + projectId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim() }),
    });
    router.push("/projects/" + projectId + "/qr");
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
          <p style={{ fontSize: "10px", fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "7px" }}>API-status</p>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0, background: apiOk === null ? "#888" : apiOk ? "#22c55e" : "#ef4444" }}/>
            <p style={{ fontSize: "12px", color: "var(--text2)", margin: 0 }}>
              {apiOk === null ? "Kontrollerar..." : apiOk ? "Ansluten" : "Ej ansluten"}
            </p>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", color: "var(--text2)" }}>{isDark ? "Mörkt" : "Ljust"}</span>
            <button onClick={toggleTheme} style={{ width: "36px", height: "20px", borderRadius: "10px", border: "none", cursor: "pointer", position: "relative", background: isDark ? "#1a56db" : "#ccc", padding: 0 }}>
              <span style={{ position: "absolute", top: "2px", left: isDark ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "white", transition: "left 0.2s", display: "block" }}/>
            </button>
          </div>
          <button onClick={logout} style={{ width: "100%", padding: "6px 0", background: "transparent", border: "1px solid var(--border2)", borderRadius: "6px", fontSize: "12px", color: "var(--text2)", cursor: "pointer" }}>
            Logga ut
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, background: "#fadcd9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <p style={{ fontSize: "15px", fontWeight: 500, color: "#111", marginBottom: "1rem", textAlign: "center" }}>Beskriv vad du vill visualisera</p>
        <div style={{ width: "100%", maxWidth: "420px", background: "white", border: "1px solid #ddd", borderRadius: "10px", padding: "14px", marginBottom: "1rem" }}>
          <textarea
            autoFocus
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="T.ex. gör om skisserna till fotorealistiska rullstolar, behåll uttrycket i skissen, bakgrunden ska vara vit"
            style={{ width: "100%", height: "110px", border: "none", outline: "none", resize: "none", fontSize: "13px", color: "#111", background: "transparent", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}
          />
        </div>
        <div style={{ width: "100%", maxWidth: "420px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => router.push("/projects")} style={{ padding: "7px 14px", background: "transparent", border: "1px solid #bbb", borderRadius: "8px", fontSize: "13px", color: "#444", cursor: "pointer" }}>
            Tillbaka
          </button>
          <button
            onClick={handleContinue}
            disabled={!prompt.trim()}
            style={{ padding: "7px 20px", background: prompt.trim() ? "#16a34a" : "#aaa", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500, color: "white", cursor: prompt.trim() ? "pointer" : "not-allowed" }}
          >
            Klar
          </button>
        </div>
      </div>
    </main>
  );
}
