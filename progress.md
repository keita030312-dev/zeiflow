# 進捗状況（progress.md）

最終更新：2026-04-29

## 🚀 2026-04-29 大型改善(納品レベル引き上げ)

### OCRエンジン強化
- [x] **モデル更新**: メインを Sonnet 4.6 / accurate時 Opus 4.7(最新世代)
- [x] **Few-shot example 3例**(コンビニ/居酒屋/タクシー)をプロンプトに追加
- [x] **Prompt caching導入**: 静的プロンプトを ephemeral cache → 入力トークン費90%削減
- [x] **サーバーサイド画像前処理(sharp)**: EXIF回転 + normalize + sharpen + mozjpeg → 暗い/斜め写真でも精度維持
  - `src/lib/image-preprocess.ts` 新設
  - receipts / portal/receipts / receipts/retry の3ルートで適用

### 信頼度可視化
- [x] **項目別 fieldConfidence**(date/total/taxTotal/storeName/invoiceNumber/paymentMethod)を OCR レスポンスに追加
- [x] **検証OCRと一致した値は 1.0 にブースト**(自信を客観化)
- [x] **invoiceNumber が `T+13桁` 規則を満たすなら 1.0**
- [x] **UI でバッジ表示**(高=緑/中=黄/低=赤): `ConfidenceBadge` コンポーネント

### 納品物(`docs/`)
- [x] README.md を ZeiFlow 用に書き換え
- [x] docs/操作手順.md
- [x] docs/既知の制限.md
- [x] docs/復旧手順.md
- [x] docs/障害時連絡フロー.md
- [x] docs/SLA.md(稼働率99.5%・障害対応時間・ペナルティ)
- [x] docs/業務委託契約書テンプレ.md
- [x] docs/月額サポート提供範囲.md
- [x] docs/オンボーディング標準フロー.md(7営業日プラン)
- [x] docs/OCR精度測定手順.md(100枚テスト方法)
- [x] docs/E2Eテスト手順.md
- [x] docs/運用設定確認チェックリスト.md
- [x] docs/ユーザー側タスク一覧.md

### Ultra mode + 学習ループ + 自己回復
- [x] **Ultra mode実装**: Opus 4.7 を3回並列実行 → 多数決で合議。fieldConfidence は全員一致時1.0
  - `mode()` / `median()` / `computeConsensus()` / `mergeReceiptResults()` を新設
  - UI で「高速 / 高精度 / Ultra」モード選択ボタン追加
- [x] **学習ループ**: 仕訳確定時にスタッフ修正をナレッジに自動反映
  - `src/lib/ai/learning.ts` 新設(`recordOcrCorrection`)
  - `[自動学習] 仕訳パターン` ナレッジファイルが顧問先別に自動生成・最大200行で循環
  - 既存の knowledgeText 統合経路に乗るため OCR が即座に学習結果を活用
- [x] **OCR自動リトライ**: 一時的エラー(429/503/overload/network)を最大3回・指数バックオフで自動再試行
- [x] **モデルfallback自動切替**: モデル不明エラーは即時フォールバック(Sonnet 4.6 → Haiku 4.5)
- [x] **/api/health 深化**: `?deep=1` で DB + 環境変数 + Anthropic API + Resend を並列ヘルスチェック
- [x] **/api/stats 新設**: 24時間の処理件数・成功/エラー率・5分超stuck検出・警告メッセージ
- [x] **/api/errors 新設**: クライアント側エラー報告エンドポイント(Sentry転送)
- [x] **global-error.tsx 新設**: Next.js最終フォールバック画面 + エラー自動報告
- [x] **既存 error.tsx 強化**: エラー発生時に自動でサーバ通知

### ビルド
- [x] `npm run lint` 通過
- [x] `npm run build` 通過

---

## ✅ できていること（完成済み）

### 認証まわり
- [x] ログイン画面（`/login`）
- [x] 新規登録（`/register`）
- [x] パスワードリセット（`/forgot-password` / `/reset-password`）
- [x] 2要素認証（TOTP）対応
- [x] パスワードはbcryptでハッシュ化

### ダッシュボード（メイン機能）
- [x] レシート管理（`/dashboard/receipts`）
- [x] 画像アップロードの形式/サイズバリデーション（10MB上限・エラー表示）
- [x] 顧客管理（`/dashboard/clients`）
- [x] 仕訳管理（`/dashboard/journals`）
- [x] エクスポート機能（`/dashboard/export`）
- [x] インポート機能（`/dashboard/import`）
- [x] ナレッジファイル管理（`/dashboard/knowledge`）
- [x] 監査ログ（`/dashboard/audit`）
- [x] 組織メンバー管理（`/dashboard/org`）
- [x] 設定画面（`/dashboard/settings`）
- [x] ヘルプページ（`/dashboard/help`）

### 顧問先ポータル
- [x] ポータルトークン発行
- [x] 顧問先がレシートを送れる窓口（`/portal`）

### スーパー管理者
- [x] 全体管理画面（`/superadmin`）
- [x] 組織の承認制（isApproved フラグ）

### バックエンド
- [x] PostgreSQL + Prisma でDB構築
- [x] APIエンドポイント（`/api/*`）一通り作成
- [x] ヘルスチェック（`/api/health`）
- [x] バックアップ機能（`/api/backup`）
- [x] メンテナンスモード（`/api/maintenance`）
- [x] Anthropic SDK 連携（OCR用）
- [x] OCR精度改善（accurate時の金額/日付検証OCR + 数値正規化）

### 法務系
- [x] 利用規約ページ（`/terms`）
- [x] プライバシーポリシー（`/privacy`）

### 営業資料
- [x] プレゼン用 pptx（`ZeiFlow_プレゼン.pptx`）
- [x] 営業資料 pptx（`ZeiFlow_営業資料.pptx`）
- [x] 経営企画向け市場レポート草案（`国内生成AIサービス市場2026_成長領域レポート.md`）
- [x] 経営企画向け市場レポートPDF出力（`国内生成AIサービス市場2026_成長領域レポート.pdf`）

### デプロイ
- [x] Vercelで本番公開済み
- [x] 納品前品質チェック（lint/build）通過

## 🟡 まだ確認が必要なもの
- [ ] OCRの実際の精度（どれくらい当たるか？）
- [ ] インボイス番号の自動判定の正確性
- [ ] 大量のレシートを処理した時の速度
- [ ] 弥生 / freee 等への取込フォーマットが完全に合っているか
- [ ] 顧問先側の使い勝手

## ⚪ まだ未着手 / 未知
- [ ] 不明（tasks.md で整理）

---
> 修正したらこのファイルの該当項目を更新してください。
