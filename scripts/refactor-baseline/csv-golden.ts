/**
 * CSV出力の特性テスト（ゴールデン + 仕様地雷アサーション）
 * 記録:   npx tsx scripts/refactor-baseline/csv-golden.ts --record
 * 検証:   npx tsx scripts/refactor-baseline/csv-golden.ts
 * 期待:   検証モードで "ALL PASS" が出て exit code 0
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generateFreeeCsv } from "../../src/lib/csv/freee";
import { generateMoneyForwardCsv } from "../../src/lib/csv/moneyforward";
import { generateYayoiCsv } from "../../src/lib/csv/yayoi";
import type { JournalEntryData, ClientTaxInfo } from "../../src/types";

const GOLDEN_DIR = join(__dirname, "golden");
const record = process.argv.includes("--record");

// 日付はタイムゾーン非依存にするため "T00:00:00"（ローカル時刻）表記を使う
const entries: JournalEntryData[] = [
  { id: "j1", date: "2026-04-15T00:00:00", debitAccount: "会議費", creditAccount: "現金",
    amount: 1100, taxAmount: 100, taxRate: 0.1, description: "テスト食堂 ご飲食代",
    invoiceNumber: "T1234567890123", isConfirmed: true, clientId: "c1" },
  { id: "j2", date: "2026-04-16T00:00:00", debitAccount: "福利厚生費", creditAccount: "現金",
    amount: 1080, taxAmount: 80, taxRate: 0.08, taxCategory: "課対仕入内軽減8%",
    description: "スーパーA, 食品購入", memo: "軽減税率", isConfirmed: true, clientId: "c1" },
  { id: "j3", date: "2026-04-17T00:00:00", debitAccount: "普通預金", creditAccount: "売上高",
    amount: 2200, taxAmount: 200, taxRate: 0.1, description: "4月分売上",
    isConfirmed: true, clientId: "c1" },
  { id: "j4", date: "2026-04-18T00:00:00", debitAccount: "租税公課", creditAccount: "現金",
    amount: 500, description: "印紙代", isConfirmed: false, clientId: "c1" },
  { id: "j5", date: "2026-04-19T00:00:00", debitAccount: "消耗品費", creditAccount: "未払金",
    amount: 3300, taxAmount: 300, taxRate: 0.1, description: '文具店B "領収書"',
    debitSubAccount: "事務用品", isConfirmed: true, clientId: "c1" },
  { id: "j6", date: "2026-04-20T00:00:00", debitAccount: "雑費", creditAccount: "現金",
    amount: 100, taxAmount: 9, taxRate: 0.1, description: "=SUM(A1) 危険摘要テスト",
    isConfirmed: true, clientId: "c1" },
];

const inclusive: ClientTaxInfo = { accountingMethod: "TAX_INCLUSIVE", taxType: "STANDARD" };
const exclusive: ClientTaxInfo = { accountingMethod: "TAX_EXCLUSIVE", taxType: "STANDARD" };

const outputs: Record<string, string> = {
  "freee_inclusive.csv": generateFreeeCsv(entries, inclusive),
  "freee_exclusive.csv": generateFreeeCsv(entries, exclusive),
  "mf_inclusive.csv": generateMoneyForwardCsv(entries, inclusive),
  "mf_exclusive.csv": generateMoneyForwardCsv(entries, exclusive),
  "yayoi_inclusive.csv": generateYayoiCsv(entries, inclusive),
};

let failed = 0;
const fail = (msg: string) => { failed++; console.error("FAIL:", msg); };

// ---- 仕様地雷の明示アサーション（ゴールデンと独立に常に検証） ----
{
  const rows = outputs["freee_inclusive.csv"].split("\r\n").slice(1);
  // freee: 決済情報（決済日/決済口座/決済金額 = 末尾3列）+ 品目〜セグメント3 は空欄必須
  for (const r of rows) {
    if (!r.endsWith(",".repeat(9))) fail(`freee 決済情報が空欄でない行: ${r}`);
  }
  // freee: 対象外の行（j4）は税計算区分が空欄
  const j4 = rows.find((r) => r.includes("印紙代"));
  if (!j4 || !j4.includes("対象外,500,,0")) fail(`freee 対象外行の税計算区分が空欄でない: ${j4}`);
  // freee: 内税の通常行（j1）
  const j1 = rows.find((r) => r.includes("テスト食堂"));
  if (!j1 || !j1.includes("課対仕入(税込)10%,1100,内税,100")) fail(`freee 内税行が想定と違う: ${j1}`);
}
{
  const j1ex = outputs["freee_exclusive.csv"].split("\r\n").find((r) => r.includes("テスト食堂"));
  if (!j1ex || !j1ex.includes("課対仕入(税抜)10%,1100,外税,100")) fail(`freee 外税行が想定と違う: ${j1ex}`);
}
{
  // MF: 内税=(税込) / 外税=(税抜) 表記
  if (!outputs["mf_inclusive.csv"].includes("課税仕入 10%(税込)")) fail("MF 内税の(税込)表記が消えた");
  if (!outputs["mf_exclusive.csv"].includes("課税仕入 10%(税抜)")) fail("MF 外税の(税抜)表記が消えた");
  if (!outputs["mf_inclusive.csv"].includes("課税売上 10%(税込)")) fail("MF 売上側税区分が消えた");
}
{
  // 弥生: 識別フラグ2000 / 税区分は生の文字列
  const rows = outputs["yayoi_inclusive.csv"].split("\r\n").slice(1);
  if (!rows.every((r) => r.startsWith("2000,"))) fail("弥生 識別フラグ2000が消えた");
  if (!rows.some((r) => r.includes("課対仕入内10%"))) fail("弥生 税区分の生文字列が消えた");
}
{
  // CSVインジェクション対策: 先頭 = の摘要は ' 付与でエスケープされる
  if (!outputs["freee_inclusive.csv"].includes("'=SUM(A1)")) fail("freee CSVインジェクション対策が消えた");
}

// ---- ゴールデン比較 ----
mkdirSync(GOLDEN_DIR, { recursive: true });
for (const [name, csv] of Object.entries(outputs)) {
  const p = join(GOLDEN_DIR, name);
  if (record || !existsSync(p)) {
    writeFileSync(p, csv, "utf8");
    console.log("RECORDED:", name);
  } else {
    const golden = readFileSync(p, "utf8");
    if (golden !== csv) fail(`ゴールデン不一致: ${name}（git diff で差分確認のこと）`);
  }
}

if (failed > 0) { console.error(`${failed} 件失敗`); process.exit(1); }
console.log("ALL PASS");
