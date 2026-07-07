// 信頼度バッジ: 高(緑) / 中(黄) / 低(赤) を1行で表示
export function ConfidenceBadge({ value }: { value?: number }) {
  if (value === undefined || value === null) return null;
  const pct = Math.round(value * 100);
  let cls = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  let label = `確実 ${pct}%`;
  if (value < 0.5) {
    cls = "bg-rose-500/15 text-rose-300 border-rose-500/30";
    label = `要確認 ${pct}%`;
  } else if (value < 0.85) {
    cls = "bg-amber-500/15 text-amber-300 border-amber-500/30";
    label = `中 ${pct}%`;
  }
  return (
    <span className={`ml-2 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
