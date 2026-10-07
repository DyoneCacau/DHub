import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
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
import { listActiveConsultantsForSelect } from "@/features/consultants/api/consultant-service";
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import {
  canChangeMerchantConsultant,
  canCreateMerchant,
  canManageAllMerchants,
} from "@/features/consultants/utils/permissions";
import { merchantQueryKeys } from "@/features/merchants/api/query-keys";
import {
  createMerchant,
  findMerchantsByDocument,
  getMerchant,
  updateMerchant,
} from "@/features/merchants/api/merchant-service";
import {
  merchantFormSchema,
  type MerchantFormValues,
} from "@/features/merchants/schemas/merchant-schemas";
import { supabase } from "@/lib/supabase";
import { normalizeDocument } from "@/lib/normalize";

export function MerchantFormPage() {
  const { merchantId } = useParams();
  const isEdit = Boolean(merchantId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organization, role, user } = useAuth();
  const organizationId = organization?.id ?? "";
  const office = canManageAllMerchants(role);
  const canPickConsultant = canChangeMerchantConsultant(role) || (!isEdit && office);

  const [dupWarning, setDupWarning] = useState<string | null>(null);

  const ownConsultantQuery = useQuery({
    queryKey: [...consultantQueryKeys.root, "self", user?.id, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultants")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
    enabled: role === "consultant" && Boolean(user?.id) && Boolean(organizationId),
  });

  const detailQuery = useQuery({
    queryKey: merchantQueryKeys.detail(merchantId ?? ""),
    queryFn: () => getMerchant(merchantId!),
    enabled: isEdit && Boolean(merchantId),
  });

  const consultantsQuery = useQuery({
    queryKey: [...consultantQueryKeys.root, "select-active", organizationId],
    queryFn: () => listActiveConsultantsForSelect(organizationId),
    enabled: Boolean(organizationId) && (office || canPickConsultant),
  });

  const form = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantFormSchema),
    defaultValues: {
      legal_name: "",
      trade_name: "",
      document: "",
      email: "",
      phone: "",
      whatsapp: "",
      status: "active",
      consultant_id: "",
      postal_code: "",
      street: "",
      number: "",
      complement: "",
      district: "",
      city: "",
      state: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      form.reset({
        legal_name: detailQuery.data.legal_name,
        trade_name: detailQuery.data.trade_name ?? "",
        document: detailQuery.data.document ?? "",
        email: detailQuery.data.email ?? "",
        phone: detailQuery.data.phone ?? "",
        whatsapp: detailQuery.data.whatsapp ?? "",
        status: detailQuery.data.status,
        consultant_id: detailQuery.data.consultant_id,
        postal_code: detailQuery.data.postal_code ?? "",
        street: detailQuery.data.street ?? "",
        number: detailQuery.data.number ?? "",
        complement: detailQuery.data.complement ?? "",
        district: detailQuery.data.district ?? "",
        city: detailQuery.data.city ?? "",
        state: detailQuery.data.state ?? "",
        notes: detailQuery.data.notes ?? "",
      });
    }
  }, [detailQuery.data, form]);

  useEffect(() => {
    if (!isEdit && role === "consultant" && ownConsultantQuery.data?.id) {
      form.setValue("consultant_id", ownConsultantQuery.data.id);
    }
  }, [isEdit, role, ownConsultantQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: MerchantFormValues) => {
      const payload = {
        legal_name: values.legal_name,
        trade_name: values.trade_name || null,
        document: values.document || null,
        email: values.email || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        status: values.status,
        consultant_id: values.consultant_id,
        postal_code: values.postal_code || null,
        street: values.street || null,
        number: values.number || null,
        complement: values.complement || null,
        district: values.district || null,
        city: values.city || null,
        state: values.state || null,
        notes: values.notes || null,
      };
      if (isEdit && merchantId) {
        return updateMerchant(merchantId, payload);
      }
      return createMerchant(organizationId, payload);
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: merchantQueryKeys.root });
      await queryClient.invalidateQueries({ queryKey: consultantQueryKeys.root });
      navigate(`/lojistas/${row.id}`);
    },
  });

  if (!canCreateMerchant(role) && !isEdit) {
    return (
      <PageContainer>
        <PageHeader title="Lojista" description="Acesso negado." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={isEdit ? "Editar lojista" : "Novo lojista"}
        description="Cadastro único por organização. Documento opcional nesta sprint."
        actions={
          <Button asChild variant="outline">
            <Link to="/lojistas">Voltar</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados principais</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="legal_name">Razão social</Label>
              <Input id="legal_name" {...form.register("legal_name")} disabled={mutation.isPending} />
              {form.formState.errors.legal_name ? (
                <p className="text-sm text-destructive">{form.formState.errors.legal_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome fantasia</Label>
              <Input id="trade_name" {...form.register("trade_name")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">Documento</Label>
              <Input
                id="document"
                {...form.register("document")}
                disabled={mutation.isPending}
                onBlur={async (event) => {
                  const value = normalizeDocument(event.target.value);
                  setDupWarning(null);
                  if (!value || !organizationId) return;
                  try {
                    const matches = await findMerchantsByDocument(
                      organizationId,
                      value,
                      merchantId,
                    );
                    if (matches.length > 0) {
                      setDupWarning(
                        `Possível duplicidade: já existe lojista com este documento (${matches[0]?.legal_name ?? "registro existente"}). O cadastro não é bloqueado automaticamente.`,
                      );
                    }
                  } catch {
                    /* ignore soft check */
                  }
                }}
              />
              {dupWarning ? <p className="text-sm text-amber-700">{dupWarning}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" {...form.register("email")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...form.register("phone")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" {...form.register("whatsapp")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue("status", value as "active" | "inactive", { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Consultor responsável</Label>
              {role === "consultant" && !office ? (
                <Input value="Você (vínculo automático)" disabled />
              ) : (
                <Select
                  value={form.watch("consultant_id") || undefined}
                  onValueChange={(value) =>
                    form.setValue("consultant_id", value, { shouldValidate: true })
                  }
                  disabled={!canPickConsultant && isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(consultantsQuery.data ?? []).map((consultant) => (
                      <SelectItem key={consultant.id} value={consultant.id}>
                        {consultant.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {form.formState.errors.consultant_id ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.consultant_id.message}
                </p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <h3 className="mb-2 text-sm font-medium">Endereço</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">CEP</Label>
              <Input id="postal_code" {...form.register("postal_code")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">UF</Label>
              <Input id="state" maxLength={2} {...form.register("state")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street">Rua</Label>
              <Input id="street" {...form.register("street")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Número</Label>
              <Input id="number" {...form.register("number")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input id="complement" {...form.register("complement")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">Bairro</Label>
              <Input id="district" {...form.register("district")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" {...form.register("city")} disabled={mutation.isPending} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                {...form.register("notes")}
                disabled={mutation.isPending}
              />
            </div>

            {mutation.isError ? (
              <p className="text-sm text-destructive md:col-span-2">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Não foi possível salvar."}
              </p>
            ) : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
