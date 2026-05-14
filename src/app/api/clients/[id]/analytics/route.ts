import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { reportError } from "@/lib/error-reporter";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const scope = getScope(auth);

  // クライアント存在確認
  try {
  const client = await prisma.client.findFirst({
    where: { id, ...scope },
  });
  if (!client) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }

  const now = new Date();

  // 基本統計
  const [totalJournals, unconfirmedCount, totalReceipts, errorReceipts, confirmedCount] = await Promise.all([
    prisma.journalEntry.count({ where: { clientId: id } }),
    prisma.journalEntry.count({ where: { clientId: id, isConfirmed: false } }),
    prisma.receipt.count({ where: { clientId: id } }),
    prisma.receipt.count({ where: { clientId: id, status: "ERROR" } }),
    prisma.journalEntry.count({ where: { clientId: id, isConfirmed: true } }),
  ]);

  // インボイス統計
  const [withInvoice, withoutInvoice] = await Promise.all([
    prisma.journalEntry.count({ where: { clientId: id, invoiceNumber: { not: null } } }),
    prisma.journalEntry.count({ where: { clientId: id, invoiceNumber: null } }),
  ]);

  // 月別推移（過去12ヶ月）
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const [count, agg] = await Promise.all([
      prisma.journalEntry.count({ where: { clientId: id, date: { gte: start, lte: end } } }),
      prisma.journalEntry.aggregate({
        where: { clientId: id, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);
    monthlyData.push({
      month: `${start.getFullYear()}/${start.getMonth() + 1}`,
      label: `${start.getMonth() + 1}月`,
      count,
      amount: agg._sum.amount || 0,
    });
  }

  // 科目別集計（全期間）
  const allJournals = await prisma.journalEntry.findMany({
    where: { clientId: id },
    select: { debitAccount: true, amount: true },
  });
  const accountTotals = new Map<string, { total: number; count: number }>();
  for (const j of allJournals) {
    const existing = accountTotals.get(j.debitAccount);
    if (existing) {
      existing.total += j.amount;
      existing.count++;
    } else {
      accountTotals.set(j.debitAccount, { total: j.amount, count: 1 });
    }
  }
  const topAccounts = Array.from(accountTotals.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([account, data]) => ({ account, total: data.total, count: data.count }));

  // 最近の仕訳（直近10件）
  const recentJournals = await prisma.journalEntry.findMany({
    where: { clientId: id },
    orderBy: { date: "desc" },
    take: 10,
    select: {
      id: true,
      date: true,
      debitAccount: true,
      creditAccount: true,
      amount: true,
      description: true,
      isConfirmed: true,
      invoiceNumber: true,
    },
  });

  // 合計金額
  const totalAmount = await prisma.journalEntry.aggregate({
    where: { clientId: id },
    _sum: { amount: true },
  });

  return NextResponse.json({
    client: { id: client.id, name: client.name, code: client.code, clientType: client.clientType, taxType: client.taxType, fiscalYearStart: client.fiscalYearStart, invoiceRegNumber: client.invoiceRegNumber },
    stats: {
      totalJournals,
      confirmedCount,
      unconfirmedCount,
      totalReceipts,
      errorReceipts,
      withInvoice,
      withoutInvoice,
      invoiceRate: totalJournals > 0 ? Math.round((withInvoice / totalJournals) * 100) : 0,
      confirmRate: totalJournals > 0 ? Math.round((confirmedCount / totalJournals) * 100) : 0,
      totalAmount: totalAmount._sum.amount || 0,
    },
    monthlyData,
    topAccounts,
    recentJournals,
  });
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "analytics" });
    return NextResponse.json({ error: "分析データの取得に失敗しました" }, { status: 500 });
  }
}
