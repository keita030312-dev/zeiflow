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
  userId?: string,
  quality: "fast" | "accurate" = "fast"
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

  const model = quality === "accurate" ? "claude-sonnet-4-20250514" : "claude-haiku-4-20250414";

  const response = await anthropic.messages.create({
    model,
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

【厳守ルール】
1. 金額は必ずレシートに印字された数字と完全一致させる。四捨五入や推測は禁止
2. 合計金額=「合計」「お買上」「ご利用金額」欄の数字をそのまま使う
3. 各品目の金額の合計がtotalと一致するか検算すること
4. インボイス登録番号はT+数字ちょうど13桁（合計14文字）。14桁や12桁の数字にならないよう必ず確認。例: T1234567890123
5. 日付: 令和変換 R6=2024, R7=2025, R8=2026。不明なら${today}
6. 金額は全て整数（円単位）。小数点不可

勘定科目: ${accountList}

仕訳: 食品→福利厚生費、文具→消耗品費、飲食5000円以下→会議費、飲食5000円超→接待交際費、タクシー/電車→旅費交通費、ガソリン→車両費、書籍→新聞図書費、郵便→通信費、貸方は通常「現金」、クレカ→「未払金」、税率: 食品8%/その他10%/※マーク→8%

JSONのみ出力（説明文禁止）:
{"ocr":{"storeName":"店舗名","date":"YYYY-MM-DD","items":[{"name":"品名","amount":整数,"taxRate":0.1}],"total":整数,"taxTotal":整数,"paymentMethod":"現金","invoiceNumber":"T+13桁数字またはnull","rawText":"主要テキスト"},"classification":{"debitAccount":"借方科目","creditAccount":"貸方科目","amount":整数,"taxAmount":整数,"taxRate":数値,"description":"店舗名 内容","confidence":0.9}}`,
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
    const parsed = JSON.parse(jsonStr);

    // バリデーション＆自動修正
    // インボイス番号: T+13桁に正規化
    if (parsed.ocr?.invoiceNumber) {
      let inv = String(parsed.ocr.invoiceNumber).replace(/[\s\-]/g, "");
      if (!inv.startsWith("T")) inv = "T" + inv;
      // Tの後が13桁でなければnullに
      const digits = inv.slice(1).replace(/\D/g, "");
      if (digits.length === 13) {
        parsed.ocr.invoiceNumber = "T" + digits;
      } else {
        parsed.ocr.invoiceNumber = null;
      }
    }

    // 金額を整数に
    if (parsed.ocr?.total) parsed.ocr.total = Math.round(Number(parsed.ocr.total));
    if (parsed.ocr?.taxTotal) parsed.ocr.taxTotal = Math.round(Number(parsed.ocr.taxTotal));
    if (parsed.classification?.amount) parsed.classification.amount = Math.round(Number(parsed.classification.amount));
    if (parsed.classification?.taxAmount) parsed.classification.taxAmount = Math.round(Number(parsed.classification.taxAmount));
    if (parsed.ocr?.items) {
      parsed.ocr.items = parsed.ocr.items.map((item: { name: string; amount: number; taxRate?: number }) => ({
        ...item,
        amount: Math.round(Number(item.amount)),
      }));
    }

    // classification.amountがocr.totalと一致しなければocr.totalを採用
    if (parsed.ocr?.total && parsed.classification?.amount && parsed.ocr.total !== parsed.classification.amount) {
      parsed.classification.amount = parsed.ocr.total;
    }

    return parsed;
  } catch (e) {
    throw new Error("JSONの解析に失敗しました: " + (e instanceof Error ? e.message : jsonStr.slice(0, 300)));
  }
}
