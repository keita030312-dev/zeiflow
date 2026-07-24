import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const publicPaths = ["/", "/login", "/login.html", "/register", "/terms", "/privacy", "/forgot-password", "/reset-password", "/api/auth/login", "/api/auth/register", "/api/auth/login-form", "/api/auth/reset-request", "/api/auth/reset-password", "/api/contact", "/api/go/anthropic", "/portal", "/api/health", "/api/errors", "/superadmin", "/api/superadmin", "/api/admin/migrate-import-retention", "/api/cron/cleanup-imported-receipts"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的ファイルはスキップ
  // manifest.json を通すと /login へ307され、ブラウザが
  // 「Manifest: Syntax error」を全ページで出す
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // APIへのレート制限（公開パス判定より先に実行）
  // 過去に publicPaths bypass で /api/auth/login, register, reset-request, /api/portal/* が
  // rate limit をスキップしてしまい、ブルートフォース・DDoS が可能だった
  if (pathname.startsWith("/api/")) {
    const rateLimitResponse = checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  // 公開パス（認証スキップ。rate limit は上で適用済み）
  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/api/portal/") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/api/superadmin") ||
    pathname === "/api/maintenance"
  ) {
    return NextResponse.next();
  }

  // 認証チェック
  const token = request.cookies.get("token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
