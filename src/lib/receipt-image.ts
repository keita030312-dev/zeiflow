/**
 * レシート画像の保存先抽象化(Vercel Blob + DBフォールバック)
 *
 * 背景: 画像をbase64でDBに保存する設計はNeon無料枠512MBに到達して
 * 全アップロード拒否の障害を起こした(2026-07-24)。恒久対策として
 * 画像本体はVercel Blobに置き、DBには参照(imagePath=Blob URL)だけ保存する。
 *
 * 方針:
 * - 書き込み: Blob成功→imagePath=URL・imageData=null / Blob失敗→従来どおり
 *   imageDataへbase64保存(可用性優先のフォールバック)
 * - 読み出し: imagePathがURLならBlobから取得、なければimageData(移行前の
 *   既存レシートとフォールバック保存の後方互換)
 * - Blob URLはランダムサフィックス付きで推測不能だが、クライアントへは
 *   露出させず、認証付きAPIルート経由でのみ配信する
 * - レシート削除時はBlobも削除する(仕訳確定時のレシート削除を含む)
 */
import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";

export function isBlobUrl(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("https://")) return false;
  // Vercel Blobのストアホストのみ許容(将来imagePathに外部値が入ってもSSRFさせない)
  try {
    return new URL(path).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
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
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const { url } = await put(`receipts/${randomUUID()}.${ext}`, Buffer.from(base64, "base64"), {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: true,
    });
    return url;
  } catch (err) {
    console.warn("[uploadReceiptImageToBlob] failed, falling back to DB storage:", err);
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
      // Blob側の一時障害で関数がハングしないよう上限を切る
      const res = await fetch(receipt.imagePath, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        return {
          buffer: Buffer.from(await res.arrayBuffer()),
          mime: res.headers.get("content-type") || receipt.imageMime || "image/jpeg",
        };
      }
      console.warn("[loadReceiptImage] blob fetch failed:", res.status, receipt.imagePath);
    } catch (err) {
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
