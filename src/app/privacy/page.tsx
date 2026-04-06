import Link from "next/link";

export default function PrivacyPage() {
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
          プライバシーポリシー
        </h1>
        <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 48 }}>
          最終更新日：2025年1月1日
        </p>

        <Section title="1. 個人情報の定義">
          <p>
            本プライバシーポリシーにおいて「個人情報」とは、個人情報保護法に定める個人情報を指し、生存する個人に関する情報であって、氏名、メールアドレス、その他の記述等により特定の個人を識別できるものをいいます。
          </p>
        </Section>

        <Section title="2. 収集する情報">
          <p>当社は、本サービスの提供にあたり、以下の情報を収集します。</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            <li>
              <strong style={{ color: "#F1F5F9" }}>アカウント情報：</strong>
              氏名、メールアドレス、事務所名、電話番号
            </li>
            <li style={{ marginTop: 8 }}>
              <strong style={{ color: "#F1F5F9" }}>利用データ：</strong>
              アップロードされたレシート・領収書の画像、仕訳データ、顧客情報
            </li>
            <li style={{ marginTop: 8 }}>
              <strong style={{ color: "#F1F5F9" }}>技術情報：</strong>
              IPアドレス、ブラウザ情報、アクセスログ、利用日時
            </li>
            <li style={{ marginTop: 8 }}>
              <strong style={{ color: "#F1F5F9" }}>決済情報：</strong>
              支払いに必要な情報（決済代行サービスを通じて処理されます）
            </li>
          </ul>
        </Section>

        <Section title="3. 利用目的">
          <p>収集した情報は、以下の目的で利用します。</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            <li>本サービスの提供・運営・改善</li>
            <li>レシート・領収書画像のAI解析および仕訳データの生成</li>
            <li>利用者のアカウント管理・認証</li>
            <li>利用料金の請求・決済処理</li>
            <li>カスタマーサポートの提供</li>
            <li>サービスに関するお知らせ・重要通知の送信</li>
            <li>利用規約違反への対応</li>
            <li>統計データの作成（個人を特定できない形式に加工したもの）</li>
          </ul>
        </Section>

        <Section title="4. 第三者提供">
          <p>
            当社は、以下の場合を除き、利用者の個人情報を第三者に提供しません。
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            <li>利用者本人の同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>
              人の生命・身体・財産の保護のために必要であり、本人の同意を得ることが困難な場合
            </li>
            <li>
              業務委託先（サーバー運営、決済代行等）に対し、必要な範囲で提供する場合（委託先には適切な管理を義務付けます）
            </li>
          </ul>
        </Section>

        <Section title="5. データ保管・セキュリティ">
          <p>
            当社は、収集した個人情報の漏洩、滅失、毀損を防止するため、以下のセキュリティ対策を講じます。
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            <li>データの暗号化（通信時および保管時）</li>
            <li>アクセス制御および認証管理</li>
            <li>定期的なセキュリティ監査</li>
            <li>従業員への情報セキュリティ教育</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            データは日本国内またはセキュリティ基準を満たすクラウドサービス上に保管されます。
          </p>
        </Section>

        <Section title="6. Cookieの使用">
          <p>
            本サービスでは、利用者の認証状態の維持およびサービスの利便性向上のためにCookieを使用します。
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            <li>
              <strong style={{ color: "#F1F5F9" }}>必須Cookie：</strong>
              ログイン状態の維持、セッション管理に使用します
            </li>
            <li style={{ marginTop: 8 }}>
              <strong style={{ color: "#F1F5F9" }}>分析Cookie：</strong>
              サービスの利用状況を分析し、改善に役立てるために使用する場合があります
            </li>
          </ul>
          <p style={{ marginTop: 12 }}>
            利用者はブラウザの設定によりCookieを無効にすることができますが、その場合、本サービスの一部機能が利用できなくなる場合があります。
          </p>
        </Section>

        <Section title="7. ユーザーの権利">
          <p>
            利用者は、個人情報保護法に基づき、以下の権利を有します。
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            <li>個人情報の開示請求</li>
            <li>個人情報の訂正・追加・削除の請求</li>
            <li>個人情報の利用停止・消去の請求</li>
            <li>個人情報の第三者提供の停止請求</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            上記の請求を行う場合は、下記のお問い合わせ先までご連絡ください。本人確認の上、合理的な期間内に対応いたします。
          </p>
        </Section>

        <Section title="8. AI処理について">
          <p>
            本サービスでは、レシート・領収書画像の読み取りおよび仕訳データの生成にAI技術を使用しています。具体的には、Anthropic社が提供するClaude
            Vision
            APIを利用し、アップロードされた画像データを処理します。
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            <li>
              画像データはAI解析のためにAnthopic社のAPIに送信されます
            </li>
            <li style={{ marginTop: 8 }}>
              Anthropic社のAPIに送信されたデータは、Anthropic社のプライバシーポリシーに従って取り扱われます
            </li>
            <li style={{ marginTop: 8 }}>
              AI処理の結果（読み取りデータ、仕訳分類）は参考情報であり、最終的な確認・判断は利用者の責任で行ってください
            </li>
            <li style={{ marginTop: 8 }}>
              当社はAI処理の精度向上のため、匿名化・統計化されたデータを利用する場合があります
            </li>
          </ul>
        </Section>

        <Section title="9. お問い合わせ先">
          <p>
            個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
          </p>
          <div
            style={{
              marginTop: 16,
              padding: 20,
              backgroundColor: "rgba(30,41,59,0.6)",
              borderRadius: 8,
              border: "1px solid rgba(212,175,55,0.1)",
            }}
          >
            <p>
              <strong style={{ color: "#F1F5F9" }}>ZeiFlow</strong>
            </p>
            <p style={{ marginTop: 8 }}>
              メール：keita.030312@gmail.com
            </p>
            <p style={{ marginTop: 4 }}>
              ※所在地は準備中です。お問い合わせはメールにてお願いいたします。
            </p>
          </div>
        </Section>

        <Section title="10. ポリシーの変更">
          <p>
            当社は、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更を行う場合は、本サービス上での通知またはメールにてお知らせします。変更後のプライバシーポリシーは、本ページに掲載した時点から効力を生じるものとします。
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
            ZeiFlow - ZeiFlow プライバシーポリシー
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
