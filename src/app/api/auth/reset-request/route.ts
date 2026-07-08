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
          // 本文にリセットURLを「クリック可能な生URL文字列」として出さないこと。
          // 送信ドメイン(ai-keita.com)と異なるドメイン(zeiflow.vercel.app)の生URLを
          // アンカーテキストに出すと Gmail がフィッシング判定し、Resend上deliveredでも
          // 受信箱に届かない(2026-07-08 実測で確定)。生URLはtextパートにのみ置く。
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #D4AF37; font-size: 22px; margin: 0;">ZeiFlow</h1>
              </div>
              <h2 style="color: #333; font-size: 18px;">パスワードリセットのご依頼</h2>
              <p style="color: #555; line-height: 1.7;">
                ${user.name} 様<br><br>
                ZeiFlowのパスワードリセットのリクエストを受け付けました。<br>
                下のボタンから新しいパスワードを設定してください。
              </p>
              <p style="margin: 28px 0;">
                <a href="${resetUrl}" style="background: #D4AF37; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">パスワードを再設定する</a>
              </p>
              <p style="color: #999; font-size: 12px; line-height: 1.6;">
                このリンクは1時間で有効期限が切れます。<br>
                心当たりがない場合は、このメールを無視してください。
              </p>
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
