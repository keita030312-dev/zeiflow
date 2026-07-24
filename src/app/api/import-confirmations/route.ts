import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getScope, requireAuth } from "@/lib/auth-middleware";

const RETENTION_DAYS_AFTER_IMPORT = 30;

const confirmSchema = z.object({
  exportLogId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const logs = await prisma.exportLog.findMany({
    where: getScope(auth),
    orderBy: { exportedAt: "desc" },
    take: 30,
    select: {
      id: true,
      format: true,
      periodStart: true,
      periodEnd: true,
      recordCount: true,
      exportedAt: true,
      importConfirmedAt: true,
      deleteAfter: true,
      client: { select: { name: true, code: true } },
    },
  });

  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = confirmSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "出力履歴を指定してください" }, { status: 400 });
  }

  const scope = getScope(auth);
  const exportLog = await prisma.exportLog.findFirst({
    where: { id: parsed.data.exportLogId, ...scope },
  });
  if (!exportLog) {
    return NextResponse.json({ error: "出力履歴が見つかりません" }, { status: 404 });
  }
  if (exportLog.importConfirmedAt) {
    return NextResponse.json(
      { error: "この出力は取込完了確認済みです" },
      { status: 409 },
    );
  }

  const candidates = await prisma.receipt.findMany({
    where: {
      clientId: exportLog.clientId,
      ...scope,
      journalEntries: {
        some: {
          date: { gte: exportLog.periodStart, lte: exportLog.periodEnd },
          updatedAt: { lte: exportLog.exportedAt },
        },
      },
    },
    select: {
      id: true,
      journalEntries: {
        select: { date: true, updatedAt: true, isConfirmed: true },
      },
    },
  });

  // 一枚から複数仕訳が生じる場合も、全仕訳が当該CSVに含まれ確定済みの
  // レシートだけを削除予約する。部分出力された画像は残す。
  const receiptIds = candidates
    .filter(({ journalEntries }) =>
      journalEntries.length > 0 &&
      journalEntries.every(
        (entry) =>
          entry.isConfirmed &&
          entry.date >= exportLog.periodStart &&
          entry.date <= exportLog.periodEnd &&
          entry.updatedAt <= exportLog.exportedAt,
      ),
    )
    .map(({ id }) => id);

  const importedAt = new Date();
  const deleteAfter = new Date(importedAt);
  deleteAfter.setUTCDate(deleteAfter.getUTCDate() + RETENTION_DAYS_AFTER_IMPORT);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.exportLog.updateMany({
      where: {
        id: exportLog.id,
        ...scope,
        importConfirmedAt: null,
      },
      data: { importConfirmedAt: importedAt, deleteAfter },
    });
    if (updated.count !== 1) throw new Error("既に取込完了確認されています");

    if (receiptIds.length > 0) {
      await tx.receipt.updateMany({
        where: { id: { in: receiptIds }, ...scope },
        data: { importedAt, deleteAfter },
      });
    }
    await tx.auditLog.create({
      data: {
        action: "ACCOUNTING_IMPORT_CONFIRMED",
        detail: `会計ソフト取込完了: 出力${exportLog.id}、画像${receiptIds.length}件、削除予定${deleteAfter.toISOString()}`,
        userId: auth.id,
        ...(auth.orgId ? { organizationId: auth.orgId } : {}),
      },
    });
  });

  return NextResponse.json({
    success: true,
    scheduledReceiptCount: receiptIds.length,
    deleteAfter,
  });
}
