"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  // ダッシュボードトップでは表示しない
  if (pathname === "/dashboard") return null;

  return (
    <>
      {/* モバイル: ヘッダーの下に固定 */}
      <button
        onClick={() => router.push("/dashboard")}
        className="md:hidden fixed top-3 right-14 z-[60] flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgba(30,41,59,0.95)] border border-[rgba(212,175,55,0.2)] text-[#94A3B8] hover:text-[#D4AF37] text-[11px] shadow-lg"
        aria-label="ダッシュボードに戻る"
      >
        <ArrowLeft className="h-3 w-3" />
        トップ
      </button>
      {/* PC: 右上に固定 */}
      <button
        onClick={() => router.push("/dashboard")}
        className="hidden md:flex fixed top-4 right-4 z-[9999] items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(30,41,59,0.95)] border border-[rgba(212,175,55,0.2)] text-[#94A3B8] hover:text-[#D4AF37] hover:border-[rgba(212,175,55,0.3)] transition-all text-xs shadow-lg"
        aria-label="ダッシュボードに戻る"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        トップ
      </button>
    </>
  );
}
