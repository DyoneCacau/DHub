import { Link } from "react-router-dom";

import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/hooks/use-auth";

const integrations = [
  { name: "Supabase Auth", status: "Ativo nesta sprint" },
  { name: "Dropbox", status: "Futuro" },
  { name: "n8n", status: "Futuro" },
  { name: "Suri/WhatsApp", status: "Futuro" },
] as const;

export function SettingsPage() {
  const { organization } = useAuth();

  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Administração da organização. Sem chaves ou URLs secretas nesta tela."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organização</CardTitle>
            <CardDescription>Tenant atual vinculado à membership ativa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Nome: </span>
              {organization?.name || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Slug: </span>
              {organization?.slug || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Status: </span>
              {organization?.status || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários</CardTitle>
            <CardDescription>
              Lista somente leitura. Sem auth.admin no frontend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/configuracoes/usuarios">Ver membros</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permissões</CardTitle>
            <CardDescription>
              Papéis admin, operator e consultant aplicados via membership + RLS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Alteração de papel por RPC segura fica documentada para sprint futura.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aparência</CardTitle>
            <CardDescription>Preferências visuais futuras.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Conteúdo estrutural apenas.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrações</CardTitle>
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
