import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatMonth } from "@/features/actions/utils/format";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import { listOperators } from "@/features/catalogs/api/catalog-service";
import { getContract, updateContract } from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import { ContractDocumentsCard } from "@/features/contracts/components/contract-documents-card";
import { ContractHistoryCard } from "@/features/contracts/components/contract-history-card";
import { ContractPendenciesCard } from "@/features/contracts/components/contract-pendencies-card";
import { ContractStatusCard } from "@/features/contracts/components/contract-status-card";
import {
  contractEditSchema,
  type ContractEditValues,
} from "@/features/contracts/schemas/contract-schemas";
import type { ContractOverview } from "@/features/contracts/types/contract";
import {
  CLOSED_STATUSES,
  CONTRACT_STATUS_LABEL,
  contractStatusVariant,
  formatDateTime,
} from "@/features/contracts/utils/contract-status";
import { folderLink } from "@/features/contracts/utils/folders";

function ContractDataCard({ contract }: { contract: ContractOverview }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(contract.organization_id),
    queryFn: () => listOperators(contract.organization_id),
    enabled: editing,
  });

  const form = useForm<ContractEditValues>({
    resolver: zodResolver(contractEditSchema),
    defaultValues: {
      operator_id: contract.operator_id,
      signed_on: contract.signed_on,
      plan_name: contract.plan_name ?? "",
      notes: contract.notes ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ContractEditValues) =>
      updateContract(contract.id, {
        merchant_id: contract.merchant_id,
        operator_id: values.operator_id,
        signed_on: values.signed_on,
        plan_name: values.plan_name || null,
        notes: values.notes || null,
      }),
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.root });
    },
  });

  const operators = (operatorsQuery.data ?? []).filter(
    (o) => o.status === "active" || o.id === contract.operator_id,
  );
  const canEdit = !CLOSED_STATUSES.includes(contract.status);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Dados do contrato</CardTitle>
        {canEdit && !editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              form.reset({
                operator_id: contract.operator_id,
                signed_on: contract.signed_on,
                plan_name: contract.plan_name ?? "",
                notes: contract.notes ?? "",
              });
              mutation.reset();
              setEditing(true);
            }}
          >
            Editar
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Lojista: </span>
          <Link to={`/lojistas/${contract.merchant_id}`} className="font-medium hover:underline">
            {contract.merchant_trade_name ?? contract.merchant_legal_name}
          </Link>
          {contract.merchant_document ? (
            <span className="text-muted-foreground"> · {contract.merchant_document}</span>
          ) : null}
        </p>
        <p>
          <span className="text-muted-foreground">Consultor: </span>
          {contract.consultant_name}
        </p>
        <p>
          <span className="text-muted-foreground">Região: </span>
          {contract.region_name ?? (
            <span className="italic text-muted-foreground">
              Sem região — {contract.merchant_state ? `UF ${contract.merchant_state} sem região cadastrada` : "lojista sem UF"}
            </span>
          )}
        </p>
        <p>
          <span className="text-muted-foreground">Recebido em: </span>
          {formatDateTime(contract.received_at)}
        </p>

        {editing ? (
          <form
            className="mt-3 grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label>Bandeira</Label>
              <Controller
                control={form.control}
                name="operator_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((operator) => (
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
              <Label htmlFor="edit-signed-on">Data da assinatura</Label>
              <Input id="edit-signed-on" type="date" {...form.register("signed_on")} />
              {form.formState.errors.signed_on ? (
                <p className="text-destructive">{form.formState.errors.signed_on.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan">Plano</Label>
              <Input id="edit-plan" maxLength={120} {...form.register("plan_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Input id="edit-notes" maxLength={2000} {...form.register("notes")} />
            </div>
            {mutation.isError ? (
              <p className="text-destructive sm:col-span-2">
                {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                Salvar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p>
              <span className="text-muted-foreground">Bandeira: </span>
              {contract.operator_name}
            </p>
            <p>
              <span className="text-muted-foreground">Assinatura: </span>
              {formatDate(contract.signed_on)}{" "}
              <span className="text-muted-foreground">(pasta {formatMonth(contract.reference_month)})</span>
            </p>
            <p>
              <span className="text-muted-foreground">Plano: </span>
              {contract.plan_name ?? "—"}
            </p>
            {contract.notes ? (
              <p>
                <span className="text-muted-foreground">Observações: </span>
                {contract.notes}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();

  const detailQuery = useQuery({
    queryKey: contractQueryKeys.detail(contractId ?? ""),
    queryFn: () => getContract(contractId!),
    enabled: Boolean(contractId),
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
        <EmptyState title="Contrato não encontrado" description="O registro não existe ou você não tem acesso." />
      </PageContainer>
    );
  }

  const contract = detailQuery.data;
  const crumbs: Array<{ label: string; to: string }> = [
    { label: "Contratos", to: "/contratos" },
    { label: contract.region_name ?? "Sem região", to: folderLink(contract, 1) },
    { label: contract.consultant_name, to: folderLink(contract, 2) },
    { label: contract.operator_name, to: folderLink(contract, 3) },
    { label: formatMonth(contract.reference_month), to: folderLink(contract, 4) },
  ];

  return (
    <PageContainer>
      <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <span key={crumb.to} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="size-3" /> : null}
            <Link to={crumb.to} className="hover:text-foreground hover:underline">
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>

      <PageHeader
        title={contract.merchant_trade_name ?? contract.merchant_legal_name}
        description={`${contract.operator_name} · assinado em ${formatDate(contract.signed_on)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={contractStatusVariant(contract.status)}>
              {CONTRACT_STATUS_LABEL[contract.status]}
            </Badge>
            <Button asChild variant="outline">
              <Link to="/contratos/fila">Fila</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ContractDataCard contract={contract} />
        <ContractStatusCard contract={contract} />
        <div className="lg:col-span-2">
          <ContractDocumentsCard contract={contract} />
        </div>
        <ContractPendenciesCard contract={contract} />
        <ContractHistoryCard organizationId={contract.organization_id} contractId={contract.id} />
      </div>
    </PageContainer>
  );
}
