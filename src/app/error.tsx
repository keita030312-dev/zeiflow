"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0F172A",
        color: "#F1F5F9",
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          fontSize: "32px",
        }}
      >
        !
      </div>
      <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        エラーが発生しました
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "#94A3B8",
          marginBottom: "24px",
          maxWidth: "400px",
        }}
      >
        予期しないエラーが発生しました。問題が解決しない場合は、管理者にお問い合わせください。
      </p>
      <button
        onClick={() => unstable_retry()}
        style={{
          padding: "10px 24px",
          fontSize: "14px",
          fontWeight: 600,
          background: "linear-gradient(to right, #D4AF37, #B8962E)",
          color: "#0F172A",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        再読み込み
      </button>
    </div>
  );
}
