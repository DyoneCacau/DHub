import {
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Visão estrutural da operação. Indicadores sem dados reais nesta sprint."
      />

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores demonstrativos"
      >
        <StatCard
          title="Contratos aguardando conferência"
          value="0"
          icon={ClipboardCheck}
          hint="Fila de revisão do escritório"
        />
        <StatCard
          title="Contratos com pendência"
          value="0"
          icon={FileWarning}
          hint="Aguardando correção"
        />
        <StatCard
          title="Recargas em processamento"
          value="0"
          icon={RefreshCw}
          hint="Em tratamento operacional"
        />
        <StatCard
          title="Recargas concluídas"
          value="0"
          icon={CheckCircle2}
          hint="Ciclo administrativo finalizado"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Atalhos e atividade">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Nenhuma atividade para exibir"
              description="Quando o fluxo interno estiver conectado, eventos de contratos e recargas aparecerão aqui."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atalhos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/contratos">Ir para contratos</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/recargas">Ir para recargas</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/lojistas">Ir para lojistas</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/operadoras">Ver operadoras</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}
