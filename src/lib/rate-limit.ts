import { NextRequest, NextResponse } from "next/server";
import { getRateLimitType, isRateLimited } from "@/lib/rate-limit-core";

export { getRateLimitType, isRateLimited } from "@/lib/rate-limit-core";

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Proxyで使うレート制限チェック。
 * メモリ内カウンターは単一実行インスタンス内の過負荷防止用。
 */
export function checkRateLimit(req: NextRequest): NextResponse | null {
  const ip = getClientIp(req);
  const type = getRateLimitType(req.method, req.nextUrl.pathname);

  if (isRateLimited(ip, type)) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく待ってからお試しください。" },
      { status: 429 },
    );
  }

  return null;
}
