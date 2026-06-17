/**
 * 2026-06-17 マイグレーション実行スクリプト
 * node prisma/manual_backfills/run_2026-06-17.mjs
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local から DATABASE_URL を読む
function loadEnv() {
  let envPath = path.join(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) envPath = path.join(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) throw new Error(".env / .env.local not found");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^DATABASE_URL\s*=\s*"?([^"]+)"?/);
    if (m) return m[1].trim();
  }
  throw new Error("DATABASE_URL not found in .env.local");
}

const databaseUrl = loadEnv();
// Neon は IPv4 が必要。?sslmode=require&connect_timeout=10 を付与
const url = new URL(databaseUrl);
if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");

const client = new pg.Client({ connectionString: url.toString() });

const sql = fs.readFileSync(
  path.join(__dirname, "2026-06-17_tax_and_accounts.sql"),
  "utf8"
);

await client.connect();
try {
  await client.query(sql);
  console.log("Migration completed successfully.");
} finally {
  await client.end();
}
