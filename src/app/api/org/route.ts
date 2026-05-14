import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (!auth.orgId) {
    return NextResponse.json({ org: null });
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.orgId },
    include: {
      members: {
        select: { id: true, name: true, email: true, role: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ org });
}

const createSchema = z.object({
  name: z.string().min(1, "チーム名を入力してください"),
  code: z.string().min(1, "チームコードを入力してください").regex(/^[a-zA-Z0-9_-]+$/, "チームコードは英数字・ハイフン・アンダースコアのみ使用できます"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.orgId) {
    return NextResponse.json(
      { error: "既にチームに所属しています" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const existing = await prisma.organization.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json(
      { error: "このチームコードは既に使用されています" },
      { status: 400 }
    );
  }

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
    },
  });

  // Set user as ADMIN and assign to org
  await prisma.user.update({
    where: { id: auth.id },
    data: {
      organizationId: org.id,
      role: "ADMIN",
    },
  });

  return NextResponse.json({ org });
}

// PUT: 事務所名変更 or メンバー権限変更 or メンバー削除
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.orgId || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = await req.json();

  // 事務所名変更
  if (body.name) {
    await prisma.organization.update({
      where: { id: auth.orgId },
      data: { name: body.name },
    });
    return NextResponse.json({ success: true });
  }

  // メンバー権限変更
  if (body.memberId && body.role) {
    if (body.memberId === auth.id) {
      return NextResponse.json({ error: "自分自身の権限は変更できません" }, { status: 400 });
    }
    const member = await prisma.user.findFirst({
      where: { id: body.memberId, organizationId: auth.orgId },
    });
    if (!member) {
      return NextResponse.json({ error: "メンバーが見つかりません" }, { status: 404 });
    }
    await prisma.user.update({
      where: { id: body.memberId },
      data: { role: body.role },
    });
    return NextResponse.json({ success: true });
  }

  // メンバー削除（強制退会）
  if (body.removeMemberId) {
    if (body.removeMemberId === auth.id) {
      return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
    }
    const member = await prisma.user.findFirst({
      where: { id: body.removeMemberId, organizationId: auth.orgId },
    });
    if (!member) {
      return NextResponse.json({ error: "メンバーが見つかりません" }, { status: 404 });
    }
    await prisma.user.update({
      where: { id: body.removeMemberId },
      data: { organizationId: null, role: "STAFF" },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
}
