import type { AppRole } from "@/types/database";

export function canManageConsultants(role: AppRole | null): boolean {
  return role === "admin" || role === "operator";
}

export function canLinkConsultantUser(role: AppRole | null): boolean {
  return role === "admin";
}

export function canToggleConsultantStatus(role: AppRole | null): boolean {
  return role === "admin" || role === "operator";
}

export function canManageAllMerchants(role: AppRole | null): boolean {
  return role === "admin" || role === "operator";
}

export function canCreateMerchant(role: AppRole | null): boolean {
  return role === "admin" || role === "operator" || role === "consultant";
}

export function canChangeMerchantConsultant(role: AppRole | null): boolean {
  return role === "admin" || role === "operator";
}

export function canToggleMerchantStatus(role: AppRole | null): boolean {
  return role === "admin" || role === "operator" || role === "consultant";
}
