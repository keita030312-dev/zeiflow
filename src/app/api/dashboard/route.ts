import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [clientCount, monthlyReceipts, unconfirmedCount, missingInvoiceCount, monthlyExports] = await Promise.all([
    prisma.client.count({ where: { userId: auth.id } }),
    prisma.receipt.count({ where: { userId: auth.id, uploadedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.journalEntry.count({ where: { userId: auth.id, isConfirmed: false } }),
    prisma.journalEntry.count({ where: { userId: auth.id, invoiceNumber: null } }),
    prisma.exportLog.count({ where: { userId: auth.id, exportedAt: { gte: monthStart, lte: monthEnd } } }),
  ]);

  return NextResponse.json({ clientCount, monthlyReceipts, unconfirmedCount, missingInvoiceCount, monthlyExports });
}
