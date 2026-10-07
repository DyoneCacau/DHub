import { useEffect } from "react";
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
import { consultantQueryKeys } from "@/features/consultants/api/query-keys";
import {
  createConsultant,
  getConsultant,
  listLinkableMembers,
  updateConsultant,
} from "@/features/consultants/api/consultant-service";
import {
  consultantFormSchema,
  type ConsultantFormValues,
} from "@/features/consultants/schemas/consultant-schemas";
import {
  canLinkConsultantUser,
  canManageConsultants,
} from "@/features/consultants/utils/permissions";

export function ConsultantFormPage() {
  const { consultantId } = useParams();
  const isEdit = Boolean(consultantId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organization, role } = useAuth();
  const organizationId = organization?.id ?? "";
  const canManage = canManageConsultants(role);
  const canLink = canLinkConsultantUser(role);

  const detailQuery = useQuery({
    queryKey: consultantQueryKeys.detail(consultantId ?? ""),
    queryFn: () => getConsultant(consultantId!),
    enabled: isEdit && Boolean(consultantId) && canManage,
  });

  const linkableQuery = useQuery({
    queryKey: consultantQueryKeys.linkableMembers(organizationId),
    queryFn: () => listLinkableMembers(organizationId),
    enabled: canLink && Boolean(organizationId),
  });

  const form = useForm<ConsultantFormValues>({
    resolver: zodResolver(consultantFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      document: "",
      status: "active",
      notes: "",
      user_id: "",
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      form.reset({
        full_name: detailQuery.data.full_name,
        email: detailQuery.data.email ?? "",
        phone: detailQuery.data.phone ?? "",
        document: detailQuery.data.document ?? "",
        status: detailQuery.data.status,
        notes: detailQuery.data.notes ?? "",
        user_id: detailQuery.data.user_id ?? "",
      });
    }
  }, [detailQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: ConsultantFormValues) => {
      const payload = {
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        document: values.document || null,
        status: values.status,
        notes: values.notes || null,
        user_id: canLink ? values.user_id || null : undefined,
      };
      if (isEdit && consultantId) {
        return updateConsultant(consultantId, payload);
      }
      return createConsultant(organizationId, {
        ...payload,
        user_id: canLink ? values.user_id || null : null,
        status: values.status,
      });
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: consultantQueryKeys.root });
      navigate(`/consultores/${row.id}`);
    },
  });

  if (!canManage) {
    return (
      <PageContainer>
        <PageHeader title="Consultor" description="Acesso negado." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={isEdit ? "Editar consultor" : "Novo consultor"}
        description="Cadastro operacional. Vínculo com Auth é opcional e exclusivo do admin."
        actions={
          <Button asChild variant="outline">
            <Link to="/consultores">Voltar</Link>
          </Button>
        }
      />

      {detailQuery.isLoading && isEdit ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : null}

      {detailQuery.isError ? (
        <p className="text-sm text-destructive">Consultor não encontrado ou acesso negado.</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do consultor</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => {
              if (
                values.status === "inactive" &&
                (!isEdit || detailQuery.data?.status === "active")
              ) {
                if (!window.confirm("Confirma inativar este consultor?")) {
                  return;
                }
              }
              mutation.mutate(values);
            })}
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" disabled={mutation.isPending} {...form.register("full_name")} />
              {form.formState.errors.full_name ? (
                <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" disabled={mutation.isPending} {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" disabled={mutation.isPending} {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">Documento (opcional)</Label>
              <Input id="document" disabled={mutation.isPending} {...form.register("document")} />
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
            {canLink ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Vínculo com usuário (opcional)</Label>
                <Select
                  value={form.watch("user_id") || "none"}
                  onValueChange={(value) =>
                    form.setValue("user_id", value === "none" ? "" : value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {isEdit && detailQuery.data?.user_id ? (
                      <SelectItem value={detailQuery.data.user_id}>
                        Manter vínculo atual
                      </SelectItem>
                    ) : null}
                    {(linkableQuery.data ?? []).map(({ member, profile }) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {profile?.full_name || profile?.email || member.user_id} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                disabled={mutation.isPending}
                {...form.register("notes")}
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
