/** 画像アップロードの共通制限（サーバー/クライアント共用） */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * 1リクエストで実際に送信してよい上限（クライアント用）
 * VercelのリクエストBody上限4.5MBをmultipartオーバーヘッド込みで確実に下回る値。
 * 超過するとVercelがAPIルート到達前に413(非JSON応答)で弾く。
 */
export const WIRE_SAFE_BYTES = 4 * 1024 * 1024; // 4MB
