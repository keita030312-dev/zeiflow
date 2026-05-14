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
  officeName: z.string().min(1, "事務所名を入力してください"),
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

    const { email, password, name, officeName, agreedToTerms } = parsed.data;

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

    // 組織コードを生成（事務所名をローマ字化 or タイムスタンプ）
    const orgCode = `org-${Date.now().toString(36)}`;

    // 組織を作成（承認待ちで開始 — schema の default(true) を明示的に上書き）
    const org = await prisma.organization.create({
      data: {
        name: officeName,
        code: orgCode,
        isApproved: false,
      },
    });

    // ユーザーを作成（ADMIN権限、組織に所属）
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: "ADMIN",
        organizationId: org.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "REGISTER",
        detail: `新規事務所登録（承認待ち）: ${officeName} / ${email} (利用規約同意: ${new Date().toISOString()})`,
        userId: user.id,
        organizationId: org.id,
      },
    });

    // 管理者にメール通知
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const adminUrl = process.env.NEXTAUTH_URL || "https://zeiflow.vercel.app";
        await resend.emails.send({
          from: process.env.RESEND_FROM || "ZeiFlow <noreply@resend.dev>",
          to: "keita.030312@gmail.com",
          subject: "【ZeiFlow】新規事務所登録の承認依頼",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="color: #D4AF37; font-size: 20px;">新規事務所が登録されました</h1>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p><strong>事務所名:</strong> ${officeName}</p>
                <p><strong>担当者:</strong> ${name}</p>
                <p><strong>メール:</strong> ${email}</p>
                <p><strong>登録日時:</strong> ${new Date().toLocaleString("ja-JP")}</p>
              </div>
              <p>管理者パネルで承認してください:</p>
              <p><a href="${adminUrl}/superadmin" style="color: #D4AF37;">${adminUrl}/superadmin</a></p>
            </div>
          `,
        });
      } catch {
        // メール送信失敗は無視
      }
    }

    return NextResponse.json({
      success: true,
      pendingApproval: true,
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
