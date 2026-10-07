import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
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
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import { listConsultantsForSelect } from "@/features/consultants/api/consultant-service";
import {
  findDocumentsByHash,
  listIntakeChannels,
  listSimilarOpenContracts,
  receiveContract,
} from "@/features/contracts/api/contract-service";
import { contractQueryKeys } from "@/features/contracts/api/query-keys";
import { ContractFilePicker } from "@/features/contracts/components/contract-file-picker";
import {
  receiveContractSchema,
  type ReceiveContractValues,
} from "@/features/contracts/schemas/contract-schemas";
import { CONTRACT_STATUS_LABEL, nowForDateTimeInput } from "@/features/contracts/utils/contract-status";
import { sha256Hex } from "@/features/contracts/utils/file-hash";
import { listMerchantsForSelect } from "@/features/merchants/api/merchant-service";

const NONE = "none";
const MAX_MERCHANT_OPTIONS = 30;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function ContractReceivePage() {
  const { organization } = useAuth();
  const organizationId = organization?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [hashes, setHashes] = useState<string[]>([]);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [uploadFailures, setUploadFailures] = useState<{ contractId: string; failures: string[] } | null>(
    null,
  );

  const form = useForm<ReceiveContractValues>({
    resolver: zodResolver(receiveContractSchema),
    defaultValues: {
      channel_id: NONE,
      operator_id: "",
      consultant_id: "",
      merchant_id: "",
      signed_on: "",
      received_at: nowForDateTimeInput(),
      plan_name: "",
      notes: "",
    },
  });

  const [consultantId, merchantId, operatorId] = useWatch({
    control: form.control,
    name: ["consultant_id", "merchant_id", "operator_id"],
  });

  const channelsQuery = useQuery({
    queryKey: contractQueryKeys.channels(organizationId),
    queryFn: () => listIntakeChannels(organizationId),
    enabled: Boolean(organizationId),
  });

  const operatorsQuery = useQuery({
    queryKey: catalogQueryKeys.operators(organizationId),
    queryFn: () => listOperators(organizationId),
    enabled: Boolean(organizationId),
  });

  const consultantsQuery = useQuery({
    queryKey: [...consultantQueryKeys.root, "select-all", organizationId],
    queryFn: () => listConsultantsForSelect(organizationId),
    enabled: Boolean(organizationId),
  });

  const merchantsQuery = useQuery({
    queryKey: ["merchants", "select", organizationId, consultantId],
    queryFn: () => listMerchantsForSelect(organizationId, consultantId),
    enabled: Boolean(organizationId) && Boolean(consultantId),
  });

  const similarQuery = useQuery({
    queryKey: contractQueryKeys.similar(merchantId, operatorId),
    queryFn: () => listSimilarOpenContracts(merchantId, operatorId),
    enabled: Boolean(merchantId) && Boolean(operatorId),
  });

  const duplicatesQuery = useQuery({
    queryKey: contractQueryKeys.duplicates(organizationId, hashes),
    queryFn: () => findDocumentsByHash(organizationId, hashes),
    enabled: Boolean(organizationId) && hashes.length > 0,
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.all(files.map((file) => sha256Hex(file))).then((result) => {
      if (!cancelled) setHashes(result);
    });
    return () => {
      cancelled = true;
    };
  }, [files]);

  const activeChannels = (channelsQuery.data ?? []).filter((c) => c.status === "active");
  const activeOperators = (operatorsQuery.data ?? []).filter((o) => o.status === "active");
  const activeConsultants = (consultantsQuery.data ?? []).filter((c) => c.status === "active");

  const merchantOptions = useMemo(() => {
    const term = merchantSearch.trim().toLowerCase();
    const all = merchantsQuery.data ?? [];
    const filtered = term
      ? all.filter((m) =>
          [m.legal_name, m.trade_name, m.document, m.city].some((value) =>
            (value ?? "").toLowerCase().includes(term),
          ),
        )
      : all;
    return filtered.slice(0, MAX_MERCHANT_OPTIONS);
  }, [merchantsQuery.data, merchantSearch]);

  const selectedMerchant = (merchantsQuery.data ?? []).find((m) => m.id === merchantId);

  const mutation = useMutation({
    mutationFn: (values: ReceiveContractValues) =>
      receiveContract(
        organizationId,
        {
          merchant_id: values.merchant_id,
          operator_id: values.operator_id,
          signed_on: values.signed_on,
          plan_name: values.plan_name || null,
          notes: values.notes || null,
        },
        {
          channel_id: values.channel_id === NONE ? null : values.channel_id,
          received_at: values.received_at,
          notes: null,
        },
        files,
      ),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.root });
      if (result.failures.length > 0) {
        setUploadFailures({ contractId: result.contractId, failures: result.failures });
        return;
      }
      navigate(`/contratos/${result.contractId}`);
    },
  });

  const errors = form.formState.errors;
  const duplicates = duplicatesQuery.data ?? [];
  const similar = similarQuery.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Receber contrato"
        description="Registre o contrato assinado que chegou pelo WhatsApp. A pasta é montada automaticamente."
        actions={
          <Button asChild variant="outline">
            <Link to="/contratos/fila">Ir para a fila</Link>
          </Button>
        }
      />

      {uploadFailures ? (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="space-y-2 pt-6 text-sm">
            <p className="font-medium text-destructive">
              Contrato criado, mas alguns arquivos não foram enviados:
            </p>
            <ul className="list-disc pl-5 text-destructive">
              {uploadFailures.failures.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            <Button asChild size="sm">
              <Link to={`/contratos/${uploadFailures.contractId}`}>
                Abrir o contrato e reenviar os arquivos
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <form
        className="grid gap-4 lg:grid-cols-[1fr_1fr]"
        onSubmit={form.handleSubmit((values) => {
          if (files.length === 0) {
            setFilesError("Adicione as fotos ou o PDF do contrato.");
            return;
          }
          setFilesError(null);
          setUploadFailures(null);
          mutation.mutate(values);
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">De onde veio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Canal (WhatsApp)</Label>
              <Controller
                control={form.control}
                name="channel_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const channel = activeChannels.find((c) => c.id === value);
                      if (channel?.operator_id) {
                        form.setValue("operator_id", channel.operator_id, { shouldValidate: true });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Não informado</SelectItem>
                      {activeChannels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                          {channel.phone_label ? ` · ${channel.phone_label}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {activeChannels.length === 0 && !channelsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum canal cadastrado. O admin cadastra os WhatsApps em Contratos → Canais.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="received-at">Recebido em</Label>
              <Input id="received-at" type="datetime-local" {...form.register("received_at")} />
              <FieldError message={errors.received_at?.message} />
            </div>

            <div className="space-y-2">
              <Label>Bandeira</Label>
              <Controller
                control={form.control}
                name="operator_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeOperators.map((operator) => (
                        <SelectItem key={operator.id} value={operator.id}>
                          {operator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.operator_id?.message} />
            </div>

            <div className="space-y-2">
              <Label>Arquivos do contrato</Label>
              <ContractFilePicker files={files} onChange={setFiles} disabled={mutation.isPending} />
              <FieldError message={filesError ?? undefined} />
              {duplicates.length > 0 ? (
                <div className="rounded-md border border-warning/50 bg-warning/10 p-2 text-sm">
                  <p className="font-medium">Atenção: arquivo(s) idêntico(s) já enviado(s) antes:</p>
                  <ul className="list-disc pl-5">
                    {duplicates.map((dup) => (
                      <li key={`${dup.contract_id}-${dup.sha256}`}>
                        {dup.file_name} —{" "}
                        <Link className="underline" to={`/contratos/${dup.contract_id}`} target="_blank">
                          ver contrato
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">De quem é</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Consultor</Label>
              <Controller
                control={form.control}
                name="consultant_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("merchant_id", "");
                      setMerchantSearch("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeConsultants.map((consultant) => (
                        <SelectItem key={consultant.id} value={consultant.id}>
                          {consultant.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.consultant_id?.message} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="merchant-search">Lojista</Label>
                <div className="flex gap-2 text-xs">
                  <Link to="/lojistas/novo" target="_blank" className="text-primary hover:underline">
                    Cadastrar lojista
                  </Link>
                  <button
                    type="button"
                    className="text-muted-foreground hover:underline"
                    disabled={!consultantId}
                    onClick={() => void merchantsQuery.refetch()}
                  >
                    Atualizar lista
                  </button>
                </div>
              </div>
              {selectedMerchant ? (
                <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div>
                    <p className="font-medium">{selectedMerchant.trade_name ?? selectedMerchant.legal_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedMerchant.legal_name}
                      {selectedMerchant.city ? ` · ${selectedMerchant.city}` : ""}
                      {selectedMerchant.state ? `/${selectedMerchant.state}` : " · sem UF (ficará sem região)"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => form.setValue("merchant_id", "", { shouldValidate: true })}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="merchant-search"
                    placeholder={consultantId ? "Buscar por nome, CNPJ ou cidade" : "Escolha o consultor primeiro"}
                    disabled={!consultantId}
                    value={merchantSearch}
                    onChange={(event) => setMerchantSearch(event.target.value)}
                  />
                  {consultantId ? (
                    <div className="max-h-56 overflow-y-auto rounded-md border">
                      {merchantsQuery.isLoading ? (
                        <p className="p-2 text-sm text-muted-foreground">Carregando…</p>
                      ) : merchantOptions.length === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground">
                          Nenhum lojista deste consultor encontrado.
                        </p>
                      ) : (
                        merchantOptions.map((merchant) => (
                          <button
                            key={merchant.id}
                            type="button"
                            className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                            onClick={() => form.setValue("merchant_id", merchant.id, { shouldValidate: true })}
                          >
                            <span className="font-medium">{merchant.trade_name ?? merchant.legal_name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {merchant.legal_name}
                              {merchant.document ? ` · ${merchant.document}` : ""}
                              {merchant.city ? ` · ${merchant.city}` : ""}
                              {merchant.state ? `/${merchant.state}` : ""}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </>
              )}
              <FieldError message={errors.merchant_id?.message} />
              {similar.length > 0 ? (
                <div className="rounded-md border border-warning/50 bg-warning/10 p-2 text-sm">
                  <p className="font-medium">
                    Este lojista já tem {similar.length} contrato(s) não encerrado(s) nesta bandeira:
                  </p>
                  <ul className="list-disc pl-5">
                    {similar.map((item) => (
                      <li key={item.id}>
                        {CONTRACT_STATUS_LABEL[item.status]} —{" "}
                        <Link className="underline" to={`/contratos/${item.id}`} target="_blank">
                          ver contrato
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Se for o mesmo contrato, registre os arquivos nele em vez de criar outro.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="signed-on">Data da assinatura</Label>
                <Input id="signed-on" type="date" {...form.register("signed_on")} />
                <FieldError message={errors.signed_on?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-name">Plano (opcional)</Label>
                <Input id="plan-name" maxLength={120} {...form.register("plan_name")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-notes">Observações</Label>
              <Input id="contract-notes" maxLength={2000} {...form.register("notes")} />
            </div>

            {mutation.isError ? (
              <p className="text-sm text-destructive">
                {mutation.error instanceof Error ? mutation.error.message : "Erro ao registrar."}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Enviando arquivos…" : "Registrar e enviar para conferência"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </PageContainer>
  );
}
