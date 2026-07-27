// ZeiFlow 学習集計・CSVパースの動作確認(Node 24 strip-types で TS を直接読む)
// 実行: node --experimental-strip-types scripts/test-journal-csv.mjs
import { buildLearningText } from "../src/lib/ai/learning-context.ts";
import { parseJournalCsv, decodeCsvBuffer, parseCsvLine, parseFlexibleDate } from "../src/lib/csv/journal-csv.ts";
import iconv from "iconv-lite";

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`OK   ${name}`);
  else { failed++; console.log(`FAIL ${name} ${detail}`); }
}

// --- 1. 多数決: ローソン30回会議費 vs 先頭5回福利厚生費 → 会議費が勝つこと ---
const rows = [];
for (let i = 0; i < 5; i++) rows.push({ description: `ローソン ${i}`, debitAccount: "福利厚生費", creditAccount: "現金", amount: 200, taxRate: null });
for (let i = 0; i < 30; i++) rows.push({ description: `ローソン ${i}`, debitAccount: "会議費", creditAccount: "現金", amount: 181, taxRate: null });
const text1 = buildLearningText(rows);
check("多数決でローソン→会議費", /「ローソン」→ 会議費\/現金（30回）/.test(text1), "\n" + text1.slice(0, 300));

// --- 2. 表記ゆれ統合: 半角カナ・英字大小 ---
const rows2 = [
  { description: "ﾛｰｿﾝ", debitAccount: "会議費", creditAccount: "現金", amount: 100, taxRate: null },
  { description: "ローソン 渋谷", debitAccount: "会議費", creditAccount: "現金", amount: 100, taxRate: null },
];
const text2 = buildLearningText(rows2);
check("半角カナ→全角統合(2回に集約)", text2.includes("（2回）"), "\n" + text2.slice(0, 200));

// --- 3. 仕訳CSVパース(ZeiFlow形式) ---
const csv = "日付,借方科目,貸方科目,金額,摘要\n2025-04-01,会議費,現金,181,ローソン\n2025-04-02,会議費,現金,1325,肉のハナマサ\n";
const parsed = parseJournalCsv(csv);
check("仕訳CSVパース 2行", parsed && parsed.length === 2 && parsed[0].description === "ローソン");
check("非仕訳テキストは null", parseJournalCsv("これは事務所の仕訳ルールです。\n飲食は会議費にする。") === null);

// --- 3b. 仕訳例を数行含むルール文章は圧縮しない(有効行50%未満ガード) ---
const ruleDoc = [
  "当事務所の仕訳ルール(日付,借方,貸方,金額の順で記載する)",
  "2025-04-01,会議費,現金,181,ローソン",
  "2025-04-02,会議費,現金,200,例2",
  "2025-04-03,会議費,現金,300,例3",
  "2025-04-04,会議費,現金,400,例4",
  "2025-04-05,会議費,現金,500,例5",
  "上記はあくまで例であり、来客用のコンビニ購入は会議費とする。",
  "社内飲食は福利厚生費。",
  "タクシーは旅費交通費。",
  "書籍は新聞図書費。",
  "備品1万円以上は工具器具備品。",
  "それ以外は消耗品費。",
].join("\n");
check("ルール文章(有効行50%未満)は null", parseJournalCsv(ruleDoc) === null);

// --- 3c. 弥生形式(前置き行あり・ヘッダーが1行目でない) ---
const yayoi = [
  '"ソート","仕訳日記帳"',
  '"絞込条件","汎用形式"',
  '"事業所名","リスクマネジメント株式会社"',
  '"作成日時","令和08年07月21日","18:19:00"',
  '"識別フラグ","伝票No.","決算","取引日付","借方勘定科目","借方補助科目","借方税区分","借方金額","貸方勘定科目","貸方補助科目","貸方税区分","貸方金額","摘要"',
  '"2000","1","","R.07/04/01","会議費","","課対仕入10%","181","現金","","","181","ローソン"',
  '"2000","2","","R.07/04/02","会議費","","課対仕入10%","1325","現金","","","1325","肉のハナマサ"',
  '"2000","3","","R.07/04/03","消耗品費","","課対仕入10%","500","現金","","","500","ダイソー"',
  '"2000","4","","R.07/04/04","会議費","","課対仕入10%","300","現金","","","300","ローソン"',
  '"2000","5","","R.07/04/05","旅費交通費","","課対仕入10%","800","現金","","","800","タクシー"',
].join("\n");
const yayoiParsed = parseJournalCsv(yayoi);
check("弥生形式: 前置き行スキップで5行", yayoiParsed && yayoiParsed.length === 5, JSON.stringify(yayoiParsed?.slice(0, 1)));
check("弥生形式: 摘要=ローソン/借方=会議費", yayoiParsed?.[0]?.description === "ローソン" && yayoiParsed?.[0]?.debitAccount === "会議費");

// --- 3c2. 前置き行に4キーワードが1セルで載っていても誤爆しない(4列相異ガード) ---
const trapDoc = [
  '"注意","日付・借方・貸方・金額の順で出力しています"',
  '"日付","借方科目","貸方科目","金額","摘要"',
  '"2025-04-01","会議費","現金","181","ローソン"',
  '"2025-04-02","会議費","現金","300","ローソン"',
].join("\n");
const trapParsed = parseJournalCsv(trapDoc);
check("説明文1セルの偽ヘッダーをスキップ", trapParsed?.length === 2 && trapParsed[0].debitAccount === "会議費", JSON.stringify(trapParsed?.[0]));

// --- 3d. 日付の寛容パース(取込用) ---
const dateCases = [
  ["2026/07/21", "2026-07-21"],
  ["2026-07-21", "2026-07-21"],
  ["2026年7月21日", "2026-07-21"],
  ["令和8年7月21日", "2026-07-21"],
  ["R.08/04/01", "2026-04-01"],
  ["R8.4.1", "2026-04-01"],
  ["平成30年1月5日", "2018-01-05"],
];
for (const [input, expected] of dateCases) {
  const d = parseFlexibleDate(input);
  const got = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "null";
  check(`日付 ${input} → ${expected}`, got === expected, `got=${got}`);
}
check("不正な日付は null", parseFlexibleDate("あいうえお") === null);

// --- 4. Shift-JIS デコード ---
const sjisBuf = iconv.encode(csv, "shift_jis");
const decoded = decodeCsvBuffer(sjisBuf);
check("Shift-JIS自動判別", decoded.includes("肉のハナマサ"), decoded.slice(0, 80));
const utf8Buf = Buffer.from(csv, "utf-8");
check("UTF-8はそのまま", decodeCsvBuffer(utf8Buf).includes("肉のハナマサ"));
const bomBuf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csv, "utf-8")]);
check("BOM除去でヘッダー検出可", parseJournalCsv(decodeCsvBuffer(bomBuf))?.length === 2);

// --- 5. quoted comma ---
check("quoted comma", JSON.stringify(parseCsvLine('2025-04-01,"1,325",会議費')) === JSON.stringify(["2025-04-01", "1,325", "会議費"]));

// --- 6. 1年分(3000行)でも学習テキストが上限内 ---
const big = [];
for (let i = 0; i < 3000; i++) big.push({ description: `店舗${i % 300}`, debitAccount: "消耗品費", creditAccount: "現金", amount: 1000, taxRate: null });
const bigText = buildLearningText(big);
check("3000行→8000字以内", bigText.length <= 8000, `len=${bigText.length}`);
check("摘要パターン上限100件", (bigText.match(/」→ /g) || []).length <= 100 + 15);

process.exit(failed ? 1 : 0);
