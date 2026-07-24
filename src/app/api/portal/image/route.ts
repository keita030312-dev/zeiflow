import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePortalToken } from "@/lib/portal-auth";
import { loadReceiptImage } from "@/lib/receipt-image";

export async function GET(req: NextRequest) {
  const portal = await requirePortalToken(req);
  if (portal instanceof NextResponse) return portal;

  const receiptId = req.nextUrl.searchParams.get("id");
  if (!receiptId) {
    return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
  }

  // このクライアントのレシートのみアクセス可能
  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, clientId: portal.clientId },
    select: { imagePath: true, imageData: true, imageMime: true },
  });

  const image = receipt ? await loadReceiptImage(receipt) : null;
  if (!image) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
