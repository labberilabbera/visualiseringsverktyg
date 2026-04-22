import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getPool, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret");

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const db = getPool();
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "E-post och losenord kravs" }, { status: 400 });
    const res = await db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    const user = res.rows[0];
    if (!user) return NextResponse.json({ error: "Fel e-post eller losenord" }, { status: 401 });
    if (!bcrypt.compareSync(password, user.password_hash)) return NextResponse.json({ error: "Fel e-post eller losenord" }, { status: 401 });
    const token = await new SignJWT({ id: user.id, email: user.email, role: user.role })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(JWT_SECRET);
    const response = NextResponse.json({ ok: true, email: user.email, role: user.role });
    response.cookies.set("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60*60*24*7, path: "/" });
    return response;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
