import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "ユーザーが見つかりません" },
      { status: 401 }
    );
  }

  return NextResponse.json(user);
}
