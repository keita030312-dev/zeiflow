import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { generateSecret, generateTOTPUri, verifyTOTP } from "@/lib/totp";
import QRCode from "qrcode";
import { z } from "zod";

// POST: Generate TOTP secret and return QR code
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const secret = generateSecret();
  const uri = generateTOTPUri(secret, auth.email);
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 200, margin: 1 });

  // Store secret temporarily (not yet enabled)
  await prisma.user.update({
    where: { id: auth.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  return NextResponse.json({ secret, qrDataUrl });
}

const verifySchema = z.object({
  code: z.string().length(6, "6桁のコードを入力してください"),
});

// PUT: Verify TOTP code and enable 2FA
export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { totpSecret: true },
  });

  if (!user?.totpSecret) {
    return NextResponse.json(
      { error: "先にQRコードを生成してください" },
      { status: 400 }
    );
  }

  const isValid = verifyTOTP(parsed.data.code, user.totpSecret);
  if (!isValid) {
    return NextResponse.json(
      { error: "コードが正しくありません。もう一度お試しください" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: auth.id },
    data: { totpEnabled: true },
  });

  await prisma.auditLog.create({
    data: {
      action: "TOTP_ENABLED",
      detail: "二要素認証を有効にしました",
      userId: auth.id,
    },
  });

  return NextResponse.json({ success: true });
}

// DELETE: Disable 2FA
export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  await prisma.user.update({
    where: { id: auth.id },
    data: { totpSecret: null, totpEnabled: false },
  });

  await prisma.auditLog.create({
    data: {
      action: "TOTP_DISABLED",
      detail: "二要素認証を無効にしました",
      userId: auth.id,
    },
  });

  return NextResponse.json({ success: true });
}
