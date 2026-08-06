import type { AppRole } from "@/types/database";

export type AuthAccessState =
  | "initializing"
  | "unauthenticated"
  | "authenticated_no_membership"
  | "membership_inactive"
  | "ready"
  | "profile_error"
  | "config_error";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  consultant: "Consultor",
};

export function formatRole(role: AppRole | null | undefined): string {
  if (!role) {
    return "Sem papel";
  }
  return ROLE_LABELS[role];
}
