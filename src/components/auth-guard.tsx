"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        // メンテナンスチェック
        const mRes = await fetch("/api/maintenance");
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData.maintenance) {
            if (mounted) setMaintenance(true);
            return;
          }
          if (mounted) setMaintenance(false);
        }

        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        if (mounted) {
          setChecked(true);
        }
      } catch {
        router.replace("/login");
      }
    }

    checkAuth();

    const interval = setInterval(checkAuth, CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [router]);

  if (maintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="text-center max-w-md px-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] mb-6">
            <Shield className="h-8 w-8 text-[#0F172A]" />
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] mb-3">メンテナンス中</h1>
          <p className="text-[#94A3B8] leading-relaxed">
            現在システムのメンテナンスを行っています。<br />
            しばらくお待ちください。
          </p>
          <p className="text-xs text-[#475569] mt-6">ZeiFlow</p>
        </div>
      </div>
    );
  }

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
