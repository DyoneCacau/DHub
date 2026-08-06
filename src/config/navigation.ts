import {
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Store,
  Users,
} from "lucide-react";

import type { DemoOperator, NavigationItem, PageMeta } from "@/types";

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "consultants",
    label: "Consultores",
    path: "/consultores",
    icon: Users,
  },
  {
    id: "merchants",
    label: "Lojistas",
    path: "/lojistas",
    icon: Store,
    matchPrefix: "/lojistas",
  },
  {
    id: "contracts",
    label: "Contratos",
    path: "/contratos",
    icon: FileText,
    matchPrefix: "/contratos",
  },
  {
    id: "recharges",
    label: "Recargas",
    path: "/recargas",
    icon: RefreshCw,
  },
  {
    id: "operators",
    label: "Operadoras",
    path: "/operadoras",
    icon: Building2,
  },
  {
    id: "reports",
    label: "Relatórios",
    path: "/relatorios",
    icon: ClipboardList,
  },
  {
    id: "settings",
    label: "Configurações",
    path: "/configuracoes",
    icon: Settings,
  },
];

export const pageMetaByPath: Record<string, PageMeta> = {
  "/login": {
    title: "Entrar",
    description: "Acesso à plataforma operacional DHub",
  },
  "/dashboard": {
    title: "Dashboard",
    description: "Visão geral da operação",
  },
  "/consultores": {
    title: "Consultores",
    description: "Cadastro e acompanhamento de consultores",
  },
  "/lojistas": {
    title: "Lojistas",
    description: "Clientes finais vinculados aos consultores",
  },
  "/contratos": {
    title: "Contratos",
    description: "Vínculos entre lojistas e operadoras",
  },
  "/recargas": {
    title: "Recargas",
    description: "Movimentações vinculadas a contratos",
  },
  "/operadoras": {
    title: "Operadoras",
    description: "Configuração local demonstrativa",
  },
  "/relatorios": {
    title: "Relatórios",
    description: "Estrutura preparada para indicadores",
  },
  "/configuracoes": {
    title: "Configurações",
    description: "Organização, usuários e integrações futuras",
  },
  "/acesso-negado": {
    title: "Acesso negado",
    description: "Você não tem permissão para esta área",
  },
};

export function resolvePageMeta(pathname: string): PageMeta {
  const exact = pageMetaByPath[pathname];
  if (exact) {
    return exact;
  }

  if (pathname.startsWith("/lojistas/")) {
    return {
      title: "Detalhe do lojista",
      description: "Visão estrutural do cadastro",
    };
  }

  if (pathname.startsWith("/contratos/")) {
    return {
      title: "Detalhe do contrato",
      description: "Resumo estrutural do vínculo operacional",
    };
  }

  return {
    title: "Página não encontrada",
    description: "A rota solicitada não existe",
  };
}

export function isNavigationItemActive(pathname: string, item: NavigationItem): boolean {
  if (item.matchPrefix) {
    return pathname === item.path || pathname.startsWith(`${item.matchPrefix}/`);
  }
  return pathname === item.path;
}

/** Dados apenas demonstrativos — sem persistência. */
export const demoOperators: DemoOperator[] = [
  { id: "lecard", name: "LeCard", status: "not_configured" },
  { id: "pluxee", name: "Pluxee", status: "not_configured" },
  { id: "ticket", name: "Ticket", status: "not_configured" },
  { id: "vr", name: "VR", status: "not_configured" },
  { id: "valecard", name: "ValeCard", status: "not_configured" },
];

export const provisionalUser = {
  name: "Administrador",
  initials: "AD",
  roleLabel: "Administrador",
  visualRole: "admin" as const,
};
