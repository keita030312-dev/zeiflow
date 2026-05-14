import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { processReceipt } from "@/lib/ai/ocr";
import { preprocessForOcr } from "@/lib/image-preprocess";
import { reportError } from "@/lib/error-reporter";
import { parseJournalEntryDate } from "@/lib/ocr-result-normalize";
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

  if (!receipt.imageData) {
    return NextResponse.json({ error: "画像データがありません" }, { status: 400 });
  }

  try {
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { status: "PROCESSING" },
    });

    // 再処理時もサーバー前処理を適用(精度向上)
    const originalBuffer = Buffer.from(receipt.imageData, "base64");
    const preprocessed = await preprocessForOcr(originalBuffer, receipt.imageMime || "image/jpeg");

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

    // ocrRaw は UI 側(dashboard/receipts page の getStoreName)が単一オブジェクト前提で
     // parsed.storeName を読むため、normal upload / portal upload と同じ単一形式を保つ。
     // マルチレシート画像でも全件の仕訳は下の Promise.all で作成されるので情報は失わない。
    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        ocrRaw: JSON.stringify(results[0]?.ocr),
        status: "COMPLETED",
      },
    });

    // retry なので既存仕訳を一旦全削除して再作成（results が増減しても整合性を保つ）
    await prisma.journalEntry.deleteMany({
      where: { receiptId },
    });

    const createdJournals = await Promise.all(
      results.map((result) => {
        const tr = result.classification.taxRate;
        return prisma.journalEntry.create({
          data: {
            date: parseJournalEntryDate(result.ocr.date),
            debitAccount: result.classification.debitAccount,
            creditAccount: result.classification.creditAccount,
            amount: result.classification.amount,
            taxAmount: result.classification.taxAmount ?? null,
            taxRate:
              typeof tr === "number" && Number.isFinite(tr) ? tr : null,
            description: result.classification.description,
            invoiceNumber: result.ocr.invoiceNumber || null,
            clientId: receipt.clientId,
            userId: auth.id,
            ...(auth.orgId ? { organizationId: auth.orgId } : {}),
            receiptId,
          },
        });
      })
    );

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
