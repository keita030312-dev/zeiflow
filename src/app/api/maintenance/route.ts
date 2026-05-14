import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: "maintenance" } });
    return NextResponse.json({ maintenance: config?.value === "true" });
  } catch {
    return NextResponse.json({ maintenance: false });
  }
}
