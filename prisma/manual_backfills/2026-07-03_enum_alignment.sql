-- 2026-07-03: enumドリフト修正
-- 背景: 2026-06-17 の手動マイグレーションで accounting_method / account_masters.type を
--        TEXT で作成したが、schema.prisma は enum(AccountingMethod / AccountType)を宣言している。
--        このドリフトにより prisma.client.create() / prisma.accountMaster.create() が
--        『type "public.AccountingMethod" does not exist』で失敗する（新規顧客作成が不能）。
-- 対応: enum型を作成し、既存TEXTカラムをキャストして揃える。
-- 事前確認済み(2026-07-03): clients.accounting_method は全4行 'TAX_INCLUSIVE'、
--                            account_masters は0行。キャスト失敗の余地なし。

BEGIN;

-- 1. AccountingMethod enum を作成（存在しない場合のみ）
DO $$ BEGIN
  CREATE TYPE "AccountingMethod" AS ENUM ('TAX_INCLUSIVE', 'TAX_EXCLUSIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. clients.accounting_method を TEXT → AccountingMethod へ
ALTER TABLE "clients" ALTER COLUMN "accounting_method" DROP DEFAULT;
ALTER TABLE "clients"
  ALTER COLUMN "accounting_method" TYPE "AccountingMethod"
  USING "accounting_method"::"AccountingMethod";
ALTER TABLE "clients"
  ALTER COLUMN "accounting_method" SET DEFAULT 'TAX_INCLUSIVE'::"AccountingMethod";

-- 3. AccountType enum を作成（存在しない場合のみ）
DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. account_masters.type を TEXT → AccountType へ（0行なので即時）
ALTER TABLE "account_masters"
  ALTER COLUMN "type" TYPE "AccountType"
  USING "type"::"AccountType";

COMMIT;
