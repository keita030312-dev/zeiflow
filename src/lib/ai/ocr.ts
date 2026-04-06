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
    (a) => `${a.code}: ${a.name}`
  ).join("\n");

  const today = new Date().toISOString().split("T")[0];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    thinking: {
      type: "enabled",
      budget_tokens: 5000,
    },
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
            text: `あなたは日本の税理士事務所で10年以上の実務経験を持つ上級税理士AIです。
レシート・領収書の画像から正確に情報を読み取り、適切な勘定科目で仕訳を行ってください。

## 重要な読み取りルール
1. **文字の読み取り精度を最優先**にしてください。不鮮明な文字は前後の文脈から推測してください
2. 日本語の店舗名は正確に読み取ること（例：「ファミリーマート」「セブン-イレブン」「ローソン」等）
3. 金額は「¥」「円」「,」を含む数字を正確に抽出。合計欄を最優先で参照
4. 日付は「年/月/日」「年-月-日」「R6.4.3」（令和表記）など多様な形式に対応
5. 令和の西暦変換：R1=2019, R2=2020, R3=2021, R4=2022, R5=2023, R6=2024, R7=2025, R8=2026
6. 税込・税抜の区別に注意。「（税込）」「（税抜）」「内消費税」等の記載を確認
7. 合計金額が複数ある場合は「お預かり」の直前にある合計、または最も大きい合計を採用
8. **【最重要】インボイス番号（適格請求書発行事業者の登録番号）の読み取り**
   - レシート・領収書のどこかに「T」で始まる13桁の数字（例：T1234567890123）がないか徹底的に探す
   - よくある表記パターン：
     - 「登録番号 T1234567890123」
     - 「登録番号：T1234567890123」
     - 「適格請求書発行事業者登録番号 T1234567890123」
     - 「インボイス番号 T1234567890123」
     - レシート上部・下部の小さい文字にある場合が多い
     - ハイフンやスペースが入っている場合もある（T 1234-5678-9012-3 → T1234567890123 に正規化）
   - 「T」+数字13桁の形式を厳守。Tは必ず半角大文字
   - 見つからない場合のみnullにする。少しでもそれらしい番号があれば読み取って出力すること

## 勘定科目一覧
${accountList}

## 仕訳ルール（プロの税理士基準）
- **コンビニ・スーパー（食品）**: 個人→福利厚生費、来客用→会議費
- **コンビニ・スーパー（日用品・文具）**: 消耗品費
- **飲食店（5,000円以下/人）**: 会議費
- **飲食店（5,000円超/人）**: 接待交際費
- **タクシー・電車・バス**: 旅費交通費
- **ガソリンスタンド**: 車両費
- **薬局・ドラッグストア**: 福利厚生費 or 消耗品費
- **ホテル・宿泊**: 旅費交通費
- **書籍・新聞**: 新聞図書費
- **郵便・宅急便**: 通信費
- **コインパーキング・駐車場**: 旅費交通費
- **印刷・コピー**: 消耗品費
- **携帯電話・インターネット**: 通信費
- **修理・メンテナンス**: 修繕費
- **貸方は通常「現金」**。クレジットカード払いの記載がある場合は「未払金」

## 消費税ルール
- 標準税率: 10%（一般的な商品・サービス）
- 軽減税率: 8%（食料品・飲料（酒類除く）、新聞）
- レシートに「※」「＊」マークがある品目は軽減税率8%

## 出力形式（JSONのみ。説明文は絶対に付けないでください）
\`\`\`json
{
  "ocr": {
    "storeName": "正確な店舗名",
    "date": "YYYY-MM-DD",
    "items": [{"name": "品名", "amount": 金額数値, "taxRate": 0.1か0.08}],
    "total": 税込合計金額の数値,
    "taxTotal": 消費税合計の数値,
    "paymentMethod": "現金/クレジットカード/電子マネー/QRコード",
    "invoiceNumber": "T1234567890123（なければnull）",
    "rawText": "レシートから読み取った主要テキスト"
  },
  "classification": {
    "debitAccount": "借方勘定科目名",
    "creditAccount": "貸方勘定科目名",
    "amount": 税込合計金額の数値,
    "taxAmount": 消費税額の数値,
    "taxRate": 主な税率の数値,
    "description": "店舗名 内容要約",
    "confidence": 確信度0.0から1.0
  }
}
\`\`\`

今日の日付: ${today}
日付が読み取れない場合は今日の日付を使用してください。`,
          },
        ],
      },
    ],
  });

  // Extended thinkingの場合、textブロックは複数ある（thinkingブロック + textブロック）
  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : "";

  // JSON部分を抽出（```json ... ``` 内、または裸の { ... }）
  const codeBlockMatch = text.match(/```json?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonStr) {
    throw new Error("AIからの応答を解析できませんでした: " + text.slice(0, 200));
  }

  return JSON.parse(jsonStr);
}
