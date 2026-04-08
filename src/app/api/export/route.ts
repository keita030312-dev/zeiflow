import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { generateYayoiCsv } from "@/lib/csv/yayoi";
import { generateMoneyForwardCsv } from "@/lib/csv/moneyforward";
import { generateFreeeCsv } from "@/lib/csv/freee";
import type { JournalEntryData, CsvFormat, PeriodType } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { clientId, format, periodType, startDate, endDate } = body as {
      clientId: string;
      format: CsvFormat;
      periodType: PeriodType;
      startDate: string;
      endDate: string;
    };

    if (!clientId || !format || !startDate || !endDate) {
      return NextResponse.json(
        { error: "顧客・出力形式・期間を選択してください" },
        { status: 400 }
      );
    }

    // 日付のバリデーション
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "日付の形式が正しくありません" },
        { status: 400 }
      );
    }

    const scope = getScope(auth);
    const entries = await prisma.journalEntry.findMany({
      where: {
        clientId,
        ...scope,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: "asc" },
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "指定期間に仕訳データがありません" },
        { status: 404 }
      );
    }

    const journalData: JournalEntryData[] = entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      debitAccount: e.debitAccount,
      debitSubAccount: e.debitSubAccount || undefined,
      creditAccount: e.creditAccount,
      creditSubAccount: e.creditSubAccount || undefined,
      amount: e.amount,
      taxAmount: e.taxAmount || undefined,
      taxRate: e.taxRate || undefined,
      description: e.description,
      invoiceNumber: e.invoiceNumber || undefined,
      memo: e.memo || undefined,
      isConfirmed: e.isConfirmed,
      clientId: e.clientId,
      receiptId: e.receiptId || undefined,
    }));

    let csv: string;
    let filename: string;
    const formatLabels: Record<string, string> = {
      yayoi: "弥生会計",
      moneyforward: "マネーフォワード",
      freee: "freee",
    };

    switch (format) {
      case "yayoi":
        csv = generateYayoiCsv(journalData);
        filename = `yayoi_${startDate}_${endDate}.csv`;
        break;
      case "moneyforward":
        csv = generateMoneyForwardCsv(journalData);
        filename = `moneyforward_${startDate}_${endDate}.csv`;
        break;
      case "freee":
        csv = generateFreeeCsv(journalData);
        filename = `freee_${startDate}_${endDate}.csv`;
        break;
      default:
        return NextResponse.json(
          { error: "無効な出力形式です" },
          { status: 400 }
        );
    }

    // Log the export
    try {
      await prisma.exportLog.create({
        data: {
          format: format.toUpperCase() as "YAYOI" | "MONEYFORWARD" | "FREEE",
          periodType:
            periodType === "monthly"
              ? "MONTHLY"
              : periodType === "semi_annual"
                ? "SEMI_ANNUAL"
                : "ANNUAL",
          periodStart: start,
          periodEnd: end,
          recordCount: entries.length,
          clientId,
          userId: auth.id,
          ...(auth.orgId ? { organizationId: auth.orgId } : {}),
        },
      });
    } catch {
      // エクスポートログの保存失敗はCSV出力を止めない
    }

    // Return CSV as a downloadable file with BOM for Excel compatibility
    const bom = "\uFEFF";
    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Format": format,
        "X-Record-Count": entries.length.toString(),
        "Access-Control-Expose-Headers": "Content-Disposition, X-Format, X-Record-Count",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "エクスポートに失敗しました", detail: message },
      { status: 500 }
    );
  }
}
