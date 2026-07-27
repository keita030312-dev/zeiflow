/** 画像アップロードの共通制限（サーバー/クライアント共用） */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * 1リクエストで実際に送信してよい上限（クライアント用）
 * VercelのリクエストBody上限4.5MBをmultipartオーバーヘッド込みで確実に下回る値。
 * 超過するとVercelがAPIルート到達前に413(非JSON応答)で弾く。
 */
export const WIRE_SAFE_BYTES = 4 * 1024 * 1024; // 4MB

/**
 * 一括アップロードの最大枚数(ダッシュボード/顧客ポータル共通)。
 * サーバーは1リクエスト=1画像なのでVercelの60秒制限とは無関係。
 * クライアント側のプレビュー負荷とAPIレート制限を考慮した上限。
 */
export const MAX_UPLOAD_FILES = 20;

/**
 * OCRの同時並列数(品質モード別)。
 * 1枚あたりの同時APIコール数は fast=1〜2 / accurate=2〜3 / ultra=最大5 のため、
 * 瞬間同時コールが12前後に収まるよう品質側で絞る
 * (429はocr.ts側でリトライされるが、待機は計2.4秒しかなく低Tierキーでは吸収しきれない)。
 */
export function ocrParallelBatch(quality: "fast" | "accurate" | "ultra"): number {
  return quality === "fast" ? 4 : quality === "accurate" ? 3 : 2;
}
