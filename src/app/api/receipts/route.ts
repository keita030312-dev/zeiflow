import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { processReceipt } from "@/lib/ai/ocr";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const clientId = req.nextUrl.searchParams.get("clientId");
  const receipts = await prisma.receipt.findMany({
    where: {
      userId: auth.id,
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      imagePath: true,
      imageMime: true,
      ocrRaw: true,
      status: true,
      uploadedAt: true,
      client: { select: { name: true, code: true } },
      journalEntries: true,
    },
  });

  return NextResponse.json(receipts);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;

    if (!file || !clientId) {
      return NextResponse.json(
        { error: "ファイルと顧客を選択してください" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Save receipt with image data in DB
    const receipt = await prisma.receipt.create({
      data: {
        imagePath: `receipt-${Date.now()}.jpg`,
        imageData: base64,
        imageMime: mimeType,
        clientId,
        userId: auth.id,
        status: "PROCESSING",
      },
    });

    // Process with Claude Vision
    const result = await processReceipt(base64, mimeType, auth.id);

    // Update receipt with OCR data
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        ocrRaw: JSON.stringify(result.ocr),
        status: "COMPLETED",
      },
    });

    // Create journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        date: new Date(result.ocr.date || new Date()),
        debitAccount: result.classification.debitAccount,
        creditAccount: result.classification.creditAccount,
        amount: result.classification.amount,
        taxAmount: result.classification.taxAmount,
        taxRate: result.classification.taxRate,
        description: result.classification.description,
        invoiceNumber: result.ocr.invoiceNumber || null,
        clientId,
        userId: auth.id,
        receiptId: receipt.id,
      },
    });

    return NextResponse.json({
      receipt,
      ocr: result.ocr,
      classification: result.classification,
      journalEntry,
    });
  } catch (error) {
    console.error("Receipt error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "レシートの処理に失敗しました: " + message },
      { status: 500 }
    );
  }
}
