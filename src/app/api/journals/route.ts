import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";

const journalSchema = z.object({
  date: z.string(),
  debitAccount: z.string().min(1),
  debitSubAccount: z.string().optional(),
  creditAccount: z.string().min(1),
  creditSubAccount: z.string().optional(),
  amount: z.number().positive(),
  taxAmount: z.number().optional(),
  taxRate: z.number().optional(),
  description: z.string().min(1),
  memo: z.string().optional(),
  invoiceNumber: z.string().optional(),
  clientId: z.string(),
  receiptId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const clientId = req.nextUrl.searchParams.get("clientId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const confirmed = req.nextUrl.searchParams.get("confirmed");
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10)));

  const where: Record<string, unknown> = { userId: auth.id };
  if (clientId) where.clientId = clientId;
  if (confirmed !== null) where.isConfirmed = confirmed === "true";
  if (startDate || endDate) {
    where.date = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        client: { select: { name: true, code: true } },
        receipt: { select: { id: true, imagePath: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return NextResponse.json({
    entries,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = journalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const entry = await prisma.journalEntry.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: auth.id,
    },
  });

  return NextResponse.json(entry);
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json(
      { error: "仕訳IDが必要です" },
      { status: 400 }
    );
  }

  const existing = await prisma.journalEntry.findFirst({
    where: { id, userId: auth.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "仕訳が見つかりません" },
      { status: 404 }
    );
  }

  const entry = await prisma.journalEntry.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "仕訳IDが必要です" },
      { status: 400 }
    );
  }

  const existing = await prisma.journalEntry.findFirst({
    where: { id, userId: auth.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "仕訳が見つかりません" },
      { status: 404 }
    );
  }

  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
