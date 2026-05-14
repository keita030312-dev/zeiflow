import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// スーパー管理者認証（環境変数のシークレットで認証）
function requireSuperAdmin(req: NextRequest): boolean {
  const envSecret = process.env.SUPER_ADMIN_SECRET;
  // SUPER_ADMIN_SECRET が未設定なら fail closed（管理者アクセス完全拒否）
  // 過去にハードコードのフォールバック値があり、env 未設定時に固定値で全テナント操作可能になっていた
  if (!envSecret) {
    console.error("[SECURITY] SUPER_ADMIN_SECRET is not set; superadmin access denied.");
    return false;
  }
  // URL クエリ経由の secret は受け付けない（アクセスログ・ブラウザ履歴に残るため）
  // 必ず x-admin-secret ヘッダー経由で送る
  const secret = req.headers.get("x-admin-secret");
  const validSecret = envSecret.replace(/"/g, "").trim();
  const inputSecret = (secret || "").replace(/"/g, "").trim();
  return !!inputSecret && inputSecret === validSecret;
}

async function getMaintenanceStatus(): Promise<boolean> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: "maintenance" } });
    return config?.value === "true";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  try {
    // 全体統計
    const [
      totalUsers,
      totalOrgs,
      totalClients,
      totalReceipts,
      totalJournals,
      totalKnowledge,
      totalPortalTokens,
      errorReceipts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.client.count(),
      prisma.receipt.count(),
      prisma.journalEntry.count(),
      prisma.knowledgeFile.count(),
      prisma.clientPortalToken.count({ where: { isActive: true } }),
      prisma.receipt.count({ where: { status: "ERROR" } }),
    ]);

    // ユーザー一覧
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        totpEnabled: true,
        organizationId: true,
        organization: { select: { name: true } },
        _count: {
          select: { clients: true, receipts: true, journalEntries: true },
        },
      },
    });

    // 組織一覧（事務所管理）
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        isApproved: true,
        plan: true,
        note: true,
        createdAt: true,
        members: { select: { id: true, name: true, email: true, role: true } },
        _count: {
          select: { members: true, clients: true, receipts: true, journalEntries: true, knowledgeFiles: true, portalTokens: true },
        },
      },
    });

    // 最近の監査ログ
    const recentLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalOrgs,
        totalClients,
        totalReceipts,
        totalJournals,
        totalKnowledge,
        totalPortalTokens,
        errorReceipts,
      },
      users,
      orgs,
      recentLogs,
      maintenance: await getMaintenanceStatus(),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT: 事務所の設定変更
export async function PUT(req: NextRequest) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // メンテナンスモード切り替え
    if (body.maintenance !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: "maintenance" },
        update: { value: String(body.maintenance) },
        create: { key: "maintenance", value: String(body.maintenance) },
      });
      return NextResponse.json({ success: true, maintenance: body.maintenance });
    }

    const { orgId, isActive, isApproved, plan, note } = body;
    if (!orgId) {
      return NextResponse.json({ error: "組織IDが必要です" }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(isApproved !== undefined ? { isApproved } : {}),
        ...(plan !== undefined ? { plan } : {}),
        ...(note !== undefined ? { note } : {}),
      },
    });

    return NextResponse.json({ success: true, org: updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE: ユーザー削除
export async function DELETE(req: NextRequest) {
  if (!requireSuperAdmin(req)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  const orgId = req.nextUrl.searchParams.get("orgId");

  try {
    // 事務所ごと削除
    if (orgId) {
      // 組織に紐づく全データを削除
      await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
      await prisma.exportLog.deleteMany({ where: { organizationId: orgId } });
      await prisma.journalEntry.deleteMany({ where: { organizationId: orgId } });
      await prisma.receipt.deleteMany({ where: { organizationId: orgId } });
      await prisma.clientPortalToken.deleteMany({ where: { organizationId: orgId } });
      await prisma.knowledgeFile.deleteMany({ where: { organizationId: orgId } });
      await prisma.client.deleteMany({ where: { organizationId: orgId } });
      // メンバーのorgIdをnullに（ユーザー自体は残す→再登録不要にするなら削除）
      const members = await prisma.user.findMany({ where: { organizationId: orgId } });
      for (const m of members) {
        await prisma.auditLog.deleteMany({ where: { userId: m.id } });
        await prisma.exportLog.deleteMany({ where: { userId: m.id } });
        await prisma.journalEntry.deleteMany({ where: { userId: m.id } });
        await prisma.receipt.deleteMany({ where: { userId: m.id } });
        await prisma.clientPortalToken.deleteMany({ where: { userId: m.id } });
        await prisma.knowledgeFile.deleteMany({ where: { userId: m.id } });
        await prisma.client.deleteMany({ where: { userId: m.id } });
        await prisma.user.delete({ where: { id: m.id } });
      }
      await prisma.organization.delete({ where: { id: orgId } });
      return NextResponse.json({ success: true });
    }

    // ユーザー単体削除
    if (userId) {
      await prisma.auditLog.deleteMany({ where: { userId } });
      await prisma.exportLog.deleteMany({ where: { userId } });
      await prisma.journalEntry.deleteMany({ where: { userId } });
      await prisma.receipt.deleteMany({ where: { userId } });
      await prisma.clientPortalToken.deleteMany({ where: { userId } });
      await prisma.knowledgeFile.deleteMany({ where: { userId } });
      await prisma.client.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ユーザーIDまたは組織IDが必要です" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
