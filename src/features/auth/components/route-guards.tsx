import { Navigate, Outlet, useLocation } from "react-router-dom";

import {
  AuthLoadingState,
  PendingAccessState,
} from "@/features/auth/components/auth-states";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { AppRole } from "@/types/database";

function safeRedirectPath(pathname: string, search: string): string {
  const candidate = `${pathname}${search}`;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }
  if (candidate.startsWith("/login") || candidate.startsWith("/esqueci-senha")) {
    return "/dashboard";
  }
  return candidate;
}

export function PublicOnlyRoute() {
  const { accessState, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <AuthLoadingState />;
  }

  if (accessState === "ready") {
    const from = (location.state as { from?: string } | null)?.from;
    const target =
      typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
        ? from
        : "/dashboard";
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}

export function RequireAuth() {
  const { accessState, isInitializing, logout } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <AuthLoadingState />;
  }

  if (accessState === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: safeRedirectPath(location.pathname, location.search) }}
      />
    );
  }

  if (accessState === "profile_error") {
    return (
      <PendingAccessState
        title="Erro ao carregar perfil"
        description="Não foi possível validar seu acesso. Tente novamente ou saia da sessão."
      />
    );
  }

  if (accessState === "authenticated_no_membership") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <PendingAccessState
          title="Acesso pendente"
          description="Sua conta está autenticada, mas ainda não possui membership ativa em uma organização."
        />
        <button type="button" className="text-sm text-primary underline" onClick={() => void logout()}>
          Sair
        </button>
      </div>
    );
  }

  if (accessState === "membership_inactive") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <PendingAccessState
          title="Membership inativa"
          description="Seu vínculo com a organização está inativo. O acesso administrativo permanece bloqueado."
        />
        <button type="button" className="text-sm text-primary underline" onClick={() => void logout()}>
          Sair
        </button>
      </div>
    );
  }

  return <Outlet />;
}

export function RequireActiveMembership() {
  const { accessState, isInitializing } = useAuth();

  if (isInitializing) {
    return <AuthLoadingState />;
  }

  if (accessState !== "ready") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

interface RequireRoleProps {
  roles: AppRole[];
}

export function RequireRole({ roles }: RequireRoleProps) {
  const { role, isInitializing, accessState } = useAuth();

  if (isInitializing) {
    return <AuthLoadingState />;
  }

  if (accessState !== "ready") {
    return <Navigate to="/login" replace />;
  }

  if (!role || !roles.includes(role)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <Outlet />;
}
