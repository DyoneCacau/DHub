import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MerchantDetailPage() {
  const { merchantId } = useParams<{ merchantId: string }>();

  return (
    <PageContainer>
      <PageHeader
        title="Detalhe do lojista"
        description={`Identificador de rota: ${merchantId ?? "—"}. Conteúdo demonstrativo.`}
        actions={<Badge variant="secondary">Sem dados reais</Badge>}
      />

      <Tabs defaultValue="overview">
        <TabsList aria-label="Seções do lojista" className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo cadastral</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="Cadastro ainda não carregado"
                description="Os dados do lojista serão obtidos do backend nas sprints de domínio."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <EmptyState
            title="Sem contratos vinculados"
            description="Contratos por operadora aparecerão aqui após a implementação do fluxo."
          />
        </TabsContent>

        <TabsContent value="documents">
          <EmptyState
            title="Sem documentos"
            description="Uploads e tipos documentais serão configuráveis; sem arquivos nesta sprint."
          />
        </TabsContent>

        <TabsContent value="history">
          <EmptyState
            title="Sem histórico operacional"
            description="Trocas de consultor e eventos relevantes serão registrados depois."
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
