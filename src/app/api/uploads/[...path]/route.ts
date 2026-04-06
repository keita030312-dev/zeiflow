import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const receiptId = req.nextUrl.searchParams.get("id");
  if (!receiptId) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, userId: auth.id },
    select: { imageData: true, imageMime: true },
  });

  if (!receipt?.imageData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = Buffer.from(receipt.imageData, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": receipt.imageMime || "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
