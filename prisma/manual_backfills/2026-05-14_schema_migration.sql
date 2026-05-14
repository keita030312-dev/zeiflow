-- 2026-05-14: schema migration (additive only, idempotent)
--
-- Prisma 7 の prisma db push が IPv6 経由で Neon に接続できない問題
-- のため、生 SQL で適用。すべて IF NOT EXISTS / DO block で冪等化。
--
-- 追加内容:
--   1. enum DocumentKind
--   2. table system_config
--   3. table client_portal_tokens
--   4. table knowledge_files
--   5. organizations に is_active / is_approved / plan / note
--   6. receipts に document_kind

-- 1. New enum: DocumentKind
DO $$ BEGIN
  CREATE TYPE "DocumentKind" AS ENUM ('RECEIPT', 'INVOICE', 'OFFICIAL_RECEIPT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. New table: system_config
CREATE TABLE IF NOT EXISTS "system_config" (
  "id" TEXT NOT NULL DEFAULT 'system',
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "system_config_key_key" ON "system_config"("key");

-- 3. New table: client_portal_tokens
CREATE TABLE IF NOT EXISTS "client_portal_tokens" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT,
  "label" TEXT,
  "expires_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_accessed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_portal_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_portal_tokens_token_key" ON "client_portal_tokens"("token");

DO $$ BEGIN
  ALTER TABLE "client_portal_tokens"
    ADD CONSTRAINT "client_portal_tokens_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "client_portal_tokens"
    ADD CONSTRAINT "client_portal_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "client_portal_tokens"
    ADD CONSTRAINT "client_portal_tokens_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. New table: knowledge_files
CREATE TABLE IF NOT EXISTS "knowledge_files" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "extracted_text" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT,
  "client_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_files_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "knowledge_files"
    ADD CONSTRAINT "knowledge_files_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "knowledge_files"
    ADD CONSTRAINT "knowledge_files_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "knowledge_files"
    ADD CONSTRAINT "knowledge_files_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. New columns on organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "is_approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "note" TEXT;

-- 6. New column on receipts
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "document_kind" "DocumentKind" NOT NULL DEFAULT 'RECEIPT';

-- 7. backfill (from 2026-05-14_backfill_isApproved.sql)
--    既存組織は schema default が true なので原則該当0件、安全網として実行
UPDATE organizations
SET is_approved = true
WHERE created_at < '2026-05-14T00:00:00Z'
  AND is_approved = false;
