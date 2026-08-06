import { Menu, Search } from "lucide-react";

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
import { provisionalUser } from "@/config/navigation";

interface AppHeaderProps {
  title: string;
  onOpenMobileNav: () => void;
}

export function AppHeader({ title, onOpenMobileNav }: AppHeaderProps) {
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
              <AvatarFallback>{provisionalUser.initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-left text-sm sm:block">
              <span className="block font-medium">{provisionalUser.name}</span>
              <span className="block text-xs text-muted-foreground">
                {provisionalUser.roleLabel}
              </span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Perfil provisório</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Conta (Sprint 2)</DropdownMenuItem>
          <DropdownMenuItem disabled>Sair (Sprint 2)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
