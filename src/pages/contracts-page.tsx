import { FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { demoOperators } from "@/config/navigation";

export function ContractsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Contratos"
        description="Vínculo lojista ↔ operadora. Sem formulário real nesta sprint."
        actions={<Button type="button">Novo contrato</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label>Operadora</Label>
          <Select disabled>
            <SelectTrigger aria-label="Filtro de operadora">
              <SelectValue placeholder="Todas (visual)" />
            </SelectTrigger>
            <SelectContent>
              {demoOperators.map((operator) => (
                <SelectItem key={operator.id} value={operator.id}>
                  {operator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select disabled>
            <SelectTrigger aria-label="Filtro de status do contrato">
              <SelectValue placeholder="Todos (visual)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="awaiting_review">Aguardando conferência</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Consultor</Label>
          <Select disabled>
            <SelectTrigger aria-label="Filtro de consultor">
              <SelectValue placeholder="Todos (visual)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contract-search">Busca</Label>
          <Input id="contract-search" type="search" placeholder="Buscar contrato" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[800px] border-b bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
          Área preparada para tabela de contratos
        </div>
        <div className="p-4">
          <EmptyState
            icon={FileText}
            title="Nenhum contrato encontrado"
            description="O ciclo Consultor → Lojista → Contrato → Conferência será implementado nas próximas sprints."
            actionLabel="Novo contrato"
          />
        </div>
      </div>
    </PageContainer>
  );
}
