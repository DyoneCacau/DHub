import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { resolvePageMeta } from "@/config/navigation";

export function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageMeta = resolvePageMeta(location.pathname);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 hidden h-screen shrink-0 md:block">
        <AppSidebar pathname={location.pathname} />
      </div>

      <MobileNavigation
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        pathname={location.pathname}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={pageMeta.title}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
