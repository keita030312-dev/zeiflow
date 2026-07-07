import { sign } from "jsonwebtoken";
import { cookies } from "next/headers";

const SESSION_HOURS = 8; // JWT有効期限とcookie maxAgeを常に一致させる

/** ログイン成功時のJWT発行 + セッションcookie設定（login / login-form 共通） */
export async function issueSessionCookie(user: {
  id: string; email: string; role: string; organizationId: string | null;
}): Promise<void> {
  const payload: Record<string, unknown> = { id: user.id, email: user.email, role: user.role };
  if (user.organizationId) payload.orgId = user.organizationId;
  const token = sign(payload, process.env.NEXTAUTH_SECRET!, { expiresIn: `${SESSION_HOURS}h` });
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
    sameSite: "lax",
    maxAge: SESSION_HOURS * 60 * 60,
    path: "/",
  });
}
