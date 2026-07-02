import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkOrgGate } from "@/lib/auth-org-gate";
import { issueSessionCookie } from "@/lib/session-token";

export async function POST(req: NextRequest) {
  try {

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

    // 事務所の状態チェック(login-form と共通化、bypass 防止)
    const gate = await checkOrgGate(user.organizationId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
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

    await issueSessionCookie(user);

    await prisma.auditLog.create({
      data: {
        action: "LOGIN",
        detail: `ログイン成功: ${email}`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.organizationId },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
