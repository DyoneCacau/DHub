import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Plus, Wallet } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionQueryKeys } from "@/features/actions/api/query-keys";
import { listActionReport, listActions } from "@/features/actions/api/action-service";
import type { ActionFilters } from "@/features/actions/types/action";
import {
  ACTION_STATUS_LABEL,
  actionStatusVariant,
  currentMonth,
  formatDate,
  formatMoney,
  formatMonth,
} from "@/features/actions/utils/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import { listOperators } from "@/features/catalogs/api/catalog-service";

const PAGE_SIZE = 20;
const NO_OPERATOR = "__none__";

export function ActionsPage() {
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const isAdmin = role === "admin";

  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<ActionFilters["status"]>("all");
  const [operatorId, setOperatorId] = useState<ActionFilters["operatorId"]>("all");
  const [page, setPage] = useState(1);

  const filters = useMemo<ActionFilters>(
    () => ({ month, status, operatorId, page, pageSize: PAGE_SIZE }),
    [month, status, operatorId, page],
  );

  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled: Boolean(organizationId) && isAdmin,
  });

  const listQuery = useQuery({
    queryKey: actionQueryKeys.list(organizationId, filters),
    queryFn: () => listActions(organizationId, filters),
    enabled: Boolean(organizationId) && isAdmin,
  });

  const reportQuery = useQuery({
    queryKey: actionQueryKeys.report(organizationId, month),
    queryFn: () => listActionReport(organizationId, month),
    enabled: Boolean(organizationId) && isAdmin,
  });

  const operatorNames = useMemo(
    () => new Map((operatorsQuery.data ?? []).map((o) => [o.id, o.name])),
    [operatorsQuery.data],
  );

  const summary = useMemo(() => {
    const rows = reportQuery.data ?? [];
    let planned = 0;
    let paid = 0;
    const byOperator = new Map<string, { planned: number; paid: number }>();
    for (const row of rows) {
      const key = row.operator_id ?? NO_OPERATOR;
      const entry = byOperator.get(key) ?? { planned: 0, paid: 0 };
      entry.planned += Number(row.planned_amount ?? 0);
      if (row.status === "paid") entry.paid += Number(row.actual_amount ?? 0);
      byOperator.set(key, entry);
      planned += Number(row.planned_amount ?? 0);
      if (row.status === "paid") paid += Number(row.actual_amount ?? 0);
    }
    return { planned, paid, byOperator: [...byOperator.entries()] };
  }, [reportQuery.data]);

  if (!isAdmin) {
    return (
      <PageContainer>
        <EmptyState
          title="Acesso negado"
          description="Operações e Ações são geridas somente pela gerência (admin)."
        />
      </PageContainer>
    );
  }

  const periodLabel = month ? formatMonth(month) : "todo o período";

  return (
    <PageContainer>
      <PageHeader
        title="Operações e Ações"
        description="Ações de bandeira, viagens e despesas (passagens, carros, combustível, cartões, contas)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/acoes/tipos-despesa">Tipos de despesa</Link>
            </Button>
            <Button asChild>
              <Link to="/acoes/nova">
                <Plus className="size-4" />
                Nova ação
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[200px_200px_200px_auto]">
        <Input
          type="month"
          aria-label="Mês"
          value={month}
          onChange={(event) => {
            setMonth(event.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ActionFilters["status"]);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(ACTION_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={operatorId}
          onValueChange={(value) => {
            setOperatorId(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bandeira" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as bandeiras</SelectItem>
            {(operatorsQuery.data ?? []).map((operator) => (
              <SelectItem key={operator.id} value={operator.id}>
                {operator.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {month ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMonth("");
              setPage(1);
            }}
          >
            Ver todos os meses
          </Button>
        ) : null}
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <StatCard
          title="Previsto"
          value={formatMoney(summary.planned)}
          hint={`Despesas não canceladas — ${periodLabel}`}
          icon={CalendarRange}
          demo={false}
        />
        <StatCard
          title="Pago"
          value={formatMoney(summary.paid)}
          hint={`Valor realizado das despesas pagas — ${periodLabel}`}
          icon={Wallet}
          demo={false}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos por bandeira
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {summary.byOperator.length === 0 ? (
              <p className="text-muted-foreground">Sem despesas no período.</p>
            ) : (
              summary.byOperator.map(([key, totals]) => (
                <div key={key} className="flex justify-between gap-2">
                  <span>{key === NO_OPERATOR ? "Sem bandeira" : operatorNames.get(key) ?? "—"}</span>
                  <span className="text-muted-foreground">
                    {formatMoney(totals.planned)} / {formatMoney(totals.paid)}
                  </span>
                </div>
              ))
            )}
            {summary.byOperator.length > 0 ? (
              <p className="pt-1 text-xs text-muted-foreground">previsto / pago</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando ações…</p> : null}
      {listQuery.isError ? (
        <p className="text-sm text-destructive">
          {listQuery.error instanceof Error ? listQuery.error.message : "Erro ao carregar ações."}
        </p>
      ) : null}

      {listQuery.data && listQuery.data.rows.length === 0 ? (
        <EmptyState
          title="Nenhuma ação encontrada"
          description="Cadastre uma ação de bandeira para controlar viagens e despesas."
        />
      ) : null}

      {listQuery.data && listQuery.data.rows.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Ação</th>
                  <th className="px-4 py-3 font-medium">Bandeira</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Participantes</th>
                  <th className="px-4 py-3 font-medium">Previsto</th>
                  <th className="px-4 py-3 font-medium">Pago</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {listQuery.data.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {row.title}
                      {row.city ? (
                        <div className="text-xs font-normal text-muted-foreground">{row.city}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.operator_id ? operatorNames.get(row.operator_id) ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(row.starts_on)}
                      {row.ends_on ? ` a ${formatDate(row.ends_on)}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={actionStatusVariant(row.status)}>
                        {ACTION_STATUS_LABEL[row.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{row.participant_count}</td>
                    <td className="px-4 py-3">
                      {formatMoney(row.planned_total)}
                      {row.budget_amount !== null ? (
                        <div className="text-xs text-muted-foreground">
                          orçamento {formatMoney(row.budget_amount)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{formatMoney(row.paid_total)}</td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/acoes/${row.id}`}>Abrir</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={listQuery.data.total}
            onPageChange={setPage}
            disabled={listQuery.isFetching}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
