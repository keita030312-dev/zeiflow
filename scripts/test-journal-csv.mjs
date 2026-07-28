// ZeiFlow 学習集計・CSVパースの動作確認(Node 24 strip-types で TS を直接読む)
// 実行: node --experimental-strip-types scripts/test-journal-csv.mjs
import { buildLearningText } from "../src/lib/ai/learning-context.ts";
import { parseJournalCsv, decodeCsvBuffer, parseCsvLine, parseFlexibleDate, findJournalHeader, parseImportRows } from "../src/lib/csv/journal-csv.ts";
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

// --- 2. 表記ゆれ統合: 半角カナ・全角英数・英字大小 ---
const rows2 = [
  { description: "ﾛｰｿﾝ 123", debitAccount: "会議費", creditAccount: "現金", amount: 100, taxRate: null },
  { description: "ローソン 456", debitAccount: "会議費", creditAccount: "現金", amount: 100, taxRate: null },
];
const text2 = buildLearningText(rows2);
check("半角カナ→全角統合(摘要を2回に集約)", text2.includes("「ローソン」→ 会議費/現金（2回）"), "\n" + text2.slice(0, 200));

const latinRows = [
  { description: "ＬＡＷＳＯＮ 123", debitAccount: "会議費", creditAccount: "現金", amount: 100, taxRate: null },
  { description: "lawson 456", debitAccount: "会議費", creditAccount: "現金", amount: 100, taxRate: null },
];
const latinText = buildLearningText(latinRows);
check("全角英字・英字大小を統合", latinText.includes("「lawson」→ 会議費/現金（2回）"), "\n" + latinText.slice(0, 200));

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
  ["2024-02-29", "2024-02-29"],
  ["2026年7月21日", "2026-07-21"],
  ["令和8年7月21日", "2026-07-21"],
  ["令和元年5月1日", "2019-05-01"],
  ["平成31年4月30日", "2019-04-30"],
  ["平成元年1月8日", "1989-01-08"],
  ["昭和64年1月7日", "1989-01-07"],
  ["R.08/04/01", "2026-04-01"],
  ["R8.4.1", "2026-04-01"],
  ["平成30年1月5日", "2018-01-05"],
];
for (const [input, expected] of dateCases) {
  const d = parseFlexibleDate(input);
  const got = d ? d.toISOString().slice(0, 10) : "null";
  check(`日付 ${input} → ${expected}`, got === expected, `got=${got}`);
}
for (const invalidDate of [
  "あいうえお",
  "2026-02-30",
  "2026年2月30日",
  "令和8年2月30日",
  "2025-02-29",
  "2026-13-01",
  "2026-00-01",
  "令和元年1月1日",
  "平成31年5月1日",
  "平成元年1月7日",
  "昭和64年1月8日",
]) {
  check(`不正な日付 ${invalidDate} は null`, parseFlexibleDate(invalidDate) === null);
}

// --- 3e. 取込行分類: 弥生の帳簿エクスポート(集計行・複合仕訳混在)を再現 ---
// 明示された集計行だけを skipped とし、複合仕訳の不完全な行はエラーにする。
const ledger = [
  '"【帳簿名】","仕訳日記帳"',
  '"【事業所名】","テスト株式会社"',
  '"【集計期間】","令和06年08月01日","令和07年07月31日"',
  '"[仕訳行区分]","日付","伝票No.","決算","調整","付箋1","付箋2","タイプ","生成元","借方勘定科目","借方補助科目","借方部門","借方税区分","借方税計算区分","借方金額","借方税額","貸方勘定科目","貸方補助科目","貸方部門","貸方税区分","貸方税計算区分","貸方金額","貸方税額","摘要","課税区分","仕入税額控除","期日","時間","伝票","作業日付","仕訳番号"',
  '"[明細行]","令和06年08月01日",265,"","NO","","","","","交際費","飲食費","","課対仕入10%","",36930,,"現金","","","対象外","",36930,,"だんらん亭","区分記載","80%控除","",,"","令和07年06月17日",19091',
  '"[明細行]","令和06年08月01日",400,"","NO","","","[振替]","","支払手数料","","","課対仕入10%","",3740,,"","","","対象外","",,,"管理料","適格","100%","",,"","令和07年06月19日",19269',
  '"[明細行]","令和06年08月01日",400,"","NO","","","[振替]","","","","","対象外","",,,"売上","長谷川様","","課税売上10%","",40700,,"管理費","","","",,"","令和07年06月19日",19271',
  '"[日計行]","","","","","","","","","","","","","",123010,0,"","","","","",123010,0,"","","","","","","",""',
  '"[明細行]","令和06年13月01日",500,"","NO","","","","","会議費","","","課対仕入10%","",1000,,"現金","","","対象外","",1000,,"不正日付行","適格","100%","",,"","令和07年06月19日",19999',
  '"[月計行]","","","","","","","","","","","","","",1811789,0,"","","","","",1811789,0,"","","","","","","",""',
].join("\r\n");
const ledgerLines = decodeCsvBuffer(iconv.encode(ledger, "shift_jis")).split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
const ledgerHeader = findJournalHeader(ledgerLines);
check("帳簿形式: ヘッダー検出(前置き3行スキップ)", ledgerHeader?.headerLineIdx === 3);
if (ledgerHeader) {
  const { rows: impRows, skipped, errors: impErrors } = parseImportRows(ledgerLines, ledgerHeader.header, ledgerHeader.headerLineIdx);
  check("帳簿形式: 完全な明細1行だけを取込", impRows.length === 1, `got=${impRows.length}`);
  check("帳簿形式: 和暦日付を解釈", impRows[0]?.date.toISOString().slice(0, 10) === "2024-08-01");
  check("帳簿形式: 明示的な集計行2件だけをskipped", skipped === 2, `skipped=${skipped}`);
  check("帳簿形式: 不正日付と必須値欠落がエラー", impErrors.length === 3 && impErrors.some((e) => e.includes("無効な日付")) && impErrors.some((e) => e.includes("金額")), JSON.stringify(impErrors));
  check("帳簿形式: 摘要/科目/金額", impRows[0]?.description === "だんらん亭" && impRows[0]?.debitAccount === "交際費" && impRows[0]?.amount === 36930);
  check("帳簿形式: 空科目行はrowsへ入らない", impRows.every((row) => row.debitAccount && row.creditAccount));
}

// --- 3f. 不完全な複合伝票を部分保存しない ---
const safetyLedger = [
  '"[仕訳行区分]","日付","伝票No.","借方科目","貸方科目","金額","摘要"',
  '"[明細行]","2026-07-01",10,"旅費交通費","現金",1000,"複合の有効側"',
  '"[明細行]","2026-07-01",10,"会議費","現金",,"複合の金額欠落側"',
  '"[明細行]","2026-07-02",10,"通信費","現金",2000,"別日同番号の正常伝票"',
  '"[明細行]","2026-07-02",11,,"現金",500,"借方欠落"',
  '"[明細行]","2026-07-03",12,"消耗品費","現金",,"通常の金額欠落"',
  '"[明細行]","2026-07-04",13,"通信費","現金",300,"独立した正常伝票"',
  '"[明細行]","2026-07-05",20,"水道光熱費","現金",400,"日付不明行と同番号"',
  '"[明細行]","",20,"水道光熱費","現金",400,"所属日不明の不正行"',
  '"[明細行]","2026-07-06",20,"水道光熱費","現金",425,"日付不明行の直後にある別日伝票"',
  '"[累計行]","","","","",1800,""',
  '"[明細行]","2026-07-10",20,"水道光熱費","現金",450,"離れた別日の正常伝票"',
].join("\n");
const safetyLines = safetyLedger.split("\n");
const safetyHeader = findJournalHeader(safetyLines);
check("安全策: ヘッダーから行区分と伝票番号を検出", safetyHeader?.header.rowTypeIdx === 0 && safetyHeader?.header.voucherIdx === 2);
if (safetyHeader) {
  const safety = parseImportRows(safetyLines, safetyHeader.header, safetyHeader.headerLineIdx);
  check("安全策: 明確な累計行だけskipped", safety.skipped === 1, `skipped=${safety.skipped}`);
  check("安全策: 通常明細の金額欠落はエラー", safety.errors.some((e) => e.includes("行6") && e.includes("金額")), JSON.stringify(safety.errors));
  check("安全策: 空科目行はrowsへ入らない", safety.rows.every((row) => row.debitAccount && row.creditAccount));
  check("安全策: 同日同Noの不完全な複合伝票を部分保存しない", !safety.rows.some((row) => row.amount === 1000) && safety.errors.some((e) => e.includes("伝票10") && e.includes("2026-07-01")), JSON.stringify(safety));
  check("安全策: 別日同Noの正常伝票は残す", safety.rows.some((row) => row.amount === 2000), JSON.stringify(safety));
  check("安全策: 日付欠落行は直前の同一No伝票だけを除外", !safety.rows.some((row) => row.amount === 400), JSON.stringify(safety));
  check("安全策: 日付欠落行の直後にある別日同Noは残す", safety.rows.some((row) => row.amount === 425), JSON.stringify(safety));
  check("安全策: 離れた別日同Noの正常伝票は残す", safety.rows.some((row) => row.amount === 450), JSON.stringify(safety));
  check("安全策: 独立した正常伝票は残す", safety.rows.some((row) => row.amount === 300), JSON.stringify(safety));
}

// --- 3g. 伝票列のない通常CSVは、不正行だけをエラーにして正常行を保持 ---
const plainImportLines = [
  '"日付","借方科目","貸方科目","金額"',
  '"2026-07-01","会議費","現金",500',
  '"","消耗品費","現金",300',
];
const plainImportHeader = findJournalHeader(plainImportLines);
if (plainImportHeader) {
  const plainImport = parseImportRows(plainImportLines, plainImportHeader.header, plainImportHeader.headerLineIdx);
  check("通常CSV: 伝票列なしでも正常行を保持", plainImport.rows.length === 1 && plainImport.rows[0]?.amount === 500, JSON.stringify(plainImport));
  check("通常CSV: 伝票列なしの不正行はerror", plainImport.errors.length === 1 && plainImport.errors[0].includes("日付"), JSON.stringify(plainImport.errors));
}

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
