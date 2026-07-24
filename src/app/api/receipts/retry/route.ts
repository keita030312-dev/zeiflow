import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { processReceipt } from "@/lib/ai/ocr";
import { preprocessForOcr } from "@/lib/image-preprocess";
import { reportError } from "@/lib/error-reporter";
import { buildJournalCreateData } from "@/lib/receipt-journal";
import { loadReceiptImage } from "@/lib/receipt-image";
import type { DocumentKind } from "@/generated/prisma/enums";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { receiptId } = await req.json();
  if (!receiptId) {
    return NextResponse.json({ error: "レシートIDが必要です" }, { status: 400 });
  }

  const scope = getScope(auth);
  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, ...scope },
  });

  if (!receipt) {
    return NextResponse.json({ error: "レシートが見つかりません" }, { status: 404 });
  }

  // Blob優先・imageDataフォールバックで画像を取得(移行前後どちらのレシートでも動く)
  const image = await loadReceiptImage(receipt);
  if (!image) {
    return NextResponse.json({ error: "画像データがありません" }, { status: 400 });
  }

  try {
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { status: "PROCESSING" },
    });

    // 再処理時もサーバー前処理を適用(精度向上)
    const preprocessed = await preprocessForOcr(image.buffer, image.mime);

    const docKind: DocumentKind = receipt.documentKind ?? "RECEIPT";

    const results = await processReceipt(
      preprocessed.base64,
      preprocessed.mimeType,
      auth.id,
      "fast",
      receipt.clientId,
      auth.orgId,
      docKind,
    );
    if (results.length === 0) {
      throw new Error("OCR結果が空です");
    }

    // 既存仕訳の置換とCOMPLETED化を一体で保存する。
    // 新規仕訳作成に失敗した場合は、削除した既存仕訳もロールバックされる。
    const createdJournals = await prisma.$transaction(async (tx) => {
      await tx.journalEntry.deleteMany({
        where: { receiptId, ...scope },
      });

      const created = [];
      for (const result of results) {
        created.push(
          await tx.journalEntry.create({
            data: buildJournalCreateData(result, {
              clientId: receipt.clientId,
              userId: auth.id,
              organizationId: auth.orgId,
              receiptId,
            }),
          }),
        );
      }

      // ocrRawはUIが単一オブジェクト前提で読むため先頭結果を保存する。
      await tx.receipt.update({
        where: { id: receiptId },
        data: {
          ocrRaw: JSON.stringify(results[0]?.ocr),
          status: "COMPLETED",
        },
      });
      return created;
    });

    return NextResponse.json({
      success: true,
      count: createdJournals.length,
      results: results.map((r) => ({ ocr: r.ocr, classification: r.classification })),
    });
  } catch (error) {
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { status: "ERROR" },
    });
    const message = error instanceof Error ? error.message : String(error);
    reportError(error instanceof Error ? error : new Error(message), { source: "receipts-retry" });
    return NextResponse.json({ error: "再処理に失敗しました: " + message }, { status: 500 });
  }
}
