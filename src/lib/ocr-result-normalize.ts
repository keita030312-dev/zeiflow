import type { ClassificationResult, OcrResult } from "@/types";

export function toSafeInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return Math.round(n);
  }
  return 0;
}

function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

/** Prisma journalEntry.date 用（無効なら今日） */
export function parseJournalEntryDate(value: unknown): Date {
  if (typeof value !== "string" || !value.trim()) return new Date();
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

export type OcrProcessRow = {
  ocr: OcrResult;
  classification: ClassificationResult;
};

/**
 * AIのJSONが欠損・型崩れしていても、以降の処理とDB書き込みが落ちない形に整える。
 */
export function ensureOcrResultShape(input: unknown): OcrProcessRow {
  const base =
    input != null && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const ocrRaw = base.ocr != null && typeof base.ocr === "object" ? (base.ocr as Record<string, unknown>) : {};
  const clsRaw =
    base.classification != null && typeof base.classification === "object"
      ? (base.classification as Record<string, unknown>)
      : {};

  const storeName =
    typeof ocrRaw.storeName === "string" && ocrRaw.storeName.trim()
      ? ocrRaw.storeName.trim()
      : "（名称未取得）";

  let date = typeof ocrRaw.date === "string" && ocrRaw.date.trim() ? ocrRaw.date.trim() : todayIsoDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayIsoDate();
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) date = todayIsoDate();

  const itemsIn = Array.isArray(ocrRaw.items) ? ocrRaw.items : [];
  const items = itemsIn.map((it: unknown) => {
    const row = it != null && typeof it === "object" ? (it as Record<string, unknown>) : {};
    const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : "明細";
    const amount = Math.max(0, toSafeInt(row.amount));
    let lineTax = 0.1;
    const tr = row.taxRate;
    if (typeof tr === "number" && Number.isFinite(tr)) lineTax = tr;
    return { name, amount, taxRate: lineTax };
  });
  if (items.length === 0) {
    items.push({ name: "合計", amount: 0, taxRate: 0.1 });
  }

  let total = toSafeInt(ocrRaw.total);
  if (total <= 0) {
    const sum = items.reduce((s, i) => s + i.amount, 0);
    total = sum > 0 ? sum : 1;
    items[0] = { ...items[0], amount: total };
  }

  const taxTotalRaw = ocrRaw.taxTotal;
  const taxTotal =
    taxTotalRaw === null || taxTotalRaw === undefined
      ? undefined
      : Math.max(0, toSafeInt(taxTotalRaw));

  const paymentMethod =
    typeof ocrRaw.paymentMethod === "string" && ocrRaw.paymentMethod.trim()
      ? ocrRaw.paymentMethod.trim()
      : "不明";

  const rawText =
    typeof ocrRaw.rawText === "string" ? ocrRaw.rawText : typeof ocrRaw.rawText === "number" ? String(ocrRaw.rawText) : "";

  const inv = ocrRaw.invoiceNumber;
  const invoiceNumber =
    inv === null || inv === undefined || inv === ""
      ? null
      : typeof inv === "string"
        ? inv
        : String(inv);

  const dueDate =
    ocrRaw.dueDate === null || ocrRaw.dueDate === undefined || ocrRaw.dueDate === ""
      ? null
      : typeof ocrRaw.dueDate === "string"
        ? ocrRaw.dueDate
        : null;
  const documentNo =
    ocrRaw.documentNo === null || ocrRaw.documentNo === undefined || ocrRaw.documentNo === ""
      ? null
      : typeof ocrRaw.documentNo === "string"
        ? ocrRaw.documentNo
        : String(ocrRaw.documentNo);
  const purpose =
    ocrRaw.purpose === null || ocrRaw.purpose === undefined || ocrRaw.purpose === ""
      ? null
      : typeof ocrRaw.purpose === "string"
        ? ocrRaw.purpose
        : String(ocrRaw.purpose);

  const fcIn =
    ocrRaw.fieldConfidence != null && typeof ocrRaw.fieldConfidence === "object"
      ? (ocrRaw.fieldConfidence as Record<string, unknown>)
      : {};
  const fieldConfidence: NonNullable<OcrResult["fieldConfidence"]> = {};
  for (const k of [
    "storeName",
    "date",
    "total",
    "taxTotal",
    "invoiceNumber",
    "paymentMethod",
    "dueDate",
    "documentNo",
    "purpose",
  ] as const) {
    const v = fcIn[k];
    if (typeof v === "number" && Number.isFinite(v)) fieldConfidence[k] = Math.min(1, Math.max(0, v));
  }

  const debitAccount =
    typeof clsRaw.debitAccount === "string" && clsRaw.debitAccount.trim()
      ? clsRaw.debitAccount.trim()
      : "雑費";
  const creditAccount =
    typeof clsRaw.creditAccount === "string" && clsRaw.creditAccount.trim()
      ? clsRaw.creditAccount.trim()
      : "現金";

  let amount = toSafeInt(clsRaw.amount);
  if (amount <= 0) amount = total > 0 ? total : 1;

  let taxAmountOut: number | undefined;
  if (clsRaw.taxAmount !== null && clsRaw.taxAmount !== undefined) {
    const ta = toSafeInt(clsRaw.taxAmount);
    taxAmountOut = ta >= 0 ? ta : undefined;
  } else if (taxTotal !== undefined) {
    taxAmountOut = taxTotal;
  }

  let classifierTaxRate = 0.1;
  const trCls = clsRaw.taxRate;
  if (typeof trCls === "number" && Number.isFinite(trCls)) classifierTaxRate = trCls;

  let description =
    typeof clsRaw.description === "string" && clsRaw.description.trim()
      ? clsRaw.description.trim()
      : `${storeName} 取引`;
  if (description.length > 500) description = description.slice(0, 500);

  let confidence = typeof clsRaw.confidence === "number" && Number.isFinite(clsRaw.confidence) ? clsRaw.confidence : 0.5;
  confidence = Math.min(1, Math.max(0, confidence));

  const ocr: OcrResult = {
    storeName,
    date,
    items,
    total,
    taxTotal,
    paymentMethod,
    rawText,
    fieldConfidence: Object.keys(fieldConfidence).length > 0 ? fieldConfidence : undefined,
    invoiceNumber: invoiceNumber || null,
    dueDate: dueDate ?? undefined,
    documentNo: documentNo ?? undefined,
    purpose: purpose ?? undefined,
  };

  const classification: ClassificationResult = {
    debitAccount,
    creditAccount,
    amount,
    taxAmount: taxAmountOut,
    taxRate: classifierTaxRate,
    description,
    confidence,
  };

  return { ocr, classification };
}
