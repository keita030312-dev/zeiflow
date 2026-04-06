import type { JournalEntryData } from "@/types";
import { format } from "date-fns";

/**
 * 弥生会計インポート用CSV生成
 * 弥生会計デスクトップ版・オンライン版の仕訳日記帳インポート形式
 * https://support.yayoi-kk.co.jp/
 */
export function generateYayoiCsv(entries: JournalEntryData[]): string {
  const header = [
    "識別フラグ",
    "伝票No.",
    "決算",
    "取引日付",
    "借方勘定科目",
    "借方補助科目",
    "借方部門",
    "借方税区分",
    "借方金額",
    "借方税金額",
    "貸方勘定科目",
    "貸方補助科目",
    "貸方部門",
    "貸方税区分",
    "貸方金額",
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

    // 税区分の判定
    let debitTaxType = "対象外";
    let creditTaxType = "対象外";
    if (entry.taxRate === 0.08) {
      debitTaxType = "課対仕入内8%";
      creditTaxType = "課対仕入内8%";
    } else if (entry.taxRate === 0.1 || entry.taxAmount) {
      debitTaxType = "課対仕入内10%";
      creditTaxType = "課対仕入内10%";
    }

    // 摘要（クリーンなまま）
    const description = csvEscape(entry.description);

    // 仕訳メモ: インボイス番号があれば記載
    const memo = entry.invoiceNumber
      ? csvEscape(entry.memo ? `${entry.memo} ${entry.invoiceNumber}` : entry.invoiceNumber)
      : (entry.memo ? csvEscape(entry.memo) : "");

    return [
      2000,              // 識別フラグ（仕訳データ）
      index + 1,         // 伝票No.
      "",                // 決算
      dateStr,           // 取引日付
      entry.debitAccount,  // 借方勘定科目
      entry.debitSubAccount || "",  // 借方補助科目
      "",                // 借方部門
      debitTaxType,      // 借方税区分
      entry.amount,      // 借方金額
      entry.taxAmount || 0,  // 借方税金額
      entry.creditAccount, // 貸方勘定科目
      entry.creditSubAccount || "",  // 貸方補助科目
      "",                // 貸方部門
      creditTaxType,     // 貸方税区分
      entry.amount,      // 貸方金額
      entry.taxAmount || 0,  // 貸方税金額
      description,       // 摘要
      "",                // 番号
      "",                // 期日
      0,                 // タイプ
      "",                // 生成元
      memo,              // 仕訳メモ
      "",                // 付箋1
      "",                // 付箋2
      "NO",              // 調整
    ].join(",");
  });

  return [header, ...rows].join("\r\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
