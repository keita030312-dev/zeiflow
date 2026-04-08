import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

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
  if (currentUser?.role === "ADMIN") {
    return NextResponse.json(
      { error: "管理者はチームを離れることができません。先にチームを削除するか管理者を変更してください。" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: auth.id },
    data: {
      organizationId: null,
      role: "STAFF",
    },
  });

  return NextResponse.json({ success: true });
}
