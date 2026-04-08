"use client";

import { useState } from "react";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (!token) {
      setError("無効なリセットリンクです");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href =
          "/login?error=" +
          encodeURIComponent(
            "パスワードをリセットしました。新しいパスワードでログインしてください"
          );
      } else {
        setError(data.error || "リセットに失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
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
            <p className="text-center text-red-400 mb-4">
              無効なリセットリンクです。
            </p>
            <p className="text-center text-[#94A3B8] text-sm">
              リセットリンクが正しいか確認してください。
            </p>
            <div className="mt-6 text-center">
              <a
                href="/login"
                className="text-[#D4AF37] hover:text-[#E8D48B] text-sm transition-colors"
              >
                ログインに戻る
              </a>
            </div>
          </div>
        </div>
      </div>
    );
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
            パスワードリセット
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[#94A3B8] text-sm">
                新しいパスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#D4AF37] focus:outline-none text-base"
                  placeholder="8文字以上（大文字・小文字・数字）"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-[#475569]">
                大文字・小文字・数字を含む8文字以上
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[#94A3B8] text-sm">
                パスワード（確認）
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 py-2.5 rounded-lg bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#D4AF37] focus:outline-none text-base"
                  placeholder="パスワードを再入力"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold text-base cursor-pointer hover:from-[#E8D48B] hover:to-[#D4AF37] transition-all duration-300 shadow-lg shadow-[rgba(212,175,55,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "処理中..." : "パスワードを変更"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-[#D4AF37] hover:text-[#E8D48B] text-sm transition-colors"
            >
              ログインに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
