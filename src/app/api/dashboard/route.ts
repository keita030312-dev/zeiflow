import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const scope = getScope(auth);
  const [clientCount, monthlyReceipts, unconfirmedCount, missingInvoiceCount, monthlyExports] = await Promise.all([
    prisma.client.count({ where: scope }),
    prisma.receipt.count({ where: { ...scope, uploadedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.journalEntry.count({ where: { ...scope, isConfirmed: false } }),
    prisma.journalEntry.count({ where: { ...scope, invoiceNumber: null } }),
    prisma.exportLog.count({ where: { ...scope, exportedAt: { gte: monthStart, lte: monthEnd } } }),
  ]);

  return NextResponse.json({ clientCount, monthlyReceipts, unconfirmedCount, missingInvoiceCount, monthlyExports });
}
