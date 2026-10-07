import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { catalogQueryKeys } from "@/features/catalogs/api/query-keys";
import {
  addConsultantOperator,
  addConsultantRegion,
  listConsultantLinks,
  listOperators,
  listRegions,
  removeConsultantOperator,
  removeConsultantRegion,
} from "@/features/catalogs/api/catalog-service";

interface LinkOption {
  id: string;
  name: string;
  active: boolean;
}

interface LinkSectionProps {
  title: string;
  emptyLabel: string;
  placeholder: string;
  linked: LinkOption[];
  available: LinkOption[];
  canManage: boolean;
  pending: boolean;
  onAdd: (id: string) => void;
  onRemove: (option: LinkOption) => void;
}

function LinkSection({
  title,
  emptyLabel,
  placeholder,
  linked,
  available,
  canManage,
  pending,
  onAdd,
  onRemove,
}: LinkSectionProps) {
  const [selected, setSelected] = useState("");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {linked.map((option) => (
            <Badge key={option.id} variant={option.active ? "secondary" : "outline"} className="gap-1">
              {option.name}
              {option.active ? null : " (inativa)"}
              {canManage ? (
                <button
                  type="button"
                  aria-label={`Remover ${option.name}`}
                  className="ml-1 rounded-sm opacity-70 hover:opacity-100"
                  disabled={pending}
                  onClick={() => onRemove(option)}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
      )}
      {canManage && available.length > 0 ? (
        <div className="flex gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {available.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            disabled={!selected || pending}
            onClick={() => {
              onAdd(selected);
              setSelected("");
            }}
          >
            Adicionar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface ConsultantLinksCardProps {
  organizationId: string;
  consultantId: string;
  canManage: boolean;
}

export function ConsultantLinksCard({
  organizationId,
  consultantId,
  canManage,
}: ConsultantLinksCardProps) {
  const queryClient = useQueryClient();

  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled: Boolean(organizationId),
  });

  const regionsQuery = useQuery({
    queryKey: catalogQueryKeys.regions(organizationId),
    queryFn: () => listRegions(organizationId),
    enabled: Boolean(organizationId),
  });

  const linksQuery = useQuery({
    queryKey: catalogQueryKeys.consultantLinks([consultantId]),
    queryFn: () => listConsultantLinks([consultantId]),
    enabled: Boolean(consultantId),
  });

  const mutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogQueryKeys.root });
    },
  });

  const operators = operatorsQuery.data ?? [];
  const regions = regionsQuery.data ?? [];
  const linkedOperatorIds = new Set((linksQuery.data?.operators ?? []).map((l) => l.operator_id));
  const linkedRegionIds = new Set((linksQuery.data?.regions ?? []).map((l) => l.region_id));

  const toOption = (row: { id: string; name: string; status: string }): LinkOption => ({
    id: row.id,
    name: row.name,
    active: row.status === "active",
  });

  const isLoading = operatorsQuery.isLoading || regionsQuery.isLoading || linksQuery.isLoading;
  const loadError = operatorsQuery.error ?? regionsQuery.error ?? linksQuery.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Regiões e bandeiras atendidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
        {loadError ? (
          <p className="text-sm text-destructive">
            {loadError instanceof Error ? loadError.message : "Erro ao carregar vínculos."}
          </p>
        ) : null}

        {!isLoading && !loadError ? (
          <>
            <LinkSection
              title="Regiões"
              emptyLabel="Nenhuma região vinculada."
              placeholder="Selecione uma região"
              linked={regions.filter((r) => linkedRegionIds.has(r.id)).map(toOption)}
              available={regions
                .filter((r) => r.status === "active" && !linkedRegionIds.has(r.id))
                .map(toOption)}
              canManage={canManage}
              pending={mutation.isPending}
              onAdd={(id) =>
                mutation.mutate(() => addConsultantRegion(organizationId, consultantId, id))
              }
              onRemove={(option) => {
                if (window.confirm(`Remover a região ${option.name} deste consultor?`)) {
                  mutation.mutate(() => removeConsultantRegion(consultantId, option.id));
                }
              }}
            />
            <LinkSection
              title="Bandeiras"
              emptyLabel="Nenhuma bandeira vinculada."
              placeholder="Selecione uma bandeira"
              linked={operators.filter((o) => linkedOperatorIds.has(o.id)).map(toOption)}
              available={operators
                .filter((o) => o.status === "active" && !linkedOperatorIds.has(o.id))
                .map(toOption)}
              canManage={canManage}
              pending={mutation.isPending}
              onAdd={(id) =>
                mutation.mutate(() => addConsultantOperator(organizationId, consultantId, id))
              }
              onRemove={(option) => {
                if (window.confirm(`Remover a bandeira ${option.name} deste consultor?`)) {
                  mutation.mutate(() => removeConsultantOperator(consultantId, option.id));
                }
              }}
            />
          </>
        ) : null}

        {mutation.isError ? (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar vínculo."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
