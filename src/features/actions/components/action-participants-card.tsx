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
import { actionQueryKeys } from "@/features/actions/api/query-keys";
import {
  addParticipant,
  listParticipants,
  removeParticipant,
} from "@/features/actions/api/action-service";

interface ActionParticipantsCardProps {
  organizationId: string;
  actionId: string;
  consultants: Array<{ id: string; full_name: string; status: string }>;
}

export function ActionParticipantsCard({
  organizationId,
  actionId,
  consultants,
}: ActionParticipantsCardProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");

  const participantsQuery = useQuery({
    queryKey: actionQueryKeys.participants(actionId),
    queryFn: () => listParticipants(actionId),
  });

  const mutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: actionQueryKeys.root });
    },
  });

  const names = new Map(consultants.map((c) => [c.id, c.full_name]));
  const participantIds = new Set((participantsQuery.data ?? []).map((p) => p.consultant_id));
  const available = consultants.filter((c) => c.status === "active" && !participantIds.has(c.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Consultores participantes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {participantsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : null}
        {participantsQuery.data && participantsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum consultor adicionado.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {(participantsQuery.data ?? []).map((participant) => {
            const name = names.get(participant.consultant_id) ?? "Consultor";
            return (
              <Badge key={participant.consultant_id} variant="secondary" className="gap-1">
                {name}
                <button
                  type="button"
                  aria-label={`Remover ${name}`}
                  className="ml-1 rounded-sm opacity-70 hover:opacity-100"
                  disabled={mutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover ${name} desta ação?`)) {
                      mutation.mutate(() => removeParticipant(actionId, participant.consultant_id));
                    }
                  }}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
        {available.length > 0 ? (
          <div className="flex gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Adicionar consultor" />
              </SelectTrigger>
              <SelectContent>
                {available.map((consultant) => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {consultant.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={!selected || mutation.isPending}
              onClick={() => {
                mutation.mutate(() => addParticipant(organizationId, actionId, selected));
                setSelected("");
              }}
            >
              Adicionar
            </Button>
          </div>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
