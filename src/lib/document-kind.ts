import type { DocumentKind } from "@/generated/prisma/enums";

export function parseDocumentKind(value: unknown): DocumentKind {
  const v = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (v === "INVOICE") return "INVOICE";
  if (v === "OFFICIAL_RECEIPT") return "OFFICIAL_RECEIPT";
  return "RECEIPT";
}
