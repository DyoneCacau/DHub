import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/features/auth/api/auth-service";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/schemas/auth-schemas";

const GENERIC_SUCCESS =
  "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.";

export function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/redefinir-senha`;
      await requestPasswordReset(values.email, redirectTo);
    } catch {
      // Resposta genérica — não revelar existência do e-mail
    } finally {
      setDone(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Informe o e-mail da sua conta. A resposta é sempre genérica por segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" role="status">
                {GENERIC_SUCCESS}
              </p>
              <Button asChild variant="outline">
                <Link to="/login">Voltar ao login</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  disabled={submitting}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Enviando…" : "Enviar link"}
              </Button>
              <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">
                Voltar ao login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
