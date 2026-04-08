import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { z } from "zod";

const clientSchema = z.object({
  code: z.string().min(1, "顧客コードを入力してください"),
  name: z.string().min(1, "顧客名を入力してください"),
  nameKana: z.string().optional(),
  clientType: z.enum(["CORPORATE", "INDIVIDUAL"]).default("CORPORATE"),
  fiscalYearStart: z.number().min(1).max(12).default(4),
  taxType: z.enum(["STANDARD", "SIMPLIFIED", "EXEMPT"]).default("STANDARD"),
  invoiceRegNumber: z
    .string()
    .regex(/^T\d{13}$/, "インボイス登録番号はT+13桁の数字で入力してください")
    .optional()
    .or(z.literal("")),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const scope = getScope(auth);
  const clients = await prisma.client.findMany({
    where: scope,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { journalEntries: true, receipts: true },
      },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const scope = getScope(auth);
  const existing = await prisma.client.findFirst({
    where: { code: parsed.data.code, ...scope },
  });
  if (existing) {
    return NextResponse.json(
      { error: "この顧客コードは既に使用されています" },
      { status: 400 }
    );
  }

  const { invoiceRegNumber, ...rest } = parsed.data;
  const client = await prisma.client.create({
    data: {
      ...rest,
      invoiceRegNumber: invoiceRegNumber || null,
      userId: auth.id,
      ...(auth.orgId ? { organizationId: auth.orgId } : {}),
    },
  });

  return NextResponse.json(client);
}

const updateSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1, "顧客コードを入力してください"),
  name: z.string().min(1, "顧客名を入力してください"),
  nameKana: z.string().optional(),
  clientType: z.enum(["CORPORATE", "INDIVIDUAL"]).default("CORPORATE"),
  fiscalYearStart: z.number().min(1).max(12).default(4),
  taxType: z.enum(["STANDARD", "SIMPLIFIED", "EXEMPT"]).default("STANDARD"),
  invoiceRegNumber: z
    .string()
    .regex(/^T\d{13}$/, "インボイス登録番号はT+13桁の数字で入力してください")
    .optional()
    .or(z.literal("")),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // Verify ownership
  const scope = getScope(auth);
  const existing = await prisma.client.findFirst({
    where: { id: parsed.data.id, ...scope },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "顧客が見つかりません" },
      { status: 404 }
    );
  }

  // Check code uniqueness (excluding current client)
  const codeConflict = await prisma.client.findFirst({
    where: {
      code: parsed.data.code,
      id: { not: parsed.data.id },
      ...scope,
    },
  });
  if (codeConflict) {
    return NextResponse.json(
      { error: "この顧客コードは既に使用されています" },
      { status: 400 }
    );
  }

  const { id, invoiceRegNumber, ...rest } = parsed.data;
  const client = await prisma.client.update({
    where: { id },
    data: {
      ...rest,
      invoiceRegNumber: invoiceRegNumber || null,
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "IDが指定されていません" },
      { status: 400 }
    );
  }

  // Verify ownership
  const scope = getScope(auth);
  const existing = await prisma.client.findFirst({
    where: { id, ...scope },
    include: {
      _count: { select: { journalEntries: true, receipts: true } },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "顧客が見つかりません" },
      { status: 404 }
    );
  }

  // Check for related journal entries
  if (existing._count.journalEntries > 0) {
    return NextResponse.json(
      {
        error: `この顧客には${existing._count.journalEntries}件の仕訳データがあるため削除できません。先に仕訳データを削除してください。`,
      },
      { status: 400 }
    );
  }

  // Check for related receipts
  if (existing._count.receipts > 0) {
    return NextResponse.json(
      {
        error: `この顧客には${existing._count.receipts}件のレシートがあるため削除できません。先にレシートを削除してください。`,
      },
      { status: 400 }
    );
  }

  await prisma.client.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
