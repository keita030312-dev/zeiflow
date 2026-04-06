import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "現在のパスワードと新しいパスワードを入力してください" },
        { status: 400 }
      );
    }

    // Validate new password: 8+ chars, uppercase, lowercase, digit
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          error:
            "新しいパスワードは8文字以上で、大文字・小文字・数字を含む必要があります",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません" },
        { status: 401 }
      );
    }

    const newHash = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: auth.id },
      data: { passwordHash: newHash },
    });

    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_CHANGE",
        detail: "パスワードを変更しました",
        userId: auth.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
