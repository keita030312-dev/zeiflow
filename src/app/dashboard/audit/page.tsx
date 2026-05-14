"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN: { label: "ログイン", color: "bg-blue-500/10 text-blue-400" },
  LOGIN_FAILED: { label: "ログイン失敗", color: "bg-red-500/10 text-red-400" },
  REGISTER: { label: "ユーザー登録", color: "bg-green-500/10 text-green-400" },
  LOGOUT: { label: "ログアウト", color: "bg-gray-500/10 text-gray-400" },
  PORTAL_RECEIPT_UPLOAD: { label: "ポータル受信", color: "bg-purple-500/10 text-purple-400" },
  PORTAL_TOKEN_CREATE: { label: "リンク発行", color: "bg-yellow-500/10 text-yellow-400" },
  PORTAL_JOURNAL_CONFIRM: { label: "ポータル確定", color: "bg-emerald-500/10 text-emerald-400" },
  KNOWLEDGE_UPLOAD: { label: "ナレッジ登録", color: "bg-cyan-500/10 text-cyan-400" },
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (actionFilter !== "all") params.set("action", actionFilter);
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch {
      toast.error("監査ログの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  }

  function getActionBadge(action: string) {
    const config = ACTION_LABELS[action] || { label: action, color: "bg-[rgba(212,175,55,0.08)] text-[#D4AF37]" };
    return (
      <Badge variant="secondary" className={`${config.color} border-none text-[10px]`}>
        {config.label}
      </Badge>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">監査ログ</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            全{total}件の操作履歴
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#64748B]" />
          <Select value={actionFilter} onValueChange={(v) => { if (v) { setActionFilter(v); setPage(1); } }}>
            <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="LOGIN">ログイン</SelectItem>
              <SelectItem value="LOGIN_FAILED">ログイン失敗</SelectItem>
              <SelectItem value="REGISTER">ユーザー登録</SelectItem>
              <SelectItem value="PORTAL_RECEIPT_UPLOAD">ポータル受信</SelectItem>
              <SelectItem value="PORTAL_TOKEN_CREATE">リンク発行</SelectItem>
              <SelectItem value="KNOWLEDGE_UPLOAD">ナレッジ登録</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="glass-card border-[rgba(212,175,55,0.08)]">
        <CardHeader>
          <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#D4AF37]" />
            操作履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#94A3B8]">読み込み中...</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#64748B]">
              <ClipboardList className="h-12 w-12 mb-4 opacity-30" />
              <p>監査ログはまだありません</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(212,175,55,0.08)]">
                      <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">日時</th>
                      <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">ユーザー</th>
                      <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">アクション</th>
                      <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">詳細</th>
                      <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-[rgba(212,175,55,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                        <td className="py-3 px-4 text-[#F1F5F9] text-xs">{log.user?.name || "-"}</td>
                        <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                        <td className="py-3 px-4 text-[#F1F5F9] text-xs max-w-[300px] truncate">{log.detail || "-"}</td>
                        <td className="py-3 px-4 text-[#64748B] font-mono text-[10px]">{log.ipAddress || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.06)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-[#64748B]">{formatDate(log.createdAt)}</span>
                      {getActionBadge(log.action)}
                    </div>
                    <p className="text-xs text-[#F1F5F9] mb-1">{log.user?.name || "-"}</p>
                    {log.detail && <p className="text-[10px] text-[#94A3B8]">{log.detail}</p>}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-6">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    variant="secondary"
                    size="sm"
                    className="bg-[#334155] text-[#94A3B8] h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-[#64748B]">{page} / {totalPages}</span>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    variant="secondary"
                    size="sm"
                    className="bg-[#334155] text-[#94A3B8] h-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
