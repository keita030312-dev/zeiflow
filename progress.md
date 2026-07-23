# 進捗状況（progress.md）

最終更新：2026-07-23

## 📋 2026-07-23 本番障害修正: 大きい画像の413エラー（PR #17）

- [x] **iPhone写真(4.5MB超)のアップロードが「The string did not match the expected pattern.」で失敗する本番障害を修正**: 原因はVercelのBody上限4.5MB超過(413)+非JSON応答を `res.json()` が解釈できないSafari固有エラー。①`image-compress.ts` を段階的圧縮(幅1600/1200×品質0.92〜0.6)に書き直し送信4MB以下を保証、デコード失敗時に原本を無圧縮送信するすり抜けを封鎖 ②`api-response.ts` 新設(`readJsonOrThrow`)で413/504等を日本語メッセージ化 ③portal/receipts両画面に適用。実ブラウザ9ケース検証全PASS(7.85MB→0.80MB)。ブランチ `fix/upload-413-large-images`
- [ ] 残: PR #17 のマージ+本番デプロイ(マージまで顧客環境では再発しうる)

## 📋 2026-07-07 納品前全数検査（delivery-check）と修正

- [x] **レシート画面の税区分プレフィルが顧客の税込/税抜設定を無視するバグを修正**（`de393de`）: OCR一括登録・レシート編集の `splitLegacyTaxCategory` に顧客の `accountingMethod` を渡すように。税抜顧客に「内税」区分がプリセットされる不整合を解消。journals API の税区分3フィールドに `.max(100)` も追加
- [x] **manifest.json が認証プロキシに捕まり全ページで「Manifest: Syntax error」が出るバグを修正**（`b3b14c6`）: proxy.ts の静的スキップに manifest.json / robots.txt / sitemap.xml を追加。本番デプロイ・解消確認済み
- [x] **UI仕上げ**（`50adaa7`）: 仕訳インライン編集の列min-width、dateカレンダーアイコンの二重反転修正
- [x] 本番E2E: 使い捨てQA組織で 登録→顧客作成→仕訳CRUD→CSV3種（弥生バイト列検証込み）→PDF→ポータルリンク→API異常系(401/404/400)→QA組織SQL削除 まで完走。詳細は `delivery-checklist.md`
- [ ] 残: OCR実走E2E・精度実測（要APIキー登録+実レシート）、2FA有ログイン、10MB超エラー表示、ポータル送信フロー

## 📋 2026-06-14 顧客フィードバック対応（全機能）

### 仕訳管理（`/dashboard/journals`）
- [x] **税区分を借方/貸方に分離（2026-07-07）**: 「税率」欄を廃止し、借方税区分・貸方税区分の2セレクトに変更。税率は選択した税区分からサーバー側で自動導出（taxAmount計算は従来どおり）。DB に `debit_tax_category`/`credit_tax_category` 追加（`prisma/manual_backfills/2026-07-07_split_tax_category.sql`、本番適用済み）。旧 `tax_category`/`tax_rate` はフォールバック用に残置。CSV出力3種は新フィールド優先+旧データは従来ロジック（ゴールデンテストで既存出力の無変化を確認済み）。仕訳管理・レシート両画面の全フォーム（インライン編集/新規/一括編集/モバイル）対応
- [x] **消費税区分欄を追加**: 仕訳テーブルに「税率」列（10%=青/8%=橙/-=なし）、編集フォーム・新規登録フォーム・モバイルビュー全て対応 ※2026-07-07に上記へ置き換え
- [x] **勘定科目 一括置換機能**: 「一括置換」ボタン → 借方/貸方/両方 × 変更前→変更後を選択して未確定仕訳を一括変更（`/api/journals/bulk-replace` 新設）

### CSV エクスポート修正（弥生・MoneyForward・freee）
- [x] **弥生会計 インポートエラー修正**: 列名「借方金額(税込)」「貸方金額(税込)」に統一、識別フラグを数値→文字列、タイプ/調整フィールドを空文字に修正、借方税金額を未設定時は空欄に修正、摘要・メモ内の `\r\n` 除去
- [x] **MoneyForward MF仕訳タイプ修正**: `"開始仕訳"` → `"通常仕訳"` に修正、`\r\n` 除去
- [x] **freee CSV `\r\n` 除去**

### エクスポート設定（`/dashboard/export`）
- [x] **前回出力済みを除く**: チェックボックスで同一顧客・同一形式の出力済み期間を自動除外（DB追加なし、ExportLog から JS でフィルタ）
- [x] **periodEnd の日付バグ修正**: 終了日 23:59:59 で ExportLog を保存するよう修正

### 通帳・クレカ明細インポート（新機能）
- [x] **`/api/import/statement`**: PDF/JPEG/PNG/WEBP を受け取り Claude AIで仕訳を自動抽出（通帳=貸方:普通預金 / クレカ=貸方:未払金）
- [x] **`/api/import/statement/save`**: 確認済み取引を `JournalEntry` として一括登録、AuditLog に記録
- [x] **インポートページにタブ追加**: 「CSV」「通帳・クレカ明細（PDF/画像）」タブ切り替え、アップロード→AI抽出中スピナー→全行編集可能なプレビューテーブル→仕訳登録→完了 の3ステップフロー

### ビルド確認
- [x] `npx tsc --noEmit` 型エラーなし

---

## 🌐 2026-06-02 ホームページ全面リニューアル

- [x] **ヘッダーナビ追加**: 機能 / 料金 / その他サービス / よくある質問 / 無料相談 のアンカーリンク
- [x] **信頼バー**: ヒーロー直下に5つの信頼シグナル（AI×会計・初回無料・導入サポート込み等）
- [x] **課題セクション**: 税理士事務所の4つのペインポイント → ZeiFlowが解決 の流れ
- [x] **料金プラン3段階**: 初回無料面談 / 顧問¥20,000〜 / 伴走支援¥300,000〜
- [x] **その他サービス**: AI研修・トレーニング / AIアプリ開発支援 / AI活用なんでも相談
- [x] **「なぜ私たちか」セクション**: 3つの強み + 安心して相談できる4理由（架空の声は排除）
- [x] **FAQ 6問**: アコーディオン形式
- [x] **無料相談フォーム** (`/api/contact`): 事務所名・氏名・メール必須、zod バリデーション、Resend で通知メール＋自動返信
- [x] **フッター強化**: メールアドレス直接表示・対応時間・サービスナビリンク
- [x] `npm run build` 通過

---

## 🔒 2026-05-30 セキュリティ修正（Codex レビュー対応）

- [x] **2FA bypass 修正**: `/api/auth/login-form` に TOTP 検証を追加（form login 経由の 2FA スキップを閉鎖）
- [x] **仕訳 API テナント境界修正**: `clientId`/`receiptId` 所有確認追加、PUT の更新可能フィールドを zod schema で制限
- [x] **一括確定 API テナント境界修正**: `bulk-confirm` のレシート参照解除・削除も `getScope` 範囲内に制限
- [x] **ポータル認証 組織ゲート強化**: `checkOrgGate()` をポータル認証に適用（停止中・承認待ち組織はポータルアクセスも遮断）
- [x] **ポータルトークン生成強化**: `randomUUID()` → `randomBytes(32).toString("base64url")` に変更
- [x] **ポータル OCR 空結果対策**: OCR 結果 0 件なら失敗扱い（空のまま COMPLETED になるのを防止）
- [x] **Next 16 proxy body buffer 対策**: `experimental.proxyClientMaxBodySize: "15mb"` を `next.config.ts` に設定
- [x] `npm run build` 通過

仕様確定:
- ポータルリンクは **期限なし** が確定仕様（漏洩時は管理画面から無効化・再発行）
- 監査ログには「期限なし」と記録

---

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
