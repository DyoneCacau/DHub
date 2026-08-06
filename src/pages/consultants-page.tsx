import { Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConsultantsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Consultores"
        description="Estrutura preparada para cadastro e listagem. Sem persistência nesta sprint."
        actions={
          <Button type="button" variant="default">
            Cadastrar consultor
          </Button>
        }
      />

      <div className="space-y-2">
        <Label htmlFor="consultant-search">Buscar consultor</Label>
        <Input
          id="consultant-search"
          type="search"
          placeholder="Nome ou código (visual)"
          aria-label="Busca visual de consultores"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[640px] border-b bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
          Área preparada para tabela de consultores
        </div>
        <div className="p-4">
          <EmptyState
            icon={Users}
            title="Nenhum consultor cadastrado"
            description="O cadastro real e o isolamento por consultor serão implementados nas sprints seguintes."
            actionLabel="Cadastrar consultor"
          />
        </div>
      </div>
    </PageContainer>
  );
}
