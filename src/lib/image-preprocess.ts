import sharp from "sharp";

/**
 * サーバーサイド画像前処理(OCR精度向上のため)
 *
 * 処理内容:
 * 1. EXIF情報による自動回転(横向き写真を正立)
 * 2. リサイズ(最大2200px幅、小さい文字を保持)
 * 3. ノーマライズ(明るさ・コントラストの自動最適化)
 * 4. シャープネス強化(印字された細い文字をくっきり)
 * 5. JPEG出力(品質92・mozjpegで圧縮率向上)
 *
 * 入力が異常画像(corruptions)の場合は元画像をそのまま返す(Fail-safe)。
 *
 * 戻り値:
 * - base64: 前処理済み画像のbase64
 * - mimeType: "image/jpeg"
 */
export async function preprocessForOcr(
  buffer: Buffer,
  originalMime: string,
): Promise<{ base64: string; mimeType: string; preprocessed: boolean }> {
  try {
    const meta = await sharp(buffer).metadata();

    // 既に小さい(<800px幅)・極端に大きい(>8000px)場合は通常処理
    const targetWidth = Math.min(2200, Math.max(meta.width || 2200, 800));

    const processed = await sharp(buffer, { failOn: "none" })
      .rotate() // EXIF Orientationを参照して自動回転
      .resize({
        width: targetWidth,
        withoutEnlargement: true,
        kernel: "lanczos3", // 高品質なリサンプル
      })
      .normalize() // ヒストグラムを伸ばしてコントラスト最適化
      .sharpen({ sigma: 0.6, m1: 1.0, m2: 2.0 }) // 控えめなシャープネス(細文字向け)
      .jpeg({
        quality: 92,
        mozjpeg: true, // 同品質でファイルサイズ削減
        chromaSubsampling: "4:4:4", // 色情報を落とさない(数字の判別性向上)
      })
      .toBuffer();

    return {
      base64: processed.toString("base64"),
      mimeType: "image/jpeg",
      preprocessed: true,
    };
  } catch (err) {
    // 前処理失敗時は元画像で続行(Fail-safe)
    console.warn("[preprocessForOcr] failed, falling back to original:", err);
    return {
      base64: buffer.toString("base64"),
      mimeType: originalMime || "image/jpeg",
      preprocessed: false,
    };
  }
}

/**
 * 画像品質チェック(撮影時のフィードバック用)
 * 顧問先ポータルなどで「もう一度明るく撮ってください」のような指示に使用
 */
export async function checkImageQuality(buffer: Buffer): Promise<{
  ok: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];

  try {
    const meta = await sharp(buffer).metadata();
    const stats = await sharp(buffer).stats();

    // 解像度チェック
    if ((meta.width || 0) < 800 || (meta.height || 0) < 800) {
      warnings.push("解像度が低すぎます(推奨: 1200px以上)。文字が読み取れない可能性があります。");
    }

    // 明るさチェック(全チャンネルの平均が極端に暗い/明るい)
    const avgBrightness =
      stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
    if (avgBrightness < 60) {
      warnings.push("画像が暗すぎます。明るい場所で再撮影してください。");
    } else if (avgBrightness > 230) {
      warnings.push("画像が明るすぎる/白飛びしています。光の当たり方を変えて再撮影してください。");
    }

    // コントラストチェック(stdevが低すぎ=ぼやけ)
    const avgStdev =
      stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
    if (avgStdev < 25) {
      warnings.push("コントラストが低い(ぼけている可能性)。ピントを合わせて再撮影してください。");
    }
  } catch (err) {
    console.warn("[checkImageQuality] error:", err);
  }

  return { ok: warnings.length === 0, warnings };
}
