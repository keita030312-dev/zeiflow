import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { reportError } from "@/lib/error-reporter";
import { parseCsvLine, decodeCsvBuffer, detectJournalHeader } from "@/lib/csv/journal-csv";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;

    if (!file || !clientId) {
      return NextResponse.json({ error: "ファイルと顧客を選択してください" }, { status: 400 });
    }

    const scope = getScope(auth);
    const client = await prisma.client.findFirst({ where: { id: clientId, ...scope } });
    if (!client) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    // 会計ソフトのCSVはShift-JISが多いため、UTF-8で化けたらShift-JISで再デコード
    const text = decodeCsvBuffer(Buffer.from(await file.arrayBuffer()));
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSVにデータがありません" }, { status: 400 });
    }

    // ヘッダー行を解析(quote-aware パーサーで quoted comma にも対応)
    const headerIdx = detectJournalHeader(parseCsvLine(lines[0]));
    if (!headerIdx) {
      return NextResponse.json({
        error: "CSVのヘッダーに必須項目がありません。「日付,借方科目,貸方科目,金額」を含めてください",
      }, { status: 400 });
    }
    const { dateIdx, debitIdx, creditIdx, amountIdx, descIdx, taxIdx, invoiceIdx, memoIdx } = headerIdx;

    const entries = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      try {
        const date = new Date(cols[dateIdx]);
        if (isNaN(date.getTime())) throw new Error("無効な日付");

        const amount = parseInt(cols[amountIdx].replace(/[,¥\\]/g, ""), 10);
        if (isNaN(amount) || amount <= 0) throw new Error("無効な金額");

        entries.push({
          date,
          debitAccount: cols[debitIdx],
          creditAccount: cols[creditIdx],
          amount,
          taxAmount: taxIdx >= 0 ? parseInt(cols[taxIdx]?.replace(/[,¥\\]/g, "") || "0", 10) || null : null,
          description: descIdx >= 0 ? cols[descIdx] || `インポート行${i}` : `インポート行${i}`,
          invoiceNumber: invoiceIdx >= 0 ? cols[invoiceIdx] || null : null,
          memo: memoIdx >= 0 ? cols[memoIdx] || null : null,
          clientId,
          userId: auth.id,
          ...(auth.orgId ? { organizationId: auth.orgId } : {}),
        });
      } catch (e) {
        errors.push(`行${i + 1}: ${e instanceof Error ? e.message : "不明なエラー"}`);
      }
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: "インポートできるデータがありません", errors }, { status: 400 });
    }

    // 一括挿入
    const result = await prisma.journalEntry.createMany({ data: entries });

    // 監査ログ
    await prisma.auditLog.create({
      data: {
        action: "CSV_IMPORT",
        detail: `CSVインポート: ${client.name} ${result.count}件`,
        userId: auth.id,
        ...(auth.orgId ? { organizationId: auth.orgId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      imported: result.count,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportError(error instanceof Error ? error : new Error(message), { source: "import" });
    return NextResponse.json({ error: "インポートに失敗しました: " + message }, { status: 500 });
  }
}
