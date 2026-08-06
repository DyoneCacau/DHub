import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Relatórios"
        description="Estrutura visual apenas. Sem gráficos, exportação ou dados reais."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="period-from">Período (início)</Label>
          <Input id="period-from" type="date" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period-to">Período (fim)</Label>
          <Input id="period-to" type="date" disabled />
        </div>
        <div className="space-y-2">
          <Label>Operadora</Label>
          <Select disabled>
            <SelectTrigger aria-label="Filtro de operadora nos relatórios">
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
          <Label>Consultor / Status</Label>
          <Select disabled>
            <SelectTrigger aria-label="Filtro de consultor ou status">
              <SelectValue placeholder="Filtros visuais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {["Contratos", "Recargas", "Pendências"].map((label) => (
          <Card key={label} className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Card vazio — sem métricas</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Área reservada para gráficos futuros</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Sem dados para exibir"
            description="Bibliotecas de gráficos não foram instaladas nesta sprint."
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
