/** processReceipt が使う「過去の仕訳 → 学習プロンプト文字列」の純関数 */
export interface PastJournalRow {
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  taxRate: number | null;
}

/** 学習テキストの安全上限(プロンプト肥大による速度・コスト悪化を防ぐ) */
const LEARNING_TEXT_MAX_CHARS = 8000;

/**
 * 摘要の正規化キー。表記ゆれ(半角カナ/全角英数/大文字小文字/金額数字)で
 * 「ローソン」「ﾛｰｿﾝ」「LAWSON渋谷店」が別パターンに分裂するのを抑える。
 * NFKCで半角カナ→全角カナ・全角英数→半角英数に寄せる。
 */
function normalizeDescKey(description: string): string {
  return description
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/[¥円,、]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** キーごとに借方/貸方ペアの出現回数を数え、多数決で代表ペアを決める集計器 */
class PatternCounter {
  private map = new Map<string, { label: string; pairs: Map<string, { debit: string; credit: string; count: number }>; total: number }>();

  add(key: string, label: string, debit: string, credit: string) {
    let entry = this.map.get(key);
    if (!entry) {
      entry = { label, pairs: new Map(), total: 0 };
      this.map.set(key, entry);
    }
    entry.total++;
    const pairKey = `${debit}/${credit}`;
    const pair = entry.pairs.get(pairKey);
    if (pair) pair.count++;
    else entry.pairs.set(pairKey, { debit, credit, count: 1 });
  }

  /** 出現回数順に上位limit件を [ラベル, 多数決ペア, ペア回数, 総回数] で返す */
  top(limit: number): { label: string; debit: string; credit: string; count: number; total: number }[] {
    return Array.from(this.map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((entry) => {
        const majority = Array.from(entry.pairs.values()).sort((a, b) => b.count - a.count)[0];
        return { label: entry.label, debit: majority.debit, credit: majority.credit, count: majority.count, total: entry.total };
      });
  }
}

export function buildLearningText(pastJournals: PastJournalRow[]): string {
  if (pastJournals.length === 0) return "";

  // 1. 摘要パターン(店名ベース) 2. キーワードパターン 3. 金額帯パターン
  // いずれも科目ペアは多数決(以前は最初に出現したペアが勝つ実装で、
  // 「ローソン→会議費が30回」より先頭1件の福利厚生費が学習される問題があった)
  const descPatterns = new PatternCounter();
  const keywordPatterns = new PatternCounter();
  const amountPatterns = new PatternCounter();

  const keywords = ["飲食", "ご飲食", "食事", "ランチ", "ディナー", "交通", "タクシー", "電車", "バス", "ガソリン", "駐車", "宿泊", "ホテル", "消耗品", "文具", "書籍", "通信", "郵便", "保険", "家賃", "水道", "電気", "ガス", "広告", "外注", "修繕"];

  for (const j of pastJournals) {
    const descKey = normalizeDescKey(j.description);
    if (descKey.length >= 2) {
      descPatterns.add(descKey, descKey, j.debitAccount, j.creditAccount);
    }

    for (const kw of keywords) {
      if (j.description.includes(kw)) {
        keywordPatterns.add(kw, kw, j.debitAccount, j.creditAccount);
      }
    }

    // 金額帯パターン(5000円以下/超、1万円以下/超)
    const amountRange = j.amount <= 5000 ? "5000円以下" : j.amount <= 10000 ? "5001〜10000円" : "10001円以上";
    amountPatterns.add(`${j.debitAccount}_${amountRange}`, `${j.debitAccount}で${amountRange}の場合`, j.debitAccount, j.creditAccount);
  }

  // 摘要パターンは学習の主役なので広めに採る(1年分の取込データでも店名は数十〜数百に集約される)
  const descLines = descPatterns
    .top(100)
    .map((p) => `「${p.label}」→ ${p.debit}/${p.credit}（${p.count}回）`);

  const kwLines = keywordPatterns
    .top(15)
    .map((p) => `キーワード「${p.label}」を含む → ${p.debit}/${p.credit}（${p.count}回）`);

  const amLines = amountPatterns
    .top(10)
    .filter((p) => p.count >= 2)
    .map((p) => `${p.label} → 貸方:${p.credit}（${p.count}回）`);

  const text = [
    descLines.length > 0 ? "■摘要パターン:\n" + descLines.join("\n") : "",
    kwLines.length > 0 ? "■キーワードパターン:\n" + kwLines.join("\n") : "",
    amLines.length > 0 ? "■金額帯パターン:\n" + amLines.join("\n") : "",
  ].filter(Boolean).join("\n\n");

  return text.length > LEARNING_TEXT_MAX_CHARS ? text.substring(0, LEARNING_TEXT_MAX_CHARS) : text;
}
