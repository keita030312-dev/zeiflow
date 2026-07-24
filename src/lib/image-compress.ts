/**
 * 画像をレシートOCR向けに圧縮する
 * - 最大幅1600pxにリサイズ（登録番号等の小さい文字を最大限保持）
 * - カラーのまま、加工なしで送信
 *
 * サイズ方針は2段構え:
 * 1. STORAGE_TARGET_BYTES(600KB)以下を目指して品質を段階的に下げる。
 *    画像はDBにbase64で保存されるため、無圧縮のまま蓄積するとNeonの
 *    容量上限512MBに到達し全アップロードが拒否される(2026-07-24に顧客障害)。
 * 2. どうしても縮まない場合もWIRE_SAFE_BYTES(4MB)以下は保証する。
 *    VercelのBody上限4.5MB超過は413の非JSON応答になり、Safariで
 *    "The string did not match the expected pattern." になる。
 */
import { MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES, WIRE_SAFE_BYTES } from "@/lib/upload-limits";

// これ以下なら再圧縮しない(小さい画像を二重劣化させない)
const SKIP_BYTES = 500 * 1024;

// DB保存を見据えた1枚あたりの目標サイズ
const STORAGE_TARGET_BYTES = 600 * 1024;

// canvas面積の上限（旧iOS Safariは約16.7Mピクセルで silently 失敗するため余裕を持たせる）
const MAX_CANVAS_PIXELS = 12 * 1000 * 1000;

// 縮小幅×JPEG品質の組み合わせを上から順に試し、最初に目標以下になったものを採用
const COMPRESS_ATTEMPTS: { maxWidth: number; quality: number }[] = [
  { maxWidth: 1600, quality: 0.8 },
  { maxWidth: 1600, quality: 0.65 },
  { maxWidth: 1400, quality: 0.6 },
  { maxWidth: 1200, quality: 0.55 },
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
  // 縦長画像（長尺スクショ等）でもcanvas面積上限内に収める
  if (w * h > MAX_CANVAS_PIXELS) {
    const scale = Math.sqrt(MAX_CANVAS_PIXELS / (w * h));
    w = Math.max(1, Math.floor(w * scale));
    h = Math.max(1, Math.floor(h * scale));
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

  // 既に十分小さいJPEG/PNGはそのまま(再圧縮による劣化を防ぐ)
  if (file.size <= SKIP_BYTES && (file.type === "image/jpeg" || file.type === "image/png")) {
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

  let smallest: Blob | null = null;
  for (const { maxWidth, quality } of COMPRESS_ATTEMPTS) {
    const blob = await toJpegBlob(img, maxWidth, quality);
    if (!blob) continue;
    if (blob.size <= STORAGE_TARGET_BYTES) {
      smallest = blob;
      break;
    }
    if (!smallest || blob.size < smallest.size) smallest = blob;
  }

  // 圧縮しても原本より大きくなるなら原本を使う(原本が送信可能な場合のみ)
  if (smallest && smallest.size < file.size && smallest.size <= WIRE_SAFE_BYTES) {
    return new File([smallest], file.name, { type: "image/jpeg" });
  }
  if (file.size <= WIRE_SAFE_BYTES) return file;
  if (smallest && smallest.size <= WIRE_SAFE_BYTES) {
    return new File([smallest], file.name, { type: "image/jpeg" });
  }
  throw new Error(
    "画像を送信可能なサイズに縮小できませんでした。スクリーンショットを撮って送信してください。"
  );
}
