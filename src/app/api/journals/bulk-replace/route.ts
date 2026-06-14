import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { z } from "zod";

const schema = z.object({
  fromAccount: z.string().trim().min(1).max(100),
  toAccount: z.string().trim().min(1).max(100),
  target: z.enum(["debit", "credit", "both"]),
  clientId: z.string().min(1).optional(),
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
  const { fromAccount, toAccount, target, clientId } = parsed.data;

  if (fromAccount === toAccount) {
    return NextResponse.json({ error: "変更前と変更後の科目が同じです" }, { status: 400 });
  }

  const scope = getScope(auth);
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, ...scope },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }
  }

  const baseWhere = {
    ...scope,
    isConfirmed: false,
    ...(clientId ? { clientId } : {}),
  };

  const result = await prisma.$transaction(async (tx) => {
    const affected = await tx.journalEntry.findMany({
      where: {
        ...baseWhere,
        OR: [
          ...(target !== "credit" ? [{ debitAccount: fromAccount }] : []),
          ...(target !== "debit" ? [{ creditAccount: fromAccount }] : []),
        ],
      },
      select: { id: true },
    });

    let debitCount = 0;
    let creditCount = 0;

    if (target === "debit" || target === "both") {
      const updated = await tx.journalEntry.updateMany({
        where: { ...baseWhere, debitAccount: fromAccount },
        data: { debitAccount: toAccount },
      });
      debitCount = updated.count;
    }

    if (target === "credit" || target === "both") {
      const updated = await tx.journalEntry.updateMany({
        where: { ...baseWhere, creditAccount: fromAccount },
        data: { creditAccount: toAccount },
      });
      creditCount = updated.count;
    }

    await tx.auditLog.create({
      data: {
        action: "JOURNAL_BULK_REPLACE",
        detail: `勘定科目一括置換: ${fromAccount} -> ${toAccount}, 対象=${target}, 仕訳=${affected.length}件`,
        userId: auth.id,
        ...(auth.orgId ? { organizationId: auth.orgId } : {}),
      },
    });

    return {
      debitCount,
      creditCount,
      total: affected.length,
    };
  });

  return NextResponse.json(result);
}
