import type { LucideIcon } from "lucide-react";

import type { AppRole } from "@/types/database";

export type NavigationItemId =
  | "dashboard"
  | "consultants"
  | "merchants"
  | "contracts"
  | "recharges"
  | "operators"
  | "reports"
  | "settings"
  | "settings-users"
  | "account";

export interface NavigationItem {
  id: NavigationItemId;
  label: string;
  path: string;
  icon: LucideIcon;
  matchPrefix?: string;
  /** Papéis que podem ver o item. Ocultar menu ≠ autorização real (RLS + guards). */
  roles: AppRole[];
}

export interface PageMeta {
  title: string;
  description?: string;
}

export type DemoOperatorStatus = "active" | "not_configured";

export interface DemoOperator {
  id: string;
  name: string;
  status: DemoOperatorStatus;
}
