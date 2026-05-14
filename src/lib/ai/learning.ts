import { prisma } from "@/lib/db";

/**
 * 学習ループ: 確定済み仕訳の修正パターンをナレッジに自動反映する
 *
 * - 顧問先(client)単位で「[自動学習] 仕訳パターン」というナレッジファイルを管理
 * - 仕訳が「確定」されるタイミングで、AI生成と異なる値が記録されていたら学習
 * - 古い学習は最新200件で打ち切り(無限肥大化防止)
 *
 * このナレッジファイルは src/lib/ai/ocr.ts の processReceipt() で
 * 既に knowledgeText に統合されているため、追加の配線は不要。
 */

const AUTO_LEARNED_FILE_NAME = "[自動学習] 仕訳パターン";
const MAX_LINES = 200;

export interface JournalSnapshot {
  date?: Date | string | null;
  description?: string | null;
  debitAccount?: string | null;
  creditAccount?: string | null;
  amount?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  invoiceNumber?: string | null;
}

function safeDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return String(d).slice(0, 10);
  }
}

/**
 * 仕訳の修正パターンをナレッジに記録
 * - before: AI生成時 / 直前の状態
 * - after: スタッフ修正後の最終値
 * - 差分があれば「いつ・何を・どう修正したか」をナレッジに追記
 *
 * 失敗してもメインフローは止めない(catchして握りつぶす想定で呼び出し側が使う)
 */
export async function recordOcrCorrection(params: {
  before: JournalSnapshot;
  after: JournalSnapshot;
  clientId: string;
  userId: string;
  organizationId?: string | null;
}): Promise<{ recorded: boolean; reason?: string }> {
  const { before, after, clientId, userId, organizationId } = params;

  // 差分検出
  const changes: string[] = [];
  if (after.debitAccount && before.debitAccount !== after.debitAccount) {
    changes.push(`借方: ${before.debitAccount} → ${after.debitAccount}`);
  }
  if (after.creditAccount && before.creditAccount !== after.creditAccount) {
    changes.push(`貸方: ${before.creditAccount} → ${after.creditAccount}`);
  }
  if (after.description && before.description !== after.description) {
    changes.push(`摘要: ${before.description} → ${after.description}`);
  }
  if (
    after.taxRate !== undefined &&
    after.taxRate !== null &&
    Number(before.taxRate ?? 0) !== Number(after.taxRate)
  ) {
    changes.push(`税率: ${before.taxRate} → ${after.taxRate}`);
  }

  if (changes.length === 0) {
    return { recorded: false, reason: "変更なし(学習対象外)" };
  }

  // 学習行を構築
  const dateStr = safeDateStr(after.date ?? before.date);
  const finalDesc = after.description ?? before.description ?? "";
  const finalDebit = after.debitAccount ?? before.debitAccount ?? "";
  const finalCredit = after.creditAccount ?? before.creditAccount ?? "";
  const finalAmount = after.amount ?? before.amount ?? 0;

  const newLine = `${dateStr} 「${finalDesc}」(${finalAmount}円) → 借方:${finalDebit} / 貸方:${finalCredit}  [修正: ${changes.join(", ")}]`;

  // 既存の自動学習ファイルを探す
  const existing = await prisma.knowledgeFile.findFirst({
    where: {
      clientId,
      name: AUTO_LEARNED_FILE_NAME,
    },
  });

  if (existing) {
    // 重複行はスキップ(同じ修正を二重記録しない)
    const existingLines = existing.extractedText.split("\n").filter(Boolean);
    if (existingLines[0] === newLine) {
      return { recorded: false, reason: "直前の学習と同一" };
    }
    existingLines.unshift(newLine); // 最新を先頭に
    const trimmed = existingLines.slice(0, MAX_LINES).join("\n");
    await prisma.knowledgeFile.update({
      where: { id: existing.id },
      data: {
        extractedText: trimmed,
        fileSize: trimmed.length,
      },
    });
  } else {
    const content = `# 自動学習(スタッフ確定時の修正パターン)\n# このファイルは仕訳確定時に自動更新されます\n\n${newLine}`;
    await prisma.knowledgeFile.create({
      data: {
        name: AUTO_LEARNED_FILE_NAME,
        mimeType: "text/plain",
        extractedText: content,
        fileSize: content.length,
        userId,
        clientId,
        ...(organizationId ? { organizationId } : {}),
      },
    });
  }

  return { recorded: true };
}
