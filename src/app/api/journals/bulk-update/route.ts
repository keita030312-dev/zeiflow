import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getScope, requireAuth } from "@/lib/auth-middleware";
import { deriveTaxRateFromCategories } from "@/lib/tax-categories";

const entrySchema = z.object({
  id: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, "日付が不正です"),
  debitAccount: z.string().trim().min(1).max(100),
  creditAccount: z.string().trim().min(1).max(100),
  amount: z.number().int().positive().max(1_000_000_000),
  // taxRate は旧クライアント(開きっぱなしのタブ)互換のため optional で残す
  taxRate: z.union([z.literal(0.1), z.literal(0.08), z.null()]).optional(),
  taxCategory: z.string().trim().max(100).nullable().optional(),
  debitTaxCategory: z.string().trim().max(100).nullable().optional(),
  creditTaxCategory: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().min(1).max(500),
  invoiceNumber: z.string().trim().max(100).nullable(),
  memo: z.string().trim().max(1000).nullable(),
});

const schema = z.object({
  entries: z.array(entrySchema).min(1).max(100),
  confirm: z.boolean().optional().default(false),
});

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "入力内容が不正です" },
      { status: 400 },
    );
  }

  const ids = parsed.data.entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json(
      { error: "同じ仕訳が重複しています" },
      { status: 400 },
    );
  }

  const scope = getScope(auth);
  const ownedEntries = await prisma.journalEntry.findMany({
    where: { id: { in: ids }, ...scope },
    select: {
      id: true,
      amount: true,
      taxAmount: true,
      taxRate: true,
      receiptId: true,
    },
  });
  if (ownedEntries.length !== ids.length) {
    return NextResponse.json(
      { error: "更新できない仕訳が含まれています" },
      { status: 403 },
    );
  }

  const ownedEntryMap = new Map(
    ownedEntries.map((entry) => [entry.id, entry]),
  );

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of parsed.data.entries) {
        const existing = ownedEntryMap.get(entry.id);
        if (!existing) {
          throw new Error("更新できない仕訳が含まれています");
        }

        const date = new Date(entry.date);
        if (Number.isNaN(date.getTime())) {
          throw new Error("日付が不正です");
        }

        // 借方/貸方税区分が来ていれば税率をサーバー側で導出、旧taxCategoryはクリア
        const sideCatsTouched =
          entry.debitTaxCategory !== undefined ||
          entry.creditTaxCategory !== undefined;
        const nextTaxRate = sideCatsTouched
          ? deriveTaxRateFromCategories(
              entry.debitTaxCategory,
              entry.creditTaxCategory,
            )
          : entry.taxRate === undefined
            ? existing.taxRate
            : entry.taxRate;

        const taxChanged =
          existing.amount !== entry.amount ||
          existing.taxRate !== nextTaxRate;
        const taxAmount = taxChanged
          ? nextTaxRate === null
            ? null
            : Math.round(
                (entry.amount * nextTaxRate) / (1 + nextTaxRate),
              )
          : existing.taxAmount;

        await tx.journalEntry.update({
          where: { id: entry.id },
          data: {
            date,
            debitAccount: entry.debitAccount,
            creditAccount: entry.creditAccount,
            amount: entry.amount,
            taxAmount,
            taxRate: nextTaxRate,
            ...(sideCatsTouched
              ? {
                  debitTaxCategory: entry.debitTaxCategory ?? null,
                  creditTaxCategory: entry.creditTaxCategory ?? null,
                  taxCategory: null,
                }
              : "taxCategory" in entry
                ? { taxCategory: entry.taxCategory ?? null }
                : {}),
            description: entry.description,
            invoiceNumber: entry.invoiceNumber,
            memo: entry.memo,
            ...(parsed.data.confirm ? { isConfirmed: true } : {}),
          },
        });
      }

      if (parsed.data.confirm) {
        const receiptIds = Array.from(
          new Set(
            ownedEntries
              .map((entry) => entry.receiptId)
              .filter((receiptId): receiptId is string => Boolean(receiptId)),
          ),
        );

        for (const receiptId of receiptIds) {
          const remaining = await tx.journalEntry.count({
            where: { receiptId, isConfirmed: false, ...scope },
          });
          if (remaining === 0) {
            await tx.journalEntry.updateMany({
              where: { receiptId, ...scope },
              data: { receiptId: null },
            });
            await tx.receipt.deleteMany({
              where: { id: receiptId, ...scope },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          action: parsed.data.confirm
            ? "JOURNAL_BULK_UPDATE_AND_CONFIRM"
            : "JOURNAL_BULK_UPDATE",
          detail: parsed.data.confirm
            ? `仕訳を一括編集して確定: ${ids.length}件`
            : `仕訳を一括編集: ${ids.length}件`,
          userId: auth.id,
          ...(auth.orgId ? { organizationId: auth.orgId } : {}),
        },
      });
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "一括更新に失敗しました",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    updated: ids.length,
    confirmed: parsed.data.confirm ? ids.length : 0,
  });
}
