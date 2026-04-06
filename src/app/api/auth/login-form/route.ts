import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

function redirect303(url: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: url },
  });
}

function buildUrl(path: string, req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}${path}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return redirect303(buildUrl("/login?error=入力してください", req));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return redirect303(buildUrl("/login?error=メールアドレスまたはパスワードが正しくありません", req));
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return redirect303(buildUrl("/login?error=メールアドレスまたはパスワードが正しくありません", req));
    }

    const token = sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "8h" }
    );

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
      sameSite: "lax",
      maxAge: 8 * 60 * 60,
      path: "/",
    });

    return redirect303(buildUrl("/dashboard", req));
  } catch {
    return redirect303(buildUrl("/login?error=サーバーエラー", req));
  }
}
