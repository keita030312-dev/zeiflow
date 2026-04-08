"use client";

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

const ACCOUNTS = [
  "現金", "当座預金", "普通預金", "売掛金", "商品", "前払費用", "建物", "車両運搬具", "備品",
  "買掛金", "未払金", "未払費用", "預り金", "借入金",
  "売上高", "受取利息", "雑収入",
  "仕入高", "給料手当", "法定福利費", "旅費交通費", "通信費", "消耗品費", "水道光熱費",
  "地代家賃", "保険料", "修繕費", "広告宣伝費", "接待交際費", "会議費", "租税公課",
  "減価償却費", "支払手数料", "雑費", "新聞図書費", "外注費", "福利厚生費", "荷造運賃", "車両費",
];

interface Client {
  id: string;
  code: string;
  name: string;
}

interface ReceiptResult {
  ocr: {
    storeName: string;
    date: string;
    total: number;
    items: { name: string; amount: number }[];
    invoiceNumber?: string;
  };
  classification: {
    debitAccount: string;
    creditAccount: string;
    amount: number;
    description: string;
    confidence: number;
  };
  journalEntry?: {
    id: string;
  };
}

interface ReceiptRecord {
  id: string;
  imagePath: string;
  imageMime: string | null;
  status: string;
  ocrRaw: string | null;
  uploadedAt: string;
  client: { name: string; code: string };
  journalEntries: {
    id: string;
    date: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    taxAmount?: number;
    description: string;
    invoiceNumber?: string;
    memo?: string;
    isConfirmed: boolean;
  }[];
}

export default function ReceiptsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
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

  // Receipt history state
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Editing state
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    debitAccount: "",
    creditAccount: "",
    amount: 0,
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
      const res = await fetch("/api/receipts");
      if (res.ok) {
        setReceipts(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoadingReceipts(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startCamera() {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1920, height: 1080 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("カメラにアクセスできません");
      setUseCamera(false);
    }
  }

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
          setFiles([f]);
          setPreview(URL.createObjectURL(f));
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
    const fileList = Array.from(selected);
    setFiles(fileList);
    if (fileList.length === 1) {
      setPreview(URL.createObjectURL(fileList[0]));
    } else {
      setPreview(null);
    }
    setResult(null);
  }

  async function compressImage(file: File, maxWidth = 1200): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  async function uploadSingleFile(file: File, quality: "fast" | "accurate" = "fast"): Promise<ReceiptResult | null> {
    const compressed = await compressImage(file);
    const formData = new FormData();
    formData.append("file", compressed);
    formData.append("clientId", selectedClient);
    formData.append("quality", quality);

    const res = await fetch("/api/receipts", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      return data;
    } else {
      throw new Error(data.error || "読み取りに失敗しました");
    }
  }

  const [uploadQuality, setUploadQuality] = useState<"fast" | "accurate">("fast");

  async function handleUpload(quality?: "fast" | "accurate") {
    const q = quality || uploadQuality;
    if (files.length === 0 || !selectedClient) {
      toast.error("顧客とファイルを選択してください");
      return;
    }

    setProcessing(true);
    setResult(null);

    if (files.length === 1) {
      // Single file upload
      try {
        const data = await uploadSingleFile(files[0], q);
        setResult(data);
        toast.success("レシートを読み取りました");
        fetchReceipts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("エラー: " + msg);
      } finally {
        setProcessing(false);
      }
    } else {
      // Multiple file upload - sequential
      let successCount = 0;
      let lastResult: ReceiptResult | null = null;
      setUploadProgress({ current: 0, total: files.length });

      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        try {
          lastResult = await uploadSingleFile(files[i], q);
          successCount++;
        } catch {
          toast.error(`${files[i].name} の読み取りに失敗しました`);
        }
      }

      setUploadProgress(null);
      setProcessing(false);

      if (successCount > 0) {
        toast.success(`${successCount}/${files.length} 件のレシートを処理しました`);
        if (successCount === 1 && lastResult) {
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
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    setEditForm({
      date: je.date,
      debitAccount: je.debitAccount,
      creditAccount: je.creditAccount,
      amount: je.amount,
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

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-[#F1F5F9]"
        >
          レシート撮影・読み取り
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          レシートを撮影またはアップロードしてAIが自動仕分けします
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
                    <SelectValue placeholder="顧客を選択..." />
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

              {/* Upload Button */}
              {files.length > 0 && !processing && !result && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpload("fast")}
                    className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {files.length > 1 ? `${files.length}件 高速読み取り` : "⚡ 高速読み取り"}
                  </Button>
                  <Button
                    onClick={() => handleUpload("accurate")}
                    className="flex-1 bg-[#334155] text-[#F1F5F9] hover:bg-[#475569] font-semibold"
                  >
                    {files.length > 1 ? `${files.length}件 高精度` : "🎯 高精度読み取り"}
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
                {result ? (
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
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">店舗名</span>
                          <span className="text-[#F1F5F9]">
                            {result.ocr.storeName}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">日付</span>
                          <span className="text-[#F1F5F9]">
                            {result.ocr.date}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">合計金額</span>
                          <span className="text-[#F1F5F9] font-semibold font-[var(--font-inter)]">
                            ¥{result.ocr.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">登録番号</span>
                          <span className={result.ocr.invoiceNumber ? "text-[#F1F5F9] font-[var(--font-inter)]" : "text-[#64748B]"}>
                            {result.ocr.invoiceNumber || "なし"}
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
                              {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">貸方</label>
                            <select value={resultEditForm.creditAccount} onChange={(e) => setResultEditForm({ ...resultEditForm, creditAccount: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-3 py-2">
                              {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
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
            <CardTitle className="text-base text-[#F1F5F9]">
              レシート履歴
            </CardTitle>
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
                    className="rounded-lg border border-[rgba(212,175,55,0.08)] bg-[rgba(15,23,42,0.3)] overflow-hidden hover:border-[rgba(212,175,55,0.2)] transition-colors"
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
                    </div>
                    {/* Info */}
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#94A3B8] font-[var(--font-inter)]">
                          {new Date(receipt.uploadedAt).toLocaleDateString("ja-JP")}
                        </span>
                        {getStatusBadge(receipt.status)}
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
                            削除
                          </button>
                        </div>
                      )}
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
                              {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">貸方</label>
                            <select value={editForm.creditAccount} onChange={(e) => setEditForm({ ...editForm, creditAccount: e.target.value })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5">
                              {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#94A3B8]">金額</label>
                            <input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                              className="w-full rounded-md bg-[rgba(15,23,42,0.5)] border border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-sm px-2 py-1.5" />
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
