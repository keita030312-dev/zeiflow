import { prisma } from "@/lib/db";

// 承認制を導入した日。これより前に作成された組織は承認待ちでもロックアウトしない。
const APPROVAL_REQUIRED_FROM = new Date("2026-05-14T00:00:00Z");

export type OrgGateResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/**
 * 事務所(Organization)の有効性・承認状態のゲート。
 * login と login-form の両方から呼ぶことで、片方だけ通る bypass を防ぐ。
 *
 * - isActive=false → 停止中エラー
 * - isApproved=false かつ created_at >= APPROVAL_REQUIRED_FROM → 承認待ちエラー
 * - 個人事業主(organizationId=null) → 通す
 * - 組織不明 / DB確認失敗 → 拒否（認可判定は fail closed）
 */
export async function checkOrgGate(
  organizationId: string | null | undefined,
): Promise<OrgGateResult> {
  if (!organizationId) return { ok: true };

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      return {
        ok: false,
        error: "所属する事務所が見つかりません。再ログインしてください。",
        status: 403,
      };
    }
    if (org.isActive === false) {
      return {
        ok: false,
        error:
          "この事務所のアカウントは現在停止されています。管理者にお問い合わせください。",
        status: 403,
      };
    }
    if (
      org.isApproved === false &&
      org.createdAt >= APPROVAL_REQUIRED_FROM
    ) {
      return {
        ok: false,
        error: "アカウントは現在承認待ちです。承認されるまでお待ちください。",
        status: 403,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "事務所の状態を確認できません。時間をおいて再度お試しください。",
      status: 503,
    };
  }
}
