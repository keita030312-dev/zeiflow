"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { compressImage } from "@/lib/image-compress";

interface UploadResult {
  receiptId: string;
  status: string;
  ocr: { storeName: string; date: string; total: number };
  journalEntry: {
    id: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    description: string;
  };
}

interface JournalEntry {
  id: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  taxAmount: number | null;
  description: string;
  invoiceNumber: string | null;
  isConfirmed: boolean;
  receiptId: string | null;
}

type Tab = "upload" | "journals";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default function PortalPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PortalPage />
    </Suspense>
  );
}

function PortalPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [clientName, setClientName] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Upload state
  const [tab, setTab] = useState<Tab>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Journal state
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalPage, setJournalPage] = useState(1);
  const [journalTotal, setJournalTotal] = useState(0);
  const [loadingJournals, setLoadingJournals] = useState(false);

  // Confirm state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  // Lightbox state
  const [lightboxReceiptId, setLightboxReceiptId] = useState<string | null>(null);

  const [uploadDocumentKind, setUploadDocumentKind] = useState<
    "RECEIPT" | "INVOICE" | "OFFICIAL_RECEIPT"
  >("RECEIPT");

  // トークン検証
  // アップロード中にブラウザを閉じようとしたら警告
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (uploading) {
        e.preventDefault();
        e.returnValue = "レシートを処理中です。";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploading]);

  useEffect(() => {
    if (!token) {
      setError("無効なリンクです");
      setLoading(false);
      return;
    }

    fetch(`/api/portal/info?token=${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("invalid");
        return r.json();
      })
      .then((data) => {
        setClientName(data.clientName);
        setClientCode(data.clientCode);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err instanceof Error && err.message === "invalid"
          ? "このリンクは無効または期限切れです"
          : "接続に失敗しました。ネットワークを確認してもう一度お試しください";
        setError(msg);
        setLoading(false);
      });
  }, [token]);

  // 仕訳取得
  useEffect(() => {
    if (tab === "journals" && token && !error) {
      fetchJournals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, journalPage, token]);

  async function fetchJournals() {
    setLoadingJournals(true);
    try {
      const res = await fetch(
        `/api/portal/journals?token=${token}&page=${journalPage}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setJournals(data.journals);
        setJournalTotal(data.pagination.totalPages);
      }
    } catch {
      // ポータルでは軽微なエラーは表示しない（ネットワーク再試行で解決することが多い）
    } finally {
      setLoadingJournals(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllUnconfirmed() {
    const unconfirmed = journals.filter((j) => !j.isConfirmed).map((j) => j.id);
    setSelectedIds(new Set(unconfirmed));
  }

  async function handleConfirm() {
    if (selectedIds.size === 0 || !token) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/portal/journals/confirm?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIds(new Set());
        fetchJournals();
        // Simple success feedback
        alert(`${data.count}件の仕訳を確定しました`);
      }
    } catch {
      alert("確定処理に失敗しました");
    } finally {
      setConfirming(false);
    }
  }

  const MAX_FILES = 5;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    const newFiles = Array.from(selected).filter((file) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        alert(`${file.name}: 対応外の形式です（JPG/PNG/WEBP/GIFのみ）`);
        return false;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        alert(`${file.name}: 10MB以下の画像を選択してください`);
        return false;
      }
      return true;
    });
    if (newFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const combined = [...files, ...newFiles];
    if (combined.length > MAX_FILES) {
      alert(`アップロードは最大${MAX_FILES}枚までです`);
    }
    const limited = combined.slice(0, MAX_FILES);
    const addedFiles = limited.slice(files.length);
    setFiles(limited);
    setPreviews((prev) => [...prev, ...addedFiles.map((f) => URL.createObjectURL(f))]);
    setResults([]);
    setUploadErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0 || !token) return;

    setUploading(true);
    setResults([]);
    setUploadErrors([]);
    setUploadProgress({ current: 0, total: files.length });

    // 2枚ずつ並列処理（精度とスピードのバランス）
    const settled: PromiseSettledResult<UploadResult>[] = [];
    const BATCH_SIZE = 2;

    for (let batch = 0; batch < files.length; batch += BATCH_SIZE) {
      const batchFiles = files.slice(batch, batch + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batchFiles.map(async (file) => {
          const compressed = await compressImage(file);
          const formData = new FormData();
          formData.append("file", compressed);
          formData.append("documentKind", uploadDocumentKind);

          const res = await fetch(`/api/portal/receipts?token=${token}`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "処理に失敗しました");
          return data as UploadResult;
        })
      );
      settled.push(...batchResults);
      setUploadProgress({ current: Math.min(batch + BATCH_SIZE, files.length), total: files.length });
    }

    const newResults: UploadResult[] = [];
    const newErrors: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") {
        newResults.push(r.value);
      } else {
        newErrors.push(`${files[i].name}: ${r.reason?.message || "通信エラー"}`);
      }
    });

    setResults(newResults);
    setUploadErrors(newErrors);
    setUploading(false);
    setUploadProgress(null);

    if (newResults.length > 0) {
      setFiles([]);
      setPreviews([]);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#94A3B8] text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#F1F5F9] mb-2">アクセスできません</h1>
          <p className="text-[#94A3B8] text-sm">{error}</p>
          <p className="text-[#64748B] text-xs mt-4">担当の税理士事務所にお問い合わせください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[rgba(212,175,55,0.1)] bg-[rgba(15,23,42,0.8)] backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center">
              <span className="text-[#0F172A] font-bold text-sm">Z</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#F1F5F9]">ZeiFlow ポータル</h1>
              <p className="text-xs text-[#94A3B8]">{clientName}（{clientCode}）</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-[rgba(212,175,55,0.08)] bg-[rgba(30,41,59,0.3)]">
        <div className="max-w-lg mx-auto px-4 flex">
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === "upload"
                ? "border-[#D4AF37] text-[#D4AF37]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            レシート送信
          </button>
          <button
            onClick={() => setTab("journals")}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === "journals"
                ? "border-[#D4AF37] text-[#D4AF37]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            仕訳一覧
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {tab === "upload" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs text-[#94A3B8]">書類の種類</label>
              <select
                value={uploadDocumentKind}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "RECEIPT" || v === "INVOICE" || v === "OFFICIAL_RECEIPT") {
                    setUploadDocumentKind(v);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-lg border border-[rgba(212,175,55,0.15)] bg-[rgba(15,23,42,0.6)] text-[#F1F5F9] text-sm px-3 py-2"
              >
                <option value="RECEIPT">レシート・小票</option>
                <option value="INVOICE">請求書</option>
                <option value="OFFICIAL_RECEIPT">領収書</option>
              </select>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[rgba(212,175,55,0.2)] rounded-2xl p-8 text-center cursor-pointer hover:border-[rgba(212,175,55,0.4)] transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-[rgba(212,175,55,0.08)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-[#F1F5F9] font-medium mb-1">レシートを撮影・選択</p>
              <p className="text-[#64748B] text-xs">タップして写真を選択、または撮影</p>
              <p className="text-[#64748B] text-xs mt-1">複数枚の同時アップロードに対応</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Previews */}
            {previews.length > 0 && (
              <div>
                <p className="text-sm text-[#94A3B8] mb-3">{files.length}/5 枚選択中</p>
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={src}
                        alt={`レシート ${i + 1}`}
                        className="w-full aspect-[3/4] object-cover rounded-lg border border-[rgba(212,175,55,0.1)]"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_FILES && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-[rgba(212,175,55,0.2)] flex flex-col items-center justify-center cursor-pointer hover:border-[rgba(212,175,55,0.4)] transition-colors"
                    >
                      <span className="text-[#D4AF37] text-2xl leading-none">+</span>
                      <span className="text-[9px] text-[#64748B] mt-1">追加</span>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full mt-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] disabled:opacity-40 transition-opacity"
                >
                  {uploading
                    ? `${uploadProgress?.current}/${uploadProgress?.total} 処理中...`
                    : `${files.length}件をアップロード`}
                </button>
              </div>
            )}

            {/* Upload Progress Bar */}
            {uploading && uploadProgress && (
              <div className="space-y-2">
                <div className="h-2 bg-[rgba(212,175,55,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] rounded-full transition-all duration-500"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-center text-xs text-[#94A3B8]">
                  AIがレシートを読み取り中... {uploadProgress.current}/{uploadProgress.total}
                </p>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-green-400 font-medium">{results.length}件のアップロードが完了</p>
                </div>
                {results.map((r, i) => (
                  <div key={i} className="bg-[rgba(30,41,59,0.6)] rounded-xl p-4 border border-[rgba(212,175,55,0.08)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-[#F1F5F9]">{r.ocr.storeName || "不明"}</p>
                      <p className="text-xs text-[#94A3B8]">{r.ocr.date}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#64748B]">
                        {r.journalEntry.debitAccount} / {r.journalEntry.creditAccount}
                      </p>
                      <p className="text-sm font-semibold text-[#D4AF37]">
                        ¥{r.journalEntry.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Errors */}
            {uploadErrors.length > 0 && (
              <div className="space-y-2">
                {uploadErrors.map((err, i) => (
                  <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-xs text-red-400">{err}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Journals Tab */
          <div className="space-y-4">
            {loadingJournals ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#94A3B8]">読み込み中...</p>
              </div>
            ) : journals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#64748B] text-sm">仕訳データがありません</p>
              </div>
            ) : (
              <>
                {/* 一括操作バー */}
                {journals.some((j) => !j.isConfirmed) && (
                  <div className="flex items-center justify-between bg-[rgba(30,41,59,0.6)] rounded-xl p-3 border border-[rgba(212,175,55,0.08)]">
                    <button
                      onClick={selectAllUnconfirmed}
                      className="text-xs text-[#94A3B8] hover:text-[#D4AF37] transition-colors"
                    >
                      未確定をすべて選択
                    </button>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={handleConfirm}
                        disabled={confirming}
                        className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] disabled:opacity-40"
                      >
                        {confirming ? "処理中..." : `${selectedIds.size}件を確定する`}
                      </button>
                    )}
                  </div>
                )}

                {journals.map((j) => (
                  <div
                    key={j.id}
                    className={`bg-[rgba(30,41,59,0.6)] rounded-xl p-4 border transition-colors ${
                      selectedIds.has(j.id)
                        ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.04)]"
                        : "border-[rgba(212,175,55,0.08)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {!j.isConfirmed && (
                          <button
                            onClick={() => toggleSelect(j.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedIds.has(j.id)
                                ? "bg-[#D4AF37] border-[#D4AF37]"
                                : "border-[#64748B] hover:border-[#94A3B8]"
                            }`}
                          >
                            {selectedIds.has(j.id) && (
                              <svg className="w-3 h-3 text-[#0F172A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        )}
                        <p className="text-xs text-[#94A3B8]">
                          {new Date(j.date).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                      {j.isConfirmed ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          確定済
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
                          未確定
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#F1F5F9] font-medium mb-2">
                      {j.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#64748B]">
                        <span className="text-[#94A3B8]">{j.debitAccount}</span>
                        {" / "}
                        <span className="text-[#94A3B8]">{j.creditAccount}</span>
                      </div>
                      <p className="text-sm font-semibold text-[#D4AF37]">
                        ¥{j.amount.toLocaleString()}
                      </p>
                    </div>
                    {j.taxAmount && (
                      <p className="text-[10px] text-[#64748B] mt-1">
                        うち消費税 ¥{j.taxAmount.toLocaleString()}
                      </p>
                    )}
                    {j.invoiceNumber && (
                      <p className="text-[10px] text-[#64748B] mt-1">
                        インボイス: {j.invoiceNumber}
                      </p>
                    )}
                    {j.receiptId && (
                      <button
                        onClick={() => setLightboxReceiptId(j.receiptId)}
                        className="mt-2 flex items-center gap-1.5 text-[10px] text-[#D4AF37] hover:text-[#E8D48B] transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        レシート画像を見る
                      </button>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {journalTotal > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                      onClick={() => setJournalPage((p) => Math.max(1, p - 1))}
                      disabled={journalPage <= 1}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[rgba(30,41,59,0.6)] text-[#94A3B8] disabled:opacity-30"
                    >
                      前へ
                    </button>
                    <span className="text-xs text-[#64748B]">
                      {journalPage} / {journalTotal}
                    </span>
                    <button
                      onClick={() => setJournalPage((p) => Math.min(journalTotal, p + 1))}
                      disabled={journalPage >= journalTotal}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[rgba(30,41,59,0.6)] text-[#94A3B8] disabled:opacity-30"
                    >
                      次へ
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxReceiptId && token && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxReceiptId(null)}
        >
          <div className="relative max-w-lg w-full max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxReceiptId(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm"
            >
              閉じる ×
            </button>
            <img
              src={`/api/portal/image?token=${token}&id=${lightboxReceiptId}`}
              alt="レシート画像"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[rgba(212,175,55,0.06)] py-4">
        <p className="text-center text-[10px] text-[#475569]">
          Powered by ZeiFlow
        </p>
      </footer>
    </div>
  );
}
