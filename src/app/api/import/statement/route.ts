import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getScope } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import {
  MAX_STATEMENT_TRANSACTIONS,
  STATEMENT_ACCOUNTS,
  statementTransactionSchema,
} from "@/lib/statement-import";
import { z } from "zod";

function buildPrompt(statementType: "bank" | "credit"): string {
  const creditSide = statementType === "credit" ? "未払金" : "普通預金";
  const typeDesc = statementType === "credit" ? "クレジットカード利用明細" : "銀行通帳・口座明細";

  return `あなたは日本の税理士として、${typeDesc}から仕訳を起こします。

利用可能な勘定科目: ${STATEMENT_ACCOUNTS.join("、")}

この${typeDesc}に記載されているすべての支払取引を、以下のJSON配列として出力してください。
JSONのみ返答し、余計な説明は不要です。

[
  {
    "date": "YYYY-MM-DD",
    "description": "摘要・店名・取引先（原文に近い形で）",
    "amount": 金額（税込・整数・正の数）,
    "debitAccount": "借方勘定科目",
    "creditAccount": "${creditSide}",
    "taxRate": 消費税率（0.1 または 0.08 または null）,
    "taxAmount": 税額（整数またはnull）,
    "memo": ""
  }
]

勘定科目の分類基準:
- 電車・バス・タクシー・Suica・交通費 → 旅費交通費
- コンビニ・文具・事務用品・日用品・雑貨 → 消耗品費
- 電気・ガス・水道 → 水道光熱費
- 電話・携帯・スマホ・インターネット・Wi-Fi → 通信費
- 家賃・賃料・駐車場 → 地代家賃
- 保険料 → 保険料
- 給与・給料・賞与 → 給料手当
- 飲食・会食・接待・食事 → 接待交際費
- 広告・チラシ・PR・SNS広告 → 広告宣伝費
- 振込手数料・ATM手数料・口座手数料 → 支払手数料
- 修理・修繕 → 修繕費
- 書籍・新聞・雑誌・Kindle → 新聞図書費
- 外注・業務委託・フリーランス支払 → 外注費
- ソフトウェア・SaaS・サブスクリプション → 消耗品費
- 入金（売上・振込入金）: 借方=普通預金、貸方=売上高
- 利息受取: 借方=普通預金、貸方=受取利息
- 不明な支出 → 雑費

除外する行:
- ATM引出し（現金化のみ）
- 口座間振替・残高確認・繰越・前月繰越
- 金額が0またはマイナスの取引`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const scope = getScope(auth);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;
    const statementTypeValue = (formData.get("statementType") as string) || "bank";

    if (!file || !clientId) {
      return NextResponse.json({ error: "ファイルと顧客を選択してください" }, { status: 400 });
    }
    if (statementTypeValue !== "bank" && statementTypeValue !== "credit") {
      return NextResponse.json({ error: "明細種別が不正です" }, { status: 400 });
    }
    const statementType = statementTypeValue;

    const client = await prisma.client.findFirst({
      where: { id: clientId, ...scope },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { anthropicApiKey: true },
    });
    const apiKey =
      user?.anthropicApiKey ||
      (process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")
        ? process.env.ANTHROPIC_API_KEY
        : null);
    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    // ファイルサイズ上限 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "ファイルサイズは20MB以下にしてください" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "application/octet-stream";
    const isPdf = mimeType === "application/pdf";

    const supportedImages = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!isPdf && !supportedImages.includes(mimeType)) {
      return NextResponse.json(
        { error: "PDF・JPEG・PNG・WEBP・GIF 形式のファイルをアップロードしてください" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const prompt = buildPrompt(statementType);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = isPdf
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: prompt },
        ]
      : [
          { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
          { type: "text", text: prompt },
        ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: "user", content: content as any }],
    });

    const text = response.content.find((c) => c.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (response.content.find((c) => c.type === "text") as any).text
      : "";

    const jsonMatch = (text as string).match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "取引データを抽出できませんでした。明細がはっきり映ったファイルを使用してください。" },
        { status: 422 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "抽出データのパースに失敗しました" },
        { status: 422 }
      );
    }

    const parsedTransactions = z
      .array(statementTransactionSchema)
      .max(MAX_STATEMENT_TRANSACTIONS)
      .safeParse(parsed);
    if (!parsedTransactions.success) {
      return NextResponse.json(
        { error: "抽出結果に不正な取引データが含まれています" },
        { status: 422 },
      );
    }

    return NextResponse.json({
      transactions: parsedTransactions.data,
      total: parsedTransactions.data.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "処理中にエラーが発生しました", detail: msg }, { status: 500 });
  }
}
