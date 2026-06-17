import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import {
  MAX_STATEMENT_TRANSACTIONS,
  statementTransactionSchema,
} from "@/lib/statement-import";
import { z } from "zod";

const saveSchema = z.object({
  clientId: z.string().min(1),
  transactions: z
    .array(statementTransactionSchema)
    .min(1)
    .max(MAX_STATEMENT_TRANSACTIONS),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const scope = getScope(auth);

    const parsed = saveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "入力内容が不正です" },
        { status: 400 },
      );
    }
    const { clientId, transactions } = parsed.data;

    const client = await prisma.client.findFirst({
      where: { id: clientId, ...scope },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    const errors: string[] = [];
    type EntryInput = {
      date: Date; debitAccount: string; creditAccount: string; amount: number;
      taxAmount: number | null; taxRate: number | null; description: string;
      memo: string | null; clientId: string; userId: string; organizationId: string | null;
    };
    const entries: EntryInput[] = [];

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      try {
        const date = new Date(t.date);
        if (isNaN(date.getTime())) throw new Error("日付が不正です");
        const taxAmount =
          t.taxAmount ??
          (t.taxRate === null
            ? null
            : Math.round((t.amount * t.taxRate) / (1 + t.taxRate)));
        entries.push({
          date,
          debitAccount: t.debitAccount,
          creditAccount: t.creditAccount,
          amount: t.amount,
          taxAmount,
          taxRate: t.taxRate,
          description: t.description,
          memo: t.memo || null,
          clientId,
          userId: auth.id,
          organizationId: auth.orgId || null,
        });
      } catch (e) {
        errors.push(`行${i + 1}: ${e instanceof Error ? e.message : "不明なエラー"}`);
      }
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "登録できる取引がありません", errors },
        { status: 400 },
      );
    }

    const result = await prisma.journalEntry.createMany({ data: entries });

    try {
      await prisma.auditLog.create({
        data: {
          action: "STATEMENT_IMPORT",
          detail: `明細インポート: ${result.count}件`,
          userId: auth.id,
          ...(auth.orgId ? { organizationId: auth.orgId } : {}),
        },
      });
    } catch {
      // 監査ログ失敗は無視
    }

    return NextResponse.json({
      success: true,
      imported: result.count,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "保存に失敗しました", detail: msg }, { status: 500 });
  }
}
