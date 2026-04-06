"use client";

import { useState, useEffect } from "react";
import { FileDown, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Client {
  id: string;
  code: string;
  name: string;
}

const formatOptions = [
  {
    value: "yayoi",
    label: "弥生会計",
    description: "弥生会計インポート用CSVフォーマット",
    color: "#3B82F6",
  },
  {
    value: "moneyforward",
    label: "マネーフォワード",
    description: "マネーフォワードクラウド会計インポート用",
    color: "#10B981",
  },
  {
    value: "freee",
    label: "freee",
    description: "freee会計インポート用CSVフォーマット",
    color: "#8B5CF6",
  },
];

export default function ExportPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(() => {});

    // Default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  }, []);

  function handlePeriodChange(type: string) {
    setPeriodType(type);
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "semi_annual":
        if (now.getMonth() < 6) {
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 5, 30);
        } else {
          start = new Date(now.getFullYear(), 6, 1);
          end = new Date(now.getFullYear(), 11, 31);
        }
        break;
      case "annual":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }

  async function handleExport() {
    if (!selectedClient || !selectedFormat) {
      toast.error("顧客と出力形式を選択してください");
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient,
          format: selectedFormat,
          periodType,
          startDate,
          endDate,
        }),
      });

      if (!res.ok) {
        let errMsg = "不明なエラー";
        try {
          const data = await res.json();
          errMsg = data.error || "不明なエラー";
          if (data.detail) errMsg += "\n詳細: " + data.detail;
        } catch {
          errMsg = await res.text().catch(() => "レスポンス読み取り失敗");
        }
        toast.error(`${res.status}: ${errMsg}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // ファイル名の取得
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";\s]+)"?/);
      a.download = filenameMatch?.[1] || `${selectedFormat}_export.csv`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const recordCount = res.headers.get("X-Record-Count") || "?";
      const formatLabel = formatOptions.find(f => f.value === selectedFormat)?.label || selectedFormat;
      toast.success(
        `${formatLabel}形式で${recordCount}件の仕訳をエクスポートしました`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("エクスポートに失敗しました: " + msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-[#F1F5F9]"
        >
          CSV出力
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          弥生会計・マネーフォワード・freee対応のCSVを出力します
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Settings */}
        <div
          className="lg:col-span-2"
        >
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9]">
                出力設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client */}
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">対象顧客</Label>
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

              {/* Format */}
              <div className="space-y-3">
                <Label className="text-[#94A3B8]">出力形式</Label>
                <div className="grid grid-cols-3 gap-3">
                  {formatOptions.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setSelectedFormat(fmt.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        selectedFormat === fmt.value
                          ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.05)]"
                          : "border-[rgba(212,175,55,0.08)] bg-transparent hover:border-[rgba(212,175,55,0.15)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: fmt.color }}
                        />
                        <span className="text-sm font-medium text-[#F1F5F9]">
                          {fmt.label}
                        </span>
                        {selectedFormat === fmt.value && (
                          <CheckCircle2 className="h-4 w-4 text-[#D4AF37] ml-auto" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#64748B] leading-relaxed">
                        {fmt.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Period */}
              <div className="space-y-3">
                <Label className="text-[#94A3B8]">対象期間</Label>
                <div className="flex gap-2 mb-3">
                  {[
                    { value: "monthly", label: "月次" },
                    { value: "semi_annual", label: "半期" },
                    { value: "annual", label: "年次" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      onClick={() => handlePeriodChange(p.value)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        periodType === p.value
                          ? "bg-[rgba(212,175,55,0.15)] text-[#D4AF37] border border-[rgba(212,175,55,0.3)]"
                          : "bg-[rgba(255,255,255,0.03)] text-[#94A3B8] border border-transparent hover:text-[#F1F5F9]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#64748B]">開始日</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] font-[var(--font-inter)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#64748B]">終了日</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] font-[var(--font-inter)]"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={exporting || !selectedClient || !selectedFormat}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold hover:from-[#E8D48B] hover:to-[#D4AF37] disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? "エクスポート中..." : "CSVをダウンロード"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div>
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9]">
                出力形式について
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="rounded-lg bg-[rgba(15,23,42,0.4)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-[#F1F5F9]">
                      弥生会計
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] leading-relaxed">
                    弥生会計のインポート機能で読み込めるCSV形式です。
                    弥生会計デスクトップ版・オンライン版に対応。
                  </p>
                </div>
                <div className="rounded-lg bg-[rgba(15,23,42,0.4)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-[#F1F5F9]">
                      マネーフォワード
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] leading-relaxed">
                    マネーフォワードクラウド会計の仕訳インポート形式です。
                    仕訳帳からCSVインポートで読み込めます。
                  </p>
                </div>
                <div className="rounded-lg bg-[rgba(15,23,42,0.4)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-xs font-medium text-[#F1F5F9]">
                      freee
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] leading-relaxed">
                    freee会計の取引インポート用CSV形式です。
                    取引一覧からCSVインポートで読み込めます。
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[rgba(212,175,55,0.06)]">
                <p className="text-[10px] text-[#475569]">
                  CSV出力時にBOM付きUTF-8で出力されるため、
                  Excelで直接開いても文字化けしません。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
