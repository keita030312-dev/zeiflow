// PostgreSQL接続URLのSSL正規化回帰テスト
// 実行: node --experimental-strip-types scripts/test-database-url.mjs
import { normalizePgConnectionString } from "../src/lib/database-url.ts";

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`OK   ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name} ${detail}`);
  }
}

for (const mode of ["prefer", "require", "verify-ca"]) {
  const input = `postgresql://user:p%40ss@db.example.com:5432/app?sslmode=${mode}&application_name=zeiflow`;
  const normalized = new URL(normalizePgConnectionString(input));
  check(`${mode}をverify-fullへ正規化`, normalized.searchParams.get("sslmode") === "verify-full");
  check(`${mode}でも他の接続情報を保持`,
    normalized.username === "user" &&
    normalized.password === "p%40ss" &&
    normalized.hostname === "db.example.com" &&
    normalized.pathname === "/app" &&
    normalized.searchParams.get("application_name") === "zeiflow");
}

for (const mode of ["verify-full", "disable", "no-verify"]) {
  const input = `postgresql://db.example.com/app?sslmode=${mode}`;
  check(`${mode}は変更しない`, normalizePgConnectionString(input) === input);
}

for (const mode of ["prefer", "require", "verify-ca"]) {
  const libpqCompat = `postgresql://db.example.com/app?sslmode=${mode}&uselibpqcompat=true`;
  check(`libpq互換を明示した${mode}は変更しない`, normalizePgConnectionString(libpqCompat) === libpqCompat);
}

const noSslMode = "postgresql://db.example.com/app?application_name=zeiflow";
check("sslmodeなしは変更しない", normalizePgConnectionString(noSslMode) === noSslMode);
check("不正URLはDBドライバーへそのまま渡す", normalizePgConnectionString("not-a-database-url") === "not-a-database-url");
check("PostgreSQL以外のURLは変更しない", normalizePgConnectionString("https://example.com/?sslmode=require") === "https://example.com/?sslmode=require");

const lastSslAlias = normalizePgConnectionString("postgresql://db.example.com/app?sslmode=disable&sslmode=require");
check("重複sslmodeは最後のrequireを正規化", new URL(lastSslAlias).searchParams.getAll("sslmode").at(-1) === "verify-full");
const lastSslDisable = "postgresql://db.example.com/app?sslmode=require&sslmode=disable";
check("重複sslmodeは最後のdisableを優先", normalizePgConnectionString(lastSslDisable) === lastSslDisable);

const lastCompatTrue = "postgresql://db.example.com/app?sslmode=require&uselibpqcompat=false&uselibpqcompat=true";
check("重複uselibpqcompatは最後のtrueを優先", normalizePgConnectionString(lastCompatTrue) === lastCompatTrue);
const lastCompatFalse = normalizePgConnectionString(
  "postgresql://db.example.com/app?sslmode=require&uselibpqcompat=true&uselibpqcompat=false",
);
check("重複uselibpqcompatは最後のfalseを優先", new URL(lastCompatFalse).searchParams.get("sslmode") === "verify-full");

process.exit(failed ? 1 : 0);
