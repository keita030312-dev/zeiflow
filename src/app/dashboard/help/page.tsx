"use client";

import {
  BookOpen,
  UserPlus,
  Key,
  Users,
  Camera,
  ClipboardList,
  FileDown,
  UsersRound,
  ShieldCheck,
  Mail,
  ChevronUp,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Table of Contents config                                          */
/* ------------------------------------------------------------------ */
const sections = [
  { id: "intro", label: "はじめに", icon: BookOpen },
  { id: "account", label: "アカウント登録・ログイン", icon: UserPlus },
  { id: "setup", label: "初期設定（APIキー・2FA）", icon: Key },
  { id: "clients", label: "顧客管理", icon: Users },
  { id: "receipts", label: "レシート撮影・読み取り", icon: Camera },
  { id: "journals", label: "仕訳管理", icon: ClipboardList },
  { id: "csv", label: "CSV出力・PDF帳票", icon: FileDown },
  { id: "import", label: "CSVインポート", icon: FileDown },
  { id: "analytics", label: "顧客別分析", icon: ClipboardList },
  { id: "portal", label: "クライアントポータル", icon: ExternalLink },
  { id: "knowledge", label: "仕訳ナレッジ・AI学習", icon: BookOpen },
  { id: "team", label: "チーム管理", icon: UsersRound },
  { id: "security", label: "セキュリティ・バックアップ", icon: ShieldCheck },
  { id: "contact", label: "お問い合わせ", icon: Mail },
] as const;

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                           */
/* ------------------------------------------------------------------ */
function SectionHeading({
  id,
  number,
  title,
  icon: Icon,
}: {
  id: string;
  number: number;
  title: string;
  icon: React.ElementType;
}) {
  return (
    <div id={id} className="scroll-mt-24 flex items-center gap-3 mb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.12)]">
        <Icon className="h-5 w-5 text-[#D4AF37]" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9]">
        <span className="text-[#D4AF37] mr-2">{number}.</span>
        {title}
      </h2>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[#0F172A] text-xs font-bold mt-0.5">
        {n}
      </span>
      <span className="text-[#CBD5E1]">{children}</span>
    </li>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-[#94A3B8] mt-3 pl-4 border-l-2 border-[rgba(212,175,55,0.3)]">
      ※ {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 items-start text-[#CBD5E1]">
      <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Back-to-top button                                                */
/* ------------------------------------------------------------------ */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#D4AF37] text-[#0F172A] shadow-lg hover:bg-[#c9a432] transition-colors"
      aria-label="トップへ戻る"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */
export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-[#D4AF37]">ZeiFlow</span> 操作マニュアル
          </h1>
          <p className="text-[#94A3B8]">
            税理士事務所向けレシート自動仕訳システム
          </p>
        </div>

        {/* Table of Contents */}
        <Card className="mb-10 border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#D4AF37] text-lg">目次</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 sm:grid-cols-2">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#CBD5E1] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.06)] transition-colors"
                  >
                    <s.icon className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                    <span>
                      <span className="text-[#D4AF37] font-medium mr-1.5">
                        {i + 1}.
                      </span>
                      {s.label}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* ====== 1. はじめに ====== */}
        <section className="mb-10">
          <SectionHeading id="intro" number={1} title="はじめに" icon={BookOpen} />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                ZeiFlowは税理士事務所向けのレシート自動仕訳システムです。
              </p>
              <ul className="space-y-2">
                <Bullet>スマートフォン・PCの両方から利用可能</Bullet>
                <Bullet>AIがレシート・領収書を読み取り、自動で勘定科目に仕訳</Bullet>
                <Bullet>弥生会計・マネーフォワード・freee対応のCSV出力</Bullet>
                <Bullet>インボイス制度（適格請求書等保存方式）に完全対応</Bullet>
                <Bullet>二要素認証・監査ログなど高セキュリティ</Bullet>
              </ul>
              <div className="mt-4 rounded-lg bg-[rgba(212,175,55,0.06)] p-4">
                <p className="text-sm text-[#94A3B8]">
                  <span className="font-semibold text-[#D4AF37]">アクセスURL：</span>
                  <a
                    href="https://zeiflow.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D4AF37] hover:underline inline-flex items-center gap-1"
                  >
                    https://zeiflow.vercel.app
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ====== 2. アカウント登録・ログイン ====== */}
        <section className="mb-10">
          <SectionHeading
            id="account"
            number={2}
            title="アカウント登録・ログイン"
            icon={UserPlus}
          />
          <div className="space-y-6">
            <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#F1F5F9] text-base">新規登録</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ol className="space-y-2">
                  <Step n={1}>
                    <a
                      href="https://zeiflow.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D4AF37] hover:underline"
                    >
                      https://zeiflow.vercel.app
                    </a>{" "}
                    にアクセス
                  </Step>
                  <Step n={2}>「新規登録」をクリック</Step>
                  <Step n={3}>お名前・メールアドレス・パスワードを入力</Step>
                  <Step n={4}>「利用規約とプライバシーポリシーに同意する」にチェック</Step>
                  <Step n={5}>「アカウント作成」をクリック</Step>
                </ol>
                <Note>パスワードは大文字・小文字・数字を含む8文字以上</Note>
              </CardContent>
            </Card>

            <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#F1F5F9] text-base">ログイン</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  <Step n={1}>メールアドレスとパスワードを入力</Step>
                  <Step n={2}>「ログイン」をクリック</Step>
                  <Step n={3}>2FAが有効な場合は認証コードを入力</Step>
                </ol>
              </CardContent>
            </Card>

            <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#F1F5F9] text-base">パスワードをお忘れの場合</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  <Step n={1}>ログイン画面で「パスワードをお忘れの方」をクリック</Step>
                  <Step n={2}>登録したメールアドレスを入力</Step>
                  <Step n={3}>届いたメールのリンクをクリック</Step>
                  <Step n={4}>新しいパスワードを設定</Step>
                </ol>
                <Note>リセットリンクの有効期限は1時間です</Note>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ====== 3. 初期設定 ====== */}
        <section className="mb-10">
          <SectionHeading
            id="setup"
            number={3}
            title="初期設定（APIキー・2FA）"
            icon={Key}
          />
          <div className="space-y-6">
            <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#F1F5F9] text-base">
                  Anthropic APIキーの設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[#CBD5E1]">
                  レシートのAI読み取り機能を使うにはAPIキーが必要です。
                </p>
                <ol className="space-y-2">
                  <Step n={1}>
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D4AF37] hover:underline"
                    >
                      https://console.anthropic.com/settings/keys
                    </a>{" "}
                    にアクセス
                  </Step>
                  <Step n={2}>Anthropicアカウントを作成（無料）</Step>
                  <Step n={3}>「Create Key」でAPIキーを生成</Step>
                  <Step n={4}>
                    ZeiFlowの設定ページでキーを貼り付けて「保存」
                  </Step>
                </ol>

              </CardContent>
            </Card>

            <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#F1F5F9] text-base">
                  二要素認証（2FA）の設定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  <Step n={1}>設定ページ → セキュリティ → 「有効にする」</Step>
                  <Step n={2}>QRコードをGoogle Authenticatorでスキャン</Step>
                  <Step n={3}>表示された6桁のコードを入力して有効化</Step>
                </ol>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ====== 4. 顧客管理 ====== */}
        <section className="mb-10">
          <SectionHeading id="clients" number={4} title="顧客管理" icon={Users} />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                メニュー → 「顧客管理」で顧客の登録・編集・削除ができます。
              </p>

              <h3 className="text-[#F1F5F9] font-semibold mt-4 mb-2">登録項目</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(212,175,55,0.15)]">
                      <th className="text-left py-2 px-3 text-[#D4AF37] font-semibold">
                        項目
                      </th>
                      <th className="text-left py-2 px-3 text-[#D4AF37] font-semibold">
                        説明
                      </th>
                      <th className="text-center py-2 px-3 text-[#D4AF37] font-semibold">
                        必須
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[#CBD5E1]">
                    {[
                      ["顧客名", "会社名または個人名", true],
                      ["顧客コード", "管理用のユニークなコード", true],
                      ["フリガナ", "顧客名のカナ", false],
                      ["法人/個人", "法人または個人事業主", true],
                      ["決算月", "決算開始月（デフォルト4月）", true],
                      ["税区分", "課税/簡易課税/免税", true],
                      ["インボイス登録番号", "T+13桁（例：T1234567890123）", false],
                      ["備考", "メモ", false],
                    ].map(([item, desc, req]) => (
                      <tr
                        key={item as string}
                        className="border-b border-[rgba(255,255,255,0.04)]"
                      >
                        <td className="py-2 px-3 font-medium">{item as string}</td>
                        <td className="py-2 px-3">{desc as string}</td>
                        <td className="py-2 px-3 text-center">
                          {req ? (
                            <span className="text-[#D4AF37]">○</span>
                          ) : (
                            <span className="text-[#475569]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ====== 5. レシート撮影・読み取り ====== */}
        <section className="mb-10">
          <SectionHeading
            id="receipts"
            number={5}
            title="レシート撮影・読み取り"
            icon={Camera}
          />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                メニュー → 「レシート撮影」でレシートを読み取れます。
              </p>
              <h3 className="text-[#F1F5F9] font-semibold mb-2">手順</h3>
              <ol className="space-y-2">
                <Step n={1}>対象顧客を選択</Step>
                <Step n={2}>
                  「カメラで撮影」または「ファイル選択」でレシート画像を取得
                </Step>
                <Step n={3}>「AI読み取り開始」をクリック</Step>
                <Step n={4}>
                  AIが自動で以下を読み取ります：
                  <ul className="mt-2 ml-2 space-y-1">
                    <Bullet>店舗名、日付、合計金額、明細</Bullet>
                    <Bullet>インボイス登録番号（T+13桁）</Bullet>
                    <Bullet>勘定科目の自動分類</Bullet>
                  </ul>
                </Step>
                <Step n={5}>読み取り結果を確認し、必要に応じて編集</Step>
              </ol>
              <Note>最大20枚まで追加してから一括アップロードできます（＋ボタンで追加）。枚数が多いときは「高速」モードがおすすめです</Note>
              <Note>レシート履歴は顧客別・月別にフィルタリングできます</Note>
              <Note>
                画像は自動圧縮されるため、高解像度の撮影でも問題ありません
              </Note>
              <Note>
                レシート履歴でチェックボックスを使って複数選択 → 一括削除ができます
              </Note>
            </CardContent>
          </Card>
        </section>

        {/* ====== 6. 仕訳管理 ====== */}
        <section className="mb-10">
          <SectionHeading
            id="journals"
            number={6}
            title="仕訳管理"
            icon={ClipboardList}
          />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                メニュー → 「仕訳管理」で全ての仕訳を管理できます。
              </p>
              <h3 className="text-[#F1F5F9] font-semibold mb-2">機能一覧</h3>
              <ul className="space-y-2">
                <Bullet>月次/半期/年次で表示切替</Bullet>
                <Bullet>顧客フィルター、摘要・科目での検索</Bullet>
                <Bullet>
                  各仕訳のインライン編集（借方・貸方・金額・摘要・登録番号・メモ）
                </Bullet>
                <Bullet>確定/確定取消（チェックマーク）</Bullet>
                <Bullet>チェックボックスで選択 → 一括確定</Bullet>
                <Bullet>「新規仕訳」ボタンで手動仕訳追加</Bullet>
                <Bullet>「印刷」ボタンで仕訳帳を印刷/PDF出力</Bullet>
                <Bullet>ページネーション（50件/ページ）</Bullet>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* ====== 7. CSV出力・PDF帳票 ====== */}
        <section className="mb-10">
          <SectionHeading id="csv" number={7} title="CSV出力・PDF帳票" icon={FileDown} />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                メニュー → 「CSV出力」で会計ソフト用のCSVをダウンロードできます。
              </p>
              <h3 className="text-[#F1F5F9] font-semibold mb-2">対応形式</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(212,175,55,0.15)]">
                      <th className="text-left py-2 px-3 text-[#D4AF37] font-semibold">
                        形式
                      </th>
                      <th className="text-left py-2 px-3 text-[#D4AF37] font-semibold">
                        対応ソフト
                      </th>
                      <th className="text-left py-2 px-3 text-[#D4AF37] font-semibold">
                        特徴
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[#CBD5E1]">
                    {[
                      [
                        "弥生会計",
                        "弥生会計デスクトップ/オンライン",
                        "仕訳日記帳インポート形式",
                      ],
                      [
                        "マネーフォワード",
                        "マネーフォワードクラウド会計",
                        "仕訳帳CSVインポート形式",
                      ],
                      ["freee", "freee会計", "取引インポートCSV形式"],
                    ].map(([format, soft, feature]) => (
                      <tr
                        key={format}
                        className="border-b border-[rgba(255,255,255,0.04)]"
                      >
                        <td className="py-2 px-3 font-medium">{format}</td>
                        <td className="py-2 px-3">{soft}</td>
                        <td className="py-2 px-3">{feature}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Note>
                BOM付きUTF-8で出力されるため、Excelで直接開いても文字化けしません
              </Note>
              <Note>
                インボイス登録番号は仕訳メモ/備考欄に自動記載されます
              </Note>

              <h3 className="text-[#F1F5F9] font-semibold mt-6 mb-2">PDF帳票出力</h3>
              <p className="text-[#CBD5E1]">
                CSV出力ページの「PDF」ボタンをクリックすると、仕訳帳をPDF形式で出力できます。
                ブラウザの印刷機能を使って保存します。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* ====== 8. CSVインポート ====== */}
        <section className="mb-10">
          <SectionHeading id="import" number={8} title="CSVインポート" icon={FileDown} />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                メニュー →「CSVインポート」で過去の仕訳データを一括登録できます。
              </p>
              <h3 className="text-[#F1F5F9] font-semibold mb-2">手順</h3>
              <ol className="space-y-2">
                <Step n={1}>顧客を選択</Step>
                <Step n={2}>CSVファイルを選択してアップロード</Step>
                <Step n={3}>自動でヘッダーを認識し、仕訳を一括登録</Step>
              </ol>
              <h3 className="text-[#F1F5F9] font-semibold mt-4 mb-2">必須カラム</h3>
              <ul className="space-y-2">
                <Bullet>日付（YYYY-MM-DD形式）</Bullet>
                <Bullet>借方科目</Bullet>
                <Bullet>貸方科目</Bullet>
                <Bullet>金額</Bullet>
              </ul>
              <Note>摘要・税額・登録番号・メモは任意カラムです</Note>
              <Note>エラー行があってもスキップして正常行だけインポートします</Note>
            </CardContent>
          </Card>
        </section>

        {/* ====== 9. 顧客別分析 ====== */}
        <section className="mb-10">
          <SectionHeading id="analytics" number={9} title="顧客別分析" icon={ClipboardList} />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                顧客管理ページの各顧客カードにある「分析」ボタンから、顧客ごとの専用分析ページを開けます。
              </p>
              <h3 className="text-[#F1F5F9] font-semibold mb-2">表示内容</h3>
              <ul className="space-y-2">
                <Bullet>累計仕訳数・合計金額</Bullet>
                <Bullet>確定率・未確定仕訳数</Bullet>
                <Bullet>レシート処理状況（エラー件数含む）</Bullet>
                <Bullet>インボイス登録率</Bullet>
                <Bullet>月別仕訳推移グラフ（過去12ヶ月）</Bullet>
                <Bullet>科目別支出ランキング</Bullet>
                <Bullet>最近の仕訳一覧（直近10件）</Bullet>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* ====== 10. クライアントポータル ====== */}
        <section className="mb-10">
          <SectionHeading id="portal" number={10} title="クライアントポータル" icon={ExternalLink} />
          <div className="space-y-6">
            <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#F1F5F9] text-base">概要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[#CBD5E1]">
                  顧問先に専用リンクを発行し、ログイン不要でレシートを送信してもらえる機能です。
                </p>
                <ul className="space-y-2">
                  <Bullet>顧問先はリンクを開くだけ（アカウント不要）</Bullet>
                  <Bullet>スマートフォンから複数レシートを一括送信</Bullet>
                  <Bullet>送信されたレシートは自動でAI仕訳</Bullet>
                  <Bullet>顧問先は自分の仕訳一覧も確認・確定できる</Bullet>
                  <Bullet>他の顧問先のデータは一切見えない（完全分離）</Bullet>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#F1F5F9] text-base">リンクの発行方法</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  <Step n={1}>顧客管理ページを開く</Step>
                  <Step n={2}>対象顧客のカードで「ポータル」をクリック</Step>
                  <Step n={3}>「リンクを作成」をクリック</Step>
                  <Step n={4}>「URLをコピー」でリンクをコピー</Step>
                  <Step n={5}>LINE・メール等で顧問先に共有</Step>
                </ol>
                <Note>リンクは1顧客につき1つ。期限なしで何人でもアクセス可能です</Note>
                <Note>不要になったら「無効化」で即座にアクセスを遮断できます</Note>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ====== 9. 仕訳ナレッジ ====== */}
        <section className="mb-10">
          <SectionHeading id="knowledge" number={11} title="仕訳ナレッジ・AI学習" icon={BookOpen} />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                仕訳帳や経理ルールのPDF・CSVをアップロードすると、AIがそのルールに従って仕訳します。
              </p>
              <h3 className="text-[#F1F5F9] font-semibold mb-2">使い方</h3>
              <ol className="space-y-2">
                <Step n={1}>メニュー →「仕訳ナレッジ」を開く</Step>
                <Step n={2}>適用範囲を選択（事務所全体 or 特定の顧問先）</Step>
                <Step n={3}>PDF・CSV・テキストファイルをアップロード</Step>
              </ol>
              <h3 className="text-[#F1F5F9] font-semibold mt-4 mb-2">AIの仕訳優先順位</h3>
              <ul className="space-y-2">
                <Bullet>基本ルール（2026年税法準拠のデフォルト仕訳ルール）</Bullet>
                <Bullet>ナレッジ（アップロードした仕訳帳・ルール）→ 基本より優先</Bullet>
                <Bullet>学習データ（過去の確定済み仕訳パターン）→ 最優先</Bullet>
              </ul>
              <Note>仕訳を確定するたびにAIが自動で学習し、次回から同じパターンで仕訳します</Note>
              <Note>対応ファイル：PDF、CSV、テキスト</Note>

              <h3 className="text-[#F1F5F9] font-semibold mt-6 mb-2">AI自動学習について</h3>
              <p className="text-[#CBD5E1]">
                仕訳を確定すると、AIが「この店舗名ならこの科目」というパターンを自動で記憶します。
                ナレッジのアップロードは不要で、使えば使うほど事務所独自のルールに最適化されます。
              </p>
              <ul className="space-y-2 mt-2">
                <Bullet>顧問先ごとに直近50件の確定仕訳を参照</Bullet>
                <Bullet>同じパターンが多いほど優先度が上がる</Bullet>
                <Bullet>AIが科目を間違えても、修正して確定すれば次回から正しく仕訳</Bullet>
              </ul>

              <h3 className="text-[#F1F5F9] font-semibold mt-6 mb-2">レシートの再試行</h3>
              <p className="text-[#CBD5E1]">
                レシート撮影ページで「エラー」または「処理中」のまま止まったレシートに「再試行」ボタンが表示されます。
                クリックするとAIが再度読み取りを行います。処理に失敗した場合、レシートは自動的に「エラー」状態に変更されます。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* ====== 10. チーム管理 ====== */}
        <section className="mb-10">
          <SectionHeading
            id="team"
            number={12}
            title="チーム管理"
            icon={UsersRound}
          />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-4">
              <p className="text-[#CBD5E1]">
                メニュー → 「チーム管理」で事務所のメンバーを管理できます。新規登録時に事務所は自動で作成されます。
              </p>
              <h3 className="text-[#F1F5F9] font-semibold mb-2">主な機能</h3>
              <ul className="space-y-2">
                <Bullet>チーム情報の確認（チーム名・コード）・チーム名変更</Bullet>
                <Bullet>メンバー招待：メールアドレスでスタッフを招待</Bullet>
                <Bullet>ロール管理：管理者（ADMIN）とスタッフ（STAFF）の権限切り替え</Bullet>
                <Bullet>メンバー削除：管理者が強制退会させることが可能</Bullet>
                <Bullet>
                  事務所内でデータ（顧客・仕訳）を共有
                </Bullet>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* ====== 9. セキュリティ・バックアップ ====== */}
        <section className="mb-10">
          <SectionHeading
            id="security"
            number={13}
            title="セキュリティ・バックアップ"
            icon={ShieldCheck}
          />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6">
              <ul className="space-y-2">
                <Bullet>
                  <span className="font-semibold text-[#F1F5F9]">二要素認証（TOTP）：</span>
                  Google Authenticator対応
                </Bullet>
                <Bullet>
                  <span className="font-semibold text-[#F1F5F9]">パスワード変更：</span>
                  設定ページから随時変更可能
                </Bullet>
                <Bullet>
                  <span className="font-semibold text-[#F1F5F9]">監査ログ：</span>
                  メニュー → 「監査ログ」で全操作履歴を確認
                </Bullet>
                <Bullet>
                  <span className="font-semibold text-[#F1F5F9]">データバックアップ：</span>
                  設定ページ → 「データバックアップ」でJSON形式ダウンロード
                </Bullet>
                <Bullet>
                  <span className="font-semibold text-[#F1F5F9]">セッション管理：</span>
                  8時間で自動ログアウト、5分毎に認証チェック
                </Bullet>
                <Bullet>
                  <span className="font-semibold text-[#F1F5F9]">HTTPS：</span>
                  全通信が暗号化されています
                </Bullet>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* ====== 10. お問い合わせ ====== */}
        <section className="mb-10">
          <SectionHeading id="contact" number={14} title="お問い合わせ" icon={Mail} />
          <Card className="border-[rgba(212,175,55,0.15)] bg-[#1E293B]">
            <CardContent className="pt-6 space-y-3">
              <p className="text-[#CBD5E1]">
                ご不明な点やご要望がございましたら、下記までお問い合わせください。
              </p>
              <div className="rounded-lg bg-[rgba(212,175,55,0.06)] p-4">
                <p className="text-sm text-[#94A3B8]">
                  <span className="font-semibold text-[#D4AF37]">メール：</span>
                  <a
                    href="mailto:keita.030312@gmail.com"
                    className="text-[#D4AF37] hover:underline"
                  >
                    keita.030312@gmail.com
                  </a>
                </p>
              </div>
              <p className="text-xs text-[#475569] text-center mt-6">
                ZeiFlow v1.0 | 2026年4月
              </p>
            </CardContent>
          </Card>
        </section>
      </div>

      <BackToTop />
    </div>
  );
}
