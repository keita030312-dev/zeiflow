const STRICT_SSL_ALIASES = new Set(["prefer", "require", "verify-ca"]);

function getEffectiveQueryParam(params: URLSearchParams, name: string): string | null {
  const values = params.getAll(name);
  return values.length > 0 ? values[values.length - 1] : null;
}

/**
 * pg-connection-string v2では prefer/require/verify-ca が実際には
 * verify-fullとして動く。将来のpg v9でも現在の厳格な証明書・ホスト名検証を
 * 維持するため、アプリ実行時だけ明示的なverify-fullへ正規化する。
 */
export function normalizePgConnectionString(connectionString: string): string {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    // 接続文字列自体のエラーはDBドライバーに従来どおり報告させる。
    return connectionString;
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return connectionString;
  }

  // 明示的にlibpq互換を選んでいる接続は、利用者が選んだSSL意味論を保つ。
  if (getEffectiveQueryParam(parsed.searchParams, "uselibpqcompat") === "true") {
    return connectionString;
  }

  // pg-connection-stringと同じく、同じキーが複数ある場合は最後の値を有効値とする。
  const sslMode = getEffectiveQueryParam(parsed.searchParams, "sslmode");
  if (!sslMode || !STRICT_SSL_ALIASES.has(sslMode.toLowerCase())) {
    return connectionString;
  }

  parsed.searchParams.set("sslmode", "verify-full");
  return parsed.toString();
}
