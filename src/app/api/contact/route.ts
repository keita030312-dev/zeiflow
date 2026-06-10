import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  firmName: z.string().min(1, "事務所名を入力してください"),
  name: z.string().min(1, "お名前を入力してください"),
  email: z.string().email("正しいメールアドレスを入力してください"),
  phone: z.string().optional(),
  topic: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "入力内容を確認してください";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { firmName, name, email, phone, topic, message } = parsed.data;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM || "ZeiFlow <noreply@resend.dev>";
      const to = process.env.CONTACT_TO_EMAIL || "keita.030312@gmail.com";

      await resend.emails.send({
        from,
        to,
        replyTo: email,
        subject: `【ZeiFlow 無料相談】${firmName} ${name} 様`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">ZeiFlow</h1>
              <p style="color: #666; font-size: 14px;">無料相談フォーム 新着メッセージ</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
              <table style="width:100%; border-collapse:collapse; font-size:14px; color:#333;">
                <tr><td style="padding:8px 0; color:#888; width:120px;">事務所名</td><td style="padding:8px 0; font-weight:bold;">${firmName}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">お名前</td><td style="padding:8px 0;">${name} 様</td></tr>
                <tr><td style="padding:8px 0; color:#888;">メール</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#D4AF37;">${email}</a></td></tr>
                ${phone ? `<tr><td style="padding:8px 0; color:#888;">電話番号</td><td style="padding:8px 0;">${phone}</td></tr>` : ""}
                ${topic ? `<tr><td style="padding:8px 0; color:#888;">相談内容</td><td style="padding:8px 0;">${topic}</td></tr>` : ""}
              </table>
              ${message ? `<div style="margin-top:20px; padding-top:20px; border-top:1px solid #e0e0e0;"><p style="color:#888; font-size:13px; margin:0 0 8px;">メッセージ</p><p style="color:#333; line-height:1.7; white-space:pre-wrap;">${message}</p></div>` : ""}
            </div>
            <p style="text-align:center; margin-top:24px; font-size:12px; color:#aaa;">このメールは ZeiFlow 無料相談フォームから自動送信されました</p>
          </div>
        `,
      });

      // 自動返信
      await resend.emails.send({
        from,
        to: email,
        subject: "【ZeiFlow】無料相談のお申し込みを受け付けました",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">ZeiFlow</h1>
            </div>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
              <p style="color: #333; line-height: 1.8;">
                ${name} 様<br><br>
                無料相談のお申し込みありがとうございます。<br>
                内容を確認のうえ、<strong>1営業日以内</strong>にご連絡いたします。<br><br>
                お急ぎの場合は、直接メールにてご連絡ください。<br>
                <a href="mailto:keita.030312@gmail.com" style="color:#D4AF37;">keita.030312@gmail.com</a>
              </p>
            </div>
            <p style="text-align:center; margin-top:24px; font-size:12px; color:#aaa;">ZeiFlow — 税理士事務所向けAI仕訳管理システム</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact]", e);
    return NextResponse.json({ error: "送信に失敗しました。しばらく経ってから再度お試しください。" }, { status: 500 });
  }
}
