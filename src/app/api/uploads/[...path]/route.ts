import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { readFile, stat } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { path: pathSegments } = await params;

  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json({ error: "パスが必要です" }, { status: 400 });
  }

  // Validate no path traversal
  for (const segment of pathSegments) {
    if (segment === ".." || segment.includes("..") || segment.includes("~")) {
      return NextResponse.json(
        { error: "不正なパスです" },
        { status: 400 }
      );
    }
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadsDir, ...pathSegments);

  // Ensure resolved path is within uploads directory
  const resolvedPath = path.resolve(filePath);
  const resolvedUploadsDir = path.resolve(uploadsDir);
  if (!resolvedPath.startsWith(resolvedUploadsDir)) {
    return NextResponse.json(
      { error: "不正なパスです" },
      { status: 400 }
    );
  }

  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "ファイルが見つかりません" },
      { status: 404 }
    );
  }
}
