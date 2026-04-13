import { NextResponse } from "next/server";
import Database from "better-sqlite3";

// Viktigt för att undvika caching i API routes
export const dynamic = "force-dynamic";

// Initiera databasen
const db = new Database("database.db");

export async function GET() {
  try {
    // Skapa tabellen om den inte finns
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE
      )
    `).run();

    return NextResponse.json({
      message: "Users table created successfully",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 }
    );
  }
}
