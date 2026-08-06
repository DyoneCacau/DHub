import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoOperators } from "@/config/navigation";

export function OperatorsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Operadoras"
        description="Lista local demonstrativa. Sem persistência nem configuração real."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {demoOperators.map((operator) => (
          <Card key={operator.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{operator.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Não configurado para planos, documentos e prazos
                </p>
              </div>
              <Badge variant="warning">Demonstrativo</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Badge variant="secondary">Status visual: não configurado</Badge>
              <Button type="button" variant="outline">
                Configurar operadora
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <EmptyState
        title="Configuração futura"
        description="Campos, documentos, planos e prazos serão configuráveis por dados, sem tabelas separadas por operadora."
      />
    </PageContainer>
  );
}
