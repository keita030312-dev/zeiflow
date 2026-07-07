/**
 * 画像をレシートOCR向けに圧縮する
 * - 最大幅1600pxにリサイズ（登録番号等の小さい文字を最大限保持）
 * - カラーのまま、加工なしで送信
 * - JPEG 0.92品質で出力（高品質）
 * - 最大4.5MBに収める（Anthropic API対応）
 */
import { MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/upload-limits";

const TARGET_BYTES = 4.5 * 1024 * 1024; // 4.5MB

export async function compressImage(file: File): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("対応していない画像形式です。JPG / PNG / WEBP / GIF を選択してください。");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("画像サイズが大きすぎます。10MB以下の画像を選択してください。");
  }

  // 4.5MB以下ならそのまま送信（圧縮による劣化を防ぐ）
  if (file.size <= TARGET_BYTES && (file.type === "image/jpeg" || file.type === "image/png")) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxWidth = 1600;
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          if (blob.size <= TARGET_BYTES) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            canvas.toBlob(
              (blob2) => {
                if (blob2) {
                  resolve(new File([blob2], file.name, { type: "image/jpeg" }));
                } else {
                  resolve(file);
                }
              },
              "image/jpeg",
              0.7
            );
          }
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
