"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Camera,
  BookOpen,
  FileDown,
  Settings,
  LogOut,
  Shield,
  Menu,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "顧客管理", icon: Users },
  { href: "/dashboard/receipts", label: "レシート撮影", icon: Camera },
  { href: "/dashboard/journals", label: "仕訳管理", icon: BookOpen },
  { href: "/dashboard/export", label: "CSV出力", icon: FileDown },
  { href: "/dashboard/audit", label: "監査ログ", icon: ClipboardList },
  { href: "/dashboard/settings", label: "設定", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all relative",
                isActive
                  ? "text-[#D4AF37] bg-[rgba(212,175,55,0.08)]"
                  : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.03)]"
              )}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[#D4AF37]"
                />
              )}
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

function LogoBlock() {
  return (
    <div className="flex items-center gap-3 px-6 py-6 border-b border-[rgba(212,175,55,0.1)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8962E]">
        <Shield className="h-5 w-5 text-[#0F172A]" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-gold-gradient">ZeiFlow</h1>
        <p className="text-[10px] text-[#94A3B8] tracking-wider">
          TAX MANAGEMENT
        </p>
      </div>
    </div>
  );
}

function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <div className="px-3 py-4 border-t border-[rgba(212,175,55,0.1)]">
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#94A3B8] hover:text-red-400 transition-colors w-full"
      >
        <LogOut className="h-4 w-4" />
        <span>ログアウト</span>
      </button>
    </div>
  );
}

// Desktop sidebar — hidden on mobile
export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[rgba(212,175,55,0.1)] bg-[#0B1120] flex-col hidden md:flex">
      <LogoBlock />
      <NavLinks />
      <LogoutButton />
    </aside>
  );
}

// Mobile top header with hamburger
export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-[rgba(212,175,55,0.1)] bg-[#0B1120]">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8962E]">
          <Shield className="h-4 w-4 text-[#0F172A]" />
        </div>
        <span className="text-base font-bold text-gold-gradient">ZeiFlow</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-64 p-0 bg-[#0B1120] border-r border-[rgba(212,175,55,0.1)] flex flex-col"
        >
          <LogoBlock />
          <NavLinks onNavigate={() => setOpen(false)} />
          <LogoutButton />
        </SheetContent>
      </Sheet>
    </header>
  );
}
