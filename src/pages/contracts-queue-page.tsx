import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/features/actions/utils/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import { listOperators } from "@/features/catalogs/api/catalog-service";
import { getQueueCounts, listContracts } from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import type { ContractFilters } from "@/features/contracts/types/contract";
import {
  CONTRACT_STATUS_LABEL,
  contractStatusVariant,
  daysSince,
  formatAge,
  formatDateTime,
} from "@/features/contracts/utils/contract-status";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

type QueueTab = "review" | "pending";

export function ContractsQueuePage() {
  const { organization } = useAuth();
  const organizationId = organization?.id ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: QueueTab = searchParams.get("aba") === "pendentes" ? "pending" : "review";

  const [operatorId, setOperatorId] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filters = useMemo<ContractFilters>(
    () => ({
      regionId: "all",
      consultantId: "all",
      operatorId,
      merchantId: "all",
      month: "",
      status: tab === "review" ? "queue" : "pending_correction",
      search: "",
      order: "oldest_received",
      page,
      pageSize: PAGE_SIZE,
    }),
    [operatorId, tab, page],
  );

  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled: Boolean(organizationId),
  });
  const countsQuery = useQuery({
    queryKey: contractQueryKeys.queueCounts(organizationId),
    queryFn: () => getQueueCounts(organizationId),
    enabled: Boolean(organizationId),
  });
  const listQuery = useQuery({
    queryKey: contractQueryKeys.list(organizationId, filters),
    queryFn: () => listContracts(organizationId, filters),
    enabled: Boolean(organizationId),
  });

  const changeTab = (next: QueueTab) => {
    setPage(1);
    setSearchParams(next === "pending" ? { aba: "pendentes" } : {});
  };

  return (
    <PageContainer>
      <PageHeader
        title="Fila de conferência"
        description="Um só lugar para o que chegou nos WhatsApps — do mais antigo para o mais novo."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/contratos">Pastas</Link>
            </Button>
            <Button asChild>
              <Link to="/contratos/receber">
                <Plus className="size-4" />
                Receber contrato
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border p-1">
          {(
            [
              ["review", `Aguardando conferência (${countsQuery.data?.inReview ?? "…"})`],
              ["pending", `Pendentes de correção (${countsQuery.data?.pending ?? "…"})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => changeTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <Select
          value={operatorId}
          onValueChange={(value) => {
            setOperatorId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]" aria-label="Bandeira">
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
      </div>

      {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
      {listQuery.isError ? (
        <p className="text-sm text-destructive">
          {listQuery.error instanceof Error ? listQuery.error.message : "Erro ao carregar a fila."}
        </p>
      ) : null}

      {listQuery.data && listQuery.data.rows.length === 0 ? (
        <EmptyState
          title={tab === "review" ? "Fila vazia" : "Nenhuma pendência aguardando"}
          description={
            tab === "review"
              ? "Tudo conferido. Novos contratos entram aqui ao serem recebidos."
              : "Nenhum contrato aguardando correção do consultor."
          }
        />
      ) : null}

      {listQuery.data && listQuery.data.rows.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{tab === "review" ? "Esperando há" : "Pendente há"}</th>
                  <th className="px-4 py-3 font-medium">Lojista</th>
                  <th className="px-4 py-3 font-medium">Bandeira</th>
                  <th className="px-4 py-3 font-medium">Consultor</th>
                  <th className="px-4 py-3 font-medium">Assinatura</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {listQuery.data.rows.map((row) => {
                  const since = tab === "review" ? row.received_at : row.status_changed_at;
                  const days = daysSince(since) ?? 0;
                  return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className={cn("font-medium", days >= 3 && "text-destructive")}>{formatAge(since)}</span>
                        <div className="text-xs text-muted-foreground">{formatDateTime(since)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.merchant_trade_name ?? row.merchant_legal_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.region_name ?? "sem região"} · {row.document_count} arquivo(s)
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.operator_name}</td>
                      <td className="px-4 py-3">{row.consultant_name}</td>
                      <td className="px-4 py-3">{formatDate(row.signed_on)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={contractStatusVariant(row.status)}>{CONTRACT_STATUS_LABEL[row.status]}</Badge>
                        {row.open_pendency_count > 0 ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.open_pendency_count} pendência(s) aberta(s)
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild size="sm">
                          <Link to={`/contratos/${row.id}`}>{tab === "review" ? "Conferir" : "Abrir"}</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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
