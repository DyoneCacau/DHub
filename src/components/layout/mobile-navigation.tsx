import { NavLink } from "react-router-dom";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getNavigationForRole,
  isNavigationItemActive,
} from "@/config/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/utils";

interface MobileNavigationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}

export function MobileNavigation({
  open,
  onOpenChange,
  pathname,
}: MobileNavigationProps) {
  const { role } = useAuth();
  const items = getNavigationForRole(role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>DHub</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Menu mobile">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isNavigationItemActive(pathname, item);
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
