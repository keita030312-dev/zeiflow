"use client";

import { Shield, Camera, FileDown, Users, ArrowRight, Brain, Link2, BarChart3, CheckCircle, Zap } from "lucide-react";
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
      <header className="relative z-10 flex items-center justify-between px-6 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8962E]">
            <Shield className="h-5 w-5 text-[#0F172A]" />
          </div>
          <span className="text-xl font-bold text-gold-gradient">ZeiFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/register">
            <Button variant="secondary" className="bg-transparent text-[#94A3B8] hover:text-[#F1F5F9] text-sm hidden sm:inline-flex">
              新規登録
            </Button>
          </a>
          <a href="/login">
            <Button variant="secondary" className="bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)] hover:bg-[rgba(212,175,55,0.15)]">
              ログイン
            </Button>
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 pt-16 md:pt-20 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.05)] px-4 py-1.5 text-xs text-[#D4AF37] mb-8">
            <Shield className="h-3 w-3" />
            税理士事務所専用 AI仕訳システム
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-[#F1F5F9] leading-tight mb-6">
            レシート撮影から
            <br />
            <span className="text-gold-gradient">AI自動仕訳</span>まで
            <br />
            ワンストップで
          </h1>

          <p className="text-base md:text-lg text-[#94A3B8] mb-10 max-w-xl mx-auto leading-relaxed">
            AIがレシートを自動読み取り・仕訳。顧問先も直接レシートを送信可能。
            使うほどAIが学習し、事務所独自の仕訳ルールに最適化されます。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/register">
              <Button className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold px-8 py-6 text-base shadow-lg shadow-[rgba(212,175,55,0.15)] hover:from-[#E8D48B] hover:to-[#D4AF37]">
                無料で始める
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </a>
            <a href="/login">
              <Button variant="secondary" className="bg-transparent text-[#94A3B8] border border-[rgba(255,255,255,0.1)] hover:text-[#F1F5F9] px-8 py-6 text-base">
                ログイン
              </Button>
            </a>
          </div>
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          {[
            {
              icon: Camera,
              title: "AI自動仕訳",
              description: "レシートを撮影するだけでAIが店舗名・金額・登録番号を読み取り、適切な勘定科目に自動分類。",
            },
            {
              icon: Link2,
              title: "顧問先ポータル",
              description: "専用リンクを発行するだけ。顧問先がスマホからレシートを直接送信。ログイン不要で簡単。",
            },
            {
              icon: Brain,
              title: "学習するAI",
              description: "仕訳を確定するたびにAIが学習。事務所や顧問先ごとの仕訳ルールに自動で最適化されます。",
            },
          ].map((f) => (
            <div key={f.title} className="glass-card rounded-xl p-6 hover:border-[rgba(212,175,55,0.2)] transition-all duration-300">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8962E] mb-4">
                <f.icon className="h-5 w-5 text-[#0F172A]" />
              </div>
              <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">{f.title}</h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] mb-4">使い方は3ステップ</h2>
          <p className="text-[#94A3B8] mb-12">面倒な初期設定は不要。すぐに始められます</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "撮影・送信", desc: "スマホでレシートを撮影。複数枚の一括アップロードも可能" },
              { step: "2", title: "AI自動仕訳", desc: "AIが瞬時に読み取り。金額・日付・登録番号・勘定科目を自動判定" },
              { step: "3", title: "CSV出力", desc: "弥生・MF・freee形式で出力。そのまま会計ソフトにインポート" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-bold text-lg mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-[#F1F5F9] mb-2">{s.title}</h3>
                <p className="text-sm text-[#94A3B8]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* All Features */}
        <div className="mt-24">
          <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] mb-12 text-center">全ての機能</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Camera, title: "レシートOCR", desc: "AI画像認識で高精度読み取り" },
              { icon: CheckCircle, title: "インボイス対応", desc: "登録番号T+13桁を自動抽出" },
              { icon: Users, title: "顧客別管理", desc: "顧問先ごとに仕訳・レシートを管理" },
              { icon: Link2, title: "クライアントポータル", desc: "顧問先が直接レシートを送信" },
              { icon: Brain, title: "仕訳ナレッジ", desc: "PDF/CSVで仕訳ルールを登録" },
              { icon: Zap, title: "AI学習", desc: "確定仕訳から自動で学習・最適化" },
              { icon: FileDown, title: "CSV出力", desc: "弥生・MF・freee形式に対応" },
              { icon: BarChart3, title: "分析ダッシュボード", desc: "月別推移・科目別集計・顧客別分析" },
              { icon: Shield, title: "セキュリティ", desc: "2FA・監査ログ・レート制限" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(30,41,59,0.3)] border border-[rgba(212,175,55,0.06)]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.08)]">
                  <f.icon className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F1F5F9]">{f.title}</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center">
          <div className="glass-card rounded-2xl p-8 md:p-12 max-w-2xl mx-auto border-[rgba(212,175,55,0.15)]">
            <h2 className="text-2xl font-bold text-[#F1F5F9] mb-4">今すぐ始めましょう</h2>
            <p className="text-[#94A3B8] mb-8">アカウント登録は無料。すぐに使い始められます。</p>
            <a href="/register">
              <Button className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold px-8 py-6 text-base shadow-lg shadow-[rgba(212,175,55,0.15)] hover:from-[#E8D48B] hover:to-[#D4AF37]">
                無料で始める
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(212,175,55,0.06)] py-6 px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#475569] gap-4">
          <span>ZeiFlow - 税理士事務所向けAI仕訳管理システム</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-[#D4AF37] transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-[#D4AF37] transition-colors">プライバシーポリシー</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
