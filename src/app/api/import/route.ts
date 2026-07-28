import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { reportError } from "@/lib/error-reporter";
import { decodeCsvBuffer, findJournalHeader, parseImportRows } from "@/lib/csv/journal-csv";

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

    // ヘッダー行を解析(quote-aware パーサー・弥生等の前置き行にも対応して先頭20行から探索)
    const found = findJournalHeader(lines);
    if (!found) {
      return NextResponse.json({
        error: "CSVのヘッダーに必須項目がありません。「日付,借方科目,貸方科目,金額」を含めてください",
      }, { status: 400 });
    }
    // 和暦(令和8年/R8.7.21)・「2026年7月21日」形式も許容。
    // 明示的な集計行([日計行][月計行]等)だけを「対象外」として読み飛ばす。
    // 通常明細の必須値欠落はエラーになり、複合伝票は不正行があれば伝票全体が除外される。
    const { rows, skipped, errors } = parseImportRows(lines, found.header, found.headerLineIdx);

    const entries = rows.map((row) => ({
      ...row,
      clientId,
      userId: auth.id,
      ...(auth.orgId ? { organizationId: auth.orgId } : {}),
      source: "IMPORT", // 取込データ=学習対象(OCR未確認出力と区別する)
    }));

    if (entries.length === 0) {
      // 集計行だけのCSV(明細なし)は「エラー」でなく内容の説明を返す(NIT: 赤トースト文言と青info表示の衝突回避)
      const error = errors.length === 0 && skipped > 0
        ? "仕訳の明細行が見つかりませんでした(合計行のみのCSVのようです)"
        : "インポートできるデータがありません";
      return NextResponse.json({ error, skipped, errors }, { status: 400 });
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
      skipped: skipped > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportError(error instanceof Error ? error : new Error(message), { source: "import" });
    return NextResponse.json({ error: "インポートに失敗しました: " + message }, { status: 500 });
  }
}
