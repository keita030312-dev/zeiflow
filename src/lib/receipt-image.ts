/**
 * レシート画像の保存先抽象化(private Vercel Blob + 開発時DBフォールバック)
 *
 * 背景: 画像をbase64でDBに保存する設計はNeon無料枠512MBに到達して
 * 全アップロード拒否の障害を起こした(2026-07-24)。恒久対策として
 * 画像本体はVercel Blobに置き、DBには参照(imagePath=Blob URL)だけ保存する。
 *
 * 方針:
 * - 書き込み: Blob成功→imagePath=URL・imageData=null。本番のBlob失敗は503相当
 *   とし、容量障害を再発させるDBフォールバックは開発環境だけに限定する
 * - 読み出し: imagePathがURLならBlobから取得、なければimageData(移行前の
 *   既存レシートとフォールバック保存の後方互換)
 * - Blob URLはランダムサフィックス付きで推測不能だが、クライアントへは
 *   露出させず、認証付きAPIルート経由でのみ配信する
 * - レシート削除時はBlobも削除する。仕訳確定だけでは削除せず、
 *   会計ソフトへの取込完了確認後に猶予期間を経て削除する
 */
import { put, del, get } from "@vercel/blob";
import { randomUUID } from "node:crypto";

export class ReceiptImageStorageError extends Error {
  constructor(message = "画像ストレージを利用できません") {
    super(message);
    this.name = "ReceiptImageStorageError";
  }
}

export function isReceiptImageStorageError(
  error: unknown,
): error is ReceiptImageStorageError {
  return error instanceof ReceiptImageStorageError;
}

export function isBlobUrl(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("https://")) return false;
  // Vercel Blobのストアホストのみ許容(将来imagePathに外部値が入ってもSSRFさせない)
  try {
    return new URL(path).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isPublicBlobUrl(path: string | null | undefined): path is string {
  return isBlobUrl(path) &&
    new URL(path).hostname.endsWith(".public.blob.vercel-storage.com");
}

/** 一覧APIなどでクライアントへ返す前にBlob URLを隠す */
export function sanitizeImagePath(path: string | null | undefined): string {
  return isBlobUrl(path) ? "blob" : path || "";
}

/**
 * 画像をVercel Blobへ保存してURLを返す。
 * トークン未設定・アップロード失敗時はnull(呼び出し側でDB保存にフォールバック)。
 */
export async function uploadReceiptImageToBlob(
  base64: string,
  mimeType: string
): Promise<string | null> {
  const isProduction =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (isProduction) {
      throw new ReceiptImageStorageError();
    }
    return null;
  }
  try {
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const { url } = await put(`receipts/${randomUUID()}.${ext}`, Buffer.from(base64, "base64"), {
      access: "private",
      contentType: mimeType,
      addRandomSuffix: true,
    });
    return url;
  } catch (err) {
    console.warn("[uploadReceiptImageToBlob] failed:", err);
    if (isProduction) {
      throw new ReceiptImageStorageError();
    }
    return null;
  }
}

/**
 * レシート画像を読み出す(Blob優先・imageDataフォールバック)。
 * どちらからも取得できない場合はnull。
 */
export async function loadReceiptImage(receipt: {
  imagePath: string | null;
  imageData: string | null;
  imageMime: string | null;
}): Promise<{ buffer: Buffer; mime: string } | null> {
  if (isBlobUrl(receipt.imagePath)) {
    try {
      const abortSignal = AbortSignal.timeout(10_000);
      if (isPublicBlobUrl(receipt.imagePath)) {
        // 移行済みの旧public Blobとの一時的な後方互換。新規保存はprivateのみ。
        const res = await fetch(receipt.imagePath, { signal: abortSignal });
        if (res.ok) {
          return {
            buffer: Buffer.from(await res.arrayBuffer()),
            mime: res.headers.get("content-type") || receipt.imageMime || "image/jpeg",
          };
        }
        console.warn("[loadReceiptImage] legacy public blob fetch failed:", res.status);
      }
      // private BlobはSDK経由で認証付き取得する。public形式のホストでも
      // 未認証取得できなかった場合はprivate取得を試し、ストア設定差を吸収する。
      if (!isPublicBlobUrl(receipt.imagePath) ||
          process.env.BLOB_READ_WRITE_TOKEN) {
        const result = await get(receipt.imagePath, {
          access: "private",
          abortSignal,
        });
        if (result?.statusCode === 200) {
          return {
            buffer: Buffer.from(await new Response(result.stream).arrayBuffer()),
            mime: result.blob.contentType || receipt.imageMime || "image/jpeg",
          };
        }
        console.warn("[loadReceiptImage] private blob not found");
      }
    } catch (err) {
      // Blob URLそのものはログへ出さない。
      console.warn("[loadReceiptImage] blob fetch error:", err);
    }
  }
  if (receipt.imageData) {
    return {
      buffer: Buffer.from(receipt.imageData, "base64"),
      mime: receipt.imageMime || "image/jpeg",
    };
  }
  return null;
}

/**
 * レシート削除に伴うBlob削除(ベストエフォート)。
 * 失敗してもレシート削除自体は成立させる(孤児Blobは許容)。
 */
export async function deleteReceiptImageBlob(
  imagePath: string | null | undefined
): Promise<void> {
  if (!isBlobUrl(imagePath)) return;
  try {
    await del(imagePath);
  } catch (err) {
    console.warn("[deleteReceiptImageBlob] failed (orphan blob):", imagePath, err);
  }
}
