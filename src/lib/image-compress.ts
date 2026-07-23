/**
 * 画像をレシートOCR向けに圧縮する
 * - 最大幅1600pxにリサイズ（登録番号等の小さい文字を最大限保持）
 * - カラーのまま、加工なしで送信
 * - JPEG 0.92品質から段階的に下げ、必ず4MB以下に収めて送信する
 *   （VercelのリクエストBody上限4.5MBをmultipartオーバーヘッド込みで確実に下回る値。
 *     超過するとVercelが413の非JSON応答を返し、Safariで
 *     "The string did not match the expected pattern." になる）
 */
import { MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/upload-limits";

const WIRE_SAFE_BYTES = 4 * 1024 * 1024; // 4MB

// 縮小幅×JPEG品質の組み合わせを上から順に試し、最初に4MB以下になったものを採用
const COMPRESS_ATTEMPTS: { maxWidth: number; quality: number }[] = [
  { maxWidth: 1600, quality: 0.92 },
  { maxWidth: 1600, quality: 0.75 },
  { maxWidth: 1600, quality: 0.6 },
  { maxWidth: 1200, quality: 0.6 },
];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function toJpegBlob(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  let w = img.width;
  let h = img.height;
  if (w > maxWidth) {
    h = Math.round((h * maxWidth) / w);
    w = maxWidth;
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

export async function compressImage(file: File): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("対応していない画像形式です。JPG / PNG / WEBP / GIF を選択してください。");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("画像サイズが大きすぎます。10MB以下の画像を選択してください。");
  }

  // 4MB以下ならそのまま送信（圧縮による劣化を防ぐ）
  if (file.size <= WIRE_SAFE_BYTES && (file.type === "image/jpeg" || file.type === "image/png")) {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    // デコード不能でも4MB以下なら原本をそのまま送る（WEBP/GIF等はサーバー側で処理可能）
    if (file.size <= WIRE_SAFE_BYTES) return file;
    throw new Error(
      "この画像はブラウザで縮小できませんでした。スクリーンショットを撮って送信するか、別の写真をお試しください。"
    );
  }

  for (const { maxWidth, quality } of COMPRESS_ATTEMPTS) {
    const blob = await toJpegBlob(img, maxWidth, quality);
    if (blob && blob.size <= WIRE_SAFE_BYTES) {
      return new File([blob], file.name, { type: "image/jpeg" });
    }
  }

  // 圧縮が全滅しても原本が4MB以下なら送れる
  if (file.size <= WIRE_SAFE_BYTES) return file;
  throw new Error(
    "画像を送信可能なサイズに縮小できませんでした。スクリーンショットを撮って送信してください。"
  );
}
