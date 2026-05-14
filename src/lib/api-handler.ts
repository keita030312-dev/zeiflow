import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/error-reporter";

/**
 * APIルートのエラーハンドリングラッパー
 * try/catchを共通化して、未処理のエラーをキャッチ＋Sentry報告
 */
export function withErrorHandler(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error(`API Error [${req.nextUrl.pathname}]:`, error);
      reportError(
        error instanceof Error ? error : new Error(String(error)),
        { source: req.nextUrl.pathname }
      );
      return NextResponse.json(
        { error: "サーバーエラーが発生しました" },
        { status: 500 }
      );
    }
  };
}
