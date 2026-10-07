import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actionQueryKeys } from "@/features/actions/api/query-keys";
import {
  createExpenseType,
  listExpenseTypes,
  updateExpenseType,
} from "@/features/actions/api/action-service";
import {
  expenseTypeFormSchema,
  type ExpenseTypeFormValues,
} from "@/features/actions/schemas/action-schemas";
import type { ExpenseType } from "@/features/actions/types/action";
import { useAuth } from "@/features/auth/hooks/use-auth";

const EMPTY_VALUES: ExpenseTypeFormValues = { name: "", notes: "" };

export function ExpenseTypesPage() {
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ExpenseType | null>(null);

  const listQuery = useQuery({
    queryKey: actionQueryKeys.expenseTypes(organizationId),
    queryFn: () => listExpenseTypes(organizationId),
    enabled: Boolean(organizationId) && isAdmin,
  });

  const form = useForm<ExpenseTypeFormValues>({
    resolver: zodResolver(expenseTypeFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: actionQueryKeys.expenseTypes(organizationId) });

  const saveMutation = useMutation({
    mutationFn: (values: ExpenseTypeFormValues) =>
      editing
        ? updateExpenseType(editing.id, { name: values.name, notes: values.notes || null })
        : createExpenseType(organizationId, { name: values.name, notes: values.notes || null }),
    onSuccess: async () => {
      setEditing(null);
      form.reset(EMPTY_VALUES);
      await invalidate();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (type: ExpenseType) =>
      updateExpenseType(type.id, { status: type.status === "active" ? "inactive" : "active" }),
    onSuccess: invalidate,
  });

  if (!isAdmin) {
    return (
      <PageContainer>
        <EmptyState title="Acesso negado" description="Somente a gerência (admin) configura tipos de despesa." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Tipos de despesa"
        description="Categorias usadas nas despesas das ações. Inative em vez de excluir."
        actions={
          <Button asChild variant="outline">
            <Link to="/acoes">Voltar</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? "Editar tipo" : "Novo tipo"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="expense-type-name">Nome</Label>
                <Input id="expense-type-name" {...form.register("name")} />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-type-notes">Observações</Label>
                <Input id="expense-type-notes" {...form.register("notes")} />
              </div>
              {saveMutation.isError ? (
                <p className="text-sm text-destructive">
                  {saveMutation.error instanceof Error ? saveMutation.error.message : "Erro ao salvar."}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {editing ? "Salvar" : "Criar tipo"}
                </Button>
                {editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      form.reset(EMPTY_VALUES);
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
          {listQuery.isError ? (
            <p className="text-sm text-destructive">
              {listQuery.error instanceof Error ? listQuery.error.message : "Erro ao carregar."}
            </p>
          ) : null}
          {listQuery.data && listQuery.data.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.data.map((type) => (
                    <tr key={type.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {type.name}
                        {type.notes ? (
                          <div className="text-xs font-normal text-muted-foreground">{type.notes}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={type.status === "active" ? "default" : "outline"}>
                          {type.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(type);
                              form.reset({ name: type.name, notes: type.notes ?? "" });
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate(type)}
                          >
                            {type.status === "active" ? "Inativar" : "Ativar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {statusMutation.isError ? (
            <p className="text-sm text-destructive">
              {statusMutation.error instanceof Error ? statusMutation.error.message : "Erro ao alterar status."}
            </p>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
