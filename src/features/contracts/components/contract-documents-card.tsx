import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";

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
import {
  addSubmission,
  discardDocument,
  getDocumentUrl,
  getPreviewUrls,
  listDocuments,
  listIntakeChannels,
  listSubmissions,
} from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import { ContractFilePicker } from "@/features/contracts/components/contract-file-picker";
import {
  discardReasonSchema,
  submissionFormSchema,
  type SubmissionFormValues,
} from "@/features/contracts/schemas/contract-schemas";
import type { ContractDocument, ContractOverview } from "@/features/contracts/types/contract";
import {
  CLOSED_STATUSES,
  SUBMISSION_KIND_LABEL,
  formatBytes,
  formatDateTime,
  nowForDateTimeInput,
} from "@/features/contracts/utils/contract-status";

const NONE = "none";

interface ContractDocumentsCardProps {
  contract: ContractOverview;
}

export function ContractDocumentsCard({ contract }: ContractDocumentsCardProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [uploadFailures, setUploadFailures] = useState<string[]>([]);
  const [showDiscarded, setShowDiscarded] = useState(false);

  const submissionsQuery = useQuery({
    queryKey: contractQueryKeys.submissions(contract.id),
    queryFn: () => listSubmissions(contract.id),
  });

  const documentsQuery = useQuery({
    queryKey: contractQueryKeys.documents(contract.id),
    queryFn: () => listDocuments(contract.id),
  });

  const channelsQuery = useQuery({
    queryKey: contractQueryKeys.channels(contract.organization_id),
    queryFn: () => listIntakeChannels(contract.organization_id),
  });

  const documents = documentsQuery.data ?? [];
  const visibleDocuments = documents.filter((d) => showDiscarded || !d.discarded_at);
  const previewIds = visibleDocuments.filter((d) => d.mime_type.startsWith("image/")).map((d) => d.id);

  const previewsQuery = useQuery({
    queryKey: contractQueryKeys.previews(contract.id, previewIds),
    queryFn: () => getPreviewUrls(visibleDocuments),
    enabled: previewIds.length > 0,
    staleTime: 4 * 60_000,
  });

  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: {
      kind: contract.status === "pending_correction" ? "correction" : "complement",
      channel_id: NONE,
      received_at: nowForDateTimeInput(),
      notes: "",
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: contractQueryKeys.root });

  const submitMutation = useMutation({
    mutationFn: (values: SubmissionFormValues) =>
      addSubmission(
        contract.organization_id,
        contract.id,
        {
          kind: values.kind,
          channel_id: values.channel_id === NONE ? null : values.channel_id,
          received_at: values.received_at,
          notes: values.notes || null,
        },
        files,
      ),
    onSuccess: async (result) => {
      setUploadFailures(result.failures);
      if (result.failures.length === 0) {
        setFormOpen(false);
        setFiles([]);
      }
      await invalidate();
    },
  });

  const fileMutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: invalidate,
  });

  const openForm = () => {
    form.reset({
      kind: contract.status === "pending_correction" ? "correction" : "complement",
      channel_id: NONE,
      received_at: nowForDateTimeInput(),
      notes: "",
    });
    setFiles([]);
    setFilesError(null);
    setUploadFailures([]);
    submitMutation.reset();
    setFormOpen(true);
  };

  const openDocument = (document: ContractDocument) => {
    const tab = window.open("about:blank", "_blank");
    fileMutation.mutate(async () => {
      try {
        const url = await getDocumentUrl(document);
        if (tab) {
          tab.opener = null;
          tab.location.href = url;
        } else {
          window.location.href = url;
        }
      } catch (error) {
        tab?.close();
        throw error;
      }
    });
  };

  const discard = (document: ContractDocument) => {
    const reason = window.prompt(`Motivo do descarte de "${document.file_name}"?`);
    if (reason === null) return;
    const parsed = discardReasonSchema.safeParse(reason);
    if (!parsed.success) {
      window.alert(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }
    fileMutation.mutate(() => discardDocument(document.id, parsed.data));
  };

  const channelNames = new Map((channelsQuery.data ?? []).map((c) => [c.id, c.name]));
  const activeChannels = (channelsQuery.data ?? []).filter((c) => c.status === "active");
  const canReceive = !CLOSED_STATUSES.includes(contract.status);
  const discardedCount = documents.filter((d) => d.discarded_at).length;
  const errors = form.formState.errors;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Documentos e remessas</CardTitle>
        {canReceive && !formOpen ? (
          <Button type="button" size="sm" onClick={openForm}>
            {contract.status === "pending_correction" ? "Receber correção" : "Receber mais arquivos"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {formOpen ? (
          <form
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-3"
            onSubmit={form.handleSubmit((values) => {
              if (files.length === 0) {
                setFilesError("Adicione ao menos um arquivo.");
                return;
              }
              setFilesError(null);
              submitMutation.mutate(values);
            })}
          >
            <div className="space-y-2">
              <Label>Tipo da remessa</Label>
              <Controller
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="correction">{SUBMISSION_KIND_LABEL.correction}</SelectItem>
                      <SelectItem value="complement">{SUBMISSION_KIND_LABEL.complement}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Controller
                control={form.control}
                name="channel_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Não informado</SelectItem>
                      {activeChannels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submission-received">Recebido em</Label>
              <Input id="submission-received" type="datetime-local" {...form.register("received_at")} />
              {errors.received_at ? (
                <p className="text-destructive">{errors.received_at.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="submission-notes">Observação</Label>
              <Input id="submission-notes" maxLength={1000} {...form.register("notes")} />
            </div>
            <div className="md:col-span-3">
              <ContractFilePicker files={files} onChange={setFiles} disabled={submitMutation.isPending} />
              {filesError ? <p className="mt-1 text-destructive">{filesError}</p> : null}
            </div>
            {submitMutation.isError ? (
              <p className="text-destructive md:col-span-3">
                {submitMutation.error instanceof Error ? submitMutation.error.message : "Erro ao enviar."}
              </p>
            ) : null}
            {contract.status === "pending_correction" ? (
              <p className="text-xs text-muted-foreground md:col-span-3">
                Uma remessa do tipo “Correção” muda o contrato para “Correção recebida” e o devolve à fila.
              </p>
            ) : null}
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Enviando…" : "Registrar remessa"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}

        {uploadFailures.length > 0 ? (
          <div className="rounded-lg border border-destructive/40 p-3 text-destructive">
            <p className="font-medium">Alguns arquivos não foram enviados:</p>
            <ul className="list-disc pl-5">
              {uploadFailures.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {submissionsQuery.isLoading || documentsQuery.isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : null}

        {(submissionsQuery.data ?? []).map((submission) => {
          const items = visibleDocuments.filter((d) => d.submission_id === submission.id);
          return (
            <section key={submission.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={submission.kind === "correction" ? "warning" : "secondary"}>
                  {SUBMISSION_KIND_LABEL[submission.kind]}
                </Badge>
                <span>Recebido em {formatDateTime(submission.received_at)}</span>
                <span className="text-muted-foreground">
                  via {submission.channel_id ? channelNames.get(submission.channel_id) ?? "—" : "canal não informado"}
                </span>
              </div>
              {submission.notes ? <p className="text-muted-foreground">{submission.notes}</p> : null}
              {items.length === 0 ? (
                <p className="text-muted-foreground">Nenhum arquivo nesta remessa.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((document) => {
                    const preview = previewsQuery.data?.[document.id];
                    return (
                      <div
                        key={document.id}
                        className={`space-y-1 rounded-md border p-2 ${document.discarded_at ? "opacity-50" : ""}`}
                      >
                        <button
                          type="button"
                          className="flex h-32 w-full items-center justify-center overflow-hidden rounded bg-muted"
                          onClick={() => openDocument(document)}
                          title="Abrir arquivo"
                        >
                          {preview ? (
                            <img src={preview} alt={document.file_name} className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="size-8 text-muted-foreground" />
                          )}
                        </button>
                        <p className="truncate text-xs font-medium" title={document.file_name}>
                          {document.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatBytes(document.size_bytes)}</p>
                        {document.discarded_at ? (
                          <p className="text-xs text-destructive">Descartado: {document.discard_reason}</p>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                            disabled={fileMutation.isPending}
                            onClick={() => discard(document)}
                          >
                            Descartar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {discardedCount > 0 ? (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => setShowDiscarded((value) => !value)}
          >
            {showDiscarded ? "Ocultar descartados" : `Mostrar ${discardedCount} descartado(s)`}
          </button>
        ) : null}

        {fileMutation.isError ? (
          <p className="text-destructive">
            {fileMutation.error instanceof Error ? fileMutation.error.message : "Erro no documento."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
