import { Link } from "react-router-dom";

import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AccessDeniedPage() {
  return (
    <PageContainer className="flex max-w-2xl flex-col justify-center py-10">
      <PageHeader
        title="Acesso negado"
        description="Você não tem permissão para acessar esta área. A autorização real será aplicada com RLS na Sprint 2."
      />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm text-muted-foreground">
            Esta página é estrutural. Nenhum controle de sessão foi implementado nesta
            sprint.
          </p>
          <Button asChild>
            <Link to="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
