/**
 * 請求書・領収書向けの静的OCRプロンプト（レシート用プロンプトとは別キャッシュキー）
 */

import type { DocumentKind } from "@/generated/prisma/enums";

export function buildInvoiceMainPromptStatic(accountList: string): string {
  return `この画像は「請求書」（支払依頼・外注費請求・サービス利用料の請求など）です。読み取ってJSON配列で返してください。

■■■ 読み取る項目（ocr）■■■
- storeName: 請求元（差出人・発行元）の名称
- date: 請求日・発行日・記載の基準日を YYYY-MM-DD（和暦は西暦に変換。不明なら最も妥当な日付）
- dueDate: 支払期限・お支払期日があれば YYYY-MM-DD、なければ null
- documentNo: 請求書番号・お支払番号・Invoice No. 等。なければ null
- purpose: 請求書では通常 null（領収書の但し書き用フィールド）
- items: 明細行。行が無い場合は1行で「今回御請求分」等と金額を total と一致させる
- total: 今回お支払額・ご請求金額（税込）など、支払う総額を整数円で
- taxTotal: 消費税額。記載がなければ null
- paymentMethod: 振込指定・カード等の記載。不明は「振込」または「不明」
- invoiceNumber: 適格請求書発行事業者の登録番号 T+数字13桁。なければ null（無理に推測しない）
- rawText: 印字テキストをできるだけ多く
- fieldConfidence: storeName,date,total,taxTotal,invoiceNumber,paymentMethod に加え dueDate,documentNo も 0.0〜1.0

【厳守】
1. 金額は印字と一致。四捨五入禁止
2. 日付は動的コンテキストの「今日」より未来にしない
3. 画像に複数の請求書があれば、それぞれ別オブジェクトの配列で返す。1枚のみでも必ず [...] で囲む

【仕訳 classification】
勘定科目は次から選ぶこと: ${accountList}
- 借方: 取引内容（外注費、通信費、地代家賃、消耗品費、支払手数料、広告宣伝費等）
- 貸方: 未払いの請求が一般的 → 「買掛金」。明記があれば「未払金」でも可。支払済・消込済の印がある場合は「普通預金」
- description: 「請求元名 請求書（documentNo または 支払期限の月）」のように具体的に

出力は必ずJSON配列のみ（説明文禁止）。例の形:
[{"ocr":{"storeName":"","date":"YYYY-MM-DD","dueDate":null,"documentNo":null,"purpose":null,"items":[{"name":"","amount":0,"taxRate":0.1}],"total":0,"taxTotal":null,"paymentMethod":"振込","invoiceNumber":null,"rawText":"","fieldConfidence":{"storeName":0.9,"date":0.9,"dueDate":0,"documentNo":0,"total":0.95,"taxTotal":0,"invoiceNumber":0,"paymentMethod":0.8}},"classification":{"debitAccount":"外注費","creditAccount":"買掛金","amount":0,"taxAmount":null,"taxRate":0.1,"description":"","confidence":0.85}}]`;
}

export function buildOfficialReceiptMainPromptStatic(accountList: string): string {
  return `この画像は「領収書」（正式領収書・但し書き付き）です。読み取ってJSON配列で返してください。

■■■ 読み取る項目（ocr）■■■
- storeName: 発行元（宛名以外の発行団体・会社名）
- date: 領収日を YYYY-MM-DD（和暦は西暦へ）
- purpose: 但し書き（○○代として、会費、参加費等）。不明なら null
- documentNo: 領収書番号があれば。なければ null
- dueDate: 通常 null
- items: 但し書きを1行の品目にしてもよい。金額は total と一致
- total: 領収金額（税込）を整数円
- taxTotal: 記載があれば。なければ null
- paymentMethod: 現金・振込等
- invoiceNumber: 適格請求書発行事業者の登録番号 T+13桁。なければ null
- rawText, fieldConfidence（receipt と同様のキー + purpose, documentNo）

【厳守】金額・日付は印字どおり。未来日禁止。複数枚は配列で複数オブジェクト。

【仕訳 classification】
勘定科目: ${accountList}
- 借方: 但し書き・金額から判断（会議費、旅費交通費、通信費、消耗品費、福利厚生費、接待交際費等。レシートと同様の実務感覚）
- 貸方: 支払済の領収が多い → 「現金」または「普通預金」。カード決済の明記があれば「未払金」
- description: 「発行元 領収書（purpose）」のように具体的に

出力は必ずJSON配列のみ:
[{"ocr":{"storeName":"","date":"YYYY-MM-DD","dueDate":null,"documentNo":null,"purpose":null,"items":[{"name":"","amount":0,"taxRate":0.1}],"total":0,"taxTotal":null,"paymentMethod":"現金","invoiceNumber":null,"rawText":"","fieldConfidence":{"storeName":0.9,"date":0.9,"total":0.95,"taxTotal":0,"invoiceNumber":0,"paymentMethod":0.9,"documentNo":0,"purpose":0.85}},"classification":{"debitAccount":"会議費","creditAccount":"現金","amount":0,"taxAmount":null,"taxRate":0.1,"description":"","confidence":0.85}}]`;
}

export function buildAmountPromptForKind(kind: DocumentKind): string {
  if (kind === "INVOICE") {
    return `この請求書から以下を正確に読み取ってください。

【厳守】印字された数字と1円も違わないこと。

読み取る項目:
1. 日付（発行日・請求日をYYYY-MM-DD）
2. 合計請求金額（税込）
3. 消費税額
4. 明細の品名と金額
5. 支払方法の記載
6. 請求元名

複数請求書が写っている場合は配列でそれぞれ返す。

JSONのみ（必ず配列）:
[{"date":"YYYY-MM-DD","storeName":"","total":0,"taxTotal":0,"items":[{"name":"","amount":0}],"paymentMethod":""}]`;
  }
  if (kind === "OFFICIAL_RECEIPT") {
    return `この領収書から以下を正確に読み取ってください。

【厳守】印字された数字と1円も違わないこと。

読み取る項目:
1. 領収日 YYYY-MM-DD
2. 領収金額（税込）
3. 消費税額（あれば）
4. 但し書きを品目としてもよい
5. 支払方法
6. 発行元名

複数枚は配列で。

JSONのみ（必ず配列）:
[{"date":"YYYY-MM-DD","storeName":"","total":0,"taxTotal":0,"items":[{"name":"","amount":0}],"paymentMethod":""}]`;
  }
  return `このレシート/領収書から以下の情報を正確に読み取ってください。

【厳守】印字された数字と1円も、1日も違わないこと。推測・四捨五入禁止。

読み取る項目:
1. 日付（レシートに印字された日付をYYYY-MM-DD形式で。令和R1=2019,R2=2020,R3=2021,R4=2022,R5=2023,R6=2024,R7=2025,R8=2026）
2. 合計金額（「合計」「お買上」「ご利用金額」「TOTAL」の数字）
3. 消費税額（「税」「消費税」「内税」の数字）
4. 各品目の名前と金額
5. 支払方法（現金/クレジット/電子マネー等）
6. 店舗名

画像に複数のレシートが写っている場合は、それぞれ別のオブジェクトとして配列で返してください。

JSONのみ出力（必ず配列）:
[{"date":"YYYY-MM-DD","storeName":"店名","total":整数,"taxTotal":整数,"items":[{"name":"品名","amount":整数}],"paymentMethod":"現金"}]`;
}
