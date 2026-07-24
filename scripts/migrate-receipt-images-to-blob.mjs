// 既存レシート画像のDB(base64)→Vercel Blob移行
// - image_data がある全レシートをBlobへアップロードし、image_path=URL・image_data=null に更新
// - 移行と競合してレシートが削除された場合はBlob側を掃除(孤児防止)
// - 最後に VACUUM FULL でDBの物理サイズを回収
// 実行: DATABASE_URL と BLOB_READ_WRITE_TOKEN を環境変数で渡す
//   (トークンは `npx vercel env pull .env.vercel-pull` で取得)
import { Client } from "pg";
import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

// BLOB_READ_WRITE_TOKEN が未設定なら .env.vercel-pull から読む
if (!process.env.BLOB_READ_WRITE_TOKEN && fs.existsSync(".env.vercel-pull")) {
  const m = fs.readFileSync(".env.vercel-pull", "utf8").match(/^BLOB_READ_WRITE_TOKEN="?([^"\r\n]+)"?/m);
  if (m) process.env.BLOB_READ_WRITE_TOKEN = m[1];
}
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL required"); process.exit(1); }
if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error("BLOB_READ_WRITE_TOKEN required"); process.exit(1); }

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const ids = (await c.query(
  "select id from receipts where image_data is not null order by uploaded_at"
)).rows;
console.log(`migrating ${ids.length} images to Vercel Blob...`);

let done = 0, failed = 0;
for (const { id } of ids) {
  const r = (await c.query(
    "select image_data, image_mime from receipts where id=$1", [id]
  )).rows[0];
  if (!r?.image_data) continue; // 並行して確定・削除された

  const mime = r.image_mime || "image/jpeg";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  let url;
  try {
    ({ url } = await put(`receipts/${randomUUID()}.${ext}`, Buffer.from(r.image_data, "base64"), {
      access: "public",
      contentType: mime,
      addRandomSuffix: true,
    }));
  } catch (e) {
    console.log(`FAIL upload ${id}: ${e.message}`);
    failed++;
    continue;
  }

  // 画像が今もあるレシートだけ更新。0件なら並行削除されたのでBlobを掃除
  // UPDATE自体の失敗(接続断等)でもBlobを孤児にしない
  let upd;
  try {
    upd = await c.query(
      "update receipts set image_path=$1, image_data=null where id=$2 and image_data is not null",
      [url, id]
    );
  } catch (e) {
    console.log(`FAIL update ${id}: ${e.message}`);
    await del(url).catch(() => {});
    failed++;
    continue;
  }
  if (upd.rowCount === 0) {
    await del(url).catch(() => {});
    continue;
  }
  done++;
  if (done % 10 === 0) console.log(`${done}/${ids.length}`);
}

console.log(`done: ${done} migrated, ${failed} failed`);

if (failed === 0) {
  // 注意: VACUUM FULLはACCESS EXCLUSIVEロック(実行中は全アップロード・表示が停止)。
  // 数十秒で終わる想定だが、顧客が使わない時間帯に実行すること。
  console.log("vacuum full receipts...");
  await c.query("vacuum full receipts");
}
const sizes = (await c.query(
  "select pg_size_pretty(pg_total_relation_size('receipts')) as receipts, pg_size_pretty(pg_database_size(current_database())) as db from receipts limit 1"
)).rows[0] || {};
console.log("receipts table:", sizes.receipts, "/ DB:", sizes.db);
await c.end();
