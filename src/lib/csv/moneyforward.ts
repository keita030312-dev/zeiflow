import type { JournalEntryData } from "@/types";
import { format } from "date-fns";

/**
 * マネーフォワードクラウド会計 仕訳インポートCSV生成
 * 仕訳帳 → CSVインポート形式
 * https://biz.moneyforward.com/
 */
export function generateMoneyForwardCsv(entries: JournalEntryData[]): string {
  const header = [
    "取引日",
    "借方勘定科目",
    "借方補助科目",
    "借方税区分",
    "借方金額(税込)",
    "借方税額",
    "貸方勘定科目",
    "貸方補助科目",
    "貸方税区分",
    "貸方金額(税込)",
    "貸方税額",
    "摘要",
    "仕訳メモ",
    "タグ",
    "MF仕訳タイプ",
    "決算整理仕訳",
    "作成日時",
    "最終更新日時",
  ].join(",");

  const rows = entries.map((entry) => {
    const dateStr = format(new Date(entry.date), "yyyy/MM/dd");

    // 税区分
    let taxType = "対象外";
    if (entry.taxRate === 0.08) {
      taxType = "課税仕入 8%(税込)";
    } else if (entry.taxRate === 0.1 || entry.taxAmount) {
      taxType = "課税仕入 10%(税込)";
    }

    // 摘要
    const description = csvEscape(entry.description);

    // 仕訳メモ: インボイス番号 + メモ
    const memoParts: string[] = [];
    if (entry.invoiceNumber) memoParts.push(entry.invoiceNumber);
    if (entry.memo) memoParts.push(entry.memo);
    const memo = memoParts.length > 0 ? csvEscape(memoParts.join(" ")) : "";

    return [
      dateStr,
      entry.debitAccount,
      entry.debitSubAccount || "",
      taxType,
      entry.amount,
      entry.taxAmount || 0,
      entry.creditAccount,
      entry.creditSubAccount || "",
      taxType,
      entry.amount,
      entry.taxAmount || 0,
      description,
      memo,
      "",               // タグ
      "開始仕訳",        // MF仕訳タイプ
      "No",             // 決算整理仕訳
      "",               // 作成日時
      "",               // 最終更新日時
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
