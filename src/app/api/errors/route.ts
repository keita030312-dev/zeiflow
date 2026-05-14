import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/error-reporter";

/**
 * クライアント側で発生したJavaScriptエラーを集約するエンドポイント。
 * GlobalError や ErrorBoundary から呼び出される。
 *
 * 受信したエラーはそのまま Sentry(設定されていれば)に転送し、
 * console にも出力(Vercel Logs から後追い可能)。
 *
 * 認証は不要(エラー報告は不正解析 < 可観測性 を優先)
 * ただしサイズ制限とレート制限相当の挙動で乱用を防ぐ。
 */
const MAX_BODY_SIZE = 8 * 1024; // 8KB

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_SIZE) {
      return NextResponse.json({ ok: false, reason: "too_large" }, { status: 413 });
    }
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
    }

    const message = String(body.message ?? "Client error");
    const stack = typeof body.stack === "string" ? body.stack : undefined;
    const url = typeof body.url === "string" ? body.url : undefined;
    const digest = typeof body.digest === "string" ? body.digest : undefined;
    const ua = req.headers.get("user-agent") || undefined;

    console.error("[client-error]", { message, url, digest, ua });

    const err = new Error(message);
    if (stack) err.stack = stack;
    await reportError(err, {
      source: "client",
      url,
      digest,
      ua,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[errors-api] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
