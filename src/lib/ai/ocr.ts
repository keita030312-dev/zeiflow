import Anthropic from "@anthropic-ai/sdk";
import type { OcrResult, ClassificationResult } from "@/types";
import { ACCOUNT_CATEGORIES } from "@/types";
import { prisma } from "@/lib/db";

function getAnthropicClient(apiKey?: string | null) {
  const key = apiKey || (process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-") ? process.env.ANTHROPIC_API_KEY : null);
  if (!key) {
    throw new Error("APIキーが設定されていません。設定ページでAnthropicのAPIキーを登録してください。");
  }
  return new Anthropic({ apiKey: key });
}

export async function processReceipt(
  imageBase64: string,
  mimeType: string = "image/jpeg",
  userId?: string
): Promise<{ ocr: OcrResult & { invoiceNumber?: string }; classification: ClassificationResult }> {
  let userApiKey: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { anthropicApiKey: true } });
    userApiKey = user?.anthropicApiKey || null;
  }
  const anthropic = getAnthropicClient(userApiKey);
  const accountList = ACCOUNT_CATEGORIES.map(
    (a) => `${a.name}`
  ).join("、");

  const today = new Date().toISOString().split("T")[0];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `このレシート/領収書を読み取ってJSONで返してください。

読み取りルール:
- 店舗名、日付(YYYY-MM-DD)、各品目、合計金額を正確に読み取る
- 令和変換: R6=2024, R7=2025, R8=2026
- 「T」で始まる13桁のインボイス登録番号があれば必ず読み取る（T+数字13桁）
- 日付不明なら${today}を使用

勘定科目: ${accountList}

仕訳ルール:
- 食品→福利厚生費、文具→消耗品費、飲食店→会議費(5000円以下)or接待交際費
- タクシー/電車→旅費交通費、ガソリン→車両費、書籍→新聞図書費、郵便→通信費
- 貸方は通常「現金」、クレカ払い→「未払金」
- 税率: 食品8%、それ以外10%、※マーク付き→8%

JSONのみ出力:
{"ocr":{"storeName":"店舗名","date":"YYYY-MM-DD","items":[{"name":"品名","amount":数値,"taxRate":0.1}],"total":合計数値,"taxTotal":税額数値,"paymentMethod":"現金","invoiceNumber":"T1234567890123またはnull","rawText":"主要テキスト"},"classification":{"debitAccount":"借方科目","creditAccount":"貸方科目","amount":合計数値,"taxAmount":税額数値,"taxRate":税率数値,"description":"店舗名 内容","confidence":0.9}}`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // JSON部分を抽出
  const codeBlockMatch = text.match(/```json?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonStr) {
    throw new Error("AIからの応答を解析できませんでした: " + text.slice(0, 300));
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error("JSONの解析に失敗しました: " + jsonStr.slice(0, 300));
  }
}
