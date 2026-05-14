"use client";

export function PrintButton() {
  return (
    <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
      <button
        onClick={() => { window.close(); if (!window.closed) history.back(); }}
        style={{
          padding: "10px 24px",
          fontSize: "14px",
          fontWeight: 600,
          background: "#64748B",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        ← 戻る
      </button>
      <button
        onClick={() => window.print()}
        style={{
          padding: "10px 32px",
          fontSize: "14px",
          fontWeight: 600,
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        印刷する
      </button>
    </div>
  );
}
