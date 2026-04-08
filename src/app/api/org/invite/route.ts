import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (!auth.orgId) {
    return NextResponse.json(
      { error: "チームに所属していません" },
      { status: 400 }
    );
  }

  // Check if current user is ADMIN
  const currentUser = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { role: true },
  });
  if (currentUser?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "管理者のみメンバーを招待できます" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!targetUser) {
    return NextResponse.json(
      { error: "このメールアドレスのユーザーが見つかりません" },
      { status: 404 }
    );
  }

  if (targetUser.organizationId) {
    return NextResponse.json(
      { error: "このユーザーは既に別のチームに所属しています" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      organizationId: auth.orgId,
      role: "STAFF",
    },
  });

  return NextResponse.json({ success: true });
}
