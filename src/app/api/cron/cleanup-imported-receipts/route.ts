import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteReceiptImageBlob } from "@/lib/receipt-image";

const BATCH_SIZE = 100;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.receipt.findMany({
    where: { deleteAfter: { lte: new Date() } },
    orderBy: { deleteAfter: "asc" },
    take: BATCH_SIZE,
    select: { id: true, imagePath: true },
  });

  let deleted = 0;
  let failed = 0;
  for (const receipt of due) {
    // 1件の失敗でバッチ全体が落ちないよう、各受領の削除を個別に隔離する。
    try {
      const removed = await prisma.$transaction(async (tx) => {
        await tx.journalEntry.updateMany({
          where: { receiptId: receipt.id },
          data: { receiptId: null },
        });
        const result = await tx.receipt.deleteMany({
          where: { id: receipt.id, deleteAfter: { lte: new Date() } },
        });
        return result.count === 1;
      });
      if (removed) {
        await deleteReceiptImageBlob(receipt.imagePath);
        deleted += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(
        `cleanup-imported-receipts: failed to delete receipt ${receipt.id}:`,
        error,
      );
    }
  }

  return NextResponse.json({
    success: true,
    deleted,
    failed,
    remainingMayExist: due.length === BATCH_SIZE,
  });
}
