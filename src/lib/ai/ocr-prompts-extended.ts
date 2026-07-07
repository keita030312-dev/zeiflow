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

export function buildReceiptMainPromptStatic(accountList: string): string {
  return `このレシート・小票の画像を読み取ってJSONで返してください。

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
}
