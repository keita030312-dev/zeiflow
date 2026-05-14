import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { reportError } from "@/lib/error-reporter";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const scope = getScope(auth);

  // 基本統計
  const [clientCount, monthlyReceipts, unconfirmedCount, missingInvoiceCount, monthlyExports, totalJournals] = await Promise.all([
    prisma.client.count({ where: scope }),
    prisma.receipt.count({ where: { ...scope, uploadedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.journalEntry.count({ where: { ...scope, isConfirmed: false } }),
    prisma.journalEntry.count({ where: { ...scope, invoiceNumber: null } }),
    prisma.exportLog.count({ where: { ...scope, exportedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.journalEntry.count({ where: scope }),
  ]);

  // 過去6ヶ月の月別仕訳件数・金額
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const [count, entries] = await Promise.all([
      prisma.journalEntry.count({ where: { ...scope, date: { gte: start, lte: end } } }),
      prisma.journalEntry.aggregate({
        where: { ...scope, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);
    monthlyData.push({
      month: `${start.getMonth() + 1}月`,
      count,
      amount: entries._sum.amount || 0,
    });
  }

  // 科目別の集計（上位10）
  const recentJournals = await prisma.journalEntry.findMany({
    where: { ...scope, date: { gte: new Date(now.getFullYear(), now.getMonth() - 2, 1) } },
    select: { debitAccount: true, amount: true },
  });

  const accountTotals = new Map<string, number>();
  for (const j of recentJournals) {
    accountTotals.set(j.debitAccount, (accountTotals.get(j.debitAccount) || 0) + j.amount);
  }
  const topAccounts = Array.from(accountTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([account, total]) => ({ account, total }));

  // エラーレシート数
  const errorReceipts = await prisma.receipt.count({ where: { ...scope, status: "ERROR" } });

  return NextResponse.json({
    clientCount, monthlyReceipts, unconfirmedCount, missingInvoiceCount,
    monthlyExports, totalJournals, errorReceipts,
    monthlyData, topAccounts,
  });
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "dashboard" });
    return NextResponse.json({ error: "ダッシュボードの取得に失敗しました" }, { status: 500 });
  }
}
