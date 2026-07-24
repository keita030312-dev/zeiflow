import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalToken } from "@/lib/portal-auth";
import { deleteReceiptImageBlob } from "@/lib/receipt-image";

export async function POST(req: NextRequest) {
  const portal = await requirePortalToken(req);
  if (portal instanceof NextResponse) return portal;

  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "確定する仕訳IDを指定してください" },
        { status: 400 }
      );
    }

    // 確定対象の仕訳を取得（レシートID付き）
    const journals = await prisma.journalEntry.findMany({
      where: { id: { in: ids }, clientId: portal.clientId },
      select: { id: true, receiptId: true },
    });

    // このクライアントの仕訳のみ確定できる
    const result = await prisma.journalEntry.updateMany({
      where: {
        id: { in: ids },
        clientId: portal.clientId,
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
          where: { receiptId, isConfirmed: false },
        });
        if (remaining === 0) {
          await prisma.journalEntry.updateMany({
            where: { receiptId },
            data: { receiptId: null },
          });
          const target = await prisma.receipt.findUnique({
            where: { id: receiptId },
            select: { imagePath: true },
          });
          // 行削除が成立した場合のみBlobを消す(失敗時に画像だけ喪失させない)
          const deleted = await prisma.receipt
            .delete({ where: { id: receiptId } })
            .then(() => true)
            .catch(() => false);
          if (deleted) await deleteReceiptImageBlob(target?.imagePath);
        }
      }
    }

    // 監査ログ
    await prisma.auditLog.create({
      data: {
        action: "PORTAL_JOURNAL_CONFIRM",
        detail: `ポータルから仕訳確定: ${result.count}件`,
        userId: portal.userId,
        ...(portal.organizationId ? { organizationId: portal.organizationId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("Portal confirm error:", error);
    return NextResponse.json(
      { error: "確定処理に失敗しました" },
      { status: 500 }
    );
  }
}
