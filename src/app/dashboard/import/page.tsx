"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Client {
  id: string;
  code: string;
  name: string;
}

export default function ImportPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors?: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {});
  }, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", selectedClient);

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setResult({ imported: data.imported, errors: data.errors });
        toast.success(`${data.imported}件の仕訳をインポートしました`);
      } else {
        toast.error(data.error);
        if (data.errors) setResult({ imported: 0, errors: data.errors });
      }
    } catch {
      toast.error("インポートに失敗しました");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F1F5F9]">CSVインポート</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          CSVファイルから仕訳を一括登録します
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardHeader>
            <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
              <Upload className="h-4 w-4 text-[#D4AF37]" />
              インポート
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">顧客を選択</Label>
              <Select value={selectedClient} onValueChange={(v) => v && setSelectedClient(v)}>
                <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]">
                  <SelectValue placeholder="顧客を選択...">
                    {clients.find((c) => c.id === selectedClient)?.name || "顧客を選択..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}（{c.code}）</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              onClick={() => selectedClient && !uploading && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                selectedClient ? "border-[rgba(212,175,55,0.2)] hover:border-[rgba(212,175,55,0.4)]" : "border-[rgba(100,116,139,0.2)] cursor-not-allowed"
              }`}
            >
              <Upload className="h-8 w-8 text-[#D4AF37] mx-auto mb-3 opacity-60" />
              <p className="text-sm text-[#F1F5F9] font-medium mb-1">
                {uploading ? "インポート中..." : "CSVファイルを選択"}
              </p>
              <p className="text-xs text-[#64748B]">
                {selectedClient ? "クリックしてファイルを選択" : "先に顧客を選択してください"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
                disabled={!selectedClient || uploading}
              />
            </div>

            {/* Result */}
            {result && (
              <div className="space-y-3">
                {result.imported > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400">{result.imported}件をインポートしました</span>
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400">エラー {result.errors.length}件</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-[10px] text-red-300">{err}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Format Guide */}
        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardHeader>
            <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#D4AF37]" />
              CSVフォーマット
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#94A3B8]">以下のヘッダーを含むCSVファイルをアップロードしてください。</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(212,175,55,0.1)]">
                    <th className="text-left py-2 px-3 text-[#D4AF37] text-xs">列名</th>
                    <th className="text-center py-2 px-3 text-[#D4AF37] text-xs">必須</th>
                    <th className="text-left py-2 px-3 text-[#D4AF37] text-xs">例</th>
                  </tr>
                </thead>
                <tbody className="text-[#CBD5E1] text-xs">
                  {[
                    ["日付", true, "2026-04-01"],
                    ["借方科目", true, "消耗品費"],
                    ["貸方科目", true, "現金"],
                    ["金額", true, "1080"],
                    ["摘要", false, "コンビニ 文具購入"],
                    ["税額", false, "80"],
                    ["登録番号", false, "T1234567890123"],
                    ["メモ", false, "備考"],
                  ].map(([col, req, ex]) => (
                    <tr key={col as string} className="border-b border-[rgba(255,255,255,0.04)]">
                      <td className="py-2 px-3 font-medium">{col as string}</td>
                      <td className="py-2 px-3 text-center">{req ? <span className="text-[#D4AF37]">必須</span> : <span className="text-[#475569]">任意</span>}</td>
                      <td className="py-2 px-3 text-[#64748B]">{ex as string}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-lg bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.1)]">
              <p className="text-[10px] text-[#94A3B8] font-mono">
                日付,借方科目,貸方科目,金額,摘要,税額,登録番号<br />
                2026-04-01,消耗品費,現金,1080,コンビニ 文具,80,T1234567890123<br />
                2026-04-02,旅費交通費,現金,500,電車代,,
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
