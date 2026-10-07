import type { CatalogStatus } from "@/types/database";

export type ActionStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type ExpenseStatus = "planned" | "paid" | "cancelled";

export interface ExpenseType {
  id: string;
  organization_id: string;
  name: string;
  status: CatalogStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Action {
  id: string;
  organization_id: string;
  title: string;
  operator_id: string | null;
  region_id: string | null;
  city: string | null;
  starts_on: string;
  ends_on: string | null;
  status: ActionStatus;
  budget_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ActionWithTotals extends Action {
  participant_count: number;
  planned_total: number;
  paid_total: number;
}

export interface ActionParticipant {
  organization_id: string;
  action_id: string;
  consultant_id: string;
  created_at: string;
  created_by: string | null;
}

export interface ActionExpense {
  id: string;
  organization_id: string;
  action_id: string;
  expense_type_id: string;
  consultant_id: string | null;
  supplier: string | null;
  description: string | null;
  expense_date: string | null;
  planned_amount: number | null;
  actual_amount: number | null;
  payment_method: string | null;
  status: ExpenseStatus;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  origin: string | null;
  destination: string | null;
  booking_code: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ExpenseAttachment {
  id: string;
  organization_id: string;
  expense_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  created_by: string | null;
}

export interface ActionExpenseReportRow {
  expense_id: string;
  organization_id: string;
  action_id: string;
  action_title: string;
  operator_id: string | null;
  region_id: string | null;
  expense_type_id: string;
  status: ExpenseStatus;
  expense_date: string | null;
  reference_month: string;
  planned_amount: number | null;
  actual_amount: number | null;
  consultant_id: string | null;
  supplier: string | null;
  description: string | null;
  payment_method: string | null;
  period_start: string | null;
  period_end: string | null;
  origin: string | null;
  destination: string | null;
  booking_code: string | null;
  action_status: ActionStatus;
}

export interface ExpenseReportFilters {
  month: string;
  expenseTypeId: string | "all";
  consultantId: string | "all";
  operatorId: string | "all";
  status: ExpenseStatus | "active";
}

export interface ActionFilters {
  status: ActionStatus | "all";
  operatorId: string | "all";
  month: string;
  page: number;
  pageSize: number;
}
