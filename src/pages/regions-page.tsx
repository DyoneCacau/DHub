import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import {
  createRegion,
  listRegions,
  updateRegion,
} from "@/features/catalogs/api/catalog-service";
import {
  regionFormSchema,
  type RegionFormValues,
} from "@/features/catalogs/schemas/catalog-schemas";
import { canManageCatalogs } from "@/features/catalogs/utils/permissions";
import type { Region } from "@/types/database";

const EMPTY_VALUES: RegionFormValues = { name: "", state: "", notes: "" };

export function RegionsPage() {
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const canManage = canManageCatalogs(role);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Region | null>(null);

  const listQuery = useQuery({
    queryKey: catalogQueryKeys.regions(organizationId),
    queryFn: () => listRegions(organizationId),
    enabled: Boolean(organizationId),
  });

  const form = useForm<RegionFormValues>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: catalogQueryKeys.regions(organizationId) });

  const saveMutation = useMutation({
    mutationFn: (values: RegionFormValues) => {
      const payload = {
        name: values.name,
        state: values.state || null,
        notes: values.notes || null,
      };
      return editing ? updateRegion(editing.id, payload) : createRegion(organizationId, payload);
    },
    onSuccess: async () => {
      setEditing(null);
      form.reset(EMPTY_VALUES);
      await invalidate();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (region: Region) =>
      updateRegion(region.id, { status: region.status === "active" ? "inactive" : "active" }),
    onSuccess: invalidate,
  });

  const startEdit = (region: Region) => {
    setEditing(region);
    saveMutation.reset();
    form.reset({ name: region.name, state: region.state ?? "", notes: region.notes ?? "" });
  };

  const cancelEdit = () => {
    setEditing(null);
    saveMutation.reset();
    form.reset(EMPTY_VALUES);
  };

  if (!canManage) {
    return (
      <PageContainer>
        <EmptyState title="Acesso negado" description="Regiões são configuradas pelo administrador." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Regiões"
        description="Regiões ou cidades atendidas pelos consultores. Inative em vez de excluir."
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? "Editar região" : "Nova região"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="region-name">Nome (região ou cidade)</Label>
                <Input id="region-name" {...form.register("name")} />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="region-state">UF (opcional)</Label>
                <Input id="region-state" maxLength={2} {...form.register("state")} />
                {form.formState.errors.state ? (
                  <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="region-notes">Observações</Label>
                <Input id="region-notes" {...form.register("notes")} />
              </div>

              {saveMutation.isError ? (
                <p className="text-sm text-destructive">
                  {saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : "Erro ao salvar."}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {editing ? "Salvar" : "Criar região"}
                </Button>
                {editing ? (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando regiões…</p>
          ) : null}
          {listQuery.isError ? (
            <p className="text-sm text-destructive">
              {listQuery.error instanceof Error ? listQuery.error.message : "Erro ao carregar."}
            </p>
          ) : null}
          {listQuery.data && listQuery.data.length === 0 ? (
            <EmptyState title="Nenhuma região" description="Cadastre a primeira região ou cidade." />
          ) : null}
          {listQuery.data && listQuery.data.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">UF</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.data.map((region) => (
                    <tr key={region.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {region.name}
                        {region.notes ? (
                          <div className="text-xs font-normal text-muted-foreground">
                            {region.notes}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{region.state || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={region.status === "active" ? "default" : "outline"}>
                          {region.status === "active" ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(region)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              const label = region.status === "active" ? "inativar" : "ativar";
                              if (window.confirm(`Confirma ${label} a região ${region.name}?`)) {
                                statusMutation.mutate(region);
                              }
                            }}
                          >
                            {region.status === "active" ? "Inativar" : "Ativar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {statusMutation.isError ? (
            <p className="text-sm text-destructive">
              {statusMutation.error instanceof Error
                ? statusMutation.error.message
                : "Erro ao alterar status."}
            </p>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
