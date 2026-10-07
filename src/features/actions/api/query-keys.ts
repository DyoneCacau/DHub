import type { ActionFilters, ExpenseReportFilters } from "@/features/actions/types/action";

export const actionQueryKeys = {
  root: ["actions"] as const,
  list: (organizationId: string, filters: ActionFilters) =>
    [...actionQueryKeys.root, "list", organizationId, filters] as const,
  detail: (id: string) => [...actionQueryKeys.root, "detail", id] as const,
  participants: (actionId: string) => [...actionQueryKeys.root, "participants", actionId] as const,
  expenses: (actionId: string) => [...actionQueryKeys.root, "expenses", actionId] as const,
  attachments: (actionId: string) => [...actionQueryKeys.root, "attachments", actionId] as const,
  report: (organizationId: string, month: string) =>
    [...actionQueryKeys.root, "report", organizationId, month] as const,
  expenseReport: (organizationId: string, filters: ExpenseReportFilters) =>
    [...actionQueryKeys.root, "expense-report", organizationId, filters] as const,
  expenseTypes: (organizationId: string) =>
    [...actionQueryKeys.root, "expense-types", organizationId] as const,
};
