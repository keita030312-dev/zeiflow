"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace(
            "/login?error=セッションが期限切れです。再度ログインしてください"
          );
          return;
        }
        if (mounted) {
          setChecked(true);
        }
      } catch {
        router.replace(
          "/login?error=セッションが期限切れです。再度ログインしてください"
        );
      }
    }

    checkAuth();

    const interval = setInterval(checkAuth, CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [router]);

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
