"use client";

import { useState } from "react";
import { Shield, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error);
      }
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37] rounded-full opacity-[0.02] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full opacity-[0.02] blur-3xl" />
      </div>

      <div className="w-full max-w-md px-4 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] mb-4 shadow-lg shadow-[rgba(212,175,55,0.2)]">
            <Shield className="h-8 w-8 text-[#0F172A]" />
          </div>
          <h1 className="text-2xl font-bold text-gold-gradient">ZeiFlow</h1>
          <p className="text-sm text-[#94A3B8] mt-1 tracking-wider">
            TAX MANAGEMENT SYSTEM
          </p>
        </div>

        <div className="bg-[rgba(30,41,59,0.8)] rounded-xl p-8 border border-[rgba(212,175,55,0.12)]">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-6 text-center">
            パスワードをお忘れの方
          </h2>

          {sent ? (
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </div>
              <p className="text-[#F1F5F9] font-medium mb-2">メールを送信しました</p>
              <p className="text-[#94A3B8] text-sm leading-relaxed mb-6">
                {email} にパスワードリセット用のリンクを送信しました。メールをご確認ください。
              </p>
              <p className="text-[#64748B] text-xs">
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </p>
            </div>
          ) : (
            <>
              <p className="text-[#94A3B8] text-sm text-center mb-6 leading-relaxed">
                登録したメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-[#94A3B8] block mb-1.5">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#D4AF37] focus:outline-none transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    "リセットリンクを送信"
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 text-[#D4AF37] hover:text-[#E8D48B] text-sm transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              ログインに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
