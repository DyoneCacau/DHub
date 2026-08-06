import { Menu, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatRole } from "@/features/auth/types/auth";

interface AppHeaderProps {
  title: string;
  onOpenMobileNav: () => void;
}

function initialsFromName(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AppHeader({ title, onOpenMobileNav }: AppHeaderProps) {
  const navigate = useNavigate();
  const { profile, organization, role, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  const displayName = profile?.full_name?.trim() || profile?.email || "Usuário";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Abrir menu de navegação"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold md:text-xl">{title}</p>
      </div>

      <div className="relative hidden max-w-xs flex-1 lg:block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Busca (em breve)"
          className="pl-9"
          disabled
          aria-label="Busca futura"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="gap-2 px-2"
            aria-label="Menu do usuário"
          >
            <Avatar>
              <AvatarFallback>
                {initialsFromName(profile?.full_name, profile?.email)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left text-sm sm:block">
              <span className="block font-medium">{displayName}</span>
              <span className="block text-xs text-muted-foreground">
                {formatRole(role)}
                {organization ? ` · ${organization.name}` : ""}
              </span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="space-y-1">
              <p>{displayName}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {formatRole(role)}
              </p>
              {organization ? (
                <p className="text-xs font-normal text-muted-foreground">
                  {organization.name}
                </p>
              ) : null}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/conta">Minha conta</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={loggingOut}
            onSelect={(event) => {
              event.preventDefault();
              void handleLogout();
            }}
          >
            {loggingOut ? "Saindo…" : "Sair"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
