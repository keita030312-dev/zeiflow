"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Camera,
  BookOpen,
  FileDown,
  AlertTriangle,
  TrendingUp,
  Clock,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  clientCount: number;
  monthlyReceipts: number;
  unconfirmedCount: number;
  missingInvoiceCount: number;
  monthlyExports: number;
  totalJournals: number;
  errorReceipts: number;
  monthlyData: { month: string; count: number; amount: number }[];
  topAccounts: { account: string; total: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "登録顧客数", value: stats?.clientCount ?? 0, icon: Users, color: "from-[#D4AF37] to-[#B8962E]", warning: false },
    { label: "今月のレシート", value: stats?.monthlyReceipts ?? 0, icon: Camera, color: "from-blue-500 to-blue-600", warning: false },
    { label: "未確定仕訳", value: stats?.unconfirmedCount ?? 0, icon: BookOpen, color: "from-emerald-500 to-emerald-600", warning: (stats?.unconfirmedCount ?? 0) > 0 },
    { label: "インボイス未記入", value: stats?.missingInvoiceCount ?? 0, icon: AlertTriangle, color: "from-amber-500 to-amber-600", warning: (stats?.missingInvoiceCount ?? 0) > 0 },
    { label: "エラーレシート", value: stats?.errorReceipts ?? 0, icon: AlertCircle, color: "from-red-500 to-red-600", warning: (stats?.errorReceipts ?? 0) > 0 },
  ];

  // 月別グラフの最大値
  const maxCount = Math.max(...(stats?.monthlyData?.map((d) => d.count) || [1]));
  const maxAmount = Math.max(...(stats?.topAccounts?.map((a) => a.total) || [1]));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F1F5F9]">ダッシュボード</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          業務の概要と最新の状況を確認できます
          {stats?.totalJournals ? ` ・ 累計${stats.totalJournals.toLocaleString()}件の仕訳` : ""}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <Card key={card.label} className={`glass-card border-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all ${card.warning ? "border-amber-500/30" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${card.color}`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className={`text-xl font-bold font-[var(--font-inter)] ${card.warning ? "text-amber-400" : "text-[#F1F5F9]"}`}>
                {loading ? "-" : card.value}
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 月別仕訳推移 */}
        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardHeader>
            <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#D4AF37]" />
              月別仕訳件数（過去6ヶ月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !stats?.monthlyData ? (
              <div className="flex items-center justify-center py-12 text-[#64748B] text-sm">読み込み中...</div>
            ) : (
              <div className="space-y-3">
                {stats.monthlyData.map((d) => (
                  <div key={d.month} className="flex items-center gap-3">
                    <span className="text-xs text-[#94A3B8] w-10 text-right">{d.month}</span>
                    <div className="flex-1 h-6 bg-[rgba(15,23,42,0.5)] rounded-md overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] rounded-md transition-all duration-500 flex items-center px-2"
                        style={{ width: `${Math.max(5, (d.count / maxCount) * 100)}%` }}
                      >
                        {d.count > 0 && <span className="text-[10px] text-[#0F172A] font-semibold">{d.count}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#64748B] w-20 text-right">
                      ¥{d.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 科目別集計 */}
        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardHeader>
            <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
              科目別支出（直近3ヶ月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !stats?.topAccounts ? (
              <div className="flex items-center justify-center py-12 text-[#64748B] text-sm">読み込み中...</div>
            ) : stats.topAccounts.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[#64748B] text-sm">データがありません</div>
            ) : (
              <div className="space-y-3">
                {stats.topAccounts.map((a) => (
                  <div key={a.account} className="flex items-center gap-3">
                    <span className="text-xs text-[#94A3B8] w-20 truncate">{a.account}</span>
                    <div className="flex-1 h-5 bg-[rgba(15,23,42,0.5)] rounded-md overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-md transition-all duration-500"
                        style={{ width: `${Math.max(5, (a.total / maxAmount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#F1F5F9] w-24 text-right font-[var(--font-inter)]">
                      ¥{a.total.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="glass-card border-[rgba(212,175,55,0.08)]">
        <CardHeader>
          <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#D4AF37]" />
            クイックアクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/dashboard/receipts" className="flex items-center gap-3 rounded-lg border border-[rgba(212,175,55,0.1)] bg-[rgba(212,175,55,0.03)] px-4 py-3 text-sm text-[#F1F5F9] hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all">
              <Camera className="h-4 w-4 text-[#D4AF37]" />
              レシート撮影
            </Link>
            <Link href="/dashboard/clients" className="flex items-center gap-3 rounded-lg border border-[rgba(212,175,55,0.1)] bg-[rgba(212,175,55,0.03)] px-4 py-3 text-sm text-[#F1F5F9] hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all">
              <Users className="h-4 w-4 text-[#D4AF37]" />
              顧客管理
            </Link>
            <Link href="/dashboard/export" className="flex items-center gap-3 rounded-lg border border-[rgba(212,175,55,0.1)] bg-[rgba(212,175,55,0.03)] px-4 py-3 text-sm text-[#F1F5F9] hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all">
              <FileDown className="h-4 w-4 text-[#D4AF37]" />
              CSV出力
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
