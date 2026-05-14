import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";

/**
 * 自己監視用の統計エンドポイント
 * GET /api/stats — 管理者・スタッフが現状を一目で把握するための集計
 *
 * 「管理ほぼ不要」運用のため、以下を返す:
 * - 過去24時間のレシート処理件数(完了/エラー/処理中)
 * - 詰まり(PROCESSING状態のまま5分以上経過)している件数
 * - 直近の監査ログ件数
 * - 顧客数、ナレッジファイル数
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const scope = getScope(auth);
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since5min = new Date(now.getTime() - 5 * 60 * 1000);

  const [
    totalReceipts24h,
    completedReceipts24h,
    errorReceipts24h,
    stuckProcessing,
    auditCount24h,
    clientCount,
    knowledgeCount,
    confirmedJournals24h,
  ] = await Promise.all([
    prisma.receipt.count({ where: { ...scope, uploadedAt: { gte: since24h } } }),
    prisma.receipt.count({
      where: { ...scope, uploadedAt: { gte: since24h }, status: "COMPLETED" },
    }),
    prisma.receipt.count({
      where: { ...scope, uploadedAt: { gte: since24h }, status: "ERROR" },
    }),
    prisma.receipt.count({
      where: { ...scope, status: "PROCESSING", uploadedAt: { lt: since5min } },
    }),
    prisma.auditLog.count({
      where: { ...scope, createdAt: { gte: since24h } },
    }),
    prisma.client.count({ where: scope }),
    prisma.knowledgeFile.count({ where: scope }),
    prisma.journalEntry.count({
      where: { ...scope, isConfirmed: true, updatedAt: { gte: since24h } },
    }),
  ]);

  const errorRate24h =
    totalReceipts24h > 0
      ? Math.round((errorReceipts24h / totalReceipts24h) * 1000) / 10 // %小数1桁
      : 0;
  const successRate24h =
    totalReceipts24h > 0
      ? Math.round((completedReceipts24h / totalReceipts24h) * 1000) / 10
      : null;

  const warnings: string[] = [];
  if (stuckProcessing > 0) {
    warnings.push(`${stuckProcessing}件のレシートが5分以上PROCESSING状態。/api/receipts/retry で再処理を推奨`);
  }
  if (errorRate24h > 10) {
    warnings.push(`過去24時間のエラー率が${errorRate24h}%。Anthropic API状態またはOCRプロンプトを確認`);
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    window: "last 24h",
    receipts: {
      total: totalReceipts24h,
      completed: completedReceipts24h,
      error: errorReceipts24h,
      stuck_processing: stuckProcessing,
      success_rate_pct: successRate24h,
      error_rate_pct: errorRate24h,
    },
    activity: {
      audit_logs_24h: auditCount24h,
      confirmed_journals_24h: confirmedJournals24h,
    },
    inventory: {
      clients: clientCount,
      knowledge_files: knowledgeCount,
    },
    warnings,
    health_url: "/api/health?deep=1",
  });
}
