-- 2026-06-17: 消費税処理設定・税区分・勘定科目マスタ追加 (idempotent)
--
-- 追加内容:
--   1. clients に accounting_method カラム
--   2. journal_entries に tax_category カラム
--   3. account_masters テーブル新規作成

-- 1. clients: accounting_method
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "accounting_method" TEXT NOT NULL DEFAULT 'TAX_INCLUSIVE';

-- 2. journal_entries: tax_category
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "tax_category" TEXT;

-- 3. account_masters テーブル
CREATE TABLE IF NOT EXISTS "account_masters" (
  "id"              TEXT NOT NULL,
  "code"            TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "type"            TEXT NOT NULL,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "sort_order"      INTEGER NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id"         TEXT NOT NULL,
  "organization_id" TEXT,
  CONSTRAINT "account_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_code_user" ON "account_masters"("code", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "account_code_org"  ON "account_masters"("code", "organization_id");

DO $$ BEGIN
  ALTER TABLE "account_masters"
    ADD CONSTRAINT "account_masters_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "account_masters"
    ADD CONSTRAINT "account_masters_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
