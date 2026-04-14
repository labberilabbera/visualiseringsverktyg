import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, "visualisering.db")
  : path.join(process.cwd(), "visualisering.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Skapa users-tabell om den inte finns
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )
`);

// Skapa admin-användare om den inte finns (INSERT OR IGNORE undviker UNIQUE-fel)
try {
  const hash = bcrypt.hashSync("demo1234", 10);
  db.prepare("INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)").run("tor@flodet.se", hash, "admin");
} catch {
  // Admin finns redan, ignorera
}

export default db;
