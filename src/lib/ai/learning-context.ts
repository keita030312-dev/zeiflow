/** processReceipt が使う「過去の確定済み仕訳 → 学習プロンプト文字列」の純関数 */
export interface PastJournalRow {
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  taxRate: number | null;
}

export function buildLearningText(pastJournals: PastJournalRow[]): string {
  if (pastJournals.length === 0) return "";

  // 1. 摘要パターン（店名ベース）
  const descPatterns = new Map<string, { debit: string; credit: string; count: number }>();
  // 2. キーワードパターン（飲食代、交通費等のカテゴリ）
  const keywordPatterns = new Map<string, { debit: string; credit: string; count: number }>();
  // 3. 金額帯パターン
  const amountPatterns = new Map<string, { debit: string; credit: string; count: number }>();

  const keywords = ["飲食", "ご飲食", "食事", "ランチ", "ディナー", "交通", "タクシー", "電車", "バス", "ガソリン", "駐車", "宿泊", "ホテル", "消耗品", "文具", "書籍", "通信", "郵便", "保険", "家賃", "水道", "電気", "ガス", "広告", "外注", "修繕"];

  for (const j of pastJournals) {
    // 摘要パターン（数字除去）
    const descKey = j.description.replace(/\d+/g, "").replace(/¥|円/g, "").trim();
    const existing = descPatterns.get(descKey);
    if (existing) existing.count++;
    else descPatterns.set(descKey, { debit: j.debitAccount, credit: j.creditAccount, count: 1 });

    // キーワードパターン
    for (const kw of keywords) {
      if (j.description.includes(kw)) {
        const kwKey = kw;
        const kwExisting = keywordPatterns.get(kwKey);
        if (kwExisting) kwExisting.count++;
        else keywordPatterns.set(kwKey, { debit: j.debitAccount, credit: j.creditAccount, count: 1 });
      }
    }

    // 金額帯パターン（5000円以下/超、1万円以下/超）
    const amountRange = j.amount <= 5000 ? "5000円以下" : j.amount <= 10000 ? "5001〜10000円" : "10001円以上";
    const amKey = `${j.debitAccount}_${amountRange}`;
    const amExisting = amountPatterns.get(amKey);
    if (amExisting) amExisting.count++;
    else amountPatterns.set(amKey, { debit: j.debitAccount, credit: j.creditAccount, count: 1 });
  }

  const descLines = Array.from(descPatterns.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([desc, p]) => `「${desc}」→ ${p.debit}/${p.credit}（${p.count}回）`);

  const kwLines = Array.from(keywordPatterns.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([kw, p]) => `キーワード「${kw}」を含む → ${p.debit}/${p.credit}（${p.count}回）`);

  const amLines = Array.from(amountPatterns.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([key, p]) => {
      const range = key.split("_")[1];
      return `${p.debit}で${range}の場合 → 貸方:${p.credit}（${p.count}回）`;
    });

  return [
    descLines.length > 0 ? "■摘要パターン:\n" + descLines.join("\n") : "",
    kwLines.length > 0 ? "■キーワードパターン:\n" + kwLines.join("\n") : "",
    amLines.length > 0 ? "■金額帯パターン:\n" + amLines.join("\n") : "",
  ].filter(Boolean).join("\n\n");
}
