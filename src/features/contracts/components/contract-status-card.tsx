import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeContractStatus } from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import { statusNoteSchema } from "@/features/contracts/schemas/contract-schemas";
import type { ContractOverview, ContractStatus } from "@/features/contracts/types/contract";
import {
  CONTRACT_STATUS_LABEL,
  TRANSITION_ACTION_LABEL,
  TRANSITIONS_REQUIRING_NOTE,
  contractStatusVariant,
  formatDateTime,
  manualTransitions,
} from "@/features/contracts/utils/contract-status";

interface ContractStatusCardProps {
  contract: ContractOverview;
}

export function ContractStatusCard({ contract }: ContractStatusCardProps) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (target: ContractStatus) => changeContractStatus(contract.id, target, note || null),
    onSuccess: async () => {
      setNote("");
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.root });
    },
  });

  const targets = manualTransitions(contract.status);
  const blockedByPendency = contract.open_pendency_count > 0;

  const run = (target: ContractStatus) => {
    setLocalError(null);
    const parsed = statusNoteSchema.safeParse(note);
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Observação inválida");
      return;
    }
    if (TRANSITIONS_REQUIRING_NOTE.includes(target) && !parsed.data) {
      setLocalError("Informe uma observação para esta ação.");
      return;
    }
    if (target === "approved" && blockedByPendency) {
      setLocalError("Resolva as pendências abertas antes de aprovar.");
      return;
    }
    if (
      TRANSITIONS_REQUIRING_NOTE.includes(target) &&
      !window.confirm(`Confirmar: ${TRANSITION_ACTION_LABEL[target]}?`)
    ) {
      return;
    }
    mutation.mutate(target);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={contractStatusVariant(contract.status)}>
            {CONTRACT_STATUS_LABEL[contract.status]}
          </Badge>
          <span className="text-muted-foreground">desde {formatDateTime(contract.status_changed_at)}</span>
        </div>
        {contract.status_note ? (
          <p className="text-muted-foreground">Última observação: {contract.status_note}</p>
        ) : null}

        {targets.length > 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="status-note">Observação (obrigatória para recusar, cancelar ou inativar)</Label>
              <Input
                id="status-note"
                value={note}
                maxLength={1000}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {targets.map((target) => (
                <Button
                  key={target}
                  type="button"
                  size="sm"
                  variant={
                    target === "approved" || target === "active" || target === "registered_at_operator"
                      ? "default"
                      : TRANSITIONS_REQUIRING_NOTE.includes(target)
                        ? "ghost"
                        : "outline"
                  }
                  disabled={mutation.isPending}
                  onClick={() => run(target)}
                >
                  {TRANSITION_ACTION_LABEL[target] ?? CONTRACT_STATUS_LABEL[target]}
                </Button>
              ))}
            </div>
            {contract.status === "awaiting_review" || contract.status === "corrected" ? (
              <p className="text-xs text-muted-foreground">
                Para pedir correção, abra uma pendência abaixo — o contrato muda para “Pendente de correção”.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">Contrato encerrado — sem ações disponíveis.</p>
        )}

        {localError ? <p className="text-destructive">{localError}</p> : null}
        {mutation.isError ? (
          <p className="text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Erro ao alterar status."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
