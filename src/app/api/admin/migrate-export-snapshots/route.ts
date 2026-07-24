import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const statements = [
  `CREATE TABLE IF NOT EXISTS "exported_journals" (
    "export_log_id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "journal_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exported_journals_pkey" PRIMARY KEY ("export_log_id", "journal_entry_id"),
    CONSTRAINT "exported_journals_export_log_id_fkey" FOREIGN KEY ("export_log_id") REFERENCES "export_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "exported_journals_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "exported_journals_journal_entry_id_idx" ON "exported_journals"("journal_entry_id")`,
  // 旧ロジックで予約された可能性がある削除を安全側で解除する。
  `UPDATE "receipts" SET "imported_at" = NULL, "delete_after" = NULL WHERE "delete_after" IS NOT NULL`,
  `UPDATE "export_logs" SET "import_confirmed_at" = NULL, "delete_after" = NULL WHERE "delete_after" IS NOT NULL`,
];

export async function POST(req: NextRequest) {
  const expected = process.env.SUPER_ADMIN_SECRET?.replace(/"/g, "").trim();
  const provided = req.headers.get("x-admin-secret")?.replace(/"/g, "").trim();
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  return NextResponse.json({ success: true, statements: statements.length });
}
