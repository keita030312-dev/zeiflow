/**
 * パスワードリセットメール実配達の検証（使い捨てQAユーザー方式）
 * node scripts/qa-reset-mail-check.mjs
 * register で +エイリアスのQAユーザーを作り、reset-request を叩いて実メール配達を確認したら SQL で削除する。
 * メール本体の受信確認は Gmail 側で行う（このスクリプトはAPI応答まで）。
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = "https://zeiflow.vercel.app";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  let envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) envPath = path.join(__dirname, "../.env");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^DATABASE_URL\s*=\s*"?([^"]+)"?/);
    if (m) return m[1].trim();
  }
  throw new Error("DATABASE_URL not found");
}
const url = new URL(loadEnv());
if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
const db = new pg.Client({ connectionString: url.toString() });

const suffix = Date.now().toString(36);
const email = `keita.030312+qareset${suffix}@gmail.com`;

await db.connect();
let orgId = null;
try {
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "QaResetCheck2026x",
      name: "QAリセット検証(削除予定)",
      officeName: `QA-reset-${suffix}(削除予定)`,
      agreedToTerms: true,
    }),
  });
  if (!reg.ok) throw new Error(`register failed: ${reg.status}`);
  const r = await db.query(`SELECT organization_id FROM users WHERE email = $1`, [email]);
  orgId = r.rows[0]?.organization_id;
  console.log("[1/2] QAユーザー作成:", email);

  const rr = await fetch(`${BASE}/api/auth/reset-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  console.log("[2/2] reset-request:", rr.status, JSON.stringify(await rr.json()));
  console.log("→ Gmail で to:" + email + " の受信を確認すること");
} finally {
  if (orgId) {
    await db.query(
      `DELETE FROM audit_logs WHERE organization_id = $1
        OR user_id IN (SELECT id FROM users WHERE organization_id = $1)`, [orgId]);
    await db.query(`DELETE FROM users WHERE organization_id = $1`, [orgId]);
    await db.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
    console.log("cleanup OK: QA組織削除済み");
  }
  await db.end();
}
