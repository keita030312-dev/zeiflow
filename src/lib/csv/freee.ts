import type { JournalEntryData, ClientTaxInfo } from "@/types";
import { deriveTaxCategory, REVENUE_ACCOUNTS } from "@/lib/tax-categories";
import { format } from "date-fns";

// freee形式の税区分文字列に変換
function toFreeeTaxLabel(raw: string, isIncome: boolean, isExclusive: boolean): string {
  if (raw === "対象外") return "対象外";
  if (raw === "非課税仕入" || raw === "非課税売上") return "非課税";

  const rateMatch = raw.match(/(\d+)%/);
  const rate = rateMatch ? rateMatch[1] : "";
  const isReduced = raw.includes("軽減");
  const taxCalc = isExclusive ? "(税抜)" : "(税込)";

  if (isIncome) {
    if (isReduced) return `課税売上${rate}%（軽）`;
    return `課税売上${rate}%`;
  } else {
    if (isReduced) return `課対仕入${taxCalc}${rate}%（軽）`;
    return `課対仕入${taxCalc}${rate}%`;
  }
}

/**
 * freee会計 取引インポートCSV生成
 */
export function generateFreeeCsv(
  entries: JournalEntryData[],
  client?: ClientTaxInfo
): string {
  const accountingMethod = client?.accountingMethod ?? "TAX_INCLUSIVE";
  const isExclusive = accountingMethod === "TAX_EXCLUSIVE";

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
    const isIncome = REVENUE_ACCOUNTS.has(entry.creditAccount);

    const resolved = entry.taxCategory
      ?? deriveTaxCategory(entry.taxRate, isIncome, accountingMethod);

    const taxType = (entry.taxRate || entry.taxAmount)
      ? toFreeeTaxLabel(resolved, isIncome, isExclusive)
      : "対象外";

    // 課税取引のみ内税/外税を設定。対象外・非課税は空欄
    const hasTax = !!(entry.taxRate || entry.taxAmount) && taxType !== "対象外" && taxType !== "非課税";
    const taxCalcLabel = hasTax ? (isExclusive ? "外税" : "内税") : "";

    const partner = csvEscape(entry.description);
    const remarkParts: string[] = [];
    if (entry.invoiceNumber) remarkParts.push(entry.invoiceNumber);
    if (entry.memo) remarkParts.push(entry.memo);
    const remarks = remarkParts.length > 0 ? csvEscape(remarkParts.join(" ")) : "";

    // 決済情報は空欄（未決済として登録し、freee側で入金/支払と照合させる）
    return [
      isIncome ? "収入" : "支出",
      "",
      dateStr,
      "",
      partner,
      csvEscape(isIncome ? entry.creditAccount : entry.debitAccount),
      taxType,
      entry.amount,
      taxCalcLabel,
      entry.taxAmount || 0,
      remarks,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
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
