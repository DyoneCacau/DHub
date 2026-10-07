import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { actionQueryKeys } from "@/features/actions/api/query-keys";
import { getAction, setActionStatus } from "@/features/actions/api/action-service";
import { ActionExpensesCard } from "@/features/actions/components/action-expenses-card";
import { ActionParticipantsCard } from "@/features/actions/components/action-participants-card";
import type { ActionStatus } from "@/features/actions/types/action";
import {
  ACTION_STATUS_LABEL,
  actionStatusVariant,
  formatDate,
  formatMoney,
} from "@/features/actions/utils/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import { listOperators, listRegions } from "@/features/catalogs/api/catalog-service";
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import { listConsultantsForSelect } from "@/features/consultants/api/consultant-service";

const NEXT_STATUS: Partial<Record<ActionStatus, { status: ActionStatus; label: string }>> = {
  planned: { status: "in_progress", label: "Iniciar ação" },
  in_progress: { status: "completed", label: "Concluir ação" },
};

export function ActionDetailPage() {
  const { actionId } = useParams();
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: actionQueryKeys.detail(actionId ?? ""),
    queryFn: () => getAction(actionId!),
    enabled: Boolean(actionId) && isAdmin,
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

  const consultantsQuery = useQuery({
    queryKey: [...consultantQueryKeys.root, "select-all", organizationId],
    queryFn: () => listConsultantsForSelect(organizationId),
    enabled: Boolean(organizationId) && isAdmin,
  });

  const statusMutation = useMutation({
    mutationFn: (status: ActionStatus) => setActionStatus(actionId!, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: actionQueryKeys.root });
    },
  });

  if (!isAdmin) {
    return (
      <PageContainer>
        <EmptyState title="Acesso negado" description="Somente a gerência (admin) gerencia ações." />
      </PageContainer>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageContainer>
        <EmptyState title="Ação não encontrada" description="O registro não existe ou você não tem acesso." />
      </PageContainer>
    );
  }

  const action = detailQuery.data;
  const operatorName = operatorsQuery.data?.find((o) => o.id === action.operator_id)?.name;
  const regionName = regionsQuery.data?.find((r) => r.id === action.region_id)?.name;
  const next = NEXT_STATUS[action.status];
  const consultants = consultantsQuery.data ?? [];
  const overBudget =
    action.budget_amount !== null && Number(action.planned_total) > Number(action.budget_amount);

  return (
    <PageContainer>
      <PageHeader
        title={action.title}
        description="Ação de bandeira: participantes, despesas e comprovantes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/acoes">Voltar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/acoes/${action.id}/editar`}>Editar</Link>
            </Button>
            {next ? (
              <Button
                variant="secondary"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(next.status)}
              >
                {next.label}
              </Button>
            ) : null}
            {action.status !== "cancelled" && action.status !== "completed" ? (
              <Button
                variant="ghost"
                disabled={statusMutation.isPending}
                onClick={() => {
                  if (window.confirm("Cancelar esta ação? As despesas continuam registradas.")) {
                    statusMutation.mutate("cancelled");
                  }
                }}
              >
                Cancelar ação
              </Button>
            ) : null}
          </div>
        }
      />

      {statusMutation.isError ? (
        <p className="mb-4 text-sm text-destructive">
          {statusMutation.error instanceof Error ? statusMutation.error.message : "Erro ao alterar status."}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da ação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Status: </span>
              <Badge variant={actionStatusVariant(action.status)}>
                {ACTION_STATUS_LABEL[action.status]}
              </Badge>
            </p>
            <p>
              <span className="text-muted-foreground">Bandeira: </span>
              {operatorName ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Região: </span>
              {regionName ?? "—"}
              {action.city ? ` · ${action.city}` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Período: </span>
              {formatDate(action.starts_on)}
              {action.ends_on ? ` a ${formatDate(action.ends_on)}` : ""}
            </p>
            {action.notes ? (
              <p>
                <span className="text-muted-foreground">Observações: </span>
                {action.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Orçamento: </span>
              {formatMoney(action.budget_amount)}
            </p>
            <p>
              <span className="text-muted-foreground">Previsto (não canceladas): </span>
              {formatMoney(action.planned_total)}
              {overBudget ? (
                <Badge variant="warning" className="ml-2">
                  Acima do orçamento
                </Badge>
              ) : null}
            </p>
            <p>
              <span className="text-muted-foreground">Pago: </span>
              {formatMoney(action.paid_total)}
            </p>
            <p>
              <span className="text-muted-foreground">Participantes: </span>
              {action.participant_count}
            </p>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ActionParticipantsCard
            organizationId={organizationId}
            actionId={action.id}
            consultants={consultants}
          />
        </div>

        <div className="lg:col-span-2">
          <ActionExpensesCard
            organizationId={organizationId}
            actionId={action.id}
            consultants={consultants}
          />
        </div>
      </div>
    </PageContainer>
  );
}
