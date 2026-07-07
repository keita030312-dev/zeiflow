import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { checkOrgGate } from "@/lib/auth-org-gate";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  orgId?: string;
}

export function getScope(auth: TokenPayload): { userId?: string; organizationId?: string } {
  if (auth.orgId) {
    return { organizationId: auth.orgId };
  }
  return { userId: auth.id };
}

function decodeToken(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return verify(token, process.env.NEXTAUTH_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * 認証 + 生存確認。JWT が有効でも下のどれかなら 401/403 を返す:
 * - DB に user が存在しない(退会・削除済み)
 * - user の organizationId が JWT と食い違う(別事務所へ異動 or 退会)
 * - 所属事務所が停止 / 承認待ち(checkOrgGate)
 *
 * JWT は 8h 有効で revoke 不可なので、ここで毎リクエスト DB 再検証する事で
 * 「停止されたのに JWT が残ってるから API を叩けてしまう」を塞ぐ。
 * DB 一時障害時は payload を返してフォールスルー(可用性優先)。
 */
export async function requireAuth(
  req: NextRequest,
): Promise<TokenPayload | NextResponse> {
  const payload = decodeToken(req);
  if (!payload) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let user: { id: string; organizationId: string | null } | null;
  try {
    user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, organizationId: true },
    });
  } catch {
    return payload;
  }

  if (!user) {
    return NextResponse.json(
      { error: "アカウントが見つかりません。再ログインしてください。" },
      { status: 401 },
    );
  }

  const jwtOrgId = payload.orgId ?? null;
  const dbOrgId = user.organizationId ?? null;
  if (jwtOrgId !== dbOrgId) {
    return NextResponse.json(
      { error: "所属が変更されました。再ログインしてください。" },
      { status: 401 },
    );
  }

  const gate = await checkOrgGate(dbOrgId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  return payload;
}
