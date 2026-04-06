import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export function getUser(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  try {
    return verify(token, process.env.NEXTAUTH_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): TokenPayload | NextResponse {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  return user;
}
