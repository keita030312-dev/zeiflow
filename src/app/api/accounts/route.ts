import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { z } from "zod";
import { reportError } from "@/lib/error-reporter";

const accountSchema = z.object({
  code: z.string().min(1, "科目コードを入力してください"),
  name: z.string().min(1, "科目名を入力してください"),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const scope = getScope(auth);
    const accounts = await prisma.accountMaster.findMany({
      where: scope,
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
    });
    return NextResponse.json(accounts);
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "accounts-get" });
    return NextResponse.json({ error: "勘定科目の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const scope = getScope(auth);
  const existing = await prisma.accountMaster.findFirst({
    where: { code: parsed.data.code, ...scope },
  });
  if (existing) {
    return NextResponse.json({ error: "この科目コードは既に使用されています" }, { status: 400 });
  }

  try {
    const account = await prisma.accountMaster.create({
      data: {
        ...parsed.data,
        userId: auth.id,
        ...(auth.orgId ? { organizationId: auth.orgId } : {}),
      },
    });
    return NextResponse.json(account);
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "accounts-post" });
    return NextResponse.json({ error: "科目の登録に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = z.object({
    id: z.string().min(1),
    name: z.string().min(1, "科目名を入力してください"),
    type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const scope = getScope(auth);
  const existing = await prisma.accountMaster.findFirst({
    where: { id: parsed.data.id, ...scope },
  });
  if (!existing) {
    return NextResponse.json({ error: "科目が見つかりません" }, { status: 404 });
  }

  const { id, ...rest } = parsed.data;
  try {
    const account = await prisma.accountMaster.update({ where: { id }, data: rest });
    return NextResponse.json(account);
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "accounts-put" });
    return NextResponse.json({ error: "科目の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDが指定されていません" }, { status: 400 });

  const scope = getScope(auth);
  const existing = await prisma.accountMaster.findFirst({ where: { id, ...scope } });
  if (!existing) return NextResponse.json({ error: "科目が見つかりません" }, { status: 404 });

  // 仕訳で使用中の科目は削除不可（無効化を促す）
  const usageCount = await prisma.journalEntry.count({
    where: {
      OR: [{ debitAccount: existing.name }, { creditAccount: existing.name }],
      ...scope,
    },
  });
  if (usageCount > 0) {
    return NextResponse.json(
      { error: `この科目は${usageCount}件の仕訳で使用中です。削除の代わりに「無効化」してください。` },
      { status: 400 }
    );
  }

  try {
    await prisma.accountMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "accounts-delete" });
    return NextResponse.json({ error: "科目の削除に失敗しました" }, { status: 500 });
  }
}
