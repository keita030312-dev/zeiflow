import { Shield, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
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

          <p className="text-[#94A3B8] text-sm text-center mb-6 leading-relaxed">
            パスワードをお忘れの場合は管理者にお問い合わせください
          </p>

          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)]">
            <Mail className="h-4 w-4 text-[#D4AF37] flex-shrink-0" />
            <a
              href="mailto:keita.030312@gmail.com"
              className="text-[#D4AF37] hover:text-[#E8D48B] text-sm transition-colors break-all"
            >
              keita.030312@gmail.com
            </a>
          </div>

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

        <div className="text-center mt-6">
          <p className="text-xs text-[#475569]">
            管理者がパスワードリセットリンクを発行します
          </p>
        </div>
      </div>
    </div>
  );
}
