/**
 * ensureOcrResultShape / parseJournalEntryDate / deriveTaxCategory の特性テスト
 * 記録:   npx tsx scripts/refactor-baseline/normalize-golden.ts --record
 * 検証:   npx tsx scripts/refactor-baseline/normalize-golden.ts
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ensureOcrResultShape, parseJournalEntryDate } from "../../src/lib/ocr-result-normalize";
import { deriveTaxCategory } from "../../src/lib/tax-categories";

const GOLDEN_DIR = join(__dirname, "golden");
const record = process.argv.includes("--record");
let failed = 0;
const fail = (msg: string) => { failed++; console.error("FAIL:", msg); };
const eq = (label: string, actual: unknown, expected: unknown) => {
  if (actual !== expected) fail(`${label}: got=${String(actual)} want=${String(expected)}`);
};

// ---- deriveTaxCategory: 明示アサーション ----
eq("derive 内税10%仕入", deriveTaxCategory(0.1, false, "TAX_INCLUSIVE"), "課対仕入内10%");
eq("derive 外税10%売上", deriveTaxCategory(0.1, true, "TAX_EXCLUSIVE"), "課税売上外10%");
eq("derive 軽減8%仕入", deriveTaxCategory(0.08, false, "TAX_INCLUSIVE", true), "課対仕入内軽減8%");
eq("derive 旧8%仕入", deriveTaxCategory(0.08, false, "TAX_EXCLUSIVE"), "課対仕入外8%");
eq("derive 税率なし", deriveTaxCategory(null, false, "TAX_INCLUSIVE"), "対象外");
eq("derive 旧5%売上", deriveTaxCategory(0.05, true, "TAX_INCLUSIVE"), "対象外");

// ---- parseJournalEntryDate: 明示アサーション ----
eq("date 正常", parseJournalEntryDate("2026-04-15").toISOString().slice(0, 10), "2026-04-15");
{
  const today = new Date().toISOString().slice(0, 10);
  eq("date 不正→今日", parseJournalEntryDate("junk").toISOString().slice(0, 10), today);
  eq("date null→今日", parseJournalEntryDate(null).toISOString().slice(0, 10), today);
}

// ---- ensureOcrResultShape: ゴールデン（日付は必ず有効値を渡し、出力を決定的にする）----
const fixtures: Record<string, unknown> = {
  ok_full: { ocr: { storeName: "セブンイレブン", date: "2026-04-15",
      items: [{ name: "おにぎり", amount: 110, taxRate: 0.08 }], total: 260, taxTotal: 19,
      paymentMethod: "現金", invoiceNumber: "T1234567890123", rawText: "raw",
      fieldConfidence: { storeName: 0.98, total: 1.2, date: -0.5 } },
    classification: { debitAccount: "福利厚生費", creditAccount: "現金", amount: 260,
      taxAmount: 19, taxRate: 0.08, description: "セブンイレブン 飲食代", confidence: 0.95 } },
  broken_types: { ocr: { storeName: "  ", date: "2026-01-05", items: "not-array",
      total: "1,234円", taxTotal: null, invoiceNumber: 123, rawText: 42 },
    classification: { amount: "0", taxRate: "x", description: "", confidence: 99 } },
  minimal: { ocr: { date: "2026-02-01" } },
};
mkdirSync(GOLDEN_DIR, { recursive: true });
const result = JSON.stringify(
  Object.fromEntries(Object.entries(fixtures).map(([k, v]) => [k, ensureOcrResultShape(v)])),
  null, 2);
const p = join(GOLDEN_DIR, "ensure-ocr-shape.json");
if (record || !existsSync(p)) {
  writeFileSync(p, result, "utf8");
  console.log("RECORDED: ensure-ocr-shape.json");
} else if (readFileSync(p, "utf8") !== result) {
  fail("ensure-ocr-shape.json ゴールデン不一致");
}

if (failed > 0) { console.error(`${failed} 件失敗`); process.exit(1); }
console.log("ALL PASS");
