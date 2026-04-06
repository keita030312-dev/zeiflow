"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Building2,
  User,
  FileText,
  Camera,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Client {
  id: string;
  code: string;
  name: string;
  nameKana?: string;
  clientType: string;
  fiscalYearStart: number;
  taxType: string;
  invoiceRegNumber?: string;
  notes?: string;
  _count: { journalEntries: number; receipts: number };
}

const emptyForm = {
  code: "",
  name: "",
  nameKana: "",
  clientType: "CORPORATE",
  fiscalYearStart: 4,
  taxType: "STANDARD",
  invoiceRegNumber: "",
  notes: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const [editForm, setEditForm] = useState(emptyForm);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        setClients(await res.json());
      }
    } catch {
      toast.error("顧客一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("顧客を登録しました");
        setIsOpen(false);
        setForm(emptyForm);
        fetchClients();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("登録に失敗しました");
    }
  }

  function startEditing(client: Client) {
    setEditingId(client.id);
    setEditForm({
      code: client.code,
      name: client.name,
      nameKana: client.nameKana || "",
      clientType: client.clientType,
      fiscalYearStart: client.fiscalYearStart,
      taxType: client.taxType,
      invoiceRegNumber: client.invoiceRegNumber || "",
      notes: client.notes || "",
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      if (res.ok) {
        toast.success("顧客情報を更新しました");
        setEditingId(null);
        setEditForm(emptyForm);
        fetchClients();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("顧客を削除しました");
        setDeleteConfirmId(null);
        fetchClients();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = clients.filter(
    (c) =>
      c.name.includes(search) ||
      c.code.includes(search) ||
      (c.nameKana && c.nameKana.includes(search))
  );

  const taxTypeLabel: Record<string, string> = {
    STANDARD: "本則課税",
    SIMPLIFIED: "簡易課税",
    EXEMPT: "免税",
  };

  function ClientForm({
    formData,
    setFormData,
    onSubmit,
    submitLabel,
    submitting,
  }: {
    formData: typeof emptyForm;
    setFormData: (f: typeof emptyForm) => void;
    onSubmit: (e: React.FormEvent) => void;
    submitLabel: string;
    submitting?: boolean;
  }) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">顧客コード</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
              placeholder="C001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">区分</Label>
            <Select
              value={formData.clientType}
              onValueChange={(v) => v && setFormData({ ...formData, clientType: v })}
            >
              <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                <SelectItem value="CORPORATE">法人</SelectItem>
                <SelectItem value="INDIVIDUAL">個人</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">顧客名</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
            placeholder="株式会社サンプル"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">フリガナ</Label>
          <Input
            value={formData.nameKana}
            onChange={(e) => setFormData({ ...formData, nameKana: e.target.value })}
            className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
            placeholder="カブシキガイシャサンプル"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">決算月</Label>
            <Select
              value={String(formData.fiscalYearStart)}
              onValueChange={(v) => v && setFormData({ ...formData, fiscalYearStart: Number(v) })}
            >
              <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i + 1}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">課税区分</Label>
            <Select
              value={formData.taxType}
              onValueChange={(v) => v && setFormData({ ...formData, taxType: v })}
            >
              <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                <SelectItem value="STANDARD">本則課税</SelectItem>
                <SelectItem value="SIMPLIFIED">簡易課税</SelectItem>
                <SelectItem value="EXEMPT">免税</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">インボイス登録番号</Label>
          <Input
            value={formData.invoiceRegNumber}
            onChange={(e) => setFormData({ ...formData, invoiceRegNumber: e.target.value })}
            className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
            placeholder="T1234567890123"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">備考</Label>
          <Input
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
            placeholder="メモ"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold disabled:opacity-40"
        >
          {submitting ? "処理中..." : submitLabel}
        </Button>
      </form>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold text-[#F1F5F9]"
          >
            顧客管理
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            顧客の登録・管理を行います
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] hover:from-[#E8D48B] hover:to-[#D4AF37] cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規顧客
          </DialogTrigger>
          <DialogContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)] text-[#F1F5F9] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#F1F5F9]">
                新規顧客登録
              </DialogTitle>
            </DialogHeader>
            <ClientForm
              formData={form}
              setFormData={setForm}
              onSubmit={handleSubmit}
              submitLabel="登録"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="顧客名・コードで検索..."
          className="pl-10 bg-[rgba(30,41,59,0.6)] border-[rgba(212,175,55,0.08)] text-[#F1F5F9] placeholder:text-[#475569] max-w-md"
        />
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#94A3B8]">
          読み込み中...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
          <Users className="h-12 w-12 mb-4 opacity-30" />
          <p>顧客が登録されていません</p>
          <p className="text-sm mt-1">「新規顧客」ボタンから登録してください</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
            {filtered.map((client) => (
              <div key={client.id}>
                {editingId === client.id ? (
                  /* Inline Edit Form */
                  <Card className="glass-card border-[rgba(212,175,55,0.25)]">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[#F1F5F9]">顧客編集</h3>
                        <button
                          onClick={cancelEditing}
                          className="text-[#64748B] hover:text-[#F1F5F9] transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <ClientForm
                        formData={editForm}
                        setFormData={setEditForm}
                        onSubmit={handleUpdate}
                        submitLabel="更新"
                        submitting={saving}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  /* Display Card */
                  <Card className="glass-card border-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)] transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.08)]">
                            {client.clientType === "CORPORATE" ? (
                              <Building2 className="h-4 w-4 text-[#D4AF37]" />
                            ) : (
                              <User className="h-4 w-4 text-[#D4AF37]" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#F1F5F9] text-sm">
                              {client.name}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {client.code}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border-none text-[10px]"
                          >
                            {taxTypeLabel[client.taxType] || client.taxType}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        {client.invoiceRegNumber ? (
                          <>
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-[rgba(34,197,94,0.1)] text-[#22C55E]"
                            >
                              インボイス登録済
                            </span>
                            <span className="text-xs text-[#94A3B8]">
                              {client.invoiceRegNumber}
                            </span>
                          </>
                        ) : (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-[rgba(100,116,139,0.1)] text-[#64748B]"
                          >
                            未登録
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#64748B] mb-3">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          仕訳 {client._count.journalEntries}件
                        </span>
                        <span className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          レシート {client._count.receipts}件
                        </span>
                        <span>決算 {client.fiscalYearStart}月</span>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[rgba(212,175,55,0.06)]">
                        <Button
                          onClick={() => startEditing(client)}
                          variant="secondary"
                          size="sm"
                          className="bg-[#334155] text-[#F1F5F9] hover:bg-[#475569] flex items-center gap-1.5 text-xs"
                        >
                          <Pencil className="h-3 w-3" />
                          編集
                        </Button>
                        {deleteConfirmId === client.id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleDelete(client.id)}
                              disabled={deleting}
                              variant="secondary"
                              size="sm"
                              className="bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/20 text-xs"
                            >
                              {deleting ? "削除中..." : "本当に削除"}
                            </Button>
                            <Button
                              onClick={() => setDeleteConfirmId(null)}
                              variant="secondary"
                              size="sm"
                              className="bg-[#334155] text-[#94A3B8] hover:bg-[#475569] text-xs"
                            >
                              キャンセル
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setDeleteConfirmId(client.id)}
                            variant="secondary"
                            size="sm"
                            className="bg-[#334155] text-red-400 hover:bg-red-900/30 flex items-center gap-1.5 text-xs"
                          >
                            <Trash2 className="h-3 w-3" />
                            削除
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
