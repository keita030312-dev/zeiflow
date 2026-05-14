const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Sentryにエラーを送信する軽量ヘルパー
 * @sentry/nextjs はNext.js 16との互換性問題があるため、Sentry APIに直接送信
 */
export async function reportError(error: Error | string, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;

  try {
    // DSNからSentryのURLを構築
    const dsnMatch = SENTRY_DSN.match(/https:\/\/(.+)@(.+)\/(.+)/);
    if (!dsnMatch) return;

    const [, publicKey, host, projectId] = dsnMatch;
    const url = `https://${host}/api/${projectId}/envelope/`;

    const eventId = crypto.randomUUID().replace(/-/g, "");
    const timestamp = new Date().toISOString();
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const envelope = [
      JSON.stringify({ event_id: eventId, sent_at: timestamp, dsn: SENTRY_DSN }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({
        event_id: eventId,
        timestamp,
        platform: "node",
        level: "error",
        message: { formatted: message },
        exception: stack ? {
          values: [{
            type: error instanceof Error ? error.constructor.name : "Error",
            value: message,
            stacktrace: { frames: stack.split("\n").slice(1, 10).map((line) => ({ filename: line.trim() })) },
          }],
        } : undefined,
        extra: context,
        tags: { runtime: "nextjs", app: "zeiflow" },
      }),
    ].join("\n");

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=zeiflow/1.0, sentry_key=${publicKey}`,
      },
      body: envelope,
    });
  } catch {
    // エラー報告自体が失敗しても握りつぶす
  }
}
