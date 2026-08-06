import { Link } from "react-router-dom";

import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <PageContainer className="flex max-w-2xl flex-col justify-center py-10">
      <PageHeader
        title="Página não encontrada"
        description="A rota solicitada não existe no DHub."
      />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm text-muted-foreground">
            Verifique o endereço ou retorne ao dashboard para continuar a navegação.
          </p>
          <Button asChild>
            <Link to="/dashboard">Ir para o dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
