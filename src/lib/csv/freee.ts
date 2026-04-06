import type { JournalEntryData } from "@/types";
import { format } from "date-fns";

/**
 * freee会計 取引インポートCSV生成
 * 取引一覧 → CSVインポート形式
 * https://www.freee.co.jp/
 */
export function generateFreeeCsv(entries: JournalEntryData[]): string {
  const header = [
    "収支区分",
    "管理番号",
    "発生日",
    "決済期日",
    "取引先",
    "勘定科目",
    "税区分",
    "金額",
    "税計算区分",
    "税額",
    "備考",
    "品目",
    "部門",
    "メモタグ（複数指定可、カンマ区切り）",
    "セグメント1",
    "セグメント2",
    "セグメント3",
    "決済日",
    "決済口座",
    "決済金額",
  ].join(",");

  const rows = entries.map((entry) => {
    const dateStr = format(new Date(entry.date), "yyyy-MM-dd");

    // 税区分
    let taxType = "対象外";
    if (entry.taxRate === 0.08) {
      taxType = "課対仕入(税込8%)";
    } else if (entry.taxRate === 0.1 || entry.taxAmount) {
      taxType = "課対仕入(税込10%)";
    }

    // 取引先（摘要から店舗名を使用）
    const partner = csvEscape(entry.description);

    // 備考: インボイス番号 + メモ
    const remarkParts: string[] = [];
    if (entry.invoiceNumber) remarkParts.push(entry.invoiceNumber);
    if (entry.memo) remarkParts.push(entry.memo);
    const remarks = remarkParts.length > 0 ? csvEscape(remarkParts.join(" ")) : "";

    return [
      "支出",           // 収支区分
      "",               // 管理番号
      dateStr,          // 発生日
      "",               // 決済期日
      partner,          // 取引先
      entry.debitAccount, // 勘定科目
      taxType,          // 税区分
      entry.amount,     // 金額
      "内税",           // 税計算区分
      entry.taxAmount || 0,  // 税額
      remarks,          // 備考
      "",               // 品目
      "",               // 部門
      "",               // メモタグ
      "",               // セグメント1
      "",               // セグメント2
      "",               // セグメント3
      dateStr,          // 決済日
      entry.creditAccount, // 決済口座
      entry.amount,     // 決済金額
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
