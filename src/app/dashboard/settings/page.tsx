"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, Key, QrCode, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [totpQrUrl, setTotpQrUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // API Key state
  const [apiKeyStatus, setApiKeyStatus] = useState<{ isSet: boolean; masked: string | null } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [anthropicQrDataUrl, setAnthropicQrDataUrl] = useState("");

  const ANTHROPIC_URL = ["https://", "console.anthropic.com", "/settings/keys"].join("");

  useEffect(() => {
    // Fetch API key status and 2FA status
    fetch("/api/settings/api-key")
      .then((r) => r.json())
      .then((data) => {
        setApiKeyStatus(data);
        if (data.totpEnabled !== undefined) {
          setTotpEnabled(data.totpEnabled);
        }
      })
      .catch(() => {});

    // Fetch 2FA status separately
    fetch("/api/settings/totp-status")
      .then((r) => r.json())
      .then((data) => {
        if (data.totpEnabled !== undefined) {
          setTotpEnabled(data.totpEnabled);
        }
      })
      .catch(() => {});

    // Generate QR code for Anthropic URL
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(ANTHROPIC_URL, { width: 160, margin: 1 }).then(setAnthropicQrDataUrl);
    });
  }, []);

  async function saveApiKey() {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      if (res.ok) {
        toast.success("APIキーを保存しました");
        setApiKeyInput("");
        const updated = await fetch("/api/settings/api-key").then((r) => r.json());
        setApiKeyStatus(updated);
      } else {
        const { error } = await res.json();
        toast.error(error || "保存に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSavingKey(false);
    }
  }

  async function handleSetup2FA() {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/settings/totp", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTotpQrUrl(data.qrDataUrl);
        setShowSetup(true);
        setTotpCode("");
      } else {
        const { error } = await res.json();
        toast.error(error || "QRコードの生成に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setTotpLoading(false);
    }
  }

  async function handleVerify2FA() {
    if (totpCode.length !== 6) return;
    setTotpLoading(true);
    try {
      const res = await fetch("/api/settings/totp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      if (res.ok) {
        toast.success("二要素認証を有効にしました");
        setTotpEnabled(true);
        setShowSetup(false);
        setTotpQrUrl("");
        setTotpCode("");
      } else {
        const { error } = await res.json();
        toast.error(error || "認証に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setTotpLoading(false);
    }
  }

  async function handleDisable2FA() {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/settings/totp", { method: "DELETE" });
      if (res.ok) {
        toast.success("二要素認証を無効にしました");
        setTotpEnabled(false);
        setShowSetup(false);
        setTotpQrUrl("");
      } else {
        const { error } = await res.json();
        toast.error(error || "無効化に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setTotpLoading(false);
    }
  }

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("すべてのフィールドを入力してください");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("新しいパスワードが一致しません");
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error("パスワードは8文字以上で、大文字・小文字・数字を含む必要があります");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success("パスワードを変更しました");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const { error } = await res.json();
        toast.error(error || "パスワードの変更に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-[#F1F5F9]"
        >
          設定
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          アカウント・セキュリティ設定を管理します
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* API Settings */}
        <div>
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#D4AF37]" />
                AI / API設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Step 1: Get API Key */}
              <div className="rounded-lg border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)] p-4 space-y-3">
                <p className="text-sm font-medium text-[#F1F5F9]">
                  まずAnthropicでAPIキーを取得
                </p>
                <div className="flex gap-3 items-center flex-wrap">
                  <Button
                    onClick={() => window.open(ANTHROPIC_URL, "_blank")}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Anthropic Consoleを開く
                  </Button>
                  <span className="text-xs text-[#64748B] select-all font-mono bg-[rgba(15,23,42,0.6)] border border-[rgba(212,175,55,0.12)] px-2 py-1 rounded">
                    console.anthropic.com/settings/keys
                  </span>
                </div>
                {anthropicQrDataUrl && (
                  <div className="flex items-center gap-3">
                    <div className="bg-white rounded p-1.5">
                      <img src={anthropicQrDataUrl} alt="QRコード" width={72} height={72} />
                    </div>
                    <p className="text-xs text-[#64748B]">
                      スマホのカメラで<br />スキャンしてもOK
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Paste and save key */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#F1F5F9]">取得したキーをここに貼り付けて保存</p>

                {apiKeyStatus?.isSet && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>設定済み: <span className="font-mono">{apiKeyStatus.masked}</span></span>
                  </div>
                )}
                {apiKeyStatus && !apiKeyStatus.isSet && (
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>未設定 --- AIによる自動仕分けが使えません</span>
                  </div>
                )}

                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] font-mono text-sm"
                />
                <Button
                  onClick={saveApiKey}
                  disabled={!apiKeyInput.trim() || savingKey}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold disabled:opacity-40"
                >
                  {savingKey ? "保存中..." : "保存する"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Settings */}
        <div>
          <Card className="glass-card border-[rgba(212,175,55,0.08)]">
            <CardHeader>
              <CardTitle className="text-base text-[#F1F5F9] flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#D4AF37]" />
                セキュリティ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 2FA */}
              <div className="flex items-center justify-between rounded-lg border border-[rgba(212,175,55,0.08)] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.08)]">
                    <Key className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F1F5F9]">
                      二要素認証（2FA）
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Google Authenticator対応のTOTP認証
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {totpEnabled ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-none">
                      有効
                    </Badge>
                  ) : (
                    <Badge className="bg-[rgba(255,255,255,0.05)] text-[#64748B] border-none">
                      無効
                    </Badge>
                  )}
                  {totpEnabled ? (
                    <Button
                      onClick={handleDisable2FA}
                      disabled={totpLoading}
                      variant="secondary"
                      size="sm"
                      className="bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/20"
                    >
                      {totpLoading ? "処理中..." : "無効にする"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSetup2FA}
                      disabled={totpLoading}
                      variant="secondary"
                      size="sm"
                      className="bg-[#334155] text-[#F1F5F9] hover:bg-[#475569]"
                    >
                      {totpLoading ? "処理中..." : "有効にする"}
                    </Button>
                  )}
                </div>
              </div>

              {showSetup && !totpEnabled && (
                <div
                  className="rounded-lg border border-[rgba(212,175,55,0.08)] p-4 space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                    <QrCode className="h-4 w-4" />
                    <span>
                      以下のQRコードをGoogle
                      Authenticatorでスキャンしてください
                    </span>
                  </div>
                  <div className="flex items-center justify-center py-6 bg-white rounded-lg">
                    {totpQrUrl ? (
                      <img src={totpQrUrl} alt="TOTP QRコード" width={200} height={200} />
                    ) : (
                      <p className="text-[#64748B] text-sm">
                        QRコードを生成中...
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8] text-sm">
                      確認コード
                    </Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="6桁のコード"
                      className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9] text-center tracking-widest"
                    />
                  </div>
                  <Button
                    onClick={handleVerify2FA}
                    disabled={totpCode.length !== 6 || totpLoading}
                    className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0F172A] font-semibold disabled:opacity-40"
                  >
                    {totpLoading ? "確認中..." : "2FAを有効にする"}
                  </Button>
                </div>
              )}

              {/* Password Change */}
              <div className="space-y-4 pt-4 border-t border-[rgba(212,175,55,0.06)]">
                <h3 className="text-sm font-medium text-[#F1F5F9]">
                  パスワード変更
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-[#94A3B8]">
                      現在のパスワード
                    </Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#94A3B8]">
                      新しいパスワード
                    </Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#94A3B8]">
                      新しいパスワード（確認）
                    </Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-[rgba(15,23,42,0.5)] border-[rgba(212,175,55,0.12)] text-[#F1F5F9]"
                    />
                  </div>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    variant="secondary"
                    className="bg-[#334155] text-[#F1F5F9] hover:bg-[#475569]"
                  >
                    {passwordLoading ? "変更中..." : "パスワードを変更"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
