import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

// Lazy singleton — only opens DB on first request, never at import/build time
let _db: InstanceType<typeof Database> | null = null;

export function getDb(): InstanceType<typeof Database> {
  if (_db) return _db;

  const DB_PATH = process.env.DATA_DIR
    ? path.join(process.env.DATA_DIR, "visualisering.db")
    : path.join(process.cwd(), "visualisering.db");

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
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

  try { _db.exec("ALTER TABLE uploads ADD COLUMN ai_image TEXT DEFAULT NULL"); } catch {}
  try { _db.exec("ALTER TABLE uploads ADD COLUMN model3d_url TEXT DEFAULT NULL"); } catch {}

  try {
    const hash = bcrypt.hashSync("demo1234", 10);
    _db.prepare("INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)").run("tor@flodet.se", hash, "admin");
  } catch {}

  return _db;
}

export default { prepare: (s: string) => getDb().prepare(s), exec: (s: string) => getDb().exec(s), pragma: (s: string) => getDb().pragma(s) };
