import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { anthropicApiKey: true },
  });

  const envKey = process.env.ANTHROPIC_API_KEY;
  const rawKey = user?.anthropicApiKey || (envKey?.startsWith("sk-ant-") ? envKey : null);
  const isSet = !!rawKey;
  const masked = isSet ? `sk-ant-...${rawKey!.slice(-4)}` : null;

  return NextResponse.json({ isSet, masked });
}

const schema = z.object({
  apiKey: z.string().min(1, "APIキーを入力してください"),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: auth.id },
    data: { anthropicApiKey: parsed.data.apiKey },
  });

  await prisma.auditLog.create({
    data: {
      action: "API_KEY_UPDATE",
      detail: "Anthropic APIキーを更新しました",
      userId: auth.id,
    },
  });

  return NextResponse.json({ success: true });
}
