/* eslint-disable @typescript-eslint/no-require-imports */
const pptxgen = require("pptxgenjs");
const path = require("path");

const pptx = new pptxgen();

// Settings
pptx.layout = "LAYOUT_WIDE";
pptx.author = "ZeiFlow";
pptx.title = "ZeiFlow - 税理士事務所向けAI自動仕訳システム";

const NAVY = "0F172A";
const GOLD = "D4AF37";
const WHITE = "FFFFFF";
const GRAY = "94A3B8";
const DARK = "1E293B";

const bodyFont = "Meiryo";
const titleFont = "Meiryo";

// ===== Slide 1: Title =====
let slide1 = pptx.addSlide();
slide1.background = { color: NAVY };
// Gold line
slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 2.2, w: 13.33, h: 0.03, fill: { color: GOLD } });
slide1.addText("ZeiFlow", { x: 0, y: 1.0, w: 13.33, h: 1.2, fontSize: 60, fontFace: titleFont, color: GOLD, align: "center", bold: true });
slide1.addText("レシートを撮るだけ。仕訳が終わる。", { x: 0, y: 2.5, w: 13.33, h: 0.8, fontSize: 28, fontFace: bodyFont, color: WHITE, align: "center" });
slide1.addText("税理士事務所向け AI自動仕訳システム", { x: 0, y: 3.5, w: 13.33, h: 0.6, fontSize: 16, fontFace: bodyFont, color: GRAY, align: "center" });

// ===== Slide 2: お悩み =====
let slide2 = pptx.addSlide();
slide2.background = { color: NAVY };
slide2.addText("こんなお悩みありませんか？", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

const problems = [
  { icon: "⏰", text: "レシートの手入力に時間がかかる" },
  { icon: "❌", text: "入力ミスが多く、修正に手間がかかる" },
  { icon: "📋", text: "インボイス番号の管理が面倒" },
  { icon: "🔄", text: "弥生・マネーフォワード・freeeへの転記が大変" },
];
problems.forEach((p, i) => {
  const y = 1.8 + i * 1.1;
  slide2.addShape(pptx.ShapeType.roundRect, { x: 1.5, y: y, w: 10.3, h: 0.85, fill: { color: DARK }, rectRadius: 0.1 });
  slide2.addText(p.icon + "  " + p.text, { x: 1.8, y: y + 0.1, w: 9.7, h: 0.65, fontSize: 20, fontFace: bodyFont, color: WHITE });
});

// ===== Slide 3: 解決 =====
let slide3 = pptx.addSlide();
slide3.background = { color: NAVY };
slide3.addText("ZeiFlowなら解決できます", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

const solutions = [
  { icon: "📸", text: "スマホで撮影 → AIが自動読み取り" },
  { icon: "🏷️", text: "勘定科目を自動分類" },
  { icon: "📝", text: "インボイス番号も自動取得" },
  { icon: "📊", text: "CSV出力でそのまま会計ソフトへ" },
];
solutions.forEach((s, i) => {
  const y = 1.8 + i * 1.1;
  slide3.addShape(pptx.ShapeType.roundRect, { x: 1.5, y: y, w: 10.3, h: 0.85, fill: { color: DARK }, rectRadius: 0.1 });
  slide3.addShape(pptx.ShapeType.rect, { x: 1.5, y: y, w: 0.06, h: 0.85, fill: { color: GOLD } });
  slide3.addText(s.icon + "  " + s.text, { x: 1.8, y: y + 0.1, w: 9.7, h: 0.65, fontSize: 20, fontFace: bodyFont, color: WHITE });
});

// ===== Slide 4: 3ステップ =====
let slide4 = pptx.addSlide();
slide4.background = { color: NAVY };
slide4.addText("3ステップで完了", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

const steps = [
  { num: "1", title: "撮影", desc: "レシートをスマホで撮影" },
  { num: "2", title: "自動仕訳", desc: "AIが自動で仕訳を作成" },
  { num: "3", title: "CSV出力", desc: "会計ソフトに取り込み" },
];
steps.forEach((s, i) => {
  const x = 1.2 + i * 3.8;
  // Card
  slide4.addShape(pptx.ShapeType.roundRect, { x: x, y: 1.8, w: 3.4, h: 3.0, fill: { color: DARK }, rectRadius: 0.15 });
  // Number circle
  slide4.addShape(pptx.ShapeType.ellipse, { x: x + 1.2, y: 2.1, w: 1.0, h: 1.0, fill: { color: GOLD } });
  slide4.addText(s.num, { x: x + 1.2, y: 2.15, w: 1.0, h: 0.95, fontSize: 36, fontFace: titleFont, color: NAVY, align: "center", valign: "middle", bold: true });
  // Title
  slide4.addText(s.title, { x: x + 0.2, y: 3.3, w: 3.0, h: 0.6, fontSize: 22, fontFace: titleFont, color: GOLD, align: "center", bold: true });
  // Desc
  slide4.addText(s.desc, { x: x + 0.2, y: 3.9, w: 3.0, h: 0.5, fontSize: 14, fontFace: bodyFont, color: GRAY, align: "center" });
  // Arrow
  if (i < 2) {
    slide4.addText("→", { x: x + 3.3, y: 2.8, w: 0.6, h: 0.6, fontSize: 30, color: GOLD, align: "center" });
  }
});
slide4.addText("たった数秒で仕訳が完了", { x: 0, y: 5.2, w: 13.33, h: 0.6, fontSize: 18, fontFace: bodyFont, color: GOLD, align: "center", italic: true });

// ===== Slide 5: 主な機能 =====
let slide5 = pptx.addSlide();
slide5.background = { color: NAVY };
slide5.addText("主な機能", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

const features = [
  ["📸", "AI自動読み取り", "店舗名・金額・日付・\nインボイス番号を自動取得"],
  ["📊", "CSV出力", "弥生会計・マネーフォワード\n・freee対応"],
  ["👥", "顧客管理", "月次・半期・年次で\n仕訳を管理"],
  ["🤝", "チーム共有", "複数スタッフで\n同じデータを管理"],
  ["📱", "マルチデバイス", "スマホ・PC\nどこからでも"],
];
features.forEach((f, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 0.8 + col * 4.0;
  const y = 1.6 + row * 2.4;
  slide5.addShape(pptx.ShapeType.roundRect, { x: x, y: y, w: 3.6, h: 2.0, fill: { color: DARK }, rectRadius: 0.1 });
  slide5.addText(f[0], { x: x + 0.3, y: y + 0.2, w: 0.8, h: 0.8, fontSize: 28, align: "center" });
  slide5.addText(f[1], { x: x + 1.1, y: y + 0.2, w: 2.2, h: 0.5, fontSize: 16, fontFace: titleFont, color: GOLD, bold: true });
  slide5.addText(f[2], { x: x + 1.1, y: y + 0.8, w: 2.2, h: 1.0, fontSize: 12, fontFace: bodyFont, color: GRAY });
});

// ===== Slide 6: インボイス =====
let slide6 = pptx.addSlide();
slide6.background = { color: NAVY };
slide6.addText("インボイス制度に完全対応", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

const invoice = [
  ["自動読み取り", "適格請求書の登録番号\n（T+13桁）を自動で読み取り"],
  ["顧客ごとに管理", "インボイス登録番号を\n顧客情報に紐づけて管理"],
  ["CSV自動記載", "出力時に登録番号を\n自動で記載"],
];
invoice.forEach((item, i) => {
  const x = 0.8 + i * 4.0;
  slide6.addShape(pptx.ShapeType.roundRect, { x: x, y: 2.0, w: 3.6, h: 2.5, fill: { color: DARK }, rectRadius: 0.1 });
  slide6.addShape(pptx.ShapeType.rect, { x: x, y: 2.0, w: 3.6, h: 0.06, fill: { color: GOLD } });
  slide6.addText(item[0], { x: x + 0.3, y: 2.3, w: 3.0, h: 0.6, fontSize: 20, fontFace: titleFont, color: WHITE, bold: true });
  slide6.addText(item[1], { x: x + 0.3, y: 3.0, w: 3.0, h: 1.2, fontSize: 14, fontFace: bodyFont, color: GRAY });
});

// ===== Slide 7: セキュリティ =====
let slide7 = pptx.addSlide();
slide7.background = { color: NAVY };
slide7.addText("セキュリティ", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

const security = [
  "🔐  二要素認証（Google Authenticator対応）",
  "🔒  全通信HTTPS暗号化",
  "📋  操作履歴の監査ログ",
  "💾  データバックアップ機能",
];
security.forEach((s, i) => {
  const y = 1.8 + i * 0.95;
  slide7.addShape(pptx.ShapeType.roundRect, { x: 1.5, y: y, w: 10.3, h: 0.75, fill: { color: DARK }, rectRadius: 0.1 });
  slide7.addText(s, { x: 1.8, y: y + 0.08, w: 9.7, h: 0.6, fontSize: 18, fontFace: bodyFont, color: WHITE });
});
slide7.addText("大切な顧問先のデータを守ります", { x: 0, y: 5.5, w: 13.33, h: 0.6, fontSize: 18, fontFace: bodyFont, color: GOLD, align: "center", italic: true });

// ===== Slide 8: 導入効果 =====
let slide8a = pptx.addSlide();
slide8a.background = { color: NAVY };
slide8a.addText("導入効果", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });
slide8a.addText("手作業と比較した場合の効率化シミュレーション", { x: 0.8, y: 1.1, w: 12, h: 0.5, fontSize: 14, fontFace: bodyFont, color: GRAY });

// Before vs After
// Before card
slide8a.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 1.8, w: 5.8, h: 4.2, fill: { color: DARK }, rectRadius: 0.15 });
slide8a.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.8, w: 5.8, h: 0.06, fill: { color: "EF4444" } });
slide8a.addText("導入前（手作業）", { x: 1.1, y: 2.0, w: 5.2, h: 0.6, fontSize: 18, fontFace: titleFont, color: "EF4444", bold: true });
slide8a.addText("レシート1枚の入力", { x: 1.1, y: 2.7, w: 3.5, h: 0.4, fontSize: 14, fontFace: bodyFont, color: GRAY });
slide8a.addText("約5分", { x: 4.5, y: 2.7, w: 1.8, h: 0.4, fontSize: 14, fontFace: bodyFont, color: WHITE, align: "right" });
slide8a.addText("月100枚 × 5分", { x: 1.1, y: 3.2, w: 3.5, h: 0.4, fontSize: 14, fontFace: bodyFont, color: GRAY });
slide8a.addText("約8.3時間/月", { x: 4.5, y: 3.2, w: 1.8, h: 0.4, fontSize: 14, fontFace: bodyFont, color: WHITE, align: "right" });
slide8a.addText("人件費（時給2,000円）", { x: 1.1, y: 3.7, w: 3.5, h: 0.4, fontSize: 14, fontFace: bodyFont, color: GRAY });
slide8a.addText("約16,600円/月", { x: 4.5, y: 3.7, w: 1.8, h: 0.4, fontSize: 14, fontFace: bodyFont, color: WHITE, align: "right" });
slide8a.addText("年間コスト", { x: 1.1, y: 4.4, w: 3.5, h: 0.5, fontSize: 16, fontFace: titleFont, color: WHITE, bold: true });
slide8a.addText("約20万円", { x: 4.0, y: 4.4, w: 2.3, h: 0.5, fontSize: 22, fontFace: titleFont, color: "EF4444", align: "right", bold: true });
slide8a.addText("＋ 入力ミスによる修正コスト", { x: 1.1, y: 5.0, w: 5.0, h: 0.4, fontSize: 12, fontFace: bodyFont, color: GRAY });
slide8a.addText("＋ インボイス番号の確認作業", { x: 1.1, y: 5.3, w: 5.0, h: 0.4, fontSize: 12, fontFace: bodyFont, color: GRAY });

// After card
slide8a.addShape(pptx.ShapeType.roundRect, { x: 6.83, y: 1.8, w: 5.8, h: 4.2, fill: { color: DARK }, rectRadius: 0.15 });
slide8a.addShape(pptx.ShapeType.rect, { x: 6.83, y: 1.8, w: 5.8, h: 0.06, fill: { color: GOLD } });
slide8a.addText("導入後（ZeiFlow）", { x: 7.13, y: 2.0, w: 5.2, h: 0.6, fontSize: 18, fontFace: titleFont, color: GOLD, bold: true });
slide8a.addText("レシート1枚の処理", { x: 7.13, y: 2.7, w: 3.5, h: 0.4, fontSize: 14, fontFace: bodyFont, color: GRAY });
slide8a.addText("約15秒", { x: 10.5, y: 2.7, w: 1.8, h: 0.4, fontSize: 14, fontFace: bodyFont, color: WHITE, align: "right" });
slide8a.addText("月100枚 × 15秒", { x: 7.13, y: 3.2, w: 3.5, h: 0.4, fontSize: 14, fontFace: bodyFont, color: GRAY });
slide8a.addText("約25分/月", { x: 10.5, y: 3.2, w: 1.8, h: 0.4, fontSize: 14, fontFace: bodyFont, color: WHITE, align: "right" });
slide8a.addText("月額利用料", { x: 7.13, y: 3.7, w: 3.5, h: 0.4, fontSize: 14, fontFace: bodyFont, color: GRAY });
slide8a.addText("2万円/月", { x: 10.5, y: 3.7, w: 1.8, h: 0.4, fontSize: 14, fontFace: bodyFont, color: WHITE, align: "right" });
slide8a.addText("年間コスト", { x: 7.13, y: 4.4, w: 3.5, h: 0.5, fontSize: 16, fontFace: titleFont, color: WHITE, bold: true });
slide8a.addText("24万円", { x: 10.0, y: 4.4, w: 2.3, h: 0.5, fontSize: 22, fontFace: titleFont, color: GOLD, align: "right", bold: true });
slide8a.addText("✓ 入力ミスほぼゼロ", { x: 7.13, y: 5.0, w: 5.0, h: 0.4, fontSize: 12, fontFace: bodyFont, color: GOLD });
slide8a.addText("✓ インボイス番号も自動", { x: 7.13, y: 5.3, w: 5.0, h: 0.4, fontSize: 12, fontFace: bodyFont, color: GOLD });

// ===== Slide 8b: コスト効果まとめ =====
let slide8b = pptx.addSlide();
slide8b.background = { color: NAVY };
slide8b.addText("年間の効果", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

// Big numbers
const effects = [
  { num: "95%", label: "作業時間削減", desc: "8.3時間 → 25分/月" },
  { num: "100時間", label: "年間の時間削減", desc: "他の業務に使える時間" },
  { num: "0件", label: "入力ミス", desc: "AIが正確に読み取り" },
];
effects.forEach((e, i) => {
  const x = 0.5 + i * 4.2;
  slide8b.addShape(pptx.ShapeType.roundRect, { x: x, y: 1.6, w: 3.8, h: 3.2, fill: { color: DARK }, rectRadius: 0.15 });
  slide8b.addText(e.num, { x: x + 0.2, y: 1.9, w: 3.4, h: 1.2, fontSize: 48, fontFace: titleFont, color: GOLD, align: "center", bold: true });
  slide8b.addText(e.label, { x: x + 0.2, y: 3.1, w: 3.4, h: 0.6, fontSize: 18, fontFace: titleFont, color: WHITE, align: "center", bold: true });
  slide8b.addText(e.desc, { x: x + 0.2, y: 3.7, w: 3.4, h: 0.5, fontSize: 13, fontFace: bodyFont, color: GRAY, align: "center" });
});

slide8b.addShape(pptx.ShapeType.roundRect, { x: 2.5, y: 5.1, w: 8.33, h: 1.0, fill: { color: DARK }, rectRadius: 0.1 });
slide8b.addShape(pptx.ShapeType.rect, { x: 2.5, y: 5.1, w: 8.33, h: 0.05, fill: { color: GOLD } });
slide8b.addText("顧問先が10社なら → 年間1,000時間の削減効果", { x: 2.5, y: 5.3, w: 8.33, h: 0.6, fontSize: 18, fontFace: bodyFont, color: GOLD, align: "center", bold: true });

// ===== Slide 9: 料金 (was slide 8) =====
let slide8 = pptx.addSlide();
slide8.background = { color: NAVY };
slide8.addText("料金プラン", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

// 初期費用
slide8.addShape(pptx.ShapeType.roundRect, { x: 1.0, y: 1.6, w: 5.5, h: 4.0, fill: { color: DARK }, rectRadius: 0.15 });
slide8.addShape(pptx.ShapeType.rect, { x: 1.0, y: 1.6, w: 5.5, h: 0.06, fill: { color: GOLD } });
slide8.addText("初期導入費", { x: 1.3, y: 1.9, w: 4.9, h: 0.5, fontSize: 16, fontFace: bodyFont, color: GRAY });
slide8.addText("30万円", { x: 1.3, y: 2.3, w: 4.9, h: 0.9, fontSize: 44, fontFace: titleFont, color: GOLD, bold: true });
slide8.addText("（税別）", { x: 4.0, y: 2.8, w: 2.0, h: 0.4, fontSize: 12, fontFace: bodyFont, color: GRAY });
slide8.addText("✓ アカウント設定\n✓ 初期サポート・操作説明\n✓ カスタマイズ対応", { x: 1.5, y: 3.5, w: 4.5, h: 1.8, fontSize: 15, fontFace: bodyFont, color: WHITE, lineSpacingMultiple: 1.5 });

// 月額
slide8.addShape(pptx.ShapeType.roundRect, { x: 6.83, y: 1.6, w: 5.5, h: 4.0, fill: { color: DARK }, rectRadius: 0.15 });
slide8.addShape(pptx.ShapeType.rect, { x: 6.83, y: 1.6, w: 5.5, h: 0.06, fill: { color: GOLD } });
slide8.addText("月額利用料", { x: 7.13, y: 1.9, w: 4.9, h: 0.5, fontSize: 16, fontFace: bodyFont, color: GRAY });
slide8.addText("2万円", { x: 7.13, y: 2.3, w: 4.9, h: 0.9, fontSize: 44, fontFace: titleFont, color: GOLD, bold: true });
slide8.addText("（税別）/ 事務所", { x: 9.5, y: 2.8, w: 2.5, h: 0.4, fontSize: 12, fontFace: bodyFont, color: GRAY });
slide8.addText("✓ AI読み取り無制限\n✓ 全機能利用可能\n✓ メールサポート", { x: 7.33, y: 3.5, w: 4.5, h: 1.8, fontSize: 15, fontFace: bodyFont, color: WHITE, lineSpacingMultiple: 1.5 });

// ===== Slide 9: 導入の流れ =====
let slide9 = pptx.addSlide();
slide9.background = { color: NAVY };
slide9.addText("導入の流れ", { x: 0.8, y: 0.4, w: 12, h: 0.9, fontSize: 32, fontFace: titleFont, color: GOLD, bold: true });

const flow = [
  { num: "1", title: "お問い合わせ", desc: "ご相談は無料" },
  { num: "2", title: "デモ", desc: "実際の画面をご案内" },
  { num: "3", title: "初期設定", desc: "アカウント設定・\n操作サポート" },
  { num: "4", title: "運用開始", desc: "最短1日で\n利用開始" },
];
flow.forEach((f, i) => {
  const x = 0.5 + i * 3.2;
  slide9.addShape(pptx.ShapeType.roundRect, { x: x, y: 2.0, w: 2.8, h: 3.0, fill: { color: DARK }, rectRadius: 0.1 });
  slide9.addShape(pptx.ShapeType.ellipse, { x: x + 0.9, y: 2.3, w: 1.0, h: 1.0, fill: { color: GOLD } });
  slide9.addText(f.num, { x: x + 0.9, y: 2.35, w: 1.0, h: 0.95, fontSize: 32, fontFace: titleFont, color: NAVY, align: "center", valign: "middle", bold: true });
  slide9.addText(f.title, { x: x + 0.2, y: 3.5, w: 2.4, h: 0.5, fontSize: 18, fontFace: titleFont, color: WHITE, align: "center", bold: true });
  slide9.addText(f.desc, { x: x + 0.2, y: 4.1, w: 2.4, h: 0.7, fontSize: 13, fontFace: bodyFont, color: GRAY, align: "center" });
  if (i < 3) {
    slide9.addText("→", { x: x + 2.7, y: 2.8, w: 0.6, h: 0.6, fontSize: 24, color: GOLD, align: "center" });
  }
});
slide9.addText("最短1日で利用開始できます", { x: 0, y: 5.5, w: 13.33, h: 0.6, fontSize: 18, fontFace: bodyFont, color: GOLD, align: "center", italic: true });

// ===== Slide 10: お問い合わせ =====
let slide10 = pptx.addSlide();
slide10.background = { color: NAVY };
slide10.addShape(pptx.ShapeType.rect, { x: 0, y: 2.0, w: 13.33, h: 0.03, fill: { color: GOLD } });
slide10.addText("ZeiFlow", { x: 0, y: 0.8, w: 13.33, h: 1.0, fontSize: 50, fontFace: titleFont, color: GOLD, align: "center", bold: true });
slide10.addText("まずはデモをお試しください", { x: 0, y: 2.5, w: 13.33, h: 0.8, fontSize: 26, fontFace: bodyFont, color: WHITE, align: "center" });

slide10.addShape(pptx.ShapeType.roundRect, { x: 3.67, y: 3.8, w: 6.0, h: 2.0, fill: { color: DARK }, rectRadius: 0.15 });
slide10.addText("メール: keita.030312@gmail.com\nURL: https://zeiflow.vercel.app", { x: 3.67, y: 4.0, w: 6.0, h: 1.6, fontSize: 18, fontFace: bodyFont, color: WHITE, align: "center", lineSpacingMultiple: 1.8 });

// Save
const outPath = path.join(__dirname, "ZeiFlow_プレゼン.pptx");
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log("OK: " + outPath);
});
