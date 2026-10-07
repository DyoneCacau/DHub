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
import type { AppRole } from "@/types/database";

const ALL_ROLES: AppRole[] = ["admin", "operator", "consultant"];
const OFFICE_ROLES: AppRole[] = ["admin", "operator"];

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    id: "consultants",
    label: "Consultores",
    path: "/consultores",
    icon: Users,
    matchPrefix: "/consultores",
    roles: OFFICE_ROLES,
  },
  {
    id: "merchants",
    label: "Lojistas",
    path: "/lojistas",
    icon: Store,
    matchPrefix: "/lojistas",
    roles: ALL_ROLES,
  },
  {
    id: "contracts",
    label: "Contratos",
    path: "/contratos",
    icon: FileText,
    matchPrefix: "/contratos",
    roles: ALL_ROLES,
  },
  {
    id: "recharges",
    label: "Recargas",
    path: "/recargas",
    icon: RefreshCw,
    roles: ALL_ROLES,
  },
  {
    id: "operators",
    label: "Operadoras",
    path: "/operadoras",
    icon: Building2,
    roles: ["admin"],
  },
  {
    id: "reports",
    label: "Relatórios",
    path: "/relatorios",
    icon: ClipboardList,
    roles: OFFICE_ROLES,
  },
  {
    id: "settings",
    label: "Configurações",
    path: "/configuracoes",
    icon: Settings,
    matchPrefix: "/configuracoes",
    roles: ["admin"],
  },
];

export function getNavigationForRole(role: AppRole | null): NavigationItem[] {
  if (!role) {
    return [];
  }
  return navigationItems.filter((item) => item.roles.includes(role));
}

export const pageMetaByPath: Record<string, PageMeta> = {
  "/login": {
    title: "Entrar",
    description: "Acesso à plataforma operacional DHub",
  },
  "/esqueci-senha": {
    title: "Recuperar senha",
    description: "Solicitação de redefinição",
  },
  "/redefinir-senha": {
    title: "Redefinir senha",
    description: "Defina uma nova senha",
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
  "/configuracoes/usuarios": {
    title: "Usuários",
    description: "Membros da organização (somente leitura nesta sprint)",
  },
  "/conta": {
    title: "Minha conta",
    description: "Perfil e dados pessoais permitidos",
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

  if (pathname.startsWith("/consultores/")) {
    return {
      title: "Consultor",
      description: "Cadastro operacional do consultor",
    };
  }

  if (pathname.startsWith("/lojistas/")) {
    return {
      title: "Detalhe do lojista",
      description: "Cadastro e vínculo com consultor",
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
