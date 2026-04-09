import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret");

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({ email: payload.email, role: payload.role });
  } catch {
    return NextResponse.json({ error: "Ogiltig session" }, { status: 401 });
  }
}
