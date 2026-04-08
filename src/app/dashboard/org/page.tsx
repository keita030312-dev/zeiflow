"use client";

import { useEffect, useState } from "react";

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
}

interface OrgInfo {
  id: string;
  name: string;
  code: string;
  members: OrgMember[];
}

export default function OrgPage() {
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [leaving, setLeaving] = useState(false);

  async function fetchOrg() {
    try {
      const res = await fetch("/api/org");
      const data = await res.json();
      setOrg(data.org);
    } catch {
      setError("チーム情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrg();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, code: teamCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "チームの作成に失敗しました");
        return;
      }
      setSuccess("チームを作成しました。再ログインすると反映されます。");
      await fetchOrg();
    } catch {
      setError("チームの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "招待に失敗しました");
        return;
      }
      setSuccess("メンバーを招待しました");
      setInviteEmail("");
      await fetchOrg();
    } catch {
      setError("招待に失敗しました");
    } finally {
      setInviting(false);
    }
  }

  async function handleLeave() {
    if (!confirm("本当にチームを離れますか？")) return;
    setLeaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/org/leave", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "チームの離脱に失敗しました");
        return;
      }
      setSuccess("チームを離れました。再ログインすると反映されます。");
      setOrg(null);
    } catch {
      setError("チームの離脱に失敗しました");
    } finally {
      setLeaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#F1F5F9]">チーム管理</h1>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      {!org ? (
        /* Individual mode - show create form */
        <div className="rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#0F172A] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-[rgba(148,163,184,0.1)] text-[#94A3B8]">
              個人モード
            </span>
          </div>
          <p className="text-sm text-[#94A3B8]">
            現在は個人モードで利用しています。チームを作成すると、メンバーとデータを共有できます。
          </p>

          <form onSubmit={handleCreate} className="space-y-4 pt-4 border-t border-[rgba(212,175,55,0.1)]">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">チームを作成</h2>
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">チーム名</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="例: 山田税理士事務所"
                className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1E293B] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1">チームコード</label>
              <input
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                placeholder="例: yamada-tax"
                className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1E293B] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#D4AF37]"
                required
              />
              <p className="mt-1 text-xs text-[#475569]">英数字・ハイフン・アンダースコアのみ</p>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B8962E] px-4 py-2 text-sm font-medium text-[#0F172A] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? "作成中..." : "チームを作成"}
            </button>
          </form>
        </div>
      ) : (
        /* Team mode - show org info */
        <div className="space-y-6">
          <div className="rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#0F172A] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#F1F5F9]">{org.name}</h2>
                <p className="text-sm text-[#94A3B8]">コード: {org.code}</p>
              </div>
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-[rgba(212,175,55,0.1)] text-[#D4AF37]">
                チームモード
              </span>
            </div>
          </div>

          {/* Members list */}
          <div className="rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#0F172A] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">メンバー ({org.members.length})</h2>
            <div className="divide-y divide-[rgba(212,175,55,0.1)]">
              {org.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[#F1F5F9]">{member.name}</p>
                    <p className="text-xs text-[#94A3B8]">{member.email}</p>
                  </div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      member.role === "ADMIN"
                        ? "bg-[rgba(212,175,55,0.1)] text-[#D4AF37]"
                        : "bg-[rgba(148,163,184,0.1)] text-[#94A3B8]"
                    }`}
                  >
                    {member.role === "ADMIN" ? "管理者" : "スタッフ"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Invite form */}
          <div className="rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#0F172A] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">メンバーを招待</h2>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="メールアドレスを入力"
                className="flex-1 rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1E293B] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#D4AF37]"
                required
              />
              <button
                type="submit"
                disabled={inviting}
                className="rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B8962E] px-4 py-2 text-sm font-medium text-[#0F172A] hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
              >
                {inviting ? "招待中..." : "招待"}
              </button>
            </form>
          </div>

          {/* Leave button */}
          <div className="rounded-xl border border-red-500/20 bg-[#0F172A] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">チームを離れる</h2>
            <p className="text-sm text-[#94A3B8]">
              チームを離れると個人モードに戻ります。チームのデータにはアクセスできなくなります。
            </p>
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {leaving ? "離脱中..." : "チームを離れる"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
