import type { ActionStatus, ExpenseStatus } from "@/features/actions/types/action";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : currency.format(Number(value));
}

/** Aceita "1.234,56", "1234,56" ou "1234.56". Vazio → null; inválido → NaN. */
export function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function moneyToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : Number(value).toFixed(2).replace(".", ",");
}

/** Datas `date` do Postgres (YYYY-MM-DD) sem conversão de fuso. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function formatPeriod(start: string | null, end: string | null): string {
  if (start && end) return `${formatDate(start)} a ${formatDate(end)}`;
  if (start) return `a partir de ${formatDate(start)}`;
  if (end) return `até ${formatDate(end)}`;
  return "—";
}

export function formatMonth(value: string): string {
  const [year, month] = value.slice(0, 7).split("-");
  return `${month}/${year}`;
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  planned: "Planejada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  planned: "Prevista",
  paid: "Paga",
  cancelled: "Cancelada",
};

export function actionStatusVariant(status: ActionStatus) {
  if (status === "completed") return "success" as const;
  if (status === "in_progress") return "default" as const;
  if (status === "cancelled") return "outline" as const;
  return "secondary" as const;
}

export function expenseStatusVariant(status: ExpenseStatus) {
  if (status === "paid") return "success" as const;
  if (status === "cancelled") return "outline" as const;
  return "warning" as const;
}
