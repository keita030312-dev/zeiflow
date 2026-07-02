/** CSV用エスケープ（改行除去 → 数式インジェクション対策 → クォート） */
export function csvEscape(value: string): string {
  const cleaned = value.replace(/[\r\n]+/g, " ").trim();
  const safe = /^[=+\-@\t]/.test(cleaned) ? `'${cleaned}` : cleaned;
  if (safe.includes(",") || safe.includes('"')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
