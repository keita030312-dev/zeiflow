import { NextRequest, NextResponse } from "next/server";
import { getPortalClientInfo } from "@/lib/portal-auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "トークンが必要です" }, { status: 401 });
  }

  const info = await getPortalClientInfo(token);
  if (!info) {
    return NextResponse.json({ error: "無効なリンクです" }, { status: 401 });
  }

  return NextResponse.json(info);
}
