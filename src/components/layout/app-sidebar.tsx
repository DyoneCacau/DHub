import { NavLink } from "react-router-dom";

import { Separator } from "@/components/ui/separator";
import {
  getNavigationForRole,
  isNavigationItemActive,
} from "@/config/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  pathname: string;
  className?: string;
}

export function AppSidebar({ pathname, className }: AppSidebarProps) {
  const { role } = useAuth();
  const items = getNavigationForRole(role);

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
      aria-label="Navegação principal"
    >
      <div className="px-5 py-6">
        <p className="text-xl font-semibold tracking-tight">DHub</p>
        <p className="mt-1 text-xs text-muted-foreground">Operação Prime Service</p>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-3" aria-label="Menu lateral">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(pathname, item);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-muted-foreground">Acesso por membership ativa</p>
        <p className="text-xs text-muted-foreground">Autorização reforçada por RLS</p>
      </div>
    </aside>
  );
}
