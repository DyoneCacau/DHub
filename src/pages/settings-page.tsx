import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const sections = [
  {
    title: "Organização",
    description: "Dados da organização (tenant). Configuração futura.",
  },
  {
    title: "Usuários",
    description: "Gestão de memberships e perfis. Sprint de autenticação.",
  },
  {
    title: "Permissões",
    description: "Papéis admin, operator e consultant com RLS no banco.",
  },
  {
    title: "Aparência",
    description: "Preferências visuais futuras da organização.",
  },
] as const;

const integrations = [
  { name: "Supabase", status: "Sprint posterior" },
  { name: "Dropbox", status: "Futuro" },
  { name: "n8n", status: "Futuro" },
  { name: "Suri/WhatsApp", status: "Futuro" },
] as const;

export function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Seções visuais. Sem URLs, chaves ou integrações ativas."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Conteúdo estrutural apenas.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrações</CardTitle>
          <CardDescription>
            Integrações somente após o fluxo interno. Nenhum segredo nesta tela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.map((item, index) => (
            <div key={item.name}>
              {index > 0 ? <Separator className="mb-3" /> : null}
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{item.name}</p>
                <Badge variant="secondary">{item.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
