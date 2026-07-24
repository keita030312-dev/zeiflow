// DB内レシート画像の再圧縮(幅1600px上限・JPEG品質75)
// 事前に backup-receipt-images.mjs でローカルバックアップ済みであること
import { Client } from "pg";
import sharp from "sharp";

const conn = process.env.DATABASE_URL;
if (!conn) { console.error("DATABASE_URL required"); process.exit(1); }

const c = new Client({ connectionString: conn });
await c.connect();

// DBが512MB上限に達しているため、書き込みが「could not extend file」で失敗しうる。
// 大きい画像から順に縮め、こまめにVACUUMで空きページを回収しながら、失敗はVACUUM後にリトライする。
const ids = (await c.query(
  "select id from receipts where image_data is not null and length(image_data) > 700000 order by length(image_data) desc"
)).rows;
console.log(`recompressing ${ids.length} images...`);

let done = 0, skipped = 0, failed = 0, savedBytes = 0;
for (const { id } of ids) {
  const r = (await c.query("select image_data, image_mime from receipts where id=$1", [id])).rows[0];
  const orig = Buffer.from(r.image_data, "base64");
  let out;
  try {
    out = await sharp(orig)
      .rotate() // EXIFの向きを反映してから回転情報を破棄
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    console.log(`SKIP ${id}: decode failed (${e.message})`);
    skipped++;
    continue;
  }
  if (out.length >= orig.length) { skipped++; continue; }
  const b64 = out.toString("base64");
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      await c.query("update receipts set image_data=$1, image_mime='image/jpeg' where id=$2", [b64, id]);
      ok = true;
    } catch (e) {
      if (e.code === "53100") {
        console.log(`extend-fail on ${id} (attempt ${attempt}) -> vacuum & retry`);
        await c.query("vacuum receipts");
      } else throw e;
    }
  }
  if (!ok) { failed++; continue; }
  savedBytes += orig.length - out.length;
  done++;
  if (done % 5 === 0) {
    await c.query("vacuum receipts"); // 旧バージョンの巨大TOASTを即回収して空きを確保
    console.log(`${done}/${ids.length} (saved ${(savedBytes / 1024 / 1024).toFixed(0)}MB so far)`);
  }
}
console.log(`done: ${done} recompressed, ${skipped} skipped, ${failed} failed, saved ${(savedBytes / 1024 / 1024).toFixed(0)}MB (raw)`);

await c.query("vacuum receipts");
const sizes = (await c.query(
  "select pg_size_pretty(pg_total_relation_size('receipts')) as receipts, pg_size_pretty(pg_database_size(current_database())) as db, pg_size_pretty(sum(length(image_data))::bigint) as live_b64 from receipts"
)).rows[0];
console.log("receipts table:", sizes.receipts, "/ DB:", sizes.db, "/ live image data (b64):", sizes.live_b64);
await c.end();
