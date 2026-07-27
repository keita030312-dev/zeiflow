import iconv from "iconv-lite";
import type { PastJournalRow } from "@/lib/ai/learning-context";

/**
 * quote-aware CSV 1行パーサー。`"1,234"` や `"Lunch, client"` のような quoted comma を正しく扱う。
 * 過去に `split(",")` を使っていて、quoted comma で列ズレ → 行が拒否される/誤った列に取り込まれる事故があった。
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else if (ch === '"') {
      inQuote = true;
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * CSV/テキストのバイト列を文字列化する。
 * 会計ソフト(freee/弥生/MF)のCSVエクスポートは Shift-JIS が標準のため、
 * UTF-8として不正なバイト(U+FFFDに置換される)を検知したら Shift-JIS で再デコードする。
 */
export function decodeCsvBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString("utf-8");
  if (utf8.includes("�")) {
    const sjis = iconv.decode(buffer, "shift_jis");
    // Shift-JIS解釈でも化けるなら元のUTF-8解釈を返す(どちらも不正なバイナリ等)
    if (!sjis.includes("�")) return stripBom(sjis);
  }
  return stripBom(utf8);
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 仕訳CSVのヘッダー列位置。日付/借方/貸方/金額が揃わなければ仕訳CSVとみなさない */
export interface JournalCsvHeader {
  dateIdx: number;
  debitIdx: number;
  creditIdx: number;
  amountIdx: number;
  descIdx: number;
  taxIdx: number;
  invoiceIdx: number;
  memoIdx: number;
}

export function detectJournalHeader(header: string[]): JournalCsvHeader | null {
  const dateIdx = header.findIndex((h) => /日付|date/i.test(h));
  const debitIdx = header.findIndex((h) => /借方|debit/i.test(h));
  const creditIdx = header.findIndex((h) => /貸方|credit/i.test(h));
  const amountIdx = header.findIndex((h) => /金額|amount/i.test(h));
  if (dateIdx === -1 || debitIdx === -1 || creditIdx === -1 || amountIdx === -1) return null;
  return {
    dateIdx,
    debitIdx,
    creditIdx,
    amountIdx,
    descIdx: header.findIndex((h) => /摘要|description|内容/i.test(h)),
    taxIdx: header.findIndex((h) => /税額|tax/i.test(h)),
    invoiceIdx: header.findIndex((h) => /登録番号|invoice|インボイス/i.test(h)),
    memoIdx: header.findIndex((h) => /メモ|備考|memo/i.test(h)),
  };
}

/**
 * テキストが仕訳CSV(日付/借方/貸方/金額を含む)なら学習用の行配列に変換する。
 * 仕訳CSVでなければ null(呼び出し側は通常テキストとして扱う)。
 * ナレッジに貼られた1年分の仕訳を、生テキストのまま切り詰めずに
 * 「店名→科目」の集計に圧縮するための入口。
 */
export function parseJournalCsv(text: string): PastJournalRow[] | null {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  const header = detectJournalHeader(parseCsvLine(lines[0]));
  if (!header) return null;

  const rows: PastJournalRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const debitAccount = cols[header.debitIdx];
    const creditAccount = cols[header.creditIdx];
    const amount = parseInt((cols[header.amountIdx] || "").replace(/[,¥\\]/g, ""), 10);
    if (!debitAccount || !creditAccount || isNaN(amount) || amount <= 0) continue;
    rows.push({
      description: header.descIdx >= 0 ? cols[header.descIdx] || "" : "",
      debitAccount,
      creditAccount,
      amount,
      taxRate: null,
    });
  }
  return rows.length > 0 ? rows : null;
}
