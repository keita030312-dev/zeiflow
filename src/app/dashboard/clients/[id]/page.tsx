"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  FileText,
  Camera,
  CheckCircle,
  Clock,
  Building2,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Analytics {
  client: {
    id: string;
    name: string;
    code: string;
    clientType: string;
    taxType: string;
    fiscalYearStart: number;
    invoiceRegNumber: string | null;
  };
  stats: {
    totalJournals: number;
    confirmedCount: number;
    unconfirmedCount: number;
    totalReceipts: number;
    errorReceipts: number;
    withInvoice: number;
    withoutInvoice: number;
    invoiceRate: number;
    confirmRate: number;
    totalAmount: number;
  };
  monthlyData: { month: string; label: string; count: number; amount: number }[];
  topAccounts: { account: string; total: number; count: number }[];
  recentJournals: {
    id: string;
    date: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    description: string;
    isConfirmed: boolean;
    invoiceNumber: string | null;
  }[];
}

const taxTypeLabel: Record<string, string> = {
  STANDARD: "本則課税",
  SIMPLIFIED: "簡易課税",
  EXEMPT: "免税",
};

export default function ClientAnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clients/${id}/analytics`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#94A3B8]">読み込み中...</div>;
  }

  if (!data?.client) {
    return <div className="text-center py-20 text-[#64748B]">顧客が見つかりません</div>;
  }

  const { client, stats, monthlyData, topAccounts, recentJournals } = data;
  const maxMonthly = monthlyData.length > 0 ? Math.max(...monthlyData.map((d) => d.count), 1) : 1;
  const maxAccount = topAccounts.length > 0 ? Math.max(...topAccounts.map((a) => a.total), 1) : 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          onClick={() => router.push("/dashboard/clients")}
          variant="secondary"
          size="sm"
          className="bg-[#334155] text-[#94A3B8] hover:bg-[#475569] h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.08)]">
            {client.clientType === "CORPORATE" ? (
              <Building2 className="h-5 w-5 text-[#D4AF37]" />
            ) : (
              <User className="h-5 w-5 text-[#D4AF37]" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F1F5F9]">{client.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#64748B]">{client.code}</span>
              <Badge variant="secondary" className="bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border-none text-[10px]">
                {taxTypeLabel[client.taxType] || client.taxType}
              </Badge>
              <span className="text-[10px] text-[#64748B]">決算 {client.fiscalYearStart}月</span>
              {client.invoiceRegNumber && (
                <span className="text-[10px] text-[#22C55E]">{client.invoiceRegNumber}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-[10px] text-[#94A3B8]">累計仕訳</span>
            </div>
            <p className="text-xl font-bold text-[#F1F5F9]">{stats.totalJournals}</p>
            <p className="text-[10px] text-[#64748B] mt-1">¥{stats.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className={`glass-card border-[rgba(212,175,55,0.08)] ${stats.unconfirmedCount > 0 ? "border-amber-500/30" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] text-[#94A3B8]">未確定</span>
            </div>
            <p className={`text-xl font-bold ${stats.unconfirmedCount > 0 ? "text-amber-400" : "text-[#F1F5F9]"}`}>
              {stats.unconfirmedCount}
            </p>
            <p className="text-[10px] text-[#64748B] mt-1">確定率 {stats.confirmRate}%</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4 text-blue-400" />
              <span className="text-[10px] text-[#94A3B8]">レシート</span>
            </div>
            <p className="text-xl font-bold text-[#F1F5F9]">{stats.totalReceipts}</p>
            {stats.errorReceipts > 0 && (
              <p className="text-[10px] text-red-400 mt-1">エラー {stats.errorReceipts}件</p>
            )}
          </CardContent>
        </Card>

        <Card className={`glass-card border-[rgba(212,175,55,0.08)] ${stats.invoiceRate < 80 ? "border-amber-500/30" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] text-[#94A3B8]">インボイス率</span>
            </div>
            <p className={`text-xl font-bold ${stats.invoiceRate >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
              {stats.invoiceRate}%
            </p>
            <p className="text-[10px] text-[#64748B] mt-1">{stats.withInvoice}/{stats.totalJournals}件</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 月別推移 */}
        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardHeader>
            <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#D4AF37]" />
              月別仕訳推移（12ヶ月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthlyData.map((d) => (
                <div key={d.month} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#94A3B8] w-8 text-right">{d.label}</span>
                  <div className="flex-1 h-5 bg-[rgba(15,23,42,0.5)] rounded-md overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] rounded-md flex items-center px-1"
                      style={{ width: `${Math.max(3, (d.count / maxMonthly) * 100)}%` }}
                    >
                      {d.count > 0 && <span className="text-[9px] text-[#0F172A] font-semibold">{d.count}</span>}
                    </div>
                  </div>
                  <span className="text-[9px] text-[#64748B] w-16 text-right">¥{d.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 科目別 */}
        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardHeader>
            <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
              科目別支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topAccounts.length === 0 ? (
              <div className="text-center py-8 text-[#64748B] text-sm">データがありません</div>
            ) : (
              <div className="space-y-2">
                {topAccounts.map((a) => (
                  <div key={a.account} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#94A3B8] w-16 truncate">{a.account}</span>
                    <div className="flex-1 h-5 bg-[rgba(15,23,42,0.5)] rounded-md overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-md"
                        style={{ width: `${Math.max(3, (a.total / maxAccount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#F1F5F9] w-20 text-right">¥{a.total.toLocaleString()}</span>
                    <span className="text-[9px] text-[#64748B] w-8 text-right">{a.count}件</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近の仕訳 */}
      <Card className="glass-card border-[rgba(212,175,55,0.08)]">
        <CardHeader>
          <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#D4AF37]" />
            最近の仕訳
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentJournals.length === 0 ? (
            <div className="text-center py-8 text-[#64748B] text-sm">仕訳がありません</div>
          ) : (
            <div className="space-y-2">
              {recentJournals.map((j) => (
                <div key={j.id} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(15,23,42,0.3)] border border-[rgba(212,175,55,0.04)]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(j.date).toLocaleDateString("ja-JP")}
                      </span>
                      {j.isConfirmed ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">確定</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">未確定</span>
                      )}
                      {j.invoiceNumber ? (
                        <span className="text-[9px] text-[#64748B]">{j.invoiceNumber}</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">No Invoice</span>
                      )}
                    </div>
                    <p className="text-xs text-[#F1F5F9] truncate">{j.description}</p>
                    <p className="text-[10px] text-[#64748B]">{j.debitAccount} / {j.creditAccount}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#D4AF37] whitespace-nowrap">
                    ¥{j.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
