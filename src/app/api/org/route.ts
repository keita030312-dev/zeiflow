import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
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
  const auth = requireAuth(req);
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
