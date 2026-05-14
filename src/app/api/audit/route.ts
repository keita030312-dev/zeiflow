import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const scope = getScope(auth);
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10)));
  const action = req.nextUrl.searchParams.get("action");

  const where: Record<string, unknown> = { ...scope };
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
