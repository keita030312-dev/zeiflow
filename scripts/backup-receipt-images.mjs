// レシート画像の全件バックアップ(再圧縮・削除の前に必ず実行)
// 出力: C:\Users\keita\zeiflow-image-backup-2026-07-24\<receiptId>.<ext> + manifest.json
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

const OUT = "C:\\Users\\keita\\zeiflow-image-backup-2026-07-24";
const conn = process.env.DATABASE_URL;
if (!conn) { console.error("DATABASE_URL required"); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
const c = new Client({ connectionString: conn });
await c.connect();

const ids = (await c.query("select id from receipts where image_data is not null order by uploaded_at")).rows;
console.log(`backing up ${ids.length} images...`);

const manifest = [];
let done = 0;
for (const { id } of ids) {
  const r = (await c.query(
    "select id, image_mime, uploaded_at, client_id, organization_id, length(image_data) as b64len, image_data from receipts where id=$1",
    [id]
  )).rows[0];
  const ext = r.image_mime === "image/png" ? "png" : r.image_mime === "image/webp" ? "webp" : "jpg";
  const file = path.join(OUT, `${r.id}.${ext}`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, Buffer.from(r.image_data, "base64"));
  }
  manifest.push({ id: r.id, mime: r.image_mime, uploaded_at: r.uploaded_at, client_id: r.client_id, organization_id: r.organization_id, b64len: Number(r.b64len), file });
  done++;
  if (done % 20 === 0) console.log(`${done}/${ids.length}`);
}
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
await c.end();
console.log(`done: ${done} images -> ${OUT}`);
