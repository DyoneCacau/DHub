import type { AppRole } from "@/types/database";

export function canManageCatalogs(role: AppRole | null): boolean {
  return role === "admin";
}

export function canManageConsultantLinks(role: AppRole | null): boolean {
  return role === "admin" || role === "operator";
}
