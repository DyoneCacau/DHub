import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { createAction, getAction, updateAction } from "@/features/actions/api/action-service";
import { actionFormSchema, type ActionFormValues } from "@/features/actions/schemas/action-schemas";
import { ACTION_STATUS_LABEL, moneyToInput, parseMoney } from "@/features/actions/utils/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import { listOperators, listRegions } from "@/features/catalogs/api/catalog-service";

const NONE = "none";

const DEFAULT_VALUES: ActionFormValues = {
  title: "",
  operator_id: NONE,
  region_id: NONE,
  city: "",
  starts_on: "",
  ends_on: "",
  status: "planned",
  budget_amount: "",
  notes: "",
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function ActionFormPage() {
  const { actionId } = useParams();
  const isEdit = Boolean(actionId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const isAdmin = role === "admin";

  const detailQuery = useQuery({
    queryKey: actionQueryKeys.detail(actionId ?? ""),
    queryFn: () => getAction(actionId!),
    enabled: isEdit && isAdmin,
  });

  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled: Boolean(organizationId) && isAdmin,
  });

  const regionsQuery = useQuery({
    queryKey: catalogQueryKeys.regions(organizationId),
    queryFn: () => listRegions(organizationId),
    enabled: Boolean(organizationId) && isAdmin,
  });

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    const row = detailQuery.data;
    if (row) {
      form.reset({
        title: row.title,
        operator_id: row.operator_id ?? NONE,
        region_id: row.region_id ?? NONE,
        city: row.city ?? "",
        starts_on: row.starts_on,
        ends_on: row.ends_on ?? "",
        status: row.status,
        budget_amount: moneyToInput(row.budget_amount),
        notes: row.notes ?? "",
      });
    }
  }, [detailQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (values: ActionFormValues) => {
      const input = {
        title: values.title,
        operator_id: values.operator_id === NONE ? null : values.operator_id,
        region_id: values.region_id === NONE ? null : values.region_id,
        city: values.city || null,
        starts_on: values.starts_on,
        ends_on: values.ends_on || null,
        status: values.status,
        budget_amount: parseMoney(values.budget_amount),
        notes: values.notes || null,
      };
      return isEdit && actionId ? updateAction(actionId, input) : createAction(organizationId, input);
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: actionQueryKeys.root });
      navigate(`/acoes/${row.id}`);
    },
  });

  if (!isAdmin) {
    return (
      <PageContainer>
        <EmptyState title="Acesso negado" description="Somente a gerência (admin) gerencia ações." />
      </PageContainer>
    );
  }

  const errors = form.formState.errors;
  const activeOperators = (operatorsQuery.data ?? []).filter(
    (o) => o.status === "active" || o.id === detailQuery.data?.operator_id,
  );
  const activeRegions = (regionsQuery.data ?? []).filter(
    (r) => r.status === "active" || r.id === detailQuery.data?.region_id,
  );

  return (
    <PageContainer>
      <PageHeader
        title={isEdit ? "Editar ação" : "Nova ação"}
        description="Ação de bandeira com período, local e orçamento."
        actions={
          <Button asChild variant="outline">
            <Link to={isEdit ? `/acoes/${actionId}` : "/acoes"}>Voltar</Link>
          </Button>
        }
      />

      {detailQuery.isError ? (
        <p className="text-sm text-destructive">Ação não encontrada ou acesso negado.</p>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="action-title">Nome da ação</Label>
              <Input id="action-title" {...form.register("title")} />
              <FieldError message={errors.title?.message} />
            </div>

            <div className="space-y-2">
              <Label>Bandeira</Label>
              <Controller
                control={form.control}
                name="operator_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bandeira" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem bandeira</SelectItem>
                      {activeOperators.map((operator) => (
                        <SelectItem key={operator.id} value={operator.id}>
                          {operator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Região</Label>
              <Controller
                control={form.control}
                name="region_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem região</SelectItem>
                      {activeRegions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-city">Cidade / local</Label>
              <Input id="action-city" {...form.register("city")} />
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
                      {Object.entries(ACTION_STATUS_LABEL).map(([value, label]) => (
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
              <Label htmlFor="action-starts">Início</Label>
              <Input id="action-starts" type="date" {...form.register("starts_on")} />
              <FieldError message={errors.starts_on?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-ends">Fim (opcional)</Label>
              <Input id="action-ends" type="date" {...form.register("ends_on")} />
              <FieldError message={errors.ends_on?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-budget">Orçamento previsto (R$, opcional)</Label>
              <Input
                id="action-budget"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register("budget_amount")}
              />
              <FieldError message={errors.budget_amount?.message} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="action-notes">Observações</Label>
              <Input id="action-notes" {...form.register("notes")} />
            </div>

            {mutation.isError ? (
              <p className="text-sm text-destructive md:col-span-2">
                {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
              </p>
            ) : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {isEdit ? "Salvar alterações" : "Criar ação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
