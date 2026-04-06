import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { PrintButton } from "./print-button";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

async function getServerUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    return verify(token, process.env.NEXTAUTH_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

export default async function JournalPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login?error=セッションが期限切れです。再度ログインしてください");
  }

  const params = await searchParams;
  const clientId =
    typeof params.clientId === "string" ? params.clientId : undefined;
  const startDate =
    typeof params.startDate === "string" ? params.startDate : undefined;
  const endDate =
    typeof params.endDate === "string" ? params.endDate : undefined;

  // Build where clause
  const where: Record<string, unknown> = { userId: user.id };
  if (clientId) {
    where.clientId = clientId;
  }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.date = dateFilter;
  }

  const entries = await prisma.journalEntry.findMany({
    where,
    include: { client: { select: { name: true, code: true } } },
    orderBy: { date: "asc" },
  });

  // Get client name for header
  let clientName = "全顧客";
  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });
    if (client) clientName = client.name;
  }

  const periodLabel = [
    startDate
      ? format(new Date(startDate), "yyyy年M月d日", { locale: ja })
      : "",
    endDate ? format(new Date(endDate), "yyyy年M月d日", { locale: ja }) : "",
  ]
    .filter(Boolean)
    .join(" ~ ");

  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
  const now = format(new Date(), "yyyy年M月d日 HH:mm", { locale: ja });

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Override dashboard layout for print page */
            body { background: #fff !important; color: #000 !important; }
            /* Hide sidebar and mobile header in both screen and print */
            nav, aside, [data-sidebar], header.md\\:hidden,
            .md\\:ml-64 { margin-left: 0 !important; }
            .min-h-screen.flex.flex-col > div:first-child > aside,
            .min-h-screen.flex.flex-col > header { display: none !important; }

            .print-page {
              font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
              background: #fff;
              color: #000;
              max-width: 1100px;
              margin: 0 auto;
              padding: 24px;
              font-size: 11px;
              line-height: 1.6;
            }
            .print-header {
              text-align: center;
              margin-bottom: 24px;
              border-bottom: 2px solid #333;
              padding-bottom: 16px;
            }
            .print-header h1 {
              font-size: 22px;
              font-weight: 700;
              letter-spacing: 4px;
              margin-bottom: 8px;
              color: #000;
            }
            .print-header .print-meta {
              font-size: 12px;
              color: #555;
            }
            .print-header .print-meta span {
              margin: 0 12px;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            .print-table thead th {
              background: #f5f5f5;
              border: 1px solid #ccc;
              padding: 6px 8px;
              font-size: 10px;
              font-weight: 600;
              text-align: left;
              white-space: nowrap;
              color: #000;
            }
            .print-table thead th.col-amount {
              text-align: right;
            }
            .print-table tbody td {
              border: 1px solid #ddd;
              padding: 5px 8px;
              font-size: 10px;
              vertical-align: top;
              color: #000;
            }
            .print-table tbody td.col-amount {
              text-align: right;
              font-variant-numeric: tabular-nums;
            }
            .print-table tbody td.col-date {
              white-space: nowrap;
              font-variant-numeric: tabular-nums;
            }
            .print-table tbody tr:nth-child(even) {
              background: #fafafa;
            }
            .print-footer {
              border-top: 2px solid #333;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .print-footer .print-summary {
              font-weight: 600;
              color: #000;
            }
            .print-footer .print-timestamp {
              color: #777;
            }
            .print-btn-area {
              text-align: center;
              margin-bottom: 20px;
            }
            .print-btn-area button {
              padding: 10px 32px;
              font-size: 14px;
              font-weight: 600;
              background: #2563eb;
              color: #fff;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            }
            .print-btn-area button:hover {
              background: #1d4ed8;
            }
            @media print {
              /* Hide everything from dashboard layout */
              nav, aside, [data-sidebar], header {
                display: none !important;
              }
              .min-h-screen { min-height: auto !important; }
              main { margin-left: 0 !important; }
              .p-4, .md\\:p-8 { padding: 0 !important; }
              .print-btn-area { display: none !important; }
              .print-page { padding: 0; max-width: none; }
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
            }
          `,
        }}
      />
      <div className="print-page">
        <div className="print-btn-area">
          <PrintButton />
        </div>

        <div className="print-header">
          <h1>仕訳帳</h1>
          <div className="print-meta">
            <span>顧客: {clientName}</span>
            {periodLabel && <span>期間: {periodLabel}</span>}
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>日付</th>
              <th>借方科目</th>
              <th>貸方科目</th>
              <th className="col-amount">金額</th>
              <th>摘要</th>
              <th>登録番号</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: "center", padding: "20px", color: "#999" }}
                >
                  該当する仕訳データがありません
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="col-date">
                    {format(new Date(entry.date), "yyyy/MM/dd")}
                  </td>
                  <td>{entry.debitAccount}</td>
                  <td>{entry.creditAccount}</td>
                  <td className="col-amount">
                    {entry.amount.toLocaleString("ja-JP")}
                  </td>
                  <td>{entry.description}</td>
                  <td>{entry.invoiceNumber || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="print-footer">
          <div className="print-summary">
            合計金額: &yen;{totalAmount.toLocaleString("ja-JP")} /{" "}
            {entries.length}件
          </div>
          <div className="print-timestamp">出力日時: {now}</div>
        </div>
      </div>
    </>
  );
}
