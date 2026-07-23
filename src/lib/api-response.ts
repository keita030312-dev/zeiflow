/**
 * fetch応答を安全にJSONとして読む（クライアント用）
 *
 * Vercelのインフラ層がAPIルート到達前に弾いたとき（413/504等）は
 * 応答がHTMLやプレーンテキストになり、素の res.json() は
 * Safariで "The string did not match the expected pattern." を投げて
 * ユーザーに意味不明なエラーが表示される。ここで日本語に変換する。
 */
export async function readJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const serverError =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : null;
    if (serverError) throw new Error(serverError);
    if (res.status === 413) {
      throw new Error("画像サイズが大きすぎるため送信できませんでした。画像を小さくして再送してください。");
    }
    if (res.status === 504 || res.status === 524) {
      throw new Error("処理がタイムアウトしました。時間をおいて再送してください。");
    }
    throw new Error(`${fallbackMessage}（HTTP ${res.status}）`);
  }

  if (data === null) {
    throw new Error(`${fallbackMessage}（サーバー応答が不正です。再送してください）`);
  }
  return data as T;
}
