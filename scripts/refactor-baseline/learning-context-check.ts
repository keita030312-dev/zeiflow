import { buildLearningText } from "../../src/lib/ai/learning-context";
let failed = 0;
const fail = (m: string) => { failed++; console.error("FAIL:", m); };
const rows = [
  { description: "スタバ コーヒー代 550", debitAccount: "会議費", creditAccount: "現金", amount: 550, taxRate: 0.1 },
  { description: "スタバ コーヒー代 660", debitAccount: "会議費", creditAccount: "現金", amount: 660, taxRate: 0.1 },
  { description: "○○タクシー 交通費", debitAccount: "旅費交通費", creditAccount: "現金", amount: 12000, taxRate: 0.1 },
];
const text = buildLearningText(rows);
if (!text.includes("■摘要パターン:")) fail("摘要パターン見出しがない");
if (!text.includes("「スタバ コーヒー代」→ 会議費/現金（2回）")) fail("摘要の数字除去・集計が変わった");
if (!text.includes("キーワード「タクシー」を含む → 旅費交通費/現金（1回）")) fail("キーワードパターンが変わった");
if (!text.includes("会議費で5000円以下の場合 → 貸方:現金（2回）")) fail("金額帯パターンが変わった");
if (buildLearningText([]) !== "") fail("空配列で空文字にならない");
console.log(failed ? `${failed} 件失敗` : "ALL PASS");
process.exit(failed ? 1 : 0);
