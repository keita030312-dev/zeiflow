import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

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

      // メール送信
      const baseUrl = process.env.NEXTAUTH_URL || "https://zeiflow.vercel.app";
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        // メール送信失敗(送信元無効・レート制限・障害等)で 500 を返すと、
        // 「存在するメール = 500、存在しないメール = 200」になり email 列挙が可能。
        // ここで握り潰してログだけ残し、常に同じ成功レスポンスを返す。
        try {
        // text パート必須: HTML専用のリセット風メールは新興ドメインだと
        // Gmail に受領後サイレント破棄される(2026-07-08 実測。Resend上はdeliveredになる)
        await resend.emails.send({
          from: process.env.RESEND_FROM || "ZeiFlow <noreply@resend.dev>",
          to: email,
          subject: "【ZeiFlow】パスワードリセット",
          text: `${user.name} 様\n\nZeiFlowのパスワードリセットのリクエストを受け付けました。\n以下のURLから新しいパスワードを設定してください(有効期限1時間):\n\n${resetUrl}\n\n心当たりがない場合は、このメールを無視してください。`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">ZeiFlow</h1>
                <p style="color: #666; font-size: 14px;">税理士事務所向けAI仕訳管理システム</p>
              </div>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
                <h2 style="color: #333; font-size: 18px; margin-top: 0;">パスワードリセットのご依頼</h2>
                <p style="color: #555; line-height: 1.6;">
                  ${user.name} 様<br><br>
                  パスワードリセットのリクエストを受け付けました。<br>
                  以下のボタンをクリックして、新しいパスワードを設定してください。
                </p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="color: #D4AF37; font-size: 16px; font-weight: bold; text-decoration: underline;">▶ パスワードを再設定する</a>
                </p>
                <p style="color: #555; font-size: 12px; margin-top: 16px;">
                  上のリンクを押せない場合は、以下のURLをブラウザに貼り付けてください：
                </p>
                <p style="font-size: 11px; word-break: break-all; margin-top: 4px;">
                  <a href="${resetUrl}" style="color: #D4AF37;">${resetUrl}</a>
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                  このリンクは1時間で有効期限が切れます。<br>
                  心当たりがない場合は、このメールを無視してください。
                </p>
              </div>
              <div style="text-align: center; color: #aaa; font-size: 11px;">
                <p>このメールはZeiFlowから自動送信されています。</p>
              </div>
            </div>
          `,
        });
        } catch (mailErr) {
          console.error("Reset email send failed:", mailErr);
        }
      } else {
        // Resend未設定の場合はコンソールにログ出力
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Password Reset] ${email}: ${resetUrl}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "パスワードリセット用のメールを送信しました。メールをご確認ください。",
    });
  } catch (error) {
    console.error("Reset request error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
