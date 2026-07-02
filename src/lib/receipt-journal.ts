import type { OcrProcessRow } from "@/lib/ocr-result-normalize";
import { parseJournalEntryDate } from "@/lib/ocr-result-normalize";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

export interface JournalCreateContext {
  clientId: string;
  userId: string;
  organizationId?: string | null;
  receiptId: string;
}

/** OCR結果1件 → prisma.journalEntry.create の data（3ルート共通） */
export function buildJournalCreateData(result: OcrProcessRow, ctx: JournalCreateContext) {
  const tr = result.classification.taxRate;
  return {
    date: parseJournalEntryDate(result.ocr.date),
    debitAccount: result.classification.debitAccount,
    creditAccount: result.classification.creditAccount,
    amount: result.classification.amount,
    taxAmount: result.classification.taxAmount ?? null,
    taxRate: typeof tr === "number" && Number.isFinite(tr) ? tr : null,
    description: result.classification.description,
    invoiceNumber: result.ocr.invoiceNumber || null,
    clientId: ctx.clientId,
    userId: ctx.userId,
    ...(ctx.organizationId ? { organizationId: ctx.organizationId } : {}),
    receiptId: ctx.receiptId,
  };
}

/** 画像の形式・サイズ検証。エラー時はメッセージ文字列、OKなら null（既存文言を厳守） */
export function validateUploadedImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "対応していない画像形式です。JPG / PNG / WEBP / GIF を選択してください。";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "画像サイズが大きすぎます。10MB以下の画像を選択してください。";
  }
  return null;
}
