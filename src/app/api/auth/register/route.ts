import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "パスワードは大文字・小文字・数字を含めてください"
    ),
  name: z.string().min(1, "名前を入力してください"),
  agreedToTerms: z.literal(true, { error: "利用規約への同意が必要です" }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, agreedToTerms } = parsed.data;

    if (!agreedToTerms) {
      return NextResponse.json(
        { error: "利用規約への同意が必要です" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    await prisma.auditLog.create({
      data: {
        action: "REGISTER",
        detail: `新規ユーザー登録: ${email} (利用規約同意: ${new Date().toISOString()})`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Register error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました", detail: message },
      { status: 500 }
    );
  }
}
