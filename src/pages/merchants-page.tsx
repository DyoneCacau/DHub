import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListPagination } from "@/components/shared/list-pagination";
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
import { useAuth } from "@/features/auth/hooks/use-auth";
import { listActiveConsultantsForSelect } from "@/features/consultants/api/consultant-service";
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import {
  canCreateMerchant,
  canManageAllMerchants,
  canToggleMerchantStatus,
} from "@/features/consultants/utils/permissions";
import { merchantQueryKeys } from "@/features/merchants/api/query-keys";
import { listMerchants, setMerchantStatus } from "@/features/merchants/api/merchant-service";
import type { MerchantFilters, MerchantStatus } from "@/features/merchants/types/merchant";

const PAGE_SIZE = 20;

export function MerchantsPage() {
  const { organization, role } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = organization?.id ?? "";
  const canFilterConsultant = canManageAllMerchants(role);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MerchantFilters["status"]>("all");
  const [consultantId, setConsultantId] = useState<MerchantFilters["consultantId"]>("all");
  const [state, setState] = useState<MerchantFilters["state"]>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const filters = useMemo<MerchantFilters>(
    () => ({
      search,
      status,
      consultantId: canFilterConsultant ? consultantId : "all",
      state,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, status, consultantId, state, page, canFilterConsultant],
  );

  const consultantsQuery = useQuery({
    queryKey: [...consultantQueryKeys.root, "select", organizationId],
    queryFn: () => listActiveConsultantsForSelect(organizationId),
    enabled: Boolean(organizationId) && canFilterConsultant,
  });

  const listQuery = useQuery({
    queryKey: merchantQueryKeys.list(organizationId, filters),
    queryFn: () => listMerchants(organizationId, filters),
    enabled: Boolean(organizationId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: MerchantStatus }) =>
      setMerchantStatus(id, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: merchantQueryKeys.root });
    },
  });

  return (
    <PageContainer>
      <PageHeader
        title="Lojistas"
        description="Clientes finais vinculados aos consultores. Sem login no MVP."
        actions={
          canCreateMerchant(role) ? (
            <Button asChild>
              <Link to="/lojistas/novo">
                <Plus className="size-4" />
                Novo lojista
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          type="search"
          placeholder="Razão social, fantasia, documento, telefone ou cidade"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as MerchantFilters["status"]);
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
        {canFilterConsultant ? (
          <Select
            value={consultantId}
            onValueChange={(value) => {
              setConsultantId(value as MerchantFilters["consultantId"]);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Consultor" />
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
        ) : null}
        <Input
          placeholder="UF (ex.: SP)"
          maxLength={2}
          value={state === "all" ? "" : state}
          onChange={(event) => {
            const value = event.target.value.trim().toUpperCase();
            setState(value ? value : "all");
            setPage(1);
          }}
        />
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando lojistas…</p>
      ) : null}
      {listQuery.isError ? (
        <p className="text-sm text-destructive">
          {listQuery.error instanceof Error ? listQuery.error.message : "Erro ao carregar."}
        </p>
      ) : null}
      {listQuery.data && listQuery.data.rows.length === 0 ? (
        <EmptyState
          title="Nenhum lojista encontrado"
          description="Ajuste os filtros ou cadastre um novo lojista."
        />
      ) : null}

      {listQuery.data && listQuery.data.rows.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Lojista</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Consultor</th>
                  <th className="px-4 py-3 font-medium">Cidade/UF</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.data.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.trade_name || row.legal_name}</div>
                      {row.trade_name ? (
                        <div className="text-muted-foreground">{row.legal_name}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{row.document || "—"}</td>
                    <td className="px-4 py-3">{row.consultant_name || "—"}</td>
                    <td className="px-4 py-3">
                      {[row.city, row.state].filter(Boolean).join("/") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{row.phone || "—"}</div>
                      <div>{row.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "active" ? "default" : "outline"}>
                        {row.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/lojistas/${row.id}`}>Ver</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/lojistas/${row.id}/editar`}>Editar</Link>
                        </Button>
                        {canToggleMerchantStatus(role) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              const next = row.status === "active" ? "inactive" : "active";
                              if (
                                window.confirm(
                                  `Confirma ${next === "inactive" ? "inativar" : "ativar"} este lojista?`,
                                )
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
