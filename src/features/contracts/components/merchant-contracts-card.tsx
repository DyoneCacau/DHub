import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/features/actions/utils/format";
import { listContracts } from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import type { ContractFilters } from "@/features/contracts/types/contract";
import {
  CONTRACT_STATUS_LABEL,
  contractStatusVariant,
} from "@/features/contracts/utils/contract-status";

interface MerchantContractsCardProps {
  organizationId: string;
  merchantId: string;
}

export function MerchantContractsCard({ organizationId, merchantId }: MerchantContractsCardProps) {
  const filters: ContractFilters = {
    regionId: "all",
    consultantId: "all",
    operatorId: "all",
    merchantId,
    month: "",
    status: "all",
    search: "",
    order: "recent",
    page: 1,
    pageSize: 50,
  };

  const listQuery = useQuery({
    queryKey: contractQueryKeys.list(organizationId, filters),
    queryFn: () => listContracts(organizationId, filters),
    enabled: Boolean(organizationId),
  });

  const rows = listQuery.data?.rows ?? [];

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Contratos</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link to="/contratos/receber">Receber contrato</Link>
        </Button>
      </CardHeader>
      <CardContent className="text-sm">
        {listQuery.isLoading ? <p className="text-muted-foreground">Carregando…</p> : null}
        {listQuery.isError ? (
          <p className="text-destructive">
            {listQuery.error instanceof Error ? listQuery.error.message : "Erro ao carregar contratos."}
          </p>
        ) : null}
        {!listQuery.isLoading && rows.length === 0 ? (
          <p className="text-muted-foreground">Nenhum contrato registrado para este lojista.</p>
        ) : null}
        {rows.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div>
                  <span className="font-medium">{row.operator_name}</span>
                  <span className="text-muted-foreground"> · assinado em {formatDate(row.signed_on)}</span>
                  {row.plan_name ? <span className="text-muted-foreground"> · {row.plan_name}</span> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={contractStatusVariant(row.status)}>{CONTRACT_STATUS_LABEL[row.status]}</Badge>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/contratos/${row.id}`}>Abrir</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
