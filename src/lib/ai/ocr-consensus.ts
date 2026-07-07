import { ensureOcrResultShape } from "@/lib/ocr-result-normalize";

// ===== Ultra mode (multi-vote consensus) helpers =====

// 値の最頻値を返す。同数なら最初に出現したもの優先
export function mode<T>(values: T[]): { value: T; count: number } | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = { value: values[0], count: 0 };
  for (const [v, c] of counts) {
    if (c > best.count) best = { value: v, count: c };
  }
  return best;
}

// 数値の中央値
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

// 複数のOCR結果配列(レシート単位)を要素ごとに合議
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeConsensus(parsedArrays: any[][]): any[] {
  if (parsedArrays.length === 0) return [];
  if (parsedArrays.length === 1) return parsedArrays[0];

  // レシート枚数: 多数決(最頻値) — もし全部1枚なら1枚
  const lengths = parsedArrays.map(a => a.length);
  const lenMode = mode(lengths);
  const referenceLen = lenMode ? lenMode.value : Math.max(...lengths);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  for (let i = 0; i < referenceLen; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = parsedArrays.map(arr => arr[i]).filter((x): x is any => x != null);
    if (items.length === 0) continue;
    if (items.length === 1) {
      result.push(items[0]);
      continue;
    }
    result.push(mergeReceiptResults(items));
  }
  return result;
}

// 同一レシートの複数推論を合議
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeReceiptResults(receipts: any[]): any {
  const list = (receipts || []).filter((r) => r != null && typeof r === "object");
  if (list.length === 0) {
    return JSON.parse(JSON.stringify(ensureOcrResultShape({})));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: any = JSON.parse(JSON.stringify(list[0]));
  if (!merged.ocr) merged.ocr = {};
  if (!merged.ocr.fieldConfidence) merged.ocr.fieldConfidence = {};
  if (!merged.classification) merged.classification = {};

  // 文字列・カテゴリ系: 最頻値を採用、全員一致なら confidence 1.0
  const strFields = ["storeName", "date", "paymentMethod", "invoiceNumber", "dueDate", "documentNo", "purpose"] as const;
  for (const f of strFields) {
    const vals = list.map(r => r?.ocr?.[f]).filter((v: unknown) => v != null && v !== "");
    if (vals.length === 0) continue;
    const m = mode(vals.map(String));
    if (!m) continue;
    merged.ocr[f] = m.value;
    const ratio = m.count / list.length;
    if (ratio === 1) merged.ocr.fieldConfidence[f] = 1.0;
    else if (ratio >= 2 / 3) merged.ocr.fieldConfidence[f] = Math.max(0.85, ratio);
    else merged.ocr.fieldConfidence[f] = Math.max(0.5, ratio);
  }

  // 数値系: 中央値、全員一致なら confidence 1.0
  const numFields = ["total", "taxTotal"] as const;
  for (const f of numFields) {
    const vals = list
      .map(r => r?.ocr?.[f])
      .filter((v: unknown): v is number => typeof v === "number" && Number.isFinite(v));
    if (vals.length === 0) continue;
    merged.ocr[f] = median(vals);
    const allAgree = vals.every(v => v === vals[0]);
    if (allAgree) {
      merged.ocr.fieldConfidence[f] = 1.0;
    } else {
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const spread = max > 0 ? (max - min) / max : 0;
      merged.ocr.fieldConfidence[f] = Math.max(0.5, 1 - spread);
    }
  }

  // classification: confidence最大のものを採用
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classifications = list.map((r: any) => r?.classification).filter(Boolean);
  if (classifications.length > 0) {
    const best = classifications.reduce((a, b) =>
      (a?.confidence ?? 0) >= (b?.confidence ?? 0) ? a : b,
    );
    merged.classification = best;
    // amount もrescue
    const amounts = list
      .map(r => r?.classification?.amount)
      .filter((v: unknown): v is number => typeof v === "number" && Number.isFinite(v));
    if (amounts.length > 0) merged.classification.amount = median(amounts);
  }

  // items は最も長い配列を採用(情報量優先)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemArrays = list.map((r: any) => r?.ocr?.items).filter(Array.isArray);
  if (itemArrays.length > 0) {
    merged.ocr.items = itemArrays.reduce((a, b) => (b.length > a.length ? b : a), itemArrays[0]);
  }

  return merged;
}

// レスポンスからJSON配列を抽出してパース
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseOcrResponseToArray(text: string): any[] {
  const codeBlockMatch = text.match(/```json?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.match(/[\[{][\s\S]*[\]}]/)?.[0];
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}
