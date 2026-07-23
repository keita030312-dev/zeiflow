/**
 * バックアップAPI 動作確認スクリプト（使い捨てQA組織方式）
 * node scripts/qa-backup-check.mjs
 *
 * 1. 本番に QA 組織を /api/auth/register で作成
 * 2. DB で is_approved=true に更新
 * 3. login-form でログインしセッションcookie取得
 * 4. GET /api/backup を実行し JSON 構造を検証
 * 5. QA 組織を SQL で完全削除（audit_logs は user_id 経由も消す — FK残骸防止）
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
  if (!fs.existsSync(envPath)) throw new Error(".env / .env.local not found");
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
const email = `keita.030312+qabk${suffix}@gmail.com`;
const password = "QaBackupCheck2026x";

await db.connect();
let orgId = null;
try {
  // 1. 登録
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: "QA検証(削除予定)",
      officeName: `QA-backup-check-${suffix}(削除予定)`,
      agreedToTerms: true,
    }),
  });
  if (!reg.ok) throw new Error(`register failed: ${reg.status} ${await reg.text()}`);
  console.log("[1/5] register OK:", email);

  // 2. 承認
  const r = await db.query(
    `UPDATE organizations SET is_approved = true
     WHERE id = (SELECT organization_id FROM users WHERE email = $1)
     RETURNING id`,
    [email]
  );
  orgId = r.rows[0]?.id;
  if (!orgId) throw new Error("org not found after register");
  console.log("[2/5] approved org:", orgId);

  // 3. ログイン（303リダイレクト＋Set-Cookie）
  const form = new URLSearchParams({ email, password });
  const login = await fetch(`${BASE}/api/auth/login-form`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  const setCookie = login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie")].filter(Boolean);
  const loc = login.headers.get("location") || "";
  if (login.status !== 303 || !loc.includes("/dashboard") || setCookie.length === 0) {
    throw new Error(`login failed: status=${login.status} location=${loc} cookies=${setCookie.length}`);
  }
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  console.log("[3/5] login OK (redirect →", loc.replace(BASE, ""), ")");

  // 4. backup 取得
  const bk = await fetch(`${BASE}/api/backup`, { headers: { Cookie: cookie } });
  if (!bk.ok) throw new Error(`backup failed: ${bk.status} ${await bk.text()}`);
  const disp = bk.headers.get("content-disposition") || "";
  const body = await bk.json();
  const keys = Object.keys(body);
  const dataKeys = Object.keys(body.data || {});
  console.log("[4/5] backup OK");
  console.log("   Content-Disposition:", disp);
  console.log("   top-level keys:", keys.join(", "));
  console.log("   data keys:", dataKeys.join(", "));
  console.log(
    "   counts:",
    dataKeys.map((k) => `${k}=${Array.isArray(body.data[k]) ? body.data[k].length : "?"}`).join(" ")
  );
  const expectData = ["clients", "journals", "exportLogs", "auditLogs"];
  const missing = expectData.filter((k) => !dataKeys.includes(k));
  if (missing.length) throw new Error(`backup JSON missing keys: ${missing.join(",")}`);
  if (!disp.includes("zeiflow-backup-")) throw new Error("filename missing in Content-Disposition");
  console.log("   => 構造検証 PASS");
} finally {
  // 5. 掃除（orgが作られていれば必ず消す）
  if (orgId) {
    await db.query(
      `DELETE FROM audit_logs WHERE organization_id = $1
        OR user_id IN (SELECT id FROM users WHERE organization_id = $1)`,
      [orgId]
    );
    await db.query(
      `DELETE FROM export_logs WHERE organization_id = $1
        OR user_id IN (SELECT id FROM users WHERE organization_id = $1)`,
      [orgId]
    );
    await db.query(`DELETE FROM journal_entries WHERE organization_id = $1`, [orgId]);
    await db.query(`DELETE FROM receipts WHERE organization_id = $1`, [orgId]);
    await db.query(`DELETE FROM client_portal_tokens WHERE client_id IN (SELECT id FROM clients WHERE organization_id = $1)`, [orgId]);
    await db.query(`DELETE FROM clients WHERE organization_id = $1`, [orgId]);
    await db.query(`DELETE FROM knowledge_files WHERE organization_id = $1`, [orgId]);
    await db.query(`DELETE FROM account_masters WHERE organization_id = $1`, [orgId]);
    await db.query(`DELETE FROM users WHERE organization_id = $1`, [orgId]);
    const del = await db.query(`DELETE FROM organizations WHERE id = $1 RETURNING id`, [orgId]);
    console.log("[5/5] cleanup OK: org deleted =", del.rowCount === 1);
  }
  await db.end();
}
