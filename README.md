# ZeiFlow

**税理士事務所向け レシートOCR + 仕訳変換 SaaS**

レシート/領収書を撮影 → OCRで自動読取 → インボイス対応の仕訳に変換 → 弥生・freee・MFクラウドへ取込可能なCSVで出力。
顧問先からはポータル経由でレシートを直接送れます。

---

## 主な機能

| 機能 | 説明 |
|---|---|
| レシートOCR | 画像から日付/金額/税率/インボイス番号を自動抽出(Anthropic Claude API) |
| 顧客管理 | 顧問先企業の管理、顧問先ごとのデータ分離 |
| 仕訳管理 | 自動生成された仕訳の編集・確定・削除 |
| エクスポート | 弥生 / freee / MFクラウド向けCSV、PDF出力 |
| 顧問先ポータル | クライアント企業がレシートを直接送れる窓口(トークン認証) |
| ナレッジ | 事務所固有の仕訳ルールをAIに学習させる |
| 監査ログ | 誰が・いつ・何をしたかの完全記録 |
| 組織管理 | 事務所内メンバーの権限管理 |
| 認証 | NextAuth v5 + bcrypt + 2要素認証(TOTP) |

---

## 技術スタック

- **フレームワーク**: Next.js 16(独自カスタム版・[AGENTS.md](./AGENTS.md) 必読)
- **言語**: TypeScript
- **DB**: PostgreSQL(Prisma 7)
- **AI**: Anthropic Claude API
- **認証**: NextAuth v5
- **メール**: Resend
- **UI**: shadcn/ui + Tailwind CSS 4
- **デプロイ**: Vercel

---

## セットアップ

### 必要環境
- Node.js 20+
- PostgreSQL 14+
- Anthropic APIキー
- Resend APIキー(メール送信用)

### 環境変数(`.env`)
```bash
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
NEXTAUTH_SECRET=<32文字以上のランダム文字列>
NEXTAUTH_URL=https://your-domain.com
```

### インストール & 起動
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev    # 開発: http://localhost:3000
npm run build && npm start  # 本番
```

### 納品前チェック
```bash
npm run lint
npm run build
```
詳細手順は [delivery-checklist.md](./delivery-checklist.md)。

---

## ドキュメント

### 開発・運用
- [project.md](./project.md) — プロジェクト全体像
- [progress.md](./progress.md) — 進捗状況
- [tasks.md](./tasks.md) — 残タスク
- [bugs.md](./bugs.md) — 既知の不具合
- [AGENTS.md](./AGENTS.md) — Next.js独自仕様の注意(コード変更前に必読)

### 納品物(`docs/`)
- [docs/操作手順.md](./docs/操作手順.md) — 3分で分かる使い方
- [docs/既知の制限.md](./docs/既知の制限.md) — OCR失敗ケースと推奨撮影条件
- [docs/復旧手順.md](./docs/復旧手順.md) — 障害発生時のリカバリ
- [docs/障害時連絡フロー.md](./docs/障害時連絡フロー.md) — エスカレーションと対応SLA
- [docs/SLA.md](./docs/SLA.md) — サービス品質保証
- [docs/業務委託契約書テンプレ.md](./docs/業務委託契約書テンプレ.md) — BtoB契約用ひな形
- [docs/月額サポート提供範囲.md](./docs/月額サポート提供範囲.md) — 月額契約に含まれる/含まれない
- [docs/オンボーディング標準フロー.md](./docs/オンボーディング標準フロー.md) — 導入1週間で運用開始
- [docs/OCR精度測定手順.md](./docs/OCR精度測定手順.md) — 100枚評価の進め方
- [docs/E2Eテスト手順.md](./docs/E2Eテスト手順.md) — 本番動作確認チェックリスト
- [docs/運用設定確認チェックリスト.md](./docs/運用設定確認チェックリスト.md) — APIキー/メール/バックアップ確認
- [docs/ユーザー側タスク一覧.md](./docs/ユーザー側タスク一覧.md) — 開発者(あなた)が用意するもの

---

## ライセンス・規約

- [/terms](./src/app/terms) — 利用規約
- [/privacy](./src/app/privacy) — プライバシーポリシー

商用利用については別途契約。詳細は [docs/業務委託契約書テンプレ.md](./docs/業務委託契約書テンプレ.md) 参照。
