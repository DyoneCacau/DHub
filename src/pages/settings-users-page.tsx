import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listOrganizationMembers } from "@/features/auth/api/auth-service";
import { authQueryKeys } from "@/features/auth/api/query-keys";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatRole } from "@/features/auth/types/auth";

export function SettingsUsersPage() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  const membersQuery = useQuery({
    queryKey: organizationId
      ? authQueryKeys.members(organizationId)
      : ["auth", "members", "missing"],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organização não disponível");
      }
      return listOrganizationMembers(organizationId);
    },
    enabled: Boolean(organizationId),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Usuários"
        description="Lista somente leitura dos membros da organização. Criação Auth e alteração de papel ficam para RPC segura futura."
        actions={
          <Button asChild variant="outline">
            <Link to="/configuracoes">Voltar</Link>
          </Button>
        }
      />

      {membersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando membros…</p>
      ) : null}

      {membersQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar os membros.
        </p>
      ) : null}

      {membersQuery.data && membersQuery.data.length === 0 ? (
        <EmptyState
          title="Nenhum membro encontrado"
          description="Execute o bootstrap do primeiro administrador conforme docs/SUPABASE_SETUP.md."
        />
      ) : null}

      {membersQuery.data && membersQuery.data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {membersQuery.data.map(({ member, profile }) => (
                <tr key={member.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {profile?.full_name?.trim() || "—"}
                  </td>
                  <td className="px-4 py-3">{profile?.email || "—"}</td>
                  <td className="px-4 py-3">{formatRole(member.role)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={member.status === "active" ? "success" : "secondary"}>
                      {member.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(member.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageContainer>
  );
}
