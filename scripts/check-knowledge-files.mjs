// ナレッジファイルの実態調査(読み取り専用・本文は先頭120字のみ)
import pg from "pg";
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL required"); process.exit(1); }
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  const kf = await c.query(`
    SELECT id, name, mime_type, file_size, LENGTH(extracted_text) AS text_len,
           client_id IS NOT NULL AS has_client, created_at,
           LEFT(extracted_text, 120) AS head
    FROM knowledge_files ORDER BY created_at DESC`);
  console.log(`knowledge_files: ${kf.rows.length}件`);
  for (const r of kf.rows) {
    console.log(`---\n${r.name} | ${r.mime_type} | file=${r.file_size}B text=${r.text_len}字 | client=${r.has_client} | ${r.created_at.toISOString()}`);
    console.log(`  先頭: ${JSON.stringify(r.head)}`);
  }
} finally {
  await c.end();
}
