import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalToken } from "@/lib/portal-auth";

export async function GET(req: NextRequest) {
  const portal = await requirePortalToken(req);
  if (portal instanceof NextResponse) return portal;

  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || "50"), 100);
  const skip = (page - 1) * limit;

  try {
    const [journals, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { clientId: portal.clientId },
        orderBy: { date: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          date: true,
          debitAccount: true,
          creditAccount: true,
          amount: true,
          taxAmount: true,
          description: true,
          invoiceNumber: true,
          isConfirmed: true,
          createdAt: true,
          receiptId: true,
        },
      }),
      prisma.journalEntry.count({
        where: { clientId: portal.clientId },
      }),
    ]);

    return NextResponse.json({
      journals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Portal journals error:", error);
    return NextResponse.json(
      { error: "仕訳一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
