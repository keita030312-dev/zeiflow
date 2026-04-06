"use client";

import { useState, useEffect } from "react";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AuditLog {
  id: string;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F1F5F9]">監査ログ</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          アカウントの操作履歴を確認できます
        </p>
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
            <div className="flex items-center justify-center py-12 text-[#94A3B8]">
              読み込み中...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#64748B]">
              <ClipboardList className="h-12 w-12 mb-4 opacity-30" />
              <p>監査ログはまだありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(212,175,55,0.08)]">
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">
                      日時
                    </th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">
                      アクション
                    </th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">
                      詳細
                    </th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">
                      IPアドレス
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-[rgba(212,175,55,0.04)] hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(212,175,55,0.08)] text-[#D4AF37]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#F1F5F9]">
                        {log.detail || "-"}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] font-mono text-xs">
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
