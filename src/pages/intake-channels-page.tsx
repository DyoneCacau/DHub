import { useState } from "react";
import { Link } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import { listOperators } from "@/features/catalogs/api/catalog-service";
import {
  createIntakeChannel,
  listIntakeChannels,
  updateIntakeChannel,
} from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import {
  intakeChannelSchema,
  type IntakeChannelValues,
} from "@/features/contracts/schemas/contract-schemas";
import type { IntakeChannel } from "@/features/contracts/types/contract";
import { CHANNEL_TYPE_LABEL } from "@/features/contracts/utils/contract-status";

const NONE = "none";
const EMPTY_VALUES: IntakeChannelValues = {
  name: "",
  channel_type: "whatsapp",
  operator_id: NONE,
  phone_label: "",
  notes: "",
};

export function IntakeChannelsPage() {
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<IntakeChannel | null>(null);

  const channelsQuery = useQuery({
    queryKey: contractQueryKeys.channels(organizationId),
    queryFn: () => listIntakeChannels(organizationId),
    enabled: Boolean(organizationId) && isAdmin,
  });
  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled: Boolean(organizationId) && isAdmin,
  });

  const form = useForm<IntakeChannelValues>({
    resolver: zodResolver(intakeChannelSchema),
    defaultValues: EMPTY_VALUES,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: contractQueryKeys.channels(organizationId) });

  const saveMutation = useMutation({
    mutationFn: (values: IntakeChannelValues) => {
      const input = {
        name: values.name,
        channel_type: values.channel_type,
        operator_id: values.operator_id === NONE ? null : values.operator_id,
        phone_label: values.phone_label || null,
        notes: values.notes || null,
      };
      return editing ? updateIntakeChannel(editing.id, input) : createIntakeChannel(organizationId, input);
    },
    onSuccess: async () => {
      setEditing(null);
      form.reset(EMPTY_VALUES);
      await invalidate();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (channel: IntakeChannel) =>
      updateIntakeChannel(channel.id, { status: channel.status === "active" ? "inactive" : "active" }),
    onSuccess: invalidate,
  });

  if (!isAdmin) {
    return (
      <PageContainer>
        <EmptyState title="Acesso negado" description="Somente o admin configura os canais de recebimento." />
      </PageContainer>
    );
  }

  const operatorNames = new Map((operatorsQuery.data ?? []).map((o) => [o.id, o.name]));
  const errors = form.formState.errors;

  return (
    <PageContainer>
      <PageHeader
        title="Canais de recebimento"
        description="Os WhatsApps (e outros canais) por onde os contratos chegam. Ao escolher o canal, a bandeira é preenchida."
        actions={
          <Button asChild variant="outline">
            <Link to="/contratos">Voltar</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? "Editar canal" : "Novo canal"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
              <div className="space-y-2">
                <Label htmlFor="channel-name">Nome</Label>
                <Input id="channel-name" placeholder="Ex.: WhatsApp LeCard" {...form.register("name")} />
                {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  control={form.control}
                  name="channel_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANNEL_TYPE_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Bandeira do canal</Label>
                <Controller
                  control={form.control}
                  name="operator_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Várias / nenhuma</SelectItem>
                        {(operatorsQuery.data ?? [])
                          .filter((o) => o.status === "active" || o.id === editing?.operator_id)
                          .map((operator) => (
                            <SelectItem key={operator.id} value={operator.id}>
                              {operator.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-phone">Identificação do número</Label>
                <Input id="channel-phone" placeholder="Ex.: final 1234" {...form.register("phone_label")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-notes">Observações</Label>
                <Input id="channel-notes" {...form.register("notes")} />
              </div>
              {saveMutation.isError ? (
                <p className="text-sm text-destructive">
                  {saveMutation.error instanceof Error ? saveMutation.error.message : "Erro ao salvar."}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {editing ? "Salvar" : "Criar canal"}
                </Button>
                {editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      form.reset(EMPTY_VALUES);
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {channelsQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
          {channelsQuery.data && channelsQuery.data.length === 0 ? (
            <EmptyState
              title="Nenhum canal cadastrado"
              description="Cadastre um canal para cada WhatsApp (ex.: um por bandeira)."
            />
          ) : null}
          {channelsQuery.data && channelsQuery.data.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Canal</th>
                    <th className="px-4 py-3 font-medium">Bandeira</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {channelsQuery.data.map((channel) => (
                    <tr key={channel.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{channel.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {CHANNEL_TYPE_LABEL[channel.channel_type]}
                          {channel.phone_label ? ` · ${channel.phone_label}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {channel.operator_id ? operatorNames.get(channel.operator_id) ?? "—" : "Várias"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={channel.status === "active" ? "default" : "outline"}>
                          {channel.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(channel);
                              saveMutation.reset();
                              form.reset({
                                name: channel.name,
                                channel_type: channel.channel_type,
                                operator_id: channel.operator_id ?? NONE,
                                phone_label: channel.phone_label ?? "",
                                notes: channel.notes ?? "",
                              });
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate(channel)}
                          >
                            {channel.status === "active" ? "Inativar" : "Ativar"}
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
              {statusMutation.error instanceof Error ? statusMutation.error.message : "Erro ao alterar status."}
            </p>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
