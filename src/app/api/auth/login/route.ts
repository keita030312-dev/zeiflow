import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error:
            "ログイン試行回数が上限に達しました。15分後に再度お試しください",
        },
        { status: 429 }
      );
    }

    const { email, password, totpCode } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードを入力してください" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode) {
        return NextResponse.json({ requires2FA: true });
      }
      const { verifyTOTP } = await import("@/lib/totp");
      const isValidTotp = verifyTOTP(totpCode, user.totpSecret);
      if (!isValidTotp) {
        return NextResponse.json(
          { error: "認証コードが正しくありません" },
          { status: 401 }
        );
      }
    }

    const token = sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "8h" }
    );

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: !!process.env.HTTPS,
      sameSite: "lax",
      maxAge: 8 * 60 * 60,
      path: "/",
    });

    await prisma.auditLog.create({
      data: {
        action: "LOGIN",
        detail: `ログイン成功: ${email}`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
