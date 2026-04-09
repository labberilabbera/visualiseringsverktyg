"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Inloggning misslyckades"); setLoading(false); return; }
      router.replace("/projects");
    } catch {
      setError("Serverfel, försök igen");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", fontFamily: "system-ui, sans-serif", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#1a56db", margin: "0 auto 1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" fill="white"/>
              <rect x="13" y="3" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
              <rect x="3" y="13" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
              <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.3"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 500, color: "var(--text)", margin: 0 }}>Visualiseringsverktyg</h1>
          <p style={{ color: "var(--text2)", fontSize: "0.875rem", marginTop: "0.25rem" }}>Kultur för äldre</p>
        </div>
        <form onSubmit={handleLogin} style={{ background: "var(--bg2)", borderRadius: "12px", padding: "1.5rem", border: "1px solid var(--border)" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text2)", marginBottom: "0.375rem" }}>E-post</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: "0.625rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "8px", color: "var(--text)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} placeholder="din@email.se"/>
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text2)", marginBottom: "0.375rem" }}>Lösenord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: "0.625rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "8px", color: "var(--text)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} placeholder="••••••••"/>
          </div>
          {error && <p style={{ color: "#f87171", fontSize: "0.8rem", margin: "0 0 1rem" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.625rem", background: loading ? "var(--border2)" : "#1a56db", color: "white", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </form>
      </div>
    </main>
  );
}
