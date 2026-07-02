import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { recordOcrCorrection } from "@/lib/ai/learning";
import { withErrorHandler } from "@/lib/api-handler";
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
  taxCategory: z.string().optional(),
  description: z.string().min(1),
  memo: z.string().optional(),
  invoiceNumber: z.string().optional(),
  clientId: z.string(),
  receiptId: z.string().optional(),
});

const journalUpdateSchema = z.object({
  id: z.string().min(1),
  date: z.string().optional(),
  debitAccount: z.string().min(1).optional(),
  debitSubAccount: z.string().nullable().optional(),
  creditAccount: z.string().min(1).optional(),
  creditSubAccount: z.string().nullable().optional(),
  amount: z.number().positive().optional(),
  taxAmount: z.number().nullable().optional(),
  taxRate: z.number().nullable().optional(),
  taxCategory: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  memo: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  isConfirmed: z.boolean().optional(),
  clientId: z.string().optional(),
  receiptId: z.string().nullable().optional(),
});

async function validateClientAndReceipt(
  scope: ReturnType<typeof getScope>,
  clientId: string,
  receiptId?: string | null,
) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, ...scope },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }

  if (receiptId) {
    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, clientId, ...scope },
      select: { id: true },
    });
    if (!receipt) {
      return NextResponse.json({ error: "レシートが見つかりません" }, { status: 404 });
    }
  }

  return null;
}

async function handleGet(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const clientId = req.nextUrl.searchParams.get("clientId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const confirmed = req.nextUrl.searchParams.get("confirmed");
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10)));

  const scope = getScope(auth);
  const where: Record<string, unknown> = { ...scope };
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

async function handlePost(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = journalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const scope = getScope(auth);
  const ownershipError = await validateClientAndReceipt(
    scope,
    parsed.data.clientId,
    parsed.data.receiptId,
  );
  if (ownershipError) return ownershipError;

  const entry = await prisma.journalEntry.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      taxAmount:
        parsed.data.taxAmount ??
        (parsed.data.taxRate
          ? Math.round(
              (parsed.data.amount * parsed.data.taxRate) /
                (1 + parsed.data.taxRate),
            )
          : undefined),
      userId: auth.id,
      ...(auth.orgId ? { organizationId: auth.orgId } : {}),
    },
  });

  return NextResponse.json(entry);
}

async function handlePut(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = journalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const { id, ...data } = parsed.data;

  const scope = getScope(auth);
  const existing = await prisma.journalEntry.findFirst({
    where: { id, ...scope },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "仕訳が見つかりません" },
      { status: 404 }
    );
  }

  const nextClientId = data.clientId ?? existing.clientId;
  const nextReceiptId =
    data.receiptId === undefined ? existing.receiptId : data.receiptId;
  const ownershipError = await validateClientAndReceipt(
    scope,
    nextClientId,
    nextReceiptId,
  );
  if (ownershipError) return ownershipError;

  const nextAmount = data.amount ?? existing.amount;
  const nextTaxRate =
    data.taxRate === undefined ? existing.taxRate : data.taxRate;
  const shouldRecalculateTax =
    data.taxAmount === undefined &&
    ((data.amount !== undefined && data.amount !== existing.amount) ||
      (data.taxRate !== undefined && data.taxRate !== existing.taxRate));
  const recalculatedTaxAmount =
    nextTaxRate === null
      ? null
      : Math.round((nextAmount * nextTaxRate) / (1 + nextTaxRate));

  const entry = await prisma.journalEntry.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
      ...(shouldRecalculateTax
        ? { taxAmount: recalculatedTaxAmount }
        : {}),
    },
  });

  // 学習ループ: 確定タイミングでスタッフ修正をナレッジに自動反映
  // (失敗してもメインフローは止めない)
  if (data.isConfirmed === true && existing.clientId) {
    recordOcrCorrection({
      before: {
        date: existing.date,
        description: existing.description,
        debitAccount: existing.debitAccount,
        creditAccount: existing.creditAccount,
        amount: existing.amount,
        taxRate: existing.taxRate,
        taxAmount: existing.taxAmount,
        invoiceNumber: existing.invoiceNumber,
      },
      after: {
        date: entry.date,
        description: entry.description,
        debitAccount: entry.debitAccount,
        creditAccount: entry.creditAccount,
        amount: entry.amount,
        taxRate: entry.taxRate,
        taxAmount: entry.taxAmount,
        invoiceNumber: entry.invoiceNumber,
      },
      clientId: existing.clientId,
      userId: auth.id,
      organizationId: auth.orgId,
    }).catch((err) => {
      console.error("[learning] failed to record correction:", err);
    });
  }

  // 確定された場合、レシートを削除（履歴から消去＆容量節約）
  // 同じレシートに紐づく他の仕訳がすべて確定済みの場合のみレシート本体を削除
  if (data.isConfirmed === true && entry.receiptId) {
    const receiptId = entry.receiptId;
    const remaining = await prisma.journalEntry.count({
      where: { receiptId, isConfirmed: false, ...scope },
    });
    if (remaining === 0) {
      await prisma.journalEntry.updateMany({
        where: { receiptId, ...scope },
        data: { receiptId: null },
      });
      const ownedReceipt = await prisma.receipt.findFirst({
        where: { id: receiptId, ...scope },
        select: { id: true },
      });
      if (ownedReceipt) {
        await prisma.receipt.delete({ where: { id: receiptId } }).catch(() => {});
      }
    }
  }

  return NextResponse.json(entry);
}

async function handleDelete(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "仕訳IDが必要です" },
      { status: 400 }
    );
  }

  const scope = getScope(auth);
  const existing = await prisma.journalEntry.findFirst({
    where: { id, ...scope },
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

export const GET = withErrorHandler(handleGet);
export const POST = withErrorHandler(handlePost);
export const PUT = withErrorHandler(handlePut);
export const DELETE = withErrorHandler(handleDelete);
