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
/**
 * DB保存用の軽量化(幅1600px上限・JPEG品質75)
 *
 * 画像はDBにbase64で保存されるため、原本のまま蓄積するとNeonの容量上限512MBに
 * 到達し全アップロードが拒否される(2026-07-24に顧客障害)。表示・原本確認には
 * 十分な品質を保ちつつ、1枚あたり数百KBに抑える。
 * 圧縮失敗時や圧縮で逆に大きくなる場合は元画像をそのまま返す(Fail-safe)。
 */
export async function compressForStorage(
  buffer: Buffer,
  originalMime: string,
): Promise<{ base64: string; mimeType: string }> {
  try {
    const out = await sharp(buffer, { failOn: "none" })
      .rotate() // EXIF Orientationを反映してから回転情報を破棄
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
    if (out.length < buffer.length) {
      return { base64: out.toString("base64"), mimeType: "image/jpeg" };
    }
  } catch (err) {
    console.warn("[compressForStorage] failed, falling back to original:", err);
  }
  return { base64: buffer.toString("base64"), mimeType: originalMime || "image/jpeg" };
}

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

