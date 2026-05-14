"use client";

import { useState } from "react";
import { Shield, Users, Building2, FileText, Camera, Brain, Link2, AlertCircle } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalOrgs: number;
  totalClients: number;
  totalReceipts: number;
  totalJournals: number;
  totalKnowledge: number;
  totalPortalTokens: number;
  errorReceipts: number;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  totpEnabled: boolean;
  organization: { name: string } | null;
  _count: { clients: number; receipts: number; journalEntries: number };
}

interface OrgInfo {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isApproved: boolean;
  plan: string;
  note: string | null;
  createdAt: string;
  members: { id: string; name: string; email: string; role: string }[];
  _count: { members: number; clients: number; receipts: number; journalEntries: number; knowledgeFiles: number; portalTokens: number };
}

interface LogInfo {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

export default function SuperAdminPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    stats: Stats;
    users: UserInfo[];
    orgs: OrgInfo[];
    recentLogs: LogInfo[];
    maintenance: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // secret は URL クエリではなくヘッダー経由で送る（アクセスログ・履歴に残らない）
      const res = await fetch("/api/superadmin", {
        headers: { "x-admin-secret": secret },
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        setError("シークレットが正しくありません");
      }
    } catch {
      setError("接続に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 mb-4">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#F1F5F9]">ZeiFlow 管理者パネル</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="管理者シークレット"
              className="w-full px-4 py-3 rounded-lg bg-[rgba(15,23,42,0.5)] border border-[rgba(255,255,255,0.1)] text-[#F1F5F9] placeholder:text-[#475569]"
              required
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold bg-red-600 text-white disabled:opacity-50"
            >
              {loading ? "読み込み中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { stats, users, orgs, recentLogs } = data;

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ZeiFlow 管理者パネル</h1>
            <p className="text-xs text-[#64748B]">全事務所の利用状況を管理</p>
          </div>
          <button
            onClick={async () => {
              const newState = !data.maintenance;
              if (!confirm(newState ? "メンテナンスモードを有効にしますか？全ユーザーがアクセスできなくなります。" : "メンテナンスモードを解除しますか？")) return;
              const res = await fetch("/api/superadmin", {
                method: "PUT",
                headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                body: JSON.stringify({ maintenance: newState }),
              });
              if (res.ok) {
                setData({ ...data, maintenance: newState });
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              data.maintenance
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            {data.maintenance ? "🔧 メンテナンス解除" : "🔧 メンテナンス開始"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "ユーザー数", value: stats.totalUsers, icon: Users, color: "from-blue-500 to-blue-600" },
            { label: "組織数", value: stats.totalOrgs, icon: Building2, color: "from-purple-500 to-purple-600" },
            { label: "顧客数", value: stats.totalClients, icon: Users, color: "from-[#D4AF37] to-[#B8962E]" },
            { label: "レシート数", value: stats.totalReceipts, icon: Camera, color: "from-emerald-500 to-emerald-600" },
            { label: "仕訳数", value: stats.totalJournals, icon: FileText, color: "from-cyan-500 to-cyan-600" },
            { label: "ナレッジ数", value: stats.totalKnowledge, icon: Brain, color: "from-amber-500 to-amber-600" },
            { label: "ポータルリンク", value: stats.totalPortalTokens, icon: Link2, color: "from-indigo-500 to-indigo-600" },
            { label: "エラーレシート", value: stats.errorReceipts, icon: AlertCircle, color: "from-red-500 to-red-600" },
          ].map((s) => (
            <div key={s.label} className="bg-[rgba(30,41,59,0.6)] rounded-xl p-4 border border-[rgba(255,255,255,0.05)]">
              <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
                <s.icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-xl font-bold">{s.value.toLocaleString()}</p>
              <p className="text-[10px] text-[#64748B]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Users */}
          <div className="bg-[rgba(30,41,59,0.6)] rounded-xl p-5 border border-[rgba(255,255,255,0.05)]">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              ユーザー一覧（{users.length}）
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="p-3 rounded-lg bg-[rgba(15,23,42,0.4)] border border-[rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-[10px] text-[#64748B]">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.role === "ADMIN" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                        {u.role}
                      </span>
                      {u.totpEnabled && <span className="text-[10px] text-green-400 ml-1">2FA</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#64748B]">
                    <span>顧客{u._count.clients}</span>
                    <span>レシート{u._count.receipts}</span>
                    <span>仕訳{u._count.journalEntries}</span>
                    {u.organization && <span className="text-purple-400">{u.organization.name}</span>}
                    <button
                      onClick={async () => {
                        if (!confirm(`${u.name}（${u.email}）を削除しますか？全データが消えます`)) return;
                        const res = await fetch(`/api/superadmin?userId=${u.id}`, {
                          method: "DELETE",
                          headers: { "x-admin-secret": secret },
                        });
                        if (res.ok) {
                          setData({ ...data, users: data.users.filter((x) => x.id !== u.id), stats: { ...data.stats, totalUsers: data.stats.totalUsers - 1 } });
                        }
                      }}
                      className="ml-auto text-[10px] text-red-400 hover:text-red-300"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 事務所管理 */}
          <div className="bg-[rgba(30,41,59,0.6)] rounded-xl p-5 border border-[rgba(255,255,255,0.05)]">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              納品先事務所（{orgs.length}）
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {orgs.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-8">事務所がありません</p>
              ) : (
                orgs.map((o) => (
                  <div key={o.id} className={`p-4 rounded-lg border ${o.isActive ? "bg-[rgba(15,23,42,0.4)] border-[rgba(255,255,255,0.05)]" : "bg-red-500/5 border-red-500/20"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{o.name} <span className="text-[10px] text-[#64748B]">({o.code})</span></p>
                        <p className="text-[10px] text-[#64748B]">{new Date(o.createdAt).toLocaleDateString("ja-JP")} 登録</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.plan === "free" ? "bg-gray-500/10 text-gray-400" : "bg-[rgba(212,175,55,0.1)] text-[#D4AF37]"}`}>
                          {o.plan}
                        </span>
                        {!o.isApproved && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                            承認待ち
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                          {o.isActive ? "有効" : "停止"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] text-[#64748B] mb-2">
                      <span>メンバー{o._count.members}</span>
                      <span>顧客{o._count.clients}</span>
                      <span>レシート{o._count.receipts}</span>
                      <span>仕訳{o._count.journalEntries}</span>
                      <span>ナレッジ{o._count.knowledgeFiles}</span>
                      <span>ポータル{o._count.portalTokens}</span>
                    </div>
                    {o.members.length > 0 && (
                      <div className="text-[10px] text-[#94A3B8] mb-2">
                        {o.members.map((m) => `${m.name}(${m.email})`).join(", ")}
                      </div>
                    )}
                    {o.note && <p className="text-[10px] text-[#94A3B8] mb-2 italic">{o.note}</p>}
                    <div className="flex gap-2 mt-2">
                      {!o.isApproved && (
                        <button
                          onClick={async () => {
                            const res = await fetch("/api/superadmin", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                              body: JSON.stringify({ orgId: o.id, isApproved: true }),
                            });
                            if (res.ok) {
                              setData({ ...data, orgs: data.orgs.map((x) => x.id === o.id ? { ...x, isApproved: true } : x) });
                            }
                          }}
                          className="text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 font-bold"
                        >
                          ✓ 承認
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const res = await fetch("/api/superadmin", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                            body: JSON.stringify({ orgId: o.id, isActive: !o.isActive }),
                          });
                          if (res.ok) {
                            setData({ ...data, orgs: data.orgs.map((x) => x.id === o.id ? { ...x, isActive: !o.isActive } : x) });
                          }
                        }}
                        className={`text-[10px] px-2 py-1 rounded ${o.isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`}
                      >
                        {o.isActive ? "停止" : "有効化"}
                      </button>
                      <button
                        onClick={async () => {
                          const note = prompt("メモ:", o.note || "");
                          if (note === null) return;
                          const res = await fetch("/api/superadmin", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                            body: JSON.stringify({ orgId: o.id, note }),
                          });
                          if (res.ok) {
                            setData({ ...data, orgs: data.orgs.map((x) => x.id === o.id ? { ...x, note } : x) });
                          }
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-[rgba(212,175,55,0.1)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.2)]"
                      >
                        メモ
                      </button>
                      <button
                        onClick={async () => {
                          const plan = prompt("プラン (free/basic/pro):", o.plan);
                          if (!plan) return;
                          const res = await fetch("/api/superadmin", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                            body: JSON.stringify({ orgId: o.id, plan }),
                          });
                          if (res.ok) {
                            setData({ ...data, orgs: data.orgs.map((x) => x.id === o.id ? { ...x, plan } : x) });
                          }
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                      >
                        プラン変更
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`「${o.name}」を完全に削除しますか？\n所属メンバー・全データが削除され、再利用するには新規登録が必要です。`)) return;
                          if (!confirm("本当に削除しますか？この操作は取り消せません。")) return;
                          const res = await fetch(`/api/superadmin?orgId=${o.id}`, {
                            method: "DELETE",
                            headers: { "x-admin-secret": secret },
                          });
                          if (res.ok) {
                            setData({ ...data, orgs: data.orgs.filter((x) => x.id !== o.id), stats: { ...data.stats, totalOrgs: data.stats.totalOrgs - 1 } });
                          }
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        事務所削除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-[rgba(30,41,59,0.6)] rounded-xl p-5 border border-[rgba(255,255,255,0.05)]">
          <h2 className="text-base font-semibold mb-4">最近の操作ログ（全事務所）</h2>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2 rounded bg-[rgba(15,23,42,0.3)] text-xs">
                <span className="text-[10px] text-[#64748B] w-28 shrink-0">
                  {new Date(log.createdAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(212,175,55,0.1)] text-[#D4AF37] shrink-0">{log.action}</span>
                <span className="text-[#94A3B8] truncate">{log.user?.name}</span>
                <span className="text-[#64748B] truncate">{log.detail || ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
