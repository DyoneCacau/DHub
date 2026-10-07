import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { canManageConsultantLinks } from "@/features/catalogs/utils/permissions";
import { ConsultantLinksCard } from "@/features/consultants/components/consultant-links-card";
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import {
  getConsultant,
  listMerchantsByConsultant,
  setConsultantStatus,
} from "@/features/consultants/api/consultant-service";
import {
  canManageConsultants,
  canToggleConsultantStatus,
} from "@/features/consultants/utils/permissions";

export function ConsultantDetailPage() {
  const { consultantId } = useParams();
  const { organization, role } = useAuth();
  const queryClient = useQueryClient();
  const canManage = canManageConsultants(role);

  const detailQuery = useQuery({
    queryKey: consultantQueryKeys.detail(consultantId ?? ""),
    queryFn: () => getConsultant(consultantId!),
    enabled: Boolean(consultantId) && canManage,
  });

  const merchantsQuery = useQuery({
    queryKey: [...consultantQueryKeys.detail(consultantId ?? ""), "merchants"],
    queryFn: () => listMerchantsByConsultant(consultantId!),
    enabled: Boolean(consultantId) && canManage && Boolean(detailQuery.data),
  });

  const statusMutation = useMutation({
    mutationFn: (next: "active" | "inactive") => setConsultantStatus(consultantId!, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consultantQueryKeys.root });
    },
  });

  if (!canManage) {
    return (
      <PageContainer>
        <EmptyState title="Acesso negado" description="Sem permissão para este consultor." />
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
        <EmptyState
          title="Consultor não encontrado"
          description="O registro não existe ou você não tem acesso."
        />
      </PageContainer>
    );
  }

  const row = detailQuery.data;

  return (
    <PageContainer>
      <PageHeader
        title={row.full_name}
        description="Detalhe operacional do consultor"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/consultores">Voltar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/consultores/${row.id}/editar`}>Editar</Link>
            </Button>
            {canToggleConsultantStatus(role) ? (
              <Button
                variant="secondary"
                disabled={statusMutation.isPending}
                onClick={() => {
                  const next = row.status === "active" ? "inactive" : "active";
                  if (window.confirm(`Confirma ${next === "inactive" ? "inativar" : "ativar"}?`)) {
                    statusMutation.mutate(next);
                  }
                }}
              >
                {row.status === "active" ? "Inativar" : "Ativar"}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados principais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Status: </span>
              <Badge variant={row.status === "active" ? "default" : "outline"}>
                {row.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
            </p>
            <p>
              <span className="text-muted-foreground">E-mail: </span>
              {row.email || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Telefone: </span>
              {row.phone || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Documento: </span>
              {row.document || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Usuário vinculado: </span>
              {row.user_id ? "Sim" : "Não"}
            </p>
            <p>
              <span className="text-muted-foreground">Lojistas: </span>
              {row.merchant_count} ({row.active_merchant_count} ativos)
            </p>
            <p>
              <span className="text-muted-foreground">Criado em: </span>
              {new Date(row.created_at).toLocaleString("pt-BR")}
            </p>
            <p>
              <span className="text-muted-foreground">Atualizado em: </span>
              {new Date(row.updated_at).toLocaleString("pt-BR")}
            </p>
            {row.notes ? (
              <p>
                <span className="text-muted-foreground">Observações: </span>
                {row.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lojistas associados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {merchantsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : null}
            {merchantsQuery.data && merchantsQuery.data.length === 0 ? (
              <EmptyState
                title="Sem lojistas"
                description="Nenhum lojista vinculado a este consultor."
              />
            ) : null}
            <ul className="space-y-2 text-sm">
              {(merchantsQuery.data ?? []).map((merchant) => (
                <li key={merchant.id} className="flex items-center justify-between gap-2">
                  <Link className="font-medium underline-offset-2 hover:underline" to={`/lojistas/${merchant.id}`}>
                    {merchant.trade_name || merchant.legal_name}
                  </Link>
                  <Badge variant={merchant.status === "active" ? "default" : "outline"}>
                    {merchant.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <ConsultantLinksCard
          organizationId={organization?.id ?? ""}
          consultantId={row.id}
          canManage={canManageConsultantLinks(role)}
        />
      </div>
    </PageContainer>
  );
}
