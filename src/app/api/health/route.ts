import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface CheckResult {
  ok: boolean;
  latencyMs?: number;
  message?: string;
}

async function check(name: string, fn: () => Promise<void>, timeoutMs = 5000): Promise<CheckResult> {
  const start = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`${name} check timeout (${timeoutMs}ms)`)), timeoutMs),
      ),
    ]);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * GET /api/health
 * - 既定: シンプル(DB接続のみ・高速・UptimeRobot等の外部監視向け)
 * - ?deep=1: 深いヘルスチェック(DB+環境変数+Anthropic API疎通)。管理画面・障害切り分け用
 */
export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get("deep") === "1";

  // deep モードは管理者専用(env 漏洩・外部 API 誘発を防ぐ)
  // simple モード(/api/health のみ)は UptimeRobot 等のため public のまま
  if (deep) {
    const envSecret = process.env.SUPER_ADMIN_SECRET;
    const headerSecret = req.headers.get("x-admin-secret");
    if (
      !envSecret ||
      !headerSecret ||
      headerSecret.replace(/"/g, "").trim() !== envSecret.replace(/"/g, "").trim()
    ) {
      return NextResponse.json(
        { error: "deep health check requires admin authentication" },
        { status: 401 },
      );
    }
  }

  const dbCheck = await check("db", async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  if (!deep) {
    return NextResponse.json(
      {
        status: dbCheck.ok ? "ok" : "error",
        timestamp: new Date().toISOString(),
        db: dbCheck.ok ? "connected" : "disconnected",
      },
      { status: dbCheck.ok ? 200 : 503 },
    );
  }

  // ===== Deep health check =====
  const envCheck: CheckResult = {
    ok: true,
    message: undefined,
  };
  const requiredEnvs = [
    "DATABASE_URL",
    "ANTHROPIC_API_KEY",
    "NEXTAUTH_SECRET",
    "BLOB_READ_WRITE_TOKEN",
  ];
  const missing = requiredEnvs.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    envCheck.ok = false;
    envCheck.message = `Missing env vars: ${missing.join(", ")}`;
  }

  const anthropicCheck = await check(
    "anthropic",
    async () => {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key || !key.startsWith("sk-ant-")) {
        throw new Error("ANTHROPIC_API_KEY missing or invalid");
      }
      // 軽量な疎通確認(404でもAPI到達はOK)
      const res = await fetch("https://api.anthropic.com/v1/models", {
        method: "GET",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      });
      if (res.status >= 500) {
        throw new Error(`Anthropic API returned ${res.status}`);
      }
    },
    8000,
  );

  const resendCheck: CheckResult = process.env.RESEND_API_KEY
    ? await check(
        "resend",
        async () => {
          const res = await fetch("https://api.resend.com/domains", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
          });
          if (res.status >= 500) {
            throw new Error(`Resend API returned ${res.status}`);
          }
        },
        5000,
      )
    : { ok: true, message: "not configured" };

  const allOk = dbCheck.ok && envCheck.ok && anthropicCheck.ok && resendCheck.ok;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        db: dbCheck,
        env: envCheck,
        anthropic: anthropicCheck,
        resend: resendCheck,
      },
    },
    { status: allOk ? 200 : 503 },
  );
}
