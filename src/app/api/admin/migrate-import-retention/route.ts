import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const statements = [
  `ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "imported_at" TIMESTAMP(3)`,
  `ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "delete_after" TIMESTAMP(3)`,
  `ALTER TABLE "export_logs" ADD COLUMN IF NOT EXISTS "import_confirmed_at" TIMESTAMP(3)`,
  `ALTER TABLE "export_logs" ADD COLUMN IF NOT EXISTS "delete_after" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "receipts_organization_id_uploaded_at_idx" ON "receipts"("organization_id", "uploaded_at")`,
  `CREATE INDEX IF NOT EXISTS "receipts_organization_id_client_id_uploaded_at_idx" ON "receipts"("organization_id", "client_id", "uploaded_at")`,
  `CREATE INDEX IF NOT EXISTS "receipts_organization_id_status_uploaded_at_idx" ON "receipts"("organization_id", "status", "uploaded_at")`,
  `CREATE INDEX IF NOT EXISTS "receipts_delete_after_idx" ON "receipts"("delete_after")`,
  `CREATE INDEX IF NOT EXISTS "journal_entries_organization_id_client_id_date_idx" ON "journal_entries"("organization_id", "client_id", "date")`,
  `CREATE INDEX IF NOT EXISTS "journal_entries_organization_id_is_confirmed_date_idx" ON "journal_entries"("organization_id", "is_confirmed", "date")`,
  `CREATE INDEX IF NOT EXISTS "journal_entries_receipt_id_idx" ON "journal_entries"("receipt_id")`,
  `CREATE INDEX IF NOT EXISTS "export_logs_organization_id_client_id_exported_at_idx" ON "export_logs"("organization_id", "client_id", "exported_at")`,
  `CREATE INDEX IF NOT EXISTS "export_logs_import_confirmed_at_idx" ON "export_logs"("import_confirmed_at")`,
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
