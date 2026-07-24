import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalToken } from "@/lib/portal-auth";
import { processReceipt } from "@/lib/ai/ocr";
import {
  preprocessForOcr,
  compressForStorage,
  STORAGE_MAX_WIDTH_RECEIPT,
  STORAGE_MAX_WIDTH_INVOICE,
} from "@/lib/image-preprocess";
import { getClientIp } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-reporter";
import { parseDocumentKind } from "@/lib/document-kind";
import { isLikelyMissingSchemaColumn } from "@/lib/prisma-errors";
import { buildJournalCreateData, validateUploadedImage } from "@/lib/receipt-journal";
import {
  uploadReceiptImageToBlob,
  deleteReceiptImageBlob,
  isReceiptImageStorageError,
} from "@/lib/receipt-image";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const portal = await requirePortalToken(req);
  if (portal instanceof NextResponse) return portal;

  let receiptId: string | null = null;
  let blobUrl: string | null = null;
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
    const fileError = validateUploadedImage(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    // MIMEタイプを正規化（携帯からのアップロードで不正なMIMEが来ることがある）
    let originalMime = file.type || "image/jpeg";
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(originalMime)) {
      originalMime = "image/jpeg";
    }

    // サーバーサイド画像前処理(OCR精度向上)。DB保存は軽量化した画像(容量上限対策)
    // A4請求書は電帳法の200dpi相当を満たす幅で保存する
    const storageWidth =
      documentKind === "INVOICE" ? STORAGE_MAX_WIDTH_INVOICE : STORAGE_MAX_WIDTH_RECEIPT;
    const [preprocessed, storage] = await Promise.all([
      preprocessForOcr(buffer, originalMime),
      compressForStorage(buffer, originalMime, storageWidth),
    ]);

    // 画像本体はprivate Vercel Blobへ。本番では失敗時にDBへ退避せず503を返す。
    blobUrl = await uploadReceiptImageToBlob(storage.base64, storage.mimeType);

    const baseReceiptData = {
      imagePath: blobUrl ?? `receipt-${Date.now()}.jpg`,
      imageData: blobUrl ? null : storage.base64,
      imageMime: storage.mimeType,
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

    // 仕訳作成・レシート完了・監査ログを一体で保存し、部分成功を残さない。
    const journalEntries = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const result of results) {
        created.push(
          await tx.journalEntry.create({
            data: buildJournalCreateData(result, {
              clientId: portal.clientId,
              userId: portal.userId,
              organizationId: portal.organizationId,
              receiptId: receipt.id,
            }),
          }),
        );
      }

      await tx.receipt.update({
        where: { id: receipt.id },
        data: {
          ocrRaw: JSON.stringify(results[0]?.ocr),
          status: "COMPLETED",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PORTAL_RECEIPT_UPLOAD",
          detail: `ポータルからレシートアップロード: ${receipt.id}（${results.length}件の仕訳）`,
          ipAddress: ip,
          userId: portal.userId,
          ...(portal.organizationId ? { organizationId: portal.organizationId } : {}),
        },
      });
      return created;
    });

    const result = results[0];

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
    } else {
      // レシート行が作られる前に失敗した場合はBlobを孤児にしない
      await deleteReceiptImageBlob(blobUrl);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (isReceiptImageStorageError(error)) {
      return NextResponse.json(
        { error: "画像ストレージを一時的に利用できません。時間をおいて再度お試しください。" },
        { status: 503 },
      );
    }

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
