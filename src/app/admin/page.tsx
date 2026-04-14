"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type User = { id: number; email: string; role: string };

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [ready, setReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [msg, setMsg] = useState("");
  const [myEmail, setMyEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.error || data.role !== "admin") { router.replace("/projects"); return; }
      setMyEmail(data.email);
      fetchUsers();
      setReady(true);
    }).catch(() => router.replace("/login"));
  }, [router]);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    else if (res.status === 403) router.replace("/projects");
  }

  function notify(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function addUser() {
    if (!newEmail.trim() || !newPassword.trim()) return;
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
    });
    if (res.ok) {
      notify("Anvandare tillagd!"); setShowAdd(false);
      setNewEmail(""); setNewPassword(""); setNewRole("user");
      fetchUsers();
    } else { const d = await res.json(); notify(d.error || "Fel"); }
  }

  async function deleteUser() {
    if (!confirmDelete) return;
    const res = await fetch("/api/users", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: confirmDelete.id }),
    });
    if (res.ok) { notify("Anvandare raderad"); setConfirmDelete(null); fetchUsers(); }
    else { const d = await res.json(); notify(d.error || "Fel"); setConfirmDelete(null); }
  }

  async function savePassword() {
    if (!editUser || !editPassword.trim()) return;
    const res = await fetch("/api/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editUser.id, password: editPassword }),
    });
    if (res.ok) { notify("Losenord uppdaterat!"); setEditUser(null); setEditPassword(""); }
    else notify("Fel vid uppdatering");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!ready) return null;

  const s = {
    main: { minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif", color: "var(--text)", padding: "2rem" },
    card: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "12px" },
    input: { width: "100%", padding: "0.625rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "8px", color: "var(--text)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" as const },
    btnP: { padding: "0.5rem 1rem", background: "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" },
    btnG: { padding: "0.375rem 0.75rem", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" },
    btnD: { padding: "0.375rem 0.75rem", background: "transparent", border: "1px solid #5a2020", color: "#c44", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" },
  };

  return (
    <main style={s.main}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div><h1 style={{ fontSize: "1.25rem", fontWeight: 500, margin: "0 0 0.25rem" }}>Admin</h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text2)", margin: 0 }}>Hantera anvandare</p></div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setShowAdd(true)} style={s.btnP}>+ Lagg till</button>
            <button onClick={() => router.push("/projects")} style={s.btnG}>{"←"} Projekt</button>
            <button onClick={logout} style={s.btnG}>Logga ut</button>
          </div>
        </div>
        {msg && <div style={{ padding: "0.75rem 1rem", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.875rem", color: "#6ea8fe" }}>{msg}</div>}
        {showAdd && (
          <div style={{ ...s.card, padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontWeight: 500, marginBottom: "1rem", fontSize: "0.9rem" }}>Ny anvandare</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div><label style={{ fontSize: "0.75rem", color: "var(--text2)", display: "block", marginBottom: "0.375rem" }}>E-post</label><input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="anvandare@email.se" style={s.input}/></div>
              <div><label style={{ fontSize: "0.75rem", color: "var(--text2)", display: "block", marginBottom: "0.375rem" }}>Losenord</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" style={s.input}/></div>
              <div><label style={{ fontSize: "0.75rem", color: "var(--text2)", display: "block", marginBottom: "0.375rem" }}>Roll</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...s.input, cursor: "pointer" }}>
                  <option value="user">Anvandare</option><option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={() => { setShowAdd(false); setNewEmail(""); setNewPassword(""); }} style={s.btnG}>Avbryt</button>
                <button onClick={addUser} style={s.btnP}>Skapa</button>
              </div>
            </div>
          </div>
        )}
        <div style={{ ...s.card, overflow: "hidden" }}>
          <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "1rem", fontSize: "0.75rem", color: "var(--text3)", fontWeight: 500 }}>
            <span>E-POST</span><span>ROLL</span><span style={{ width: "140px" }}>ATGARDER</span>
          </div>
          {users.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--text3)", fontSize: "0.875rem" }}>Inga anvandare</div>}
          {users.map((user, i) => (
            <div key={user.id} style={{ padding: "0.875rem 1.25rem", borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "1rem", alignItems: "center" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>{user.email}{user.email === myEmail && <span style={{ fontSize: "0.7rem", color: "var(--text3)", marginLeft: "0.5rem" }}>(du)</span>}</p>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "20px", background: user.role === "admin" ? "#1a2f6b" : "var(--bg3)", color: user.role === "admin" ? "#6ea8fe" : "var(--text2)", whiteSpace: "nowrap" as const }}>
                {user.role === "admin" ? "Admin" : "Anvandare"}
              </span>
              <div style={{ display: "flex", gap: "0.375rem", width: "140px" }}>
                <button onClick={() => { setEditUser(user); setEditPassword(""); }} style={{ ...s.btnG, fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>Losenord</button>
                <button onClick={() => setConfirmDelete(user)} disabled={user.email === myEmail} style={{ ...s.btnD, fontSize: "0.75rem", padding: "0.3rem 0.6rem", opacity: user.email === myEmail ? 0.3 : 1, cursor: user.email === myEmail ? "not-allowed" : "pointer" }}>Radera</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }}>
          <div style={{ ...s.card, padding: "1.5rem", maxWidth: "360px", width: "100%" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 500, margin: "0 0 0.25rem" }}>Andra losenord</h2>
            <p style={{ color: "var(--text2)", fontSize: "0.8rem", margin: "0 0 1rem" }}>{editUser.email}</p>
            <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Nytt losenord" style={{ ...s.input, marginBottom: "1rem" }} autoFocus onKeyDown={e => e.key === "Enter" && savePassword()}/>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setEditUser(null)} style={s.btnG}>Avbryt</button>
              <button onClick={savePassword} style={s.btnP}>Spara</button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }}>
          <div style={{ ...s.card, padding: "1.5rem", maxWidth: "340px", width: "100%" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 500, margin: "0 0 0.5rem" }}>Radera anvandare?</h2>
            <p style={{ color: "var(--text2)", fontSize: "0.875rem", margin: "0 0 1.25rem" }}>Ar du saker pa att du vill radera <strong style={{ color: "var(--text)" }}>{confirmDelete.email}</strong>?</p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={s.btnG}>Avbryt</button>
              <button onClick={deleteUser} style={{ ...s.btnP, background: "#c0392b" }}>Ja, radera</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
