import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { z } from "zod";

const bulkConfirmSchema = z.object({
  ids: z.array(z.string()).min(1, "1つ以上の仕訳IDが必要です"),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = bulkConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { ids } = parsed.data;

  const scope = getScope(auth);
  const result = await prisma.journalEntry.updateMany({
    where: {
      id: { in: ids },
      ...scope,
    },
    data: {
      isConfirmed: true,
    },
  });

  return NextResponse.json({
    success: true,
    count: result.count,
  });
}
