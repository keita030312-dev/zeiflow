"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Search,
  Check,
  Edit3,
  Trash2,
  Filter,
  Save,
  X,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Loader2,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface JournalEntry {
  id: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  taxAmount?: number;
  description: string;
  memo?: string;
  invoiceNumber?: string;
  isConfirmed: boolean;
  client: { name: string; code: string };
}

interface Client {
  id: string;
  code: string;
  name: string;
}

const ACCOUNTS = [
  "現金", "当座預金", "普通預金", "売掛金", "商品", "前払費用", "建物", "車両運搬具", "備品",
  "買掛金", "未払金", "未払費用", "預り金", "借入金",
  "売上高", "受取利息", "雑収入",
  "仕入高", "給料手当", "法定福利費", "旅費交通費", "通信費", "消耗品費", "水道光熱費",
  "地代家賃", "保険料", "修繕費", "広告宣伝費", "接待交際費", "会議費", "租税公課",
  "減価償却費", "支払手数料", "雑費", "新聞図書費", "外注費", "福利厚生費", "荷造運賃", "車両費",
];

export default function JournalsPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("all");
  const [search, setSearch] = useState("");
  const [periodTab, setPeriodTab] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    debitAccount: "",
    creditAccount: "",
    amount: 0,
    description: "",
    memo: "",
    invoiceNumber: "",
  });

  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    clientId: "",
    debitAccount: ACCOUNTS[0],
    creditAccount: ACCOUNTS[0],
    amount: 0,
    description: "",
    invoiceNumber: "",
    memo: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Bulk confirm state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirming, setBulkConfirming] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(() => {});
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClient !== "all") params.set("clientId", selectedClient);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/journals?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch {
      toast.error("仕訳の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedClient, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Reset page when client changes
  useEffect(() => {
    setPage(1);
  }, [selectedClient]);

  // Clear selection when entries change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [entries]);

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setEditForm({
      date: format(new Date(entry.date), "yyyy-MM-dd"),
      debitAccount: entry.debitAccount,
      creditAccount: entry.creditAccount,
      amount: entry.amount,
      description: entry.description,
      memo: entry.memo || "",
      invoiceNumber: entry.invoiceNumber || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    try {
      const res = await fetch("/api/journals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          date: editForm.date,
          debitAccount: editForm.debitAccount,
          creditAccount: editForm.creditAccount,
          amount: editForm.amount,
          description: editForm.description,
          memo: editForm.memo || undefined,
          invoiceNumber: editForm.invoiceNumber || undefined,
        }),
      });
      if (res.ok) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  date: editForm.date,
                  debitAccount: editForm.debitAccount,
                  creditAccount: editForm.creditAccount,
                  amount: editForm.amount,
                  description: editForm.description,
                  memo: editForm.memo,
                  invoiceNumber: editForm.invoiceNumber,
                }
              : e
          )
        );
        setEditingId(null);
        toast.success("仕訳を更新しました");
      } else {
        toast.error("更新に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    }
  }

  async function toggleConfirm(id: string, current: boolean) {
    try {
      const res = await fetch("/api/journals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isConfirmed: !current }),
      });
      if (res.ok) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, isConfirmed: !current } : e
          )
        );
        toast.success(!current ? "仕訳を確定しました" : "確定を取り消しました");
      }
    } catch {
      toast.error("更新に失敗しました");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この仕訳を削除しますか？")) return;
    try {
      const res = await fetch(`/api/journals?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        toast.success("仕訳を削除しました");
      }
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  async function handleCreate() {
    if (!newForm.clientId || !newForm.description || newForm.amount <= 0) {
      toast.error("顧客・摘要・金額は必須です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newForm.date,
          clientId: newForm.clientId,
          debitAccount: newForm.debitAccount,
          creditAccount: newForm.creditAccount,
          amount: newForm.amount,
          description: newForm.description,
          invoiceNumber: newForm.invoiceNumber || undefined,
          memo: newForm.memo || undefined,
        }),
      });
      if (res.ok) {
        toast.success("仕訳を登録しました");
        setShowNewForm(false);
        setNewForm({
          date: format(new Date(), "yyyy-MM-dd"),
          clientId: "",
          debitAccount: ACCOUNTS[0],
          creditAccount: ACCOUNTS[0],
          amount: 0,
          description: "",
          invoiceNumber: "",
          memo: "",
        });
        fetchEntries();
      } else {
        toast.error("登録に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  // Bulk confirm handlers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    const unconfirmedIds = entries.filter((e) => !e.isConfirmed).map((e) => e.id);
    if (unconfirmedIds.every((id) => selectedIds.has(id))) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all unconfirmed
      setSelectedIds(new Set(unconfirmedIds));
    }
  }

  async function handleBulkConfirm(ids: string[]) {
    if (ids.length === 0) return;
    setBulkConfirming(true);
    try {
      const res = await fetch("/api/journals/bulk-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = await res.json();
        setEntries((prev) =>
          prev.map((e) =>
            ids.includes(e.id) ? { ...e, isConfirmed: true } : e
          )
        );
        setSelectedIds(new Set());
        toast.success(`${data.count}件の仕訳を確定しました`);
      } else {
        toast.error("一括確定に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setBulkConfirming(false);
    }
  }

  async function handleConfirmAll() {
    const unconfirmedIds = entries.filter((e) => !e.isConfirmed).map((e) => e.id);
    if (unconfirmedIds.length === 0) {
      toast.info("未確定の仕訳はありません");
      return;
    }
    if (!confirm(`${unconfirmedIds.length}件の仕訳を全て確定しますか？`)) return;
    await handleBulkConfirm(unconfirmedIds);
  }

  async function handleConfirmSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await handleBulkConfirm(ids);
  }

  const filtered = entries.filter(
    (e) =>
      e.description.includes(search) ||
      e.debitAccount.includes(search) ||
      e.creditAccount.includes(search)
  );

  function groupByMonth(entries: JournalEntry[]) {
    const groups: Record<string, JournalEntry[]> = {};
    entries.forEach((e) => {
      const key = format(new Date(e.date), "yyyy年M月", { locale: ja });
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }

  function groupByHalfYear(entries: JournalEntry[]) {
    const groups: Record<string, JournalEntry[]> = {};
    entries.forEach((e) => {
      const d = new Date(e.date);
      const half = d.getMonth() < 6 ? "上半期" : "下半期";
      const key = `${d.getFullYear()}年 ${half}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }

  function groupByYear(entries: JournalEntry[]) {
    const groups: Record<string, JournalEntry[]> = {};
    entries.forEach((e) => {
      const key = `${new Date(e.date).getFullYear()}年`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }

  const groupedEntries =
    periodTab === "monthly"
      ? groupByMonth(filtered)
      : periodTab === "semi_annual"
        ? groupByHalfYear(filtered)
        : groupByYear(filtered);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F1F5F9]">仕訳管理</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          仕訳の確認・編集・確定を行います
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="勘定科目・摘要で検索..."
            className="pl-10 bg-[rgba(30,41,59,0.6)] border-[rgba(212,175,55,0.08)] text-[#F1F5F9] placeholder:text-[#475569]"
          />
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          新規仕訳
        </button>
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (selectedClient !== "all") params.set("clientId", selectedClient);
            window.open(`/dashboard/journals/print?${params.toString()}`, "_blank");
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-[rgba(30,41,59,0.6)] border border-[rgba(212,175,55,0.08)] text-[#94A3B8] text-sm hover:text-[#F1F5F9] hover:border-[rgba(212,175,55,0.2)] transition-colors"
        >
          <Printer className="h-4 w-4" />
          印刷
        </button>
        <Select value={selectedClient} onValueChange={(v) => v && setSelectedClient(v)}>
          <SelectTrigger className="w-[200px] bg-[rgba(30,41,59,0.6)] border-[rgba(212,175,55,0.08)] text-[#F1F5F9]">
            <Filter className="h-4 w-4 mr-2 text-[#64748B]" />
            <SelectValue placeholder="顧客" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
            <SelectItem value="all">全顧客</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* New Entry Inline Form */}
      {showNewForm && (
        <Card className="glass-card border-[rgba(212,175,55,0.08)] mb-6">
          <CardHeader className="py-3 px-5 bg-[rgba(212,175,55,0.03)]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-[#D4AF37]">新規仕訳</CardTitle>
              <button onClick={() => setShowNewForm(false)} className="text-[#64748B] hover:text-[#F1F5F9] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-[#64748B] mb-1">日付</label>
                <input type="date" value={newForm.date} onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                  className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-3 py-2 text-sm text-[#F1F5F9]" />
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">顧客</label>
                <select value={newForm.clientId} onChange={(e) => setNewForm({ ...newForm, clientId: e.target.value })}
                  className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-3 py-2 text-sm text-[#F1F5F9]">
                  <option value="">選択してください</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">借方科目</label>
                <select value={newForm.debitAccount} onChange={(e) => setNewForm({ ...newForm, debitAccount: e.target.value })}
                  className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-3 py-2 text-sm text-[#F1F5F9]">
                  {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">貸方科目</label>
                <select value={newForm.creditAccount} onChange={(e) => setNewForm({ ...newForm, creditAccount: e.target.value })}
                  className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-3 py-2 text-sm text-[#F1F5F9]">
                  {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-[#64748B] mb-1">金額</label>
                <input type="number" value={newForm.amount || ""} onChange={(e) => setNewForm({ ...newForm, amount: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-3 py-2 text-sm text-[#F1F5F9]" />
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">摘要</label>
                <input type="text" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="取引内容"
                  className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-3 py-2 text-sm text-[#F1F5F9]" />
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">登録番号 (任意)</label>
                <input type="text" value={newForm.invoiceNumber} onChange={(e) => setNewForm({ ...newForm, invoiceNumber: e.target.value })}
                  placeholder="T0000000000000"
                  className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-3 py-2 text-sm text-[#F1F5F9]" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#64748B] mb-1">メモ (任意)</label>
              <textarea value={newForm.memo} onChange={(e) => setNewForm({ ...newForm, memo: e.target.value })}
                rows={2} placeholder="備考やメモ"
                className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-3 py-2 text-sm text-[#F1F5F9] resize-none" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleCreate} disabled={submitting}
                className="px-6 py-2 rounded-md bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? "登録中..." : "登録"}
              </button>
              <button onClick={() => setShowNewForm(false)}
                className="px-6 py-2 rounded-md bg-[#334155] text-[#F1F5F9] text-sm hover:bg-[#475569] transition-colors">
                キャンセル
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Tabs + Bulk Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Tabs value={periodTab} onValueChange={(v) => v && setPeriodTab(v)}>
          <TabsList className="bg-[rgba(30,41,59,0.6)] border border-[rgba(212,175,55,0.08)]">
            <TabsTrigger value="monthly" className="data-[state=active]:bg-[rgba(212,175,55,0.15)] data-[state=active]:text-[#D4AF37]">月次</TabsTrigger>
            <TabsTrigger value="semi_annual" className="data-[state=active]:bg-[rgba(212,175,55,0.15)] data-[state=active]:text-[#D4AF37]">半期</TabsTrigger>
            <TabsTrigger value="annual" className="data-[state=active]:bg-[rgba(212,175,55,0.15)] data-[state=active]:text-[#D4AF37]">年次</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <button
              onClick={handleConfirmSelected}
              disabled={bulkConfirming}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {bulkConfirming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckSquare className="h-3.5 w-3.5" />
              )}
              選択した仕訳を確定 ({selectedIds.size}件)
            </button>
          )}
          <button
            onClick={handleConfirmAll}
            disabled={bulkConfirming}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(212,175,55,0.08)] text-[#D4AF37] text-xs font-medium hover:bg-[rgba(212,175,55,0.15)] transition-colors disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            全て確定
          </button>
        </div>
      </div>

      {/* Journal Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#94A3B8]">読み込み中...</div>
      ) : Object.keys(groupedEntries).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
          <BookOpen className="h-12 w-12 mb-4 opacity-30" />
          <p>仕訳データがありません</p>
          <p className="text-sm mt-1">レシートをアップロードすると自動仕訳されます</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEntries).map(([period, periodEntries]) => (
            <Card key={period} className="glass-card border-[rgba(212,175,55,0.08)] overflow-hidden">
              <CardHeader className="py-3 px-5 bg-[rgba(212,175,55,0.03)]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-[#D4AF37]">{period}</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-[#64748B]">
                    <span>{periodEntries.length}件</span>
                    <span className="font-[var(--font-inter)]">
                      ¥{periodEntries.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(212,175,55,0.06)]">
                        <th className="text-left text-[#64748B] text-xs px-2 py-2 w-[40px]">
                          <input
                            type="checkbox"
                            checked={periodEntries.filter((e) => !e.isConfirmed).length > 0 && periodEntries.filter((e) => !e.isConfirmed).every((e) => selectedIds.has(e.id))}
                            onChange={toggleSelectAll}
                            className="rounded border-[rgba(212,175,55,0.3)] bg-transparent accent-[#D4AF37]"
                          />
                        </th>
                        <th className="text-left text-[#64748B] text-xs px-4 py-2 w-[90px]">日付</th>
                        <th className="text-left text-[#64748B] text-xs px-4 py-2">借方</th>
                        <th className="text-left text-[#64748B] text-xs px-4 py-2">貸方</th>
                        <th className="text-right text-[#64748B] text-xs px-4 py-2">金額</th>
                        <th className="text-left text-[#64748B] text-xs px-4 py-2">摘要</th>
                        <th className="text-left text-[#64748B] text-xs px-4 py-2">登録番号</th>
                        <th className="text-left text-[#64748B] text-xs px-4 py-2">顧客</th>
                        <th className="text-left text-[#64748B] text-xs px-4 py-2 w-[120px]">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodEntries.map((entry) =>
                        editingId === entry.id ? (
                          [
                          <tr key={entry.id} className="border-b border-[rgba(212,175,55,0.08)] bg-[rgba(212,175,55,0.03)]">
                            <td className="px-2 py-2"></td>
                            <td className="px-4 py-2">
                              <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1 text-xs text-[#F1F5F9]" />
                            </td>
                            <td className="px-4 py-2">
                              <select value={editForm.debitAccount} onChange={(e) => setEditForm({ ...editForm, debitAccount: e.target.value })}
                                className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1 text-xs text-[#F1F5F9]">
                                {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <select value={editForm.creditAccount} onChange={(e) => setEditForm({ ...editForm, creditAccount: e.target.value })}
                                className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1 text-xs text-[#F1F5F9]">
                                {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                                className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1 text-xs text-[#F1F5F9] text-right" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1 text-xs text-[#F1F5F9]" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={editForm.invoiceNumber} onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                                placeholder="T0000000000000"
                                className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1 text-xs text-[#F1F5F9]" />
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant="secondary" className="bg-[rgba(212,175,55,0.05)] text-[#94A3B8] border-none text-[10px]">
                                {entry.client.name}
                              </Badge>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => saveEdit(entry.id)} className="h-7 w-7 rounded flex items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="保存">
                                  <Save className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={cancelEdit} className="h-7 w-7 rounded flex items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#64748B] hover:text-red-400" title="キャンセル">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>,
                          <tr key={`${entry.id}-memo`} className="border-b border-[rgba(212,175,55,0.08)] bg-[rgba(212,175,55,0.03)]">
                            <td colSpan={9} className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] text-[#64748B] whitespace-nowrap">メモ</label>
                                <textarea value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                                  rows={1} placeholder="備考やメモ"
                                  className="flex-1 bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1 text-xs text-[#F1F5F9] resize-none" />
                              </div>
                            </td>
                          </tr>
                          ]
                        ) : (
                          <tr key={entry.id} className="border-b border-[rgba(212,175,55,0.04)] hover:bg-[rgba(212,175,55,0.02)]">
                            <td className="px-2 py-2">
                              {!entry.isConfirmed && (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(entry.id)}
                                  onChange={() => toggleSelect(entry.id)}
                                  className="rounded border-[rgba(212,175,55,0.3)] bg-transparent accent-[#D4AF37]"
                                />
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs text-[#94A3B8] font-[var(--font-inter)]">{format(new Date(entry.date), "MM/dd")}</td>
                            <td className="px-4 py-2 text-xs text-[#F1F5F9]">{entry.debitAccount}</td>
                            <td className="px-4 py-2 text-xs text-[#F1F5F9]">{entry.creditAccount}</td>
                            <td className="px-4 py-2 text-xs text-[#F1F5F9] text-right font-[var(--font-inter)] font-medium">¥{entry.amount.toLocaleString()}</td>
                            <td className="px-4 py-2 text-xs text-[#94A3B8] max-w-[200px] truncate">{entry.description}</td>
                            <td className="px-4 py-2 text-xs">
                              {entry.invoiceNumber ? (
                                <span className="text-[#94A3B8] font-[var(--font-inter)]">{entry.invoiceNumber}</span>
                              ) : (
                                <span className="text-amber-400" title="インボイス番号未登録">
                                  <AlertTriangle className="h-3.5 w-3.5 inline" />
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant="secondary" className="bg-[rgba(212,175,55,0.05)] text-[#94A3B8] border-none text-[10px]">{entry.client.name}</Badge>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => startEdit(entry)} className="h-7 w-7 rounded flex items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#64748B] hover:text-[#D4AF37] transition-colors" title="編集">
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => toggleConfirm(entry.id, entry.isConfirmed)}
                                  className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${entry.isConfirmed ? "bg-emerald-500/10 text-emerald-400" : "bg-[rgba(255,255,255,0.03)] text-[#64748B] hover:text-[#D4AF37]"}`}
                                  title={entry.isConfirmed ? "確定済み" : "確定する"}>
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDelete(entry.id)} className="h-7 w-7 rounded flex items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#64748B] hover:text-red-400 transition-colors" title="削除">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[rgba(212,175,55,0.06)]">
                  {periodEntries.map((entry) =>
                    editingId === entry.id ? (
                      <div key={entry.id} className="p-4 space-y-3 bg-[rgba(212,175,55,0.03)]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-[#64748B]">日付</label>
                            <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1.5 text-sm text-[#F1F5F9]" />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#64748B]">金額</label>
                            <input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1.5 text-sm text-[#F1F5F9]" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B]">借方</label>
                          <select value={editForm.debitAccount} onChange={(e) => setEditForm({ ...editForm, debitAccount: e.target.value })}
                            className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1.5 text-sm text-[#F1F5F9]">
                            {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B]">貸方</label>
                          <select value={editForm.creditAccount} onChange={(e) => setEditForm({ ...editForm, creditAccount: e.target.value })}
                            className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1.5 text-sm text-[#F1F5F9]">
                            {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B]">摘要</label>
                          <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1.5 text-sm text-[#F1F5F9]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B]">登録番号</label>
                          <input type="text" value={editForm.invoiceNumber} onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                            placeholder="T0000000000000"
                            className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1.5 text-sm text-[#F1F5F9]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B]">メモ</label>
                          <textarea value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                            rows={2} placeholder="備考やメモ"
                            className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.15)] rounded px-2 py-1.5 text-sm text-[#F1F5F9] resize-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(entry.id)} className="flex-1 py-2 rounded bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] text-sm font-semibold">保存</button>
                          <button onClick={cancelEdit} className="flex-1 py-2 rounded bg-[#334155] text-[#F1F5F9] text-sm">キャンセル</button>
                        </div>
                      </div>
                    ) : (
                      <div key={entry.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {!entry.isConfirmed && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(entry.id)}
                                onChange={() => toggleSelect(entry.id)}
                                className="rounded border-[rgba(212,175,55,0.3)] bg-transparent accent-[#D4AF37]"
                              />
                            )}
                            <div>
                              <span className="text-xs text-[#94A3B8] font-[var(--font-inter)]">{format(new Date(entry.date), "MM/dd")}</span>
                              <span className="text-xs text-[#64748B] ml-2">{entry.client.name}</span>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-[#F1F5F9] font-[var(--font-inter)]">¥{entry.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <span className="text-[#D4AF37]">{entry.debitAccount}</span>
                          <span className="text-[#475569]">/</span>
                          <span className="text-[#94A3B8]">{entry.creditAccount}</span>
                        </div>
                        <p className="text-xs text-[#64748B] mb-1 truncate">{entry.description}</p>
                        {entry.invoiceNumber ? (
                          <p className="text-[10px] text-[#64748B] mb-2 font-[var(--font-inter)]">登録番号: {entry.invoiceNumber}</p>
                        ) : (
                          <p className="text-[10px] text-amber-400 mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />インボイス番号未登録
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(entry)} className="text-xs text-[#64748B] hover:text-[#D4AF37] flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />編集
                          </button>
                          <button onClick={() => toggleConfirm(entry.id, entry.isConfirmed)}
                            className={`text-xs flex items-center gap-1 ${entry.isConfirmed ? "text-emerald-400" : "text-[#64748B] hover:text-[#D4AF37]"}`}>
                            <Check className="h-3 w-3" />{entry.isConfirmed ? "確定済" : "確定"}
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="text-xs text-[#64748B] hover:text-red-400 flex items-center gap-1">
                            <Trash2 className="h-3 w-3" />削除
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[rgba(30,41,59,0.6)] border border-[rgba(212,175,55,0.08)] text-sm text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[rgba(212,175,55,0.2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            前へ
          </button>
          <span className="text-sm text-[#94A3B8] font-[var(--font-inter)]">
            {page} / {totalPages} ページ
            <span className="text-[#64748B] ml-2">(全{total}件)</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[rgba(30,41,59,0.6)] border border-[rgba(212,175,55,0.08)] text-sm text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[rgba(212,175,55,0.2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            次へ
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
