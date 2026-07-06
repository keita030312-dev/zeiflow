-- 2026-07-07: 税区分を借方/貸方に分離
-- 冪等: 何度流しても安全

ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "debit_tax_category"  TEXT;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "credit_tax_category" TEXT;

-- バックフィル: 現行エクスポータが実際に税区分を出力している行のみ
-- (tax_rate/tax_amount ゲートは freee.ts/moneyforward.ts/yayoi.ts の出力条件を踏襲)
-- 貸方が売上系 → 貸方税区分へ、それ以外 → 借方税区分へ
UPDATE "journal_entries" SET "credit_tax_category" = "tax_category"
WHERE "tax_category" IS NOT NULL AND "tax_category" <> ''
  AND ("tax_rate" IS NOT NULL OR "tax_amount" IS NOT NULL)
  AND "debit_tax_category" IS NULL AND "credit_tax_category" IS NULL
  AND "credit_account" IN ('売上高', '受取利息', '雑収入');

UPDATE "journal_entries" SET "debit_tax_category" = "tax_category"
WHERE "tax_category" IS NOT NULL AND "tax_category" <> ''
  AND ("tax_rate" IS NOT NULL OR "tax_amount" IS NOT NULL)
  AND "debit_tax_category" IS NULL AND "credit_tax_category" IS NULL
  AND "credit_account" NOT IN ('売上高', '受取利息', '雑収入');

-- tax_rate のみの行(OCR自動作成など)はバックフィルしない:
-- 内税/外税の判定に顧客の accountingMethod が必要なため、
-- エクスポート時の deriveTaxCategory フォールバックに委ねる(現行挙動と同一)
