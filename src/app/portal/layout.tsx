import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZeiFlow | クライアントポータル",
  description: "レシートをアップロードして仕訳を確認",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
      {children}
    </div>
  );
}
