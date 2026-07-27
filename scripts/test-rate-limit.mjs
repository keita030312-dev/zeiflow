// ZeiFlow APIレート制限の回帰テスト
// 実行: node --experimental-strip-types scripts/test-rate-limit.mjs
import { getRateLimitType, isRateLimited } from "../src/lib/rate-limit-core.ts";

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`OK   ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name} ${detail}`);
  }
}

check("レシートGETは一般API枠", getRateLimitType("GET", "/api/receipts") === "api");
check("レシートDELETEは一般API枠", getRateLimitType("DELETE", "/api/receipts") === "api");
check("レシートPOSTは新規OCR枠", getRateLimitType("POST", "/api/receipts") === "receiptUpload");
check("OCR再試行POSTは専用枠", getRateLimitType("POST", "/api/receipts/retry") === "receiptRetry");
check("ポータルPOSTは新規OCR枠", getRateLimitType("POST", "/api/portal/receipts") === "receiptUpload");
check("ナレッジGETは一般API枠", getRateLimitType("GET", "/api/knowledge") === "api");
check("ナレッジPOSTは専用枠", getRateLimitType("POST", "/api/knowledge") === "knowledgeUpload");
check("ログインフォームは認証枠", getRateLimitType("POST", "/api/auth/login-form") === "auth");

// 実際の画面操作と同じ順序: 初期GET → 20枚POST → 完了GET → DELETE/再試行。
const operationIp = `test-operation-${Date.now()}`;
check("初期GETを許可", !isRateLimited(operationIp, getRateLimitType("GET", "/api/receipts")));
let allTwentyAllowed = true;
for (let i = 0; i < 20; i++) {
  const type = getRateLimitType("POST", "/api/receipts");
  if (isRateLimited(operationIp, type)) allTwentyAllowed = false;
}
check("新規OCRを20枚すべて許可", allTwentyAllowed);
check("完了後GETを許可", !isRateLimited(operationIp, getRateLimitType("GET", "/api/receipts")));
check("20枚後のDELETEを許可", !isRateLimited(operationIp, getRateLimitType("DELETE", "/api/receipts")));
check("20枚後のOCR再試行を許可", !isRateLimited(operationIp, getRateLimitType("POST", "/api/receipts/retry")));
check("ナレッジ登録は新規OCR枠と独立", !isRateLimited(operationIp, getRateLimitType("POST", "/api/knowledge")));
check("新規OCRの21枚目は制限", isRateLimited(operationIp, "receiptUpload"));

const authIp = `test-auth-${Date.now()}`;
let firstFiveAllowed = true;
for (let i = 0; i < 5; i++) {
  if (isRateLimited(authIp, "auth")) firstFiveAllowed = false;
}
check("認証は5回まで許可", firstFiveAllowed);
check("認証6回目は制限", isRateLimited(authIp, "auth"));

process.exit(failed ? 1 : 0);
