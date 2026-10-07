import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, ClipboardCheck, Folder, Inbox, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListPagination } from "@/components/shared/list-pagination";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatMonth } from "@/features/actions/utils/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import { listOperators, listRegions } from "@/features/catalogs/api/catalog-service";
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import { listConsultantsForSelect } from "@/features/consultants/api/consultant-service";
import {
  getQueueCounts,
  listContracts,
  listFolderSummary,
} from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import type {
  ContractFilters,
  ContractFolderSummaryRow,
  ContractStatusFilter,
} from "@/features/contracts/types/contract";
import {
  CONTRACT_STATUS_LABEL,
  contractStatusVariant,
  formatDateTime,
} from "@/features/contracts/utils/contract-status";
import { NO_REGION, folderSearch, type FolderPath } from "@/features/contracts/utils/folders";

const PAGE_SIZE = 20;

interface FolderEntry {
  key: string;
  label: string;
  total: number;
  inReview: number;
  pending: number;
  to: string;
}

function aggregate(
  rows: ContractFolderSummaryRow[],
  keyOf: (row: ContractFolderSummaryRow) => string,
): Map<string, { total: number; inReview: number; pending: number }> {
  const result = new Map<string, { total: number; inReview: number; pending: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    const entry = result.get(key) ?? { total: 0, inReview: 0, pending: 0 };
    entry.total += row.total;
    entry.inReview += row.in_review;
    entry.pending += row.pending;
    result.set(key, entry);
  }
  return result;
}

export function ContractsPage() {
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const isAdmin = role === "admin";
  const [searchParams] = useSearchParams();

  const path: FolderPath = {
    regionId: searchParams.get("r"),
    consultantId: searchParams.get("c"),
    operatorId: searchParams.get("o"),
    month: searchParams.get("m"),
  };

  const [status, setStatus] = useState<ContractStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pathKey = searchParams.toString();
  const [lastPathKey, setLastPathKey] = useState(pathKey);
  if (pathKey !== lastPathKey) {
    setLastPathKey(pathKey);
    setPage(1);
  }

  const filters = useMemo<ContractFilters>(
    () => ({
      regionId: path.regionId ?? "all",
      consultantId: path.consultantId ?? "all",
      operatorId: path.operatorId ?? "all",
      merchantId: "all",
      month: path.month ?? "",
      status,
      search,
      order: "recent",
      page,
      pageSize: PAGE_SIZE,
    }),
    [path.regionId, path.consultantId, path.operatorId, path.month, status, search, page],
  );

  const regionsQuery = useQuery({
    queryKey: catalogQueryKeys.regions(organizationId),
    queryFn: () => listRegions(organizationId),
    enabled: Boolean(organizationId),
  });
  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled: Boolean(organizationId),
  });
  const consultantsQuery = useQuery({
    queryKey: [...consultantQueryKeys.root, "select-all", organizationId],
    queryFn: () => listConsultantsForSelect(organizationId),
    enabled: Boolean(organizationId),
  });
  const foldersQuery = useQuery({
    queryKey: contractQueryKeys.folders(organizationId),
    queryFn: () => listFolderSummary(organizationId),
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

  const regionNames = new Map((regionsQuery.data ?? []).map((r) => [r.id, r.name]));
  const operatorNames = new Map((operatorsQuery.data ?? []).map((o) => [o.id, o.name]));
  const consultantNames = new Map((consultantsQuery.data ?? []).map((c) => [c.id, c.full_name]));

  const regionLabel = (id: string) => (id === NO_REGION ? "Sem região" : regionNames.get(id) ?? "—");

  const scopedRows = (foldersQuery.data ?? []).filter(
    (row) =>
      (!path.regionId || (row.region_id ?? NO_REGION) === path.regionId) &&
      (!path.consultantId || row.consultant_id === path.consultantId) &&
      (!path.operatorId || row.operator_id === path.operatorId),
  );

  let folders: FolderEntry[] = [];
  let levelTitle = "";
  const byLabel = (a: FolderEntry, b: FolderEntry) => a.label.localeCompare(b.label, "pt-BR");
  if (!path.regionId) {
    levelTitle = "Estados";
    folders = [...aggregate(scopedRows, (row) => row.region_id ?? NO_REGION)].map(([key, totals]) => ({
      key,
      label: regionLabel(key),
      ...totals,
      to: `/contratos${folderSearch({ regionId: key })}`,
    })).sort(byLabel);
  } else if (!path.consultantId) {
    levelTitle = "Consultores";
    folders = [...aggregate(scopedRows, (row) => row.consultant_id)].map(([key, totals]) => ({
      key,
      label: consultantNames.get(key) ?? "—",
      ...totals,
      to: `/contratos${folderSearch({ regionId: path.regionId, consultantId: key })}`,
    })).sort(byLabel);
  } else if (!path.operatorId) {
    levelTitle = "Bandeiras";
    folders = [...aggregate(scopedRows, (row) => row.operator_id)].map(([key, totals]) => ({
      key,
      label: operatorNames.get(key) ?? "—",
      ...totals,
      to: `/contratos${folderSearch({ ...path, operatorId: key })}`,
    })).sort(byLabel);
  } else if (!path.month) {
    levelTitle = "Meses (data da assinatura)";
    folders = [...aggregate(scopedRows, (row) => row.reference_month.slice(0, 7))]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, totals]) => ({
        key,
        label: formatMonth(key),
        ...totals,
        to: `/contratos${folderSearch({ ...path, month: key })}`,
      }));
  }
  const crumbs: Array<{ label: string; to: string }> = [{ label: "Todos os estados", to: "/contratos" }];
  if (path.regionId) {
    crumbs.push({ label: regionLabel(path.regionId), to: `/contratos${folderSearch({ regionId: path.regionId })}` });
  }
  if (path.regionId && path.consultantId) {
    crumbs.push({
      label: consultantNames.get(path.consultantId) ?? "—",
      to: `/contratos${folderSearch({ regionId: path.regionId, consultantId: path.consultantId })}`,
    });
  }
  if (path.regionId && path.consultantId && path.operatorId) {
    crumbs.push({
      label: operatorNames.get(path.operatorId) ?? "—",
      to: `/contratos${folderSearch({ ...path, month: null })}`,
    });
  }
  if (path.regionId && path.consultantId && path.operatorId && path.month) {
    crumbs.push({ label: formatMonth(path.month), to: `/contratos${folderSearch(path)}` });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Contratos"
        description="Pastas por estado → consultor → bandeira → mês da assinatura, montadas automaticamente."
        actions={
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <Button asChild variant="outline">
                <Link to="/contratos/canais">Canais</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/contratos/fila">Fila de conferência</Link>
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

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Link to="/contratos/fila">
          <StatCard
            title="Aguardando conferência"
            value={String(countsQuery.data?.inReview ?? "—")}
            hint="Inclui correções recebidas"
            icon={ClipboardCheck}
            demo={false}
          />
        </Link>
        <Link to="/contratos/fila?aba=pendentes">
          <StatCard
            title="Pendentes de correção"
            value={String(countsQuery.data?.pending ?? "—")}
            hint="Aguardando o consultor reenviar"
            icon={AlertTriangle}
            demo={false}
          />
        </Link>
      </div>

      <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <span key={crumb.to} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="size-3" /> : null}
            {index === crumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-foreground hover:underline">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {levelTitle ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">{levelTitle}</h2>
          {foldersQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando pastas…</p> : null}
          {!foldersQuery.isLoading && folders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pasta ainda — receba o primeiro contrato.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder) => (
              <Link
                key={folder.key}
                to={folder.to}
                className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted"
              >
                <Folder className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{folder.label}</p>
                  <p className="text-xs text-muted-foreground">{folder.total} contrato(s)</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {folder.inReview > 0 ? <Badge>{folder.inReview} na fila</Badge> : null}
                    {folder.pending > 0 ? <Badge variant="warning">{folder.pending} pendente(s)</Badge> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-3 grid gap-3 md:grid-cols-[220px_1fr]">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ContractStatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="queue">Na fila de conferência</SelectItem>
            {Object.entries(CONTRACT_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="search"
          placeholder="Buscar lojista por nome ou CNPJ"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando contratos…</p> : null}
      {listQuery.isError ? (
        <p className="text-sm text-destructive">
          {listQuery.error instanceof Error ? listQuery.error.message : "Erro ao carregar contratos."}
        </p>
      ) : null}

      {listQuery.data && listQuery.data.rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nenhum contrato nesta pasta"
          description="Use “Receber contrato” para registrar o que chegou pelo WhatsApp."
        />
      ) : null}

      {listQuery.data && listQuery.data.rows.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Lojista</th>
                  <th className="px-4 py-3 font-medium">Bandeira</th>
                  <th className="px-4 py-3 font-medium">Consultor</th>
                  <th className="px-4 py-3 font-medium">Assinatura</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Arquivos</th>
                  <th className="px-4 py-3 font-medium">Recebido</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {listQuery.data.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.merchant_trade_name ?? row.merchant_legal_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.merchant_document ?? row.merchant_legal_name}
                        {row.region_name ? ` · ${row.region_name}` : " · sem região"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.operator_name}</td>
                    <td className="px-4 py-3">{row.consultant_name}</td>
                    <td className="px-4 py-3">{formatDate(row.signed_on)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={contractStatusVariant(row.status)}>{CONTRACT_STATUS_LABEL[row.status]}</Badge>
                      {row.open_pendency_count > 0 ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {row.open_pendency_count} pendência(s)
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{row.document_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(row.received_at)}</td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/contratos/${row.id}`}>Abrir</Link>
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
