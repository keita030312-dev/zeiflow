/* eslint-disable @typescript-eslint/no-require-imports */
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "ZeiFlow";
pres.title = "ZeiFlow 営業資料";

// Colors
const GOLD = "D4AF37";
const NAVY = "0F172A";
const DARK = "1E293B";
const WHITE = "F1F5F9";
const GRAY = "94A3B8";
const DARK_GRAY = "64748B";

// Helper
const makeShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.2 });

// ========== Slide 1: Cover ==========
let s1 = pres.addSlide();
s1.background = { color: NAVY };
// Gold accent bar top
s1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
// Logo mark
s1.addShape(pres.shapes.RECTANGLE, { x: 4.1, y: 1.2, w: 1.8, h: 1.8, fill: { color: GOLD }, rectRadius: 0.15 });
s1.addText("Z", { x: 4.1, y: 1.2, w: 1.8, h: 1.8, fontSize: 60, fontFace: "Arial Black", color: NAVY, align: "center", valign: "middle", bold: true });
// Title
s1.addText("ZeiFlow", { x: 0.5, y: 3.3, w: 9, h: 0.8, fontSize: 44, fontFace: "Arial Black", color: WHITE, align: "center", bold: true });
s1.addText("税理士事務所向け AI仕訳管理システム", { x: 0.5, y: 4.1, w: 9, h: 0.5, fontSize: 18, fontFace: "Arial", color: GOLD, align: "center" });
s1.addText("レシート撮影から会計ソフト連携までワンストップで", { x: 0.5, y: 4.7, w: 9, h: 0.4, fontSize: 13, fontFace: "Arial", color: GRAY, align: "center" });
// Gold accent bar bottom
s1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.565, w: 10, h: 0.06, fill: { color: GOLD } });

// ========== Slide 2: Pain Points ==========
let s2 = pres.addSlide();
s2.background = { color: NAVY };
s2.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s2.addText("こんなお悩みありませんか？", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });

const pains = [
  { icon: "!", text: "レシート・領収書の手入力に\n時間がかかる" },
  { icon: "?", text: "顧問先からのレシート回収が\n面倒" },
  { icon: "X", text: "スタッフの仕訳ミスが多い" },
  { icon: "T", text: "インボイス登録番号の\n確認が大変" },
];
pains.forEach((p, i) => {
  const x = 0.5 + (i % 2) * 4.7;
  const y = 1.3 + Math.floor(i / 2) * 2.1;
  s2.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.3, h: 1.8, fill: { color: DARK }, shadow: makeShadow() });
  s2.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h: 1.8, fill: { color: "EF4444" } });
  s2.addText(p.icon, { x: x + 0.3, y: y + 0.3, w: 0.7, h: 0.7, fontSize: 24, fontFace: "Arial Black", color: "EF4444", align: "center", valign: "middle" });
  s2.addText(p.text, { x: x + 1.1, y: y + 0.2, w: 3, h: 1.4, fontSize: 14, fontFace: "Arial", color: WHITE, valign: "middle" });
});

// ========== Slide 3: What is ZeiFlow ==========
let s3 = pres.addSlide();
s3.background = { color: NAVY };
s3.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s3.addText("ZeiFlowとは", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });

const whats = [
  "AIがレシートを自動読み取り・自動仕訳",
  "顧問先がスマホから直接レシートを送信できる",
  "使うほどAIが学習し、事務所の仕訳ルールに最適化",
  "弥生会計・マネーフォワード・freee対応",
];
whats.forEach((w, i) => {
  const y = 1.3 + i * 1.0;
  s3.addShape(pres.shapes.RECTANGLE, { x: 0.7, y, w: 8.6, h: 0.8, fill: { color: DARK }, shadow: makeShadow() });
  s3.addShape(pres.shapes.RECTANGLE, { x: 0.7, y, w: 0.07, h: 0.8, fill: { color: GOLD } });
  s3.addText((i + 1).toString(), { x: 1.0, y, w: 0.6, h: 0.8, fontSize: 20, fontFace: "Arial Black", color: GOLD, align: "center", valign: "middle" });
  s3.addText(w, { x: 1.7, y, w: 7.4, h: 0.8, fontSize: 16, fontFace: "Arial", color: WHITE, valign: "middle" });
});

// ========== Slide 4: Features ==========
let s4 = pres.addSlide();
s4.background = { color: NAVY };
s4.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s4.addText("主な機能", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });

const features = [
  "AI自動仕訳（Claude Vision）",
  "インボイス登録番号の自動読み取り",
  "クライアントポータル",
  "仕訳ナレッジ（PDF/CSVでルール登録）",
  "AI学習（確定するだけで自動学習）",
  "CSV出力（弥生/MF/freee）・PDF帳票",
  "顧客別分析・ダッシュボード",
  "チーム管理（複数スタッフ対応）",
  "二要素認証・監査ログ",
];
features.forEach((f, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 0.5 + col * 3.1;
  const y = 1.2 + row * 1.4;
  s4.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.9, h: 1.15, fill: { color: DARK }, shadow: makeShadow() });
  s4.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.9, h: 0.06, fill: { color: GOLD } });
  s4.addText(f, { x: x + 0.2, y: y + 0.15, w: 2.5, h: 0.85, fontSize: 12, fontFace: "Arial", color: WHITE, valign: "middle" });
});

// ========== Slide 5: 3 Steps ==========
let s5 = pres.addSlide();
s5.background = { color: NAVY };
s5.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s5.addText("3ステップで完結", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });

const steps = [
  { step: "STEP 1", title: "レシートを撮影・送信", desc: "スマホで撮影するだけ。\n複数枚の一括アップロードも可能。" },
  { step: "STEP 2", title: "AIが自動で仕訳", desc: "金額・日付・登録番号を自動読取。\n適切な勘定科目に自動分類。" },
  { step: "STEP 3", title: "確認して確定→CSV出力", desc: "仕訳を確認・確定。\n弥生/MF/freee形式でCSV出力。" },
];
steps.forEach((s, i) => {
  const x = 0.5 + i * 3.2;
  s5.addShape(pres.shapes.RECTANGLE, { x, y: 1.3, w: 2.9, h: 3.5, fill: { color: DARK }, shadow: makeShadow() });
  s5.addShape(pres.shapes.RECTANGLE, { x, y: 1.3, w: 2.9, h: 0.06, fill: { color: GOLD } });
  // Step number circle
  s5.addShape(pres.shapes.OVAL, { x: x + 0.95, y: 1.6, w: 1.0, h: 1.0, fill: { color: GOLD } });
  s5.addText((i + 1).toString(), { x: x + 0.95, y: 1.6, w: 1.0, h: 1.0, fontSize: 36, fontFace: "Arial Black", color: NAVY, align: "center", valign: "middle" });
  s5.addText(s.step, { x: x + 0.2, y: 2.75, w: 2.5, h: 0.35, fontSize: 11, fontFace: "Arial", color: GOLD, align: "center" });
  s5.addText(s.title, { x: x + 0.2, y: 3.1, w: 2.5, h: 0.4, fontSize: 15, fontFace: "Arial", color: WHITE, align: "center", bold: true });
  s5.addText(s.desc, { x: x + 0.2, y: 3.55, w: 2.5, h: 1.0, fontSize: 11, fontFace: "Arial", color: GRAY, align: "center" });
});

// ========== Slide 6: Client Portal ==========
let s6 = pres.addSlide();
s6.background = { color: NAVY };
s6.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s6.addText("クライアントポータル", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });
s6.addText("顧問先との連携を劇的に効率化", { x: 0.7, y: 0.9, w: 9, h: 0.4, fontSize: 14, fontFace: "Arial", color: GOLD });

const portals = [
  { title: "リンク発行", desc: "顧問先ごとに専用リンクを発行するだけ" },
  { title: "ログイン不要", desc: "顧問先はアカウント不要でスマホからレシート送信" },
  { title: "AI自動仕訳", desc: "送信されたレシートは自動でAI仕訳" },
  { title: "仕訳確認", desc: "顧問先が自分の仕訳を確認・確定できる" },
];
portals.forEach((p, i) => {
  const x = 0.5 + (i % 2) * 4.7;
  const y = 1.6 + Math.floor(i / 2) * 1.9;
  s6.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.3, h: 1.6, fill: { color: DARK }, shadow: makeShadow() });
  s6.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h: 1.6, fill: { color: GOLD } });
  s6.addText(p.title, { x: x + 0.3, y: y + 0.2, w: 3.7, h: 0.4, fontSize: 16, fontFace: "Arial", color: GOLD, bold: true });
  s6.addText(p.desc, { x: x + 0.3, y: y + 0.7, w: 3.7, h: 0.6, fontSize: 13, fontFace: "Arial", color: WHITE });
});

// ========== Slide 7: AI Learning ==========
let s7 = pres.addSlide();
s7.background = { color: NAVY };
s7.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s7.addText("AI学習機能", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });
s7.addText("使えば使うほど精度が向上", { x: 0.7, y: 0.9, w: 9, h: 0.4, fontSize: 14, fontFace: "Arial", color: GOLD });

const learns = [
  { title: "摘要パターン", desc: "「○○ ご飲食代」→ 会議費\n同じ店名なら同じ科目で自動仕訳" },
  { title: "キーワードパターン", desc: "「飲食」を含む → 会議費\n「タクシー」→ 旅費交通費" },
  { title: "金額帯パターン", desc: "5,000円以下 → 会議費\n5,000円超 → 接待交際費" },
  { title: "ナレッジ登録", desc: "仕訳帳PDFをアップするだけで\n事務所独自のルールをAIに教育" },
];
learns.forEach((l, i) => {
  const x = 0.5 + (i % 2) * 4.7;
  const y = 1.6 + Math.floor(i / 2) * 1.9;
  s7.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.3, h: 1.6, fill: { color: DARK }, shadow: makeShadow() });
  s7.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.3, h: 0.06, fill: { color: GOLD } });
  s7.addText(l.title, { x: x + 0.3, y: y + 0.2, w: 3.7, h: 0.35, fontSize: 15, fontFace: "Arial", color: GOLD, bold: true });
  s7.addText(l.desc, { x: x + 0.3, y: y + 0.6, w: 3.7, h: 0.8, fontSize: 12, fontFace: "Arial", color: WHITE });
});

// ========== Slide 8: Security ==========
let s8 = pres.addSlide();
s8.background = { color: NAVY };
s8.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s8.addText("セキュリティ", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });

const secs = [
  "二要素認証（TOTP）",
  "全操作の監査ログ",
  "組織ごとのデータ完全分離",
  "HTTPS暗号化通信",
  "レート制限（不正アクセス防止）",
];
secs.forEach((sec, i) => {
  const y = 1.3 + i * 0.8;
  s8.addShape(pres.shapes.RECTANGLE, { x: 1.5, y, w: 7, h: 0.65, fill: { color: DARK }, shadow: makeShadow() });
  s8.addShape(pres.shapes.OVAL, { x: 1.7, y: y + 0.1, w: 0.45, h: 0.45, fill: { color: GOLD } });
  s8.addText("✓", { x: 1.7, y: y + 0.1, w: 0.45, h: 0.45, fontSize: 16, color: NAVY, align: "center", valign: "middle", bold: true });
  s8.addText(sec, { x: 2.4, y, w: 5.8, h: 0.65, fontSize: 16, fontFace: "Arial", color: WHITE, valign: "middle" });
});

// ========== Slide 9: Pricing ==========
let s9 = pres.addSlide();
s9.background = { color: NAVY };
s9.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s9.addText("料金プラン", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });

// Initial cost
s9.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.2, w: 4.3, h: 3.8, fill: { color: DARK }, shadow: makeShadow() });
s9.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.2, w: 4.3, h: 0.7, fill: { color: GOLD } });
s9.addText("初期導入費用", { x: 0.5, y: 1.2, w: 4.3, h: 0.7, fontSize: 18, fontFace: "Arial", color: NAVY, align: "center", valign: "middle", bold: true });
s9.addText("30万円", { x: 0.5, y: 2.0, w: 4.3, h: 0.7, fontSize: 36, fontFace: "Arial Black", color: GOLD, align: "center" });
s9.addText("（税別）", { x: 0.5, y: 2.6, w: 4.3, h: 0.3, fontSize: 11, fontFace: "Arial", color: GRAY, align: "center" });
s9.addText([
  { text: "アカウント設定・初期データ移行", options: { bullet: true, breakLine: true } },
  { text: "APIキー設定サポート", options: { bullet: true, breakLine: true } },
  { text: "操作説明・トレーニング（2時間）", options: { bullet: true } },
], { x: 1.0, y: 3.1, w: 3.3, h: 1.5, fontSize: 12, fontFace: "Arial", color: WHITE });

// Monthly
s9.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.2, w: 4.3, h: 3.8, fill: { color: DARK }, shadow: makeShadow() });
s9.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.2, w: 4.3, h: 0.7, fill: { color: GOLD } });
s9.addText("月額利用料", { x: 5.2, y: 1.2, w: 4.3, h: 0.7, fontSize: 18, fontFace: "Arial", color: NAVY, align: "center", valign: "middle", bold: true });
s9.addText("2万円", { x: 5.2, y: 2.0, w: 4.3, h: 0.7, fontSize: 36, fontFace: "Arial Black", color: GOLD, align: "center" });
s9.addText("（税別/月）", { x: 5.2, y: 2.6, w: 4.3, h: 0.3, fontSize: 11, fontFace: "Arial", color: GRAY, align: "center" });
s9.addText([
  { text: "全機能利用可能", options: { bullet: true, breakLine: true } },
  { text: "クライアントポータル無制限", options: { bullet: true, breakLine: true } },
  { text: "チームメンバー無制限", options: { bullet: true, breakLine: true } },
  { text: "メール・チャットサポート", options: { bullet: true } },
], { x: 5.7, y: 3.1, w: 3.3, h: 1.5, fontSize: 12, fontFace: "Arial", color: WHITE });

s9.addText("※AI処理費用（Anthropic API）は事務所負担（レシート1枚あたり約5〜10円）", { x: 0.5, y: 5.1, w: 9, h: 0.3, fontSize: 10, fontFace: "Arial", color: DARK_GRAY, align: "center" });

// ========== Slide 10: Flow ==========
let s10 = pres.addSlide();
s10.background = { color: NAVY };
s10.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s10.addText("導入の流れ", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });

const flows = [
  { num: "1", title: "お問い合わせ・デモ", desc: "まずはデモでZeiFlowを体験" },
  { num: "2", title: "ご契約・初期設定", desc: "1〜2営業日で設定完了" },
  { num: "3", title: "操作説明", desc: "トレーニング2時間" },
  { num: "4", title: "運用開始", desc: "すぐに使い始められます" },
  { num: "5", title: "サポート", desc: "継続的なフィードバック対応" },
];
flows.forEach((f, i) => {
  const x = 0.3 + i * 1.95;
  s10.addShape(pres.shapes.RECTANGLE, { x, y: 1.3, w: 1.75, h: 3.5, fill: { color: DARK }, shadow: makeShadow() });
  s10.addShape(pres.shapes.OVAL, { x: x + 0.45, y: 1.6, w: 0.85, h: 0.85, fill: { color: GOLD } });
  s10.addText(f.num, { x: x + 0.45, y: 1.6, w: 0.85, h: 0.85, fontSize: 28, fontFace: "Arial Black", color: NAVY, align: "center", valign: "middle" });
  s10.addText(f.title, { x: x + 0.1, y: 2.7, w: 1.55, h: 0.6, fontSize: 13, fontFace: "Arial", color: WHITE, align: "center", bold: true });
  s10.addText(f.desc, { x: x + 0.1, y: 3.4, w: 1.55, h: 0.8, fontSize: 10, fontFace: "Arial", color: GRAY, align: "center" });
});

// ========== Slide 11: Comparison ==========
let s11 = pres.addSlide();
s11.background = { color: NAVY };
s11.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s11.addText("他社比較", { x: 0.7, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontFace: "Arial", color: WHITE, bold: true });

const tableRows = [
  [
    { text: "機能", options: { fill: { color: GOLD }, color: NAVY, bold: true, fontSize: 12, align: "center" } },
    { text: "ZeiFlow", options: { fill: { color: GOLD }, color: NAVY, bold: true, fontSize: 12, align: "center" } },
    { text: "freee", options: { fill: { color: GOLD }, color: NAVY, bold: true, fontSize: 12, align: "center" } },
    { text: "MFクラウド", options: { fill: { color: GOLD }, color: NAVY, bold: true, fontSize: 12, align: "center" } },
  ],
  [
    { text: "AI自動仕訳", options: { fill: { color: DARK }, color: WHITE, fontSize: 11 } },
    { text: "○", options: { fill: { color: DARK }, color: "22C55E", fontSize: 14, bold: true, align: "center" } },
    { text: "△", options: { fill: { color: DARK }, color: "F59E0B", fontSize: 14, align: "center" } },
    { text: "△", options: { fill: { color: DARK }, color: "F59E0B", fontSize: 14, align: "center" } },
  ],
  [
    { text: "クライアントポータル", options: { fill: { color: "141E33" }, color: WHITE, fontSize: 11 } },
    { text: "○", options: { fill: { color: "141E33" }, color: "22C55E", fontSize: 14, bold: true, align: "center" } },
    { text: "×", options: { fill: { color: "141E33" }, color: "EF4444", fontSize: 14, align: "center" } },
    { text: "×", options: { fill: { color: "141E33" }, color: "EF4444", fontSize: 14, align: "center" } },
  ],
  [
    { text: "AI学習", options: { fill: { color: DARK }, color: WHITE, fontSize: 11 } },
    { text: "○", options: { fill: { color: DARK }, color: "22C55E", fontSize: 14, bold: true, align: "center" } },
    { text: "×", options: { fill: { color: DARK }, color: "EF4444", fontSize: 14, align: "center" } },
    { text: "×", options: { fill: { color: DARK }, color: "EF4444", fontSize: 14, align: "center" } },
  ],
  [
    { text: "ナレッジ登録", options: { fill: { color: "141E33" }, color: WHITE, fontSize: 11 } },
    { text: "○", options: { fill: { color: "141E33" }, color: "22C55E", fontSize: 14, bold: true, align: "center" } },
    { text: "×", options: { fill: { color: "141E33" }, color: "EF4444", fontSize: 14, align: "center" } },
    { text: "×", options: { fill: { color: "141E33" }, color: "EF4444", fontSize: 14, align: "center" } },
  ],
  [
    { text: "インボイス自動読取", options: { fill: { color: DARK }, color: WHITE, fontSize: 11 } },
    { text: "○", options: { fill: { color: DARK }, color: "22C55E", fontSize: 14, bold: true, align: "center" } },
    { text: "○", options: { fill: { color: DARK }, color: "22C55E", fontSize: 14, align: "center" } },
    { text: "○", options: { fill: { color: DARK }, color: "22C55E", fontSize: 14, align: "center" } },
  ],
  [
    { text: "CSV出力（3社対応）", options: { fill: { color: "141E33" }, color: WHITE, fontSize: 11 } },
    { text: "○", options: { fill: { color: "141E33" }, color: "22C55E", fontSize: 14, bold: true, align: "center" } },
    { text: "—", options: { fill: { color: "141E33" }, color: DARK_GRAY, fontSize: 14, align: "center" } },
    { text: "—", options: { fill: { color: "141E33" }, color: DARK_GRAY, fontSize: 14, align: "center" } },
  ],
];

s11.addTable(tableRows, {
  x: 0.7, y: 1.2, w: 8.6,
  colW: [3.2, 1.8, 1.8, 1.8],
  border: { pt: 0.5, color: "334155" },
  rowH: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
});

// ========== Slide 12: Contact ==========
let s12 = pres.addSlide();
s12.background = { color: NAVY };
s12.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: GOLD } });
s12.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.565, w: 10, h: 0.06, fill: { color: GOLD } });

// Logo
s12.addShape(pres.shapes.RECTANGLE, { x: 4.1, y: 0.8, w: 1.8, h: 1.8, fill: { color: GOLD }, rectRadius: 0.15 });
s12.addText("Z", { x: 4.1, y: 0.8, w: 1.8, h: 1.8, fontSize: 60, fontFace: "Arial Black", color: NAVY, align: "center", valign: "middle", bold: true });

s12.addText("ZeiFlow", { x: 0.5, y: 2.8, w: 9, h: 0.7, fontSize: 36, fontFace: "Arial Black", color: WHITE, align: "center" });
s12.addText("まずはデモをお試しください", { x: 0.5, y: 3.5, w: 9, h: 0.5, fontSize: 18, fontFace: "Arial", color: GOLD, align: "center" });

s12.addText("メール: keita.030312@gmail.com", { x: 0.5, y: 4.3, w: 9, h: 0.35, fontSize: 14, fontFace: "Arial", color: GRAY, align: "center" });
s12.addText("URL: https://zeiflow.vercel.app", { x: 0.5, y: 4.65, w: 9, h: 0.35, fontSize: 14, fontFace: "Arial", color: GRAY, align: "center" });

// Save
pres.writeFile({ fileName: "C:\\Users\\keita\\OneDrive\\デスクトップ\\zeiflow\\ZeiFlow_営業資料.pptx" })
  .then(() => console.log("Done: ZeiFlow_営業資料.pptx"))
  .catch(err => console.error(err));
