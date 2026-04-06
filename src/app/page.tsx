"use client";

import { Shield, Camera, FileDown, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37] rounded-full opacity-[0.02] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-blue-500 rounded-full opacity-[0.015] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8962E]">
            <Shield className="h-5 w-5 text-[#0F172A]" />
          </div>
          <span className="text-xl font-bold text-gold-gradient">ZeiFlow</span>
        </div>
        <a href="/login">
          <Button
            variant="secondary"
            className="bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)] hover:bg-[rgba(212,175,55,0.15)]"
          >
            ログイン
          </Button>
        </a>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.05)] px-4 py-1.5 text-xs text-[#D4AF37] mb-8">
            <Shield className="h-3 w-3" />
            税理士事務所専用 セキュアシステム
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-[#F1F5F9] leading-tight mb-6">
            レシート撮影から
            <br />
            <span className="text-gold-gradient">会計ソフト連携</span>まで
            <br />
            ワンストップで
          </h1>

          <p className="text-lg text-[#94A3B8] mb-10 max-w-xl mx-auto leading-relaxed">
            AIがレシートを自動読み取り・仕訳分類。
            弥生会計・マネーフォワード・freee対応CSVを出力。
          </p>

          <div className="flex items-center justify-center gap-4">
            <a href="/login">
              <Button className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold px-8 py-6 text-base shadow-lg shadow-[rgba(212,175,55,0.15)] hover:from-[#E8D48B] hover:to-[#D4AF37]">
                無料で始める
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
          {[
            {
              icon: Camera,
              title: "スマホで撮影",
              description:
                "レシート・領収書をカメラで撮影するだけ。AIが自動で読み取り・仕訳分類します。",
            },
            {
              icon: Users,
              title: "顧客別管理",
              description:
                "顧客ごとに月次・半期・年次で仕訳を管理。決算期に合わせた柔軟な対応が可能。",
            },
            {
              icon: FileDown,
              title: "CSV出力",
              description:
                "弥生会計・マネーフォワード・freeeの各フォーマットに対応したCSVを出力。",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass-card rounded-xl p-6 hover:border-[rgba(212,175,55,0.2)] transition-all duration-300"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8962E] mb-4">
                <feature.icon className="h-5 w-5 text-[#0F172A]" />
              </div>
              <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(212,175,55,0.06)] py-6 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[#475569]">
          <span>ZeiFlow - 税理士事務所向け仕訳管理システム</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-[#D4AF37] transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-[#D4AF37] transition-colors">プライバシーポリシー</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
