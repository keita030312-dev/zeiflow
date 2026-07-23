/**
 * fetch応答を安全にJSONとして読む（クライアント用）
 *
 * Vercelのインフラ層がAPIルート到達前に弾いたとき（413/504等）は
 * 応答がHTMLやプレーンテキストになり、素の res.json() は
 * Safariで "The string did not match the expected pattern." を投げて
 * ユーザーに意味不明なエラーが表示される。ここで日本語に変換する。
 */
/** HTTPステータスと応答ボディを保持するエラー（呼び出し側で詳細表示に使える） */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * catch した例外をユーザーに見せてよい日本語メッセージへ変換する。
 * ネットワーク断で fetch が投げる TypeError（"Failed to fetch" / "Load failed"）等の
 * ブラウザ生エラーをそのまま表示しないためのガード。
 */
export function toUserMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof TypeError) return fallback;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

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
    if (serverError) throw new ApiError(serverError, res.status, data);
    if (res.status === 413) {
      throw new ApiError(
        "ファイルサイズが大きすぎるため送信できませんでした。ファイルを小さくして再送してください。",
        res.status,
        data
      );
    }
    if (res.status === 504 || res.status === 524) {
      throw new ApiError("処理がタイムアウトしました。時間をおいて再送してください。", res.status, data);
    }
    throw new ApiError(`${fallbackMessage}（HTTP ${res.status}）`, res.status, data);
  }

  if (data === null) {
    throw new ApiError(`${fallbackMessage}（サーバー応答が不正です。再送してください）`, res.status, data);
  }
  return data as T;
}
