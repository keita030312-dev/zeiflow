"use client";

import { useEffect } from "react";

/**
 * Next.js の最終フォールバック。RootError でも捕捉できなかった場合の安全網。
 * 完全に独立した HTML を返す必要があるため、最小限の構成。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // クライアント側からエラー報告APIに通知(失敗しても無視)
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 2000),
        url: typeof window !== "undefined" ? window.location.href : "",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0F172A",
          color: "#F1F5F9",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              fontSize: 32,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>システムエラーが発生しました</h1>
          <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 24 }}>
            ご迷惑をおかけしております。エラーは自動で開発者に通知されます。
            {error.digest && (
              <>
                <br />
                <span style={{ fontSize: 11, color: "#64748B" }}>
                  エラーID: {error.digest}
                </span>
              </>
            )}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              background: "linear-gradient(to right,#D4AF37,#B8962E)",
              color: "#0F172A",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            もう一度試す
          </button>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              background: "transparent",
              color: "#94A3B8",
              border: "1px solid #334155",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ダッシュボードへ
          </button>
        </div>
      </body>
    </html>
  );
}
