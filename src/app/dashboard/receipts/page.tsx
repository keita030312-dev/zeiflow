"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  X,
  FileText,
  Eye,
  Edit3,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { readJsonOrThrow } from "@/lib/api-response";
import { MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/upload-limits";
import { STD_ACCOUNTS } from "@/lib/accounts";
import {
  TAX_CATEGORY_OPTIONS,
  splitLegacyTaxCategory,
  type AccountingMethod,
} from "@/lib/tax-categories";
import { ConfidenceBadge } from "@/components/confidence-badge";

interface Client {
  id: string;
  code: string;
  name: string;
  accountingMethod?: "TAX_INCLUSIVE" | "TAX_EXCLUSIVE";
}

interface ReceiptResult {
  ocr: {
    storeName: string;
    date: string;
    total: number;
    items: { name: string; amount: number }[];
    invoiceNumber?: string;
    dueDate?: string | null;
    documentNo?: string | null;
    purpose?: string | null;
    fieldConfidence?: {
      storeName?: number;
      date?: number;
      total?: number;
      taxTotal?: number;
      invoiceNumber?: number;
      paymentMethod?: number;
      dueDate?: number;
      documentNo?: number;
      purpose?: number;
    };
  };
  classification: {
    debitAccount: string;
    creditAccount: string;
    amount: number;
    taxRate?: number | null;
    description: string;
    confidence: number;
  };
  journalEntry?: {
    id: string;
  };
  allResults?: {
    ocr: ReceiptResult["ocr"];
    classification: ReceiptResult["classification"];
  }[];
  journalEntries?: {
    id: string;
    taxCategory?: string | null;
    debitTaxCategory?: string | null;
    creditTaxCategory?: string | null;
  }[];
}

interface BatchJournalRow {
  id: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  debitTaxCategory: string;
  creditTaxCategory: string;
  description: string;
  invoiceNumber: string;
  memo: string;
}

interface ReceiptRecord {
  id: string;
  imagePath: string;
  imageMime: string | null;
  status: string;
  ocrRaw: string | null;
  documentKind?: "RECEIPT" | "INVOICE" | "OFFICIAL_RECEIPT";
  uploadedAt: string;
  client: { name: string; code: string };
  journalEntries: {
    id: string;
    clientId?: string;
    date: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    taxAmount?: number;
    taxRate?: number | null;
    taxCategory?: string | null;
    debitTaxCategory?: string | null;
    creditTaxCategory?: string | null;
    description: string;
    invoiceNumber?: string;
    memo?: string;
    isConfirmed: boolean;
  }[];
}

export default function ReceiptsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [customAccounts, setCustomAccounts] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [uploadDocumentKind, setUploadDocumentKind] = useState<
    "RECEIPT" | "INVOICE" | "OFFICIAL_RECEIPT"
  >("RECEIPT");
  const [preview, setPreview] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Multiple upload state
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchRows, setBatchRows] = useState<BatchJournalRow[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);

  // Receipt history state
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  // Bulk select state
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Filter state
  const [filterClient, setFilterClient] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Retry state
  const [retryingReceiptId, setRetryingReceiptId] = useState<string | null>(null);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Editing state
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    debitAccount: "",
    creditAccount: "",
    amount: 0,
    debitTaxCategory: "",
    creditTaxCategory: "",
    description: "",
    invoiceNumber: "",
    memo: "",
  });

  // Result editing state
  const [editingResult, setEditingResult] = useState(false);
  const [resultEditForm, setResultEditForm] = useState({
    date: "",
    debitAccount: "",
    creditAccount: "",
    amount: 0,
    description: "",
    invoiceNumber: "",
    memo: "",
  });

  const fetchReceipts = useCallback(async () => {
    setLoadingReceipts(true);
    try {
      const params = new URLSearchParams();
      if (filterClient) params.set("clientId", filterClient);
      if (filterMonth) params.set("month", filterMonth);
      const res = await fetch(`/api/receipts?${params}`);
      if (res.ok) {
        setReceipts(await res.json());
      }
    } catch {
      toast.error("レシート履歴の取得に失敗しました");
    } finally {
      setLoadingReceipts(false);
    }
  }, [filterClient, filterMonth]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(() => {});
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: { name: string; isActive: boolean }[]) =>
        setCustomAccounts(data.filter((a) => a.isActive).map((a) => a.name))
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // アップロード中にブラウザを閉じようとしたら警告
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (processing) {
        e.preventDefault();
        e.returnValue = "レシートを処理中です。ページを離れると処理が中断されます。";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [processing]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const f = new File([blob], `receipt-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setFiles((prev) => [...prev, f].slice(0, 5));
          setPreview(null);
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    const newFiles = Array.from(selected).filter((file) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        toast.error(`${file.name}: 対応外の形式です（JPG/PNG/WEBP/GIFのみ）`);
        return false;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name}: 10MB以下の画像を選択してください`);
        return false;
      }
      return true;
    });
    if (newFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const combined = [...files, ...newFiles].slice(0, 5); // 最大5枚
    if (files.length + newFiles.length > 5) {
      toast.error("アップロードは最大5枚までです");
    }
    setFiles(combined);
    if (combined.length === 1) {
      setPreview(URL.createObjectURL(combined[0]));
    } else {
      setPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setResult(null);
  }

  async function uploadSingleFile(file: File, quality: "fast" | "accurate" | "ultra" = "fast"): Promise<ReceiptResult | null> {
    const compressed = await compressImage(file);
    const formData = new FormData();
    formData.append("file", compressed);
    formData.append("clientId", selectedClient);
    formData.append("quality", quality);
    formData.append("documentKind", uploadDocumentKind);

    const res = await fetch("/api/receipts", {
      method: "POST",
      body: formData,
    });
    return await readJsonOrThrow<ReceiptResult>(res, "読み取りに失敗しました");
  }

  const [uploadQuality, setUploadQuality] = useState<"fast" | "accurate" | "ultra">("accurate");

  function methodOfClient(clientId: string | undefined): AccountingMethod {
    return (
      clients.find((c) => c.id === clientId)?.accountingMethod || "TAX_INCLUSIVE"
    );
  }

  function rowsFromResult(data: ReceiptResult): BatchJournalRow[] {
    const results = data.allResults?.length
      ? data.allResults
      : [{ ocr: data.ocr, classification: data.classification }];
    const entries = data.journalEntries?.length
      ? data.journalEntries
      : data.journalEntry
        ? [data.journalEntry]
        : [];

    return entries.flatMap((entry, index) => {
      const extracted = results[index];
      if (!extracted) return [];
      // OCR結果(単一taxRate)を借方/貸方税区分にプレフィル。
      // 顧客の経理方式(税込/税抜)に合わせた近似値で、税理士が確認して保存する
      const je = entry as {
        id: string;
        taxCategory?: string | null;
        debitTaxCategory?: string | null;
        creditTaxCategory?: string | null;
      };
      const cats = splitLegacyTaxCategory(
        {
          debitTaxCategory: je.debitTaxCategory,
          creditTaxCategory: je.creditTaxCategory,
          taxCategory: je.taxCategory,
          taxRate: extracted.classification.taxRate,
          creditAccount: extracted.classification.creditAccount,
        },
        methodOfClient(selectedClient),
      );
      return [{
        id: entry.id,
        date: extracted.ocr.date,
        debitAccount: extracted.classification.debitAccount,
        creditAccount: extracted.classification.creditAccount,
        amount: extracted.classification.amount,
        debitTaxCategory: cats.debit,
        creditTaxCategory: cats.credit,
        description: extracted.classification.description,
        invoiceNumber: extracted.ocr.invoiceNumber || "",
        memo: "",
      }];
    });
  }

  async function handleUpload(quality?: "fast" | "accurate" | "ultra") {
    const q = quality || uploadQuality;
    if (files.length === 0 || !selectedClient) {
      toast.error("顧客とファイルを選択してください");
      return;
    }

    setProcessing(true);
    setResult(null);
    setBatchRows([]);

    if (files.length === 1) {
      // Single file upload
      try {
        const data = await uploadSingleFile(files[0], q);
        if (data) {
          const rows = rowsFromResult(data);
          if (rows.length > 1) {
            setBatchRows(rows);
          } else {
            setResult(data);
          }
        }
        toast.success("レシートを読み取りました");
        fetchReceipts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("エラー: " + msg);
      } finally {
        setProcessing(false);
      }
    } else {
      // Multiple file upload - 2枚ずつ並列処理（精度とスピードのバランス）
      setUploadProgress({ current: 0, total: files.length });
      const allResults: PromiseSettledResult<ReceiptResult | null>[] = [];
      const BATCH_SIZE = 2;

      for (let batch = 0; batch < files.length; batch += BATCH_SIZE) {
        const batchFiles = files.slice(batch, batch + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batchFiles.map(async (file) => {
            return await uploadSingleFile(file, q);
          })
        );
        allResults.push(...batchResults);
        setUploadProgress({ current: Math.min(batch + BATCH_SIZE, files.length), total: files.length });
      }

      const successResults = allResults.filter(
        (r): r is PromiseFulfilledResult<ReceiptResult | null> =>
          r.status === "fulfilled" && r.value !== null,
      );
      const failedResults = allResults.filter((r) => r.status === "rejected");
      const successCount = successResults.length;
      const lastResult = successCount > 0 ? successResults[successCount - 1].value : null;
      const rows = successResults.flatMap((settled) => {
        const data = settled.value;
        return data ? rowsFromResult(data) : [];
      });

      if (failedResults.length > 0) {
        toast.error(`${failedResults.length}件の読み取りに失敗しました`);
      }

      setUploadProgress(null);
      setProcessing(false);

      if (successCount > 0) {
        toast.success(`${successCount}/${files.length} 件のレシートを処理しました`);
        if (rows.length > 0) {
          setBatchRows(rows);
        } else if (successCount === 1 && lastResult) {
          setResult(lastResult);
        }
        fetchReceipts();
      }
    }
  }

  function reset() {
    setFiles([]);
    setPreview(null);
    setResult(null);
    setBatchRows([]);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleReceiptSelect(id: string) {
    setSelectedReceipts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllReceipts() {
    setSelectedReceipts(new Set(receipts.map((r) => r.id)));
  }

  function deselectAllReceipts() {
    setSelectedReceipts(new Set());
  }

  async function bulkDeleteReceipts() {
    if (selectedReceipts.size === 0) return;
    if (!confirm(`${selectedReceipts.size}件のレシート画像を削除しますか？\n仕訳データは残ります。`)) return;

    setBulkDeleting(true);
    let deleted = 0;
    let failed = 0;
    for (const id of selectedReceipts) {
      try {
        const res = await fetch(`/api/receipts?id=${id}`, { method: "DELETE" });
        if (res.ok) deleted++;
        else failed++;
      } catch { failed++; }
    }
    if (failed > 0) {
      toast.error(`${deleted}件削除、${failed}件失敗しました`);
    } else {
      toast.success(`${deleted}件のレシートを削除しました`);
    }
    setSelectedReceipts(new Set());
    setBulkDeleting(false);
    fetchReceipts();
  }

  function documentKindLabel(kind?: string) {
    if (kind === "INVOICE") return "請求書";
    if (kind === "OFFICIAL_RECEIPT") return "領収書";
    return "レシート";
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[10px]">完了</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-500/10 text-blue-400 border-none text-[10px]">処理中</Badge>;
      case "ERROR":
        return <Badge className="bg-red-500/10 text-red-400 border-none text-[10px]">エラー</Badge>;
      default:
        return <Badge className="bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border-none text-[10px]">{status}</Badge>;
    }
  }

  function getStoreName(ocrRaw: string | null): string {
    if (!ocrRaw) return "-";
    try {
      const parsed = JSON.parse(ocrRaw);
      return parsed.storeName || "-";
    } catch {
      return "-";
    }
  }

  function startEditReceipt(receipt: ReceiptRecord) {
    const je = receipt.journalEntries[0];
    if (!je) return;
    setEditingReceiptId(receipt.id);
    const cats = splitLegacyTaxCategory(je, methodOfClient(je.clientId));
    setEditForm({
      date: je.date,
      debitAccount: je.debitAccount,
      creditAccount: je.creditAccount,
      amount: je.amount,
      debitTaxCategory: cats.debit,
      creditTaxCategory: cats.credit,
      description: je.description,
      invoiceNumber: je.invoiceNumber || "",
      memo: je.memo || "",
    });
  }

  async function saveReceiptEdit(journalId: string) {
    try {
      const res = await fetch("/api/journals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: journalId,
          date: editForm.date,
          debitAccount: editForm.debitAccount,
          creditAccount: editForm.creditAccount,
          amount: editForm.amount,
          debitTaxCategory: editForm.debitTaxCategory || null,
          creditTaxCategory: editForm.creditTaxCategory || null,
          description: editForm.description,
          memo: editForm.memo || undefined,
          invoiceNumber: editForm.invoiceNumber || undefined,
        }),
      });
      if (res.ok) {
        setEditingReceiptId(null);
        toast.success("仕訳を更新しました");
        fetchReceipts();
      } else {
        toast.error("更新に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    }
  }

  async function deleteJournalEntry(journalId: string) {
    if (!confirm("この仕訳を削除しますか？")) return;
    try {
      const res = await fetch(`/api/journals?id=${journalId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("仕訳を削除しました");
        fetchReceipts();
      } else {
        toast.error("削除に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    }
  }

  function startEditResult() {
    if (!result) return;
    setEditingResult(true);
    setResultEditForm({
      date: result.ocr.date,
      debitAccount: result.classification.debitAccount,
      creditAccount: result.classification.creditAccount,
      amount: result.classification.amount,
      description: result.classification.description,
      invoiceNumber: result.ocr.invoiceNumber || "",
      memo: "",
    });
  }

  async function saveResultEdit() {
    if (!result?.journalEntry?.id) return;
    try {
      const res = await fetch("/api/journals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: result.journalEntry.id,
          date: resultEditForm.date,
          debitAccount: resultEditForm.debitAccount,
          creditAccount: resultEditForm.creditAccount,
          amount: resultEditForm.amount,
          description: resultEditForm.description,
          memo: resultEditForm.memo || undefined,
          invoiceNumber: resultEditForm.invoiceNumber || undefined,
        }),
      });
      if (res.ok) {
        setEditingResult(false);
        toast.success("仕訳を更新しました");
        fetchReceipts();
      } else {
        toast.error("更新に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    }
  }

  function updateBatchRow(
    id: string,
    field: keyof Omit<BatchJournalRow, "id">,
    value: string | number,
  ) {
    setBatchRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  async function saveBatchRows() {
    if (batchRows.length === 0) return;
    const invalid = batchRows.find(
      (row) =>
        !row.date ||
        !row.debitAccount ||
        !row.creditAccount ||
        !row.description.trim() ||
        !Number.isInteger(row.amount) ||
        row.amount <= 0,
    );
    if (invalid) {
      toast.error("日付・勘定科目・金額・摘要を確認してください");
      return;
    }

    setSavingBatch(true);
    try {
      const res = await fetch("/api/journals/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: batchRows.map((row) => ({
            id: row.id,
            date: row.date,
            debitAccount: row.debitAccount,
            creditAccount: row.creditAccount,
            amount: row.amount,
            debitTaxCategory: row.debitTaxCategory || null,
            creditTaxCategory: row.creditTaxCategory || null,
            description: row.description,
            invoiceNumber: row.invoiceNumber || null,
            memo: row.memo || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "一括保存に失敗しました");
      }
      toast.success(`${data.updated}件の仕訳を一括更新しました`);
      setBatchRows([]);
      setFiles([]);
      fetchReceipts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "一括保存に失敗しました",
      );
    } finally {
      setSavingBatch(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-[#F1F5F9]"
        >
          レシート撮影・読み取り
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          レシート・請求書・領収書の画像を撮影またはアップロードしてAIが自動仕分けします
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <div>
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9]">
                撮影・アップロード
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client Selection */}
              <div className="space-y-2">
                <label className="text-sm text-[#94A3B8]">対象顧客</label>
                <Select
                  value={selectedClient}
                  onValueChange={(v) => v && setSelectedClient(v)}
                >
                  <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]">
                    <SelectValue placeholder="顧客を選択...">
                      {clients.find((c) => c.id === selectedClient)?.name || "顧客を選択..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#94A3B8]">書類の種類</label>
                <Select
                  value={uploadDocumentKind}
                  onValueChange={(v) => {
                    if (v === "RECEIPT" || v === "INVOICE" || v === "OFFICIAL_RECEIPT") {
                      setUploadDocumentKind(v);
                    }
                  }}
                >
                  <SelectTrigger className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-[rgba(212,175,55,0.15)]">
                    <SelectItem value="RECEIPT">レシート・小票</SelectItem>
                    <SelectItem value="INVOICE">請求書</SelectItem>
                    <SelectItem value="OFFICIAL_RECEIPT">領収書</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[#64748B] leading-relaxed">
                  OCRの読み取りルールが切り替わります。請求書は支払期限・請求番号、領収書は但し書きを重視します。
                </p>
              </div>

              {/* Camera / Upload */}
              {useCamera ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg border border-[rgba(212,175,55,0.1)]"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-2">
                    <Button
                      onClick={capturePhoto}
                      className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      撮影
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="secondary"
                      className="bg-[#334155] text-[#F1F5F9] hover:bg-[#475569]"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full rounded-lg border border-[rgba(212,175,55,0.1)]"
                  />
                  <button
                    onClick={reset}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-[rgba(0,0,0,0.6)] flex items-center justify-center text-white hover:bg-[rgba(0,0,0,0.8)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : files.length > 1 ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[rgba(212,175,55,0.1)] p-4 space-y-2">
                    <p className="text-sm text-[#F1F5F9] font-medium">{files.length} 件のファイルを選択中</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#94A3B8]">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">{f.name}</span>
                          <span className="shrink-0 text-[#64748B]">({(f.size / 1024).toFixed(0)}KB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="text-xs text-[#64748B] hover:text-[#F1F5F9] transition-colors"
                  >
                    選択をクリア
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[rgba(212,175,55,0.15)] rounded-xl p-12 text-center cursor-pointer hover:border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.02)] transition-all"
                  >
                    <ImageIcon className="h-10 w-10 text-[#475569] mx-auto mb-3" />
                    <p className="text-sm text-[#94A3B8]">
                      クリックしてファイルを選択
                    </p>
                    <p className="text-xs text-[#475569] mt-1">
                      JPG, PNG対応 (複数選択可)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {/* モバイル用：カメラ直接起動（HTTPでも動作） */}
                  <label
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#334155] text-[#F1F5F9] hover:bg-[#475569] py-2.5 text-sm font-medium cursor-pointer transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    カメラで撮影
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              )}

              {/* Selected Files Preview */}
              {files.length > 0 && !processing && !result && batchRows.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-[#94A3B8]">{files.length}/5 枚選択中</p>
                  <div className="flex gap-2 flex-wrap">
                    {files.map((f, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={URL.createObjectURL(f)}
                          alt={`レシート ${i + 1}`}
                          className="w-16 h-20 object-cover rounded-lg border border-[rgba(212,175,55,0.1)]"
                        />
                        <button
                          onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {files.length < 5 && (
                      <label className="w-16 h-20 rounded-lg border-2 border-dashed border-[rgba(212,175,55,0.15)] flex flex-col items-center justify-center cursor-pointer hover:border-[rgba(212,175,55,0.3)] transition-colors">
                        <span className="text-[#D4AF37] text-lg">+</span>
                        <span className="text-[9px] text-[#64748B]">追加</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>
                    )}
                  </div>
                  {/* 精度モード選択 */}
                  <div className="flex gap-2">
                    {([
                      { v: "fast", label: "高速", desc: "Sonnet 4.6 / 数秒" },
                      { v: "accurate", label: "高精度", desc: "Opus 4.7 / 検証付き" },
                      { v: "ultra", label: "Ultra", desc: "Opus 4.7 ×3 多数決" },
                    ] as const).map(({ v, label, desc }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setUploadQuality(v)}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                          uploadQuality === v
                            ? "border-[#D4AF37] bg-[rgba(212,175,55,0.15)] text-[#D4AF37]"
                            : "border-[rgba(212,175,55,0.1)] text-[#94A3B8] hover:border-[rgba(212,175,55,0.3)]"
                        }`}
                        title={desc}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-[9px] mt-0.5 opacity-70">{desc}</div>
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleUpload(uploadQuality)}
                    className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {files.length > 1 ? `${files.length}件を読み取り` : "AI読み取り開始"}
                  </Button>
                </div>
              )}

              {processing && (
                <div className="flex items-center justify-center gap-3 py-4 text-[#D4AF37]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">
                    {uploadProgress
                      ? `${uploadProgress.current}/${uploadProgress.total} 処理中...`
                      : "AIが読み取り中..."}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Result Area */}
        <div>
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9]">
                読み取り結果
              </CardTitle>
            </CardHeader>
            <CardContent>
                {batchRows.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-400">
                            {batchRows.length}件の仕訳を読み取りました
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">
                            仕訳は登録済みです。必要な箇所を修正して更新してください
                        </p>
                      </div>
                      <Button
                        onClick={saveBatchRows}
                        disabled={savingBatch}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold"
                      >
                        {savingBatch ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {batchRows.length}件を一括更新
                      </Button>
                    </div>

                    <div className="max-h-[620px] overflow-auto border border-[rgba(212,175,55,0.1)] rounded-md">
                      <table className="w-full min-w-[960px] border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#1E293B]">
                          <tr className="border-b border-[rgba(212,175,55,0.12)]">
                            <th className="px-2 py-2 text-left text-[10px] text-[#64748B]">日付</th>
                            <th className="px-2 py-2 text-left text-[10px] text-[#64748B]">借方</th>
                            <th className="px-2 py-2 text-left text-[10px] text-[#64748B]">借方税区分</th>
                            <th className="px-2 py-2 text-left text-[10px] text-[#64748B]">貸方</th>
                            <th className="px-2 py-2 text-left text-[10px] text-[#64748B]">貸方税区分</th>
                            <th className="px-2 py-2 text-right text-[10px] text-[#64748B]">金額</th>
                            <th className="px-2 py-2 text-left text-[10px] text-[#64748B]">摘要</th>
                            <th className="px-2 py-2 text-left text-[10px] text-[#64748B]">登録番号</th>
                            <th className="px-2 py-2 text-left text-[10px] text-[#64748B]">メモ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchRows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-[rgba(212,175,55,0.06)] last:border-0"
                            >
                              <td className="p-1.5">
                                <input
                                  type="date"
                                  value={row.date}
                                  onChange={(e) => updateBatchRow(row.id, "date", e.target.value)}
                                  className="w-[130px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-xs text-[#F1F5F9]"
                                />
                              </td>
                              <td className="p-1.5">
                                <select
                                  value={row.debitAccount}
                                  onChange={(e) => updateBatchRow(row.id, "debitAccount", e.target.value)}
                                  className="w-[125px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-xs text-[#F1F5F9]"
                                >
                                  {[...STD_ACCOUNTS, ...customAccounts].map((account) => (
                                    <option key={account} value={account}>{account}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5">
                                <select
                                  value={row.debitTaxCategory}
                                  onChange={(e) => updateBatchRow(row.id, "debitTaxCategory", e.target.value)}
                                  className="w-[160px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-xs text-[#F1F5F9]"
                                >
                                  {TAX_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value || "対象外"}</option>)}
                                </select>
                              </td>
                              <td className="p-1.5">
                                <select
                                  value={row.creditAccount}
                                  onChange={(e) => updateBatchRow(row.id, "creditAccount", e.target.value)}
                                  className="w-[125px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-xs text-[#F1F5F9]"
                                >
                                  {[...STD_ACCOUNTS, ...customAccounts].map((account) => (
                                    <option key={account} value={account}>{account}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5">
                                <select
                                  value={row.creditTaxCategory}
                                  onChange={(e) => updateBatchRow(row.id, "creditTaxCategory", e.target.value)}
                                  className="w-[160px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-xs text-[#F1F5F9]"
                                >
                                  {TAX_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value || "対象外"}</option>)}
                                </select>
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  value={row.amount}
                                  onChange={(e) => updateBatchRow(row.id, "amount", Number(e.target.value))}
                                  className="w-[105px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-right text-xs text-[#F1F5F9]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.description}
                                  onChange={(e) => updateBatchRow(row.id, "description", e.target.value)}
                                  className="w-[180px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-xs text-[#F1F5F9]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.invoiceNumber}
                                  onChange={(e) => updateBatchRow(row.id, "invoiceNumber", e.target.value)}
                                  className="w-[130px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-xs text-[#F1F5F9]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.memo}
                                  onChange={(e) => updateBatchRow(row.id, "memo", e.target.value)}
                                  className="w-[150px] rounded bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] px-2 py-1.5 text-xs text-[#F1F5F9]"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveBatchRows}
                        disabled={savingBatch}
                        className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold"
                      >
                        {savingBatch ? "更新中..." : `${batchRows.length}件を一括更新`}
                      </Button>
                      <Button
                        onClick={reset}
                        disabled={savingBatch}
                        variant="secondary"
                        className="bg-[#334155] text-[#F1F5F9] hover:bg-[#475569]"
                      >
                        編集を終了
                      </Button>
                    </div>
                  </div>
                ) : result ? (
                  <div
                    className="space-y-5"
                  >
                    {/* OCR Info */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400">
                          読み取り成功
                        </span>
                        <Badge className="bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border-none text-[10px]">
                          確信度{" "}
                          {Math.round(
                            result.classification.confidence * 100
                          )}
                          %
                        </Badge>
                      </div>

                      <div className="rounded-lg bg-[rgba(15,23,42,0.4)] p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#94A3B8]">店舗名</span>
                          <span className="text-[#F1F5F9] flex items-center">
                            {result.ocr.storeName}
                            <ConfidenceBadge value={result.ocr.fieldConfidence?.storeName} />
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#94A3B8]">日付</span>
                          <span className="text-[#F1F5F9] flex items-center">
                            {result.ocr.date}
                            <ConfidenceBadge value={result.ocr.fieldConfidence?.date} />
                          </span>
                        </div>
                        {result.ocr.dueDate ? (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#94A3B8]">支払期限</span>
                            <span className="text-[#F1F5F9] flex items-center">
                              {result.ocr.dueDate}
                              <ConfidenceBadge value={result.ocr.fieldConfidence?.dueDate} />
                            </span>
                          </div>
                        ) : null}
                        {result.ocr.documentNo ? (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#94A3B8]">請求書番号</span>
                            <span className="text-[#F1F5F9] font-[var(--font-inter)] flex items-center">
                              {result.ocr.documentNo}
                              <ConfidenceBadge value={result.ocr.fieldConfidence?.documentNo} />
                            </span>
                          </div>
                        ) : null}
                        {result.ocr.purpose ? (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#94A3B8]">但し書き</span>
                            <span className="text-[#F1F5F9] flex items-center text-right max-w-[65%]">
                              {result.ocr.purpose}
                              <ConfidenceBadge value={result.ocr.fieldConfidence?.purpose} />
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#94A3B8]">合計金額</span>
                          <span className="text-[#F1F5F9] font-semibold font-[var(--font-inter)] flex items-center">
                            ¥{result.ocr.total.toLocaleString()}
                            <ConfidenceBadge value={result.ocr.fieldConfidence?.total} />
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#94A3B8]">登録番号</span>
                          <span className={`flex items-center ${result.ocr.invoiceNumber ? "text-[#F1F5F9] font-[var(--font-inter)]" : "text-[#64748B]"}`}>
                            {result.ocr.invoiceNumber || "なし"}
                            <ConfidenceBadge value={result.ocr.fieldConfidence?.invoiceNumber} />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Classification */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-[#94A3B8]">
                        自動仕訳
                      </h3>
                      <div className="rounded-lg border border-[rgba(212,175,55,0.1)] p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">借方</span>
                          <span className="text-[#D4AF37] font-medium">
                            {result.classification.debitAccount}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">貸方</span>
                          <span className="text-[#D4AF37] font-medium">
                            {result.classification.creditAccount}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">金額</span>
                          <span className="text-[#F1F5F9] font-semibold font-[var(--font-inter)]">
                            ¥
                            {result.classification.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">摘要</span>
                          <span className="text-[#F1F5F9]">
                            {result.classification.description}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Edit Result Button */}
                    {result.journalEntry?.id && !editingResult && (
                      <Button
                        onClick={startEditResult}
                        variant="secondary"
                        className="w-full bg-[#334155] text-[#F1F5F9] hover:bg-[#475569]"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        仕訳を編集
                      </Button>
                    )}

                    {/* Inline Edit Form for Result */}
                    {editingResult && result.journalEntry?.id && (
                      <div className="rounded-lg border border-[rgba(212,175,55,0.15)] p-4 space-y-3">
                        <h3 className="text-sm font-medium text-[#D4AF37]">仕訳を編集</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">日付</label>
                            <input type="date" value={resultEditForm.date} onChange={(e) => setResultEditForm({ ...resultEditForm, date: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-3 py-2" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">金額</label>
                            <input type="number" value={resultEditForm.amount} onChange={(e) => setResultEditForm({ ...resultEditForm, amount: Number(e.target.value) })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-3 py-2" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">借方</label>
                            <select value={resultEditForm.debitAccount} onChange={(e) => setResultEditForm({ ...resultEditForm, debitAccount: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-3 py-2">
                              {[...STD_ACCOUNTS, ...customAccounts].map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">貸方</label>
                            <select value={resultEditForm.creditAccount} onChange={(e) => setResultEditForm({ ...resultEditForm, creditAccount: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-3 py-2">
                              {[...STD_ACCOUNTS, ...customAccounts].map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs text-[#94A3B8]">摘要</label>
                            <input type="text" value={resultEditForm.description} onChange={(e) => setResultEditForm({ ...resultEditForm, description: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-3 py-2" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">登録番号</label>
                            <input type="text" value={resultEditForm.invoiceNumber} onChange={(e) => setResultEditForm({ ...resultEditForm, invoiceNumber: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-3 py-2" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">メモ</label>
                            <input type="text" value={resultEditForm.memo} onChange={(e) => setResultEditForm({ ...resultEditForm, memo: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-3 py-2" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={saveResultEdit} className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold">
                            <Save className="h-4 w-4 mr-2" />
                            保存
                          </Button>
                          <Button onClick={() => setEditingResult(false)} variant="secondary" className="bg-[#334155] text-[#F1F5F9] hover:bg-[#475569]">
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    {result.ocr.items.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-[#94A3B8]">
                          明細
                        </h3>
                        <div className="space-y-1">
                          {result.ocr.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-xs px-3 py-1.5 rounded bg-[rgba(15,23,42,0.3)]"
                            >
                              <span className="text-[#94A3B8]">
                                {item.name}
                              </span>
                              <span className="text-[#F1F5F9] font-[var(--font-inter)]">
                                ¥{item.amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={reset}
                      variant="secondary"
                      className="w-full bg-[#334155] text-[#F1F5F9] hover:bg-[#475569]"
                    >
                      次のレシートを読み取る
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center py-16 text-[#475569]"
                  >
                    <AlertCircle className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">
                      レシートをアップロードすると結果が表示されます
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt History */}
      <div className="mt-8">
        <Card className="glass-card border-[rgba(212,175,55,0.08)]">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#F1F5F9]">
                  レシート履歴
                </CardTitle>
              </div>
              {/* フィルタ */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-xs rounded-lg px-2 py-1.5"
                >
                  <option value="">全顧客</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-xs rounded-lg px-2 py-1.5"
                />
                {(filterClient || filterMonth) && (
                  <button
                    onClick={() => { setFilterClient(""); setFilterMonth(""); }}
                    className="text-xs text-[#94A3B8] hover:text-[#D4AF37] px-2"
                  >
                    クリア
                  </button>
                )}
              </div>
              {receipts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectedReceipts.size === receipts.length ? deselectAllReceipts : selectAllReceipts}
                    className="text-xs text-[#94A3B8] hover:text-[#D4AF37] transition-colors"
                  >
                    {selectedReceipts.size === receipts.length ? "選択解除" : "全選択"}
                  </button>
                  {selectedReceipts.size > 0 && (
                    <button
                      onClick={bulkDeleteReceipts}
                      disabled={bulkDeleting}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                    >
                      {bulkDeleting ? "削除中..." : `${selectedReceipts.size}件を削除`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingReceipts ? (
              <div className="flex items-center justify-center py-12 text-[#94A3B8]">読み込み中...</div>
            ) : receipts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#64748B]">
                <FileText className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">レシートの履歴がありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className={`rounded-lg border overflow-hidden transition-colors ${
                      selectedReceipts.has(receipt.id)
                        ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.04)]"
                        : "border-[rgba(212,175,55,0.08)] bg-[rgba(15,23,42,0.3)] hover:border-[rgba(212,175,55,0.2)]"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative h-32 bg-[rgba(15,23,42,0.5)] cursor-pointer group"
                      onClick={() => setLightboxImage(`/api/uploads/img?id=${receipt.id}`)}
                    >
                      <img
                        src={`/api/uploads/img?id=${receipt.id}`}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Checkbox */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleReceiptSelect(receipt.id); }}
                        className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors z-10 ${
                          selectedReceipts.has(receipt.id)
                            ? "bg-[#D4AF37] border-[#D4AF37]"
                            : "border-white/50 bg-black/30 hover:border-white"
                        }`}
                      >
                        {selectedReceipts.has(receipt.id) && (
                          <Check className="h-3 w-3 text-[#0F172A]" />
                        )}
                      </button>
                    </div>
                    {/* Info */}
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-[#94A3B8] font-[var(--font-inter)]">
                          {new Date(receipt.uploadedAt).toLocaleDateString("ja-JP")}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-[9px] border-[rgba(212,175,55,0.2)] text-[#94A3B8] font-normal">
                            {documentKindLabel(receipt.documentKind)}
                          </Badge>
                          {getStatusBadge(receipt.status)}
                        </div>
                      </div>
                      <p className="text-sm text-[#F1F5F9] truncate">
                        {getStoreName(receipt.ocrRaw)}
                      </p>
                      <p className="text-xs text-[#64748B] truncate">
                        {receipt.client.name}
                      </p>

                      {/* Journal Entry Summary */}
                      {receipt.journalEntries?.[0] && (
                        <div className="pt-1.5 border-t border-[rgba(212,175,55,0.08)]">
                          <p className="text-xs text-[#D4AF37] font-[var(--font-inter)] truncate">
                            {receipt.journalEntries[0].debitAccount} / {receipt.journalEntries[0].creditAccount}{" "}
                            ¥{receipt.journalEntries[0].amount.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {/* Retry Button for ERROR receipts */}
                      {(receipt.status === "ERROR" || receipt.status === "PROCESSING") && (
                        <button
                          disabled={retryingReceiptId === receipt.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setRetryingReceiptId(receipt.id);
                            try {
                              const res = await fetch("/api/receipts/retry", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ receiptId: receipt.id }),
                              });
                              if (res.ok) {
                                toast.success("再処理が完了しました");
                                fetchReceipts();
                              } else {
                                const data = await res.json();
                                toast.error(data.error || "再処理に失敗しました");
                              }
                            } catch { toast.error("再処理に失敗しました"); }
                            finally { setRetryingReceiptId(null); }
                          }}
                          className="w-full mt-1 py-1.5 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {retryingReceiptId === receipt.id ? "処理中..." : "再試行"}
                        </button>
                      )}

                      {/* Action Buttons */}
                      {receipt.journalEntries?.[0] && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditReceipt(receipt); }}
                            className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#D4AF37] transition-colors"
                          >
                            <Edit3 className="h-3 w-3" />
                            編集
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteJournalEntry(receipt.journalEntries[0].id); }}
                            className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            仕訳削除
                          </button>
                        </div>
                      )}
                      {/* レシート削除 */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm("このレシート画像を削除しますか？\n仕訳は残ります。")) return;
                          try {
                            const res = await fetch(`/api/receipts?id=${receipt.id}`, { method: "DELETE" });
                            if (res.ok) {
                              toast.success("レシートを削除しました");
                              fetchReceipts();
                            } else {
                              const data = await res.json();
                              toast.error(data.error);
                            }
                          } catch { toast.error("削除に失敗しました"); }
                        }}
                        className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-red-400 transition-colors mt-1"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        レシート削除
                      </button>
                    </div>

                    {/* Inline Edit Form */}
                    {editingReceiptId === receipt.id && receipt.journalEntries?.[0] && (
                      <div className="border-t border-[rgba(212,175,55,0.1)] p-3 space-y-3 bg-[rgba(15,23,42,0.4)]">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">日付</label>
                            <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">借方</label>
                            <select value={editForm.debitAccount} onChange={(e) => setEditForm({ ...editForm, debitAccount: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5">
                              {[...STD_ACCOUNTS, ...customAccounts].map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">貸方</label>
                            <select value={editForm.creditAccount} onChange={(e) => setEditForm({ ...editForm, creditAccount: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5">
                              {[...STD_ACCOUNTS, ...customAccounts].map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">金額</label>
                            <input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">借方税区分</label>
                            <select value={editForm.debitTaxCategory} onChange={(e) => setEditForm({ ...editForm, debitTaxCategory: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5">
                              {TAX_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value || "対象外"}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">貸方税区分</label>
                            <select value={editForm.creditTaxCategory} onChange={(e) => setEditForm({ ...editForm, creditTaxCategory: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5">
                              {TAX_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value || "対象外"}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">摘要</label>
                            <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">登録番号</label>
                            <input type="text" value={editForm.invoiceNumber} onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">メモ</label>
                            <input type="text" value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveReceiptEdit(receipt.journalEntries[0].id)}
                            className="flex-1 flex items-center justify-center gap-1 rounded-md bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold text-xs py-1.5"
                          >
                            <Save className="h-3 w-3" />
                            保存
                          </button>
                          <button
                            onClick={() => setEditingReceiptId(null)}
                            className="flex-1 rounded-md bg-[#334155] text-[#F1F5F9] hover:bg-[#475569] text-xs py-1.5 transition-colors"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.2)] transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Receipt"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
