import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export interface PortalContext {
  clientId: string;
  userId: string;
  organizationId: string | null;
  tokenId: string;
}

/**
 * ポータルトークンを検証し、コンテキストを返す。
 * 失敗時は NextResponse (401/403) を返す。
 */
export async function requirePortalToken(
  req: NextRequest
): Promise<PortalContext | NextResponse> {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "ポータルトークンが必要です" },
      { status: 401 }
    );
  }

  try {
    const record = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: { select: { id: true, name: true } } },
    });

    if (!record) {
      return NextResponse.json(
        { error: "無効なトークンです" },
        { status: 401 }
      );
    }

    if (!record.isActive) {
      return NextResponse.json(
        { error: "このリンクは無効化されています" },
        { status: 403 }
      );
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "このリンクは期限切れです" },
        { status: 403 }
      );
    }

    // 組織が停止されている場合はポータルアクセスも遮断
    // 通常ログインだけブロックしても、ポータル経由でレシートアップロード等が
    // 可能だと「停止」の意味を持たないため、ここでも同じガードを通す
    if (record.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: record.organizationId },
        select: { isActive: true },
      });
      if (org && org.isActive === false) {
        return NextResponse.json(
          { error: "この事務所のアカウントは停止されています。管理者にお問い合わせください。" },
          { status: 403 }
        );
      }
    }

    // 最終アクセス日時を更新
    await prisma.clientPortalToken.update({
      where: { id: record.id },
      data: { lastAccessedAt: new Date() },
    });

    return {
      clientId: record.clientId,
      userId: record.userId,
      organizationId: record.organizationId,
      tokenId: record.id,
    };
  } catch (error) {
    console.error("Portal auth error:", error);
    return NextResponse.json(
      { error: "認証エラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * ポータルトークンからクライアント情報を取得（フロントエンド用）
 */
export async function getPortalClientInfo(token: string) {
  const record = await prisma.clientPortalToken.findUnique({
    where: { token },
    include: {
      client: { select: { id: true, name: true, code: true } },
    },
  });

  if (!record || !record.isActive) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  return {
    clientName: record.client.name,
    clientCode: record.client.code,
  };
}
