"use client";

import { useState, useEffect } from "react";
import { ListTree, Plus, Pencil, Trash2, X, Check, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ACCOUNT_CATEGORIES } from "@/types/index";

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

const TYPE_LABELS: Record<AccountType, string> = {
  ASSET: "資産",
  LIABILITY: "負債",
  EQUITY: "純資産",
  REVENUE: "収益",
  EXPENSE: "費用",
};

const TYPE_COLORS: Record<AccountType, string> = {
  ASSET: "bg-blue-900/40 text-blue-300",
  LIABILITY: "bg-red-900/40 text-red-300",
  EQUITY: "bg-purple-900/40 text-purple-300",
  REVENUE: "bg-green-900/40 text-green-300",
  EXPENSE: "bg-orange-900/40 text-orange-300",
};

// 既存 ACCOUNT_CATEGORIES の type を AccountType に合わせてマッピング
const STD_TYPE_MAP: Record<string, AccountType> = {
  asset: "ASSET",
  liability: "LIABILITY",
  equity: "EQUITY",
  revenue: "REVENUE",
  expense: "EXPENSE",
};

interface CustomAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm = { code: "", name: "", type: "EXPENSE" as AccountType, sortOrder: 0 };

export default function AccountsPage() {
  const [customs, setCustoms] = useState<CustomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; type: AccountType; isActive: boolean; sortOrder: number }>({
    name: "", type: "EXPENSE", isActive: true, sortOrder: 0,
  });

  async function fetchCustoms() {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) setCustoms(await res.json());
    } catch {
      toast.error("勘定科目の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCustoms(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("科目を追加しました");
        setForm(emptyForm);
        setShowForm(false);
        fetchCustoms();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch {
      toast.error("追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (res.ok) {
        toast.success("更新しました");
        setEditId(null);
        fetchCustoms();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch {
      toast.error("更新に失敗しました");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この科目を削除しますか？")) return;
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("削除しました");
        fetchCustoms();
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  async function toggleActive(acc: CustomAccount) {
    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acc.id, name: acc.name, type: acc.type, isActive: !acc.isActive, sortOrder: acc.sortOrder }),
      });
      if (res.ok) {
        toast.success(acc.isActive ? "無効にしました" : "有効にしました");
        fetchCustoms();
      }
    } catch {
      toast.error("更新に失敗しました");
    }
  }

  function startEdit(acc: CustomAccount) {
    setEditId(acc.id);
    setEditForm({ name: acc.name, type: acc.type, isActive: acc.isActive, sortOrder: acc.sortOrder });
  }

  // 種別ごとにグループ化
  const groupedCustoms = (Object.keys(TYPE_LABELS) as AccountType[]).map((type) => ({
    type,
    items: customs.filter((a) => a.type === type),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[rgba(212,175,55,0.08)]">
            <ListTree className="h-6 w-6 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#F1F5F9]">勘定科目</h1>
            <p className="text-sm text-[#64748B]">標準科目の確認・追加科目の管理</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold"
        >
          <Plus className="h-4 w-4 mr-1" /> 科目を追加
        </Button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(15,23,42,0.6)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#F1F5F9]">新しい科目を追加</h2>
            <button onClick={() => setShowForm(false)} className="text-[#64748B] hover:text-[#F1F5F9]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">科目コード</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
                placeholder="例: 800"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">科目名</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
                placeholder="例: 開発費"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">種別</Label>
              <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as AccountType })}>
                <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]">
                  <SelectValue>{TYPE_LABELS[form.type]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                  {(Object.entries(TYPE_LABELS) as [AccountType, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">表示順</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
              />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-[#94A3B8]">
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold">
                {submitting ? "追加中..." : "追加する"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 追加科目一覧 */}
      <div>
        <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">
          追加科目 <span className="text-sm text-[#64748B] font-normal">({customs.length}件)</span>
        </h2>
        {loading ? (
          <p className="text-[#64748B] text-sm">読み込み中...</p>
        ) : customs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[rgba(212,175,55,0.15)] p-8 text-center">
            <p className="text-[#64748B] text-sm">追加科目はまだありません</p>
            <p className="text-[#475569] text-xs mt-1">「科目を追加」から独自科目を登録できます</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedCustoms.filter((g) => g.items.length > 0).map(({ type, items }) => (
              <div key={type} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[rgba(15,23,42,0.4)] overflow-hidden">
                <div className="px-4 py-2 border-b border-[rgba(212,175,55,0.08)] bg-[rgba(15,23,42,0.3)]">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>{TYPE_LABELS[type]}</span>
                </div>
                {items.map((acc) => (
                  <div key={acc.id} className="px-4 py-3 border-b border-[rgba(212,175,55,0.06)] last:border-0">
                    {editId === acc.id ? (
                      <div className="flex gap-2 items-center flex-wrap">
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] h-8 text-sm w-40"
                        />
                        <Select value={editForm.type} onValueChange={(v) => v && setEditForm({ ...editForm, type: v as AccountType })}>
                          <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] h-8 text-xs w-24">
                            <SelectValue>{TYPE_LABELS[editForm.type]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                            {(Object.entries(TYPE_LABELS) as [AccountType, string][]).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button onClick={() => handleUpdate(acc.id)} className="text-green-400 hover:text-green-300">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="text-[#64748B] hover:text-[#94A3B8]">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#64748B] font-mono w-12">{acc.code}</span>
                          <span className={`text-sm font-medium ${acc.isActive ? "text-[#F1F5F9]" : "text-[#475569] line-through"}`}>
                            {acc.name}
                          </span>
                          {!acc.isActive && (
                            <Badge className="bg-[rgba(100,116,139,0.2)] text-[#64748B] text-[10px] px-1.5">無効</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleActive(acc)} className={`p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] ${acc.isActive ? "text-green-400" : "text-[#475569]"}`} title={acc.isActive ? "無効にする" : "有効にする"}>
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => startEdit(acc)} className="p-1.5 rounded-lg text-[#64748B] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)]">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(acc.id)} className="p-1.5 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-[rgba(255,0,0,0.05)]">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 標準科目一覧（読み取り専用） */}
      <div>
        <h2 className="text-lg font-semibold text-[#F1F5F9] mb-1">標準科目</h2>
        <p className="text-xs text-[#64748B] mb-4">ZeiFlow に組み込まれた標準の勘定科目です（変更不可）</p>
        <div className="space-y-2">
          {(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as AccountType[]).map((type) => {
            const stdType = type === "ASSET" ? "asset" : type === "LIABILITY" ? "liability" : type === "EQUITY" ? "equity" : type === "REVENUE" ? "revenue" : "expense";
            const items = ACCOUNT_CATEGORIES.filter((a) => a.type === stdType);
            if (items.length === 0) return null;
            return (
              <div key={type} className="rounded-xl border border-[rgba(212,175,55,0.08)] bg-[rgba(15,23,42,0.2)] overflow-hidden">
                <div className="px-4 py-2 border-b border-[rgba(212,175,55,0.06)] bg-[rgba(15,23,42,0.2)]">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[STD_TYPE_MAP[stdType]]}`}>{TYPE_LABELS[type]}</span>
                </div>
                <div className="divide-y divide-[rgba(212,175,55,0.04)]">
                  {items.map((a) => (
                    <div key={a.code} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-xs text-[#475569] font-mono w-12">{a.code}</span>
                      <span className="text-sm text-[#64748B]">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
