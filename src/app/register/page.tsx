"use client";

import { useState } from "react";
import { Shield, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = "/login";
      } else {
        setError(data.error || "登録に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
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

        <Card className="glass-card border-[rgba(212,175,55,0.12)]">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold text-[#F1F5F9] mb-6 text-center">
              新規アカウント登録
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form action="#" onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-sm">お名前</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                    placeholder="山田 太郎"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-sm">メールアドレス</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8] text-sm">パスワード</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
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
                <Label className="text-[#94A3B8] text-sm">パスワード（確認）</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                    placeholder="パスワードを再入力"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold hover:from-[#E8D48B] hover:to-[#D4AF37] transition-all duration-300 shadow-lg shadow-[rgba(212,175,55,0.15)]"
              >
                {loading ? "登録中..." : "アカウント作成"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#64748B]">
                既にアカウントをお持ちの方は
                <a
                  href="/login"
                  className="text-[#D4AF37] hover:text-[#E8D48B] ml-1 transition-colors"
                >
                  ログイン
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#475569] mt-6">
          セキュアな通信で保護されています
        </p>
      </div>
    </div>
  );
}
