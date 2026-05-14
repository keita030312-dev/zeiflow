"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Upload,
  Trash2,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Client {
  id: string;
  code: string;
  name: string;
}

interface KnowledgeFile {
  id: string;
  name: string;
  mimeType: string;
  fileSize: number;
  clientId: string | null;
  createdAt: string;
  client: { name: string; code: string } | null;
}

export default function KnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedClient, setSelectedClient] = useState("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetchFiles(), fetchClients()]);
  }, []);

  async function fetchFiles() {
    try {
      const res = await fetch("/api/knowledge");
      if (res.ok) setFiles(await res.json());
    } catch {
      toast.error("ナレッジの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
    } catch {
      toast.error("顧客一覧の取得に失敗しました");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedClient !== "all") {
        formData.append("clientId", selectedClient);
      }

      const res = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.name} をアップロードしました（${data.textLength.toLocaleString()}文字抽出）`);
        fetchFiles();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("ナレッジを削除しました");
        setDeleteConfirmId(null);
        fetchFiles();
      }
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  const mimeLabel: Record<string, string> = {
    "application/pdf": "PDF",
    "text/csv": "CSV",
    "text/plain": "テキスト",
    "text/tab-separated-values": "TSV",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">
            仕訳ナレッジ
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            仕訳帳や科目ルールをアップロードすると、AIがそのルールに従って仕訳します
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="glass-card border-[rgba(212,175,55,0.08)] mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">適用範囲</Label>
              <Select value={selectedClient} onValueChange={(v) => v && setSelectedClient(v)}>
                <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] max-w-xs">
                  <SelectValue>
                    {selectedClient === "all" ? "事務所全体（全顧問先に適用）" : `${clients.find((c) => c.id === selectedClient)?.name || ""}のみ`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                  <SelectItem value="all">事務所全体（全顧問先に適用）</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}（{c.code}）のみ
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-[rgba(212,175,55,0.15)] rounded-xl p-6 text-center cursor-pointer hover:border-[rgba(212,175,55,0.3)] transition-colors"
            >
              <Upload className="h-8 w-8 text-[#D4AF37] mx-auto mb-3 opacity-60" />
              <p className="text-sm text-[#F1F5F9] font-medium mb-1">
                {uploading ? "アップロード中..." : "PDF・CSV・テキストファイルをアップロード"}
              </p>
              <p className="text-xs text-[#64748B]">
                仕訳帳、勘定科目表、経理ルール等
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt,.tsv"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {loading ? (
        <div className="text-center py-12 text-[#94A3B8]">読み込み中...</div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#64748B]">
          <BookOpen className="h-12 w-12 mb-4 opacity-30" />
          <p>ナレッジがまだ登録されていません</p>
          <p className="text-sm mt-1">仕訳帳のPDFやCSVをアップロードしてください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((f) => (
            <Card key={f.id} className="glass-card border-[rgba(212,175,55,0.08)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.08)]">
                      <FileText className="h-4 w-4 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F1F5F9]">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border-none text-[10px]">
                          {mimeLabel[f.mimeType] || f.mimeType}
                        </Badge>
                        <span className="text-[10px] text-[#64748B]">{formatSize(f.fileSize)}</span>
                        <span className="text-[10px] text-[#64748B]">
                          {new Date(f.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.client ? (
                      <Badge variant="secondary" className="bg-[rgba(34,197,94,0.1)] text-[#22C55E] border-none text-[10px]">
                        {f.client.name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-[rgba(59,130,246,0.1)] text-[#3B82F6] border-none text-[10px]">
                        全体
                      </Badge>
                    )}
                    {deleteConfirmId === f.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => handleDelete(f.id)}
                          variant="secondary"
                          size="sm"
                          className="bg-red-900/30 text-red-400 hover:bg-red-900/50 text-xs h-7 px-2"
                        >
                          削除
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirmId(null)}
                          variant="secondary"
                          size="sm"
                          className="bg-[#334155] text-[#94A3B8] text-xs h-7 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setDeleteConfirmId(f.id)}
                        variant="secondary"
                        size="sm"
                        className="bg-[#334155] text-red-400 hover:bg-red-900/30 h-7 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
