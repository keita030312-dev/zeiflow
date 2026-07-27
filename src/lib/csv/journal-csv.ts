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

/**
 * ヘッダー行を先頭maxScan行から探索する。
 * 弥生等の帳票エクスポートは冒頭に「事業所名」「出力日時」などの前置き行があり、
 * 1行目固定の判定ではヘッダーに到達できない。
 */
export function findJournalHeader(
  lines: string[],
  maxScan = 20,
): { header: JournalCsvHeader; headerLineIdx: number } | null {
  const limit = Math.min(lines.length, maxScan);
  for (let i = 0; i < limit; i++) {
    const header = detectJournalHeader(parseCsvLine(lines[i]));
    if (header) return { header, headerLineIdx: i };
  }
  return null;
}

export function detectJournalHeader(header: string[]): JournalCsvHeader | null {
  const dateIdx = header.findIndex((h) => /日付|date/i.test(h));
  const debitIdx = header.findIndex((h) => /借方|debit/i.test(h));
  const creditIdx = header.findIndex((h) => /貸方|credit/i.test(h));
  const amountIdx = header.findIndex((h) => /金額|amount/i.test(h));
  if (dateIdx === -1 || debitIdx === -1 || creditIdx === -1 || amountIdx === -1) return null;
  // 4列が同一セルを指す場合はヘッダーではない
  // (前置き行の「日付・借方・貸方・金額の順で…」のような説明文1セルへの誤爆を防ぐ)
  if (new Set([dateIdx, debitIdx, creditIdx, amountIdx]).size !== 4) return null;
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
  const found = findJournalHeader(lines);
  if (!found) return null;
  const { header, headerLineIdx } = found;

  const rows: PastJournalRow[] = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
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
  // 有効行がヘッダー以降の半分未満なら仕訳CSVとみなさない
  // (仕訳例を数行含むだけのルール文章を誤って集計に置換し、本文を捨てるのを防ぐ)
  const dataLineCount = lines.length - headerLineIdx - 1;
  if (rows.length === 0 || rows.length < dataLineCount * 0.5) return null;
  return rows;
}

const ERA_DEFINITIONS: Record<string, { base: number; start: string; end?: string }> = {
  令和: { base: 2018, start: "2019-05-01" },
  R: { base: 2018, start: "2019-05-01" },
  平成: { base: 1988, start: "1989-01-08", end: "2019-04-30" },
  H: { base: 1988, start: "1989-01-08", end: "2019-04-30" },
  昭和: { base: 1925, start: "1926-12-25", end: "1989-01-07" },
  S: { base: 1925, start: "1926-12-25", end: "1989-01-07" },
};

function createStrictDate(year: number, month: number, day: number): Date | null {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

/**
 * 取込CSVの日付を寛容にパースする。会計ソフトのエクスポートは
 * 「2026/07/21」「2026年7月21日」のほか和暦「令和8年7月21日」「R8.7.21」「R.08/07/21」がある。
 * 解釈できなければ null(呼び出し側でエラー行として扱う)。
 */
export function parseFlexibleDate(raw: string): Date | null {
  const s = (raw || "").normalize("NFKC").trim();
  if (!s) return null;

  // 和暦 → 西暦(令和R=2018起点, 平成H=1988起点, 昭和S=1925起点)
  const eraMatch = s.match(/^(令和|平成|昭和|[RHS])\.?\s*(元|\d{1,2})[年./-](\d{1,2})[月./-](\d{1,2})日?$/i);
  if (eraMatch) {
    const era = ERA_DEFINITIONS[eraMatch[1].toUpperCase()];
    const eraYear = eraMatch[2] === "元" ? 1 : parseInt(eraMatch[2], 10);
    if (era && eraYear >= 1) {
      const date = createStrictDate(
        era.base + eraYear,
        parseInt(eraMatch[3], 10),
        parseInt(eraMatch[4], 10),
      );
      if (!date) return null;

      const isoDate = date.toISOString().slice(0, 10);
      if (isoDate < era.start || (era.end && isoDate > era.end)) return null;
      return date;
    }
    return null;
  }

  // 「2026年7月21日」
  const jp = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (jp) {
    return createStrictDate(parseInt(jp[1], 10), parseInt(jp[2], 10), parseInt(jp[3], 10));
  }

  // 西暦の年月日。Dateコンストラクタへ直接渡すと2月30日を3月2日に補正するため、
  // 数値を分解して同じ年月日に戻ることまで検証する。
  const western = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (western) {
    return createStrictDate(parseInt(western[1], 10), parseInt(western[2], 10), parseInt(western[3], 10));
  }

  return null;
}
