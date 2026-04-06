import Link from "next/link";

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F172A",
        color: "#F1F5F9",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              color: "#D4AF37",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            &larr; トップページへ戻る
          </Link>
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#D4AF37",
            marginBottom: 8,
          }}
        >
          利用規約
        </h1>
        <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 48 }}>
          最終更新日：2025年1月1日
        </p>

        <Section title="第1条（サービス概要）">
          <p>
            本規約は、[運営者名]（以下「当社」）が提供する税務会計支援SaaSサービス「ZeiFlow」（以下「本サービス」）の利用条件を定めるものです。本サービスは、税理士事務所および会計事務所向けに、レシート・領収書のAI読み取り、仕訳データの管理、および会計ソフト連携CSV出力機能を提供します。
          </p>
        </Section>

        <Section title="第2条（利用登録）">
          <p>
            1.
            本サービスの利用を希望する者は、当社が定める方法により利用登録を申請し、当社が承認することにより利用登録が完了するものとします。
          </p>
          <p style={{ marginTop: 12 }}>
            2.
            当社は、以下の場合に利用登録を拒否することがあり、その理由を開示する義務を負いません。
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>登録内容に虚偽があった場合</li>
            <li>過去に規約違反等により利用を停止された者である場合</li>
            <li>その他当社が不適当と判断した場合</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            3.
            利用者は、登録情報に変更が生じた場合、速やかに当社に届け出るものとします。
          </p>
        </Section>

        <Section title="第3条（利用料金）">
          <p>
            1.
            本サービスの利用料金は、当社が別途定める料金表に基づくものとします。
          </p>
          <p style={{ marginTop: 12 }}>
            2.
            利用者は、当社が定める支払方法により、所定の期日までに利用料金を支払うものとします。
          </p>
          <p style={{ marginTop: 12 }}>
            3.
            支払期日を過ぎた場合、年14.6%の遅延損害金が発生するものとします。
          </p>
          <p style={{ marginTop: 12 }}>
            4.
            当社は、利用料金を変更する場合、30日前までに利用者に通知するものとします。
          </p>
        </Section>

        <Section title="第4条（禁止事項）">
          <p>利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>法令または公序良俗に違反する行為</li>
            <li>当社または第三者の知的財産権、プライバシー権その他の権利を侵害する行為</li>
            <li>本サービスのサーバーやネットワークに過度な負荷をかける行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>不正アクセスまたはこれを試みる行為</li>
            <li>他の利用者のアカウントを使用する行為</li>
            <li>本サービスを通じて取得した情報を不正に利用する行為</li>
            <li>反社会的勢力への利益供与その他の関与</li>
            <li>その他当社が不適切と判断する行為</li>
          </ul>
        </Section>

        <Section title="第5条（免責事項）">
          <p>
            1.
            当社は、本サービスが提供するAIによる読み取り結果および仕訳分類の正確性について、いかなる保証も行いません。利用者は、出力結果を自己の責任において確認・修正するものとします。
          </p>
          <p style={{ marginTop: 12 }}>
            2.
            当社は、本サービスの利用により生じた損害について、当社に故意または重大な過失がある場合を除き、一切の責任を負いません。
          </p>
          <p style={{ marginTop: 12 }}>
            3.
            当社の損害賠償責任は、当該損害が発生した月の利用料金の額を上限とします。
          </p>
          <p style={{ marginTop: 12 }}>
            4.
            天災地変、通信障害その他の不可抗力により生じた損害について、当社は一切の責任を負いません。
          </p>
        </Section>

        <Section title="第6条（データの取り扱い）">
          <p>
            1.
            利用者が本サービスにアップロードしたデータ（レシート画像、仕訳データ等）の所有権は利用者に帰属します。
          </p>
          <p style={{ marginTop: 12 }}>
            2.
            当社は、本サービスの提供および改善の目的に限り、利用者のデータを処理します。
          </p>
          <p style={{ marginTop: 12 }}>
            3.
            利用者がアカウントを削除した場合、当社は合理的な期間内に利用者のデータを削除します。ただし、法令により保存が義務付けられているデータを除きます。
          </p>
          <p style={{ marginTop: 12 }}>
            4. データの取り扱いの詳細については、
            <Link
              href="/privacy"
              style={{ color: "#D4AF37", textDecoration: "none" }}
            >
              プライバシーポリシー
            </Link>
            をご参照ください。
          </p>
        </Section>

        <Section title="第7条（知的財産権）">
          <p>
            1.
            本サービスに関する知的財産権（ソフトウェア、UI、アルゴリズム等）は、すべて当社に帰属します。
          </p>
          <p style={{ marginTop: 12 }}>
            2.
            利用者は、本サービスのリバースエンジニアリング、逆コンパイル、逆アセンブル等を行ってはなりません。
          </p>
          <p style={{ marginTop: 12 }}>
            3.
            利用者が本サービスに入力したデータおよびその出力結果に関する権利は、利用者に帰属します。
          </p>
        </Section>

        <Section title="第8条（サービスの変更・中断）">
          <p>
            1.
            当社は、利用者に事前に通知することなく、本サービスの内容を変更し、または提供を中断することができるものとします。
          </p>
          <p style={{ marginTop: 12 }}>
            2. 当社は、以下の場合にサービスを一時的に中断できるものとします。
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>システムの保守・更新を行う場合</li>
            <li>天災地変、停電その他の不可抗力により提供が困難な場合</li>
            <li>その他当社がやむを得ないと判断した場合</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            3.
            サービスの重大な変更または終了を行う場合、当社は60日前までに利用者に通知するものとします。
          </p>
        </Section>

        <Section title="第9条（契約解除）">
          <p>
            1.
            利用者は、当社が定める方法により、いつでも本サービスの利用を終了できるものとします。
          </p>
          <p style={{ marginTop: 12 }}>
            2.
            当社は、利用者が以下に該当する場合、事前の通知なく利用を停止または契約を解除できるものとします。
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>本規約に違反した場合</li>
            <li>利用料金の支払を怠った場合</li>
            <li>その他当社が利用の継続を不適当と判断した場合</li>
          </ul>
        </Section>

        <Section title="第10条（準拠法・管轄裁判所）">
          <p>
            1. 本規約の解釈は、日本法を準拠法とします。
          </p>
          <p style={{ marginTop: 12 }}>
            2.
            本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </Section>

        <div
          style={{
            borderTop: "1px solid rgba(212,175,55,0.1)",
            marginTop: 48,
            paddingTop: 24,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#475569", fontSize: 13 }}>
            [運営者名] - ZeiFlow 利用規約
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#D4AF37",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid rgba(212,175,55,0.15)",
        }}
      >
        {title}
      </h2>
      <div style={{ lineHeight: 1.8, fontSize: 15, color: "#CBD5E1" }}>
        {children}
      </div>
    </section>
  );
}
