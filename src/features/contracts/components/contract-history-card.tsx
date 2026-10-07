import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listOrganizationMembers } from "@/features/auth/api/auth-service";
import { listStatusHistory } from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import {
  CONTRACT_STATUS_LABEL,
  formatDateTime,
} from "@/features/contracts/utils/contract-status";

interface ContractHistoryCardProps {
  organizationId: string;
  contractId: string;
}

export function ContractHistoryCard({ organizationId, contractId }: ContractHistoryCardProps) {
  const historyQuery = useQuery({
    queryKey: contractQueryKeys.history(contractId),
    queryFn: () => listStatusHistory(contractId),
  });

  // Perfis de outros membros podem não ser visíveis para todos os papéis; sem nome, mostra "usuário".
  const membersQuery = useQuery({
    queryKey: [...contractQueryKeys.root, "members", organizationId],
    queryFn: () => listOrganizationMembers(organizationId),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const names = new Map(
    (membersQuery.data ?? []).map(({ member, profile }) => [
      member.user_id,
      profile?.full_name || profile?.email || "usuário",
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {historyQuery.isLoading ? <p className="text-muted-foreground">Carregando…</p> : null}
        {historyQuery.isError ? (
          <p className="text-destructive">
            {historyQuery.error instanceof Error ? historyQuery.error.message : "Erro ao carregar histórico."}
          </p>
        ) : null}
        <ol className="space-y-3 border-l pl-4">
          {(historyQuery.data ?? []).map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
              <p className="font-medium">
                {entry.from_status
                  ? `${CONTRACT_STATUS_LABEL[entry.from_status]} → ${CONTRACT_STATUS_LABEL[entry.to_status]}`
                  : `Recebido: ${CONTRACT_STATUS_LABEL[entry.to_status]}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(entry.changed_at)}
                {entry.changed_by ? ` · por ${names.get(entry.changed_by) ?? "usuário"}` : ""}
              </p>
              {entry.note ? <p className="text-muted-foreground">{entry.note}</p> : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
