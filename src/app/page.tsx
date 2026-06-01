"use client";

import { useState } from "react";
import { Shield, Camera, FileDown, Users, ArrowRight, Brain, Link2, BarChart3, CheckCircle, Zap, GraduationCap, Code2, MessageCircle, Lightbulb, TrendingUp, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TOPICS = [
  "ZeiFlow の導入について",
  "AI研修・トレーニング",
  "AIアプリ開発支援",
  "料金・プランの確認",
  "その他・まず話を聞きたい",
];

function ContactForm() {
  const [form, setForm] = useState({ firmName: "", name: "", email: "", phone: "", topic: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "送信に失敗しました"); setStatus("error"); return; }
      setStatus("done");
    } catch {
      setErrorMsg("通信エラーが発生しました。再度お試しください。");
      setStatus("error");
    }
  };

  const inputCls = "w-full rounded-lg bg-[rgba(15,23,42,0.6)] border border-[rgba(212,175,55,0.15)] text-[#F1F5F9] text-sm px-4 py-3 placeholder-[#475569] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors";

  if (status === "done") {
    return (
      <div className="text-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(212,175,55,0.1)] mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-[#D4AF37]" />
        </div>
        <h3 className="text-xl font-bold text-[#F1F5F9] mb-2">お申し込みを受け付けました</h3>
        <p className="text-sm text-[#94A3B8]">1営業日以内にご連絡いたします。<br />確認メールをお送りしましたのでご確認ください。</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1.5">事務所名 <span className="text-red-400">*</span></label>
          <input className={inputCls} placeholder="〇〇税理士事務所" value={form.firmName} onChange={set("firmName")} required />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1.5">お名前 <span className="text-red-400">*</span></label>
          <input className={inputCls} placeholder="山田 太郎" value={form.name} onChange={set("name")} required />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1.5">メールアドレス <span className="text-red-400">*</span></label>
          <input type="email" className={inputCls} placeholder="your@email.com" value={form.email} onChange={set("email")} required />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1.5">電話番号 <span className="text-[#475569] text-xs">(任意)</span></label>
          <input className={inputCls} placeholder="03-0000-0000" value={form.phone} onChange={set("phone")} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[#94A3B8] mb-1.5">ご相談の内容</label>
        <select className={inputCls} value={form.topic} onChange={set("topic")}>
          <option value="">選択してください（任意）</option>
          {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-[#94A3B8] mb-1.5">メッセージ <span className="text-[#475569] text-xs">(任意)</span></label>
        <textarea className={`${inputCls} resize-none h-28`} placeholder="現在の課題や聞きたいことをご自由にどうぞ" value={form.message} onChange={set("message")} />
      </div>
      {status === "error" && <p className="text-sm text-red-400">{errorMsg}</p>}
      <Button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold py-6 hover:from-[#E8D48B] hover:to-[#D4AF37] disabled:opacity-60"
      >
        {status === "sending" ? "送信中..." : (
          <><Send className="h-4 w-4 mr-2" />無料相談を申し込む</>
        )}
      </Button>
      <p className="text-xs text-[#475569] text-center">送信後、1営業日以内にご連絡します。押し売りは一切しません。</p>
    </form>
  );
}

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
        <nav className="hidden md:flex items-center gap-6 text-sm text-[#94A3B8]">
          <a href="#features" className="hover:text-[#D4AF37] transition-colors">機能</a>
          <a href="#pricing" className="hover:text-[#D4AF37] transition-colors">料金</a>
          <a href="#services" className="hover:text-[#D4AF37] transition-colors">その他サービス</a>
          <a href="#faq" className="hover:text-[#D4AF37] transition-colors">よくある質問</a>
          <a href="#contact" className="hover:text-[#D4AF37] transition-colors">無料相談</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/login">
            <Button variant="secondary" className="bg-transparent text-[#94A3B8] hover:text-[#F1F5F9] text-sm hidden sm:inline-flex">
              ログイン
            </Button>
          </a>
          <a href="/register">
            <Button variant="secondary" className="bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)] hover:bg-[rgba(212,175,55,0.15)] text-sm">
              無料面談を予約
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

        {/* Trust bar */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { icon: Shield, label: "税理士業界特化" },
            { icon: Brain, label: "AI × 会計の両方わかる" },
            { icon: Clock, label: "初回面談 無料・60分" },
            { icon: CheckCircle, label: "導入サポート込み" },
            { icon: TrendingUp, label: "使うほど精度が上がる" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-[#64748B]">
              <Icon className="h-4 w-4 text-[#D4AF37]" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Pain points */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="glass-card rounded-2xl p-8 md:p-10">
            <h2 className="text-xl md:text-2xl font-bold text-[#F1F5F9] mb-8 text-center">こんな課題、ありませんか？</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "レシートの手入力に毎月何時間もかかっている",
                "顧問先から紙や写真でバラバラに届いて整理が大変",
                "インボイス対応で登録番号の確認が増えた",
                "スタッフが仕訳ルールを覚えられず都度確認が発生する",
              ].map((pain) => (
                <div key={pain} className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.1)]">
                  <span className="text-red-400 text-lg leading-none mt-0.5">✕</span>
                  <p className="text-sm text-[#94A3B8]">{pain}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-6 justify-center text-[#D4AF37]">
              <ArrowRight className="h-5 w-5" />
              <span className="text-sm font-semibold">ZeiFlowがまるごと解決します</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Main Features */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
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

        {/* Pricing */}
        <div id="pricing" className="mt-24">
          <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] mb-4 text-center">料金プラン</h2>
          <p className="text-[#94A3B8] mb-12 text-center">まずは無料面談で、事務所の課題をお聞かせください</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <div className="glass-card rounded-xl p-8 flex flex-col">
              <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-widest mb-3">まずはここから</div>
              <div className="text-lg font-bold text-[#F1F5F9] mb-1">初回無料面談</div>
              <div className="text-3xl font-bold text-[#D4AF37] mt-2 mb-1">¥0</div>
              <div className="text-xs text-[#64748B] mb-6">60分・オンライン</div>
              <ul className="space-y-3 text-sm text-[#94A3B8] flex-1">
                {["現状の課題ヒアリング", "ZeiFlow デモ操作", "導入イメージのご提案", "見積もりご提示"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/register" className="mt-8 block">
                <Button className="w-full bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.2)]">
                  無料面談を予約
                </Button>
              </a>
            </div>

            {/* Advisory */}
            <div className="glass-card rounded-xl p-8 flex flex-col border-[rgba(212,175,55,0.25)]">
              <div className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-3">スタンダード</div>
              <div className="text-lg font-bold text-[#F1F5F9] mb-1">顧問プラン</div>
              <div className="flex items-end gap-1 mt-2 mb-1">
                <span className="text-3xl font-bold text-[#D4AF37]">¥20,000</span>
                <span className="text-sm text-[#64748B] mb-1">/月〜</span>
              </div>
              <div className="text-xs text-[#64748B] mb-6">税抜・顧問先規模により変動</div>
              <ul className="space-y-3 text-sm text-[#94A3B8] flex-1">
                {["ZeiFlow 全機能利用", "顧問先ポータル発行", "仕訳ナレッジ設定支援", "メール・チャットサポート", "月次利用レポート"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/register" className="mt-8 block">
                <Button className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold hover:from-[#E8D48B] hover:to-[#D4AF37]">
                  このプランで始める
                </Button>
              </a>
            </div>

            {/* Full support */}
            <div className="glass-card rounded-xl p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] text-xs font-bold px-3 py-1 rounded-bl-lg">
                おすすめ
              </div>
              <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-widest mb-3">フル対応</div>
              <div className="text-lg font-bold text-[#F1F5F9] mb-1">伴走支援プラン</div>
              <div className="flex items-end gap-1 mt-2 mb-1">
                <span className="text-3xl font-bold text-[#D4AF37]">¥300,000</span>
                <span className="text-sm text-[#64748B] mb-1">/月〜</span>
              </div>
              <div className="text-xs text-[#64748B] mb-6">税抜・業務量により変動</div>
              <ul className="space-y-3 text-sm text-[#94A3B8] flex-1">
                {["顧問プランの全内容", "導入・設定の代行", "スタッフ向け操作研修", "カスタム仕訳ルール構築", "専任担当による月次レビュー", "優先サポート対応"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/register" className="mt-8 block">
                <Button className="w-full bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.2)]">
                  詳細を相談する
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Other Services */}
        <div id="services" className="mt-24">
          <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] mb-4 text-center">その他のサービス</h2>
          <p className="text-[#94A3B8] mb-12 text-center">ZeiFlow以外にも、AI活用に関することなら何でもご相談ください</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="glass-card rounded-xl p-8 flex flex-col gap-4 hover:border-[rgba(212,175,55,0.2)] transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E]">
                <GraduationCap className="h-6 w-6 text-[#0F172A]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F1F5F9] mb-2">AI研修・トレーニング</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
                  ChatGPT・Claude・生成AIの業務活用研修を提供。スタッフ向け入門から、管理職・経営者向けの活用戦略まで対応します。
                </p>
                <ul className="space-y-2 text-xs text-[#64748B]">
                  {["社内研修（オンライン／対面）", "業種別ユースケース演習", "プロンプト設計ハンズオン", "導入後フォロー研修"].map(i => (
                    <li key={i} className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-[#D4AF37] shrink-0" />{i}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="glass-card rounded-xl p-8 flex flex-col gap-4 hover:border-[rgba(212,175,55,0.2)] transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E]">
                <Code2 className="h-6 w-6 text-[#0F172A]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F1F5F9] mb-2">AIアプリ開発支援</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
                  業務特化のAIツール・社内チャットbot・自動化システムの企画から開発・運用まで伴走します。
                </p>
                <ul className="space-y-2 text-xs text-[#64748B]">
                  {["要件定義・PoC支援", "Claude / GPT API 実装", "社内業務自動化ツール", "既存システムへのAI組み込み"].map(i => (
                    <li key={i} className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-[#D4AF37] shrink-0" />{i}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="glass-card rounded-xl p-8 flex flex-col gap-4 hover:border-[rgba(212,175,55,0.2)] transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E]">
                <MessageCircle className="h-6 w-6 text-[#0F172A]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F1F5F9] mb-2">AI活用なんでも相談</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
                  「うちの業務にAIを使えるか分からない」そんな段階からご相談OK。現状整理から最適な活用プランをご提案します。
                </p>
                <ul className="space-y-2 text-xs text-[#64748B]">
                  {["AI活用可能性の診断", "ツール選定アドバイス", "費用対効果のシミュレーション", "競合事務所との差別化提案"].map(i => (
                    <li key={i} className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-[#D4AF37] shrink-0" />{i}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-[#64748B] mt-8">
            すべて初回相談無料。まずはお気軽にどうぞ。
          </p>
        </div>

        {/* Why us */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] mb-4 text-center">なぜ私たちに頼むのか</h2>
          <p className="text-[#94A3B8] mb-12 text-center">AIと会計、両方わかるから「使えるAI」を作れる</p>
          <div className="glass-card rounded-2xl p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              {[
                {
                  icon: Brain,
                  title: "AI × 会計の実務両方わかる",
                  body: "Claude・GPT等の最新AIを業務に落とし込む技術力と、税理士事務所の現場課題を両方理解しています。「AIに詳しい人」でも「会計に詳しい人」でもなく、その掛け算が強みです。",
                },
                {
                  icon: Lightbulb,
                  title: "「使えるかわからない」から一緒に考える",
                  body: "すでにやることが決まっているお客様だけでなく、「AIをどう使えばいいか整理したい」という段階からご相談を受け付けています。押し売りは一切しません。",
                },
                {
                  icon: TrendingUp,
                  title: "導入で終わらず、定着まで伴走",
                  body: "ツールを渡して終わりではなく、スタッフへの浸透・運用定着・改善提案まで継続してサポートします。現場に根付かないAI導入に意味はないと考えているからです。",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.1)]">
                    <Icon className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F5F9] mb-1">{title}</h3>
                    <p className="text-sm text-[#94A3B8] leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-widest mb-1">安心して相談できる理由</p>
              {[
                {
                  title: "押し売りは一切しません",
                  body: "面談で合わないと感じたら、その場で断っていただいてOKです。無理なクロージングはしません。",
                },
                {
                  title: "料金は事前に明示します",
                  body: "「気づいたら高額請求」はありません。プランと費用は面談時に書面でご提示します。",
                },
                {
                  title: "会計データは厳重に管理",
                  body: "テナント分離・2FA・監査ログを標準実装。他事務所のデータが混在する構造はありません。",
                },
                {
                  title: "まず話すだけでも歓迎",
                  body: "「AIが何かも分からない」「本当に使えるか疑問」そういう段階からお声がけください。",
                },
              ].map(({ title, body }) => (
                <div key={title} className="rounded-lg bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.1)] px-5 py-4">
                  <p className="text-sm font-semibold text-[#F1F5F9] mb-1">{title}</p>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">{body}</p>
                </div>
              ))}
              <a href="/register" className="mt-2">
                <Button className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold hover:from-[#E8D48B] hover:to-[#D4AF37]">
                  無料面談を予約する
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] mb-12 text-center">よくある質問</h2>
          <div className="space-y-4">
            {[
              {
                q: "導入までどのくらいかかりますか？",
                a: "初回面談から最短1週間で利用開始できます。伴走支援プランでは設定・研修まで弊社が代行します。",
              },
              {
                q: "顧問先はアプリのインストールが必要ですか？",
                a: "不要です。発行した専用URLをLINEやメールで送るだけ。顧問先はブラウザからレシートを送信できます。",
              },
              {
                q: "弥生・freee・マネーフォワードに対応していますか？",
                a: "はい。各ソフトの取込フォーマット（CSV）で出力できます。そのままインポートして利用できます。",
              },
              {
                q: "OCRの精度はどのくらいですか？",
                a: "一般的なレシート・領収書では金額・日付の読取精度90%以上を目標にチューニングしています。使うほどAIが事務所の仕訳ルールを学習し精度が向上します。",
              },
              {
                q: "セキュリティ面は安全ですか？",
                a: "2要素認証・テナント分離・監査ログ・通信暗号化（TLS）を標準実装しています。顧問先データが他事務所に漏れる構造はありません。",
              },
              {
                q: "途中でプランを変更できますか？",
                a: "可能です。顧問プラン↔伴走支援プランの変更は月単位で対応します。詳細は面談にてご相談ください。",
              },
            ].map((faq) => (
              <details key={faq.q} className="glass-card rounded-xl group">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none text-sm font-semibold text-[#F1F5F9] hover:text-[#D4AF37] transition-colors">
                  {faq.q}
                  <span className="ml-4 text-[#D4AF37] text-lg leading-none group-open:rotate-45 transition-transform duration-200 inline-block">+</span>
                </summary>
                <p className="px-6 pb-5 text-sm text-[#94A3B8] leading-relaxed border-t border-[rgba(212,175,55,0.06)] pt-4">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div id="contact" className="mt-24 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] mb-4 text-center">無料相談フォーム</h2>
          <p className="text-[#94A3B8] mb-10 text-center">
            初回相談は無料・オンライン。<br className="hidden sm:block" />
            「まだ検討段階」でも大歓迎です。1営業日以内に返信します。
          </p>
          <div className="glass-card rounded-2xl p-8 md:p-10 border-[rgba(212,175,55,0.15)]">
            <ContactForm />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#475569]">
            <Shield className="h-3 w-3 text-[#D4AF37]" />
            入力内容は暗号化して送信されます。第三者への提供は一切しません。
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(212,175,55,0.06)] pt-12 pb-8 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8962E]">
                  <Shield className="h-4 w-4 text-[#0F172A]" />
                </div>
                <span className="font-bold text-[#F1F5F9]">ZeiFlow</span>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                税理士事務所向けAI仕訳管理システム。<br />
                AI × 会計の専門家が伴走します。
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#94A3B8] mb-3 uppercase tracking-widest">サービス</p>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li><a href="#features" className="hover:text-[#D4AF37] transition-colors">ZeiFlow 機能</a></li>
                <li><a href="#pricing" className="hover:text-[#D4AF37] transition-colors">料金プラン</a></li>
                <li><a href="#services" className="hover:text-[#D4AF37] transition-colors">AI研修・開発支援</a></li>
                <li><a href="#faq" className="hover:text-[#D4AF37] transition-colors">よくある質問</a></li>
                <li><a href="#contact" className="hover:text-[#D4AF37] transition-colors">無料相談フォーム</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#94A3B8] mb-3 uppercase tracking-widest">お問い合わせ</p>
              <p className="text-xs text-[#475569] mb-2">初回面談・ご相談はこちら</p>
              <a
                href="mailto:keita.030312@gmail.com"
                className="text-sm text-[#D4AF37] hover:text-[#E8D48B] transition-colors font-medium"
              >
                keita.030312@gmail.com
              </a>
              <p className="text-xs text-[#475569] mt-3">平日 10:00〜19:00 対応</p>
            </div>
          </div>
          <div className="border-t border-[rgba(212,175,55,0.06)] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#475569] gap-4">
            <span>© 2026 ZeiFlow. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-[#D4AF37] transition-colors">利用規約</Link>
              <Link href="/privacy" className="hover:text-[#D4AF37] transition-colors">プライバシーポリシー</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
