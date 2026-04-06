import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { processReceipt } from "@/lib/ai/ocr";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
    include: {
      client: { select: { name: true, code: true } },
      journalEntries: true,
    },
  });

  return NextResponse.json(receipts);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const clientId = formData.get("clientId") as string;

  if (!file || !clientId) {
    return NextResponse.json(
      { error: "ファイルと顧客を選択してください" },
      { status: 400 }
    );
  }

  // Save file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadsDir = path.join(process.cwd(), "uploads", auth.id);
  await mkdir(uploadsDir, { recursive: true });
  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(uploadsDir, filename);
  await writeFile(filepath, buffer);

  // Create receipt record
  const receipt = await prisma.receipt.create({
    data: {
      imagePath: `uploads/${auth.id}/${filename}`,
      clientId,
      userId: auth.id,
      status: "PROCESSING",
    },
  });

  try {
    // Process with Claude Vision
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";
    const result = await processReceipt(base64, mimeType, auth.id);

    // Update receipt with OCR data
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        ocrRaw: JSON.stringify(result.ocr),
        status: "COMPLETED",
      },
    });

    // Create journal entry from classification
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
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: { status: "ERROR" },
    });
    console.error("OCR error:", error);
    return NextResponse.json(
      { error: "レシートの読み取りに失敗しました", receipt },
      { status: 500 }
    );
  }
}
