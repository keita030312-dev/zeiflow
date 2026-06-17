import type { JournalEntryData, ClientTaxInfo } from "@/types";
import { deriveTaxCategory, REVENUE_ACCOUNTS } from "@/lib/tax-categories";
import { format } from "date-fns";

// MF形式の税区分文字列に変換（内税: 税込、外税: 税抜）
function toMfTaxLabel(raw: string, isExclusive: boolean): string {
  if (raw === "対象外" || raw === "非課税仕入" || raw === "非課税売上") return raw;

  const rateMatch = raw.match(/(\d+)%/);
  const rate = rateMatch ? rateMatch[1] : "";
  const isReduced = raw.includes("軽減");
  const taxSuffix = isExclusive ? "(税抜)" : "(税込)";
  const rateLabel = isReduced ? `${rate}%（軽減税率）${taxSuffix}` : `${rate}%${taxSuffix}`;

  if (raw.startsWith("課対仕入") || raw.startsWith("課税仕入")) {
    return `課税仕入 ${rateLabel}`;
  }
  if (raw.startsWith("課税売上")) {
    return `課税売上 ${rateLabel}`;
  }
  return raw;
}

/**
 * マネーフォワードクラウド会計 仕訳インポートCSV生成
 */
export function generateMoneyForwardCsv(
  entries: JournalEntryData[],
  client?: ClientTaxInfo
): string {
  const accountingMethod = client?.accountingMethod ?? "TAX_INCLUSIVE";
  const isExclusive = accountingMethod === "TAX_EXCLUSIVE";

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
    const isIncome = REVENUE_ACCOUNTS.has(entry.creditAccount);

    const resolved = entry.taxCategory
      ?? deriveTaxCategory(entry.taxRate, isIncome, accountingMethod);

    let debitTaxType = "対象外";
    let creditTaxType = "対象外";
    if (entry.taxRate || entry.taxAmount) {
      const mfLabel = toMfTaxLabel(resolved, isExclusive);
      if (isIncome) creditTaxType = mfLabel;
      else debitTaxType = mfLabel;
    }

    const description = csvEscape(entry.description);
    const memoParts: string[] = [];
    if (entry.invoiceNumber) memoParts.push(entry.invoiceNumber);
    if (entry.memo) memoParts.push(entry.memo);
    const memo = memoParts.length > 0 ? csvEscape(memoParts.join(" ")) : "";

    return [
      dateStr,
      csvEscape(entry.debitAccount),
      entry.debitSubAccount ? csvEscape(entry.debitSubAccount) : "",
      debitTaxType,
      entry.amount,
      entry.taxAmount || 0,
      csvEscape(entry.creditAccount),
      entry.creditSubAccount ? csvEscape(entry.creditSubAccount) : "",
      creditTaxType,
      entry.amount,
      entry.taxAmount || 0,
      description,
      memo,
      "",
      "通常仕訳",
      "No",
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
