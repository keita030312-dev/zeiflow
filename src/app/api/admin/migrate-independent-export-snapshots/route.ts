import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const statements = [
  `ALTER TABLE "exported_journals" ADD COLUMN IF NOT EXISTS "receipt_id" TEXT`,
  `ALTER TABLE "exported_journals" DROP CONSTRAINT IF EXISTS "exported_journals_journal_entry_id_fkey"`,
  `CREATE INDEX IF NOT EXISTS "exported_journals_receipt_id_idx" ON "exported_journals"("receipt_id")`,
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
