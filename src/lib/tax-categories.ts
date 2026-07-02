// 弥生・MF・freee 等が認識する税区分コード一覧
// 内税(税込)・外税(税抜)・軽減税率を網羅

export type AccountingMethod = "TAX_INCLUSIVE" | "TAX_EXCLUSIVE";
export type TaxType = "STANDARD" | "SIMPLIFIED" | "EXEMPT";

// ────────────────────────────────────────
// 仕入側 税区分
// ────────────────────────────────────────
export const PURCHASE_TAX_CATEGORIES = [
  // 10%
  { value: "課対仕入内10%",     label: "課対仕入内10%（内税10%）",         rate: 0.1,  method: "TAX_INCLUSIVE" as const, reduced: false },
  { value: "課対仕入外10%",     label: "課対仕入外10%（外税10%）",         rate: 0.1,  method: "TAX_EXCLUSIVE" as const, reduced: false },
  { value: "課対仕入込10%",     label: "課対仕入込10%（内外合計10%）",     rate: 0.1,  method: null,                     reduced: false },
  // 軽減8%
  { value: "課対仕入内軽減8%",  label: "課対仕入内軽減8%（内税・軽減）",   rate: 0.08, method: "TAX_INCLUSIVE" as const, reduced: true  },
  { value: "課対仕入外軽減8%",  label: "課対仕入外軽減8%（外税・軽減）",   rate: 0.08, method: "TAX_EXCLUSIVE" as const, reduced: true  },
  { value: "課対仕入込軽減8%",  label: "課対仕入込軽減8%（内外合計・軽減）",rate: 0.08, method: null,                    reduced: true  },
  // 旧8%
  { value: "課対仕入内8%",      label: "課対仕入内8%（内税・旧税率）",      rate: 0.08, method: "TAX_INCLUSIVE" as const, reduced: false },
  { value: "課対仕入外8%",      label: "課対仕入外8%（外税・旧税率）",      rate: 0.08, method: "TAX_EXCLUSIVE" as const, reduced: false },
  { value: "課対仕入込8%",      label: "課対仕入込8%（内外合計・旧税率）",  rate: 0.08, method: null,                     reduced: false },
  // 旧5%
  { value: "課対仕入内5%",      label: "課対仕入内5%（内税・旧税率）",      rate: 0.05, method: "TAX_INCLUSIVE" as const, reduced: false },
  { value: "課対仕入外5%",      label: "課対仕入外5%（外税・旧税率）",      rate: 0.05, method: "TAX_EXCLUSIVE" as const, reduced: false },
  { value: "課対仕入込5%",      label: "課対仕入込5%（内外合計・旧税率）",  rate: 0.05, method: null,                     reduced: false },
  // その他
  { value: "非課税仕入",        label: "非課税仕入",                        rate: 0,    method: null,                     reduced: false },
  { value: "対象外",            label: "対象外",                            rate: 0,    method: null,                     reduced: false },
] as const;

// ────────────────────────────────────────
// 売上側 税区分
// ────────────────────────────────────────
export const SALES_TAX_CATEGORIES = [
  // 10%
  { value: "課税売上内10%",     label: "課税売上内10%（内税10%）",         rate: 0.1,  method: "TAX_INCLUSIVE" as const, reduced: false },
  { value: "課税売上外10%",     label: "課税売上外10%（外税10%）",         rate: 0.1,  method: "TAX_EXCLUSIVE" as const, reduced: false },
  { value: "課税売上込10%",     label: "課税売上込10%（内外合計10%）",     rate: 0.1,  method: null,                     reduced: false },
  // 軽減8%
  { value: "課税売上内軽減8%",  label: "課税売上内軽減8%（内税・軽減）",   rate: 0.08, method: "TAX_INCLUSIVE" as const, reduced: true  },
  { value: "課税売上外軽減8%",  label: "課税売上外軽減8%（外税・軽減）",   rate: 0.08, method: "TAX_EXCLUSIVE" as const, reduced: true  },
  { value: "課税売上込軽減8%",  label: "課税売上込軽減8%（内外合計・軽減）",rate: 0.08, method: null,                    reduced: true  },
  // 旧8%
  { value: "課税売上内8%",      label: "課税売上内8%（内税・旧税率）",      rate: 0.08, method: "TAX_INCLUSIVE" as const, reduced: false },
  { value: "課税売上外8%",      label: "課税売上外8%（外税・旧税率）",      rate: 0.08, method: "TAX_EXCLUSIVE" as const, reduced: false },
  // その他
  { value: "非課税売上",        label: "非課税売上",                        rate: 0,    method: null,                     reduced: false },
  { value: "対象外",            label: "対象外",                            rate: 0,    method: null,                     reduced: false },
] as const;

// 全税区分（UI セレクト用）
export const ALL_TAX_CATEGORIES = [
  { group: "仕入・経費", items: PURCHASE_TAX_CATEGORIES },
  { group: "売上・収入", items: SALES_TAX_CATEGORIES },
];

// ────────────────────────────────────────
// ヘルパー: taxRate + accountingMethod → デフォルト税区分文字列
// ────────────────────────────────────────
export function deriveTaxCategory(
  taxRate: number | null | undefined,
  isIncome: boolean,
  accountingMethod: AccountingMethod,
  isReducedRate = false
): string {
  if (!taxRate) return "対象外";

  const method = accountingMethod === "TAX_INCLUSIVE" ? "内" : "外";

  if (isIncome) {
    if (taxRate === 0.1)  return `課税売上${method}10%`;
    if (taxRate === 0.08 && isReducedRate)  return `課税売上${method}軽減8%`;
    if (taxRate === 0.08) return `課税売上${method}8%`;
    if (taxRate === 0.05) return "対象外"; // 旧5%は売上側に標準文字列なし
  } else {
    if (taxRate === 0.1)  return `課対仕入${method}10%`;
    if (taxRate === 0.08 && isReducedRate)  return `課対仕入${method}軽減8%`;
    if (taxRate === 0.08) return `課対仕入${method}8%`;
    if (taxRate === 0.05) return `課対仕入${method}5%`;
  }

  return "対象外";
}

// 売上勘定科目のリスト（CSV出力時の仕入/売上判定に使用）
export const REVENUE_ACCOUNTS = new Set([
  "売上高", "受取利息", "雑収入",
]);

/**
 * UIセレクト用の税区分選択肢。
 * ★value はDBの taxCategory に保存され、CSV出力(toFreeeTaxLabel/toMfTaxLabel)が
 *   文字列パースする。1文字も変更しないこと。
 */
export const TAX_CATEGORY_OPTIONS = [
  { value: "", label: "対象外" },
  { value: "課対仕入内10%", label: "課対仕入内10%（仕入・内税10%）" },
  { value: "課対仕入外10%", label: "課対仕入外10%（仕入・外税10%）" },
  { value: "課対仕入内軽減8%", label: "課対仕入内軽減8%（仕入・内税・軽減）" },
  { value: "課対仕入外軽減8%", label: "課対仕入外軽減8%（仕入・外税・軽減）" },
  { value: "課対仕入内8%", label: "課対仕入内8%（仕入・内税・旧税率）" },
  { value: "課対仕入外8%", label: "課対仕入外8%（仕入・外税・旧税率）" },
  { value: "課対仕入内5%", label: "課対仕入内5%（仕入・内税・旧税率）" },
  { value: "非課税仕入", label: "非課税仕入" },
  { value: "課税売上内10%", label: "課税売上内10%（売上・内税10%）" },
  { value: "課税売上外10%", label: "課税売上外10%（売上・外税10%）" },
  { value: "課税売上内軽減8%", label: "課税売上内軽減8%（売上・内税・軽減）" },
  { value: "課税売上外軽減8%", label: "課税売上外軽減8%（売上・外税・軽減）" },
  { value: "非課税売上", label: "非課税売上" },
] as const;
