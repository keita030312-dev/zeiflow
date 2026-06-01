import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalToken } from "@/lib/portal-auth";
import { processReceipt } from "@/lib/ai/ocr";
import { preprocessForOcr } from "@/lib/image-preprocess";
import { getClientIp } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-reporter";
import { parseDocumentKind } from "@/lib/document-kind";
import { isLikelyMissingSchemaColumn } from "@/lib/prisma-errors";
import { parseJournalEntryDate } from "@/lib/ocr-result-normalize";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const portal = await requirePortalToken(req);
  if (portal instanceof NextResponse) return portal;

  let receiptId: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentKind = parseDocumentKind(formData.get("documentKind"));
    // メインOCRはHaiku（速い）、登録番号は並列でSonnet（正確）が自動実行される
    const quality = "fast" as const;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルを選択してください" },
        { status: 400 }
      );
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "対応していない画像形式です。JPG / PNG / WEBP / GIF を選択してください。" },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "画像サイズが大きすぎます。10MB以下の画像を選択してください。" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalBase64 = buffer.toString("base64");
    // MIMEタイプを正規化（携帯からのアップロードで不正なMIMEが来ることがある）
    let originalMime = file.type || "image/jpeg";
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(originalMime)) {
      originalMime = "image/jpeg";
    }

    // サーバーサイド画像前処理(OCR精度向上のため。DBには元画像を保持)
    const preprocessed = await preprocessForOcr(buffer, originalMime);

    const baseReceiptData = {
      imagePath: `receipt-${Date.now()}.jpg`,
      imageData: originalBase64,
      imageMime: originalMime,
      clientId: portal.clientId,
      userId: portal.userId,
      ...(portal.organizationId ? { organizationId: portal.organizationId } : {}),
      status: "PROCESSING" as const,
    };

    let receipt;
    try {
      receipt = await prisma.receipt.create({
        data: { ...baseReceiptData, documentKind },
      });
    } catch (createErr) {
      if (isLikelyMissingSchemaColumn(createErr, "document_kind")) {
        receipt = await prisma.receipt.create({ data: baseReceiptData });
      } else {
        throw createErr;
      }
    }

    receiptId = receipt.id;

    // Claude Vision OCR（複数レシート対応・前処理済み画像を使用）
    const results = await processReceipt(
      preprocessed.base64,
      preprocessed.mimeType,
      portal.userId,
      quality,
      portal.clientId,
      portal.organizationId || undefined,
      documentKind,
    );

    if (results.length === 0) {
      throw new Error("OCR結果が空です");
    }

    // レシートにOCR結果を保存
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        ocrRaw: JSON.stringify(results[0]?.ocr),
        status: "COMPLETED",
      },
    });

    // 仕訳エントリ作成（複数レシート分）
    const journalEntries = [];
    for (const result of results) {
      const tr = result.classification.taxRate;
      const journalEntry = await prisma.journalEntry.create({
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
          clientId: portal.clientId,
          userId: portal.userId,
          ...(portal.organizationId ? { organizationId: portal.organizationId } : {}),
          receiptId: receipt.id,
        },
      });
      journalEntries.push(journalEntry);
    }

    const result = results[0];

    // 監査ログ
    await prisma.auditLog.create({
      data: {
        action: "PORTAL_RECEIPT_UPLOAD",
        detail: `ポータルからレシートアップロード: ${receipt.id}（${results.length}件の仕訳）`,
        ipAddress: ip,
        userId: portal.userId,
        ...(portal.organizationId ? { organizationId: portal.organizationId } : {}),
      },
    });

    return NextResponse.json({
      receiptId: receipt.id,
      status: "COMPLETED",
      count: results.length,
      ocr: {
        storeName: result.ocr.storeName,
        date: result.ocr.date,
        total: result.ocr.total,
        invoiceNumber: result.ocr.invoiceNumber || journalEntries[0]?.invoiceNumber || null,
      },
      journalEntry: {
        id: journalEntries[0].id,
        debitAccount: journalEntries[0].debitAccount,
        creditAccount: journalEntries[0].creditAccount,
        amount: journalEntries[0].amount,
        description: journalEntries[0].description,
      },
    });
  } catch (error) {
    console.error("Portal receipt error:", error);
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "portal-receipts" });
    if (receiptId) {
      await prisma.receipt.update({ where: { id: receiptId }, data: { status: "ERROR" } }).catch(() => {});
    }
    const message = error instanceof Error ? error.message : String(error);

    // APIキー未設定の場合のわかりやすいメッセージ
    if (message.includes("APIキー") || message.includes("api_key") || message.includes("authentication")) {
      return NextResponse.json(
        { error: "AIのAPIキーが設定されていません。税理士事務所にお問い合わせください。" },
        { status: 500 }
      );
    }

    if (isLikelyMissingSchemaColumn(error, "document_kind")) {
      return NextResponse.json(
        {
          error:
            "システムのデータベース更新が必要です。税理士事務所に npx prisma db push（document_kind 列）の実行を依頼してください。",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "レシートの処理に失敗しました: " + message },
      { status: 500 }
    );
  }
}
