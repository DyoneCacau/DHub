import { Store } from "lucide-react";

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

export function MerchantsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Lojistas"
        description="Cadastro único por organização. Sem CNPJs reais nesta sprint."
        actions={<Button type="button">Cadastrar lojista</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="merchant-search">Busca</Label>
          <Input
            id="merchant-search"
            type="search"
            placeholder="Razão social, nome fantasia ou CNPJ"
            aria-label="Buscar lojista por razão social, nome fantasia ou CNPJ"
          />
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
          <Label>Status</Label>
          <Select disabled>
            <SelectTrigger aria-label="Filtro de status">
              <SelectValue placeholder="Todos (visual)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[720px] border-b bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
          Área preparada para tabela de lojistas
        </div>
        <div className="p-4">
          <EmptyState
            icon={Store}
            title="Nenhum lojista cadastrado"
            description="Os lojistas serão cadastrados uma única vez por organização nas próximas sprints."
            actionLabel="Cadastrar lojista"
          />
        </div>
      </div>
    </PageContainer>
  );
}
