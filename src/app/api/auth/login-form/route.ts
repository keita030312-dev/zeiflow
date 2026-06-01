import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { checkOrgGate } from "@/lib/auth-org-gate";

function redirect303(url: string) {
  // URLにASCII以外の文字が含まれる場合はエンコード
  const safeUrl = encodeURI(url);
  return new NextResponse(null, {
    status: 303,
    headers: { Location: safeUrl },
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
    const totpCode = formData.get("totpCode") as string | null;

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

    // 事務所の状態チェック(login API と共通化、bypass 防止)
    const gate = await checkOrgGate(user.organizationId);
    if (!gate.ok) {
      return redirect303(buildUrl(`/login?error=${gate.error}`, req));
    }

    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode) {
        return redirect303(buildUrl("/login?error=二要素認証コードが必要です", req));
      }
      const { verifyTOTP } = await import("@/lib/totp");
      if (!verifyTOTP(totpCode, user.totpSecret)) {
        return redirect303(buildUrl("/login?error=認証コードが正しくありません", req));
      }
    }

    const tokenPayload: Record<string, unknown> = { id: user.id, email: user.email, role: user.role };
    if (user.organizationId) {
      tokenPayload.orgId = user.organizationId;
    }

    const token = sign(
      tokenPayload,
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
    return redirect303(buildUrl("/login?error=server_error", req));
  }
}
