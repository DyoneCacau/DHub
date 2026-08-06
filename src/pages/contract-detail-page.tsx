import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  { id: "summary", title: "Resumo", description: "Identificação e datas do vínculo." },
  { id: "merchant", title: "Lojista", description: "Cadastro vinculado ao contrato." },
  { id: "operator", title: "Operadora", description: "Operadora do vínculo." },
  { id: "plan", title: "Plano", description: "Plano configurável, quando aplicável." },
  { id: "status", title: "Status", description: "Estado operacional do contrato." },
  { id: "documents", title: "Documentos", description: "Anexos do contrato." },
  { id: "pendencies", title: "Pendências", description: "Itens a corrigir." },
  { id: "history", title: "Histórico", description: "Histórico operacional de status." },
  { id: "recharges", title: "Recargas", description: "Movimentações deste contrato." },
] as const;

export function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();

  return (
    <PageContainer>
      <PageHeader
        title="Detalhe do contrato"
        description={`Identificador de rota: ${contractId ?? "—"}. Sem transições reais nesta sprint.`}
        actions={<Badge variant="outline">Status: estrutural</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title="Sem dados" description={section.description} />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
