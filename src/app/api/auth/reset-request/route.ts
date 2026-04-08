import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // Always return success to avoid revealing if email exists
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      // In a production environment, send email here.
      // For a small tax office, the admin generates the link manually.
      console.log(
        `[Password Reset] Token generated for ${email}: /reset-password?token=${resetToken}`
      );
    }

    return NextResponse.json({
      success: true,
      message: "リセットリンクを確認してください",
    });
  } catch (error) {
    console.error("Reset request error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
