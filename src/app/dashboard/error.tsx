"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-[#F1F5F9] mb-2">
        エラーが発生しました
      </h2>
      <p className="text-sm text-[#94A3B8] mb-6 max-w-md">
        予期しないエラーが発生しました。問題が解決しない場合は、管理者にお問い合わせください。
      </p>
      <button
        onClick={() => unstable_retry()}
        className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="h-4 w-4" />
        再読み込み
      </button>
    </div>
  );
}
