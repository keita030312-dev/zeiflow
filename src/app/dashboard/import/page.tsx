"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Plus, Loader2 } from "lucide-react";
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

const ACCOUNTS = [
  "現金", "当座預金", "普通預金", "売掛金", "商品", "前払費用", "建物", "車両運搬具", "備品",
  "買掛金", "未払金", "未払費用", "預り金", "借入金",
  "売上高", "受取利息", "雑収入",
  "仕入高", "給料手当", "法定福利費", "旅費交通費", "通信費", "消耗品費", "水道光熱費",
  "地代家賃", "保険料", "修繕費", "広告宣伝費", "接待交際費", "会議費", "租税公課",
  "減価償却費", "支払手数料", "雑費", "新聞図書費", "外注費", "福利厚生費", "荷造運賃", "車両費", "リース料",
];

interface PreviewEntry {
  _key: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  amount: string;
  taxRate: string;
  taxAmount: string;
  description: string;
  memo: string;
}

export default function ImportPage() {
  const [tab, setTab] = useState<"csv" | "statement">("csv");

  // --- CSV tab state ---
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors?: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Statement tab state ---
  const [stmtClient, setStmtClient] = useState("");
  const [stmtType, setStmtType] = useState<"bank" | "credit">("bank");
  const [stmtStep, setStmtStep] = useState<"upload" | "preview" | "done">("upload");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewEntry[]>([]);
  const [stmtResult, setStmtResult] = useState<{ imported: number; errors?: string[] } | null>(null);
  const stmtFileRef = useRef<HTMLInputElement>(null);
  const [stmtFileName, setStmtFileName] = useState("");

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {});
  }, []);

  // --- CSV handlers ---
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

  // --- Statement handlers ---
  async function handleExtract(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !stmtClient) return;
    setStmtFileName(file.name);
    setExtracting(true);
    setPreviewRows([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", stmtClient);
      formData.append("statementType", stmtType);
      const res = await fetch("/api/import/statement", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && Array.isArray(data.transactions)) {
        if (data.transactions.length === 0) {
          toast.warning("取引データが見つかりませんでした");
        } else {
          const rows: PreviewEntry[] = data.transactions.map(
            (t: {
              date: string; debitAccount: string; creditAccount: string;
              amount: number; taxRate: number | null; taxAmount: number | null; description: string; memo: string;
            }, i: number) => ({
              _key: String(i),
              date: t.date,
              debitAccount: t.debitAccount,
              creditAccount: t.creditAccount,
              amount: String(t.amount),
              taxRate: t.taxRate != null ? String(t.taxRate) : "",
              taxAmount: t.taxAmount != null ? String(t.taxAmount) : "",
              description: t.description,
              memo: t.memo || "",
            })
          );
          setPreviewRows(rows);
          setStmtStep("preview");
          toast.success(`${data.transactions.length}件の取引を抽出しました。内容を確認してください。`);
        }
      } else {
        toast.error(data.error || "抽出に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setExtracting(false);
      if (stmtFileRef.current) stmtFileRef.current.value = "";
    }
  }

  function updateRow(key: string, field: keyof PreviewEntry, value: string) {
    setPreviewRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  function deleteRow(key: string) {
    setPreviewRows((prev) => prev.filter((r) => r._key !== key));
  }

  function addRow() {
    const key = String(Date.now());
    setPreviewRows((prev) => [
      ...prev,
      { _key: key, date: "", debitAccount: ACCOUNTS[0], creditAccount: ACCOUNTS[0], amount: "", taxRate: "", taxAmount: "", description: "", memo: "" },
    ]);
  }

  async function handleSave() {
    const invalid = previewRows.find((row) => {
      const amount = Number(row.amount);
      const hasTaxAmount = row.taxAmount !== "";
      const taxAmount = hasTaxAmount ? Number(row.taxAmount) : 0;
      return (
        !row.date ||
        !row.debitAccount ||
        !row.creditAccount ||
        !row.description.trim() ||
        !Number.isInteger(amount) ||
        amount <= 0 ||
        (hasTaxAmount &&
          (!Number.isInteger(taxAmount) || taxAmount < 0 || taxAmount > amount))
      );
    });
    if (invalid) {
      toast.error("日付・勘定科目・金額・税額・摘要を確認してください");
      return;
    }

    const valid = previewRows.filter((r) => r.date && r.amount && Number(r.amount) > 0);
    if (valid.length === 0) {
      toast.error("有効な取引が1件もありません");
      return;
    }
    setSaving(true);
    try {
      const transactions = valid.map((r) => ({
        date: r.date,
        description: r.description,
        amount: Number(r.amount),
        debitAccount: r.debitAccount,
        creditAccount: r.creditAccount,
        taxRate: r.taxRate !== "" ? Number(r.taxRate) : null,
        taxAmount: r.taxAmount !== "" ? Number(r.taxAmount) : null,
        memo: r.memo,
      }));
      const res = await fetch("/api/import/statement/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: stmtClient, transactions }),
      });
      const data = await res.json();
      if (res.ok) {
        setStmtResult({ imported: data.imported, errors: data.errors });
        setStmtStep("done");
        toast.success(`${data.imported}件の仕訳を登録しました`);
      } else {
        toast.error(data.error || "保存に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  function resetStatement() {
    setStmtStep("upload");
    setPreviewRows([]);
    setStmtResult(null);
    setStmtFileName("");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#F1F5F9]">インポート</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          CSVまたは通帳・クレカ明細から仕訳を一括登録します
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-[rgba(30,41,59,0.6)] border border-[rgba(212,175,55,0.08)] rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("csv")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "csv"
              ? "bg-[rgba(212,175,55,0.15)] text-[#D4AF37] border border-[rgba(212,175,55,0.3)]"
              : "text-[#94A3B8] hover:text-[#F1F5F9]"
          }`}
        >
          CSV
        </button>
        <button
          onClick={() => setTab("statement")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "statement"
              ? "bg-[rgba(212,175,55,0.15)] text-[#D4AF37] border border-[rgba(212,175,55,0.3)]"
              : "text-[#94A3B8] hover:text-[#F1F5F9]"
          }`}
        >
          通帳・クレカ明細（PDF/画像）
        </button>
      </div>

      {/* ===== CSV TAB ===== */}
      {tab === "csv" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#D4AF37]" />
                CSVインポート
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
      )}

      {/* ===== STATEMENT TAB ===== */}
      {tab === "statement" && (
        <div className="space-y-6">
          {/* Step 1: Upload */}
          {stmtStep === "upload" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card border-[rgba(212,175,55,0.08)]">
                <CardHeader>
                  <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
                    <Upload className="h-4 w-4 text-[#D4AF37]" />
                    明細をアップロード
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">顧客</Label>
                    <Select value={stmtClient} onValueChange={(v) => v && setStmtClient(v)}>
                      <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]">
                        <SelectValue placeholder="顧客を選択...">
                          {clients.find((c) => c.id === stmtClient)?.name || "顧客を選択..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}（{c.code}）</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">明細の種類</Label>
                    <div className="flex gap-3">
                      {([
                        { value: "bank", label: "通帳・銀行明細", sub: "貸方: 普通預金" },
                        { value: "credit", label: "クレカ利用明細", sub: "貸方: 未払金" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setStmtType(opt.value)}
                          className={`flex-1 rounded-xl border p-3 text-left transition-all ${
                            stmtType === opt.value
                              ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.05)]"
                              : "border-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.2)]"
                          }`}
                        >
                          <p className="text-sm font-medium text-[#F1F5F9]">{opt.label}</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    onClick={() => stmtClient && !extracting && stmtFileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                      stmtClient
                        ? "border-[rgba(212,175,55,0.2)] hover:border-[rgba(212,175,55,0.4)] cursor-pointer"
                        : "border-[rgba(100,116,139,0.2)] cursor-not-allowed"
                    }`}
                  >
                    {extracting ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 text-[#D4AF37] animate-spin" />
                        <p className="text-sm text-[#94A3B8]">AIが明細を読み取り中...</p>
                        <p className="text-xs text-[#64748B]">PDFは10〜20秒かかる場合があります</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-[#D4AF37] mx-auto mb-3 opacity-60" />
                        <p className="text-sm text-[#F1F5F9] font-medium mb-1">
                          {stmtFileName || "ファイルを選択"}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {stmtClient ? "PDF・JPEG・PNG・WEBP に対応 / 最大20MB" : "先に顧客を選択してください"}
                        </p>
                      </>
                    )}
                    <input
                      ref={stmtFileRef}
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleExtract}
                      className="hidden"
                      disabled={!stmtClient || extracting}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-[rgba(212,175,55,0.08)]">
                <CardHeader>
                  <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#D4AF37]" />
                    使い方
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-[#94A3B8]">
                  <div className="space-y-3">
                    {[
                      { step: "1", title: "ファイルをアップロード", body: "通帳や明細書のPDFまたはスキャン画像をアップロードします。複数ページのPDFにも対応しています。" },
                      { step: "2", title: "AIが自動で仕訳に変換", body: "取引日・金額・摘要を読み取り、勘定科目を自動分類します。通帳なら借方に費用科目・貸方に普通預金を設定します。" },
                      { step: "3", title: "内容を確認して登録", body: "抽出結果をテーブルで確認・編集できます。不要な行は削除、追加も可能です。" },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[rgba(212,175,55,0.15)] text-[#D4AF37] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {item.step}
                        </div>
                        <div>
                          <p className="text-[#F1F5F9] font-medium text-sm">{item.title}</p>
                          <p className="text-[#64748B] text-xs mt-0.5 leading-relaxed">{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-[rgba(212,175,55,0.06)]">
                    <p className="text-xs text-[#475569] leading-relaxed">
                      対応形式: PDF（複数ページ可）・JPEG・PNG・WEBP<br />
                      AIの分類は目安です。登録前に必ず内容を確認してください。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Preview */}
          {stmtStep === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#F1F5F9]">抽出結果の確認</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {previewRows.length}件を抽出しました。内容を確認・編集してから「仕訳を登録」してください。
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={resetStatement}
                    className="px-3 py-1.5 rounded-md bg-[rgba(30,41,59,0.6)] border border-[rgba(212,175,55,0.08)] text-[#94A3B8] text-xs hover:text-[#F1F5F9] transition-colors"
                  >
                    やり直し
                  </button>
                  <button
                    onClick={addRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[rgba(30,41,59,0.6)] border border-[rgba(212,175,55,0.08)] text-[#94A3B8] text-xs hover:text-[#F1F5F9] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    行を追加
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || previewRows.length === 0}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    {saving ? "登録中..." : `${previewRows.length}件を仕訳登録`}
                  </button>
                </div>
              </div>

              <Card className="glass-card border-[rgba(212,175,55,0.08)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[rgba(212,175,55,0.08)] bg-[rgba(212,175,55,0.02)]">
                        <th className="text-left text-[#64748B] px-3 py-2 w-[110px]">日付</th>
                        <th className="text-left text-[#64748B] px-3 py-2">借方</th>
                        <th className="text-left text-[#64748B] px-3 py-2">貸方</th>
                        <th className="text-right text-[#64748B] px-3 py-2 w-[90px]">金額</th>
                        <th className="text-center text-[#64748B] px-2 py-2 w-[70px]">税率</th>
                        <th className="text-right text-[#64748B] px-2 py-2 w-[90px]">税額</th>
                        <th className="text-left text-[#64748B] px-3 py-2">摘要</th>
                        <th className="text-left text-[#64748B] px-3 py-2 w-[100px]">メモ</th>
                        <th className="px-2 py-2 w-[36px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={row._key} className="border-b border-[rgba(212,175,55,0.04)] hover:bg-[rgba(212,175,55,0.02)]">
                          <td className="px-3 py-1.5">
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => updateRow(row._key, "date", e.target.value)}
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.1)] rounded px-1.5 py-1 text-[#F1F5F9] text-xs"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              value={row.debitAccount}
                              onChange={(e) => updateRow(row._key, "debitAccount", e.target.value)}
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.1)] rounded px-1.5 py-1 text-[#F1F5F9] text-xs"
                            >
                              {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              value={row.creditAccount}
                              onChange={(e) => updateRow(row._key, "creditAccount", e.target.value)}
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.1)] rounded px-1.5 py-1 text-[#F1F5F9] text-xs"
                            >
                              {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) => updateRow(row._key, "amount", e.target.value)}
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.1)] rounded px-1.5 py-1 text-[#F1F5F9] text-xs text-right"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={row.taxRate}
                              onChange={(e) => updateRow(row._key, "taxRate", e.target.value)}
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.1)] rounded px-1 py-1 text-[#F1F5F9] text-xs"
                            >
                              <option value="">-</option>
                              <option value="0.1">10%</option>
                              <option value="0.08">8%</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={row.taxAmount}
                              onChange={(e) => updateRow(row._key, "taxAmount", e.target.value)}
                              placeholder="0"
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.1)] rounded px-1.5 py-1 text-[#F1F5F9] text-xs text-right"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateRow(row._key, "description", e.target.value)}
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.1)] rounded px-1.5 py-1 text-[#F1F5F9] text-xs"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={row.memo}
                              onChange={(e) => updateRow(row._key, "memo", e.target.value)}
                              placeholder="備考"
                              className="w-full bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.1)] rounded px-1.5 py-1 text-[#64748B] text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => deleteRow(row._key)}
                              className="h-6 w-6 rounded flex items-center justify-center text-[#475569] hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Done */}
          {stmtStep === "done" && stmtResult && (
            <div className="max-w-md space-y-4">
              {stmtResult.imported > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-400 font-medium">{stmtResult.imported}件の仕訳を登録しました</p>
                    <p className="text-xs text-green-400/70 mt-0.5">仕訳管理から確認・確定できます</p>
                  </div>
                </div>
              )}
              {stmtResult.errors && stmtResult.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400">エラー {stmtResult.errors.length}件</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {stmtResult.errors.map((err, i) => <p key={i} className="text-[10px] text-red-300">{err}</p>)}
                  </div>
                </div>
              )}
              <button
                onClick={resetStatement}
                className="px-5 py-2 rounded-md bg-[rgba(30,41,59,0.6)] border border-[rgba(212,175,55,0.08)] text-[#94A3B8] text-sm hover:text-[#F1F5F9] transition-colors"
              >
                別の明細をインポート
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
