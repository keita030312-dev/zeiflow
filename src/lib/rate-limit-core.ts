interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const LIMITS = {
  auth: { max: 5, windowMs: 15 * 60 * 1000 },              // 認証: 5回/15分
  api: { max: 60, windowMs: 60 * 1000 },                    // 一般API: 60回/分
  receiptUpload: { max: 20, windowMs: 15 * 60 * 1000 },     // 新規OCR: 20枚/15分
  receiptRetry: { max: 20, windowMs: 15 * 60 * 1000 },      // OCR再試行: 20枚/15分
  knowledgeUpload: { max: 20, windowMs: 15 * 60 * 1000 },   // ナレッジ投入: 20件/15分
} as const;

export type RateLimitType = keyof typeof LIMITS;

const rateLimitMaps: Record<RateLimitType, Map<string, RateLimitEntry>> = {
  auth: new Map(),
  api: new Map(),
  receiptUpload: new Map(),
  receiptRetry: new Map(),
  knowledgeUpload: new Map(),
};

export function isRateLimited(ip: string, type: RateLimitType = "api"): boolean {
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

function isExactPath(pathname: string, path: string): boolean {
  return pathname === path || pathname === `${path}/`;
}

/**
 * 新規OCR・再試行・ナレッジ登録を別々に数える。
 * GET/DELETEまで新規OCR枠で数えると、画面表示1回+20枚POSTだけで上限を超える。
 */
export function getRateLimitType(method: string, pathname: string): RateLimitType {
  const normalizedMethod = method.toUpperCase();

  if (
    isExactPath(pathname, "/api/auth/login") ||
    isExactPath(pathname, "/api/auth/login-form") ||
    isExactPath(pathname, "/api/auth/register") ||
    isExactPath(pathname, "/api/auth/reset-request") ||
    isExactPath(pathname, "/api/auth/reset-password")
  ) {
    return "auth";
  }

  if (normalizedMethod === "POST") {
    if (
      isExactPath(pathname, "/api/receipts") ||
      isExactPath(pathname, "/api/portal/receipts")
    ) {
      return "receiptUpload";
    }
    if (isExactPath(pathname, "/api/receipts/retry")) {
      return "receiptRetry";
    }
    if (isExactPath(pathname, "/api/knowledge")) {
      return "knowledgeUpload";
    }
  }

  return "api";
}
