import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import iconv from "iconv-lite";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { generateYayoiCsv } from "@/lib/csv/yayoi";
import { generateMoneyForwardCsv } from "@/lib/csv/moneyforward";
import { generateFreeeCsv } from "@/lib/csv/freee";
import type { JournalEntryData, ClientTaxInfo, CsvFormat, PeriodType } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { clientId, format, periodType, startDate, endDate, excludeExported } = body as {
      clientId: string;
      format: CsvFormat;
      periodType: PeriodType;
      startDate: string;
      endDate: string;
      excludeExported?: boolean;
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
    if (start > end) {
      return NextResponse.json(
        { error: "開始日は終了日以前にしてください" },
        { status: 400 },
      );
    }

    const scope = getScope(auth);

    // クライアントの税設定を取得してCSV出力に反映
    const clientRecord = await prisma.client.findFirst({
      where: { id: clientId, ...scope },
      select: { accountingMethod: true, taxType: true },
    });
    const clientTaxInfo: ClientTaxInfo | undefined = clientRecord
      ? {
          accountingMethod: clientRecord.accountingMethod as ClientTaxInfo["accountingMethod"],
          taxType: clientRecord.taxType as ClientTaxInfo["taxType"],
        }
      : undefined;

    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    let allEntries = await prisma.journalEntry.findMany({
      where: {
        clientId,
        ...scope,
        date: {
          gte: start,
          lte: endOfDay,
        },
      },
      orderBy: { date: "asc" },
    });

    // 出力済み除外: 同一顧客・同一形式の過去出力期間に含まれる仕訳を除く
    if (excludeExported && allEntries.length > 0) {
      const formatKey = format.toUpperCase() as "YAYOI" | "MONEYFORWARD" | "FREEE";
      const prevLogs = await prisma.exportLog.findMany({
        where: { clientId, format: formatKey, ...scope },
        select: {
          periodStart: true,
          periodEnd: true,
          exportedAt: true,
        },
      });
      if (prevLogs.length > 0) {
        allEntries = allEntries.filter((e) =>
          !prevLogs.some(
            (log) =>
              e.date >= log.periodStart &&
              e.date <= log.periodEnd &&
              e.updatedAt <= log.exportedAt,
          )
        );
      }
    }

    const entries = allEntries;

    if (entries.length === 0) {
      return NextResponse.json(
        { error: excludeExported ? "未出力の仕訳データがありません（前回出力済みを除いた結果、0件になりました）" : "指定期間に仕訳データがありません" },
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
      taxCategory: e.taxCategory || undefined,
      debitTaxCategory: e.debitTaxCategory || undefined,
      creditTaxCategory: e.creditTaxCategory || undefined,
      description: e.description,
      invoiceNumber: e.invoiceNumber || undefined,
      memo: e.memo || undefined,
      isConfirmed: e.isConfirmed,
      clientId: e.clientId,
      receiptId: e.receiptId || undefined,
    }));

    let csv: string;
    let filename: string;

    switch (format) {
      case "yayoi":
        csv = generateYayoiCsv(journalData, clientTaxInfo);
        filename = `yayoi_${startDate}_${endDate}.csv`;
        break;
      case "moneyforward":
        csv = generateMoneyForwardCsv(journalData, clientTaxInfo);
        filename = `moneyforward_${startDate}_${endDate}.csv`;
        break;
      case "freee":
        csv = generateFreeeCsv(journalData, clientTaxInfo);
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
          periodEnd: endOfDay,
          recordCount: entries.length,
          clientId,
          userId: auth.id,
          ...(auth.orgId ? { organizationId: auth.orgId } : {}),
        },
      });
    } catch {
      // エクスポートログの保存失敗はCSV出力を止めない
    }

    const commonHeaders = {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Format": format,
      "X-Record-Count": entries.length.toString(),
      "Access-Control-Expose-Headers": "Content-Disposition, X-Format, X-Record-Count",
    };
    // \u5F25\u751F\u4F1A\u8A08\u306FShift-JIS\u5FC5\u9808\u3002MoneyForward/freee\u306FUTF-8 with BOM\u3002
    if (format === "yayoi") {
      const encoded = iconv.encode(csv, "Shift_JIS");
      // new Uint8Array(encoded) でプールから切り離した独立 ArrayBuffer を作る
      const safeBuffer = new Uint8Array(encoded).buffer as ArrayBuffer;
      return new NextResponse(safeBuffer, {
        headers: { "Content-Type": "text/csv; charset=Shift_JIS", ...commonHeaders },
      });
    }
    return new NextResponse("\uFEFF" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", ...commonHeaders },
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
