import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { reportError } from "@/lib/error-reporter";

// quote-aware CSV 1行パーサー。`"1,234"` や `"Lunch, client"` のような quoted comma を正しく扱う。
// 過去に `split(",")` を使っていて、quoted comma で列ズレ → 行が拒否される/誤った列に取り込まれる事故があった。
function parseCsvLine(line: string): string[] {
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
    } else if (ch === ',') {
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

    const text = await file.text();
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSVにデータがありません" }, { status: 400 });
    }

    // ヘッダー行を解析(quote-aware パーサーで quoted comma にも対応)
    const header = parseCsvLine(lines[0]);
    const dateIdx = header.findIndex((h) => /日付|date/i.test(h));
    const debitIdx = header.findIndex((h) => /借方|debit/i.test(h));
    const creditIdx = header.findIndex((h) => /貸方|credit/i.test(h));
    const amountIdx = header.findIndex((h) => /金額|amount/i.test(h));
    const descIdx = header.findIndex((h) => /摘要|description|内容/i.test(h));
    const taxIdx = header.findIndex((h) => /税額|tax/i.test(h));
    const invoiceIdx = header.findIndex((h) => /登録番号|invoice|インボイス/i.test(h));
    const memoIdx = header.findIndex((h) => /メモ|備考|memo/i.test(h));

    if (dateIdx === -1 || debitIdx === -1 || creditIdx === -1 || amountIdx === -1) {
      return NextResponse.json({
        error: "CSVのヘッダーに必須項目がありません。「日付,借方科目,貸方科目,金額」を含めてください",
      }, { status: 400 });
    }

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
