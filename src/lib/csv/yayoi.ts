import type { JournalEntryData, ClientTaxInfo } from "@/types";
import { deriveTaxCategory, REVENUE_ACCOUNTS } from "@/lib/tax-categories";
import { format } from "date-fns";

/**
 * 弥生会計インポート用CSV生成
 * 弥生会計デスクトップ版・オンライン版の仕訳日記帳インポート形式
 */
export function generateYayoiCsv(
  entries: JournalEntryData[],
  client?: ClientTaxInfo
): string {
  const accountingMethod = client?.accountingMethod ?? "TAX_INCLUSIVE";

  const header = [
    "識別フラグ",
    "伝票No.",
    "決算",
    "取引日付",
    "借方勘定科目",
    "借方補助科目",
    "借方部門",
    "借方税区分",
    "借方金額(税込)",
    "借方税金額",
    "貸方勘定科目",
    "貸方補助科目",
    "貸方部門",
    "貸方税区分",
    "貸方金額(税込)",
    "貸方税金額",
    "摘要",
    "番号",
    "期日",
    "タイプ",
    "生成元",
    "仕訳メモ",
    "付箋1",
    "付箋2",
    "調整",
  ].join(",");

  const rows = entries.map((entry, index) => {
    const dateStr = format(new Date(entry.date), "yyyy/MM/dd");
    const isIncome = REVENUE_ACCOUNTS.has(entry.creditAccount);

    // entry.taxCategory が明示指定されていればそのまま使い、なければ自動導出
    const resolved = entry.taxCategory
      ?? deriveTaxCategory(entry.taxRate, isIncome, accountingMethod);

    let debitTaxType = "対象外";
    let creditTaxType = "対象外";
    if (entry.taxRate || entry.taxAmount) {
      if (isIncome) creditTaxType = resolved;
      else debitTaxType = resolved;
    }

    const description = csvEscape(entry.description);
    const memo = entry.invoiceNumber
      ? csvEscape(entry.memo ? `${entry.memo} ${entry.invoiceNumber}` : entry.invoiceNumber)
      : (entry.memo ? csvEscape(entry.memo) : "");

    return [
      "2000",
      String(index + 1),
      "",
      dateStr,
      csvEscape(entry.debitAccount),
      entry.debitSubAccount ? csvEscape(entry.debitSubAccount) : "",
      "",
      debitTaxType,
      String(entry.amount),
      String(entry.taxAmount || ""),
      csvEscape(entry.creditAccount),
      entry.creditSubAccount ? csvEscape(entry.creditSubAccount) : "",
      "",
      creditTaxType,
      String(entry.amount),
      String(entry.taxAmount || ""),
      description,
      "",       // 番号 (R列, index 17)
      "",       // 期日 (S列, index 18)
      "0",      // タイプ (T列, index 19): 通常仕訳
      "",       // 生成元 (U列, index 20)
      memo,     // 仕訳メモ (V列, index 21)
      "",       // 付箋1 (W列, index 22)
      "",       // 付箋2 (X列, index 23)
      "0",      // 調整 (Y列, index 24)
    ].join(",");
  });

  return [header, ...rows].join("\r\n");
}

function csvEscape(value: string): string {
  const cleaned = value.replace(/[\r\n]+/g, " ").trim();
  const safe = /^[=+\-@\t]/.test(cleaned) ? `'${cleaned}` : cleaned;
  if (safe.includes(",") || safe.includes('"')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
