import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const scope = getScope(auth);
  const clientId = req.nextUrl.searchParams.get("clientId");

  const tokens = await prisma.clientPortalToken.findMany({
    where: {
      ...scope,
      ...(clientId ? { clientId } : {}),
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true, code: true } },
    },
  });

  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { clientId } = await req.json();

    if (!clientId) {
      return NextResponse.json(
        { error: "顧客を指定してください" },
        { status: 400 }
      );
    }

    // 顧客がユーザーの範囲内か確認
    const scope = getScope(auth);
    const client = await prisma.client.findFirst({
      where: { id: clientId, ...scope },
    });

    if (!client) {
      return NextResponse.json(
        { error: "指定された顧客が見つかりません" },
        { status: 404 }
      );
    }

    // 既にアクティブなリンクがあれば、それを返す（1顧客1リンク）
    const existing = await prisma.clientPortalToken.findFirst({
      where: { clientId, isActive: true, ...scope },
    });

    if (existing) {
      return NextResponse.json({
        ...existing,
        portalUrl: `/portal?token=${existing.token}`,
      });
    }

    // なければ新規作成（期限なし）
    const token = randomUUID();

    const portalToken = await prisma.clientPortalToken.create({
      data: {
        token,
        clientId,
        userId: auth.id,
        ...(auth.orgId ? { organizationId: auth.orgId } : {}),
        label: `${client.name}のポータル`,
        // expiresAt なし = 期限なし
      },
    });

    // 監査ログ
    await prisma.auditLog.create({
      data: {
        action: "PORTAL_TOKEN_CREATE",
        detail: `ポータルリンク発行: ${client.name} (${portalToken.id})`,
        userId: auth.id,
        ...(auth.orgId ? { organizationId: auth.orgId } : {}),
      },
    });

    return NextResponse.json({
      ...portalToken,
      portalUrl: `/portal?token=${token}`,
    });
  } catch (error) {
    console.error("Portal token create error:", error);
    return NextResponse.json(
      { error: "リンクの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "トークンIDが必要です" },
      { status: 400 }
    );
  }

  const scope = getScope(auth);
  const token = await prisma.clientPortalToken.findFirst({
    where: { id, ...scope },
  });

  if (!token) {
    return NextResponse.json(
      { error: "トークンが見つかりません" },
      { status: 404 }
    );
  }

  await prisma.clientPortalToken.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
