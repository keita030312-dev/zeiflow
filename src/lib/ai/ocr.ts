import Anthropic from "@anthropic-ai/sdk";
import { ACCOUNT_CATEGORIES } from "@/types";
import { prisma } from "@/lib/db";
import {
  buildInvoiceMainPromptStatic,
  buildOfficialReceiptMainPromptStatic,
  buildAmountPromptForKind,
} from "@/lib/ai/ocr-prompts-extended";
import type { DocumentKind } from "@/generated/prisma/enums";
import { ensureOcrResultShape, toSafeInt, type OcrProcessRow } from "@/lib/ocr-result-normalize";

// ===== Ultra mode (multi-vote consensus) helpers =====

// 値の最頻値を返す。同数なら最初に出現したもの優先
function mode<T>(values: T[]): { value: T; count: number } | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = { value: values[0], count: 0 };
  for (const [v, c] of counts) {
    if (c > best.count) best = { value: v, count: c };
  }
  return best;
}

// 数値の中央値
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

// 複数のOCR結果配列(レシート単位)を要素ごとに合議
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeConsensus(parsedArrays: any[][]): any[] {
  if (parsedArrays.length === 0) return [];
  if (parsedArrays.length === 1) return parsedArrays[0];

  // レシート枚数: 多数決(最頻値) — もし全部1枚なら1枚
  const lengths = parsedArrays.map(a => a.length);
  const lenMode = mode(lengths);
  const referenceLen = lenMode ? lenMode.value : Math.max(...lengths);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  for (let i = 0; i < referenceLen; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = parsedArrays.map(arr => arr[i]).filter((x): x is any => x != null);
    if (items.length === 0) continue;
    if (items.length === 1) {
      result.push(items[0]);
      continue;
    }
    result.push(mergeReceiptResults(items));
  }
  return result;
}

// 同一レシートの複数推論を合議
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeReceiptResults(receipts: any[]): any {
  const list = (receipts || []).filter((r) => r != null && typeof r === "object");
  if (list.length === 0) {
    return JSON.parse(JSON.stringify(ensureOcrResultShape({})));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: any = JSON.parse(JSON.stringify(list[0]));
  if (!merged.ocr) merged.ocr = {};
  if (!merged.ocr.fieldConfidence) merged.ocr.fieldConfidence = {};
  if (!merged.classification) merged.classification = {};

  // 文字列・カテゴリ系: 最頻値を採用、全員一致なら confidence 1.0
  const strFields = ["storeName", "date", "paymentMethod", "invoiceNumber", "dueDate", "documentNo", "purpose"] as const;
  for (const f of strFields) {
    const vals = list.map(r => r?.ocr?.[f]).filter((v: unknown) => v != null && v !== "");
    if (vals.length === 0) continue;
    const m = mode(vals.map(String));
    if (!m) continue;
    merged.ocr[f] = m.value;
    const ratio = m.count / list.length;
    if (ratio === 1) merged.ocr.fieldConfidence[f] = 1.0;
    else if (ratio >= 2 / 3) merged.ocr.fieldConfidence[f] = Math.max(0.85, ratio);
    else merged.ocr.fieldConfidence[f] = Math.max(0.5, ratio);
  }

  // 数値系: 中央値、全員一致なら confidence 1.0
  const numFields = ["total", "taxTotal"] as const;
  for (const f of numFields) {
    const vals = list
      .map(r => r?.ocr?.[f])
      .filter((v: unknown): v is number => typeof v === "number" && Number.isFinite(v));
    if (vals.length === 0) continue;
    merged.ocr[f] = median(vals);
    const allAgree = vals.every(v => v === vals[0]);
    if (allAgree) {
      merged.ocr.fieldConfidence[f] = 1.0;
    } else {
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const spread = max > 0 ? (max - min) / max : 0;
      merged.ocr.fieldConfidence[f] = Math.max(0.5, 1 - spread);
    }
  }

  // classification: confidence最大のものを採用
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classifications = list.map((r: any) => r?.classification).filter(Boolean);
  if (classifications.length > 0) {
    const best = classifications.reduce((a, b) =>
      (a?.confidence ?? 0) >= (b?.confidence ?? 0) ? a : b,
    );
    merged.classification = best;
    // amount もrescue
    const amounts = list
      .map(r => r?.classification?.amount)
      .filter((v: unknown): v is number => typeof v === "number" && Number.isFinite(v));
    if (amounts.length > 0) merged.classification.amount = median(amounts);
  }

  // items は最も長い配列を採用(情報量優先)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemArrays = list.map((r: any) => r?.ocr?.items).filter(Array.isArray);
  if (itemArrays.length > 0) {
    merged.ocr.items = itemArrays.reduce((a, b) => (b.length > a.length ? b : a), itemArrays[0]);
  }

  return merged;
}

// レスポンスからJSON配列を抽出してパース
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseOcrResponseToArray(text: string): any[] {
  const codeBlockMatch = text.match(/```json?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.match(/[\[{][\s\S]*[\]}]/)?.[0];
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

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

    if (pastJournals.length > 0) {
      // 1. 摘要パターン（店名ベース）
      const descPatterns = new Map<string, { debit: string; credit: string; count: number }>();
      // 2. キーワードパターン（飲食代、交通費等のカテゴリ）
      const keywordPatterns = new Map<string, { debit: string; credit: string; count: number }>();
      // 3. 金額帯パターン
      const amountPatterns = new Map<string, { debit: string; credit: string; count: number }>();

      const keywords = ["飲食", "ご飲食", "食事", "ランチ", "ディナー", "交通", "タクシー", "電車", "バス", "ガソリン", "駐車", "宿泊", "ホテル", "消耗品", "文具", "書籍", "通信", "郵便", "保険", "家賃", "水道", "電気", "ガス", "広告", "外注", "修繕"];

      for (const j of pastJournals) {
        // 摘要パターン（数字除去）
        const descKey = j.description.replace(/\d+/g, "").replace(/¥|円/g, "").trim();
        const existing = descPatterns.get(descKey);
        if (existing) existing.count++;
        else descPatterns.set(descKey, { debit: j.debitAccount, credit: j.creditAccount, count: 1 });

        // キーワードパターン
        for (const kw of keywords) {
          if (j.description.includes(kw)) {
            const kwKey = kw;
            const kwExisting = keywordPatterns.get(kwKey);
            if (kwExisting) kwExisting.count++;
            else keywordPatterns.set(kwKey, { debit: j.debitAccount, credit: j.creditAccount, count: 1 });
          }
        }

        // 金額帯パターン（5000円以下/超、1万円以下/超）
        const amountRange = j.amount <= 5000 ? "5000円以下" : j.amount <= 10000 ? "5001〜10000円" : "10001円以上";
        const amKey = `${j.debitAccount}_${amountRange}`;
        const amExisting = amountPatterns.get(amKey);
        if (amExisting) amExisting.count++;
        else amountPatterns.set(amKey, { debit: j.debitAccount, credit: j.creditAccount, count: 1 });
      }

      const descLines = Array.from(descPatterns.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20)
        .map(([desc, p]) => `「${desc}」→ ${p.debit}/${p.credit}（${p.count}回）`);

      const kwLines = Array.from(keywordPatterns.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15)
        .map(([kw, p]) => `キーワード「${kw}」を含む → ${p.debit}/${p.credit}（${p.count}回）`);

      const amLines = Array.from(amountPatterns.entries())
        .filter(([, v]) => v.count >= 2)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([key, p]) => {
          const range = key.split("_")[1];
          return `${p.debit}で${range}の場合 → 貸方:${p.credit}（${p.count}回）`;
        });

      learningText = [
        descLines.length > 0 ? "■摘要パターン:\n" + descLines.join("\n") : "",
        kwLines.length > 0 ? "■キーワードパターン:\n" + kwLines.join("\n") : "",
        amLines.length > 0 ? "■金額帯パターン:\n" + amLines.join("\n") : "",
      ].filter(Boolean).join("\n\n");
    }
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
  const receiptMainPromptStatic = `このレシート・小票の画像を読み取ってJSONで返してください。

■■■ 最優先タスク: インボイス登録番号（invoiceNumber）■■■
invoiceNumberフィールドにT+数字13桁の登録番号を必ず入れること。
- 画像全体を隅々まで確認すること（上部・中央・下部・端・角すべて）
- 「登録番号」「登録No.」「適格請求書発行事業者」「T」の文字を探す
- 形式: T + 数字ちょうど13桁 = 合計14文字（例: T1234567890123）
- スペースやハイフンで区切られていても結合する（例: T1234 5678 90123 → T1234567890123）
- 「T」が「I」「1」に見える場合がある。「登録番号」の直後は「T」と判断すること
- 日本のほぼ全てのレシートには登録番号が印字されている。nullで返すのは最終手段
- rawTextにも登録番号周辺のテキストを含めること

【厳守ルール】
1. 金額は必ずレシートに印字された数字と完全一致。四捨五入や推測は禁止
2. 合計金額=「合計」「お買上」「ご利用金額」欄の数字をそのまま使う
3. ■■■ 日付の読み取り（超重要）■■■
   ※「今日の日付」はプロンプト末尾の【動的コンテキスト】セクションで提供される。

   まずレシートに印字された日付をそのまま読み取ること:
   - 「2026年4月13日」「2026/04/13」「26.4.13」「R8.4.13」「令和8年4月13日」等
   - 日付は通常レシートの上部（店舗名の下）に印字されている

   和暦→西暦の変換表（必ずこの通りに変換）:
   - 令和1年/R1 = 2019年
   - 令和2年/R2 = 2020年
   - 令和3年/R3 = 2021年
   - 令和4年/R4 = 2022年
   - 令和5年/R5 = 2023年
   - 令和6年/R6 = 2024年
   - 令和7年/R7 = 2025年
   - 令和8年/R8 = 2026年
   - 令和9年/R9 = 2027年
   - 平成30年/H30 = 2018年
   - 平成31年/H31 = 2019年

   2桁年号の解釈:
   - 「24/4/1」→ 2024年4月1日
   - 「25/12/5」→ 2025年12月5日
   - 「26/1/15」→ 2026年1月15日

   重要な制約:
   - 日付は絶対に未来にならない（動的コンテキストの「今日」より後の日付は不正）
   - 年が書かれていない場合: 動的コンテキストの「今年」を使う。ただし月日が未来なら前年
   - 日付が完全に不明な場合のみ動的コンテキストの「今日」を使う

   出力形式: 必ず YYYY-MM-DD（例: 2026-04-13）
4. 金額は全て整数（円単位）
5. rawTextにはレシート全文を含める（特に登録番号の周辺テキスト）

【description（摘要）の書き方 — 最重要】
descriptionは「店舗名 + 実際の内容」を具体的に書くこと。
- レシートの内容（品目）から何の取引かを判断して書く
- 飲食店・レストラン・居酒屋・カフェのレシート → 「○○（店名） ご飲食代」
- コンビニで食べ物を買った → 「○○ 飲食代」
- コンビニで文具・日用品を買った → 「○○ 消耗品購入」
- スーパーで食品を買った → 「○○ 食料品購入」
- ガソリンスタンド → 「○○ ガソリン代」
- タクシー → 「○○タクシー 交通費」
- ホテル・旅館 → 「○○ 宿泊費」
- 書店・Amazon書籍 → 「○○ 書籍購入」
- 薬局 → 「○○ 日用品購入」
- 「商品購入」「店舗での購入」のような曖昧な表現は禁止。必ず具体的に書くこと

【業種の判定方法】
- 店名に「食堂」「レストラン」「居酒屋」「カフェ」「焼肉」「寿司」「ラーメン」等の飲食系ワードがあれば飲食店
- 品目に「ビール」「ドリンク」「コース」「ランチ」「ディナー」「席料」等があれば飲食
- 「テイクアウト」「お持ち帰り」があれば飲食（テイクアウト）
- レシートに「ご飲食」「お会計」「テーブル」「席」等の表記があれば飲食店

勘定科目: ${accountList}

【仕訳ルール（2026年税法準拠）】

■ 借方科目の判定:
- 飲食店での食事（1人5000円以下）→ 会議費 ※2024年4月改正: 接待飲食費の基準が5000円→1万円に引き上げだが、会議費計上は5000円以下が一般的
- 飲食店での食事（1人5000円超〜1万円以下）→ 接待交際費（損金算入可）
- 飲食店での食事（1人1万円超）→ 接待交際費（資本金1億円超の法人は50%損金算入）
- コンビニ・スーパーでの食品購入（社内消費）→ 福利厚生費
- 文房具・事務用品・PC周辺機器（10万円未満）→ 消耗品費
- 10万円以上30万円未満の備品 → 消耗品費（少額減価償却資産の特例: 中小企業者等、年300万円まで即時償却可）
- タクシー・電車・バス・飛行機 → 旅費交通費
- ガソリン・高速代・駐車場 → 車両費
- 書籍・雑誌・新聞・電子書籍 → 新聞図書費
- 郵便・宅配・切手・はがき → 通信費
- 携帯電話・インターネット → 通信費
- ホテル・旅館・宿泊 → 旅費交通費
- コピー・印刷 → 消耗品費
- ソフトウェア・サブスク（年額） → 支払手数料 or 消耗品費
- 修理・メンテナンス → 修繕費
- 保険料 → 保険料
- 家賃・駐車場（月極）→ 地代家賃
- 水道・電気・ガス → 水道光熱費
- 広告・チラシ・Web広告 → 広告宣伝費
- 外注・業務委託 → 外注費
- 慶弔・お祝い・香典 → 接待交際費
- お中元・お歳暮・手土産 → 接待交際費
- 社員向け弁当・飲み物 → 福利厚生費

■ 貸方科目:
- 現金払い → 現金
- クレジットカード・電子マネー・QR決済 → 未払金
- 銀行振込 → 普通預金

■ 消費税（2026年現行）:
- 標準税率: 10%
- 軽減税率: 8%（飲食料品、新聞の定期購読）
- テイクアウト・持ち帰り → 8%（軽減税率）
- 店内飲食（イートイン）→ 10%（標準税率）
- レシートの※マーク → 軽減税率8%の品目
- インボイス制度（適格請求書等保存方式）: 登録番号T+13桁がある場合は仕入税額控除可能

■■■ 超重要: 複数レシート対応 ■■■
この画像に複数のレシート/領収書が写っている場合:
- 必ずそれぞれ別のオブジェクトとしてJSON配列で返すこと
- 2枚写っていたら配列に2つ、3枚なら3つのオブジェクトを入れる
- 1枚だけの場合も必ず配列（[...]）で返すこと
- 絶対に複数のレシートを1つにまとめないこと

■■■ 出力例（必ずこの形式に従う） ■■■

【例1: コンビニで弁当購入（軽減税率）】
入力レシート: セブンイレブン 2026/04/15 おにぎり110円 コーヒー150円 合計260円(税抜241円, 消費税8% 19円) 登録番号T1234567890123 現金払
出力:
[{"ocr":{"storeName":"セブンイレブン","date":"2026-04-15","items":[{"name":"おにぎり","amount":110,"taxRate":0.08},{"name":"コーヒー","amount":150,"taxRate":0.08}],"total":260,"taxTotal":19,"paymentMethod":"現金","invoiceNumber":"T1234567890123","rawText":"セブンイレブン 2026/04/15 おにぎり 110 コーヒー 150 合計 260 内消費税8% 19 登録番号T1234567890123","fieldConfidence":{"storeName":0.98,"date":0.98,"total":0.99,"taxTotal":0.95,"invoiceNumber":0.95,"paymentMethod":0.97}},"classification":{"debitAccount":"福利厚生費","creditAccount":"現金","amount":260,"taxAmount":19,"taxRate":0.08,"description":"セブンイレブン 飲食代","confidence":0.95}}]

【例2: 居酒屋でクレジット支払（接待）— 印字一部不鮮明】
入力レシート: 居酒屋まつり R8.4.20 生ビール×3 4500円 刺身盛 3200円 焼き鳥 2800円 合計10500円(内消費税10% 955円) JCBカード 登録番号 T9876543210987
出力:
[{"ocr":{"storeName":"居酒屋まつり","date":"2026-04-20","items":[{"name":"生ビール×3","amount":4500,"taxRate":0.1},{"name":"刺身盛","amount":3200,"taxRate":0.1},{"name":"焼き鳥","amount":2800,"taxRate":0.1}],"total":10500,"taxTotal":955,"paymentMethod":"クレジット","invoiceNumber":"T9876543210987","rawText":"居酒屋まつり R8.4.20 生ビール 4500 刺身盛 3200 焼き鳥 2800 合計 10500 消費税10% 955 JCBカード 登録番号T9876543210987","fieldConfidence":{"storeName":0.92,"date":0.85,"total":0.97,"taxTotal":0.9,"invoiceNumber":0.7,"paymentMethod":0.9}},"classification":{"debitAccount":"接待交際費","creditAccount":"未払金","amount":10500,"taxAmount":955,"taxRate":0.1,"description":"居酒屋まつり ご飲食代","confidence":0.93}}]

【例3: タクシー領収書（登録番号なし・税額未記載で推測）】
入力レシート: ○○タクシー 令和8年4月22日 利用料金 2,180円 現金
出力:
[{"ocr":{"storeName":"○○タクシー","date":"2026-04-22","items":[{"name":"タクシー利用料","amount":2180,"taxRate":0.1}],"total":2180,"taxTotal":198,"paymentMethod":"現金","invoiceNumber":null,"rawText":"○○タクシー 令和8年4月22日 利用料金 2,180円 現金","fieldConfidence":{"storeName":0.95,"date":0.95,"total":0.98,"taxTotal":0.4,"invoiceNumber":0.0,"paymentMethod":0.95}},"classification":{"debitAccount":"旅費交通費","creditAccount":"現金","amount":2180,"taxAmount":198,"taxRate":0.1,"description":"○○タクシー 交通費","confidence":0.9}}]

■■■ 項目別信頼度(fieldConfidence) ■■■
各項目について、読み取りの確からしさを 0.0〜1.0 で出力すること。スタッフが「どの項目を目視確認すべきか」を判断する材料になる:
- 1.0: 印字が鮮明で完全に読み取れた
- 0.7〜0.9: 読み取れたが多少不鮮明、または周辺情報から確信を持てる
- 0.4〜0.6: 部分的に推測した。例「年が書かれていないので今年と推測」
- 0.0〜0.3: ほぼ推測。要目視確認

出力は必ずJSON配列（[...]で囲む）:
[{"ocr":{"storeName":"","date":"YYYY-MM-DD","items":[{"name":"","amount":0,"taxRate":0.1}],"total":0,"taxTotal":0,"paymentMethod":"現金","invoiceNumber":"T+13桁またはnull","rawText":"全文","fieldConfidence":{"storeName":0.9,"date":0.9,"total":0.95,"taxTotal":0.85,"invoiceNumber":0.9,"paymentMethod":0.9}},"classification":{"debitAccount":"","creditAccount":"","amount":0,"taxAmount":0,"taxRate":0,"description":"","confidence":0.9}}]`;

  const mainPromptStatic =
    documentKind === "RECEIPT"
      ? receiptMainPromptStatic
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
