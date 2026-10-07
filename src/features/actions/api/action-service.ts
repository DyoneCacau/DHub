import { supabase } from "@/lib/supabase";
import { normalizeText } from "@/lib/normalize";
import { mapDomainError } from "@/features/consultants/utils/map-domain-error";
import type {
  Action,
  ActionExpense,
  ActionExpenseReportRow,
  ActionFilters,
  ActionParticipant,
  ActionStatus,
  ActionWithTotals,
  ExpenseAttachment,
  ExpenseReportFilters,
  ExpenseStatus,
  ExpenseType,
} from "@/features/actions/types/action";
import type { CatalogStatus } from "@/types/database";
import type { PaginatedResult } from "@/features/consultants/types/consultant";

const RECEIPTS_BUCKET = "action-receipts";

export interface ActionInput {
  title: string;
  operator_id: string | null;
  region_id: string | null;
  city: string | null;
  starts_on: string;
  ends_on: string | null;
  status: ActionStatus;
  budget_amount: number | null;
  notes: string | null;
}

export interface ExpenseInput {
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
}

function monthRange(month: string): { start: string; end: string } {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function normalizeActionInput(input: ActionInput) {
  return {
    title: normalizeText(input.title) ?? "",
    operator_id: input.operator_id || null,
    region_id: input.region_id || null,
    city: normalizeText(input.city),
    starts_on: input.starts_on,
    ends_on: input.ends_on || null,
    status: input.status,
    budget_amount: input.budget_amount,
    notes: normalizeText(input.notes),
  };
}

function normalizeExpenseInput(input: ExpenseInput) {
  return {
    expense_type_id: input.expense_type_id,
    consultant_id: input.consultant_id || null,
    supplier: normalizeText(input.supplier),
    description: normalizeText(input.description),
    expense_date: input.expense_date || null,
    planned_amount: input.planned_amount,
    actual_amount: input.actual_amount,
    payment_method: normalizeText(input.payment_method),
    status: input.status,
    notes: normalizeText(input.notes),
    period_start: input.period_start || null,
    period_end: input.period_end || null,
    origin: normalizeText(input.origin),
    destination: normalizeText(input.destination),
    booking_code: normalizeText(input.booking_code),
  };
}

export async function listActions(
  organizationId: string,
  filters: ActionFilters,
): Promise<PaginatedResult<ActionWithTotals>> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("actions_with_totals")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("starts_on", { ascending: false })
    .range(from, to);

  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.operatorId !== "all") query = query.eq("operator_id", filters.operatorId);
  if (filters.month) {
    const { start, end } = monthRange(filters.month);
    query = query
      .lte("starts_on", end)
      .or(`ends_on.gte.${start},and(ends_on.is.null,starts_on.gte.${start})`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar ações."));

  return {
    rows: (data ?? []) as ActionWithTotals[],
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getAction(id: string): Promise<ActionWithTotals | null> {
  const { data, error } = await supabase
    .from("actions_with_totals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mapDomainError(error, "Não foi possível carregar a ação."));
  return data as ActionWithTotals | null;
}

export async function createAction(organizationId: string, input: ActionInput): Promise<Action> {
  const { data, error } = await supabase
    .from("actions")
    .insert({ organization_id: organizationId, ...normalizeActionInput(input) })
    .select("*")
    .single();
  if (error) throw new Error(mapDomainError(error, "Não foi possível criar a ação."));
  return data as Action;
}

export async function updateAction(id: string, input: ActionInput): Promise<Action> {
  const { data, error } = await supabase
    .from("actions")
    .update(normalizeActionInput(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(mapDomainError(error, "Não foi possível atualizar a ação."));
  return data as Action;
}

export async function setActionStatus(id: string, status: ActionStatus): Promise<void> {
  const { error } = await supabase.from("actions").update({ status }).eq("id", id);
  if (error) throw new Error(mapDomainError(error, "Não foi possível alterar o status da ação."));
}

export async function listActionReport(
  organizationId: string,
  month: string,
): Promise<ActionExpenseReportRow[]> {
  let query = supabase
    .from("action_expense_report")
    .select("*")
    .eq("organization_id", organizationId)
    .neq("status", "cancelled");
  if (month) query = query.eq("reference_month", `${month}-01`);

  const { data, error } = await query;
  if (error) throw new Error(mapDomainError(error, "Não foi possível carregar o resumo de gastos."));
  return (data ?? []) as ActionExpenseReportRow[];
}

const EXPENSE_REPORT_LIMIT = 2000;

export async function listExpenseReport(
  organizationId: string,
  filters: ExpenseReportFilters,
): Promise<ActionExpenseReportRow[]> {
  let query = supabase
    .from("action_expense_report")
    .select("*")
    .eq("organization_id", organizationId)
    .order("reference_month", { ascending: false })
    .order("expense_date", { ascending: false, nullsFirst: false })
    .limit(EXPENSE_REPORT_LIMIT);

  if (filters.month) query = query.eq("reference_month", `${filters.month}-01`);
  if (filters.expenseTypeId !== "all") query = query.eq("expense_type_id", filters.expenseTypeId);
  if (filters.consultantId !== "all") query = query.eq("consultant_id", filters.consultantId);
  if (filters.operatorId !== "all") query = query.eq("operator_id", filters.operatorId);
  query =
    filters.status === "active"
      ? query.neq("status", "cancelled")
      : query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(mapDomainError(error, "Não foi possível carregar as despesas."));
  return (data ?? []) as ActionExpenseReportRow[];
}

export async function listParticipants(actionId: string): Promise<ActionParticipant[]> {
  const { data, error } = await supabase
    .from("action_participants")
    .select("*")
    .eq("action_id", actionId);
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar participantes."));
  return (data ?? []) as ActionParticipant[];
}

export async function addParticipant(
  organizationId: string,
  actionId: string,
  consultantId: string,
): Promise<void> {
  const { error } = await supabase.from("action_participants").insert({
    organization_id: organizationId,
    action_id: actionId,
    consultant_id: consultantId,
  });
  if (error) throw new Error(mapDomainError(error, "Não foi possível adicionar o participante."));
}

export async function removeParticipant(actionId: string, consultantId: string): Promise<void> {
  const { error } = await supabase
    .from("action_participants")
    .delete()
    .eq("action_id", actionId)
    .eq("consultant_id", consultantId);
  if (error) throw new Error(mapDomainError(error, "Não foi possível remover o participante."));
}

export async function listExpenses(actionId: string): Promise<ActionExpense[]> {
  const { data, error } = await supabase
    .from("action_expenses")
    .select("*")
    .eq("action_id", actionId)
    .order("expense_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar despesas."));
  return (data ?? []) as ActionExpense[];
}

export async function createExpense(
  organizationId: string,
  actionId: string,
  input: ExpenseInput,
): Promise<ActionExpense> {
  const { data, error } = await supabase
    .from("action_expenses")
    .insert({ organization_id: organizationId, action_id: actionId, ...normalizeExpenseInput(input) })
    .select("*")
    .single();
  if (error) throw new Error(mapDomainError(error, "Não foi possível lançar a despesa."));
  return data as ActionExpense;
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ActionExpense> {
  const { data, error } = await supabase
    .from("action_expenses")
    .update(normalizeExpenseInput(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(mapDomainError(error, "Não foi possível atualizar a despesa."));
  return data as ActionExpense;
}

export async function listAttachments(expenseIds: string[]): Promise<ExpenseAttachment[]> {
  if (expenseIds.length === 0) return [];
  const { data, error } = await supabase
    .from("expense_attachments")
    .select("*")
    .in("expense_id", expenseIds)
    .order("created_at", { ascending: true });
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar comprovantes."));
  return (data ?? []) as ExpenseAttachment[];
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  if (file.type === "application/pdf") return "pdf";
  return file.type.split("/")[1] ?? "bin";
}

export async function uploadAttachment(
  organizationId: string,
  actionId: string,
  expenseId: string,
  file: File,
): Promise<void> {
  const path = `${organizationId}/actions/${actionId}/${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    throw new Error(mapDomainError(uploadError, "Não foi possível enviar o comprovante."));
  }

  const { error } = await supabase.from("expense_attachments").insert({
    organization_id: organizationId,
    expense_id: expenseId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  });
  if (error) {
    await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
    throw new Error(mapDomainError(error, "Não foi possível registrar o comprovante."));
  }
}

/** URL assinada de curta duração (bucket privado). */
export async function getAttachmentUrl(attachment: ExpenseAttachment): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(attachment.storage_path, 60);
  if (error || !data) {
    throw new Error(mapDomainError(error, "Não foi possível abrir o comprovante."));
  }
  return data.signedUrl;
}

export async function deleteAttachment(attachment: ExpenseAttachment): Promise<void> {
  const { error } = await supabase.from("expense_attachments").delete().eq("id", attachment.id);
  if (error) throw new Error(mapDomainError(error, "Não foi possível remover o comprovante."));
  await supabase.storage.from(RECEIPTS_BUCKET).remove([attachment.storage_path]);
}

export async function listExpenseTypes(organizationId: string): Promise<ExpenseType[]> {
  const { data, error } = await supabase
    .from("expense_types")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar tipos de despesa."));
  return (data ?? []) as ExpenseType[];
}

export async function createExpenseType(
  organizationId: string,
  input: { name: string; notes?: string | null },
): Promise<void> {
  const { error } = await supabase.from("expense_types").insert({
    organization_id: organizationId,
    name: normalizeText(input.name) ?? "",
    notes: normalizeText(input.notes),
  });
  if (error) throw new Error(mapDomainError(error, "Não foi possível criar o tipo de despesa."));
}

export async function updateExpenseType(
  id: string,
  input: { name?: string; notes?: string | null; status?: CatalogStatus },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = normalizeText(input.name);
  if (input.notes !== undefined) payload.notes = normalizeText(input.notes);
  if (input.status !== undefined) payload.status = input.status;
  const { error } = await supabase.from("expense_types").update(payload).eq("id", id);
  if (error) throw new Error(mapDomainError(error, "Não foi possível atualizar o tipo de despesa."));
}
