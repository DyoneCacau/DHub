import type { LucideIcon } from "lucide-react";

export type VisualRole = "admin" | "operator" | "consultant";

export type NavigationItemId =
  | "dashboard"
  | "consultants"
  | "merchants"
  | "contracts"
  | "recharges"
  | "operators"
  | "reports"
  | "settings";

export interface NavigationItem {
  id: NavigationItemId;
  label: string;
  path: string;
  icon: LucideIcon;
  matchPrefix?: string;
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
