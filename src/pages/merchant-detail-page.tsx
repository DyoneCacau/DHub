import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { MerchantContractsCard } from "@/features/contracts/components/merchant-contracts-card";
import { listActiveConsultantsForSelect } from "@/features/consultants/api/consultant-service";
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import {
  canChangeMerchantConsultant,
  canToggleMerchantStatus,
} from "@/features/consultants/utils/permissions";
import { merchantQueryKeys } from "@/features/merchants/api/query-keys";
import {
  changeMerchantConsultant,
  getMerchant,
  setMerchantStatus,
} from "@/features/merchants/api/merchant-service";

export function MerchantDetailPage() {
  const { merchantId } = useParams();
  const { organization, role } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = organization?.id ?? "";
  const [transferId, setTransferId] = useState<string>("");

  const detailQuery = useQuery({
    queryKey: merchantQueryKeys.detail(merchantId ?? ""),
    queryFn: () => getMerchant(merchantId!),
    enabled: Boolean(merchantId),
  });

  const consultantsQuery = useQuery({
    queryKey: [...consultantQueryKeys.root, "select-active", organizationId],
    queryFn: () => listActiveConsultantsForSelect(organizationId),
    enabled: Boolean(organizationId) && canChangeMerchantConsultant(role),
  });

  const statusMutation = useMutation({
    mutationFn: (next: "active" | "inactive") => setMerchantStatus(merchantId!, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: merchantQueryKeys.root });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (consultantId: string) => changeMerchantConsultant(merchantId!, consultantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: merchantQueryKeys.root });
      await queryClient.invalidateQueries({ queryKey: consultantQueryKeys.root });
      setTransferId("");
    },
  });

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
          title="Lojista não encontrado"
          description="O registro não existe ou você não tem acesso."
        />
      </PageContainer>
    );
  }

  const row = detailQuery.data;

  return (
    <PageContainer>
      <PageHeader
        title={row.trade_name || row.legal_name}
        description={row.trade_name ? row.legal_name : "Detalhe do lojista"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/lojistas">Voltar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/lojistas/${row.id}/editar`}>Editar</Link>
            </Button>
            {canToggleMerchantStatus(role) ? (
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
              <span className="text-muted-foreground">Consultor: </span>
              {row.consultant_name || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Documento: </span>
              {row.document || "—"}
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
              <span className="text-muted-foreground">WhatsApp: </span>
              {row.whatsapp || "—"}
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
            <CardTitle className="text-base">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {[row.street, row.number, row.complement].filter(Boolean).join(", ") || "—"}
            </p>
            <p>
              {[row.district, row.city, row.state, row.postal_code].filter(Boolean).join(" · ") ||
                "—"}
            </p>
          </CardContent>
        </Card>

        {canChangeMerchantConsultant(role) ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trocar consultor</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Select value={transferId || undefined} onValueChange={setTransferId}>
                <SelectTrigger>
                  <SelectValue placeholder="Novo consultor ativo" />
                </SelectTrigger>
                <SelectContent>
                  {(consultantsQuery.data ?? [])
                    .filter((c) => c.id !== row.consultant_id)
                    .map((consultant) => (
                      <SelectItem key={consultant.id} value={consultant.id}>
                        {consultant.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!transferId || transferMutation.isPending}
                onClick={() => {
                  if (window.confirm("Confirma a troca de consultor responsável?")) {
                    transferMutation.mutate(transferId);
                  }
                }}
              >
                Confirmar troca
              </Button>
              {transferMutation.isError ? (
                <p className="text-sm text-destructive">
                  {transferMutation.error instanceof Error
                    ? transferMutation.error.message
                    : "Falha na troca."}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {role === "admin" || role === "operator" ? (
          <MerchantContractsCard organizationId={organizationId} merchantId={merchantId ?? ""} />
        ) : null}
      </div>
    </PageContainer>
  );
}
