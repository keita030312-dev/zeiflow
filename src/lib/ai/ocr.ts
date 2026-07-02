import Anthropic from "@anthropic-ai/sdk";
import { ACCOUNT_CATEGORIES } from "@/types";
import { prisma } from "@/lib/db";
import {
  buildInvoiceMainPromptStatic,
  buildOfficialReceiptMainPromptStatic,
  buildReceiptMainPromptStatic,
  buildAmountPromptForKind,
} from "@/lib/ai/ocr-prompts-extended";
import type { DocumentKind } from "@/generated/prisma/enums";
import { ensureOcrResultShape, toSafeInt, type OcrProcessRow } from "@/lib/ocr-result-normalize";
import { buildLearningText } from "@/lib/ai/learning-context";
import { computeConsensus, parseOcrResponseToArray } from "@/lib/ai/ocr-consensus";

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
  quality: "fast" | "accurate" | "ultra" = "fast",
  clientId?: string,
  organizationId?: string,
  documentKind: DocumentKind = "RECEIPT",
): Promise<OcrProcessRow[]> {
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

  // ナレッジ（仕訳ルール）を取得
  let knowledgeText = "";
  if (clientId || organizationId) {
    const knowledgeFiles = await prisma.knowledgeFile.findMany({
      where: {
        OR: [
          ...(clientId ? [{ clientId }] : []),
          ...(organizationId ? [{ organizationId, clientId: null }] : []),
          ...(userId ? [{ userId, clientId: null, organizationId: null }] : []),
        ],
      },
      select: { name: true, extractedText: true },
      orderBy: { createdAt: "desc" },
    });

    if (knowledgeFiles.length > 0) {
      const combined = knowledgeFiles
        .map((f) => `【${f.name}】\n${f.extractedText}`)
        .join("\n\n");
      // プロンプトサイズ制限（最大15000文字）
      knowledgeText = combined.length > 15000 ? combined.substring(0, 15000) : combined;
    }
  }

  // 過去の確定済み仕訳から学習データを取得
  let learningText = "";
  if (clientId) {
    const pastJournals = await prisma.journalEntry.findMany({
      where: {
        clientId,
        isConfirmed: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        description: true,
        debitAccount: true,
        creditAccount: true,
        amount: true,
        taxRate: true,
      },
    });

    learningText = buildLearningText(pastJournals);
  }

  const mediaType = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  // モデル戦略: 速度・精度・コストのバランス
  // - fast(既定): Sonnet 4.6 = 速度+精度+コストの最適バランス
  // - accurate: Opus 4.7 = 最高精度(重要書類向け)
  // - ultra: Opus 4.7 を3回並列実行 → 多数決(最高精度・コスト3倍)
  // - 登録番号専用: Sonnet 4.6(13桁数字読み取りには十分)
  // - フォールバック: Sonnet 4.6 → Haiku 4.5
  const mainModel = (quality === "accurate" || quality === "ultra") ? "claude-opus-4-7" : "claude-sonnet-4-6";
  const invoiceModel = "claude-sonnet-4-6";
  const fallbackMain = "claude-sonnet-4-6";
  const fallbackInvoice = "claude-haiku-4-5-20251001";

  // ===== 段階実行: メインOCR → 必要時のみ登録番号専用OCR =====
  // callApi は2形態: シンプル(prompt: string) と キャッシュ対応(content blocks)
  type AnthropicContentBlock =
    | { type: "text"; text: string; cache_control?: { type: "ephemeral" } }
    | { type: "image"; source: { type: "base64"; media_type: typeof mediaType; data: string } };

  async function callApi(
    m: string,
    fallback: string,
    promptOrContent: string | AnthropicContentBlock[],
    maxTokens: number,
  ) {
    const content: AnthropicContentBlock[] = typeof promptOrContent === "string"
      ? [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: promptOrContent },
        ]
      : promptOrContent;

    // 一時的エラー(429/529/503/overload/network)は最大3回リトライ(指数バックオフ)
    const TRANSIENT = /rate.?limit|429|529|503|overload|ECONNRESET|ETIMEDOUT|ENETUNREACH|fetch failed/i;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const tryOnce = async (model: string) =>
      anthropic.messages.create({
        model, max_tokens: maxTokens, temperature: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [{ role: "user", content: content as any }],
      });

    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await tryOnce(m);
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        // モデル不明 → フォールバックモデルで即実行(リトライ不要)
        if (msg.includes("not_found") || msg.includes("model")) {
          return await tryOnce(fallback);
        }
        // 一時的エラー → 待ってリトライ
        if (TRANSIENT.test(msg) && attempt < 3) {
          await sleep(800 * attempt); // 800ms, 1600ms
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  // ===== mainPrompt を「静的(キャッシュ可)」と「動的(today/knowledge/learning)」に分割 =====
  // 静的プレフィックス: 全リクエスト共通。Anthropic prompt cacheで90%以上のコスト削減

  const mainPromptStatic =
    documentKind === "RECEIPT"
      ? buildReceiptMainPromptStatic(accountList)
      : documentKind === "INVOICE"
        ? buildInvoiceMainPromptStatic(accountList)
        : buildOfficialReceiptMainPromptStatic(accountList);

  // ===== 動的コンテキスト(キャッシュ対象外: 日付・ナレッジ・学習) =====
  const mainPromptDynamic = `【動的コンテキスト】
■ 今日の日付情報:
- 今日: ${today}
- 今年: ${new Date().getFullYear()}年
- 今月: ${new Date().getMonth() + 1}月
- 今日の日付より後の日付は不正(書類の日付が未来になるのは原則NG)

${knowledgeText ? `■ この事務所/顧問先の仕訳ルール・ナレッジ(優先):
${knowledgeText}

` : ""}${learningText ? `■ 過去の確定済み仕訳パターン(最優先で適用):
${learningText}

` : ""}■ 出力: 必ずJSON配列1個のみ。前後に説明文を付けない。`;

  const invoicePrompt = `この画像に写っている全てのレシート/領収書から「適格請求書発行事業者の登録番号」を探してください。

探し方:
- 画像全体を隅々まで確認する（複数のレシートが写っている場合は全て確認）
- 「登録番号」「登録No」「適格請求書」「T」の文字を探す
- レシート下部、店舗情報付近、ヘッダー部分を重点的に確認
- 小さい文字、薄い印字、画像の端・角でも読む
- 形式: T + 数字13桁（例: T1234567890123）
- スペースやハイフンで区切られていても結合する
- ほとんどのレシートには登録番号がある。見つけられないのは読み取りミスの可能性が高い

複数レシートがある場合はカンマ区切りで出力（例: T1234567890123,T9876543210123）
1枚だけの場合はそのまま出力（例: T1234567890123）
本当に見つからない場合のみ「null」と出力
余計な説明は不要。番号のみ出力。`;

  const amountPrompt = buildAmountPromptForKind(documentKind);

  // Step1: メインOCR（Sonnet 4.6 / Opus 4.7 = qualityにより切替）
  // prompt cache: mainPromptStatic を ephemeral cache 対象にしてコスト90%削減
  // 構造: [静的プロンプト(キャッシュ)] → [画像] → [動的コンテキスト]
  const mainMessageContent: AnthropicContentBlock[] = [
    { type: "text", text: mainPromptStatic, cache_control: { type: "ephemeral" } },
    { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
    { type: "text", text: mainPromptDynamic },
  ];
  // Ultra mode: 同じ画像を3回並列推論 → 多数決で合議(コスト3倍・精度最高)
  const ultraCallCount = quality === "ultra" ? 3 : 1;
  const mainResponses = await Promise.all(
    Array.from({ length: ultraCallCount }, () =>
      callApi(mainModel, fallbackMain, mainMessageContent, 2000),
    ),
  );
  const mainResponse = mainResponses[0];

  // Step2: メインOCRの結果を先にパースしてインボイスがあるか確認
  const mainTextForCheck = mainResponse.content[0].type === "text" ? mainResponse.content[0].text : "";
  const hasInvoiceInMain = /T\d{13}/.test(mainTextForCheck.replace(/[\s\-]/g, ""));

  // Step3: インボイスが取れなかった場合のみ専用OCRを実行（API負荷を最小化）
  let invoiceResponse;
  if (!hasInvoiceInMain) {
    invoiceResponse = await callApi(invoiceModel, fallbackInvoice, invoicePrompt, 200);
  } else {
    invoiceResponse = { content: [{ type: "text" as const, text: "null" }] };
  }
  // Step4: accurate / ultra モードでは日付/金額の検証OCRを追加で実行
  const runAmountValidation = quality === "accurate" || quality === "ultra";
  const amountResponse = runAmountValidation
    ? await callApi(mainModel, fallbackMain, amountPrompt, 1200)
    : { content: [{ type: "text" as const, text: "[]" }] };

  // メインOCRの結果をパース(複数レスポンスがある場合は合議)
  const mainText = mainResponse.content[0].type === "text" ? mainResponse.content[0].text : "";
  const mainArrays = mainResponses
    .map(r => parseOcrResponseToArray(r.content[0].type === "text" ? r.content[0].text : ""))
    .filter(arr => arr.length > 0);
  if (mainArrays.length === 0) {
    throw new Error("AIからの応答を解析できませんでした: " + mainText.slice(0, 300));
  }

  // 登録番号専用OCRの結果を取得
  const invoiceText = (invoiceResponse.content[0].type === "text" ? invoiceResponse.content[0].text : "").trim();

  // 金額検証OCRの結果を取得（配列対応）
  const amountText = (amountResponse.content[0].type === "text" ? amountResponse.content[0].text : "").trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let verifiedAmounts: any[] = [];
  try {
    const amountBlock = amountText.match(/```json?\s*([\s\S]*?)```/);
    const amountJson = amountBlock ? amountBlock[1].trim() : amountText.match(/[\[{][\s\S]*[\]}]/)?.[0];
    if (amountJson) {
      const parsed = JSON.parse(amountJson);
      verifiedAmounts = Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch {
    // パース失敗は無視
  }
  // 登録番号を全て抽出（複数対応）
  const dedicatedInvoiceNumbers: string[] = [];
  if (invoiceText && invoiceText !== "null") {
    const cleaned = invoiceText.replace(/[\s\-]/g, "");
    const matches = cleaned.matchAll(/T(\d{13})/g);
    for (const m of matches) {
      dedicatedInvoiceNumbers.push("T" + m[1]);
    }
  }

  try {
    // ultra mode: 複数推論を合議(全員一致でconfidence 1.0)。それ以外: 単一推論をそのまま採用
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consensusRows: any[] = mainArrays.length > 1 ? computeConsensus(mainArrays) : mainArrays[0];
    const parsedArray = (Array.isArray(consensusRows) ? consensusRows : []).filter(
      (p): p is Record<string, unknown> => p != null && typeof p === "object",
    );
    if (parsedArray.length === 0) {
      throw new Error("AIからの応答を解析できませんでした: " + mainText.slice(0, 300));
    }

    const results = parsedArray.map((rawParsed, idx) => {
    const parsed = ensureOcrResultShape(rawParsed);
    const verifiedAmount = verifiedAmounts[idx] || verifiedAmounts[0] || {};

    // インボイス番号: メインOCRの結果を正規化
    if (parsed.ocr?.invoiceNumber) {
      let inv = String(parsed.ocr.invoiceNumber).replace(/[\s\-]/g, "");
      if (!inv.startsWith("T")) inv = "T" + inv;
      const digits = inv.slice(1).replace(/\D/g, "");
      if (digits.length === 13) {
        parsed.ocr.invoiceNumber = "T" + digits;
      } else {
        parsed.ocr.invoiceNumber = null;
      }
    }

    // フォールバック1: rawTextから抽出（複数パターン対応）
    if (!parsed.ocr?.invoiceNumber && parsed.ocr?.rawText) {
      const raw = String(parsed.ocr.rawText);
      const rawClean = raw.replace(/[\s\-\.]/g, "");
      // パターン1: T + 13桁
      const m1 = rawClean.match(/T(\d{13})/);
      if (m1) {
        parsed.ocr.invoiceNumber = "T" + m1[1];
      } else {
        // パターン2: 登録番号の後
        const m2 = rawClean.match(/登録番号[TＴ]?(\d{13})/);
        if (m2) {
          parsed.ocr.invoiceNumber = "T" + m2[1];
        } else {
          // パターン3: 適格の後
          const m3 = rawClean.match(/適格[^\d]*[TＴ]?(\d{13})/);
          if (m3) {
            parsed.ocr.invoiceNumber = "T" + m3[1];
          } else {
            // パターン4: 全角Tも探す
            const rawHalf = raw.replace(/Ｔ/g, "T").replace(/[\s\-\.]/g, "");
            const m4 = rawHalf.match(/T(\d{13})/);
            if (m4) parsed.ocr.invoiceNumber = "T" + m4[1];
          }
        }
      }
    }
    // フォールバック1.5: JSON全体のテキストからも探す
    if (!parsed.ocr?.invoiceNumber) {
      const fullJson = JSON.stringify(parsed);
      const fullClean = fullJson.replace(/[\s\-\.]/g, "");
      const mFull = fullClean.match(/T(\d{13})/);
      if (mFull) parsed.ocr.invoiceNumber = "T" + mFull[1];
    }

    // フォールバック2: 専用OCRの結果を採用
    const dedicatedInvoice = dedicatedInvoiceNumbers[idx] || dedicatedInvoiceNumbers[0] || null;
    if (!parsed.ocr?.invoiceNumber && dedicatedInvoice) {
      parsed.ocr.invoiceNumber = dedicatedInvoice;
    }

    // ===== fieldConfidence の正規化と検証ベースのブースト =====
    // モデルが出力しなかった場合の初期値
    if (!parsed.ocr.fieldConfidence) {
      parsed.ocr.fieldConfidence = {};
    }
    const fc = parsed.ocr.fieldConfidence;
    // invoiceNumberが正規表現で T+13桁 を満たすなら確実(1.0)
    if (parsed.ocr.invoiceNumber && /^T\d{13}$/.test(parsed.ocr.invoiceNumber)) {
      fc.invoiceNumber = 1.0;
    } else if (!parsed.ocr.invoiceNumber) {
      fc.invoiceNumber = 0.0;
    }
    // 金額を整数に
    if (parsed.ocr?.total !== undefined) parsed.ocr.total = toSafeInt(parsed.ocr.total);
    if (parsed.ocr?.taxTotal !== undefined) parsed.ocr.taxTotal = toSafeInt(parsed.ocr.taxTotal);
    if (parsed.classification?.amount !== undefined) parsed.classification.amount = toSafeInt(parsed.classification.amount);
    if (parsed.classification?.taxAmount !== undefined) parsed.classification.taxAmount = toSafeInt(parsed.classification.taxAmount);
    if (parsed.ocr?.items) {
      parsed.ocr.items = parsed.ocr.items.map((item: { name: string; amount: number; taxRate?: number }) => ({
        ...item,
        amount: toSafeInt(item.amount),
      }));
    }

    // Sonnetの検証結果で上書き（Sonnetの方が正確）+ 一致したらconfidenceを1.0に
    const orig = {
      date: parsed.ocr.date,
      storeName: parsed.ocr.storeName,
      total: parsed.ocr.total,
      taxTotal: parsed.ocr.taxTotal,
      paymentMethod: parsed.ocr.paymentMethod,
    };
    if ((verifiedAmount as Record<string, unknown>).date) {
      const vDate = (verifiedAmount as Record<string, unknown>).date as string;
      parsed.ocr.date = vDate;
      // 検証OCRと一致 → 確実(1.0)
      if (orig.date === vDate) fc.date = 1.0;
    }
    if ((verifiedAmount as Record<string, unknown>).storeName) {
      const vStore = (verifiedAmount as Record<string, unknown>).storeName as string;
      parsed.ocr.storeName = vStore;
      if (orig.storeName === vStore) fc.storeName = 1.0;
    }
    if ((verifiedAmount as Record<string, unknown>).total !== undefined) {
      const vTotal = toSafeInt(verifiedAmount.total);
      if (vTotal > 0) {
        if (orig.total === vTotal) fc.total = 1.0;
        parsed.ocr.total = vTotal;
        parsed.classification.amount = vTotal;
      }
    }
    if ((verifiedAmount as Record<string, unknown>).taxTotal !== undefined) {
      const vTax = toSafeInt(verifiedAmount.taxTotal);
      if (vTax > 0) {
        if (orig.taxTotal === vTax) fc.taxTotal = 1.0;
        parsed.ocr.taxTotal = vTax;
        parsed.classification.taxAmount = vTax;
      }
    }
    if (verifiedAmount.items && verifiedAmount.items.length > 0) {
      parsed.ocr.items = verifiedAmount.items.map((item: { name: string; amount: number }) => ({
        name: item.name,
        amount: toSafeInt(item.amount),
        taxRate: 0.1,
      }));
    }
    if (verifiedAmount.paymentMethod) {
      const vPm = verifiedAmount.paymentMethod;
      if (orig.paymentMethod === vPm) fc.paymentMethod = 1.0;
      parsed.ocr.paymentMethod = vPm;
      // 支払方法に応じて貸方を修正
      if (vPm.includes("クレジット") || vPm.includes("カード") || vPm.includes("VISA") || vPm.includes("Master") || vPm.includes("JCB")) {
        parsed.classification.creditAccount = "未払金";
      }
    }

    // classification.amountがocr.totalと一致しなければocr.totalを採用
    if (parsed.ocr?.total && parsed.classification?.amount && parsed.ocr.total !== parsed.classification.amount) {
      parsed.classification.amount = parsed.ocr.total;
    }

    // ===== 日付バリデーション =====
    if (parsed.ocr?.date) {
      const d = new Date(parsed.ocr.date);
      const now = new Date();
      // 未来の日付は今日に修正
      if (d > now) {
        // 年が1年ずれてる可能性（例: 2027→2026）
        const corrected = new Date(d);
        corrected.setFullYear(corrected.getFullYear() - 1);
        if (corrected <= now && corrected > new Date(now.getFullYear() - 2, 0, 1)) {
          parsed.ocr.date = corrected.toISOString().split("T")[0];
        } else {
          parsed.ocr.date = now.toISOString().split("T")[0];
        }
      }
      // 5年以上前の日付は不正の可能性が高い
      const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
      if (d < fiveYearsAgo) {
        parsed.ocr.date = now.toISOString().split("T")[0];
      }
    }

    // ===== 科目名の正規化 =====
    const accountNormalize: Record<string, string> = {
      "交通費": "旅費交通費",
      "タクシー代": "旅費交通費",
      "電車代": "旅費交通費",
      "ガソリン代": "車両費",
      "駐車場代": "車両費",
      "文具": "消耗品費",
      "事務用品": "消耗品費",
      "食費": "福利厚生費",
      "飲食費": "会議費",
      "お茶代": "会議費",
      "手数料": "支払手数料",
      "振込手数料": "支払手数料",
      "家賃": "地代家賃",
      "電気代": "水道光熱費",
      "水道代": "水道光熱費",
      "ガス代": "水道光熱費",
      "電話代": "通信費",
      "切手代": "通信費",
    };
    if (parsed.classification?.debitAccount) {
      const normalized = accountNormalize[parsed.classification.debitAccount];
      if (normalized) parsed.classification.debitAccount = normalized;
    }
    if (parsed.classification?.creditAccount) {
      const normalized = accountNormalize[parsed.classification.creditAccount];
      if (normalized) parsed.classification.creditAccount = normalized;
    }

    // ===== description の正規化 =====
    if (parsed.classification?.description) {
      // 「店舗での商品購入」等の曖昧表現を修正
      let desc = parsed.classification.description;
      desc = desc.replace(/店舗での商品購入/g, "");
      desc = desc.replace(/商品購入/g, "");
      desc = desc.replace(/^\s+|\s+$/g, "");
      if (!desc || desc.length < 3) {
        desc = `${parsed.ocr?.storeName || ""} ${parsed.classification.debitAccount === "会議費" || parsed.classification.debitAccount === "接待交際費" ? "ご飲食代" : "購入"}`.trim();
      }
      parsed.classification.description = desc;
    }

    return ensureOcrResultShape(parsed);
    }); // end parsedArray.map

    return results;
  } catch (e) {
    throw new Error("JSONの解析に失敗しました: " + (e instanceof Error ? e.message : String(e)));
  }
}
