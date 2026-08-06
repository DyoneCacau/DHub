import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile } from "@/features/auth/api/auth-service";
import { authQueryKeys } from "@/features/auth/api/query-keys";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  profileUpdateSchema,
  type ProfileUpdateFormValues,
} from "@/features/auth/schemas/auth-schemas";
import { formatRole } from "@/features/auth/types/auth";

export function AccountPage() {
  const { profile, organization, role, membership, user, refreshAccess } = useAuth();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    values: {
      full_name: profile?.full_name ?? "",
      avatar_url: profile?.avatar_url ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: async (data) => {
      if (user) {
        queryClient.setQueryData(authQueryKeys.profile(user.id), data);
      }
      await refreshAccess();
      reset({
        full_name: data.full_name ?? "",
        avatar_url: data.avatar_url ?? "",
      });
    },
    onError: (error) => {
      setError("root", {
        message: error instanceof Error ? error.message : "Falha ao salvar.",
      });
    },
  });

  return (
    <PageContainer>
      <PageHeader
        title="Minha conta"
        description="Você pode editar apenas nome e URL de avatar. Organização, papel e status são somente leitura."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome</Label>
                <Input id="full_name" disabled={isSubmitting} {...register("full_name")} />
                {errors.full_name ? (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  placeholder="https://…"
                  disabled={isSubmitting}
                  {...register("avatar_url")}
                />
                {errors.avatar_url ? (
                  <p className="text-sm text-destructive">{errors.avatar_url.message}</p>
                ) : null}
              </div>
              {errors.root ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.root.message}
                </p>
              ) : null}
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                Salvar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">E-mail: </span>
              {profile?.email || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Organização: </span>
              {organization?.name || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Papel: </span>
              {formatRole(role)}
            </p>
            <p>
              <span className="text-muted-foreground">Status: </span>
              {membership?.status === "active" ? "Ativo" : membership?.status || "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
