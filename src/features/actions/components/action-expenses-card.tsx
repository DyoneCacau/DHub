import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Paperclip, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionQueryKeys } from "@/features/actions/api/query-keys";
import {
  createExpense,
  deleteAttachment,
  listAttachments,
  listExpenses,
  getAttachmentUrl,
  listExpenseTypes,
  updateExpense,
  uploadAttachment,
} from "@/features/actions/api/action-service";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPES,
  expenseFormSchema,
  type ExpenseFormValues,
} from "@/features/actions/schemas/action-schemas";
import type { ActionExpense } from "@/features/actions/types/action";
import {
  EXPENSE_STATUS_LABEL,
  expenseStatusVariant,
  formatDate,
  formatMoney,
  moneyToInput,
  parseMoney,
} from "@/features/actions/utils/format";

const NONE = "none";
const PAYMENT_SUGGESTIONS = [
  "Cartão corporativo",
  "Cartão combustível/frota",
  "PIX",
  "Transferência",
  "Boleto",
  "Dinheiro",
];

const EMPTY_VALUES: ExpenseFormValues = {
  expense_type_id: "",
  consultant_id: NONE,
  supplier: "",
  description: "",
  expense_date: "",
  planned_amount: "",
  actual_amount: "",
  payment_method: "",
  status: "planned",
  notes: "",
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

interface ActionExpensesCardProps {
  organizationId: string;
  actionId: string;
  consultants: Array<{ id: string; full_name: string; status: string }>;
}

export function ActionExpensesCard({ organizationId, actionId, consultants }: ActionExpensesCardProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ActionExpense | null>(null);

  const typesQuery = useQuery({
    queryKey: actionQueryKeys.expenseTypes(organizationId),
    queryFn: () => listExpenseTypes(organizationId),
    enabled: Boolean(organizationId),
  });

  const expensesQuery = useQuery({
    queryKey: actionQueryKeys.expenses(actionId),
    queryFn: () => listExpenses(actionId),
  });

  const expenseIds = (expensesQuery.data ?? []).map((e) => e.id);

  const attachmentsQuery = useQuery({
    queryKey: [...actionQueryKeys.attachments(actionId), expenseIds],
    queryFn: () => listAttachments(expenseIds),
    enabled: expenseIds.length > 0,
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: actionQueryKeys.root });

  const saveMutation = useMutation({
    mutationFn: (values: ExpenseFormValues) => {
      const input = {
        expense_type_id: values.expense_type_id,
        consultant_id: values.consultant_id === NONE ? null : values.consultant_id,
        supplier: values.supplier || null,
        description: values.description || null,
        expense_date: values.expense_date || null,
        planned_amount: parseMoney(values.planned_amount),
        actual_amount: parseMoney(values.actual_amount),
        payment_method: values.payment_method || null,
        status: values.status,
        notes: values.notes || null,
      };
      return editing
        ? updateExpense(editing.id, input)
        : createExpense(organizationId, actionId, input);
    },
    onSuccess: async () => {
      setEditing(null);
      setFormOpen(false);
      form.reset(EMPTY_VALUES);
      await invalidate();
    },
  });

  const fileMutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: invalidate,
  });

  const typeNames = new Map((typesQuery.data ?? []).map((t) => [t.id, t.name]));
  const consultantNames = new Map(consultants.map((c) => [c.id, c.full_name]));
  const activeTypes = (typesQuery.data ?? []).filter(
    (t) => t.status === "active" || t.id === editing?.expense_type_id,
  );
  const selectableConsultants = consultants.filter(
    (c) => c.status === "active" || c.id === editing?.consultant_id,
  );

  const openNew = () => {
    setEditing(null);
    saveMutation.reset();
    form.reset(EMPTY_VALUES);
    setFormOpen(true);
  };

  const openEdit = (expense: ActionExpense) => {
    setEditing(expense);
    saveMutation.reset();
    form.reset({
      expense_type_id: expense.expense_type_id,
      consultant_id: expense.consultant_id ?? NONE,
      supplier: expense.supplier ?? "",
      description: expense.description ?? "",
      expense_date: expense.expense_date ?? "",
      planned_amount: moneyToInput(expense.planned_amount),
      actual_amount: moneyToInput(expense.actual_amount),
      payment_method: expense.payment_method ?? "",
      status: expense.status,
      notes: expense.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleFile = (expense: ActionExpense, file: File | undefined) => {
    if (!file) return;
    if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      window.alert("Formato não permitido. Envie PDF, JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      window.alert("Arquivo acima de 10 MB.");
      return;
    }
    fileMutation.mutate(() => uploadAttachment(organizationId, actionId, expense.id, file));
  };

  const errors = form.formState.errors;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Despesas</CardTitle>
        {!formOpen ? (
          <Button type="button" size="sm" onClick={openNew}>
            Lançar despesa
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {formOpen ? (
          <form
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-3"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Controller
                control={form.control}
                name="expense_type_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.expense_type_id?.message} />
            </div>

            <div className="space-y-2">
              <Label>Consultor beneficiado</Label>
              <Controller
                control={form.control}
                name="consultant_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nenhum</SelectItem>
                      {selectableConsultants.map((consultant) => (
                        <SelectItem key={consultant.id} value={consultant.id}>
                          {consultant.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPENSE_STATUS_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-supplier">Fornecedor</Label>
              <Input id="expense-supplier" {...form.register("supplier")} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="expense-description">Descrição</Label>
              <Input
                id="expense-description"
                placeholder="Ex.: voo GRU → REC, locadora, posto…"
                {...form.register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-date">Data</Label>
              <Input id="expense-date" type="date" {...form.register("expense_date")} />
              <FieldError message={errors.expense_date?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-planned">Valor previsto (R$)</Label>
              <Input
                id="expense-planned"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register("planned_amount")}
              />
              <FieldError message={errors.planned_amount?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-actual">Valor realizado (R$)</Label>
              <Input
                id="expense-actual"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register("actual_amount")}
              />
              <FieldError message={errors.actual_amount?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-payment">Forma de pagamento</Label>
              <Input id="expense-payment" list="expense-payment-options" {...form.register("payment_method")} />
              <datalist id="expense-payment-options">
                {PAYMENT_SUGGESTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="expense-notes">Observações</Label>
              <Input id="expense-notes" {...form.register("notes")} />
            </div>

            {saveMutation.isError ? (
              <p className="text-sm text-destructive md:col-span-3">
                {saveMutation.error instanceof Error ? saveMutation.error.message : "Erro ao salvar."}
              </p>
            ) : null}

            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" disabled={saveMutation.isPending}>
                {editing ? "Salvar despesa" : "Lançar despesa"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}

        {expensesQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
        {expensesQuery.isError ? (
          <p className="text-sm text-destructive">
            {expensesQuery.error instanceof Error
              ? expensesQuery.error.message
              : "Erro ao carregar despesas."}
          </p>
        ) : null}
        {expensesQuery.data && expensesQuery.data.length === 0 && !formOpen ? (
          <p className="text-sm text-muted-foreground">Nenhuma despesa lançada.</p>
        ) : null}

        {expensesQuery.data && expensesQuery.data.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Detalhe</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Previsto</th>
                  <th className="px-3 py-2 font-medium">Realizado</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Comprovantes</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {expensesQuery.data.map((expense) => {
                  const files = (attachmentsQuery.data ?? []).filter(
                    (a) => a.expense_id === expense.id,
                  );
                  const inputId = `receipt-${expense.id}`;
                  return (
                    <tr key={expense.id} className="border-b align-top last:border-0">
                      <td className="px-3 py-2 font-medium">
                        {typeNames.get(expense.expense_type_id) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {expense.description ? <div>{expense.description}</div> : null}
                        {expense.supplier ? <div>{expense.supplier}</div> : null}
                        {expense.consultant_id ? (
                          <div>Para: {consultantNames.get(expense.consultant_id) ?? "—"}</div>
                        ) : null}
                        {expense.payment_method ? <div>{expense.payment_method}</div> : null}
                      </td>
                      <td className="px-3 py-2">{formatDate(expense.expense_date)}</td>
                      <td className="px-3 py-2">{formatMoney(expense.planned_amount)}</td>
                      <td className="px-3 py-2">{formatMoney(expense.actual_amount)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={expenseStatusVariant(expense.status)}>
                          {EXPENSE_STATUS_LABEL[expense.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          {files.map((file) => (
                            <div key={file.id} className="flex items-center gap-1">
                              <button
                                type="button"
                                className="flex items-center gap-1 text-left underline-offset-2 hover:underline"
                                onClick={() => {
                                  const tab = window.open("about:blank", "_blank");
                                  fileMutation.mutate(async () => {
                                    try {
                                      const url = await getAttachmentUrl(file);
                                      if (tab) {
                                        tab.opener = null;
                                        tab.location.href = url;
                                      } else {
                                        window.location.href = url;
                                      }
                                    } catch (error) {
                                      tab?.close();
                                      throw error;
                                    }
                                  });
                                }}
                              >
                                <FileText className="size-3 shrink-0" />
                                <span className="max-w-[160px] truncate">{file.file_name}</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Remover ${file.file_name}`}
                                className="opacity-60 hover:opacity-100"
                                disabled={fileMutation.isPending}
                                onClick={() => {
                                  if (window.confirm(`Remover o comprovante ${file.file_name}?`)) {
                                    fileMutation.mutate(() => deleteAttachment(file));
                                  }
                                }}
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                          <label
                            htmlFor={inputId}
                            className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Paperclip className="size-3" />
                            Anexar
                          </label>
                          <input
                            id={inputId}
                            type="file"
                            className="sr-only"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            disabled={fileMutation.isPending}
                            onChange={(event) => {
                              handleFile(expense, event.target.files?.[0]);
                              event.target.value = "";
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(expense)}>
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {fileMutation.isPending ? (
          <p className="text-sm text-muted-foreground">Processando arquivo…</p>
        ) : null}
        {fileMutation.isError ? (
          <p className="text-sm text-destructive">
            {fileMutation.error instanceof Error ? fileMutation.error.message : "Erro no comprovante."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
