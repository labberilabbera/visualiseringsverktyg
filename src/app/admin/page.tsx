"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "tor@flodet.se";

type User = { id: string; email: string; password: string; role: string };

const DEFAULT_USERS: User[] = [
  { id: "1", email: "tor@flodet.se", password: "demo1234", role: "admin" },
];

function getUsers(): User[] {
  try {
    const raw = localStorage.getItem("app_users");
    return raw ? JSON.parse(raw) : DEFAULT_USERS;
  } catch { return DEFAULT_USERS; }
}

function saveUsers(users: User[]) {
  localStorage.setItem("app_users", JSON.stringify(users));
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const loggedIn = sessionStorage.getItem("loggedIn");
    const email = sessionStorage.getItem("userEmail");
    if (!loggedIn || email !== ADMIN_EMAIL) {
      router.replace("/projects");
      return;
    }
    setUsers(getUsers());
    setReady(true);
  }, [router]);

  function addUser() {
    if (!newEmail.trim() || !newPassword.trim()) return;
    if (users.find(u => u.email === newEmail.trim())) {
      setMsg("Användaren finns redan"); return;
    }
    const updated = [...users, { id: Date.now().toString(), email: newEmail.trim(), password: newPassword, role: newRole }];
    saveUsers(updated); setUsers(updated);
    setNewEmail(""); setNewPassword(""); setNewRole("user"); setShowAdd(false);
    setMsg("Användare tillagd!");
    setTimeout(() => setMsg(""), 3000);
  }

  function deleteUser() {
    if (!confirmDelete) return;
    const updated = users.filter(u => u.id !== confirmDelete.id);
    saveUsers(updated); setUsers(updated); setConfirmDelete(null);
    setMsg("Användare raderad"); setTimeout(() => setMsg(""), 3000);
  }

  function savePassword() {
    if (!editUser || !editPassword.trim()) return;
    const updated = users.map(u => u.id === editUser.id ? { ...u, password: editPassword } : u);
    saveUsers(updated); setUsers(updated); setEditUser(null); setEditPassword("");
    setMsg("Lösenord uppdaterat!"); setTimeout(() => setMsg(""), 3000);
  }

  if (!ready) return null;

  const s = {
    main: { minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif", color: "var(--text)", padding: "2rem" },
    card: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "12px" },
    input: { width: "100%", padding: "0.625rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "8px", color: "var(--text)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" as const },
    btnPrimary: { padding: "0.5rem 1rem", background: "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" },
    btnGhost: { padding: "0.375rem 0.75rem", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" },
    btnDanger: { padding: "0.375rem 0.75rem", background: "transparent", border: "1px solid #5a2020", color: "#c44", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" },
  };

  return (
    <main style={s.main}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 500, margin: "0 0 0.25rem" }}>Admin</h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text2)", margin: 0 }}>Hantera användare</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setShowAdd(true)} style={s.btnPrimary}>+ Lägg till användare</button>
            <button onClick={() => router.push("/projects")} style={s.btnGhost}>← Projekt</button>
          </div>
        </div>

        {msg && (
          <div style={{ padding: "0.75rem 1rem", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.875rem", color: "var(--accent)" }}>
            {msg}
          </div>
        )}

        {showAdd && (
          <div style={{ ...s.card, padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontWeight: 500, marginBottom: "1rem", fontSize: "0.9rem" }}>Ny användare</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text2)", display: "block", marginBottom: "0.375rem" }}>E-post</label>
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="anvandare@email.se" style={s.input}/>
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text2)", display: "block", marginBottom: "0.375rem" }}>Lösenord</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" style={s.input}/>
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text2)", display: "block", marginBottom: "0.375rem" }}>Roll</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...s.input, cursor: "pointer" }}>
                  <option value="user">Användare</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={() => { setShowAdd(false); setNewEmail(""); setNewPassword(""); }} style={s.btnGhost}>Avbryt</button>
                <button onClick={addUser} style={s.btnPrimary}>Skapa</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ ...s.card, overflow: "hidden" }}>
          <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "1rem", fontSize: "0.75rem", color: "var(--text3)", fontWeight: 500 }}>
            <span>E-POST</span>
            <span>ROLL</span>
            <span style={{ width: "140px" }}>ÅTGÄRDER</span>
          </div>
          {users.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text3)", fontSize: "0.875rem" }}>Inga användare</div>
          )}
          {users.map((user, i) => (
            <div key={user.id} style={{ padding: "0.875rem 1.25rem", borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "1rem", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, margin: "0 0 0.125rem" }}>{user.email}</p>
              </div>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "20px", background: user.role === "admin" ? "#1a2f6b" : "var(--bg3)", color: user.role === "admin" ? "#6ea8fe" : "var(--text2)", whiteSpace: "nowrap" }}>
                {user.role === "admin" ? "Admin" : "Användare"}
              </span>
              <div style={{ display: "flex", gap: "0.375rem", width: "140px" }}>
                <button onClick={() => { setEditUser(user); setEditPassword(""); }} style={{ ...s.btnGhost, fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>Lösenord</button>
                <button onClick={() => setConfirmDelete(user)} disabled={user.email === ADMIN_EMAIL} style={{ ...s.btnDanger, fontSize: "0.75rem", padding: "0.3rem 0.6rem", opacity: user.email === ADMIN_EMAIL ? 0.3 : 1, cursor: user.email === ADMIN_EMAIL ? "not-allowed" : "pointer" }}>Radera</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }}>
          <div style={{ ...s.card, padding: "1.5rem", maxWidth: "360px", width: "100%" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 500, margin: "0 0 0.25rem" }}>Ändra lösenord</h2>
            <p style={{ color: "var(--text2)", fontSize: "0.8rem", margin: "0 0 1rem" }}>{editUser.email}</p>
            <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Nytt lösenord" style={{ ...s.input, marginBottom: "1rem" }} autoFocus onKeyDown={e => e.key === "Enter" && savePassword()}/>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setEditUser(null)} style={s.btnGhost}>Avbryt</button>
              <button onClick={savePassword} style={s.btnPrimary}>Spara</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }}>
          <div style={{ ...s.card, padding: "1.5rem", maxWidth: "340px", width: "100%" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 500, margin: "0 0 0.5rem" }}>Radera användare?</h2>
            <p style={{ color: "var(--text2)", fontSize: "0.875rem", margin: "0 0 1.25rem" }}>
              Är du säker på att du vill radera <strong style={{ color: "var(--text)" }}>{confirmDelete.email}</strong>?
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={s.btnGhost}>Avbryt</button>
              <button onClick={deleteUser} style={{ ...s.btnPrimary, background: "#c0392b" }}>Ja, radera</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
