// source バックフィル可否の読み取り専用調査(何も変更しない)
import pg from "pg";
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL required"); process.exit(1); }
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  const dist = await c.query(`
    SELECT source, is_confirmed, (receipt_id IS NULL) AS no_receipt, COUNT(*) AS n
    FROM journal_entries
    GROUP BY source, is_confirmed, (receipt_id IS NULL)
    ORDER BY n DESC`);
  console.log("journal_entries 分布(source / isConfirmed / receiptId無し / 件数):");
  for (const r of dist.rows) console.log(`  ${r.source ?? "null"} / ${r.is_confirmed} / ${r.no_receipt} / ${r.n}`);

  const audit = await c.query(`
    SELECT action, COUNT(*) AS n, MAX(created_at) AS last
    FROM audit_logs
    WHERE action IN ('CSV_IMPORT','STATEMENT_IMPORT') OR action ILIKE '%DELETE%'
    GROUP BY action ORDER BY n DESC`);
  console.log("関連 audit_logs:");
  for (const r of audit.rows) console.log(`  ${r.action}: ${r.n}件 (最終 ${r.last?.toISOString?.() ?? r.last})`);

  // 30日削除cronが既にreceiptIdをnull化した形跡(deleteAfter経由)の代替確認: 現存レシート数
  const rc = await c.query(`SELECT status, COUNT(*) AS n FROM receipts GROUP BY status`);
  console.log("receipts 状態別:");
  for (const r of rc.rows) console.log(`  ${r.status}: ${r.n}`);
} finally {
  await c.end();
}
