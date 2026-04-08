import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const scope = getScope(auth);
    const [clients, journals, exportLogs, auditLogs] = await Promise.all([
      prisma.client.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
      }),
      prisma.journalEntry.findMany({
        where: scope,
        orderBy: { date: "desc" },
        include: {
          receipt: {
            select: {
              id: true,
              imagePath: true,
              uploadedAt: true,
            },
          },
        },
      }),
      prisma.exportLog.findMany({
        where: scope,
        orderBy: { exportedAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      user: { id: auth.id, email: auth.email },
      data: {
        clients,
        journals,
        exportLogs,
        auditLogs,
      },
    };

    const json = JSON.stringify(backup, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `zeiflow-backup-${timestamp}.json`;

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "バックアップの作成に失敗しました" },
      { status: 500 }
    );
  }
}
