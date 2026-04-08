from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

# Register Japanese font
pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
FONT = 'HeiseiKakuGo-W5'

NAVY = HexColor('#0F172A')
GOLD = HexColor('#D4AF37')
WHITE = HexColor('#FFFFFF')
GRAY = HexColor('#64748B')
LIGHT = HexColor('#F1F5F9')

title_style = ParagraphStyle('Title', fontName=FONT, fontSize=28, textColor=GOLD, alignment=1, spaceAfter=8)
subtitle_style = ParagraphStyle('Subtitle', fontName=FONT, fontSize=14, textColor=GRAY, alignment=1, spaceAfter=40)
h1_style = ParagraphStyle('H1', fontName=FONT, fontSize=18, textColor=NAVY, spaceBefore=24, spaceAfter=12, borderWidth=0)
h2_style = ParagraphStyle('H2', fontName=FONT, fontSize=13, textColor=GOLD, spaceBefore=16, spaceAfter=8)
body_style = ParagraphStyle('Body', fontName=FONT, fontSize=10, textColor=HexColor('#334155'), leading=18, spaceAfter=6)
bullet_style = ParagraphStyle('Bullet', fontName=FONT, fontSize=10, textColor=HexColor('#334155'), leading=18, leftIndent=16, spaceAfter=4, bulletIndent=0)
note_style = ParagraphStyle('Note', fontName=FONT, fontSize=9, textColor=GRAY, leading=14, leftIndent=12, spaceAfter=8)
footer_style = ParagraphStyle('Footer', fontName=FONT, fontSize=8, textColor=GRAY, alignment=1)

def build():
    doc = SimpleDocTemplate(
        "public/manual.pdf",
        pagesize=A4,
        topMargin=30*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm
    )
    story = []

    # Cover
    story.append(Spacer(1, 60))
    story.append(Paragraph("ZeiFlow", title_style))
    story.append(Paragraph("操作マニュアル", ParagraphStyle('ST', fontName=FONT, fontSize=20, textColor=NAVY, alignment=1, spaceAfter=12)))
    story.append(Paragraph("税理士事務所向けレシート自動仕訳システム", subtitle_style))
    story.append(Spacer(1, 40))

    # TOC
    story.append(Paragraph("目次", h1_style))
    toc = [
        "1. はじめに",
        "2. アカウント登録・ログイン",
        "3. 初期設定（APIキー・2FA）",
        "4. 顧客管理",
        "5. レシート撮影・読み取り",
        "6. 仕訳管理",
        "7. CSV出力",
        "8. セキュリティ・バックアップ",
        "9. お問い合わせ",
    ]
    for item in toc:
        story.append(Paragraph(item, bullet_style))
    story.append(PageBreak())

    # 1
    story.append(Paragraph("1. はじめに", h1_style))
    story.append(Paragraph("ZeiFlowは税理士事務所向けのレシート自動仕訳システムです。", body_style))
    for t in [
        "・スマートフォン・PCの両方から利用可能",
        "・AIがレシート・領収書を読み取り、自動で勘定科目に仕訳",
        "・弥生会計・マネーフォワード・freee対応のCSV出力",
        "・インボイス制度（適格請求書等保存方式）に完全対応",
        "・二要素認証・監査ログなど高セキュリティ",
    ]:
        story.append(Paragraph(t, bullet_style))

    story.append(Paragraph("アクセスURL", h2_style))
    story.append(Paragraph("https://zeiflow.vercel.app", ParagraphStyle('URL', fontName=FONT, fontSize=12, textColor=GOLD, spaceAfter=12)))

    # 2
    story.append(Paragraph("2. アカウント登録・ログイン", h1_style))
    story.append(Paragraph("新規登録", h2_style))
    for t in [
        "1. https://zeiflow.vercel.app にアクセス",
        "2. 「新規登録」をクリック",
        "3. お名前・メールアドレス・パスワードを入力",
        "4. 「利用規約とプライバシーポリシーに同意する」にチェック",
        "5. 「アカウント作成」をクリック",
    ]:
        story.append(Paragraph(t, bullet_style))
    story.append(Paragraph("※パスワードは大文字・小文字・数字を含む8文字以上", note_style))

    story.append(Paragraph("ログイン", h2_style))
    for t in [
        "1. メールアドレスとパスワードを入力",
        "2. 「ログイン」をクリック",
        "3. 2FAが有効な場合は認証コードを入力",
    ]:
        story.append(Paragraph(t, bullet_style))

    # 3
    story.append(Paragraph("3. 初期設定", h1_style))
    story.append(Paragraph("Anthropic APIキーの設定", h2_style))
    story.append(Paragraph("レシートのAI読み取り機能を使うにはAPIキーが必要です。", body_style))
    for t in [
        "1. https://console.anthropic.com/settings/keys にアクセス",
        "2. Anthropicアカウントを作成（無料）",
        "3. 「Create Key」でAPIキーを生成",
        "4. ZeiFlowの設定ページでキーを貼り付けて「保存」",
    ]:
        story.append(Paragraph(t, bullet_style))
    story.append(Paragraph("※料金はレシート1枚あたり約0.01〜0.03ドルです", note_style))

    story.append(Paragraph("二要素認証（2FA）の設定", h2_style))
    for t in [
        "1. 設定ページ→セキュリティ→「有効にする」",
        "2. QRコードをGoogle Authenticatorでスキャン",
        "3. 表示された6桁のコードを入力して有効化",
    ]:
        story.append(Paragraph(t, bullet_style))
    story.append(PageBreak())

    # 4
    story.append(Paragraph("4. 顧客管理", h1_style))
    story.append(Paragraph("メニュー→「顧客管理」で顧客の登録・編集・削除ができます。", body_style))
    story.append(Paragraph("登録項目", h2_style))
    data = [
        ["項目", "説明", "必須"],
        ["顧客名", "会社名または個人名", "○"],
        ["顧客コード", "管理用のユニークなコード", "○"],
        ["フリガナ", "顧客名のカナ", ""],
        ["法人/個人", "法人または個人事業主", "○"],
        ["決算月", "決算開始月（デフォルト4月）", "○"],
        ["税区分", "課税/簡易課税/免税", "○"],
        ["インボイス登録番号", "T+13桁（例：T1234567890123）", ""],
        ["備考", "メモ", ""],
    ]
    t = Table(data, colWidths=[100, 220, 40])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), FONT),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('TEXTCOLOR', (0,1), (-1,-1), HexColor('#334155')),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, HexColor('#F8FAFC')]),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)

    # 5
    story.append(Paragraph("5. レシート撮影・読み取り", h1_style))
    story.append(Paragraph("メニュー→「レシート撮影」でレシートを読み取れます。", body_style))
    story.append(Paragraph("手順", h2_style))
    for t in [
        "1. 対象顧客を選択",
        "2. 「カメラで撮影」または「ファイル選択」でレシート画像を取得",
        "3. 「AI読み取り開始」をクリック",
        "4. AIが自動で以下を読み取ります：",
        "　　・店舗名、日付、合計金額、明細",
        "　　・インボイス登録番号（T+13桁）",
        "　　・勘定科目の自動分類",
        "5. 読み取り結果を確認し、必要に応じて編集",
    ]:
        story.append(Paragraph(t, bullet_style))
    story.append(Paragraph("※複数レシートの一括アップロードにも対応しています", note_style))
    story.append(Paragraph("※画像は自動圧縮されるため、高解像度の撮影でも問題ありません", note_style))

    # 6
    story.append(Paragraph("6. 仕訳管理", h1_style))
    story.append(Paragraph("メニュー→「仕訳管理」で全ての仕訳を管理できます。", body_style))
    story.append(Paragraph("機能一覧", h2_style))
    for t in [
        "・月次/半期/年次で表示切替",
        "・顧客フィルター、摘要・科目での検索",
        "・各仕訳のインライン編集（借方・貸方・金額・摘要・登録番号・メモ）",
        "・確定/確定取消（チェックマーク）",
        "・チェックボックスで選択→一括確定",
        "・「新規仕訳」ボタンで手動仕訳追加",
        "・「印刷」ボタンで仕訳帳を印刷/PDF出力",
        "・ページネーション（50件/ページ）",
    ]:
        story.append(Paragraph(t, bullet_style))
    story.append(PageBreak())

    # 7
    story.append(Paragraph("7. CSV出力", h1_style))
    story.append(Paragraph("メニュー→「CSV出力」で会計ソフト用のCSVをダウンロードできます。", body_style))
    story.append(Paragraph("対応形式", h2_style))
    data2 = [
        ["形式", "対応ソフト", "特徴"],
        ["弥生会計", "弥生会計デスクトップ/オンライン", "仕訳日記帳インポート形式"],
        ["マネーフォワード", "マネーフォワードクラウド会計", "仕訳帳CSVインポート形式"],
        ["freee", "freee会計", "取引インポートCSV形式"],
    ]
    t2 = Table(data2, colWidths=[80, 160, 120])
    t2.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), FONT),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('TEXTCOLOR', (0,1), (-1,-1), HexColor('#334155')),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t2)
    story.append(Spacer(1, 8))
    story.append(Paragraph("※BOM付きUTF-8で出力されるため、Excelで直接開いても文字化けしません", note_style))
    story.append(Paragraph("※インボイス登録番号は仕訳メモ/備考欄に自動記載されます", note_style))

    # 8
    story.append(Paragraph("8. セキュリティ・バックアップ", h1_style))
    for t in [
        "・二要素認証（TOTP）: Google Authenticator対応",
        "・パスワード変更: 設定ページから随時変更可能",
        "・監査ログ: メニュー→「監査ログ」で全操作履歴を確認",
        "・データバックアップ: 設定ページ→「データバックアップ」でJSON形式ダウンロード",
        "・セッション管理: 8時間で自動ログアウト、5分毎に認証チェック",
        "・HTTPS: 全通信が暗号化されています",
    ]:
        story.append(Paragraph(t, bullet_style))

    # 9
    story.append(Paragraph("9. お問い合わせ", h1_style))
    story.append(Paragraph("ご不明な点やご要望がございましたら、下記までお問い合わせください。", body_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph("メール: keita.030312@gmail.com", ParagraphStyle('Contact', fontName=FONT, fontSize=12, textColor=GOLD, alignment=1, spaceAfter=12)))

    story.append(Spacer(1, 40))
    story.append(Paragraph("ZeiFlow v1.0 | 2026年4月", footer_style))

    doc.build(story)
    print("Manual PDF generated: public/manual.pdf")

build()
