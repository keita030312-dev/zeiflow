// journal_entries に source 列と (client_id, updated_at) インデックスを追加する(冪等・追加のみ)
// 実行: node scripts/apply-source-column.mjs   (DATABASE_URL は .env.vercel-pull 等から環境変数で渡す)
// 7/24 の migrate-receipt-images-to-blob.mjs と同じ接続方式。接続文字列は出力しない。
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

try {
  await c.query(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS "source" TEXT`);
  console.log("ALTER TABLE done");
  // CONCURRENTLY: 書き込みロックを避ける(トランザクション外で実行される前提)
  await c.query(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS "journal_entries_client_id_updated_at_idx"
     ON journal_entries (client_id, updated_at)`,
  );
  console.log("CREATE INDEX done");

  // 存在実測(DDL適用→実測→デプロイの順を守る)
  const col = await c.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = 'journal_entries' AND column_name = 'source'`,
  );
  const idx = await c.query(
    `SELECT indexname FROM pg_indexes
     WHERE tablename = 'journal_entries' AND indexname = 'journal_entries_client_id_updated_at_idx'`,
  );
  console.log("verify column source:", col.rows.length === 1 ? `OK (${col.rows[0].data_type})` : "MISSING");
  console.log("verify index:", idx.rows.length === 1 ? "OK" : "MISSING");
  process.exit(col.rows.length === 1 && idx.rows.length === 1 ? 0 : 1);
} finally {
  await c.end();
}
