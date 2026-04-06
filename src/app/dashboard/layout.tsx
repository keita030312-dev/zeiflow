import { Sidebar, MobileHeader } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        {/* Mobile top header */}
        <MobileHeader />

        <div className="flex flex-1">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Main content — offset by sidebar on desktop, full-width on mobile */}
          <main className="flex-1 md:ml-64">
            <div className="p-4 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
