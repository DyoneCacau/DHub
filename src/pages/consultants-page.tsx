import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { ListPagination } from "@/components/shared/list-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
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
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import {
  listConsultantIdsByFilter,
  listConsultantLinks,
  listOperators,
  listRegions,
} from "@/features/catalogs/api/catalog-service";
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import {
  listConsultants,
  setConsultantStatus,
} from "@/features/consultants/api/consultant-service";
import {
  canManageConsultants,
  canToggleConsultantStatus,
} from "@/features/consultants/utils/permissions";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { ConsultantFilters, ConsultantStatus } from "@/features/consultants/types/consultant";

const PAGE_SIZE = 20;

export function ConsultantsPage() {
  const { organization, role } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = organization?.id ?? "";
  const canManage = canManageConsultants(role);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ConsultantFilters["status"]>("all");
  const [regionId, setRegionId] = useState<ConsultantFilters["regionId"]>("all");
  const [operatorId, setOperatorId] = useState<ConsultantFilters["operatorId"]>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const filters = useMemo<ConsultantFilters>(
    () => ({ search, status, regionId, operatorId, page, pageSize: PAGE_SIZE }),
    [search, status, regionId, operatorId, page],
  );

  const regionsQuery = useQuery({
    queryKey: catalogQueryKeys.regions(organizationId),
    queryFn: () => listRegions(organizationId),
    enabled: Boolean(organizationId) && canManage,
  });

  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled: Boolean(organizationId) && canManage,
  });

  const regionFilter = regionId === "all" ? null : regionId;
  const operatorFilter = operatorId === "all" ? null : operatorId;

  const idsQuery = useQuery({
    queryKey: catalogQueryKeys.consultantIdsByFilter(organizationId, regionId, operatorId),
    queryFn: () => listConsultantIdsByFilter(organizationId, regionFilter, operatorFilter),
    enabled: Boolean(organizationId) && canManage,
  });

  const listQuery = useQuery({
    queryKey: [...consultantQueryKeys.list(organizationId, filters), idsQuery.data ?? null],
    queryFn: () => listConsultants(organizationId, filters, idsQuery.data ?? null),
    enabled: Boolean(organizationId) && canManage && idsQuery.isSuccess,
  });

  const rowIds = useMemo(() => (listQuery.data?.rows ?? []).map((row) => row.id), [listQuery.data]);

  const linksQuery = useQuery({
    queryKey: catalogQueryKeys.consultantLinks(rowIds),
    queryFn: () => listConsultantLinks(rowIds),
    enabled: rowIds.length > 0,
  });

  const linkLabels = useMemo(() => {
    const regionNames = new Map((regionsQuery.data ?? []).map((r) => [r.id, r.name]));
    const operatorNames = new Map((operatorsQuery.data ?? []).map((o) => [o.id, o.name]));
    const byConsultant = new Map<string, { regions: string[]; operators: string[] }>();
    const entry = (id: string) => {
      let value = byConsultant.get(id);
      if (!value) {
        value = { regions: [], operators: [] };
        byConsultant.set(id, value);
      }
      return value;
    };
    for (const link of linksQuery.data?.regions ?? []) {
      const name = regionNames.get(link.region_id);
      if (name) entry(link.consultant_id).regions.push(name);
    }
    for (const link of linksQuery.data?.operators ?? []) {
      const name = operatorNames.get(link.operator_id);
      if (name) entry(link.consultant_id).operators.push(name);
    }
    return byConsultant;
  }, [linksQuery.data, regionsQuery.data, operatorsQuery.data]);

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ConsultantStatus }) =>
      setConsultantStatus(id, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consultantQueryKeys.root });
    },
  });

  if (!canManage) {
    return (
      <PageContainer>
        <PageHeader title="Consultores" description="Acesso restrito ao escritório." />
        <EmptyState
          title="Sem permissão"
          description="Consultores da organização são geridos por administradores e operadores."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Consultores"
        description="Cadastro operacional distinto do acesso ao sistema (membership)."
        actions={
          <Button asChild>
            <Link to="/consultores/novo">
              <Plus className="size-4" />
              Novo consultor
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_200px_200px]">
        <Input
          type="search"
          placeholder="Buscar por nome, e-mail ou telefone"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ConsultantFilters["status"]);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={regionId}
          onValueChange={(value) => {
            setRegionId(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Região" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as regiões</SelectItem>
            {(regionsQuery.data ?? []).map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
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
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando consultores…</p>
      ) : null}

      {listQuery.isError ? (
        <p className="text-sm text-destructive">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : "Erro ao carregar consultores."}
        </p>
      ) : null}

      {listQuery.data && listQuery.data.rows.length === 0 ? (
        <EmptyState
          title="Nenhum consultor encontrado"
          description="Cadastre o primeiro consultor operacional da organização."
        />
      ) : null}

      {listQuery.data && listQuery.data.rows.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Regiões / Bandeiras</th>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Lojistas</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.data.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{row.email || "—"}</div>
                      <div>{row.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{linkLabels.get(row.id)?.regions.join(", ") || "—"}</div>
                      <div>{linkLabels.get(row.id)?.operators.join(", ") || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.user_id ? (
                        <Badge variant="secondary">Vinculado</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.merchant_count}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "active" ? "default" : "outline"}>
                        {row.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/consultores/${row.id}`}>Ver</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/consultores/${row.id}/editar`}>Editar</Link>
                        </Button>
                        {canToggleConsultantStatus(role) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              const next = row.status === "active" ? "inactive" : "active";
                              const label = next === "inactive" ? "inativar" : "ativar";
                              if (
                                window.confirm(`Confirma ${label} o consultor ${row.full_name}?`)
                              ) {
                                statusMutation.mutate({ id: row.id, next });
                              }
                            }}
                          >
                            {row.status === "active" ? "Inativar" : "Ativar"}
                          </Button>
                        ) : null}
                      </div>
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
