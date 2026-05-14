import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";

// HTML 注入対策。client.name や e.description などの DB 値をテンプレに挿入する前に必ず通す。
// 過去に「e.description に <img onerror=...> が入っていると印刷ビューで XSS が成立する」リスクあり。
function escapeHtml(s: string | number | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const scope = getScope(auth);
  const clientId = req.nextUrl.searchParams.get("clientId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");

  if (!clientId || !startDate || !endDate) {
    return NextResponse.json({ error: "顧客と期間を指定してください" }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, ...scope },
  });
  if (!client) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }

  const entries = await prisma.journalEntry.findMany({
    where: {
      clientId,
      ...scope,
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    orderBy: { date: "asc" },
  });

  // HTML -> PDF用のHTMLを生成（ブラウザでwindow.print()する方式）
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>仕訳帳 - ${escapeHtml(client.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; font-size: 11px; color: #1a1a1a; padding: 20mm; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 5px; }
  .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
  .info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; color: #444; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; }
  th { background: #f5f5f5; font-weight: 600; text-align: center; font-size: 10px; }
  td { font-size: 10px; }
  .right { text-align: right; }
  .center { text-align: center; }
  .total { font-weight: bold; background: #fafafa; }
  .confirmed { color: #22c55e; }
  .unconfirmed { color: #f59e0b; }
  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; }
  .back-btn { position: fixed; top: 10px; right: 10px; padding: 8px 16px; background: #D4AF37; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; z-index: 100; }
  .back-btn:hover { background: #B8962E; }
  @media print { body { padding: 10mm; } .back-btn { display: none; } }
</style>
</head>
<body>
<button class="back-btn" onclick="window.close(); if(!window.closed) history.back();">← 戻る</button>
<h1>仕訳帳</h1>
<p class="subtitle">${escapeHtml(client.name)}（${escapeHtml(client.code)}）</p>
<div class="info">
  <span>期間: ${startDate} 〜 ${endDate}</span>
  <span>出力日: ${new Date().toLocaleDateString("ja-JP")}</span>
  <span>件数: ${entries.length}件</span>
</div>
<table>
<thead>
<tr>
  <th style="width:12%">日付</th>
  <th style="width:14%">借方科目</th>
  <th style="width:14%">貸方科目</th>
  <th style="width:12%">金額</th>
  <th style="width:8%">税額</th>
  <th style="width:22%">摘要</th>
  <th style="width:12%">登録番号</th>
  <th style="width:6%">状態</th>
</tr>
</thead>
<tbody>
${entries.map((e) => `<tr>
  <td class="center">${new Date(e.date).toLocaleDateString("ja-JP")}</td>
  <td>${escapeHtml(e.debitAccount)}</td>
  <td>${escapeHtml(e.creditAccount)}</td>
  <td class="right">${e.amount.toLocaleString()}</td>
  <td class="right">${e.taxAmount ? e.taxAmount.toLocaleString() : "-"}</td>
  <td>${escapeHtml(e.description)}${e.memo ? ` (${escapeHtml(e.memo)})` : ""}</td>
  <td style="font-size:8px">${escapeHtml(e.invoiceNumber) || "-"}</td>
  <td class="center ${e.isConfirmed ? "confirmed" : "unconfirmed"}">${e.isConfirmed ? "確定" : "未確定"}</td>
</tr>`).join("\n")}
<tr class="total">
  <td colspan="3" class="right">合計</td>
  <td class="right">${entries.reduce((s, e) => s + e.amount, 0).toLocaleString()}</td>
  <td class="right">${entries.reduce((s, e) => s + (e.taxAmount || 0), 0).toLocaleString()}</td>
  <td colspan="3"></td>
</tr>
</tbody>
</table>
<p class="footer">ZeiFlow - 税理士事務所向けAI仕訳管理システム</p>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
