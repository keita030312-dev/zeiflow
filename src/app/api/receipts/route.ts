import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { processReceipt } from "@/lib/ai/ocr";
import {
  preprocessForOcr,
  compressForStorage,
  STORAGE_MAX_WIDTH_RECEIPT,
  STORAGE_MAX_WIDTH_INVOICE,
} from "@/lib/image-preprocess";
import { reportError } from "@/lib/error-reporter";
import { parseDocumentKind } from "@/lib/document-kind";
import { isLikelyMissingSchemaColumn } from "@/lib/prisma-errors";
import { buildJournalCreateData, validateUploadedImage } from "@/lib/receipt-journal";
import { uploadReceiptImageToBlob, deleteReceiptImageBlob, sanitizeImagePath } from "@/lib/receipt-image";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const scope = getScope(auth);
  const clientId = req.nextUrl.searchParams.get("clientId");
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM形式

  const dateFilter: Record<string, unknown> = {};
  if (month) {
    const [y, m] = month.split("-").map(Number);
    dateFilter.uploadedAt = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  const receiptSelect = {
    id: true,
    imagePath: true,
    imageMime: true,
    ocrRaw: true,
    status: true,
    uploadedAt: true,
    client: { select: { name: true, code: true } },
    journalEntries: true,
    documentKind: true,
  } as const;

  try {
    const receipts = await prisma.receipt.findMany({
      where: {
        ...scope,
        ...(clientId ? { clientId } : {}),
        ...dateFilter,
      },
      orderBy: { uploadedAt: "desc" },
      select: receiptSelect,
    });

    // Blob URLはクライアントへ露出させない(表示は認証付き /api/uploads 経由)
    return NextResponse.json(
      receipts.map((r) => ({ ...r, imagePath: sanitizeImagePath(r.imagePath) }))
    );
  } catch (e) {
    if (isLikelyMissingSchemaColumn(e, "document_kind")) {
      const receipts = await prisma.receipt.findMany({
        where: {
          ...scope,
          ...(clientId ? { clientId } : {}),
          ...dateFilter,
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
      return NextResponse.json(
        receipts.map((r) => ({ ...r, imagePath: sanitizeImagePath(r.imagePath) }))
      );
    }
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let receiptId: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;
    const qRaw = (formData.get("quality") as string) || "fast";
    const quality: "fast" | "accurate" | "ultra" =
      qRaw === "ultra" ? "ultra" : qRaw === "accurate" ? "accurate" : "fast";
    const documentKind = parseDocumentKind(formData.get("documentKind"));

    if (!file || !clientId) {
      return NextResponse.json(
        { error: "ファイルと顧客を選択してください" },
        { status: 400 }
      );
    }

    // clientId が呼び出し元テナントの所有である事を必ず検証する。
    // 未検証だと他テナントの顧客IDで OCR を呼べてしまい、ナレッジ・過去仕訳が
    // プロンプトに混入する(マルチテナント漏洩)。
    const scope = getScope(auth);
    const ownedClient = await prisma.client.findFirst({
      where: { id: clientId, ...scope },
      select: { id: true },
    });
    if (!ownedClient) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    const fileError = validateUploadedImage(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalMime = file.type || "image/jpeg";

    // サーバーサイド画像前処理(OCR精度向上)
    // - OCRには前処理済み画像、DB保存は軽量化した画像(容量上限対策)を使う
    // - A4請求書は電帳法の200dpi相当を満たす幅で保存する
    const storageWidth =
      documentKind === "INVOICE" ? STORAGE_MAX_WIDTH_INVOICE : STORAGE_MAX_WIDTH_RECEIPT;
    const [preprocessed, storage] = await Promise.all([
      preprocessForOcr(buffer, originalMime),
      compressForStorage(buffer, originalMime, storageWidth),
    ]);

    // 画像本体はVercel Blobへ。失敗時のみ従来どおりDB(imageData)へ保存
    const blobUrl = await uploadReceiptImageToBlob(storage.base64, storage.mimeType);

    const baseReceiptData = {
      imagePath: blobUrl ?? `receipt-${Date.now()}.jpg`,
      imageData: blobUrl ? null : storage.base64,
      imageMime: storage.mimeType,
      clientId,
      userId: auth.id,
      ...(auth.orgId ? { organizationId: auth.orgId } : {}),
      status: "PROCESSING" as const,
    };

    let receipt;
    try {
      receipt = await prisma.receipt.create({
        data: { ...baseReceiptData, documentKind },
      });
    } catch (createErr) {
      if (isLikelyMissingSchemaColumn(createErr, "document_kind")) {
        receipt = await prisma.receipt.create({ data: baseReceiptData });
      } else {
        throw createErr;
      }
    }

    receiptId = receipt.id;

    // Process with Claude Vision（複数レシート対応・前処理済み画像を使用）
    const results = await processReceipt(
      preprocessed.base64,
      preprocessed.mimeType,
      auth.id,
      quality,
      clientId,
      auth.orgId,
      documentKind,
    );

    // OCR が 1件も返さなかった場合は失敗扱い。空のまま COMPLETED にすると
    // 「成功したのに journal が無い」幽霊レシートが残る(retry 側と同じ理由)。
    if (results.length === 0) {
      throw new Error("OCR結果が空です");
    }

    // 仕訳作成とCOMPLETED化は一体として保存する。
    // 複数仕訳の途中で失敗しても、一部の仕訳だけが残らないようにする。
    const persisted = await prisma.$transaction(async (tx) => {
      const journalEntries = [];
      for (const result of results) {
        const journalEntry = await tx.journalEntry.create({
          data: buildJournalCreateData(result, {
            clientId,
            userId: auth.id,
            organizationId: auth.orgId,
            receiptId: receipt.id,
          }),
        });
        journalEntries.push(journalEntry);
      }

      const completedReceipt = await tx.receipt.update({
        where: { id: receipt.id },
        data: {
          ocrRaw: JSON.stringify(results[0]?.ocr),
          status: "COMPLETED",
        },
      });

      return { journalEntries, completedReceipt };
    });
    const { journalEntries, completedReceipt } = persisted;

    // レスポンスのinvoiceNumberを仕訳から取得（フォールバック後の値を反映）
    const ocrWithInvoice = {
      ...results[0]?.ocr,
      invoiceNumber: results[0]?.ocr?.invoiceNumber || journalEntries[0]?.invoiceNumber || null,
    };

    return NextResponse.json({
      receipt: completedReceipt,
      ocr: ocrWithInvoice,
      classification: results[0]?.classification,
      journalEntry: journalEntries[0],
      allResults: results.length > 1 ? results : undefined,
      journalEntries: journalEntries.length > 1 ? journalEntries : undefined,
    });
  } catch (error) {
    console.error("Receipt error:", error);
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "receipts" });
    // 処理中のレシートをERRORに更新
    if (receiptId) {
      await prisma.receipt.update({ where: { id: receiptId }, data: { status: "ERROR" } }).catch(() => {});
    }
    const message = error instanceof Error ? error.message : String(error);
    if (isLikelyMissingSchemaColumn(error, "document_kind")) {
      return NextResponse.json(
        {
          error:
            "データベースの構成が古いです。管理者向け: プロジェクトで npx prisma db push を実行し、document_kind 列を追加してください。",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "レシートの処理に失敗しました: " + message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "レシートIDが必要です" }, { status: 400 });
  }

  const scope = getScope(auth);
  const receipt = await prisma.receipt.findFirst({ where: { id, ...scope } });
  if (!receipt) {
    return NextResponse.json({ error: "レシートが見つかりません" }, { status: 404 });
  }

  // 仕訳は残し、レシート参照のみ外す（確定フローと同じ方針）
  await prisma.journalEntry.updateMany({
    where: { receiptId: id },
    data: { receiptId: null },
  });
  await prisma.receipt.delete({ where: { id } });
  await deleteReceiptImageBlob(receipt.imagePath);

  return NextResponse.json({ success: true });
}
