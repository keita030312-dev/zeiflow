import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, name: true, email: true, role: true, organizationId: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "ユーザーが見つかりません" },
      { status: 401 }
    );
  }

  // 事務所が停止されていないかチェック
  if (user.organizationId) {
    try {
      const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
      if (org && org.isActive === false) {
        return NextResponse.json(
          { error: "この事務所のアカウントは停止されています" },
          { status: 403 }
        );
      }
    } catch {
      // isActiveカラムが存在しない場合はスキップ
    }
  }

  return NextResponse.json(user);
}
