import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Wallet } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
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
import { listExpenseReport, listExpenseTypes } from "@/features/actions/api/action-service";
import type { ExpenseReportFilters } from "@/features/actions/types/action";
import {
  EXPENSE_STATUS_LABEL,
  currentMonth,
  expenseStatusVariant,
  formatDate,
  formatMoney,
  formatMonth,
  formatPeriod,
} from "@/features/actions/utils/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import { listOperators } from "@/features/catalogs/api/catalog-service";
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import { listConsultantsForSelect } from "@/features/consultants/api/consultant-service";

interface TypeTotals {
  typeId: string;
  count: number;
  planned: number;
  paid: number;
}

export function ExpensesPage() {
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const isAdmin = role === "admin";
  const enabled = Boolean(organizationId) && isAdmin;

  const [filters, setFilters] = useState<ExpenseReportFilters>({
    month: currentMonth(),
    expenseTypeId: "all",
    consultantId: "all",
    operatorId: "all",
    status: "active",
  });

  const updateFilter = <K extends keyof ExpenseReportFilters>(
    key: K,
    value: ExpenseReportFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));

  const reportQuery = useQuery({
    queryKey: actionQueryKeys.expenseReport(organizationId, filters),
    queryFn: () => listExpenseReport(organizationId, filters),
    enabled,
  });

  const typesQuery = useQuery({
    queryKey: actionQueryKeys.expenseTypes(organizationId),
    queryFn: () => listExpenseTypes(organizationId),
    enabled,
  });

  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled,
  });

  const consultantsQuery = useQuery({
    queryKey: [...consultantQueryKeys.root, "select-all", organizationId],
    queryFn: () => listConsultantsForSelect(organizationId),
    enabled,
  });

  const typeNames = useMemo(
    () => new Map((typesQuery.data ?? []).map((t) => [t.id, t.name])),
    [typesQuery.data],
  );
  const operatorNames = useMemo(
    () => new Map((operatorsQuery.data ?? []).map((o) => [o.id, o.name])),
    [operatorsQuery.data],
  );
  const consultantNames = useMemo(
    () => new Map((consultantsQuery.data ?? []).map((c) => [c.id, c.full_name])),
    [consultantsQuery.data],
  );

  const summary = useMemo(() => {
    const rows = reportQuery.data ?? [];
    let planned = 0;
    let paid = 0;
    const byType = new Map<string, TypeTotals>();
    for (const row of rows) {
      const rowPlanned = row.status === "cancelled" ? 0 : Number(row.planned_amount ?? 0);
      const rowPaid = row.status === "paid" ? Number(row.actual_amount ?? 0) : 0;
      const entry = byType.get(row.expense_type_id) ?? {
        typeId: row.expense_type_id,
        count: 0,
        planned: 0,
        paid: 0,
      };
      entry.count += 1;
      entry.planned += rowPlanned;
      entry.paid += rowPaid;
      byType.set(row.expense_type_id, entry);
      planned += rowPlanned;
      paid += rowPaid;
    }
    const totals = [...byType.values()].sort((a, b) => b.planned + b.paid - (a.planned + a.paid));
    return { planned, paid, byType: totals };
  }, [reportQuery.data]);

  if (!isAdmin) {
    return (
      <PageContainer>
        <EmptyState title="Acesso negado" description="Despesas são geridas somente pela gerência (admin)." />
      </PageContainer>
    );
  }

  const periodLabel = filters.month ? formatMonth(filters.month) : "todo o período";
  const rows = reportQuery.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Despesas"
        description="Todas as despesas das ações: passagens, carros, hotéis, combustível, cartões e contas."
        actions={
          <Button asChild variant="outline">
            <Link to="/acoes">Ver ações</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-[180px_1fr_1fr_1fr_180px_auto]">
        <Input
          type="month"
          aria-label="Mês"
          value={filters.month}
          onChange={(event) => updateFilter("month", event.target.value)}
        />
        <Select value={filters.expenseTypeId} onValueChange={(value) => updateFilter("expenseTypeId", value)}>
          <SelectTrigger aria-label="Tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(typesQuery.data ?? []).map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.consultantId} onValueChange={(value) => updateFilter("consultantId", value)}>
          <SelectTrigger aria-label="Consultor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os consultores</SelectItem>
            {(consultantsQuery.data ?? []).map((consultant) => (
              <SelectItem key={consultant.id} value={consultant.id}>
                {consultant.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.operatorId} onValueChange={(value) => updateFilter("operatorId", value)}>
          <SelectTrigger aria-label="Bandeira">
            <SelectValue />
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
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilter("status", value as ExpenseReportFilters["status"])}
        >
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Não canceladas</SelectItem>
            {Object.entries(EXPENSE_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filters.month ? (
          <Button type="button" variant="ghost" onClick={() => updateFilter("month", "")}>
            Todos os meses
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {summary.byType.length === 0 ? (
              <p className="text-muted-foreground">Sem despesas no período.</p>
            ) : (
              summary.byType.map((entry) => (
                <button
                  key={entry.typeId}
                  type="button"
                  className="flex w-full justify-between gap-2 text-left hover:underline"
                  onClick={() => updateFilter("expenseTypeId", entry.typeId)}
                >
                  <span>
                    {typeNames.get(entry.typeId) ?? "—"}{" "}
                    <span className="text-xs text-muted-foreground">({entry.count})</span>
                  </span>
                  <span className="text-muted-foreground">
                    {formatMoney(entry.planned)} / {formatMoney(entry.paid)}
                  </span>
                </button>
              ))
            )}
            {summary.byType.length > 0 ? (
              <p className="pt-1 text-xs text-muted-foreground">previsto / pago — clique para filtrar</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {reportQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando despesas…</p> : null}
      {reportQuery.isError ? (
        <p className="text-sm text-destructive">
          {reportQuery.error instanceof Error ? reportQuery.error.message : "Erro ao carregar despesas."}
        </p>
      ) : null}

      {reportQuery.data && rows.length === 0 ? (
        <EmptyState
          title="Nenhuma despesa encontrada"
          description="Lance despesas dentro de uma ação (Operações e Ações → Abrir → Lançar despesa)."
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Ação</th>
                <th className="px-3 py-2 font-medium">Consultor</th>
                <th className="px-3 py-2 font-medium">Detalhe</th>
                <th className="px-3 py-2 font-medium">Período</th>
                <th className="px-3 py-2 font-medium">Previsto</th>
                <th className="px-3 py-2 font-medium">Pago</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.expense_id} className="border-b align-top last:border-0">
                  <td className="px-3 py-2 font-medium">{typeNames.get(row.expense_type_id) ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link to={`/acoes/${row.action_id}`} className="underline-offset-2 hover:underline">
                      {row.action_title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {row.operator_id ? operatorNames.get(row.operator_id) ?? "—" : "Sem bandeira"}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {row.consultant_id ? consultantNames.get(row.consultant_id) ?? "—" : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.supplier ? <div className="text-foreground">{row.supplier}</div> : null}
                    {row.description ? <div>{row.description}</div> : null}
                    {row.origin || row.destination ? (
                      <div>
                        {row.origin ?? "—"} → {row.destination ?? "—"}
                      </div>
                    ) : null}
                    {row.booking_code ? <div>Reserva: {row.booking_code}</div> : null}
                    {row.payment_method ? <div>{row.payment_method}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.period_start || row.period_end
                      ? formatPeriod(row.period_start, row.period_end)
                      : formatDate(row.expense_date)}
                  </td>
                  <td className="px-3 py-2">{formatMoney(row.planned_amount)}</td>
                  <td className="px-3 py-2">
                    {row.status === "paid" ? formatMoney(row.actual_amount) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={expenseStatusVariant(row.status)}>{EXPENSE_STATUS_LABEL[row.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageContainer>
  );
}
