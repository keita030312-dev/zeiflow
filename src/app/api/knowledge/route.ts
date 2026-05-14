import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { reportError } from "@/lib/error-reporter";

// GET: ナレッジ一覧
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const scope = getScope(auth);
  const clientId = req.nextUrl.searchParams.get("clientId");

  const files = await prisma.knowledgeFile.findMany({
    where: {
      ...scope,
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mimeType: true,
      fileSize: true,
      clientId: true,
      createdAt: true,
      client: { select: { name: true, code: true } },
    },
  });

  return NextResponse.json(files);
}

// POST: ナレッジアップロード
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルを選択してください" },
        { status: 400 }
      );
    }

    // clientId が指定された場合、認証ユーザーの scope に属する client か検証
    // 他テナントの clientId を指定して hidden knowledge を仕込まれるのを防ぐ
    if (clientId) {
      const scope = getScope(auth);
      const allowedClient = await prisma.client.findFirst({
        where: { id: clientId, ...scope },
        select: { id: true },
      });
      if (!allowedClient) {
        return NextResponse.json(
          { error: "指定された顧客にアクセスできません" },
          { status: 403 }
        );
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "application/octet-stream";

    // テキスト抽出
    let extractedText = "";

    if (mimeType === "application/pdf") {
      // PDFのテキスト抽出: Anthropic Claude APIを使用
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const user = await prisma.user.findUnique({
        where: { id: auth.id },
        select: { anthropicApiKey: true },
      });
      const apiKey = user?.anthropicApiKey || (process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-") ? process.env.ANTHROPIC_API_KEY : null);
      if (!apiKey) {
        return NextResponse.json(
          { error: "PDFの読み取りにはAnthropicのAPIキーが必要です" },
          { status: 400 }
        );
      }
      const client = new Anthropic({ apiKey });
      const prompt = "このPDFの内容を全てテキストとして書き出してください。表があれば表形式で出力してください。余計な説明は不要です。内容のみ出力してください。";

      // 方式1: documentタイプ（Sonnet系）
      // 方式2: documentタイプ（旧モデル）
      // 方式3: テキストとしてbase64を直接渡す（最終手段）
      const attempts = [
        { model: "claude-sonnet-4-20250514", type: "document" },
        { model: "claude-3-5-sonnet-20241022", type: "document" },
        { model: "claude-3-haiku-20240307", type: "document" },
        { model: "claude-sonnet-4-20250514", type: "text" },
        { model: "claude-3-5-sonnet-20241022", type: "text" },
      ];

      let success = false;
      for (const attempt of attempts) {
        try {
          let messages;
          if (attempt.type === "document") {
            messages = [{
              role: "user" as const,
              content: [
                { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } },
                { type: "text" as const, text: prompt },
              ],
            }];
          } else {
            // テキストモード: PDFのbase64を説明と一緒に渡す
            messages = [{
              role: "user" as const,
              content: `以下はPDFファイルのbase64エンコードデータです。可能な範囲で内容を読み取ってテキストとして出力してください。\n\ndata:application/pdf;base64,${base64.substring(0, 10000)}\n\n${prompt}`,
            }];
          }

          const response = await client.messages.create({
            model: attempt.model,
            max_tokens: 4096,
            messages,
          });
          const text = response.content[0].type === "text" ? response.content[0].text : "";
          if (text && text.length > 10) {
            extractedText = text;
            success = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!success) {
        // 最終手段: PDFのファイル名だけでもナレッジとして登録
        extractedText = `[PDFファイル: ${file.name}] - テキスト抽出に失敗しました。CSVまたはテキストファイルでの登録をお試しください。`;
      }
    } else if (mimeType === "text/csv" || mimeType === "text/plain" || mimeType === "text/tab-separated-values") {
      extractedText = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "PDF、CSV、テキストファイルのみ対応しています" },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "ファイルからテキストを抽出できませんでした" },
        { status: 400 }
      );
    }

    // 最大文字数制限（プロンプトに収まるように）
    const maxChars = 30000;
    if (extractedText.length > maxChars) {
      extractedText = extractedText.substring(0, maxChars);
    }

    const knowledge = await prisma.knowledgeFile.create({
      data: {
        name: file.name,
        mimeType,
        extractedText,
        fileSize: buffer.length,
        userId: auth.id,
        ...(auth.orgId ? { organizationId: auth.orgId } : {}),
        ...(clientId ? { clientId } : {}),
      },
    });

    // 監査ログ
    await prisma.auditLog.create({
      data: {
        action: "KNOWLEDGE_UPLOAD",
        detail: `仕訳ナレッジ登録: ${file.name} (${Math.round(buffer.length / 1024)}KB)`,
        userId: auth.id,
        ...(auth.orgId ? { organizationId: auth.orgId } : {}),
      },
    });

    return NextResponse.json({
      id: knowledge.id,
      name: knowledge.name,
      textLength: extractedText.length,
    });
  } catch (error) {
    console.error("Knowledge upload error:", error);
    reportError(error instanceof Error ? error : new Error(String(error)), { source: "knowledge" });
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "ファイルの処理に失敗しました: " + message },
      { status: 500 }
    );
  }
}

// DELETE: ナレッジ削除
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "IDが必要です" },
      { status: 400 }
    );
  }

  const scope = getScope(auth);
  const existing = await prisma.knowledgeFile.findFirst({
    where: { id, ...scope },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "ナレッジが見つかりません" },
      { status: 404 }
    );
  }

  await prisma.knowledgeFile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
