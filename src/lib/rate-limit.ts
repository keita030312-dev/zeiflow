import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// エンドポイント種別ごとのレート制限設定
const LIMITS = {
  auth: { max: 5, windowMs: 15 * 60 * 1000 },      // ログイン: 5回/15分
  api: { max: 60, windowMs: 60 * 1000 },             // 一般API: 60回/分
  upload: { max: 20, windowMs: 15 * 60 * 1000 },     // アップロード: 20回/15分
} as const;

const rateLimitMaps = {
  auth: new Map<string, RateLimitEntry>(),
  api: new Map<string, RateLimitEntry>(),
  upload: new Map<string, RateLimitEntry>(),
};

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function isRateLimited(ip: string, type: keyof typeof LIMITS = "api"): boolean {
  const now = Date.now();
  const map = rateLimitMaps[type];
  const limit = LIMITS[type];
  const entry = map.get(ip);

  if (!entry || now > entry.resetTime) {
    map.set(ip, { count: 1, resetTime: now + limit.windowMs });
    return false;
  }

  entry.count++;
  return entry.count > limit.max;
}

/**
 * ミドルウェアで使うレート制限チェック
 */
export function checkRateLimit(req: NextRequest): NextResponse | null {
  const ip = getClientIp(req);
  const { pathname } = req.nextUrl;

  let type: keyof typeof LIMITS = "api";
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/register")) {
    type = "auth";
  } else if (pathname.startsWith("/api/receipts") || pathname.startsWith("/api/portal/receipts") || pathname.startsWith("/api/knowledge")) {
    type = "upload";
  }

  if (isRateLimited(ip, type)) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく待ってからお試しください。" },
      { status: 429 }
    );
  }

  return null;
}
