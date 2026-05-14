/** DBスキーマ未反映（カラムなし）などの判定 */
export function isLikelyMissingSchemaColumn(err: unknown, columnHint: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes(columnHint.toLowerCase())) return true;
  if (/column.*does not exist|no such column|unknown column/i.test(msg)) return true;
  return false;
}
