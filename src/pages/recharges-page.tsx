import { RefreshCw } from "lucide-react";

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

export function RechargesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Recargas"
        description="Movimentações dentro de contratos. Sem valores financeiros inventados."
        actions={<Button type="button">Nova recarga</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="competence">Competência</Label>
          <Input id="competence" type="month" disabled aria-label="Filtro de competência" />
        </div>
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
            <SelectTrigger aria-label="Filtro de status da recarga">
              <SelectValue placeholder="Todos (visual)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="processing">Em processamento</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
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
          <Label htmlFor="recharge-search">Busca</Label>
          <Input id="recharge-search" type="search" placeholder="Buscar recarga" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[800px] border-b bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
          Área preparada para tabela de recargas
        </div>
        <div className="p-4">
          <EmptyState
            icon={RefreshCw}
            title="Nenhuma recarga encontrada"
            description="Solicitações e comprovantes serão tratados após o fluxo interno de contratos."
            actionLabel="Nova recarga"
          />
        </div>
      </div>
    </PageContainer>
  );
}
