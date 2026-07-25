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
    where: {
      ...getScope(auth),
      exportedJournals: { some: {} },
    },
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエスト形式が正しくありません" }, { status: 400 });
  }
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "出力履歴を指定してください" }, { status: 400 });
  }

  const scope = getScope(auth);
  const exportLog = await prisma.exportLog.findFirst({
    where: { id: parsed.data.exportLogId, ...scope },
    include: {
      exportedJournals: {
        select: {
          journalEntryId: true,
          journalUpdatedAt: true,
          receiptId: true,
        },
      },
    },
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
  if (exportLog.exportedJournals.length === 0) {
    return NextResponse.json(
      { error: "この出力履歴は取込完了の対象外です。CSVを再出力してください" },
      { status: 409 },
    );
  }
  const exportedJournalVersions = new Map(
    exportLog.exportedJournals.map((item) => [
      item.journalEntryId,
      item.journalUpdatedAt,
    ]),
  );
  const exportedJournalIds = new Set(exportedJournalVersions.keys());
  const snapshotIdsByReceipt = new Map<string, Set<string>>();
  for (const item of exportLog.exportedJournals) {
    if (!item.receiptId) continue;
    const ids = snapshotIdsByReceipt.get(item.receiptId) ?? new Set<string>();
    ids.add(item.journalEntryId);
    snapshotIdsByReceipt.set(item.receiptId, ids);
  }
  const candidates = await prisma.receipt.findMany({
    where: {
      clientId: exportLog.clientId,
      ...scope,
      id: { in: [...snapshotIdsByReceipt.keys()] },
    },
    select: {
      id: true,
      journalEntries: {
        select: { id: true, updatedAt: true },
      },
    },
  });

  // 一枚から複数仕訳が生じる場合も、全仕訳が当該CSVへ実際に含まれ、
  // CSV出力後に編集されていないレシートだけを削除予約する。
  const receiptIds = candidates
    .filter(({ id, journalEntries }) => {
      const snapshotIds = snapshotIdsByReceipt.get(id);
      return (
        snapshotIds &&
        journalEntries.length === snapshotIds.size &&
        journalEntries.every(
          (entry) =>
            snapshotIds.has(entry.id) &&
            exportedJournalIds.has(entry.id) &&
            entry.updatedAt <= exportedJournalVersions.get(entry.id)!,
        )
      );
    })
    .map(({ id }) => id);

  const importedAt = new Date();
  const deleteAfter = new Date(importedAt);
  deleteAfter.setUTCDate(deleteAfter.getUTCDate() + RETENTION_DAYS_AFTER_IMPORT);

  const ALREADY_CONFIRMED = "既に取込完了確認されています";
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.exportLog.updateMany({
        where: {
          id: exportLog.id,
          ...scope,
          importConfirmedAt: null,
        },
        data: { importConfirmedAt: importedAt, deleteAfter },
      });
      if (updated.count !== 1) throw new Error(ALREADY_CONFIRMED);

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
  } catch (e) {
    if (e instanceof Error && e.message === ALREADY_CONFIRMED) {
      return NextResponse.json({ error: ALREADY_CONFIRMED }, { status: 409 });
    }
    console.error("import-confirmation failed:", e);
    return NextResponse.json(
      { error: "取込完了の記録に失敗しました。もう一度お試しください" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    scheduledReceiptCount: receiptIds.length,
    deleteAfter,
  });
}
