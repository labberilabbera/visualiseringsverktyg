import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, "visualisering.db")
  : path.join(process.cwd(), "visualisering.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    data TEXT NOT NULL,
    ai_image TEXT DEFAULT NULL,
    model3d_url TEXT DEFAULT NULL,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );
`);

// Add columns if they don't exist yet (safe migration)
try { db.exec("ALTER TABLE uploads ADD COLUMN ai_image TEXT DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE uploads ADD COLUMN model3d_url TEXT DEFAULT NULL"); } catch {}

try {
  const hash = bcrypt.hashSync("demo1234", 10);
  db.prepare("INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)").run("tor@flodet.se", hash, "admin");
} catch {}

export default db;
