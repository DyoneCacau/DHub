import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  closePendency,
  listPendencies,
  openPendency,
} from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import { pendencyReasonSchema } from "@/features/contracts/schemas/contract-schemas";
import type { ContractOverview, ContractPendency } from "@/features/contracts/types/contract";
import {
  PENDENCY_STATUS_LABEL,
  PENDENCY_SUGGESTIONS,
  formatDateTime,
} from "@/features/contracts/utils/contract-status";

const OPENABLE_STATUSES = ["awaiting_review", "pending_correction", "corrected"];

interface ContractPendenciesCardProps {
  contract: ContractOverview;
}

export function ContractPendenciesCard({ contract }: ContractPendenciesCardProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const listQuery = useQuery({
    queryKey: contractQueryKeys.pendencies(contract.id),
    queryFn: () => listPendencies(contract.id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: contractQueryKeys.root });

  const openMutation = useMutation({
    mutationFn: (value: string) => openPendency(contract.organization_id, contract.id, value),
    onSuccess: async () => {
      setReason("");
      await invalidate();
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ pendency, status }: { pendency: ContractPendency; status: "resolved" | "cancelled" }) =>
      closePendency(pendency.id, status, resolutionNote || null),
    onSuccess: async () => {
      setResolvingId(null);
      setResolutionNote("");
      await invalidate();
    },
  });

  const canOpen = OPENABLE_STATUSES.includes(contract.status);
  const pendencies = listQuery.data ?? [];

  const submit = () => {
    const parsed = pendencyReasonSchema.safeParse(reason);
    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }
    setReasonError(null);
    openMutation.mutate(parsed.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Pendências{" "}
          {contract.open_pendency_count > 0 ? (
            <Badge variant="warning" className="ml-1">
              {contract.open_pendency_count} aberta(s)
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {canOpen ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: Foto ilegível na página 2"
                list="pendency-suggestions"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
              <datalist id="pendency-suggestions">
                {PENDENCY_SUGGESTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <Button type="button" disabled={openMutation.isPending} onClick={submit}>
                Abrir pendência
              </Button>
            </div>
            {reasonError ? <p className="text-destructive">{reasonError}</p> : null}
            {openMutation.isError ? (
              <p className="text-destructive">
                {openMutation.error instanceof Error ? openMutation.error.message : "Erro ao abrir pendência."}
              </p>
            ) : null}
          </div>
        ) : null}

        {listQuery.isLoading ? <p className="text-muted-foreground">Carregando…</p> : null}
        {pendencies.length === 0 && !listQuery.isLoading ? (
          <p className="text-muted-foreground">Nenhuma pendência registrada.</p>
        ) : null}

        <ul className="space-y-2">
          {pendencies.map((pendency) => (
            <li key={pendency.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{pendency.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Aberta em {formatDateTime(pendency.created_at)}
                    {pendency.resolved_at ? ` · encerrada em ${formatDateTime(pendency.resolved_at)}` : ""}
                  </p>
                  {pendency.resolution_note ? (
                    <p className="text-xs text-muted-foreground">Solução: {pendency.resolution_note}</p>
                  ) : null}
                </div>
                <Badge variant={pendency.status === "open" ? "warning" : "outline"}>
                  {PENDENCY_STATUS_LABEL[pendency.status]}
                </Badge>
              </div>

              {pendency.status === "open" ? (
                resolvingId === pendency.id ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Como foi resolvida (opcional)"
                      value={resolutionNote}
                      maxLength={1000}
                      onChange={(event) => setResolutionNote(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={closeMutation.isPending}
                        onClick={() => closeMutation.mutate({ pendency, status: "resolved" })}
                      >
                        Confirmar resolvida
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={closeMutation.isPending}
                        onClick={() => closeMutation.mutate({ pendency, status: "cancelled" })}
                      >
                        Cancelar pendência
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResolvingId(null);
                          setResolutionNote("");
                        }}
                      >
                        Voltar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setResolvingId(pendency.id);
                      setResolutionNote("");
                      closeMutation.reset();
                    }}
                  >
                    Encerrar
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>

        {closeMutation.isError ? (
          <p className="text-destructive">
            {closeMutation.error instanceof Error ? closeMutation.error.message : "Erro ao encerrar pendência."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
