@AGENTS.md

# ZeiFlow プロジェクトメモ（Claude / Cursor 用）

## このアプリは何？
**税理士向けOCRアプリ「ZeiFlow」** です。
レシートや領収書の画像を読み取って、会計ソフトに取り込めるデータに変換します。

## OCRで何を読み取る？
- 📅 **日付**（取引日）
- 💴 **金額**（税込金額）
- 🧾 **税率**（10% / 8% など）
- 🆔 **インボイス番号**（適格請求書発行事業者の登録番号）

## 大事なルール
- ❌ **不明なものは無理に判断しない**（空欄でOK）
- ✅ **修正したら progress.md を更新する**
- ✅ **既存の機能を壊さない**
- ✅ **コードを書く前に `node_modules/next/dist/docs/` を確認**（このNext.jsは独自仕様）

## 続きから開発する時の合言葉
> 「CLAUDE.md を読んでください。zeiflow の続きから開発してください。」

## 関連ファイル
- [project.md](./project.md) — プロジェクト全体像（何のアプリ？誰が使う？）
- [progress.md](./progress.md) — 今どこまで出来てる？
- [tasks.md](./tasks.md) — 次に何をやる？
- [bugs.md](./bugs.md) — 今わかってる不具合
- [delivery-checklist.md](./delivery-checklist.md) — 納品前チェックリスト（★納品時必読）
- [ocr-accuracy-log.md](./ocr-accuracy-log.md) — OCR精度の実測ログ
- [AGENTS.md](./AGENTS.md) — Next.js のバージョン注意（重要）

## 開発の起動方法
```bash
npm run dev              # 開発サーバ (0.0.0.0:3000)
npm run build            # 本番ビルド
npm run lint             # ESLint
npm run db:push          # Prismaスキーマ反映
```

## 納品前は必ず

1. `delivery-checklist.md` を頭から消化(ビルド/E2E/OCR精度/運用設定/納品物)
2. OCR精度をサンプル10〜20枚で実測 → `ocr-accuracy-log.md` に記録
3. 既知の制限・障害時連絡先を顧客に渡す資料に明記

## 技術スタック(ざっくり)

- Next.js 16 + React 19(★AGENTS.md カスタム版警告必読)
- TypeScript / Tailwind CSS / shadcn-ui
- Prisma 7 + PostgreSQL(`@prisma/adapter-pg`)
- NextAuth v5 beta + bcryptjs + JWT
- Anthropic SDK(OCR用)
- Resend(メール送信)
- pptxgenjs(プレゼン資料生成)

## 危ない操作リスト

- ❌ 本番DBで `prisma migrate reset`
- ❌ `.env`の値をログ/コミット
- ❌ Anthropic APIキーを露出
- ❌ 既存OCRロジックを動作確認なしに置き換え
- ❌ mainブランチへの直push
