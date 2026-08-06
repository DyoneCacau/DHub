import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { signInWithPassword } from "@/features/auth/api/auth-service";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/auth-schemas";

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshAccess } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await signInWithPassword(values.email, values.password);
      const nextState = await refreshAccess();
      if (nextState === "ready") {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (nextState === "membership_inactive") {
        setError("root", {
          message: "Sua membership está inativa. Contate um administrador.",
        });
        return;
      }
      if (nextState === "authenticated_no_membership") {
        setError("root", {
          message: "Acesso pendente: nenhuma membership ativa encontrada.",
        });
        return;
      }
      setError("root", {
        message: "Não foi possível liberar o acesso. Tente novamente.",
      });
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível entrar. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_oklch(0.94_0.02_245),_var(--background)_55%)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              DHub
            </p>
            <CardTitle className="mt-1 text-2xl">Entrar na plataforma</CardTitle>
          </div>
          <CardDescription>
            Acesso operacional para consultores e escritório da Prime Service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="seu.email@empresa.com"
                aria-invalid={Boolean(errors.email)}
                disabled={submitting}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                disabled={submitting}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {errors.root ? (
              <p
                className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
                role="alert"
              >
                {errors.root.message}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Entrando…" : "Entrar"}
            </Button>

            <div className="text-sm">
              <Link
                to="/esqueci-senha"
                className="text-primary underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
