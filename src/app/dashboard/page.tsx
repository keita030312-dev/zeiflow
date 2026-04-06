"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Camera,
  BookOpen,
  FileDown,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  clientCount: number;
  monthlyReceipts: number;
  unconfirmedCount: number;
  missingInvoiceCount: number;
  monthlyExports: number;
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
    {
      label: "登録顧客数",
      value: stats?.clientCount ?? 0,
      icon: Users,
      color: "from-[#D4AF37] to-[#B8962E]",
      warning: false,
    },
    {
      label: "今月のレシート",
      value: stats?.monthlyReceipts ?? 0,
      icon: Camera,
      color: "from-blue-500 to-blue-600",
      warning: false,
    },
    {
      label: "未確定仕訳",
      value: stats?.unconfirmedCount ?? 0,
      icon: BookOpen,
      color: "from-emerald-500 to-emerald-600",
      warning: false,
    },
    {
      label: "インボイス未記入",
      value: stats?.missingInvoiceCount ?? 0,
      icon: AlertTriangle,
      color: "from-amber-500 to-amber-600",
      warning: (stats?.missingInvoiceCount ?? 0) > 0,
    },
    {
      label: "今月のCSV出力",
      value: stats?.monthlyExports ?? 0,
      icon: FileDown,
      color: "from-purple-500 to-purple-600",
      warning: false,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F1F5F9]">
          ダッシュボード
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          業務の概要と最新の状況を確認できます
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.label}>
            <Card className={`glass-card border-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all duration-300 ${card.warning ? "border-amber-500/30" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color}`}
                  >
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className={`text-2xl font-bold font-[var(--font-inter)] ${card.warning ? "text-amber-400" : "text-[#F1F5F9]"}`}>
                  {loading ? "-" : card.value}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">{card.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#D4AF37]" />
                最近のアクティビティ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-[#64748B] text-sm">
                まだアクティビティはありません
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href="/dashboard/receipts"
                className="flex items-center gap-3 rounded-lg border border-[rgba(212,175,55,0.1)] bg-[rgba(212,175,55,0.03)] px-4 py-3 text-sm text-[#F1F5F9] hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all"
              >
                <Camera className="h-4 w-4 text-[#D4AF37]" />
                レシートを撮影・アップロード
              </a>
              <a
                href="/dashboard/clients"
                className="flex items-center gap-3 rounded-lg border border-[rgba(212,175,55,0.1)] bg-[rgba(212,175,55,0.03)] px-4 py-3 text-sm text-[#F1F5F9] hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all"
              >
                <Users className="h-4 w-4 text-[#D4AF37]" />
                新規顧客を登録
              </a>
              <a
                href="/dashboard/export"
                className="flex items-center gap-3 rounded-lg border border-[rgba(212,175,55,0.1)] bg-[rgba(212,175,55,0.03)] px-4 py-3 text-sm text-[#F1F5F9] hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all"
              >
                <FileDown className="h-4 w-4 text-[#D4AF37]" />
                CSV出力
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
