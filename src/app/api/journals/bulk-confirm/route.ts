import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { deleteReceiptImageBlob } from "@/lib/receipt-image";
import { z } from "zod";

const bulkConfirmSchema = z.object({
  ids: z.array(z.string()).min(1, "1つ以上の仕訳IDが必要です"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = bulkConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { ids } = parsed.data;

  const scope = getScope(auth);
  // 確定対象の仕訳を取得（レシートID付き）
  const journals = await prisma.journalEntry.findMany({
    where: { id: { in: ids }, ...scope },
    select: { id: true, receiptId: true },
  });

  const result = await prisma.journalEntry.updateMany({
    where: {
      id: { in: ids },
      ...scope,
    },
    data: {
      isConfirmed: true,
    },
  });

  // 確定した仕訳に紐づくレシートを削除（履歴から消去＆容量節約）
  // レシートに紐づく全仕訳が確定済みになった場合のみ削除
  const receiptIds = Array.from(new Set(journals.map((j) => j.receiptId).filter(Boolean))) as string[];
  if (receiptIds.length > 0) {
    for (const receiptId of receiptIds) {
      const remaining = await prisma.journalEntry.count({
        where: { receiptId, isConfirmed: false, ...scope },
      });
      if (remaining === 0) {
        // 仕訳からレシート参照を外してからレシートを削除（仕訳行は残る）
        await prisma.journalEntry.updateMany({
          where: { receiptId, ...scope },
          data: { receiptId: null },
        });
        const ownedReceipt = await prisma.receipt.findFirst({
          where: { id: receiptId, ...scope },
          select: { id: true, imagePath: true },
        });
        if (ownedReceipt) {
          await prisma.receipt.delete({ where: { id: receiptId } }).catch(() => {});
          await deleteReceiptImageBlob(ownedReceipt.imagePath);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    count: result.count,
  });
}
