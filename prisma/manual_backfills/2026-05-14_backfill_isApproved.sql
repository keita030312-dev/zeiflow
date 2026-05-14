-- 2026-05-14: isApproved 導入時の既存組織 backfill
--
-- 背景:
--   schema.prisma に Organization.isApproved (Boolean) を追加。
--   PostgreSQL に push したとき、既存組織は NOT NULL の新カラムを
--   default で埋められる。default を true にしているため通常は問題ないが、
--   過去に default=false だった環境 / db push の順序によっては
--   全組織がロックアウトされる可能性があるので、念のため backfill を実行する。
--
-- 適用タイミング:
--   このマイグレーションが適用された日(=2026-05-14)よりも前に作成された
--   組織は、承認制導入以前のユーザーなので一律 承認済み とみなす。
--
-- 多層防御:
--   1. schema.prisma: isApproved @default(true)
--   2. register API: 新規登録時は明示的に isApproved=false を入れる
--   3. login API: created_at < 2026-05-14 ならフォールバックで通す
--   4. このSQL: backfill で明示的に承認済みにする(本ファイル)

UPDATE organizations
SET is_approved = true
WHERE created_at < '2026-05-14T00:00:00Z'
  AND is_approved = false;

-- 実行ログ確認用
SELECT
  COUNT(*) AS backfilled_count
FROM organizations
WHERE created_at < '2026-05-14T00:00:00Z'
  AND is_approved = true;
