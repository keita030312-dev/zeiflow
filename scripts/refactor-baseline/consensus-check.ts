import { computeConsensus, parseOcrResponseToArray } from "../../src/lib/ai/ocr-consensus";
let failed = 0;
const fail = (m: string) => { failed++; console.error("FAIL:", m); };
const mk = (total: number, store: string) => ({
  ocr: { storeName: store, date: "2026-04-15", items: [], total, taxTotal: 10,
         paymentMethod: "現金", invoiceNumber: null, rawText: "", fieldConfidence: {} },
  classification: { debitAccount: "会議費", creditAccount: "現金", amount: total,
                    taxAmount: 10, taxRate: 0.1, description: "d", confidence: 0.9 },
});
// 3票中2票一致 → 最頻値、数値は中央値
const c = computeConsensus([[mk(100, "A")], [mk(100, "A")], [mk(200, "B")]]);
if (c.length !== 1) fail("合議の件数が1でない");
if (c[0].ocr.storeName !== "A") fail("storeName 最頻値が変わった");
if (c[0].ocr.total !== 100) fail("total 中央値が変わった");
if (c[0].ocr.fieldConfidence.storeName < 0.5) fail("2/3一致のconfidenceが低すぎる");
// JSONパース: コードブロック / 裸JSON / 不正入力
if (parseOcrResponseToArray('```json\n[{"a":1}]\n```').length !== 1) fail("コードブロックJSONを読めない");
if (parseOcrResponseToArray('{"a":1}').length !== 1) fail("単一オブジェクトを配列化できない");
if (parseOcrResponseToArray("ただの文章").length !== 0) fail("不正入力で空配列にならない");
console.log(failed ? `${failed} 件失敗` : "ALL PASS");
process.exit(failed ? 1 : 0);
