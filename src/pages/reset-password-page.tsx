import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

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
import { getSession, updatePassword } from "@/features/auth/api/auth-service";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/schemas/auth-schemas";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await getSession();
        if (!active) {
          return;
        }
        setHasRecoverySession(Boolean(session));
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(values: ResetPasswordFormValues) {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(values.password);
      setSuccess(true);
      window.setTimeout(() => {
        void navigate("/login", { replace: true });
      }, 1500);
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar a senha.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            Use o link recebido por e-mail. Links inválidos ou expirados não atualizam a
            senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <p className="text-sm text-muted-foreground">Verificando sessão…</p>
          ) : null}

          {!checking && !hasRecoverySession ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" role="alert">
                Link de recuperação inválido ou expirado.
              </p>
              <Button asChild variant="outline">
                <Link to="/esqueci-senha">Solicitar novo link</Link>
              </Button>
            </div>
          ) : null}

          {!checking && hasRecoverySession && success ? (
            <p className="text-sm text-muted-foreground" role="status">
              Senha atualizada. Redirecionando para o login…
            </p>
          ) : null}

          {!checking && hasRecoverySession && !success ? (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  disabled={submitting}
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  disabled={submitting}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>
              {errors.root ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.root.message}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Salvando…" : "Atualizar senha"}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
